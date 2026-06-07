/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  // 모던 브라우저만 지원 (ES2015+), 폴리필 제거
  transpilePackages: [],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // 번들 최적화
  webpack: (config) => {
    return config;
  },
  images: {
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // trailingSlash 제거 - 리다이렉트 루프 방지
  trailingSlash: false,
  generateEtags: true,
  compress: true,
  poweredByHeader: false,
  // 캐시 설정: 정적 파일만 명시 (HTML 페이지는 Next.js ISR revalidate 자동 처리)
  async headers() {
    return [
      // 정적 파일 (CSS, JS, 폰트, 이미지) - 1년 캐싱
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*.css',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:all*.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/og/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' }, // OG 이미지는 1일
        ],
      },
    ];
  },
  // 301 리다이렉트: 기존 vercel.app → 새 도메인
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'blogaipandoci.vercel.app',
          },
        ],
        destination: 'https://lawtiphub.com/:path*',
        permanent: true, // 301 리다이렉트
      },
    ];
  },
  // Rewrite: .xml 확장자 URL을 라우트 핸들러로 매핑
  async rewrites() {
    return [
      {
        source: '/sitemaps/:file.xml',
        destination: '/sitemaps/:file',
      },
    ];
  },
};

export default nextConfig;
