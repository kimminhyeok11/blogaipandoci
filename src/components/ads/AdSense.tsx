"use client";

import { useEffect } from "react";

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
  useEffect(() => {
    // @ts-ignore
    if (typeof window !== "undefined" && window.adsbygoogle) {
      try {
        // @ts-ignore
        window.adsbygoogle.push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, []);

  return (
    <ins
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
