"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThumbsUp, MessageSquare, Eye } from "lucide-react";

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
      const params = new URLSearchParams({
        post_id: postId,
      });

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
    <div className="bg-cream border border-rust/20 rounded-sm p-6 mb-8">
      <h3 className="text-lg font-bold text-ink mb-4">비슷한 실제 사례</h3>
      <div className="space-y-4">
        {cases.map((caseItem) => (
          <Link
            key={caseItem.id}
            href={`/posts/${encodeURIComponent(caseItem.post.slug)}#comments`}
            className="block bg-white border border-rust/10 rounded-sm p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {caseItem.question_type && (
                    <span className="px-2 py-1 bg-rust/10 text-rust text-xs font-medium rounded-sm">
                      {caseItem.question_type}
                    </span>
                  )}
                  {caseItem.topic_tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-cream text-muted text-xs rounded-sm">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-ink text-sm leading-relaxed line-clamp-2 mb-3">
                  {caseItem.content}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <ThumbsUp size={12} />
                    {caseItem.like_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare size={12} />
                    {caseItem.reply_count}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
