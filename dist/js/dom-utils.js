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
    
    // 모달 관련 (접근성/포커스 트랩/스크롤 잠금 통합)
    openModal(id) {
        const modal = this.$(`#${id}`);
        if (!modal) return;

        // 표시 및 스크롤 잠금
        modal.classList.remove('hidden');
        this.show(modal);
        document.body.classList.add('modal-open');

        // 배경 접근 차단: 주요 컨테이너 inert + aria-hidden 적용
        try {
            const bgSelectors = ['#app-container', '#main-nav-container'];
            bgSelectors.forEach(sel => {
                const el = document.querySelector(sel);
                if (el && !modal.contains(el)) {
                    el.setAttribute('inert', '');
                    el.setAttribute('aria-hidden', 'true');
                }
            });
        } catch (_) { /* noop */ }

        // ARIA 역할/레이블 설정
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.setAttribute('role', 'dialog');
            content.setAttribute('aria-modal', 'true');
            const titleEl = content.querySelector('.modal-title');
            if (titleEl) {
                if (!titleEl.id) titleEl.id = `${id}-title`;
                content.setAttribute('aria-labelledby', titleEl.id);
            }
            const descEl = content.querySelector('.modal-message, .modal-body');
            if (descEl && !content.hasAttribute('aria-describedby')) {
                const descId = `${id}-desc`;
                if (!descEl.id) descEl.id = descId;
                content.setAttribute('aria-describedby', descEl.id);
            }
        }

        // 이전 포커스 저장
        modal.__returnFocus = document.activeElement;

        // 포커스 가능한 요소 수집
        const focusables = Array.from(modal.querySelectorAll(
            'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetParent !== null);

        // 초기 포커스 부여
        const initialFocus = focusables[0] || content;
        if (initialFocus) {
            if (!initialFocus.hasAttribute('tabindex')) initialFocus.setAttribute('tabindex', '-1');
            initialFocus.focus({ preventScroll: true });
        }

        // 포커스 트랩 핸들러
        const onKeydown = (e) => {
            if (e.key === 'Tab') {
                const list = Array.from(modal.querySelectorAll(
                    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )).filter(el => el.offsetParent !== null);
                if (list.length === 0) return;
                const first = list[0];
                const last = list[list.length - 1];
                const active = document.activeElement;
                if (e.shiftKey) {
                    if (active === first || !modal.contains(active)) {
                        e.preventDefault();
                        last.focus();
                    }
                } else {
                    if (active === last) {
                        e.preventDefault();
                        first.focus();
                    }
                }
            } else if (e.key === 'Escape') {
                // 모달 내에서 ESC로 닫기 (중복 안전)
                this.closeModal(id);
            }
        };
        modal.__onKeydown = onKeydown;
        modal.addEventListener('keydown', onKeydown, true);

        // 오버레이 외부 클릭으로 닫기
        const overlay = modal.querySelector('.modal-overlay');
        const onOverlayClick = (ev) => {
            if (ev.target === overlay) this.closeModal(id);
        };
        if (overlay) {
            modal.__onOverlayClick = onOverlayClick;
            overlay.addEventListener('click', onOverlayClick);
        }
    },

    closeModal(id) {
        const modal = this.$(`#${id}`);
        if (!modal) return;

        // 이벤트 핸들러 제거
        if (modal.__onKeydown) {
            modal.removeEventListener('keydown', modal.__onKeydown, true);
            modal.__onKeydown = null;
        }
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay && modal.__onOverlayClick) {
            overlay.removeEventListener('click', modal.__onOverlayClick);
            modal.__onOverlayClick = null;
        }

        // 애니메이션 숨김 후 정리
        this.hide(modal, {
            complete: () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');

                // 배경 복원: inert/aria-hidden 제거
                try {
                    const bgSelectors = ['#app-container', '#main-nav-container'];
                    bgSelectors.forEach(sel => {
                        const el = document.querySelector(sel);
                        if (el) {
                            el.removeAttribute('inert');
                            el.removeAttribute('aria-hidden');
                        }
                    });
                } catch (_) { /* noop */ }
                // 포커스 복원
                const prev = modal.__returnFocus;
                if (prev && typeof prev.focus === 'function') {
                    prev.focus({ preventScroll: true });
                }
                modal.__returnFocus = null;

                // 접근성 속성 정리: aria-modal 제거(역할은 유지)
                try { modal.removeAttribute('aria-modal'); } catch (_) { /* noop */ }
            }
        });
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