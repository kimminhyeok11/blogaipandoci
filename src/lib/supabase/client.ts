"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// @supabase/ssr가 번들한 supabase-js 타입과 최상위 supabase-js 타입의
// 제네릭 시그니처가 달라(select 결과가 never로 추론됨) 최상위 타입으로 통일한다.
type BrowserClient = SupabaseClient<Database>;

// 브라우저 전용 싱글톤 - 세션 유지, 자동 갱신
// 클라이언트 컴포넌트("use client")에서만 import할 것

const globalForClient = globalThis as unknown as {
  __supabase_browser?: BrowserClient;
};

export function getSupabaseClient(): BrowserClient {
  if (!globalForClient.__supabase_browser) {
    globalForClient.__supabase_browser = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) as unknown as BrowserClient;
  }
  return globalForClient.__supabase_browser!;
}

export const supabase = getSupabaseClient();
