/**
 * slug 마이그레이션 스크립트
 * 잘못된 slug (예: -2026--e05c40)를 올바른 slug로 변환
 *
 * 실행: npx ts-node scripts/migrate-slugs.ts
 */

import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 설정
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// 개선된 generateSlug 함수
function generateSlug(text: string): string {
  const slug = text
    .trim()
    // 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈은 유지)
    .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u309F\u30A0-\u30FF\w\s-]/g, '')
    // 공백을 하이픈으로 변환
    .replace(/\s+/g, '-')
    // 연속된 하이픈 제거
    .replace(/-+/g, '-')
    // 앞뒤 하이픈 제거
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);

  // slug가 비어있거나 너무 짧은 경우
  if (slug.length < 2) {
    // 원문에서 영문/숫자 추출 시도
    const fallback = text
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);

    if (fallback.length >= 2) {
      return fallback;
    }

    // 그래도 없으면 "post" + timestamp 반환
    return `post-${Date.now().toString(36).slice(-8)}`;
  }

  return slug;
}

// 잘못된 slug 판별 함수
function isInvalidSlug(slug: string): boolean {
  // 1. 하이픈으로 시작하는 경우
  if (slug.startsWith('-')) return true;

  // 2. 연속된 하이픈이 2개 이상인 경우
  if (slug.includes('--')) return true;

  // 3. 길이가 5자 미만인 경우 (너무 짧음)
  if (slug.length < 5) return true;

  // 4. 한글 없이 숫자+하이픈만 있는 경우 (예: -2026--e05c40)
  const hasKorean = /[\uAC00-\uD7AF]/.test(slug);
  const hasEnglish = /[a-zA-Z]/.test(slug);
  const hasOnlyNumbersAndHyphens = /^[\d-]+$/.test(slug);

  if (!hasKorean && !hasEnglish && hasOnlyNumbersAndHyphens) return true;

  return false;
}

// 고유한 slug 생성 (중복 방지)
async function generateUniqueSlug(title: string, existingSlugs: Set<string>): Promise<string> {
  let baseSlug = generateSlug(title);
  let slug = baseSlug;
  let counter = 1;

  // 중복 체크
  while (existingSlugs.has(slug)) {
    const suffix = Date.now().toString(36).slice(-4) + counter.toString(36);
    slug = `${baseSlug}-${suffix}`;
    counter++;

    // 무한 루프 방지
    if (counter > 100) {
      slug = `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;
      break;
    }
  }

  return slug;
}

// 메인 마이그레이션 함수
async function migrateSlugs() {
  console.log('🔍 잘못된 slug 조회 중...');

  // 모든 게시글 조회
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, title, slug, published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 게시글 조회 실패:', error);
    process.exit(1);
  }

  if (!posts || posts.length === 0) {
    console.log('ℹ️ 게시글이 없습니다.');
    return;
  }

  console.log(`📊 총 ${posts.length}개 게시글 확인`);

  // 잘못된 slug 식별
  const invalidPosts = posts.filter(post => isInvalidSlug(post.slug));
  console.log(`⚠️ 잘못된 slug ${invalidPosts.length}개 발견:`);

  if (invalidPosts.length === 0) {
    console.log('✅ 모든 slug가 정상입니다!');
    return;
  }

  // 잘못된 slug 목록 출력
  invalidPosts.forEach(post => {
    console.log(`   - "${post.title}" → /posts/${post.slug}/`);
  });

  // 기존 모든 slug 수집 (중복 방지용)
  const existingSlugs = new Set(posts.map(p => p.slug));

  // 마이그레이션 실행 여부 확인
  const shouldMigrate = process.argv.includes('--execute');

  if (!shouldMigrate) {
    console.log('\n⚡ 실제 마이그레이션을 실행하려면:');
    console.log('   npx ts-node scripts/migrate-slugs.ts --execute');
    console.log('\n📝 미리보기 결과:');

    for (const post of invalidPosts) {
      const newSlug = await generateUniqueSlug(post.title, existingSlugs);
      console.log(`   ${post.slug} → ${newSlug}`);
      existingSlugs.add(newSlug); // 다음 중복 체크용
    }
    return;
  }

  // 실제 마이그레이션 실행
  console.log('\n🚀 마이그레이션 시작...');

  let successCount = 0;
  let failCount = 0;

  for (const post of invalidPosts) {
    try {
      const newSlug = await generateUniqueSlug(post.title, existingSlugs);

      // slug 업데이트
      const { error: updateError } = await supabase
        .from('posts')
        .update({ slug: newSlug, updated_at: new Date().toISOString() })
        .eq('id', post.id);

      if (updateError) {
        console.error(`   ❌ "${post.title}" 업데이트 실패:`, updateError.message);
        failCount++;
        continue;
      }

      console.log(`   ✅ "${post.title}": ${post.slug} → ${newSlug}`);
      existingSlugs.add(newSlug);
      existingSlugs.delete(post.slug); // 기존 slug 제거
      successCount++;

    } catch (err) {
      console.error(`   ❌ "${post.title}" 처리 중 오류:`, err);
      failCount++;
    }
  }

  console.log(`\n📊 마이그레이션 완료:`);
  console.log(`   성공: ${successCount}개`);
  console.log(`   실패: ${failCount}개`);

  if (successCount > 0) {
    console.log('\n⚠️ 주의: slug가 변경되었습니다. 다음 작업이 필요합니다:');
    console.log('   1. 검색엔진에 사이트맵 재제출');
    console.log('   2. 외부 링크가 있다면 업데이트');
    console.log('   3. 필요시 301 리다이렉트 설정');
  }
}

// 실행
migrateSlugs().catch(console.error);
