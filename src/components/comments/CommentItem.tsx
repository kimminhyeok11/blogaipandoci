"use client";

import { useState } from "react";
import { ThumbsUp, MessageSquare, MoreHorizontal, Edit2, Trash2, Flag } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

export interface CommentItemProps {
  id: string;
  content: string;
  nickname: string;
  isAnonymous: boolean;
  isSecret?: boolean;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  likeCount: number;
  replyCount: number;
  isLiked?: boolean;
  userId?: string;
  parentId?: string;
  replies?: CommentItemProps[];
  onReply?: (parentId: string, nickname: string) => void;
  onEdit?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
}

export function CommentItem({
  id,
  content,
  nickname,
  isAnonymous,
  createdAt,
  updatedAt,
  isEdited = false,
  likeCount,
  replyCount,
  isLiked = false,
  userId,
  isSecret = false,
  parentId,
  replies = [],
  onReply,
  onEdit,
  onDelete,
  onReport,
}: CommentItemProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);
  const [showMenu, setShowMenu] = useState(false);
  const [showReplies, setShowReplies] = useState(false);

  const isOwnComment = user?.id === userId;
  const isAdmin = user?.role === "admin";
  const canModify = isOwnComment || isAdmin;

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
    } catch (error) {
      showToast("좋아요 처리에 실패했습니다", "error");
    }
  };

  const handleReply = () => {
    onReply?.(id, isAnonymous ? "익명" : nickname);
  };

  const handleEdit = () => {
    onEdit?.(id, content);
  };

  const handleDelete = async () => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      const response = await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user?.id }),
      });

      if (!response.ok) throw new Error("삭제 실패");

      showToast("댓글이 삭제되었습니다", "success");
      onDelete?.(id);
    } catch (error) {
      showToast("삭제에 실패했습니다", "error");
    }
  };

  const handleReport = async () => {
    if (!user) {
      showToast("로그인 후 신고할 수 있습니다", "error");
      return;
    }
    const reasons = ["개인정보 노출", "욕설/혜시", "명예훼손", "스팸/광고", "기타"];
    const reason = window.prompt(
      `신고 사유를 선택하세요:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n번호를 입력하거나 스스로 사유를 입력하세요`
    );
    if (!reason) return;
    const selectedReason = reasons[parseInt(reason) - 1] || reason;

    try {
      const response = await fetch(`/api/comments/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter_id: user.id, reason: selectedReason }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showToast("신고가 접수되었습니다", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "신고에 실패했습니다", "error");
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
    <div className={`${parentId ? "ml-8 mt-4" : "mb-6"} border-l-2 border-rust/10 pl-4`}>
      <div className="flex gap-3">
        {/* 아바타 */}
        <div className="w-10 h-10 bg-rust/10 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-rust font-medium text-sm">
            {isAnonymous ? "익" : nickname.charAt(0)}
          </span>
        </div>

        {/* 댓글 내용 */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-ink text-sm">
              {isAnonymous ? "익명" : nickname}
            </span>
            <span className="text-muted text-xs">{formatTime(createdAt)}</span>
            {isEdited && (
              <span className="text-muted text-xs">(수정됨)</span>
            )}
          </div>

          {isSecret ? (
            <p className="text-muted text-sm italic mb-3">🔒 비밀 댓글입니다. 작성자와 관리자만 볼 수 있습니다.</p>
          ) : (
            <p className="text-ink text-sm leading-relaxed mb-3">{content}</p>
          )}

          {/* 액션 버튼 */}
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-muted hover:text-rust transition-colors ${
                liked ? "text-rust" : ""
              }`}
            >
              <ThumbsUp size={14} className={liked ? "fill-current" : ""} />
              {localLikeCount}
            </button>

            <button
              onClick={handleReply}
              className="flex items-center gap-1 text-muted hover:text-rust transition-colors"
            >
              <MessageSquare size={14} />
              답글
            </button>

            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="text-muted hover:text-rust transition-colors"
              >
                {showReplies ? "답글 숨기기" : `답글 ${replyCount}개`}
              </button>
            )}

            {/* 메뉴 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-muted hover:text-rust transition-colors"
              >
                <MoreHorizontal size={14} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-6 bg-white border border-rust/20 rounded-sm shadow-sm py-1 min-w-[120px] z-10">
                  {canModify ? (
                    <>
                      {isOwnComment && (
                        <button
                          onClick={handleEdit}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-rust/5 flex items-center gap-2"
                        >
                          <Edit2 size={14} />
                          수정
                        </button>
                      )}
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-rust/5 text-red-600 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        삭제
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleReport}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-rust/5 flex items-center gap-2"
                    >
                      <Flag size={14} />
                      신고
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 대댓글 목록 */}
          {showReplies && replies.length > 0 && (
            <div className="mt-4">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  {...reply}
                  parentId={id}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReport={onReport}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
