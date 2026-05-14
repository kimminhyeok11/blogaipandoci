"use client";

import { useState, useEffect, useRef } from "react";
import { QuestionForm } from "./QuestionForm";
import { QuestionCard } from "./QuestionCard";
import { CommentItem, CommentItemProps } from "./CommentItem";
import { SimilarCases } from "./SimilarCases";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase";

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
}

export function CommentsSection({ postId, postSlug, postTitle }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; nickname: string } | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchComments();
  }, [postId, user?.id]);

  const fetchComments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
  };

  const handleCommentSuccess = () => {
    fetchComments();
    setShowQuestionForm(false);
    setReplyingTo(null);
  };

  const handleReply = (parentId: string, nickname: string) => {
    setReplyingTo({ id: parentId, nickname });
    setReplyContent("");
    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const handleSubmitReply = async () => {
    if (!replyingTo || !replyContent.trim()) return;
    setIsSubmittingReply(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          parent_id: replyingTo.id,
          content: replyContent.trim(),
          user_id: user?.id || null,
          nickname: dbNickname,
          is_anonymous: !user,
        }),
      });
      if (!res.ok) throw new Error("답글 등록 실패");
      setReplyContent("");
      setReplyingTo(null);
      fetchComments();
    } catch {
      alert("답글 등록에 실패했습니다.");
    } finally {
      setIsSubmittingReply(false);
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
                onDelete={() => fetchComments()}
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
    return <div className="text-center py-8 text-muted">로딩 중...</div>;
  }

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-12">
      <h2 className="text-2xl font-bold text-ink mb-8">질문 및 댓글</h2>

      {/* CTA 문구 */}
      <div className="bg-cream border border-rust/20 rounded-sm p-6 mb-8">
        <h3 className="font-bold text-ink mb-2">혹시 본문과 상황이 조금 다르신가요?</h3>
        <p className="text-muted text-sm mb-4">
          실제 사건은 가족관계, 채무 시점, 소송 여부에 따라 결과가 달라질 수 있습니다.
          아래 질문 카드로 상황을 남겨주시면 공개 판례·실무 사례 기준으로 참고 가능한 내용을 정리해드립니다.
        </p>
        <button
          onClick={() => setShowQuestionForm(!showQuestionForm)}
          className="px-4 py-2 bg-rust text-paper text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
        >
          {showQuestionForm ? "닫기" : "질문 등록하기"}
        </button>
      </div>

      {/* 질문 폼 */}
      {showQuestionForm && (
        <>
          <SimilarCases postId={postId} />
          <QuestionForm postId={postId} onSuccess={handleCommentSuccess} />
        </>
      )}

      {/* 답글 폼 */}
      {replyingTo && (
        <div className="mb-6 p-4 bg-cream border border-rust/20 rounded-sm">
          <p className="text-sm text-muted mb-2">
            <span className="font-medium text-ink">{replyingTo.nickname}</span>님에게 답글 작성
          </p>
          <textarea
            ref={replyInputRef}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="답글을 입력하세요..."
            rows={3}
            className="w-full px-3 py-2 border border-rule rounded-sm text-sm focus:outline-none focus:border-rust bg-white resize-none mb-2"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setReplyingTo(null)}
              className="px-4 py-1.5 text-sm border border-rule text-muted rounded-sm hover:border-rust hover:text-rust transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmitReply}
              disabled={isSubmittingReply || !replyContent.trim()}
              className="px-4 py-1.5 text-sm bg-rust text-paper rounded-sm hover:bg-rust-light disabled:opacity-50 transition-colors"
            >
              {isSubmittingReply ? "등록 중..." : "답글 등록"}
            </button>
          </div>
        </div>
      )}

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <div className="text-center py-12 border border-rust/10 rounded-sm bg-cream">
          <p className="text-muted">아직 질문이나 댓글이 없습니다. 첫 번째 질문을 등록해보세요!</p>
        </div>
      ) : (
        renderComments()
      )}
    </div>
  );
}
