"use client";

import { useEffect } from "react";

interface ViewCounterProps {
  slug: string;
}

export function ViewCounter({ slug }: ViewCounterProps) {
  useEffect(() => {
    const cookieKey = `viewed_${slug}`;

    // 쿠키에서 이미 조회한 글인지 확인
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const alreadyViewed = cookies.some((c) => c.startsWith(`${cookieKey}=`));

    if (alreadyViewed) return;

    // 조회수 증가 API 호출
    fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    }).then(() => {
      // 24시간 쿠키 설정 (같은 글 재방문 시 중복 방지)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `${cookieKey}=1; expires=${expires}; path=/; SameSite=Lax`;
    }).catch(() => {
      // 조회수 증가 실패해도 무시
    });
  }, [slug]);

  // 렌더링 없음 (조회수 증가 로직만 실행)
  return null;
}
