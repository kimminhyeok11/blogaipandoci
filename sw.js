// Service Worker for InsureLog PWA - Advanced Caching
const CACHE_VERSION = 'v2.0.0';
const CACHE_NAME = `insurelog-${CACHE_VERSION}`;

// 고급 캐시 전략 설정
const CACHE_CONFIGS = {
    static: {
        name: 'insurelog-static-v2',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
        maxEntries: 100
    },
    dynamic: {
        name: 'insurelog-dynamic-v2',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
        maxEntries: 50
    },
    api: {
        name: 'insurelog-api-v2',
        maxAge: 5 * 60 * 1000, // 5분
        maxEntries: 30
    },
    images: {
        name: 'insurelog-images-v2',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90일
        maxEntries: 200
    },
    fonts: {
        name: 'insurelog-fonts-v2',
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1년
        maxEntries: 20
    }
};

// 캐시할 정적 파일들 (확장됨)
const STATIC_FILES = [
    '/',
    '/styles.css',
    '/css-optimizer.js',
    '/js-optimizer.js',
    '/cache-optimizer.js',
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

// 캐시 전략별 URL 패턴
const CACHE_PATTERNS = {
    static: [
        /\.(css|js)$/,
        /\/manifest\.json$/
    ],
    dynamic: [
        /\.html$/,
        /\/$/
    ],
    api: [
        /supabase\.co\/rest/,
        /\/api\//
    ],
    images: [
        /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i,
        /supabase\.co\/storage/
    ],
    fonts: [
        /fonts\.(googleapis|gstatic)\.com/,
        /\.(woff|woff2|ttf|eot)$/i
    ],
    external: [
        /^https:\/\/cdn\.jsdelivr\.net/,
        /^https:\/\/unpkg\.com/
    ]
};

// 캐시 규칙 저장소
let cacheRules = [];

// Service Worker 설치
self.addEventListener('install', event => {
    console.log('Service Worker: Installing v2.0.0...');
    
    event.waitUntil(
        Promise.all([
            // 정적 파일 캐싱
            caches.open(CACHE_CONFIGS.static.name)
                .then(cache => {
                    console.log('Service Worker: Caching static files');
                    return cache.addAll(STATIC_FILES);
                }),
            // 캐시 메타데이터 초기화
            initializeCacheMetadata()
        ])
        .then(() => {
            console.log('Service Worker: Static files cached');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('Service Worker: Cache failed', error);
        })
    );
});

// Service Worker 활성화
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating v2.0.0...');
    
    event.waitUntil(
        Promise.all([
            // 오래된 캐시 정리
            cleanupOldCaches(),
            // 클라이언트 제어 시작
            self.clients.claim()
        ])
        .then(() => {
            console.log('Service Worker: Activated');
        })
    );
});

/**
 * 캐시 메타데이터 초기화
 */
async function initializeCacheMetadata() {
    const metadata = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        configs: CACHE_CONFIGS
    };
    
    const cache = await caches.open('insurelog-metadata');
    await cache.put('/metadata', new Response(JSON.stringify(metadata)));
}

/**
 * 오래된 캐시 정리
 */
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const currentCaches = Object.values(CACHE_CONFIGS).map(config => config.name);
    currentCaches.push('insurelog-metadata');
    
    const oldCaches = cacheNames.filter(name => 
        !currentCaches.includes(name) && name.startsWith('insurelog-')
    );

    return Promise.all(
        oldCaches.map(cacheName => {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
        })
    );
}

// 네트워크 요청 가로채기 - 고급 캐싱 전략
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 캐시 전략 결정
    const cacheStrategy = determineCacheStrategy(request, url);
    
    if (cacheStrategy) {
        event.respondWith(handleRequest(request, cacheStrategy));
    } else {
        // 기본 네트워크 요청
        event.respondWith(fetch(request));
    }
});

/**
 * 요청에 대한 캐시 전략 결정
 */
function determineCacheStrategy(request, url) {
    // HTML 페이지
    if (request.headers.get('accept')?.includes('text/html')) {
        return {
            type: 'stale-while-revalidate',
            cacheName: CACHE_CONFIGS.dynamic.name,
            maxAge: CACHE_CONFIGS.dynamic.maxAge
        };
    }
    
    // API 요청
    if (CACHE_PATTERNS.api.some(pattern => pattern.test(url.href))) {
        return {
            type: 'network-first',
            cacheName: CACHE_CONFIGS.api.name,
            maxAge: CACHE_CONFIGS.api.maxAge
        };
    }
    
    // 이미지 파일
    if (CACHE_PATTERNS.images.some(pattern => pattern.test(url.href))) {
        return {
            type: 'cache-first',
            cacheName: CACHE_CONFIGS.images.name,
            maxAge: CACHE_CONFIGS.images.maxAge
        };
    }
    
    // 폰트 파일
    if (CACHE_PATTERNS.fonts.some(pattern => pattern.test(url.href))) {
        return {
            type: 'cache-first',
            cacheName: CACHE_CONFIGS.fonts.name,
            maxAge: CACHE_CONFIGS.fonts.maxAge
        };
    }
    
    // 정적 파일
    if (CACHE_PATTERNS.static.some(pattern => pattern.test(url.href))) {
        return {
            type: 'cache-first',
            cacheName: CACHE_CONFIGS.static.name,
            maxAge: CACHE_CONFIGS.static.maxAge
        };
    }
    
    // 외부 리소스
    if (CACHE_PATTERNS.external.some(pattern => pattern.test(url.href))) {
        return {
            type: 'stale-while-revalidate',
            cacheName: CACHE_CONFIGS.dynamic.name,
            maxAge: CACHE_CONFIGS.dynamic.maxAge
        };
    }
    
    return null;
}

/**
 * 캐시 전략에 따른 요청 처리
 */
async function handleRequest(request, strategy) {
    const cache = await caches.open(strategy.cacheName);
    
    switch (strategy.type) {
        case 'cache-first':
            return cacheFirst(request, cache, strategy);
        case 'network-first':
            return networkFirst(request, cache, strategy);
        case 'stale-while-revalidate':
            return staleWhileRevalidate(request, cache, strategy);
        default:
            return fetch(request);
    }
}

/**
 * Cache First 전략
 */
async function cacheFirst(request, cache, strategy) {
    try {
        // POST 요청은 캐시하지 않음
        if (request.method !== 'GET') {
            return fetch(request);
        }
        
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            await cache.put(request, responseClone);
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

/**
 * Network First 전략
 */
async function networkFirst(request, cache, strategy) {
    try {
        // POST 요청은 캐시하지 않음
        if (request.method !== 'GET') {
            return fetch(request);
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            await cache.put(request, responseClone);
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await cache.match(request);
        if (cachedResponse && !isExpired(cachedResponse, strategy.maxAge)) {
            return cachedResponse;
        }
        throw error;
    }
}

/**
 * Stale While Revalidate 전략
 */
async function staleWhileRevalidate(request, cache, strategy) {
    // POST 요청은 캐시하지 않음
    if (request.method !== 'GET') {
        return fetch(request);
    }
    
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            cache.put(request, responseClone);
        }
        return networkResponse;
    }).catch(() => null);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    return fetchPromise;
}

/**
 * 캐시 만료 확인
 */
function isExpired(response, maxAge) {
    const dateHeader = response.headers.get('date');
    if (!dateHeader) return false;
    
    const responseTime = new Date(dateHeader).getTime();
    const now = Date.now();
    
    return (now - responseTime) > maxAge;
}

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(
            // 백그라운드에서 수행할 작업
            console.log('Service Worker: Performing background sync')
        );
    }
});

// 푸시 알림 처리 (선택사항)
self.addEventListener('push', event => {
    console.log('Service Worker: Push received');
    
    const options = {
        body: event.data ? event.data.text() : '새로운 알림이 있습니다.',
        icon: '/manifest.json',
        badge: '/manifest.json',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '확인하기',
                icon: '/manifest.json'
            },
            {
                action: 'close',
                title: '닫기',
                icon: '/manifest.json'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('YY 블로그', options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 메시지 처리 - 고급 캐싱 제어
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_VERSION });
    }
    
    // 캐시 규칙 추가
    if (event.data && event.data.type === 'ADD_CACHE_RULE') {
        cacheRules.push(event.data.rule);
        console.log('Service Worker: Cache rule added', event.data.rule);
    }
    
    // 캐시 상태 조회
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        getCacheStatus().then(status => {
            event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status });
        });
    }
    
    // 캐시 새로고침
    if (event.data && event.data.type === 'REFRESH_CACHE') {
        const cacheName = event.data.cacheName;
        refreshSpecificCache(cacheName).then(() => {
            event.ports[0].postMessage({ type: 'CACHE_REFRESHED', cacheName });
        });
    }
});

/**
 * 캐시 상태 조회
 */
async function getCacheStatus() {
    const status = {};
    
    for (const [name, config] of Object.entries(CACHE_CONFIGS)) {
        try {
            const cache = await caches.open(config.name);
            const keys = await cache.keys();
            status[name] = {
                entries: keys.length,
                maxEntries: config.maxEntries,
                maxAge: config.maxAge,
                name: config.name
            };
        } catch (error) {
            status[name] = { error: error.message };
        }
    }
    
    return status;
}

/**
 * 특정 캐시 새로고침
 */
async function refreshSpecificCache(cacheName) {
    if (cacheName) {
        await caches.delete(cacheName);
        console.log(`Service Worker: ${cacheName} 캐시 새로고침 완료`);
    } else {
        // 모든 캐시 새로고침
        const cacheNames = await caches.keys();
        await Promise.all(
            cacheNames
                .filter(name => name.startsWith('insurelog-'))
                .map(name => caches.delete(name))
        );
        console.log('Service Worker: 모든 캐시 새로고침 완료');
        
        // 정적 파일 재캐싱
        const cache = await caches.open(CACHE_CONFIGS.static.name);
        await cache.addAll(STATIC_FILES);
    }
}