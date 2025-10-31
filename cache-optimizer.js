/**
 * 고급 캐싱 전략 최적화 시스템
 * Service Worker와 연동하여 효율적인 캐싱 전략을 구현
 */

class CacheOptimizer {
    constructor() {
        this.CACHE_STRATEGIES = {
            CACHE_FIRST: 'cache-first',
            NETWORK_FIRST: 'network-first',
            STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
            NETWORK_ONLY: 'network-only',
            CACHE_ONLY: 'cache-only'
        };

        this.CACHE_CONFIGS = {
            static: {
                name: 'insurelog-static-v2',
                strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
                maxEntries: 100
            },
            dynamic: {
                name: 'insurelog-dynamic-v2',
                strategy: this.CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
                maxEntries: 50
            },
            api: {
                name: 'insurelog-api-v2',
                strategy: this.CACHE_STRATEGIES.NETWORK_FIRST,
                maxAge: 5 * 60 * 1000, // 5분
                maxEntries: 30
            },
            images: {
                name: 'insurelog-images-v2',
                strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
                maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
                maxEntries: 200
            },
            fonts: {
                name: 'insurelog-fonts-v2',
                strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1년
                maxEntries: 20
            }
        };

        this.init();
    }

    /**
     * 캐시 최적화 시스템 초기화
     */
    async init() {
        if ('serviceWorker' in navigator) {
            try {
                await this.registerServiceWorker();
                await this.setupCacheStrategies();
                await this.cleanupOldCaches();
                this.setupPerformanceMonitoring();
                console.log('CacheOptimizer: 초기화 완료');
            } catch (error) {
                console.error('CacheOptimizer: 초기화 실패', error);
            }
        }
    }

    /**
     * Service Worker 등록 및 업데이트 관리
     */
    async registerServiceWorker() {
        try {
            // 문서가 완전히 로드된 후에 등록
            if (document.readyState !== 'complete') {
                await new Promise(resolve => {
                    if (document.readyState === 'complete') {
                        resolve();
                    } else {
                        window.addEventListener('load', resolve, { once: true });
                    }
                });
            }

            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            // Service Worker 업데이트 확인
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        this.showUpdateNotification();
                    }
                });
            });

            console.log('CacheOptimizer: Service Worker 등록 완료');
            return registration;
        } catch (error) {
            console.warn('CacheOptimizer: Service Worker 등록 실패', error);
            return false;
        }
    }

    /**
     * 캐시 전략 설정
     */
    async setupCacheStrategies() {
        // 정적 파일 사전 캐싱
        await this.precacheStaticAssets();
        
        // 동적 캐싱 규칙 설정
        this.setupDynamicCaching();
        
        // API 응답 캐싱 설정
        this.setupApiCaching();
        
        // 이미지 캐싱 최적화
        this.setupImageCaching();
        
        // 폰트 캐싱 설정
        this.setupFontCaching();
    }

    /**
     * 정적 자산 사전 캐싱
     */
    async precacheStaticAssets() {
        const staticAssets = [
            '/',
            '/styles.css',
            '/css-optimizer.js',
            '/js-optimizer.js',
            '/image-optimizer.js',
            '/schema-generator.js',
            '/performance-monitor.js',
            '/social-share.js',
            '/comments.js',
            '/dark-mode.js',
            '/reading-time.js',
            '/analytics.js',
            '/manifest.json'
        ];

        if ('caches' in window) {
            try {
                const cache = await caches.open(this.CACHE_CONFIGS.static.name);
                await cache.addAll(staticAssets);
                console.log('CacheOptimizer: 정적 자산 사전 캐싱 완료');
            } catch (error) {
                console.error('CacheOptimizer: 정적 자산 캐싱 실패', error);
            }
        }
    }

    /**
     * 동적 캐싱 설정
     */
    setupDynamicCaching() {
        // HTML 페이지 캐싱
        this.addCacheRule({
            pattern: /\.html$/,
            strategy: this.CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
            cacheName: this.CACHE_CONFIGS.dynamic.name
        });

        // CSS/JS 파일 캐싱
        this.addCacheRule({
            pattern: /\.(css|js)$/,
            strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
            cacheName: this.CACHE_CONFIGS.static.name
        });
    }

    /**
     * API 캐싱 설정
     */
    setupApiCaching() {
        // Supabase API 캐싱
        this.addCacheRule({
            pattern: /supabase\.co\/rest/,
            strategy: this.CACHE_STRATEGIES.NETWORK_FIRST,
            cacheName: this.CACHE_CONFIGS.api.name,
            maxAge: this.CACHE_CONFIGS.api.maxAge
        });

        // 외부 API 캐싱
        this.addCacheRule({
            pattern: /api\./,
            strategy: this.CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
            cacheName: this.CACHE_CONFIGS.api.name
        });
    }

    /**
     * 이미지 캐싱 최적화
     */
    setupImageCaching() {
        this.addCacheRule({
            pattern: /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i,
            strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
            cacheName: this.CACHE_CONFIGS.images.name,
            maxAge: this.CACHE_CONFIGS.images.maxAge
        });

        // Supabase Storage 이미지 캐싱
        this.addCacheRule({
            pattern: /supabase\.co\/storage/,
            strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
            cacheName: this.CACHE_CONFIGS.images.name
        });
    }

    /**
     * 폰트 캐싱 설정
     */
    setupFontCaching() {
        // Google Fonts 캐싱
        this.addCacheRule({
            pattern: /fonts\.(googleapis|gstatic)\.com/,
            strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
            cacheName: this.CACHE_CONFIGS.fonts.name,
            maxAge: this.CACHE_CONFIGS.fonts.maxAge
        });

        // 로컬 폰트 파일 캐싱
        this.addCacheRule({
            pattern: /\.(woff|woff2|ttf|eot)$/i,
            strategy: this.CACHE_STRATEGIES.CACHE_FIRST,
            cacheName: this.CACHE_CONFIGS.fonts.name
        });
    }

    /**
     * 캐시 규칙 추가
     */
    addCacheRule(rule) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'ADD_CACHE_RULE',
                rule: rule
            });
        }
    }

    /**
     * 오래된 캐시 정리
     */
    async cleanupOldCaches() {
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                const currentCaches = Object.values(this.CACHE_CONFIGS).map(config => config.name);
                
                const oldCaches = cacheNames.filter(name => 
                    !currentCaches.includes(name) && name.startsWith('insurelog-')
                );

                await Promise.all(
                    oldCaches.map(cacheName => {
                        console.log('CacheOptimizer: 오래된 캐시 삭제', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            } catch (error) {
                console.error('CacheOptimizer: 캐시 정리 실패', error);
            }
        }
    }

    /**
     * 캐시 성능 모니터링
     */
    setupPerformanceMonitoring() {
        // 캐시 히트율 추적
        this.cacheHitRate = {
            hits: 0,
            misses: 0,
            get rate() {
                const total = this.hits + this.misses;
                return total > 0 ? (this.hits / total * 100).toFixed(2) : 0;
            }
        };

        // 캐시 크기 모니터링
        this.monitorCacheSize();
        
        // 성능 메트릭 수집
        this.collectCacheMetrics();
    }

    /**
     * 캐시 크기 모니터링
     */
    async monitorCacheSize() {
        if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const cacheSize = estimate.usage || 0;
                const quota = estimate.quota || 0;
                
                console.log(`CacheOptimizer: 캐시 사용량 ${(cacheSize / 1024 / 1024).toFixed(2)}MB / ${(quota / 1024 / 1024).toFixed(2)}MB`);
                
                // 캐시 사용량이 80%를 초과하면 정리
                if (cacheSize / quota > 0.8) {
                    await this.cleanupLeastUsedCache();
                }
            } catch (error) {
                console.error('CacheOptimizer: 캐시 크기 모니터링 실패', error);
            }
        }
    }

    /**
     * 가장 적게 사용된 캐시 정리
     */
    async cleanupLeastUsedCache() {
        // 각 캐시의 사용 빈도를 추적하고 가장 적게 사용된 항목 삭제
        const cacheUsage = JSON.parse(localStorage.getItem('cacheUsage') || '{}');
        
        for (const [cacheName, config] of Object.entries(this.CACHE_CONFIGS)) {
            if (config.maxEntries) {
                await this.limitCacheEntries(config.name, config.maxEntries);
            }
        }
    }

    /**
     * 캐시 항목 수 제한
     */
    async limitCacheEntries(cacheName, maxEntries) {
        if ('caches' in window) {
            try {
                const cache = await caches.open(cacheName);
                const keys = await cache.keys();
                
                if (keys.length > maxEntries) {
                    const entriesToDelete = keys.slice(0, keys.length - maxEntries);
                    await Promise.all(
                        entriesToDelete.map(key => cache.delete(key))
                    );
                    console.log(`CacheOptimizer: ${cacheName}에서 ${entriesToDelete.length}개 항목 삭제`);
                }
            } catch (error) {
                console.error('CacheOptimizer: 캐시 항목 제한 실패', error);
            }
        }
    }

    /**
     * 캐시 메트릭 수집
     */
    collectCacheMetrics() {
        // Performance Observer를 사용하여 캐시 성능 측정
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
                        // 캐시에서 로드됨
                        this.cacheHitRate.hits++;
                    } else if (entry.transferSize > 0) {
                        // 네트워크에서 로드됨
                        this.cacheHitRate.misses++;
                    }
                }
            });

            observer.observe({ entryTypes: ['resource'] });
        }

        // 주기적으로 캐시 통계 로그
        setInterval(() => {
            console.log(`CacheOptimizer: 캐시 히트율 ${this.cacheHitRate.rate}%`);
        }, 60000); // 1분마다
    }

    /**
     * 업데이트 알림 표시
     */
    showUpdateNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('새 버전 사용 가능', {
                body: '페이지를 새로고침하여 최신 버전을 사용하세요.',
                icon: '/manifest.json',
                tag: 'app-update'
            });
        } else {
            // 페이지 내 알림 표시
            const notification = document.createElement('div');
            notification.className = 'update-notification';
            notification.innerHTML = `
                <div style="position: fixed; top: 20px; right: 20px; background: #007bff; color: white; padding: 15px; border-radius: 5px; z-index: 10000;">
                    <p>새 버전이 사용 가능합니다!</p>
                    <button onclick="location.reload()" style="background: white; color: #007bff; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">
                        새로고침
                    </button>
                    <button onclick="this.parentElement.remove()" style="background: transparent; color: white; border: 1px solid white; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 10px;">
                        나중에
                    </button>
                </div>
            `;
            document.body.appendChild(notification);
        }
    }

    /**
     * 캐시 상태 확인
     */
    async getCacheStatus() {
        if ('caches' in window) {
            const status = {};
            
            for (const [name, config] of Object.entries(this.CACHE_CONFIGS)) {
                try {
                    const cache = await caches.open(config.name);
                    const keys = await cache.keys();
                    status[name] = {
                        entries: keys.length,
                        maxEntries: config.maxEntries,
                        strategy: config.strategy
                    };
                } catch (error) {
                    status[name] = { error: error.message };
                }
            }
            
            return {
                caches: status,
                hitRate: this.cacheHitRate.rate + '%',
                totalHits: this.cacheHitRate.hits,
                totalMisses: this.cacheHitRate.misses
            };
        }
        
        return null;
    }

    /**
     * 수동 캐시 새로고침
     */
    async refreshCache(cacheName = null) {
        if ('caches' in window) {
            try {
                if (cacheName) {
                    await caches.delete(cacheName);
                    console.log(`CacheOptimizer: ${cacheName} 캐시 새로고침 완료`);
                } else {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                    console.log('CacheOptimizer: 모든 캐시 새로고침 완료');
                }
                
                // 정적 자산 재캐싱
                await this.precacheStaticAssets();
            } catch (error) {
                console.error('CacheOptimizer: 캐시 새로고침 실패', error);
            }
        }
    }
}

// 전역 인스턴스 생성
window.CacheOptimizer = new CacheOptimizer();

// 개발자 도구용 유틸리티
if (typeof window !== 'undefined') {
    window.getCacheStatus = () => window.CacheOptimizer.getCacheStatus();
    window.refreshCache = (cacheName) => window.CacheOptimizer.refreshCache(cacheName);
}