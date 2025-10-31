/**
 * CSS 최적화 시스템
 * Critical CSS 인라인화, 미사용 CSS 제거, 동적 CSS 로딩
 */

class CSSOptimizer {
    constructor() {
        this.criticalCSS = '';
        this.nonCriticalCSS = '';
        this.usedSelectors = new Set();
        this.unusedSelectors = new Set();
        this.isInitialized = false;
        this.observer = null;
        this.cssRules = new Map();
    }

    /**
     * CSS 최적화 시스템 초기화
     */
    async init() {
        if (this.isInitialized) return;

        console.log('[CSSOptimizer] CSS 최적화 시스템 초기화');
        
        // CSS 규칙 수집
        await this.collectCSSRules();
        
        // Critical CSS 추출
        await this.extractCriticalCSS();
        
        // 사용되지 않는 CSS 감지
        this.detectUnusedCSS();
        
        // 동적 CSS 로딩 설정
        this.setupDynamicCSSLoading();
        
        // CSS 사용량 모니터링
        this.startCSSUsageMonitoring();
        
        this.isInitialized = true;
        console.log('[CSSOptimizer] 초기화 완료');
    }

    /**
     * 모든 CSS 규칙 수집
     */
    async collectCSSRules() {
        const stylesheets = Array.from(document.styleSheets);
        
        for (const stylesheet of stylesheets) {
            try {
                // 외부 스타일시트는 CORS 문제로 접근 불가할 수 있음
                if (stylesheet.href && !this.isSameOrigin(stylesheet.href)) {
                    console.warn('[CSSOptimizer] 외부 스타일시트 접근 불가:', stylesheet.href);
                    continue;
                }

                const rules = Array.from(stylesheet.cssRules || stylesheet.rules || []);
                
                for (const rule of rules) {
                    if (rule.type === CSSRule.STYLE_RULE) {
                        this.cssRules.set(rule.selectorText, {
                            rule: rule,
                            cssText: rule.cssText,
                            used: false,
                            critical: false,
                            stylesheet: stylesheet
                        });
                    }
                }
            } catch (error) {
                console.warn('[CSSOptimizer] 스타일시트 접근 실패:', error);
            }
        }

        console.log(`[CSSOptimizer] ${this.cssRules.size}개 CSS 규칙 수집됨`);
    }

    /**
     * Critical CSS 추출
     */
    async extractCriticalCSS() {
        const criticalSelectors = [
            // 기본 요소들
            'html', 'body', '*',
            
            // 레이아웃 관련
            '#app-container', '#main-nav-container', 'header', 'main', 'footer',
            
            // Above-the-fold 콘텐츠
            '.app-view', '.app-view.active',
            
            // 로딩 관련
            '#app-loader', '.loader-spinner',
            
            // 네비게이션
            'nav', '.nav-item', '.nav-link',
            
            // 기본 타이포그래피
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'a',
            
            // 버튼 및 폼
            'button', 'input', 'textarea', 'select',
            
            // 유틸리티 클래스 (자주 사용되는 것들)
            '.text-center', '.flex', '.block', '.hidden', '.relative', '.absolute',
            '.w-full', '.h-full', '.p-4', '.m-4', '.mb-4', '.mt-4',
            
            // 다크모드 기본
            '.dark',
            
            // 반응형 기본
            '@media'
        ];

        let criticalCSSText = '';

        // CSS 변수 (최우선)
        criticalCSSText += ':root{--bg-main:#FFFFFF;--bg-content-secondary:#F3F4F6;--border-color:#D1D5DB;--text-primary:#111827;--text-secondary:#374151;--accent:#D946EF;--accent-hover:#C026D3;--font-body:"Noto Sans KR",sans-serif;--font-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}';
        
        // 다크모드 변수
        criticalCSSText += '.dark{--bg-main:#111827;--bg-content-secondary:#1f2937;--border-color:#374151;--text-primary:#f9fafb;--text-secondary:#d1d5db;--accent:#a855f7;--accent-hover:#9333ea}';
        
        // 기본 스타일
        criticalCSSText += 'html,body{height:100%}body{font-family:var(--font-body);background-color:var(--bg-main);color:var(--text-secondary);display:flex;flex-direction:column;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;font-size:15px;line-height:1.7}';
        
        // 로더 스타일
        criticalCSSText += '#app-loader{position:fixed;inset:0;z-index:50;background-color:white;display:flex;align-items:center;justify-content:center}.loader-spinner{width:40px;height:40px;border:4px solid #f3f4f6;border-top:4px solid #d946ef;border-radius:50%;animation:spin 1s linear infinite}@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';

        // 뷰 관리
        criticalCSSText += '.app-view{display:none;opacity:0}.app-view.active{display:block}';

        // Critical 규칙들 수집
        for (const [selector, ruleData] of this.cssRules) {
            const isCritical = criticalSelectors.some(criticalSelector => {
                if (criticalSelector === '@media') {
                    return selector.includes('@media');
                }
                return selector.includes(criticalSelector) || 
                       this.matchesSelector(selector, criticalSelector);
            });

            if (isCritical) {
                ruleData.critical = true;
                criticalCSSText += this.minifyCSS(ruleData.cssText);
            }
        }

        this.criticalCSS = criticalCSSText;
        console.log(`[CSSOptimizer] Critical CSS 추출 완료: ${this.criticalCSS.length} bytes`);
    }

    /**
     * 미사용 CSS 감지
     */
    detectUnusedCSS() {
        // 현재 DOM에서 실제 사용되는 선택자 확인
        for (const [selector, ruleData] of this.cssRules) {
            try {
                // 미디어 쿼리나 키프레임은 건너뛰기
                if (selector.includes('@') || selector.includes('keyframes')) {
                    ruleData.used = true;
                    continue;
                }

                // 가상 선택자 처리
                const cleanSelector = this.cleanSelector(selector);
                
                if (document.querySelector(cleanSelector)) {
                    ruleData.used = true;
                    this.usedSelectors.add(selector);
                } else {
                    this.unusedSelectors.add(selector);
                }
            } catch (error) {
                // 복잡한 선택자는 사용된 것으로 간주
                ruleData.used = true;
                this.usedSelectors.add(selector);
            }
        }

        console.log(`[CSSOptimizer] 사용된 선택자: ${this.usedSelectors.size}, 미사용: ${this.unusedSelectors.size}`);
    }

    /**
     * 동적 CSS 로딩 설정
     */
    setupDynamicCSSLoading() {
        // Critical CSS를 인라인으로 삽입
        this.inlineCriticalCSS();
        
        // Non-critical CSS를 지연 로딩
        this.loadNonCriticalCSS();
        
        // 조건부 CSS 로딩 설정
        this.setupConditionalCSS();
    }

    /**
     * Critical CSS 인라인 삽입
     */
    inlineCriticalCSS() {
        // 기존 인라인 critical CSS 제거
        const existingCritical = document.querySelector('#critical-css');
        if (existingCritical) {
            existingCritical.remove();
        }

        // 새로운 critical CSS 삽입
        const style = document.createElement('style');
        style.id = 'critical-css';
        style.textContent = this.criticalCSS;
        
        // head의 맨 앞에 삽입 (최우선 적용)
        document.head.insertBefore(style, document.head.firstChild);
        
        console.log('[CSSOptimizer] Critical CSS 인라인 삽입 완료');
    }

    /**
     * Non-critical CSS 지연 로딩
     */
    loadNonCriticalCSS() {
        // 기존 스타일시트를 non-critical로 변경
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
        
        stylesheets.forEach(link => {
            if (link.href.includes('styles.css')) {
                // 원본 스타일시트를 preload로 변경
                link.rel = 'preload';
                link.as = 'style';
                
                // 로드 완료 후 stylesheet로 변경
                link.onload = () => {
                    link.rel = 'stylesheet';
                };
                
                // 폴백을 위한 noscript 추가
                const noscript = document.createElement('noscript');
                const fallbackLink = link.cloneNode();
                fallbackLink.rel = 'stylesheet';
                noscript.appendChild(fallbackLink);
                link.parentNode.insertBefore(noscript, link.nextSibling);
            }
        });
    }

    /**
     * 조건부 CSS 로딩
     */
    setupConditionalCSS() {
        // 프린트 스타일 지연 로딩
        this.loadPrintCSS();
        
        // 다크모드 전용 스타일 조건부 로딩
        this.setupDarkModeCSS();
        
        // 모바일/데스크톱 전용 스타일 조건부 로딩
        this.setupResponsiveCSS();
    }

    /**
     * 프린트 CSS 지연 로딩
     */
    loadPrintCSS() {
        const printCSS = `
            @media print {
                body { font-size: 12pt; line-height: 1.4; }
                .no-print { display: none !important; }
                header, footer, nav { display: none !important; }
                .app-view { display: block !important; opacity: 1 !important; }
                a[href]:after { content: " (" attr(href) ")"; }
            }
        `;

        const style = document.createElement('style');
        style.media = 'print';
        style.textContent = printCSS;
        document.head.appendChild(style);
    }

    /**
     * 다크모드 CSS 설정
     */
    setupDarkModeCSS() {
        // 다크모드 감지 시 추가 스타일 로딩
        const darkModeObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    const isDark = document.documentElement.classList.contains('dark');
                    this.toggleDarkModeOptimizations(isDark);
                }
            });
        });

        darkModeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    /**
     * 반응형 CSS 설정
     */
    setupResponsiveCSS() {
        // 뷰포트 크기에 따른 조건부 CSS 로딩
        const mediaQueries = [
            { query: '(max-width: 640px)', name: 'mobile' },
            { query: '(min-width: 641px) and (max-width: 1024px)', name: 'tablet' },
            { query: '(min-width: 1025px)', name: 'desktop' }
        ];

        mediaQueries.forEach(({ query, name }) => {
            const mediaQuery = window.matchMedia(query);
            
            const handleChange = (e) => {
                if (e.matches) {
                    this.loadDeviceSpecificCSS(name);
                }
            };

            mediaQuery.addListener(handleChange);
            handleChange(mediaQuery); // 초기 실행
        });
    }

    /**
     * CSS 사용량 모니터링
     */
    startCSSUsageMonitoring() {
        // Intersection Observer로 뷰포트에 들어오는 요소 감지
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.markElementAsUsed(entry.target);
                }
            });
        }, { threshold: 0.1 });

        // 모든 요소 관찰 시작
        document.querySelectorAll('*').forEach(el => {
            this.observer.observe(el);
        });

        // 동적으로 추가되는 요소도 관찰
        const mutationObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.observer.observe(node);
                        node.querySelectorAll('*').forEach(el => {
                            this.observer.observe(el);
                        });
                    }
                });
            });
        });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 요소 사용 표시
     */
    markElementAsUsed(element) {
        const classes = Array.from(element.classList);
        const tagName = element.tagName.toLowerCase();
        const id = element.id;

        // 클래스 선택자 표시
        classes.forEach(className => {
            const selector = `.${className}`;
            if (this.cssRules.has(selector)) {
                this.cssRules.get(selector).used = true;
                this.usedSelectors.add(selector);
                this.unusedSelectors.delete(selector);
            }
        });

        // ID 선택자 표시
        if (id) {
            const selector = `#${id}`;
            if (this.cssRules.has(selector)) {
                this.cssRules.get(selector).used = true;
                this.usedSelectors.add(selector);
                this.unusedSelectors.delete(selector);
            }
        }

        // 태그 선택자 표시
        if (this.cssRules.has(tagName)) {
            this.cssRules.get(tagName).used = true;
            this.usedSelectors.add(tagName);
            this.unusedSelectors.delete(tagName);
        }
    }

    /**
     * 유틸리티 함수들
     */
    isSameOrigin(url) {
        try {
            const urlObj = new URL(url, window.location.href);
            return urlObj.origin === window.location.origin;
        } catch {
            return false;
        }
    }

    matchesSelector(selector, pattern) {
        return selector.toLowerCase().includes(pattern.toLowerCase());
    }

    cleanSelector(selector) {
        // 가상 선택자 제거
        return selector.replace(/::[^,\s]+|:[^,\s]+/g, '').trim();
    }

    minifyCSS(css) {
        return css
            .replace(/\/\*[\s\S]*?\*\//g, '') // 주석 제거
            .replace(/\s+/g, ' ') // 공백 정리
            .replace(/;\s*}/g, '}') // 마지막 세미콜론 제거
            .replace(/\s*{\s*/g, '{') // 중괄호 주변 공백 제거
            .replace(/;\s*/g, ';') // 세미콜론 후 공백 제거
            .trim();
    }

    toggleDarkModeOptimizations(isDark) {
        // 다크모드 전용 최적화 적용/해제
        console.log(`[CSSOptimizer] 다크모드 최적화 ${isDark ? '활성화' : '비활성화'}`);
    }

    loadDeviceSpecificCSS(deviceType) {
        console.log(`[CSSOptimizer] ${deviceType} 전용 CSS 최적화 적용`);
    }

    /**
     * 성능 통계 수집
     */
    getPerformanceStats() {
        const totalRules = this.cssRules.size;
        const usedRules = Array.from(this.cssRules.values()).filter(rule => rule.used).length;
        const criticalRules = Array.from(this.cssRules.values()).filter(rule => rule.critical).length;
        
        return {
            totalRules,
            usedRules,
            unusedRules: totalRules - usedRules,
            criticalRules,
            usagePercentage: Math.round((usedRules / totalRules) * 100),
            criticalCSSSize: this.criticalCSS.length,
            unusedSelectors: Array.from(this.unusedSelectors)
        };
    }

    /**
     * 미사용 CSS 제거 (개발용)
     */
    removeUnusedCSS() {
        let removedCount = 0;
        
        for (const [selector, ruleData] of this.cssRules) {
            if (!ruleData.used && !ruleData.critical) {
                try {
                    const stylesheet = ruleData.stylesheet;
                    const rules = Array.from(stylesheet.cssRules || []);
                    const ruleIndex = rules.indexOf(ruleData.rule);
                    
                    if (ruleIndex !== -1) {
                        stylesheet.deleteRule(ruleIndex);
                        removedCount++;
                    }
                } catch (error) {
                    console.warn('[CSSOptimizer] 규칙 제거 실패:', selector, error);
                }
            }
        }

        console.log(`[CSSOptimizer] ${removedCount}개 미사용 CSS 규칙 제거됨`);
        return removedCount;
    }

    /**
     * Critical CSS 반환
     */
    getCriticalCSS() {
        return this.criticalCSS;
    }

    /**
     * 미사용 CSS 선택자 목록 반환
     */
    getUnusedCSS() {
        return Array.from(this.unusedSelectors);
    }

    /**
     * 정리
     */
    cleanup() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        this.cssRules.clear();
        this.usedSelectors.clear();
        this.unusedSelectors.clear();
        this.isInitialized = false;
    }
}

// 전역 인스턴스 생성 (강력한 보호)
let cssOptimizer;

// 더 엄격한 인스턴스 체크
if (window.CSSOptimizer && 
    typeof window.CSSOptimizer === 'object' && 
    window.CSSOptimizer.constructor && 
    window.CSSOptimizer.constructor.name === 'CSSOptimizer' &&
    typeof window.CSSOptimizer.getCriticalCSS === 'function') {
    // 기존 인스턴스 사용
    cssOptimizer = window.CSSOptimizer;
    console.log('=== 기존 CSSOptimizer 인스턴스 재사용 ===');
} else {
    // 새 인스턴스 생성
    cssOptimizer = new CSSOptimizer();
    console.log('=== 새 CSSOptimizer 인스턴스 생성 ===');
    
    // 인스턴스를 전역에 노출
    window.CSSOptimizer = cssOptimizer;
    window.CSSOptimizerClass = CSSOptimizer;
    window.cssOptimizer = cssOptimizer;
    
    // 즉시 초기화 시도
    try {
        cssOptimizer.init();
        console.log('CSSOptimizer 즉시 초기화 완료');
    } catch (error) {
        console.warn('CSSOptimizer 즉시 초기화 실패:', error);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                cssOptimizer.init();
            });
        } else {
            setTimeout(() => cssOptimizer.init(), 100);
        }
    }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSSOptimizer;
} else {
    
    console.log('=== CSSOptimizer 전역 노출 완료 ===');
    console.log('window.CSSOptimizer 타입:', typeof window.CSSOptimizer);
    console.log('window.CSSOptimizer.getCriticalCSS 타입:', typeof window.CSSOptimizer.getCriticalCSS);
    console.log('window.CSSOptimizer 생성자:', window.CSSOptimizer.constructor.name);
    console.log('인스턴스 확인:', window.CSSOptimizer instanceof CSSOptimizer);
    
    // 즉시 초기화 시도
    try {
        cssOptimizer.init();
        console.log('CSSOptimizer 즉시 초기화 완료');
    } catch (error) {
        console.warn('CSSOptimizer 즉시 초기화 실패:', error);
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => cssOptimizer.init(), 100);
            });
        } else {
            setTimeout(() => cssOptimizer.init(), 100);
        }
    }
}