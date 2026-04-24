import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#f5f0e8",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app"),
  title: {
    default: "法 BLOG - 깊이 있는 분석과 인사이트",
    template: "%s | 法 BLOG",
  },
  description: "법률, 기술, 비즈니스에 대한 깊이 있는 분석과 인사이트가 담긴 블로그입니다.",
  keywords: ["블로그", "법률", "기술", "분석", "인사이트"],
  authors: [{ name: "法 BLOG" }],
  creator: "法 BLOG",
  publisher: "法 BLOG",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "法 BLOG",
    title: "法 BLOG - 깊이 있는 분석과 인사이트",
    description: "법률, 기술, 비즈니스에 대한 깊이 있는 분석과 인사이트가 담긴 블로그입니다.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "法 BLOG",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "法 BLOG - 깊이 있는 분석과 인사이트",
    description: "법률, 기술, 비즈니스에 대한 깊이 있는 분석과 인사이트가 담긴 블로그입니다.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  other: {
    "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "",
  },
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700;900&family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5239497835591112"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
