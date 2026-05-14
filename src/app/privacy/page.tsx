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
                href="mailto:salad20c@gmail.com"
                className="text-rust hover:underline"
              >
                salad20c@gmail.com
              </a>
            </section>

            <section className="pt-8 border-t border-rule">
              <h2 className="text-lg font-bold mb-4">6. 면책 조항</h2>
              <p className="leading-loose mb-4">
                본 사이트는 개인이 운영하는 콘텐츠 블로그입니다. 본 사이트에서 제공하는 정보는 
                일반적인 정보 제공 목적으로만 사용되며, 법률적 자문이나 전문적인 조언을 
                대체할 수 없습니다.
              </p>
              <p className="leading-loose mb-4">
                운영자는 개인정보 보호와 관련하여 최선의 노력을 다하고 있으나, 
                기술적 한계나 예측 불가능한 상황으로 인한 개인정보 침해에 대해 
                책임을 지지 않습니다. 이용자는 자신의 개인정보 보호를 위해 
                비밀번호 등 중요 정보를 안전하게 관리할 책임이 있습니다.
              </p>
              <p className="leading-loose">
                본 개인정보처리방침은 관련 법령의 개정이나 서비스 변경에 따라 
                수정될 수 있으며, 변경 시 사이트 내 공지사항을 통해 고지합니다.
              </p>
            </section>

            <p className="text-sm text-muted pt-8 border-t border-rule" suppressHydrationWarning>
              최종 수정일: {new Date().toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
