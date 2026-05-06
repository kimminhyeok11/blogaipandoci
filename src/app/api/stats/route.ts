import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// GET /api/stats - 통계 데이터 조회
export async function GET(request: Request) {
  try {
    const serviceSupabase = getServiceSupabase();
    
    // 요청에서 사용자 ID 추출 (헤더 또는 쿼리 파라미터)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
    }

    // 관리자 권한 확인 (service role로 RLS 우회)
    const { data: userData, error: roleError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: Error | null };

    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 총 게시글 수
    const { count: totalPosts } = await serviceSupabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    // 발행된 게시글 수
    const { count: publishedPosts } = await serviceSupabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("published", true);

    // 임시저장 게시글 수
    const { count: draftPosts } = await serviceSupabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("published", false);

    // 총 조회수
    const { data: viewStats } = await serviceSupabase
      .from("posts")
      .select("view_count");
    
    const totalViews = viewStats?.reduce((sum: number, post: { view_count: number }) => sum + (post.view_count || 0), 0) || 0;

    // 인기 게시글 TOP 5
    const { data: popularPosts } = await serviceSupabase
      .from("posts")
      .select("id, title, slug, view_count, published_at")
      .eq("published", true)
      .order("view_count", { ascending: false })
      .limit(5);

    // 최근 게시글 5개
    const { data: recentPosts } = await serviceSupabase
      .from("posts")
      .select("id, title, slug, published, created_at, view_count")
      .order("created_at", { ascending: false })
      .limit(5);

    // 이번 달 게시글 수
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: thisMonthPosts } = await serviceSupabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth);

    return NextResponse.json({
      totalPosts: totalPosts || 0,
      publishedPosts: publishedPosts || 0,
      draftPosts: draftPosts || 0,
      totalViews,
      thisMonthPosts: thisMonthPosts || 0,
      popularPosts: popularPosts || [],
      recentPosts: recentPosts || [],
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

// POST /api/stats - 조회수 추이 데이터 (최근 30일)
export async function POST(request: Request) {
  try {
    const serviceSupabase = getServiceSupabase();
    
    // 요청에서 사용자 ID 추출 (헤더)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader?.replace('Bearer ', '');
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: No user ID" }, { status: 401 });
    }

    // 관리자 권한 확인 (service role로 RLS 우회)
    const { data: userData, error: roleError } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single() as { data: { role: string } | null; error: Error | null };

    if (roleError || userData?.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 최근 30일간의 게시글 생성 추이
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStats } = await serviceSupabase
      .from("posts")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    // 일별 집계
    const dailyCounts: Record<string, number> = {};
    dailyStats?.forEach((post: { created_at: string }) => {
      const date = new Date(post.created_at).toLocaleDateString("ko-KR");
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return NextResponse.json({ dailyStats: dailyCounts });
  } catch (error) {
    console.error("Daily stats API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily statistics" },
      { status: 500 }
    );
  }
}
