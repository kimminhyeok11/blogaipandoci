import Link from "next/link";
import { Metadata } from "next";
import { Shield } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 法 BLOG",
  description: "法 BLOG의 개인정보처리방침입니다. 수집하는 개인정보 항목, 이용 목적, 보유 기간, 제3자 제공 여부 등 법률 블로그 운영에 관한 개인정보 보호 정책을 안내합니다.",
  openGraph: {
    title: "개인정보처리방침 | 法 BLOG",
    description: "法 BLOG의 개인정보처리방침입니다. 수집하는 개인정보 항목, 이용 목적, 보유 기간, 제3자 제공 여부 등을 안내합니다.",
    type: "website",
    locale: "ko_KR",
    url: "/privacy",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.jpg", width: 1200, height: 630, alt: "法 BLOG 개인정보처리방침" }],
  },
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">法 BLOG</Link>
      </header>
      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">개인정보처리방침</h1>
          </div>

          <div className="prose-journal space-y-8 text-ink">

            <section>
              <h2 className="text-lg font-bold mb-4">1. 수집하는 개인정보 항목</h2>
              <p className="leading-loose mb-3">法 BLOG는 서비스 제공을 위해 아래 최소한의 정보를 수집합니다.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-rule">
                  <thead className="bg-cream/50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b border-rule">항목</th>
                      <th className="text-left px-3 py-2 border-b border-rule">수집 방법</th>
                      <th className="text-left px-3 py-2 border-b border-rule">필수 여부</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/50">
                    <tr><td className="px-3 py-2">이메일 주소</td><td className="px-3 py-2">회원가입 / 카카오 로그인</td><td className="px-3 py-2">필수</td></tr>
                    <tr><td className="px-3 py-2">닉네임</td><td className="px-3 py-2">회원가입 시 직접 입력</td><td className="px-3 py-2">필수</td></tr>
                    <tr><td className="px-3 py-2">소셜 로그인 식별자</td><td className="px-3 py-2">카카오 OAuth 인증</td><td className="px-3 py-2">카카오 로그인 시</td></tr>
                    <tr><td className="px-3 py-2">질문·댓글 내용</td><td className="px-3 py-2">서비스 이용 중 직접 입력</td><td className="px-3 py-2">선택</td></tr>
                    <tr><td className="px-3 py-2">접속 IP·로그</td><td className="px-3 py-2">자동 수집</td><td className="px-3 py-2">자동</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">2. 개인정보 이용 목적</h2>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose">
                <li>회원 식별 및 서비스 제공</li>
                <li>법률 질문·답글 기능 운영</li>
                <li>서비스 개선 및 통계 분석</li>
                <li>불법 사용 방지 및 보안 유지</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">3. 비밀 질문 기능과 개인정보 보호</h2>
              <div className="bg-cream/40 border border-rust/20 rounded-sm p-4 space-y-3">
                <p className="leading-loose">
                  法 BLOG는 <strong>비밀 질문(🔒)</strong> 기능을 제공합니다. 이 기능은 다음과 같이 작동합니다.
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm leading-loose">
                  <li>질문 작성자 본인과 운영자(관리자)만 질문 내용을 열람할 수 있습니다.</li>
                  <li>다른 방문자에게는 <strong>「🔒 비밀 질문입니다.」</strong>로만 표시됩니다.</li>
                  <li>서버 API 레벨에서 마스킹이 적용되어, 개발자 도구나 네트워크 탭으로도 내용을 확인할 수 없습니다.</li>
                  <li>질문 내 주민번호·전화번호·계좌번호 등 민감 정보는 서버에서 자동으로 탐지·마스킹됩니다.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">4. 개인정보 보관 및 탈퇴 처리</h2>
              <p className="leading-loose mb-3">
                회원 탈퇴 시 아래 기준에 따라 처리됩니다.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-rule">
                  <thead className="bg-cream/50">
                    <tr>
                      <th className="text-left px-3 py-2 border-b border-rule">데이터</th>
                      <th className="text-left px-3 py-2 border-b border-rule">처리 방식</th>
                      <th className="text-left px-3 py-2 border-b border-rule">이유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule/50">
                    <tr><td className="px-3 py-2">계정 정보 (이메일, 닉네임)</td><td className="px-3 py-2 text-red-600 font-medium">즉시 삭제</td><td className="px-3 py-2">개인 식별정보 제거</td></tr>
                    <tr><td className="px-3 py-2">소셜 로그인 연동</td><td className="px-3 py-2 text-red-600 font-medium">즉시 해제</td><td className="px-3 py-2">카카오 포함 모든 재로그인 차단</td></tr>
                    <tr><td className="px-3 py-2">작성한 질문·댓글 내용</td><td className="px-3 py-2 text-amber-600 font-medium">익명화 유지</td><td className="px-3 py-2">서비스 품질 및 SEO 보존 (작성자명 → 「탈퇴한 사용자」)</td></tr>
                    <tr><td className="px-3 py-2">좋아요·신고 기록</td><td className="px-3 py-2 text-red-600 font-medium">즉시 삭제</td><td className="px-3 py-2">개인 행동 데이터 보관 근거 없음</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted mt-3 leading-loose">
                ※ 탈퇴 후 작성된 질문 내용은 비식별 상태로 유지됩니다. 
                본인이 탈퇴 전 질문 삭제를 원하실 경우 탈퇴 전 직접 삭제하거나 운영자에게 요청하세요.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">5. 제3자 서비스 이용</h2>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose text-sm">
                <li><strong>Supabase</strong> — 인증 및 데이터베이스 (미국 소재, GDPR 준수)</li>
                <li><strong>카카오 로그인</strong> — 소셜 인증 (카카오 개인정보처리방침 적용)</li>
                <li><strong>Google Analytics</strong> — 접속 통계 분석 (익명화 처리)</li>
                <li><strong>Vercel</strong> — 서비스 호스팅 (미국 소재)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">6. 이용자의 권리</h2>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose">
                <li>개인정보 조회·수정: 마이페이지에서 직접 변경</li>
                <li>계정 삭제(탈퇴): 마이페이지 → 「회원 탈퇴」</li>
                <li>질문 삭제: 본인 작성 질문의 삭제 버튼</li>
                <li>추가 요청: 아래 이메일로 문의</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">7. 문의처</h2>
              <p className="leading-loose mb-2">개인정보 관련 문의·삭제 요청:</p>
              <a href="mailto:salad20c@gmail.com" className="text-rust hover:underline font-medium">
                salad20c@gmail.com
              </a>
            </section>

            <section className="pt-8 border-t border-rule">
              <h2 className="text-lg font-bold mb-4">8. 면책 조항</h2>
              <p className="leading-loose mb-3">
                본 사이트는 개인이 운영하는 콘텐츠 블로그입니다. 제공되는 정보는 일반적인 정보 제공 목적으로만 사용되며 법률 자문을 대체하지 않습니다.
              </p>
              <p className="leading-loose">
                본 개인정보처리방침은 관련 법령 개정이나 서비스 변경에 따라 수정될 수 있으며, 변경 시 사이트 공지를 통해 고지합니다.
              </p>
            </section>

            <p className="text-sm text-muted pt-8 border-t border-rule" suppressHydrationWarning>
              최종 수정일: 2025년 5월 14일
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
