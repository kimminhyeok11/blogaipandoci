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
      query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
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
