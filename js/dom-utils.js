// DOM 유틸리티 함수들
const DOM = {
    // 요소 선택
    $(selector) {
        return document.querySelector(selector);
    },
    
    $$(selector) {
        return document.querySelectorAll(selector);
    },
    
    // 요소 생성
    create(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        if (content) {
            element.textContent = content;
        }
        
        return element;
    },
    
    // 애니메이션 표시/숨김
    show(selector, options = {}) {
        const element = typeof selector === 'string' ? this.$(selector) : selector;
        if (!element) return;
        
        const defaultOptions = { 
            opacity: [0, 1], 
            translateY: [10, 0], 
            duration: 300, 
            easing: 'easeOutQuad' 
        };
        
        const animOptions = { ...defaultOptions, ...options };
        
        element.style.display = 'block';
        if (window.anime) {
            anime({
                targets: element,
                ...animOptions
            });
        } else {
            element.style.opacity = '1';
        }
    },
    
    hide(selector, options = {}) {
        const element = typeof selector === 'string' ? this.$(selector) : selector;
        if (!element) return;
        
        const defaultOptions = { 
            opacity: 0, 
            duration: 200, 
            easing: 'easeInQuad',
            complete: () => element.style.display = 'none'
        };
        
        const animOptions = { ...defaultOptions, ...options };
        
        if (window.anime) {
            anime({
                targets: element,
                ...animOptions
            });
        } else {
            element.style.opacity = '0';
            element.style.display = 'none';
        }
    },
    
    // URL 빌드
    buildUrl(basePath, params = {}) {
        const url = new URL(basePath, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.set(key, value);
            }
        });
        return url.pathname + url.search;
    },
    
    // 모달 관련
    openModal(id) {
        const modal = this.$(`#${id}`);
        if (modal) {
            modal.classList.remove('hidden');
            this.show(modal);
            document.body.style.overflow = 'hidden';
        }
    },
    
    closeModal(id) {
        const modal = this.$(`#${id}`);
        if (modal) {
            this.hide(modal, {
                complete: () => {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
        }
    },
    
    // 로딩 스피너
    showLoading(container = 'body') {
        const target = typeof container === 'string' ? this.$(container) : container;
        if (!target) return;
        
        // 레이아웃 시프트 방지: 정상 흐름에서 제외되는 fixed 오버레이로 표시
        const spinner = this.create('div', {
            className: 'loading-spinner',
            style: 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);backdrop-filter:saturate(120%) blur(2px);',
            innerHTML: `
                <div class="flex items-center justify-center p-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span class="ml-3 text-gray-700">로딩 중...</span>
                </div>
            `
        });
        
        target.appendChild(spinner);
        return spinner;
    },
    
    hideLoading(container = 'body') {
        const target = typeof container === 'string' ? this.$(container) : container;
        const spinner = target?.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
};

// 전역으로 내보내기
window.DOM = DOM;