import Link from "next/link";
import { Metadata } from "next";
import { Mail, BookOpen, Users, Target, BarChart3, FileText } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "소개 | 法 BLOG - 생활형 법률·정책 미디어",
  description: "생활형 법률·정책 이슈를 분석하는 독립 미디어. 실제 판례·뉴스·공공자료를 기반으로 현실적인 법률 정보를 쉽게 전달합니다. 법률 자문이 아닌 일반 정보 제공 목적입니다.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
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
        <h1 className="text-3xl font-black text-ink mb-4 text-center">
          法 BLOG
        </h1>
        <p className="text-center text-muted font-sans text-sm mb-12">
          법률·정책 사회 분석 미디어
        </p>

        <div className="prose-journal max-w-2xl mx-auto space-y-12">
          {/* EEAT: 전문성 및 운영 목적 */}
          <section className="bg-rust/5 p-8 rounded-sm border border-rust/20">
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="text-rust" size={28} />
              <h2 className="text-xl font-bold text-ink">운영 목적 및 전문성</h2>
            </div>
            <p className="text-ink leading-loose mb-4 text-lg">
              <strong>生활형 법률·정책 이슈를 분석하는 독립 미디어입니다.</strong>
            </p>
            <p className="text-ink leading-loose mb-4">
              실제 판례·뉴스·공공자료를 기반으로 현실적인 법률 정보를 쉽게 전달합니다.
              법률 전문가가 아닌 시민의 관점에서, 데이터와 객관적 사실에 근거한 분석을 지향합니다.
            </p>
            <div className="bg-paper p-4 rounded-sm border border-rule mt-4">
              <p className="text-sm text-muted font-sans">
                <strong>참고 자료:</strong> 대법원 판례DB, 국가법령정보센터, 공공데이터포털, 
                언론 보도 및 학술 논문 등을 인용하여 작성됩니다.
              </p>
            </div>
          </section>

          {/* 포지션 선언 */}
          <section className="bg-rust/5 p-8 rounded-sm border border-rust/20">
            <div className="flex items-center gap-3 mb-6">
              <Target className="text-rust" size={28} />
              <h2 className="text-xl font-bold text-ink">우리의 포지션</h2>
            </div>
            <p className="text-ink leading-loose mb-4 text-lg">
              <strong>法 BLOG는 시민의 눈으로 법률과 정책을 바라보는 독립적인 사회 분석 공간입니다.</strong>
            </p>
            <p className="text-ink leading-loose mb-4">
              공공데이터, 판례 통계, 정책 변화를 기반으로 누구나 이해할 수 있는 
              깊이 있는 인사이트를 제공합니다. 
            </p>
            <p className="text-ink leading-loose">
              변호사가 아니지만, 꼼꼼한 조사와 데이터 분석으로 시민의 권리와 
              사회 정의에 기여하는 콘텐츠를 만들어갑니다.
            </p>
          </section>

          {/* 차별화 포인트 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">차별화된 접근</h2>
            </div>
            <div className="grid gap-4">
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">데이터 기반 분석</h3>
                <p className="text-ink/80 leading-relaxed">
                  판례 통계, 공공데이터, 사회 지표를 활용한 객관적 분석으로 
                  사건의 이면과 추세를 파악합니다.
                </p>
              </div>
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">심층 취재</h3>
                <p className="text-ink/80 leading-relaxed">
                  단순 뉴스 요약이 아닌, 사건의 배경과 맥락, 정책적 의미까지 
                  심층적으로 추적합니다.
                </p>
              </div>
              <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                <h3 className="font-bold text-ink mb-2">시민 중심 시각</h3>
                <p className="text-ink/80 leading-relaxed">
                  전문 용어를 배제하고 누구나 이해할 수 있는 설명으로 
                  시민의 권리 의식을 높입니다.
                </p>
              </div>
            </div>
          </section>

          {/* 콘텐츠 방향 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <FileText className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">다루는 주제</h2>
            </div>
            <ul className="space-y-3 text-ink">
              <li className="flex items-start gap-2">
                <span className="text-rust font-bold">01.</span>
                <span>중요 판례 분석과 사회적 파급력</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust font-bold">02.</span>
                <span>법제도 개정과 시민 생활 변화</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust font-bold">03.</span>
                <span>기술 발전과 법률의 충돌점</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust font-bold">04.</span>
                <span>공공데이터로 보는 사회 트렌드</span>
              </li>
            </ul>
          </section>

          {/* 대상 독자 */}
          <section className="bg-cream/30 p-8 rounded-sm border border-rule">
            <div className="flex items-center gap-3 mb-6">
              <Users className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">함께하는 사람들</h2>
            </div>
            <ul className="space-y-3 text-ink">
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>법률·정책에 관심 있는 시민</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>데이터 기반 분석을 선호하는 독자</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>시사 이슈의 깊이 있는 해석을 찾는 분</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>권리 의식을 높이고 싶은 모든 분</span>
              </li>
            </ul>
          </section>

          {/* 연락처 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Mail className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">연락처</h2>
            </div>
            <p className="text-ink leading-loose mb-4">
              글에 대한 피드백, 제보, 제휴 문의, 또는 기타 문의사항이 있으시면
              아래 이메일로 연락 주세요.
            </p>
            <a
              href="mailto:salad20c@gmail.com"
              className="inline-flex items-center gap-2 text-rust hover:text-rust-light transition-colors"
            >
              <Mail size={16} />
              salad20c@gmail.com
            </a>
          </section>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-rule">
            <p className="text-muted mb-4">더 많은 글을 읽어보세요</p>
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
