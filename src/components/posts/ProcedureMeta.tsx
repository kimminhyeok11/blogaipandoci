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
    <div className="mt-12 mb-8 not-prose">
      <div className="border-t-2 border-double border-ink/20 pt-8">
        <h3 className="font-sans text-sm font-bold tracking-widest uppercase text-ink mb-6 flex items-center gap-2">
          <span className="w-8 h-0.5 bg-rust" />
          절차 실무 정보
          <span className="w-8 h-0.5 bg-rust" />
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {involved_agencies && involved_agencies.length > 0 && (
            <div className="p-6 bg-cream/50 border border-rule rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-ink uppercase tracking-wide">직접 방문 기관</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {involved_agencies.map((agency, i) => (
                  <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-blue-200 text-blue-700 shadow-sm">
                    {agency}
                  </span>
                ))}
              </div>
            </div>
          )}

          {common_mistakes && common_mistakes.length > 0 && (
            <div className="p-6 bg-amber-50/70 border border-amber-300/50 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-amber-800 uppercase tracking-wide">자주 하는 실수</p>
              </div>
              <ul className="space-y-2">
                {common_mistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                    <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
                    <span className="leading-relaxed">{mistake}</span>
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
