import { marked } from "marked";
import xss from "xss";
import { addInternalLinks, addInternalLinksAsync } from "./internal-links";

// marked 렌더러 커스터마이징 (v18 호환)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkedToken = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarkedParser = any;
const renderer = {
  // 링크 처리: 외부 링크는 새 탭, 내부 링크는 현재 탭
  link(this: MarkedParser, token: { href: string; title?: string | null; tokens: MarkedToken[] }) {
    const text = this.parser.parseInline(token.tokens);
    const href = token.href;
    // 외부 링크 체크 (http://, https://, //로 시작)
    const isExternal = /^https?:\/\/|^\/\//.test(href);
    const targetAttr = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${href}" class="text-rust underline hover:text-rust-light"${targetAttr}${token.title ? ` title="${token.title}"` : ''}>${text}</a>`;
  },

  // 이미지 스타일링
  // token.text = alt text (접근성용, 화면에 표시 안됨)
  // token.title = 캡션/설명 (화면에 figcaption으로 표시)
  image(token: { href: string; title?: string | null; text: string }) {
    return `<figure class="my-6 max-w-2xl mx-auto"><img src="${token.href}" alt="${token.text}" class="w-full h-auto rounded shadow-sm" loading="lazy" decoding="async"${token.title ? ` title="${token.title}"` : ''} />${token.title ? `<figcaption class="text-center text-xs text-muted mt-2 font-sans">${token.title}</figcaption>` : ''}</figure>`;
  },

  // 코드 블록 스타일링
  code(token: { text: string; lang?: string }) {
    return `<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code${token.lang ? ` class="language-${token.lang}"` : ''}>${token.text}</code></pre>`;
  },

  // 인라인 코드 스타일링
  codespan(token: { text: string }) {
    return `<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">${token.text}</code>`;
  },

  // 인용구 스타일링 (CSS .prose-journal blockquote에서 관리)
  blockquote(this: MarkedParser, token: { tokens: MarkedToken[] }) {
    const body = this.parser.parse(token.tokens);
    return `<blockquote>${body}</blockquote>`;
  },

  // 구분선 스타일링 (CSS .prose-journal hr에서 관리)
  hr() {
    return `<hr />`;
  },

  // 리스트 스타일링 (CSS .prose-journal ul/ol에서 관리, 체크리스트만 특수 클래스)
  list(this: MarkedParser, token: { items: MarkedToken[]; ordered: boolean; start?: number | "" }) {
    const type = token.ordered ? 'ol' : 'ul';
    const hasTask = token.items.some((item: MarkedToken) => item.task);
    const body = token.items.map((item: MarkedToken) => this.listitem(item)).join('');
    const startAttr = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
    const cls = hasTask ? ' class="checklist"' : '';
    return `<${type}${cls}${startAttr}>${body}</${type}>`;
  },

  // 리스트 아이템 스타일링 (체크리스트 포함)
  listitem(this: MarkedParser, token: { tokens: MarkedToken[]; checked?: boolean; task?: boolean }) {
    const text = this.parser.parse(token.tokens, !!token.task);

    if (token.task) {
      const checked = token.checked;
      const checkbox = checked
        ? '<span class="checkbox checked">✓</span>'
        : '<span class="checkbox"></span>';
      const textClass = checked ? 'line-through text-muted' : '';
      return `<li class="task-item">${checkbox}<span class="${textClass}">${text}</span></li>`;
    }

    return `<li>${text}</li>`;
  },

  // 테이블 스타일링
  table(this: MarkedParser, token: { header: MarkedToken[]; rows: MarkedToken[][] }) {
    const headerHtml = token.header.map((cell: MarkedToken) => {
      const text = this.parser.parseInline(cell.tokens);
      return `<th class="border border-rule px-3 py-2 bg-cream font-bold text-left">${text}</th>`;
    }).join('');
    const bodyHtml = token.rows.map((row: MarkedToken) =>
      `<tr>${row.map((cell: MarkedToken) => {
        const text = this.parser.parseInline(cell.tokens);
        return `<td class="border border-rule px-3 py-2">${text}</td>`;
      }).join('')}</tr>`
    ).join('');
    return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  },

  // 헤딩 스타일링 (CSS .prose-journal h1~h6에서 관리)
  heading(this: MarkedParser, token: { tokens: MarkedToken[]; depth: number }) {
    const text = this.parser.parseInline(token.tokens);
    return `<h${token.depth}>${text}</h${token.depth}>`;
  },

  // 단락 스타일링 (CSS .prose-journal p에서 관리)
  paragraph(this: MarkedParser, token: { tokens: MarkedToken[] }) {
    const text = this.parser.parseInline(token.tokens);
    // 이미지만 있는 단락은 p 태그 없이 바로 반환 (figure 중첩 방지)
    if (token.tokens.length === 1 && token.tokens[0].type === 'image') {
      return text;
    }
    return `<p>${text}</p>`;
  },

  // 볼드 텍스트 렌더링
  strong(this: MarkedParser, token: { tokens: MarkedToken[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<strong>${text}</strong>`;
  },

  // 이탤릭 텍스트 렌더링
  em(this: MarkedParser, token: { tokens: MarkedToken[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<em>${text}</em>`;
  },

  // 취소선 렌더링
  del(this: MarkedParser, token: { tokens: MarkedToken[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<del>${text}</del>`;
  },
};

// marked 설정 (v18 - use() 방식)
marked.use({
  gfm: true,
  breaks: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: renderer as any,  // 타입 단언으로 v18 호환
});


// 단어/숫자 사이의 단일 ~ 를 취소선으로 인식하지 않도록 이스케이프
function escapeInlineTilde(text: string): string {
  // "1~2", "3~6" 등 숫자~숫자 또는 단어~단어 패턴의 단일 ~ → HTML 엔티티로 변환
  // ~~취소선~~ (더블 틸드)는 정상 동작하도록 유지
  return text.replace(/(\w)~(?!~)(\w)/g, '$1&#126;$2');
}

// 불릿 문자를 마크다운 리스트로 변환하는 전처리
function preprocessBullets(text: string): string {
  // 다양한 불릿 문자 (•, ●, ○, ◦, ▪, ▸, ►, ◆, ■, □, ★, ☆, ➤, ➜, ⁃)를 마크다운 리스트로 변환
  return text.replace(/^[ \t]*[•●○◦▪▸►◆■□★☆➤➜⁃]\s*/gm, '- ');
}

// 리스트 항목 사이의 중복 빈 줄을 제거하여 연속 리스트로 인식시키는 전처리
function preprocessListGaps(text: string): string {
  // 번호 리스트: "1. xxx\n\n\n2. xxx" → "1. xxx\n2. xxx"
  text = text.replace(/^(\d+\.\s+.+)\n{2,}(?=\d+\.\s)/gm, '$1\n');
  // 불릿 리스트: "- xxx\n\n\n- xxx" → "- xxx\n- xxx"  
  text = text.replace(/^(-\s+.+)\n{2,}(?=-\s)/gm, '$1\n');
  // 체크리스트: "- [ ] xxx\n\n\n- [ ] xxx" → "- [ ] xxx\n- [ ] xxx"
  text = text.replace(/^(-\s*\[[ x]\]\s+.+)\n{2,}(?=-\s*\[[ x]\])/gm, '$1\n');
  return text;
}

// YouTube URL에서 video ID 추출
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

// Instagram URL에서 포스트 ID 추출
function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  return match && match[1] ? match[1] : null;
}

// URL을 임베드로 변환하는 후처리
function postprocessEmbeds(html: string): string {
  // <p> 태그 내에 단독 URL만 있는 경우 임베드로 변환
  // YouTube
  html = html.replace(
    /<p><a[^>]*href="(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch|shorts)|youtu\.be)[^"]*)"[^>]*>[^<]*<\/a><\/p>/g,
    (match, url) => {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        return `<div class="embed-container my-6"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full aspect-video rounded shadow-sm"></iframe></div>`;
      }
      return match;
    }
  );

  // YouTube - 단순 텍스트 URL (링크 태그 없이 텍스트만 있는 경우)
  html = html.replace(
    /<p>(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch|shorts)|youtu\.be)[^\s<]+)<\/p>/g,
    (match, url) => {
      const videoId = extractYoutubeId(url);
      if (videoId) {
        return `<div class="embed-container my-6"><iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="w-full aspect-video rounded shadow-sm"></iframe></div>`;
      }
      return match;
    }
  );

  // Instagram
  html = html.replace(
    /<p><a[^>]*href="(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^"]*)"[^>]*>[^<]*<\/a><\/p>/g,
    (match, url) => {
      const postId = extractInstagramId(url);
      if (postId) {
        return `<div class="embed-container my-6"><iframe src="https://www.instagram.com/p/${postId}/embed" frameborder="0" scrolling="no" allowtransparency="true" class="w-full min-h-[500px] rounded shadow-sm"></iframe></div>`;
      }
      return match;
    }
  );

  // Instagram - 단순 텍스트 URL
  html = html.replace(
    /<p>(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[^\s<]+)<\/p>/g,
    (match, url) => {
      const postId = extractInstagramId(url);
      if (postId) {
        return `<div class="embed-container my-6"><iframe src="https://www.instagram.com/p/${postId}/embed" frameborder="0" scrolling="no" allowtransparency="true" class="w-full min-h-[500px] rounded shadow-sm"></iframe></div>`;
      }
      return match;
    }
  );

  return html;
}

// FAQ 블록 처리 전처리
function preprocessFAQBlocks(text: string): string {
  // :::faq ... ::: 패턴을 HTML로 변환
  return text.replace(/:::faq\n([\s\S]*?)\n:::/g, (match, content) => {
    // Q: ... A: ... 형식을 파싱
    const faqItems = content.split(/\n(?=Q:)/).map((item: string) => {
      const questionMatch = item.match(/^Q:\s*(.*)/);
      const answerMatch = item.match(/A:\s*(.*)/);
      if (questionMatch && answerMatch) {
        return `<div class="faq-item">
          <div class="faq-question">${questionMatch[1]}</div>
          <div class="faq-answer">${answerMatch[1]}</div>
        </div>`;
      }
      return '';
    }).filter(Boolean).join('');
    
    return `<div class="faq-accordion">${faqItems}</div>`;
  });
}

// TL;DR 블록 처리 전처리
function preprocessTldrBlocks(text: string): string {
  // :::tldr ... ::: 패턴을 HTML로 변환
  return text.replace(/:::tldr\n([\s\S]*?)\n:::/g, (match, content) => {
    return `<div class="tldr-box"><div class="tldr-label">핵심 요약</div><div class="tldr-content">${content}</div></div>`;
  });
}

// 마크다운 → HTML 변환 (에디터 & 상세페이지 공용)
export function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    // 전처리: 단일 ~ 취소선 오인식 방지
    let preprocessed = escapeInlineTilde(text);
    // 전처리: 불릿 문자 → 마크다운 리스트
    preprocessed = preprocessBullets(preprocessed);
    // 전처리: 리스트 항목 사이 빈 줄 정리 (연속 리스트 인식)
    preprocessed = preprocessListGaps(preprocessed);
    // 전처리: FAQ 블록 처리
    preprocessed = preprocessFAQBlocks(preprocessed);
    // 전처리: TL;DR 블록 처리
    preprocessed = preprocessTldrBlocks(preprocessed);
    // marked v18 - 동기 파싱
    let html = marked.parse(preprocessed, { async: false }) as string;
    // 후처리: URL → 임베드 변환
    html = postprocessEmbeds(html);
    // 보안: XSS 방지 HTML 정제 (script 태그 등 제거)
    const xssOptions = {
      whiteList: {
        p: [], br: [], strong: [], em: [], del: [],
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
        ul: [], ol: [], li: [], blockquote: [], code: [], pre: [],
        a: ['href', 'title', 'class', 'target', 'rel'],
        img: ['src', 'alt', 'class', 'loading'],
        figure: [], figcaption: [],
        table: [], thead: [], tbody: [], tr: [], th: [], td: [],
        hr: [], iframe: ['src', 'frameborder', 'allow', 'allowfullscreen', 'scrolling', 'class'],
        div: ['class'], span: ['class']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    };
    html = xss(html, xssOptions);
    // SEO: 문맥 기반 내부링크 자동화 (보안 정제 후 적용)
    html = addInternalLinks(html, 5); // 글당 최대 5개 내부링크
    return html;
  } catch {
    return text;
  }
}

// TOC 아이템 인터페이스
export interface TocItem {
  id: string;
  text: string;
  level: number;
}

// 서버에서 HTML에서 TOC 추출 (정규식 사용)
export function extractTocFromHtml(html: string): TocItem[] {
  const toc: TocItem[] = [];
  let counter = 0;
  
  // 정규식으로 h2, h3 태그 추출
  const headingRegex = /<(h[23])[^>]*>([\s\S]*?)<\/\1>/g;
  let match;
  
  while ((match = headingRegex.exec(html)) !== null) {
    const tag = match[1];
    const innerHtml = match[2] || '';
    const text = innerHtml.replace(/<[^>]*>/g, '').trim(); // HTML 태그 제거
    const level = tag === 'h2' ? 2 : 3;
    const id = `toc-heading-${counter++}`;
    
    if (text.length > 0) {
      toc.push({ id, text, level });
    }
  }
  
  return toc;
}

// 서버에서 HTML에 heading ID 추가
export function addHeadingIds(html: string): string {
  let counter = 0;
  return html.replace(/<(h[23])>/g, (match, tag) => {
    return `<${tag} id="toc-heading-${counter++}">`;
  });
}

// 서버에서 HTML에서 이미지 추출 (정규식 사용)
export function extractImagesFromHtml(html: string): Array<{ src: string; alt?: string }> {
  const images: Array<{ src: string; alt?: string }> = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/g;
  let match;
  
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    const alt = match[2] || '';
    if (src) {
      images.push({ src, alt: alt || undefined });
    }
  }
  
  return images;
}

// async 버전: DB에서 키워드 가져와서 처리
export async function processMarkdownAsync(text: string): Promise<string> {
  if (!text) return "";
  try {
    // 전처리: 단일 ~ 취소선 오인식 방지
    const processed = text
      .replace(/(?<![\d\s])\s*~\s*(?![\d\s~])/g, " ") // 단일 ~ 제거
      .replace(/([~])\s*\n/g, "$1 ") // 줄바꿈 전 공백 추가
      .replace(/\n\s*([~])/g, " $1"); // 줄바꿈 후 공백 추가

    // marked v18 - 동기 파싱
    let html = marked.parse(processed, { async: false }) as string;
    
    // 후처리: URL → 임베드 변환
    html = postprocessEmbeds(html);
    
    // XSS 방지 (xss 라이브러리로 서버/클라이언트 모두 처리)
    const xssOptions = {
      whiteList: {
        p: [], br: [], strong: [], b: [], em: [], i: [], u: [], del: [], s: [], strike: [],
        a: ['href', 'title', 'class', 'target', 'rel'],
        img: ['src', 'alt', 'class', 'loading'],
        code: [], pre: [], blockquote: [],
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
        ul: [], ol: [], li: [], hr: [],
        table: [], thead: [], tbody: [], tr: [], th: [], td: [],
        div: ['class'], span: ['class'], sup: [], sub: [],
        iframe: ['src', 'frameborder', 'allow', 'allowfullscreen', 'scrolling', 'class']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style']
    };
    const cleanHtml = xss(html, xssOptions);
    // SEO: 문맥 기반 내부링크 자동화 (DB에서 키워드 가져옴)
    return await addInternalLinksAsync(cleanHtml, 5);
  } catch {
    return text;
  }
}
