import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const caseType = searchParams.get("case_type") || "";

  if (!q.trim() && !caseType.trim()) {
    return NextResponse.json({ posts: [] });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, case_type")
      .eq("published", true)
      .not("published_at", "is", null);

    if (caseType.trim()) {
      query = query.eq("case_type", caseType);
    }
    if (q.trim()) {
      // 공백/특수문자로 분리하여 각 키워드 OR 검색
      const keywords = q.trim().split(/[\s\→\,\.]+/).filter(k => k.length > 1);
      if (keywords.length > 0) {
        const conditions = keywords.map(k => 
          `title.ilike.%${k}%,excerpt.ilike.%${k}%,content.ilike.%${k}%`
        );
        query = query.or(conditions.join(','));
      }
    }

    const { data, error } = await query
      .order("published_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[search] query error:", error.message);
      return NextResponse.json({ posts: [] }, { status: 500 });
    }

    return NextResponse.json({ posts: data || [] });
  } catch (err) {
    console.error("[search] error:", err);
    return NextResponse.json({ posts: [] }, { status: 500 });
  }
}
