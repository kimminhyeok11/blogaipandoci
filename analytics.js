// Analytics 모듈 - Google Analytics 4 이벤트 추적 및 사용자 행동 분석
const Analytics = {
    // Google Analytics 4 초기화 여부
    isInitialized: false,
    
    // 초기화
    init() {
        if (typeof gtag === 'undefined') {
            console.warn('[Analytics] Google Analytics가 로드되지 않았습니다.');
            return;
        }
        
        this.isInitialized = true;
        console.log('[Analytics] 초기화 완료');
        
        // 페이지 뷰 추적
        this.trackPageView();
        
        // 스크롤 이벤트 추적
        this.initScrollTracking();
        
        // 클릭 이벤트 추적
        this.initClickTracking();
    },
    
    // 페이지 뷰 추적
    trackPageView() {
        if (!this.isInitialized) return;
        
        const pageTitle = document.title;
        const pagePath = window.location.pathname;
        
        gtag('event', 'page_view', {
            page_title: pageTitle,
            page_location: window.location.href,
            page_path: pagePath
        });
        
        console.log('[Analytics] 페이지 뷰 추적:', pagePath);
    },
    
    // 포스트 뷰 추적
    trackPostView(postId, postTitle, category) {
        if (!this.isInitialized) return;
        
        gtag('event', 'view_item', {
            item_id: postId,
            item_name: postTitle,
            item_category: category,
            content_type: 'blog_post'
        });
        
        console.log('[Analytics] 포스트 뷰 추적:', postTitle);
    },
    
    // 검색 이벤트 추적
    trackSearch(searchTerm, resultsCount) {
        if (!this.isInitialized) return;
        
        gtag('event', 'search', {
            search_term: searchTerm,
            results_count: resultsCount
        });
        
        console.log('[Analytics] 검색 추적:', searchTerm, '결과:', resultsCount);
    },
    
    // 태그 클릭 추적
    trackTagClick(tagName) {
        if (!this.isInitialized) return;
        
        gtag('event', 'select_content', {
            content_type: 'tag',
            item_id: tagName
        });
        
        console.log('[Analytics] 태그 클릭 추적:', tagName);
    },
    
    // 소셜 공유 추적
    trackShare(platform, postTitle) {
        if (!this.isInitialized) return;
        
        gtag('event', 'share', {
            method: platform,
            content_type: 'blog_post',
            item_id: postTitle
        });
        
        console.log('[Analytics] 소셜 공유 추적:', platform, postTitle);
    },
    
    // 다크모드 토글 추적
    trackDarkModeToggle(isDarkMode) {
        if (!this.isInitialized) return;
        
        gtag('event', 'toggle_dark_mode', {
            custom_parameter_1: isDarkMode ? 'enabled' : 'disabled'
        });
        
        console.log('[Analytics] 다크모드 토글 추적:', isDarkMode);
    },
    
    // 스크롤 깊이 추적
    initScrollTracking() {
        let maxScroll = 0;
        const milestones = [25, 50, 75, 90, 100];
        const tracked = new Set();
        
        const trackScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
                
                // 마일스톤 추적
                milestones.forEach(milestone => {
                    if (scrollPercent >= milestone && !tracked.has(milestone)) {
                        tracked.add(milestone);
                        
                        gtag('event', 'scroll', {
                            percent_scrolled: milestone
                        });
                        
                        console.log('[Analytics] 스크롤 추적:', milestone + '%');
                    }
                });
            }
        };
        
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    trackScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    },
    
    // 클릭 이벤트 추적
    initClickTracking() {
        // 네비게이션 클릭 추적
        document.addEventListener('click', (e) => {
            const target = e.target.closest('a, button');
            if (!target) return;
            
            // 외부 링크 클릭 추적
            if (target.tagName === 'A' && target.href) {
                const isExternal = target.hostname !== window.location.hostname;
                if (isExternal) {
                    gtag('event', 'click', {
                        event_category: 'outbound',
                        event_label: target.href,
                        transport_type: 'beacon'
                    });
                    
                    console.log('[Analytics] 외부 링크 클릭 추적:', target.href);
                }
            }
            
            // 버튼 클릭 추적
            if (target.tagName === 'BUTTON' || target.classList.contains('btn')) {
                const buttonText = target.textContent.trim();
                const buttonId = target.id || 'unknown';
                
                gtag('event', 'click', {
                    event_category: 'button',
                    event_label: buttonText,
                    custom_parameter_1: buttonId
                });
                
                console.log('[Analytics] 버튼 클릭 추적:', buttonText);
            }
        });
    },
    
    // 사용자 참여도 추적
    trackEngagement(eventName, parameters = {}) {
        if (!this.isInitialized) return;
        
        gtag('event', eventName, {
            engagement_time_msec: Date.now(),
            ...parameters
        });
        
        console.log('[Analytics] 참여도 추적:', eventName, parameters);
    },
    
    // 에러 추적
    trackError(error, context = '') {
        if (!this.isInitialized) return;
        
        gtag('event', 'exception', {
            description: error.message || error,
            fatal: false,
            custom_parameter_1: context
        });
        
        console.log('[Analytics] 에러 추적:', error, context);
    },
    
    // 성능 메트릭 추적
    trackPerformance() {
        if (!this.isInitialized || !window.performance) return;
        
        window.addEventListener('load', () => {
            setTimeout(() => {
                const navigation = performance.getEntriesByType('navigation')[0];
                if (navigation) {
                    gtag('event', 'timing_complete', {
                        name: 'page_load_time',
                        value: Math.round(navigation.loadEventEnd - navigation.fetchStart)
                    });
                    
                    console.log('[Analytics] 페이지 로드 시간 추적:', 
                        Math.round(navigation.loadEventEnd - navigation.fetchStart) + 'ms');
                }
            }, 0);
        });
    },
    
    // 사용자 정의 이벤트 추적
    trackCustomEvent(eventName, parameters = {}) {
        if (!this.isInitialized) return;
        
        gtag('event', eventName, parameters);
        console.log('[Analytics] 사용자 정의 이벤트 추적:', eventName, parameters);
    }
};

// 전역 에러 핸들러
window.addEventListener('error', (e) => {
    Analytics.trackError(e.error || e.message, 'global_error');
});

// Promise rejection 핸들러
window.addEventListener('unhandledrejection', (e) => {
    Analytics.trackError(e.reason, 'unhandled_promise_rejection');
});