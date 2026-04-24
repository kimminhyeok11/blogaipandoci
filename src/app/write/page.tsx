"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";
import { cn } from "@/utils/cn";
import { generateSlug } from "@/utils/image";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const isEditMode = !!editSlug;
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [postId, setPostId] = useState<string | null>(null);

  // 수정 모드: 기존 게시글 불러오기
  useEffect(() => {
    if (!editSlug) return;

    const loadPost = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: post, error } = await (supabase as any)
          .from("posts")
          .select("*")
          .eq("slug", editSlug)
          .single();

        if (error || !post) {
          router.push("/posts");
          return;
        }

        // 작성자 본인 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id !== post.user_id) {
          router.push(`/posts/${editSlug}`);
          return;
        }

        setPostId(post.id);
        setTitle(post.title);
        setContent(post.content);
        setExcerpt(post.excerpt || "");
        setCategory(post.category || "");
        setTags(post.tags || "");
      } catch {
        // 에러 처리
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [editSlug, router]);

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    // Compress and convert to WebP
    const imageCompression = (await import("browser-image-compression")).default;
    
    const compressedFile = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: "image/webp",
    });

    // Upload to Supabase Storage
    const fileExt = "webp";
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, compressedFile, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return publicUrl;
  }, []);

  const handleSubmit = async (published: boolean = false) => {
    // 유효성 검사
    if (!title.trim()) {
      showToast("제목을 입력해주세요.", "warning");
      return;
    }

    if (title.trim().length < 2) {
      showToast("제목은 최소 2자 이상이어야 합니다.", "warning");
      return;
    }

    if (!content.trim()) {
      showToast("내용을 입력해주세요.", "warning");
      return;
    }

    if (content.trim().length < 10) {
      showToast("내용은 최소 10자 이상이어야 합니다.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToast("로그인이 필요합니다.", "error");
        router.push("/login");
        return;
      }

      // 고유한 slug 생성 (중복 방지를 위해 타임스탬프 추가)
      let slug: string;
      if (isEditMode) {
        slug = editSlug!;
      } else {
        const baseSlug = generateSlug(title);
        const timestamp = Date.now().toString(36).slice(-6);
        slug = `${baseSlug}-${timestamp}`;
      }
      
      // Auto-generate excerpt if not provided
      const finalExcerpt = excerpt.trim() || content.slice(0, 150).replace(/[#*`]/g, "") + "...";

      if (isEditMode && postId) {
        // 수정 모드: update
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("posts")
          .update({
            title: title.trim(),
            content: content.trim(),
            excerpt: finalExcerpt,
            category: category.trim() || null,
            tags: tags.trim() || null,
            published,
            published_at: published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);

        if (error) throw error;

        showToast(published ? "글이 수정되었습니다." : "임시 저장되었습니다.", "success");
        router.push(`/posts/${slug}`);
      } else {
        // 신규 작성: insert
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).from("posts").insert({
          user_id: user.id,
          title: title.trim(),
          slug,
          content: content.trim(),
          excerpt: finalExcerpt,
          category: category.trim() || null,
          tags: tags.trim() || null,
          published,
          published_at: published ? new Date().toISOString() : null,
        });

        if (error) throw error;

        showToast(published ? "글이 발행되었습니다." : "임시 저장되었습니다.", "success");
        router.push(`/posts/${slug}`);
      }
    } catch {
      showToast("저장에 실패했습니다. 다시 시도해주세요.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-paper border-b border-rule">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="p-2 text-muted hover:text-ink transition-colors"
                aria-label="뒤로 가기"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="font-sans text-sm font-medium text-ink">
                {isEditMode ? "글 수정하기" : "새 글 작성"}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded-sm transition-colors",
                  showPreview ? "bg-rust text-paper" : "text-muted hover:bg-cream"
                )}
              >
                <Eye size={14} />
                미리보기
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-3 py-1.5 border border-rule text-muted text-xs font-sans font-medium rounded-sm hover:border-muted transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : "임시저장"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {isEditMode ? "수정완료" : "발행하기"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-muted">
              <Loader2 size={24} className="animate-spin" />
              <span className="font-sans text-sm">글을 불러오는 중...</span>
            </div>
          </div>
        ) : showPreview ? (
          <div className="prose-journal bg-white border border-rule p-8 rounded-sm">
            <h1 className="headline mb-4">{title || "제목 없음"}</h1>
            {category && (
              <div className="section-label mb-6">{category}</div>
            )}
            <div className="whitespace-pre-wrap font-serif text-base leading-loose">
              {content || "내용 없음"}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full bg-transparent text-2xl sm:text-3xl font-black text-ink placeholder-muted border-b-2 border-rule pb-3 focus:outline-none focus:border-rust transition-colors"
              />
            </div>

            {/* Meta Inputs */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                  카테고리
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="예: 법률 심층 리포트"
                  className="w-full px-3 py-2 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                  태그 (쉼표로 구분)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="예: 저작권, 판례, 기술"
                  className="w-full px-3 py-2 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors"
                />
              </div>
            </div>

            {/* Excerpt Input */}
            <div>
              <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                요약 (미입력 시 자동 생성)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="글의 핵심 내용을 1-2문장으로 요약해주세요"
                rows={2}
                className="w-full px-3 py-2 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors resize-none"
              />
            </div>

            {/* Content Editor */}
            <div>
              <label className="block font-sans text-xs font-medium text-muted mb-1.5 uppercase tracking-wider">
                내용
              </label>
              <MarkdownEditor
                value={content}
                onChange={setContent}
                placeholder="마크다운으로 글을 작성하세요...

## 제목을 이렇게 작성하세요

**굵은 글씨**와 *기울임*을 사용할 수 있습니다.

> 인용구도 이렇게 작성할 수 있습니다.

- 목록 아이템
- 또 다른 아이템

1. 번호 목록
2. 두 번째 항목"
                minHeight="500px"
                maxHeight="none"
                onImageUpload={handleImageUpload}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 size={24} className="animate-spin" />
          <span className="font-sans text-sm">로딩 중...</span>
        </div>
      </div>
    }>
      <WritePageContent />
    </Suspense>
  );
}
