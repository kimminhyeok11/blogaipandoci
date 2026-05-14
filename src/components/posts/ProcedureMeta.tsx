import type { Post } from "@/types";

interface Props {
  post: Post;
}

export function ProcedureMeta({ post }: Props) {
  const { involved_agencies, common_mistakes } = post;

  const hasData = (involved_agencies && involved_agencies.length > 0) ||
                  (common_mistakes && common_mistakes.length > 0);

  if (!hasData) return null;

  return (
    <div className="mt-10 mb-6 not-prose">
      <div className="border-t border-rule pt-8">
        <h3 className="font-sans text-xs font-medium tracking-widest uppercase text-muted mb-5">
          절차 실무 정보
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {involved_agencies && involved_agencies.length > 0 && (
            <div className="p-4 bg-cream/40 border border-rule/30 rounded-sm">
              <p className="text-xs font-medium text-muted mb-2 uppercase tracking-wide">직접 방문 기관</p>
              <div className="flex flex-wrap gap-1.5">
                {involved_agencies.map((agency, i) => (
                  <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-medium bg-paper border border-rule text-ink">
                    {agency}
                  </span>
                ))}
              </div>
            </div>
          )}

          {common_mistakes && common_mistakes.length > 0 && (
            <div className="p-4 bg-amber-50/60 border border-amber-200/50 rounded-sm">
              <p className="text-xs font-medium text-amber-700 mb-2 uppercase tracking-wide">자주 하는 실수</p>
              <ul className="space-y-1">
                {common_mistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink">
                    <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
