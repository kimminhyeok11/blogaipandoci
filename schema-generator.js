/**
 * 구조화된 데이터 스키마 생성기
 * FAQ, BreadcrumbList, 기타 SEO 스키마 지원
 */

class SchemaGenerator {
    constructor() {
        this.schemas = new Map();
        this.isInitialized = false;
    }

    /**
     * 스키마 생성기 초기화
     */
    init() {
        if (this.isInitialized) return;

        console.log('[SchemaGenerator] 구조화된 데이터 스키마 생성기 초기화');
        
        // 기존 스키마 감지 및 관리
        this.detectExistingSchemas();
        
        // 동적 스키마 생성
        this.generateDynamicSchemas();
        
        this.isInitialized = true;
        console.log('[SchemaGenerator] 초기화 완료');
    }

    /**
     * 기존 스키마 감지
     */
    detectExistingSchemas() {
        const existingSchemas = document.querySelectorAll('script[type="application/ld+json"]');
        existingSchemas.forEach((script, index) => {
            try {
                const data = JSON.parse(script.textContent);
                this.schemas.set(`existing-${index}`, {
                    element: script,
                    data: data,
                    type: data['@type'] || 'Unknown'
                });
            } catch (error) {
                console.warn('[SchemaGenerator] 기존 스키마 파싱 실패:', error);
            }
        });
    }

    /**
     * FAQ 스키마 생성
     */
    generateFAQSchema(faqData) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqData.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }))
        };

        return this.addSchema('faq', schema);
    }

    /**
     * BreadcrumbList 스키마 생성
     */
    generateBreadcrumbSchema(breadcrumbs) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((item, index) => ({
                "@type": "ListItem",
                "position": index + 1,
                "name": item.name,
                "item": item.url
            }))
        };

        return this.addSchema('breadcrumb', schema);
    }

    /**
     * Article 스키마 생성 (블로그 포스트용)
     */
    generateArticleSchema(articleData) {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": articleData.title,
            "description": articleData.description,
            "image": articleData.image ? [articleData.image] : [],
            "author": {
                "@type": "Person",
                "name": articleData.author || "InsureLog",
                "url": articleData.authorUrl || window.location.origin
            },
            "publisher": {
                "@type": "Organization",
                "name": "InsureLog",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${window.location.origin}/assets/logo.png`
                }
            },
            "datePublished": articleData.publishDate,
            "dateModified": articleData.modifiedDate || articleData.publishDate,
            "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": window.location.href
            }
        };

        // 읽기 시간 추가
        if (articleData.readingTime) {
            schema.timeRequired = `PT${articleData.readingTime}M`;
        }

        // 카테고리 추가
        if (articleData.category) {
            schema.articleSection = articleData.category;
        }

        // 태그 추가
        if (articleData.tags && articleData.tags.length > 0) {
            schema.keywords = articleData.tags.join(', ');
        }

        return this.addSchema('article', schema);
    }

    /**
     * WebSite 스키마 생성
     */
    generateWebSiteSchema() {
        const schema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "InsureLog",
            "description": "보험 정보와 금융 지식을 공유하는 블로그",
            "url": window.location.origin,
            "potentialAction": {
                "@type": "SearchAction",
                "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": `${window.location.origin}/?search={search_term_string}`
                },
                "query-input": "required name=search_term_string"
            },
            "publisher": {
                "@type": "Organization",
                "name": "InsureLog",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${window.location.origin}/assets/logo.png`
                }
            }
        };

        return this.addSchema('website', schema);
    }

    /**
     * Organization 스키마 생성
     */
    generateOrganizationSchema() {
        const schema = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "InsureLog",
            "description": "보험 정보와 금융 지식을 공유하는 블로그",
            "url": window.location.origin,
            "logo": {
                "@type": "ImageObject",
                "url": `${window.location.origin}/assets/logo.png`
            },
            "sameAs": [
                "https://twitter.com/insure_log",
                "https://facebook.com/insure.log",
                "https://instagram.com/insure_log"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "email": "contact@insurelog.com"
            }
        };

        return this.addSchema('organization', schema);
    }

    /**
     * 페이지별 동적 스키마 생성
     */
    generateDynamicSchemas() {
        const currentPath = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);

        // 홈페이지
        if (currentPath === '/' && !searchParams.has('post')) {
            this.generateWebSiteSchema();
            this.generateOrganizationSchema();
            this.generateHomepageFAQ();
        }

        // 포스트 페이지
        if (searchParams.has('post')) {
            this.generatePostSchemas();
        }

        // 카테고리 페이지
        if (searchParams.has('category')) {
            this.generateCategorySchemas();
        }

        // 브레드크럼 생성 (모든 페이지)
        this.generatePageBreadcrumb();
    }

    /**
     * 홈페이지 FAQ 생성
     */
    generateHomepageFAQ() {
        const faqData = [
            {
                question: "InsureLog는 어떤 사이트인가요?",
                answer: "InsureLog는 보험 정보와 금융 지식을 공유하는 블로그입니다. 보험 상품 비교, 금융 팁, 투자 정보 등을 제공합니다."
            },
            {
                question: "보험 상품을 어떻게 비교할 수 있나요?",
                answer: "저희 사이트에서는 다양한 보험 상품의 특징, 보장 내용, 보험료 등을 상세히 비교 분석한 글을 제공합니다. 카테고리별로 정리되어 있어 쉽게 찾아보실 수 있습니다."
            },
            {
                question: "최신 보험 정보는 어떻게 확인하나요?",
                answer: "홈페이지 메인에서 최신 포스트를 확인하거나, 카테고리별로 분류된 글을 통해 최신 보험 정보를 얻을 수 있습니다."
            },
            {
                question: "보험 관련 질문이 있으면 어떻게 하나요?",
                answer: "각 포스트 하단의 댓글 기능을 통해 질문을 남겨주시면, 전문가가 답변을 드립니다."
            },
            {
                question: "모바일에서도 이용할 수 있나요?",
                answer: "네, InsureLog는 반응형 웹사이트로 제작되어 PC, 태블릿, 모바일 등 모든 기기에서 최적화된 환경으로 이용하실 수 있습니다."
            }
        ];

        this.generateFAQSchema(faqData);
    }

    /**
     * 포스트 스키마 생성
     */
    generatePostSchemas() {
        // 현재 포스트 정보 수집
        const postData = this.extractPostData();
        if (postData) {
            this.generateArticleSchema(postData);
        }
    }

    /**
     * 카테고리 스키마 생성
     */
    generateCategorySchemas() {
        const category = new URLSearchParams(window.location.search).get('category');
        if (!category) return;

        // 카테고리별 FAQ 생성
        const categoryFAQ = this.getCategoryFAQ(category);
        if (categoryFAQ.length > 0) {
            this.generateFAQSchema(categoryFAQ);
        }
    }

    /**
     * 페이지 브레드크럼 생성
     */
    generatePageBreadcrumb() {
        const breadcrumbs = this.buildBreadcrumbs();
        if (breadcrumbs.length > 1) {
            this.generateBreadcrumbSchema(breadcrumbs);
        }
    }

    /**
     * 브레드크럼 구조 생성
     */
    buildBreadcrumbs() {
        const breadcrumbs = [
            { name: "홈", url: window.location.origin }
        ];

        const searchParams = new URLSearchParams(window.location.search);
        
        // 카테고리 페이지
        if (searchParams.has('category')) {
            const category = searchParams.get('category');
            const categoryName = this.getCategoryDisplayName(category);
            breadcrumbs.push({
                name: categoryName,
                url: `${window.location.origin}/?category=${category}`
            });
        }

        // 포스트 페이지
        if (searchParams.has('post')) {
            const postTitle = document.querySelector('h1')?.textContent || '포스트';
            breadcrumbs.push({
                name: postTitle,
                url: window.location.href
            });
        }

        return breadcrumbs;
    }

    /**
     * 카테고리 표시명 반환
     */
    getCategoryDisplayName(category) {
        const categoryMap = {
            'life-insurance': '생명보험',
            'car-insurance': '자동차보험',
            'health-insurance': '건강보험',
            'property-insurance': '재산보험',
            'investment': '투자',
            'finance': '금융',
            'tips': '팁'
        };
        return categoryMap[category] || category;
    }

    /**
     * 카테고리별 FAQ 반환
     */
    getCategoryFAQ(category) {
        const faqMap = {
            'life-insurance': [
                {
                    question: "생명보험은 언제 가입하는 것이 좋나요?",
                    answer: "생명보험은 가능한 한 젊고 건강할 때 가입하는 것이 유리합니다. 나이가 어릴수록 보험료가 저렴하고, 건강 상태가 좋을 때 가입 조건이 유리하기 때문입니다."
                },
                {
                    question: "생명보험 보장금액은 어떻게 정하나요?",
                    answer: "일반적으로 연소득의 5-10배 정도를 권장하며, 가족 구성원, 부채 규모, 생활비 등을 종합적으로 고려하여 결정해야 합니다."
                }
            ],
            'car-insurance': [
                {
                    question: "자동차보험 의무가입 항목은 무엇인가요?",
                    answer: "대인배상Ⅰ(2억원), 대물배상(2천만원), 자기신체사고(1천5백만원)가 의무가입 항목입니다."
                },
                {
                    question: "자동차보험료를 절약하는 방법은?",
                    answer: "안전운전으로 할인 혜택을 받고, 불필요한 특약을 제외하며, 여러 보험사의 견적을 비교하여 선택하는 것이 좋습니다."
                }
            ]
        };

        return faqMap[category] || [];
    }

    /**
     * 현재 포스트 데이터 추출
     */
    extractPostData() {
        const title = document.querySelector('h1')?.textContent;
        const description = document.querySelector('meta[name="description"]')?.content;
        const image = document.querySelector('meta[property="og:image"]')?.content;
        
        if (!title) return null;

        return {
            title: title,
            description: description || '',
            image: image || '',
            author: 'InsureLog',
            publishDate: new Date().toISOString(),
            readingTime: this.calculateReadingTime(),
            category: new URLSearchParams(window.location.search).get('category'),
            tags: this.extractTags()
        };
    }

    /**
     * 읽기 시간 계산
     */
    calculateReadingTime() {
        const content = document.querySelector('.post-content, .content, main')?.textContent || '';
        const wordsPerMinute = 200; // 한국어 기준
        const wordCount = content.length / 2; // 한글 기준 대략적 계산
        return Math.ceil(wordCount / wordsPerMinute);
    }

    /**
     * 태그 추출
     */
    extractTags() {
        const tagElements = document.querySelectorAll('.tag, .tags a, [data-tag]');
        return Array.from(tagElements).map(el => el.textContent.trim()).filter(Boolean);
    }

    /**
     * 스키마 추가
     */
    addSchema(id, schema) {
        // 기존 스키마 제거
        if (this.schemas.has(id)) {
            const existing = this.schemas.get(id);
            if (existing.element && existing.element.parentNode) {
                existing.element.parentNode.removeChild(existing.element);
            }
        }

        // 새 스키마 요소 생성
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema, null, 2);
        
        // head에 추가
        document.head.appendChild(script);

        // 스키마 저장
        this.schemas.set(id, {
            element: script,
            data: schema,
            type: schema['@type']
        });

        console.log(`[SchemaGenerator] ${schema['@type']} 스키마 추가됨:`, id);
        return script;
    }

    /**
     * 스키마 제거
     */
    removeSchema(id) {
        if (this.schemas.has(id)) {
            const schema = this.schemas.get(id);
            if (schema.element && schema.element.parentNode) {
                schema.element.parentNode.removeChild(schema.element);
            }
            this.schemas.delete(id);
            console.log(`[SchemaGenerator] 스키마 제거됨:`, id);
        }
    }

    /**
     * 모든 스키마 조회
     */
    getAllSchemas() {
        const result = {};
        this.schemas.forEach((schema, id) => {
            result[id] = {
                type: schema.type,
                data: schema.data
            };
        });
        return result;
    }

    /**
     * 스키마 유효성 검사
     */
    validateSchema(schema) {
        try {
            // 기본 필수 필드 확인
            if (!schema['@context'] || !schema['@type']) {
                return { valid: false, error: '@context 또는 @type이 누락됨' };
            }

            // JSON 직렬화 가능 여부 확인
            JSON.stringify(schema);
            
            return { valid: true };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    /**
     * 생성된 스키마 목록 반환
     */
    getGeneratedSchemas() {
        const schemaList = [];
        this.schemas.forEach((schema, id) => {
            schemaList.push({
                id: id,
                type: schema.type,
                data: schema.data
            });
        });
        return schemaList;
    }

    /**
     * 스키마 테스트 도구 URL 생성
     */
    getTestUrl() {
        const currentUrl = encodeURIComponent(window.location.href);
        return `https://search.google.com/test/rich-results?url=${currentUrl}`;
    }

    /**
     * 정리
     */
    cleanup() {
        this.schemas.forEach((schema, id) => {
            this.removeSchema(id);
        });
        this.schemas.clear();
        this.isInitialized = false;
    }
}

// 전역 인스턴스 생성 (강력한 보호)
let schemaGenerator;

// 더 엄격한 인스턴스 체크
if (window.SchemaGenerator && 
    typeof window.SchemaGenerator === 'object' && 
    window.SchemaGenerator.constructor && 
    window.SchemaGenerator.constructor.name === 'SchemaGenerator' &&
    typeof window.SchemaGenerator.getGeneratedSchemas === 'function') {
    // 기존 인스턴스 사용
    schemaGenerator = window.SchemaGenerator;
    console.log('=== 기존 SchemaGenerator 인스턴스 재사용 ===');
} else {
    // 새 인스턴스 생성
    schemaGenerator = new SchemaGenerator();
    console.log('=== 새 SchemaGenerator 인스턴스 생성 ===');
    
    // 인스턴스를 전역에 노출
    window.SchemaGenerator = schemaGenerator;
    window.SchemaGeneratorClass = SchemaGenerator;
    window.schemaGenerator = schemaGenerator;
    
    // 즉시 초기화 시도
    try {
        schemaGenerator.init();
        console.log('SchemaGenerator 즉시 초기화 완료');
    } catch (error) {
        console.warn('SchemaGenerator 즉시 초기화 실패:', error);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                schemaGenerator.init();
            });
        } else {
            setTimeout(() => schemaGenerator.init(), 100);
        }
    }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchemaGenerator;
} else {
    
    console.log('=== SchemaGenerator 전역 노출 완료 ===');
    console.log('window.SchemaGenerator 타입:', typeof window.SchemaGenerator);
    console.log('window.SchemaGenerator.getGeneratedSchemas 타입:', typeof window.SchemaGenerator.getGeneratedSchemas);
    console.log('window.SchemaGenerator 생성자:', window.SchemaGenerator.constructor.name);
    console.log('인스턴스 확인:', window.SchemaGenerator instanceof SchemaGenerator);
    
    // 즉시 초기화 시도
    try {
        schemaGenerator.init();
        console.log('SchemaGenerator 즉시 초기화 완료');
    } catch (error) {
        console.warn('SchemaGenerator 즉시 초기화 실패:', error);
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                schemaGenerator.init();
            });
        } else {
            setTimeout(() => schemaGenerator.init(), 100);
        }
    }
}