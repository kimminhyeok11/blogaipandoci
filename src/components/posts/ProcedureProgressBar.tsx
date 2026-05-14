import type { Post } from "@/types";

interface Props {
  post: Post;
}

const STAGE_COLORS: Record<string, string> = {
  "상속·유언": "bg-amber-600",
  "채무·금전": "bg-red-600",
  "형사·고소": "bg-slate-700",
  "전세·임대차": "bg-blue-600",
  "이혼·가족": "bg-pink-600",
  "계약·거래": "bg-emerald-600",
  "행정·기타": "bg-purple-600",
};

const EXPERT_BADGE: Record<string, { label: string; cls: string }> = {
  "직접가능": { label: "직접 가능", cls: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  "법무사권장": { label: "법무사 권장", cls: "bg-amber-100 text-amber-800 border border-amber-200" },
  "변호사권장": { label: "변호사 권장", cls: "bg-red-100 text-red-800 border border-red-200" },
};

export function ProcedureProgressBar({ post }: Props) {
  const { case_type, current_stage, next_stage, estimated_duration, expert_level } = post;

  if (!current_stage && !next_stage && !case_type) return null;

  const accentColor = case_type ? (STAGE_COLORS[case_type] || "bg-rust") : "bg-rust";
  const expertBadge = expert_level ? EXPERT_BADGE[expert_level] : null;

  return (
    <div className="mb-8 p-4 border border-rule rounded-sm bg-cream/30 not-prose">
      {/* 상단: 사건 유형 + 전문가 배지 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {case_type && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium text-white ${accentColor}`}>
            {case_type}
          </span>
        )}
        {expertBadge && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium ${expertBadge.cls}`}>
            {expertBadge.label}
          </span>
        )}
        {estimated_duration && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-medium bg-rule/20 text-muted border border-rule/30">
            약 {estimated_duration} 소요
          </span>
        )}
      </div>

      {/* 진행 단계 바 */}
      {(current_stage || next_stage) && (
        <div className="flex items-center gap-0 text-sm">
          {current_stage && (
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${accentColor} shrink-0`} />
              <span className="font-medium text-ink">{current_stage}</span>
              <span className="text-xs text-muted ml-1 bg-rule/10 px-1.5 py-0.5 rounded-sm">현재 단계</span>
            </div>
          )}
          {current_stage && next_stage && (
            <div className="flex items-center gap-0 mx-3 text-muted">
              <div className="w-6 h-px bg-rule" />
              <span className="text-base">→</span>
              <div className="w-2 h-px bg-rule" />
            </div>
          )}
          {next_stage && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full border-2 border-muted/40 bg-cream shrink-0" />
              <span className="text-muted">{next_stage}</span>
              <span className="text-xs text-muted ml-1 bg-rule/10 px-1.5 py-0.5 rounded-sm">다음 단계</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
