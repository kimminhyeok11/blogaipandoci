"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Rss, FileText, LayoutGrid, Mail } from "lucide-react";

export function ConditionalFooter() {
  const pathname = usePathname();
  // write 페이지에서는 푸터 숨김 (티스토리 스타일)
  if (pathname === "/write") {
    return null;
  }

  return (
    <footer className="border-t-3 border-double border-ink bg-paper" itemScope itemType="https://schema.org/WPFooter">
      <div className="max-w-content mx-auto px-4 sm:px-6 py-10">
        {/* 상단: 브랜드 + 소개 */}
        <div className="mb-8 pb-8 border-b border-rule">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <h3 className="font-serif text-xl font-bold text-ink mb-2" itemProp="name">法 BLOG</h3>
              <p className="font-sans text-sm text-muted max-w-md">
                생활형 법률·정책 이슈를 분석하는 독립 미디어입니다. 
                실제 판례와 공공자료를 기반으로 현실적인 법률 정보를 제공합니다.
              </p>
            </div>
            {/* SEO 피드 링크 */}
            <div className="flex items-center gap-4">
              <a 
                href="/rss.xml" 
                className="flex items-center gap-2 text-sm text-muted hover:text-rust transition-colors"
                title="RSS 피드 구독"
              >
                <Rss size={16} />
                <span className="font-sans text-xs">RSS</span>
              </a>
              <a 
                href="/sitemap.xml" 
                className="flex items-center gap-2 text-sm text-muted hover:text-rust transition-colors"
                title="사이트맵"
              >
                <LayoutGrid size={16} />
                <span className="font-sans text-xs">Sitemap</span>
              </a>
              <a 
                href="mailto:salad20c@gmail.com" 
                className="flex items-center gap-2 text-sm text-muted hover:text-rust transition-colors"
                title="이메일 문의"
              >
                <Mail size={16} />
                <span className="font-sans text-xs">Contact</span>
              </a>
            </div>
          </div>
        </div>

        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* 콘텐츠 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">콘텐츠</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/posts" className="text-muted hover:text-rust transition-colors">모든 글</Link></li>
              <li><Link href="/categories" className="text-muted hover:text-rust transition-colors">카테고리</Link></li>
              <li><Link href="/tags" className="text-muted hover:text-rust transition-colors">태그 모음</Link></li>
              <li><Link href="/cases" className="text-muted hover:text-rust transition-colors">사건 유형</Link></li>
            </ul>
          </div>
          
          {/* 인기 주제 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">인기 주제</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/cases/형사·고소" className="text-muted hover:text-rust transition-colors">형사/고소</Link></li>
              <li><Link href="/cases/전세·임대차" className="text-muted hover:text-rust transition-colors">전세/임대차</Link></li>
              <li><Link href="/cases/민사·소송" className="text-muted hover:text-rust transition-colors">민사/소송</Link></li>
              <li><Link href="/cases/이혼·가족" className="text-muted hover:text-rust transition-colors">이혼/가족</Link></li>
            </ul>
          </div>
          
          {/* 사이트 정보 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">사이트</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/about" className="text-muted hover:text-rust transition-colors">소개</Link></li>
              <li><Link href="/author" className="text-muted hover:text-rust transition-colors">작성자 정보</Link></li>
              <li><Link href="/contact" className="text-muted hover:text-rust transition-colors">문의하기</Link></li>
            </ul>
          </div>
          
          {/* 법적 고지 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">법적 고지</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li><Link href="/privacy" className="text-muted hover:text-rust transition-colors">개인정보처리방침</Link></li>
              <li><Link href="/terms" className="text-muted hover:text-rust transition-colors">이용약관</Link></li>
            </ul>
          </div>
          
          {/* SEO/기술 */}
          <div>
            <h4 className="font-sans text-xs font-bold text-ink uppercase tracking-wider mb-3">기술</h4>
            <ul className="space-y-2 font-sans text-xs">
              <li>
                <a href="/rss.xml" className="text-muted hover:text-rust transition-colors flex items-center gap-1">
                  <Rss size={12} />
                  RSS 피드
                </a>
              </li>
              <li>
                <a href="/sitemap.xml" className="text-muted hover:text-rust transition-colors flex items-center gap-1">
                  <LayoutGrid size={12} />
                  Sitemap
                </a>
              </li>
              <li>
                <a href="/llms.txt" className="text-muted hover:text-rust transition-colors flex items-center gap-1">
                  <FileText size={12} />
                  LLMs.txt
                </a>
              </li>
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
