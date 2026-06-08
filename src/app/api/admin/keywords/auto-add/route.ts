import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const makeAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// /cases 페이지의 CASE_TYPE_META 기반 키워드 자동 추가
const CASE_TYPE_META: Record<string, { emoji: string; desc: string }> = {
  "형사":       { emoji: "⚖️", desc: "고소장 접수, 경찰 조사, 검찰 송치 등 형사 절차 경험" },
  "민사":       { emoji: "⚖️", desc: "소송, 지급명령, 압류 등 민사 절차 경험" },
  "이혼-가족":   { emoji: "👨‍👩‍👧", desc: "협의이혼, 양육권, 재산분할 등 가족 관련 절차 경험" },
  "노동":       { emoji: "💼", desc: "부당해고, 임금체불, 산재보상 등 노동 분쟁 절차 경험" },
  "부동산":     { emoji: "🏠", desc: "임대차, 매매, 경매 등 부동산 절차 경험" },
  "학교폭력":   { emoji: "🎓", desc: "학교폭력 실태조사, 가해 학생 처분 등 절차 경험" },
  "지식재산권": { emoji: "💡", desc: "저작권, 특허, 상표권 등 지식재산권 절차 경험" },
  "교통사고":   { emoji: "🚗", desc: "음주운전, 12대 중과실, 보험사 대응 등 교통사고 절차 경험" },
  "회생-파산":  { emoji: "💳", desc: "개인회생, 파산 신청, 채무 조정 등 절차 경험" },
  "채무-금전":   { emoji: "💰", desc: "지급명령, 통장압류, 재산조회 등 채무 관련 절차 경험" },
  "전세-임대차": { emoji: "🏡", desc: "임차권등기, 전세금 반환, 명도소송 등 임대차 절차 경험" },
  "계약-거래":   { emoji: "📝", desc: "계약해제, 손해배상, 내용증명 등 계약 분쟁 절차 경험" },
  "행정-기타":   { emoji: "🏛️", desc: "행정심판, 이의신청 등 행정 절차 및 기타 경험" },
  "기타":       { emoji: "📌", desc: "기타 법률 문제 및 절차 경험" },
};

// POST /api/admin/keywords/auto-add - CASE_TYPE_META 기반 키워드 자동 추가
export async function POST(_request: NextRequest) {
  try {
    const admin = makeAdmin();

    let addedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [caseType, meta] of Object.entries(CASE_TYPE_META)) {
      // desc에서 키워드 추출 (쉼표로 구분)
      const keywords = meta.desc
        .split(/[,，]/)
        .map(k => k.trim())
        .filter(k => k.length >= 2);

      // 카테고리 이름도 키워드로 추가
      keywords.push(caseType);

      for (const keyword of keywords) {
        // 앵커 방식 URL 생성
        const anchor = keyword === caseType ? "" : `#${encodeURIComponent(keyword)}`;
        const url = `/cases/${caseType}${anchor}`;

        // 중복 체크
        const { data: existing } = await admin
          .from("internal_link_keywords")
          .select("id")
          .eq("keyword", keyword)
          .single();

        if (existing) {
          skippedCount++;
          continue;
        }

        // 키워드 추가
        const { error } = await admin
          .from("internal_link_keywords")
          .insert({
            keyword,
            url,
            priority: 50,
            category: caseType,
            is_active: true,
          });

        if (error) {
          console.error(`[Auto Add] 키워드 추가 실패 (${keyword}):`, error);
          errorCount++;
        } else {
          addedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      addedCount,
      skippedCount,
      errorCount,
      message: `${addedCount}개 키워드 추가 완료, ${skippedCount}개 중복 건너뜀, ${errorCount}개 오류`,
    });
  } catch (error) {
    console.error("[Auto Add] Error:", error);
    return NextResponse.json(
      { error: "서버 오류" },
      { status: 500 }
    );
  }
}
