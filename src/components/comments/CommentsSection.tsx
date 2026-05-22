"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { CommentItem, CommentItemProps } from "./CommentItem";
import { SimilarCases } from "./SimilarCases";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase"; // 닉네임 조회용

interface Comment {
  id: string;
  content: string;
  nickname: string;
  is_anonymous: boolean;
  is_secret?: boolean;
  created_at: string;
  updated_at?: string;
  is_edited?: boolean;
  like_count: number;
  reply_count: number;
  user_id?: string;
  parent_id?: string;
  question_type?: string;
  topic_tags?: string[];
  context_answers?: Record<string, unknown>;
  post_title?: string;
  post_slug?: string;
  replies?: Comment[];
}

interface CommentsSectionProps {
  postId: string;
  postSlug: string;
  postTitle: string;
  initialComments?: Comment[];
}

export function CommentsSection({ postId, postSlug, postTitle, initialComments = [] }: CommentsSectionProps) {
  const { user, session } = useAuth();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [loading, setLoading] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMsg, setGlobalLoadingMsg] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const response = await fetch(`/api/comments?post_id=${postId}`, { headers });
      if (!response.ok) throw new Error("댓글 로드 실패");
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("댓글 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [postId, session?.access_token]);

  useEffect(() => {
    // 로그인 상태 변경 시에만 재fetch (secret 댓글 표시 갱신)
    if (user?.id) {
      fetchComments();
    }
  }, [user?.id, fetchComments]);

  const handleCommentSuccess = async () => {
    setGlobalLoading(true);
    setGlobalLoadingMsg("처리 중입니다");
    try {
      await fetchComments();
    } finally {
      setShowQuestionForm(false);
      setReplyingTo(null);
      setGlobalLoading(false);
    }
  };

  const handleReply = (parentId: string, nickname: string) => {
    setReplyingTo({ id: parentId, nickname });
    setReplyContent("");
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleSubmitReply = async () => {
    if (!replyingTo || !replyContent.trim()) return;
    setIsSubmittingReply(true);
    setGlobalLoading(true);
    setGlobalLoadingMsg("답글을 등록하고 있습니다");
    try {
      // 닉네임은 public.users에서 조회 (user_metadata보다 최신값 보장)
      let dbNickname = "익명";
      if (user?.id) {
        const { data: profile } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", user.id)
          .single();
        dbNickname = profile?.nickname || user.email?.split("@")[0] || "익명";
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          post_id: postId,
          parent_id: replyingTo.id,
          content: replyContent.trim(),
          nickname: dbNickname,
          is_anonymous: !user,
        }),
      });
      if (!res.ok) throw new Error("답글 등록 실패");
      setReplyContent("");
      setReplyingTo(null);
      await fetchComments();
    } catch {
      alert("답글 등록에 실패했습니다.");
    } finally {
      setIsSubmittingReply(false);
      setGlobalLoading(false);
    }
  };

  const renderComments = () => {
    // 질문 카드 (parent_id가 null이고 question_type이 있는 것)
    const questions = comments.filter((c) => !c.parent_id && c.question_type);
    // 일반 댓글 (parent_id가 null이고 question_type이 없는 것)
    const rootComments = comments.filter((c) => !c.parent_id && !c.question_type);

    const convertToCommentItemProps = (c: Comment): CommentItemProps => ({
      id: c.id,
      content: c.content,
      nickname: c.nickname,
      isAnonymous: c.is_anonymous,
      isSecret: c.is_secret,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      isEdited: c.is_edited,
      likeCount: c.like_count,
      replyCount: c.reply_count,
      userId: c.user_id,
      replies: c.replies?.map(convertToCommentItemProps),
    });

    return (
      <>
        {/* 질문 카드 섹션 */}
        {questions.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-ink mb-4">질문 사례</h3>
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                id={question.id}
                postTitle={postTitle}
                postSlug={postSlug}
                nickname={question.nickname}
                content={question.content}
                questionType={question.question_type || ""}
                topicTags={question.topic_tags || []}
                likeCount={question.like_count}
                replyCount={question.reply_count}
                viewCount={0}
                createdAt={question.created_at}
                isAnonymous={question.is_anonymous}
                isSecret={question.is_secret}
                userId={question.user_id}
                onReply={() => handleReply(question.id, question.nickname)}
                onDelete={handleCommentSuccess}
              />
            ))}
          </div>
        )}

        {/* 일반 댓글 섹션 */}
        {rootComments.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-ink mb-4">댓글</h3>
            {rootComments.map((comment) => (
              <CommentItem
                key={comment.id}
                {...convertToCommentItemProps(comment)}
                onReply={handleReply}
                onEdit={handleCommentSuccess}
                onDelete={handleCommentSuccess}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-5 h-5 border-2 border-rust border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted">불러오는 중...</span>
      </div>
    );
  }

  return (
    <>
      {/* 전역 로딩 오버레이 */}
      {globalLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-paper/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-rust border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-sans text-muted">{globalLoadingMsg}</p>
        </div>
      )}

    <div className="max-w-content mx-auto px-4 sm:px-6 py-12">
      <h2 className="text-2xl font-bold text-ink mb-8">질문 및 댓글</h2>

      {/* CTA 문구 */}
      <div className="mb-8 pb-8 border-b border-rule">
        <h3 className="font-bold text-ink mb-1">혹시 본문과 상황이 조금 다르신가요?</h3>
        <p className="text-muted text-sm mb-3">
          실제 사건은 가족관계, 채무 시점, 소송 여부에 따라 결과가 달라질 수 있습니다.
          질문을 남겨주시면 <strong className="text-ink">판례·실무 사례 기반 AI 참고 답변</strong>을 받을 수 있습니다.
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted">
          <span>🤖 판례 데이터 기반 AI 답변</span>
          <span className="text-rule">|</span>
          <span>⚖️ 법률 자문이 아닙니다</span>
          <span className="text-rule">|</span>
          <span>🔒 본인·관리자만 열람</span>
        </div>
        <button
          onClick={() => setShowQuestionForm(!showQuestionForm)}
          className="px-4 py-2 bg-rust text-paper text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
        >
          {showQuestionForm ? "닫기" : "질문 등록하기"}
        </button>
      </div>

      {/* 유사 사례 — 항상 표시 */}
      <SimilarCases postId={postId} />

      {/* 질문 폼 */}
      {showQuestionForm && (
        <QuestionForm postId={postId} onSuccess={handleCommentSuccess} />
      )}

      {/* 답글 폼 */}
      {replyingTo && (
        <div className="mb-6 border-t border-b border-rule py-4">
          <p className="text-xs text-muted mb-3">↩ <span className="font-medium text-ink">{replyingTo.nickname}</span>님에게 답글 · 🔒 본인과 관리자만 열람</p>
          <textarea
            ref={replyInputRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="답글을 입력하세요..."
            rows={3}
            className="w-full px-3 py-2 border border-rule text-sm focus:outline-none focus:border-rust bg-white resize-none mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReplyingTo(null)}
              className="px-4 py-1.5 text-sm border border-rule text-muted hover:border-rust hover:text-rust transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyContent.trim()}
              className="px-4 py-1.5 text-sm bg-rust text-paper hover:bg-rust-light disabled:opacity-50 transition-colors"
            >
              답글 등록
            </button>
          </div>
        </div>
      )}

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <div className="py-12 text-center border-t border-rule">
          <p className="text-sm text-muted">아직 질문이 없습니다. 첫 번째 질문을 등록해보세요.</p>
        </div>
      ) : (
        renderComments()
      )}
    </div>
    </>
  );
}
