"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  Square,
  Copy,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Tag,
  Clock,
  Activity
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { supabase } from "@/lib/supabase";

interface OrphanedImage {
  name: string;
  path: string;
  url: string;
  size: number;
  created_at: string;
}

// 임시저장 항목 타입
interface AutoSaveItem {
  key: string;           // localStorage 키 (blog_draft_xxx 또는 blog_edit_슬러그_xxx)
  type: 'new' | 'edit'; // 새 글 vs 수정
  title: string;
  content: string;
  excerpt: string;
  tags: string;
  timestamp: string;
  editSlug?: string;   // 수정 모드일 때 원본 슬러그
}

interface StatsData {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  thisMonthPosts: number;
  dailyViewCounts: Record<string, number>;
  popularPosts: Array<{
    id: string;
    title: string;
    slug: string;
    view_count: number;
    published_at: string;
  }>;
  popularTags: Array<{
    name: string;
    slug: string;
    views: number;
    count: number;
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

  // 전체 글 목록 (페이지네이션)
  const POSTS_PER_PAGE = 10;
  const [allPosts, setAllPosts] = useState<Array<{
    id: string;
    title: string;
    slug: string;
    published: boolean;
    published_at: string | null;
    created_at: string;
    view_count: number;
  }>>([]);
  const [allPostsTotal, setAllPostsTotal] = useState(0);
  const [allPostsPage, setAllPostsPage] = useState(1);
  const [isAllPostsLoading, setIsAllPostsLoading] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // 임시저장 관리 상태
  const [autoSaves, setAutoSaves] = useState<AutoSaveItem[]>([]);
  const [selectedAutoSaves, setSelectedAutoSaves] = useState<Set<string>>(new Set());

  const hasFetched = useRef(false);

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

    if (!hasFetched.current) {
      hasFetched.current = true;
      // 병렬 호출 + 개별 에러 처리
      Promise.all([
        fetchStats().catch(err => console.error('통계 조회 실패:', err)),
        fetchAllPosts(1).catch(err => console.error('글 목록 조회 실패:', err))
      ]);
      // 임시저장 목록 로드
      fetchAutoSaves();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthLoading]);

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

  // 전체 글 목록 페이지네이션 조회
  const fetchAllPosts = async (page: number) => {
    if (!user?.id) return;
    setIsAllPostsLoading(true);
    try {
      const from = (page - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('posts')
        .select('id, title, slug, published, published_at, created_at, view_count', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setAllPosts(data || []);
      setAllPostsTotal(count || 0);
      setAllPostsPage(page);
    } catch (err) {
      console.error('전체 글 목록 조회 실패:', err);
    } finally {
      setIsAllPostsLoading(false);
    }
  };

  // localStorage에서 임시저장 목록 조회
  const fetchAutoSaves = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const saves: AutoSaveItem[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // 임시저장 키 패턴: blog_draft_xxx 또는 blog_edit_슬러그_xxx
      if (key.startsWith('blog_draft_') || key.startsWith('blog_edit_')) {
        const timestamp = localStorage.getItem(key.replace('_title', '_timestamp') || '');
        const title = localStorage.getItem(key) || '';
        
        // title 키만 처리 (중복 방지)
        if (key.endsWith('_title')) {
          const baseKey = key.replace('_title', '');
          const type = baseKey.startsWith('blog_draft') ? 'new' : 'edit';
          const editSlug = type === 'edit' 
            ? baseKey.replace('blog_edit_', '').replace(/_title|_content|_excerpt|_tags|_timestamp/g, '')
            : undefined;
          
          saves.push({
            key: baseKey,
            type,
            title: title || '(제목 없음)',
            content: localStorage.getItem(`${baseKey}_content`) || '',
            excerpt: localStorage.getItem(`${baseKey}_excerpt`) || '',
            tags: localStorage.getItem(`${baseKey}_tags`) || '',
            timestamp: timestamp || new Date().toISOString(),
            editSlug,
          });
        }
      }
    }
    
    // 최신순 정렬
    saves.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setAutoSaves(saves);
  }, []);

  // 개별 임시저장 삭제
  const deleteAutoSave = (key: string) => {
    localStorage.removeItem(`${key}_title`);
    localStorage.removeItem(`${key}_content`);
    localStorage.removeItem(`${key}_excerpt`);
    localStorage.removeItem(`${key}_tags`);
    localStorage.removeItem(`${key}_timestamp`);
    
    fetchAutoSaves();
    showToast('임시저장이 삭제되었습니다', 'success');
  };

  // 선택된 임시저장 일괄 삭제
  const deleteSelectedAutoSaves = () => {
    selectedAutoSaves.forEach(key => {
      localStorage.removeItem(`${key}_title`);
      localStorage.removeItem(`${key}_content`);
      localStorage.removeItem(`${key}_excerpt`);
      localStorage.removeItem(`${key}_tags`);
      localStorage.removeItem(`${key}_timestamp`);
    });
    
    setSelectedAutoSaves(new Set());
    fetchAutoSaves();
    showToast(`${selectedAutoSaves.size}개의 임시저장이 삭제되었습니다`, 'success');
  };

  // 전체 임시저장 삭제
  const deleteAllAutoSaves = () => {
    if (!confirm('모든 임시저장을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
    
    autoSaves.forEach(item => {
      localStorage.removeItem(`${item.key}_title`);
      localStorage.removeItem(`${item.key}_content`);
      localStorage.removeItem(`${item.key}_excerpt`);
      localStorage.removeItem(`${item.key}_tags`);
      localStorage.removeItem(`${item.key}_timestamp`);
    });
    
    setSelectedAutoSaves(new Set());
    fetchAutoSaves();
    showToast('모든 임시저장이 삭제되었습니다', 'success');
  };

  // 임시저장 선택 토글
  const toggleAutoSaveSelection = (key: string) => {
    const newSelected = new Set(selectedAutoSaves);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedAutoSaves(newSelected);
  };

  // 이어쓰기 - 임시저장으로 글쓰기 페이지 이동
  const continueWriting = (item: AutoSaveItem) => {
    if (item.type === 'edit' && item.editSlug) {
      window.location.href = `/write?edit=${item.editSlug}`;
    } else {
      window.location.href = '/write';
    }
  };

  // URL 복사 (슬래시 포함 - 네이버 색인용)
  const copyPostUrl = (slug: string) => {
    if (typeof window === 'undefined') {
      showToast('브라우저 환경에서만 사용 가능합니다', 'error');
      return;
    }
    const url = `${window.location.origin}/posts/${slug}/`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      showToast('URL이 복사되었습니다 (슬래시 포함)', 'success');
      setTimeout(() => setCopiedSlug(null), 2000);
    }).catch(() => {
      showToast('URL 복사에 실패했습니다', 'error');
    });
  };

  const totalPages = Math.ceil(allPostsTotal / POSTS_PER_PAGE);

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
        {/* 조회수 대시보드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Clock size={20} />}
            label="오늘 조회수"
            value={stats.todayViews.toLocaleString()}
          />
          <StatCard
            icon={<Activity size={20} />}
            label="7일 조회수"
            value={stats.weekViews.toLocaleString()}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="30일 조회수"
            value={stats.monthViews.toLocaleString()}
          />
          <StatCard
            icon={<Eye size={20} />}
            label="누적 조회수"
            value={stats.totalViews.toLocaleString()}
          />
        </div>

        {/* 게시글 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<FileText size={20} />}
            label="총 게시글"
            value={stats.totalPosts}
          />
          <StatCard
            icon={<BarChart3 size={20} />}
            label="발행된 글"
            value={stats.publishedPosts}
          />
          <StatCard
            icon={<Calendar size={20} />}
            label="이번 달 작성"
            value={stats.thisMonthPosts}
          />
          <StatCard
            icon={<FileText size={20} />}
            label="임시저장"
            value={stats.draftPosts}
          />
        </div>

        {/* 30일 조회수 추이 차트 */}
        <div className="bg-white border border-rule rounded-sm p-4 mb-6">
          <h2 className="font-sans text-sm font-medium text-ink mb-4 flex items-center gap-2">
            <TrendingUp size={16} />
            최근 30일 조회수 추이
          </h2>
          {stats.dailyViewCounts && Object.keys(stats.dailyViewCounts).length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={Object.entries(stats.dailyViewCounts).map(([date, count]) => ({ date, count }))}
                  margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#c45c26" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#c45c26" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                    tickMargin={5}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6b6b6b' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1a1a1a', 
                      border: 'none', 
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#fff'
                    }}
                    formatter={(value) => [typeof value === 'number' ? `${value}회` : '0회', '조회수']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#c45c26" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted font-sans text-sm">조회 데이터가 없습니다</p>
          )}
        </div>

        {/* 인기 태그 + 게시글 상태 */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* 인기 태그 (키워드) */}
          <div className="bg-white border border-rule rounded-sm p-4">
            <h2 className="font-sans text-sm font-medium text-ink mb-4 flex items-center gap-2">
              <Tag size={16} />
              인기 키워드 (태그)
            </h2>
            <div className="space-y-2">
              {stats.popularTags && stats.popularTags.length > 0 ? (
                stats.popularTags.map((tag, index) => (
                  <div key={tag.name} className="flex items-center justify-between py-1.5 border-b border-rule last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-rust/10 text-rust rounded text-xs font-medium">
                        {index + 1}
                      </span>
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="font-sans text-sm hover:text-rust transition-colors"
                      >
                        #{tag.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-sans text-xs text-muted">{tag.count}개 글</span>
                      <span className="font-sans text-xs font-medium text-rust">{tag.views.toLocaleString()}회</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted font-sans text-sm">태그 데이터가 없습니다</p>
              )}
            </div>
          </div>

          {/* 게시글 상태 */}
          <div className="bg-white border border-rule rounded-sm p-4">
            <h2 className="font-sans text-sm font-medium text-ink mb-4 flex items-center gap-2">
              <BarChart3 size={16} />
              게시글 상태
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted font-sans">발행됨</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.totalPosts > 0 ? (stats.publishedPosts / stats.totalPosts) * 100 : 0}%` }} />
                  </div>
                  <span className="font-medium w-8 text-right">{stats.publishedPosts}</span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted font-sans">임시저장</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${stats.totalPosts > 0 ? (stats.draftPosts / stats.totalPosts) * 100 : 0}%` }} />
                  </div>
                  <span className="font-medium w-8 text-right">{stats.draftPosts}</span>
                </div>
              </div>
              <div className="border-t border-rule pt-3 mt-3">
                <div className="flex justify-between text-sm font-medium">
                  <span>합계</span>
                  <span>{stats.totalPosts}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 인기 게시글 TOP 10 */}
        <div className="bg-white border border-rule rounded-sm p-4 mb-6">
          <h2 className="font-sans text-sm font-medium text-ink mb-4 flex items-center gap-2">
            <Eye size={16} />
            인기 게시글 TOP 10
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
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium ${
                      index < 3 ? 'bg-rust/10 text-rust' : 'bg-cream text-ink'
                    }`}>
                      {index + 1}
                    </span>
                    <Link
                      href={`/posts/${post.slug}`}
                      className="font-serif text-sm hover:text-rust transition-colors line-clamp-1"
                    >
                      {post.title}
                    </Link>
                  </div>
                  <span className="font-sans text-xs text-muted whitespace-nowrap ml-2">
                    {post.view_count.toLocaleString()}회
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 전체 게시글 (페이지네이션) */}
        <div className="bg-white border border-rule rounded-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-sm font-medium text-ink">
              전체 게시글 ({allPostsTotal}개)
            </h2>
            <span className="font-sans text-xs text-muted">
              {allPostsPage} / {totalPages || 1} 페이지
            </span>
          </div>

          {isAllPostsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-muted" />
            </div>
          ) : allPosts.length === 0 ? (
            <p className="text-muted font-sans text-sm py-4">게시글이 없습니다</p>
          ) : (
            <>
              {/* 데스크톱 테이블 */}
              <div className="hidden md:block">
                <div className="grid grid-cols-12 gap-2 py-2 border-b-2 border-ink text-xs font-sans font-medium text-muted">
                  <div className="col-span-1">상태</div>
                  <div className="col-span-5">제목</div>
                  <div className="col-span-2">발행일</div>
                  <div className="col-span-1 text-right">조회</div>
                  <div className="col-span-3 text-right">작업</div>
                </div>
                {allPosts.map((post) => (
                  <div key={post.id} className="grid grid-cols-12 gap-2 py-3 border-b border-rule items-center">
                    <div className="col-span-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-sans ${post.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {post.published ? "발행" : "임시"}
                      </span>
                    </div>
                    <div className="col-span-5">
                      <span className="font-serif text-sm line-clamp-1">{post.title}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-sans text-xs text-muted">
                        {(post.published_at ? new Date(post.published_at) : new Date(post.created_at)).toLocaleDateString("ko-KR", { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="font-sans text-xs text-muted">{post.view_count.toLocaleString()}</span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end gap-1">
                      <button onClick={() => copyPostUrl(post.slug)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-sans transition-colors ${copiedSlug === post.slug ? 'bg-green-100 text-green-700' : 'bg-cream hover:bg-rust/10 text-muted hover:text-rust'}`} title="URL 복사">
                        <Copy size={12} />
                        {copiedSlug === post.slug ? '복사됨' : 'URL'}
                      </button>
                      <Link href={`/posts/${post.slug}`} target="_blank" className="flex items-center gap-1 px-2 py-1 rounded text-xs font-sans bg-cream hover:bg-rust/10 text-muted hover:text-rust transition-colors" title="새 탭에서 열기">
                        <ExternalLink size={12} />
                      </Link>
                      <Link href={`/write?edit=${post.slug}`} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-sans bg-cream hover:bg-rust/10 text-muted hover:text-rust transition-colors" title="수정">
                        수정
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* 모바일 카드 */}
              <div className="md:hidden space-y-3">
                {allPosts.map((post) => (
                  <div key={post.id} className="border border-rule rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-sans ${post.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {post.published ? "발행" : "임시"}
                      </span>
                      <span className="font-sans text-xs text-muted">
                        {(post.published_at ? new Date(post.published_at) : new Date(post.created_at)).toLocaleDateString("ko-KR", { year: 'numeric', month: '2-digit', day: '2-digit' })}
                      </span>
                    </div>
                    <p className="font-serif text-sm line-clamp-2 mb-3">{post.title}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs text-muted">조회 {post.view_count.toLocaleString()}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => copyPostUrl(post.slug)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-colors ${copiedSlug === post.slug ? 'bg-green-100 text-green-700' : 'bg-cream hover:bg-rust/10 text-muted hover:text-rust'}`}>
                          <Copy size={14} />
                          {copiedSlug === post.slug ? '복사됨' : 'URL 복사'}
                        </button>
                        <Link href={`/posts/${post.slug}`} target="_blank" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans bg-cream hover:bg-rust/10 text-muted hover:text-rust transition-colors">
                          <ExternalLink size={14} />
                        </Link>
                        <Link href={`/write?edit=${post.slug}`} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans bg-cream hover:bg-rust/10 text-muted hover:text-rust transition-colors">
                          수정
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 sm:gap-2 mt-4 pt-4 border-t border-rule flex-wrap">
              <button
                onClick={() => fetchAllPosts(allPostsPage - 1)}
                disabled={allPostsPage <= 1 || isAllPostsLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-sans border border-rule hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
                이전
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => Math.abs(p - allPostsPage) <= 2 || p === 1 || p === totalPages)
                .reduce((acc: (number | string)[], p, idx, arr) => {
                  if (idx > 0 && typeof arr[idx - 1] === 'number' && (p as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`dot-${idx}`} className="px-1 text-muted text-xs">...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchAllPosts(p)}
                      disabled={isAllPostsLoading}
                      className={`px-3 py-1.5 rounded text-xs font-sans border transition-colors ${
                        p === allPostsPage
                          ? 'bg-ink text-paper border-ink'
                          : 'border-rule hover:bg-cream'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                onClick={() => fetchAllPosts(allPostsPage + 1)}
                disabled={allPostsPage >= totalPages || isAllPostsLoading}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-sans border border-rule hover:bg-cream disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                다음
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 임시저장 관리 */}
        <div className="bg-white border border-rule rounded-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-sans text-sm font-medium text-ink">
              임시저장 관리 ({autoSaves.length}개)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchAutoSaves}
                className="px-3 py-1.5 border border-rule text-muted text-xs font-sans rounded-sm hover:border-muted transition-colors"
              >
                새로고침
              </button>
              {selectedAutoSaves.size > 0 && (
                <button
                  onClick={deleteSelectedAutoSaves}
                  className="px-3 py-1.5 bg-rust text-white text-xs font-sans rounded-sm hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  <Trash2 size={12} />
                  {selectedAutoSaves.size}개 삭제
                </button>
              )}
              {autoSaves.length > 0 && (
                <button
                  onClick={deleteAllAutoSaves}
                  className="px-3 py-1.5 border border-rule text-muted text-xs font-sans rounded-sm hover:border-muted transition-colors"
                >
                  전체 삭제
                </button>
              )}
            </div>
          </div>

          {autoSaves.length > 0 ? (
            <div className="space-y-2">
              {autoSaves.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 bg-paper border border-rule rounded-sm"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleAutoSaveSelection(item.key)}
                      className="text-muted hover:text-ink transition-colors"
                    >
                      {selectedAutoSaves.has(item.key) ? <CheckSquare size={16} className="text-rust" /> : <Square size={16} />}
                    </button>
                    <div>
                      <p className="font-sans text-sm text-ink line-clamp-1">
                        {item.type === 'edit' ? (
                          <span className="text-rust mr-1">[수정]</span>
                        ) : (
                          <span className="text-blue-600 mr-1">[새글]</span>
                        )}
                        {item.title}
                      </p>
                      <p className="font-sans text-xs text-muted">
                        {new Date(item.timestamp).toLocaleString('ko-KR')} · 
                        {item.content.length > 0 ? `${item.content.length}자` : '내용 없음'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => continueWriting(item)}
                      className="px-3 py-1.5 bg-ink text-paper text-xs font-sans rounded-sm hover:bg-ink/90 transition-colors"
                    >
                      이어쓰기
                    </button>
                    <button
                      onClick={() => deleteAutoSave(item.key)}
                      className="p-1.5 text-muted hover:text-rust transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-paper border border-rule rounded-sm">
              <FileText size={32} className="text-muted mx-auto mb-2" />
              <p className="text-muted font-sans text-sm">임시저장된 글이 없습니다</p>
            </div>
          )}
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
