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
  Loader2,
  ImageIcon,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";

interface OrphanedImage {
  name: string;
  path: string;
  url: string;
  size: number;
  created_at: string;
}

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
  
  // 이미지 관리 상태
  const [orphanImages, setOrphanImages] = useState<OrphanedImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      window.location.href = "/login?redirect=/admin/stats";
      return;
    }

    // 관리자 권한 체크
    if (user.role !== 'admin') {
      showToast("관리자 권한이 필요합니다", "error");
      window.location.href = "/";
      return;
    }

    fetchStats();
  }, [user, isAuthLoading, showToast]);

  const fetchStats = async () => {
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      const response = await fetch("/api/stats", {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      
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

  // 고아 이미지 조회
  const fetchOrphanImages = async () => {
    if (!user?.id) return;
    
    setIsImageLoading(true);
    try {
      const response = await fetch('/api/admin/images', {
        headers: {
          'Authorization': `Bearer ${user.id}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      
      const data = await response.json();
      setOrphanImages(data.orphans || []);
    } catch (error) {
      console.error('Orphan images fetch error:', error);
      showToast('고아 이미지 조회에 실패했습니다', 'error');
    } finally {
      setIsImageLoading(false);
    }
  };

  // 선택된 이미지 삭제
  const deleteSelectedImages = async () => {
    if (selectedImages.size === 0 || !user?.id) return;
    
    if (!confirm(`선택한 ${selectedImages.size}개의 이미지를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    setIsImageLoading(true);
    try {
      const paths = Array.from(selectedImages);
      const response = await fetch('/api/admin/images', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({ paths })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete images');
      }
      
      const result = await response.json();
      showToast(`${result.deleted}개의 이미지가 삭제되었습니다`, 'success');
      
      // 목록 갱신
      setSelectedImages(new Set());
      fetchOrphanImages();
    } catch (error) {
      console.error('Image delete error:', error);
      showToast('이미지 삭제에 실패했습니다', 'error');
    } finally {
      setIsImageLoading(false);
    }
  };

  // 이미지 선택 토글
  const toggleImageSelection = (path: string) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedImages(newSelected);
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedImages.size === orphanImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(orphanImages.map(img => img.path)));
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

        {/* 이미지 저장소 관리 */}
        <div className="bg-white border border-rule p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink mb-1">이미지 저장소 관리</h2>
              <p className="text-sm text-muted font-sans">
                게시글에서 사용되지 않는 고아 이미지를 관리합니다
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOrphanImages}
                disabled={isImageLoading}
                className="px-3 py-2 bg-paper border border-rule text-ink rounded hover:bg-gray-50 transition-colors font-sans text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <TrendingUp size={16} />
                {isImageLoading ? '조회 중...' : '새로고침'}
              </button>
              {selectedImages.size > 0 && (
                <button
                  onClick={deleteSelectedImages}
                  disabled={isImageLoading}
                  className="px-3 py-2 bg-rust text-white rounded hover:bg-red-700 transition-colors font-sans text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {selectedImages.size}개 삭제
                </button>
              )}
            </div>
          </div>

          {/* 고아 이미지 통계 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-paper border border-rule p-4">
              <div className="text-3xl font-bold text-ink mb-1">{orphanImages.length}</div>
              <div className="text-sm text-muted font-sans">고아 이미지 수</div>
            </div>
            <div className="bg-paper border border-rule p-4">
              <div className="text-3xl font-bold text-ink mb-1">
                {formatFileSize(orphanImages.reduce((sum, img) => sum + img.size, 0))}
              </div>
              <div className="text-sm text-muted font-sans">총 용량</div>
            </div>
          </div>

          {/* 이미지 그리드 */}
          {orphanImages.length > 0 ? (
            <div>
              {/* 전체 선택 */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-rule">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm font-sans text-muted hover:text-ink transition-colors"
                >
                  {selectedImages.size === orphanImages.length ? (
                    <CheckSquare size={18} className="text-rust" />
                  ) : (
                    <Square size={18} />
                  )}
                  전체 {selectedImages.size === orphanImages.length ? '해제' : '선택'}
                </button>
              </div>

              {/* 이미지 목록 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {orphanImages.map((image) => (
                  <div
                    key={image.path}
                    className={`group relative bg-paper border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedImages.has(image.path)
                        ? 'border-rust ring-2 ring-rust/20'
                        : 'border-rule hover:border-gray-400'
                    }`}
                    onClick={() => toggleImageSelection(image.path)}
                  >
                    {/* 체크박스 */}
                    <div className="absolute top-2 left-2 z-10">
                      {selectedImages.has(image.path) ? (
                        <CheckSquare size={20} className="text-rust" />
                      ) : (
                        <Square size={20} className="text-white drop-shadow-md" />
                      )}
                    </div>

                    {/* 이미지 썸네일 */}
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder-image.png';
                        }}
                      />
                    </div>

                    {/* 정보 */}
                    <div className="p-2">
                      <div className="text-xs text-muted font-sans truncate mb-1">
                        {image.name}
                      </div>
                      <div className="text-xs text-rust font-sans font-medium">
                        {formatFileSize(image.size)}
                      </div>
                      <div className="text-xs text-muted font-sans mt-1">
                        {new Date(image.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-paper border border-rule rounded-lg">
              <ImageIcon size={48} className="text-muted mx-auto mb-4" />
              <p className="text-muted font-sans text-sm">
                {isImageLoading ? '조회 중...' : '고아 이미지가 없습니다'}
              </p>
              <button
                onClick={fetchOrphanImages}
                disabled={isImageLoading}
                className="mt-4 px-4 py-2 bg-paper border border-rule text-ink rounded hover:bg-gray-50 transition-colors font-sans text-sm"
              >
                {isImageLoading ? '조회 중...' : '고아 이미지 조회하기'}
              </button>
            </div>
          )}
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
