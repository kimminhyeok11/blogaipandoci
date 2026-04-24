"use client";

import { useEffect, useRef } from "react";

interface AdSenseProps {
  slot: string;
  style?: React.CSSProperties;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
}

export function AdSense({
  slot,
  style,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
}: AdSenseProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // 로컬호스트에서는 광고 로드 안 함
    if (typeof window === "undefined") return;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return;
    }

    // 중복 로드 방지
    if (isLoaded.current) return;

    // @ts-ignore
    if (window.adsbygoogle) {
      try {
        isLoaded.current = true;
        // @ts-ignore
        window.adsbygoogle.push({});
      } catch (e) {
        // 이미 로드된 경우 무시
      }
    }
  }, []);

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{
        display: "block",
        ...style,
      }}
      data-ad-client="ca-pub-5239497835591112"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
      {...(layout && { "data-ad-layout": layout })}
      {...(layoutKey && { "data-ad-layout-key": layoutKey })}
    />
  );
}

// 자동 광고 (페이지 레벨)
export function AutoAds() {
  return null; // 스크립트는 layout.tsx에 이미 추가됨
}
