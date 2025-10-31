/**
 * Core Web Vitals 성능 모니터링 시스템
 * LCP, FID, CLS 등 주요 성능 지표 추적 및 분석
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.observers = new Map();
        this.isInitialized = false;
        this.analyticsEnabled = typeof Analytics !== 'undefined' && Analytics.isInitialized;
    }

    /**
     * 성능 모니터링 초기화
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('[Performance] Core Web Vitals 모니터링 시작');
        
        // Core Web Vitals 추적
        this.trackLCP(); // Largest Contentful Paint
        this.trackFID(); // First Input Delay
        this.trackCLS(); // Cumulative Layout Shift
        
        // 추가 성능 지표
        this.trackFCP(); // First Contentful Paint
        this.trackTTFB(); // Time to First Byte
        this.trackINP(); // Interaction to Next Paint
        
        // 페이지 언로드 시 데이터 전송
        this.setupBeforeUnload();
        
        this.isInitialized = true;
    }

    /**
     * Largest Contentful Paint (LCP) 추적
     */
    trackLCP() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            const lcp = {
                name: 'LCP',
                value: lastEntry.startTime,
                rating: this.getLCPRating(lastEntry.startTime),
                element: lastEntry.element?.tagName || 'unknown',
                url: lastEntry.url || window.location.href,
                timestamp: Date.now()
            };
            
            this.metrics.set('LCP', lcp);
            this.reportMetric(lcp);
        });

        try {
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.set('LCP', observer);
        } catch (error) {
            console.warn('[Performance] LCP 추적 실패:', error);
        }
    }

    /**
     * First Input Delay (FID) 추적
     */
    trackFID() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                const fid = {
                    name: 'FID',
                    value: entry.processingStart - entry.startTime,
                    rating: this.getFIDRating(entry.processingStart - entry.startTime),
                    eventType: entry.name,
                    timestamp: Date.now()
                };
                
                this.metrics.set('FID', fid);
                this.reportMetric(fid);
            });
        });

        try {
            observer.observe({ entryTypes: ['first-input'] });
            this.observers.set('FID', observer);
        } catch (error) {
            console.warn('[Performance] FID 추적 실패:', error);
        }
    }

    /**
     * Cumulative Layout Shift (CLS) 추적
     */
    trackCLS() {
        if (!('PerformanceObserver' in window)) return;

        let clsValue = 0;
        let sessionValue = 0;
        let sessionEntries = [];

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            
            entries.forEach(entry => {
                if (!entry.hadRecentInput) {
                    const firstSessionEntry = sessionEntries[0];
                    const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
                    
                    if (sessionValue && 
                        entry.startTime - lastSessionEntry.startTime < 1000 &&
                        entry.startTime - firstSessionEntry.startTime < 5000) {
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    } else {
                        sessionValue = entry.value;
                        sessionEntries = [entry];
                    }
                    
                    if (sessionValue > clsValue) {
                        clsValue = sessionValue;
                        
                        const cls = {
                            name: 'CLS',
                            value: clsValue,
                            rating: this.getCLSRating(clsValue),
                            entries: sessionEntries.length,
                            timestamp: Date.now()
                        };
                        
                        this.metrics.set('CLS', cls);
                        this.reportMetric(cls);
                    }
                }
            });
        });

        try {
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.set('CLS', observer);
        } catch (error) {
            console.warn('[Performance] CLS 추적 실패:', error);
        }
    }

    /**
     * First Contentful Paint (FCP) 추적
     */
    trackFCP() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.name === 'first-contentful-paint') {
                    const fcp = {
                        name: 'FCP',
                        value: entry.startTime,
                        rating: this.getFCPRating(entry.startTime),
                        timestamp: Date.now()
                    };
                    
                    this.metrics.set('FCP', fcp);
                    this.reportMetric(fcp);
                }
            });
        });

        try {
            observer.observe({ entryTypes: ['paint'] });
            this.observers.set('FCP', observer);
        } catch (error) {
            console.warn('[Performance] FCP 추적 실패:', error);
        }
    }

    /**
     * Time to First Byte (TTFB) 추적
     */
    trackTTFB() {
        if (!('PerformanceObserver' in window)) return;

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                if (entry.entryType === 'navigation') {
                    const ttfb = {
                        name: 'TTFB',
                        value: entry.responseStart - entry.requestStart,
                        rating: this.getTTFBRating(entry.responseStart - entry.requestStart),
                        timestamp: Date.now()
                    };
                    
                    this.metrics.set('TTFB', ttfb);
                    this.reportMetric(ttfb);
                }
            });
        });

        try {
            observer.observe({ entryTypes: ['navigation'] });
            this.observers.set('TTFB', observer);
        } catch (error) {
            console.warn('[Performance] TTFB 추적 실패:', error);
        }
    }

    /**
     * Interaction to Next Paint (INP) 추적
     */
    trackINP() {
        if (!('PerformanceObserver' in window)) return;

        let interactions = [];

        const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach(entry => {
                interactions.push({
                    duration: entry.duration,
                    startTime: entry.startTime,
                    processingStart: entry.processingStart,
                    processingEnd: entry.processingEnd,
                    eventType: entry.name
                });
                
                // 최근 50개 상호작용만 유지
                if (interactions.length > 50) {
                    interactions = interactions.slice(-50);
                }
                
                // INP 계산 (98번째 백분위수)
                const sortedDurations = interactions
                    .map(i => i.duration)
                    .sort((a, b) => a - b);
                
                const inp98 = sortedDurations[Math.floor(sortedDurations.length * 0.98)];
                
                if (inp98) {
                    const inp = {
                        name: 'INP',
                        value: inp98,
                        rating: this.getINPRating(inp98),
                        interactions: interactions.length,
                        timestamp: Date.now()
                    };
                    
                    this.metrics.set('INP', inp);
                    this.reportMetric(inp);
                }
            });
        });

        try {
            observer.observe({ entryTypes: ['event'] });
            this.observers.set('INP', observer);
        } catch (error) {
            console.warn('[Performance] INP 추적 실패:', error);
        }
    }

    /**
     * 성능 지표 등급 계산
     */
    getLCPRating(value) {
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
    }

    getFIDRating(value) {
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
    }

    getCLSRating(value) {
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
    }

    getFCPRating(value) {
        if (value <= 1800) return 'good';
        if (value <= 3000) return 'needs-improvement';
        return 'poor';
    }

    getTTFBRating(value) {
        if (value <= 800) return 'good';
        if (value <= 1800) return 'needs-improvement';
        return 'poor';
    }

    getINPRating(value) {
        if (value <= 200) return 'good';
        if (value <= 500) return 'needs-improvement';
        return 'poor';
    }

    /**
     * 성능 지표 보고
     */
    reportMetric(metric) {
        console.log(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
        
        // Google Analytics로 전송
        if (this.analyticsEnabled) {
            Analytics.trackCustomEvent('core_web_vitals', {
                metric_name: metric.name,
                metric_value: Math.round(metric.value),
                metric_rating: metric.rating,
                page_path: window.location.pathname
            });
        }
        
        // 로컬 스토리지에 저장
        this.saveMetricToStorage(metric);
    }

    /**
     * 성능 지표를 로컬 스토리지에 저장
     */
    saveMetricToStorage(metric) {
        try {
            const key = `performance_${metric.name.toLowerCase()}`;
            const data = {
                ...metric,
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            };
            
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('[Performance] 로컬 저장 실패:', error);
        }
    }

    /**
     * 페이지 언로드 시 데이터 전송 설정
     */
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            this.sendBeacon();
        });

        // Visibility API를 사용한 페이지 숨김 감지
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.sendBeacon();
            }
        });
    }

    /**
     * Beacon API를 사용한 데이터 전송
     */
    sendBeacon() {
        if (!navigator.sendBeacon) return;

        const metricsData = Array.from(this.metrics.values());
        if (metricsData.length === 0) return;

        const payload = JSON.stringify({
            metrics: metricsData,
            url: window.location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        });

        // 실제 환경에서는 서버 엔드포인트로 전송
        console.log('[Performance] Beacon 데이터 전송:', payload);
    }

    /**
     * 현재 수집된 성능 지표 반환
     */
    getMetrics() {
        const metricsObject = {};
        this.metrics.forEach((value, key) => {
            metricsObject[key] = value;
        });
        return metricsObject;
    }

    /**
     * 성능 보고서 생성
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            metrics: {},
            summary: {
                good: 0,
                needsImprovement: 0,
                poor: 0
            }
        };

        this.metrics.forEach((metric, name) => {
            report.metrics[name] = {
                value: metric.value,
                rating: metric.rating
            };

            // 등급별 카운트
            switch (metric.rating) {
                case 'good':
                    report.summary.good++;
                    break;
                case 'needs-improvement':
                    report.summary.needsImprovement++;
                    break;
                case 'poor':
                    report.summary.poor++;
                    break;
            }
        });

        return report;
    }

    /**
     * 성능 모니터링 정리
     */
    cleanup() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
        this.metrics.clear();
        this.isInitialized = false;
    }
}

// 전역 노출 (즉시 실행)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
} else {
    // 전역 인스턴스 생성 (강력한 보호)
    let performanceMonitor;
    
    // 더 엄격한 인스턴스 체크
    if (window.PerformanceMonitor && 
        typeof window.PerformanceMonitor === 'object' && 
        window.PerformanceMonitor.constructor && 
        window.PerformanceMonitor.constructor.name === 'PerformanceMonitor' &&
        typeof window.PerformanceMonitor.getMetrics === 'function') {
        // 기존 인스턴스 사용
        performanceMonitor = window.PerformanceMonitor;
        console.log('=== 기존 PerformanceMonitor 인스턴스 재사용 ===');
        console.log('기존 인스턴스 메서드 확인:', typeof performanceMonitor.getMetrics);
    } else {
        // 새 인스턴스 생성
        performanceMonitor = new PerformanceMonitor();
        console.log('=== 새 PerformanceMonitor 인스턴스 생성 ===');
        console.log('새 인스턴스 메서드 확인:', typeof performanceMonitor.getMetrics);
        
        // 인스턴스를 전역에 노출 (클래스는 별도 보관)
        window.PerformanceMonitor = performanceMonitor;
        window.PerformanceMonitorClass = PerformanceMonitor;
        window.performanceMonitor = performanceMonitor;
        
        // 즉시 초기화 시도
        try {
            performanceMonitor.init();
            console.log('PerformanceMonitor 즉시 초기화 완료');
        } catch (error) {
            console.warn('PerformanceMonitor 즉시 초기화 실패:', error);
            // DOM 로드 완료 후 초기화
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    performanceMonitor.init();
                });
            } else {
                setTimeout(() => performanceMonitor.init(), 100);
            }
        }
    }
    
    console.log('=== PerformanceMonitor 전역 노출 완료 ===');
    console.log('window.PerformanceMonitor 타입:', typeof window.PerformanceMonitor);
    console.log('window.PerformanceMonitor.getMetrics 타입:', typeof window.PerformanceMonitor.getMetrics);
    console.log('window.PerformanceMonitor 생성자:', window.PerformanceMonitor.constructor.name);
    console.log('인스턴스 확인:', window.PerformanceMonitor instanceof PerformanceMonitor);
    
    // 즉시 초기화 시도
    try {
        performanceMonitor.init();
        console.log('PerformanceMonitor 즉시 초기화 완료');
    } catch (error) {
        console.warn('PerformanceMonitor 즉시 초기화 실패:', error);
        // DOM 로드 완료 후 초기화
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                performanceMonitor.init();
            });
        } else {
            setTimeout(() => performanceMonitor.init(), 100);
        }
    }
}