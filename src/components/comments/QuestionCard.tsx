"use client";

import { useState } from "react";
import { ThumbsUp, MessageSquare, Eye, Clock, MoreHorizontal, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";

interface QuestionCardProps {
  id: string;
  postTitle: string;
  postSlug: string;
  nickname: string;
  content: string;
  questionType: string;
  topicTags: string[];
  likeCount: number;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  isAnonymous: boolean;
  userId?: string;
  isSecret?: boolean;
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
  onDelete?: (id: string) => void;
}

export function QuestionCard({
  id,
  postTitle: _postTitle,
  postSlug: _postSlug,
  nickname,
  content,
  questionType,
  topicTags,
  likeCount,
  replyCount,
  viewCount,
  createdAt,
  isAnonymous,
  userId,
  isSecret = false,
  isLiked = false,
  onLike,
  onReply,
  onDelete,
}: QuestionCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [showMenu, setShowMenu] = useState(false);

  const isOwnQuestion = user?.id === userId;
  const isAdmin = user?.role === "admin";
  const canDelete = isOwnQuestion || isAdmin;

  const handleLike = async () => {
    if (!user) {
      showToast("로그인 후 좋아요를 눌러주세요", "error");
      return;
    }

    try {
      const response = await fetch(`/api/comments/${id}/like`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("좋아요 실패");

      setLiked(!liked);
      setLocalLikeCount(liked ? localLikeCount - 1 : localLikeCount + 1);
      onLike?.();
    } catch {
      showToast("좋아요 처리에 실패했습니다", "error");    }
  };

  const handleDelete = async () => {
    if (!confirm("질문을 삭제하시겠습니까?")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
      });
      if (!response.ok) throw new Error("삭제 실패");
      showToast("질문이 삭제되었습니다", "success");
      onDelete?.(id);
    } catch {
      showToast("삭제에 실패했습니다", "error");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <div className="bg-white border border-rust/20 rounded-sm p-5 mb-4 hover:shadow-sm transition-shadow">
      {/* 헤더: 카테고리 + 상황 태그 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isSecret ? (
          <span className="px-2 py-1 bg-gray-100 text-muted text-xs font-medium rounded-sm">비밀 질문</span>
        ) : (
          <>
            <span className="px-2 py-1 bg-rust/10 text-rust text-xs font-medium rounded-sm">
              {questionType}
            </span>
            {topicTags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-1 bg-cream text-muted text-xs rounded-sm">
                {tag}
              </span>
            ))}
          </>
        )}
      </div>

      {/* 질문 내용 */}
      <div className="mb-4">
        {isSecret ? (
          <p className="text-muted text-sm italic">🔒 비밀 질문입니다. 작성자와 관리자만 볼 수 있습니다.</p>
        ) : (
          <p className="text-ink font-medium leading-relaxed">{content}</p>
        )}
      </div>

      {/* 메타 정보 */}
      <div className="flex items-center justify-between text-sm text-muted">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="font-medium text-ink">{isAnonymous ? "익명" : nickname}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={14} />
            {formatTime(createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 hover:text-rust transition-colors ${
              liked ? "text-rust" : ""
            }`}
          >
            <ThumbsUp size={16} className={liked ? "fill-current" : ""} />
            {localLikeCount}
          </button>
          <button
            onClick={onReply}
            className="flex items-center gap-1 hover:text-rust transition-colors"
          >
            <MessageSquare size={16} />
            {replyCount}
          </button>
          <span className="flex items-center gap-1">
            <Eye size={16} />
            {viewCount}
          </span>
          {canDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-muted hover:text-rust transition-colors"
              >
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-6 bg-white border border-rust/20 rounded-sm shadow-sm py-1 min-w-[100px] z-10">
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-rust/5 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
