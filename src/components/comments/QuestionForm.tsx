"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { AlertCircle } from "lucide-react";

interface QuestionFormProps {
  postId: string;
  onSuccess?: () => void;
}

interface FormData {
  whoProblem: string; // 누구 문제인가요
  currentSituation: string[]; // 현재 상황
  procedure: string[]; // 진행한 절차
  concern: string; // 가장 걱정되는 부분
  content: string; // 질문 내용
  nickname?: string; // 익명 닉네임
}

export function QuestionForm({ postId, onSuccess }: QuestionFormProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    whoProblem: "본인",
    currentSituation: [],
    procedure: [],
    concern: "",
    content: "",
    nickname: user?.email?.split("@")[0] || "",
  });

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
          nickname: formData.nickname || "익명",
          is_anonymous: !user,
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

      if (!response.ok) {
        throw new Error("질문 등록 실패");
      }

      showToast("질문이 등록되었습니다. 검토 후 공개됩니다.", "success");
      setFormData({
        whoProblem: "본인",
        currentSituation: [],
        procedure: [],
        concern: "",
        content: "",
        nickname: user?.email?.split("@")[0] || "",
      });
      onSuccess?.();
    } catch (error) {
      showToast("질문 등록에 실패했습니다", "error");
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, postId, user, showToast, onSuccess]);

  return (
    <div className="bg-cream border border-rust/20 rounded-sm p-6 mb-8">
      {/* 법적 리스크 차단 문구 */}
      <div className="bg-red-50 border border-red-200 rounded-sm p-4 mb-6 text-sm">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-red-600 size-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1 text-red-800">
            <p className="font-medium">중요 안내</p>
            <p>※ 본 답변은 공개된 판례·법령·실무자료를 기반으로 작성된 참고용 의견입니다.</p>
            <p>※ 변호사 법률자문 또는 사건 수임이 아닙니다.</p>
            <p>※ 사실관계에 따라 결과는 크게 달라질 수 있습니다.</p>
            <p>※ 중요한 사건은 반드시 변호사 상담을 받으시기 바랍니다.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. 누구 문제인가요 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            1. 누구 문제인가요?
          </label>
          <div className="flex flex-wrap gap-3">
            {["본인", "부모", "배우자", "자녀", "기타"].map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="whoProblem"
                  value={option}
                  checked={formData.whoProblem === option}
                  onChange={(e) => setFormData({ ...formData, whoProblem: e.target.value })}
                  className="w-4 h-4 text-rust"
                />
                <span className="text-sm text-ink">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 2. 현재 상황 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            2. 현재 상황 (복수 선택 가능)
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              "독촉장",
              "지급명령",
              "소송",
              "압류",
              "통장 문제",
              "경찰 연락",
              "기타",
            ].map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.currentSituation.includes(option)}
                  onChange={() => handleCheckboxChange("currentSituation", option)}
                  className="w-4 h-4 text-rust"
                />
                <span className="text-sm text-ink">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 3. 진행한 절차 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            3. 진행한 절차 (복수 선택 가능)
          </label>
          <div className="flex flex-wrap gap-3">
            {["상속포기", "한정승인", "개인회생", "파산", "없음"].map((option) => (
              <label key={option} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.procedure.includes(option)}
                  onChange={() => handleCheckboxChange("procedure", option)}
                  className="w-4 h-4 text-rust"
                />
                <span className="text-sm text-ink">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 4. 가장 걱정되는 부분 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            4. 가장 걱정되는 부분
          </label>
          <textarea
            value={formData.concern}
            onChange={(e) => setFormData({ ...formData, concern: e.target.value })}
            placeholder="가장 걱정되는 부분을 자유롭게 입력해주세요"
            rows={2}
            className="w-full px-3 py-2 border border-rust/20 rounded-sm focus:outline-none focus:border-rust text-sm"
          />
        </div>

        {/* 5. 질문 내용 */}
        <div>
          <label className="block text-sm font-medium text-ink mb-2">
            5. 질문 내용
          </label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="구체적인 질문 내용을 입력해주세요"
            rows={4}
            required
            className="w-full px-3 py-2 border border-rust/20 rounded-sm focus:outline-none focus:border-rust text-sm"
          />
        </div>

        {/* 익명 닉네임 (비로그인 시) */}
        {!user && (
          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              닉네임
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              placeholder="닉네임을 입력해주세요"
              required
              className="w-full px-3 py-2 border border-rust/20 rounded-sm focus:outline-none focus:border-rust text-sm"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-3 bg-rust text-paper font-medium rounded-sm hover:bg-rust-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? "등록 중..." : "질문 등록하기"}
        </button>
      </form>
    </div>
  );
}
