import Link from "next/link";
import { Metadata } from "next";
import { User, Calendar, FileText, Mail } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";
import { PersonSchema } from "@/components/seo/StructuredData";

export const metadata: Metadata = {
  title: "작성자 정보 | 法 BLOG",
  description: "法 BLOG 콘텐츠 작성 및 편집 정책, 정보 출의 및 검증 프로세스를 안내합니다. 실제 판례와 공공자료를 기반으로 신뢰할 수 있는 법률 콘텐츠를 제공합니다.",
  openGraph: {
    title: "작성자 정보 | 法 BLOG",
    description: "法 BLOG 콘텐츠 작성 및 편집 정책, 정보 출의 및 검증 프로세스를 안내합니다. 실제 판례와 공공자료를 기반으로 신뢰할 수 있는 법률 콘텐츠를 제공합니다.",
    type: "website",
    locale: "ko_KR",
    url: "/author",
    siteName: "法 BLOG",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "法 BLOG 작성자 정보" }],
  },
  alternates: {
    canonical: "/author",
  },
};

export default function AuthorPage() {
  return (
    <div className="min-h-screen bg-paper">
      <PersonSchema
        name="salad20c"
        description="법률·정책·사회 분야 심층 분석 콘텐츠를 작성합니다. 실제 사례와 판례를 기반으로 독자가 실생활에서 활용할 수 있는 정보를 제공합니다."
        url="https://lawtiphub.com/author"
      />
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-black text-ink mb-4 text-center">
          작성자 정보
        </h1>
        <p className="text-center text-muted font-sans text-sm mb-12">
          콘텐츠 정책 및 정보 출처 안내
        </p>

        <div className="prose-journal max-w-2xl mx-auto space-y-12">
          {/* EEAT: 작성자 정보 */}
          <section className="bg-rust/5 p-8 rounded-sm border border-rust/20">
            <div className="flex items-center gap-3 mb-6">
              <User className="text-rust" size={28} />
              <h2 className="text-xl font-bold text-ink">운영 및 작성</h2>
            </div>
            <p className="text-ink leading-loose mb-4">
              <strong>salad20c</strong>이 직접 콘텐츠를 기획·작성·검수합니다.
            </p>
            <p className="text-ink leading-loose mb-4">
              모든 글은 공개된 법령, 판례, 공공자료를 기반으로 작성되며,
              객관적 사실 확인을 위해 다중 출처 교차 검증을 거칩니다.
            </p>
            <div className="bg-paper p-4 rounded-sm border border-rule">
              <p className="text-sm text-muted font-sans">
                <strong>작성 원칙:</strong> 사실 확인 → 출처 인용 → 객관적 서술 → 검수
              </p>
            </div>
          </section>

          {/* 정보 출처 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">정보 출처</h2>
            </div>
            <div className="grid gap-4">
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">법률 자료</h3>
                <ul className="text-ink/80 text-sm space-y-1">
                  <li>• 국가법령정보센터 (www.law.go.kr)</li>
                  <li>• 대법원 판례공보 및 판례DB</li>
                  <li>• 각급 법원 판결문 공개 시스템</li>
                </ul>
              </div>
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">공공 데이터</h3>
                <ul className="text-ink/80 text-sm space-y-1">
                  <li>• 공공데이터포털 (www.data.go.kr)</li>
                  <li>• 통계청 및 정부부처 공식 발표</li>
                  <li>• 지자체 공개 정보</li>
                </ul>
              </div>
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">언론 및 학술</h3>
                <ul className="text-ink/80 text-sm space-y-1">
                  <li>• 주요 일간지 및 방송사 보도</li>
                  <li>• 법학 전문 학술지</li>
                  <li>• 연구기관 보고서</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 업데이트 정책 */}
          <section className="bg-cream/30 p-8 rounded-sm border border-rule">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">업데이트 및 정정 정책</h2>
            </div>
            <ul className="space-y-3 text-ink">
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>법령 개정 및 판례 변경 시 관련 글을 검토하여 업데이트합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>오류 신고 접수 시 사실 확인 후 신속히 정정합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>모든 게시글 하단에 최종 수정일을 표기합니다.</span>
              </li>
            </ul>
          </section>

          {/* 연락처 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Mail className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">오류 신고 및 문의</h2>
            </div>
            <p className="text-ink leading-loose mb-4">
              콘텐츠의 사실 오류, 출처 문제, 또는 기타 피드백이 있으시면 아래로 연락 주세요.
              검토 후 필요한 조치를 취하겠습니다.
            </p>
            <a
              href="mailto:salad20c@gmail.com?subject=[法 BLOG] 콘텐츠 피드백"
              className="inline-flex items-center gap-2 text-rust hover:text-rust-light transition-colors"
            >
              <Mail size={16} />
              salad20c@gmail.com
            </a>
          </section>

          {/* 법적 고지 */}
          <section className="bg-cream/30 p-6 rounded-sm border border-rule">
            <p className="text-sm text-muted font-sans leading-relaxed">
              <strong>※ 참고사항:</strong> 본 사이트의 모든 콘텐츠는 일반적인 정보 제공 목적으로 작성되었으며,
              특정 사건에 대한 법률 자문을 구성하지 않습니다. 구체적인 법률 문제는 반드시 
              해당 분야 전문 변호사와 상담하시기 바랍니다.
            </p>
          </section>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-rule">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-ink text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust transition-colors"
            >
              모든 글 보기
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
