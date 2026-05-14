import { Bot, CalendarCheck, Scale } from "lucide-react";

interface TrustBadgeProps {
  isAiAssisted: boolean;
  reviewedAt: string | null;
  updatedAt: string;
}

export function TrustBadge({ isAiAssisted, reviewedAt, updatedAt }: TrustBadgeProps) {
  const displayDate = reviewedAt || updatedAt;
  const formattedDate = new Date(displayDate).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="border-t border-rule pt-6 mt-8">
      <p className="text-xs font-medium text-muted uppercase tracking-widest mb-3">콘텐츠 정보</p>
      <div className="flex flex-wrap gap-4 text-xs text-muted">
        {isAiAssisted && (
          <span className="flex items-center gap-1.5">
            <Bot size={13} className="text-rust/70" />
            AI 보조 작성 · 판례 기반 검토
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <CalendarCheck size={13} className="text-rust/70" />
          마지막 검토: {formattedDate}
        </span>
        <span className="flex items-center gap-1.5">
          <Scale size={13} className="text-rust/70" />
          법률 자문 아님 · 참고용 정보
        </span>
      </div>
    </div>
  );
}
