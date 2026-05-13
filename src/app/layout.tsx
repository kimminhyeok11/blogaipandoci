import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Noto_Serif_KR, Noto_Sans_KR, DM_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";
import { Analytics } from "@vercel/analytics/next";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
import { ScrollRestoration } from "@/components/utils/ScrollRestoration";
import { ConditionalFooter } from "@/components/layout/ConditionalFooter";
import Link from "next/link";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500"],
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
    url: "/",
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
    icon: "/favicon.ico",
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
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
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
              <ConditionalFooter />
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        {/* Kakao JS SDK - 카카오 공유 OG 미리보기용 */}
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <>
            <Script
              src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
              crossOrigin="anonymous"
              strategy="afterInteractive"
              onLoad={() => {
                const kakao = (window as Window & { Kakao?: { isInitialized: () => boolean; init: (k: string) => void } }).Kakao;
                if (kakao && !kakao.isInitialized()) {
                  kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY!);
                }
              }}
            />
          </>
        )}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-DKZVK5XQ5J"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-DKZVK5XQ5J');
          `}
        </Script>
      </body>
    </html>
  );
}
