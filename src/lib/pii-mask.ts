/**
 * 개인정보 자동 마스킹 유틸리티
 * 전화번호, 주민번호, 계좌번호, 이메일, 실명 등을 자동으로 마스킹 처리
 */

export function maskPII(text: string): string {
  if (!text) return text;

  let masked = text;

  // 전화번호: 010-1234-5678 → 010-****-5678
  masked = masked.replace(/(\d{3})-(\d{4})-(\d{4})/g, '$1-****-$3');
  masked = masked.replace(/(\d{3})\s*(\d{4})\s*(\d{4})/g, '$1-****-$3');
  
  // 11자리 연락처: 01012345678 → 010-****-5678
  masked = masked.replace(/(\d{3})(\d{4})(\d{4})/g, '$1-****-$3');

  // 주민번호: 900101-1234567 → 900101-*******
  masked = masked.replace(/(\d{6})-(\d{7})/g, '$1-*******');
  masked = masked.replace(/(\d{6})\s*(\d{7})/g, '$1-*******');

  // 계좌번호: 123-456-789012 → 123-***-***012
  masked = masked.replace(/(\d{3})-(\d{3})-(\d{6})/g, '$1-***-***$3');
  masked = masked.replace(/(\d{3})\s*(\d{3})\s*(\d{6})/g, '$1-***-***$3');

  // 이메일: user@example.com → u***@example.com
  masked = masked.replace(/(\w)[\w.-]+@([\w.-]+)/g, '$1***@$2');

  // 실명 추정 패턴 (한글 2-3자 + 씨/님)
  masked = masked.replace(/([가-힣]{2,3})(씨|님)/g, '$***$2');

  // 주소 패턴 (시/도 + 구/군 + 동/리)
  masked = masked.replace(/([가-힣]+시)\s*([가-힣]+구)\s*([가-힣]+동)/g, '$1시 $2구 ***동');
  masked = masked.replace(/([가-힣]+도)\s*([가-힣]+시)\s*([가-힣]+군)/g, '$1도 $2시 ***군');

  return masked;
}

/**
 * 위험 점수 계산 (개인정보 포함 여부)
 */
export function calculateRiskScore(text: string): number {
  let score = 0;

  // 전화번호 패턴
  if (/(\d{3}-\d{4}-\d{4})|(\d{3}\s*\d{4}\s*\d{4})|(\d{11})/.test(text)) {
    score += 30;
  }

  // 주민번호 패턴
  if (/(\d{6}-\d{7})|(\d{6}\s*\d{7})/.test(text)) {
    score += 50;
  }

  // 계좌번호 패턴
  if (/(\d{3}-\d{3}-\d{6})|(\d{3}\s*\d{3}\s*\d{6})/.test(text)) {
    score += 40;
  }

  // 이메일 패턴
  if (/[\w.-]+@[\w.-]+/.test(text)) {
    score += 20;
  }

  // 주소 패턴
  if (/([가-힣]+시)\s*([가-힣]+구)\s*([가-힣]+동)/.test(text)) {
    score += 25;
  }

  return Math.min(score, 100);
}
