/**
 * 다크모드 기능을 관리하는 모듈
 */
const DarkMode = {
    // 다크모드 상태 키
    STORAGE_KEY: 'darkMode',
    
    // 현재 다크모드 상태
    isDark: false,
    
    // 초기화
    init() {
        // 저장된 설정 또는 시스템 설정 확인
        const savedMode = localStorage.getItem(this.STORAGE_KEY);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        this.isDark = savedMode ? savedMode === 'true' : systemPrefersDark;
        
        // 다크모드 적용
        this.apply();
        
        // 시스템 설정 변경 감지
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.isDark = e.matches;
                this.apply();
            }
        });
        
        // 토글 버튼 생성
        this.createToggleButton();
    },
    
    // 다크모드 적용
    apply() {
        const html = document.documentElement;
        
        if (this.isDark) {
            html.classList.add('dark');
            html.style.colorScheme = 'dark';
        } else {
            html.classList.remove('dark');
            html.style.colorScheme = 'light';
        }
        
        // 메타 태그 업데이트
        this.updateMetaTheme();
    },
    
    // 다크모드 토글
    toggle() {
        this.isDark = !this.isDark;
        localStorage.setItem(this.STORAGE_KEY, this.isDark.toString());
        this.apply();
        this.updateToggleButton();
    },
    
    // 토글 버튼 생성
    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'dark-mode-toggle';
        button.className = 'fixed top-4 right-4 z-50 p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:scale-110';
        button.setAttribute('aria-label', '다크모드 토글');
        button.innerHTML = this.getButtonIcon();
        
        button.addEventListener('click', () => this.toggle());
        
        document.body.appendChild(button);
    },
    
    // 토글 버튼 업데이트
    updateToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (button) {
            button.innerHTML = this.getButtonIcon();
        }
    },
    
    // 버튼 아이콘 반환
    getButtonIcon() {
        if (this.isDark) {
            // 태양 아이콘 (라이트모드로 전환)
            return `<svg class="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"></path>
            </svg>`;
        } else {
            // 달 아이콘 (다크모드로 전환)
            return `<svg class="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
            </svg>`;
        }
    },
    
    // 메타 테마 색상 업데이트
    updateMetaTheme() {
        let metaTheme = document.querySelector('meta[name="theme-color"]');
        if (!metaTheme) {
            metaTheme = document.createElement('meta');
            metaTheme.name = 'theme-color';
            document.head.appendChild(metaTheme);
        }
        
        metaTheme.content = this.isDark ? '#1f2937' : '#ffffff';
    }
};

// CSS 변수 정의 (다크모드 스타일)
const darkModeStyles = `
:root {
    --bg-primary: #ffffff;
    --bg-secondary: #f9fafb;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border-color: #e5e7eb;
    --accent-color: #3b82f6;
}

.dark {
    --bg-primary: #111827;
    --bg-secondary: #1f2937;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --border-color: #374151;
    --accent-color: #60a5fa;
}

/* 다크모드 기본 스타일 */
.dark body {
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

.dark .bg-white {
    background-color: var(--bg-primary) !important;
}

.dark .bg-gray-50 {
    background-color: var(--bg-secondary) !important;
}

.dark .text-black,
.dark .text-gray-900 {
    color: var(--text-primary) !important;
}

.dark .text-gray-600,
.dark .text-gray-500 {
    color: var(--text-secondary) !important;
}

.dark .border-gray-200 {
    border-color: var(--border-color) !important;
}

/* 다크모드 프로즈 스타일 */
.dark .prose-custom {
    color: var(--text-primary);
}

.dark .prose-custom h1,
.dark .prose-custom h2,
.dark .prose-custom h3,
.dark .prose-custom h4,
.dark .prose-custom h5,
.dark .prose-custom h6 {
    color: var(--text-primary);
}

.dark .prose-custom p,
.dark .prose-custom li {
    color: var(--text-secondary);
}

.dark .prose-custom blockquote {
    border-left-color: var(--accent-color);
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
}

.dark .prose-custom code {
    background-color: var(--bg-secondary);
    color: var(--accent-color);
}

.dark .prose-custom pre {
    background-color: #0d1117;
    border: 1px solid var(--border-color);
}

/* 다크모드 버튼 및 링크 */
.dark a {
    color: var(--accent-color);
}

.dark a:hover {
    color: #93c5fd;
}

/* 다크모드 폼 요소 */
.dark input,
.dark textarea,
.dark select {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

.dark input:focus,
.dark textarea:focus,
.dark select:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

/* 다크모드 카드 */
.dark .card,
.dark .post-card {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
}

/* 다크모드 네비게이션 */
.dark nav {
    background-color: var(--bg-primary);
    border-color: var(--border-color);
}

/* 다크모드 애니메이션 */
* {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* 다크모드 스크롤바 */
.dark ::-webkit-scrollbar {
    width: 8px;
}

.dark ::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

.dark ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}
`;

// 스타일 주입
const styleSheet = document.createElement('style');
styleSheet.textContent = darkModeStyles;
document.head.appendChild(styleSheet);

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DarkMode;
}