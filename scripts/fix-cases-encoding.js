const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/cases/[type]/page.tsx');

let content = fs.readFileSync(filePath, 'utf8');

// 깨진 12번째 줄 수정
const brokenLine = 'export const revalidate = 3600;\\n//  Ȱ īװ \\nexport async function generateStaticParams() {\\n  const supabase = getServiceSupabase();\\n  const { data: categories } = await supabase\\n    .from("categories")\\n    .select("slug")\\n    .eq("is_active", true);\\n  \\n  return (categories || []).map((cat) => ({\\n    type: cat.slug,\\n  }));\\n}\\n';

const fixedLine = `export const revalidate = 3600;

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
}`;

content = content.replace(brokenLine, fixedLine);

// 201번째 줄의 encodeURIComponent 제거
content = content.replace(
  'url: `${SITE_URL}/cases/${encodeURIComponent(slug)}`',
  'url: `${SITE_URL}/cases/${slug}`'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('파일 수정 완료');
