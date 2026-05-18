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
  Loader2
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

  const currentItem = navItems.find(item => pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 - 모바일 최적화 */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900">
              관리자
            </h1>
            {currentItem && (
              <>
                <span className="text-gray-400">/</span>
                <span className="text-lg text-gray-700">{currentItem.label}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="hidden sm:inline">{user.email}</span>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto pb-20 sm:pb-6">
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>

      {/* 하단 탭 네비게이션 - 모바일 고정 */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 sm:sticky sm:top-14 sm:bottom-auto sm:border-b sm:border-t-0 sm:order-first">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-around sm:justify-start sm:gap-1 px-2 py-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex flex-col sm:flex-row items-center gap-1 px-3 py-2 rounded-lg transition-all
                    min-w-[60px] sm:min-w-0
                    ${isActive 
                      ? "bg-blue-50 text-blue-600 sm:bg-blue-100" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-blue-600" : ""}`} />
                  <span className={`text-xs sm:text-sm font-medium ${isActive ? "text-blue-700" : ""}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 모바일 하단 여백 (탭바 높이만큼) */}
      <div className="h-16 sm:hidden" />
    </div>
  );
}
