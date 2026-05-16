"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp } from "lucide-react";

interface SimilarCase {
  id: string;
  content: string;
  question_type: string;
  topic_tags: string[];
  like_count: number;
  reply_count: number;
  post: {
    title: string;
    slug: string;
  };
}

interface SimilarCasesProps {
  postId: string;
  questionType?: string;
  topicTags?: string[];
}

export function SimilarCases({ postId, questionType, topicTags }: SimilarCasesProps) {
  const [cases, setCases] = useState<SimilarCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSimilarCases();
  }, [postId, questionType, topicTags]);

  const fetchSimilarCases = async () => {
    try {
      // 1차: 현재 글 embedding 기반 RPC 검색 (가장 정확)
      const postEmbedRes = await fetch("/api/comments/similar-by-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, limit: 5 }),
      });
      if (postEmbedRes.ok) {
        const postEmbedData = await postEmbedRes.json();
        if ((postEmbedData.comments || []).length > 0) {
          setCases(postEmbedData.comments);
          return;
        }
      }

      // 2차: 질문 유형/태그 텍스트 기반 semantic search
      if (questionType || topicTags?.length) {
        const queryText = [questionType, ...(topicTags || [])].filter(Boolean).join(" ");
        const semRes = await fetch("/api/embeddings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: queryText, post_id: postId, limit: 5 }),
        });
        if (semRes.ok) {
          const semData = await semRes.json();
          if ((semData.comments || []).length > 0) {
            setCases(semData.comments);
            return;
          }
        }
      }

      // 3차 fallback: 태그 기반 exact match
      const params = new URLSearchParams({ post_id: postId });
      if (questionType) params.append("question_type", questionType);
      if (topicTags?.length) params.append("topic_tags", topicTags.join(","));

      const response = await fetch(`/api/comments/similar?${params}`);
      if (!response.ok) throw new Error("유사 사례 로드 실패");
      const data = await response.json();
      setCases(data.comments || []);
    } catch (error) {
      console.error("유사 사례 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (cases.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 pb-8 border-b border-rule">
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-base font-bold text-ink">비슷한 실제 사례</h3>
        <span className="text-xs text-muted">나와 유사한 상황의 질문·답변을 확인하세요</span>
      </div>
      <div className="space-y-0">
        {cases.map((caseItem, i) => (
          <Link
            key={caseItem.id}
            href={`/posts/${caseItem.post.slug}#comments`}
            className={`block py-4 hover:bg-cream/50 transition-colors ${i < cases.length - 1 ? "border-b border-rule" : ""}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {caseItem.question_type && (
                    <span className="text-rust text-xs font-medium">
                      [{caseItem.question_type}]
                    </span>
                  )}
                  {caseItem.topic_tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="text-muted text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
                <p className="text-ink text-sm leading-relaxed line-clamp-2">
                  {caseItem.content}
                </p>
                <p className="text-xs text-muted mt-1.5 truncate">{caseItem.post.title}</p>
              </div>
              <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {caseItem.reply_count > 0 ? (
                  <span className="px-2 py-0.5 bg-rust text-paper text-xs font-medium">
                    답변 {caseItem.reply_count}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 border border-rule text-muted text-xs">
                    답변 대기
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted">
                  <ThumbsUp size={11} />
                  {caseItem.like_count}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
