import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/admin/check-special-chars - 중간점 등 특수 문자가 포함된 슬러그 확인
export async function GET() {
  try {
    const admin = makeAdmin();

    // 키워드에서 중간점 포함된 URL 확인
    const { data: keywords, error: keywordsError } = await admin
      .from("internal_link_keywords")
      .select("id, keyword, url")
      .or("url.ilike.%·%,url.ilike.%•%");

    // 카테고리에서 중간점 포함된 슬러그 확인
    const { data: categories, error: categoriesError } = await admin
      .from("categories")
      .select("id, name, slug")
      .or("slug.ilike.%·%,slug.ilike.%•%");

    return NextResponse.json({
      success: true,
      keywords: keywords || [],
      categories: categories || [],
      keywordsError: keywordsError?.message,
      categoriesError: categoriesError?.message,
    });
  } catch (error) {
    console.error("[Check Special Chars] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
