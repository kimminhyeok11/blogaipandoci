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
    <div className="mb-8 p-6 border border-rule rounded-lg bg-cream/40 not-prose shadow-sm">
      {/* 상단: 사건 유형 + 전문가 배지 */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {case_type && (
          <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-semibold text-white ${accentColor} shadow-sm`}>
            {case_type}
          </span>
        )}
        {expertBadge && (
          <span className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${expertBadge.cls}`}>
            {expertBadge.label}
          </span>
        )}
        {estimated_duration && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-rule/20 text-muted border border-rule/30">
            약 {estimated_duration} 소요
          </span>
        )}
      </div>

      {/* 진행 단계 바 - 타임라인 스타일 */}
      {(current_stage || next_stage) && (
        <div className="relative">
          {/* 배경 라인 */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rule/30 -translate-y-1/2 rounded-full" />
          
          {/* 진행 단계들 */}
          <div className="relative flex items-center gap-0 text-sm">
            {current_stage && (
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-4 h-4 rounded-full ${accentColor} shadow-md ring-4 ring-cream/40`} />
                <div className="flex flex-col">
                  <span className="font-semibold text-ink text-base">{current_stage}</span>
                  <span className="text-xs text-muted font-medium bg-white px-2 py-0.5 rounded-sm border border-rule/20 shadow-sm">현재 단계</span>
                </div>
              </div>
            )}
            {current_stage && next_stage && (
              <div className="flex items-center gap-1 mx-4 text-muted relative z-10">
                <div className="w-8 h-px bg-rule/50" />
                <div className="w-2 h-2 rounded-full bg-rule/50" />
                <div className="w-8 h-px bg-rule/50" />
              </div>
            )}
            {next_stage && (
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-4 h-4 rounded-full border-3 border-muted/30 bg-white shadow-sm ring-4 ring-cream/40" />
                <div className="flex flex-col">
                  <span className="text-muted text-base">{next_stage}</span>
                  <span className="text-xs text-muted font-medium bg-white px-2 py-0.5 rounded-sm border border-rule/20 shadow-sm">다음 단계</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
