"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { History, X, RotateCcw, Loader2, ChevronDown } from "lucide-react";

interface Revision {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  created_at: string;
  revision_number: number;
}

interface RevisionHistoryProps {
  slug: string | null;
  currentContent: string;
  currentTitle: string;
  currentExcerpt: string;
  onRestore: (revision: Revision) => void;
}

export function RevisionHistory({
  slug,
  currentContent,
  currentTitle,
  currentExcerpt,
  onRestore,
}: RevisionHistoryProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(
    null
  );
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchRevisions = useCallback(async () => {
    if (!slug) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/revisions?slug=${slug}`);
      if (!response.ok) {
        throw new Error("Failed to fetch revisions");
      }
      const data = await response.json();
      setRevisions(data.revisions || []);
    } catch (error) {
      console.error("Revisions fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (isOpen && slug) {
      fetchRevisions();
    }
  }, [isOpen, slug, fetchRevisions]);

  const handleSaveRevision = async () => {
    if (!slug) {
      showToast("새 글은 저장 후 히스토리를 사용할 수 있습니다", "warning");
      return;
    }

    try {
      const response = await fetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: slug,
          title: currentTitle,
          content: currentContent,
          excerpt: currentExcerpt,
          revision_number: revisions.length + 1,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save revision");
      }

      showToast("현재 내용이 히스토리에 저장되었습니다", "success");
      fetchRevisions();
    } catch (error) {
      console.error("Revision save error:", error);
      showToast("히스토리 저장에 실패했습니다", "error");
    }
  };

  const handleRestore = async (revision: Revision) => {
    const confirmed = window.confirm(
      `"${revision.title.slice(0, 30)}..." 버전으로 되돌리시겠습니까?\n\n현재 내용은 덮어씌워집니다.`
    );

    if (!confirmed) return;

    setIsRestoring(true);
    try {
      onRestore(revision);
      showToast("이전 버전으로 복원되었습니다", "success");
      setSelectedRevision(null);
    } catch (error) {
      console.error("Restore error:", error);
      showToast("복원에 실패했습니다", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!slug) {
    return null;
  }

  return (
    <>
      {/* 히스토리 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium text-muted hover:text-ink transition-colors"
        title="글 히스토리"
      >
        <History size={14} />
        히스토리
        {revisions.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-cream rounded-full text-xs">
            {revisions.length}
          </span>
        )}
      </button>

      {/* 히스토리 모달 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-paper border border-rule rounded-sm w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-rule">
              <h2 className="font-sans text-sm font-medium text-ink flex items-center gap-2">
                <History size={16} />
                글 히스토리
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-cream rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 현재 저장 버튼 */}
            <div className="p-4 border-b border-rule bg-cream/50">
              <button
                onClick={handleSaveRevision}
                className="flex items-center gap-2 px-3 py-1.5 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
              >
                <History size={14} />
                현재 내용 히스토리에 저장
              </button>
            </div>

            {/* 리비전 목록 */}
            <div className="overflow-y-auto max-h-[50vh]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-muted" />
                </div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-muted font-sans text-sm">
                  저장된 히스토리가 없습니다
                </div>
              ) : (
                <div className="divide-y divide-rule">
                  {revisions.map((revision, index) => (
                    <div
                      key={revision.id}
                      className="p-4 hover:bg-cream/30 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-sans text-muted">
                              버전 {revision.revision_number}
                            </span>
                            <span className="text-xs text-muted">·</span>
                            <span className="text-xs font-sans text-muted">
                              {formatDate(revision.created_at)}
                            </span>
                            {index === 0 && (
                              <span className="px-1.5 py-0.5 bg-rust/10 text-rust text-xs rounded">
                                최신
                              </span>
                            )}
                          </div>
                          <p className="font-serif text-sm text-ink line-clamp-1">
                            {revision.title}
                          </p>
                          <p className="font-sans text-xs text-muted mt-1 line-clamp-2">
                            {revision.excerpt ||
                              revision.content.slice(0, 100) + "..."}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(revision)}
                          disabled={isRestoring}
                          className="ml-4 flex items-center gap-1 px-2 py-1 text-xs font-sans text-muted hover:text-rust transition-colors"
                          title="이 버전으로 복원"
                        >
                          {isRestoring ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <RotateCcw size={14} />
                          )}
                          복원
                        </button>
                      </div>

                      {/* 미리보기 토글 */}
                      <button
                        onClick={() =>
                          setSelectedRevision(
                            selectedRevision?.id === revision.id
                              ? null
                              : revision
                          )
                        }
                        className="mt-2 flex items-center gap-1 text-xs font-sans text-muted hover:text-ink transition-colors"
                      >
                        <ChevronDown
                          size={14}
                          className={`transition-transform ${
                            selectedRevision?.id === revision.id
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                        {selectedRevision?.id === revision.id
                          ? "접기"
                          : "내용 미리보기"}
                      </button>

                      {/* 내용 미리보기 */}
                      {selectedRevision?.id === revision.id && (
                        <div className="mt-3 p-3 bg-cream/50 border border-rule rounded-sm">
                          <h4 className="font-serif text-sm font-medium mb-2">
                            {revision.title}
                          </h4>
                          <div className="font-serif text-sm text-ink/80 whitespace-pre-wrap line-clamp-10">
                            {revision.content}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-rule bg-cream/30">
              <p className="font-sans text-xs text-muted">
                최대 10개의 히스토리가 저장됩니다. 오래된 히스토리는 자동으로
                삭제됩니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
