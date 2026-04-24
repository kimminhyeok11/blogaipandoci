import Link from "next/link";
import { Metadata } from "next";
import { ArrowLeft, Mail, BookOpen, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "소개 | 法 BLOG",
  description: "法 BLOG는 깊이 있는 법률 분석과 인사이트를 제공하는 블로그입니다.",
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
        <h1 className="text-3xl font-black text-ink mb-12 text-center">
          소개
        </h1>

        <div className="prose-journal max-w-2xl mx-auto space-y-12">
          {/* 소개 섹션 */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="text-rust" size={24} />
              <h2 className="text-xl font-bold text-ink">法 BLOG는</h2>
            </div>
            <p className="text-ink leading-loose mb-4">
              法 BLOG는 법률, 기술, 사회 이슈에 대한 깊이 있는 분석과 인사이트를 제공하는
              공간입니다. 복잡한 문제를 명확하고 이해하기 쉽게 풀어드립니다.
            </p>
            <p className="text-ink leading-loose">
              단순한 뉴스 전달이 아닌, 사건의 배경과 맥락, 미치는 영향까지 
              심층적으로 다루어 독자 여러분의 이해를 돕고자 합니다.
            </p>
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
                <span>법률 전문가 및 학생</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>기술과 법의 교차점에 관심 있는 분</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>시사 이슈에 대한 깊이 있는 분석을 원하는 분</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-rust">•</span>
                <span>지식 공유에 열린 모든 분</span>
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
              글에 대한 피드백, 제휴 문의, 또는 기타 문의사항이 있으시면
              아래 이메일로 연락 주세요.
            </p>
            <a
              href="mailto:contact@blogaipandoci.vercel.app"
              className="inline-flex items-center gap-2 text-rust hover:text-rust-light transition-colors"
            >
              <Mail size={16} />
              contact@blogaipandoci.vercel.app
            </a>
          </section>

          {/* CTA */}
          <div className="text-center pt-8 border-t border-rule">
            <p className="text-muted mb-4">더 많은 글을 읽어보세요</p>
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              모든 글 보기
            </Link>
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
