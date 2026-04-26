// IndexNow API 유틸리티
// https://www.indexnow.org/documentation

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

interface IndexNowRequest {
  host: string;
  key: string;
  keyLocation?: string;
  urlList: string[];
}

/**
 * IndexNow API로 URL 변경사항을 검색엔진에 알림
 * @param urls 알릴 URL 목록 (최대 10,000개)
 * @param key IndexNow 인증 키
 * @param host 사이트 도메인 (예: blogaipandoci.vercel.app)
 */
export async function notifyIndexNow(
  urls: string[],
  key: string,
  host: string
): Promise<{ success: boolean; message: string; status?: number }> {
  if (!urls.length || urls.length > 10000) {
    return {
      success: false,
      message: "URL은 1개 이상 10,000개 이하여야 합니다.",
    };
  }

  // 키 파일 위치 (루트에 있다고 가정)
  const keyLocation = `https://${host}/${key}.txt`;

  const payload: IndexNowRequest = {
    host,
    key,
    keyLocation,
    urlList: urls,
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;

    switch (status) {
      case 200:
        return { success: true, message: "IndexNow: 검색엔진에 성공적으로 알림", status };
      case 202:
        return { success: true, message: "IndexNow: 키 확인 중, 요청 수신됨", status };
      case 400:
        return { success: false, message: "IndexNow: 잘못된 요청 형식", status };
      case 403:
        return { success: false, message: "IndexNow: 키가 유효하지 않음", status };
      case 422:
        return { success: false, message: "IndexNow: URL과 키 정보 불일치", status };
      case 429:
        return { success: false, message: "IndexNow: 너무 많은 요청", status };
      case 500:
        return { success: false, message: "IndexNow: 서버 오류", status };
      default:
        return { success: false, message: `IndexNow: 알 수 없는 응답 (${status})`, status };
    }
  } catch (error) {
    return {
      success: false,
      message: `IndexNow 요청 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * 단일 URL 알림 (간편 함수)
 */
export async function notifySingleUrl(
  url: string,
  key: string,
  host: string
): Promise<{ success: boolean; message: string; status?: number }> {
  return notifyIndexNow([url], key, host);
}

/**
 * IndexNow 키 생성 (16진수 + 하이픈, 32자)
 */
export function generateIndexNowKey(): string {
  const chars = "abcdef0123456789";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

/**
 * 키 파일 내용 생성
 */
export function generateKeyFileContent(key: string): string {
  return key;
}
