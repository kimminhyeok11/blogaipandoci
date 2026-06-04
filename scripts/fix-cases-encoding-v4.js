const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/cases/[type]/page.tsx');

const content = fs.readFileSync(filePath, 'utf8');

// 12번째 줄 뒤에 generateStaticParams 함수 추가
const lines = content.split('\n');
const newLines = [];

for (let i = 0; i < lines.length; i++) {
  newLines.push(lines[i]);
  
  // export const revalidate = 3600; 줄 뒤에 함수 추가
  if (lines[i].trim() === 'export const revalidate = 3600;') {
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
    newLines.push('');
  }
}

fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
console.log('generateStaticParams 함수 추가 완료');
