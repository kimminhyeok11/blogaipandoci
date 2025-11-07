// 스크립트 로더 - 외부 라이브러리 동적 로딩
const ScriptLoader = {
    loadedScripts: new Set(),
    
    // 스크립트 로드
    async loadScript(src, options = {}) {
        if (this.loadedScripts.has(src)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = options.async !== false;
            script.defer = options.defer || false;
            
            if (options.nonce) {
                script.nonce = options.nonce;
            }
            
            script.onload = () => {
                this.loadedScripts.add(src);
                resolve();
            };
            
            script.onerror = () => {
                reject(new Error(`Failed to load script: ${src}`));
            };
            
            document.head.appendChild(script);
        });
    },
    
    // CSS 로드
    async loadCSS(href) {
        if (document.querySelector(`link[href="${href}"]`)) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            
            link.onload = resolve;
            link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
            
            document.head.appendChild(link);
        });
    },
    
    // Editor.js 관련 스크립트들 로드
    async loadEditorJS() {
        const scripts = [
            'https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/header@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/list@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/checklist@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/quote@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/code@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/delimiter@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/table@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/link@latest',
            'https://cdn.jsdelivr.net/npm/@editorjs/image@latest',
            // editorjs-html의 최신 패키지 엔트리는 브라우저에서 CommonJS 전역 'module' 의존으로 오류를 발생시킬 수 있습니다.
            // 브라우저용 UMD 빌드로 고정해 로드합니다.
            'https://cdn.jsdelivr.net/npm/editorjs-html@4.0.0/.build/edjsHTML.browser.js'
        ];
        
        try {
            await Promise.all(scripts.map(src => this.loadScript(src, { nonce: 'r4nd0m' })));
            console.log('Editor.js scripts loaded successfully');
        } catch (error) {
            console.error('Failed to load Editor.js scripts:', error);
            throw error;
        }
    },
    
    // 기타 유틸리티 라이브러리들
    async loadUtilities() {
        const scripts = [
            // 브라우저 호환을 위해 고정된 버전 사용
            'https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js',
            // UMD 빌드 사용 (window.marked 노출)
            'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.umd.min.js'
        ];
        
        try {
            await Promise.all(scripts.map(src => this.loadScript(src, { nonce: 'r4nd0m' })));
            console.log('Utility scripts loaded successfully');
        } catch (error) {
            console.error('Failed to load utility scripts:', error);
            throw error;
        }
    },
    
    // 모든 필수 스크립트 로드 (필요한 유틸리티만 로드)
    async loadAll() {
        try {
            await Promise.all([
                this.loadUtilities()
            ]);
            console.log('All scripts loaded successfully');
        } catch (error) {
            console.error('Failed to load scripts:', error);
            throw error;
        }
    }
};

// 전역으로 내보내기
window.ScriptLoader = ScriptLoader;