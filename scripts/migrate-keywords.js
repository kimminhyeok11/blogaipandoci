// LEGAL_KEYWORDS를 DB로 마이그레이션하는 스크립트
// node scripts/migrate-keywords.js

const dotenv = require('dotenv');
const path = require('path');

// .env.local 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// LEGAL_KEYWORDS 배열 (internal-links.ts에서 복사)
const LEGAL_KEYWORDS = [
  // === 형사/고소 (높은 우선순위) ===
  {
    keyword: "형사 고소",
    url: "/cases/형사-고소",
    priority: 100,
    category: "형사",
    anchor_variants: ["고소", "형사고소", "형사 고소장"],
  },
  {
    keyword: "고소장",
    url: "/cases/형사-고소",
    priority: 90,
    category: "형사",
    anchor_variants: ["고소장 작성", "고소장 쓰기"],
  },
  {
    keyword: "불송치",
    url: "/search?q=불송치",
    priority: 85,
    category: "형사",
    anchor_variants: ["불송치 처분", "불기소처분"],
  },
  {
    keyword: "기소",
    url: "/search?q=기소",
    priority: 80,
    category: "형사",
    anchor_variants: ["기소유예", "기소중지", "기소명령"],
  },
  {
    keyword: "경찰 조사",
    url: "/search?q=경찰조사",
    priority: 85,
    category: "형사",
    anchor_variants: ["경찰 조사", "경찰서 조사"],
  },
  {
    keyword: "검찰 조사",
    url: "/search?q=검찰조사",
    priority: 80,
    category: "형사",
    anchor_variants: ["검찰 조사", "검찰청 조사"],
  },

  // === 손해배상/민사 (높은 우선순위) ===
  {
    keyword: "손해배상",
    url: "/cases/민사-소송",
    priority: 95,
    category: "민사",
    anchor_variants: ["손해배상 청구", "손해배상 소송"],
  },
  {
    keyword: "소송",
    url: "/cases/민사-소송",
    priority: 80,
    category: "민사",
    anchor_variants: ["민사 소송", "소송 제기"],
  },
  {
    keyword: "소장",
    url: "/search?q=소장",
    priority: 75,
    category: "민사",
    anchor_variants: ["소장 작성", "소장 접수"],
  },
  {
    keyword: "판결",
    url: "/search?q=판결",
    priority: 75,
    category: "민사",
    anchor_variants: ["판결문", "승소 판결", "패소 판결"],
  },
  {
    keyword: "상고",
    url: "/search?q=상고",
    priority: 70,
    category: "민사",
    anchor_variants: ["상고장", "대법원 상고"],
  },
  {
    keyword: "항소",
    url: "/search?q=항소",
    priority: 70,
    category: "민사",
    anchor_variants: ["항소장", "고등법원 항소"],
  },

  // === 강제집행 (높은 우선순위 - 다음 절차) ===
  {
    keyword: "강제집행",
    url: "/search?q=강제집행",
    priority: 90,
    category: "강제집행",
    anchor_variants: ["강제 집행", "집행"],
  },
  {
    keyword: "압류",
    url: "/search?q=압류",
    priority: 85,
    category: "강제집행",
    anchor_variants: ["재산 압류", "급여 압류"],
  },
  {
    keyword: "동산압류",
    url: "/search?q=동산압류",
    priority: 80,
    category: "강제집행",
    anchor_variants: ["동산 압류"],
  },
  {
    keyword: "부동산압류",
    url: "/search?q=부동산압류",
    priority: 80,
    category: "강제집행",
    anchor_variants: ["부동산 압류", "집 압류"],
  },
  {
    keyword: "경매",
    url: "/search?q=경매",
    priority: 80,
    category: "강제집행",
    anchor_variants: ["경매 입찰", "경매 낙찰"],
  },
  {
    keyword: "지급명령",
    url: "/cases/채무-금전",
    priority: 85,
    category: "강제집행",
    anchor_variants: ["지급 명령", "지급명령 신청"],
  },
  {
    keyword: "이의신청",
    url: "/search?q=이의신청",
    priority: 75,
    category: "강제집행",
    anchor_variants: ["이의 신청", "지급명령 이의신청"],
  },

  // === 전세/임대차 (높은 우선순위) ===
  {
    keyword: "전세금 반환",
    url: "/cases/전세-임대차",
    priority: 100,
    category: "전세",
    anchor_variants: ["전세금 돌려받기", "전세 보증금 반환"],
  },
  {
    keyword: "전세사기",
    url: "/cases/전세-임대차",
    priority: 95,
    category: "전세",
    anchor_variants: ["전세 사기", "보증금 사기"],
  },
  {
    keyword: "보증금 반환",
    url: "/cases/전세-임대차",
    priority: 90,
    category: "전세",
    anchor_variants: ["보증금 돌려받기", "보증금 회수"],
  },
  {
    keyword: "임차권",
    url: "/cases/전세-임대차",
    priority: 85,
    category: "전세",
    anchor_variants: ["임차권 등기", "대항력"],
  },
  {
    keyword: "우선변제권",
    url: "/search?q=우선변제권",
    priority: 80,
    category: "전세",
    anchor_variants: ["우선 변제권", "소액임차보증금"],
  },
  {
    keyword: "확정일자",
    url: "/search?q=확정일자",
    priority: 80,
    category: "전세",
    anchor_variants: ["확정 일자", "확정일자 받기"],
  },

  // === 채무/금전 (중간 우선순위) ===
  {
    keyword: "채무",
    url: "/cases/채무-금전",
    priority: 85,
    category: "채무",
    anchor_variants: ["채무 불이행", "채무 이행"],
  },
  {
    keyword: "채권",
    url: "/cases/채무-금전",
    priority: 75,
    category: "채무",
    anchor_variants: ["채권 회수", "채권 추심"],
  },
  {
    keyword: "개인회생",
    url: "/search?q=개인회생",
    priority: 80,
    category: "채무",
    anchor_variants: ["개인 회생", "회생 절차"],
  },
  {
    keyword: "파산",
    url: "/search?q=파산",
    priority: 75,
    category: "채무",
    anchor_variants: ["개인파산", "파산 선고"],
  },

  // === 상속/유언 (중간 우선순위) ===
  {
    keyword: "상속",
    url: "/cases/상속-유언",
    priority: 90,
    category: "상속",
    anchor_variants: ["상속 재산", "상속 절차"],
  },
  {
    keyword: "한정승인",
    url: "/cases/상속-유언",
    priority: 95,
    category: "상속",
    anchor_variants: ["한정 승인", "상속 한정승인"],
  },
  {
    keyword: "상속포기",
    url: "/search?q=상속포기",
    priority: 85,
    category: "상속",
    anchor_variants: ["상속 포기", "상속포기 신고"],
  },

  // === 이혼/가족 (중간 우선순위) ===
  {
    keyword: "이혼",
    url: "/cases/이혼-가족",
    priority: 90,
    category: "이혼",
    anchor_variants: ["이혼 소송", "협의 이혼", "재판 이혼"],
  },
  {
    keyword: "양육권",
    url: "/cases/이혼-가족",
    priority: 85,
    category: "이혼",
    anchor_variants: ["양육권 분쟁", "양육권 변경"],
  },

  // === 노동 (낮은 우선순위) ===
  {
    keyword: "부당해고",
    url: "/cases/노동-근로",
    priority: 90,
    category: "노동",
    anchor_variants: ["부당 해고", "해고 부당"],
  },
  {
    keyword: "해고",
    url: "/cases/노동-근로",
    priority: 85,
    category: "노동",
    anchor_variants: ["해고 통보", "정리해고"],
  },
  {
    keyword: "산업재해",
    url: "/cases/노동-근로",
    priority: 80,
    category: "노동",
    anchor_variants: ["산재", "산업재해 보상"],
  },

  // === 세금/행정 (낮은 우선순위) ===
  {
    keyword: "세무조사",
    url: "/cases/세금-행정",
    priority: 85,
    category: "세금",
    anchor_variants: ["세무 조사", "국세청 조사"],
  },
  {
    keyword: "행정심판",
    url: "/cases/세금-행정",
    priority: 80,
    category: "세금",
    anchor_variants: ["행정 심판", "행정소송"],
  },

  // === 절차 일반 (가장 낮은 우선순위 - 과삽입 방지) ===
  {
    keyword: "법원",
    url: "/search?q=법원",
    priority: 60,
    category: "절차",
    anchor_variants: ["법원 접수", "법원 방문"],
  },
  {
    keyword: "증거",
    url: "/search?q=증거",
    priority: 60,
    category: "절차",
    anchor_variants: ["증거 수집", "증거 제출"],
  },
];

async function migrateKeywords() {
  console.log('키워드 마이그레이션 시작...');
  
  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const keyword of LEGAL_KEYWORDS) {
    try {
      // 기존 키워드가 있는지 확인
      const { data: existing } = await supabase
        .from('internal_link_keywords')
        .select('id, keyword, url, priority, category')
        .eq('keyword', keyword.keyword)
        .single();

      if (existing) {
        // 기존 키워드가 있으면 업데이트
        const { error } = await supabase
          .from('internal_link_keywords')
          .update({
            url: keyword.url,
            priority: keyword.priority,
            category: keyword.category,
            anchor_variants: keyword.anchor_variants || null,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('keyword', keyword.keyword);

        if (error) {
          console.error(`❌ 업데이트 실패 (${keyword.keyword}):`, error.message);
          errors++;
        } else {
          console.log(`✅ 업데이트됨: ${keyword.keyword}`);
          updated++;
        }
      } else {
        // 새 키워드면 삽입
        const { error } = await supabase
          .from('internal_link_keywords')
          .insert({
            keyword: keyword.keyword,
            url: keyword.url,
            priority: keyword.priority,
            category: keyword.category,
            anchor_variants: keyword.anchor_variants || null,
            is_active: true
          });

        if (error) {
          console.error(`❌ 삽입 실패 (${keyword.keyword}):`, error.message);
          errors++;
        } else {
          console.log(`✅ 삽입됨: ${keyword.keyword}`);
          inserted++;
        }
      }
    } catch (error) {
      console.error(`❌ 처리 실패 (${keyword.keyword}):`, error.message);
      errors++;
    }
  }

  console.log('\n=== 마이그레이션 완료 ===');
  console.log(`삽입: ${inserted}`);
  console.log(`업데이트: ${updated}`);
  console.log(`오류: ${errors}`);
  console.log(`총 처리: ${LEGAL_KEYWORDS.length}`);

  // 최종 상태 확인
  const { data: finalData, error: finalError } = await supabase
    .from('internal_link_keywords')
    .select('keyword, url, priority, category, is_active')
    .order('priority', { ascending: false });

  if (finalError) {
    console.error('최종 상태 조회 실패:', finalError);
  } else {
    console.log(`\nDB에 총 ${finalData.length}개 키워드가 있습니다.`);
  }
}

migrateKeywords()
  .then(() => {
    console.log('\n마이그레이션 스크립트 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('치명적 오류:', error);
    process.exit(1);
  });
