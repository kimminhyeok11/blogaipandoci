import Link from "next/link";
import { Metadata } from "next";
import { Shield } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 法 BLOG",
  description: "法 BLOG의 개인정보처리방침입니다.",
};

export default function PrivacyPage() {
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
            <Shield className="text-rust" size={28} />
            <h1 className="text-2xl font-black text-ink">개인정보처리방침</h1>
          </div>

          <div className="prose-journal space-y-8 text-ink">
            <section>
              <h2 className="text-lg font-bold mb-4">1. 수집하는 개인정보</h2>
              <p className="leading-loose mb-4">
                法 BLOG는 다음과 같은 개인정보를 수집합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>이메일 주소 (회원가입 시)</li>
                <li>닉네임/사용자명</li>
                <li>작성한 게시글 및 댓글 내용</li>
                <li>IP 주소 및 접속 로그</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">2. 개인정보 이용 목적</h2>
              <p className="leading-loose mb-4">
                수집한 개인정보는 다음 목적으로 이용됩니다:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>회원 식별 및 서비스 제공</li>
                <li>게시글 작성 및 관리</li>
                <li>서비스 개선 및 통계 분석</li>
                <li>불법적 사용 방지 및 보안 유지</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">3. 개인정보 보관 기간</h2>
              <p className="leading-loose">
                회원 탈퇴 시 관련 개인정보는 즉시 삭제됩니다. 
                단, 법령에 따라 보관이 필요한 정보는 해당 기간 동안 보관됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">4. 이용자의 권리</h2>
              <p className="leading-loose mb-4">
                이용자는 언제든지 자신의 개인정보를 조회, 수정, 삭제할 수 있습니다.
                또한 개인정보 처리에 대한 동의를 철회할 수 있습니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold mb-4">5. 문의처</h2>
              <p className="leading-loose">
                개인정보 관련 문의는 아래 이메일로 연락 주세요.
              </p>
              <a
                href="mailto:privacy@blogaipandoci.vercel.app"
                className="text-rust hover:underline"
              >
                privacy@blogaipandoci.vercel.app
              </a>
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
