"use client";

import { useMemo } from "react";

interface FreshnessBadgeProps {
  updatedAt: string | null;
  publishedAt: string | null;
  caseType?: string | null;
}

// 90일 기준 stale 콘텐츠 판단
const STALE_DAYS = 90;
const WARNING_DAYS = 60;

export function FreshnessBadge({
  updatedAt,
  publishedAt,
  caseType,
}: FreshnessBadgeProps) {
  const status = useMemo(() => {
    const lastDate = new Date(updatedAt || publishedAt || Date.now());
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays > STALE_DAYS) {
      return {
        type: "stale" as const,
        days: diffDays,
        message: `${diffDays}일 전 업데이트 · 최신 실무 기준과 다를 수 있습니다`,
      };
    }

    if (diffDays > WARNING_DAYS) {
      return {
        type: "warning" as const,
        days: diffDays,
        message: `${diffDays}일 전 업데이트 · 곧 검토 예정`,
      };
    }

    return null;
  }, [updatedAt, publishedAt]);

  if (!status) return null;

  const styles = {
    stale: "bg-amber-50 border-amber-200 text-amber-800",
    warning: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const icons = {
    stale: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    warning: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`flex items-start gap-2 p-3 rounded-sm border text-sm font-sans ${styles[status.type]}`}
    >
      <span className="flex-shrink-0 mt-0.5">{icons[status.type]}</span>
      <div className="flex-1">
        <p className="font-medium">{status.message}</p>
        {status.type === "stale" && caseType && (
          <p className="mt-1 text-xs opacity-80">
            <a
              href={`/cases/${encodeURIComponent(caseType)}`}
              className="underline hover:no-underline"
            >
              {caseType} 관련 최신 글 보기 →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

// JSON-LD freshness 정보 생성 (검색엔진용)
export function generateFreshnessJsonLd(
  updatedAt: string | null,
  publishedAt: string | null
): Record<string, string> | null {
  const lastDate = updatedAt || publishedAt;
  if (!lastDate) return null;

  const date = new Date(lastDate);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  // 90일 이상 지난 콘텐츠에 dateModified 명시
  if (diffDays > 90) {
    return {
      dateModified: lastDate,
    };
  }

  return null;
}
