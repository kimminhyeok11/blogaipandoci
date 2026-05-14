import Link from "next/link";
import { Metadata } from "next";
import { FileText } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "이용약관 | 法 BLOG",
  description: "法 BLOG 이용약관입니다. 서비스 이용 조건, 금지행위, 채임 제한, 저작권 정책 등 법률 블로그 이용에 관한 전반적인 이용약관을 확인하세요.",
  openGraph: {
    title: "이용약관 | 法 BLOG",
    description: "法 BLOG 이용약관입니다. 서비스 이용 조건, 금지행위, 책임 제한, 저작권 정책 등을 확인하세요.",
    type: "website",
    locale: "ko_KR",
    url: "/terms",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "法 BLOG 이용약관" }],
  },
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
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
            <FileText className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">이용약관</h1>
          </div>

          <div className="prose-journal space-y-8 text-ink">

            <section>
              <h2 className="text-lg font-bold mb-4">1. 서비스 소개</h2>
              <p className="leading-loose">
                法 BLOG는 법률·기술·사회 이슈에 대한 심층 분석 콘텐츠와 법률 질문·답글 기능을 제공하는 개인 운영 블로그 서비스입니다.
                이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">2. 회원가입 및 계정</h2>
              <p className="leading-loose mb-3">
                법률 질문 등록 및 답글 기능은 로그인이 필요합니다.
                이메일 회원가입 또는 카카오 소셜 로그인을 통해 가입할 수 있습니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose">
                <li>타인의 계정을 무단 사용할 수 없습니다.</li>
                <li>계정 보안(비밀번호 등)은 이용자 본인의 책임입니다.</li>
                <li>카카오 로그인 이용 시 카카오 이용약관이 함께 적용됩니다.</li>
                <li>닉네임은 마이페이지에서 언제든지 변경할 수 있습니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">3. 법률 질문 서비스 이용</h2>
              <div className="space-y-4">
                <p className="leading-loose">
                  法 BLOG의 법률 질문 기능은 공개 판례·실무 사례 기준의 <strong>참고 의견 제공</strong>을 목적으로 하며, 법률 자문이 아닙니다.
                </p>
                <div className="bg-cream/40 border border-rust/20 rounded-sm p-4">
                  <p className="font-medium text-sm mb-2">비밀 질문(🔒) 기능 안내</p>
                  <ul className="list-disc list-inside space-y-1 ml-2 text-sm leading-loose">
                    <li>민감한 법률 사안은 <strong>비밀 질문</strong>으로 등록할 수 있습니다.</li>
                    <li>비밀 질문은 작성자 본인과 운영자(관리자)만 열람 가능합니다.</li>
                    <li>다른 방문자에게는 질문 존재만 표시되고 내용은 완전히 비공개 처리됩니다.</li>
                    <li>서버 응답 레벨에서 마스킹이 적용되어 네트워크 탭으로도 내용 접근이 불가합니다.</li>
                    <li>주민번호·전화번호·계좌번호 등 민감 정보는 서버에서 자동 탐지·마스킹됩니다.</li>
                  </ul>
                </div>
                <p className="text-sm text-muted leading-loose">
                  ※ 등록된 질문은 검토 후 공개됩니다. 법적 위험도가 높은 내용은 비공개 처리될 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">4. 콘텐츠 정책</h2>
              <p className="leading-loose mb-3">이용자가 작성하는 질문·댓글은 다음을 준수해야 합니다:</p>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose">
                <li>법률 및 공서양속에 위반되지 않을 것</li>
                <li>타인의 저작권·명예를 침해하지 않을 것</li>
                <li>허위 정보나 광고성 내용을 포함하지 않을 것</li>
                <li>개인정보(이름·연락처·주민번호 등)를 직접 작성하지 않을 것</li>
              </ul>
              <p className="text-sm text-muted mt-3 leading-loose">
                위반 콘텐츠는 운영자가 사전 통보 없이 삭제 또는 비공개 처리할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">5. 회원 탈퇴 및 콘텐츠 처리</h2>
              <p className="leading-loose mb-3">
                이용자는 마이페이지에서 언제든지 회원 탈퇴를 신청할 수 있습니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose text-sm">
                <li>탈퇴 즉시 계정 정보(이메일·닉네임)와 소셜 로그인 연동이 삭제됩니다.</li>
                <li>탈퇴 후에는 동일 계정으로 재로그인이 불가합니다 (카카오 포함).</li>
                <li>작성한 질문·댓글 내용은 <strong>「탈퇴한 사용자」</strong>로 익명화되어 서비스에 유지됩니다.</li>
                <li>탈퇴 전 본인 작성 콘텐츠를 삭제하고 싶으신 경우, 탈퇴 전 직접 삭제하거나 운영자에게 요청하세요.</li>
              </ul>
              <p className="text-sm text-muted mt-3 leading-loose">
                ※ 비식별화된 질문 내용 유지는 개인정보보호법 및 GDPR의 「잊혀질 권리」 범위 내에서 적법하게 처리됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">6. 저작권</h2>
              <p className="leading-loose">
                이용자가 작성한 콘텐츠의 저작권은 해당 이용자에게 있습니다.
                단, 法 BLOG는 서비스 운영·개선·홍보 목적으로 콘텐츠를 활용할 수 있습니다.
                사이트 본문 콘텐츠(분석글·판례 해설 등)의 저작권은 운영자에게 있으며 무단 복제를 금합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">7. 서비스 중단 및 변경</h2>
              <p className="leading-loose">
                法 BLOG는 사전 공지 후 서비스를 변경하거나 중단할 수 있습니다.
                긴급한 경우 사후 공지할 수 있으며, 이로 인한 손해에 대해 책임을 지지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">8. 면책사항</h2>
              <p className="leading-loose mb-3">
                본 사이트는 개인이 운영하는 콘텐츠 블로그입니다. 제공되는 모든 정보는 일반적인 정보 제공 목적으로만 사용되며 법률 자문을 대체할 수 없습니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 leading-loose text-sm">
                <li>이용자가 작성한 콘텐츠의 정확성·신뢰성</li>
                <li>본 사이트 정보를 기반으로 한 이용자의 결정 및 그 결과</li>
                <li>서비스 중단·장애·데이터 손실로 인한 손해</li>
              </ul>
              <p className="leading-loose mt-3">
                법률 문제나 전문적 상담이 필요한 경우, 반드시 해당 분야 전문가에게 문의하시기 바랍니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">9. 준거법 및 관할</h2>
              <p className="leading-loose">
                본 약관은 대한민국 법률에 따라 해석되며,
                분쟁 발생 시 서울중앙지방법원을 제1심 관할법원으로 합니다.
              </p>
            </section>

            <p className="text-sm text-muted pt-8 border-t border-rule">
              최종 수정일: 2025년 5월 14일
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
