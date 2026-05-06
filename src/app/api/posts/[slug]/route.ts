import { NextResponse } from "next/server";
import { supabase, getServiceSupabase } from "@/lib/supabase";

// GET /api/posts/[slug] - 글 상세 조회
export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    // 조회수 증가 (서비스 역할로 RLS 우회)
    try {
      const serviceSupabase = getServiceSupabase();
      
      // 현재 view_count 조회 후 +1
      const { data: currentPost } = await serviceSupabase
        .from('posts')
        .select('view_count')
        .eq('slug', slug)
        .single();
      
      if (currentPost) {
        await (serviceSupabase as any)
          .from('posts')
          .update({ view_count: ((currentPost as any).view_count || 0) + 1 })
          .eq('slug', slug);
      }
    } catch {
      // 조회수 증가 실패해도 글 조회는 계속 진행
      console.warn('View count increment failed');
    }

    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .single();

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

// PUT /api/posts/[slug] - 글 수정
export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const body = await request.json();

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 작성자 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("user_id")
      .eq("slug", slug)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!post || (post as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("posts")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug)
      .select()
      .single();

    if (error) {
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

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 작성자 확인
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("user_id")
      .eq("slug", slug)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!post || (post as any).user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("posts")
      .delete()
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
