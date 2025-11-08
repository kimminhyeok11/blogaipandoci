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
          sort: 'latest',
          total: 0,
      }
  };

    // 서비스 인스턴스
    supabase = null;
    // 네트워크 성능 최적화: 동일 키의 요청 중복 방지 및 레이스 가드
    _inFlight = new Map();
    _reqTokens = { home: 0, archives: 0, popular: 0 };
    
    constructor() {
        // 1. 이벤트 핸들러 'this' 컨텍스트 바인딩
        this.handleGlobalClick = this.handleGlobalClick.bind(this);
        this.handlePopState = this.handlePopState.bind(this);

        // 2. 앱 초기화 시작
        this.init();
    }

    // 동일 파라미터의 중복 요청을 하나로 합치고, 완료 후 정리
    async withDedupe(key, exec) {
        if (this._inFlight.has(key)) return this._inFlight.get(key);
        const p = (async () => {
            try { return await exec(); }
            finally { this._inFlight.delete(key); }
        })();
        this._inFlight.set(key, p);
        return p;
    }

    /**
     * [App Init]
     * 앱의 핵심 로직을 초기화하고 인증 상태 변경을 감지합니다.
     */
    async init() {
        try {
            // Supabase 클라이언트 준비: 동적 모듈 로딩 지연을 고려해 대기 후 초기화
            await this.ensureSupabaseReady(1200);

            // 초기 스크립트 일괄 로드를 제거하고 라우트별로 필요시 로드합니다.

            // 전역 이벤트 리스너 바인딩
            this.bindGlobalListeners();

            // 초기 세션 조회로 첫 렌더링을 보장 + 콜백 처리
            if (this.supabase && this.supabase.auth) {
                const { data: { session } } = await this.supabase.auth.getSession();
                this.state.user = session?.user || null;

                // 인증 콜백 처리: token_hash(type), OAuth code, 해시 토큰(암시적)
                try {
                    const url = new URL(window.location.href);
                    const params = url.searchParams;
                    const hash = window.location.hash || '';

                    const tokenHash = params.get('token_hash');
                    const rawType = (params.get('type') || '').toLowerCase();
                    const typeParam = this._normalizeOtpType(rawType); // 'magiclink' | 'signup' | 'recovery' 등
                    const oauthCode = params.get('code');
                    const hasFragmentTokens = /access_token=|refresh_token=|type=recovery/.test(hash);

                    // 1) PKCE/이메일 템플릿 기반: token_hash + type
                    if (tokenHash && typeParam) {
                        this.setLoading(true);
                        try {
                            const { data, error } = await this.supabase.auth.verifyOtp({ token_hash: tokenHash, type: typeParam });
                            if (!error && data?.session?.user) {
                                this.state.user = data.session.user;
                                // 토큰 파라미터 제거
                                params.delete('token_hash');
                                params.delete('type');
                                const cleanUrl = url.pathname + (params.toString() ? ('?' + params.toString()) : '');
                                window.history.replaceState({}, document.title, cleanUrl);
                                UIComponents.showToast(this.state.user.email + '님, 로그인되었습니다.', 'success');
                                this.renderNav();
                                this.navigate('/');
                            } else if (error) {
                                console.warn('verifyOtp 오류:', error);
                                UIComponents.showToast('로그인 토큰 확인에 실패했습니다. 링크를 다시 요청해주세요.', 'error');
                            }
                        } catch (e) {
                            console.warn('verifyOtp 실패:', e);
                        }
                    }
                    // 1-보강) type 파라미터 없이 token_hash만 온 경우: magiclink로 시도
                    else if (tokenHash && !typeParam) {
                        this.setLoading(true);
                        try {
                            const { data, error } = await this.supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
                            if (!error && data?.session?.user) {
                                this.state.user = data.session.user;
                                params.delete('token_hash');
                                const cleanUrl = url.pathname + (params.toString() ? ('?' + params.toString()) : '');
                                window.history.replaceState({}, document.title, cleanUrl);
                                UIComponents.showToast(this.state.user.email + '님, 로그인되었습니다.', 'success');
                                this.renderNav();
                                this.navigate('/');
                            } else if (error) {
                                console.warn('verifyOtp(magiclink, fallback) 오류:', error);
                                UIComponents.showToast('로그인 링크 확인 실패. 다시 시도해주세요.', 'error');
                            }
                        } catch (e) {
                            console.warn('verifyOtp(magiclink, fallback) 실패:', e);
                        }
                    }
                    // 2) OAuth PKCE: code 교환
                    else if (oauthCode) {
                        this.setLoading(true);
                        try {
                            const { data, error } = await this.supabase.auth.exchangeCodeForSession({ code: oauthCode });
                            if (!error && data?.session?.user) {
                                this.state.user = data.session.user;
                                params.delete('code');
                                const cleanUrl = url.pathname + (params.toString() ? ('?' + params.toString()) : '');
                                window.history.replaceState({}, document.title, cleanUrl);
                                UIComponents.showToast(this.state.user.email + '님, 로그인되었습니다.', 'success');
                                this.renderNav();
                                this.navigate('/');
                            }
                        } catch (e) {
                            console.warn('exchangeCodeForSession 실패:', e);
                        }
                    }
                    // 3) 암시적(해시) 토큰: getSession 재확인 후 정리
                    else if (hasFragmentTokens) {
                        this.setLoading(true);
                        const { data: { session: s2 } } = await this.supabase.auth.getSession();
                        if (s2?.user) {
                            this.state.user = s2.user;
                            const cleanUrl = url.pathname + (params.toString() ? ('?' + params.toString()) : '');
                            window.history.replaceState({}, document.title, cleanUrl);
                            UIComponents.showToast(s2.user.email + '님, 로그인되었습니다.', 'success');
                            this.renderNav();
                            this.navigate('/');
                        }
                    }
                } catch (_) { /* 콜백 토큰 없거나 실패 */ }
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

            // 이후 인증 상태 변경에 대응 (Supabase가 없을 때도 안전하게 건너뜀)
            if (this.supabase && this.supabase.auth && typeof this.supabase.auth.onAuthStateChange === 'function') {
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
            }

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

    // OTP type 정규화: 일부 템플릿/메일 클라이언트에서 비표준 값을 반환하는 경우 대응
    _normalizeOtpType(t = '') {
        switch (String(t || '').toLowerCase()) {
            case 'login':
            case 'signin':
            case 'email':
                return 'magiclink';
            case 'register':
                return 'signup';
            case 'recover':
                return 'recovery';
            case 'magiclink':
            case 'signup':
            case 'recovery':
            case 'invite':
                return t;
            default:
                return t || 'magiclink';
        }
    }

    // Supabase 준비를 보장하기 위한 유틸리티 (동적 모듈 로딩 지연 대응)
    async ensureSupabaseReady(maxWaitMs = 800) {
        try {
            if (this.supabase) return true;
            const start = Date.now();
            // 즉시 가능하면 생성
            if (window.supabase && window.Config?.SUPABASE_URL && window.Config?.SUPABASE_ANON_KEY) {
                this.supabase = window.supabase.createClient(
                    window.Config.SUPABASE_URL,
                    window.Config.SUPABASE_ANON_KEY,
                    { auth: { storageKey: 'sb-insurelog-auth-token' } }
                );
                return true;
            }
            // 대기 루프: 모듈 로딩/Config 주입을 기다림
            while ((Date.now() - start) < maxWaitMs) {
                await new Promise(r => setTimeout(r, 50));
                if (window.supabase && window.Config?.SUPABASE_URL && window.Config?.SUPABASE_ANON_KEY) {
                    this.supabase = window.supabase.createClient(
                        window.Config.SUPABASE_URL,
                        window.Config.SUPABASE_ANON_KEY,
                        { auth: { storageKey: 'sb-insurelog-auth-token' } }
                    );
                    return true;
                }
            }
            return !!this.supabase;
        } catch (e) {
            console.warn('ensureSupabaseReady 실패:', e);
            return false;
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
            // ESC 키로 모달 닫기 (새 구조 호환)
            if (e.key === 'Escape') {
                const openModal = document.querySelector('[id*="modal"]:not(.hidden)');
                if (openModal && openModal.id) {
                    DOM.closeModal(openModal.id);
                }
            }
        });
        
        // 온라인/오프라인 토스트 기능 제거됨
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

        // 모달 오버레이 클릭 시 닫기 (새 구조 호환)
        if (e.target.classList && e.target.classList.contains('modal-overlay')) {
            const host = e.target.closest('[id*="modal"]');
            if (host && host.id) {
                DOM.closeModal(host.id);
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
        const next = this.normalizePath(path);
        if (window.location.pathname + window.location.search !== next) {
            window.history.pushState(null, '', next);
        }
        this.handleRouting();
        // 라우팅 후 현재 경로에 맞춰 네비 활성 하이라이트 갱신
        this.renderNav();
    }

    /**
     * [Routing]
     * URL 라우팅을 처리합니다.
     */
    handleRouting() {
        const path = this.normalizePath(window.location.pathname);
        const params = new URLSearchParams(window.location.search);
        // [Fix] 동일 뷰 재전환 시 hide/show 애니메이션이 충돌해
        // 최종 display 상태가 'none'으로 남는 레이스 조건을 방지합니다.
        // 다음에 표시될 대상 뷰를 먼저 계산하고, 활성 뷰와 같으면 숨김을 건너뜁니다.
        let targetViewId;
        if (path === '/' || path === '/home') {
            targetViewId = 'view-library';
        } else if (path.startsWith('/post/')) {
            targetViewId = 'view-post';
        } else if (path === '/archives') {
            targetViewId = 'view-archives';
        } else if (path === '/writer' || path.startsWith('/writer/')) {
            targetViewId = 'view-writer';
        } else if (path === '/login') {
            targetViewId = 'view-library';
        } else {
            targetViewId = 'view-library';
        }

        // 활성 뷰가 대상 뷰와 다를 때만 숨김 처리 (애니메이션 경쟁 방지)
        const activeView = DOM.$('.app-view.active');
        if (activeView && activeView.id !== targetViewId) {
            activeView.classList.remove('active');
            DOM.hide(activeView);
        }

        // 라우팅 처리
        if (path === '/' || path === '/home') {
            this.renderHome(params);
        } else if (path.startsWith('/post/')) {
            const raw = path.split('/post/')[1];
            const slug = raw ? decodeURIComponent(raw) : '';
            this.renderPost(slug);
        } else if (path === '/archives') {
            this.renderArchives();
        } else if (path === '/writer' || path.startsWith('/writer/')) {
            const raw = path.split('/writer/')[1] || null;
            const slug = raw ? decodeURIComponent(raw) : null;
            this.renderWriter(slug);
        } else if (path === '/login') {
            this.renderLogin();
        } else {
            this.render404();
        }
    }

    /**
     * [Path Utils]
     * 경로 정규화: '/index.html' → '/', '/archives/' → '/archives' 등
     */
    normalizePath(p) {
        try {
            const url = new URL(p, window.location.origin);
            let path = url.pathname || '/';
            // index.html을 루트로 매핑
            if (path === '/index.html') path = '/';
            // 트레일링 슬래시 제거(루트 제외)
            if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
            // 중복 슬래시 축약
            path = path.replace(/\/+/, '/');
            return path + (url.search || '');
        } catch (_) {
            // 안전 폴백
            if (p === '/index.html') return '/';
            if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
            return p || '/';
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
        // URL 쿼리에서 상태 동기화
        try {
            const params = new URLSearchParams(window.location.search);
            const cat = params.get('category');
            const tagQ = params.get('tag');
            const page = Number(params.get('page') || this.state.archives.page) || 1;
            const pageSize = Number(params.get('pageSize') || this.state.archives.pageSize) || 20;
            const sort = params.get('sort') || this.state.archives.sort || 'latest';
            this.state.archives.category = cat || this.state.archives.category || '전체';
            this.state.archives.tag = tagQ || this.state.archives.tag || '';
            this.state.archives.page = page;
            this.state.archives.pageSize = pageSize;
            this.state.archives.sort = ['latest','oldest','title'].includes(sort) ? sort : 'latest';
        } catch (_) { /* noop */ }
        const { category, tag, pageSize: ps, sort: s } = this.state.archives;
        container.innerHTML = '<section class="max-w-4xl mx-auto py-10 px-6">'
            + '<div class="flex items-center justify-between">'
            +   '<h1 class="text-2xl font-bold">아카이브</h1>'
            +   `<div class="text-xs text-gray-500">페이지당 ${ps}개</div>`
            + '</div>'
            + '<div class="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">'
            +   '<div><label class="block text-xs text-gray-600">카테고리</label><select id="archives-filter-category" class="mt-1 w-full border rounded-lg p-2"><option value="전체">전체</option></select></div>'
            +   '<div><label class="block text-xs text-gray-600">태그</label><input id="archives-filter-tag" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="예: 보험"></div>'
            +   '<div><label class="block text-xs text-gray-600">정렬</label><select id="archives-filter-sort" class="mt-1 w-full border rounded-lg p-2"><option value="latest">최신순</option><option value="oldest">오래된순</option><option value="title">제목순</option></select></div>'
            +   '<div><label class="block text-xs text-gray-600">개수</label><select id="archives-filter-pageSize" class="mt-1 w-full border rounded-lg p-2"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div>'
            +   '<div class="sm:col-span-4 flex items-center justify-end"><button id="archives-filter-apply" class="px-3 py-2 rounded-lg bg-black text-white">필터 적용</button></div>'
            + '</div>'
            + '<div id="archives-list" class="mt-6 space-y-6"></div>'
            + '<div id="archives-pagination" class="mt-8 flex items-center justify-center gap-2"></div>'
            + '</section>';

        // SEO 메타 업데이트
        this.updatePageMeta('아카이브 - InsureLog', '월별 아카이브와 카테고리/태그 필터', window.location.href, '/og-image.svg');

        // 기존 값 채우기
        const tagInput = DOM.$('#archives-filter-tag');
        if (tagInput) tagInput.value = tag || '';
        const sortSel = DOM.$('#archives-filter-sort');
        if (sortSel) sortSel.value = s || 'latest';
        const psSel = DOM.$('#archives-filter-pageSize');
        if (psSel) psSel.value = String(ps || 20);

        // 이벤트 바인딩
        const applyBtn = DOM.$('#archives-filter-apply');
        if (applyBtn) {
            applyBtn.onclick = () => {
                const catSel = DOM.$('#archives-filter-category');
                const tagField = DOM.$('#archives-filter-tag');
                const sortSel = DOM.$('#archives-filter-sort');
                const psSel = DOM.$('#archives-filter-pageSize');
                this.state.archives.category = catSel ? catSel.value : '전체';
                this.state.archives.tag = tagField ? tagField.value.trim() : '';
                this.state.archives.sort = sortSel ? sortSel.value : 'latest';
                this.state.archives.pageSize = psSel ? Number(psSel.value) || 20 : 20;
                this.state.archives.page = 1;
                // URL 쿼리로 상태 반영
                const q = new URLSearchParams({
                    category: this.state.archives.category || '전체',
                    tag: this.state.archives.tag || '',
                    sort: this.state.archives.sort || 'latest',
                    pageSize: String(this.state.archives.pageSize || 20),
                    page: '1',
                });
                this.navigate(`/archives?${q.toString()}`);
            };
        }

        this.loadArchives().catch(err => this.handleError(err, 'loadArchives'));
    }

    async loadArchives() {
        const { category, tag, page, pageSize, sort } = this.state.archives;
        const list = DOM.$('#archives-list');
        if (!list) return;
        // 캐시 기반 즉시 렌더 제거됨

        if (!this.supabase) return; // 캐시 렌더 후 재검증 단계에서 Supabase 미준비 시 종료
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';

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
        // 태그 필터가 없을 때는 refined_content를 조회하지 않아 페이로드와 메모리를 줄임
        const selectCols = tag ? 'id, title, slug, created_at, category, refined_content, thumbnail_url'
                               : 'id, title, slug, created_at, category, thumbnail_url';
        let dataQuery = this.supabase
            .from(table)
            .select(selectCols)
            .eq('status', 'published');
        if (sort === 'latest') {
            dataQuery = dataQuery.order('created_at', { ascending: false });
        } else if (sort === 'oldest') {
            dataQuery = dataQuery.order('created_at', { ascending: true });
        } else if (sort === 'title') {
            dataQuery = dataQuery.order('title', { ascending: true });
        } else {
            dataQuery = dataQuery.order('created_at', { ascending: false });
        }
        if (category && category !== '전체') {
            dataQuery = dataQuery.eq('category', category);
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        dataQuery = dataQuery.range(from, to);

        // 레이스 가드 + 중복 요청 제거
        const token = Date.now();
        this._reqTokens.archives = token;
        const inflightKey = `archives:${category}:${tag}:${from}-${to}`;
        const { data, error } = await this.withDedupe(inflightKey, () => dataQuery);
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

        // 최신 요청이 아닌 경우 DOM 반영을 건너뜀
        if (this._reqTokens.archives !== token) return;
        if (!filtered || filtered.length === 0) {
            list.innerHTML = '<div class="text-gray-500">표시할 게시글이 없습니다.</div>';
        } else {
            const cards = this.renderPostsListHTML(filtered);
            list.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">${cards}</div>`;
        }

        // 캐시 저장 제거됨

        // 페이지네이션 렌더
        this.renderArchivesPagination();

        // 총 개수 및 범위 안내
        try {
            const fromIdx = (page - 1) * pageSize + 1;
            const toIdx = Math.min(this.state.archives.total, page * pageSize);
            const headerInfo = document.querySelector('#view-archives section .text-xs.text-gray-500');
            if (headerInfo) {
                headerInfo.textContent = `총 ${this.state.archives.total}개 · ${fromIdx}–${toIdx} 표시중`;
            }
        } catch (_) { /* noop */ }
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
                // URL 쿼리 업데이트
                const q = new URLSearchParams({
                    category: this.state.archives.category || '전체',
                    tag: this.state.archives.tag || '',
                    sort: this.state.archives.sort || 'latest',
                    pageSize: String(this.state.archives.pageSize || 20),
                    page: String(targetPage),
                });
                this.navigate(`/archives?${q.toString()}`);
            };
        });
    }

    /**
     * [View Switching]
     * 뷰를 전환합니다.
     */
    switchToView(viewId) {
        // 대상 뷰 먼저 찾기
        const targetView = DOM.$('#' + viewId);
        
        // 대상 외 모든 뷰 숨기기 (애니메이션 완료 시 display:none 처리)
        DOM.$$('.app-view').forEach(view => {
            if (view === targetView) return; // 대상 뷰는 숨기지 않음
            view.classList.remove('active');
            DOM.hide(view);
        });

        // 대상 뷰 표시 (진행 중인 숨김 애니메이션과 경쟁하지 않도록 선별 표시)
        if (targetView) {
            // 애니메이션 충돌 방지: 즉시 표시 상태로 전환
            targetView.style.display = 'block';
            targetView.classList.add('active');
            DOM.show(targetView);

            // 페이지 상단으로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 뷰 전환 후 레이아웃 가이드라인 적용 및 자동 검사 실행
            if (window.LayoutManager && typeof window.LayoutManager.onViewRendered === 'function') {
                window.LayoutManager.onViewRendered(targetView);
            }
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
        // 이미 렌더된 경우: 로그인 상태가 동일하면 재구성 대신 활성 링크만 업데이트
        const existingLinks = container.querySelector('#nav-links');
        if (existingLinks && this._navLogged === isLoggedIn) {
            const currentPath = window.location.pathname;
            existingLinks.querySelectorAll('a[data-route]').forEach(a => {
                const href = a.getAttribute('href');
                const isCurrent = href === currentPath;
                if (isCurrent) {
                    a.setAttribute('aria-current', 'page');
                } else {
                    a.removeAttribute('aria-current');
                }
            });
            return; // 불필요한 DOM 재렌더 방지
        }
        const writerLink = isLoggedIn ? '<a href="/writer" data-route class="nav-link">글쓰기</a>' : '';
        const dashLink = isLoggedIn ? '<a href="/dashboard" data-route class="nav-link">대시보드</a>' : '';
        const authLink = isLoggedIn
            ? '<a id="logout-btn" href="#" class="nav-link">로그아웃</a>'
            : '<a id="login-link" href="/login" data-route class="nav-link">로그인</a>';
        const linksHtml = [
            '<a href="/" data-route class="nav-link">홈</a>',
            '<a href="/archives" data-route class="nav-link">아카이브</a>',
            writerLink,
            dashLink,
            '<a href="/feed.xml" class="nav-link" rel="alternate" type="application/rss+xml">RSS</a>',
            '<a href="/sitemap.xml" class="nav-link">Sitemap</a>',
            authLink
        ].filter(Boolean).join('');

        // 네비게이션 마크업: 모바일에서 항상 보이는 상단 네비로 전환(햄버거 제거)
        container.innerHTML = '<nav class="w-full nav-inner">'
            + '<a href="/" data-route class="brand font-extrabold text-xl tracking-tight">InsureLog</a>'
            + '<div id="nav-links" class="header-nav mobile-nav-actions">' + linksHtml + '</div>'
            + '</nav>'
        // 현재 로그인 상태 캐시 (메모이즈 키)
        this._navLogged = isLoggedIn;

        // [Enhancement] 현재 경로 활성 상태 하이라이트 처리
        // 접근성(aria-current)과 가시성(font-semibold)을 함께 적용합니다.
        const currentPath = this.normalizePath(window.location.pathname);
        const routeLinks = container.querySelectorAll('#nav-links a[data-route]');
        routeLinks.forEach(a => {
            const href = a.getAttribute('href') || '/';
            // 절대경로화하여 비교 안전성 확보
            const path = (() => { try { return this.normalizePath(new URL(href, window.location.origin).pathname); } catch (_) { return this.normalizePath(href); } })();
            const isActive = path === currentPath || (path === '/' && (currentPath === '/home'));
            a.classList.toggle('font-semibold', isActive);
            a.setAttribute('aria-current', isActive ? 'page' : 'false');
        });

        // 햄버거 메뉴 바인딩
        const logoutBtn = DOM.$('#logout-btn');

        // 로그아웃 버튼 동작
        if (logoutBtn) {
            logoutBtn.onclick = async (ev) => {
                try { ev?.preventDefault?.(); } catch (_) {}
                try {
                    if (this.supabase && this.supabase.auth) {
                        await this.supabase.auth.signOut();
                    }
                    UIComponents.showToast('로그아웃되었습니다.', 'info');
                    this.navigate('/');
                } catch (_) {
                    // 실패해도 UI 기준으로 홈 이동
                    this.navigate('/');
                }
            };
        }
        // 햄버거/팝오버 메뉴 관련 로직 제거됨

        // 검색바 제거: 관련 마크업과 로직을 삭제하여 네비게이션을 간결화
    }

    /**
     * [Render: Home]
     * 홈(라이브러리) 뷰를 렌더링합니다.
     */
    renderHome(params = new URLSearchParams()) {
        this.switchToView('view-library');
        const container = DOM.$('#view-library');
        if (container) {
            container.innerHTML = '<section>'
                + '<div class="section-header">'
                +   '<h2 class="section-title">최근 글</h2>'
                + '</div>'
                + '<div id="home-posts" class="grid grid-cols-1 gap-2"></div>'
                + '<div id="home-pagination" class="flex justify-center"></div>'
                + '</section>';

            // SEO 메타 업데이트
            this.updatePageMeta('InsureLog - 최근 글', '최신 게시글 목록', window.location.href, '/og-image.svg');

            // 캐시/프리패치 기반 초기 렌더 제거됨

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

        // [Layout] 본문 폭을 네비게이션(max-w-4xl)과 맞춰 일관성을 유지합니다.
        container.innerHTML = '<article>'
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
        container.innerHTML = '<section class="nav-inner py-10">'
            + `<div class="flex items-center justify-between">`
            +   `<h1 class="text-2xl font-bold">${isEdit ? '글 수정' : '글 작성'}</h1>`
            +   `<button type="button" id="btn-open-post-picker" class="btn btn-outline btn-sm">기존 글 불러오기</button>`
            + `</div>`
            + '<form id="writer-form" class="mt-6 space-y-5 editor-shell">'
            +   '<div id="writer-errors" class="sr-only" role="alert" aria-live="assertive"></div>'
            +   '<div><label class="block text-sm font-medium">제목</label><input id="post-title" type="text" class="form-input" placeholder="제목을 입력하세요" required aria-errormessage="writer-errors" aria-invalid="false"></div>'
            +   '<div><label class="block text-sm font-medium">요약</label><textarea id="post-summary" class="form-textarea" placeholder="요약을 입력하세요"></textarea></div>'
            +   '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'
            +     '<div><label class="block text-sm font-medium">카테고리</label><input id="post-category" type="text" class="form-input" placeholder="예: 기술"></div>'
            +     '<div><label class="block text-sm font-medium">상태</label><select id="post-status" class="form-select"><option value="draft">초안</option><option value="published">발행</option></select></div>'
            +   '</div>'
            +   '<div><label class="block text-sm font-medium">태그</label><input id="post-tags" type="text" class="form-input" placeholder="태그를 쉼표로 구분해 입력 (예: 보험,자동차,가이드)"></div>'
            +   '<div><label class="block text-sm font-medium">썸네일 이미지</label><input id="post-thumb" type="file" accept="image/*" class="form-input"/></div>'
            +   '<div><label class="block text-sm font-medium">콘텐츠 (복사/붙여넣기 지원)</label>'
            +   '<div id="editor-toolbar" class="editor-toolbar btn-group mt-2">'
            +     '<button type="button" data-cmd="bold" class="btn btn-outline btn-sm">굵게</button>'
            +     '<button type="button" data-cmd="italic" class="btn btn-outline btn-sm">기울임</button>'
            +     '<button type="button" data-cmd="underline" class="btn btn-outline btn-sm">밑줄</button>'
            +     '<button type="button" data-cmd="h2" class="btn btn-outline btn-sm">H2</button>'
            +     '<button type="button" data-cmd="p" class="btn btn-outline btn-sm">본문</button>'
            +     '<button type="button" data-cmd="ul" class="btn btn-outline btn-sm">목록</button>'
            +     '<button type="button" data-cmd="ol" class="btn btn-outline btn-sm">번호목록</button>'
            +     '<button type="button" data-cmd="quote" class="btn btn-outline btn-sm">인용</button>'
            +     '<button type="button" data-cmd="code" class="btn btn-outline btn-sm">코드</button>'
            +     '<button type="button" data-cmd="link" class="btn btn-outline btn-sm">링크</button>'
            +     '<button type="button" data-cmd="clear" class="btn btn-outline btn-sm">서식해제</button>'
            +   '</div>'
            +   '<div id="post-content-editor" contenteditable="true" class="editor-surface prose-custom" placeholder="다른 글을 복사해 붙여넣으면 형식이 유지됩니다."></div>'
            +   '<p class="text-xs text-gray-500 mt-1">붙여넣기 시 기본 서식(굵게, 제목, 목록 등)이 유지됩니다. 저장 시 안전하게 정제된 HTML로 저장합니다.</p>'
            +   '</div>'
            +   '<div class="flex items-center gap-2">'
            +     '<button type="submit" class="btn btn-primary">저장</button>'
            +     '<a href="/" data-route class="btn btn-secondary">취소</a>'
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
            const siteUrl = (window.Config && window.Config.SITE_URL) || window.location.origin;
            container.innerHTML = `
                <section class="max-w-md mx-auto py-10 px-6">
                  <h1 class="text-2xl font-extrabold">로그인</h1>
                  <p class="text-sm text-gray-600 mt-2">이메일로 매직링크를 받아 빠르게 로그인하세요.</p>
                  <form id="magic-form" class="mt-6 space-y-3" novalidate>
                    <div id="login-errors" class="sr-only" role="alert" aria-live="assertive"></div>
                    <label class="form-label" for="magic-email">이메일 주소</label>
                    <div class="input-group" aria-live="polite">
                      <span class="input-group-addon" aria-hidden="true" title="이메일">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2l8 5 8-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                      <input id="magic-email" type="email" class="form-input" placeholder="you@example.com" required autocomplete="email" inputmode="email" aria-describedby="magic-help" aria-errormessage="magic-error">
                    </div>
                    <div id="magic-error" class="form-error" style="display:none;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.29 3.86l-8.23 14.25A2 2 0 0 0 4 21h16a2 2 0 0 0 1.94-2.89L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      <span>올바른 이메일 형식을 입력해주세요.</span>
                    </div>
                    <button id="magic-send" type="submit" class="btn btn-primary btn-lg w-full">로그인 링크 보내기</button>
                    <p id="magic-help" class="form-help">메일의 링크를 누르면 자동 로그인됩니다. 1분 내 도착하지 않으면 스팸함도 확인해주세요.</p>
                  </form>
                  <div id="magic-success" class="mt-4 p-3 border border-green-200 bg-green-50 text-green-700 rounded" style="display:none;">
                    이메일로 로그인 링크를 보냈습니다. 메일함을 확인해주세요.
                  </div>
                  <div class="mt-8 text-center">
                    <a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">홈으로</a>
                  </div>
                </section>`;

            // SEO 메타 업데이트
            this.updatePageMeta('로그인 - InsureLog', '계정 로그인 페이지', window.location.href, '/og-image.svg');

            // 이벤트 바인딩: Magic Link
            const magicForm = DOM.$('#magic-form');
            if (magicForm) {
                const emailInput = DOM.$('#magic-email');
                const errorBox = DOM.$('#magic-error');
                const successBox = DOM.$('#magic-success');
                const sendBtn = DOM.$('#magic-send');

                const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
                const showError = (show) => {
                    if (!errorBox) return;
                    errorBox.style.display = show ? 'flex' : 'none';
                    if (emailInput) {
                        emailInput.classList.toggle('error', !!show);
                        emailInput.setAttribute('aria-invalid', show ? 'true' : 'false');
                    }
                    const summary = DOM.$('#login-errors');
                    if (summary) summary.textContent = show ? '올바른 이메일 형식을 입력해주세요.' : '';
                };

                emailInput?.addEventListener('input', () => showError(false));

                magicForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = String(emailInput?.value || '').trim();
                    if (!isValidEmail(email)) { showError(true); emailInput?.focus(); return; }
                    if (!this.supabase?.auth) return UIComponents.showToast('인증 모듈을 초기화하지 못했습니다.', 'error');
                    try {
                        sendBtn?.setAttribute('disabled', 'true');
                        if (sendBtn) { sendBtn.textContent = '보내는 중…'; sendBtn.setAttribute('aria-busy', 'true'); }
                        const { error } = await this.supabase.auth.signInWithOtp({
                            email,
                            options: { shouldCreateUser: true, emailRedirectTo: siteUrl }
                        });
                        if (error) throw error;
                        UIComponents.showToast('로그인 링크를 이메일로 보냈습니다.', 'success');
                        if (successBox) successBox.style.display = 'block';
                    } catch (err) {
                        this._logAuthEvent('login_magic_failed', { email });
                        UIComponents.showToast('메일 발송에 실패했습니다.', 'error');
                        const summary = DOM.$('#login-errors');
                        if (summary) summary.textContent = '메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.';
                    } finally {
                        setTimeout(() => {
                            sendBtn?.removeAttribute('disabled');
                            if (sendBtn) { sendBtn.textContent = '로그인 링크 보내기'; sendBtn.removeAttribute('aria-busy'); }
                        }, 1200);
                    }
                });
            }
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

    // 인증 실패/이벤트 로깅 (베이직)
    async _logAuthEvent(type, payload = {}) {
        try {
            const safe = {
                type,
                email_hint: (payload.email || '').replace(/(^.).+(@.+$)/, '$1***$2'),
                provider: payload.provider || null,
                user_agent: (navigator && navigator.userAgent) || null,
                at: new Date().toISOString(),
                success: false
            };
            if (this.supabase) {
                await this.supabase.from('auth_events').insert(safe);
            }
        } catch (_) { /* ignore */ }
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
            // 폼/버튼/에러 영역 참조
            const form = DOM.$('#writer-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            const errBox = DOM.$('#writer-errors');
            const titleInput = DOM.$('#post-title');
            const titleRaw = titleInput?.value?.trim() || '';
            // 간단한 유효성 검사: 제목 필수/최소 2자
            const errors = [];
            if (!titleRaw) errors.push('제목을 입력하세요.');
            else if (titleRaw.length < 2) errors.push('제목은 최소 2자 이상이어야 합니다.');
            if (errors.length) {
                if (errBox) {
                    errBox.textContent = errors.join(' ');
                    errBox.classList.remove('sr-only');
                }
                if (titleInput) {
                    titleInput.setAttribute('aria-invalid', 'true');
                    titleInput.setAttribute('aria-errormessage', 'writer-errors');
                    titleInput.focus();
                }
                return;
            } else {
                // 에러 초기화
                if (errBox) {
                    errBox.textContent = '';
                    errBox.classList.add('sr-only');
                }
                if (titleInput) titleInput.setAttribute('aria-invalid', 'false');
            }
            // UI 잠금 및 접근성 표시
            if (form) form.setAttribute('aria-busy', 'true');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.setAttribute('aria-disabled', 'true');
                submitBtn.dataset._origText = submitBtn.textContent || '';
                submitBtn.textContent = '저장 중…';
            }
            this.setLoading(true, '#view-writer');
            // 저장 전 보안/마크다운 유틸리티를 지연 로드
            await ScriptLoader.loadUtilities();
            const title = titleRaw;
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
                // SEO 정책: 본문 내 H1 금지. 저장 시 모든 H1을 H2로 강등합니다.
                refined_content = refined_content
                    .replace(/<h1([^>]*)>/gi, '<h2$1>')
                    .replace(/<\/h1>/gi, '</h2>');
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
                this.navigate('/post/' + encodeURIComponent(slug));
            } else {
                this.navigate('/');
            }
        } catch (e) {
            // 에러 라이브 영역 갱신
            const errBox = DOM.$('#writer-errors');
            if (errBox) {
                errBox.textContent = `저장 중 오류가 발생했습니다: ${e.message || e}`;
                errBox.classList.remove('sr-only');
            }
            this.handleError(e, 'submitWriterForm');
        } finally {
            // UI 잠금 해제
            const form = DOM.$('#writer-form');
            const submitBtn = form?.querySelector('button[type="submit"]');
            if (form) form.setAttribute('aria-busy', 'false');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('aria-disabled');
                if (submitBtn.dataset._origText) submitBtn.textContent = submitBtn.dataset._origText;
            }
            this.setLoading(false, '#view-writer');
        }
    }

    slugify(str) {
        const base = String(str || '').toLowerCase().trim();
        let s = base
            .normalize('NFKD')
            .replace(/\s+/g, '-')
            // 한글 포함 전 세계 문자/숫자 허용, 하이픈만 유지
            .replace(/[^\p{L}\p{N}\-]+/gu, '')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (!s) {
            const ts = Date.now().toString(36);
            s = 'post-' + ts;
        }
        return s;
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
        // 동적 모듈 로딩 지연 시 초기화 시도
        await this.ensureSupabaseReady(1200);
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

        // 상세 페이지에서는 본문 내 삽입 이미지만 노출합니다 (상단 히어로 제거).

        // 독자 상세 페이지에서만 콘텐츠 렌더 유틸리티 로드
        await ScriptLoader.loadUtilities();
        const contentHTML = this.renderContentHTML(post.refined_content);
        // 로그인 사용자에게만 편집 버튼 제공
        const editBtn = this.state.user ? `<a href="/writer/${encodeURIComponent(post.slug)}" data-route class="px-3 py-1 rounded-full border">수정</a>` : '';

        container.innerHTML = '<article class="post-detail py-10">'
            + '<div class="post-detail-inner">'
            + `<h1 class="post-title text-3xl font-extrabold tracking-tight">${title}</h1>`
            + `<div class="post-meta flex items-center"><span class="post-date">${date}</span>${category ? category.replace('<span', '<span class=\"post-category\"') : ''}</div>`
            + `${tagsHtml ? tagsHtml.replace('<div', '<div class=\"post-tags\"') : ''}`
            + `<div class="blog-post-content prose-custom">${contentHTML}</div>`
            + '</div>'
            + '<div class="post-detail-inner">'
            + '<div class="mt-8 flex items-center gap-3">'
                +   '<button id="btn-like" class="px-3 py-1 rounded-full border">좋아요 <span id="like-count"></span></button>'
                +   '<button id="btn-share" class="px-3 py-1 rounded-full border">공유</button>'
                +   '<button id="btn-copy" class="px-3 py-1 rounded-full border">링크복사</button>'
                +   `${editBtn}`
                + '</div>'
            + '<div id="related-posts" class="mt-12"></div>'
            + '<div id="popular-posts" class="mt-12"></div>'
            + '</div>'
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

        // 관련 글 및 인기 글 로드
        this.loadRelatedPosts(post).catch(err => this.handleError(err, 'loadRelatedPosts'));
        this.loadPopularPosts(post.id).catch(err => this.handleError(err, 'loadPopularPosts'));
    }

    renderContentHTML(refined) {
        if (!refined) return '<p class="text-gray-600">콘텐츠가 아직 준비되지 않았습니다.</p>';
        // JSON (Editor.js) 또는 Markdown 텍스트 둘 다 지원
        try {
            const obj = typeof refined === 'string' ? JSON.parse(refined) : refined;
            if (obj && Array.isArray(obj.blocks)) {
                const html = obj.blocks.map(b => this.renderEditorBlock(b)).join('');
                return this.dedupeConsecutiveImages(html);
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
                const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
                const transformed = this.transformPlainImagesToOptimized(safe);
                const ensuredAlt = this.ensureImageAltAttributes(transformed, '');
                return this.dedupeConsecutiveImages(ensuredAlt);
            }
        } catch { /* not JSON */ }

        // 문자열 내 Markdown 패턴이 섞여 있으면 우선 Markdown 파싱을 수행
        const isString = typeof refined === 'string';
        const hasMarkdown = isString && (
            /!\[[^\]]*\]\([^)]+\)/.test(refined) || // 이미지
            /\[[^\]]+\]\([^)]+\)/.test(refined) ||   // 링크
            /(^|\n)\s{0,3}#{1,6}\s/.test(refined) ||  // 헤딩
            /(^|\n)\s{0,3}[-*]\s+/.test(refined) ||  // 불릿 리스트
            /(^|\n)\s{0,3}\d+\.\s+/.test(refined)   // 순서 리스트
        );
        if (hasMarkdown && window.marked) {
            const dirty = isString ? refined : String(refined);
            const pre = this.preprocessPlainTextToMarkdown(dirty);
            const html = window.marked.parse(pre);
            const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
            const transformed = this.transformPlainImagesToOptimized(safe);
            const ensuredAlt = this.ensureImageAltAttributes(transformed, '');
            return this.dedupeConsecutiveImages(ensuredAlt);
        }

        // 직접 HTML 문자열인 경우 그대로 정제하여 반환
        if (isString && /<\w+[^>]*>/i.test(refined)) {
            const html = refined;
            const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
            const transformed = this.transformPlainImagesToOptimized(safe);
            const ensuredAlt = this.ensureImageAltAttributes(transformed, '');
            return this.dedupeConsecutiveImages(ensuredAlt);
        }
        // Markdown 처리
        if (window.marked) {
            const dirty = isString ? refined : String(refined);
            const pre = this.preprocessPlainTextToMarkdown(dirty);
            const html = window.marked.parse(pre);
            const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
            const transformed = this.transformPlainImagesToOptimized(safe);
            const ensuredAlt = this.ensureImageAltAttributes(transformed, '');
            return this.dedupeConsecutiveImages(ensuredAlt);
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
                    const arClass = (!data.width || !data.height) ? ' class="aspect-16-9"' : '';
                    return `<figure><img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${baseAlt}" loading="lazy" decoding="async"${sizeAttrs}${arClass}/><figcaption>${baseAlt}</figcaption></figure>`;
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
                // H1 금지: Ctrl+Shift+1은 H2로 매핑
                if (e.shiftKey && e.key === '1') { e.preventDefault(); this.execEditorCommand('h2'); updateToolbarState(); }
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
        // 이미지 붙여넣기 및 일반 텍스트 붙여넣기 (URL 자동 링크화)
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
            } else {
                // 이미지가 아닌 경우에는 붙여넣기 후 URL을 자동으로 링크로 변환
                setTimeout(() => {
                    this.linkifyElementContent(editor);
                }, 0);
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
            // 일반 입력 시에도 URL 자동 링크화(디바운스)
            clearTimeout(this._linkifyTimer);
            this._linkifyTimer = setTimeout(() => {
                this.linkifyElementContent(editor);
            }, 200);
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
            // H1 금지: 내부 콘텐츠에서는 H1을 생성하지 않습니다. 필요 시 H2로 대체.
            case 'h1': document.execCommand('formatBlock', false, 'h2'); break;
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

    // 에디터 콘텐츠 내 일반 텍스트를 순회하여 URL을 자동으로 링크로 변환
    // 이미 앵커 내부에 있는 텍스트는 건너뜁니다.
    linkifyElementContent(root) {
        try {
            if (!root) return;
            const urlRegex = /(?:https?:\/\/[^\s<]+|www\.[^\s<]+)$/g;
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            const targets = [];
            let node;
            while ((node = walker.nextNode())) {
                const parent = node.parentElement;
                if (!parent) continue;
                if (parent.closest('a')) continue; // 이미 링크 내부
                const text = node.nodeValue || '';
                if (/(https?:\/\/|www\.)/.test(text)) targets.push(node);
            }
            targets.forEach(n => {
                const text = n.nodeValue || '';
                const parts = [];
                const matches = [];
                let lastIndex = 0;
                text.replace(/(?:https?:\/\/[^\s<]+|www\.[^\s<]+)/g, (m, offset) => {
                    parts.push(text.slice(lastIndex, offset));
                    matches.push(m);
                    lastIndex = offset + m.length;
                    return m;
                });
                parts.push(text.slice(lastIndex));
                if (matches.length === 0) return;
                const frag = document.createDocumentFragment();
                for (let i = 0; i < parts.length; i++) {
                    const pre = parts[i];
                    if (pre) frag.appendChild(document.createTextNode(pre));
                    const m = matches[i];
                    if (m) {
                        const href = m.startsWith('www.') ? 'https://' + m : m;
                        const a = document.createElement('a');
                        a.href = href;
                        a.textContent = m;
                        a.rel = 'noopener noreferrer';
                        a.target = '_blank';
                        frag.appendChild(a);
                    }
                }
                n.parentNode.replaceChild(frag, n);
            });
        } catch (err) {
            console.warn('linkifyElementContent error', err);
        }
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
            .limit(3);
        if (error) throw error;
        const container = DOM.$('#related-posts');
        if (!container) return;
        if (!data || data.length === 0) { container.innerHTML = ''; return; }
        const cards = data.map(p => {
            const url = '/post/' + encodeURIComponent(p.slug || p.id);
            const hasImg = !!p.thumbnail_url;
            const img = hasImg
                ? (() => {
                    const q = 80;
                    const baseW = 120, baseH = 120; // 더 미니멀한 컴팩트 썸네일
                    const widths = [96, 120, 144, 160];
                    const sizes = '(max-width: 640px) 96px, 120px';
                    const src = this.getTransformedPublicUrl(p.thumbnail_url, { width: baseW, height: baseH, resize: 'cover', quality: q, format: 'webp' });
                    const srcset = widths.map(x => `${this.getTransformedPublicUrl(p.thumbnail_url, { width: x, height: x, resize: 'cover', quality: q, format: 'webp' })} ${x}w`).join(', ');
                    return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${this.escapeHTML(p.title || '')}" class="post-card-thumb-img" width="${baseW}" height="${baseH}" decoding="async" loading="lazy"/>`;
                  })()
                : `<span class="thumb-initial">${this.escapeHTML(String((p.title || 'N')).trim().charAt(0).toUpperCase())}</span>`;
            return (
                `<article class="post-card post-card-compact">`
                + `<a href="${url}" data-route class="post-card-thumb${hasImg ? '' : ' placeholder'}">${img}</a>`
                + `<div class="post-card-main">`
                +   `<h3 class="post-card-title"><a href="${url}" data-route>${this.escapeHTML(p.title)}</a></h3>`
                +   `<p class="post-card-meta">${this.formatDate(p.created_at)}</p>`
                + `</div>`
                + `</article>`
            );
        }).join('');
        container.innerHTML = '<h2 class="text-lg font-bold mb-3">관련 글</h2>'
            + `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cards}</div>`;
    }

    async loadPopularPosts(currentPostId = null) {
        const container = DOM.$('#popular-posts');
        if (!container) return;
        // 캐시 기반 즉시 렌더 제거됨

        if (!this.supabase) return; // 캐시 렌더 후 Supabase 준비되지 않으면 종료
        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';
        const token = Date.now();
        this._reqTokens.popular = token;
        const inflightKey = `popular:${currentPostId || ''}`;
        const { data, error } = await this.withDedupe(inflightKey, () => this.supabase
            .from(table)
            .select('id, title, slug, thumbnail_url, created_at, view_count, status')
            .eq('status', 'published')
            .order('view_count', { ascending: false, nullsFirst: false })
            .limit(5));
        if (error) throw error;
        let list = (data || []).filter(p => p && p.id !== currentPostId);
        if (!list || list.length === 0) { container.innerHTML = ''; return; }
        // 최신 요청이 아닌 경우 DOM 반영을 건너뜀
        if (this._reqTokens.popular !== token) return;
        const header = '<h2 class="text-lg font-bold mb-3">많이 본 글</h2>';
        const items = list.map((p, idx) => {
            const url = '/post/' + encodeURIComponent(p.slug || p.id);
            const views = Number(p.view_count || 0);
            const date = this.formatDateKR(p.created_at);
            return (
              `<li class="popular-item">`
              + `<span class="popular-rank">${idx + 1}</span>`
              + `<a class="popular-link" href="${url}" data-route>${this.escapeHTML(p.title || '')}</a>`
              + `<span class="popular-date">${date}</span>`
              + `<span class="popular-views">${views.toLocaleString('ko-KR')}</span>`
              + `</li>`
            );
        }).join('');
        container.innerHTML = header + `<ul class="popular-list">${items}</ul>`;

        // 캐시 저장 제거됨
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

    // 순수 텍스트를 간단한 마크다운으로 전처리: hN 제목/이미지 URL 자동 치환
    preprocessPlainTextToMarkdown(text = '') {
        try {
            let t = String(text || '');
            // h1~h6 접두어를 마크다운 헤딩으로 변환
            t = t.replace(/^\s*h([1-6])\s+(.+)$/gmi, (m, level, content) => {
                const hashes = '#'.repeat(Number(level));
                return `${hashes} ${content}`;
            });
            // 이미지 URL을 마크다운 이미지로 변환
            t = t.replace(/(^|\s)(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif|svg))(?!\S)/gmi, (m, space, url) => {
                return `${space}![](${url})`;
            });
            return t;
        } catch { return String(text || ''); }
    }

    // 마크다운/단순 HTML에서 생성된 단순 <img>를 반응형 최적화 이미지로 변환
    transformPlainImagesToOptimized(html, title = '') {
        try {
            const div = document.createElement('div');
            div.innerHTML = String(html || '');
            const conn = (navigator && navigator.connection) ? navigator.connection : {};
            const saveData = !!conn.saveData;
            const et = conn.effectiveType || '';
            const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
            const w = isSlow ? [360, 600] : [480, 768, 1200];
            const mainW = isSlow ? 900 : 1200;
            const mainQ = isSlow ? 75 : 85;
            const setQ = isSlow ? 60 : 80;
            const sizes = isSlow ? '(max-width: 600px) 100vw, 600px' : '(max-width: 768px) 100vw, 768px';

            const imgs = Array.from(div.querySelectorAll('img'));
            imgs.forEach((img, i) => {
                if (img.hasAttribute('srcset')) return; // 이미 최적화된 경우 스킵
                const src = img.getAttribute('src') || '';
                if (!src) return;
                const altRaw = (img.getAttribute('alt') || '').trim();
                const altText = altRaw || (() => {
                    try {
                        const u = new URL(src, window.location.origin);
                        const file = (u.pathname.split('/').pop() || '').split('?')[0];
                        return this.deriveAltFromFileName(file);
                    } catch {
                        const file = (src.split('/').pop() || '').split('?')[0];
                        return this.deriveAltFromFileName(file);
                    }
                })() || (title || '이미지');
                const optimized = this.getOptimizedPublicUrl(src, { width: mainW, quality: mainQ, format: 'webp' });
                const srcset = w.map(x => `${this.getOptimizedPublicUrl(src, { width: x, quality: setQ, format: 'webp' })} ${x}w`).join(', ');

                // figure로 감싸고 캡션 추가
                const fig = document.createElement('figure');
                const newImg = img.cloneNode(true);
                newImg.setAttribute('src', optimized);
                newImg.setAttribute('srcset', srcset);
                newImg.setAttribute('sizes', sizes);
                newImg.setAttribute('alt', altText);
                const eager = i === 0;
                if (eager) {
                    newImg.removeAttribute('loading');
                    newImg.setAttribute('fetchpriority', 'high');
                } else {
                    newImg.setAttribute('loading', 'lazy');
                    newImg.setAttribute('fetchpriority', 'low');
                }
                newImg.setAttribute('decoding', 'async');
                fig.appendChild(newImg);
                const cap = document.createElement('figcaption');
                cap.textContent = altText;
                fig.appendChild(cap);

                const parent = img.parentElement;
                if (parent && parent.tagName.toLowerCase() === 'p') {
                    parent.replaceWith(fig);
                } else {
                    img.replaceWith(fig);
                }
            });
            return div.innerHTML;
        } catch { return html; }
    }

    // 연속 중복 이미지(같은 src/srcset)를 제거해 본문 중복 렌더링을 방지
    dedupeConsecutiveImages(html) {
        try {
            const div = document.createElement('div');
            div.innerHTML = String(html || '');

            const getKey = (img) => `${img.getAttribute('src') || ''}|${img.getAttribute('srcset') || ''}`;

            const containers = Array.from(div.querySelectorAll('figure, img'))
                .filter(el => !(el.tagName.toLowerCase() === 'img' && el.closest('figure')));

            for (let i = 0; i < containers.length; i++) {
                const cur = containers[i];
                const curImg = cur.tagName.toLowerCase() === 'img' ? cur : cur.querySelector('img');
                if (!curImg) continue;
                const prevEl = cur.previousElementSibling;
                if (!prevEl) continue;
                const prevImg = prevEl.tagName.toLowerCase() === 'img' ? prevEl : prevEl.querySelector && prevEl.querySelector('img');
                if (!prevImg) continue;
                const same = getKey(curImg) === getKey(prevImg);
                if (same) {
                    cur.remove();
                }
            }
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
        const page = Number(params.get('page') || '1');
        // 스켈레톤 표시
        container.innerHTML = '<div class="animate-pulse space-y-3">'
            + '<div class="h-6 bg-gray-200 rounded"></div>'
            + '<div class="h-24 bg-gray-200 rounded"></div>'
            + '<div class="h-24 bg-gray-200 rounded"></div>'
            + '</div>';

        // 테스트/진단용 시나리오 파라미터 처리
        const scenario = params.get('scenario');
        if (scenario === 'empty') {
            container.innerHTML = '<div class="text-gray-500">표시할 게시글이 없습니다.</div>';
            return;
        }
        if (scenario === 'error') {
            container.innerHTML = '<div class="text-red-600">'
                + '<p class="font-semibold">게시글을 불러오지 못했습니다.</p>'
                + '<p class="text-sm text-red-500">진단 시나리오에 의해 오류가 강제되었습니다.</p>'
                + '</div>';
            return;
        }
        // 오프라인 감지/배너 표시 제거됨

        // Supabase가 아직 준비되지 않은 초기 렌더에서는 초기화 시도 후 실패 시 프리패치/캐시 렌더를 유지하고 조용히 건너뜁니다.
        await this.ensureSupabaseReady(1200);
        if (!this.supabase) return;

        // 페이지네이션 계산
        const perPage = (window.Config && window.Config.POSTS_PER_PAGE) || 10;
        const from = (page - 1) * perPage;
        const to = from + perPage - 1;

        const table = (window.Config && window.Config.DB_TABLE_NAME) || 'posts';

        // 레이스 가드: 최신 요청만 렌더에 반영
        const token = Date.now();
        this._reqTokens.home = token;
        const key = `home:${from}-${to}`;
        try {
            const { data, count, error } = await this.withDedupe(key, () =>
                this.supabase
                    .from(table)
                    .select('id, title, summary, slug, category, thumbnail_url, created_at, view_count, status', { count: 'exact' })
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .range(from, to)
            );

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = '<div class="text-gray-500">표시할 게시글이 없습니다.</div>';
                const pagEl = DOM.$('#home-pagination');
                if (pagEl) pagEl.innerHTML = '';
                return;
            }

            // 캐시 저장 제거됨
            
            // 페이지네이션 갱신
            try {
                const pagEl = DOM.$('#home-pagination');
                if (pagEl) {
                    const totalPages = Math.max(1, Math.ceil((count || 0) / perPage));
                    if (totalPages <= 1) {
                        pagEl.innerHTML = '';
                    } else {
                        const makeBtn = (p, label = null, active = false) => `<button data-page="${p}" class="px-3 py-1 rounded border ${active? 'bg-black text-white':'hover:bg-black/5'}">${label || p}</button>`;
                        const prev = page > 1 ? makeBtn(page - 1, '이전') : '<span class="px-3 py-1 text-gray-400">이전</span>';
                        const next = page < totalPages ? makeBtn(page + 1, '다음') : '<span class="px-3 py-1 text-gray-400">다음</span>';
                        const windowSize = 5;
                        const start = Math.max(1, page - Math.floor(windowSize/2));
                        const end = Math.min(totalPages, start + windowSize - 1);
                        const pages = [];
                        for (let p = start; p <= end; p++) pages.push(makeBtn(p, null, p === page));
                        pagEl.innerHTML = prev + pages.join('') + next;
                        pagEl.querySelectorAll('button[data-page]').forEach(btn => {
                            btn.onclick = () => {
                                const targetPage = Number(btn.getAttribute('data-page')) || 1;
                                this.navigate(`/?page=${targetPage}`);
                            };
                        });
                    }
                }
            } catch (_) { /* noop */ }

            // 최신 요청이 아닌 경우 DOM 반영을 건너뜀
            if (this._reqTokens.home !== token) return;
            container.innerHTML = this.renderPostsListHTML(data);
        } catch (err) {
            // 사용자에게 명시적으로 안내하고, 토스트도 띄움
            const msg = (err && (err.message || err.msg)) ? String(err.message || err.msg) : '알 수 없는 오류';
            const status = (err && (err.status || err.code)) ? String(err.status || err.code) : '';
            container.innerHTML = '<div class="error-banner">'
                + '<div class="error-banner-content">'
                +   '<svg class="error-banner-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v2h2v-2zm0-8H9v6h2V5z"/></svg>'
                +   '<div class="error-banner-text">'
                +     '<div class="error-banner-title">게시글을 불러오지 못했습니다.</div>'
                +     '<div class="error-banner-message">잠시 후 다시 시도해 주세요.' + (status ? ' (' + this.escapeHTML(status) + ')' : '') + '</div>'
                +     '<div class="error-details">' + this.escapeHTML(msg) + '</div>'
                +   '</div>'
                + '</div>'
                + '</div>';
            this.handleError(err, 'loadHomePosts');
        }
    }

    // 게시글 카드 리스트 HTML 생성
    renderPostsListHTML(posts) {
        return posts.map((post, idx) => {
            const href = '/post/' + encodeURIComponent(post.slug || post.id);
            const conn = (navigator && navigator.connection) ? navigator.connection : {};
            const saveData = !!conn.saveData;
            const et = conn.effectiveType || '';
            const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
            // 메인 목록: 제목 전체 너비, 요약/이미지 2열
            // CSS 슬롯 너비(데스크톱)와 일치: .post-card-content-grid { grid-template-columns: 1fr 280px; }
            const slotW = 280;
            const slotH = Math.round(slotW * (9 / 16)); // 16:9 비율에 맞춤 (≈158px)
            const q = isSlow ? 70 : 80;
            const widths = isSlow ? [slotW] : [slotW, slotW * 2]; // 1x/2x 후보군 (280/560)
            const sizes = '(max-width: 640px) 100vw, 280px';
            const thumbUrl = post.thumbnail_url ? this.getTransformedPublicUrl(post.thumbnail_url, { width: slotW, height: slotH, resize: 'cover', quality: q, format: 'webp' }) : null;
            const srcset = post.thumbnail_url ? widths.map(x => `${this.getTransformedPublicUrl(post.thumbnail_url, { width: x, height: Math.round(x * (slotH / slotW)), resize: 'cover', quality: q, format: 'webp' })} ${x}w`).join(', ') : '';
            const eager = idx === 0; // 첫 번째 카드 LCP 개선
            const loading = eager ? '' : ' loading="lazy"';
            const fetchp = eager ? ' fetchpriority="high"' : ' fetchpriority="low"';
            // 첫 번째 썸네일은 프리로드 링크를 추가해 재사용률을 높임
            if (eager && thumbUrl) {
                try {
                    const existed = document.querySelector(`link[rel="preload"][as="image"][href="${thumbUrl}"]`);
                    if (!existed) {
                        const l = document.createElement('link');
                        l.rel = 'preload';
                        l.as = 'image';
                        l.href = thumbUrl;
                        if (srcset) l.setAttribute('imagesrcset', srcset);
                        l.setAttribute('imagesizes', sizes);
                        l.crossOrigin = 'anonymous';
                        document.head.appendChild(l);
                    }
                } catch (_) { /* noop */ }
            }
            const imgTag = thumbUrl ? `<img src="${thumbUrl}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ''} alt="${this.escapeHTML(post.title || '')}" class="post-card-thumb-img" width="${slotW}" height="${slotH}" decoding="async"${loading}${fetchp}/>` : '';
            const initial = this.escapeHTML(String((post.title || 'N')).trim().charAt(0).toUpperCase());
            const thumbBlock = `<a href="${href}" data-route class="post-card-thumb${thumbUrl ? '' : ' placeholder'}">${thumbUrl ? imgTag : `<span class=\"thumb-initial\">${initial}</span>`}</a>`;
            const date = this.formatDateKR(post.created_at);
            const categoryBadge = post.category ? `<span class="badge">${this.escapeHTML(post.category)}</span>` : '';
            const editLink = this.state.user ? `<a href="/writer/${encodeURIComponent(post.slug)}" data-route class="btn-xs">편집</a>` : '';

            return '<article class="post-card post-card-wide" data-route data-href="' + href + '" tabindex="0">'
                + `<h2 class="post-card-title"><a href="${href}" data-route>${this.escapeHTML(post.title || '제목 없음')}</a></h2>`
                + `<div class="post-card-content-grid">`
                +   `<div class="post-card-summary-block">`
                +       (post.summary ? `<p class="post-card-summary">${this.escapeHTML(post.summary)}</p>` : '')
                +       `<div class="post-card-meta">작성일 ${date}${post.category ? ` · 카테고리 ${categoryBadge}` : ''}</div>`
                +       `<div class="post-card-actions">${editLink}</div>`
                +   `</div>`
                +   thumbBlock
                + `</div>`
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