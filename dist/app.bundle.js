(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // js/config.js
  (function() {
    const defaults = {
      SUPABASE_URL: "https://ddehwkwzmmvcxltlplua.supabase.co",
      // 기본 키는 예시 값입니다. 실제 키가 window.Config에 이미 있다면 그 값을 유지합니다.
      SUPABASE_ANON_KEY: "PLACEHOLDER_REPLACE_WITH_REAL_KEY",
      DB_TABLE_NAME: "posts",
      IMAGE_BUCKET_NAME: "thought-images",
      SITE_URL: "https://blogaipandoci.vercel.app",
      CATEGORIES: ["AI", "\uAE30\uC220", "\uBCF4\uD5D8", "\uC77C\uC0C1", "\uAE30\uD0C0"],
      POSTS_PER_PAGE: 8,
      MAX_FILE_SIZE: 5 * 1024 * 1024,
      // 5MB
      ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"]
    };
    const existing = typeof window !== "undefined" && window.Config ? window.Config : {};
    const merged = Object.assign({}, defaults, existing);
    if (typeof window !== "undefined") {
      window.Config = merged;
    }
  })();

  // js/dom-utils.js
  var DOM2 = {
    // 요소 선택
    $(selector) {
      return document.querySelector(selector);
    },
    $$(selector) {
      return document.querySelectorAll(selector);
    },
    // 요소 생성
    create(tag, attributes = {}, content = "") {
      const element = document.createElement(tag);
      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value;
        } else if (key === "innerHTML") {
          element.innerHTML = value;
        } else {
          element.setAttribute(key, value);
        }
      });
      if (content) {
        element.textContent = content;
      }
      return element;
    },
    // 애니메이션 표시/숨김
    show(selector, options = {}) {
      const element = typeof selector === "string" ? this.$(selector) : selector;
      if (!element) return;
      const defaultOptions = {
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 300,
        easing: "easeOutQuad"
      };
      const animOptions = { ...defaultOptions, ...options };
      element.style.display = "block";
      if (window.anime) {
        anime({
          targets: element,
          ...animOptions
        });
      } else {
        element.style.opacity = "1";
      }
    },
    hide(selector, options = {}) {
      const element = typeof selector === "string" ? this.$(selector) : selector;
      if (!element) return;
      const defaultOptions = {
        opacity: 0,
        duration: 200,
        easing: "easeInQuad",
        complete: () => element.style.display = "none"
      };
      const animOptions = { ...defaultOptions, ...options };
      if (window.anime) {
        anime({
          targets: element,
          ...animOptions
        });
      } else {
        element.style.opacity = "0";
        element.style.display = "none";
      }
    },
    // URL 빌드
    buildUrl(basePath, params = {}) {
      const url = new URL(basePath, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== void 0 && value !== "") {
          url.searchParams.set(key, value);
        }
      });
      return url.pathname + url.search;
    },
    // 모달 관련 (접근성/포커스 트랩/스크롤 잠금 통합)
    openModal(id) {
      const modal = this.$(`#${id}`);
      if (!modal) return;
      modal.classList.remove("hidden");
      this.show(modal);
      document.body.classList.add("modal-open");
      try {
        const bgSelectors = ["#app-container", "#main-nav-container"];
        bgSelectors.forEach((sel) => {
          const el = document.querySelector(sel);
          if (el && !modal.contains(el)) {
            el.setAttribute("inert", "");
            el.setAttribute("aria-hidden", "true");
          }
        });
      } catch (_) {
      }
      const content = modal.querySelector(".modal-content");
      if (content) {
        content.setAttribute("role", "dialog");
        content.setAttribute("aria-modal", "true");
        const titleEl = content.querySelector(".modal-title");
        if (titleEl) {
          if (!titleEl.id) titleEl.id = `${id}-title`;
          content.setAttribute("aria-labelledby", titleEl.id);
        }
        const descEl = content.querySelector(".modal-message, .modal-body");
        if (descEl && !content.hasAttribute("aria-describedby")) {
          const descId = `${id}-desc`;
          if (!descEl.id) descEl.id = descId;
          content.setAttribute("aria-describedby", descEl.id);
        }
      }
      modal.__returnFocus = document.activeElement;
      const focusables = Array.from(modal.querySelectorAll(
        'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter((el) => el.offsetParent !== null);
      const initialFocus = focusables[0] || content;
      if (initialFocus) {
        if (!initialFocus.hasAttribute("tabindex")) initialFocus.setAttribute("tabindex", "-1");
        initialFocus.focus({ preventScroll: true });
      }
      const onKeydown = (e) => {
        if (e.key === "Tab") {
          const list = Array.from(modal.querySelectorAll(
            'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )).filter((el) => el.offsetParent !== null);
          if (list.length === 0) return;
          const first = list[0];
          const last = list[list.length - 1];
          const active = document.activeElement;
          if (e.shiftKey) {
            if (active === first || !modal.contains(active)) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (active === last) {
              e.preventDefault();
              first.focus();
            }
          }
        } else if (e.key === "Escape") {
          this.closeModal(id);
        }
      };
      modal.__onKeydown = onKeydown;
      modal.addEventListener("keydown", onKeydown, true);
      const overlay = modal.querySelector(".modal-overlay");
      const onOverlayClick = (ev) => {
        if (ev.target === overlay) this.closeModal(id);
      };
      if (overlay) {
        modal.__onOverlayClick = onOverlayClick;
        overlay.addEventListener("click", onOverlayClick);
      }
    },
    closeModal(id) {
      const modal = this.$(`#${id}`);
      if (!modal) return;
      if (modal.__onKeydown) {
        modal.removeEventListener("keydown", modal.__onKeydown, true);
        modal.__onKeydown = null;
      }
      const overlay = modal.querySelector(".modal-overlay");
      if (overlay && modal.__onOverlayClick) {
        overlay.removeEventListener("click", modal.__onOverlayClick);
        modal.__onOverlayClick = null;
      }
      this.hide(modal, {
        complete: () => {
          modal.classList.add("hidden");
          document.body.classList.remove("modal-open");
          try {
            const bgSelectors = ["#app-container", "#main-nav-container"];
            bgSelectors.forEach((sel) => {
              const el = document.querySelector(sel);
              if (el) {
                el.removeAttribute("inert");
                el.removeAttribute("aria-hidden");
              }
            });
          } catch (_) {
          }
          const prev = modal.__returnFocus;
          if (prev && typeof prev.focus === "function") {
            prev.focus({ preventScroll: true });
          }
          modal.__returnFocus = null;
          try {
            modal.removeAttribute("aria-modal");
          } catch (_) {
          }
        }
      });
    },
    // 로딩 스피너
    showLoading(container = "body") {
      const target = typeof container === "string" ? this.$(container) : container;
      if (!target) return;
      const spinner = this.create("div", {
        className: "loading-spinner",
        style: "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.6);backdrop-filter:saturate(120%) blur(2px);",
        innerHTML: `
                <div class="flex items-center justify-center p-8">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span class="ml-3 text-gray-700">\uB85C\uB529 \uC911...</span>
                </div>
            `
      });
      target.appendChild(spinner);
      return spinner;
    },
    hideLoading(container = "body") {
      const target = typeof container === "string" ? this.$(container) : container;
      const spinner = target == null ? void 0 : target.querySelector(".loading-spinner");
      if (spinner) {
        spinner.remove();
      }
    }
  };
  window.DOM = DOM2;

  // js/ui-components.js
  var UIComponents2 = {
    _toastQueue: [],
    _maxToastStack: 3,
    // 토스트 알림
    showToast(message, type = "info", duration = 3e3) {
      var _a;
      const toastContainer = DOM.$("#toast-container") || this.createToastContainer();
      const isReduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const existing = Array.from(toastContainer.children || []).find((el) => {
        var _a2;
        try {
          return ((_a2 = el.querySelector(".text-sm.font-medium")) == null ? void 0 : _a2.textContent) === message;
        } catch (e) {
          return false;
        }
      });
      if (existing) {
        const inner = existing.querySelector(".flex.items-center");
        if (inner) inner.className = `flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg ${this.getToastClasses(type)}`;
        const iconHost = existing.querySelector(".flex-shrink-0");
        if (iconHost) iconHost.innerHTML = this.getToastIcon(type);
        const oldId = existing.dataset.timerId ? Number(existing.dataset.timerId) : null;
        if (oldId) {
          try {
            clearTimeout(oldId);
          } catch (e) {
          }
        }
        const newId = setTimeout(() => {
          existing.classList.add("translate-x-full");
          setTimeout(() => {
            existing.remove();
            this._drainToastQueue();
          }, 300);
        }, duration);
        existing.dataset.timerId = String(newId);
        toastContainer.appendChild(existing);
        try {
          const ae = document.activeElement;
          const triggered = ae && (ae.tagName === "BUTTON" || ae.tagName === "A" || ae.getAttribute("role") === "button");
          if (triggered) existing.focus({ preventScroll: true });
        } catch (e) {
        }
        return;
      }
      if ((((_a = toastContainer.children) == null ? void 0 : _a.length) || 0) >= this._maxToastStack) {
        this._toastQueue.push({ message, type, duration });
        return;
      }
      const toast = DOM.create("div", {
        className: `toast toast-${type} ${isReduceMotion ? "" : "transform translate-x-full transition-transform duration-300 ease-in-out"}`,
        role: type === "error" || type === "warning" ? "alert" : "status",
        "aria-live": type === "error" || type === "warning" ? "assertive" : "polite",
        tabIndex: "-1",
        innerHTML: `
                <div class="flex items-center p-4 mb-4 text-sm rounded-lg shadow-lg ${this.getToastClasses(type)}">
                    <div class="flex-shrink-0">
                        ${this.getToastIcon(type)}
                    </div>
                    <div class="ml-3 text-sm font-medium">${message}</div>
                    <button type="button" class="toast-close ml-auto -mx-1.5 -my-1.5 rounded-lg p-1.5 hover:bg-gray-100 inline-flex h-8 w-8" aria-label="\uB2EB\uAE30">
                        <span class="sr-only">\uB2EB\uAE30</span>
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            `
      });
      toastContainer.appendChild(toast);
      if (isReduceMotion) {
        toast.classList.remove("translate-x-full");
      } else {
        setTimeout(() => {
          toast.classList.remove("translate-x-full");
        }, 100);
      }
      try {
        const ae = document.activeElement;
        const triggeredByKeyboard = ae && (ae.tagName === "BUTTON" || ae.tagName === "A" || ae.getAttribute("role") === "button");
        if (triggeredByKeyboard) toast.focus({ preventScroll: true });
      } catch (e) {
      }
      const closeBtn = toast.querySelector(".toast-close");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          toast.remove();
          this._drainToastQueue();
        });
      }
      const timerId = setTimeout(() => {
        toast.classList.add("translate-x-full");
        setTimeout(() => {
          toast.remove();
          this._drainToastQueue();
        }, 300);
      }, duration);
      toast.dataset.timerId = String(timerId);
    },
    _drainToastQueue() {
      var _a;
      const toastContainer = DOM.$("#toast-container") || this.createToastContainer();
      while (this._toastQueue.length && (((_a = toastContainer.children) == null ? void 0 : _a.length) || 0) < this._maxToastStack) {
        const next = this._toastQueue.shift();
        if (!next) break;
        this.showToast(next.message, next.type, next.duration);
      }
    },
    createToastContainer() {
      const container = DOM.create("div", {
        id: "toast-container",
        className: "fixed top-4 right-4 z-50 space-y-2",
        "aria-live": "polite",
        "aria-atomic": "true"
      });
      document.body.appendChild(container);
      return container;
    },
    getToastClasses(type) {
      const classes = {
        success: "text-green-800 bg-green-50 border border-green-200",
        error: "text-red-800 bg-red-50 border border-red-200",
        warning: "text-yellow-800 bg-yellow-50 border border-yellow-200",
        info: "text-blue-800 bg-blue-50 border border-blue-200"
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
    // 확인 다이얼로그 (CSS 모달 구조/접근성/포커스 트랩 적용)
    showConfirm(message, onConfirm, onCancel) {
      const host = document.getElementById("modal-container") || document.body;
      const id = `confirm-modal-${Date.now()}`;
      const modal = DOM.create("div", {
        id,
        className: "hidden",
        innerHTML: `
                <div class="modal-overlay">
                    <div class="modal-content confirm-modal modal-danger modal-content-md">
                        <div class="modal-header">
                            <h3 class="modal-title">\uD655\uC778</h3>
                            <button class="modal-close" aria-label="\uB2EB\uAE30">\u2715</button>
                        </div>
                        <div class="modal-body">
                            <div class="modal-icon">\u26A0\uFE0F</div>
                            <p class="modal-message">${message}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="btn px-4 py-2 rounded-lg border cancel-btn">\uCDE8\uC18C</button>
                            <button class="btn px-4 py-2 rounded-lg bg-red-600 text-white confirm-btn">\uD655\uC778</button>
                        </div>
                    </div>
                </div>`
      });
      host.appendChild(modal);
      const cancelBtn = modal.querySelector(".cancel-btn");
      const confirmBtn = modal.querySelector(".confirm-btn");
      const closeBtn = modal.querySelector(".modal-close");
      const cleanup = () => {
        setTimeout(() => modal.remove(), 200);
      };
      const doCancel = () => {
        DOM.closeModal(id);
        cleanup();
        if (onCancel) onCancel();
      };
      const doConfirm = () => {
        DOM.closeModal(id);
        cleanup();
        if (onConfirm) onConfirm();
      };
      if (cancelBtn) cancelBtn.addEventListener("click", doCancel);
      if (confirmBtn) confirmBtn.addEventListener("click", doConfirm);
      if (closeBtn) closeBtn.addEventListener("click", doCancel);
      DOM.openModal(id);
    },
    // 프로그레스 바
    createProgressBar(container, initialValue = 0) {
      var _a;
      const progressContainer = DOM.create("div", {
        className: "w-full bg-gray-200 rounded-full h-2.5 mb-4",
        innerHTML: `
                <div class="progress-bar-fill bg-purple-600 h-2.5 rounded-full transition-all duration-300 ease-out" style="width: ${initialValue}%"></div>
            `
      });
      const progressBar = progressContainer.querySelector(".progress-bar-fill");
      if (typeof container === "string") {
        (_a = DOM.$(container)) == null ? void 0 : _a.appendChild(progressContainer);
      } else {
        container == null ? void 0 : container.appendChild(progressContainer);
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
    createSkeleton(type = "post") {
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
      return DOM.create("div", {
        className: "skeleton-loader",
        innerHTML: skeletons[type] || skeletons.post
      });
    }
  };
  window.UIComponents = UIComponents2;

  // js/blog-app.js
  try {
    if (typeof window !== "undefined") {
      window.Config = window.Config || (typeof Config !== "undefined" ? Config : {});
    }
    const _LocalConfig = window.Config;
  } catch (e) {
  }
  var BlogApp = class {
    constructor() {
      // 앱 상태 (State)
      __publicField(this, "state", {
        user: null,
        isAuthReady: false,
        currentCategory: "\uC804\uCCB4",
        editorInstance: null,
        archives: {
          category: "\uC804\uCCB4",
          tag: "",
          page: 1,
          pageSize: 20,
          sort: "latest",
          total: 0
        }
      });
      // 서비스 인스턴스
      __publicField(this, "supabase", null);
      __publicField(this, "authService", null);
      // 네트워크 성능 최적화: 동일 키의 요청 중복 방지 및 레이스 가드
      __publicField(this, "_inFlight", /* @__PURE__ */ new Map());
      __publicField(this, "_reqTokens", { home: 0, archives: 0, popular: 0 });
      // 히스토리 이동 시 스크롤 상태 복원을 위한 저장소 및 플래그
      __publicField(this, "_scrollStore", /* @__PURE__ */ new Map());
      __publicField(this, "_isPopNavigating", false);
      this.handleGlobalClick = this.handleGlobalClick.bind(this);
      this.handlePopState = this.handlePopState.bind(this);
      this.init();
    }
    // 동일 파라미터의 중복 요청을 하나로 합치고, 완료 후 정리
    async withDedupe(key, exec) {
      if (this._inFlight.has(key)) return this._inFlight.get(key);
      const p = (async () => {
        try {
          return await exec();
        } finally {
          this._inFlight.delete(key);
        }
      })();
      this._inFlight.set(key, p);
      return p;
    }
    /**
     * [App Init]
     * 앱의 핵심 로직을 초기화하고 인증 상태 변경을 감지합니다.
     */
    async init() {
      var _a, _b, _c;
      try {
        await this.ensureSupabaseReady(1200);
        if (window.AuthService && this.supabase) {
          this.authService = new window.AuthService(this.supabase);
          this.authService.subscribe((event, session) => {
            this.state.user = (session == null ? void 0 : session.user) || null;
            try {
              this._logAuthEvent("auth_state_change", { event });
            } catch (_) {
            }
            this.renderNav();
          });
          try {
            this.authService.onAuthStateChange();
          } catch (_) {
          }
        }
        this.bindGlobalListeners();
        if (this.authService) {
          const session = await this.authService.getSession();
          this.state.user = (session == null ? void 0 : session.user) || null;
          try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            const hash = window.location.hash || "";
            const tokenHash = params.get("token_hash");
            const rawType = (params.get("type") || "").toLowerCase();
            const typeParam = this._normalizeOtpType(rawType);
            const oauthCode = params.get("code");
            const hasFragmentTokens = /access_token=|refresh_token=|type=recovery/.test(hash);
            if (tokenHash && typeParam) {
              this.setLoading(true);
              try {
                const { data, error } = await this.supabase.auth.verifyOtp({ token_hash: tokenHash, type: typeParam });
                if (!error && ((_a = data == null ? void 0 : data.session) == null ? void 0 : _a.user)) {
                  this.state.user = data.session.user;
                  params.delete("token_hash");
                  params.delete("type");
                  const cleanUrl = url.pathname + (params.toString() ? "?" + params.toString() : "");
                  window.history.replaceState({}, document.title, cleanUrl);
                  UIComponents.showToast(this.state.user.email + "\uB2D8, \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
                  this.renderNav();
                  this.navigate("/");
                } else if (error) {
                  console.warn("verifyOtp \uC624\uB958:", error);
                  UIComponents.showToast("\uB85C\uADF8\uC778 \uD1A0\uD070 \uD655\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uB9C1\uD06C\uB97C \uB2E4\uC2DC \uC694\uCCAD\uD574\uC8FC\uC138\uC694.", "error");
                }
              } catch (e) {
                console.warn("verifyOtp \uC2E4\uD328:", e);
              }
            } else if (tokenHash && !typeParam) {
              this.setLoading(true);
              try {
                const { data, error } = await this.supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
                if (!error && ((_b = data == null ? void 0 : data.session) == null ? void 0 : _b.user)) {
                  this.state.user = data.session.user;
                  params.delete("token_hash");
                  const cleanUrl = url.pathname + (params.toString() ? "?" + params.toString() : "");
                  window.history.replaceState({}, document.title, cleanUrl);
                  UIComponents.showToast(this.state.user.email + "\uB2D8, \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
                  this.renderNav();
                  this.navigate("/");
                } else if (error) {
                  console.warn("verifyOtp(magiclink, fallback) \uC624\uB958:", error);
                  UIComponents.showToast("\uB85C\uADF8\uC778 \uB9C1\uD06C \uD655\uC778 \uC2E4\uD328. \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.", "error");
                }
              } catch (e) {
                console.warn("verifyOtp(magiclink, fallback) \uC2E4\uD328:", e);
              }
            } else if (oauthCode) {
              this.setLoading(true);
              try {
                const { data, error } = await this.supabase.auth.exchangeCodeForSession({ code: oauthCode });
                if (!error && ((_c = data == null ? void 0 : data.session) == null ? void 0 : _c.user)) {
                  this.state.user = data.session.user;
                  params.delete("code");
                  const cleanUrl = url.pathname + (params.toString() ? "?" + params.toString() : "");
                  window.history.replaceState({}, document.title, cleanUrl);
                  UIComponents.showToast(this.state.user.email + "\uB2D8, \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
                  this.renderNav();
                  this.navigate("/");
                }
              } catch (e) {
                console.warn("exchangeCodeForSession \uC2E4\uD328:", e);
              }
            } else if (hasFragmentTokens) {
              this.setLoading(true);
              const { data: { session: s2 } } = await this.supabase.auth.getSession();
              if (s2 == null ? void 0 : s2.user) {
                this.state.user = s2.user;
                const cleanUrl = url.pathname + (params.toString() ? "?" + params.toString() : "");
                window.history.replaceState({}, document.title, cleanUrl);
                UIComponents.showToast(s2.user.email + "\uB2D8, \uB85C\uADF8\uC778\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
                this.renderNav();
                this.navigate("/");
              }
            }
          } catch (_) {
          }
        } else {
          this.state.user = null;
        }
        this.state.isAuthReady = true;
        this.renderNav();
        this.handleRouting();
        window.addEventListener("popstate", this.handlePopState);
        const loader = DOM.$("#app-loader");
        if (loader) {
          DOM.hide(loader, { complete: () => loader.remove() });
        }
        if (this.supabase && this.supabase.auth && typeof this.supabase.auth.onAuthStateChange === "function") {
          this.supabase.auth.onAuthStateChange((_, newSession) => {
            var _a2;
            const user = (newSession == null ? void 0 : newSession.user) || null;
            const authChanged = ((_a2 = this.state.user) == null ? void 0 : _a2.id) !== (user == null ? void 0 : user.id);
            this.state.user = user;
            if (authChanged) {
              this.renderNav();
              if (user) {
                UIComponents.showToast(user.email + "\uB2D8, \uD658\uC601\uD569\uB2C8\uB2E4!", "success");
              } else {
                UIComponents.showToast("\uB85C\uADF8\uC544\uC6C3\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "info");
                this.navigate("/");
              }
            }
          });
        }
        try {
          if (this.supabase) {
            await this.logSiteVisit();
          }
        } catch (e) {
          console.warn("\uBC29\uBB38 \uB85C\uADF8 \uAE30\uB85D \uC2E4\uD328:", e);
        }
      } catch (error) {
        console.error("App initialization failed:", error);
        UIComponents.showToast("\uC571 \uCD08\uAE30\uD654 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.", "error");
        const loader = DOM.$("#app-loader");
        if (loader) {
          loader.innerHTML = '<div class="text-red-600">\uC571 \uB85C\uB4DC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.</div>';
        }
      }
    }
    // OTP type 정규화: 일부 템플릿/메일 클라이언트에서 비표준 값을 반환하는 경우 대응
    _normalizeOtpType(t = "") {
      switch (String(t || "").toLowerCase()) {
        case "login":
        case "signin":
        case "email":
          return "magiclink";
        case "register":
          return "signup";
        case "recover":
          return "recovery";
        case "magiclink":
        case "signup":
        case "recovery":
        case "invite":
          return t;
        default:
          return t || "magiclink";
      }
    }
    // Supabase 준비를 보장하기 위한 유틸리티 (동적 모듈 로딩 지연 대응)
    async ensureSupabaseReady(maxWaitMs = 800) {
      var _a, _b, _c, _d;
      try {
        if (this.supabase) return true;
        const start = Date.now();
        if (window.supabase && ((_a = window.Config) == null ? void 0 : _a.SUPABASE_URL) && ((_b = window.Config) == null ? void 0 : _b.SUPABASE_ANON_KEY)) {
          this.supabase = window.supabase.createClient(
            window.Config.SUPABASE_URL,
            window.Config.SUPABASE_ANON_KEY,
            { auth: { storageKey: "sb-insurelog-auth-token" } }
          );
          return true;
        }
        while (Date.now() - start < maxWaitMs) {
          await new Promise((r) => setTimeout(r, 50));
          if (window.supabase && ((_c = window.Config) == null ? void 0 : _c.SUPABASE_URL) && ((_d = window.Config) == null ? void 0 : _d.SUPABASE_ANON_KEY)) {
            this.supabase = window.supabase.createClient(
              window.Config.SUPABASE_URL,
              window.Config.SUPABASE_ANON_KEY,
              { auth: { storageKey: "sb-insurelog-auth-token" } }
            );
            return true;
          }
        }
        return !!this.supabase;
      } catch (e) {
        console.warn("ensureSupabaseReady \uC2E4\uD328:", e);
        return false;
      }
    }
    /**
     * [Global Event Listeners]
     * 전역 이벤트 리스너를 바인딩합니다.
     */
    bindGlobalListeners() {
      document.addEventListener("click", this.handleGlobalClick);
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          const openModal = document.querySelector('[id*="modal"]:not(.hidden)');
          if (openModal && openModal.id) {
            DOM.closeModal(openModal.id);
          }
        }
        try {
          this._keySeq = this._keySeq || [];
          const k = (e.key || "").toLowerCase();
          if (k === "g") {
            this._keySeq = ["g"];
            return;
          }
          if (this._keySeq[0] === "g") {
            if (k === "a") {
              e.preventDefault();
              this.navigate("/archives");
            } else if (k === "d") {
              e.preventDefault();
              this.navigate("/dashboard");
            } else if (k === "l") {
              e.preventDefault();
              this.navigate("/login");
            }
            this._keySeq = [];
          }
        } catch (_) {
        }
      });
    }
    /**
     * [Global Click Handler]
     * 전역 클릭 이벤트를 처리합니다.
     */
    handleGlobalClick(e) {
      const target = e.target.closest("[data-route]");
      if (target) {
        const isModified = !!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== void 0 && e.button !== 0);
        const anchor = target.tagName === "A" ? target : target.closest("a");
        const opensNew = anchor && (anchor.getAttribute("target") === "_blank" || anchor.hasAttribute("download"));
        if (isModified || opensNew) return;
        e.preventDefault();
        const href = target.getAttribute("href") || target.getAttribute("data-href");
        if (href && href !== "#") {
          this.navigate(href);
        }
      }
      if (e.target.classList && e.target.classList.contains("modal-overlay")) {
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
      this._isPopNavigating = true;
      this.handleRouting();
      this.renderNav();
      try {
        this.restoreScrollForCurrentPath();
      } catch (_) {
      }
      this._isPopNavigating = false;
    }
    /**
     * [Navigation]
     * 페이지 네비게이션을 처리합니다.
     */
    navigate(path) {
      const next = this.normalizePath(path);
      const current = window.location.pathname + window.location.search;
      const changed = current !== next;
      if (changed) {
        try {
          this.saveScrollForCurrentPath();
        } catch (_) {
        }
        window.history.pushState(null, "", next);
        this.handleRouting();
        this.renderNav();
      }
    }
    /**
     * [Routing]
     * URL 라우팅을 처리합니다.
     */
    handleRouting() {
      const path = this.normalizePath(window.location.pathname);
      const params = new URLSearchParams(window.location.search);
      let targetViewId;
      if (path === "/" || path === "/home" || path === "/library") {
        targetViewId = "view-library";
      } else if (path === "/archives" || path === "/archive" || path === "/post") {
        targetViewId = "view-archives";
      } else if (path.startsWith("/post/")) {
        targetViewId = "view-post";
      } else if (path === "/dashboard") {
        targetViewId = "view-dashboard";
      } else if (path === "/writer" || path.startsWith("/writer/")) {
        targetViewId = "view-writer";
      } else if (path === "/login") {
        targetViewId = "view-library";
      } else {
        targetViewId = "view-library";
      }
      const activeView = DOM.$(".app-view.active");
      if (activeView && activeView.id !== targetViewId) {
        activeView.classList.remove("active");
        DOM.hide(activeView);
      }
      try {
        const route = window.Router && typeof window.Router.resolve === "function" ? window.Router.resolve(path) : null;
        if (route && typeof route.exec === "function") {
          if (route.requiresAuth) {
            const ok = this.checkAuth(true);
            if (!ok) return;
          }
          route.exec(this, params);
        } else {
          this.render404();
        }
      } catch (e) {
        console.warn("Router \uCC98\uB9AC \uC911 \uC624\uB958:", e);
        this.render404();
      }
    }
    /**
     * [Helper] 모달 닫기 바인딩 공통 처리
     * - 닫기 버튼/취소 버튼/오버레이 클릭으로 닫기
     * - 필요 시 추가 후처리(onClose) 실행
     */
    bindModalCloseHandlers(modalId, opts = {}) {
      try {
        const modal = DOM.$(`#${modalId}`);
        if (!modal) return;
        const { closeSelector = ".modal-close", cancelSelector = ".cancel-btn", onClose = null } = opts;
        const doClose = () => {
          DOM.closeModal(modalId);
          if (typeof onClose === "function") {
            try {
              onClose();
            } catch (_) {
            }
          }
        };
        const closeBtn = modal.querySelector(closeSelector);
        const cancelBtn = modal.querySelector(cancelSelector);
        closeBtn && closeBtn.addEventListener("click", doClose);
        cancelBtn && cancelBtn.addEventListener("click", doClose);
      } catch (_) {
      }
    }
    /**
     * [Render: Dashboard]
     * 사용자 대시보드를 렌더링합니다. 인증 필요.
     */
    renderDashboard(containerSelector = "#view-dashboard") {
      var _a;
      if (!this.checkAuth(true)) return;
      this.switchToView("view-dashboard");
      const container = DOM.$(containerSelector);
      if (!container) return;
      const userEmail = ((_a = this.state.user) == null ? void 0 : _a.email) || "\uC54C \uC218 \uC5C6\uC74C";
      container.innerHTML = `
          <section class="max-w-4xl mx-auto py-10 px-6">
            <div class="flex items-center justify-between mb-4">
              <h1 class="text-2xl font-bold">\uB300\uC2DC\uBCF4\uB4DC</h1>
              <a href="/writer" data-route class="px-3 py-2 rounded-lg bg-black text-white">\uC0C8 \uAE00 \uC4F0\uAE30</a>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-4 border rounded-lg">
                <h2 class="text-lg font-semibold mb-2">\uACC4\uC815</h2>
                <p class="text-sm text-gray-600">\uC774\uBA54\uC77C: ${this.escapeHTML(userEmail)}</p>
              </div>
              <div class="p-4 border rounded-lg">
                <h2 class="text-lg font-semibold mb-2">\uCD5C\uADFC \uD65C\uB3D9</h2>
                <div id="dashboard-recent" class="text-sm text-gray-600">\uBD88\uB7EC\uC624\uB294 \uC911\u2026</div>
              </div>
            </div>
          </section>`;
      this.updatePageMeta("\uB300\uC2DC\uBCF4\uB4DC - InsureLog", "\uB0B4 \uACC4\uC815 \uBC0F \uCD5C\uADFC \uD65C\uB3D9", window.location.href, "/og-image.svg");
      this.loadRecentActivities().catch((e) => this.handleError(e, "loadRecentActivities"));
    }
    async loadRecentActivities() {
      try {
        if (!this.supabase) return;
        const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
        const { data, error } = await this.supabase.from(table).select("id, title, slug, status, updated_at").order("updated_at", { ascending: false }).limit(5);
        if (error) throw error;
        const box = DOM.$("#dashboard-recent");
        if (!box) return;
        if (!data || data.length === 0) {
          box.textContent = "\uCD5C\uADFC \uD3B8\uC9D1 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
          return;
        }
        box.innerHTML = '<ul class="space-y-2">' + data.map((p) => {
          const url = "/writer/" + p.slug;
          const date = this.formatDateKR(p.updated_at);
          return `<li class="flex items-center justify-between">
                    <a href="${url}" data-route class="text-sm font-medium">${this.escapeHTML(p.title || "\uC81C\uBAA9 \uC5C6\uC74C")}</a>
                    <span class="text-xs text-gray-500">${date}</span>
                </li>`;
        }).join("") + "</ul>";
      } catch (e) {
        this.handleError(e, "loadRecentActivities");
      }
    }
    /**
     * [Path Utils]
     * 경로 정규화: '/index.html' → '/', '/archives/' → '/archives' 등
     */
    normalizePath(p) {
      try {
        const url = new URL(p, window.location.origin);
        let path = url.pathname || "/";
        try {
          path = decodeURI(path);
        } catch (_) {
        }
        if (path === "/index.html") path = "/";
        if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
        path = path.replace(/\/+/g, "/");
        return path + (url.search || "");
      } catch (_) {
        if (p === "/index.html") return "/";
        if (p.length > 1 && p.endsWith("/")) return p.slice(0, -1);
        return p || "/";
      }
    }
    /**
     * [Utils] 현재 경로 기준 쿼리 파라미터 객체 반환
     */
    getQueryParams() {
      const params = new URLSearchParams(window.location.search);
      const obj = {};
      params.forEach((v, k) => {
        obj[k] = v;
      });
      return obj;
    }
    /**
     * [SEO] robots 메타 업데이트
     */
    updateRobotsMeta(content = "index,follow") {
      const robots = DOM.$('meta[name="robots"]');
      if (robots) robots.content = content;
    }
    /**
     * [SEO] 아카이브 페이지 prev/next 링크 업데이트
     */
    updatePrevNextLinks(totalPages = 1, currentPage = 1) {
      const head = document.head;
      if (!head) return;
      const ensureLink = (rel) => {
        let el = head.querySelector(`link[rel="${rel}"]`);
        if (!el) {
          el = document.createElement("link");
          el.setAttribute("rel", rel);
          head.appendChild(el);
        }
        return el;
      };
      const base = new URL(window.location.href);
      const setPageOnUrl = (p) => {
        const u = new URL(base.href);
        u.searchParams.set("page", String(p));
        return u.toString();
      };
      const prevLink = ensureLink("prev");
      if (currentPage > 1) {
        prevLink.setAttribute("href", setPageOnUrl(currentPage - 1));
      } else {
        prevLink.removeAttribute("href");
      }
      const nextLink = ensureLink("next");
      if (currentPage < totalPages) {
        nextLink.setAttribute("href", setPageOnUrl(currentPage + 1));
      } else {
        nextLink.removeAttribute("href");
      }
    }
    /**
     * [A11y] 대상 뷰로 키보드 포커스 이동
     */
    focusFirstInView(viewId) {
      try {
        const target = DOM.$("#" + viewId);
        if (!target) return;
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      } catch (_) {
      }
    }
    /**
     * [Scroll] 현재 경로의 스크롤 저장/복원
     */
    saveScrollForCurrentPath() {
      const key = window.location.pathname + window.location.search;
      this._scrollStore.set(key, { x: window.scrollX, y: window.scrollY });
    }
    restoreScrollForCurrentPath() {
      const key = window.location.pathname + window.location.search;
      const pos = this._scrollStore.get(key);
      if (pos && typeof pos.y === "number") {
        window.scrollTo({ left: pos.x || 0, top: pos.y || 0, behavior: "auto" });
      }
    }
    /**
     * [Render: Archives]
     * 발행된 글을 월별로 그룹핑해 아카이브 리스트를 보여줍니다.
     */
    renderArchives(containerSelector = "#view-archives") {
      if (containerSelector === "#view-archives") this.switchToView("view-archives");
      const container = DOM.$(containerSelector);
      if (!container) return;
      try {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get("category");
        const tagQ = params.get("tag");
        const page = Number(params.get("page") || this.state.archives.page) || 1;
        const pageSize = Number(params.get("pageSize") || this.state.archives.pageSize) || 20;
        const sort = params.get("sort") || this.state.archives.sort || "latest";
        this.state.archives.category = cat || this.state.archives.category || "\uC804\uCCB4";
        this.state.archives.tag = tagQ || this.state.archives.tag || "";
        this.state.archives.page = page;
        this.state.archives.pageSize = pageSize;
        this.state.archives.sort = ["latest", "oldest", "title"].includes(sort) ? sort : "latest";
      } catch (_) {
      }
      const { category, tag, pageSize: ps, sort: s } = this.state.archives;
      container.innerHTML = `<section class="max-w-4xl mx-auto py-10 px-6"><div class="flex items-center justify-between"><h1 class="text-2xl font-bold">\uC544\uCE74\uC774\uBE0C</h1><div id="archives-header-info" class="text-xs text-gray-500">\uD398\uC774\uC9C0\uB2F9 ${ps}\uAC1C</div></div><div class="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3"><div><label class="block text-xs text-gray-600">\uCE74\uD14C\uACE0\uB9AC</label><select id="archives-filter-category" class="mt-1 w-full border rounded-lg p-2"><option value="\uC804\uCCB4">\uC804\uCCB4</option></select></div><div><label class="block text-xs text-gray-600">\uD0DC\uADF8</label><input id="archives-filter-tag" type="text" class="mt-1 w-full border rounded-lg p-2" placeholder="\uC608: \uBCF4\uD5D8"></div><div><label class="block text-xs text-gray-600">\uC815\uB82C</label><select id="archives-filter-sort" class="mt-1 w-full border rounded-lg p-2"><option value="latest">\uCD5C\uC2E0\uC21C</option><option value="oldest">\uC624\uB798\uB41C\uC21C</option><option value="title">\uC81C\uBAA9\uC21C</option></select></div><div><label class="block text-xs text-gray-600">\uAC1C\uC218</label><select id="archives-filter-pageSize" class="mt-1 w-full border rounded-lg p-2"><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></div><div class="sm:col-span-4 flex items-center justify-end"><button id="archives-filter-apply" class="px-3 py-2 rounded-lg bg-black text-white">\uD544\uD130 \uC801\uC6A9</button></div></div><div id="archives-list" class="mt-6 space-y-6"></div><div id="archives-pagination" class="mt-8 flex items-center justify-center gap-2"></div></section>`;
      const pageNum = this.state.archives.page || 1;
      const titleForArchives = pageNum > 1 ? `\uC544\uCE74\uC774\uBE0C - \uD398\uC774\uC9C0 ${pageNum} - InsureLog` : "\uC544\uCE74\uC774\uBE0C - InsureLog";
      this.updatePageMeta(titleForArchives, "\uC6D4\uBCC4 \uC544\uCE74\uC774\uBE0C\uC640 \uCE74\uD14C\uACE0\uB9AC/\uD0DC\uADF8 \uD544\uD130", window.location.href, "/og-image.svg");
      const tagInput = DOM.$("#archives-filter-tag");
      if (tagInput) tagInput.value = tag || "";
      const sortSel = DOM.$("#archives-filter-sort");
      if (sortSel) sortSel.value = s || "latest";
      const psSel = DOM.$("#archives-filter-pageSize");
      if (psSel) psSel.value = String(ps || 20);
      const applyBtn = DOM.$("#archives-filter-apply");
      if (applyBtn) {
        applyBtn.onclick = () => {
          const catSel = DOM.$("#archives-filter-category");
          const tagField = DOM.$("#archives-filter-tag");
          const sortSel2 = DOM.$("#archives-filter-sort");
          const psSel2 = DOM.$("#archives-filter-pageSize");
          this.state.archives.category = catSel ? catSel.value : "\uC804\uCCB4";
          this.state.archives.tag = tagField ? tagField.value.trim() : "";
          this.state.archives.sort = sortSel2 ? sortSel2.value : "latest";
          this.state.archives.pageSize = psSel2 ? Number(psSel2.value) || 20 : 20;
          this.state.archives.page = 1;
          const q = new URLSearchParams({
            category: this.state.archives.category || "\uC804\uCCB4",
            tag: this.state.archives.tag || "",
            sort: this.state.archives.sort || "latest",
            pageSize: String(this.state.archives.pageSize || 20),
            page: "1"
          });
          this.navigate(`/archives?${q.toString()}`);
        };
      }
      this.loadArchives().catch((err) => this.handleError(err, "loadArchives"));
    }
    async loadArchives() {
      const { category, tag, page, pageSize, sort } = this.state.archives;
      const list = DOM.$("#archives-list");
      if (!list) return;
      if (!this.supabase) return;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      let countQuery = this.supabase.from(table).select("id", { count: "exact", head: true }).eq("status", "published");
      if (category && category !== "\uC804\uCCB4") {
        countQuery = countQuery.eq("category", category);
      }
      if (tag) {
        countQuery = countQuery.contains("tags", [String(tag).toLowerCase()]);
      }
      const { count } = await countQuery;
      this.state.archives.total = count || 0;
      const selectCols = "id, title, slug, created_at, category, thumbnail_url";
      let dataQuery = this.supabase.from(table).select(selectCols).eq("status", "published");
      if (tag) {
        dataQuery = dataQuery.contains("tags", [String(tag).toLowerCase()]);
      }
      if (sort === "latest") {
        dataQuery = dataQuery.order("created_at", { ascending: false });
      } else if (sort === "oldest") {
        dataQuery = dataQuery.order("created_at", { ascending: true });
      } else if (sort === "title") {
        dataQuery = dataQuery.order("title", { ascending: true });
      } else {
        dataQuery = dataQuery.order("created_at", { ascending: false });
      }
      if (category && category !== "\uC804\uCCB4") {
        dataQuery = dataQuery.eq("category", category);
      }
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      dataQuery = dataQuery.range(from, to);
      const token = Date.now();
      this._reqTokens.archives = token;
      const inflightKey = `archives:${category}:${tag}:${from}-${to}`;
      const { data, error } = await this.withDedupe(inflightKey, () => dataQuery);
      if (error) throw error;
      const catSet = /* @__PURE__ */ new Set(["\uC804\uCCB4"]);
      (data || []).forEach((p) => {
        if (p.category) catSet.add(p.category);
      });
      const catSel = DOM.$("#archives-filter-category");
      if (catSel && catSel.options.length <= 1) {
        catSel.innerHTML = Array.from(catSet).map((c) => `<option value="${this.escapeHTML(c)}">${this.escapeHTML(c)}</option>`).join("");
        catSel.value = category || "\uC804\uCCB4";
      }
      const filtered = data || [];
      if (this._reqTokens.archives !== token) return;
      if (!filtered || filtered.length === 0) {
        list.innerHTML = '<div class="text-gray-500">\uD45C\uC2DC\uD560 \uAC8C\uC2DC\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
      } else {
        const cards = this.renderPostsListHTML(filtered);
        list.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">${cards}</div>`;
      }
      this.renderArchivesPagination();
      try {
        const totalPages = Math.max(1, Math.ceil((this.state.archives.total || 0) / (this.state.archives.pageSize || 20)));
        this.updatePrevNextLinks(totalPages, this.state.archives.page || 1);
        const shouldNoIndex = (this.state.archives.page || 1) > 1 || !!this.state.archives.tag;
        this.updateRobotsMeta(shouldNoIndex ? "noindex,follow" : "index,follow");
      } catch (_) {
      }
      try {
        const fromIdx = (page - 1) * pageSize + 1;
        const toIdx = Math.min(this.state.archives.total, page * pageSize);
        const headerInfo = document.querySelector("#view-archives section .text-xs.text-gray-500");
        if (headerInfo) {
          headerInfo.textContent = `\uCD1D ${this.state.archives.total}\uAC1C \xB7 ${fromIdx}\u2013${toIdx} \uD45C\uC2DC\uC911`;
        }
      } catch (_) {
      }
    }
    renderArchivesPagination() {
      const { page, pageSize, total } = this.state.archives;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const container = DOM.$("#archives-pagination");
      if (!container) return;
      if (totalPages <= 1) {
        container.innerHTML = "";
        return;
      }
      const makeBtn = (p, label = null, active = false) => `<button data-page="${p}" ${active ? 'aria-current="page"' : ""} aria-label="${label ? label : `\uD398\uC774\uC9C0 ${p}`}" class="px-3 py-1 rounded border ${active ? "bg-black text-white" : "hover:bg-black/5"}">${label || p}</button>`;
      const prev = page > 1 ? makeBtn(page - 1, "\uC774\uC804") : '<span class="px-3 py-1 text-gray-400" aria-hidden="true">\uC774\uC804</span>';
      const next = page < totalPages ? makeBtn(page + 1, "\uB2E4\uC74C") : '<span class="px-3 py-1 text-gray-400" aria-hidden="true">\uB2E4\uC74C</span>';
      const windowSize = 5;
      const start = Math.max(1, page - Math.floor(windowSize / 2));
      const end = Math.min(totalPages, start + windowSize - 1);
      const pages = [];
      for (let p = start; p <= end; p++) pages.push(makeBtn(p, null, p === page));
      container.innerHTML = prev + pages.join("") + next;
      container.querySelectorAll("button[data-page]").forEach((btn) => {
        btn.onclick = () => {
          const targetPage = Number(btn.getAttribute("data-page")) || 1;
          this.state.archives.page = targetPage;
          const q = new URLSearchParams({
            category: this.state.archives.category || "\uC804\uCCB4",
            tag: this.state.archives.tag || "",
            sort: this.state.archives.sort || "latest",
            pageSize: String(this.state.archives.pageSize || 20),
            page: String(targetPage)
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
      const targetView = DOM.$("#" + viewId);
      DOM.$$(".app-view").forEach((view) => {
        if (view === targetView) return;
        view.classList.remove("active");
        DOM.hide(view);
      });
      if (targetView) {
        targetView.style.display = "block";
        targetView.classList.add("active");
        DOM.show(targetView);
        if (!this._isPopNavigating) {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        this.focusFirstInView(viewId);
        if (window.LayoutManager && typeof window.LayoutManager.onViewRendered === "function") {
          window.LayoutManager.onViewRendered(targetView);
        }
      }
    }
    /**
     * [Render: Nav]
     * 상단 네비게이션을 렌더링합니다.
     */
    renderNav() {
      const container = DOM.$("#main-nav-container");
      if (!container) return;
      const isLoggedIn = !!this.state.user;
      const existingLinks = container.querySelector("#nav-links");
      if (existingLinks && this._navLogged === isLoggedIn) {
        let currentPath2 = this.normalizePath(window.location.pathname);
        if (currentPath2 === "/archive") currentPath2 = "/archives";
        if (currentPath2 === "/post") currentPath2 = "/archives";
        if (currentPath2 === "/home" || currentPath2 === "/library") currentPath2 = "/";
        existingLinks.querySelectorAll("a[data-route]").forEach((a) => {
          const href = a.getAttribute("href");
          let path = "/";
          try {
            path = this.normalizePath(new URL(href, window.location.origin).pathname);
          } catch (_) {
            path = this.normalizePath(href || "/");
          }
          if (path === "/archive") path = "/archives";
          if (path === "/home" || path === "/library") path = "/";
          const isCurrent = path === currentPath2;
          if (isCurrent) {
            a.setAttribute("aria-current", "page");
          } else {
            a.removeAttribute("aria-current");
          }
        });
        return;
      }
      const writerLink = isLoggedIn ? '<a href="/writer" data-route class="nav-link">\uAE00\uC4F0\uAE30</a>' : "";
      const dashLink = isLoggedIn ? '<a href="/dashboard" data-route class="nav-link">\uB300\uC2DC\uBCF4\uB4DC</a>' : "";
      const authLink = isLoggedIn ? '<a id="logout-btn" href="#" class="nav-link">\uB85C\uADF8\uC544\uC6C3</a>' : '<a id="login-link" href="/login" data-route class="nav-link">\uB85C\uADF8\uC778</a>';
      const linksHtml = [
        '<a href="/archives" data-route class="nav-link">\uC544\uCE74\uC774\uBE0C</a>',
        writerLink,
        dashLink,
        '<a href="/feed.xml" class="nav-link" rel="alternate" type="application/rss+xml">RSS</a>',
        '<a href="/sitemap.xml" class="nav-link">Sitemap</a>',
        authLink
      ].filter(Boolean).join("");
      container.innerHTML = '<nav class="w-full nav-inner" role="navigation" aria-label="\uC8FC\uC694"><a href="/" data-route class="brand font-extrabold text-xl tracking-tight" aria-label="\uD648">InsureLog</a><div id="nav-links" class="header-nav mobile-nav-actions">' + linksHtml + "</div></nav>";
      this._navLogged = isLoggedIn;
      let currentPath = this.normalizePath(window.location.pathname);
      if (currentPath === "/archive") currentPath = "/archives";
      if (currentPath === "/post") currentPath = "/archives";
      if (currentPath === "/home" || currentPath === "/library") currentPath = "/";
      const routeLinks = container.querySelectorAll("#nav-links a[data-route]");
      routeLinks.forEach((a) => {
        const href = a.getAttribute("href") || "/";
        let path = (() => {
          try {
            return this.normalizePath(new URL(href, window.location.origin).pathname);
          } catch (_) {
            return this.normalizePath(href);
          }
        })();
        if (path === "/archive") path = "/archives";
        if (path === "/home" || path === "/library") path = "/";
        const isActive = path === currentPath;
        if (isActive) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      const logoutBtn = DOM.$("#logout-btn");
      if (logoutBtn) {
        logoutBtn.onclick = async (ev) => {
          var _a, _b;
          try {
            (_a = ev == null ? void 0 : ev.preventDefault) == null ? void 0 : _a.call(ev);
          } catch (_) {
          }
          try {
            if (this.authService) {
              await this.authService.signOut();
            } else if ((_b = this.supabase) == null ? void 0 : _b.auth) {
              await this.supabase.auth.signOut();
            }
            UIComponents.showToast("\uB85C\uADF8\uC544\uC6C3\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "info");
            this.navigate("/");
          } catch (_) {
            this.navigate("/");
          }
        };
      }
    }
    /**
     * [Render: Home]
     * 홈(라이브러리) 뷰를 렌더링합니다.
     */
    renderHome(params = new URLSearchParams()) {
      this.switchToView("view-library");
      const container = DOM.$("#view-library");
      if (container) {
        container.innerHTML = '<section><div class="section-header"><h2 class="section-title">\uCD5C\uADFC \uAE00</h2></div><div id="home-posts" class="grid grid-cols-1 gap-2"></div><div id="home-pagination" class="flex justify-center"></div></section>';
        const page = Number(params.get("page") || "1");
        const title = page > 1 ? `\uCD5C\uADFC \uAE00 - \uD398\uC774\uC9C0 ${page} - InsureLog` : "InsureLog - \uCD5C\uADFC \uAE00";
        const desc = page > 1 ? `\uCD5C\uC2E0 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D \xB7 \uD398\uC774\uC9C0 ${page}` : "\uCD5C\uC2E0 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D";
        this.updatePageMeta(title, desc, window.location.href, "/og-image.svg");
        this.updateRobotsMeta(page === 1 ? "index,follow" : "noindex,follow");
        this.loadHomePosts(params).catch((err) => this.handleError(err, "loadHomePosts"));
      }
    }
    /**
     * [Render: Post]
     * 포스트 상세를 렌더링합니다.
     */
    renderPost(slug, containerSelector = "#view-post") {
      if (containerSelector === "#view-post") this.switchToView("view-post");
      const container = DOM.$(containerSelector);
      if (!container) return;
      container.innerHTML = '<article><div class="mb-6"><div class="h-8 w-2/3 bg-gray-200 animate-pulse rounded"></div></div><div class="space-y-3"><div class="h-5 bg-gray-200 animate-pulse rounded"></div><div class="h-5 bg-gray-200 animate-pulse rounded"></div></div></article>';
      this.loadPostDetail(slug, containerSelector).catch((err) => this.handleError(err, "loadPostDetail"));
    }
    // 모달: 포스트 상세
    renderPostModal(slug) {
      const safeSlug = encodeURIComponent(String(slug || "").trim());
      this.navigate(safeSlug ? `/post/${safeSlug}` : "/archives");
    }
    // 모달: 아카이브
    renderArchivesModal() {
      this.navigate("/archives");
    }
    // 모달: 글쓰기/수정
    renderWriterModal(slug) {
      if (!this.checkAuth(true)) return;
      const safeSlug = String(slug || "").trim();
      const path = safeSlug ? `/writer/${encodeURIComponent(safeSlug)}` : "/writer";
      this.navigate(path);
    }
    /**
     * [Render: Writer]
     * 글쓰기/수정 뷰를 렌더링합니다.
     */
    renderWriter(slug, containerSelector = "#view-writer") {
      if (!this.checkAuth(true)) return;
      if (containerSelector === "#view-writer") this.switchToView("view-writer");
      const container = DOM.$(containerSelector);
      if (!container) return;
      const isEdit = !!slug;
      container.innerHTML = `<section class="nav-inner py-10"><div class="flex items-center justify-between"><h1 class="text-2xl font-bold">${isEdit ? "\uAE00 \uC218\uC815" : "\uAE00 \uC791\uC131"}</h1><button type="button" id="btn-open-post-picker" class="btn btn-outline btn-sm">\uAE30\uC874 \uAE00 \uBD88\uB7EC\uC624\uAE30</button></div><form id="writer-form" class="mt-6 space-y-5 editor-shell"><div id="writer-errors" class="sr-only" role="alert" aria-live="assertive"></div><div><label class="block text-sm font-medium">\uC81C\uBAA9</label><input id="post-title" type="text" class="form-input" placeholder="\uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694" required aria-errormessage="writer-errors" aria-invalid="false"></div><div><label class="block text-sm font-medium">\uC694\uC57D</label><textarea id="post-summary" class="form-textarea" placeholder="\uC694\uC57D\uC744 \uC785\uB825\uD558\uC138\uC694"></textarea></div><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="block text-sm font-medium">\uCE74\uD14C\uACE0\uB9AC</label><input id="post-category" type="text" class="form-input" placeholder="\uC608: \uAE30\uC220"></div><div><label class="block text-sm font-medium">\uC0C1\uD0DC</label><select id="post-status" class="form-select"><option value="draft">\uCD08\uC548</option><option value="published">\uBC1C\uD589</option></select></div></div><div><label class="block text-sm font-medium">\uD0DC\uADF8</label><input id="post-tags" type="text" class="form-input" placeholder="\uD0DC\uADF8\uB97C \uC27C\uD45C\uB85C \uAD6C\uBD84\uD574 \uC785\uB825 (\uC608: \uBCF4\uD5D8,\uC790\uB3D9\uCC28,\uAC00\uC774\uB4DC)"></div><div id="tag-suggestions" class="flex flex-wrap gap-2 mt-2" aria-label="\uCD94\uCC9C \uD0DC\uADF8" aria-live="polite"></div><div><label class="block text-sm font-medium">\uC378\uB124\uC77C \uC774\uBBF8\uC9C0</label><input id="post-thumb" type="file" accept="image/*" class="form-input"/></div><div><label class="block text-sm font-medium">\uCF58\uD150\uCE20 (\uBCF5\uC0AC/\uBD99\uC5EC\uB123\uAE30 \uC9C0\uC6D0)</label><div id="editor-toolbar" class="editor-toolbar btn-group mt-2"><button type="button" data-cmd="bold" class="btn btn-outline btn-sm">\uAD75\uAC8C</button><button type="button" data-cmd="italic" class="btn btn-outline btn-sm">\uAE30\uC6B8\uC784</button><button type="button" data-cmd="underline" class="btn btn-outline btn-sm">\uBC11\uC904</button><button type="button" data-cmd="h2" class="btn btn-outline btn-sm">H2</button><button type="button" data-cmd="p" class="btn btn-outline btn-sm">\uBCF8\uBB38</button><button type="button" data-cmd="ul" class="btn btn-outline btn-sm">\uBAA9\uB85D</button><button type="button" data-cmd="ol" class="btn btn-outline btn-sm">\uBC88\uD638\uBAA9\uB85D</button><button type="button" data-cmd="quote" class="btn btn-outline btn-sm">\uC778\uC6A9</button><button type="button" data-cmd="code" class="btn btn-outline btn-sm">\uCF54\uB4DC</button><button type="button" data-cmd="link" class="btn btn-outline btn-sm">\uB9C1\uD06C</button><button type="button" data-cmd="clear" class="btn btn-outline btn-sm">\uC11C\uC2DD\uD574\uC81C</button></div><div id="post-content-editor" contenteditable="true" class="editor-surface prose-custom" placeholder="\uB2E4\uB978 \uAE00\uC744 \uBCF5\uC0AC\uD574 \uBD99\uC5EC\uB123\uC73C\uBA74 \uD615\uC2DD\uC774 \uC720\uC9C0\uB429\uB2C8\uB2E4."></div><p class="text-xs text-gray-500 mt-1">\uBD99\uC5EC\uB123\uAE30 \uC2DC \uAE30\uBCF8 \uC11C\uC2DD(\uAD75\uAC8C, \uC81C\uBAA9, \uBAA9\uB85D \uB4F1)\uC774 \uC720\uC9C0\uB429\uB2C8\uB2E4. \uC800\uC7A5 \uC2DC \uC548\uC804\uD558\uAC8C \uC815\uC81C\uB41C HTML\uB85C \uC800\uC7A5\uD569\uB2C8\uB2E4.</p></div><div class="flex items-center gap-2"><button type="submit" class="btn btn-primary">\uC800\uC7A5</button><a href="/" data-route class="btn btn-secondary">\uCDE8\uC18C</a></div></form></section>`;
      this.updatePageMeta(
        isEdit ? "\uAE00 \uC218\uC815 - InsureLog" : "\uAE00 \uC791\uC131 - InsureLog",
        isEdit ? "\uAE30\uC874 \uAE00\uC744 \uC218\uC815\uD569\uB2C8\uB2E4." : "\uC0C8 \uAE00\uC744 \uC791\uC131\uD569\uB2C8\uB2E4.",
        window.location.href,
        "/og-image.svg"
      );
      this.renderPostPickerUI(containerSelector);
      if (isEdit) {
        this.loadWriterData(slug).catch((err) => this.handleError(err, "loadWriterData"));
      }
      this.loadTagSuggestions().catch((err) => this.handleError(err, "loadTagSuggestions"));
      const form = DOM.$("#writer-form");
      if (form) {
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          await this.submitWriterForm(isEdit ? slug : null, containerSelector);
        }, { once: true });
      }
      this.setupContentEditor(isEdit ? slug : null);
    }
    // 포스트 선택 모달 UI 렌더 및 바인딩 (컨테이너 선택자 인자 지원)
    renderPostPickerUI(containerSelector = "#view-writer") {
      const container = DOM.$(containerSelector) || DOM.$("#writer-modal") || DOM.$("#view-writer");
      if (!container) return;
      if (!DOM.$("#post-picker-modal")) {
        const modal = document.createElement("div");
        modal.id = "post-picker-modal";
        modal.className = "hidden";
        modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content modal-content-lg">
                        <div class="modal-header">
                            <h2 class="modal-title">\uAE30\uC874 \uAE00 \uC120\uD0DD</h2>
                            <button class="modal-close" id="post-picker-close" aria-label="\uB2EB\uAE30">\u2715</button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <input type="text" id="post-picker-query" class="w-full border rounded-lg p-2" placeholder="\uC81C\uBAA9\uC73C\uB85C \uAC80\uC0C9..."/>
                            </div>
                            <div id="post-picker-list" class="space-y-2"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn px-4 py-2 rounded-lg border" id="post-picker-cancel">\uB2EB\uAE30</button>
                        </div>
                    </div>
                </div>`;
        container.appendChild(modal);
      }
      const openBtn = DOM.$("#btn-open-post-picker");
      const closeBtn = DOM.$("#post-picker-close");
      const cancelBtn = DOM.$("#post-picker-cancel");
      const queryInput = DOM.$("#post-picker-query");
      if (openBtn) {
        openBtn.onclick = () => {
          DOM.openModal("post-picker-modal");
          this.loadPostsForPicker("");
        };
      }
      const doClose = () => DOM.closeModal("post-picker-modal");
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
    async loadPostsForPicker(query = "") {
      try {
        if (!this.supabase) return;
        const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
        let rq = this.supabase.from(table).select("id, title, slug, status, created_at").order("created_at", { ascending: false }).limit(50);
        if (query) {
          rq = this.supabase.from(table).select("id, title, slug, status, created_at").ilike("title", `%${query}%`).order("created_at", { ascending: false }).limit(50);
        }
        const { data, error } = await rq;
        if (error) throw error;
        const list = DOM.$("#post-picker-list");
        if (!list) return;
        if (!data || data.length === 0) {
          list.innerHTML = '<div class="text-sm text-gray-600">\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
          return;
        }
        list.innerHTML = data.map((p) => {
          const url = "/writer/" + p.slug;
          const date = this.formatDateKR(p.created_at);
          const statusKor = this.statusToKor(p.status);
          const badge = `<span class="badge">${statusKor}</span>`;
          return `
                    <div class="post-picker-item">
                        <div class="post-picker-main">
                            <a href="${url}" data-route class="post-picker-title">${this.escapeHTML(p.title || "\uC81C\uBAA9 \uC5C6\uC74C")}</a>
                            <div class="post-picker-meta">\uC791\uC131\uC77C ${date} \xB7 \uC0C1\uD0DC ${badge}</div>
                        </div>
                        <div class="post-picker-actions">
                            <a href="${url}" data-route class="btn-xs">\uD3B8\uC9D1</a>
                        </div>
                    </div>`;
        }).join("");
      } catch (e) {
        this.handleError(e, "loadPostsForPicker");
      }
    }
    statusToKor(s) {
      switch (String(s || "").toLowerCase()) {
        case "published":
          return "\uACF5\uAC1C";
        case "private":
          return "\uBE44\uACF5\uAC1C";
        case "draft":
        default:
          return "\uC784\uC2DC";
      }
    }
    /**
     * [Render: Login]
     * 로그인 뷰를 렌더링합니다.
     */
    // [Dead Code Cleanup] 전체 페이지 로그인 뷰는 모달로 대체되어 제거되었습니다.
    /**
     * [Render: Login Modal]
     * 전체 페이지 대신 모달로 매직 링크 로그인 UI를 표시합니다.
     */
    renderLoginModal() {
      const host = document.getElementById("modal-container") || document.body;
      const siteUrl = window.Config && window.Config.SITE_URL || window.location.origin;
      if (!document.getElementById("login-modal")) {
        const modal = document.createElement("div");
        modal.id = "login-modal";
        modal.className = "hidden";
        modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content modal-content-md">
                        <div class="modal-header">
                            <h3 class="modal-title">\uB85C\uADF8\uC778</h3>
                            <button class="modal-close" aria-label="\uB2EB\uAE30">\u2715</button>
                        </div>
                        <div class="modal-body">
                            <form id="magic-form" class="login-form" novalidate>
                                <div id="login-errors" class="sr-only" role="alert" aria-live="assertive"></div>
                                <div class="form-field">
                                  <label class="block text-sm font-medium" for="magic-email">\uC774\uBA54\uC77C \uC8FC\uC18C</label>
                                  <input id="magic-email" type="email" class="form-input w-full" placeholder="you@example.com" required autocomplete="email" inputmode="email" aria-describedby="magic-help login-errors" aria-errormessage="magic-error">
                                </div>
                                <div id="magic-error" class="form-error hidden" role="alert" aria-live="assertive">
                                  <span>\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694.</span>
                                </div>
                                <button id="magic-send" type="submit" class="btn btn-primary w-full">\uB85C\uADF8\uC778 \uB9C1\uD06C \uBCF4\uB0B4\uAE30</button>
                                <p id="magic-help" class="text-xs text-gray-500">\uBA54\uC77C\uC758 \uB9C1\uD06C\uB97C \uB204\uB974\uBA74 \uC790\uB3D9 \uB85C\uADF8\uC778\uB429\uB2C8\uB2E4. 1\uBD84 \uB0B4 \uB3C4\uCC29\uD558\uC9C0 \uC54A\uC73C\uBA74 \uC2A4\uD338\uD568\uB3C4 \uD655\uC778\uD574\uC8FC\uC138\uC694.</p>
                                <div id="magic-success" class="text-sm text-green-700 hidden" role="status" aria-live="polite">\uC774\uBA54\uC77C\uB85C \uB85C\uADF8\uC778 \uB9C1\uD06C\uB97C \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4. \uBA54\uC77C\uD568\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.</div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn px-4 py-2 rounded-lg border cancel-btn">\uB2EB\uAE30</button>
                        </div>
                    </div>
                </div>`;
        host.appendChild(modal);
        this.bindModalCloseHandlers("login-modal", {
          onClose: () => this.navigate("/")
        });
      }
      const magicForm = DOM.$("#magic-form");
      if (magicForm) {
        if (magicForm.dataset.bound === "true") {
          DOM.openModal("login-modal");
          return;
        }
        const emailInput = DOM.$("#magic-email");
        const errorBox = DOM.$("#magic-error");
        const successBox = DOM.$("#magic-success");
        const sendBtn = DOM.$("#magic-send");
        const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
        const showError = (show) => {
          if (!errorBox) return;
          errorBox.classList.toggle("hidden", !show);
          if (emailInput) {
            emailInput.classList.toggle("error", !!show);
            emailInput.setAttribute("aria-invalid", show ? "true" : "false");
          }
          const summary = DOM.$("#login-errors");
          if (summary) summary.textContent = show ? "\uC62C\uBC14\uB978 \uC774\uBA54\uC77C \uD615\uC2DD\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694." : "";
        };
        emailInput == null ? void 0 : emailInput.addEventListener("input", () => showError(false));
        magicForm.addEventListener("submit", async (e) => {
          var _a;
          e.preventDefault();
          const email = String((emailInput == null ? void 0 : emailInput.value) || "").trim();
          if (!isValidEmail(email)) {
            showError(true);
            emailInput == null ? void 0 : emailInput.focus();
            return;
          }
          if (!this.authService && !((_a = this.supabase) == null ? void 0 : _a.auth)) return UIComponents.showToast("\uC778\uC99D \uBAA8\uB4C8\uC744 \uCD08\uAE30\uD654\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.", "error");
          try {
            sendBtn == null ? void 0 : sendBtn.setAttribute("disabled", "true");
            if (sendBtn) {
              sendBtn.textContent = "\uBCF4\uB0B4\uB294 \uC911\u2026";
              sendBtn.setAttribute("aria-busy", "true");
            }
            if (this.authService) {
              await this.authService.signInWithOtp(email, siteUrl);
            } else {
              const { error } = await this.supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: true, emailRedirectTo: siteUrl }
              });
              if (error) throw error;
            }
            UIComponents.showToast("\uB85C\uADF8\uC778 \uB9C1\uD06C\uB97C \uC774\uBA54\uC77C\uB85C \uBCF4\uB0C8\uC2B5\uB2C8\uB2E4.", "success");
            if (successBox) successBox.classList.remove("hidden");
          } catch (err) {
            try {
              this._logAuthEvent("login_magic_failed", { email });
            } catch (_) {
            }
            UIComponents.showToast("\uBA54\uC77C \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.", "error");
            const summary = DOM.$("#login-errors");
            if (summary) summary.textContent = "\uBA54\uC77C \uBC1C\uC1A1\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.";
          } finally {
            setTimeout(() => {
              sendBtn == null ? void 0 : sendBtn.removeAttribute("disabled");
              if (sendBtn) {
                sendBtn.textContent = "\uB85C\uADF8\uC778 \uB9C1\uD06C \uBCF4\uB0B4\uAE30";
                sendBtn.removeAttribute("aria-busy");
              }
            }, 1200);
          }
        });
        magicForm.dataset.bound = "true";
      }
      DOM.openModal("login-modal");
    }
    /**
     * [Render: 404]
     * 404 뷰를 렌더링합니다.
     */
    render404() {
      this.switchToView("view-library");
      const container = DOM.$("#view-library");
      if (container) {
        container.innerHTML = '<section class="max-w-md mx-auto py-20 px-6 text-center"><h1 class="text-2xl font-extrabold">\uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4</h1><p class="text-sm text-gray-600 mt-2">\uC694\uCCAD\uD558\uC2E0 \uD398\uC774\uC9C0\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p><div class="mt-6"><a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">\uD648\uC73C\uB85C</a></div></section>';
        this.updatePageMeta("\uD398\uC774\uC9C0\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4 - InsureLog", "\uC694\uCCAD\uD55C \uD398\uC774\uC9C0\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", window.location.href, "/og-image.svg");
      }
    }
    /**
     * [Error Handling]
     * 에러를 처리하고 사용자에게 알립니다.
     */
    handleError(error, context = "") {
      var _a, _b, _c;
      console.error("Error in " + context + ":", error);
      let message = "\uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.";
      if ((_a = error.message) == null ? void 0 : _a.includes("fetch")) {
        message = "\uB124\uD2B8\uC6CC\uD06C \uC5F0\uACB0\uC744 \uD655\uC778\uD574\uC8FC\uC138\uC694.";
      } else if ((_b = error.message) == null ? void 0 : _b.includes("auth")) {
        message = "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.";
      } else if ((_c = error.message) == null ? void 0 : _c.includes("permission")) {
        message = "\uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.";
      }
      UIComponents.showToast(message, "error");
    }
    // 인증 실패/이벤트 로깅 (베이직)
    async _logAuthEvent(type, payload = {}) {
      try {
        if (this.authService) {
          await this.authService.logAuthEvent(type, payload);
          return;
        }
        const safe = {
          type,
          email_hint: (payload.email || "").replace(/(^.).+(@.+$)/, "$1***$2"),
          provider: payload.provider || null,
          user_agent: navigator && navigator.userAgent || null,
          at: (/* @__PURE__ */ new Date()).toISOString(),
          success: false
        };
        if (this.supabase) {
          await this.supabase.from("auth_events").insert(safe);
        }
      } catch (_) {
      }
    }
    /**
     * [Utility Methods]
     */
    // 로딩 상태 관리
    setLoading(isLoading, container = "#app-container") {
      const resolved = DOM.$(container) ? container : DOM.$("#modal-container") ? "#modal-container" : "#app-container";
      if (isLoading) {
        DOM.showLoading(resolved);
      } else {
        DOM.hideLoading(resolved);
      }
    }
    // 사용자 권한 확인
    checkAuth(redirectToLogin = true) {
      if (!this.state.user) {
        if (redirectToLogin) {
          UIComponents.showToast("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.", "warning");
          this.navigate("/login");
        }
        return false;
      }
      return true;
    }
    // 페이지 메타데이터 업데이트
    updatePageMeta(title, description, url, image = null) {
      document.title = title;
      const descMeta = DOM.$('meta[name="description"]');
      if (descMeta) descMeta.content = description || "";
      const finalUrl = url || window.location.href;
      let finalImage = image || "/og-image.svg";
      try {
        finalImage = new URL(finalImage, window.location.origin).href;
      } catch (e) {
      }
      const canonical = DOM.$('link[rel="canonical"]');
      if (canonical) canonical.href = finalUrl;
      const ogTitle = DOM.$('meta[property="og:title"]');
      const ogDesc = DOM.$('meta[property="og:description"]');
      const ogUrl = DOM.$('meta[property="og:url"]');
      const ogImage = DOM.$('meta[property="og:image"]');
      if (ogTitle) ogTitle.content = title;
      if (ogDesc) ogDesc.content = description || "";
      if (ogUrl) ogUrl.content = finalUrl;
      if (ogImage) ogImage.content = finalImage;
      const twitterTitle = DOM.$('meta[name="twitter:title"]');
      const twitterDesc = DOM.$('meta[name="twitter:description"]');
      const twitterImage = DOM.$('meta[name="twitter:image"]');
      const twitterCard = DOM.$('meta[name="twitter:card"]');
      if (twitterTitle) twitterTitle.content = title;
      if (twitterDesc) twitterDesc.content = description || "";
      if (twitterImage) twitterImage.content = finalImage;
      if (twitterCard) twitterCard.content = "summary_large_image";
    }
    async loadWriterData(slug) {
      var _a, _b;
      if (!this.supabase) return;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      let { data: post, error } = await this.supabase.from(table).select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      if (!post) {
        const byId = await this.supabase.from(table).select("*").eq("id", slug).maybeSingle();
        if (byId.error) throw byId.error;
        post = byId.data || null;
      }
      if (!post) return;
      DOM.$("#post-title").value = post.title || "";
      DOM.$("#post-summary").value = post.summary || "";
      DOM.$("#post-category").value = post.category || "";
      DOM.$("#post-status").value = post.status || "draft";
      const editor = DOM.$("#post-content-editor");
      if (editor) {
        const html = this.renderContentHTML((_b = (_a = post.refined_content) != null ? _a : post.content) != null ? _b : "");
        editor.innerHTML = html;
        const tags = Array.isArray(post.tags) && post.tags.length ? post.tags : this.extractTagsFromHTML(post.refined_content);
        const tagInput = DOM.$("#post-tags");
        if (tagInput && tags.length) tagInput.value = tags.join(",");
      }
    }
    async loadTagSuggestions() {
      try {
        const box = DOM.$("#tag-suggestions");
        if (!box) return;
        box.innerHTML = '<span class="text-xs text-gray-500">\uD0DC\uADF8 \uBD88\uB7EC\uC624\uB294 \uC911...</span>';
        const resp = await fetch("/api/tags");
        if (!resp.ok) throw new Error("\uD0DC\uADF8 \uBAA9\uB85D \uC694\uCCAD \uC2E4\uD328");
        const json = await resp.json();
        const tags = Array.isArray(json.tags) ? json.tags.slice(0, 20) : [];
        if (!tags.length) {
          box.innerHTML = '<span class="text-xs text-gray-500">\uCD94\uCC9C \uD0DC\uADF8\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.</span>';
          return;
        }
        const makeChip = (name, count) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "px-2 py-1 text-xs rounded-full border border-gray-300 hover:border-black hover:bg-gray-50";
          btn.textContent = `${name}`;
          btn.setAttribute("aria-label", `${name} \uD0DC\uADF8 \uCD94\uAC00 (\uBE48\uB3C4 ${count})`);
          btn.addEventListener("click", () => {
            try {
              const input = DOM.$("#post-tags");
              const cur = (input.value || "").split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.toLowerCase());
              const tag = String(name || "").toLowerCase();
              if (!cur.includes(tag)) cur.push(tag);
              input.value = cur.join(", ");
              input.dispatchEvent(new Event("input"));
            } catch (_) {
            }
          });
          return btn;
        };
        box.innerHTML = "";
        tags.forEach((t) => {
          box.appendChild(makeChip(t.name, t.count));
        });
      } catch (e) {
        const box = DOM.$("#tag-suggestions");
        if (box) box.innerHTML = '<span class="text-xs text-gray-500">\uD0DC\uADF8\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</span>';
      }
    }
    async submitWriterForm(editSlug = null, containerSelector = "#view-writer") {
      var _a, _b, _c;
      const effectiveContainer = DOM.$(containerSelector) ? containerSelector : DOM.$("#modal-container") ? "#modal-container" : "#view-writer";
      try {
        if (!this.supabase) throw new Error("Supabase\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4");
        const form = DOM.$("#writer-form");
        const submitBtn = form == null ? void 0 : form.querySelector('button[type="submit"]');
        const errBox = DOM.$("#writer-errors");
        const titleInput = DOM.$("#post-title");
        const titleRaw = ((_a = titleInput == null ? void 0 : titleInput.value) == null ? void 0 : _a.trim()) || "";
        const errors = [];
        if (!titleRaw) errors.push("\uC81C\uBAA9\uC744 \uC785\uB825\uD558\uC138\uC694.");
        else if (titleRaw.length < 2) errors.push("\uC81C\uBAA9\uC740 \uCD5C\uC18C 2\uC790 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
        if (errors.length) {
          if (errBox) {
            errBox.textContent = errors.join(" ");
            errBox.classList.remove("sr-only");
          }
          if (titleInput) {
            titleInput.setAttribute("aria-invalid", "true");
            titleInput.setAttribute("aria-errormessage", "writer-errors");
            titleInput.focus();
          }
          return;
        } else {
          if (errBox) {
            errBox.textContent = "";
            errBox.classList.add("sr-only");
          }
          if (titleInput) titleInput.setAttribute("aria-invalid", "false");
        }
        if (form) form.setAttribute("aria-busy", "true");
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("aria-disabled", "true");
          submitBtn.dataset._origText = submitBtn.textContent || "";
          submitBtn.textContent = "\uC800\uC7A5 \uC911\u2026";
        }
        this.setLoading(true, effectiveContainer);
        await ScriptLoader.loadUtilities();
        const title = titleRaw;
        const summary = DOM.$("#post-summary").value.trim();
        const category = DOM.$("#post-category").value.trim();
        const status = DOM.$("#post-status").value;
        const fileInput = DOM.$("#post-thumb");
        let tagsArr = [];
        const tagInputForSave = DOM.$("#post-tags");
        const tagsStrForSave = ((tagInputForSave == null ? void 0 : tagInputForSave.value) || "").trim();
        if (tagsStrForSave) {
          tagsArr = tagsStrForSave.split(",").map((t) => t.trim()).filter(Boolean).map((t) => t.toLowerCase());
        }
        const editor = DOM.$("#post-content-editor");
        let refined_content = "";
        if (editor) {
          const rawHTML = editor.innerHTML || "";
          refined_content = window.DOMPurify ? window.DOMPurify.sanitize(rawHTML) : rawHTML;
          refined_content = refined_content.replace(/<h1([^>]*)>/gi, "<h2$1>").replace(/<\/h1>/gi, "</h2>");
          refined_content = this.ensureImageAltAttributes(refined_content, title);
          const summaryEl = DOM.$("#post-summary");
          if (summaryEl && !summaryEl.value.trim()) {
            const text = editor.innerText || "";
            summaryEl.value = text.replace(/\s+/g, " ").trim().slice(0, 160);
          }
        } else {
          const contentRaw = ((_b = DOM.$("#post-content")) == null ? void 0 : _b.value) || "";
          try {
            const obj = JSON.parse(contentRaw);
            refined_content = JSON.stringify(obj);
          } catch (e) {
            refined_content = contentRaw;
          }
        }
        let slug = editSlug || this.slugify(title);
        slug = await this.ensureUniqueSlug(slug, editSlug);
        let thumbnail_url = null;
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const path = `thumbnails/${slug}.webp`;
          thumbnail_url = await this.uploadImageToBucket(file, path);
        }
        const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
        const now = (/* @__PURE__ */ new Date()).toISOString();
        const base = {
          title,
          summary,
          category,
          status,
          refined_content,
          slug,
          updated_at: now,
          author_id: ((_c = this.state.user) == null ? void 0 : _c.id) || null,
          tags: tagsArr
        };
        if (thumbnail_url) base.thumbnail_url = thumbnail_url;
        let res;
        if (editSlug) {
          res = await this.supabase.from(table).update(base).eq("slug", editSlug).select("id").maybeSingle();
        } else {
          base.created_at = now;
          base.view_count = 0;
          res = await this.supabase.from(table).insert(base).select("id").maybeSingle();
        }
        if (res.error) throw res.error;
        UIComponents.showToast("\uAE00\uC774 \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
        if (status === "published") {
          this.navigate("/post/" + encodeURIComponent(slug));
        } else {
          this.navigate("/");
        }
      } catch (e) {
        const errBox = DOM.$("#writer-errors");
        if (errBox) {
          errBox.textContent = `\uC800\uC7A5 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4: ${e.message || e}`;
          errBox.classList.remove("sr-only");
        }
        this.handleError(e, "submitWriterForm");
      } finally {
        const form = DOM.$("#writer-form");
        const submitBtn = form == null ? void 0 : form.querySelector('button[type="submit"]');
        if (form) form.setAttribute("aria-busy", "false");
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-disabled");
          if (submitBtn.dataset._origText) submitBtn.textContent = submitBtn.dataset._origText;
        }
        this.setLoading(false, "#view-writer");
      }
    }
    slugify(str) {
      const base = String(str || "").toLowerCase().trim();
      let s = base.normalize("NFKD").replace(/\s+/g, "-").replace(/[^\p{L}\p{N}\-]+/gu, "").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
      if (!s) {
        const ts = Date.now().toString(36);
        s = "post-" + ts;
      }
      return s;
    }
    async ensureUniqueSlug(slug, originalSlug = null) {
      if (!this.supabase) return slug;
      if (originalSlug && slug === originalSlug) return slug;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      const { data, error } = await this.supabase.from(table).select("slug").eq("slug", slug).limit(1);
      if (error) return slug;
      if (!data || data.length === 0) return slug;
      const suffix = Math.random().toString(36).slice(2, 6);
      return `${slug}-${suffix}`;
    }
    /**
     * [Detail] 포스트 상세 로드 및 렌더링
     */
    async loadPostDetail(slug, targetSelector = "#view-post") {
      const container = DOM.$(targetSelector);
      await this.ensureSupabaseReady(1200);
      if (!this.supabase) {
        container.innerHTML = '<div class="max-w-3xl mx-auto py-10 px-6 text-gray-600">\uB370\uC774\uD130 \uC18C\uC2A4\uAC00 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</div>';
        return;
      }
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      let { data: post, error } = await this.supabase.from(table).select("*").eq("slug", slug).eq("status", "published").maybeSingle();
      if (error) throw error;
      if (!post) {
        try {
          const variants = [];
          const raw = String(slug || "");
          variants.push(raw);
          variants.push(raw.toLowerCase());
          variants.push(raw.replace(/_/g, "-"));
          variants.push(this.slugify(raw));
          const uniq = Array.from(new Set(variants.filter((v) => v && typeof v === "string")));
          if (uniq.length) {
            const { data: altList, error: altErr } = await this.supabase.from(table).select("*").in("slug", uniq).eq("status", "published").limit(1);
            if (altErr) {
            }
            post = altList && altList[0] || null;
          }
        } catch (_) {
        }
      }
      if (!post) {
        container.innerHTML = '<section class="max-w-md mx-auto py-20 px-6 text-center"><h1 class="text-2xl font-extrabold">\uAE00\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4</h1><p class="text-sm text-gray-600 mt-2">\uC694\uCCAD\uD558\uC2E0 \uAE00\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.</p><div class="mt-6"><a href="/" data-route class="px-4 py-2 rounded-full bg-black text-white">\uD648\uC73C\uB85C</a></div></section>';
        return;
      }
      try {
        await this.supabase.from(table).update({ view_count: (post.view_count || 0) + 1 }).eq("id", post.id);
      } catch (e) {
        console.warn("view_count update \uC2E4\uD328:", e);
      }
      const title = this.escapeHTML(post.title || "\uC81C\uBAA9 \uC5C6\uC74C");
      const date = this.formatDate(post.created_at);
      const category = post.category ? `<span class="text-xs px-2 py-1 rounded-full bg-black/5">${this.escapeHTML(post.category)}</span>` : "";
      const tags = Array.isArray(post.tags) && post.tags.length ? post.tags : this.extractTagsFromHTML(post.refined_content);
      const tagsHtml = tags && tags.length ? `<div class="mt-2 flex flex-wrap gap-2">${tags.map((t) => `<span class="text-xs px-2 py-1 rounded-full bg-blue-50 border border-blue-200">${this.escapeHTML(t)}</span>`).join("")}</div>` : "";
      await ScriptLoader.loadUtilities();
      const contentHTML = this.renderContentHTML(post.refined_content);
      const editBtn = this.state.user ? `<a href="/writer/${encodeURIComponent(post.slug)}" data-route class="px-3 py-1 rounded-full border">\uC218\uC815</a>` : "";
      container.innerHTML = `<article class="post-detail py-10"><div class="post-detail-inner"><h1 class="post-title text-3xl font-extrabold tracking-tight">${title}</h1><div class="post-meta flex items-center"><span class="post-date">${date}</span>${category ? category.replace("<span", '<span class="post-category"') : ""}</div>${tagsHtml ? tagsHtml.replace("<div", '<div class="post-tags"') : ""}<div class="blog-post-content prose-custom">${contentHTML}</div></div><div class="post-detail-inner"><div class="mt-8 flex items-center gap-3"><button id="btn-like" class="px-3 py-1 rounded-full border">\uC88B\uC544\uC694 <span id="like-count"></span></button><button id="btn-share" class="px-3 py-1 rounded-full border">\uACF5\uC720</button><button id="btn-copy" class="px-3 py-1 rounded-full border">\uB9C1\uD06C\uBCF5\uC0AC</button>${editBtn}</div><div id="related-posts" class="mt-12"></div><div id="popular-posts" class="mt-12"></div></div></article>`;
      const shareImage = post.thumbnail_url ? this.getTransformedPublicUrl(post.thumbnail_url, { width: 1200, height: 630, resize: "cover", quality: 85, format: "webp" }) : "/og-image.svg";
      this.updatePageMeta(post.title, post.summary || "", window.location.href, shareImage);
      try {
        const likeKey = "likes:" + (post.slug || post.id);
        const countEl = DOM.$("#like-count");
        const btnLike = DOM.$("#btn-like");
        const btnShare = DOM.$("#btn-share");
        const btnCopy = DOM.$("#btn-copy");
        let likeCount = Number(localStorage.getItem(likeKey) || "0");
        if (countEl) countEl.textContent = String(likeCount);
        if (btnLike) btnLike.addEventListener("click", () => {
          likeCount += 1;
          localStorage.setItem(likeKey, String(likeCount));
          if (countEl) countEl.textContent = String(likeCount);
        });
        if (btnShare) btnShare.addEventListener("click", async () => {
          try {
            if (navigator.share) {
              await navigator.share({ title: post.title, text: post.summary || "", url: window.location.href });
            } else {
              await navigator.clipboard.writeText(window.location.href);
              UIComponents.showToast("\uB9C1\uD06C\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
            }
          } catch (e) {
          }
        });
        if (btnCopy) btnCopy.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(window.location.href);
            UIComponents.showToast("\uB9C1\uD06C\uAC00 \uBCF5\uC0AC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.", "success");
          } catch (e) {
          }
        });
      } catch (e) {
      }
      this.loadRelatedPosts(post).catch((err) => this.handleError(err, "loadRelatedPosts"));
      this.loadPopularPosts(post.id).catch((err) => this.handleError(err, "loadPopularPosts"));
    }
    renderContentHTML(refined) {
      if (!refined) return '<p class="text-gray-600">\uCF58\uD150\uCE20\uAC00 \uC544\uC9C1 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.</p>';
      try {
        const obj = typeof refined === "string" ? JSON.parse(refined) : refined;
        if (obj && Array.isArray(obj.blocks)) {
          this._contentFirstImageEagerDone = false;
          const html = obj.blocks.map((b) => this.renderEditorBlock(b)).join("");
          return this.dedupeConsecutiveImages(html);
        }
        if (obj && obj.ops && Array.isArray(obj.ops)) {
          const html = obj.ops.map((op) => {
            const insert = typeof op.insert === "string" ? this.escapeHTML(op.insert) : "";
            const attrs = op.attributes || {};
            let s = insert;
            if (attrs.bold) s = `<strong>${s}</strong>`;
            if (attrs.italic) s = `<em>${s}</em>`;
            if (attrs.underline) s = `<u>${s}</u>`;
            return s;
          }).join("");
          const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
          const transformed = this.transformPlainImagesToOptimized(safe);
          const ensuredAlt = this.ensureImageAltAttributes(transformed, "");
          return this.dedupeConsecutiveImages(ensuredAlt);
        }
      } catch (e) {
      }
      const isString = typeof refined === "string";
      const hasMarkdown = isString && (/!\[[^\]]*\]\([^)]+\)/.test(refined) || // 이미지
      /\[[^\]]+\]\([^)]+\)/.test(refined) || // 링크
      /(^|\n)\s{0,3}#{1,6}\s/.test(refined) || // 헤딩
      /(^|\n)\s{0,3}[-*]\s+/.test(refined) || // 불릿 리스트
      /(^|\n)\s{0,3}\d+\.\s+/.test(refined));
      if (hasMarkdown && window.marked) {
        const dirty = isString ? refined : String(refined);
        const pre = this.preprocessPlainTextToMarkdown(dirty);
        const html = window.marked.parse(pre);
        const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        const transformed = this.transformPlainImagesToOptimized(safe);
        const ensuredAlt = this.ensureImageAltAttributes(transformed, "");
        return this.dedupeConsecutiveImages(ensuredAlt);
      }
      if (isString && /<\w+[^>]*>/i.test(refined)) {
        const html = refined;
        const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        const transformed = this.transformPlainImagesToOptimized(safe);
        const ensuredAlt = this.ensureImageAltAttributes(transformed, "");
        return this.dedupeConsecutiveImages(ensuredAlt);
      }
      if (window.marked) {
        const dirty = isString ? refined : String(refined);
        const pre = this.preprocessPlainTextToMarkdown(dirty);
        const html = window.marked.parse(pre);
        const safe = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
        const transformed = this.transformPlainImagesToOptimized(safe);
        const ensuredAlt = this.ensureImageAltAttributes(transformed, "");
        return this.dedupeConsecutiveImages(ensuredAlt);
      }
      return `<pre>${this.escapeHTML(typeof refined === "string" ? refined : JSON.stringify(refined))}</pre>`;
    }
    renderEditorBlock(b) {
      var _a;
      const type = b.type;
      const data = b.data || {};
      switch (type) {
        case "paragraph":
          return `<p>${this.escapeHTML(data.text || "")}</p>`;
        case "header":
          return `<h${data.level || 2}>${this.escapeHTML(data.text || "")}</h${data.level || 2}>`;
        case "list":
          const items = (data.items || []).map((it) => `<li>${this.escapeHTML(it)}</li>`).join("");
          return data.style === "ordered" ? `<ol>${items}</ol>` : `<ul>${items}</ul>`;
        case "quote":
          return `<blockquote>${this.escapeHTML(data.text || "")}</blockquote>`;
        case "image":
          if ((_a = data.file) == null ? void 0 : _a.url) {
            const baseAlt = this.escapeHTML(data.caption || "");
            const conn = navigator && navigator.connection ? navigator.connection : {};
            const saveData = !!conn.saveData;
            const et = conn.effectiveType || "";
            const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
            const w = isSlow ? [360, 600] : [480, 768, 1200];
            const mainW = isSlow ? 900 : 1200;
            const mainQ = isSlow ? 75 : 85;
            const setQ = isSlow ? 60 : 80;
            const sizes = isSlow ? "(max-width: 600px) 100vw, 600px" : "(max-width: 768px) 100vw, 768px";
            const src = this.getOptimizedPublicUrl(data.file.url, { width: mainW, quality: mainQ, format: "webp" });
            const srcset = w.map((x) => `${this.getOptimizedPublicUrl(data.file.url, { width: x, quality: setQ, format: "webp" })} ${x}w`).join(", ");
            const sizeAttrs = data.width && data.height ? ` width="${data.width}" height="${data.height}"` : "";
            const arClass = !data.width || !data.height ? ' class="aspect-16-9"' : "";
            const eager = !this._contentFirstImageEagerDone;
            if (eager) {
              this._contentFirstImageEagerDone = true;
              try {
                const existed = document.querySelector(`link[rel="preload"][as="image"][href="${src}"]`);
                if (!existed) {
                  const l = document.createElement("link");
                  l.rel = "preload";
                  l.as = "image";
                  l.href = src;
                  if (srcset) l.setAttribute("imagesrcset", srcset);
                  l.setAttribute("imagesizes", sizes);
                  l.crossOrigin = "anonymous";
                  document.head.appendChild(l);
                }
                try {
                  const origin = new URL(src, window.location.origin).origin;
                  const existedPre = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
                  if (!existedPre) {
                    const p = document.createElement("link");
                    p.rel = "preconnect";
                    p.href = origin;
                    p.crossOrigin = "anonymous";
                    document.head.appendChild(p);
                  }
                } catch (e) {
                }
              } catch (_) {
              }
            }
            const loadingAttr = eager ? "" : ' loading="lazy"';
            const fetchPriorityAttr = eager ? ' fetchpriority="high"' : ' fetchpriority="low"';
            return `<figure><img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${baseAlt}"${loadingAttr}${fetchPriorityAttr} decoding="async"${sizeAttrs}${arClass}/><figcaption>${baseAlt}</figcaption></figure>`;
          }
          return "";
        case "code":
          return `<pre><code>${this.escapeHTML(data.code || "")}</code></pre>`;
        default:
          return "";
      }
    }
    // 에디터 초기화: 툴바/서식 및 이미지 드롭/붙여넣기 처리
    setupContentEditor(currentSlug = null) {
      const editor = DOM.$("#post-content-editor");
      const toolbar = DOM.$("#editor-toolbar");
      if (!editor) return;
      editor.setAttribute("role", "textbox");
      editor.setAttribute("aria-label", "\uCF58\uD150\uCE20 \uD3B8\uC9D1\uAE30");
      this._lastSelectionRange = null;
      editor.addEventListener("focus", () => document.execCommand("defaultParagraphSeparator", false, "p"));
      const updateToolbarState = () => {
        if (!toolbar) return;
        const setActive = (cmd, active) => {
          const btn = toolbar.querySelector(`button[data-cmd="${cmd}"]`);
          if (btn) btn.classList.toggle("bg-black text-white", !!active);
        };
        try {
          setActive("bold", document.queryCommandState("bold"));
          setActive("italic", document.queryCommandState("italic"));
          setActive("underline", document.queryCommandState("underline"));
          const block = document.queryCommandValue("formatBlock");
          setActive("h1", /H1/i.test(block));
          setActive("h2", /H2/i.test(block));
          setActive("p", /P/i.test(block));
        } catch (e) {
        }
      };
      document.addEventListener("selectionchange", () => {
        if (document.activeElement === editor) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) {
            this._lastSelectionRange = sel.getRangeAt(0);
          }
          updateToolbarState();
        }
      });
      if (toolbar) {
        const cancelIfCmd = (e) => {
          const target = e.target.closest("[data-cmd]");
          if (!target) return;
          e.preventDefault();
        };
        toolbar.addEventListener("pointerdown", cancelIfCmd, { passive: false });
        toolbar.addEventListener("mousedown", cancelIfCmd, { passive: false });
        toolbar.addEventListener("touchstart", cancelIfCmd, { passive: false });
        toolbar.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-cmd]");
          if (!btn) return;
          const cmd = btn.getAttribute("data-cmd");
          editor.focus();
          const sel = window.getSelection();
          if (sel && this._lastSelectionRange) {
            try {
              sel.removeAllRanges();
              sel.addRange(this._lastSelectionRange);
            } catch (e2) {
            }
          }
          this.execEditorCommand(cmd);
          updateToolbarState();
        });
      }
      editor.addEventListener("keydown", (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (isCtrl) {
          if (e.key.toLowerCase() === "b") {
            e.preventDefault();
            this.execEditorCommand("bold");
            updateToolbarState();
          }
          if (e.key.toLowerCase() === "i") {
            e.preventDefault();
            this.execEditorCommand("italic");
            updateToolbarState();
          }
          if (e.key.toLowerCase() === "u") {
            e.preventDefault();
            this.execEditorCommand("underline");
            updateToolbarState();
          }
          if (e.shiftKey && e.key === "1") {
            e.preventDefault();
            this.execEditorCommand("h2");
            updateToolbarState();
          }
          if (e.shiftKey && e.key === "2") {
            e.preventDefault();
            this.execEditorCommand("h2");
            updateToolbarState();
          }
        }
      });
      editor.addEventListener("dragover", (e) => {
        e.preventDefault();
      });
      editor.addEventListener("drop", async (e) => {
        var _a;
        e.preventDefault();
        const files = (_a = e.dataTransfer) == null ? void 0 : _a.files;
        if (files && files.length) {
          await this.handleEditorFiles(files, currentSlug);
        }
      });
      editor.addEventListener("paste", async (e) => {
        var _a;
        const items = ((_a = e.clipboardData) == null ? void 0 : _a.items) || [];
        const files = [];
        for (const it of items) {
          if (it.kind === "file") {
            const f = it.getAsFile();
            if (f && f.type.startsWith("image/")) files.push(f);
          }
        }
        if (files.length) {
          e.preventDefault();
          await this.handleEditorFiles(files, currentSlug);
        } else {
          setTimeout(() => {
            this.linkifyElementContent(editor);
          }, 0);
        }
      });
      editor.addEventListener("click", (e) => {
        const cap = e.target.closest("figcaption");
        if (cap) {
          cap.setAttribute("contenteditable", "true");
          cap.focus();
        }
      });
      editor.addEventListener("input", (e) => {
        const cap = e.target.closest("figcaption");
        if (cap) {
          const fig = cap.closest("figure");
          const img = fig ? fig.querySelector("img") : null;
          if (img) {
            const text = cap.textContent.trim();
            img.setAttribute("alt", text || img.getAttribute("alt") || "");
          }
        }
        clearTimeout(this._linkifyTimer);
        this._linkifyTimer = setTimeout(() => {
          this.linkifyElementContent(editor);
        }, 200);
      });
      editor.addEventListener("blur", (e) => {
        if (e.target && e.target.matches("figcaption")) e.target.removeAttribute("contenteditable");
      }, true);
    }
    execEditorCommand(cmd) {
      switch (cmd) {
        case "bold":
          document.execCommand("bold");
          break;
        case "italic":
          document.execCommand("italic");
          break;
        case "underline":
          document.execCommand("underline");
          break;
        // H1 금지: 내부 콘텐츠에서는 H1을 생성하지 않습니다. 필요 시 H2로 대체.
        case "h1":
          document.execCommand("formatBlock", false, "h2");
          break;
        case "h2":
          document.execCommand("formatBlock", false, "h2");
          break;
        case "p":
          document.execCommand("formatBlock", false, "p");
          break;
        case "ul":
          document.execCommand("insertUnorderedList");
          break;
        case "ol":
          document.execCommand("insertOrderedList");
          break;
        case "quote":
          document.execCommand("formatBlock", false, "blockquote");
          break;
        case "code":
          this.insertHTMLAtCursor("<pre><code></code></pre>");
          break;
        case "link": {
          const url = prompt("\uB9C1\uD06C URL\uC744 \uC785\uB825\uD558\uC138\uC694");
          if (url) document.execCommand("createLink", false, url);
          break;
        }
        case "clear":
          document.execCommand("removeFormat");
          break;
        default:
          break;
      }
    }
    insertHTMLAtCursor(html) {
      document.execCommand("insertHTML", false, html);
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
        while (node = walker.nextNode()) {
          const parent = node.parentElement;
          if (!parent) continue;
          if (parent.closest("a")) continue;
          const text = node.nodeValue || "";
          if (/(https?:\/\/|www\.)/.test(text)) targets.push(node);
        }
        targets.forEach((n) => {
          const text = n.nodeValue || "";
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
              const href = m.startsWith("www.") ? "https://" + m : m;
              const a = document.createElement("a");
              a.href = href;
              a.textContent = m;
              a.rel = "noopener noreferrer";
              a.target = "_blank";
              frag.appendChild(a);
            }
          }
          n.parentNode.replaceChild(frag, n);
        });
      } catch (err) {
        console.warn("linkifyElementContent error", err);
      }
    }
    async handleEditorFiles(files, currentSlug) {
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files.item ? files.item(i) : files[i];
          if (!file || !file.type.startsWith("image/")) continue;
          const name = `img_${Date.now()}_${i}.webp`;
          const path = `content-images/${name}`;
          const { savedPath, width, height } = await this.uploadImageToBucket(file, path);
          const conn = navigator && navigator.connection ? navigator.connection : {};
          const saveData = !!conn.saveData;
          const et = conn.effectiveType || "";
          const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
          const mainW = isSlow ? 900 : 1200;
          const mainQ = isSlow ? 75 : 85;
          const setQ = isSlow ? 60 : 80;
          const url = this.getTransformedPublicUrl(savedPath, { width: mainW, quality: mainQ, format: "webp" });
          const alt = this.deriveAltFromFileName(file.name || name);
          const widths = isSlow ? [360, 600] : [480, 768, 1200];
          const srcset = widths.map((x) => `${this.getTransformedPublicUrl(savedPath, { width: x, quality: setQ, format: "webp" })} ${x}w`).join(", ");
          const sizes = isSlow ? "(max-width: 600px) 100vw, 600px" : "(max-width: 768px) 100vw, 768px";
          const sizeAttrs = width && height ? ` width="${width}" height="${height}"` : "";
          this.insertHTMLAtCursor(`<figure><img src="${url}" srcset="${srcset}" sizes="${sizes}" alt="${this.escapeHTML(alt)}" loading="lazy" decoding="async"${sizeAttrs}/><figcaption>${this.escapeHTML(alt)}</figcaption></figure>`);
        }
      } catch (e) {
        this.handleError(e, "handleEditorFiles");
      }
    }
    extractTagsFromHTML(refined) {
      try {
        const html = typeof refined === "string" ? refined : String(refined || "");
        const div = document.createElement("div");
        div.innerHTML = html;
        const tagEl = div.querySelector("[data-tags]");
        const val = (tagEl == null ? void 0 : tagEl.getAttribute("data-tags")) || "";
        return val.split(",").map((t) => t.trim()).filter(Boolean);
      } catch (e) {
        return [];
      }
    }
    async loadRelatedPosts(post) {
      if (!this.supabase) return;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      const { data, error } = await this.supabase.from(table).select("id, title, summary, slug, category, thumbnail_url, created_at").eq("status", "published").neq("id", post.id).eq("category", post.category).order("created_at", { ascending: false }).limit(3);
      if (error) throw error;
      const container = DOM.$("#related-posts");
      if (!container) return;
      if (!data || data.length === 0) {
        container.innerHTML = "";
        return;
      }
      const cards = data.map((p) => {
        const url = "/post/" + encodeURIComponent(p.slug || p.id);
        const hasImg = !!p.thumbnail_url;
        const img = hasImg ? (() => {
          const q = 80;
          const baseW = 120, baseH = 120;
          const widths = [96, 120, 144, 160];
          const sizes = "(max-width: 640px) 96px, 120px";
          const src = this.getTransformedPublicUrl(p.thumbnail_url, { width: baseW, height: baseH, resize: "cover", quality: q, format: "webp" });
          const srcset = widths.map((x) => `${this.getTransformedPublicUrl(p.thumbnail_url, { width: x, height: x, resize: "cover", quality: q, format: "webp" })} ${x}w`).join(", ");
          return `<img src="${src}" srcset="${srcset}" sizes="${sizes}" alt="${this.escapeHTML(p.title || "")}" class="post-card-thumb-img" width="${baseW}" height="${baseH}" decoding="async" loading="lazy"/>`;
        })() : `<span class="thumb-initial">${this.escapeHTML(String(p.title || "N").trim().charAt(0).toUpperCase())}</span>`;
        return `<article class="post-card post-card-compact"><a href="${url}" data-route class="post-card-thumb${hasImg ? "" : " placeholder"}">${img}</a><div class="post-card-main"><h3 class="post-card-title"><a href="${url}" data-route>${this.escapeHTML(p.title)}</a></h3><p class="post-card-meta">${this.formatDate(p.created_at)}</p></div></article>`;
      }).join("");
      container.innerHTML = `<h2 class="text-lg font-bold mb-3">\uAD00\uB828 \uAE00</h2><div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${cards}</div>`;
    }
    async loadPopularPosts(currentPostId = null) {
      const container = DOM.$("#popular-posts");
      if (!container) return;
      if (!this.supabase) return;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      const token = Date.now();
      this._reqTokens.popular = token;
      const inflightKey = `popular:${currentPostId || ""}`;
      const { data, error } = await this.withDedupe(inflightKey, () => this.supabase.from(table).select("id, title, slug, thumbnail_url, created_at, view_count").eq("status", "published").order("view_count", { ascending: false, nullsFirst: false }).limit(5));
      if (error) throw error;
      let list = (data || []).filter((p) => p && p.id !== currentPostId);
      if (!list || list.length === 0) {
        container.innerHTML = "";
        return;
      }
      if (this._reqTokens.popular !== token) return;
      const header = '<h2 class="text-lg font-bold mb-3">\uB9CE\uC774 \uBCF8 \uAE00</h2>';
      const items = list.map((p, idx) => {
        const url = "/post/" + encodeURIComponent(p.slug || p.id);
        const views = Number(p.view_count || 0);
        const date = this.formatDateKR(p.created_at);
        return `<li class="popular-item"><span class="popular-rank">${idx + 1}</span><a class="popular-link" href="${url}" data-route>${this.escapeHTML(p.title || "")}</a><span class="popular-date">${date}</span><span class="popular-views">${views.toLocaleString("ko-KR")}</span></li>`;
      }).join("");
      container.innerHTML = header + `<ul class="popular-list">${items}</ul>`;
    }
    // 파일명으로부터 alt 텍스트 유도어 생성
    deriveAltFromFileName(name = "") {
      try {
        let base = String(name || "").replace(/\.[a-z0-9]+$/i, "");
        base = decodeURIComponent(base);
        base = base.replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
        return base || "\uC774\uBBF8\uC9C0";
      } catch (e) {
        return "\uC774\uBBF8\uC9C0";
      }
    }
    // 저장 전에 본문 내 이미지에 alt 누락 시 caption/제목/파일명으로 보정
    ensureImageAltAttributes(html, title = "") {
      try {
        const div = document.createElement("div");
        div.innerHTML = String(html || "");
        const imgs = div.querySelectorAll("img");
        imgs.forEach((img) => {
          const currentAlt = (img.getAttribute("alt") || "").trim();
          if (currentAlt) return;
          let altText = "";
          const fig = img.closest("figure");
          const cap = fig ? fig.querySelector("figcaption") : null;
          altText = ((cap == null ? void 0 : cap.textContent) || "").trim();
          if (!altText) altText = String(title || "").trim();
          if (!altText) {
            const src = img.getAttribute("src") || "";
            try {
              const u = new URL(src, window.location.origin);
              const file = (u.pathname.split("/").pop() || "").split("?")[0];
              altText = this.deriveAltFromFileName(file);
            } catch (e) {
              const file = (src.split("/").pop() || "").split("?")[0];
              altText = this.deriveAltFromFileName(file);
            }
          }
          img.setAttribute("alt", altText || "\uC774\uBBF8\uC9C0");
          if (cap && !cap.textContent.trim()) cap.textContent = altText || "\uC774\uBBF8\uC9C0";
        });
        return div.innerHTML;
      } catch (e) {
        return html;
      }
    }
    // 순수 텍스트를 간단한 마크다운으로 전처리: hN 제목/이미지 URL 자동 치환
    preprocessPlainTextToMarkdown(text = "") {
      try {
        let t = String(text || "");
        t = t.replace(/^\s*h([1-6])\s+(.+)$/gmi, (m, level, content) => {
          const hashes = "#".repeat(Number(level));
          return `${hashes} ${content}`;
        });
        t = t.replace(/(^|\s)(https?:\/\/[^\s]+\.(?:png|jpe?g|webp|gif|svg))(?!\S)/gmi, (m, space, url) => {
          return `${space}![](${url})`;
        });
        return t;
      } catch (e) {
        return String(text || "");
      }
    }
    // 마크다운/단순 HTML에서 생성된 단순 <img>를 반응형 최적화 이미지로 변환
    transformPlainImagesToOptimized(html, title = "") {
      try {
        const div = document.createElement("div");
        div.innerHTML = String(html || "");
        const conn = navigator && navigator.connection ? navigator.connection : {};
        const saveData = !!conn.saveData;
        const et = conn.effectiveType || "";
        const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
        const w = isSlow ? [360, 600] : [480, 768, 1200];
        const mainW = isSlow ? 900 : 1200;
        const mainQ = isSlow ? 75 : 85;
        const setQ = isSlow ? 60 : 80;
        const sizes = isSlow ? "(max-width: 600px) 100vw, 600px" : "(max-width: 768px) 100vw, 768px";
        const imgs = Array.from(div.querySelectorAll("img"));
        imgs.forEach((img, i) => {
          if (img.hasAttribute("srcset")) return;
          const src = img.getAttribute("src") || "";
          if (!src) return;
          const altRaw = (img.getAttribute("alt") || "").trim();
          const altText = altRaw || (() => {
            try {
              const u = new URL(src, window.location.origin);
              const file = (u.pathname.split("/").pop() || "").split("?")[0];
              return this.deriveAltFromFileName(file);
            } catch (e) {
              const file = (src.split("/").pop() || "").split("?")[0];
              return this.deriveAltFromFileName(file);
            }
          })() || (title || "\uC774\uBBF8\uC9C0");
          const optimized = this.getOptimizedPublicUrl(src, { width: mainW, quality: mainQ, format: "webp" });
          const srcset = w.map((x) => `${this.getOptimizedPublicUrl(src, { width: x, quality: setQ, format: "webp" })} ${x}w`).join(", ");
          const fig = document.createElement("figure");
          const newImg = img.cloneNode(true);
          newImg.setAttribute("src", optimized);
          newImg.setAttribute("srcset", srcset);
          newImg.setAttribute("sizes", sizes);
          newImg.setAttribute("alt", altText);
          const eager = i === 0;
          if (eager) {
            newImg.removeAttribute("loading");
            newImg.setAttribute("fetchpriority", "high");
          } else {
            newImg.setAttribute("loading", "lazy");
            newImg.setAttribute("fetchpriority", "low");
          }
          newImg.setAttribute("decoding", "async");
          fig.appendChild(newImg);
          const cap = document.createElement("figcaption");
          cap.textContent = altText;
          fig.appendChild(cap);
          const parent = img.parentElement;
          if (parent && parent.tagName.toLowerCase() === "p") {
            parent.replaceWith(fig);
          } else {
            img.replaceWith(fig);
          }
        });
        return div.innerHTML;
      } catch (e) {
        return html;
      }
    }
    // 연속 중복 이미지(같은 src/srcset)를 제거해 본문 중복 렌더링을 방지
    dedupeConsecutiveImages(html) {
      try {
        const div = document.createElement("div");
        div.innerHTML = String(html || "");
        const getKey = (img) => `${img.getAttribute("src") || ""}|${img.getAttribute("srcset") || ""}`;
        const containers = Array.from(div.querySelectorAll("figure, img")).filter((el) => !(el.tagName.toLowerCase() === "img" && el.closest("figure")));
        for (let i = 0; i < containers.length; i++) {
          const cur = containers[i];
          const curImg = cur.tagName.toLowerCase() === "img" ? cur : cur.querySelector("img");
          if (!curImg) continue;
          const prevEl = cur.previousElementSibling;
          if (!prevEl) continue;
          const prevImg = prevEl.tagName.toLowerCase() === "img" ? prevEl : prevEl.querySelector && prevEl.querySelector("img");
          if (!prevImg) continue;
          const same = getKey(curImg) === getKey(prevImg);
          if (same) {
            cur.remove();
          }
        }
        return div.innerHTML;
      } catch (e) {
        return html;
      }
    }
    // Supabase 이미지 최적화 Public URL 생성 (기존 public URL 대상)
    getOptimizedPublicUrl(publicUrlOrPath, opts = {}) {
      try {
        const u = new URL(publicUrlOrPath, window.location.origin);
        const isSupabase = /supabase\.co\/.+\/object\/public\//.test(u.href);
        if (!isSupabase) return publicUrlOrPath;
        const params = new URLSearchParams();
        if (opts.width) params.set("width", String(opts.width));
        if (opts.height) params.set("height", String(opts.height));
        if (opts.resize) params.set("resize", String(opts.resize));
        if (opts.format) params.set("format", String(opts.format));
        if (opts.quality) params.set("quality", String(opts.quality));
        const q = params.toString();
        if (!q) return u.href;
        return u.search && u.search.length > 1 ? `${u.href}&${q}` : `${u.href}?${q}`;
      } catch (e) {
        return publicUrlOrPath;
      }
    }
    // Supabase Storage 버킷 경로로부터 변환 Public URL 생성 (권장)
    getTransformedPublicUrl(pathOrUrl, opts = {}) {
      var _a;
      try {
        if (!pathOrUrl) return "";
        if (/^https?:\/\//i.test(pathOrUrl)) {
          return this.getOptimizedPublicUrl(pathOrUrl, opts);
        }
        const bucket = window.Config && window.Config.IMAGE_BUCKET_NAME || "thought-images";
        const res = this.supabase.storage.from(bucket).getPublicUrl(pathOrUrl, { transform: {
          width: opts.width,
          height: opts.height,
          resize: opts.resize,
          format: opts.format,
          quality: opts.quality
        } });
        return ((_a = res == null ? void 0 : res.data) == null ? void 0 : _a.publicUrl) || "";
      } catch (e) {
        return "";
      }
    }
    /**
     * [Data] 최근 글 로드 및 렌더링
     */
    async loadHomePosts(params = new URLSearchParams()) {
      const container = DOM.$("#home-posts");
      if (!container) return;
      const page = Number(params.get("page") || "1");
      container.innerHTML = '<div class="animate-pulse space-y-3"><div class="h-6 bg-gray-200 rounded"></div><div class="h-24 bg-gray-200 rounded"></div><div class="h-24 bg-gray-200 rounded"></div></div>';
      const scenario = params.get("scenario");
      if (scenario === "empty") {
        container.innerHTML = '<div class="text-gray-500">\uD45C\uC2DC\uD560 \uAC8C\uC2DC\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
        return;
      }
      if (scenario === "error") {
        container.innerHTML = '<div class="text-red-600"><p class="font-semibold">\uAC8C\uC2DC\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</p><p class="text-sm text-red-500">\uC9C4\uB2E8 \uC2DC\uB098\uB9AC\uC624\uC5D0 \uC758\uD574 \uC624\uB958\uAC00 \uAC15\uC81C\uB418\uC5C8\uC2B5\uB2C8\uB2E4.</p></div>';
        return;
      }
      await this.ensureSupabaseReady(1200);
      if (!this.supabase) return;
      const perPage = window.Config && window.Config.POSTS_PER_PAGE || 10;
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      const table = window.Config && window.Config.DB_TABLE_NAME || "posts";
      const token = Date.now();
      this._reqTokens.home = token;
      const key = `home:${from}-${to}`;
      try {
        const { data, count, error } = await this.withDedupe(
          key,
          () => this.supabase.from(table).select("id, title, summary, slug, category, thumbnail_url, created_at", { count: "exact" }).eq("status", "published").order("created_at", { ascending: false }).range(from, to)
        );
        if (error) throw error;
        if (!data || data.length === 0) {
          container.innerHTML = '<div class="text-gray-500">\uD45C\uC2DC\uD560 \uAC8C\uC2DC\uAE00\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</div>';
          const pagEl = DOM.$("#home-pagination");
          if (pagEl) pagEl.innerHTML = "";
          return;
        }
        try {
          const pagEl = DOM.$("#home-pagination");
          if (pagEl) {
            const totalPages = Math.max(1, Math.ceil((count || 0) / perPage));
            if (totalPages <= 1) {
              pagEl.innerHTML = "";
              this.updatePrevNextLinks(1, 1);
              this.updateRobotsMeta("index,follow");
              this.updatePageMeta("InsureLog - \uCD5C\uADFC \uAE00", "\uCD5C\uC2E0 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D", window.location.href, "/og-image.svg");
            } else {
              const makeBtn = (p, label = null, active = false) => `<button data-page="${p}" ${active ? 'aria-current="page"' : ""} aria-label="${label ? label : `\uD398\uC774\uC9C0 ${p}`}" class="px-3 py-1 rounded border ${active ? "bg-black text-white" : "hover:bg-black/5"}">${label || p}</button>`;
              const prev = page > 1 ? makeBtn(page - 1, "\uC774\uC804") : '<span class="px-3 py-1 text-gray-400" aria-hidden="true">\uC774\uC804</span>';
              const next = page < totalPages ? makeBtn(page + 1, "\uB2E4\uC74C") : '<span class="px-3 py-1 text-gray-400" aria-hidden="true">\uB2E4\uC74C</span>';
              const windowSize = 5;
              const start = Math.max(1, page - Math.floor(windowSize / 2));
              const end = Math.min(totalPages, start + windowSize - 1);
              const pages = [];
              for (let p = start; p <= end; p++) pages.push(makeBtn(p, null, p === page));
              pagEl.innerHTML = prev + pages.join("") + next;
              pagEl.querySelectorAll("button[data-page]").forEach((btn) => {
                btn.onclick = () => {
                  const targetPage = Number(btn.getAttribute("data-page")) || 1;
                  this.navigate(`/?page=${targetPage}`);
                };
              });
              this.updatePrevNextLinks(totalPages, page);
              this.updateRobotsMeta(page === 1 ? "index,follow" : "noindex,follow");
              const t = page > 1 ? `\uCD5C\uADFC \uAE00 - \uD398\uC774\uC9C0 ${page} - InsureLog` : "InsureLog - \uCD5C\uADFC \uAE00";
              const d = page > 1 ? `\uCD5C\uC2E0 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D \xB7 \uD398\uC774\uC9C0 ${page}` : "\uCD5C\uC2E0 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D";
              this.updatePageMeta(t, d, window.location.href, "/og-image.svg");
            }
          }
        } catch (_) {
        }
        if (this._reqTokens.home !== token) return;
        container.innerHTML = this.renderPostsListHTML(data);
        try {
          const imgs = Array.from(container.querySelectorAll(".post-card-thumb-img"));
          if (imgs.length) {
            const inView = imgs.find((img) => {
              const r = img.getBoundingClientRect();
              return r && r.height > 0 && r.top >= 0 && r.top < (window.innerHeight || 0) * 0.9;
            }) || imgs[0];
            if (inView) {
              if (inView.getAttribute("loading") === "lazy") inView.removeAttribute("loading");
              inView.setAttribute("fetchpriority", "high");
              const src = inView.currentSrc || inView.getAttribute("src");
              const srcset = inView.getAttribute("srcset") || "";
              const sizes = inView.getAttribute("sizes") || "";
              if (src) {
                const existed = document.querySelector(`link[rel="preload"][as="image"][href="${src}"]`);
                if (!existed) {
                  const l = document.createElement("link");
                  l.rel = "preload";
                  l.as = "image";
                  l.href = src;
                  if (srcset) l.setAttribute("imagesrcset", srcset);
                  if (sizes) l.setAttribute("imagesizes", sizes);
                  l.crossOrigin = "anonymous";
                  document.head.appendChild(l);
                }
                try {
                  const origin = new URL(src, window.location.origin).origin;
                  const existedPre = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
                  if (!existedPre) {
                    const p = document.createElement("link");
                    p.rel = "preconnect";
                    p.href = origin;
                    p.crossOrigin = "anonymous";
                    document.head.appendChild(p);
                  }
                } catch (e) {
                }
              }
            }
          }
        } catch (e) {
        }
      } catch (err) {
        const msg = err && (err.message || err.msg) ? String(err.message || err.msg) : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958";
        const status = err && (err.status || err.code) ? String(err.status || err.code) : "";
        container.innerHTML = '<div class="error-banner"><div class="error-banner-content"><svg class="error-banner-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v2h2v-2zm0-8H9v6h2V5z"/></svg><div class="error-banner-text"><div class="error-banner-title">\uAC8C\uC2DC\uAE00\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.</div><div class="error-banner-message">\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.' + (status ? " (" + this.escapeHTML(status) + ")" : "") + '</div><div class="error-details">' + this.escapeHTML(msg) + "</div></div></div></div>";
        this.handleError(err, "loadHomePosts");
      }
    }
    // 게시글 카드 리스트 HTML 생성
    renderPostsListHTML(posts) {
      return posts.map((post, idx) => {
        const href = "/post/" + encodeURIComponent(post.slug || post.id);
        const conn = navigator && navigator.connection ? navigator.connection : {};
        const saveData = !!conn.saveData;
        const et = conn.effectiveType || "";
        const isSlow = saveData || /(^|[^a-z])(2g|3g)/.test(et);
        const slotW = 280;
        const slotH = Math.round(slotW * (9 / 16));
        const q = isSlow ? 70 : 80;
        const widths = isSlow ? [slotW] : [slotW, slotW * 2];
        const sizes = "(max-width: 640px) 100vw, 280px";
        const thumbUrl = post.thumbnail_url ? this.getTransformedPublicUrl(post.thumbnail_url, { width: slotW, height: slotH, resize: "cover", quality: q, format: "webp" }) : null;
        const srcset = post.thumbnail_url ? widths.map((x) => `${this.getTransformedPublicUrl(post.thumbnail_url, { width: x, height: Math.round(x * (slotH / slotW)), resize: "cover", quality: q, format: "webp" })} ${x}w`).join(", ") : "";
        const eager = idx === 0;
        const loading = eager ? "" : ' loading="lazy"';
        const fetchp = eager ? ' fetchpriority="high"' : ' fetchpriority="low"';
        if (eager && thumbUrl) {
          try {
            const existed = document.querySelector(`link[rel="preload"][as="image"][href="${thumbUrl}"]`);
            if (!existed) {
              const l = document.createElement("link");
              l.rel = "preload";
              l.as = "image";
              l.href = thumbUrl;
              if (srcset) l.setAttribute("imagesrcset", srcset);
              l.setAttribute("imagesizes", sizes);
              l.crossOrigin = "anonymous";
              document.head.appendChild(l);
            }
          } catch (_) {
          }
        }
        const imgTag = thumbUrl ? `<img src="${thumbUrl}"${srcset ? ` srcset="${srcset}" sizes="${sizes}"` : ""} alt="${this.escapeHTML(post.title || "")}" class="post-card-thumb-img" width="${slotW}" height="${slotH}" decoding="async"${loading}${fetchp}/>` : "";
        const initial = this.escapeHTML(String(post.title || "N").trim().charAt(0).toUpperCase());
        const thumbBlock = `<a href="${href}" data-route class="post-card-thumb${thumbUrl ? "" : " placeholder"}">${thumbUrl ? imgTag : `<span class="thumb-initial">${initial}</span>`}</a>`;
        const date = this.formatDateKR(post.created_at);
        const categoryBadge = post.category ? `<span class="badge">${this.escapeHTML(post.category)}</span>` : "";
        const editLink = this.state.user ? `<a href="/writer/${encodeURIComponent(post.slug)}" data-route class="btn-xs">\uD3B8\uC9D1</a>` : "";
        return '<article class="post-card post-card-wide" data-route data-href="' + href + `" tabindex="0"><h2 class="post-card-title"><a href="${href}" data-route>${this.escapeHTML(post.title || "\uC81C\uBAA9 \uC5C6\uC74C")}</a></h2><div class="post-card-content-grid"><div class="post-card-summary-block">` + (post.summary ? `<p class="post-card-summary">${this.escapeHTML(post.summary)}</p>` : "") + `<div class="post-card-meta">\uC791\uC131\uC77C ${date}${post.category ? ` \xB7 \uCE74\uD14C\uACE0\uB9AC ${categoryBadge}` : ""}</div><div class="post-card-actions">${editLink}</div></div>` + thumbBlock + `</div></article>`;
      }).join("");
    }
    // 한국형 날짜 포맷터 (YYYY.MM.DD)
    formatDateKR(iso) {
      try {
        const d = new Date(iso);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${y}.${m}.${day}`;
      } catch (e) {
        return "";
      }
    }
    // 날짜 포맷터
    formatDate(iso) {
      try {
        const d = new Date(iso);
        return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
      } catch (e) {
        return "";
      }
    }
    // 간단한 HTML 이스케이프
    escapeHTML(str) {
      return String(str || "").replace(/[&<>"]/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[s]);
    }
    /**
     * [Analytics] 방문 로그 기록
     */
    async logSiteVisit() {
      try {
        const { error } = await this.supabase.from("site_visits").insert({ visited_at: (/* @__PURE__ */ new Date()).toISOString() });
        if (error) throw error;
      } catch (e) {
        console.warn("site_visits insert \uC2E4\uD328:", e.message || e);
      }
    }
    /**
     * [Storage] 이미지 webp 변환 후 버킷 업로드
     */
    async uploadImageToBucket(file, pathInBucket) {
      const bucket = window.Config && window.Config.IMAGE_BUCKET_NAME || "thought-images";
      const { blob: webpBlob, width, height } = await this.convertToWebP(file);
      const { error } = await this.supabase.storage.from(bucket).upload(pathInBucket, webpBlob, { contentType: "image/webp", upsert: true });
      if (error) throw error;
      return { savedPath: pathInBucket, width, height };
    }
    async convertToWebP(file) {
      if (file.type === "image/webp") {
        const img2 = await this.readImageFromFile(file);
        return { blob: file, width: img2.width, height: img2.height };
      }
      const img = await this.readImageFromFile(file);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
      return { blob, width: img.width, height: img.height };
    }
    readImageFromFile(file) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          resolve(img);
        };
        img.onerror = reject;
        img.src = url;
      });
    }
  };
  window.BlogApp = BlogApp;

  // js/layout-manager.js
  (function() {
    const DesignGuide = {
      // maxWidth: 'auto'는 네비게이션 바의 실제 너비를 기준으로 동기화
      maxWidth: "auto",
      paddingX: 24,
      gap: 16,
      marginY: 40,
      imageMargin: 16,
      // 허용 오차(px)
      tolerance: 16
    };
    const MOBILE_BREAKPOINT = 640;
    const debugLayout = !!(window.Config && window.Config.DEBUG_LAYOUT === true);
    const q = (sel, root = document) => root.querySelector(sel);
    const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    let cachedNavWidth = null;
    let navResizeObserver = null;
    function measureNavWidth() {
      const nav = q("#main-nav-container nav");
      if (!nav) return null;
      const rect = nav.getBoundingClientRect();
      return Math.round(rect.width);
    }
    function setContentMaxWidthVar(px) {
      if (!px || !Number.isFinite(px)) return;
      const current = getComputedStyle(document.documentElement).getPropertyValue("--content-max-width").trim();
      const next = px + "px";
      if (current !== next) {
        document.documentElement.style.setProperty("--content-max-width", next);
      }
    }
    function applyContentWidth(container) {
      if (!container) return;
      const maxWVar = getComputedStyle(document.documentElement).getPropertyValue("--content-max-width").trim();
      if (!maxWVar) return;
      const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      if (container.style.maxWidth !== maxWVar) container.style.maxWidth = maxWVar;
      if (container.style.marginLeft !== "auto") container.style.marginLeft = "auto";
      if (container.style.marginRight !== "auto") container.style.marginRight = "auto";
      if (!isMobile) {
        const cs = getComputedStyle(container);
        const padL = parseInt(cs.paddingLeft, 10) || 0;
        const padR = parseInt(cs.paddingRight, 10) || 0;
        if (padL === 0 && !container.style.paddingLeft) container.style.paddingLeft = DesignGuide.paddingX + "px";
        if (padR === 0 && !container.style.paddingRight) container.style.paddingRight = DesignGuide.paddingX + "px";
      }
    }
    function centerImages(scope) {
      const imgs = qa("img", scope || document);
      imgs.forEach((img) => {
        if (img.closest(".post-card") || img.classList.contains("post-card-thumb-img")) return;
        if (img.dataset.centered === "1") return;
        img.style.display = "block";
        img.style.margin = `${DesignGuide.imageMargin}px auto`;
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.dataset.centered = "1";
      });
    }
    function collectContainers() {
      const list = [];
      const lib = q("#view-library > section");
      if (lib) list.push(lib);
      const post = q("#view-post > article");
      if (post) list.push(post);
      const arc = q("#view-archives > section");
      if (arc) list.push(arc);
      const writer = q("#view-writer > section");
      if (writer) list.push(writer);
      const isVisible = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0;
      return list.filter(isVisible);
    }
    function inspectLayout() {
      const navW = measureNavWidth();
      const containers = collectContainers();
      const report = [];
      if (!debugLayout) return report;
      containers.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const vW = document.documentElement.clientWidth || window.innerWidth;
        const isMobile = vW <= MOBILE_BREAKPOINT;
        const leftSpace = Math.round(rect.left);
        const rightSpace = Math.round(vW - rect.right);
        const marginBalanced = Math.abs(leftSpace - rightSpace) <= DesignGuide.tolerance;
        const widthMatches = isMobile ? true : navW ? Math.abs(Math.round(rect.width) - navW) <= DesignGuide.tolerance : true;
        const issues = [];
        if (Math.round(rect.width) === 0) {
          return;
        }
        if (!widthMatches) issues.push(`\uCEE8\uD14C\uC774\uB108 \uB108\uBE44(${Math.round(rect.width)}px) != \uB124\uBE44 \uB108\uBE44(${navW}px)`);
        if (!marginBalanced) issues.push(`\uC591\uCE21 \uB9C8\uC9C4 \uBD88\uADE0\uD615 left=${leftSpace}px, right=${rightSpace}px`);
        const imgNotCentered = qa("img", el).filter((img) => {
          if (img.closest(".post-card") || img.classList.contains("post-card-thumb-img")) return false;
          const cs = getComputedStyle(img);
          return !(cs.display === "block" && cs.marginLeft === "auto" && cs.marginRight === "auto");
        }).length;
        if (imgNotCentered) issues.push(`\uC911\uC559 \uC815\uB82C\uB418\uC9C0 \uC54A\uC740 \uC774\uBBF8\uC9C0 ${imgNotCentered}\uAC1C`);
        report.push({ element: el, widthMatches, marginBalanced, imgNotCentered, issues });
      });
      if (debugLayout) {
        if (report.some((r) => r.issues.length)) {
          console.group("%cLayout Inspector: \uACBD\uACE0", "color:#b45309;font-weight:bold");
          report.forEach((r, i) => {
            if (r.issues.length) {
              console.warn(`#${i + 1}`, r.issues.join(" | "), r.element);
            }
          });
          console.info("\uC81C\uC548:", [
            "- \uCEE8\uD14C\uC774\uB108\uC5D0 maxWidth\uB97C \uB124\uBE44\uAC8C\uC774\uC158 \uB108\uBE44\uB85C \uB3D9\uAE30\uD654(\uC790\uB3D9 \uC801\uC6A9\uB428).",
            "- \uC591\uCE21 \uB9C8\uC9C4\uC744 auto\uB85C \uC124\uC815\uD574 \uC911\uC559 \uC815\uB82C \uC720\uC9C0(\uC790\uB3D9 \uC801\uC6A9\uB428).",
            "- \uC774\uBBF8\uC9C0\uC5D0 display:block + margin:auto \uC9C0\uC815(\uC790\uB3D9 \uC801\uC6A9\uB428)."
          ].join("\n"));
          console.groupEnd();
        } else {
          console.log("%cLayout Inspector: \uC77C\uAD00\uC131 OK", "color:#16a34a;font-weight:bold");
        }
      }
      return report;
    }
    function applyGuidelinesTo(container) {
      if (!container) return;
      container.style.gap = DesignGuide.gap + "px";
    }
    function syncAll() {
      const navW = measureNavWidth();
      const WIDTH_UPDATE_THRESHOLD = 4;
      if (navW) {
        if (cachedNavWidth === null) {
          cachedNavWidth = navW;
          setContentMaxWidthVar(navW);
        } else if (Math.abs(navW - cachedNavWidth) > WIDTH_UPDATE_THRESHOLD) {
          cachedNavWidth = navW;
          setContentMaxWidthVar(navW);
        }
      }
      const containers = collectContainers();
      containers.forEach((el) => {
        applyContentWidth(el);
        applyGuidelinesTo(el);
        centerImages(el);
      });
      inspectLayout();
    }
    let rafId = null;
    function scheduleSync() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncAll();
      });
    }
    function onViewRendered(view) {
      scheduleSync();
    }
    function init() {
      var _a;
      scheduleSync();
      if (document.fonts && typeof ((_a = document.fonts.ready) == null ? void 0 : _a.then) === "function") {
        document.fonts.ready.then(() => scheduleSync());
      }
      const app = q("#app-container");
      if (app) {
        const mo = new MutationObserver(() => {
          scheduleSync();
        });
        mo.observe(app, { childList: true, subtree: true });
      }
      const nav = q("#main-nav-container nav");
      if (nav && "ResizeObserver" in window) {
        navResizeObserver = new ResizeObserver(() => scheduleSync());
        navResizeObserver.observe(nav);
      }
      window.addEventListener("resize", () => scheduleSync());
    }
    window.DesignGuide = DesignGuide;
    window.LayoutManager = { init, onViewRendered, syncAll };
  })();

  // js/script-loader.js
  var ScriptLoader2 = {
    loadedScripts: /* @__PURE__ */ new Set(),
    // 스크립트 로드
    async loadScript(src, options = {}) {
      if (this.loadedScripts.has(src)) {
        return Promise.resolve();
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
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
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        link.onload = resolve;
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        document.head.appendChild(link);
      });
    },
    // Editor.js 관련 스크립트들 로드
    async loadEditorJS() {
      const scripts = [
        "https://cdn.jsdelivr.net/npm/@editorjs/editorjs@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/header@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/list@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/checklist@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/quote@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/code@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/delimiter@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/table@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/link@latest",
        "https://cdn.jsdelivr.net/npm/@editorjs/image@latest",
        // editorjs-html의 최신 패키지 엔트리는 브라우저에서 CommonJS 전역 'module' 의존으로 오류를 발생시킬 수 있습니다.
        // 브라우저용 UMD 빌드로 고정해 로드합니다.
        "https://cdn.jsdelivr.net/npm/editorjs-html@4.0.0/.build/edjsHTML.browser.js"
      ];
      try {
        await Promise.all(scripts.map((src) => this.loadScript(src, { nonce: "r4nd0m" })));
        console.log("Editor.js scripts loaded successfully");
      } catch (error) {
        console.error("Failed to load Editor.js scripts:", error);
        throw error;
      }
    },
    // 기타 유틸리티 라이브러리들
    async loadUtilities() {
      const dompurifySources = [
        "https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.8/purify.min.js",
        "https://unpkg.com/dompurify@3.0.8/dist/purify.min.js"
      ];
      const markedSources = [
        "https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/marked/12.0.2/marked.min.js",
        "https://unpkg.com/marked@12.0.2/lib/marked.umd.min.js"
      ];
      const loadWithFallback = async (sources) => {
        let lastErr;
        for (const src of sources) {
          try {
            await this.loadScript(src, { nonce: "r4nd0m" });
            console.log("Loaded:", src);
            return true;
          } catch (e) {
            lastErr = e;
            console.warn("Failed:", src, e);
          }
        }
        throw lastErr || new Error("All sources failed");
      };
      try {
        await loadWithFallback(dompurifySources);
        await loadWithFallback(markedSources);
        console.log("Utility scripts loaded successfully");
      } catch (error) {
        console.error("Failed to load utility scripts:", error);
        throw error;
      }
    },
    // 모든 필수 스크립트 로드 (필요한 유틸리티만 로드)
    async loadAll() {
      try {
        await Promise.all([
          this.loadUtilities()
        ]);
        console.log("All scripts loaded successfully");
      } catch (error) {
        console.error("Failed to load scripts:", error);
        throw error;
      }
    }
  };
  window.ScriptLoader = ScriptLoader2;

  // js/perf-monitor.js
  (function() {
    if (typeof PerformanceObserver === "undefined") return;
    const metrics = {};
    window.PerfMetrics = metrics;
    const METRICS_ENDPOINT = "/api/metrics";
    const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    const sendMetric = (name, value, extra = {}) => {
      try {
        const payload = {
          name,
          value,
          path: window.location.pathname,
          href: window.location.href,
          ua: navigator.userAgent,
          ts: Date.now(),
          conn: navigator.connection && navigator.connection.effectiveType || null,
          ...extra
        };
        if (isLocalHost) return;
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          try {
            const blob = new Blob([body], { type: "application/json" });
            navigator.sendBeacon(METRICS_ENDPOINT, blob);
            return;
          } catch (_) {
          }
        }
        fetch(METRICS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true
        }).catch(() => {
        });
      } catch (_) {
      }
    };
    const params = new URLSearchParams(window.location.search);
    const showOverlay = params.get("perf") === "1" || window.Config && window.Config.SHOW_PERF_OVERLAY === true;
    let overlayEl = null;
    const ensureOverlay = () => {
      if (!showOverlay) return;
      if (overlayEl) return overlayEl;
      overlayEl = document.createElement("div");
      overlayEl.id = "perf-overlay";
      overlayEl.setAttribute("role", "status");
      overlayEl.style.cssText = [
        "position:fixed",
        "right:12px",
        "bottom:12px",
        "z-index:9999",
        "background:rgba(17,24,39,0.8)",
        // gray-900 with opacity
        "color:#fff",
        "backdrop-filter:saturate(120%) blur(2px)",
        "border-radius:10px",
        "padding:10px 12px",
        "font:12px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Noto Sans KR",
        "box-shadow:0 8px 24px rgba(0,0,0,0.25)"
      ].join(";");
      overlayEl.innerHTML = '<div style="font-weight:600;margin-bottom:6px">Performance</div><div id="perf-lines"></div><div style="margin-top:6px;opacity:.8">?perf=1\uB85C \uD45C\uC2DC \uC911</div>';
      document.body.appendChild(overlayEl);
      return overlayEl;
    };
    const renderOverlay = () => {
      if (!showOverlay) return;
      if (!overlayEl) ensureOverlay();
      const linesEl = overlayEl.querySelector("#perf-lines");
      const v = metrics;
      const kv = [
        ["LCP", v.LCP ? `${(v.LCP / 1e3).toFixed(2)}s` : "-"],
        ["CLS", v.CLS !== void 0 ? String(v.CLS) : "-"],
        ["FID", v.FID !== void 0 ? `${Math.round(v.FID)}ms` : "-"],
        ["TTFB", v.TTFB !== void 0 ? `${Math.round(v.TTFB)}ms` : "-"]
      ];
      linesEl.innerHTML = kv.map(([k, val]) => `<div><span style="display:inline-block;width:42px;opacity:.8">${k}</span> <span style="font-weight:600">${val}</span></div>`).join("");
    };
    const log = (name, value, extra = {}) => {
      metrics[name] = value;
      const isDevHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
      if (isDevHost) {
        console.log(`[perf] ${name}:`, value, extra);
      }
      sendMetric(name, value, extra);
      renderOverlay();
    };
    try {
      const sampleMemory = () => {
        const m = performance && performance.memory;
        if (!m) return;
        log("JSHeapUsed", m.usedJSHeapSize, { total: m.totalJSHeapSize, limit: m.jsHeapSizeLimit });
      };
      if (document.readyState === "complete") {
        sampleMemory();
      } else {
        window.addEventListener("load", () => setTimeout(sampleMemory, 1200), { once: true });
      }
      window.addEventListener("click", () => setTimeout(sampleMemory, 800), { once: true });
    } catch (_) {
    }
    try {
      const ltObs = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const e of entries) {
          log("LongTask", e.duration, { name: e.name || "longtask" });
        }
      });
      ltObs.observe({ type: "longtask", buffered: true });
    } catch (_) {
    }
    try {
      const lcpObs = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const last = entries[entries.length - 1];
        if (last) log("LCP", last.renderTime || last.loadTime || last.startTime, { size: last.size });
      });
      lcpObs.observe({ type: "largest-contentful-paint", buffered: true });
    } catch (_) {
    }
    try {
      let clsValue = 0;
      const clsObs = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            log("CLS", Number(clsValue.toFixed(4)));
          }
        }
      });
      clsObs.observe({ type: "layout-shift", buffered: true });
    } catch (_) {
    }
    try {
      const fidObs = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        for (const entry of entries) {
          if (entry.name === "first-input") {
            log("FID", entry.processingStart - entry.startTime);
          }
        }
      });
      fidObs.observe({ type: "first-input", buffered: true });
    } catch (_) {
    }
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav) {
        log("TTFB", nav.responseStart);
        log("DOM Interactive", nav.domInteractive);
        log("Load Event End", nav.loadEventEnd);
      }
    } catch (_) {
    }
    if (showOverlay) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", ensureOverlay, { once: true });
      } else {
        ensureOverlay();
      }
    }
  })();
})();
