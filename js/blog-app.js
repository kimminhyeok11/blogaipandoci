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
        archives: {
            category: '전체',
            tag: '',
            page: 1,
            pageSize: 20,
            total: 0,
        }
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

            // 초기 스크립트 일괄 로드를 제거하고 라우트별로 필요시 로드합니다.

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
        } else if (path === '/archives') {
            this.renderArchives();
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
     * [Render: Archives]
     * 발행된 글을 월별로 그룹핑해 아카이브 리스트를 보여줍니다.
     */
    renderArchives() {
        this.switchToView('view-archives');
        const container = DOM.$('#view-archives');
        if (!container) return;
        const { category, tag } = this.state.archives;
        container.innerHTML = '<section class="max-w-4xl mx-auto py-10 px-6">'
            + '<div class="flex items-center justify-between">'
            +   '<h1 class="text-2xl font-bold">아카이브</h1>'
            +   '<div class="text-xs text-gray-500">페이지당 20개</div>'
            + '</div>'
            + '<div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">'
            +   '<div><label class="block text-xs text-gray-600">카테고리</label><select id="archives-filter-category" class="mt-1 w-full border rounded-lg p-2"><option value="전체">전체</option></select></div>'
            +   '<div><label class="block text-xs text-gray-600">태그</label><input id="archives-filter-tag" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="예: 보험"></div>'
            +   '<div class="flex items-end"><button id="archives-filter-apply" class="w-full px-3 py-2 rounded-lg bg-black text-white">필터 적용</button></div>'
            + '</div>'
            + '<div id="archives-list" class="mt-6 space-y-6"></div>'
            + '<div id="archives-pagination" class="mt-8 flex items-center justify-center gap-2"></div>'
            + '</section>';

        // SEO 메타 업데이트
        this.updatePageMeta('아카이브 - InsureLog', '월별 아카이브와 카테고리/태그 필터', window.location.href, '/og-image.svg');

        // 기존 값 채우기
        const tagInput = DOM.$('#archives-filter-tag');
        if (tagInput) tagInput.value = tag || '';

        // 이벤트 바인딩
        const applyBtn = DOM.$('#archives-filter-apply');
        if (applyBtn) {
            applyBtn.onclick = () => {
                const catSel = DOM.$('#archives-filter-category');
                const tagField = DOM.$('#archives-filter-tag');
                this.state.archives.category = catSel ? catSel.value : '전체';
                this.state.archives.tag = tagField ? tagField.value.trim() : '';
                this.state.archives.page = 1;
                this.loadArchives().catch(err => this.handleError(err, 'loadArchives'));
            };
        }

        this.loadArchives().catch(err => this.handleError(err, 'loadArchives'));
    }

    async loadArchives() {
        if (!this.supabase) return;
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const { category, tag, page, pageSize } = this.state.archives;

        // 총 개수 계산 쿼리 (필터 반영)
        let countQuery = this.supabase.from(table)
            .select('id', { count: 'exact', head: true })
            .eq('status', 'published');
        if (category && category !== '전체') {
            countQuery = countQuery.eq('category', category);
        }
        const { count } = await countQuery;
        this.state.archives.total = count || 0;

        // 데이터 쿼리 (페이지네이션, 필터 적용)
        let dataQuery = this.supabase
            .from(table)
            .select('id, title, slug, created_at, category, refined_content')
            .eq('status', 'published')
            .order('created_at', { ascending: false });
        if (category && category !== '전체') {
            dataQuery = dataQuery.eq('category', category);
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        dataQuery = dataQuery.range(from, to);

        const { data, error } = await dataQuery;
        if (error) throw error;

        // 카테고리 셀렉트 옵션 구성 (최근 페이지 기준)
        const catSet = new Set(['전체']);
        (data || []).forEach(p => { if (p.category) catSet.add(p.category); });
        const catSel = DOM.$('#archives-filter-category');
        if (catSel && catSel.options.length <= 1) {
            catSel.innerHTML = Array.from(catSet).map(c => `<option value="${this.escapeHTML(c)}">${this.escapeHTML(c)}</option>`).join('');
            catSel.value = category || '전체';
        }

        // 태그 필터 클라이언트 적용
        let filtered = data || [];
        if (tag) {
            filtered = filtered.filter(p => {
                const tags = this.extractTagsFromHTML(p.refined_content || '') || [];
                return tags.some(t => String(t).toLowerCase() === String(tag).toLowerCase());
            });
        }

        const list = DOM.$('#archives-list');
        if (!list) return;
        if (!filtered || filtered.length === 0) {
            list.innerHTML = '<div class="text-gray-500">표시할 게시글이 없습니다.</div>';
        } else {
            const groups = {};
            filtered.forEach(p => {
                const d = new Date(p.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(p);
            });
            const html = Object.entries(groups).map(([ym, posts]) => {
                const [y, m] = ym.split('-');
                const items = posts.map(p => {
                    const dateStr = this.formatDateKR(p.created_at);
                    const tags = this.extractTagsFromHTML(p.refined_content || '') || [];
                    const tagHtml = tags.length ? ` · <span class="text-xs text-gray-500">${tags.map(this.escapeHTML).join(', ')}</span>` : '';
                    return `<li class="py-1"><a href="/post/${p.slug}" data-route class="hover:underline">${this.escapeHTML(p.title)}</a> <span class="text-xs text-gray-500">${dateStr}${p.category? ' · '+this.escapeHTML(p.category): ''}${tagHtml}</span></li>`;
                }).join('');
                return '<section>'
                    + `<h2 class="text-xl font-semibold">${y}년 ${m}월 <span class="text-sm text-gray-500">(${posts.length}건)</span></h2>`
                    + `<ul class="mt-2">${items}</ul>`
                    + '</section>';
            }).join('');
            list.innerHTML = html;
        }

        // 페이지네이션 렌더
        this.renderArchivesPagination();
    }

    renderArchivesPagination() {
        const { page, pageSize, total } = this.state.archives;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const container = DOM.$('#archives-pagination');
        if (!container) return;
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        const makeBtn = (p, label = null, active = false) => `<button data-page="${p}" class="px-3 py-1 rounded border ${active? 'bg-black text-white':'hover:bg-black/5'}">${label || p}</button>`;
        const prev = page > 1 ? makeBtn(page - 1, '이전') : '<span class="px-3 py-1 text-gray-400">이전</span>';
        const next = page < totalPages ? makeBtn(page + 1, '다음') : '<span class="px-3 py-1 text-gray-400">다음</span>';
        const windowSize = 5;
        const start = Math.max(1, page - Math.floor(windowSize/2));
        const end = Math.min(totalPages, start + windowSize - 1);
        const pages = [];
        for (let p = start; p <= end; p++) pages.push(makeBtn(p, null, p === page));
        container.innerHTML = prev + pages.join('') + next;
        container.querySelectorAll('button[data-page]').forEach(btn => {
            btn.onclick = () => {
                const targetPage = Number(btn.getAttribute('data-page')) || 1;
                this.state.archives.page = targetPage;
                this.loadArchives().catch(err => this.handleError(err, 'loadArchives'));
            };
        });
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
        const isLoggedIn = !!this.state.user;
        const writerLink = isLoggedIn ? '<a href="/writer" data-route class="text-sm text-gray-800 hover:text-black">글쓰기</a>' : '';
        const dashLink = isLoggedIn ? '<a href="/dashboard" data-route class="text-sm text-gray-800 hover:text-black">대시보드</a>' : '';
        const linksHtml = [
            '<a href="/" data-route class="text-sm text-gray-800 hover:text-black">홈</a>',
            '<a href="/archives" data-route class="text-sm text-gray-800 hover:text-black">아카이브</a>',
            writerLink,
            dashLink,
            '<a href="/feed.xml" class="text-sm text-gray-800 hover:text-black" rel="alternate" type="application/rss+xml">RSS</a>',
            '<a href="/sitemap.xml" class="text-sm text-gray-800 hover:text-black">Sitemap</a>',
            '<a href="/login" data-route class="text-sm px-3 py-1 rounded-full bg-black/5 hover:bg-black/10">로그인</a>'
        ].filter(Boolean).join('');

        container.innerHTML = '<nav class="w-full max-w-4xl flex items-center justify-between py-3 px-6 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-lg">'
            + '<a href="/" data-route class="font-extrabold text-xl tracking-tight">InsureLog</a>'
            + '<button id="nav-toggle" class="sm:hidden text-sm px-3 py-1 rounded-full border hover:bg-black/5" aria-expanded="false" aria-controls="nav-menu">메뉴</button>'
            + '<div id="nav-links" class="hidden sm:flex items-center gap-4">' + linksHtml + '</div>'
            + '</nav>'
            + '<div id="nav-menu" class="hidden sm:hidden fixed inset-0 z-50 bg-black/30" aria-hidden="true">'
            +   '<div class="absolute top-0 right-0 w-64 h-full bg-white shadow-xl p-4">'
            +     '<div class="flex items-center justify-between mb-4">'
            +       '<span class="font-bold">메뉴</span>'
            +       '<button id="nav-close" class="text-sm px-2 py-1 rounded border hover:bg-black/5" aria-label="닫기">닫기</button>'
            +     '</div>'
            +     '<nav class="flex flex-col gap-3">' + linksHtml + '</nav>'
            +   '</div>'
            + '</div>';

        // 햄버거 메뉴 바인딩
        const toggleBtn = DOM.$('#nav-toggle');
        const menu = DOM.$('#nav-menu');
        const closeBtn = DOM.$('#nav-close');
        if (toggleBtn && menu) {
            toggleBtn.onclick = () => {
                const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                toggleBtn.setAttribute('aria-expanded', String(!expanded));
                if (expanded) { menu.classList.add('hidden'); } else { menu.classList.remove('hidden'); }
            };
        }
        if (closeBtn && menu && toggleBtn) {
            closeBtn.onclick = () => { menu.classList.add('hidden'); toggleBtn.setAttribute('aria-expanded', 'false'); };
        }
        if (menu && toggleBtn) {
            menu.addEventListener('click', (e) => {
                if (e.target === menu) {
                    menu.classList.add('hidden');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
            menu.querySelectorAll('a[data-route]').forEach(a => {
                a.addEventListener('click', () => {
                    menu.classList.add('hidden');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                });
            });
        }
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

            // SEO 메타 업데이트
            this.updatePageMeta('InsureLog - 최근 글', '최신 게시글 목록', window.location.href, '/og-image.svg');

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
        // 로그인 사용자만 접근 가능하도록 가드
        if (!this.checkAuth(true)) return;
        this.switchToView('view-writer');
        const container = DOM.$('#view-writer');
        if (!container) return;
        const isEdit = !!slug;
        container.innerHTML = '<section class="max-w-4xl mx-auto py-10 px-6">'
            + `<div class="flex items-center justify-between">`
            +   `<h1 class="text-2xl font-bold">${isEdit ? '글 수정' : '글 작성'}</h1>`
            +   `<button type="button" id="btn-open-post-picker" class="text-sm px-3 py-1 rounded-full border hover:bg-black/5">기존 글 불러오기</button>`
            + `</div>`
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

        // SEO 메타 업데이트
        this.updatePageMeta(
            isEdit ? '글 수정 - InsureLog' : '글 작성 - InsureLog',
            isEdit ? '기존 글을 수정합니다.' : '새 글을 작성합니다.',
            window.location.href,
            '/og-image.svg'
        );

        // 포스트 선택 모달 UI 초기화
        this.renderPostPickerUI();

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

    // 포스트 선택 모달 UI 렌더 및 바인딩
    renderPostPickerUI() {
        const container = DOM.$('#view-writer');
        if (!container) return;
        if (!DOM.$('#post-picker-modal')) {
            const modal = document.createElement('div');
            modal.id = 'post-picker-modal';
            modal.className = 'hidden';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content modal-content-lg">
                        <div class="modal-header">
                            <h2 class="modal-title">기존 글 선택</h2>
                            <button class="modal-close" id="post-picker-close" aria-label="닫기">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <input type="text" id="post-picker-query" class="w-full border rounded-lg p-2" placeholder="제목으로 검색..."/>
                            </div>
                            <div id="post-picker-list" class="space-y-2"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn px-4 py-2 rounded-lg border" id="post-picker-cancel">닫기</button>
                        </div>
                    </div>
                </div>`;
            container.appendChild(modal);
        }

        const openBtn = DOM.$('#btn-open-post-picker');
        const closeBtn = DOM.$('#post-picker-close');
        const cancelBtn = DOM.$('#post-picker-cancel');
        const queryInput = DOM.$('#post-picker-query');

        if (openBtn) {
            openBtn.onclick = () => {
                DOM.openModal('post-picker-modal');
                this.loadPostsForPicker('');
            };
        }
        const doClose = () => DOM.closeModal('post-picker-modal');
        if (closeBtn) closeBtn.onclick = doClose;
        if (cancelBtn) cancelBtn.onclick = doClose;
        if (queryInput) {
            queryInput.oninput = () => {
                clearTimeout(this._postPickerTimer);
                this._postPickerTimer = setTimeout(() => {
                    this.loadPostsForPicker(queryInput.value.trim());
                }, 200);
            };
        }
    }

    async loadPostsForPicker(query = '') {
        try {
            if (!this.supabase) return;
            const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
            let rq = this.supabase
                .from(table)
                .select('id, title, slug, status, created_at')
                .order('created_at', { ascending: false })
                .limit(50);
            if (query) {
                rq = this.supabase
                    .from(table)
                    .select('id, title, slug, status, created_at')
                    .ilike('title', `%${query}%`)
                    .order('created_at', { ascending: false })
                    .limit(50);
            }
            const { data, error } = await rq;
            if (error) throw error;
            const list = DOM.$('#post-picker-list');
            if (!list) return;
            if (!data || data.length === 0) {
                list.innerHTML = '<div class="text-sm text-gray-600">검색 결과가 없습니다.</div>';
                return;
            }
            list.innerHTML = data.map(p => {
            const url = '/writer/' + p.slug;
                const date = this.formatDateKR(p.created_at);
                const statusKor = this.statusToKor(p.status);
                const badge = `<span class="badge">${statusKor}</span>`;
                return `
                    <div class="post-picker-item">
                        <div class="post-picker-main">
                            <a href="${url}" data-route class="post-picker-title">${this.escapeHTML(p.title || '제목 없음')}</a>
                            <div class="post-picker-meta">작성일 ${date} · 상태 ${badge}</div>
                        </div>
                        <div class="post-picker-actions">
                            <a href="${url}" data-route class="btn-xs">편집</a>
                        </div>
                    </div>`;
            }).join('');
        } catch (e) {
            this.handleError(e, 'loadPostsForPicker');
        }
    }

    statusToKor(s) {
        switch (String(s || '').toLowerCase()) {
            case 'published': return '공개';
            case 'private': return '비공개';
            case 'draft':
            default: return '임시';
        }
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

            // SEO 메타 업데이트
            this.updatePageMeta('로그인 - InsureLog', '계정 로그인 페이지', window.location.href, '/og-image.svg');
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

            // SEO 메타 업데이트
            this.updatePageMeta('페이지를 찾을 수 없습니다 - InsureLog', '요청한 페이지가 존재하지 않습니다.', window.location.href, '/og-image.svg');
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
    updatePageMeta(title, description, url, image = null) {
        document.title = title;

        // 기본 메타 설명
        const descMeta = DOM.$('meta[name="description"]');
        if (descMeta) descMeta.content = description || '';

        // URL/이미지 절대경로 변환
        const finalUrl = url || window.location.href;
        let finalImage = image || '/og-image.svg';
        try { finalImage = new URL(finalImage, window.location.origin).href; } catch { /* ignore */ }

        // Canonical 링크 업데이트
        const canonical = DOM.$('link[rel="canonical"]');
        if (canonical) canonical.href = finalUrl;

        // Open Graph 메타태그 업데이트
        const ogTitle = DOM.$('meta[property="og:title"]');
        const ogDesc = DOM.$('meta[property="og:description"]');
        const ogUrl = DOM.$('meta[property="og:url"]');
        const ogImage = DOM.$('meta[property="og:image"]');
        if (ogTitle) ogTitle.content = title;
        if (ogDesc) ogDesc.content = description || '';
        if (ogUrl) ogUrl.content = finalUrl;
        if (ogImage) ogImage.content = finalImage;

        // Twitter 메타태그 업데이트
        const twitterTitle = DOM.$('meta[name="twitter:title"]');
        const twitterDesc = DOM.$('meta[name="twitter:description"]');
        const twitterImage = DOM.$('meta[name="twitter:image"]');
        if (twitterTitle) twitterTitle.content = title;
        if (twitterDesc) twitterDesc.content = description || '';
        if (twitterImage) twitterImage.content = finalImage;
    }

    async loadWriterData(slug) {
        if (!this.supabase) return;
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        // 기본은 슬러그로 조회, 실패 시 id로 재시도 (수정 링크가 id로 열리는 경우 대응)
        let { data: post, error } = await this.supabase
            .from(table)
            .select('*')
            .eq('slug', slug)
            .maybeSingle();
        if (error) throw error;
        if (!post) {
            const byId = await this.supabase
                .from(table)
                .select('*')
                .eq('id', slug)
                .maybeSingle();
            if (byId.error) throw byId.error;
            post = byId.data || null;
        }
        if (!post) return;
        DOM.$('#post-title').value = post.title || '';
        DOM.$('#post-summary').value = post.summary || '';
        DOM.$('#post-category').value = post.category || '';
        DOM.$('#post-status').value = post.status || 'draft';
        const editor = DOM.$('#post-content-editor');
        if (editor) {
            // 기존 저장 포맷(JSON/Markdown/HTML)에 관계없이 미리보기 HTML로 변환해 편집기에 채웁니다.
            const html = this.renderContentHTML(post.refined_content ?? post.content ?? '');
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
            // 저장 전 보안/마크다운 유틸리티를 지연 로드
            await ScriptLoader.loadUtilities();
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

        // 독자 상세 페이지에서만 콘텐츠 렌더 유틸리티 로드
        await ScriptLoader.loadUtilities();
        const contentHTML = this.renderContentHTML(post.refined_content);
        // 로그인 사용자에게만 편집 버튼 제공
        const editBtn = this.state.user ? `<a href="/writer/${post.slug}" data-route class="px-3 py-1 rounded-full border">수정</a>` : '';

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
            +   `${editBtn}`
            + '</div>'
            + '<div id="related-posts" class="mt-12"></div>'
            + '</article>';

        // 메타 업데이트 (OG/Twitter 이미지 포함)
        const shareImage = post.thumbnail_url
            ? this.getTransformedPublicUrl(post.thumbnail_url, { width: 1200, height: 630, resize: 'cover', quality: 85, format: 'webp' })
            : '/og-image.svg';
        this.updatePageMeta(post.title, post.summary || '', window.location.href, shareImage);

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
        // 접근성 향상
        editor.setAttribute('role', 'textbox');
        editor.setAttribute('aria-label', '콘텐츠 편집기');
        // 모바일에서 툴바 클릭 시 포커스/선택 손실을 방지하기 위해 최근 선택 범위를 저장합니다.
        this._lastSelectionRange = null;
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
            if (document.activeElement === editor) {
                // 최근 선택 범위 저장 (모바일 탭에서 버튼 터치로 포커스가 이동되는 문제 대응)
                const sel = window.getSelection();
                if (sel && sel.rangeCount) {
                    this._lastSelectionRange = sel.getRangeAt(0);
                }
                updateToolbarState();
            }
        });
        // 툴바 명령
        if (toolbar) {
            // 모바일 블러 방지: 터치/마우스/포인터 다운에서 기본 동작 취소하여 에디터 포커스 유지
            const cancelIfCmd = (e) => {
                const target = e.target.closest('[data-cmd]');
                if (!target) return;
                e.preventDefault();
            };
            toolbar.addEventListener('pointerdown', cancelIfCmd, { passive: false });
            toolbar.addEventListener('mousedown', cancelIfCmd, { passive: false });
            toolbar.addEventListener('touchstart', cancelIfCmd, { passive: false });
            toolbar.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-cmd]');
                if (!btn) return;
                const cmd = btn.getAttribute('data-cmd');
                // 에디터 포커스 및 선택 범위 복원 (Android/One UI 포함)
                editor.focus();
                const sel = window.getSelection();
                if (sel && this._lastSelectionRange) {
                    try {
                        sel.removeAllRanges();
                        sel.addRange(this._lastSelectionRange);
                    } catch { /* 브라우저 호환성 */ }
                }
                this.execEditorCommand(cmd);
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
            const thumb = thumbUrl ? `<img src="${thumbUrl}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ''} alt="${this.escapeHTML(post.title || '')}" class="post-card-thumb-img" width="${baseW}" height="${baseH}" decoding="async"${loading}${fetchp}/>` : '';
            const date = this.formatDateKR(post.created_at);
            const categoryBadge = post.category ? `<span class="badge">${this.escapeHTML(post.category)}</span>` : '';
            const editLink = this.state.user ? `<a href="/writer/${post.slug}" data-route class="btn-xs">편집</a>` : '';

            return '<article class="post-card">'
                + (thumb ? `<a href="${href}" data-route class="post-card-thumb">${thumb}</a>` : '')
                + `<h2 class="post-card-title"><a href="${href}" data-route>${this.escapeHTML(post.title || '제목 없음')}</a></h2>`
                + (post.summary ? `<p class="post-card-summary">${this.escapeHTML(post.summary)}</p>` : '')
                + `<div class="post-card-meta">작성일 ${date}${post.category ? ` · 카테고리 ${categoryBadge}` : ''}</div>`
                + `<div class="post-card-actions">${editLink}</div>`
                + '</article>';
        }).join('');
    }

    // 한국형 날짜 포맷터 (YYYY.MM.DD)
    formatDateKR(iso) {
        try {
            const d = new Date(iso);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}.${m}.${day}`;
        } catch { return ''; }
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