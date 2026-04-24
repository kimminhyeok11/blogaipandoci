import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Header */}
      <header className="masthead">
        <div className="masthead-pub">깊이 있는 분석과 인사이트</div>
        <Link href="/" className="masthead-title">
          法 BLOG
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="text-center">
          <div className="w-24 h-24 bg-rust/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={40} className="text-rust" />
          </div>
          
          <h1 className="text-4xl font-black text-ink mb-4">
            404
          </h1>
          <p className="text-xl text-ink mb-2">
            페이지를 찾을 수 없습니다
          </p>
          <p className="text-muted font-sans text-sm mb-8">
            요청하신 페이지가 삭제되었거나 주소가 변경되었을 수 있습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              홈으로 돌아가기
            </Link>
            <Link
              href="/posts"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-rule text-ink font-sans text-sm font-medium rounded-sm hover:border-rust hover:text-rust transition-colors"
            >
              모든 글 보기
            </Link>
          </div>
        </div>
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
