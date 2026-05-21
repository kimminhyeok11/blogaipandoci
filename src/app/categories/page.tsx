import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "카테고리 목록",
  robots: {
    index: false,
    follow: true,
  },
};

// ✅ /categories → /cases 301 리다이렉트
// taxonomy 통합: case_type이 실질적인 category 역할
export default function CategoriesRedirect() {
  permanentRedirect("/cases");
}

