import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "키워드 목록 | 法 BLOG",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/tags",
  },
};

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
