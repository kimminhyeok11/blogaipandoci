import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshSituationsCache } from "@/lib/situations";

export async function GET() {
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
