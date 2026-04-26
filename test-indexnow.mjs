// IndexNow 테스트 스크립트
// 사용법: node test-indexnow.mjs

const INDEXNOW_KEY = "d69e5cf2d78353c1c09c08c163ae690b";
const HOST = "blogaipandoci.vercel.app";
const TEST_URL = `https://${HOST}/`;  // 실제 존재하는 홈페이지 URL로 테스트

async function testIndexNow() {
  console.log("🧪 IndexNow API 테스트 시작\n");
  
  // 1. 키 파일 확인
  console.log("1️⃣ 키 파일 확인 중...");
  const keyUrl = `https://${HOST}/api/indexnow-key?key=${INDEXNOW_KEY}`;
  
  try {
    const keyRes = await fetch(keyUrl);
    if (keyRes.status === 200) {
      const keyText = await keyRes.text();
      console.log(`   ✅ 키 파일 OK: ${keyText.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ 키 파일 오류: HTTP ${keyRes.status}`);
    }
  } catch (e) {
    console.log(`   ❌ 키 파일 접근 실패: ${e.message}`);
  }
  
  // 2. IndexNow API 호출
  console.log("\n2️⃣ IndexNow API 알림 테스트...");
  
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `https://${HOST}/api/indexnow-key?key=${INDEXNOW_KEY}`,
    urlList: [TEST_URL],
  };
  
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    
    console.log(`   HTTP 상태: ${res.status}`);
    
    switch (res.status) {
      case 200:
        console.log("   ✅ 성공! 검색엔진에 즉시 알림됨");
        break;
      case 202:
        console.log("   ⏳ 키 확인 중... (정상, 키 검증 대기)");
        break;
      case 400:
        console.log("   ❌ 잘못된 요청");
        break;
      case 403:
        console.log("   ❌ 키 유효하지 않음 (키 파일 확인 필요)");
        break;
      case 429:
        console.log("   ⚠️ 너무 많은 요청");
        break;
      default:
        console.log(`   ❓ 예상치 못한 응답: ${res.status}`);
    }
    
    const text = await res.text();
    if (text) console.log(`   응답: ${text}`);
    
  } catch (e) {
    console.log(`   ❌ API 호출 실패: ${e.message}`);
  }
  
  console.log("\n📋 다음 단계:");
  console.log("   1. 네이버 서치어드바이저에서 키 위치 등록:");
  console.log(`      https://searchadvisor.naver.com/indexnow`);
  console.log(`      키 위치: https://${HOST}/api/indexnow-key?key=${INDEXNOW_KEY}`);
  console.log("   2. 글 작성/수정 시 자동으로 알림 전송됨");
}

testIndexNow();
