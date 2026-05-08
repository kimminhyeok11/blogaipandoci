import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// 관리자 권한 확인 헬퍼
async function verifyAdmin(request: Request) {
  const serviceSupabase = getServiceSupabase();
  const authHeader = request.headers.get('authorization');
  const userId = authHeader?.replace('Bearer ', '');
  
  if (!userId) return { error: "Unauthorized", status: 401, serviceSupabase };

  const { data: userData, error: roleError } = await serviceSupabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single() as { data: { role: string } | null; error: Error | null };

  if (roleError || userData?.role !== 'admin') {
    return { error: "Forbidden", status: 403, serviceSupabase };
  }

  return { error: null, status: 200, serviceSupabase };
}

// GET /api/stats - 통계 데이터 조회 (대시보드)
export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const serviceSupabase = auth.serviceSupabase;

    const now = new Date();

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

    // 총 조회수 (누적)
    const { data: viewStats } = await serviceSupabase
      .from("posts")
      .select("view_count");
    const totalViews = viewStats?.reduce((sum: number, post: { view_count: number }) => sum + (post.view_count || 0), 0) || 0;

    // 오늘 조회수 (post_views 로그 기반) - UTC 기준 오늘 자정
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const { count: todayViews } = await serviceSupabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .gte("viewed_at", todayStart);

    // 7일간 조회수 - UTC 기준
    const sevenDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 7));
    const { count: weekViews } = await serviceSupabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .gte("viewed_at", sevenDaysAgo.toISOString());

    // 30일간 조회수 - UTC 기준
    const thirtyDaysAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30));
    const { count: monthViews } = await serviceSupabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .gte("viewed_at", thirtyDaysAgo.toISOString());

    // 최근 30일 일별 조회수 추이 (post_views 로그 기반)
    const { data: dailyViewsRaw } = await serviceSupabase
      .from("post_views")
      .select("viewed_at")
      .gte("viewed_at", thirtyDaysAgo.toISOString())
      .order("viewed_at", { ascending: true });

    const dailyViewCounts: Record<string, number> = {};
    // 30일치 날짜 초기화
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      dailyViewCounts[key] = 0;
    }
    dailyViewsRaw?.forEach((row: { viewed_at: string }) => {
      const d = new Date(row.viewed_at);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (dailyViewCounts[key] !== undefined) {
        dailyViewCounts[key]++;
      }
    });

    // 인기 게시글 TOP 10
    const { data: popularPosts } = await serviceSupabase
      .from("posts")
      .select("id, title, slug, view_count, published_at")
      .eq("published", true)
      .order("view_count", { ascending: false })
      .limit(10);

    // 최근 게시글 5개
    const { data: recentPosts } = await serviceSupabase
      .from("posts")
      .select("id, title, slug, published, created_at, view_count")
      .order("created_at", { ascending: false })
      .limit(5);

    // 이번 달 게시글 수
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count: thisMonthPosts } = await serviceSupabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", firstDayOfMonth);

    // 인기 태그 TOP 10 (조회수 기준)
    const { data: tagData } = await serviceSupabase
      .from("post_tags")
      .select("tag_id, tags(name, slug), posts(view_count)")
      .limit(500);

    const tagViewMap: Record<string, { name: string; slug: string; views: number; count: number }> = {};
    tagData?.forEach((row: any) => {
      const tagName = row.tags?.name;
      const tagSlug = row.tags?.slug;
      const views = row.posts?.view_count || 0;
      if (tagName) {
        if (!tagViewMap[tagName]) {
          tagViewMap[tagName] = { name: tagName, slug: tagSlug, views: 0, count: 0 };
        }
        tagViewMap[tagName].views += views;
        tagViewMap[tagName].count++;
      }
    });
    const popularTags = Object.values(tagViewMap)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return NextResponse.json({
      totalPosts: totalPosts || 0,
      publishedPosts: publishedPosts || 0,
      draftPosts: draftPosts || 0,
      totalViews,
      todayViews: todayViews || 0,
      weekViews: weekViews || 0,
      monthViews: monthViews || 0,
      thisMonthPosts: thisMonthPosts || 0,
      dailyViewCounts,
      popularPosts: popularPosts || [],
      popularTags,
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
