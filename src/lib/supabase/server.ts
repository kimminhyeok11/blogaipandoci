import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// 서버 전용 클라이언트 - 세션 없음, 공개 데이터 읽기용
// 서버 컴포넌트(page.tsx 등)에서 사용
// auth 세션이 필요한 API route는 admin.ts(service role)를 사용할 것

const globalForServer = globalThis as unknown as {
  __supabase_server?: SupabaseClient<Database>;
};

export function getServerSupabase(): SupabaseClient<Database> {
  if (!globalForServer.__supabase_server) {
    globalForServer.__supabase_server = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
  }
  return globalForServer.__supabase_server!;
}
