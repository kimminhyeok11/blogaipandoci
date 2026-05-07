import { marked } from "marked";

// marked 렌더러 커스터마이징 (v18 호환)
const renderer = {
  // 링크 새창에서 열기
  link(this: any, token: { href: string; title?: string | null; tokens: any[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<a href="${token.href}" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer"${token.title ? ` title="${token.title}"` : ''}>${text}</a>`;
  },

  // 이미지 스타일링
  image(token: { href: string; title?: string | null; text: string }) {
    return `<figure class="my-6"><img src="${token.href}" alt="${token.text}" class="max-w-full h-auto rounded shadow-sm" loading="lazy"${token.title ? ` title="${token.title}"` : ''} />${token.text ? `<figcaption class="text-center text-xs text-muted mt-2 font-sans">${token.text}</figcaption>` : ''}</figure>`;
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
  blockquote(this: any, token: { tokens: any[] }) {
    const body = this.parser.parse(token.tokens);
    return `<blockquote>${body}</blockquote>`;
  },

  // 구분선 스타일링 (CSS .prose-journal hr에서 관리)
  hr() {
    return `<hr />`;
  },

  // 리스트 스타일링 (CSS .prose-journal ul/ol에서 관리, 체크리스트만 특수 클래스)
  list(this: any, token: { items: any[]; ordered: boolean; start?: number | "" }) {
    const type = token.ordered ? 'ol' : 'ul';
    const hasTask = token.items.some((item: any) => item.task);
    const body = token.items.map((item: any) => this.listitem(item)).join('');
    const startAttr = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
    const cls = hasTask ? ' class="checklist"' : '';
    return `<${type}${cls}${startAttr}>${body}</${type}>`;
  },

  // 리스트 아이템 스타일링 (체크리스트 포함)
  listitem(this: any, token: { tokens: any[]; checked?: boolean; task?: boolean }) {
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
  table(this: any, token: { header: any[]; rows: any[][] }) {
    const headerHtml = token.header.map((cell: any) => {
      const text = this.parser.parseInline(cell.tokens);
      return `<th class="border border-rule px-3 py-2 bg-cream font-bold text-left">${text}</th>`;
    }).join('');
    const bodyHtml = token.rows.map((row: any) =>
      `<tr>${row.map((cell: any) => {
        const text = this.parser.parseInline(cell.tokens);
        return `<td class="border border-rule px-3 py-2">${text}</td>`;
      }).join('')}</tr>`
    ).join('');
    return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  },

  // 헤딩 스타일링 (CSS .prose-journal h1~h6에서 관리)
  heading(this: any, token: { tokens: any[]; depth: number }) {
    const text = this.parser.parseInline(token.tokens);
    return `<h${token.depth}>${text}</h${token.depth}>`;
  },

  // 단락 스타일링 (CSS .prose-journal p에서 관리)
  paragraph(this: any, token: { tokens: any[] }) {
    const text = this.parser.parseInline(token.tokens);
    // 이미지만 있는 단락은 p 태그 없이 바로 반환 (figure 중첩 방지)
    if (token.tokens.length === 1 && token.tokens[0].type === 'image') {
      return text;
    }
    return `<p>${text}</p>`;
  },

  // 볼드 텍스트 렌더링
  strong(this: any, token: { tokens: any[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<strong>${text}</strong>`;
  },

  // 이탤릭 텍스트 렌더링
  em(this: any, token: { tokens: any[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<em>${text}</em>`;
  },

  // 취소선 렌더링
  del(this: any, token: { tokens: any[] }) {
    const text = this.parser.parseInline(token.tokens);
    return `<del>${text}</del>`;
  },
};

// marked 설정 (v18 - use() 방식)
marked.use({
  gfm: true,
  breaks: true,
  renderer: renderer as any,  // 타입 단언으로 v18 호환
});

// 한글 앞뒤 **볼드** 및 *이탤릭* 인식 보강
// marked는 CJK 문자 앞뒤의 ** 를 word boundary로 인식 못하는 경우가 있음
// 예: "가나다**볼드**라마바" → 바깥쪽에만 zero-width space 삽입
function fixCjkEmphasis(text: string): string {
  const ZWS = '\u200B'; // zero-width space
  // 한글 바로 뒤에 여는 ** (볼드 시작): 한글]\u200B**텍스트**
  text = text.replace(/([\u3131-\u3163\uac00-\ud7a3\u4e00-\u9fff])\*\*(?!\s|\*)/g, `$1${ZWS}**`);
  // 닫는 ** 바로 뒤에 한글 (볼드 끝): **텍스트**\u200B[한글
  text = text.replace(/(?<!\s|\*)\*\*([\u3131-\u3163\uac00-\ud7a3\u4e00-\u9fff])/g, `**${ZWS}$1`);
  // 단일 * 이탤릭도 동일 처리
  text = text.replace(/([\u3131-\u3163\uac00-\ud7a3\u4e00-\u9fff])\*(?!\*|\s)/g, `$1${ZWS}*`);
  text = text.replace(/(?<!\*|\s)\*([\u3131-\u3163\uac00-\ud7a3\u4e00-\u9fff])/g, `*${ZWS}$1`);
  return text;
}

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
    if (match) return match[1];
  }
  return null;
}

// Instagram URL에서 포스트 ID 추출
function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
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
        return `<div class="embed-container my-6"><iframe src="https://www.instagram.com/p/${postId}/embed" frameborder="0" scrolling="no" allowtransparency="true" class="w-full rounded shadow-sm" style="min-height:500px;"></iframe></div>`;
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
        return `<div class="embed-container my-6"><iframe src="https://www.instagram.com/p/${postId}/embed" frameborder="0" scrolling="no" allowtransparency="true" class="w-full rounded shadow-sm" style="min-height:500px;"></iframe></div>`;
      }
      return match;
    }
  );

  return html;
}

// 마크다운 → HTML 변환 (에디터 & 상세페이지 공용)
export function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    // 전처리: 한글 앞뒤 볼드/이탤릭 인식 보강
    let preprocessed = fixCjkEmphasis(text);
    // 전처리: 단일 ~ 취소선 오인식 방지
    preprocessed = escapeInlineTilde(preprocessed);
    // 전처리: 불릿 문자 → 마크다운 리스트
    preprocessed = preprocessBullets(preprocessed);
    // 전처리: 리스트 항목 사이 빈 줄 정리 (연속 리스트 인식)
    preprocessed = preprocessListGaps(preprocessed);
    // marked v18 - 동기 파싱
    let html = marked.parse(preprocessed, { async: false }) as string;
    // 후처리: URL → 임베드 변환
    html = postprocessEmbeds(html);
    return html;
  } catch {
    return text;
  }
}
