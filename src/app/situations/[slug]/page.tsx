import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceSupabase } from "@/lib/supabase";
import { StickyNav } from "@/components/layout/StickyNav";
import type { Metadata } from "next";

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lawtiphub.com";

interface HubPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  case_type: string | null;
  current_stage: string | null;
  next_stage: string | null;
  expert_level: string | null;
  timeline_steps: string[] | null;
  view_count: number;
  published_at: string;
}

// thin 판단 기준: 글 3개 미만 OR (timeline 2개 미만 AND nextStage 2개 미만)
function isThinHub(postCount: number, timelineLen: number, nextStageLen: number): boolean {
  if (postCount < 3) return true;
  if (timelineLen < 2 && nextStageLen < 2) return true;
  return false;
}

async function getSituationData(situationSlug: string): Promise<{
  phrase: string;
  case_type: string | null;
  posts: HubPost[];
  stuckStages: { stage: string; count: number }[];
  mergedTimeline: string[];
  nextStages: { stage: string; count: number }[];
  isThin: boolean;
} | null> {
  const supabase = getServiceSupabase();

  // situations_cache에서 해당 slug 조회
  const { data: cached, error: cachedError } = await supabase
    .from("situations_cache")
    .select("phrase, case_type")
    .eq("situation_slug", situationSlug)
    .maybeSingle();

  console.log("[situations] slug:", situationSlug, "| cached:", JSON.stringify(cached), "| error:", JSON.stringify(cachedError));

  if (!cached) return null;

  const { phrase, case_type } = cached;

  // case_type 기반 관련 글 조회
  let query = supabase
    .from("posts")
    .select("id, title, slug, excerpt, case_type, current_stage, next_stage, expert_level, timeline_steps, view_count, published_at")
    .eq("published", true)
    .not("published_at", "is", null)
    .order("view_count", { ascending: false })
    .limit(12);

  if (case_type) {
    query = query.eq("case_type", case_type);
  }

  const { data: posts } = await query as { data: HubPost[] | null };

  // current_stage 집계 (막히는 절차)
  const stageCounts: Record<string, number> = {};
  // next_stage 집계 (다음 단계 추천)
  const nextStageCounts: Record<string, number> = {};
  // timeline_steps 빈도 집계 → 대표 타임라인 생성
  const stepFreq: Record<string, number> = {};

  for (const p of posts || []) {
    if (p.current_stage) {
      stageCounts[p.current_stage] = (stageCounts[p.current_stage] || 0) + 1;
    }
    if (p.next_stage) {
      nextStageCounts[p.next_stage] = (nextStageCounts[p.next_stage] || 0) + 1;
    }
    for (const step of p.timeline_steps || []) {
      if (step.trim()) stepFreq[step.trim()] = (stepFreq[step.trim()] || 0) + 1;
    }
  }

  const stuckStages = Object.entries(stageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([stage, count]) => ({ stage, count }));

  const nextStages = Object.entries(nextStageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([stage, count]) => ({ stage, count }));

  // 빈도 높은 타임라인 단계를 순서대로 정렬 (상위 7개)
  const mergedTimeline = Object.entries(stepFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([step]) => step);

  const thin = isThinHub((posts || []).length, mergedTimeline.length, nextStages.length);

  return { phrase, case_type, posts: posts || [], stuckStages, mergedTimeline, nextStages, isThin: thin };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug);
  const data = await getSituationData(decodedSlug);
  if (!data) notFound();

  const title = `${data.phrase} | 실제 절차 경험 모음`;
  const stageHint = data.stuckStages[0] ? ` ${data.stuckStages[0].stage} 단계 등` : "";
  const description = `${data.phrase} 실제 경험 ${data.posts.length}건.${stageHint} 막히는 절차와 다음 단계 정보를 모았습니다.`;

  // thin 허브는 noindex
  if (data.isThin) {
    return {
      title,
      description,
      robots: { index: false, follow: true },
    };
  }

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/situations/${params.slug}` },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "ko_KR",
      url: `${SITE_URL}/situations/${params.slug}`,
      siteName: "法 BLOG",
      images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
    },
  };
}

const EXPERT_BADGE: Record<string, string> = {
  "직접가능":   "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "법무사권장": "bg-amber-100 text-amber-800 border border-amber-200",
  "변호사권장": "bg-red-100 text-red-800 border border-red-200",
};

export default async function SituationHubPage({
  params,
}: {
  params: { slug: string };
}) {
  const decodedSlug = decodeURIComponent(params.slug);
  const data = await getSituationData(decodedSlug);
  if (!data) notFound();

  const { phrase, case_type, posts, stuckStages, mergedTimeline, nextStages, isThin: _isThin } = data;

  // HowTo schema (timeline_steps 2개 이상일 때만)
  const howToSchema = mergedTimeline.length >= 2 ? {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `${phrase} 진행 순서`,
    description: `${phrase} 상황에서 보통 이런 순서로 진행됩니다.`,
    step: mergedTimeline.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step,
      text: step,
    })),
  } : null;

  // FAQPage schema (막히는 절차 → FAQ 항목)
  const faqSchema = stuckStages.length >= 2 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: stuckStages.slice(0, 4).map(({ stage }) => ({
      "@type": "Question",
      name: `${phrase} 중 ${stage} 단계에서 막히면 어떻게 하나요?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${phrase} 상황에서 ${stage} 단계는 많은 분들이 어려움을 겪는 구간입니다. 관련 글을 참고해 다음 절차를 확인하세요.`,
      },
    })),
  } : null;

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "상황별 안내", item: `${SITE_URL}/situations` },
      { "@type": "ListItem", position: 3, name: phrase, item: `${SITE_URL}/situations/${params.slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
        suppressHydrationWarning
      />
      {howToSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
          suppressHydrationWarning
        />
      )}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          suppressHydrationWarning
        />
      )}
      <header className="masthead">
        <div className="masthead-pub">상황별 절차 안내</div>
        <Link href="/" className="masthead-title">法 BLOG</Link>
      </header>

      <StickyNav backHref={case_type ? `/cases/${case_type}` : "/"} backLabel={case_type || "홈으로"} />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-12">
        {/* 허브 헤더 */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            {case_type && (
              <Link
                href={`/cases/${case_type}`}
                className="font-sans text-xs text-rust hover:underline"
              >
                {case_type}
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-black text-ink mb-3">{phrase}</h1>
          <p className="font-sans text-sm text-muted">
            이 상황에서 실제로 어떻게 진행되는지, 비슷한 경험을 가진 글을 모았습니다.
          </p>
        </div>

        {/* 사건 진행 타임라인 */}
        {mergedTimeline.length > 0 && (
          <div className="mb-8 p-5 border border-rule rounded-sm bg-paper">
            <p className="font-sans text-xs font-medium tracking-widest uppercase text-muted mb-4">
              보통 이런 순서로 진행됩니다
            </p>
            <ol className="flex flex-wrap items-center gap-2">
              {mergedTimeline.map((step, i) => (
                <li key={step} className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-rust/10 text-rust text-2xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="font-sans text-xs text-ink">{step}</span>
                  {i < mergedTimeline.length - 1 && (
                    <span className="text-muted/40 text-xs">→</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 막히는 절차 */}
        {stuckStages.length > 0 && (
          <div className="mb-8 p-5 border border-rule rounded-sm bg-cream/30">
            <p className="font-sans text-xs font-medium tracking-widest uppercase text-muted mb-3">
              이 상황에서 많이 막히는 절차
            </p>
            <div className="flex flex-wrap gap-2">
              {stuckStages.map(({ stage, count }) => (
                <span
                  key={stage}
                  className="font-sans text-xs text-ink border border-rule/60 rounded-sm px-3 py-1.5 bg-paper"
                >
                  {stage}
                  {count > 1 && <span className="ml-1 text-rust/70">{count}건</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 다음 단계 추천 (S2) */}
        {nextStages.length > 0 && (
          <div className="mb-10 p-5 border-l-2 border-rust bg-rust/5 rounded-sm">
            <p className="font-sans text-xs font-medium text-rust mb-3">
              이 상황 다음에 이어지는 문제
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStages.map(({ stage }) => (
                <Link
                  key={stage}
                  href={`/search?q=${encodeURIComponent(stage)}`}
                  className="font-sans text-xs text-ink border border-rule/60 rounded-sm px-3 py-1.5 bg-paper hover:border-rust hover:text-rust transition-colors"
                >
                  {stage} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 관련 글 목록 */}
        <div className="mb-6 flex items-center gap-4">
          <h2 className="font-sans text-xs font-medium tracking-widest uppercase text-muted">
            실제 절차 경험 글 {posts.length}개
          </h2>
          <div className="flex-1 h-px bg-rule" />
        </div>

        {posts.length === 0 ? (
          <p className="font-sans text-sm text-muted text-center py-10">
            아직 관련 글이 없습니다.
          </p>
        ) : (
          <div className="grid gap-5">
            {posts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-5 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {post.current_stage && (
                      <span className="font-sans text-2xs text-rust font-medium">
                        {post.current_stage}
                      </span>
                    )}
                    {post.next_stage && (
                      <>
                        <span className="text-muted/40">→</span>
                        <span className="font-sans text-2xs text-muted">{post.next_stage}</span>
                      </>
                    )}
                    {post.expert_level && (
                      <span className={`font-sans text-2xs px-2 py-0.5 rounded-sm ${EXPERT_BADGE[post.expert_level] || ""}`}>
                        {post.expert_level}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-base text-ink group-hover:text-rust transition-colors leading-snug mb-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="font-sans text-sm text-muted leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                  <p className="mt-2 font-sans text-2xs text-muted/60" suppressHydrationWarning>
                    {new Date(post.published_at).toLocaleDateString("ko-KR")} · {post.view_count.toLocaleString()}회 읽음
                  </p>
                </Link>
              </article>
            ))}
          </div>
        )}

        {/* case_type 전체 보기 링크 */}
        {case_type && (
          <div className="mt-10 text-center">
            <Link
              href={`/cases/${case_type}`}
              className="font-sans text-sm text-rust hover:underline"
            >
              {case_type} 관련 글 전체 보기 →
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
