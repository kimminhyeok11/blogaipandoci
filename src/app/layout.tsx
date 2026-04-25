import type { Metadata, Viewport } from "next";
import { Noto_Serif_KR, Noto_Sans_KR, DM_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/StructuredData";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://blogaipandoci.vercel.app";

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
  metadataBase: new URL(SITE_URL),
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
  },
  other: {
    "naver-site-verification": process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION || "",
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico.jpg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSerifKR.variable} ${notoSansKR.variable} ${dmMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5239497835591112"
          crossOrigin="anonymous"
        />
        <OrganizationSchema />
        <WebSiteSchema />
      </head>
      <body className="antialiased min-h-screen font-serif">
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
