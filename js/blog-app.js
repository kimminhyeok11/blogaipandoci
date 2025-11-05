// 안전한 Config 폴리필 (직접 참조 호환)
try {
    if (typeof window !== 'undefined') {
        window.Config = window.Config || (typeof Config !== 'undefined' ? Config : {});
    }
    // 지역 스코프에서 Config를 사용할 수 있도록 보조 참조 제공
    const _LocalConfig = window.Config;
}
catch (e) { /* noop */ }

// 전역 Config는 config.js에서 정의되며, 여기서는 재정의하지 않습니다.

// 메인 블로그 애플리케이션 클래스
class BlogApp {
    
    // 앱 상태 (State)
    state = {
        user: null,
        isAuthReady: false,
        currentCategory: '전체',
        editorInstance: null,
    };

    // 서비스 인스턴스
    supabase = null;
    
    constructor() {
        // 1. 이벤트 핸들러 'this' 컨텍스트 바인딩
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.handlePopState = this.handlePopState.bind(this);

        // 2. 앱 초기화 시작
        this.init();
    }

    /**
     * [App Init]
     * 앱의 핵심 로직을 초기화하고 인증 상태 변경을 감지합니다.
     */
    async init() {
        try {
            // Supabase 클라이언트 준비 (있으면 초기화, 없으면 건너뜀)
            try {
                if (!this.supabase && window.supabase && window.Config?.SUPABASE_URL && window.Config?.SUPABASE_ANON_KEY) {
                    this.supabase = window.supabase.createClient(window.Config.SUPABASE_URL, window.Config.SUPABASE_ANON_KEY);
                }
            } catch (e) {
                console.warn('Supabase 초기화를 건너뜁니다:', e);
            }

            // 필수 스크립트 로드
            await ScriptLoader.loadAll();

            // 전역 이벤트 리스너 바인딩
            this.bindGlobalListeners();

            // 초기 세션 조회로 첫 렌더링을 보장
            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                this.state.user = session?.user || null;
            } else {
                this.state.user = null;
            }
            this.state.isAuthReady = true;

            // 초기 UI 렌더링 및 라우팅 시작
            this.renderNav();
            this.handleRouting();
            window.addEventListener('popstate', this.handlePopState);

            // 앱 로더 숨기기 (초기 렌더링 완료 후)
            const loader = DOM.$('#app-loader');
            if (loader) {
                DOM.hide(loader, { complete: () => loader.remove() });
            }

            // 이후 인증 상태 변경에 대응
            this.supabase.auth.onAuthStateChange((_, newSession) => {
                const user = newSession?.user || null;
                const authChanged = this.state.user?.id !== user?.id;
                this.state.user = user;

                if (authChanged) {
                    this.renderNav();
                    if (user) {
                        UIComponents.showToast(user.email + '님, 환영합니다!', 'success');
                    } else {
                        UIComponents.showToast('로그아웃되었습니다.', 'info');
                        this.navigate('/');
                    }
                }
            });

            // 방문 로그 기록 (site_visits)
            try {
                if (this.supabase) {
                    await this.logSiteVisit();
                }
            } catch (e) {
                console.warn('방문 로그 기록 실패:', e);
            }
        } catch (error) {
            console.error('App initialization failed:', error);
            UIComponents.showToast('앱 초기화 중 오류가 발생했습니다.', 'error');

            // 로더에 오류 메시지 표시
            const loader = DOM.$('#app-loader');
            if (loader) {
                loader.innerHTML = '<div class="text-red-600">앱 로드에 실패했습니다.</div>';
            }
        }
    }

    /**
     * [Global Event Listeners]
     * 전역 이벤트 리스너를 바인딩합니다.
     */
    bindGlobalListeners() {
        document.addEventListener('click', this.handleGlobalClick);
        
        // 접근성 개선을 위한 키보드 이벤트
        document.addEventListener('keydown', (e) => {
            // ESC 키로 모달 닫기
            if (e.key === 'Escape') {
                const openModal = DOM.$('.modal:not(.hidden)');
                if (openModal) {
                    DOM.closeModal(openModal.id);
                }
            }
        });
        
        // 온라인/오프라인 상태 감지
        window.addEventListener('online', () => {
            UIComponents.showToast('인터넷 연결이 복구되었습니다.', 'success');
        });
        
        window.addEventListener('offline', () => {
            UIComponents.showToast('인터넷 연결이 끊어졌습니다.', 'warning');
        });
    }

    /**
     * [Global Click Handler]
     * 전역 클릭 이벤트를 처리합니다.
     */
    handleGlobalClick(e) {
        const target = e.target.closest('[data-route]');
        if (target) {
            e.preventDefault();
            const href = target.getAttribute('href') || target.getAttribute('data-href');
            if (href && href !== '#') {
                this.navigate(href);
            }
        }

        // 모달 외부 클릭 시 닫기
        if (e.target.classList.contains('modal-backdrop')) {
            const modal = e.target.closest('.modal');
            if (modal) {
                DOM.closeModal(modal.id);
            }
        }
    }

    /**
     * [Pop State Handler]
     * 브라우저 뒤로가기/앞으로가기를 처리합니다.
     */
    handlePopState() {
        this.handleRouting();
    }

    /**
     * [Navigation]
     * 페이지 네비게이션을 처리합니다.
     */
    navigate(path) {
        if (window.location.pathname + window.location.search !== path) {
            window.history.pushState(null, '', path);
        }
        this.handleRouting();
    }

    /**
     * [Routing]
     * URL 라우팅을 처리합니다.
     */
    handleRouting() {
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);

        // 현재 활성화된 뷰 숨기기
        const activeView = DOM.$('.app-view.active');
        if (activeView) {
            activeView.classList.remove('active');
            DOM.hide(activeView);
        }

        // 라우팅 처리
        if (path === '/' || path === '/home') {
            this.renderHome(params);
        } else if (path.startsWith('/post/')) {
            const slug = path.split('/post/')[1];
            this.renderPost(slug);
        } else if (path === '/writer' || path.startsWith('/writer/')) {
            const slug = path.split('/writer/')[1] || null;
            this.renderWriter(slug);
        } else if (path === '/login') {
            this.renderLogin();
        } else {
            this.render404();
        }
    }

    /**
     * [View Switching]
     * 뷰를 전환합니다.
     */
    switchToView(viewId) {
        // 모든 뷰 숨기기
        DOM.$$('.app-view').forEach(view => {
            view.classList.remove('active');
            DOM.hide(view);
        });

        // 대상 뷰 표시
        const targetView = DOM.$('#' + viewId);
        if (targetView) {
            targetView.classList.add('active');
            DOM.show(targetView);
            
            // 페이지 상단으로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    /**
     * [Render: Nav]
     * 상단 네비게이션을 렌더링합니다.
     */
    renderNav() {
        const container = DOM.$('#main-nav-container');
        if (!container) return;
        container.innerHTML = '<nav class="w-full max-w-4xl flex items-center justify-between py-3 px-6 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-lg">'
            + '<a href="/" data-route class="font-extrabold text-xl tracking-tight">InsureLog</a>'
            + '<div class="flex items-center gap-4">'
            +   '<a href="/" data-route class="text-sm text-gray-800 hover:text-black">홈</a>'
            +   '<a href="/writer" data-route class="text-sm text-gray-800 hover:text-black">글쓰기</a>'
            +   '<a href="/dashboard" data-route class="text-sm text-gray-800 hover:text-black">대시보드</a>'
            +   '<a href="/login" data-route class="text-sm px-3 py-1 rounded-full bg-black/5 hover:bg-black/10">로그인</a>'
            + '</div>'
            + '</nav>';
    }

    /**
     * [Render: Home]
     * 홈(라이브러리) 뷰를 렌더링합니다.
     */
    renderHome(params = new URLSearchParams()) {
        this.switchToView('view-library');
        const container = DOM.$('#view-library');
        if (container) {
            container.innerHTML = '<section class="max-w-4xl mx-auto py-10 px-6">'
                + '<h1 class="text-2xl font-bold mb-2">최근 글</h1>'
                + '<p class="text-sm text-gray-600">최신 게시글을 불러오는 중입니다...</p>'
                + '<div id="home-posts" class="mt-6 grid grid-cols-1 gap-4"></div>'
                + '</section>';

            // 비동기 데이터 로드 시작
            this.loadHomePosts(params).catch(err => this.handleError(err, 'loadHomePosts'));
        }
    }

    /**
     * [Render: Post]
     * 포스트 상세를 렌더링합니다.
     */
    renderPost(slug) {
        this.switchToView('view-post');
        const container = DOM.$('#view-post');
        if (!container) return;

        container.innerHTML = '<article class="max-w-3xl mx-auto py-10 px-6">'
            + '<div class="mb-6">'
            +   '<div class="h-8 w-2/3 bg-gray-200 animate-pulse rounded"></div>'
            + '</div>'
            + '<div class="space-y-3">'
            +   '<div class="h-5 bg-gray-200 animate-pulse rounded"></div>'
            +   '<div class="h-5 bg-gray-200 animate-pulse rounded"></div>'
            + '</div>'
            + '</article>';

        this.loadPostDetail(slug).catch(err => this.handleError(err, 'loadPostDetail'));
    }

    /**
     * [Render: Writer]
     * 글쓰기/수정 뷰를 렌더링합니다.
     */
    renderWriter(slug) {
        this.switchToView('view-writer');
        const container = DOM.$('#view-writer');
        if (!container) return;
        const isEdit = !!slug;
        container.innerHTML = '<section class="max-w-4xl mx-auto py-10 px-6">'
            + `<h1 class="text-2xl font-bold">${isEdit ? '글 수정' : '글 작성'}</h1>`
            + '<form id="writer-form" class="mt-6 space-y-5">'
            +   '<div><label class="block text-sm font-medium">제목</label><input id="post-title" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="제목을 입력하세요" required></div>'
            +   '<div><label class="block text-sm font-medium">요약</label><textarea id="post-summary" class="mt-1 w-full border rounded-lg p-2 h-20" placeholder="요약을 입력하세요"></textarea></div>'
            +   '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
            +     '<div><label class="block text-sm font-medium">카테고리</label><input id="post-category" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="예: 기술"></div>'
            +     '<div><label class="block text-sm font-medium">상태</label><select id="post-status" class="mt-1 w-full border rounded-lg p-2"><option value="draft">초안</option><option value="published">발행</option></select></div>'
            +   '</div>'
            +   '<div><label class="block text-sm font-medium">태그</label><input id="post-tags" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="태그를 쉼표로 구분해 입력 (예: 보험,자동차,가이드)"></div>'
            +   '<div><label class="block text-sm font-medium">썸네일 이미지</label><input id="post-thumb" type="file" accept="image/*" class="mt-1 w-full"/></div>'
            +   '<div><label class="block text-sm font-medium">콘텐츠 (복사/붙여넣기 지원)</label>'
            +   '<div id="editor-toolbar" class="mt-2 flex flex-wrap gap-2">'
            +     '<button type="button" data-cmd="bold" class="px-2 py-1 text-xs rounded border">굵게</button>'
            +     '<button type="button" data-cmd="italic" class="px-2 py-1 text-xs rounded border">기울임</button>'
            +     '<button type="button" data-cmd="underline" class="px-2 py-1 text-xs rounded border">밑줄</button>'
            +     '<button type="button" data-cmd="h1" class="px-2 py-1 text-xs rounded border">H1</button>'
            +     '<button type="button" data-cmd="h2" class="px-2 py-1 text-xs rounded border">H2</button>'
            +     '<button type="button" data-cmd="p" class="px-2 py-1 text-xs rounded border">본문</button>'
            +     '<button type="button" data-cmd="ul" class="px-2 py-1 text-xs rounded border">목록</button>'
            +     '<button type="button" data-cmd="ol" class="px-2 py-1 text-xs rounded border">번호목록</button>'
            +     '<button type="button" data-cmd="quote" class="px-2 py-1 text-xs rounded border">인용</button>'
            +     '<button type="button" data-cmd="code" class="px-2 py-1 text-xs rounded border">코드</button>'
            +     '<button type="button" data-cmd="link" class="px-2 py-1 text-xs rounded border">링크</button>'
            +     '<button type="button" data-cmd="clear" class="px-2 py-1 text-xs rounded border">서식해제</button>'
            +   '</div>'
            +   '<div id="post-content-editor" contenteditable="true" class="mt-2 w-full border rounded-lg p-3 h-64 overflow-auto prose prose-sm focus:outline-none" placeholder="다른 글을 복사해 붙여넣으면 형식이 유지됩니다."></div>'
            +   '<p class="text-xs text-gray-500 mt-1">붙여넣기 시 기본 서식(굵게, 제목, 목록 등)이 유지됩니다. 저장 시 안전하게 정제된 HTML로 저장합니다.</p>'
            +   '</div>'
            +   '<div class="flex items-center gap-3">'
            +     '<button type="submit" class="px-4 py-2 rounded-full bg-black text-white">저장</button>'
            +     '<a href="/" data-route class="px-4 py-2 rounded-full bg-black/5">취소</a>'
            +   '</div>'
            + '</form>'
            + '</section>';

        // 편집 모드 데이터 로드
        if (isEdit) {
            this.loadWriterData(slug).catch(err => this.handleError(err, 'loadWriterData'));
        }

        const form = DOM.$('#writer-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitWriterForm(isEdit ? slug : null);
            }, { once: true });
        }
        // 에디터 확장 초기화
        this.setupContentEditor(isEdit ? slug : null);
    }

    /**
     * [Render: Login]
     * 로그인 뷰를 렌더링합니다.
     */
    renderLogin() {
        this.switchToView('view-library');
        const container = DOM.$('#view-library');
        if (container) {
            container.innerHTML = '<section class="max-w-sm mx-auto py-16 px-6 text-center">'
                + '<h1 class="text-xl font-bold">로그인</h1>'
                + '<p class="text-sm text-gray-600 mt-2">Supabase 인증 UI 연동 준비 중...</p>'
                + '<div class="mt-6">'
                +   '<a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">홈으로</a>'
                + '</div>'
                + '</section>';
        }
    }

    /**
     * [Render: 404]
     * 404 뷰를 렌더링합니다.
     */
    render404() {
        this.switchToView('view-library');
        const container = DOM.$('#view-library');
        if (container) {
            container.innerHTML = '<section class="max-w-md mx-auto py-20 px-6 text-center">'
                + '<h1 class="text-2xl font-extrabold">페이지를 찾을 수 없습니다</h1>'
                + '<p class="text-sm text-gray-600 mt-2">요청하신 페이지가 존재하지 않습니다.</p>'
                + '<div class="mt-6">'
                +   '<a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">홈으로</a>'
                + '</div>'
                + '</section>';
        }
    }

    /**
     * [Error Handling]
     * 에러를 처리하고 사용자에게 알립니다.
     */
    handleError(error, context = '') {
        console.error('Error in ' + context + ':', error);
        
        let message = '오류가 발생했습니다.';
        
        if (error.message?.includes('fetch')) {
            message = '네트워크 연결을 확인해주세요.';
        } else if (error.message?.includes('auth')) {
            message = '로그인이 필요합니다.';
        } else if (error.message?.includes('permission')) {
            message = '권한이 없습니다.';
        }
        
        UIComponents.showToast(message, 'error');
    }

    /**
     * [Utility Methods]
     */
    
    // 로딩 상태 관리
    setLoading(isLoading, container = '#app-container') {
        if (isLoading) {
            DOM.showLoading(container);
        } else {
            DOM.hideLoading(container);
        }
    }

    // 사용자 권한 확인
    checkAuth(redirectToLogin = true) {
        if (!this.state.user) {
            if (redirectToLogin) {
                UIComponents.showToast('로그인이 필요합니다.', 'warning');
                this.navigate('/login');
            }
            return false;
        }
        return true;
    }

    // 페이지 메타데이터 업데이트
    updatePageMeta(title, description, url) {
        document.title = title;
        
        // Open Graph 메타태그 업데이트
        const ogTitle = DOM.$('meta[property="og:title"]');
        const ogDesc = DOM.$('meta[property="og:description"]');
        const ogUrl = DOM.$('meta[property="og:url"]');
        
        if (ogTitle) ogTitle.content = title;
        if (ogDesc) ogDesc.content = description;
        if (ogUrl) ogUrl.content = url;
        
        // Twitter 메타태그 업데이트
        const twitterTitle = DOM.$('meta[name="twitter:title"]');
        const twitterDesc = DOM.$('meta[name="twitter:description"]');
        
        if (twitterTitle) twitterTitle.content = title;
        if (twitterDesc) twitterDesc.content = description;
    }

    async loadWriterData(slug) {
        if (!this.supabase) return;
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const { data: post, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
        if (error) throw error;
        if (!post) return;
        DOM.$('#post-title').value = post.title || '';
        DOM.$('#post-summary').value = post.summary || '';
        DOM.$('#post-category').value = post.category || '';
        DOM.$('#post-status').value = post.status || 'draft';
        const editor = DOM.$('#post-content-editor');
        if (editor) {
            // 기존 저장 포맷(JSON/Markdown/HTML)에 관계없이 미리보기 HTML로 변환해 편집기에 채웁니다.
            const html = this.renderContentHTML(post.refined_content);
            editor.innerHTML = html;
            // 저장된 태그 추출 후 입력창에 채우기
            const tags = this.extractTagsFromHTML(post.refined_content);
            const tagInput = DOM.$('#post-tags');
            if (tagInput && tags.length) tagInput.value = tags.join(',');
        }
    }

    async submitWriterForm(editSlug = null) {
        try {
            if (!this.supabase) throw new Error('Supabase가 준비되지 않았습니다');
            const title = DOM.$('#post-title').value.trim();
            const summary = DOM.$('#post-summary').value.trim();
            const category = DOM.$('#post-category').value.trim();
            const status = DOM.$('#post-status').value;
            const fileInput = DOM.$('#post-thumb');
            // contenteditable 편집기에서 HTML 추출 및 정제
            const editor = DOM.$('#post-content-editor');
            let refined_content = '';
            if (editor) {
                const rawHTML = editor.innerHTML || '';
                refined_content = window.DOMPurify ? window.DOMPurify.sanitize(rawHTML) : rawHTML;
                // 태그 입력을 숨은 data-tags로 콘텐츠 상단에 주입
                const tagInput = DOM.$('#post-tags');
                const tagsStr = (tagInput?.value || '').trim();
                if (tagsStr) {
                    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
                    const hidden = `<div data-tags="${this.escapeHTML(tags.join(','))}" style="display:none"></div>`;
                    refined_content = hidden + refined_content;
                }
                // 이미지 alt 자동 보정: 캡션/제목/파일명 기반
                refined_content = this.ensureImageAltAttributes(refined_content, title);
                // 요약 자동 생성: 입력이 비어있으면 본문에서 160자 추출
                const summaryEl = DOM.$('#post-summary');
                if (summaryEl && !summaryEl.value.trim()) {
                    const text = editor.innerText || '';
                    summaryEl.value = text.replace(/\s+/g, ' ').trim().slice(0, 160);
                }
            } else {
                // 폴백: 이전 텍스트에리어 값 사용 (호환)
                const contentRaw = (DOM.$('#post-content')?.value) || '';
                try { const obj = JSON.parse(contentRaw); refined_content = JSON.stringify(obj); } catch { refined_content = contentRaw; }
            }

            // 슬러그 생성/중복 처리
            let slug = editSlug || this.slugify(title);
            slug = await this.ensureUniqueSlug(slug, editSlug);

            // 썸네일 업로드
            let thumbnail_url = null;
            if (fileInput && fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                const path = `thumbnails/${slug}.webp`;
                // 버킷 경로만 저장 (public URL은 렌더링 시 transform 옵션으로 생성)
                thumbnail_url = await this.uploadImageToBucket(file, path);
            }

            const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
            const now = new Date().toISOString();
            const base = {
                title, summary, category, status,
                refined_content,
                slug,
                updated_at: now,
                author_id: this.state.user?.id || null,
            };
            if (thumbnail_url) base.thumbnail_url = thumbnail_url;

            let res;
            if (editSlug) {
                res = await this.supabase.from(table).update(base).eq('slug', editSlug).select('id').maybeSingle();
            } else {
                base.created_at = now;
                base.view_count = 0;
                res = await this.supabase.from(table).insert(base).select('id').maybeSingle();
            }
            if (res.error) throw res.error;

            UIComponents.showToast('글이 저장되었습니다.', 'success');
            if (status === 'published') {
                this.navigate('/post/' + slug);
            } else {
                this.navigate('/');
            }
        } catch (e) {
            this.handleError(e, 'submitWriterForm');
        }
    }

    slugify(str) {
        return String(str || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/-+/g, '-');
    }

    async ensureUniqueSlug(slug, originalSlug = null) {
        if (!this.supabase) return slug;
        if (originalSlug && slug === originalSlug) return slug;
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const { data, error } = await this.supabase.from(table).select('slug').eq('slug', slug).limit(1);
        if (error) return slug;
        if (!data || data.length === 0) return slug;
        // 충돌 시 suffix 부여
        const suffix = Math.random().toString(36).slice(2, 6);
        return `${slug}-${suffix}`;
    }

    /**
     * [Detail] 포스트 상세 로드 및 렌더링
     */
    async loadPostDetail(slug) {
        const container = DOM.$('#view-post');
        if (!this.supabase) {
            container.innerHTML = '<div class="max-w-3xl mx-auto py-10 px-6 text-gray-600">데이터 소스가 준비되지 않았습니다.</div>';
            return;
        }

        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const { data: post, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .maybeSingle();

        if (error) throw error;
        if (!post) {
            container.innerHTML = '<section class="max-w-md mx-auto py-20 px-6 text-center">'
                + '<h1 class="text-2xl font-extrabold">글을 찾을 수 없습니다</h1>'
                + '<p class="text-sm text-gray-600 mt-2">요청하신 글이 존재하지 않습니다.</p>'
                + '<div class="mt-6"><a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">홈으로</a></div>'
                + '</section>';
            return;
        }

        // view_count 증가 (낙관적 업데이트)
        try {
            await this.supabase.from(table).update({ view_count: (post.view_count || 0) + 1 }).eq('id', post.id);
        } catch (e) { console.warn('view_count update 실패:', e); }

        const title = this.escapeHTML(post.title || '제목 없음');
        const date = this.formatDate(post.created_at);
        const category = post.category ? `<span class="text-xs px-2 py-1 rounded-full bg-black/5">${this.escapeHTML(post.category)}</span>` : '';
        const tags = this.extractTagsFromHTML(post.refined_content);
        const tagsHtml = tags && tags.length ? `<div class="mt-2 flex flex-wrap gap-2">${tags.map(t => `<span class=\"text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200\">${this.escapeHTML(t)}</span>`).join('')}</div>` : '';

        // 썸네일 (최적화 URL)
        let thumbHtml = '';
        if (post.thumbnail_url) {
            const optimized = this.getTransformedPublicUrl(post.thumbnail_url, { width: 1200, height: 630, resize: 'cover', quality: 85, format: 'webp' });
            thumbHtml = `<img src="${optimized}" alt="${title}" class="w-full h-auto rounded-2xl border"/>`;
        }

        const contentHTML = this.renderContentHTML(post.refined_content);

        container.innerHTML = '<article class="max-w-3xl mx-auto py-10 px-6">'
            + `<h1 class="text-3xl font-extrabold tracking-tight">${title}</h1>`
            + `<div class="mt-2 text-sm text-gray-500 flex items-center gap-3"><span>${date}</span>${category}</div>`
            + `${tagsHtml}`
            + (thumbHtml ? `<div class="mt-6">${thumbHtml}</div>` : '')
            + `<div class="prose prose-neutral max-w-none mt-8">${contentHTML}</div>`
            + '<div class="mt-8 flex items-center gap-3">'
            +   '<button id="btn-like" class="px-3 py-1 rounded-full border">좋아요 <span id="like-count"></span></button>'
            +   '<button id="btn-share" class="px-3 py-1 rounded-full border">공유</button>'
            +   '<button id="btn-copy" class="px-3 py-1 rounded-full border">링크복사</button>'
            + '</div>'
            + '<div id="related-posts" class="mt-12"></div>'
            + '</article>';

        // 메타 업데이트
        this.updatePageMeta(post.title, post.summary || '', window.location.href);

        // 공유/좋아요 초기화
        try {
            const likeKey = 'likes:' + (post.slug || post.id);
            const countEl = DOM.$('#like-count');
            const btnLike = DOM.$('#btn-like');
            const btnShare = DOM.$('#btn-share');
            const btnCopy = DOM.$('#btn-copy');
            let likeCount = Number(localStorage.getItem(likeKey) || '0');
            if (countEl) countEl.textContent = String(likeCount);
            if (btnLike) btnLike.addEventListener('click', () => {
                likeCount += 1;
                localStorage.setItem(likeKey, String(likeCount));
                if (countEl) countEl.textContent = String(likeCount);
            });
            if (btnShare) btnShare.addEventListener('click', async () => {
                try {
                    if (navigator.share) {
                        await navigator.share({ title: post.title, text: post.summary || '', url: window.location.href });
                    } else {
                        await navigator.clipboard.writeText(window.location.href);
                        UIComponents.showToast('링크가 복사되었습니다.', 'success');
                    }
                } catch (e) { /* ignore */ }
            });
            if (btnCopy) btnCopy.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    UIComponents.showToast('링크가 복사되었습니다.', 'success');
                } catch (e) { /* ignore */ }
            });
        } catch (e) { /* non-critical */ }

        // 관련 글 로드
        this.loadRelatedPosts(post).catch(err => this.handleError(err, 'loadRelatedPosts'));
    }

    renderContentHTML(refined) {
        if (!refined) return '<p class="text-gray-600">콘텐츠가 아직 준비되지 않았습니다.</p>';
        // JSON (Editor.js) 또는 Markdown 텍스트 둘 다 지원
        try {
            const obj = typeof refined === 'string' ? JSON.parse(refined) : refined;
            if (obj && Array.isArray(obj.blocks)) {
                return obj.blocks.map(b => this.renderEditorBlock(b)).join('');
            }
            // Quill Delta 호환 (향후 확장 대비)
            if (obj && obj.ops && Array.isArray(obj.ops)) {
                // Delta를 간단한 HTML로 변환 (bold/italic/list 등 기본 처리)
                const html = obj.ops.map(op => {
                    const insert = typeof op.insert === 'string' ? this.escapeHTML(op.insert) : '';
                    const attrs = op.attributes || {};
                    let s = insert;
                    if (attrs.bold) s = `<strong>${s}</strong>`;
                    if (attrs.italic) s = `<em>${s}</em>`;
                    if (attrs.underline) s = `<u>${s}</u>`;
                    return s;
                }).join('');
                return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
            }
        } catch { /* not JSON */ }

        // 직접 HTML 문자열인 경우 그대로 정제하여 반환
        if (typeof refined === 'string' && /<\w+[^>]*>/i.test(refined)) {
            const html = refined;
            return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        }
        // Markdown 처리
        if (window.marked) {
            const dirty = typeof refined === 'string' ? refined : String(refined);
            const html = window.marked.parse(dirty);
            return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        }
        return `<pre>${this.escapeHTML(typeof refined === 'string' ? refined : JSON.stringify(refined))}</pre>`;
    }

    renderEditorBlock(b) {
        const type = b.type;
        const data = b.data || {};
        switch (type) {
            case 'paragraph':
                return `<p>${this.escapeHTML(data.text || '')}</p>`;
            case 'header':
                return `<h${data.level || 2}>${this.escapeHTML(data.text || '')}</h${data.level || 2}>`;
            case 'list':
                const items = (data.items || []).map(it => `<li>${this.escapeHTML(it)}</li>`).join('');
                return data.style === 'ordered' ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
            case 'quote':
                return `<blockquote>${this.escapeHTML(data.text || '')}</blockquote>`;
            case 'image':
                if (data.file?.url) {
                    const baseAlt = this.escapeHTML(data.caption || '');
                    const conn = (navigator && navigator.connection) ? navigator.connection : {};
                    const saveData = !!conn.saveData;
                    const et = conn.effectiveType || '';
                    const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
                    const w = isSlow ? [360, 600] : [480, 768, 1200];
                    const mainW = isSlow ? 900 : 1200;
                    const mainQ = isSlow ? 75 : 85;
                    const setQ = isSlow ? 60 : 80;
                    const sizes = isSlow ? '(max-width: 600px) 100vw, 600px' : '(max-width: 768px) 100vw, 768px';
                    const src = this.getOptimizedPublicUrl(data.file.url, { width: mainW, quality: mainQ, format: 'webp' });
                    const srcset = w.map(x => `${this.getOptimizedPublicUrl(data.file.url, { width: x, quality: setQ, format: 'webp' })} ${x}w`).join(', ');
                    const sizeAttrs = (data.width && data.height) ? ` width="${data.width}" height="${data.height}"` : '';
                    return `<figure><img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${baseAlt}" loading="lazy" decoding="async"${sizeAttrs}/><figcaption>${baseAlt}</figcaption></figure>`;
                }
                return '';
            case 'code':
                return `<pre><code>${this.escapeHTML(data.code || '')}</code></pre>`;
            default:
                return '';
        }
    }

    // 에디터 초기화: 툴바/서식 및 이미지 드롭/붙여넣기 처리
    setupContentEditor(currentSlug = null) {
        const editor = DOM.$('#post-content-editor');
        const toolbar = DOM.$('#editor-toolbar');
        if (!editor) return;
        // 기본 문단 처리
        editor.addEventListener('focus', () => document.execCommand('defaultParagraphSeparator', false, 'p'));
        // 선택 변경 시 툴바 상태 업데이트
        const updateToolbarState = () => {
            if (!toolbar) return;
            const setActive = (cmd, active) => {
                const btn = toolbar.querySelector(`button[data-cmd="${cmd}"]`);
                if (btn) btn.classList.toggle('bg-black text-white', !!active);
            };
            try {
                setActive('bold', document.queryCommandState('bold'));
                setActive('italic', document.queryCommandState('italic'));
                setActive('underline', document.queryCommandState('underline'));
                const block = document.queryCommandValue('formatBlock');
                setActive('h1', /H1/i.test(block));
                setActive('h2', /H2/i.test(block));
                setActive('p', /P/i.test(block));
            } catch { /* 호환성 */ }
        };
        document.addEventListener('selectionchange', () => {
            if (document.activeElement === editor) updateToolbarState();
        });
        // 툴바 명령
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-cmd]');
                if (!btn) return;
                const cmd = btn.getAttribute('data-cmd');
                this.execEditorCommand(cmd);
                editor.focus();
                updateToolbarState();
            });
        }
        // 에디터 단축키 (Windows/웹 일반): Ctrl+B/I/U, Ctrl+Shift+1/2
        editor.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl) {
                if (e.key.toLowerCase() === 'b') { e.preventDefault(); this.execEditorCommand('bold'); updateToolbarState(); }
                if (e.key.toLowerCase() === 'i') { e.preventDefault(); this.execEditorCommand('italic'); updateToolbarState(); }
                if (e.key.toLowerCase() === 'u') { e.preventDefault(); this.execEditorCommand('underline'); updateToolbarState(); }
                if (e.shiftKey && e.key === '1') { e.preventDefault(); this.execEditorCommand('h1'); updateToolbarState(); }
                if (e.shiftKey && e.key === '2') { e.preventDefault(); this.execEditorCommand('h2'); updateToolbarState(); }
            }
        });
        // 이미지 드롭
        editor.addEventListener('dragover', (e) => { e.preventDefault(); });
        editor.addEventListener('drop', async (e) => {
            e.preventDefault();
            const files = e.dataTransfer?.files;
            if (files && files.length) {
                await this.handleEditorFiles(files, currentSlug);
            }
        });
        // 이미지 붙여넣기
        editor.addEventListener('paste', async (e) => {
            const items = e.clipboardData?.items || [];
            const files = [];
            for (const it of items) {
                if (it.kind === 'file') {
                    const f = it.getAsFile();
                    if (f && f.type.startsWith('image/')) files.push(f);
                }
            }
            if (files.length) {
                e.preventDefault();
                await this.handleEditorFiles(files, currentSlug);
            }
        });
        // 캡션 편집 UX 및 alt 동기화
        editor.addEventListener('click', (e) => {
            const cap = e.target.closest('figcaption');
            if (cap) { cap.setAttribute('contenteditable', 'true'); cap.focus(); }
        });
        editor.addEventListener('input', (e) => {
            const cap = e.target.closest('figcaption');
            if (cap) {
                const fig = cap.closest('figure');
                const img = fig ? fig.querySelector('img') : null;
                if (img) {
                    const text = cap.textContent.trim();
                    img.setAttribute('alt', text || img.getAttribute('alt') || '');
                }
            }
        });
        editor.addEventListener('blur', (e) => {
            if (e.target && e.target.matches('figcaption')) e.target.removeAttribute('contenteditable');
        }, true);
    }

    execEditorCommand(cmd) {
        switch (cmd) {
            case 'bold': document.execCommand('bold'); break;
            case 'italic': document.execCommand('italic'); break;
            case 'underline': document.execCommand('underline'); break;
            case 'h1': document.execCommand('formatBlock', false, 'h1'); break;
            case 'h2': document.execCommand('formatBlock', false, 'h2'); break;
            case 'p': document.execCommand('formatBlock', false, 'p'); break;
            case 'ul': document.execCommand('insertUnorderedList'); break;
            case 'ol': document.execCommand('insertOrderedList'); break;
            case 'quote': document.execCommand('formatBlock', false, 'blockquote'); break;
            case 'code': this.insertHTMLAtCursor('<pre><code></code></pre>'); break;
            case 'link': {
                const url = prompt('링크 URL을 입력하세요');
                if (url) document.execCommand('createLink', false, url);
                break;
            }
            case 'clear': document.execCommand('removeFormat'); break;
            default: break;
        }
    }

    insertHTMLAtCursor(html) {
        document.execCommand('insertHTML', false, html);
    }

    async handleEditorFiles(files, currentSlug) {
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files.item ? files.item(i) : files[i];
                if (!file || !file.type.startsWith('image/')) continue;
                const name = `img_${Date.now()}_${i}.webp`;
                const path = `content-images/${name}`;
                const { savedPath, width, height } = await this.uploadImageToBucket(file, path);
                // 네트워크 상태에 따라 메인 이미지 폭/품질 조정
                const conn = (navigator && navigator.connection) ? navigator.connection : {};
                const saveData = !!conn.saveData;
                const et = conn.effectiveType || '';
                const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
                const mainW = isSlow ? 900 : 1200;
                const mainQ = isSlow ? 75 : 85;
                const setQ = isSlow ? 60 : 80;
                const url = this.getTransformedPublicUrl(savedPath, { width: mainW, quality: mainQ, format: 'webp' });
                const alt = this.deriveAltFromFileName(file.name || name);
                const widths = isSlow ? [360, 600] : [480, 768, 1200];
                const srcset = widths.map(x => `${this.getTransformedPublicUrl(savedPath, { width: x, quality: setQ, format: 'webp' })} ${x}w`).join(', ');
                const sizes = isSlow ? '(max-width: 600px) 100vw, 600px' : '(max-width: 768px) 100vw, 768px';
                // width/height 속성으로 CLS를 줄입니다.
                const sizeAttrs = (width && height) ? ` width="${width}" height="${height}"` : '';
                this.insertHTMLAtCursor(`<figure><img src="${url}" srcset="${srcset}" sizes="${sizes}" alt="${this.escapeHTML(alt)}" loading="lazy" decoding="async"${sizeAttrs}/><figcaption>${this.escapeHTML(alt)}</figcaption></figure>`);
            }
        } catch (e) {
            this.handleError(e, 'handleEditorFiles');
        }
    }

    extractTagsFromHTML(refined) {
        try {
            const html = typeof refined === 'string' ? refined : String(refined || '');
            const div = document.createElement('div');
            div.innerHTML = html;
            const tagEl = div.querySelector('[data-tags]');
            const val = tagEl?.getAttribute('data-tags') || '';
            return val.split(',').map(t => t.trim()).filter(Boolean);
        } catch { return []; }
    }

    async loadRelatedPosts(post) {
        if (!this.supabase) return;
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const { data, error } = await this.supabase
            .from(table)
            .select('id, title, summary, slug, category, thumbnail_url, created_at')
            .eq('status', 'published')
            .neq('id', post.id)
            .eq('category', post.category)
            .order('created_at', { ascending: false })
            .limit(4);
        if (error) throw error;
        const container = DOM.$('#related-posts');
        if (!container) return;
        if (!data || data.length === 0) { container.innerHTML = ''; return; }
        const cards = data.map(p => {
            const url = '/post/' + (p.slug || p.id);
            const thumb = p.thumbnail_url ? `<img src="${this.getTransformedPublicUrl(p.thumbnail_url, { width: 360, height: 200, resize: 'cover', quality: 80, format: 'webp' })}" class="w-full h-32 object-cover rounded-xl border"/>` : '';
            return '<article class="p-4 border rounded-2xl bg-white">'
                + (thumb ? `<a href="${url}" data-route>${thumb}</a>` : '')
                + `<h3 class="mt-2 text-base font-semibold"><a href="${url}" data-route>${this.escapeHTML(p.title)}</a></h3>`
                + `<p class="text-xs text-gray-600">${this.formatDate(p.created_at)}</p>`
                + '</article>';
        }).join('');
        container.innerHTML = '<h2 class="text-lg font-bold mb-3">관련 글</h2>'
            + `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cards}</div>`;
    }

    // 파일명으로부터 alt 텍스트 유도어 생성
    deriveAltFromFileName(name = '') {
        try {
            let base = String(name || '').replace(/\.[a-z0-9]+$/i, '');
            base = decodeURIComponent(base);
            base = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
            return base || '이미지';
        } catch {
            return '이미지';
        }
    }

    // 저장 전에 본문 내 이미지에 alt 누락 시 caption/제목/파일명으로 보정
    ensureImageAltAttributes(html, title = '') {
        try {
            const div = document.createElement('div');
            div.innerHTML = String(html || '');
            const imgs = div.querySelectorAll('img');
            imgs.forEach(img => {
                const currentAlt = (img.getAttribute('alt') || '').trim();
                if (currentAlt) return;
                let altText = '';
                const fig = img.closest('figure');
                const cap = fig ? fig.querySelector('figcaption') : null;
                altText = (cap?.textContent || '').trim();
                if (!altText) altText = String(title || '').trim();
                if (!altText) {
                    const src = img.getAttribute('src') || '';
                    try {
                        const u = new URL(src, window.location.origin);
                        const file = (u.pathname.split('/').pop() || '').split('?')[0];
                        altText = this.deriveAltFromFileName(file);
                    } catch {
                        const file = (src.split('/').pop() || '').split('?')[0];
                        altText = this.deriveAltFromFileName(file);
                    }
                }
                img.setAttribute('alt', altText || '이미지');
                if (cap && !cap.textContent.trim()) cap.textContent = altText || '이미지';
            });
            return div.innerHTML;
        } catch {
            return html;
        }
    }

    // Supabase 이미지 최적화 Public URL 생성 (기존 public URL 대상)
    getOptimizedPublicUrl(publicUrlOrPath, opts = {}) {
        try {
            // 이미 완전한 public URL이면 그대로 변형 쿼리 추가
            // Supabase Transformation CDN: ?width=&height=&resize=&format=&quality= 등
            const u = new URL(publicUrlOrPath, window.location.origin);
            const isSupabase = /supabase\.co\/.+\/object\/public\//.test(u.href);
            if (!isSupabase) return publicUrlOrPath;
            const params = new URLSearchParams();
            if (opts.width) params.set('width', String(opts.width));
            if (opts.height) params.set('height', String(opts.height));
            if (opts.resize) params.set('resize', String(opts.resize));
            if (opts.format) params.set('format', String(opts.format));
            if (opts.quality) params.set('quality', String(opts.quality));
            const q = params.toString();
            if (!q) return u.href;
            // 기존 쿼리가 있으면 &로 이어 붙이기
            return u.search && u.search.length > 1 ? `${u.href}&${q}` : `${u.href}?${q}`;
        } catch {
            return publicUrlOrPath;
        }
    }

    // Supabase Storage 버킷 경로로부터 변환 Public URL 생성 (권장)
    getTransformedPublicUrl(pathOrUrl, opts = {}) {
        try {
            if (!pathOrUrl) return '';
            // 기존 레코드가 완전한 URL을 저장한 경우 호환 처리
            if (/^https?:\/\//i.test(pathOrUrl)) {
                return this.getOptimizedPublicUrl(pathOrUrl, opts);
            }
            const bucket = (window.Config && window.Config.IMAGE_BUCKET_NAME) || 'thought-images';
            const res = this.supabase.storage.from(bucket).getPublicUrl(pathOrUrl, { transform: {
                width: opts.width,
                height: opts.height,
                resize: opts.resize,
                format: opts.format,
                quality: opts.quality,
            }});
            return res?.data?.publicUrl || '';
        } catch {
            return '';
        }
    }

    /**
     * [Data] 최근 글 로드 및 렌더링
     */
    async loadHomePosts(params = new URLSearchParams()) {
        const container = DOM.$('#home-posts');
        if (!container) return;

        // 로딩 스켈레톤 표시
        container.innerHTML = '<div class="animate-pulse space-y-3">'
            + '<div class="h-6 bg-gray-200 rounded"></div>'
            + '<div class="h-24 bg-gray-200 rounded"></div>'
            + '<div class="h-24 bg-gray-200 rounded"></div>'
            + '</div>';

        if (!this.supabase) {
            container.innerHTML = '<div class="text-gray-500">데이터 소스가 준비되지 않았습니다.</div>';
            return;
        }

        const page = Number(params.get('page') || '1');
        const perPage = (window.Config && window.Config.POSTS_PER_PAGE) || 10;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';

        const { data, error } = await this.supabase
            .from(table)
            .select('id, title, summary, slug, category, thumbnail_url, created_at, view_count, status')
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-gray-500">표시할 게시글이 없습니다.</div>';
            return;
        }

        container.innerHTML = this.renderPostsListHTML(data);
    }

    // 게시글 카드 리스트 HTML 생성
    renderPostsListHTML(posts) {
        return posts.map((post, idx) => {
            const href = '/post/' + (post.slug || post.id);
            const conn = (navigator && navigator.connection) ? navigator.connection : {};
            const saveData = !!conn.saveData;
            const et = conn.effectiveType || '';
            const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
            const baseW = 640, baseH = 240;
            const q = isSlow ? 70 : 80;
            const widths = isSlow ? [320, 480, 640] : [360, 480, 640];
            const sizes = '(max-width: 640px) 100vw, 640px';
            const thumbUrl = post.thumbnail_url ? this.getTransformedPublicUrl(post.thumbnail_url, { width: baseW, height: baseH, resize: 'cover', quality: q, format: 'webp' }) : null;
            const srcset = post.thumbnail_url ? widths.map(x => `${this.getTransformedPublicUrl(post.thumbnail_url, { width: x, height: Math.round(x * (baseH/baseW)), resize: 'cover', quality: q, format: 'webp' })} ${x}w`).join(', ') : '';
            const eager = idx === 0; // 첫 번째 카드 LCP 개선
            const loading = eager ? '' : ' loading="lazy"';
            const fetchp = eager ? ' fetchpriority="high"' : ' fetchpriority="low"';
            const thumb = thumbUrl ? `<img src="${thumbUrl}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ''} alt="${this.escapeHTML(post.title || '')}" class="w-full h-40 object-cover rounded-xl border" width="${baseW}" height="${baseH}" decoding="async"${loading}${fetchp}/>` : '';
            const date = this.formatDate(post.created_at);
            const category = post.category ? `<span class="text-xs px-2 py-1 rounded-full bg-black/5">${post.category}</span>` : '';

            return '<article class="p-4 border rounded-2xl hover:shadow-sm transition bg-white">'
                + (thumb ? `<a href="${href}" data-route>${thumb}</a>` : '')
                + `<h2 class="mt-3 text-lg font-semibold"><a href="${href}" data-route>${this.escapeHTML(post.title || '제목 없음')}</a></h2>`
                + `<p class="mt-1 text-sm text-gray-600">${this.escapeHTML(post.summary || '')}</p>`
                + `<div class="mt-3 flex items-center justify-between text-xs text-gray-500">`
                +   `<span>${date}</span>`
                +   `${category}`
                + `</div>`
                + '</article>';
        }).join('');
    }

    // 날짜 포맷터
    formatDate(iso) {
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return ''; }
    }

    // 간단한 HTML 이스케이프
    escapeHTML(str) {
        return String(str || '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
    }

    /**
     * [Analytics] 방문 로그 기록
     */
    async logSiteVisit() {
        try {
            const { error } = await this.supabase
                .from('site_visits')
                .insert({ visited_at: new Date().toISOString() });
            if (error) throw error;
        } catch (e) {
            // 심각하지 않으므로 콘솔 경고만 남김
            console.warn('site_visits insert 실패:', e.message || e);
        }
    }

    /**
     * [Storage] 이미지 webp 변환 후 버킷 업로드
     */
    async uploadImageToBucket(file, pathInBucket) {
        const bucket = (window.Config && window.Config.IMAGE_BUCKET_NAME) || 'thought-images';
        const { blob: webpBlob, width, height } = await this.convertToWebP(file);
        const { error } = await this.supabase.storage
            .from(bucket)
            .upload(pathInBucket, webpBlob, { contentType: 'image/webp', upsert: true });
        if (error) throw error;
        // 저장은 버킷 경로로만 (예: thumbnails/slug.webp) + 치수 반환
        return { savedPath: pathInBucket, width, height };
    }

    async convertToWebP(file) {
        // 이미 webp면 그대로 사용
        if (file.type === 'image/webp') {
            const img = await this.readImageFromFile(file);
            return { blob: file, width: img.width, height: img.height };
        }
        const img = await this.readImageFromFile(file);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.9));
        return { blob, width: img.width, height: img.height };
    }

    readImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
            img.onerror = reject;
            img.src = url;
        });
    }
}

// 전역으로 내보내기
window.BlogApp = BlogApp;