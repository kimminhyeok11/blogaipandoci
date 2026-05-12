import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { supabase, getServiceSupabase } from "@/lib/supabase";

// GET /api/posts/[slug] - 글 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { searchParams } = new URL(request.url);
    const isEditMode = searchParams.get("edit") === "true";
    
    // URL 디코딩 (한글/특수문자 처리)
    const decodedSlug = decodeURIComponent(slug);
    
    const serviceSupabase = getServiceSupabase();

    // 조회수 증가 (서비스 역할로 RLS 우회) - 조회 모드일 때만
    if (!isEditMode) {
      try {
        const { data: currentPost } = await serviceSupabase
          .from('posts')
          .select('view_count')
          .eq('slug', decodedSlug)
          .single();
        
        if (currentPost) {
          await (serviceSupabase as any)
            .from('posts')
            .update({ view_count: ((currentPost as any).view_count || 0) + 1 })
            .eq('slug', decodedSlug);
        }
      } catch {
        console.warn('View count increment failed');
      }
    }

    let data, error;

    if (isEditMode) {
      // 수정 모드: 인증 확인 후 비공개 글도 반환
      const authHeader = request.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const userId = authHeader.replace("Bearer ", "");
      
      // 서비스 역할로 모든 글 조회 (작성자 확인용)
      const result = await serviceSupabase
        .from("posts")
        .select("*")
        .eq("slug", decodedSlug)
        .single();
      
      data = result.data as any;
      error = result.error;
      
      // 작성자 본인만 접근 가능
      if (data && data.user_id !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      // 일반 조회 모드: 공개 글만
      const result = await supabase
        .from("posts")
        .select("*")
        .eq("slug", decodedSlug)
        .eq("published", true)
        .single();
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[slug] - 글 삭제
export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    // URL 디코딩 (한글/특수문자 처리)
    const decodedSlug = decodeURIComponent(slug);

    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = authHeader.replace("Bearer ", "");
    const serviceSupabase = getServiceSupabase();

    // 글 조회하여 소유자 확인
    const { data: post, error: fetchError } = await (serviceSupabase.from("posts") as any)
      .select("user_id")
      .eq("slug", decodedSlug)
      .single();

    if (fetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 글 삭제
    const { error } = await (serviceSupabase.from("posts") as any)
      .delete()
      .eq("slug", decodedSlug);

    if (error) throw error;

    // 캐시 즉시 갱신
    revalidatePath("/");
    revalidatePath("/posts");
    revalidatePath(`/posts/${decodedSlug}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
