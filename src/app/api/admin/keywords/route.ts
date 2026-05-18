import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/admin/keywords - 키워드 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const admin = makeAdmin();
    let query = admin
      .from("internal_link_keywords")
      .select("*")
      .order("priority", { ascending: false })
      .order("keyword");

    if (category) {
      query = query.eq("category", category);
    }

    if (isActive !== null) {
      query = query.eq("is_active", isActive === "true");
    }

    if (search) {
      query = query.ilike("keyword", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Admin Keywords] Error:", error);
      return NextResponse.json(
        { error: "데이터 조회 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ keywords: data });
  } catch (error) {
    console.error("[Admin Keywords] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}

// POST /api/admin/keywords - 키워드 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keyword, url, priority = 50, category, is_active = true } = body;

    // 유효성 검사
    if (!keyword || !url) {
      return NextResponse.json(
        { error: "키워드와 URL은 필수입니다" },
        { status: 400 }
      );
    }

    if (keyword.length < 2) {
      return NextResponse.json(
        { error: "키워드는 최소 2글자 이상이어야 합니다" },
        { status: 400 }
      );
    }

    const admin = makeAdmin();
    
    const { data, error } = await admin
      .from("internal_link_keywords")
      .insert({ keyword, url, priority, category, is_active })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 존재하는 키워드입니다" },
          { status: 409 }
        );
      }
      console.error("[Admin Keywords] Insert error:", error);
      return NextResponse.json(
        { error: "키워드 추가 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ keyword: data }, { status: 201 });
  } catch (error) {
    console.error("[Admin Keywords] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
