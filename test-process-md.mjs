// processMarkdown 함수 테스트
// import 구문이 안될 수 있으므로 직접 marked 테스트

import { marked } from "marked";

// renderer 설정 (src/lib/markdown.ts와 동일)
const renderer = {
  link(token) {
    const text = this.parser.parseInline(token.tokens);
    return `<a href="${token.href}" class="text-rust underline hover:text-rust-light" target="_blank" rel="noopener noreferrer"${token.title ? ` title="${token.title}"` : ''}>${text}</a>`;
  },
  image(token) {
    return `<figure class="my-6"><img src="${token.href}" alt="${token.text}" class="max-w-full h-auto rounded shadow-sm" loading="lazy"${token.title ? ` title="${token.title}"` : ''} />${token.text ? `<figcaption class="text-center text-xs text-muted mt-2 font-sans">${token.text}</figcaption>` : ''}</figure>`;
  },
  code(token) {
    return `<pre class="bg-cream p-4 rounded overflow-x-auto font-mono text-sm my-4"><code${token.lang ? ` class="language-${token.lang}"` : ''}>${token.text}</code></pre>`;
  },
  codespan(token) {
    return `<code class="bg-cream px-1 py-0.5 rounded text-sm font-mono">${token.text}</code>`;
  },
  blockquote(token) {
    const body = this.parser.parse(token.tokens);
    return `<blockquote>${body}</blockquote>`;
  },
  hr() {
    return `<hr />`;
  },
  list(token) {
    const type = token.ordered ? 'ol' : 'ul';
    const hasTask = token.items.some((item) => item.task);
    const body = token.items.map((item) => this.listitem(item)).join('');
    const startAttr = token.ordered && token.start !== 1 ? ` start="${token.start}"` : '';
    const cls = hasTask ? ' class="checklist"' : '';
    return `<${type}${cls}${startAttr}>${body}</${type}>`;
  },
  listitem(token) {
    const text = this.parser.parse(token.tokens, !!token.task);
    return `<li>${text}</li>`;
  },
  table(token) {
    const headerHtml = token.header.map((cell) => this.tablecell(cell)).join('');
    const bodyHtml = token.rows.map((row) => {
      return `<tr>${row.map((cell) => this.tablecell(cell)).join('')}</tr>`;
    }).join('');
    return `<table class="w-full border-collapse my-4 text-sm"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  },
  tablerow(token) {
    return `<tr>${token.text}</tr>`;
  },
  tablecell(token) {
    const text = this.parser.parseInline(token.tokens);
    const tag = token.header ? 'th' : 'td';
    return `<${tag}${token.align ? ` align="${token.align}"` : ''}>${text}</${tag}>`;
  },
  heading(token) {
    const text = this.parser.parseInline(token.tokens);
    return `<h${token.depth}>${text}</h${token.depth}>`;
  },
  paragraph(token) {
    const text = this.parser.parseInline(token.tokens);
    if (token.tokens.length === 1 && token.tokens[0].type === 'image') {
      return text;
    }
    return `<p>${text}</p>`;
  },
  strong(token) {
    const text = this.parser.parseInline(token.tokens);
    return `<strong>${text}</strong>`;
  },
  em(token) {
    const text = this.parser.parseInline(token.tokens);
    return `<em>${text}</em>`;
  },
  del(token) {
    const text = this.parser.parseInline(token.tokens);
    return `<del>${text}</del>`;
  },
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: renderer,
});

const testText = `
**볼드 텍스트 테스트**

*이탤릭 텍스트*

**볼드 안에 *이탤릭* 있음**

- **리스트 볼드**
- *리스트 이탤릭*
`;

console.log('=== processMarkdown 테스트 ===');
const result = marked.parse(testText, { async: false });
console.log(result);

// strong 태그 확인
if (result.includes('<strong>')) {
  console.log('\n✅ <strong> 태그 정상 생성됨!');
} else {
  console.log('\n❌ <strong> 태그 없음 - 문제 발생!');
}

if (result.includes('<em>')) {
  console.log('✅ <em> 태그 정상 생성됨!');
} else {
  console.log('❌ <em> 태그 없음 - 문제 발생!');
}
