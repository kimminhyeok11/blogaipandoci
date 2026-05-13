import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "검색 | 法 BLOG",
  description: "法 BLOG 글 검색",
  robots: {
    index: false,
    follow: true,
  },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
