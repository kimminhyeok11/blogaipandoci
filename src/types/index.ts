// 사용자 타입
export interface User {
  id: string;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  role?: string;
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
  is_ai_assisted: boolean;
  reviewed_at: string | null;
  user?: User;
  tags?: Tag[];
  category_id?: string | null;
  category?: { id: string; name: string; slug: string } | null;
  case_type?: string | null; // categories.name과 동일 (legacy, category 기준으로 마이그레이션 완료)
  current_stage?: string | null;
  next_stage?: string | null;
  estimated_duration?: string | null;
  involved_agencies?: string[] | null;
  common_mistakes?: string[] | null;
  expert_level?: string | null;
  timeline_steps?: string[] | null;
}

// 태그 타입
export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}
