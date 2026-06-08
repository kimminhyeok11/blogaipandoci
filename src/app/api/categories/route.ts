import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/categories - 카테고리 목록 조회
export async function GET() {
  try {
    const admin = makeAdmin();
    const { data: categories, error } = await admin
      .from("categories")
      .select("name, slug")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("[Categories] Error:", error);
      return NextResponse.json(
        { error: "데이터 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error("[Categories] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
