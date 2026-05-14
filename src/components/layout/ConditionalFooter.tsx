"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // write 페이지에서는 푸터 숨김 (티스토리 스타일)
  if (pathname === "/write") {
    return null;
  }

  return (
    <footer className="border-t-3 border-double border-ink bg-paper">
      <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* 브랜드 */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="font-serif text-lg font-bold text-ink mb-2">法 BLOG</h3>
            <p className="font-sans text-xs text-muted">
              법률·정책 사회 분석 미디어
            </p>
          </div>
          {/* 메뉴 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">메뉴</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/posts" className="text-muted hover:text-rust transition-colors">모든 글</Link></li>
              <li><Link href="/categories" className="text-muted hover:text-rust transition-colors">카테고리</Link></li>
              <li><Link href="/tags" className="text-muted hover:text-rust transition-colors">태그</Link></li>
            </ul>
          </div>
          {/* 정보 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">정보</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/about" className="text-muted hover:text-rust transition-colors">소개</Link></li>
              <li><Link href="/author" className="text-muted hover:text-rust transition-colors">작성자 정보</Link></li>
              <li><Link href="/contact" className="text-muted hover:text-rust transition-colors">문의하기</Link></li>
              <li><Link href="/privacy" className="text-muted hover:text-rust transition-colors">개인정보처리방침</Link></li>
            </ul>
          </div>
          {/* 법적 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">법적 고지</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/terms" className="text-muted hover:text-rust transition-colors">이용약관</Link></li>
            </ul>
          </div>
        </div>
        {/* 법적 고지 - YMYL 사이트 필수 */}
        <div className="border-t border-rule pt-4 pb-4 bg-cream/30">
          <p className="font-sans text-2xs text-muted text-center leading-relaxed px-4">
            ※ 본 사이트는 일반 정보 제공 목적이며 법률 자문이 아닙니다.<br className="hidden sm:block" />
            ※ 구체적 사건은 변호사 상담이 필요할 수 있습니다.
          </p>
        </div>
        {/* 저작권 */}
        <div className="border-t border-rule pt-4 text-center">
          <p className="font-sans text-xs text-muted tracking-wider" suppressHydrationWarning>
            © {new Date().getFullYear()} 法 BLOG. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
