const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/cases/[type]/page.tsx');

// 파일 전체를 읽기
const content = fs.readFileSync(filePath, 'utf8');

// 깨진 줄 패턴 찾기
const brokenLinePattern = /export const revalidate = 3600;\\n\/\/ [^\n]*\\nexport async function generateStaticParams\(\) \{\\n  const supabase = getServiceSupabase\(\);\\n  const \{ data: categories \} = await supabase\\n    \.from\("categories"\)\\n    \.select\("slug"\)\\n    \.eq\("is_active", true\);\\n  \\n  return \(categories \|\| \[\]\)\.map\(\(cat\) => \(\{\\n    type: cat\.slug,\\n  \}\)\);\\n\}\\n/;

if (brokenLinePattern.test(content)) {
  console.log('깨진 패턴 찾음');
  
  const fixedContent = content.replace(brokenLinePattern, `export const revalidate = 3600;

// 정적 파라미터 생성 - 활성화된 카테고리 슬러그 목록
export async function generateStaticParams() {
  const supabase = getServiceSupabase();
  const { data: categories } = await supabase
    .from("categories")
    .select("slug")
    .eq("is_active", true);

  return (categories || []).map((cat: any) => ({
    type: cat.slug,
  }));
}`);
  
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  console.log('파일 수정 완료');
} else {
  console.log('패턴을 찾지 못함, 수동 수정 시도');
  
  // 줄 단위로 분리해서 수정
  const lines = content.split('\n');
  const newLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 깨진 줄 건너뛰기
    if (line.includes('\\n//') || line.includes('Ȱ') || line.includes('īװ')) {
      continue;
    }
    
    // revalidate 줄 뒤에 올바른 내용 추가
    if (line === 'export const revalidate = 3600;\\n//  Ȱ īװ \\nexport async function generateStaticParams() {\\n  const supabase = getServiceSupabase();\\n  const { data: categories } = await supabase\\n    .from("categories")\\n    .select("slug")\\n    .eq("is_active", true);\\n  \\n  return (categories || []).map((cat) => ({\\n    type: cat.slug,\\n  }));\\n}\\n') {
      newLines.push('export const revalidate = 3600;');
      newLines.push('');
      newLines.push('// 정적 파라미터 생성 - 활성화된 카테고리 슬러그 목록');
      newLines.push('export async function generateStaticParams() {');
      newLines.push('  const supabase = getServiceSupabase();');
      newLines.push('  const { data: categories } = await supabase');
      newLines.push('    .from("categories")');
      newLines.push('    .select("slug")');
      newLines.push('    .eq("is_active", true);');
      newLines.push('');
      newLines.push('  return (categories || []).map((cat: any) => ({');
      newLines.push('    type: cat.slug,');
      newLines.push('  }));');
      newLines.push('}');
      continue;
    }
    
    newLines.push(line);
  }
  
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log('파일 수정 완료 (수동 방법)');
}
