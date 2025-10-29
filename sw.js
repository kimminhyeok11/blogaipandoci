// Service Worker for YY Blog PWA
const CACHE_NAME = 'yy-blog-v1.0.0';
const STATIC_CACHE = 'yy-blog-static-v1';
const DYNAMIC_CACHE = 'yy-blog-dynamic-v1';

// 캐시할 정적 파일들
const STATIC_FILES = [
    '/',
    '/yyyyyyy.html',
    '/social-share.js',
    '/comments.js',
    '/dark-mode.js',
    '/reading-time.js',
    '/analytics.js',
    '/manifest.json'
];

// 동적으로 캐시할 URL 패턴
const DYNAMIC_CACHE_PATTERNS = [
    /^https:\/\/fonts\.googleapis\.com/,
    /^https:\/\/fonts\.gstatic\.com/,
    /^https:\/\/cdn\.jsdelivr\.net/,
    /^https:\/\/unpkg\.com/
];

// Service Worker 설치
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(STATIC_FILES);
            })
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
    console.log('Service Worker: Activating...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        // 이전 버전의 캐시 삭제
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated');
                return self.clients.claim();
            })
    );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // HTML 페이지 요청 처리
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // 네트워크 응답을 캐시에 저장
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then(cache => cache.put(request, responseClone));
                    return response;
                })
                .catch(() => {
                    // 오프라인일 때 캐시에서 반환
                    return caches.match(request)
                        .then(response => {
                            return response || caches.match('/');
                        });
                })
        );
        return;
    }
    
    // 정적 파일 요청 처리
    if (STATIC_FILES.includes(url.pathname)) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    return response || fetch(request)
                        .then(fetchResponse => {
                            const responseClone = fetchResponse.clone();
                            caches.open(STATIC_CACHE)
                                .then(cache => cache.put(request, responseClone));
                            return fetchResponse;
                        });
                })
        );
        return;
    }
    
    // 외부 리소스 (폰트, CDN 등) 처리
    const shouldCacheDynamically = DYNAMIC_CACHE_PATTERNS.some(pattern => 
        pattern.test(request.url)
    );
    
    if (shouldCacheDynamically) {
        event.respondWith(
            caches.match(request)
                .then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(request)
                        .then(fetchResponse => {
                            // 성공적인 응답만 캐시
                            if (fetchResponse.status === 200) {
                                const responseClone = fetchResponse.clone();
                                caches.open(DYNAMIC_CACHE)
                                    .then(cache => cache.put(request, responseClone));
                            }
                            return fetchResponse;
                        })
                        .catch(() => {
                            // 오프라인일 때 기본 응답 반환
                            return new Response('오프라인 상태입니다.', {
                                status: 503,
                                statusText: 'Service Unavailable',
                                headers: new Headers({
                                    'Content-Type': 'text/plain; charset=utf-8'
                                })
                            });
                        });
                })
        );
        return;
    }
    
    // 기본 네트워크 요청
    event.respondWith(fetch(request));
});

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

// 메시지 처리
self.addEventListener('message', event => {
    console.log('Service Worker: Message received', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});