// 사용자 타입
export interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// 게시글 타입
export interface Post {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  cover_image: string | null;
  cover_image_alt: string | null;
  published: boolean;
  featured: boolean;
  view_count: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  user?: User;
  tags?: Tag[];
}

// 태그 타입
export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

// 게시글-태그 연결
export interface PostTag {
  post_id: string;
  tag_id: string;
}

// 이미지 타입
export interface Image {
  id: string;
  user_id: string;
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  mime_type: string | null;
  created_at: string;
}

// 에디터 이미지 업로드 결과
export interface ImageUploadResult {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

// SEO 메타데이터
export interface SEOMetadata {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
  keywords?: string[];
}

// 페이지네이션
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// API 응답
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
