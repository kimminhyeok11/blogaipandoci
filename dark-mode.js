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

// 다크모드 스타일 (간소화된 버전 - 주요 스타일은 styles.css에서 처리)
const darkModeStyles = `
/* 다크모드 전환 애니메이션 */
* {
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

/* 다크모드 스크롤바 */
.dark ::-webkit-scrollbar {
    width: 8px;
}

.dark ::-webkit-scrollbar-track {
    background: var(--bg-content-secondary);
}

.dark ::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 4px;
}

.dark ::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary);
}

/* 다크모드 특수 요소들 */
.dark .highlight {
    background-color: rgba(168, 85, 247, 0.2);
}

.dark .shadow {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
}

.dark .border {
    border-color: var(--border-color);
}

.dark .bg-opacity-90 {
    background-color: rgba(17, 24, 39, 0.9);
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