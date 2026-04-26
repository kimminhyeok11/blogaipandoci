import { NextResponse } from "next/server";

/**
 * IndexNow 키 파일 제공 API
 * https://www.indexnow.org/documentation
 * 
 * GET /api/indexnow-key?key=<key>
 * IndexNow 봇이 키 파일을 확인할 때 호출
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  
  // 환경변수에서 키 가져오기
  const validKey = process.env.INDEXNOW_KEY;
  
  if (!validKey) {
    return new NextResponse("IndexNow key not configured", { status: 404 });
  }
  
  // 요청된 키가 유효한 키와 일치하는지 확인
  if (key && key === validKey) {
    // 키 파일 내용 반환 (키 값 그대로)
    return new NextResponse(validKey, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
  
  // 키가 없거나 일치하지 않으면 404
  return new NextResponse("Invalid key", { status: 404 });
}
