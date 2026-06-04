const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/cases/[type]/page.tsx');

const content = fs.readFileSync(filePath, 'utf8');

// generateStaticParams 함수 추가
const newContent = content.replace(
  '// ISR: 1시간마다 재생성\nexport const revalidate = 3600;\n\n// DB 기반 category 스타일 매핑',
  '// ISR: 1시간마다 재생성\nexport const revalidate = 3600;\n\n// 정적 파라미터 생성 - 활성화된 카테고리 슬러그 목록\nexport async function generateStaticParams() {\n  const supabase = getServiceSupabase();\n  const { data: categories } = await supabase\n    .from("categories")\n    .select("slug")\n    .eq("is_active", true);\n\n  return (categories || []).map((cat: any) => ({\n    type: cat.slug,\n  }));\n}\n\n// DB 기반 category 스타일 매핑'
);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('generateStaticParams 함수 추가 완료');
