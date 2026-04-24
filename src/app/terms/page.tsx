import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, FileText } from "lucide-react";

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

      {/* Navigation */}
      <nav className="border-b border-rule bg-paper">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <Link
              href="/"
              className="flex items-center gap-1 font-sans text-xs font-medium text-muted hover:text-rust transition-colors"
            >
              <ArrowLeft size={14} />
              홈으로
            </Link>
          </div>
        </div>
      </nav>

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
              <h2 className="text-lg font-bold mb-4">6. 면책사항</h2>
              <p className="leading-loose">
                法 BLOG는 이용자가 작성한 콘텐츠의 정확성, 신뢰성에 대해 보증하지 않습니다.
                이용자는 자신의 판단으로 콘텐츠를 이용해야 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">7. 준거법 및 관할</h2>
              <p className="leading-loose">
                본 약관은 대한민국 법률에 따라 해석되며,
                분쟁 발생 시 서울중앙지방법원을 제1심 관할법원으로 합니다.
              </p>
            </section>

            <p className="text-sm text-muted pt-8 border-t border-rule">
              최종 수정일: {new Date().toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4 mt-16">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
