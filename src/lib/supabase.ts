import { createClient } from '@supabase/supabase-js';
import type { Post } from '@/types';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getServerSupabase } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────
// 하위 호환 re-export
// 새 코드는 @/lib/supabase/client, server, admin 을 직접 import할 것
// ─────────────────────────────────────────────────────────────

// 서버/클라이언트 공용 anon 클라이언트
// - 서버 컴포넌트: persistSession:false (쿠키 없음)
// - 브라우저:     @/lib/supabase/client 를 직접 import할 것
export const supabase = getServerSupabase();

// 서비스 롤 클라이언트 (RLS 우회) - API route/서버 전용
// 절대 클라이언트 컴포넌트에서 호출 금지
export const getServiceSupabase = getAdminSupabase;

// 타입 헬퍼 - 테이블 타입 명시적 추출
export type PostsTable = {
  Row: Post;
  Insert: Omit<Post, 'id' | 'created_at' | 'updated_at' | 'view_count'> & {
    id?: string;
    view_count?: number;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<PostsTable['Insert']>;
};

// API 에러 타입 정의
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 표준 API 응답 타입
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    status: number;
  };
}

// 내부 타입 헬퍼 (하위 호환)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSupabaseClient = (): any => getServerSupabase();

// createClient 재export (일부 API route에서 직접 사용)
export { createClient };
