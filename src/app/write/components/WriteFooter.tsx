"use client";

interface WriteFooterProps {
  content: string;
}

export function WriteFooter({ content }: WriteFooterProps) {
  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const lineCount = content.split("\n").length;
  const readTime = Math.ceil(charCount / 500);

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between h-12 px-4 sm:px-6 lg:px-8 border-t border-rule bg-paper/95 backdrop-blur-sm text-xs text-muted">
      <div className="flex items-center gap-4">
        <span className="font-medium text-ink">{charCount.toLocaleString()} 글자</span>
        <span className="hidden sm:inline">{wordCount.toLocaleString()} 단어</span>
        <span className="hidden sm:inline">{lineCount} 줄</span>
        <span className="hidden md:inline text-rust">약 {readTime}분 소요</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden sm:inline opacity-60">Tab: 들여쓰기</span>
        <span className="hidden md:inline opacity-60">Shift+Tab: 내어쓰기</span>
      </div>
    </footer>
  );
}
