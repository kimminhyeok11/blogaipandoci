/**
 * 번들 크기 분석 및 최적화 시스템
 * 웹 애플리케이션의 리소스 사용량을 분석하고 최적화 제안을 제공
 */

class BundleAnalyzer {
    constructor() {
        this.resources = new Map();
        this.performanceMetrics = {};
        this.optimizationSuggestions = [];
        this.thresholds = {
            js: 250 * 1024,      // 250KB
            css: 100 * 1024,     // 100KB
            image: 500 * 1024,   // 500KB
            font: 200 * 1024,    // 200KB
            total: 2 * 1024 * 1024 // 2MB
        };
        
        this.init();
    }

    /**
     * 번들 분석기 초기화
     */
    async init() {
        try {
            await this.analyzeCurrentResources();
            this.setupPerformanceMonitoring();
            this.analyzeNetworkUsage();
            this.generateOptimizationSuggestions();
            console.log('BundleAnalyzer: 초기화 완료');
        } catch (error) {
            console.error('BundleAnalyzer: 초기화 실패', error);
        }
    }

    /**
     * 현재 리소스 분석
     */
    async analyzeCurrentResources() {
        // Performance API를 사용한 리소스 분석
        if ('performance' in window && 'getEntriesByType' in performance) {
            const resources = performance.getEntriesByType('resource');
            
            resources.forEach(resource => {
                this.analyzeResource(resource);
            });
        }

        // DOM에서 직접 리소스 분석
        await this.analyzeDOMResources();
        
        // 동적으로 로드된 스크립트 분석
        this.analyzeDynamicScripts();
    }

    /**
     * 개별 리소스 분석
     */
    analyzeResource(resource) {
        const url = new URL(resource.name);
        const extension = this.getFileExtension(url.pathname);
        const size = resource.transferSize || resource.encodedBodySize || 0;
        const loadTime = resource.responseEnd - resource.requestStart;
        
        const resourceInfo = {
            url: resource.name,
            type: this.getResourceType(extension),
            size: size,
            compressedSize: resource.transferSize || 0,
            uncompressedSize: resource.decodedBodySize || 0,
            loadTime: loadTime,
            cached: resource.transferSize === 0 && resource.decodedBodySize > 0,
            extension: extension,
            domain: url.hostname,
            critical: this.isCriticalResource(resource.name),
            timestamp: Date.now()
        };

        this.resources.set(resource.name, resourceInfo);
    }

    /**
     * DOM 리소스 분석
     */
    async analyzeDOMResources() {
        // 스크립트 태그 분석
        document.querySelectorAll('script[src]').forEach(script => {
            this.analyzeDOMElement(script, 'script');
        });

        // 스타일시트 분석
        document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            this.analyzeDOMElement(link, 'stylesheet');
        });

        // 이미지 분석
        document.querySelectorAll('img[src]').forEach(img => {
            this.analyzeDOMElement(img, 'image');
        });

        // 폰트 분석
        document.querySelectorAll('link[rel="preload"][as="font"]').forEach(font => {
            this.analyzeDOMElement(font, 'font');
        });
    }

    /**
     * DOM 요소 분석
     */
    analyzeDOMElement(element, type) {
        const src = element.src || element.href;
        if (!src) return;

        // 이미 분석된 리소스는 스킵
        if (this.resources.has(src)) return;

        const resourceInfo = {
            url: src,
            type: type,
            size: 0, // DOM에서는 크기를 직접 알 수 없음
            element: element.tagName.toLowerCase(),
            async: element.async || false,
            defer: element.defer || false,
            critical: this.isCriticalResource(src),
            timestamp: Date.now()
        };

        this.resources.set(src, resourceInfo);
    }

    /**
     * 동적 스크립트 분석
     */
    analyzeDynamicScripts() {
        // Config.SCRIPT_URLS에서 동적 스크립트 분석
        if (typeof Config !== 'undefined' && Config.SCRIPT_URLS) {
            Object.entries(Config.SCRIPT_URLS).forEach(([name, url]) => {
                if (!this.resources.has(url)) {
                    const resourceInfo = {
                        url: url,
                        type: 'script',
                        name: name,
                        size: 0,
                        dynamic: true,
                        critical: ['marked', 'purify'].includes(name),
                        timestamp: Date.now()
                    };
                    
                    this.resources.set(url, resourceInfo);
                }
            });
        }
    }

    /**
     * 성능 모니터링 설정
     */
    setupPerformanceMonitoring() {
        // Resource Timing API 모니터링
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.analyzeResource(entry);
                }
            });

            observer.observe({ entryTypes: ['resource'] });
        }

        // Navigation Timing 분석
        this.analyzeNavigationTiming();
        
        // Memory Usage 모니터링
        this.monitorMemoryUsage();
    }

    /**
     * 네비게이션 타이밍 분석
     */
    analyzeNavigationTiming() {
        if ('performance' in window && 'timing' in performance) {
            const timing = performance.timing;
            
            this.performanceMetrics.navigation = {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                firstPaint: this.getFirstPaint(),
                firstContentfulPaint: this.getFirstContentfulPaint(),
                largestContentfulPaint: this.getLargestContentfulPaint()
            };
        }
    }

    /**
     * 메모리 사용량 모니터링
     */
    monitorMemoryUsage() {
        if ('memory' in performance) {
            this.performanceMetrics.memory = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
        }
    }

    /**
     * 네트워크 사용량 분석
     */
    analyzeNetworkUsage() {
        const totalSize = Array.from(this.resources.values())
            .reduce((sum, resource) => sum + (resource.size || 0), 0);

        const byType = this.groupResourcesByType();
        
        this.performanceMetrics.network = {
            totalSize: totalSize,
            totalRequests: this.resources.size,
            byType: byType,
            cached: Array.from(this.resources.values()).filter(r => r.cached).length,
            external: Array.from(this.resources.values()).filter(r => this.isExternalResource(r.url)).length
        };
    }

    /**
     * 리소스를 타입별로 그룹화
     */
    groupResourcesByType() {
        const groups = {};
        
        this.resources.forEach(resource => {
            const type = resource.type;
            if (!groups[type]) {
                groups[type] = {
                    count: 0,
                    size: 0,
                    resources: []
                };
            }
            
            groups[type].count++;
            groups[type].size += resource.size || 0;
            groups[type].resources.push(resource);
        });

        return groups;
    }

    /**
     * 최적화 제안 생성
     */
    generateOptimizationSuggestions() {
        this.optimizationSuggestions = [];
        
        // 큰 파일 식별
        this.identifyLargeFiles();
        
        // 중복 리소스 식별
        this.identifyDuplicateResources();
        
        // 미사용 리소스 식별
        this.identifyUnusedResources();
        
        // 압축 최적화 제안
        this.suggestCompressionOptimizations();
        
        // 캐싱 최적화 제안
        this.suggestCachingOptimizations();
        
        // 로딩 전략 최적화 제안
        this.suggestLoadingOptimizations();
    }

    /**
     * 큰 파일 식별
     */
    identifyLargeFiles() {
        this.resources.forEach(resource => {
            const threshold = this.thresholds[resource.type] || this.thresholds.total;
            
            if (resource.size > threshold) {
                this.optimizationSuggestions.push({
                    type: 'large-file',
                    severity: 'high',
                    resource: resource.url,
                    message: `${resource.type} 파일이 너무 큽니다 (${this.formatBytes(resource.size)})`,
                    suggestion: this.getLargeFileSuggestion(resource),
                    impact: 'high'
                });
            }
        });
    }

    /**
     * 중복 리소스 식별
     */
    identifyDuplicateResources() {
        const urlMap = new Map();
        
        this.resources.forEach(resource => {
            const baseUrl = resource.url.split('?')[0]; // 쿼리 파라미터 제거
            
            if (urlMap.has(baseUrl)) {
                this.optimizationSuggestions.push({
                    type: 'duplicate-resource',
                    severity: 'medium',
                    resource: resource.url,
                    message: '중복된 리소스가 발견되었습니다',
                    suggestion: '중복 로딩을 방지하고 캐싱을 활용하세요',
                    impact: 'medium'
                });
            } else {
                urlMap.set(baseUrl, resource);
            }
        });
    }

    /**
     * 미사용 리소스 식별
     */
    identifyUnusedResources() {
        // CSS 미사용 규칙 검사
        this.checkUnusedCSS();
        
        // JavaScript 미사용 코드 검사
        this.checkUnusedJavaScript();
    }

    /**
     * 미사용 CSS 검사
     */
    checkUnusedCSS() {
        const stylesheets = Array.from(this.resources.values())
            .filter(r => r.type === 'stylesheet');

        if (stylesheets.length > 0) {
            this.optimizationSuggestions.push({
                type: 'unused-css',
                severity: 'medium',
                message: 'CSS 파일에 미사용 규칙이 있을 수 있습니다',
                suggestion: 'CSS 최적화 도구를 사용하여 미사용 규칙을 제거하세요',
                impact: 'medium'
            });
        }
    }

    /**
     * 미사용 JavaScript 검사
     */
    checkUnusedJavaScript() {
        const scripts = Array.from(this.resources.values())
            .filter(r => r.type === 'script' && !r.critical);

        if (scripts.length > 3) {
            this.optimizationSuggestions.push({
                type: 'unused-js',
                severity: 'medium',
                message: '많은 JavaScript 파일이 로드되고 있습니다',
                suggestion: 'Code splitting과 lazy loading을 고려하세요',
                impact: 'high'
            });
        }
    }

    /**
     * 압축 최적화 제안
     */
    suggestCompressionOptimizations() {
        this.resources.forEach(resource => {
            if (resource.uncompressedSize && resource.compressedSize) {
                const compressionRatio = resource.compressedSize / resource.uncompressedSize;
                
                if (compressionRatio > 0.8 && resource.size > 50 * 1024) {
                    this.optimizationSuggestions.push({
                        type: 'compression',
                        severity: 'medium',
                        resource: resource.url,
                        message: '압축 효율이 낮습니다',
                        suggestion: 'Gzip 또는 Brotli 압축을 활성화하세요',
                        impact: 'medium'
                    });
                }
            }
        });
    }

    /**
     * 캐싱 최적화 제안
     */
    suggestCachingOptimizations() {
        const uncachedResources = Array.from(this.resources.values())
            .filter(r => !r.cached && r.type !== 'document');

        if (uncachedResources.length > 0) {
            this.optimizationSuggestions.push({
                type: 'caching',
                severity: 'high',
                message: `${uncachedResources.length}개의 리소스가 캐시되지 않았습니다`,
                suggestion: 'Service Worker 또는 HTTP 캐시 헤더를 설정하세요',
                impact: 'high'
            });
        }
    }

    /**
     * 로딩 전략 최적화 제안
     */
    suggestLoadingOptimizations() {
        const criticalResources = Array.from(this.resources.values())
            .filter(r => r.critical);

        const nonCriticalResources = Array.from(this.resources.values())
            .filter(r => !r.critical && r.type === 'script');

        if (nonCriticalResources.length > criticalResources.length) {
            this.optimizationSuggestions.push({
                type: 'loading-strategy',
                severity: 'medium',
                message: '비중요 리소스가 많이 로드되고 있습니다',
                suggestion: 'async/defer 속성을 사용하거나 lazy loading을 구현하세요',
                impact: 'high'
            });
        }
    }

    /**
     * 파일 확장자 추출
     */
    getFileExtension(pathname) {
        return pathname.split('.').pop().toLowerCase();
    }

    /**
     * 리소스 타입 결정
     */
    getResourceType(extension) {
        const typeMap = {
            'js': 'script',
            'css': 'stylesheet',
            'jpg': 'image',
            'jpeg': 'image',
            'png': 'image',
            'gif': 'image',
            'webp': 'image',
            'avif': 'image',
            'svg': 'image',
            'woff': 'font',
            'woff2': 'font',
            'ttf': 'font',
            'eot': 'font',
            'html': 'document',
            'json': 'data'
        };

        return typeMap[extension] || 'other';
    }

    /**
     * 중요 리소스 판별
     */
    isCriticalResource(url) {
        const criticalPatterns = [
            /styles\.css/,
            /index\.html/,
            /app\.js/,
            /main\.js/,
            /critical/
        ];

        return criticalPatterns.some(pattern => pattern.test(url));
    }

    /**
     * 외부 리소스 판별
     */
    isExternalResource(url) {
        try {
            const resourceUrl = new URL(url);
            return resourceUrl.hostname !== window.location.hostname;
        } catch {
            return false;
        }
    }

    /**
     * 큰 파일에 대한 제안
     */
    getLargeFileSuggestion(resource) {
        const suggestions = {
            'script': 'Code splitting, Tree shaking, 또는 압축을 고려하세요',
            'stylesheet': 'CSS 최적화, 미사용 규칙 제거, 또는 Critical CSS 추출을 고려하세요',
            'image': '이미지 압축, WebP/AVIF 포맷 사용, 또는 lazy loading을 고려하세요',
            'font': '폰트 서브셋, WOFF2 포맷 사용을 고려하세요'
        };

        return suggestions[resource.type] || '파일 크기 최적화를 고려하세요';
    }

    /**
     * First Paint 시간 측정
     */
    getFirstPaint() {
        if ('PerformancePaintTiming' in window) {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
            return firstPaint ? firstPaint.startTime : null;
        }
        return null;
    }

    /**
     * First Contentful Paint 시간 측정
     */
    getFirstContentfulPaint() {
        if ('PerformancePaintTiming' in window) {
            const paintEntries = performance.getEntriesByType('paint');
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            return fcp ? fcp.startTime : null;
        }
        return null;
    }

    /**
     * Largest Contentful Paint 시간 측정
     */
    getLargestContentfulPaint() {
        return new Promise((resolve) => {
            if ('PerformanceObserver' in window) {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    resolve(lastEntry ? lastEntry.startTime : null);
                });

                observer.observe({ entryTypes: ['largest-contentful-paint'] });
                
                // 10초 후 타임아웃
                setTimeout(() => resolve(null), 10000);
            } else {
                resolve(null);
            }
        });
    }

    /**
     * 바이트를 읽기 쉬운 형태로 변환
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 분석 보고서 생성
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalResources: this.resources.size,
                totalSize: this.formatBytes(
                    Array.from(this.resources.values())
                        .reduce((sum, r) => sum + (r.size || 0), 0)
                ),
                cachedResources: Array.from(this.resources.values()).filter(r => r.cached).length,
                externalResources: Array.from(this.resources.values()).filter(r => this.isExternalResource(r.url)).length
            },
            resourcesByType: this.groupResourcesByType(),
            performanceMetrics: this.performanceMetrics,
            optimizationSuggestions: this.optimizationSuggestions,
            topLargestResources: this.getTopLargestResources(10),
            recommendations: this.generateRecommendations()
        };

        return report;
    }

    /**
     * 가장 큰 리소스 목록
     */
    getTopLargestResources(count = 10) {
        return Array.from(this.resources.values())
            .sort((a, b) => (b.size || 0) - (a.size || 0))
            .slice(0, count)
            .map(resource => ({
                url: resource.url,
                type: resource.type,
                size: this.formatBytes(resource.size || 0),
                loadTime: resource.loadTime ? `${resource.loadTime.toFixed(2)}ms` : 'N/A'
            }));
    }

    /**
     * 권장사항 생성
     */
    generateRecommendations() {
        const recommendations = [];
        
        const totalSize = Array.from(this.resources.values())
            .reduce((sum, r) => sum + (r.size || 0), 0);

        if (totalSize > this.thresholds.total) {
            recommendations.push('전체 번들 크기가 권장 크기를 초과합니다. 코드 분할을 고려하세요.');
        }

        const highSeverityIssues = this.optimizationSuggestions.filter(s => s.severity === 'high');
        if (highSeverityIssues.length > 0) {
            recommendations.push(`${highSeverityIssues.length}개의 고우선순위 최적화 항목이 있습니다.`);
        }

        const uncachedCount = Array.from(this.resources.values()).filter(r => !r.cached).length;
        if (uncachedCount > this.resources.size * 0.5) {
            recommendations.push('캐싱 전략을 개선하여 성능을 향상시킬 수 있습니다.');
        }

        return recommendations;
    }

    /**
     * 실시간 모니터링 시작
     */
    startRealTimeMonitoring() {
        setInterval(() => {
            this.analyzeCurrentResources();
            this.monitorMemoryUsage();
        }, 30000); // 30초마다 업데이트

        console.log('BundleAnalyzer: 실시간 모니터링 시작');
    }

    /**
     * 분석 데이터 내보내기
     */
    exportAnalysis() {
        const report = this.generateReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `bundle-analysis-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 전역 인스턴스 생성
window.BundleAnalyzer = new BundleAnalyzer();

// 개발자 도구용 유틸리티
if (typeof window !== 'undefined') {
    window.getBundleReport = () => window.BundleAnalyzer.generateReport();
    window.exportBundleAnalysis = () => window.BundleAnalyzer.exportAnalysis();
    window.startBundleMonitoring = () => window.BundleAnalyzer.startRealTimeMonitoring();
}