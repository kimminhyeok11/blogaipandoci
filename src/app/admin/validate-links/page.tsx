"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AlertTriangle, Link2, Image as ImageIcon, RefreshCw, ExternalLink, CheckCircle } from "lucide-react";

interface Issue {
  type: "internal_link" | "image_url";
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
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [filter, setFilter] = useState<"all" | "internal_link" | "image_url">("all");

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

  useEffect(() => {
    if (session) {
      fetchValidation();
    }
  }, [session]);

  const filteredIssues = result?.issues.filter((issue) =>
    filter === "all" ? true : issue.type === filter
  ) || [];

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
        <button
          onClick={fetchValidation}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-rust text-paper rounded-lg hover:bg-rust/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          재검증
        </button>
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

      {/* 필터 */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all" ? "bg-rust text-paper" : "bg-paper text-ink hover:bg-cream"
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter("internal_link")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "internal_link" ? "bg-rust text-paper" : "bg-paper text-ink hover:bg-cream"
          }`}
        >
          내부 링크
        </button>
        <button
          onClick={() => setFilter("image_url")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "image_url" ? "bg-rust text-paper" : "bg-paper text-ink hover:bg-cream"
          }`}
        >
          이미지 URL
        </button>
      </div>

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
                <div className={`p-2 rounded-lg ${issue.type === "internal_link" ? "bg-blue-100" : "bg-purple-100"}`}>
                  {issue.type === "internal_link" ? (
                    <Link2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-purple-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      issue.type === "internal_link" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                    }`}>
                      {issue.type === "internal_link" ? "내부 링크" : "이미지 URL"}
                    </span>
                    <span className="text-sm text-muted">
                      {issue.postTitle}
                    </span>
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
