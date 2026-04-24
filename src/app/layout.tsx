import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, DM_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

// 폰트 최적화
const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  variable: "--font-serif",
  display: "swap",
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
        url: "/opengraph-image.png",
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
    images: ["/twitter-image.png"],
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
    icon: "/icon.png",
    shortcut: "/favicon.ico.jpg",
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
    <html lang="ko" className={`${notoSerifKR.variable} ${notoSansKR.variable} ${dmMono.variable}`}>
      <head>
        {/* Preconnect to critical domains */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        
        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5239497835591112"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased min-h-screen font-serif">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
