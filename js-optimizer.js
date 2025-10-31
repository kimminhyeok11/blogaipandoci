/**
 * JavaScript 최적화 시스템
 * Tree Shaking, Code Splitting, 동적 임포트, 번들 최적화
 */

class JSOptimizer {
    constructor() {
        this.loadedModules = new Map();
        this.moduleCache = new Map();
        this.dependencyGraph = new Map();
        this.criticalModules = new Set();
        this.isInitialized = false;
        this.performanceMetrics = {
            loadTimes: new Map(),
            bundleSizes: new Map(),
            executionTimes: new Map()
        };
    }

    /**
     * JavaScript 최적화 시스템 초기화
     */
    async init() {
        if (this.isInitialized) return;

        console.log('[JSOptimizer] JavaScript 최적화 시스템 초기화');
        
        // 중요 모듈 정의
        this.defineCriticalModules();
        
        // 동적 임포트 시스템 설정
        this.setupDynamicImports();
        
        // 코드 스플리팅 설정
        this.setupCodeSplitting();
        
        // 성능 모니터링 시작
        this.startPerformanceMonitoring();
        
        // 사용하지 않는 코드 감지
        this.detectUnusedCode();
        
        this.isInitialized = true;
        console.log('[JSOptimizer] 초기화 완료');
    }

    /**
     * 중요 모듈 정의
     */
    defineCriticalModules() {
        this.criticalModules = new Set([
            'supabase',
            'config',
            'state',
            'dom',
            'auth',
            'navigation'
        ]);
    }

    /**
     * 동적 임포트 시스템 설정
     */
    setupDynamicImports() {
        // 기존 Config의 SCRIPT_URLS를 활용한 동적 로딩
        this.moduleLoaders = {
            marked: () => this.loadScript('marked', window.Config?.SCRIPT_URLS?.marked),
            purify: () => this.loadScript('purify', window.Config?.SCRIPT_URLS?.purify),
            highlight: () => this.loadScript('highlight', window.Config?.SCRIPT_URLS?.highlight),
            exif: () => this.loadScript('exif', window.Config?.SCRIPT_URLS?.exif),
            turndown: () => this.loadScript('turndown', window.Config?.SCRIPT_URLS?.turndown),
            
            // 추가 최적화 모듈들
            imageOptimizer: () => this.loadModule('imageOptimizer'),
            schemaGenerator: () => this.loadModule('schemaGenerator'),
            performanceMonitor: () => this.loadModule('performanceMonitor'),
            cssOptimizer: () => this.loadModule('cssOptimizer')
        };
    }

    /**
     * 스크립트 동적 로딩
     */
    async loadScript(name, url) {
        if (!url) {
            console.warn(`[JSOptimizer] ${name} URL이 정의되지 않음`);
            return null;
        }

        if (this.loadedModules.has(name)) {
            return this.loadedModules.get(name);
        }

        const startTime = performance.now();
        
        try {
            const script = document.createElement('script');
            script.src = url;
            script.defer = true;
            
            const loadPromise = new Promise((resolve, reject) => {
                script.onload = () => {
                    const loadTime = performance.now() - startTime;
                    this.performanceMetrics.loadTimes.set(name, loadTime);
                    console.log(`[JSOptimizer] ${name} 로드 완료: ${loadTime.toFixed(2)}ms`);
                    resolve(window[name] || true);
                };
                script.onerror = () => reject(new Error(`${name} 로드 실패`));
            });

            document.head.appendChild(script);
            const result = await loadPromise;
            
            this.loadedModules.set(name, result);
            return result;
            
        } catch (error) {
            console.error(`[JSOptimizer] ${name} 로드 실패:`, error);
            return null;
        }
    }

    /**
     * 모듈 동적 로딩
     */
    async loadModule(name) {
        if (this.loadedModules.has(name)) {
            return this.loadedModules.get(name);
        }

        const startTime = performance.now();
        
        try {
            // 전역 객체에서 모듈 확인
            const module = window[name];
            if (module) {
                const loadTime = performance.now() - startTime;
                this.performanceMetrics.loadTimes.set(name, loadTime);
                this.loadedModules.set(name, module);
                return module;
            }
            
            throw new Error(`모듈 ${name}을 찾을 수 없음`);
            
        } catch (error) {
            console.error(`[JSOptimizer] ${name} 모듈 로드 실패:`, error);
            return null;
        }
    }

    /**
     * 코드 스플리팅 설정
     */
    setupCodeSplitting() {
        // 라우트 기반 코드 스플리팅
        this.setupRouteBasedSplitting();
        
        // 기능 기반 코드 스플리팅
        this.setupFeatureBasedSplitting();
        
        // 지연 로딩 설정
        this.setupLazyLoading();
    }

    /**
     * 라우트 기반 코드 스플리팅
     */
    setupRouteBasedSplitting() {
        const routeModules = {
            'home': ['imageOptimizer', 'schemaGenerator'],
            'post': ['marked', 'purify', 'highlight', 'schemaGenerator'],
            'admin': ['turndown', 'exif'],
            'dashboard': ['performanceMonitor']
        };

        // URL 변경 감지
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.handleRouteChange();
        };

        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.handleRouteChange();
        };

        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });

        // 초기 라우트 처리
        this.handleRouteChange();
    }

    /**
     * 라우트 변경 처리
     */
    async handleRouteChange() {
        const currentRoute = this.getCurrentRoute();
        const requiredModules = this.getRequiredModules(currentRoute);
        
        console.log(`[JSOptimizer] 라우트 변경: ${currentRoute}, 필요 모듈:`, requiredModules);
        
        // 필요한 모듈들을 병렬로 로드
        const loadPromises = requiredModules.map(module => 
            this.moduleLoaders[module] ? this.moduleLoaders[module]() : null
        ).filter(Boolean);

        try {
            await Promise.all(loadPromises);
            console.log(`[JSOptimizer] ${currentRoute} 라우트 모듈 로드 완료`);
        } catch (error) {
            console.error('[JSOptimizer] 라우트 모듈 로드 실패:', error);
        }
    }

    /**
     * 현재 라우트 감지
     */
    getCurrentRoute() {
        const params = new URLSearchParams(window.location.search);
        
        if (params.has('post')) return 'post';
        if (params.has('category')) return 'category';
        if (window.location.pathname.includes('admin')) return 'admin';
        if (params.has('dashboard')) return 'dashboard';
        
        return 'home';
    }

    /**
     * 라우트별 필요 모듈 반환
     */
    getRequiredModules(route) {
        const routeModules = {
            'home': ['imageOptimizer', 'schemaGenerator'],
            'post': ['marked', 'purify', 'highlight', 'schemaGenerator', 'imageOptimizer'],
            'category': ['imageOptimizer', 'schemaGenerator'],
            'admin': ['turndown', 'exif', 'imageOptimizer'],
            'dashboard': ['performanceMonitor']
        };

        return routeModules[route] || [];
    }

    /**
     * 기능 기반 코드 스플리팅
     */
    setupFeatureBasedSplitting() {
        // 사용자 상호작용에 따른 모듈 로딩
        this.setupInteractionBasedLoading();
        
        // 뷰포트 기반 로딩
        this.setupViewportBasedLoading();
    }

    /**
     * 상호작용 기반 로딩
     */
    setupInteractionBasedLoading() {
        // 안전한 matches 체크 함수
        const safeMatches = (element, selector) => {
            if (!element || typeof element.matches !== 'function') {
                return false;
            }
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        };

        // 댓글 기능 - 클릭 시 로드
        document.addEventListener('click', (e) => {
            if (safeMatches(e.target, '.comment-trigger, [data-comment]')) {
                this.loadModule('comments');
            }
        });

        // 공유 기능 - 호버 시 프리로드
        document.addEventListener('mouseenter', (e) => {
            if (safeMatches(e.target, '.share-button, [data-share]')) {
                this.loadModule('socialShare');
            }
        }, { once: true });

        // 다크모드 토글 - 첫 사용 시 로드
        document.addEventListener('click', (e) => {
            if (safeMatches(e.target, '.dark-mode-toggle, [data-dark-toggle]')) {
                this.loadModule('darkMode');
            }
        }, { once: true });
    }

    /**
     * 뷰포트 기반 로딩
     */
    setupViewportBasedLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const modules = element.dataset.modules?.split(',') || [];
                    
                    modules.forEach(module => {
                        if (this.moduleLoaders[module]) {
                            this.moduleLoaders[module]();
                        }
                    });
                    
                    observer.unobserve(element);
                }
            });
        }, { threshold: 0.1 });

        // 모듈 로딩이 필요한 요소들 관찰
        document.querySelectorAll('[data-modules]').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * 지연 로딩 설정
     */
    setupLazyLoading() {
        // 중요하지 않은 기능들을 지연 로딩
        setTimeout(() => {
            this.loadNonCriticalModules();
        }, 2000);

        // 아이들 시간에 추가 모듈 로딩
        this.setupIdleLoading();
    }

    /**
     * 중요하지 않은 모듈 로딩
     */
    async loadNonCriticalModules() {
        const nonCriticalModules = [
            'performanceMonitor',
            'cssOptimizer'
        ];

        for (const module of nonCriticalModules) {
            if (!this.loadedModules.has(module)) {
                await this.loadModule(module);
                // 각 모듈 사이에 약간의 지연
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    /**
     * 아이들 시간 로딩
     */
    setupIdleLoading() {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                this.loadNonCriticalModules();
            });
        } else {
            // 폴백: 타이머 사용
            setTimeout(() => {
                this.loadNonCriticalModules();
            }, 5000);
        }
    }

    /**
     * 성능 모니터링
     */
    startPerformanceMonitoring() {
        // 모듈 로드 시간 추적
        this.trackModuleLoadTimes();
        
        // 번들 크기 추적
        this.trackBundleSizes();
        
        // 실행 시간 추적
        this.trackExecutionTimes();
    }

    /**
     * 모듈 로드 시간 추적
     */
    trackModuleLoadTimes() {
        const originalLoadScript = this.loadScript.bind(this);
        
        this.loadScript = async function(name, url) {
            const startTime = performance.now();
            const result = await originalLoadScript(name, url);
            const endTime = performance.now();
            
            this.performanceMetrics.loadTimes.set(name, endTime - startTime);
            return result;
        }.bind(this);
    }

    /**
     * 번들 크기 추적
     */
    trackBundleSizes() {
        // Resource Timing API를 사용하여 스크립트 크기 추적
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                if (entry.initiatorType === 'script') {
                    const name = this.getScriptNameFromURL(entry.name);
                    if (name) {
                        this.performanceMetrics.bundleSizes.set(name, {
                            transferSize: entry.transferSize,
                            encodedBodySize: entry.encodedBodySize,
                            decodedBodySize: entry.decodedBodySize
                        });
                    }
                }
            });
        });

        observer.observe({ entryTypes: ['resource'] });
    }

    /**
     * 실행 시간 추적
     */
    trackExecutionTimes() {
        // 주요 함수들의 실행 시간 측정
        this.wrapFunctionWithTiming('init', this.init);
        this.wrapFunctionWithTiming('loadScript', this.loadScript);
        this.wrapFunctionWithTiming('loadModule', this.loadModule);
    }

    /**
     * 함수 실행 시간 래핑
     */
    wrapFunctionWithTiming(name, func) {
        return async function(...args) {
            const startTime = performance.now();
            const result = await func.apply(this, args);
            const endTime = performance.now();
            
            this.performanceMetrics.executionTimes.set(name, endTime - startTime);
            return result;
        }.bind(this);
    }

    /**
     * 사용하지 않는 코드 감지
     */
    detectUnusedCode() {
        // 로드된 모듈 중 실제 사용되지 않는 것들 감지
        setTimeout(() => {
            this.analyzeCodeUsage();
        }, 10000); // 10초 후 분석
    }

    /**
     * 코드 사용량 분석
     */
    analyzeCodeUsage() {
        const unusedModules = [];
        
        this.loadedModules.forEach((module, name) => {
            if (!this.criticalModules.has(name)) {
                // 모듈 사용 여부 확인 로직
                const isUsed = this.checkModuleUsage(name, module);
                if (!isUsed) {
                    unusedModules.push(name);
                }
            }
        });

        if (unusedModules.length > 0) {
            console.warn('[JSOptimizer] 사용되지 않는 모듈들:', unusedModules);
        }
    }

    /**
     * 모듈 사용 여부 확인
     */
    checkModuleUsage(name, module) {
        // 간단한 사용 여부 확인 로직
        // 실제로는 더 정교한 분석이 필요
        try {
            return typeof module === 'function' || 
                   (typeof module === 'object' && Object.keys(module).length > 0);
        } catch {
            return false;
        }
    }

    /**
     * URL에서 스크립트 이름 추출
     */
    getScriptNameFromURL(url) {
        const scriptNames = {
            'marked': 'marked',
            'purify': 'purify',
            'highlight': 'highlight',
            'exif': 'exif',
            'turndown': 'turndown'
        };

        for (const [key, name] of Object.entries(scriptNames)) {
            if (url.includes(key)) {
                return name;
            }
        }
        return null;
    }

    /**
     * 성능 통계 반환
     */
    getPerformanceStats() {
        return {
            loadedModules: Array.from(this.loadedModules.keys()),
            loadTimes: Object.fromEntries(this.performanceMetrics.loadTimes),
            bundleSizes: Object.fromEntries(this.performanceMetrics.bundleSizes),
            executionTimes: Object.fromEntries(this.performanceMetrics.executionTimes),
            totalModules: this.loadedModules.size,
            criticalModules: Array.from(this.criticalModules)
        };
    }

    /**
     * 모듈 프리로딩
     */
    async preloadModule(name) {
        if (this.moduleLoaders[name] && !this.loadedModules.has(name)) {
            console.log(`[JSOptimizer] ${name} 모듈 프리로딩`);
            return await this.moduleLoaders[name]();
        }
    }

    /**
     * 모듈 언로딩 (메모리 최적화)
     */
    unloadModule(name) {
        if (this.loadedModules.has(name) && !this.criticalModules.has(name)) {
            this.loadedModules.delete(name);
            console.log(`[JSOptimizer] ${name} 모듈 언로딩`);
        }
    }

    /**
     * 로드된 모듈 목록 반환
     */
    getLoadedModules() {
        const modules = [];
        this.loadedModules.forEach((module, name) => {
            modules.push({
                name: name,
                loadTime: this.performanceMetrics.loadTimes.get(name),
                size: this.performanceMetrics.bundleSizes.get(name),
                isCritical: this.criticalModules.has(name)
            });
        });
        return modules;
    }

    /**
     * 성능 메트릭 반환
     */
    getPerformanceMetrics() {
        return {
            totalModules: this.loadedModules.size,
            criticalModules: this.criticalModules.size,
            averageLoadTime: this.calculateAverageLoadTime(),
            totalBundleSize: this.calculateTotalBundleSize(),
            loadTimes: Object.fromEntries(this.performanceMetrics.loadTimes),
            bundleSizes: Object.fromEntries(this.performanceMetrics.bundleSizes),
            executionTimes: Object.fromEntries(this.performanceMetrics.executionTimes)
        };
    }

    /**
     * 평균 로드 시간 계산
     */
    calculateAverageLoadTime() {
        const times = Array.from(this.performanceMetrics.loadTimes.values());
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
    }

    /**
     * 총 번들 크기 계산
     */
    calculateTotalBundleSize() {
        const sizes = Array.from(this.performanceMetrics.bundleSizes.values());
        return sizes.reduce((a, b) => a + b, 0);
    }

    /**
     * 정리
     */
    cleanup() {
        this.loadedModules.clear();
        this.moduleCache.clear();
        this.dependencyGraph.clear();
        this.performanceMetrics.loadTimes.clear();
        this.performanceMetrics.bundleSizes.clear();
        this.performanceMetrics.executionTimes.clear();
        this.isInitialized = false;
    }
}

// 전역 인스턴스 생성 (강력한 보호)
let jsOptimizer;

// 더 엄격한 인스턴스 체크
if (window.JSOptimizer && 
    typeof window.JSOptimizer === 'object' && 
    window.JSOptimizer.constructor && 
    window.JSOptimizer.constructor.name === 'JSOptimizer' &&
    typeof window.JSOptimizer.getLoadedModules === 'function') {
    // 기존 인스턴스 사용
    jsOptimizer = window.JSOptimizer;
    console.log('=== 기존 JSOptimizer 인스턴스 재사용 ===');
} else {
    // 새 인스턴스 생성
    jsOptimizer = new JSOptimizer();
    console.log('=== 새 JSOptimizer 인스턴스 생성 ===');
    
    // 인스턴스를 전역에 노출
    window.JSOptimizer = jsOptimizer;
    window.JSOptimizerClass = JSOptimizer;
    window.jsOptimizer = jsOptimizer;
    
    // 즉시 초기화 시도
    try {
        jsOptimizer.init();
        console.log('JSOptimizer 즉시 초기화 완료');
    } catch (error) {
        console.warn('JSOptimizer 즉시 초기화 실패:', error);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                jsOptimizer.init();
            });
        } else {
            setTimeout(() => jsOptimizer.init(), 100);
        }
    }
}

// 전역에서 사용할 수 있도록 export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JSOptimizer;
} else {
    
    console.log('=== JSOptimizer 전역 노출 완료 ===');
    console.log('window.JSOptimizer 타입:', typeof window.JSOptimizer);
    console.log('window.JSOptimizer.getLoadedModules 타입:', typeof window.JSOptimizer.getLoadedModules);
    console.log('window.JSOptimizer 생성자:', window.JSOptimizer.constructor.name);
    console.log('인스턴스 확인:', window.JSOptimizer instanceof JSOptimizer);
    
    // 즉시 초기화 시도
    try {
        jsOptimizer.init();
        console.log('JSOptimizer 즉시 초기화 완료');
    } catch (error) {
        console.warn('JSOptimizer 즉시 초기화 실패:', error);
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                jsOptimizer.init();
            });
        } else {
            setTimeout(() => jsOptimizer.init(), 100);
        }
    }
}