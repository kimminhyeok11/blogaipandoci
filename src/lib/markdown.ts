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

// 마크다운 → HTML 변환 (에디터 & 상세페이지 공용)
export function processMarkdown(text: string): string {
  if (!text) return "";
  try {
    // marked v18 - 동기 파싱
    return marked.parse(text, { async: false }) as string;
  } catch {
    return text;
  }
}
