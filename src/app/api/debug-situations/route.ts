import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshSituationsCache } from "@/lib/situations";
import { getServiceSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");
  const refresh = request.nextUrl.searchParams.get("refresh");

  if (refresh === "1") {
    await refreshSituationsCache();
  }

  // slug 파라미터가 있으면 getSituationData와 동일한 방식으로 조회
  if (slug) {
    const svc = getServiceSupabase();
    const { data: cached, error: e1 } = await svc
      .from("situations_cache")
      .select("phrase, case_type, situation_slug")
      .eq("situation_slug", slug)
      .maybeSingle();

    // anon key로도 비교
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: anonCached, error: e2 } = await anon
      .from("situations_cache")
      .select("phrase, case_type, situation_slug")
      .eq("situation_slug", slug)
      .maybeSingle();

    return NextResponse.json({
      slug,
      service_result: cached,
      service_error: e1,
      anon_result: anonCached,
      anon_error: e2,
      SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin
    .from("situations_cache")
    .select("phrase, situation_slug, target_url, case_type, score")
    .order("score", { ascending: false })
    .limit(10);

  return NextResponse.json({ data, error });
}

export async function POST() {
  await refreshSituationsCache();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data, error } = await admin
    .from("situations_cache")
    .select("phrase, situation_slug, target_url, case_type, score")
    .order("score", { ascending: false })
    .limit(10);

  return NextResponse.json({ refreshed: true, data, error });
}
