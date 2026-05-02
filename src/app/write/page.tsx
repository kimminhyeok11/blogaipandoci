"use client";

import { useState, useCallback, useEffect, Suspense, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { generateSlug } from "@/utils/image";
import { supabase, db } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";

// IndexNow 알림 헬퍼
const notifyIndexNow = async (path: string) => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    const url = `${siteUrl}${path}`;
    
    await fetch("/api/indexnow-notify/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    });
  } catch (err) {
    // IndexNow 실패는 사용자에게 표시하지 않음 (백그라운드 처리)
    console.error("IndexNow notification failed:", err);
  }
};

// MarkdownEditor 동적 임포트 (코드 분할)
const MarkdownEditor = lazy(() => import("@/components/editor/MarkdownEditor").then(mod => ({ default: mod.MarkdownEditor })));

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const isEditMode = !!editSlug;
  const { showToast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [tags, setTags] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [postId, setPostId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 자동 저장 키 생성 (수정 모드 vs 새 글)
  const getAutoSaveKey = (key: string) => {
    return editSlug ? `blog_edit_${editSlug}_${key}` : `blog_draft_${key}`;
  };

  // localStorage에 임시 저장
  const saveToLocalStorage = useCallback(() => {
    if (isEditMode && !title && !content) return; // 수정 모드에서 데이터 없으면 스킵
    
    localStorage.setItem(getAutoSaveKey('title'), title);
    localStorage.setItem(getAutoSaveKey('content'), content);
    localStorage.setItem(getAutoSaveKey('excerpt'), excerpt);
    localStorage.setItem(getAutoSaveKey('tags'), tags);
    localStorage.setItem(getAutoSaveKey('timestamp'), new Date().toISOString());
    setLastSaved(new Date());
  }, [title, content, excerpt, tags, editSlug, isEditMode]);

  // localStorage에서 복원
  const loadFromLocalStorage = useCallback(() => {
    const savedTitle = localStorage.getItem(getAutoSaveKey('title'));
    const savedContent = localStorage.getItem(getAutoSaveKey('content'));
    const savedExcerpt = localStorage.getItem(getAutoSaveKey('excerpt'));
    const savedTags = localStorage.getItem(getAutoSaveKey('tags'));
    const savedTimestamp = localStorage.getItem(getAutoSaveKey('timestamp'));

    if (savedTitle || savedContent) {
      const timestamp = savedTimestamp ? new Date(savedTimestamp) : null;
      const timeStr = timestamp?.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      return {
        title: savedTitle || '',
        content: savedContent || '',
        excerpt: savedExcerpt || '',
        tags: savedTags || '',
        timestamp: timeStr,
        hasData: !!(savedTitle || savedContent)
      };
    }
    return null;
  }, [editSlug]);

  // localStorage 정리
  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(getAutoSaveKey('title'));
    localStorage.removeItem(getAutoSaveKey('content'));
    localStorage.removeItem(getAutoSaveKey('excerpt'));
    localStorage.removeItem(getAutoSaveKey('tags'));
    localStorage.removeItem(getAutoSaveKey('timestamp'));
  }, [editSlug]);

  // 자동 저장 (30초마다 + 내용 변경 시)
  useEffect(() => {
    if (!title && !content) return;
    
    // 30초마다 자동 저장
    const interval = setInterval(() => {
      saveToLocalStorage();
    }, 30000);

    // 페이지 숨겨질 때도 저장 (모바일 백그라운드)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocalStorage();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 페이지 떠나기 전 저장
    const handleBeforeUnload = () => {
      saveToLocalStorage();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveToLocalStorage, title, content]);

  // 페이지 로드 시 복원 확인
  useEffect(() => {
    // 수정 모드에서는 기존 글을 먼저 로드하고, 임시 저장이 있으면 확인
    if (isEditMode) return; // 수정 모드는 기존 로직에서 처리

    const saved = loadFromLocalStorage();
    if (saved?.hasData) {
      const confirmed = window.confirm(
        `${saved.timestamp || '이전'}에 저장된 임시 글이 있습니다.\n\n` +
        `제목: ${saved.title.slice(0, 30)}${saved.title.length > 30 ? '...' : ''}\n\n` +
        `불러오시겠습니까? (취소 시 임시 글은 삭제됩니다)`
      );
      
      if (confirmed) {
        setTitle(saved.title);
        setContent(saved.content);
        setExcerpt(saved.excerpt);
        setTags(saved.tags);
        showToast('임시 저장된 글을 불러왔습니다', 'success');
      } else {
        clearLocalStorage();
      }
    }
  }, []);

  // 수정 모드: 기존 게시글 불러오기
  useEffect(() => {
    if (!editSlug) return;

    const loadPost = async () => {
      try {
        const { data: post, error } = await db.posts()
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
        
        // 임시 저장된 데이터가 있는지 확인
        const saved = loadFromLocalStorage();
        if (saved?.hasData) {
          const postUpdatedAt = new Date(post.updated_at);
          const savedTime = saved.timestamp ? new Date(saved.timestamp) : null;
          
          // 임시 저장이 더 최신이면 확인
          if (savedTime && savedTime > postUpdatedAt) {
            const confirmed = window.confirm(
              `${saved.timestamp}에 임시 저장된 수정 내용이 있습니다.\n\n` +
              `임시 저장 내용을 불러오시겠습니까? (취소 시 서버 저장된 버전을 사용합니다)`
            );
            
            if (confirmed) {
              setTitle(saved.title);
              setContent(saved.content);
              setExcerpt(saved.excerpt);
              setTags(saved.tags);
              showToast('임시 저장된 수정 내용을 불러왔습니다', 'success');
            } else {
              setTitle(post.title);
              setContent(post.content);
              setExcerpt(post.excerpt || "");
              clearLocalStorage();
            }
          } else {
            setTitle(post.title);
            setContent(post.content);
            setExcerpt(post.excerpt || "");
          }
        } else {
          setTitle(post.title);
          setContent(post.content);
          setExcerpt(post.excerpt || "");
        }

        // 기존 태그 로드
        const { data: postTags } = await db.post_tags()
          .select("tag_id")
          .eq("post_id", post.id);

        if (postTags?.length) {
          const tagIds = postTags.map((pt: any) => pt.tag_id);
          const { data: tagData } = await db.tags()
            .select("name")
            .in("id", tagIds);
          
          if (tagData?.length) {
            setTags(tagData.map((t: any) => t.name).join(", "));
          }
        }
      } catch {
        showToast("글 로딩 실패", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [editSlug, router]);

  const handleImageUpload = useCallback(async (file: File): Promise<string> => {
    try {
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
    } catch {
      showToast("이미지 업로드에 실패했습니다.", "error");
      throw new Error("Image upload failed");
    }
  }, [showToast]);

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
      // Check auth directly from supabase (more reliable than useAuth hook)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log("[DEBUG] Submit - currentUser:", currentUser?.id);
      console.log("[DEBUG] Submit - isEditMode:", isEditMode, "postId:", postId);
      
      if (!currentUser) {
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

      // 태그 파싱
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);

      if (isEditMode && postId) {
        // 수정 모드: update
        console.log("[DEBUG] Updating post:", postId, "by user:", currentUser.id);
        const { error } = await db.posts().update({
            title: title.trim(),
            content: content.trim(),
            excerpt: finalExcerpt,
            published,
            published_at: published ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);

        if (error) {
          console.error("[DEBUG] Update error:", error);
          throw error;
        }
        console.log("[DEBUG] Update successful");

        // 기존 태그 삭제 후 새 태그 저장
        await db.post_tags().delete().eq("post_id", postId);
        await saveTags(postId, tagList);

        showToast(published ? "글이 수정되었습니다." : "임시 저장되었습니다.", "success");
        
        // 임시 저장 데이터 정리
        clearLocalStorage();
        
        // IndexNow 알림 (발행된 경우에만)
        if (published) {
          await notifyIndexNow(`/posts/${slug}`);
        }
        
        router.push(`/posts/${slug}`);
      } else {
        // 신규 작성: insert 후 id 받아오기
        const { data: newPost, error } = await db.posts().insert({
          user_id: currentUser.id,
          title: title.trim(),
          slug,
          content: content.trim(),
          excerpt: finalExcerpt,
          published,
          published_at: published ? new Date().toISOString() : null,
        }).select("id").single();

        if (error) throw error;

        // 태그 저장
        if (newPost?.id) {
          await saveTags(newPost.id, tagList);
        }

        showToast(published ? "글이 발행되었습니다." : "임시 저장되었습니다.", "success");
        
        // 임시 저장 데이터 정리
        clearLocalStorage();
        
        // IndexNow 알림 (발행된 경우에만)
        if (published) {
          await notifyIndexNow(`/posts/${slug}`);
        }
        
        router.push(`/posts/${slug}`);
      }
    } catch (err) {
      console.error("저장 오류:", err);
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 태그 저장 헬퍼 함수
  const saveTags = async (postId: string, tagList: string[]) => {
    if (!tagList.length) return;

    for (const tagName of tagList) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");

      // 1. 태그 upsert
      const { data: tagData } = await db.tags()
        .upsert({ name: tagName, slug: tagSlug }, { onConflict: "slug" })
        .select("id")
        .single();

      if (tagData?.id) {
        // 2. post_tags insert
        await db.post_tags().insert({
          post_id: postId,
          tag_id: tagData.id,
        });
      }
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
              {/* 자동 저장 상태 표시 */}
              {lastSaved && (
                <span className="hidden sm:block font-sans text-xs text-muted mr-2">
                  {lastSaved.toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })} 자동 저장됨
                </span>
              )}
              
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

            {/* Tags Input */}
            <div>
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
