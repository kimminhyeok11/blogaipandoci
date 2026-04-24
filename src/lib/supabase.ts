import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Post } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase 클라이언트 (싱글톤)
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

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

// 타입 안전한 테이블 헬퍼 - as any 중복 제거
export const db = {
  posts: () => supabase.from('posts') as any,
  users: () => supabase.from('users') as any,
  tags: () => supabase.from('tags') as any,
  post_tags: () => supabase.from('post_tags') as any,
  images: () => supabase.from('images') as any,
};

// 이미지 업로드 유틸리티
export const uploadImage = async (
  file: File,
  bucket: string = 'images',
  path?: string
): Promise<{ url: string; error: null } | { url: null; error: Error }> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = path ? `${path}/${fileName}` : fileName;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return { url: publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
};

// 이미지 삭제
export const deleteImage = async (
  path: string,
  bucket: string = 'images'
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
