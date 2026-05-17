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

export interface KeywordLink {
  keyword: string;
  url: string;
  priority: number;
  category: "형사" | "민사" | "강제집행" | "전세" | "채무" | "상속" | "이혼" | "노동" | "부동산" | "세금" | "절차";
  // Anchor text 다양화
  anchorVariants: string[];
}

// 핵심 법률/절차 키워드 매핑 (사건 흐름 기반 우선순위)
export const LEGAL_KEYWORDS: KeywordLink[] = [
  // === 형사/고소 (높은 우선순위) ===
  {
    keyword: "형사 고소",
    url: "/cases/형사·고소",
    priority: 100,
    category: "형사",
    anchorVariants: ["형사 고소", "고소", "형사고소"],
  },
  {
    keyword: "고소장",
    url: "/cases/형사·고소",
    priority: 90,
    category: "형사",
    anchorVariants: ["고소장", "고소장 작성"],
  },
  {
    keyword: "불송치",
    url: "/search?q=불송치",
    priority: 85,
    category: "형사",
    anchorVariants: ["불송치", "불송치 처분"],
  },
  {
    keyword: "기소",
    url: "/search?q=기소",
    priority: 80,
    category: "형사",
    anchorVariants: ["기소", "기소됨"],
  },
  {
    keyword: "경찰 조사",
    url: "/search?q=경찰조사",
    priority: 85,
    category: "형사",
    anchorVariants: ["경찰 조사", "경찰조사"],
  },
  {
    keyword: "검찰 조사",
    url: "/search?q=검찰조사",
    priority: 80,
    category: "형사",
    anchorVariants: ["검찰 조사", "검찰조사"],
  },

  // === 손해배상/민사 (높은 우선순위) ===
  {
    keyword: "손해배상",
    url: "/cases/민사·소송",
    priority: 95,
    category: "민사",
    anchorVariants: ["손해배상", "손해 배상", "손해배상청구"],
  },
  {
    keyword: "소송",
    url: "/cases/민사·소송",
    priority: 80,
    category: "민사",
    anchorVariants: ["소송", "민사소송"],
  },
  {
    keyword: "소장",
    url: "/search?q=소장",
    priority: 75,
    category: "민사",
    anchorVariants: ["소장", "소장 접수"],
  },
  {
    keyword: "판결",
    url: "/search?q=판결",
    priority: 75,
    category: "민사",
    anchorVariants: ["판결", "판결이 나옴"],
  },
  {
    keyword: "상고",
    url: "/search?q=상고",
    priority: 70,
    category: "민사",
    anchorVariants: ["상고", "상고심"],
  },
  {
    keyword: "항소",
    url: "/search?q=항소",
    priority: 70,
    category: "민사",
    anchorVariants: ["항소", "항소심"],
  },

  // === 강제집행 (높은 우선순위 - 다음 절차) ===
  {
    keyword: "강제집행",
    url: "/search?q=강제집행",
    priority: 90,
    category: "강제집행",
    anchorVariants: ["강제집행", "강제 집행"],
  },
  {
    keyword: "압류",
    url: "/search?q=압류",
    priority: 85,
    category: "강제집행",
    anchorVariants: ["압류", "압류 조치"],
  },
  {
    keyword: "동산압류",
    url: "/search?q=동산압류",
    priority: 80,
    category: "강제집행",
    anchorVariants: ["동산압류", "동산 압류"],
  },
  {
    keyword: "부동산압류",
    url: "/search?q=부동산압류",
    priority: 80,
    category: "강제집행",
    anchorVariants: ["부동산압류", "부동산 압류"],
  },
  {
    keyword: "경매",
    url: "/search?q=경매",
    priority: 80,
    category: "강제집행",
    anchorVariants: ["경매", "강제경매"],
  },
  {
    keyword: "지급명령",
    url: "/cases/채무·금전",
    priority: 85,
    category: "강제집행",
    anchorVariants: ["지급명령", "지급명령 신청"],
  },
  {
    keyword: "이의신청",
    url: "/search?q=이의신청",
    priority: 75,
    category: "강제집행",
    anchorVariants: ["이의신청", "이의 신청"],
  },

  // === 전세/임대차 (높은 우선순위) ===
  {
    keyword: "전세금 반환",
    url: "/cases/전세·임대차",
    priority: 100,
    category: "전세",
    anchorVariants: ["전세금 반환", "전세금반환"],
  },
  {
    keyword: "전세사기",
    url: "/cases/전세·임대차",
    priority: 95,
    category: "전세",
    anchorVariants: ["전세사기", "전세 사기"],
  },
  {
    keyword: "보증금 반환",
    url: "/cases/전세·임대차",
    priority: 90,
    category: "전세",
    anchorVariants: ["보증금 반환", "보증금반환"],
  },
  {
    keyword: "임차권",
    url: "/cases/전세·임대차",
    priority: 85,
    category: "전세",
    anchorVariants: ["임차권", "임차권 등록"],
  },
  {
    keyword: "우선변제권",
    url: "/search?q=우선변제권",
    priority: 80,
    category: "전세",
    anchorVariants: ["우선변제권", "우선변제"],
  },
  {
    keyword: "확정일자",
    url: "/search?q=확정일자",
    priority: 80,
    category: "전세",
    anchorVariants: ["확정일자", "확정일자 신고"],
  },

  // === 채무/금전 (중간 우선순위) ===
  {
    keyword: "채무",
    url: "/cases/채무·금전",
    priority: 85,
    category: "채무",
    anchorVariants: ["채무", "채무 관계"],
  },
  {
    keyword: "채권",
    url: "/cases/채무·금전",
    priority: 75,
    category: "채무",
    anchorVariants: ["채권", "채권자"],
  },
  {
    keyword: "개인회생",
    url: "/search?q=개인회생",
    priority: 80,
    category: "채무",
    anchorVariants: ["개인회생", "회생신청"],
  },
  {
    keyword: "파산",
    url: "/search?q=파산",
    priority: 75,
    category: "채무",
    anchorVariants: ["파산", "파산신청"],
  },

  // === 상속/유언 (중간 우선순위) ===
  {
    keyword: "상속",
    url: "/cases/상속·유언",
    priority: 90,
    category: "상속",
    anchorVariants: ["상속", "상속절차"],
  },
  {
    keyword: "한정승인",
    url: "/cases/상속·유언",
    priority: 95,
    category: "상속",
    anchorVariants: ["한정승인", "한정 승인"],
  },
  {
    keyword: "상속포기",
    url: "/search?q=상속포기",
    priority: 85,
    category: "상속",
    anchorVariants: ["상속포기", "상속 포기"],
  },

  // === 이혼/가족 (중간 우선순위) ===
  {
    keyword: "이혼",
    url: "/cases/이혼·가족",
    priority: 90,
    category: "이혼",
    anchorVariants: ["이혼", "이혼소송"],
  },
  {
    keyword: "양육권",
    url: "/cases/이혼·가족",
    priority: 85,
    category: "이혼",
    anchorVariants: ["양육권", "양육권 분쟁"],
  },

  // === 노동 (낮은 우선순위) ===
  {
    keyword: "부당해고",
    url: "/cases/노동·근로",
    priority: 90,
    category: "노동",
    anchorVariants: ["부당해고", "부당 해고"],
  },
  {
    keyword: "해고",
    url: "/cases/노동·근로",
    priority: 85,
    category: "노동",
    anchorVariants: ["해고", "해고 통보"],
  },
  {
    keyword: "산업재해",
    url: "/cases/노동·근로",
    priority: 80,
    category: "노동",
    anchorVariants: ["산업재해", "산재"],
  },

  // === 세금/행정 (낮은 우선순위) ===
  {
    keyword: "세무조사",
    url: "/cases/세금·행정",
    priority: 85,
    category: "세금",
    anchorVariants: ["세무조사", "세무 조사"],
  },
  {
    keyword: "행정심판",
    url: "/cases/세금·행정",
    priority: 80,
    category: "세금",
    anchorVariants: ["행정심판", "행정 심판"],
  },

  // === 절차 일반 (가장 낮은 우선순위 - 과삽입 방지) ===
  {
    keyword: "법원",
    url: "/search?q=법원",
    priority: 60,
    category: "절차",
    anchorVariants: ["법원", "관할법원"],
  },
  {
    keyword: "증거",
    url: "/search?q=증거",
    priority: 60,
    category: "절차",
    anchorVariants: ["증거", "증거자료"],
  },
];

// 우선순위 내림차순 정렬 (긴 키워드 우선)
export const SORTED_KEYWORDS = [...LEGAL_KEYWORDS].sort((a, b) => {
  const lenDiff = b.keyword.length - a.keyword.length;
  if (lenDiff !== 0) return lenDiff;
  return b.priority - a.priority;
});

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
export function addInternalLinks(
  html: string,
  maxTotalLinks: number = 5
): string {
  if (!html) return html;

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
    for (const item of SORTED_KEYWORDS) {
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
      const anchorText = item.anchorVariants[0] || item.keyword;
      
      // 해당 위치에서만 치환
      const beforeKeyword = result.slice(0, foundInHtml + paraOffset);
      const afterKeyword = result.slice(foundInHtml + paraOffset);
      
      const replacement = `<a href="${item.url}" class="internal-context-link text-rust hover:text-rust-light border-b border-rust/30 hover:border-rust transition-colors" data-internal-link="true">${anchorText}</a>`;
      
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
  maxKeywords: number = 3
): string[] {
  const found: string[] = [];
  const contentLower = content.toLowerCase();

  for (const item of SORTED_KEYWORDS) {
    if (found.length >= maxKeywords) break;
    if (contentLower.includes(item.keyword.toLowerCase())) {
      found.push(item.keyword);
    }
  }

  return found;
}
