import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 내부 링크 추출 (마크다운 형식: [텍스트](/posts/slug), [텍스트](/cases/slug))
// 검색 링크(/search?q=)는 제외
// 앵커는 제외 (앵커는 페이지 내 섹션으로, 페이지가 존재하면 유효한 것으로 처리)
// 잘못된 링크 형식 감지 (닫는 괄호가 없는 경우 등)
function extractInternalLinks(content: string): Array<{ type: "posts" | "cases"; slug: string }> {
  const links: Array<{ type: "posts" | "cases"; slug: string }> = [];

  // /posts/ 형식 링크 추출 (올바른 형식만)
  const postsLinkRegex = /\[([^\]]+)\]\(\/posts\/([^)]+)\)/g;
  let match;
  while ((match = postsLinkRegex.exec(content)) !== null) {
    if (match[2]) {
      links.push({ type: "posts", slug: match[2] });
    }
  }

  // /cases/ 형식 링크 추출 (올바른 형식만, 앵커 제외)
  const casesLinkRegex = /\[([^\]]+)\]\(\/cases\/([^)#)]+)\)/g;
  while ((match = casesLinkRegex.exec(content)) !== null) {
    if (match[2]) {
      links.push({ type: "cases", slug: match[2] });
    }
  }

  return links;
}

// 잘못된 링크 형식 감지 (닫는 괄호가 없는 경우, 중첩된 링크 등)
function detectMalformedLinks(content: string): Array<{ type: "posts" | "cases"; malformed: string }> {
  const malformed: Array<{ type: "posts" | "cases"; malformed: string }> = [];

  // /posts/ 형식 링크에서 닫는 괄호가 없는 경우 감지
  const postsMalformedRegex = /\[([^\]]+)\]\(\/posts\/[^)]*$/gm;
  let match;
  while ((match = postsMalformedRegex.exec(content)) !== null) {
    if (match[0]) {
      malformed.push({ type: "posts", malformed: match[0] });
    }
  }

  // /cases/ 형식 링크에서 닫는 괄호가 없는 경우 감지
  const casesMalformedRegex = /\[([^\]]+)\]\(\/cases\/[^)]*$/gm;
  while ((match = casesMalformedRegex.exec(content)) !== null) {
    if (match[0]) {
      malformed.push({ type: "cases", malformed: match[0] });
    }
  }

  // 중첩된 링크 감지 (링크 안에 링크가 있는 경우)
  const nestedLinkRegex = /\[[^\]]*\[[^\]]*\][^\]]*\]\([^)]*\)/g;
  while ((match = nestedLinkRegex.exec(content)) !== null) {
    if (match[0]) {
      malformed.push({ type: "posts", malformed: match[0] });
    }
  }

  return malformed;
}

// 콘텐츠 오염 정화 (반복되는 이상한 패턴 제거)
function sanitizeContent(content: string): string {
  let result = content;

  // 반복되는 슬러그 패턴 제거 (예: "온라인으로/posts/학교폭력-사이버-신고-...-어떻게-진행되는가-어떻게-진행되는가")
  result = result.replace(/([가-힣a-zA-Z0-9\-]+)\/(posts|cases)\/([가-힣a-zA-Z0-9\-]+)\1+/g, '$1');

  // 검색 링크 패턴 제거 (예: "증거/search?q=증거를")
  result = result.replace(/([가-힣a-zA-Z0-9]+)\/search\?q=([가-힣a-zA-Z0-9]+)/g, '$1 $2');

  // 카테고리 링크 패턴 제거 (예: "학교폭력/cases/학교폭력")
  result = result.replace(/([가-힣a-zA-Z0-9\-]+)\/cases\/\1/g, '$1');

  return result;
}

// 이미지 URL 검증 제거 (cover_image는 게시물 슬러그와 관계 없음)
// 이미지 URL은 별도 검증 불필요

// 제목에서 슬러그 추정 (더 정확한 매칭)
function estimateSlugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// 제목으로 슬러그 찾기 (유사도 기반)
function findSlugByTitle(
  title: string,
  titleToSlug: Map<string, string>,
  categoryNameToSlug?: Map<string, string>
): string | null {
  // 정확히 일치하는 제목 찾기
  if (titleToSlug.has(title)) {
    return titleToSlug.get(title) || null;
  }

  // 카테고리 name-slug 매핑에서 찾기 (cases/ 형식의 링크용)
  if (categoryNameToSlug && categoryNameToSlug.has(title)) {
    return categoryNameToSlug.get(title)!;
  }

  // 슬러그 추정으로 찾기
  const estimatedSlug = estimateSlugFromTitle(title);
  const exactMatch = Array.from(titleToSlug.entries()).find(([_, slug]) => slug === estimatedSlug);
  if (exactMatch) {
    return exactMatch[1];
  }

  // 부분 일치 찾기 (제목의 일부가 포함된 경우) - 더 강화된 매칭
  const partialMatch = Array.from(titleToSlug.entries()).find(([t]) => {
    const tLower = t.toLowerCase();
    const titleLower = title.toLowerCase();
    // 제목이 50% 이상 겹치는 경우
    const overlap = Math.max(
      tLower.includes(titleLower) ? titleLower.length / tLower.length : 0,
      titleLower.includes(tLower) ? tLower.length / titleLower.length : 0
    );
    return overlap >= 0.5;
  });
  if (partialMatch) {
    return partialMatch[1];
  }

  // 카테고리 부분 일치 찾기
  if (categoryNameToSlug) {
    const categoryPartialMatch = Array.from(categoryNameToSlug.entries()).find(([t]) => {
      const tLower = t.toLowerCase();
      const titleLower = title.toLowerCase();
      const overlap = Math.max(
        tLower.includes(titleLower) ? tLower.length / titleLower.length : 0,
        titleLower.includes(tLower) ? titleLower.length / tLower.length : 0
      );
      return overlap >= 0.5;
    });
    if (categoryPartialMatch) {
      return categoryPartialMatch[1];
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = makeAdmin();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    // 모든 발행된 글 조회
    const { data: posts, error: postsError } = await admin
      .from("posts")
      .select("id, title, slug, content, cover_image")
      .eq("published", true)
      .order("published_at", { ascending: false });

    if (postsError || !posts) {
      throw new Error("글 조회 실패");
    }

    // 카테고리 조회 (cases/ 형식의 링크 검증용)
    const { data: categories, error: categoriesError } = await admin
      .from("categories")
      .select("name, slug")
      .eq("is_active", true);

    if (categoriesError) {
      console.error("카테고리 조회 오류:", categoriesError);
    }

    // 실제 슬러그 목록
    const actualSlugs = new Map<string, { id: string; title: string }>();
    posts.forEach(post => {
      actualSlugs.set(post.slug, { id: post.id, title: post.title });
    });

    // 제목-슬러그 매핑 (슬러그 추정용)
    const titleToSlug = new Map<string, string>();
    posts.forEach(post => {
      titleToSlug.set(post.title, post.slug);
    });

    // 카테고리 name-slug 매핑 (cases/ 형식의 링크 검증용)
    const categoryNameToSlug = new Map<string, string>();
    const categorySlugSet = new Set<string>();
    (categories || []).forEach(cat => {
      categoryNameToSlug.set(cat.name, cat.slug);
      categorySlugSet.add(cat.slug);
    });

    const issues: Array<{
      type: "internal_link" | "image_url" | "malformed_link";
      postId: string;
      postTitle: string;
      postSlug: string;
      invalidSlug: string;
      suggestedSlug?: string;
    }> = [];

    // 각 글 검증
    for (const post of posts) {
      // 잘못된 링크 형식 감지
      const malformedLinks = detectMalformedLinks(post.content || "");
      for (const malformed of malformedLinks) {
        issues.push({
          type: "malformed_link",
          postId: post.id,
          postTitle: post.title,
          postSlug: post.slug,
          invalidSlug: malformed.malformed,
        });
      }

      // 내부 링크 검증
      const internalLinks = extractInternalLinks(post.content || "");
      if (internalLinks.length > 0) {
        console.log(`[validate-links] Post "${post.title}" (${post.slug}) has ${internalLinks.length} internal links:`, internalLinks);
      }
      for (const link of internalLinks) {
        if (link.type === "posts") {
          // /posts/ 형식 링크 검증
          if (!actualSlugs.has(link.slug)) {
            // 슬러그가 존재하지 않음
            // 제목으로 슬러그 찾기 (유사도 기반)
            const suggestedSlug = findSlugByTitle(link.slug, titleToSlug, categoryNameToSlug);
            issues.push({
              type: "internal_link",
              postId: post.id,
              postTitle: post.title,
              postSlug: post.slug,
              invalidSlug: link.slug,
              suggestedSlug: suggestedSlug || undefined,
            });
          }
        } else if (link.type === "cases") {
          // /cases/ 형식 링크 검증
          // 카테고리 슬러그가 존재하는지 확인
          if (!categorySlugSet.has(link.slug)) {
            // 카테고리가 존재하지 않음
            const suggestedSlug = findSlugByTitle(link.slug, titleToSlug, categoryNameToSlug);
            issues.push({
              type: "internal_link",
              postId: post.id,
              postTitle: post.title,
              postSlug: post.slug,
              invalidSlug: link.slug,
              suggestedSlug: suggestedSlug || undefined,
            });
          }
        }
      }

      // 이미지 URL 검증 제거 (cover_image는 게시물 슬러그와 관계 없음)
    }

    return NextResponse.json({
      totalPosts: posts.length,
      issues,
      issueCount: issues.length,
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error("링크 검증 실패:", error);
    return NextResponse.json(
      { error: "링크 검증 실패" },
      { status: 500 }
    );
  }
}

// POST /api/admin/validate-links - 재발행 트리거 (내부링크 자동 재생성)
export async function POST(request: Request) {
  try {
    const token = (request.headers.get("authorization") || "").replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anon.auth.getUser(token);
    if (authErr || !user) return NextResponse.json({ error: "인증 실패" }, { status: 401 });

    const admin = makeAdmin();
    const { data: profile } = await admin.from("users").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "관리자만 접근 가능" }, { status: 403 });

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "필수 파라미터 부족" }, { status: 400 });
    }

    // 글 조회
    const { data: post, error: postError } = await admin
      .from("posts")
      .select("id, content, title, slug, published, excerpt, cover_image, cover_image_alt, user_id, current_stage, case_type, estimated_duration, involved_agencies, common_mistakes, expert_level, timeline_steps")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("글 조회 실패");
    }

    // 관련글 섹션 강제 제거 (일괄처리 시 최신 관련글 갱신을 위해)
    const patterns = [
      /\n\n---\n\n### 📌 관련 글\n[\s\S]*$/m,
      /\n\n---\n\n### 관련 글\n[\s\S]*$/m,
      /\n\n---\n\n### 📌 관련글\n[\s\S]*$/m,
      /\n\n---\n\n### 관련글\n[\s\S]*$/m,
      /\n\n---\n\n#### 📌 관련 글\n[\s\S]*$/m,
      /\n\n---\n\n#### 관련 글\n[\s\S]*$/m,
      /\n\n---\n\n#{1,4}\s*관련\s*글\n[\s\S]*$/m,
      /\n\n---\n\n#{1,4}\s*📌\s*관련\s*글\n[\s\S]*$/m,
    ];

    let contentWithoutRelated = post.content || "";
    for (const pattern of patterns) {
      contentWithoutRelated = contentWithoutRelated.replace(pattern, '');
    }

    // 콘텐츠 오염 정화 (반복되는 이상한 패턴 제거)
    contentWithoutRelated = sanitizeContent(contentWithoutRelated);

    // posts API의 PUT 핸들러를 호출하여 재발행 트리거 (내부링크 자동 재생성)
    // 개발 환경에서는 로컬 URL 사용
    const isDevelopment = process.env.NODE_ENV === 'development';
    const siteUrl = isDevelopment ? 'http://localhost:3000' : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const updateUrl = `${siteUrl}/api/posts`;

    console.log("[validate-links] 재발행 트리거 시작:", { postId, postTitle: post.title });
    console.log("[validate-links] Update URL:", updateUrl);
    console.log("[validate-links] Is development:", isDevelopment);

    // 서비스롤키로 인증 (일괄처리 시 사용자 토큰 만료 문제 방지)
    const serviceToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log("[validate-links] Service token exists:", !!serviceToken);
    console.log("[validate-links] Service token starts with:", serviceToken?.substring(0, 20));

    const requestBody = {
      id: postId,
      content: contentWithoutRelated,
      title: post.title,
      excerpt: post.excerpt,
      cover_image: post.cover_image,
      cover_image_alt: post.cover_image_alt,
      published: post.published,
      current_stage: post.current_stage,
      case_type: post.case_type,
      estimated_duration: post.estimated_duration,
      involved_agencies: post.involved_agencies,
      common_mistakes: post.common_mistakes,
      expert_level: post.expert_level,
      timeline_steps: post.timeline_steps,
    };
    console.log("[validate-links] Request body keys:", Object.keys(requestBody));

    const response = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceToken}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log("[validate-links] Response status:", response.status);
    console.log("[validate-links] Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("[validate-links] Error response:", errorText);
      throw new Error(`재발행 실패: ${errorText}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("재발행 실패:", error);
    return NextResponse.json(
      { error: "재발행 실패" },
      { status: 500 }
    );
  }
}
