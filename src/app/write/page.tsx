"use client";

import { useState, useCallback, useEffect, useRef, Suspense, lazy } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, Edit3, Eye } from "lucide-react";
import { cn } from "@/utils/cn";
import { generateSlug } from "@/utils/image";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import { RevisionHistory } from "@/components/editor/RevisionHistory";
import { StickyNav } from "@/components/layout/StickyNav";

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
import type { MarkdownEditorRef } from "@/components/editor/MarkdownEditor";
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
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [postId, setPostId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [preview, setPreview] = useState(false); // 에디터 미리보기 상태
  const pageScrollRef = useRef<number>(0); // 페이지 스크롤 위치 저장용
  const editorScrollRef = useRef<{ editor: number; preview: number }>({ editor: 0, preview: 0 }); // 에디터 내부 스크롤 저장용
  const editorRef = useRef<MarkdownEditorRef>(null); // MarkdownEditor ref
  
  // 기존 게시글 목록 (자동 내부 링크용)
  const [existingPosts, setExistingPosts] = useState<Array<{ title: string; slug: string }>>([]);

  // 미리보기/편집 전환 시 스크롤 위치 복원 (페이지 + 에디터)
  useEffect(() => {
    const timeout = setTimeout(() => {
      // 페이지 스크롤 복원
      window.scrollTo(0, pageScrollRef.current);
      // 에디터 내부 스크롤 복원
      editorRef.current?.restoreScrollPosition(editorScrollRef.current);
    }, 50);
    return () => clearTimeout(timeout);
  }, [preview]);

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

  // 수정 모드: 기존 게시글 불러오기
  useEffect(() => {
    if (!editSlug || isAuthLoading || !user) return;

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

      // 고유한 slug 생성
      let slug: string;
      if (isEditMode) {
        slug = editSlug!;
      } else {
        slug = generateSlug(title);
        // generateSlug가 fallback으로 이미 timestamp 포함 가능성 있음
        // 추가 중복 방지를 위해 짧은 suffix 추가
        if (!slug.includes('-') || slug.length < 10) {
          const timestamp = Date.now().toString(36).slice(-4);
          slug = `${slug}-${timestamp}`;
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
        clearLocalStorage();
        
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
              
              {/* 글 히스토리 (수정 모드에서만) */}
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
              
              {/* 미리보기/편집 토글 버튼 */}
              <button
                type="button"
                onClick={() => {
                  // 페이지 스크롤 위치 저장
                  pageScrollRef.current = window.scrollY;
                  // 에디터 내부 스크롤 위치 저장
                  if (editorRef.current) {
                    editorScrollRef.current = editorRef.current.saveScrollPosition();
                  }
                  setPreview(!preview);
                }}
                className={`px-2 py-1 text-xs font-sans font-medium rounded-sm transition-colors ${
                  preview 
                    ? "bg-ink text-paper hover:bg-ink/90" 
                    : "border border-rule text-muted hover:border-muted"
                }`}
              >
                {preview ? "작성" : "보기"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="px-2 py-1 border border-rule text-muted text-xs font-sans font-medium rounded-sm hover:border-muted transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "..." : "임시"}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isSubmitting}
                className="px-3 py-1 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors disabled:opacity-50"
              >
                {isEditMode ? "저장" : "발행"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 상단 고정 영역: 메타 정보 (제목/태그/요약) */}
      <div className="sticky top-14 z-40 bg-paper border-b border-rule">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3 text-muted">
                <Loader2 size={24} className="animate-spin" />
                <span className="font-sans text-sm">글을 불러오는 중...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Title Input - 본문과 통일된 스타일 */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                className="w-full bg-paper text-2xl sm:text-3xl font-black text-ink placeholder-muted border-b-2 border-rule pb-3 px-4 -mx-4 focus:outline-none focus:border-rust transition-colors"
              />

              {/* Tags & Excerpt Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <input
                    type="text"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="글의 핵심 내용을 1-2문장으로 요약해주세요"
                    className="w-full px-3 py-2 bg-cream border border-rule rounded-sm text-sm font-sans text-ink placeholder-muted focus:outline-none focus:border-rust transition-colors"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 중단 본문 영역: 페이지 스크롤로 자연스럽게 늘어남 */}
      <main className="max-w-content mx-auto px-4 sm:px-6 py-6 pb-20">
        {!isLoading && (
          <div>
            <label className="block font-sans text-xs font-medium text-muted mb-3 uppercase tracking-wider">
              내용
            </label>
            <MarkdownEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              preview={preview}
              placeholder="마크다운으로 글을 작성하세요...

## 제목을 이렇게 작성하세요

**굵은 글씨**와 *기울임*을 사용할 수 있습니다.

> 인용구도 이렇게 작성할 수 있습니다.

- 목록 아이템
- 또 다른 아이템

1. 번호 목록
2. 두 번째 항목"
              minHeight="calc(100vh - 400px)"
              maxHeight="none"
              onImageUpload={handleImageUpload}
            />
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
