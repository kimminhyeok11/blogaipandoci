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
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    const admin = makeAdmin();
    
    // 키워드 정보 조회
    const { data: keywordData, error: fetchError } = await admin
      .from("internal_link_keywords")
      .select("keyword")
      .eq("id", id)
      .single();

    if (fetchError || !keywordData) {
      return NextResponse.json(
        { error: "키워드를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 키워드 삭제
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

    // 해당 키워드를 포함하는 모든 글 재발행 (내부링크 자동 제거)
    if (token) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
        
        // 해당 키워드를 포함하는 글 조회
        const { data: posts } = await admin
          .from("posts")
          .select("id, content, title, slug, published, excerpt, cover_image, cover_image_alt, user_id, current_stage, case_type, estimated_duration, involved_agencies, common_mistakes, expert_level, timeline_steps")
          .ilike("content", `%${keywordData.keyword}%`);

        if (posts && posts.length > 0) {
          console.log(`[Admin Keywords] 키워드 삭제 후 ${posts.length}개 글 재발행 시작`);
          
          // 서비스롤키로 인증 (일괄처리 시 사용자 토큰 만료 문제 방지)
          const serviceToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
          
          // 각 글 재발행
          for (const post of posts) {
            try {
              const updateUrl = `${siteUrl}/api/posts`;
              await fetch(updateUrl, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${serviceToken}`,
                },
                body: JSON.stringify({
                  id: post.id,
                  content: post.content,
                  title: post.title,
                  excerpt: post.excerpt,
                  cover_image: post.cover_image,
                  cover_image_alt: post.cover_image_alt,
                  published: post.published,
                  current_stage: post.current_stage,
                  case_type: post.case_type,
                  estimated_duration: post.estimated_duration,
                  involved_agencies: post.involved_agencies,
                  common_mistakes: post.common_mistakes,
                  expert_level: post.expert_level,
                  timeline_steps: post.timeline_steps,
                }),
              });
            } catch (err) {
              console.error(`[Admin Keywords] 글 재발행 실패 (${post.id}):`, err);
            }
          }
          
          console.log(`[Admin Keywords] 키워드 삭제 후 ${posts.length}개 글 재발행 완료`);
        }
      } catch (err) {
        console.error("[Admin Keywords] 글 재발행 중 오류:", err);
        // 글 재발행 실패해도 키워드 삭제는 성공한 것으로 처리
      }
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
