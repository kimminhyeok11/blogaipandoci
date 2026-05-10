// Old slug → New slug 매핑 테이블
// 301 리다이렉트용 정확한 매핑

export const slugMapping: Record<string, string> = {
  // 예전 도메인 (lawtiphub.com)
  "--fhzgha": "보험-전기간-부담보-해제-조건과-기간-언제-풀리는지-정확히-정리",
  
  // 예전 도메인 (blogaipandoci.vercel.app)
  "--wjtbiu": "헤어진-연인에게-빌려준-전세금생활비-법적-절차-완전-정리-내용증명-지급명령-소송까지-실제-흐름비용기간증거-팁",
  "--cz7o3s": "다낭성난소증후군과-암보험-전기간-부담z의-진실",
  "--dy08di": "전세집-보일러가-고장-나면-누가-책임지는가-법적-근거와-실무-대응법",
  "--gcnj18": "한화생명-미성년자-계약자-부모-변경-방법-총정리-필수서류부터-실제-진행-흐름까지",
  "-": "처음-계약하는-대학생을-위한-이유까지-이해하는-공공임대-계약서-설명",
};

// slug 정규화 (앞뒤 슬래시 제거, 디코딩)
export function normalizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^\//, "")
    .replace(/\/$/, "")
    .replace(/^posts\//, "");
}

// 매핑된 slug 조회
export function getMappedSlug(oldSlug: string): string | null {
  const normalized = normalizeSlug(oldSlug);
  return slugMapping[normalized] || null;
}
