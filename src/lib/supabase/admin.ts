import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// 서비스 롤 클라이언트 - RLS 우회, 서버/API route 전용
// 절대 클라이언트 컴포넌트에서 import 금지 (service role key 노출 위험)

const globalForAdmin = globalThis as unknown as {
  __supabase_admin?: SupabaseClient<Database>;
};

export function getAdminSupabase(): SupabaseClient<Database> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  if (!globalForAdmin.__supabase_admin) {
    globalForAdmin.__supabase_admin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return globalForAdmin.__supabase_admin!;
}
