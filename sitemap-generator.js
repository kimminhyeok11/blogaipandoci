/**
 * 동적 사이트맵 생성기
 * SEO 최적화를 위한 XML 사이트맵 자동 생성
 */

class SitemapGenerator {
    constructor(config) {
        this.siteUrl = config.SITE_URL;
        this.supabase = config.supabase;
        this.categories = config.CATEGORIES;
    }

    /**
     * 전체 사이트맵 생성
     */
    async generateSitemap() {
        try {
            const posts = await this.fetchAllPosts();
            const staticPages = this.getStaticPages();
            const categoryPages = this.getCategoryPages();
            
            const sitemap = this.buildXMLSitemap([
                ...staticPages,
                ...categoryPages,
                ...posts
            ]);

            return sitemap;
        } catch (error) {
            console.error('사이트맵 생성 실패:', error);
            return this.getBasicSitemap();
        }
    }

    /**
     * Supabase에서 모든 포스트 가져오기
     */
    async fetchAllPosts() {
        if (!this.supabase) {
            console.warn('Supabase 연결 없음. 로컬 데이터 사용.');
            return this.getLocalPosts();
        }

        try {
            const { data: posts, error } = await this.supabase
                .from('posts')
                .select('slug, created_at, updated_at, title, category')
                .eq('status', 'published')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            return posts.map(post => ({
                url: `${this.siteUrl}/post/${post.slug}`,
                lastmod: post.updated_at || post.created_at,
                changefreq: 'weekly',
                priority: '0.8'
            }));
        } catch (error) {
            console.error('포스트 데이터 가져오기 실패:', error);
            return this.getLocalPosts();
        }
    }

    /**
     * 로컬 스토리지에서 포스트 데이터 가져오기
     */
    getLocalPosts() {
        try {
            const posts = JSON.parse(localStorage.getItem('posts') || '[]');
            return posts
                .filter(post => post.status === 'published')
                .map(post => ({
                    url: `${this.siteUrl}/post/${post.slug}`,
                    lastmod: post.updated_at || post.created_at || new Date().toISOString(),
                    changefreq: 'weekly',
                    priority: '0.8'
                }));
        } catch (error) {
            console.error('로컬 포스트 데이터 로드 실패:', error);
            return [];
        }
    }

    /**
     * 정적 페이지 목록
     */
    getStaticPages() {
        return [
            {
                url: this.siteUrl,
                lastmod: new Date().toISOString(),
                changefreq: 'daily',
                priority: '1.0'
            },
            {
                url: `${this.siteUrl}/dashboard`,
                lastmod: new Date().toISOString(),
                changefreq: 'weekly',
                priority: '0.7'
            },
            {
                url: `${this.siteUrl}/writer`,
                lastmod: new Date().toISOString(),
                changefreq: 'monthly',
                priority: '0.6'
            }
        ];
    }

    /**
     * 카테고리 페이지 목록
     */
    getCategoryPages() {
        return this.categories.map(category => ({
            url: `${this.siteUrl}/?category=${encodeURIComponent(category)}`,
            lastmod: new Date().toISOString(),
            changefreq: 'weekly',
            priority: '0.7'
        }));
    }

    /**
     * XML 사이트맵 구조 생성
     */
    buildXMLSitemap(urls) {
        const urlEntries = urls.map(entry => `
    <url>
        <loc>${this.escapeXML(entry.url)}</loc>
        <lastmod>${entry.lastmod.split('T')[0]}</lastmod>
        <changefreq>${entry.changefreq}</changefreq>
        <priority>${entry.priority}</priority>
    </url>`).join('');

        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">${urlEntries}
</urlset>`;
    }

    /**
     * 기본 사이트맵 (fallback)
     */
    getBasicSitemap() {
        return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${this.siteUrl}</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
</urlset>`;
    }

    /**
     * XML 특수문자 이스케이프
     */
    escapeXML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * 사이트맵을 파일로 다운로드
     */
    async downloadSitemap() {
        const sitemap = await this.generateSitemap();
        const blob = new Blob([sitemap], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('사이트맵이 다운로드되었습니다.');
    }

    /**
     * 사이트맵 유효성 검사
     */
    async validateSitemap() {
        try {
            const sitemap = await this.generateSitemap();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(sitemap, 'application/xml');
            
            const parseError = xmlDoc.querySelector('parsererror');
            if (parseError) {
                throw new Error('XML 파싱 오류: ' + parseError.textContent);
            }
            
            const urls = xmlDoc.querySelectorAll('url');
            console.log(`사이트맵 유효성 검사 완료: ${urls.length}개 URL 발견`);
            return true;
        } catch (error) {
            console.error('사이트맵 유효성 검사 실패:', error);
            return false;
        }
    }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SitemapGenerator;
} else {
    window.SitemapGenerator = SitemapGenerator;
}