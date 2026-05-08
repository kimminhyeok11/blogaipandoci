import Link from "next/link";
import { Metadata } from "next";
import { Mail, MessageSquare, Clock, Send } from "lucide-react";
import { StickyNav } from "@/components/layout/StickyNav";

export const metadata: Metadata = {
  title: "문의하기 | 法 BLOG",
  description: "法 BLOG에 대한 문의, 제보, 제휴 제안을 받고 있습니다. 24시간 내로 답변 드립니다.",
};

export default function ContactPage() {
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
      <StickyNav backHref="/" backLabel="홈으로" />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-black text-ink mb-4">문의하기</h1>
            <p className="text-muted font-sans">
              法 BLOG와 함께하거나, 제보와 의견을 보내주세요
            </p>
          </div>

          <div className="grid gap-8">
            {/* 이메일 문의 */}
            <section className="bg-cream/30 p-8 rounded-sm border border-rule">
              <div className="flex items-center gap-3 mb-6">
                <Mail className="text-rust" size={28} />
                <h2 className="text-xl font-bold text-ink">이메일 문의</h2>
              </div>
              <p className="text-ink leading-loose mb-6">
                가장 빠르고 정확한 답변을 받을 수 있는 방법입니다. 
                글 관련 피드백, 오류 제보, 제휴 제안 등 어떤 내용이든 환영합니다.
              </p>
              <a
                href="mailto:salad20c@gmail.com"
                className="inline-flex items-center gap-2 px-6 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
              >
                <Send size={16} />
                salad20c@gmail.com
              </a>
            </section>

            {/* 답변 시간 */}
            <section className="bg-rust/5 p-8 rounded-sm border border-rust/20">
              <div className="flex items-center gap-3 mb-6">
                <Clock className="text-rust" size={28} />
                <h2 className="text-xl font-bold text-ink">답변 시간</h2>
              </div>
              <ul className="space-y-3 text-ink">
                <li className="flex items-start gap-2">
                  <span className="text-rust font-bold">•</span>
                  <span><strong>일반 문의:</strong> 24시간 내 답변</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rust font-bold">•</span>
                  <span><strong>제보/팁:</strong> 48시간 내 검토 후 답변</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rust font-bold">•</span>
                  <span><strong>제휴/광고:</strong> 3영업일 내 답변</span>
                </li>
              </ul>
            </section>

            {/* 자주 문의하는 내용 */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-rust" size={24} />
                <h2 className="text-xl font-bold text-ink">자주 문의하는 내용</h2>
              </div>
              <div className="grid gap-4">
                <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                  <h3 className="font-bold text-ink mb-2">기사 제보</h3>
                  <p className="text-ink/80 leading-relaxed text-sm">
                    다뤄주었으면 하는 사건이나 주제가 있다면 알려주세요. 
                    판례, 정책 변화, 사회적 이슈 등 모두 환영합니다.
                  </p>
                </div>
                <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                  <h3 className="font-bold text-ink mb-2">오류 정정</h3>
                  <p className="text-ink/80 leading-relaxed text-sm">
                    사실 오류나 법률 해석 오류를 발견하셨다면 바로 알려주세요. 
                    확인 후 즉시 수정하겠습니다.
                  </p>
                </div>
                <div className="bg-cream/30 p-6 rounded-sm border border-rule">
                  <h3 className="font-bold text-ink mb-2">제휴 및 협업</h3>
                  <p className="text-ink/80 leading-relaxed text-sm">
                    데이터 제공, 전문가 인터뷰, 공동 기획 등 
                    다양한 형태의 협업을 제안해주세요.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
