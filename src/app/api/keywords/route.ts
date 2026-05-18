import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 캐싱 적용 (1시간)
const getKeywords = cache(async () => {
  const admin = makeAdmin();
  
  const { data, error } = await admin
    .from("internal_link_keywords")
    .select("keyword, url, priority, category")
    .eq("is_active", true)
    .order("priority", { ascending: false })
    .order("keyword");

  if (error) {
    console.error("[Keywords API] Error:", error);
    return [];
  }

  return data || [];
});

// GET /api/keywords - 활성화된 키워드 목록 (캐싱됨)
export async function GET() {
  try {
    const keywords = await getKeywords();
    return NextResponse.json({ keywords });
  } catch (error) {
    console.error("[Keywords API] Error:", error);
    return NextResponse.json(
      { keywords: [] },
      { status: 500 }
    );
  }
}

// revalidate every hour
export const revalidate = 3600;
