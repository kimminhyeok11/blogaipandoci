"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { 
  BarChart3, 
  Eye, 
  FileText, 
  TrendingUp, 
  Calendar,
  ArrowLeft,
  Loader2
} from "lucide-react";

interface StatsData {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  thisMonthPosts: number;
  popularPosts: Array<{
    id: string;
    title: string;
    slug: string;
    view_count: number;
    published_at: string;
  }>;
  recentPosts: Array<{
    id: string;
    title: string;
    slug: string;
    published: boolean;
    created_at: string;
    view_count: number;
  }>;
}

export default function StatsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      window.location.href = "/";
      return;
    }

    fetchStats();
  }, [user, isAuthLoading]);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Stats fetch error:", error);
      showToast("통계 데이터를 불러오는데 실패했습니다", "error");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 size={24} className="animate-spin" />
          <span className="font-sans text-sm">통계 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-muted font-sans">데이터를 불러올 수 없습니다</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b-3 border-double border-ink">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-cream transition-colors"
                aria-label="홈으로"
              >
                <ArrowLeft size={20} />
              </Link>
              <h1 className="font-sans text-sm font-medium text-ink">
                관리자 통계
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FileText size={20} />}
            label="총 게시글"
            value={stats.totalPosts}
          />
          <StatCard
            icon={<Eye size={20} />}
            label="총 조회수"
            value={stats.totalViews.toLocaleString()}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="발행된 글"
            value={stats.publishedPosts}
          />
          <StatCard
            icon={<Calendar size={20} />}
            label="이번 달 작성"
            value={stats.thisMonthPosts}
          />
        </div>

        {/* 추가 정보 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-rule rounded-sm p-4">
            <h2 className="font-sans text-sm font-medium text-ink mb-4 flex items-center gap-2">
              <BarChart3 size={16} />
              게시글 상태
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted font-sans">발행됨</span>
                <span className="font-medium">{stats.publishedPosts}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted font-sans">임시저장</span>
                <span className="font-medium">{stats.draftPosts}</span>
              </div>
              <div className="border-t border-rule pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>합계</span>
                  <span>{stats.totalPosts}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 인기 게시글 TOP 5 */}
        <div className="bg-white border border-rule rounded-sm p-4 mb-6">
          <h2 className="font-sans text-sm font-medium text-ink mb-4">
            인기 게시글 TOP 5
          </h2>
          <div className="space-y-3">
            {stats.popularPosts.length === 0 ? (
              <p className="text-muted font-sans text-sm">데이터가 없습니다</p>
            ) : (
              stats.popularPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between py-2 border-b border-rule last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center bg-cream rounded-full text-xs font-medium">
                      {index + 1}
                    </span>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="font-serif text-sm hover:text-rust transition-colors line-clamp-1"
                    >
                      {post.title}
                    </Link>
                  </div>
                  <span className="font-sans text-xs text-muted">
                    {post.view_count.toLocaleString()}회
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 최근 게시글 */}
        <div className="bg-white border border-rule rounded-sm p-4">
          <h2 className="font-sans text-sm font-medium text-ink mb-4">
            최근 작성한 글
          </h2>
          <div className="space-y-3">
            {stats.recentPosts.length === 0 ? (
              <p className="text-muted font-sans text-sm">데이터가 없습니다</p>
            ) : (
              stats.recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between py-2 border-b border-rule last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-sans ${
                        post.published
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {post.published ? "발행" : "임시"}
                    </span>
                    <Link
                      href={`/write?edit=${post.slug}`}
                      className="font-serif text-sm hover:text-rust transition-colors line-clamp-1"
                    >
                      {post.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-sans text-xs text-muted">
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </span>
                    <span className="font-sans text-xs text-muted">
                      {post.view_count.toLocaleString()}회
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border border-rule rounded-sm p-4">
      <div className="flex items-center gap-2 text-muted mb-2">
        {icon}
        <span className="font-sans text-xs">{label}</span>
      </div>
      <p className="font-sans text-2xl font-bold text-ink">{value}</p>
    </div>
  );
}
