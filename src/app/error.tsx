"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

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
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          
          <h1 className="text-2xl font-black text-ink mb-4">
            문제가 발생했습니다
          </h1>
          <p className="text-muted font-sans text-sm mb-8 max-w-md">
            예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            문제가 지속되면 관리자에게 문의해 주세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-rust text-paper font-sans text-sm font-medium rounded-sm hover:bg-rust-light transition-colors"
            >
              <RefreshCw size={16} />
              다시 시도
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-rule text-ink font-sans text-sm font-medium rounded-sm hover:border-rust hover:text-rust transition-colors"
            >
              홈으로 돌아가기
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
