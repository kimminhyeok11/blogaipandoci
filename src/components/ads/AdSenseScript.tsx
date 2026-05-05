"use client";

import { useEffect } from "react";

export function AdSenseScript() {
  useEffect(() => {
    // 클라이언트에서만 스크립트 동적 삽입
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5239497835591112";
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);

    return () => {
      // cleanup
      document.head.removeChild(script);
    };
  }, []);

  return null;
}
