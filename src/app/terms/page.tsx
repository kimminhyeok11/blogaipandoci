import Link from "next/link";
import { Metadata } from "next";
import { FileText } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "이용약관 | 法 BLOG",
  description: "法 BLOG의 이용약관입니다.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      {/* Navigation - 스마트 스티키 헤더 */}
      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <FileText className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">이용약관</h1>
          </div>

          <div className="prose-journal space-y-8 text-ink">
            <section>
              <h2 className="text-lg font-bold mb-4">1. 서비스 이용</h2>
              <p className="leading-loose">
                法 BLOG는 법률, 기술, 사회 이슈에 대한 블로그 서비스를 제공합니다.
                이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">2. 회원가입 및 계정</h2>
              <p className="leading-loose mb-4">
                서비스 이용을 위해 회원가입이 필요합니다. 
                이용자는 정확하고 최신의 정보를 제공해야 합니다.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>타인의 계정을 무단 사용할 수 없습니다</li>
                <li>계정 보안은 이용자의 책임입니다</li>
                <li>계정 정보 변경 시 즉시 업데이트해야 합니다</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">3. 콘텐츠 정책</h2>
              <p className="leading-loose mb-4">
                이용자가 작성하는 모든 콘텐츠는 다음을 준수해야 합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>법률 및 공서양속에 위반되지 않아야 함</li>
                <li>타인의 저작권을 침해하지 않아야 함</li>
                <li>타인의 명예를 훼손하지 않아야 함</li>
                <li>허위 정보를 포함하지 않아야 함</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">4. 저작권</h2>
              <p className="leading-loose">
                이용자가 작성한 콘텐츠의 저작권은 해당 이용자에게 있습니다.
                단, 法 BLOG는 서비스 운영을 위해 콘텐츠를 사용할 수 있습니다.
                타인의 저작물을 인용할 경우 출처를 명시해야 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">5. 서비스 중단 및 변경</h2>
              <p className="leading-loose">
                法 BLOG는 사전 공지 후 서비스를 변경하거나 중단할 수 있습니다.
                긴급한 경우 사후 공지할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">6. 면책사항 및 책임의 한계</h2>
              <p className="leading-loose mb-4">
                본 사이트는 개인이 운영하는 콘텐츠 블로그로, 제공되는 모든 정보는 
                일반적인 정보 제공 목적으로만 사용됩니다. 본 사이트의 정보는 
                법률적 자문이나 전문적인 조언을 대체할 수 없으며, 
                이용자는 자신의 판단과 책임 하에 콘텐츠를 이용해야 합니다.
              </p>
              <p className="leading-loose mb-4">
                운영자는 다음에 대해 책임을 지지 않습니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>이용자가 작성한 콘텐츠의 정확성, 완전성, 신뢰성</li>
                <li>본 사이트 정보를 바탕으로 한 이용자의 결정 및 그 결과</li>
                <li>서비스 중단, 장애, 데이터 손실 등으로 인한 손해</li>
                <li>제3자와의 분쟁이나 거래로 인한 손해</li>
              </ul>
              <p className="leading-loose">
                법률 문제나 전문적인 상담이 필요한 경우, 반드시 해당 분야의 
                전문가에게 문의하시기 바랍니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">7. 준거법 및 관할</h2>
              <p className="leading-loose">
                본 약관은 대한민국 법률에 따라 해석되며, 
                분쟁 발생 시 서울중앙지방법원을 제1심 관할법원으로 합니다. 
                다만, 해외 거주 이용자의 경우, 해당 국가의 적용 가능한 법률에 따를 수 있습니다.
              </p>
            </section>

            <p className="text-sm text-muted pt-8 border-t border-rule">
              최종 수정일: {new Date().toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
