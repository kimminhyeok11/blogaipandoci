"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Link2, RefreshCw, ExternalLink, CheckCircle, Wrench } from "lucide-react";

interface Issue {
  type: "internal_link";
  postId: string;
  postTitle: string;
  postSlug: string;
  invalidSlug: string;
  suggestedSlug?: string;
}

interface ValidationResult {
  totalPosts: number;
  issues: Issue[];
  issueCount: number;
}

export default function ValidateLinksPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [rematching, setRematching] = useState<string | null>(null);
  const [batchRematching, setBatchRematching] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentTitle: "" });

  const fetchValidation = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/validate-links", {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("검증 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRematch = async (issue: Issue) => {
    setRematching(issue.postId);
    try {
      const response = await fetch("/api/admin/validate-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          postId: issue.postId,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error("재발행 실패:", data.error);
      }
    } catch (error) {
      console.error("재발행 실패:", error);
    } finally {
      setRematching(null);
    }
  };

  const handleBatchRematch = async () => {
    if (!result) return;
    setBatchRematching(true);
    // 중복된 postId 제거 (한 글당 한 번만 재발행)
    const uniqueIssues = Array.from(
      new Map(result.issues.map(issue => [issue.postId, issue])).values()
    );
    setBatchProgress({ current: 0, total: uniqueIssues.length, currentTitle: "" });
    try {
      // 중복 제거된 문제에 재발행 트리거
      for (let i = 0; i < uniqueIssues.length; i++) {
        const issue = uniqueIssues[i];
        if (issue) {
          setBatchProgress({ current: i, total: uniqueIssues.length, currentTitle: issue.postTitle });
          await handleRematch(issue);
          setBatchProgress({ current: i + 1, total: uniqueIssues.length, currentTitle: issue.postTitle });
        }
      }
      // 일괄수정 완료 후 재검증
      await fetchValidation();
    } catch (error) {
      console.error("일괄 재발행 실패:", error);
    } finally {
      setBatchRematching(false);
      setBatchProgress({ current: 0, total: 0, currentTitle: "" });
    }
  };

  useEffect(() => {
    if (session && !result) {
      fetchValidation();
    }
  }, [session, result]);

  const filteredIssues = result?.issues || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">링크 검증</h1>
          <p className="text-sm text-muted mt-1">
            잘못된 슬러그를 참조하는 내부 링크와 이미지 URL을 검증합니다
          </p>
        </div>
        <div className="flex gap-2">
          {result && result.issueCount > 0 && (
            <button
              onClick={handleBatchRematch}
              disabled={batchRematching || loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-paper rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {batchRematching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{batchProgress.current}/{batchProgress.total}</span>
                  {batchProgress.currentTitle && (
                    <span className="text-xs opacity-70">: {batchProgress.currentTitle.slice(0, 20)}...</span>
                  )}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>일괄 수정</span>
                </>
              )}
            </button>
          )}
          <button
            onClick={fetchValidation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-rust text-paper rounded-lg hover:bg-rust/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            재검증
          </button>
        </div>
      </div>

      {/* 통계 */}
      {result && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-paper border border-ink rounded-sm p-4">
            <div className="text-sm text-muted mb-1">전체 글</div>
            <div className="text-2xl font-bold text-ink">{result.totalPosts}</div>
          </div>
          <div className="bg-paper border border-ink rounded-sm p-4">
            <div className="text-sm text-muted mb-1">문제 발견</div>
            <div className={`text-2xl font-bold ${result.issueCount > 0 ? "text-rust" : "text-green-600"}`}>
              {result.issueCount}
            </div>
          </div>
          <div className="bg-paper border border-ink rounded-sm p-4">
            <div className="text-sm text-muted mb-1">상태</div>
            <div className={`text-2xl font-bold ${result.issueCount === 0 ? "text-green-600" : "text-rust"}`}>
              {result.issueCount === 0 ? "정상" : "문제 있음"}
            </div>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-rust" />
        </div>
      )}

      {/* 문제 없음 */}
      {!loading && result && result.issueCount === 0 && (
        <div className="bg-paper border border-ink rounded-sm p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink mb-2">문제 없음</h3>
          <p className="text-sm text-muted">모든 링크와 이미지 URL이 정상입니다</p>
        </div>
      )}

      {/* 문제 목록 */}
      {!loading && result && result.issueCount > 0 && (
        <div className="space-y-4">
          {filteredIssues.map((issue, index) => (
            <div key={index} className="bg-paper border border-ink rounded-sm p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Link2 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      내부 링크
                    </span>
                    <a
                      href={`/posts/${issue.postSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted hover:text-rust underline underline-offset-2"
                    >
                      {issue.postTitle}
                    </a>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted">잘못된 슬러그:</span>
                      <span className="ml-2 font-mono text-rust">{issue.invalidSlug}</span>
                    </div>
                    {issue.suggestedSlug && (
                      <div>
                        <span className="text-muted">제안 슬러그:</span>
                        <span className="ml-2 font-mono text-green-600">{issue.suggestedSlug}</span>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {issue.suggestedSlug && (
                        <button
                          onClick={() => handleRematch(issue)}
                          disabled={rematching === issue.postId}
                          className="flex items-center gap-1 px-3 py-1.5 bg-rust text-paper rounded-lg text-xs font-medium hover:bg-rust/90 transition-colors disabled:opacity-50"
                        >
                          {rematching === issue.postId ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Wrench className="w-3 h-3" />
                          )}
                          개별수정
                        </button>
                      )}
                      <a
                        href={`/write?edit=${issue.postSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-ink hover:text-rust"
                      >
                        <ExternalLink className="w-3 h-3" />
                        글 수정
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
