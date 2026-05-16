import { createClient } from "@supabase/supabase-js";

function makeAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface SituationItem {
  phrase: string;
  case_type: string | null;
  source_post_id: string | null;
  target_url: string | null;
  score: number;
}

// 블로그형 수식어 제거 + 18~24자 제한으로 행동형 phrase 정제
const STRIP_PATTERNS = [
  /\d{4}년/g,
  /\d+선/g,
  /핵심\s*분석/g,
  /완벽\s*정리/g,
  /총\s*정리/g,
  /한눈에/g,
  /쉽게\s*설명/g,
  /최신\s*판례/g,
  /판례\s*분석/g,
  /[\[\]()（）【】]/g,
  /[?？!！]/g,
];

export function sanitizeSituationPhrase(text: string): string {
  let result = text;
  for (const pattern of STRIP_PATTERNS) {
    result = result.replace(pattern, "");
  }
  // 연속 공백 정리
  result = result.replace(/\s+/g, " ").trim();
  // 24자 초과 시 자연스러운 단어 경계에서 자름
  if (result.length > 24) {
    const truncated = result.slice(0, 24);
    const lastSpace = truncated.lastIndexOf(" ");
    result = lastSpace > 10 ? truncated.slice(0, lastSpace) : truncated;
  }
  return result;
}

export interface StuckStageItem {
  current_stage: string;
  case_type: string | null;
  post_count: number;
  total_views: number;
}

// situations_cache 테이블에서 상위 상황 문장 조회
export async function getTrendingSituations(limit = 8): Promise<SituationItem[]> {
  try {
    const admin = makeAdmin();
    const { data, error } = await admin
      .from("situations_cache")
      .select("phrase, case_type, source_post_id, target_url, score")
      .order("score", { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return getDefaultSituations();
    }
    return data as SituationItem[];
  } catch {
    return getDefaultSituations();
  }
}

// 많이 막히는 절차: current_stage 집계 (글 2개 이상, 조회수 합산 기준 정렬)
export async function getStuckStages(limit = 6): Promise<StuckStageItem[]> {
  try {
    const admin = makeAdmin();
    const { data, error } = await admin
      .from("posts")
      .select("current_stage, case_type, view_count")
      .eq("published", true)
      .not("current_stage", "is", null);

    if (error || !data) return [];

    const stageMap: Record<string, { case_type: string | null; post_count: number; total_views: number }> = {};
    for (const row of data) {
      const stage = row.current_stage as string;
      if (!stageMap[stage]) {
        stageMap[stage] = { case_type: row.case_type, post_count: 0, total_views: 0 };
      }
      stageMap[stage].post_count += 1;
      stageMap[stage].total_views += row.view_count || 0;
    }

    return Object.entries(stageMap)
      .filter(([, v]) => v.post_count >= 2)
      .map(([stage, v]) => ({
        current_stage: stage,
        case_type: v.case_type,
        post_count: v.post_count,
        total_views: v.total_views,
      }))
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, limit);
  } catch {
    return [];
  }
}

// situations_cache 갱신 (글 발행/수정 시 호출)
// 트렌드 점수 = 조회수 정규화(0.7) + 최신성(0.3)
export async function refreshSituationsCache(): Promise<void> {
  try {
    const admin = makeAdmin();

    const { data: posts, error } = await admin
      .from("posts")
      .select("id, title, slug, current_stage, case_type, view_count, published_at")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("view_count", { ascending: false })
      .limit(100);

    if (error || !posts) return;

    const maxViews = Math.max(...posts.map((p) => p.view_count || 0), 1);
    const now = Date.now();
    const MS_PER_DAY = 86400 * 1000;
    const DECAY_DAYS = 30;

    const scored = posts
      .map((p) => {
        const viewScore = (Math.min(p.view_count || 0, maxViews) / maxViews) * 0.7;
        const daysSince = (now - new Date(p.published_at).getTime()) / MS_PER_DAY;
        const freshScore = Math.max(0, 1 - daysSince / DECAY_DAYS) * 0.3;
        const score = viewScore + freshScore;

        // 상황 문장: current_stage 우선, 없으면 title 정제
        const rawPhrase = p.current_stage || p.title;
        const phrase = sanitizeSituationPhrase(rawPhrase);

        // target_url: 항상 해당 글로 직접 이동
        const target_url = `/posts/${p.slug}`;

        return {
          phrase,
          case_type: p.case_type || null,
          source_post_id: p.id,
          target_url,
          score,
          generated_at: new Date().toISOString(),
        };
      })
      .sort((a, b) => b.score - a.score);

    // 중복 phrase 제거 (같은 문장은 점수 높은 것만 유지)
    const seen = new Set<string>();
    const deduped = scored.filter((s) => {
      if (seen.has(s.phrase)) return false;
      seen.add(s.phrase);
      return true;
    }).slice(0, 20);

    // 기존 캐시 삭제 후 새로 삽입
    await admin.from("situations_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deduped.length > 0) {
      await admin.from("situations_cache").insert(deduped);
    }
  } catch (err) {
    console.error("[situations] cache 갱신 실패:", err);
  }
}

// situations_cache가 비어있을 때 fallback
function getDefaultSituations(): SituationItem[] {
  return [
    { phrase: "경찰 출석요구 받음", case_type: "형사·고소", source_post_id: null, target_url: null, score: 0 },
    { phrase: "통장압류 문자 받음", case_type: "채무·금전", source_post_id: null, target_url: null, score: 0 },
    { phrase: "전세금 반환 계속 미뤄짐", case_type: "전세·임대차", source_post_id: null, target_url: null, score: 0 },
    { phrase: "가족이 빚을 남기고 사망", case_type: "상속·유언", source_post_id: null, target_url: null, score: 0 },
    { phrase: "지급명령 서류 받음", case_type: "채무·금전", source_post_id: null, target_url: null, score: 0 },
    { phrase: "이혼 또는 양육권 문제", case_type: "이혼·가족", source_post_id: null, target_url: null, score: 0 },
  ];
}
