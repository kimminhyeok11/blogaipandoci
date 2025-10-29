/**
 * 읽기 시간 계산 및 표시 모듈
 */
const ReadingTime = {
    // 평균 읽기 속도 (분당 단어 수)
    WORDS_PER_MINUTE: 200,
    
    /**
     * 텍스트의 읽기 시간을 계산합니다
     * @param {string} text - 계산할 텍스트
     * @returns {number} 읽기 시간 (분)
     */
    calculateReadingTime(text) {
        if (!text || typeof text !== 'string') return 0;
        
        // HTML 태그 제거
        const cleanText = text.replace(/<[^>]*>/g, '');
        
        // 단어 수 계산 (한글과 영문 모두 고려)
        const koreanWords = (cleanText.match(/[가-힣]+/g) || []).join('').length;
        const englishWords = (cleanText.match(/[a-zA-Z]+/g) || []).length;
        const numbers = (cleanText.match(/\d+/g) || []).length;
        
        // 한글은 글자 수를 2로 나누어 단어 수로 근사
        const totalWords = Math.ceil(koreanWords / 2) + englishWords + numbers;
        
        // 읽기 시간 계산 (최소 1분)
        return Math.max(1, Math.ceil(totalWords / this.WORDS_PER_MINUTE));
    },
    
    /**
     * 읽기 시간을 포맷팅합니다
     * @param {number} minutes - 읽기 시간 (분)
     * @returns {string} 포맷된 읽기 시간
     */
    formatReadingTime(minutes) {
        if (minutes < 1) return '1분 미만';
        if (minutes === 1) return '1분';
        return `${minutes}분`;
    },
    
    /**
     * 읽기 시간 HTML 요소를 생성합니다
     * @param {number} minutes - 읽기 시간 (분)
     * @returns {string} HTML 문자열
     */
    createReadingTimeHTML(minutes) {
        const formattedTime = this.formatReadingTime(minutes);
        return `
            <span class="reading-time inline-flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${formattedTime} 읽기
            </span>
        `;
    },
    
    /**
     * 포스트에 읽기 시간을 추가합니다
     * @param {Object} post - 포스트 객체
     * @returns {Object} 읽기 시간이 추가된 포스트 객체
     */
    addReadingTimeToPost(post) {
        if (!post) return post;
        
        const content = post.refined_content || post.content || '';
        const readingTime = this.calculateReadingTime(content);
        
        return {
            ...post,
            reading_time: readingTime,
            reading_time_html: this.createReadingTimeHTML(readingTime)
        };
    },
    
    /**
     * 포스트 목록에 읽기 시간을 추가합니다
     * @param {Array} posts - 포스트 배열
     * @returns {Array} 읽기 시간이 추가된 포스트 배열
     */
    addReadingTimeToPosts(posts) {
        if (!Array.isArray(posts)) return posts;
        
        return posts.map(post => this.addReadingTimeToPost(post));
    },
    
    /**
     * 읽기 진행률을 계산합니다
     * @returns {number} 읽기 진행률 (0-100)
     */
    calculateReadingProgress() {
        const article = document.querySelector('article') || document.querySelector('.prose-custom');
        if (!article) return 0;
        
        const articleTop = article.offsetTop;
        const articleHeight = article.offsetHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        
        const articleBottom = articleTop + articleHeight;
        const viewportBottom = scrollTop + windowHeight;
        
        if (scrollTop < articleTop) return 0;
        if (viewportBottom >= articleBottom) return 100;
        
        const visibleHeight = Math.min(viewportBottom - articleTop, articleHeight);
        return Math.round((visibleHeight / articleHeight) * 100);
    },
    
    /**
     * 읽기 진행률 표시기를 생성합니다
     */
    createProgressIndicator() {
        // 기존 진행률 표시기 제거
        const existing = document.getElementById('reading-progress');
        if (existing) existing.remove();
        
        // 진행률 표시기 생성
        const progressBar = document.createElement('div');
        progressBar.id = 'reading-progress';
        progressBar.className = 'fixed top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 z-50';
        progressBar.innerHTML = `
            <div class="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-150 ease-out" 
                 style="width: 0%"></div>
        `;
        
        document.body.appendChild(progressBar);
        
        // 스크롤 이벤트 리스너
        const updateProgress = () => {
            const progress = this.calculateReadingProgress();
            const progressFill = progressBar.querySelector('div');
            if (progressFill) {
                progressFill.style.width = `${progress}%`;
            }
        };
        
        // 스크롤 이벤트 등록 (throttled)
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    updateProgress();
                    ticking = false;
                });
                ticking = true;
            }
        };
        
        window.addEventListener('scroll', handleScroll);
        
        // 초기 진행률 설정
        updateProgress();
        
        return progressBar;
    },
    
    /**
     * 읽기 시간 기능을 초기화합니다
     */
    init() {
        // 포스트 상세 페이지에서만 진행률 표시기 생성
        if (window.location.pathname.includes('/post/')) {
            this.createProgressIndicator();
        }
    }
};

// 모듈 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReadingTime;
}