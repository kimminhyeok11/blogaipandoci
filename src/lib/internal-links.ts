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

export interface KeywordLink {
  keyword: string;
  url: string;
  priority: number;
  category: string;
  anchorVariants?: string[];
}

// DB에서 키워드 조회 (캐싱 적용)
export const fetchKeywordsFromDB = cache(async (): Promise<KeywordLink[]> => {
  try {
    // 서버 사이드에서만 실행
    if (typeof window !== "undefined") {
      return [];
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/keywords`, {
      next: { revalidate: 3600 }, // 1시간 캐싱
    });

    if (!response.ok) {
      console.error("[Internal Links] Failed to fetch keywords from DB");
      return [];
    }

    const data = await response.json();
    return data.keywords || [];
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

/**
 * HTML 파싱하여 문단(paragraph) 단위로 분리
 */
function extractParagraphs(html: string): Array<{ text: string; start: number; end: number }> {
  const paragraphs: Array<{ text: string; start: number; end: number }> = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const text = match[1];
    const index = match.index;
    if (text === undefined || index === undefined) continue;
    paragraphs.push({
      text,
      start: index,
      end: index + match[0].length,
    });
  }

  return paragraphs;
}

/**
 * 특정 위치가 보호 영역(링크, 코드, heading, table) 내인지 확인
 */
function isProtectedArea(html: string, offset: number): boolean {
  // 이미 링크된 영역
  const linkRegex = /<a\b[^>]*>[\s\S]*?<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    if (offset >= match.index && offset < match.index + match[0].length) {
      return true;
    }
  }

  // 코드블록
  const codeRegex = /<(code|pre)\b[^>]*>[\s\S]*?<\/\1>/gi;
  while ((match = codeRegex.exec(html)) !== null) {
    if (offset >= match.index && offset < match.index + match[0].length) {
      return true;
    }
  }

  // 헤딩
  const headingRegex = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi;
  while ((match = headingRegex.exec(html)) !== null) {
    if (offset >= match.index && offset < match.index + match[0].length) {
      return true;
    }
  }

  // 테이블
  const tableRegex = /<table\b[^>]*>[\s\S]*?<\/table>/gi;
  while ((match = tableRegex.exec(html)) !== null) {
    if (offset >= match.index && offset < match.index + match[0].length) {
      return true;
    }
  }

  return false;
}

/**
 * 문장 경계 찾기 (마침표, 물음표, 느낌표 기준)
 */
function findSentenceBoundaries(text: string): Array<{ start: number; end: number }> {
  const boundaries: Array<{ start: number; end: number }> = [];
  const sentenceEndRegex = /[.!?。！？]+\s*/g;
  let lastEnd = 0;
  let match;

  while ((match = sentenceEndRegex.exec(text)) !== null) {
    const end = match.index + match[0].length;
    if (end > lastEnd) {
      boundaries.push({ start: lastEnd, end });
      lastEnd = end;
    }
  }

  // 마지막 문장
  if (lastEnd < text.length) {
    boundaries.push({ start: lastEnd, end: text.length });
  }

  return boundaries;
}

/**
 * HTML에서 키워드를 감지하여 내부 링크로 변환
 *
 * 규칙:
 * - 문단당 최대 1개 링크
 * - 본문 전체 최대 5개 링크
 * - 동일 키워드 1회만 링크
 * - 첫 등장만 링크
 * - 이미 a 태그 내부는 제외
 * - heading(h1~h6), table, code, pre 내부 제외
 * - 주변 100자 내 링크 중복 금지
 * - 자연문장 내부에만 삽입
 */
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

export function addInternalLinks(
  html: string,
  maxTotalLinks: number = 5,
  keywords?: KeywordLink[]
): string {
  if (!html) return html;

  // 키워드가 없으면 빈 배열 사용 (링크 생성 안됨)
  const keywordsToUse = keywords && keywords.length > 0 ? keywords : [];
  
  let result = html;
  const linkedKeywords = new Set<string>();
  const linkedPositions: number[] = [];
  let totalLinks = 0;

  // 문단 단위로 처리
  const paragraphs = extractParagraphs(html);

  for (const para of paragraphs) {
    if (totalLinks >= maxTotalLinks) break;

    let paraModified = false;
    let paraOffset = 0;

    // 키워드 우선순위 순으로 처리
    for (const item of keywordsToUse) {
      if (totalLinks >= maxTotalLinks) break;
      if (linkedKeywords.has(item.keyword)) continue; // 이미 링크된 키워드 제외
      if (paraModified) break; // 문단당 1개만

      // 키워드 탐색 (HTML 태그 제외한 텍스트에서)
      const cleanText = para.text.replace(/<[^>]*>/g, "");
      const keywordIndex = cleanText.indexOf(item.keyword);

      if (keywordIndex === -1) continue;

      // 원본 HTML에서의 위치 계산
      let textPos = 0;
      let htmlPos = 0;
      let foundInHtml = -1;

      for (let i = 0; i < para.text.length; i++) {
        if (para.text[i] === "<") {
          // 태그 시작 - 태그 내부는 텍스트 위치 증가 없음
          while (i < para.text.length && para.text[i] !== ">") {
            i++;
          }
        } else {
          if (textPos === keywordIndex) {
            foundInHtml = para.start + htmlPos;
            break;
          }
          textPos++;
        }
        htmlPos++;
      }

      if (foundInHtml === -1) continue;

      // 이미 a 태그 내부인지 확인 (href 속성값 내부 제외)
      const beforeHtml = html.slice(0, foundInHtml);
      const lastOpenTag = beforeHtml.lastIndexOf("<");
      const lastCloseTag = beforeHtml.lastIndexOf(">");
      
      // <a ...> 태그 내부에 있는지 확인
      if (lastOpenTag > lastCloseTag) {
        // 현재 태그 내부 - a 태그인지 확인
        const tagContent = html.slice(lastOpenTag, foundInHtml);
        if (tagContent.toLowerCase().startsWith("<a ") || tagContent.toLowerCase().startsWith("<a>")) {
          continue; // a 태그 내부면 변환하지 않음
        }
      }
      
      // a 태그 내부의 텍스트인지 확인 (닫히지 않은 a 태그 검색)
      const lastOpenA = beforeHtml.toLowerCase().lastIndexOf("<a ");
      const lastCloseA = beforeHtml.toLowerCase().lastIndexOf("</a>");
      if (lastOpenA > lastCloseA) {
        // 현재 a 태그 내부에 있음
        continue;
      }

      // 보호 영역 확인
      if (isProtectedArea(html, foundInHtml)) continue;

      // 주변 100자 내 링크 중복 확인
      const tooClose = linkedPositions.some(
        (pos) => Math.abs(pos - foundInHtml) < 100
      );
      if (tooClose) continue;

      // 자연문장 내부 확인 (문장 중간에 있는지)
      const paraTextBefore = cleanText.slice(0, keywordIndex);
      const paraTextAfter = cleanText.slice(keywordIndex + item.keyword.length);
      const sentenceBoundaries = findSentenceBoundaries(cleanText);
      
      let inMiddleOfSentence = false;
      for (const boundary of sentenceBoundaries) {
        if (keywordIndex > boundary.start && keywordIndex < boundary.end - 10) {
          // 문장 끝에서 10자 이상 떨어져 있어야 함
          const wordsBefore = paraTextBefore.trim().split(/\s+/).length;
          const wordsAfter = paraTextAfter.trim().split(/\s+/).length;
          
          // 앞뒤로 최소 3단어씩 있어야 자연스러운 문장 내부
          if (wordsBefore >= 3 && wordsAfter >= 3) {
            inMiddleOfSentence = true;
          }
        }
      }
      
      if (!inMiddleOfSentence) continue;

      // 링크 삽입
      const escapedKeyword = item.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const keywordRegex = new RegExp(`(${escapedKeyword})`, "i");
      
      // anchor text 다양화
      const anchorText = item.anchorVariants?.[0] || item.keyword;
      
      // 해당 위치에서만 치환
      const beforeKeyword = result.slice(0, foundInHtml + paraOffset);
      const afterKeyword = result.slice(foundInHtml + paraOffset);
      
      const replacement = `<a href="${item.url}" class="internal-context-link text-rust hover:text-rust-light border-b border-rust/30 hover:border-rust transition-colors" data-internal-link="true" data-processed="true">${anchorText}</a>`;
      
      const match = afterKeyword.match(keywordRegex);
      if (match && match.index !== undefined) {
        result = beforeKeyword + afterKeyword.slice(0, match.index) + replacement + afterKeyword.slice(match.index + match[0].length);
        
        linkedKeywords.add(item.keyword);
        linkedPositions.push(foundInHtml);
        totalLinks++;
        paraModified = true;
        paraOffset += replacement.length - match[0].length;
      }
    }
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
