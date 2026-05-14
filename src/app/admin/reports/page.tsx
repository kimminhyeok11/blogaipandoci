"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { Flag, Trash2, EyeOff, AlertTriangle, Loader2 } from "lucide-react";

interface ReportGroup {
  comment: {
    id: string;
    content: string;
    nickname: string;
    status: string;
    post: { title: string; slug: string };
  };
  reports: {
    id: string;
    reason: string;
    created_at: string;
    reporter: { nickname: string; email: string } | null;
  }[];
  latestAt: string;
}

export default function AdminReportsPage() {
  const { user, session, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [reportGroups, setReportGroups] = useState<ReportGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (user?.role !== "admin") {
      router.replace("/");
      return;
    }
    fetchReports();
  }, [user, session, isAuthLoading]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports", {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      const data = await res.json();
      setReportGroups(data.reports || []);
    } catch {
      showToast("신고 목록 로드 실패", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async (commentId: string) => {
    try {
      const res = await fetch(`/api/admin/comments/${commentId}/hide`, {
        method: "PUT",
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      if (!res.ok) throw new Error("숨김 실패");
      showToast("숨김 처리되었습니다", "success");
      fetchReports();
    } catch {
      showToast("숨김 처리 실패", "error");
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ user_id: user?.id }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      showToast("삭제되었습니다", "success");
      fetchReports();
    } catch {
      showToast("삭제 실패", "error");
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <Loader2 className="animate-spin text-rust" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Flag size={24} className="text-rust" />
          <h1 className="text-2xl font-black text-ink">신고 관리</h1>
          {reportGroups.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
              {reportGroups.length}건
            </span>
          )}
        </div>

        {reportGroups.length === 0 ? (
          <div className="text-center py-16 text-muted">
            <Flag size={40} className="mx-auto mb-3 opacity-30" />
            <p>신고된 댓글이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reportGroups.map((group) => (
              <div
                key={group.comment.id}
                className="bg-white border border-rule rounded-sm p-5"
              >
                {/* 댓글 정보 */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted">
                        {group.comment.post?.title}
                      </span>
                      {group.comment.status === "hidden" && (
                        <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                          숨김됨
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink font-medium mb-1">
                      {group.comment.nickname}
                    </p>
                    <p className="text-sm text-muted leading-relaxed">
                      {group.comment.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {group.comment.status !== "hidden" && (
                      <button
                        onClick={() => handleHide(group.comment.id)}
                        className="flex items-center gap-1 px-3 py-1.5 border border-rule text-muted text-xs rounded-sm hover:border-orange-400 hover:text-orange-500 transition-colors"
                      >
                        <EyeOff size={13} />
                        숨김
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(group.comment.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-rule text-muted text-xs rounded-sm hover:border-red-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={13} />
                      삭제
                    </button>
                  </div>
                </div>

                {/* 신고 목록 */}
                <div className="border-t border-rule pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={13} className="text-red-500" />
                    <span className="text-xs font-medium text-red-600">
                      신고 {group.reports.length}회
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.reports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center gap-3 text-xs text-muted"
                      >
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-sm">
                          {report.reason}
                        </span>
                        <span>
                          {report.reporter?.nickname || report.reporter?.email || "익명"}
                        </span>
                        <span>
                          {new Date(report.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
