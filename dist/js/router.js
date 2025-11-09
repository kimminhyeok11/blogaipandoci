// 간단한 선언형 라우터
// BlogApp의 라우팅 분기를 모듈로 분리하여 유지보수를 쉽게 합니다.
(function() {
  function decodeSlugSegment(path, prefix) {
    try {
      const raw = path.split(prefix)[1];
      if (!raw) return null;
      const first = raw.split('/')[0];
      return first ? decodeURIComponent(first) : null;
    } catch (_) { return null; }
  }

  const routes = [
    {
      name: 'home',
      match: (p) => p === '/' || p === '/home' || p === '/library',
      exec: (app, params) => app.renderHome(params)
    },
    {
      name: 'post',
      match: (p) => p.startsWith('/post/'),
      exec: (app, _params, pathArg) => {
        const src = typeof pathArg === 'string' ? pathArg : window.location.pathname;
        const slug = decodeSlugSegment(src, '/post/') || '';
        app.renderPost(slug);
      }
    },
    {
      name: 'archives',
      match: (p) => p === '/archives' || p === '/archive',
      exec: (app) => app.renderArchives()
    },
    {
      name: 'post_index',
      match: (p) => p === '/post',
      exec: (app) => app.renderArchives()
    },
    {
      name: 'dashboard',
      match: (p) => p === '/dashboard',
      requiresAuth: true,
      exec: (app) => app.renderDashboard()
    },
    {
      name: 'writer',
      match: (p) => p === '/writer' || p.startsWith('/writer/'),
      requiresAuth: true,
      exec: (app, _params, pathArg) => {
        const src = typeof pathArg === 'string' ? pathArg : window.location.pathname;
        const slug = decodeSlugSegment(src, '/writer/') || null;
        app.renderWriter(slug);
      }
    },
    {
      name: 'login',
      match: (p) => p === '/login',
      exec: (app) => app.renderLoginModal()
    }
  ];

  const Router = {
    resolve(path) {
      const cleanPath = String(path || '/').split('?')[0];
      for (const r of routes) {
        try {
          if (r.match(cleanPath)) return { name: r.name, exec: (app, params) => r.exec(app, params, cleanPath), requiresAuth: !!r.requiresAuth };
        } catch (_) { /* noop */ }
      }
      return { name: 'not_found', exec: (app) => app.render404() };
    }
  };

  window.Router = Router;
})();