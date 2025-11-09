// 인증 관련 기능을 전담하는 경량 서비스 모듈
// Supabase 클라이언트 의존성을 최소화하여 BlogApp의 결합도를 낮춥니다.
(function() {
  class AuthService {
    constructor(supabase) {
      this.supabase = supabase || null;
      this._subscribers = new Set();
    }

    setClient(supabase) {
      this.supabase = supabase;
    }

    async getSession() {
      try {
        if (!this.supabase?.auth) return null;
        const { data: { session } } = await this.supabase.auth.getSession();
        return session || null;
      } catch (_) { return null; }
    }

    async signOut() {
      if (!this.supabase?.auth) return;
      try { await this.supabase.auth.signOut(); } catch (_) {}
    }

    async signInWithOtp(email, redirectTo) {
      if (!this.supabase?.auth) throw new Error('Auth 모듈 미초기화');
      const { error } = await this.supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, emailRedirectTo: redirectTo }
      });
      if (error) throw error;
      return true;
    }

    onAuthStateChange() {
      if (!this.supabase?.auth || typeof this.supabase.auth.onAuthStateChange !== 'function') return () => {};
      const unsub = this.supabase.auth.onAuthStateChange((event, session) => {
        this._subscribers.forEach(fn => {
          try { fn(event, session || null); } catch (_) {}
        });
      });
      return unsub;
    }

    subscribe(fn) {
      if (typeof fn === 'function') this._subscribers.add(fn);
      return () => this._subscribers.delete(fn);
    }

    async logAuthEvent(type, payload = {}) {
      try {
        if (!this.supabase) return;
        const safe = {
          type,
          email_hint: (payload.email || '').replace(/(^.).+(@.+$)/, '$1***$2'),
          provider: payload.provider || null,
          user_agent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : null,
          success: payload.success === true,
          at: new Date().toISOString()
        };
        await this.supabase.from('auth_events').insert(safe);
      } catch (_) {}
    }
  }

  window.AuthService = AuthService;
})();