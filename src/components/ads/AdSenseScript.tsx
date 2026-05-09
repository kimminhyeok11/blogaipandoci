"use client";

import { useEffect } from "react";

export function AdSenseScript() {
  useEffect(() => {
    // 이미 로드되었으면 스킵
    if (document.querySelector('script[src*="adsbygoogle"]')) return;

    // 페이지 로드 완료 후 지연 로딩 (성능 최적화)
    const loadAdSense = () => {
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5239497835591112";
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    };

    // 페이지 완전 로드 후 3초 지연 로딩 (성능 우선)
    const loadWithDelay = () => {
      setTimeout(loadAdSense, 3000);
    };
    
    if (document.readyState === "complete") {
      loadWithDelay();
    } else {
      window.addEventListener("load", loadWithDelay, { once: true });
    }

    return () => {
      window.removeEventListener("load", loadAdSense);
    };
  }, []);

  return null;
}
