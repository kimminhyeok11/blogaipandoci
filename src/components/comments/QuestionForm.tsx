"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { supabase } from "@/lib/supabase";
import { LogIn, Info } from "lucide-react";

interface QuestionFormProps {
  postId: string;
  onSuccess?: () => void;
}

interface FormData {
  whoProblem: string;
  currentSituation: string[];
  procedure: string[];
  concern: string;
  content: string;
}

export function QuestionForm({ postId, onSuccess }: QuestionFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbNickname, setDbNickname] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    whoProblem: "본인",
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          content: formData.content,
          nickname: dbNickname || user?.email?.split("@")[0] || "익명",
          user_id: user?.id || null,
          is_anonymous: false,
          question_type: formData.whoProblem,
          topic_tags: [...formData.currentSituation, ...formData.procedure],
          context_answers: {
            whoProblem: formData.whoProblem,
            currentSituation: formData.currentSituation,
            procedure: formData.procedure,
            concern: formData.concern,
          },
        }),
      });

      if (!response.ok) throw new Error("질문 등록 실패");

      showToast("질문이 등록되었습니다. 검토 후 공개됩니다.", "success");
      setFormData({ whoProblem: "본인", currentSituation: [], procedure: [], concern: "", content: "" });
      onSuccess?.();
    } catch (error) {
      showToast("질문 등록에 실패했습니다", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, postId, user, dbNickname, showToast, onSuccess]);

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
    <div className="bg-cream border border-rust/20 rounded-sm p-6 mb-8">
      {/* 법적 안내 - 간결하게 */}
      <div className="flex items-start gap-2 text-xs text-muted border border-rule rounded-sm px-3 py-2 mb-5 bg-white">
        <Info size={13} className="mt-0.5 flex-shrink-0 text-rust/70" />
        <span>본 내용은 참고용 의견이며 법률자문이 아닙니다. 중요한 사안은 반드시 변호사 상담을 받으세요.</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. 누구 문제인가요 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            1. 누구 문제인가요?
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

        {/* 2. 현재 상황 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            2. 현재 상황 <span className="text-xs text-muted font-normal">(복수 선택 가능)</span>
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

        {/* 3. 법적 절차 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            3. 법적 절차 진행 여부 <span className="text-xs text-muted font-normal">(복수 선택 가능)</span>
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

        {/* 4. 가장 걱정되는 부분 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            4. 가장 걱정되는 부분 <span className="text-xs text-muted font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={formData.concern}
            onChange={(e) => setFormData({ ...formData, concern: e.target.value })}
            placeholder="예: 합의금 수준, 형사 처벌 가능성, 계약 해지 가능 여부 등"
            className="w-full px-3 py-2 border border-rule rounded-sm focus:outline-none focus:border-rust text-sm bg-white"
          />
        </div>

        {/* 5. 질문 내용 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">
            5. 질문 내용 <span className="text-xs text-rust font-normal">*필수</span>
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="구체적인 상황과 궁금한 점을 입력해주세요. 개인정보(이름·연락처·주민번호 등)는 입력하지 마세요."
            rows={4}
            required
            className="w-full px-3 py-2 border border-rule rounded-sm focus:outline-none focus:border-rust text-sm bg-white resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-rust text-paper font-medium rounded-sm hover:bg-rust-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        >
          {isSubmitting ? "등록 중..." : "질문 등록하기"}
        </button>
      </form>
    </div>
  );
}
