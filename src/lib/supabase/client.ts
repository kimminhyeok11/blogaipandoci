"use client";

import { createBrowserClient } from "@supabase/ssr";

// 브라우저 전용 싱글톤 - 세션 유지, 자동 갱신
// 클라이언트 컴포넌트("use client")에서만 import할 것

const globalForClient = globalThis as unknown as {
  __supabase_browser?: ReturnType<typeof createBrowserClient>;
};

export function getSupabaseClient() {
  if (!globalForClient.__supabase_browser) {
    globalForClient.__supabase_browser = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return globalForClient.__supabase_browser;
}

export const supabase = getSupabaseClient();
