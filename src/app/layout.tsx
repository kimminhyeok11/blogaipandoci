import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, DM_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";
import { Analytics } from "@vercel/analytics/next";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
import { ScrollRestoration } from "@/components/utils/ScrollRestoration";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"], // 600, 900 제거로 파일 수 감소
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500"], // 300, 700 제거로 파일 수 감소
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
  adjustFontFallback: false, // CSS 크기 감소
  preload: false, // 사용 빈도 낮음, 지연 로드
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#f5f0e8",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  title: {
    default: "法 BLOG - 법률, 기술, 비즈니스 깊이 있는 분석",
    template: "%s | 法 BLOG",
  },
  description: "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그",
  keywords: ["법률 블로그", "기술 분석", "비즈니스 인사이트", "법률 해설", "IT 트렌드"],
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
    url: SITE_URL,
    siteName: "法 BLOG",
    title: "法 BLOG - 법률, 기술, 비즈니스 깊이 있는 분석",
    description: "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "法 BLOG - 깊이 있는 분석과 인사이트",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "法 BLOG - 법률, 기술, 비즈니스 깊이 있는 분석",
    description: "법률, 기술, 비즈니스에 관한 깊이 있는 분석과 인사이트를 제공하는 블로그",
    images: ["/opengraph-image.png"],
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
  other: {
    "msvalidate.01": "737EFBBC1764E783BE209003B3B1DC8F",
  },
},
  other: {
    "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "",
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSerifKR.variable} ${notoSansKR.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-5239497835591112" />
        {/* Note: Google Fonts CDN 미사용 - Next.js next/font로 최적화된 폰트 사용 */}
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        {/* Supabase Storage 이미지 최적화 */}
        <link rel="preconnect" href="https://mcgrkxsgifcvfubsnzur.supabase.co" />
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased min-h-screen font-serif flex flex-col">
        <AdSenseScript />
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
              <ScrollRestoration />
              <div className="flex-grow">
                {children}
              </div>
              {/* 공통 Footer */}
              <footer className="border-t-3 border-double border-ink bg-paper">
                <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    {/* 브랜드 */}
                    <div className="col-span-2 md:col-span-1">
                      <h3 className="font-serif text-lg font-bold text-ink mb-2">法 BLOG</h3>
                      <p className="font-sans text-xs text-muted">
                        법률·정책 사회 분석 미디어
                      </p>
                    </div>
                    {/* 메뉴 */}
                    <div>
                      <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">메뉴</h4>
                      <ul className="space-y-2 font-sans text-xs">
                        <li><Link href="/posts" className="text-muted hover:text-rust transition-colors">모든 글</Link></li>
                        <li><Link href="/categories" className="text-muted hover:text-rust transition-colors">카테고리</Link></li>
                        <li><Link href="/tags" className="text-muted hover:text-rust transition-colors">태그</Link></li>
                      </ul>
                    </div>
                    {/* 정보 */}
                    <div>
                      <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">정보</h4>
                      <ul className="space-y-2 font-sans text-xs">
                        <li><Link href="/about" className="text-muted hover:text-rust transition-colors">소개</Link></li>
                        <li><Link href="/contact" className="text-muted hover:text-rust transition-colors">문의하기</Link></li>
                        <li><Link href="/privacy" className="text-muted hover:text-rust transition-colors">개인정보처리방침</Link></li>
                      </ul>
                    </div>
                    {/* 법적 */}
                    <div>
                      <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">법적 고지</h4>
                      <ul className="space-y-2 font-sans text-xs">
                        <li><Link href="/terms" className="text-muted hover:text-rust transition-colors">이용약관</Link></li>
                      </ul>
                    </div>
                  </div>
                  {/* 저작권 */}
                  <div className="border-t border-rule pt-6 text-center">
                    <p className="font-sans text-xs text-muted tracking-wider">
                      © {new Date().getFullYear()} 法 BLOG. All rights reserved.
                    </p>
                  </div>
                </div>
              </footer>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
