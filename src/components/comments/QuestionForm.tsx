"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase/client";
import { LogIn, Info, ChevronDown, ChevronUp } from "lucide-react";

interface QuestionFormProps {
  postId: string;
  onSuccess?: () => void;
}

const QUESTION_TYPES = ['상속·유언', '전세·임대차', '명예훼손·모욕', '채무·금전', '이혼·가족', '형사·고소', '계약·거래', '기타'] as const;

interface FormData {
  whoProblem: string;
  questionType: string;
  currentSituation: string[];
  procedure: string[];
  concern: string;
  content: string;
}

export function QuestionForm({ postId, onSuccess }: QuestionFormProps) {
  const { user, session } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbNickname, setDbNickname] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    whoProblem: "본인",
    questionType: "",
    currentSituation: [],
    procedure: [],
    concern: "",
    content: "",
  });

  // 로그인 시 DB에서 닉네임 조회
  useEffect(() => {
    if (!user) return;
    supabase
      .from("users")
      .select("nickname")
      .eq("id", user.id)
      .single()
      .then(({ data }: { data: { nickname: string } | null }) => {
        if (data?.nickname) setDbNickname(data.nickname);
      });
  }, [user]);

  const handleCheckboxChange = (field: "currentSituation" | "procedure", value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((v) => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      showToast("질문 내용을 입력해주세요", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          post_id: postId,
          content: formData.content,
          nickname: dbNickname || user?.email?.split("@")[0] || "익명",
          is_anonymous: false,
          question_type: formData.questionType || formData.whoProblem,
          topic_tags: [...formData.currentSituation, ...formData.procedure],
          context_answers: {
            whoProblem: formData.whoProblem,
            questionType: formData.questionType,
            currentSituation: formData.currentSituation,
            procedure: formData.procedure,
            concern: formData.concern,
          },
        }),
      });

      if (!response.ok) throw new Error("질문 등록 실패");

      showToast("질문이 등록되었습니다. 검토 후 공개됩니다.", "success");
      setFormData({ whoProblem: "본인", questionType: "", currentSituation: [], procedure: [], concern: "", content: "" });
      onSuccess?.();
    } catch {
      showToast("질문 등록에 실패했습니다", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, postId, user, dbNickname, showToast, onSuccess, session?.access_token]);

  // 비로그인 시 로그인 유도 UI
  if (!user) {
    return (
      <div className="bg-cream border border-rule rounded-sm p-8 mb-8 text-center">
        <LogIn className="mx-auto mb-3 text-rust" size={32} />
        <p className="font-medium text-ink mb-1">질문하려면 로그인이 필요합니다</p>
        <p className="text-sm text-muted mb-5">로그인 후 이 글에 대한 법률 질문을 남길 수 있습니다.</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-rust text-paper text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
        >
          <LogIn size={16} />
          로그인하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-8 pb-8 border-b border-rule">
      {/* 법적 안내 */}
      <div className="flex items-start gap-2 text-xs text-muted pb-4 mb-5 border-b border-rule">
        <Info size={13} className="mt-0.5 flex-shrink-0 text-rust/70" />
        <span>판례·실무 사례 기반 AI 참고 답변입니다. 법률 자문이 아니며, 중요한 사안은 변호사 상담을 받으세요.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 핵심 1: 누구 문제인가요 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            누구 문제인가요?
          </label>
          <div className="flex flex-wrap gap-3">
            {["본인", "부모", "배우자", "자녀", "기타"].map((option) => (
              <label key={option} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="whoProblem"
                  value={option}
                  checked={formData.whoProblem === option}
                  onChange={(e) => setFormData({ ...formData, whoProblem: e.target.value })}
                  className="w-4 h-4 accent-rust"
                />
                <span className="text-sm text-ink">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 핵심 2: 사건 유형 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            사건 유형 <span className="text-xs text-muted font-normal">(선택)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFormData({ ...formData, questionType: formData.questionType === type ? "" : type })}
                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                  formData.questionType === type
                    ? "bg-rust text-paper border-rust"
                    : "bg-white text-ink border-rule hover:border-rust/50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* 핵심 3: 질문 내용 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            질문 내용 <span className="text-xs text-rust font-normal">*필수</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="궁금한 점을 입력해주세요. 개인정보(이름·연락처·주민번호 등)는 입력하지 마세요."
            rows={4}
            required
            className="w-full px-3 py-2 border border-rule focus:outline-none focus:border-rust text-sm bg-white resize-none"
          />
        </div>

        {/* 상세 입력 토글 */}
        <button
          type="button"
          onClick={() => setShowDetail(!showDetail)}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-rust transition-colors"
        >
          {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showDetail ? "상세 입력 닫기" : "더 자세히 입력하면 정확한 답변에 도움됩니다"}
        </button>

        {/* 상세 입력 영역 (토글) */}
        {showDetail && (
          <div className="space-y-5 pt-2 border-t border-rule">
            {/* 현재 상황 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                현재 상황 <span className="text-xs text-muted font-normal">(복수 선택 가능)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {["분쟁 중", "소송·법원", "계약 문제", "형사·경찰", "행정·민원", "금전 문제", "기타"].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      formData.currentSituation.includes(option)
                        ? "bg-rust text-paper border-rust"
                        : "bg-white text-ink border-rule hover:border-rust/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.currentSituation.includes(option)}
                      onChange={() => handleCheckboxChange("currentSituation", option)}
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            {/* 법적 절차 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                법적 절차 진행 여부 <span className="text-xs text-muted font-normal">(복수 선택 가능)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {["내용증명", "고소·고발", "조정·중재", "소송 제기", "항소·상고", "없음"].map((option) => (
                  <label
                    key={option}
                    className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      formData.procedure.includes(option)
                        ? "bg-rust text-paper border-rust"
                        : "bg-white text-ink border-rule hover:border-rust/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.procedure.includes(option)}
                      onChange={() => handleCheckboxChange("procedure", option)}
                      className="hidden"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>

            {/* 가장 걱정되는 부분 */}
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">
                가장 걱정되는 부분 <span className="text-xs text-muted font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={formData.concern}
                onChange={(e) => setFormData({ ...formData, concern: e.target.value })}
                placeholder="예: 합의금 수준, 형사 처벌 가능성, 계약 해지 가능 여부 등"
                className="w-full px-3 py-2 border border-rule focus:outline-none focus:border-rust text-sm bg-white"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-rust text-paper font-medium hover:bg-rust-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isSubmitting ? "등록 중..." : "질문 등록하기"}
        </button>
      </form>
    </div>
  );
}
