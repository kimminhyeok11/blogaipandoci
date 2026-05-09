"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "scroll-positions";

export function ScrollRestoration() {
  const pathname = usePathname();
  const scrollPositions = useRef<Record<string, number>>({});

  // 페이지 이동 전 스크롤 위치 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      const positions = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) || "{}"
      );
      positions[pathname] = window.scrollY;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [pathname]);

  // 페이지 로드 시 스크롤 위치 복원
  useEffect(() => {
    const positions = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) || "{}"
    );
    const savedPosition = positions[pathname];

    if (savedPosition && savedPosition > 0) {
      // 약간의 지연 후 복원 (DOM 렌더링 완료 후)
      const timeout = setTimeout(() => {
        window.scrollTo(0, savedPosition);
        // 복원 후 삭제
        delete positions[pathname];
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [pathname]);

  return null;
}
