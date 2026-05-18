import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// PUT /api/admin/keywords/:id - 키워드 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { keyword, url, priority, category, is_active } = body;

    const admin = makeAdmin();
    
    const updateData: any = {};
    if (keyword !== undefined) updateData.keyword = keyword;
    if (url !== undefined) updateData.url = url;
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await admin
      .from("internal_link_keywords")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "이미 존재하는 키워드입니다" },
          { status: 409 }
        );
      }
      console.error("[Admin Keywords] Update error:", error);
      return NextResponse.json(
        { error: "키워드 수정 실패" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "키워드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json({ keyword: data });
  } catch (error) {
    console.error("[Admin Keywords] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/keywords/:id - 키워드 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const admin = makeAdmin();
    
    const { error } = await admin
      .from("internal_link_keywords")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Admin Keywords] Delete error:", error);
      return NextResponse.json(
        { error: "키워드 삭제 실패" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Keywords] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
