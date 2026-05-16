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

const STAGE_RING: Record<string, string> = {
  "상속·유언": "ring-amber-200",
  "채무·금전": "ring-red-200",
  "형사·고소": "ring-slate-200",
  "전세·임대차": "ring-blue-200",
  "이혼·가족": "ring-pink-200",
  "계약·거래": "ring-emerald-200",
  "행정·기타": "ring-purple-200",
};

const EXPERT_BADGE: Record<string, { label: string; cls: string }> = {
  "직접가능":   { label: "직접 가능",  cls: "bg-emerald-100 text-emerald-800 border border-emerald-200" },
  "법무사권장": { label: "법무사 권장", cls: "bg-amber-100 text-amber-800 border border-amber-200" },
  "변호사권장": { label: "변호사 권장", cls: "bg-red-100 text-red-800 border border-red-200" },
};

export function ProcedureProgressBar({ post }: Props) {
  const { case_type, current_stage, next_stage, estimated_duration, expert_level, timeline_steps } = post;

  if (!current_stage && !next_stage && !case_type) return null;

  const accentBg  = case_type ? (STAGE_COLORS[case_type] || "bg-rust") : "bg-rust";
  const accentRing = case_type ? (STAGE_RING[case_type] || "ring-rust/20") : "ring-rust/20";
  const expertBadge = expert_level ? EXPERT_BADGE[expert_level] : null;

  // timeline_steps가 있으면 전체 흐름 + 현재 위치 강조 UI
  const steps = timeline_steps && timeline_steps.length >= 2 ? timeline_steps : null;
  const currentIdx = steps ? steps.findIndex(s => s === current_stage) : -1;

  return (
    <div className="mb-8 p-5 border border-rule rounded-sm bg-cream/30 not-prose">
      {/* 상단: 사건 유형 + 배지 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {case_type && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-semibold text-white ${accentBg}`}>
            {case_type}
          </span>
        )}
        {expertBadge && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium ${expertBadge.cls}`}>
            {expertBadge.label}
          </span>
        )}
        {estimated_duration && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-paper text-muted border border-rule/40">
            약 {estimated_duration} 소요
          </span>
        )}
      </div>

      {/* timeline_steps가 있을 때: 전체 흐름 + 현재 위치 강조 */}
      {steps ? (
        <div>
          <p className="font-sans text-2xs text-muted mb-3 tracking-wide">사건 진행 흐름</p>
          <ol className="flex flex-wrap gap-y-3 gap-x-0 items-start">
            {steps.map((step, i) => {
              const isCurrent = step === current_stage || i === currentIdx;
              const isPast = currentIdx >= 0 ? i < currentIdx : false;
              const isNext = step === next_stage && !isCurrent;

              return (
                <li key={i} className="flex items-center">
                  {/* 노드 */}
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={[
                        "flex items-center justify-center w-6 h-6 rounded-full text-2xs font-bold transition-all",
                        isCurrent
                          ? `${accentBg} text-white ring-2 ${accentRing} ring-offset-1`
                          : isPast
                          ? "bg-rule/40 text-muted"
                          : "bg-paper border border-rule/50 text-muted/60",
                      ].join(" ")}
                    >
                      {isPast ? "✓" : i + 1}
                    </div>
                    <span
                      className={[
                        "font-sans text-2xs text-center max-w-[72px] leading-tight",
                        isCurrent ? "text-ink font-semibold" : isPast ? "text-muted/60 line-through" : isNext ? "text-muted" : "text-muted/50",
                      ].join(" ")}
                    >
                      {step}
                    </span>
                    {isCurrent && (
                      <span className={`font-sans text-2xs px-1.5 py-0.5 rounded-sm text-white ${accentBg} whitespace-nowrap`}>
                        지금 여기
                      </span>
                    )}
                    {isNext && !isCurrent && (
                      <span className="font-sans text-2xs px-1.5 py-0.5 rounded-sm border border-rule/40 text-muted/70 whitespace-nowrap">
                        다음
                      </span>
                    )}
                  </div>
                  {/* 연결선 */}
                  {i < steps.length - 1 && (
                    <div className={[
                      "w-6 h-px mx-1 mt-[-18px] flex-shrink-0",
                      isPast ? "bg-rule/50" : "bg-rule/25",
                    ].join(" ")} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        /* timeline_steps 없을 때: 기존 current → next 2단계 UI */
        (current_stage || next_stage) && (
          <div className="flex items-center gap-3 flex-wrap">
            {current_stage && (
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full ${accentBg} ring-2 ${accentRing}`} />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-ink">{current_stage}</span>
                  <span className="font-sans text-2xs text-muted">현재 단계</span>
                </div>
              </div>
            )}
            {current_stage && next_stage && (
              <div className="flex items-center gap-1 text-muted/40">
                <span className="w-6 h-px bg-rule/40 block" />
                <span className="text-xs">→</span>
                <span className="w-6 h-px bg-rule/40 block" />
              </div>
            )}
            {next_stage && (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-rule/40 bg-paper" />
                <div className="flex flex-col">
                  <span className="text-sm text-muted">{next_stage}</span>
                  <span className="font-sans text-2xs text-muted/60">다음 단계</span>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
