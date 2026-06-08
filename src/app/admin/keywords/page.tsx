"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  Link2,
  Filter,
  AlertTriangle
} from "lucide-react";

interface Keyword {
  id: string;
  keyword: string;
  url: string;
  priority: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
}

interface KeywordFormData {
  keyword: string;
  url: string;
  priority: number;
  category: string;
  is_active: boolean;
  urlType: "direct" | "search";
}

interface Category {
  name: string;
  slug: string;
}

export default function AdminKeywordsPage() {
  const { showToast } = useToast();
  const { session } = useAuth();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  const [formData, setFormData] = useState<KeywordFormData>({
    keyword: "",
    url: "",
    priority: 50,
    category: "",
    is_active: true,
    urlType: "direct", // SEO를 위해 기본값은 직접 링크
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [invalidUrls, setInvalidUrls] = useState<Set<string>>(new Set());
  const [isCheckingUrls, setIsCheckingUrls] = useState(false);
  const [isAutoAdding, setIsAutoAdding] = useState(false);
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);

  const fetchKeywords = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryFilter) params.append("category", categoryFilter);

      const response = await fetch(`/api/admin/keywords?${params}`);
      const data = await response.json();

      if (response.ok) {
        setKeywords(data.keywords || []);
      } else {
        showToast("키워드 목록 로딩 실패", "error");
      }
    } catch {
      showToast("네트워크 오류", "error");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, showToast]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  // categories 가져오기
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (error) {
        console.error("카테고리 가져오기 실패:", error);
      }
    };
    fetchCategories();
  }, []);

  // 유효하지 않은 URL 식별
  const checkInvalidUrls = useCallback(async () => {
    setIsCheckingUrls(true);
    const invalidSet = new Set<string>();
    
    // 로컬 개발 환경에서는 로컬 URL 사용
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const siteUrl = isLocal ? "http://localhost:3000" : (process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com");

    // 병렬 처리로 속도 개선
    const checkPromises = keywords
      .filter(keyword => {
        // 앵커 방식 URL은 유효성 검사 제외 (페이지가 존재하면 유효한 것으로 처리)
        if (keyword.url.includes("#")) return false;
        return keyword.url.startsWith("/cases/");
      })
      .map(async (keyword) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3초 타임아웃
          
          const response = await fetch(`${siteUrl}${keyword.url}`, {
            method: "HEAD",
            cache: "no-store",
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            return keyword.id;
          }
        } catch {
          // 에러가 발생해도 조용히 처리
          return keyword.id;
        }
        return null;
      });

    const results = await Promise.all(checkPromises);
    results.forEach(id => {
      if (id) invalidSet.add(id);
    });

    setInvalidUrls(invalidSet);
    setIsCheckingUrls(false);
    
    if (invalidSet.size > 0) {
      showToast(`${invalidSet.size}개의 유효하지 않은 URL을 발견했습니다`, "warning");
    } else {
      showToast("모든 URL이 유효합니다", "success");
    }
  }, [keywords, showToast]);

  // 유효하지 않은 URL 일괄 삭제
  const deleteInvalidUrls = async () => {
    if (invalidUrls.size === 0) {
      showToast("삭제할 유효하지 않은 URL이 없습니다", "warning");
      return;
    }

    const confirmDelete = confirm(`${invalidUrls.size}개의 유효하지 않은 URL 키워드를 삭제하시겠습니까?`);
    if (!confirmDelete) return;

    const idsToDelete = Array.from(invalidUrls);
    for (const id of idsToDelete) {
      try {
        await fetch(`/api/admin/keywords/${id}`, {
          method: "DELETE",
          headers: {
            ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
          },
        });
      } catch (err) {
        console.error(`키워드 삭제 실패 (${id}):`, err);
      }
    }

    showToast("유효하지 않은 URL 키워드가 삭제되었습니다", "success");
    setInvalidUrls(new Set());
    fetchKeywords();
  };

  const openCreateModal = () => {
    setEditingKeyword(null);
    setFormData({
      keyword: "",
      url: "",
      priority: 50,
      category: "",
      is_active: true,
      urlType: "direct",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setFormData({
      keyword: keyword.keyword,
      url: keyword.url,
      priority: keyword.priority,
      category: keyword.category || "",
      is_active: keyword.is_active,
      urlType: keyword.url.startsWith("/search") ? "search" : "direct",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingKeyword(null);
    setDeleteConfirm(null);
  };

  // URL 자동 생성 함수
  const generateUrl = (keyword: string, category: string, urlType: "direct" | "search") => {
    if (urlType === "search") {
      return `/search?q=${encodeURIComponent(keyword)}`;
    } else {
      // direct: /cases/형사 형태 (카테고리 슬러그 기반)
      const categorySlug = category || "";
      return `/cases/${categorySlug}`;
    }
  };

  // 키워드 또는 카테고리 변경 시 URL 자동 생성
  const handleKeywordChange = (value: string) => {
    setFormData({
      ...formData,
      keyword: value,
      url: generateUrl(value, formData.category, formData.urlType),
    });
  };

  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      category: value,
      url: generateUrl(formData.keyword, value, formData.urlType),
    });
  };

  const handleUrlTypeChange = (value: "direct" | "search") => {
    setFormData({
      ...formData,
      urlType: value,
      url: generateUrl(formData.keyword, formData.category, value),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingKeyword
        ? `/api/admin/keywords/${editingKeyword.id}`
        : "/api/admin/keywords";
      const method = editingKeyword ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        showToast(
          editingKeyword ? "키워드가 수정되었습니다" : "키워드가 추가되었습니다",
          "success"
        );
        closeModal();
        fetchKeywords();
      } else {
        const data = await response.json();
        showToast(data.error || "작업 실패", "error");
      }
    } catch {
      showToast("네트워크 오류", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/keywords/${id}`, {
        method: "DELETE",
        headers: {
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
      });

      if (response.ok) {
        showToast("키워드가 삭제되었습니다. 관련 글의 내부링크가 자동으로 제거됩니다.", "success");
        setDeleteConfirm(null);
        fetchKeywords();
      } else {
        showToast("삭제 실패", "error");
      }
    } catch {
      showToast("네트워크 오류", "error");
    }
  };

  const handleAutoAdd = async () => {
    setIsAutoAdding(true);
    try {
      const response = await fetch("/api/admin/keywords/auto-add", {
        method: "POST",
        headers: {
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message, "success");
        fetchKeywords();
      } else {
        const data = await response.json();
        showToast(data.error || "자동 추가 실패", "error");
      }
    } catch {
      showToast("네트워크 오류", "error");
    } finally {
      setIsAutoAdding(false);
    }
  };

  const handleSyncCategories = async () => {
    setIsSyncingCategories(true);
    try {
      const response = await fetch("/api/admin/categories/sync", {
        method: "POST",
        headers: {
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        showToast(data.message, "success");
        // 카테고리 목록 새로고침
        const categoriesResponse = await fetch("/api/categories");
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      } else {
        const data = await response.json();
        showToast(data.error || "동기화 실패", "error");
      }
    } catch {
      showToast("네트워크 오류", "error");
    } finally {
      setIsSyncingCategories(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="font-sans font-semibold text-lg text-ink">내부링크 키워드</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncCategories}
            disabled={isSyncingCategories}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-paper rounded-sm hover:bg-blue-700 disabled:opacity-50 transition-colors font-sans text-sm"
          >
            {isSyncingCategories ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isSyncingCategories ? "동기화 중..." : "카테고리 동기화"}</span>
          </button>
          <button
            onClick={handleAutoAdd}
            disabled={isAutoAdding}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-paper rounded-sm hover:bg-green-700 disabled:opacity-50 transition-colors font-sans text-sm"
          >
            {isAutoAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isAutoAdding ? "추가 중..." : "CASE_TYPE_META 자동 추가"}</span>
          </button>
          {invalidUrls.size > 0 && (
            <button
              onClick={deleteInvalidUrls}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-paper rounded-sm hover:bg-red-700 transition-colors font-sans text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>유효하지 않은 URL 삭제 ({invalidUrls.size}개)</span>
            </button>
          )}
          <button
            onClick={checkInvalidUrls}
            disabled={isCheckingUrls}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-ink text-paper rounded-sm hover:bg-ink-light disabled:opacity-50 transition-colors font-sans text-sm"
          >
            {isCheckingUrls ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span>{isCheckingUrls ? "확인 중..." : "유효하지 않은 URL 확인"}</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors font-sans text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>키워드 추가</span>
          </button>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="키워드 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent appearance-none bg-paper font-sans text-sm"
          >
            <option value="">전체 카테고리</option>
            {categories.map((cat: Category) => (
              <option key={cat.slug} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 키워드 목록 */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-rust" />
          <p className="text-muted font-sans">로딩 중...</p>
        </div>
      ) : keywords.length === 0 ? (
        <div className="text-center py-12 bg-paper rounded-sm border border-ink">
          <Link2 className="w-12 h-12 mx-auto mb-3 text-muted" />
          <p className="text-ink font-sans">등록된 키워드가 없습니다</p>
          <p className="text-sm text-muted mt-1 font-sans">키워드를 추가해보세요</p>
        </div>
      ) : (
        <div className="bg-paper rounded-sm border border-ink overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream border-b border-ink">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium font-sans text-ink">키워드</th>
                  <th className="px-4 py-3 text-left text-sm font-medium font-sans text-ink hidden sm:table-cell">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-medium font-sans text-ink">카테고리</th>
                  <th className="px-4 py-3 text-center text-sm font-medium font-sans text-ink">우선순위</th>
                  <th className="px-4 py-3 text-center text-sm font-medium font-sans text-ink">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {keywords.map((keyword) => (
                  <tr key={keyword.id} className="hover:bg-cream transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink font-sans">{keyword.keyword}</span>
                        {!keyword.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-cream text-muted rounded-sm font-sans">
                            비활성
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-sm text-muted truncate max-w-[200px] block font-sans">
                        {keyword.url}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {keyword.category && (
                        <span className="px-2 py-1 text-xs bg-cream text-rust rounded-sm font-sans">
                          {keyword.category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-muted font-sans">{keyword.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(keyword)}
                          className="p-2 text-muted hover:text-rust hover:bg-cream rounded-sm transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(keyword.id)}
                          className="p-2 text-muted hover:text-rust hover:bg-cream rounded-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-cream border-t border-ink text-sm text-muted font-sans">
            총 {keywords.length}개 키워드
          </div>
        </div>
      )}

      {/* 추가/수정 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-paper rounded-sm shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-ink">
            <div className="flex items-center justify-between p-4 border-b border-ink">
              <h3 className="text-lg font-semibold text-ink font-sans">
                {editingKeyword ? "키워드 수정" : "키워드 추가"}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-muted hover:text-ink rounded-sm hover:bg-cream transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium font-sans text-ink mb-1">
                  키워드 *
                </label>
                <input
                  type="text"
                  value={formData.keyword}
                  onChange={(e) => handleKeywordChange(e.target.value)}
                  placeholder="예: 형사 고소"
                  className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                  required
                />
                <p className="text-xs text-muted mt-1 font-sans">
                  2글자 이상 입력하세요 (3글자 이상 권장)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium font-sans text-ink mb-1">
                  URL 형태
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => handleUrlTypeChange("direct")}
                    className={`flex-1 px-3 py-2 border rounded-sm font-sans text-sm transition-colors ${
                      formData.urlType === "direct"
                        ? "bg-rust text-paper border-rust"
                        : "bg-paper text-ink border-ink hover:bg-cream"
                    }`}
                  >
                    Cases 카테고리 (/cases/)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUrlTypeChange("search")}
                    className={`flex-1 px-3 py-2 border rounded-sm font-sans text-sm transition-colors ${
                      formData.urlType === "search"
                        ? "bg-rust text-paper border-rust"
                        : "bg-paper text-ink border-ink hover:bg-cream"
                    }`}
                  >
                    검색 링크 (/search?q=)
                  </button>
                </div>
                <label className="block text-sm font-medium font-sans text-ink mb-1">
                  URL *
                </label>
                {formData.urlType === "direct" ? (
                  <div className="space-y-2">
                    <select
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                    >
                      <option value="">카테고리 선택</option>
                      {categories.map((cat: Category) => (
                        <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="/cases/형사-고소"
                      className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                      required
                    />
                    <p className="text-xs text-muted mt-1 font-sans">
                      카테고리를 선택하면 URL이 자동으로 생성됩니다. 직접 수정할 수도 있습니다.
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                      placeholder="/search?q=강제집행"
                      className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                      required
                    />
                    <p className="text-xs text-muted mt-1 font-sans">
                      키워드를 변경하면 URL이 자동으로 생성됩니다
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium font-sans text-ink mb-1">
                    우선순위 (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium font-sans text-ink mb-1">
                    카테고리
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-ink rounded-sm focus:ring-2 focus:ring-rust focus:border-transparent bg-paper font-sans text-sm"
                  >
                    <option value="">선택</option>
                    {categories.map((cat: Category) => (
                      <option key={cat.slug} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-rust rounded focus:ring-rust"
                />
                <label htmlFor="is_active" className="text-sm text-ink font-sans">
                  활성화 상태
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-ink text-ink rounded-sm hover:bg-cream transition-colors font-sans text-sm"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-rust text-paper rounded-sm hover:bg-rust-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-sans text-sm"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    editingKeyword ? "수정" : "추가"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-paper rounded-sm shadow-xl w-full max-w-sm p-4 border border-ink">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-cream rounded-full flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rust" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink font-sans">키워드 삭제</h3>
                <p className="text-sm text-muted mt-1 font-sans">
                  정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-ink text-ink rounded-sm hover:bg-cream transition-colors font-sans text-sm"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-rust text-paper rounded-sm hover:bg-rust-light transition-colors font-sans text-sm"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
