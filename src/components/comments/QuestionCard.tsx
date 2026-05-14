"use client";

import { useState } from "react";
import { ThumbsUp, MessageSquare, Eye, Clock, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

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
  isLiked?: boolean;
  onLike?: () => void;
  onReply?: () => void;
}

export function QuestionCard({
  id,
  postTitle,
  postSlug,
  nickname,
  content,
  questionType,
  topicTags,
  likeCount,
  replyCount,
  viewCount,
  createdAt,
  isAnonymous,
  isLiked = false,
  onLike,
  onReply,
}: QuestionCardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [liked, setLiked] = useState(isLiked);
  const [localLikeCount, setLocalLikeCount] = useState(likeCount);

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
    } catch (error) {
      showToast("좋아요 처리에 실패했습니다", "error");
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
        <span className="px-2 py-1 bg-rust/10 text-rust text-xs font-medium rounded-sm">
          {questionType}
        </span>
        {topicTags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-1 bg-cream text-muted text-xs rounded-sm">
            {tag}
          </span>
        ))}
      </div>

      {/* 질문 내용 */}
      <div className="mb-4">
        <p className="text-ink font-medium leading-relaxed">{content}</p>
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
        </div>
      </div>
    </div>
  );
}
