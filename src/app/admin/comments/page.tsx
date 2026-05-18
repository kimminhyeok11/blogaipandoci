"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Filter,
  AlertTriangle,
  Clock
} from "lucide-react";

interface Comment {
  id: string;
  content: string;
  nickname: string;
  is_anonymous: boolean;
  status: string;
  risk_score: number;
  question_type: string;
  topic_tags: string[];
  like_count: number;
  reply_count: number;
  created_at: string;
  post: {
    title: string;
    slug: string;
  };
}

export default function AdminCommentsPage() {
  const { user, session } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "public" | "hidden" | "law_risk">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // layout.tsx에서 권한 체크 완료, filter 변경시에만 로드
    fetchComments();
  }, [filter]);

  const fetchComments = async () => {
    if (!session?.access_token) return;
    try {
      const response = await fetch(`/api/admin/comments?filter=${filter}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("댓글 로드 실패");
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (commentId: string) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/approve`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!response.ok) throw new Error("승인 실패");
      showToast("댓글이 승인되었습니다", "success");
      fetchComments();
    } catch (error) {
      showToast("승인 실패", "error");
    }
  };

  const handleHide = async (commentId: string) => {
    try {
      const response = await fetch(`/api/admin/comments/${commentId}/hide`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!response.ok) throw new Error("숨김 실패");
      showToast("댓글이 숨겨졌습니다", "success");
      fetchComments();
    } catch (error) {
      showToast("숨김 실패", "error");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: user?.id }),
      });
      if (!response.ok) throw new Error("삭제 실패");
      showToast("댓글이 삭제되었습니다", "success");
      fetchComments();
    } catch (error) {
      showToast("삭제 실패", "error");
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const response = await fetch(`/api/admin/comments/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!response.ok) throw new Error("내보내기 실패");
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comments.${format}`;
      a.click();
      
      showToast("내보내기 완료", "success");
    } catch (error) {
      showToast("내보내기 실패", "error");
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">관리자만 접근할 수 있습니다.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "검토 중" },
      public: { bg: "bg-green-100", text: "text-green-800", label: "공개" },
      hidden: { bg: "bg-gray-100", text: "text-gray-800", label: "숨김" },
      law_risk: { bg: "bg-red-100", text: "text-red-800", label: "위험" },
      deleted: { bg: "bg-red-100", text: "text-red-800", label: "삭제" },
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-sm ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-3xl font-bold text-ink mb-8">댓글 관리</h1>

        {/* 필터 및 액션 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-muted" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-2 border border-rust/20 rounded-sm focus:outline-none focus:border-rust"
            >
              <option value="pending">검토 중</option>
              <option value="public">공개</option>
              <option value="hidden">숨김</option>
              <option value="law_risk">위험</option>
              <option value="all">전체</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-2 px-4 py-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors"
            >
              <Download size={16} />
              내보내기
            </button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-rust/20 rounded-sm p-4">
            <div className="flex items-center gap-3">
              <Clock className="text-rust size-5" />
              <div>
                <p className="text-sm text-muted">검토 중</p>
                <p className="text-2xl font-bold text-ink">
                  {comments.filter((c) => c.status === "pending").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-rust/20 rounded-sm p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-600 size-5" />
              <div>
                <p className="text-sm text-muted">공개</p>
                <p className="text-2xl font-bold text-ink">
                  {comments.filter((c) => c.status === "public").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-rust/20 rounded-sm p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-600 size-5" />
              <div>
                <p className="text-sm text-muted">위험</p>
                <p className="text-2xl font-bold text-ink">
                  {comments.filter((c) => c.status === "law_risk").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border border-rust/20 rounded-sm p-4">
            <div className="flex items-center gap-3">
              <Eye className="text-muted size-5" />
              <div>
                <p className="text-sm text-muted">전체</p>
                <p className="text-2xl font-bold text-ink">{comments.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 댓글 목록 */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <div className="text-center py-12 border border-rust/10 rounded-sm bg-cream">
              <p className="text-muted">댓글이 없습니다.</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-white border border-rust/20 rounded-sm p-5 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">
                      {comment.is_anonymous ? "익명" : comment.nickname}
                    </span>
                    {getStatusBadge(comment.status)}
                    {comment.risk_score > 50 && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-sm">
                        위험도: {comment.risk_score}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted">
                    {new Date(comment.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>

                {comment.question_type && (
                  <div className="mb-2">
                    <span className="px-2 py-1 bg-rust/10 text-rust text-xs font-medium rounded-sm">
                      {comment.question_type}
                    </span>
                    {comment.topic_tags.map((tag) => (
                      <span key={tag} className="ml-1 px-2 py-1 bg-cream text-muted text-xs rounded-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-ink text-sm leading-relaxed mb-3">{comment.content}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span>👍 {comment.like_count}</span>
                    <span>💬 {comment.reply_count}</span>
                    <a
                      href={`/posts/${encodeURIComponent(comment.post.slug)}#comments`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rust hover:underline"
                    >
                      {comment.post.title}
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {comment.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(comment.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs rounded-sm hover:bg-green-700"
                        >
                          <CheckCircle size={14} />
                          승인
                        </button>
                        <button
                          onClick={() => handleHide(comment.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-xs rounded-sm hover:bg-gray-700"
                        >
                          <XCircle size={14} />
                          숨김
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs rounded-sm hover:bg-red-700"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
