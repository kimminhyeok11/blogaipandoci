// UI 컴포넌트들
const UIComponents = {
    // 토스트 알림
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = DOM.$('#toast-container') || this.createToastContainer();
        
        const toast = DOM.create('div', {
            className: `toast toast-${type} transform translate-x-full transition-transform duration-300 ease-in-out`,
            innerHTML: `
                <div class="flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg ${this.getToastClasses(type)}">
                    <div class="flex-shrink-0">
                        ${this.getToastIcon(type)}
                    </div>
                    <div class="ml-3 text-sm font-medium">${message}</div>
                    <button type="button" class="ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-gray-100 inline-flex h-8 w-8" onclick="this.parentElement.parentElement.remove()">
                        <span class="sr-only">닫기</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            `
        });
        
        toastContainer.appendChild(toast);
        
        // 애니메이션으로 표시
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // 자동 제거
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    createToastContainer() {
        const container = DOM.create('div', {
            id: 'toast-container',
            className: 'fixed top-4 right-4 z-50 space-y-2'
        });
        document.body.appendChild(container);
        return container;
    },
    
    getToastClasses(type) {
        const classes = {
            success: 'text-green-800 bg-green-50 border border-green-200',
            error: 'text-red-800 bg-red-50 border border-red-200',
            warning: 'text-yellow-800 bg-yellow-50 border border-yellow-200',
            info: 'text-blue-800 bg-blue-50 border border-blue-200'
        };
        return classes[type] || classes.info;
    },
    
    getToastIcon(type) {
        const icons = {
            success: '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>',
            error: '<svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>',
            warning: '<svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>',
            info: '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>'
        };
        return icons[type] || icons.info;
    },
    
    // 확인 다이얼로그
    showConfirm(message, onConfirm, onCancel) {
        const modal = DOM.create('div', {
            className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
            innerHTML: `
                <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">확인</h3>
                    <p class="text-gray-600 mb-6">${message}</p>
                    <div class="flex justify-end space-x-3">
                        <button class="cancel-btn px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">취소</button>
                        <button class="confirm-btn px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition">확인</button>
                    </div>
                </div>
            `
        });
        
        const cancelBtn = modal.querySelector('.cancel-btn');
        const confirmBtn = modal.querySelector('.confirm-btn');
        
        const cleanup = () => {
            modal.remove();
        };
        
        cancelBtn.onclick = () => {
            cleanup();
            if (onCancel) onCancel();
        };
        
        confirmBtn.onclick = () => {
            cleanup();
            if (onConfirm) onConfirm();
        };
        
        // ESC 키로 닫기
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                if (onCancel) onCancel();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        
        document.addEventListener('keydown', handleKeydown);
        document.body.appendChild(modal);
    },
    
    // 프로그레스 바
    createProgressBar(container, initialValue = 0) {
        const progressContainer = DOM.create('div', {
            className: 'w-full bg-gray-200 rounded-full h-2.5 mb-4',
            innerHTML: `
                <div class="bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out" style="width: ${initialValue}%"></div>
            `
        });
        
        const progressBar = progressContainer.querySelector('.bg-purple-600');
        
        if (typeof container === 'string') {
            DOM.$(container)?.appendChild(progressContainer);
        } else {
            container?.appendChild(progressContainer);
        }
        
        return {
            update(value) {
                progressBar.style.width = `${Math.min(100, Math.max(0, value))}%`;
            },
            remove() {
                progressContainer.remove();
            }
        };
    },
    
    // 스켈레톤 로더
    createSkeleton(type = 'post') {
        const skeletons = {
            post: `
                <div class="animate-pulse">
                    <div class="flex space-x-4 p-4">
                        <div class="rounded-lg bg-gray-300 h-16 w-24"></div>
                        <div class="flex-1 space-y-2 py-1">
                            <div class="h-4 bg-gray-300 rounded w-3/4"></div>
                            <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                            <div class="h-3 bg-gray-300 rounded w-1/4"></div>
                        </div>
                    </div>
                </div>
            `,
            card: `
                <div class="animate-pulse">
                    <div class="bg-gray-300 h-48 rounded-lg mb-4"></div>
                    <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div class="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
            `
        };
        
        return DOM.create('div', {
            className: 'skeleton-loader',
            innerHTML: skeletons[type] || skeletons.post
        });
    }
};

// 전역으로 내보내기
window.UIComponents = UIComponents;