import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/stats - 통계 데이터 조회
export async function GET(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // 총 게시글 수
    const { count: totalPosts } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true });

    // 발행된 게시글 수
    const { count: publishedPosts } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("published", true);

    // 임시저장 게시글 수
    const { count: draftPosts } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("published", false);

    // 총 조회수
    const { data: viewStats } = await supabase
      .from("posts")
      .select("view_count");
    
    const totalViews = viewStats?.reduce((sum: number, post: { view_count: number }) => sum + (post.view_count || 0), 0) || 0;

    // 인기 게시글 TOP 5
    const { data: popularPosts } = await supabase
      .from("posts")
      .select("id, title, slug, view_count, published_at")
      .eq("published", true)
      .order("view_count", { ascending: false })
      .limit(5);

    // 최근 게시글 5개
    const { data: recentPosts } = await supabase
      .from("posts")
      .select("id, title, slug, published, created_at, view_count")
      .order("created_at", { ascending: false })
      .limit(5);

    // 이번 달 게시글 수
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: thisMonthPosts } = await supabase
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
    // 사용자 인증 확인
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // 최근 30일간의 게시글 생성 추이
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStats } = await supabase
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
