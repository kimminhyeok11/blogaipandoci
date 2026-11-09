// 법률/절차 키워드 → 내부 링크 매핑
// SEO 과최적화 방지를 위한 엄격한 규칙 적용
// 규칙:
// - 문단당 최대 1개 링크
// - 본문 전체 최대 5개 링크
// - 동일 키워드 1회만 링크
// - 첫 등장만 링크
// - 이미 a 태그 내부는 제외
// - heading(h1~h6), table, code, pre 내부 제외
// - 주변 100자 내 링크 중복 금지
// - 자연문장 내부에만 삽입 (문장 경계 고려)
// - money keyword 과삽입 금지

import { cache } from "react";
import { getServiceSupabase } from "@/lib/supabase";

export interface KeywordLink {
  keyword: string;
  url: string;
  priority: number;
  category: string;
  anchorVariants?: string[];
}

// 단어 경계 검사 — 키워드가 더 긴 단어의 일부(기소장 속 "기소")인지 판별.
// 왼쪽은 문자·숫자·언더스코어가 아니어야 경계. 오른쪽은 한국어 교착어 특성상
// 조사가 붙는 정상 사용(기소는·개인회생을)을 허용하되, 조사+키워드가 하나의
// 완성 토큰을 이룰 때만 인정 — "개인회생나무"처럼 조사로 시작하는 합성어가
// 뒤따르면 조사 뒤에도 단어가 이어지므로 걸러진다.
const KOREAN_PARTICLES = [
  "이라고", "이라도", "이란", "이라", "이며", "이면", "이야", "이나",
  "에서", "에게", "한테", "으로", "부터", "까지", "조차", "마저",
  "밖에", "처럼", "보다", "같이", "만큼", "마다", "따라", "뿐만",
  "라고", "라도", "이고", "다가", "커녕",
  "은", "는", "이", "가", "을", "를", "의", "에", "께", "와", "과",
  "도", "만", "로", "나", "란", "라", "며", "면", "야", "뿐", "씩",
];

const WORD_CHAR = /[\p{L}\p{N}_]/u;
const isWordChar = (ch: string | undefined) => ch !== undefined && WORD_CHAR.test(ch);

export function isWordBoundary(text: string, start: number, length: number): boolean {
  if (isWordChar(text[start - 1])) return false;
  if (!isWordChar(text[start + length])) return true;
  // 뒤따르는 문자가 단어문자면 조사로 시작하고 조사 뒤가 경계여야 함
  const rest = start + length;
  return KOREAN_PARTICLES.some((p) => text.startsWith(p, rest) && !isWordChar(text[rest + p.length]));
}

// DB에서 키워드 조회 (캐싱 적용)
// 자기 배포 /api/keywords를 HTTP로 호출하던 것을 직접 DB 조회로 변경 —
// 서버리스 함수가 자기 자신을 HTTP로 호출하면 지연·비용·localhost:3000
// 폴백 무력화 문제가 있었다. 조회 조건은 /api/keywords와 동일(is_active).
export const fetchKeywordsFromDB = cache(async (): Promise<KeywordLink[]> => {
  try {
    // 서버 사이드에서만 실행
    if (typeof window !== "undefined") {
      return [];
    }

    const admin = getServiceSupabase();
    const { data, error } = await admin
      .from("internal_link_keywords")
      .select("keyword, url, priority, category")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .order("keyword");

    if (error) {
      console.error("[Internal Links] Failed to fetch keywords from DB:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("[Internal Links] Error fetching keywords:", error);
    return [];
  }
});

// DB 키워드만 사용 (관리자 페이지 시스템)
export async function getSortedKeywords(): Promise<KeywordLink[]> {
  const dbKeywords = await fetchKeywordsFromDB();
  
  // DB에서 가져온 키워드만 사용
  const keywords = dbKeywords;
  
  // 우선순위 정렬 (긴 키워드 우선, 같은 길이면 priority 높은 순)
  return [...keywords].sort((a, b) => {
    const lenDiff = b.keyword.length - a.keyword.length;
    if (lenDiff !== 0) return lenDiff;
    return b.priority - a.priority;
  });
}

// 기존 인터페이스 (호환성 유지)
export interface LegacyKeywordLink {
  keyword: string;
  url: string;
  priority: number;
  category: "형사" | "민사" | "강제집행" | "전세" | "채무" | "상속" | "이혼" | "노동" | "부동산" | "세금" | "절차";
  // Anchor text 다양화
  anchorVariants: string[];
}

// 하드코딩된 키워드 배열 제거 - 이제 DB에서만 가져옴

// 전역 캐시된 키워드 (서버 사이드)
let cachedKeywords: KeywordLink[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1시간

// 캐시된 키워드 가져오기 (서버 사이드)
export async function getCachedKeywords(): Promise<KeywordLink[]> {
  const now = Date.now();

  if (cachedKeywords && (now - lastCacheTime) < CACHE_TTL) {
    return cachedKeywords;
  }

  const keywords = await getSortedKeywords();
  cachedKeywords = keywords;
  lastCacheTime = now;
  return keywords;
}

// URL 슬러그 안전하게 처리 (특수 문자 제거)
export function safeSlug(slug: string): string {
  return slug
    .replace(/[·•·]/g, "-")  // 중간점을 하이픈으로 변환
    .replace(/[^\w\s-]/g, "")  // 특수 문자 제거
    .replace(/\s+/g, "-")      // 공백을 하이픈으로 변환
    .replace(/-+/g, "-")       // 연속된 하이픈을 하나로
    .replace(/^-+|-+$/g, "");  // 앞뒤 하이픈 제거
}

export function addInternalLinks(
  markdown: string,
  maxTotalLinks: number = 5,
  keywords?: KeywordLink[],
  currentPostUrl?: string
): string {
  if (!markdown) return markdown;

  // 키워드가 없으면 빈 배열 사용 (링크 생성 안됨)
  const keywordsToUse = keywords && keywords.length > 0 ? keywords : [];

  // 기존 내부링크 제거 (재발행 시 최신 슬러그로 교체하기 위해)
  // 마크다운 링크 형식: [텍스트](URL)
  // /posts/ 또는 /cases/로 시작하는 링크만 제거 (안전한 정규식 사용)
  let result = markdown.replace(/\[([^\]]+)\]\(\/posts\/[^)]+\)/g, '$1');
  result = result.replace(/\[([^\]]+)\]\(\/cases\/[^)]+\)/g, '$1');

  const linkedKeywords = new Set<string>();
  const linkedPositions: number[] = [];
  const usedParagraphs = new Set<number>();
  let totalLinks = 0;

  // 매치 후보가 모든 삽입 규칙을 통과하는지 검사 — 위치 기반 규칙은 항상
  // 현재(삽입이 반영된) 문자열 기준으로 판정한다.
  const passesGuards = (idx: number, len: number): boolean => {
    // 단어 경계 — 더 긴 단어의 일부(기소장 속 "기소")는 링크하지 않는다
    if (!isWordBoundary(result, idx, len)) return false;

    const beforeText = result.slice(0, idx);
    const lastOpenLink = beforeText.lastIndexOf("[");
    const lastCloseLink = beforeText.lastIndexOf("]");

    // 이미 링크 앵커 내부
    if (lastOpenLink > lastCloseLink) return false;

    // 링크 URL 내부 (]( 이후 ) 전 — 중첩 손상 방지)
    const lastOpenParen = beforeText.lastIndexOf("](");
    const lastCloseParen = beforeText.lastIndexOf(")");
    if (lastOpenParen > lastCloseParen) return false;

    // 코드 블록 내부 (``` 페어)
    const codeBlockCount = (beforeText.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) return false;

    // 헤딩(#~)·표(|로 시작하는 행) 내부 — 라인 시작 접두사로 판정
    const lineStart = beforeText.lastIndexOf("\n") + 1;
    const linePrefix = result.slice(lineStart, idx);
    if (/^\s*#{1,6}\s/.test(linePrefix) || /^\s*\|/.test(linePrefix)) return false;

    // 문단당 최대 1개 — 빈 줄 기준 문단 번호로 판정
    const paraIdx = (beforeText.match(/\n\s*\n/g) || []).length;
    if (usedParagraphs.has(paraIdx)) return false;

    // 주변 100자 내 링크 중복 — 기록된 위치는 삽입 델타로 보정돼 현재 좌표계
    if (linkedPositions.some((pos) => Math.abs(pos - idx) < 100)) return false;

    return true;
  };

  // 키워드 우선순위 순으로 처리
  for (const item of keywordsToUse) {
    if (totalLinks >= maxTotalLinks) break;
    if (linkedKeywords.has(item.keyword)) continue;

    // 자기글 링크 방지
    if (currentPostUrl && item.url === currentPostUrl) {
      continue;
    }

    // 첫 등장 위치부터 순서대로 규칙을 통과하는 첫 매치에 삽입
    const escapedKeyword = item.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const keywordRegex = new RegExp(escapedKeyword, "gi");

    let chosenIndex = -1;
    let match: RegExpExecArray | null;
    while ((match = keywordRegex.exec(result)) !== null) {
      if (passesGuards(match.index, match[0].length)) {
        chosenIndex = match.index;
        break;
      }
    }
    if (chosenIndex === -1) continue;

    // 앵커 텍스트 다양화 — variants가 있으면 삽입 순서로 순환 (항상 [0]만 쓰던 결함)
    const variants = item.anchorVariants?.filter((v) => v.trim().length > 0);
    const anchorText = variants && variants.length > 0 ? variants[totalLinks % variants.length] : item.keyword;
    // 대괄호 제거 (마크다운 링크 형식 깨짐 방지)
    const safeAnchorText = anchorText.replace(/\[/g, '').replace(/\]/g, '');
    // URL은 관리자 테이블의 값을 그대로 사용 — safeSlug의 ASCII 문자 클래스가
    // 한글 카테고리명·%인코딩 앵커를 파괴해 /cases/ 링크가 부식되는 결함 수정
    const replacement = `[${safeAnchorText}](${item.url})`;

    // 삽입 후 그 뒤의 기록 위치들을 델타만큼 이동해 좌표계를 유지한다
    const delta = replacement.length - match![0].length;
    for (let i = 0; i < linkedPositions.length; i++) {
      if (linkedPositions[i] >= chosenIndex) linkedPositions[i] += delta;
    }

    result = result.slice(0, chosenIndex) + replacement + result.slice(chosenIndex + match![0].length);

    const beforeInserted = result.slice(0, chosenIndex);
    usedParagraphs.add((beforeInserted.match(/\n\s*\n/g) || []).length);
    linkedKeywords.add(item.keyword);
    linkedPositions.push(chosenIndex);
    totalLinks++;
  }

  return result;
}

/**
 * 본문에서 문맥 연결 키워드 추출 (관련 절차 제안용)
 */
export function extractContextKeywords(
  content: string,
  maxKeywords: number = 3,
  keywords?: KeywordLink[]
): string[] {
  const found: string[] = [];
  const contentLower = content.toLowerCase();
  // 키워드가 없으면 빈 배열 사용
  const keywordsToUse = keywords && keywords.length > 0 ? keywords : [];

  for (const item of keywordsToUse) {
    if (found.length >= maxKeywords) break;
    if (contentLower.includes(item.keyword.toLowerCase())) {
      found.push(item.keyword);
    }
  }

  return found;
}

/**
 * async 버전: DB에서 키워드 가져와서 내부링크 추가
 * 서버 사이드에서 사용 (React Server Components 등)
 */
export async function addInternalLinksAsync(
  html: string,
  maxTotalLinks: number = 5
): Promise<string> {
  const keywords = await getCachedKeywords();
  return addInternalLinks(html, maxTotalLinks, keywords);
}

/**
 * async 버전: DB에서 키워드 가져와서 문맥 키워드 추출
 */
export async function extractContextKeywordsAsync(
  content: string,
  maxKeywords: number = 3
): Promise<string[]> {
  const keywords = await getCachedKeywords();
  return extractContextKeywords(content, maxKeywords, keywords);
}
