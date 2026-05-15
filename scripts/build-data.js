const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경변수가 없을 때만 .env.local 로드 (로컬 개발용)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  require('dotenv').config({ path: '.env.local' });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fetchBuildData() {
  console.log('[BUILD DATA] Fetching data for build...');

  try {
    // Popular posts (by view count)
    const { data: popularPosts, error: popularError } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, user:users(nickname, email, role)")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("view_count", { ascending: false })
      .limit(1);

    if (popularError) {
      console.error('[BUILD DATA] Error fetching popular posts:', popularError);
    }

    // Latest posts (by date)
    const { data: latestPosts, error: latestError } = await supabase
      .from("posts")
      .select("id, title, excerpt, slug, published_at, view_count, user_id, user:users(nickname, email, role)")
      .eq("published", true)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(10);

    if (latestError) {
      console.error('[BUILD DATA] Error fetching latest posts:', latestError);
    }

    const buildData = {
      featuredPost: popularPosts?.[0] || null,
      recentPosts: latestPosts || [],
      generatedAt: new Date().toISOString()
    };

    // 데이터를 public 디렉토리에 JSON 파일로 저장
    const publicDir = path.join(process.cwd(), 'public');
    const dataFile = path.join(publicDir, 'build-data.json');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(dataFile, JSON.stringify(buildData, null, 2));
    console.log('[BUILD DATA] Data saved to', dataFile);
    console.log('[BUILD DATA] Featured post:', buildData.featuredPost?.title || 'None');
    console.log('[BUILD DATA] Recent posts count:', buildData.recentPosts.length);

    // 빌드된 HTML 파일에 데이터를 직접 주입
    const buildDir = path.join(process.cwd(), '.next', 'server', 'app');
    const htmlFile = path.join(buildDir, 'index.html');

    if (fs.existsSync(htmlFile)) {
      let htmlContent = fs.readFileSync(htmlFile, 'utf-8');
      
      // HTML에 데이터를 주입하기 위해 JSON을 script 태그로 추가
      const dataScript = `<script id="build-data" type="application/json">${JSON.stringify(buildData)}</script>`;
      
      // </head> 태그 앞에 script 추가
      htmlContent = htmlContent.replace('</head>', `${dataScript}</head>`);
      
      fs.writeFileSync(htmlFile, htmlContent);
      console.log('[BUILD DATA] Data injected into HTML file');
    }

  } catch (err) {
    console.error('[BUILD DATA] Failed to fetch data:', err);
    process.exit(1);
  }
}

fetchBuildData();
