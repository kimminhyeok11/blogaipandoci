import Link from "next/link";
import { PenSquare, User, Search } from "lucide-react";
import { AdSense } from "@/components/ads/AdSense";

// 임시 데이터 - 실제로는 Supabase에서 가져옴
const featuredPosts = [
  {
    id: "1",
    title: "직원이 혼자 만든 프로그램, 회사 것이 될 수 있을까?",
    excerpt: "수치지도 회사 편집팀장이 업무 부담을 줄이려 독학으로 만든 프로그램. 회사는 퇴사 후에도 11년간 무단으로 써왔다. 대법원은 누구 손을 들었나.",
    slug: "court-case-program-copyright",
    coverImage: null,
    category: "법률 심층 리포트",
    publishedAt: "2021. 9. 9.",
    featured: true,
  },
];

const recentPosts = [
  {
    id: "2",
    title: "스타트업의 지식재산권 관리 완벽 가이드",
    excerpt: "투자를 받기 위해 반드시 확인해야 할 IP 리스크와 계약 체크포인트",
    slug: "startup-ip-guide",
    category: "비즈니스",
    publishedAt: "2024.01.15",
  },
  {
    id: "3",
    title: "AI 생성 콘텐츠의 저작권归属 논쟁",
    excerpt: "생성형 AI가 만든 이미지와 텍스트, 누구의 것인가",
    slug: "ai-copyright-debate",
    category: "기술과 법",
    publishedAt: "2024.01.10",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-paper">
      {/* Masthead Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
        <div className="masthead-date">
          {new Date().toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-rule bg-paper">
        <div className="max-w-content mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-sans text-xs font-medium text-ink hover:text-rust transition-colors">
                홈
              </Link>
              <Link href="/posts" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                모든 글
              </Link>
              <Link href="/tags" className="font-sans text-xs font-medium text-muted hover:text-rust transition-colors">
                태그
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="p-2 text-muted hover:text-rust transition-colors"
                aria-label="검색"
              >
                <Search size={18} />
              </Link>
              <Link
                href="/write"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rust text-paper text-xs font-sans font-medium rounded-sm hover:bg-rust-light transition-colors"
              >
                <PenSquare size={14} />
                <span className="hidden sm:inline">글쓰기</span>
              </Link>
              <Link
                href="/login"
                className="p-2 text-muted hover:text-rust transition-colors"
                aria-label="로그인"
              >
                <User size={18} />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero / Featured Post */}
        {featuredPosts.map((post) => (
          <section key={post.id} className="hero">
            <div className="section-label">{post.category}</div>
            <h1 className="headline">
              {post.title.split(",")[0]},
              <br />
              <em>{post.title.split(",")[1]?.trim() || "중요한 결론"}</em>
            </h1>
            <p className="subheadline">{post.excerpt}</p>
            <div className="byline">
              <span>심층 분석</span>
              <span className="byline-sep">|</span>
              <span>{post.publishedAt}</span>
              <span className="byline-sep">|</span>
              <span>완전 해설판</span>
            </div>
            <Link
              href={`/posts/${post.slug}`}
              className="inline-block mt-6 px-6 py-2 border-2 border-ink text-ink font-sans text-xs font-medium tracking-wider uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              글 읽기
            </Link>
          </section>
        ))}

        {/* Recent Posts */}
        <section className="max-w-content mx-auto px-4 sm:px-6 py-16">
          <div className="flex items-center gap-4 mb-8">
            <h2 className="font-sans text-xs font-medium tracking-widest uppercase text-muted">
              최신 글
            </h2>
            <div className="flex-1 h-px bg-rule"></div>
          </div>

          <div className="grid gap-8">
            {recentPosts.map((post) => (
              <article
                key={post.id}
                className="group border-b border-rule pb-8 last:border-0"
              >
                <Link href={`/posts/${post.slug}`} className="block">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-2xs tracking-wider uppercase text-rust">
                      {post.category}
                    </span>
                    <span className="text-rule">·</span>
                    <span className="font-sans text-2xs text-muted">
                      {post.publishedAt}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-2 group-hover:text-rust transition-colors">
                    {post.title}
                  </h3>
                  <p className="font-sans text-sm text-muted leading-relaxed">
                    {post.excerpt}
                  </p>
                </Link>
              </article>
            ))}
          </div>

          {/* 광고 */}
          <div className="my-12">
            <AdSense
              slot="7498833217"
              style={{ minHeight: "250px" }}
              format="auto"
            />
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 px-6 py-3 border border-ink text-ink font-sans text-xs font-medium tracking-wider uppercase hover:bg-ink hover:text-paper transition-colors"
            >
              모든 글 보기
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-double border-ink text-center py-6 px-4">
        <div className="font-sans text-xs text-muted tracking-wider">
          <p className="mb-2">法 BLOG · 깊이 있는 분석과 인사이트</p>
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
