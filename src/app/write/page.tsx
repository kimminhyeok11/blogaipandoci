"use client";

import { useState, useCallback, useEffect, useRef, Suspense, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Heading, Image as ImageIcon, Link as LinkIcon, MoreHorizontal, Pencil, Eye, Save, Check, Send, Loader2 } from "lucide-react";
import { generateSlug } from "@/utils/image";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { WriteEditor } from "./components/WriteEditor";
import { RevisionHistory } from "@/components/editor/RevisionHistory";
import { useWriteForm } from "./hooks/useWriteForm";
import { useAutoSave } from "./hooks/useAutoSave";

// IndexNow 알림 헬퍼
const notifyIndexNow = async (path: string) => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "");
    const url = `${siteUrl}${path}`;

    await fetch("/api/indexnow-notify/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url] }),
    });
  } catch (err) {
    console.error("IndexNow notification failed:", err);
  }
};

// MarkdownEditor 동적 임포트
import type { MarkdownEditorRef } from "@/components/editor/MarkdownEditor";
const MarkdownEditor = lazy(() =>
  import("@/components/editor/MarkdownEditor").then((mod) => ({ default: mod.MarkdownEditor }))
);

function WritePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editSlug = searchParams.get("edit");
  const isEditMode = !!editSlug;
  const { showToast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const editorRef = useRef<MarkdownEditorRef>(null);

  // 폼 상태 관리
  const form = useWriteForm();
  const { title, setTitle, content, setContent, excerpt, setExcerpt, tags, setTags, hasContent, setForm } = form;

  // 자동 저장
  const autoSave = useAutoSave(editSlug);
  const { lastSaved } = autoSave;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [draftBanner, setDraftBanner] = useState<{ timestamp: string; data: { title: string; content: string; excerpt: string; tags: string } } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  // 기존 게시글 목록 (자동 내부 링크용)
  const [existingPosts, setExistingPosts] = useState<Array<{ title: string; slug: string }>>([]);

  // localStorage에 임시 저장
  const saveToLocalStorage = useCallback(() => {
    if (!hasContent) return;
    autoSave.save({ title, content, excerpt, tags });
  }, [hasContent, title, content, excerpt, tags, autoSave]);

  // 자동 저장 (30초마다 + 내용 변경 시)
  useEffect(() => {
    if (!title && !content) return;
    
    // 10초마다 자동 저장 (사용자 피드백 개선)
    const interval = setInterval(() => {
      saveToLocalStorage();
    }, 10000);

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

  // 페이지 로드 시 복원 배너 표시 (새 글 모드)
  useEffect(() => {
    if (isEditMode) return;
    const saved = autoSave.load();
    if (saved?.hasData) {
      setDraftBanner({ timestamp: saved.timestamp || '이전', data: { title: saved.title, content: saved.content, excerpt: saved.excerpt, tags: saved.tags } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기존 게시글 목록 로드 (자동 내부 링크용)
  useEffect(() => {
    const fetchExistingPosts = async () => {
      try {
        const response = await fetch('/api/posts?limit=100');
        if (response.ok) {
          const data = await response.json();
          // 제목이 3자 이상인 게시글만 필터링
          const posts = (data.posts || [])
            .filter((post: any) => post.title && post.title.length >= 3)
            .map((post: any) => ({ title: post.title, slug: post.slug }));
          setExistingPosts(posts);
        }
      } catch (err) {
        console.error('기존 게시글 로드 실패:', err);
      }
    };
    
    fetchExistingPosts();
  }, []);

  // 자동 내부 링크 삽입 함수
  const autoInsertInternalLinks = useCallback((contentText: string, currentSlug?: string): string => {
    if (!existingPosts.length) return contentText;
    
    let processedContent = contentText;
    
    // 게시글 수가 많을 수 있으니, 길이순으로 정렬 (긴 제목 먼저 처리 - 부분 매칭 방지)
    const sortedPosts = [...existingPosts].sort((a, b) => b.title.length - a.title.length);
    
    for (const post of sortedPosts) {
      // 자기 자신은 링크하지 않음
      if (currentSlug && post.slug === currentSlug) continue;
      
      // 본문에 해당 제목이 없으면 스킵
      if (!processedContent.includes(post.title)) continue;
      
      // 이미 링크가 걸린 텍스트는 제외하고 순수 텍스트만 매칭
      const escapedTitle = post.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 정규식 특수문자 이스케이프
      
      // 마크다운 링크 구문이 아닌 경우에만 변환
      // [제목](링크) 형태가 아닌 제목 텍스트를 찾아서 변환
      const regex = new RegExp(`(?<!\\[)${escapedTitle}(?!\\]\\([^)]+\\))(?![^\\[]*\\]\\([^)]+\\))`, 'g');
      
      processedContent = processedContent.replace(
        regex,
        `[${post.title}](/posts/${post.slug})`
      );
    }
    
    return processedContent;
  }, [existingPosts]);

  // 수정 모드일 때 글 로드
  useEffect(() => {
    if (!editSlug || !user || isAuthLoading) return;

    const loadPost = async () => {
      try {
        // API로 글 조회 (RLS 우회)
        const response = await fetch(`/api/posts/${editSlug}?edit=true`, {
          headers: {
            "Authorization": `Bearer ${user.id}`,
          },
        });

        if (!response.ok) {
          router.push("/posts");
          return;
        }

        const { post } = await response.json();

        if (!post) {
          router.push("/posts");
          return;
        }

        // 작성자 본인 확인
        if (user.id !== post.user_id) {
          router.push(`/posts/${editSlug}`);
          return;
        }

        setPostId(post.id);
                // 임시 저장된 데이터가 있는지 확인
        const saved = autoSave.load();
        setTitle(post.title);
        setContent(post.content);
        setExcerpt(post.excerpt || "");
        if (saved?.hasData) {
          const postUpdatedAt = new Date(post.updated_at);
          const savedTime = saved.rawTimestamp ? new Date(saved.rawTimestamp) : null;
          if (savedTime && savedTime > postUpdatedAt) {
            setDraftBanner({ timestamp: saved.timestamp || '이전', data: { title: saved.title, content: saved.content, excerpt: saved.excerpt, tags: saved.tags } });
          } else {
            autoSave.clear();
          }
        }

        // 기존 태그 로드 (API 호출)
        const tagsResponse = await fetch(`/api/tags?postId=${post.id}`);
        if (tagsResponse.ok) {
          const { tags } = await tagsResponse.json();
          if (tags?.length) {
            setTags(tags.join(", "));
          }
        }
      } catch {
        showToast("글 로딩 실패", "error");
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [editSlug, router, user, isAuthLoading]);

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

      // Upload to API with Authorization header
      const formData = new FormData();
      formData.append('file', compressedFile, `${Date.now()}-${Math.random().toString(36).substring(2)}.webp`);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.id}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      const { url } = await response.json();
      return url;
    } catch (err) {
      console.error("Image upload error:", err);
      showToast("이미지 업로드에 실패했습니다.", "error");
      throw new Error("Image upload failed");
    }
  }, [showToast, user?.id]);

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
      // AuthProvider의 user 사용 (auth lock 경쟁 방지)
      const currentUser = user;
      console.log("[DEBUG] Submit - currentUser:", currentUser?.id);
      console.log("[DEBUG] Submit - isEditMode:", isEditMode, "postId:", postId);
      
      if (!currentUser) {
        showToast("로그인이 필요합니다.", "error");
        router.push("/login");
        return;
      }

      // 고유한 slug 생성 (최대 25자)
      let slug: string;
      if (isEditMode) {
        slug = editSlug!;
      } else {
        slug = generateSlug(title);
        // generateSlug가 fallback으로 이미 timestamp 포함 가능성 있음
        // 추가 중복 방지를 위해 짧은 suffix 추가 (총 25자 이내)
        if (!slug.includes('-') || slug.length < 10) {
          const timestamp = Date.now().toString(36).slice(-4);
          slug = `${slug}-${timestamp}`.slice(0, 25);
        }
      }
      
      // Auto-generate excerpt if not provided
      const finalExcerpt = excerpt.trim() || content.slice(0, 150).replace(/[#*`]/g, "") + "...";

      // 태그 파싱
      const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
      
      // 자동 내부 링크 삽입 (발행 시에만 적용)
      let processedContent = content.trim();
      if (published && existingPosts.length > 0) {
        // 수정 모드: editSlug, 신규: 생성된 slug
        const currentSlug = isEditMode ? editSlug : slug;
        processedContent = autoInsertInternalLinks(processedContent, currentSlug || undefined);
        // 링크가 삽입되었으면 content 상태도 업데이트 (에디터에 반영)
        if (processedContent !== content.trim()) {
          setContent(processedContent);
          showToast('자동으로 관련 글 링크가 삽입되었습니다', 'info');
        }
      }

      if (isEditMode && postId) {
        // 수정 모드: API 호출
        console.log("[DEBUG] Updating post via API:", postId, "by user:", currentUser.id);
        const response = await fetch("/api/posts", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.id}`,
          },
          body: JSON.stringify({
            id: postId,
            title: title.trim(),
            slug,
            content: processedContent,
            excerpt: finalExcerpt,
            published,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("[DEBUG] Update API error:", errorData);
          throw new Error(errorData.error || "글 수정에 실패했습니다.");
        }

        console.log("[DEBUG] Update successful via API");

        // 태그 저장 (API에서 기존 태그 삭제 후 새로 저장)
        await saveTags(postId, tagList);

        showToast(published ? "글이 수정되었습니다." : "임시 저장되었습니다.", "success");
        
        // 임시 저장 데이터 정리
        autoSave.clear();
        
        // 히스토리 저장 (수정 시)
        if (postId && user?.id) {
          try {
            await fetch("/api/revisions", {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
                'Authorization': `Bearer ${user.id}`
              },
              body: JSON.stringify({
                post_id: postId,
                title: title.trim(),
                content: content.trim(),
                excerpt: finalExcerpt,
                revision_number: 1,
              }),
            });
          } catch (err) {
            console.error("히스토리 저장 실패:", err);
          }
        }
        
        // IndexNow 알림 (발행된 경우에만)
        if (published) {
          await notifyIndexNow(`/posts/${slug}`);
        }
        
        router.push(`/posts/${slug}`);
      } else {
        // 신규 작성: API 호출
        console.log("[DEBUG] Creating new post via API");
        const response = await fetch("/api/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentUser.id}`,
          },
          body: JSON.stringify({
            user_id: currentUser.id,
            title: title.trim(),
            slug,
            content: processedContent,
            excerpt: finalExcerpt,
            published,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "글 저장에 실패했습니다.");
        }

        const result = await response.json();
        const newPost = result.data;
        console.log("[DEBUG] Post created:", newPost);

        // 태그 저장
        if (newPost?.id) {
          await saveTags(newPost.id, tagList);
        }

        showToast(published ? "글이 발행되었습니다." : "임시 저장되었습니다.", "success");
        
        // 임시 저장 데이터 정리
        autoSave.clear();
        
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

  // 태그 저장 헬퍼 함수 (API 호출)
  const saveTags = async (postId: string, tagList: string[]) => {
    if (!tagList.length || !user?.id) return;

    const response = await fetch("/api/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${user.id}`,
      },
      body: JSON.stringify({
        postId,
        tags: tagList,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "태그 저장 실패");
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      {/* Header - 고정 + 모바일 스크롤 */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-paper border-b border-rule">
        <div className="flex items-center h-12 px-3 sm:px-4 overflow-x-auto scrollbar-hide">
          {/* 좌측: 뒤로가기만 */}
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="p-2 text-muted hover:text-ink transition-colors"
              aria-label="뒤로 가기"
            >
              <ArrowLeft size={20} />
            </Link>
          </div>

          {/* 우측: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 자동 저장 상태 */}
            {lastSaved && (
              <span className="hidden lg:block font-sans text-xs text-muted mr-2">
                {lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 저장됨
              </span>
            )}
            
            {isEditMode && (
              <RevisionHistory
                slug={editSlug}
                currentContent={content}
                currentTitle={title}
                currentExcerpt={excerpt}
                onRestore={(revision) => {
                  setTitle(revision.title);
                  setContent(revision.content);
                  setExcerpt(revision.excerpt);
                }}
              />
            )}

            {/* 미리보기/편집 토글 - 미니멀 아이콘 */}
            <button
              type="button"
              onClick={() => setPreview(!preview)}
              title={preview ? "편집" : "보기"}
              className={`p-2 rounded-sm transition-colors ${
                preview 
                  ? "bg-ink text-paper" 
                  : "border border-rule text-muted hover:border-muted"
              }`}
            >
              {preview ? <Pencil size={16} /> : <Eye size={16} />}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              title="임시저장"
              className="p-2 border border-rule text-muted rounded-sm hover:border-muted transition-colors disabled:opacity-50"
            >
              <Save size={16} />
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              title={isEditMode ? "저장" : "발행"}
              className="p-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors disabled:opacity-50"
            >
              {isEditMode ? <Check size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* 티스토리 스타일: 상단바 + 입력영역 + 하단상태바 3단 레이아웃 */}
      {!isLoading ? (
        <main className="flex-1 flex flex-col w-full min-h-0 pt-12">
          {/* 임시저장 복원 배너 */}
          {draftBanner && (
            <div className="flex items-center gap-3 px-4 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-sm font-sans">
              <span className="text-amber-800 flex-1">
                <strong>{draftBanner.timestamp}</strong>에 임시저장된 내용이 있습니다.
                {draftBanner.data.title && <span className="text-amber-600 ml-1">({draftBanner.data.title.slice(0, 20)}{draftBanner.data.title.length > 20 ? '…' : ''})</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTitle(draftBanner.data.title);
                  setContent(draftBanner.data.content);
                  setExcerpt(draftBanner.data.excerpt);
                  setTags(draftBanner.data.tags);
                  setDraftBanner(null);
                  showToast('임시저장 내용을 불러왔습니다', 'success');
                }}
                className="px-3 py-1 bg-amber-600 text-white rounded-sm text-xs font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
              >
                불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  autoSave.clear();
                  setDraftBanner(null);
                }}
                className="px-3 py-1 border border-amber-300 text-amber-700 rounded-sm text-xs font-medium hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                삭제
              </button>
            </div>
          )}
          {/* 메타 정보 영역 - 풀그리드 너비 */}
          <div className="px-4 sm:px-6 lg:px-8 py-6 border-b-2 border-rule flex-shrink-0">
            {/* 제목 */}
            <input
              id="post-title"
              name="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full text-2xl sm:text-3xl font-black text-ink placeholder-muted/50 bg-transparent border-none focus:outline-none focus:ring-0 mb-3"
            />

            {/* 태그/요약 - 가로 레이아웃 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              {/* 태그 */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-sans font-medium text-muted whitespace-nowrap">태그</span>
                <input
                  id="post-tags"
                  name="post-tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="저작권, 판례, 기술 (쉼표로 구분)"
                  className="flex-1 font-sans text-sm text-ink placeholder:text-muted/40 bg-transparent border-b-2 border-rule/20 focus:border-rust focus:outline-none py-1.5 transition-colors"
                />
              </div>
              {/* 요약 */}
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-sans font-medium text-muted whitespace-nowrap">요약</span>
                <input
                  id="post-excerpt"
                  name="post-excerpt"
                  type="text"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="미입력 시 본문에서 자동 생성됩니다"
                  className="flex-1 font-sans text-sm text-ink placeholder:text-muted/40 bg-transparent border-b-2 border-rule/20 focus:border-rust focus:outline-none py-1.5 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* 본문 에디터 - WriteEditor (툴바 포함) */}
          <WriteEditor
            ref={editorRef}
            content={content}
            setContent={setContent}
            preview={preview}
            onImageUpload={handleImageUpload}
          />

          {/* 하단 고정 글자수 바 */}
          <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 sm:px-6 lg:px-8 border-t border-rule bg-paper/95 backdrop-blur-sm text-xs text-muted">
            <div className="flex items-center gap-4">
              <span className="font-medium text-ink">{content.length.toLocaleString()} 글자</span>
              <span className="hidden sm:inline">{content.trim() ? content.trim().split(/\s+/).length.toLocaleString() : 0} 단어</span>
              <span className="hidden sm:inline">{content.split('\n').length} 줄</span>
              <span className="hidden md:inline text-rust">약 {Math.ceil(content.length / 500)}분 소요</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline opacity-60">Tab: 들여쓰기</span>
              <span className="hidden md:inline opacity-60">Shift+Tab: 내어쓰기</span>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center">
          <span className="text-muted">로딩 중...</span>
        </main>
      )}
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
