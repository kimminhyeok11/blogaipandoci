// marked 테스트
import { marked } from 'marked';

const testText = `
**볼드 텍스트**

*이탤릭 텍스트*

~~취소선~~

**볼드 안에 *이탤릭* 있음**

- **리스트 볼드**
- *리스트 이탤릭*
`;

// 기본 설정
marked.use({
  gfm: true,
  breaks: true,
});

console.log('=== marked 기본 파싱 ===');
const result = marked.parse(testText, { async: false });
console.log(result);

console.log('\n=== 토큰 구조 확인 ===');
const tokens = marked.lexer(testText);
console.log(JSON.stringify(tokens, null, 2));
