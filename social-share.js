/**
 * 소셜 공유 기능을 관리하는 모듈
 */
const SocialShare = {
    /**
     * 현재 페이지 정보를 가져옵니다
     * @returns {Object} 페이지 정보
     */
    getPageInfo() {
        const title = document.querySelector('meta[property="og:title"]')?.content || 
                     document.querySelector('title')?.textContent || 
                     document.title;
        const description = document.querySelector('meta[property="og:description"]')?.content || 
                           document.querySelector('meta[name="description"]')?.content || '';
        const image = document.querySelector('meta[property="og:image"]')?.content || '';
        const url = window.location.href;
        
        return { title, description, image, url };
    },
    
    /**
     * 페이스북에 공유합니다
     * @param {Object} pageInfo - 페이지 정보
     */
    shareToFacebook(pageInfo = null) {
        const info = pageInfo || this.getPageInfo();
        const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(info.url)}`;
        this.openShareWindow(shareUrl, 'facebook');
        this.trackShare('facebook');
    },
    
    /**
     * 트위터에 공유합니다 (현재는 X로 변경됨)
     * @param {Object} pageInfo - 페이지 정보
     */
    shareToTwitter(pageInfo = null) {
        const info = pageInfo || this.getPageInfo();
        const text = `${info.title}\n${info.description}`;
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(info.url)}`;
        this.openShareWindow(shareUrl, 'twitter');
        this.trackShare('twitter');
    },

    /**
     * 인스타그램에 공유합니다 (웹에서는 직접 공유 불가, 링크 복사 후 안내)
     * @param {Object} pageInfo - 페이지 정보
     */
    shareToInstagram(pageInfo = null) {
        const info = pageInfo || this.getPageInfo();
        this.copyLink(info.url);
        this.showToast('링크가 복사되었습니다. 인스타그램 앱에서 붙여넣기 해주세요.', 'info');
        this.trackShare('instagram');
    },

    /**
     * 쓰레드(Threads)에 공유합니다
     * @param {Object} pageInfo - 페이지 정보
     */
    shareToThreads(pageInfo = null) {
        const info = pageInfo || this.getPageInfo();
        const text = `${info.title}\n${info.description}`;
        const shareUrl = `https://threads.net/intent/post?text=${encodeURIComponent(text + '\n' + info.url)}`;
        this.openShareWindow(shareUrl, 'threads');
        this.trackShare('threads');
    },

    /**
     * 링크를 클립보드에 복사합니다
     * @param {string} url - 복사할 URL
     */
    async copyLink(url = null) {
        const linkToCopy = url || window.location.href;
        
        try {
            await navigator.clipboard.writeText(linkToCopy);
            this.showToast('링크가 클립보드에 복사되었습니다!', 'success');
            this.trackShare('copy_link');
        } catch (error) {
            console.error('클립보드 복사 실패:', error);
            // 폴백: 텍스트 선택 방식
            this.fallbackCopyLink(linkToCopy);
        }
    },
    
    /**
     * 폴백 링크 복사 (구형 브라우저용)
     * @param {string} url - 복사할 URL
     */
    fallbackCopyLink(url) {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            this.showToast('링크가 클립보드에 복사되었습니다!', 'success');
            this.trackShare('copy_link');
        } catch (error) {
            console.error('폴백 복사도 실패:', error);
            this.showToast('링크 복사에 실패했습니다.', 'error');
        } finally {
            document.body.removeChild(textArea);
        }
    },
    
    /**
     * 폴백 공유 (Web Share API 또는 링크 복사)
     * @param {Object} pageInfo - 페이지 정보
     */
    async fallbackShare(pageInfo) {
        // Web Share API 지원 확인
        if (navigator.share) {
            try {
                await navigator.share({
                    title: pageInfo.title,
                    text: pageInfo.description,
                    url: pageInfo.url
                });
                this.trackShare('web_share_api');
                return;
            } catch (error) {
                console.log('Web Share API 취소 또는 실패:', error);
            }
        }
        
        // 폴백: 링크 복사
        this.copyLink(pageInfo.url);
    },
    
    /**
     * 공유 창을 엽니다
     * @param {string} url - 공유 URL
     * @param {string} platform - 플랫폼 이름
     */
    openShareWindow(url, platform) {
        const width = 600;
        const height = 400;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        
        window.open(
            url,
            `share_${platform}`,
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
    },
    
    /**
     * 공유 이벤트를 추적합니다
     * @param {string} platform - 공유 플랫폼
     */
    trackShare(platform) {
        // Google Analytics 이벤트 전송
        if (typeof gtag !== 'undefined') {
            gtag('event', 'share', {
                method: platform,
                content_type: 'article',
                item_id: window.location.pathname
            });
        }
        
        console.log(`공유 이벤트 추적: ${platform}`);
    },
    
    /**
     * 토스트 메시지를 표시합니다
     * @param {string} message - 메시지
     * @param {string} type - 타입 (success, error, info)
     */
    showToast(message, type = 'info') {
        // 기존 토스트 제거
        const existingToast = document.getElementById('share-toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // 토스트 생성
        const toast = document.createElement('div');
        toast.id = 'share-toast';
        toast.className = `fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white transform transition-all duration-300 translate-y-full opacity-0`;
        
        // 타입별 스타일
        const typeStyles = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500'
        };
        toast.classList.add(typeStyles[type] || typeStyles.info);
        
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${message}</span>
                <button class="toast-close-btn ml-2 text-white hover:text-gray-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;
        
        // 이벤트 리스너 추가
        const closeBtn = toast.querySelector('.toast-close-btn');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        
        document.body.appendChild(toast);
        
        // 애니메이션
        setTimeout(() => {
            toast.classList.remove('translate-y-full', 'opacity-0');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('translate-y-full', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    },
    
    /**
     * 공유 버튼들을 생성합니다
     * @param {Object} options - 옵션
     * @returns {string} HTML 문자열
     */
    createShareButtons(options = {}) {
        const {
            showFacebook = true,
            showInstagram = true,
            showThreads = true,
            showCopyLink = true,
            buttonClass = 'share-btn',
            containerClass = 'share-buttons'
        } = options;
        
        const buttons = [];
        
        if (showFacebook) {
            buttons.push(`
                <button class="${buttonClass} facebook-share" data-action="facebook" 
                        aria-label="페이스북에 공유" title="페이스북에 공유">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </button>
            `);
        }
        
        if (showInstagram) {
            buttons.push(`
                <button class="${buttonClass} instagram-share" data-action="instagram" 
                        aria-label="인스타그램에 공유" title="인스타그램에 공유">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                </button>
            `);
        }
        
        if (showThreads) {
            buttons.push(`
                <button class="${buttonClass} threads-share" data-action="threads" 
                        aria-label="쓰레드에 공유" title="쓰레드에 공유">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12.5 2C7.3 2 3 6.3 3 11.5S7.3 21 12.5 21s9.5-4.3 9.5-9.5S17.7 2 12.5 2zm0 17c-4.1 0-7.5-3.4-7.5-7.5S8.4 4 12.5 4s7.5 3.4 7.5 7.5S16.6 19 12.5 19z"/>
                        <path d="M16 8.5c0-1.4-1.1-2.5-2.5-2.5S11 7.1 11 8.5s1.1 2.5 2.5 2.5S16 9.9 16 8.5zm-3 0c0-.3.2-.5.5-.5s.5.2.5.5-.2.5-.5.5-.5-.2-.5-.5z"/>
                        <path d="M8.5 13c-1.4 0-2.5 1.1-2.5 2.5S7.1 18 8.5 18s2.5-1.1 2.5-2.5S9.9 13 8.5 13zm0 3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z"/>
                        <path d="M15.5 13c-1.4 0-2.5 1.1-2.5 2.5s1.1 2.5 2.5 2.5 2.5-1.1 2.5-2.5-1.1-2.5-2.5-2.5zm0 3c-.3 0-.5-.2-.5-.5s.2-.5.5-.5.5.2.5.5-.2.5-.5.5z"/>
                        <path d="M13.5 11c-.6 0-1 .4-1 1v1c0 .6.4 1 1 1s1-.4 1-1v-1c0-.6-.4-1-1-1z"/>
                    </svg>
                </button>
            `);
        }
        
        if (showCopyLink) {
            buttons.push(`
                <button class="${buttonClass} copy-link" data-action="copylink" 
                        aria-label="링크 복사" title="링크 복사">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                </button>
            `);
        }
        
        const shareButtonsHtml = `
            <div class="${containerClass}">
                <span class="share-label text-sm font-medium text-gray-600 dark:text-gray-400 mr-3">공유하기:</span>
                <div class="flex space-x-2">
                    ${buttons.join('')}
                </div>
            </div>
        `;
        
        // 임시 컨테이너를 만들어서 이벤트 리스너 추가
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = shareButtonsHtml;
        
        // 각 버튼에 이벤트 리스너 추가
        tempDiv.querySelectorAll('[data-action]').forEach(button => {
            const action = button.getAttribute('data-action');
            button.addEventListener('click', () => {
                switch(action) {
                    case 'facebook':
                        SocialShare.shareToFacebook();
                        break;
                    case 'instagram':
                        SocialShare.shareToInstagram();
                        break;
                    case 'threads':
                        SocialShare.shareToThreads();
                        break;
                    case 'copylink':
                        SocialShare.copyLink();
                        break;
                }
            });
        });
        
        return tempDiv.innerHTML;
    },
    
    /**
     * 소셜 공유 기능을 초기화합니다
     */
    init() {
        // 공유 버튼 스타일 추가
        this.addShareButtonStyles();
    },
    
    /**
     * 공유 버튼 스타일을 추가합니다
     */
    addShareButtonStyles() {
        const styles = `
            .share-buttons {
                display: flex;
                align-items: center;
                margin: 1rem 0;
                padding: 1rem;
                background: #f9fafb;
                border-radius: 0.5rem;
                border: 1px solid #e5e7eb;
            }
            
            .dark .share-buttons {
                background: #1f2937;
                border-color: #374151;
            }
            
            .share-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 0.5rem;
                border: 1px solid #d1d5db;
                background: white;
                color: #6b7280;
                transition: all 0.2s ease;
                cursor: pointer;
            }
            
            .share-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            
            .facebook-share {
                color: #1877f2;
                border-color: #1877f2;
            }
            
            .facebook-share:hover {
                background: #1877f2;
                color: white;
            }
            
            .instagram-share {
                color: #e4405f;
                border-color: #e4405f;
            }
            
            .instagram-share:hover {
                background: #e4405f;
                color: white;
            }
            
            .threads-share {
                color: #000;
                border-color: #000;
            }
            
            .threads-share:hover {
                background: #000;
                color: white;
            }
            
            .copy-link {
                color: #10b981;
                border-color: #10b981;
            }
            
            .copy-link:hover {
                background: #10b981;
                color: white;
            }
            
            .dark .share-btn {
                background: #374151;
                border-color: #4b5563;
                color: #d1d5db;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
};

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialShare;
}