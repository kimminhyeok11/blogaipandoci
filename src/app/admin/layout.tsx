"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { 
  BarChart3, 
  MessageSquare, 
  Flag, 
  Link2, 
  Settings,
  Loader2,
  ArrowLeft
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/admin/stats", label: "통계", icon: BarChart3 },
  { href: "/admin/comments", label: "댓글", icon: MessageSquare },
  { href: "/admin/keywords", label: "키워드", icon: Link2 },
  { href: "/admin/reports", label: "신고", icon: Flag },
  { href: "/admin/settings", label: "설정", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // admin이 아니면 접근 불가
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Flag className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
          <p className="text-gray-600 mb-4">관리자만 접근할 수 있는 페이지입니다.</p>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-20 lg:pb-0">
      {/* 상단 헤더 - 모바일 최적화 */}
      <header className="bg-paper border-b border-ink sticky top-0 z-50">
        <div className="max-w-content mx-auto px-3 sm:px-4 lg:px-6 h-12 sm:h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/" 
              className="p-1.5 sm:p-2 hover:bg-cream rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-ink" />
            </Link>
            <h1 className="font-sans font-semibold text-sm sm:text-base text-ink">관리자</h1>
          </div>
          <div className="text-xs sm:text-sm text-muted truncate max-w-[120px] sm:max-w-none">
            {user?.email}
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 - 모바일: 상단 가로 스크롤, 데스크탑: 좌측 사이드바 */}
      <div className="max-w-content mx-auto flex flex-col lg:flex-row lg:gap-4">
        {/* 모바일: 상단 탭 바 - 컴팩트하게 */}
        <nav className="lg:hidden bg-paper border-b border-ink overflow-x-auto scrollbar-hide">
          <div className="flex px-2 sm:px-4 py-2 gap-1 min-w-max">
            {navItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-rust text-paper"
                      : "text-ink hover:bg-cream"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 데스크탑: 좌측 사이드바 */}
        <aside className="hidden lg:block w-60 shrink-0">
          <nav className="sticky top-16 bg-paper rounded-sm border border-ink overflow-hidden">
            {navItems.map((tab: NavItem, index: number) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-3 px-4 py-3 font-sans text-sm transition-colors ${
                    isActive
                      ? "bg-rust text-paper border-l-3 border-rust"
                      : "text-ink hover:bg-cream"
                  } ${index !== navItems.length - 1 ? "border-b border-rule" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 메인 콘텐츠 - 모바일 패딩 최소화 */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 min-h-[calc(100vh-100px)]">
          {children}
        </main>
      </div>
      <div className="h-16 sm:hidden" />
    </div>
  );
}
