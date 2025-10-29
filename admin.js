/**
 * 관리자 역할 시스템 및 권한 관리
 * Admin Role System and Permission Management
 */

class AdminSystem {
    constructor() {
        this.adminEmail = 'salad20c@gmail.com'; // 관리자 이메일
        this.isLoggedIn = false;
        this.currentUser = null;
        this.init();
    }

    init() {
        this.checkSupabaseAuth();
        this.createAdminUI();
        this.bindEvents();
        this.setupAuthListener();
    }

    // Supabase 인증 상태 확인
    async checkSupabaseAuth() {
        if (!window.supabase) {
            console.warn('[AdminSystem] Supabase가 초기화되지 않았습니다.');
            return;
        }

        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user && user.email === this.adminEmail) {
                this.currentUser = user;
                this.isLoggedIn = true;
                this.showAdminPanel();
                console.log('[AdminSystem] 관리자 인증 확인됨:', user.email);
            } else {
                this.isLoggedIn = false;
                this.currentUser = null;
                this.hideAdminPanel();
            }
        } catch (error) {
            console.error('[AdminSystem] 인증 확인 오류:', error);
            this.isLoggedIn = false;
            this.currentUser = null;
        }
    }

    // 인증 상태 변경 리스너 설정
    setupAuthListener() {
        if (!window.supabase) return;

        window.supabase.auth.onAuthStateChange((event, session) => {
            console.log('[AdminSystem] 인증 상태 변경:', event, session?.user?.email);
            
            if (session?.user?.email === this.adminEmail) {
                this.currentUser = session.user;
                this.isLoggedIn = true;
                this.showAdminPanel();
                if (event === 'SIGNED_IN') {
                    this.showNotification('관리자로 로그인했습니다! 🔐', 'success');
                }
            } else {
                this.currentUser = null;
                this.isLoggedIn = false;
                this.hideAdminPanel();
                if (event === 'SIGNED_OUT') {
                    this.showNotification('로그아웃되었습니다! 👋', 'info');
                }
            }
        });
    }

    // 로그아웃
    async logout() {
        if (!window.supabase) return;
        
        try {
            await window.supabase.auth.signOut();
            this.showNotification('로그아웃되었습니다! 👋', 'info');
        } catch (error) {
            console.error('[AdminSystem] 로그아웃 오류:', error);
            this.showNotification('로그아웃 중 오류가 발생했습니다! ❌', 'error');
        }
    }

    // 관리자 UI 생성
    createAdminUI() {
        // 관리자 로그인 버튼 (우상단)
        const adminLoginBtn = document.createElement('div');
        adminLoginBtn.id = 'admin-login-btn';
        adminLoginBtn.innerHTML = '🔐';
        adminLoginBtn.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 40px;
            height: 40px;
            background: #333;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            font-size: 18px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(adminLoginBtn);

        // 관리자 패널
        const adminPanel = document.createElement('div');
        adminPanel.id = 'admin-panel';
        adminPanel.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            width: 300px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 9999;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        `;

        adminPanel.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid #eee;">
                <h3 style="margin: 0 0 15px 0; color: #333;">🛡️ 관리자 패널</h3>
                <div id="admin-status">
                    <div id="admin-not-logged" style="text-align: center; color: #666;">
                        <p>🔒 관리자 권한이 필요합니다</p>
                        <p style="font-size: 12px; margin: 10px 0;">
                            <strong>${this.adminEmail}</strong>로<br>
                            매직링크 로그인 후 이용하세요
                        </p>
                    </div>
                    <div id="admin-logged" style="display: none;">
                        <div style="margin-bottom: 15px; text-align: center;">
                            <strong style="color: #28a745;">관리자 모드 활성화됨 ✅</strong>
                            <p style="font-size: 12px; color: #666; margin: 5px 0;">
                                로그인: <strong id="admin-email-display"></strong>
                            </p>
                        </div>
                        <button id="admin-logout" style="width: 100%; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 10px;">
                            로그아웃
                        </button>
                    </div>
                </div>
            </div>
            <div id="admin-actions" style="padding: 15px; display: none;">
                <h4 style="margin: 0 0 10px 0; color: #333;">🔧 관리 기능</h4>
                <button class="admin-action-btn" data-action="clear-posts" style="width: 100%; padding: 8px; margin: 5px 0; background: #ffc107; border: none; border-radius: 5px; cursor: pointer;">
                    📝 모든 글 삭제
                </button>
                <button class="admin-action-btn" data-action="clear-comments" style="width: 100%; padding: 8px; margin: 5px 0; background: #17a2b8; border: none; border-radius: 5px; cursor: pointer;">
                    💬 모든 댓글 삭제
                </button>
                <button class="admin-action-btn" data-action="export-data" style="width: 100%; padding: 8px; margin: 5px 0; background: #28a745; border: none; border-radius: 5px; cursor: pointer;">
                    📤 데이터 내보내기
                </button>
                <button class="admin-action-btn" data-action="blog-stats" style="width: 100%; padding: 8px; margin: 5px 0; background: #6f42c1; border: none; border-radius: 5px; cursor: pointer;">
                    📊 블로그 통계
                </button>
            </div>
        `;

        document.body.appendChild(adminPanel);

        // 알림 컨테이너
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'admin-notifications';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            pointer-events: none;
        `;
        document.body.appendChild(notificationContainer);
    }

    // 이벤트 바인딩
    bindEvents() {
        // 로그인 버튼 클릭
        document.getElementById('admin-login-btn').addEventListener('click', () => {
            const panel = document.getElementById('admin-panel');
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        // 로그아웃 버튼 (동적으로 생성되므로 이벤트 위임 사용)
        document.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'admin-logout') {
                this.logout();
            }
        });

        // 관리 기능 버튼들
        document.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('admin-action-btn')) {
                const action = e.target.getAttribute('data-action');
                this.executeAction(action);
            }
        });

        // 패널 외부 클릭시 닫기
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('admin-panel');
            const loginBtn = document.getElementById('admin-login-btn');
            if (panel && loginBtn && !panel.contains(e.target) && !loginBtn.contains(e.target)) {
                panel.style.display = 'none';
            }
        });
    }

    // 관리자 패널 표시
    showAdminPanel() {
        document.getElementById('admin-not-logged').style.display = 'none';
        document.getElementById('admin-logged').style.display = 'block';
        document.getElementById('admin-actions').style.display = 'block';
        
        // 이메일 표시
        const emailDisplay = document.getElementById('admin-email-display');
        if (emailDisplay && this.currentUser) {
            emailDisplay.textContent = this.currentUser.email;
        }
        
        // 로그인 버튼 색상 변경
        const loginBtn = document.getElementById('admin-login-btn');
        loginBtn.style.background = '#28a745';
        loginBtn.innerHTML = '👑';
    }

    // 관리자 패널 숨기기
    hideAdminPanel() {
        document.getElementById('admin-not-logged').style.display = 'block';
        document.getElementById('admin-logged').style.display = 'none';
        document.getElementById('admin-actions').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
        
        // 로그인 버튼 원래대로
        const loginBtn = document.getElementById('admin-login-btn');
        loginBtn.style.background = '#333';
        loginBtn.innerHTML = '🔐';
    }

    // 관리 기능 실행
    executeAction(action) {
        if (!this.isLoggedIn) {
            this.showNotification('관리자 권한이 필요합니다! 🚫', 'error');
            return;
        }

        switch (action) {
            case 'clear-posts':
                this.clearAllPosts();
                break;
            case 'clear-comments':
                this.clearAllComments();
                break;
            case 'export-data':
                this.exportData();
                break;
            case 'blog-stats':
                this.showBlogStats();
                break;
        }
    }

    // 모든 글 삭제
    clearAllPosts() {
        if (confirm('⚠️ 정말로 모든 글을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
            localStorage.removeItem('blog_posts');
            // 페이지 새로고침으로 변경사항 반영
            this.showNotification('모든 글이 삭제되었습니다! 🗑️', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }

    // 모든 댓글 삭제
    clearAllComments() {
        if (confirm('⚠️ 정말로 모든 댓글을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
            localStorage.removeItem('blog_comments');
            this.showNotification('모든 댓글이 삭제되었습니다! 💬', 'success');
            setTimeout(() => location.reload(), 1500);
        }
    }

    // 데이터 내보내기
    exportData() {
        const posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        const comments = JSON.parse(localStorage.getItem('blog_comments') || '[]');
        
        const exportData = {
            posts: posts,
            comments: comments,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `blog-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('데이터가 내보내졌습니다! 📤', 'success');
    }

    // 블로그 통계 표시
    showBlogStats() {
        const posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
        const comments = JSON.parse(localStorage.getItem('blog_comments') || '[]');
        
        const stats = {
            totalPosts: posts.length,
            totalComments: comments.length,
            totalWords: posts.reduce((sum, post) => sum + (post.content || '').length, 0),
            lastPostDate: posts.length > 0 ? new Date(Math.max(...posts.map(p => new Date(p.date)))).toLocaleDateString() : '없음'
        };

        const statsHtml = `
            📊 <strong>블로그 통계</strong><br>
            📝 총 글 수: ${stats.totalPosts}개<br>
            💬 총 댓글 수: ${stats.totalComments}개<br>
            📖 총 글자 수: ${stats.totalWords.toLocaleString()}자<br>
            📅 마지막 글: ${stats.lastPostDate}
        `;

        this.showNotification(statsHtml, 'info', 5000);
    }

    // 알림 표시
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            padding: 12px 20px;
            border-radius: 5px;
            margin-bottom: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            pointer-events: auto;
            animation: slideDown 0.3s ease;
            max-width: 400px;
        `;
        notification.innerHTML = message;

        // 애니메이션 CSS 추가
        if (!document.getElementById('admin-animations')) {
            const style = document.createElement('style');
            style.id = 'admin-animations';
            style.textContent = `
                @keyframes slideDown {
                    from { transform: translateX(-50%) translateY(-100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.getElementById('admin-notifications').appendChild(notification);

        // 자동 제거
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideDown 0.3s ease reverse';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, duration);
    }

    // 개별 글 삭제
    deletePost(postId, postTitle) {
        if (!this.isLoggedIn) {
            this.showNotification('관리자 권한이 필요합니다! 🚫', 'error');
            return;
        }

        if (confirm(`⚠️ 정말로 "${postTitle}" 글을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!`)) {
            // Supabase에서 글 삭제
            if (window.supabase) {
                window.supabase
                    .from('posts')
                    .delete()
                    .eq('id', postId)
                    .then(({ error }) => {
                        if (error) {
                            console.error('글 삭제 오류:', error);
                            this.showNotification('글 삭제 중 오류가 발생했습니다! ❌', 'error');
                        } else {
                            this.showNotification(`"${postTitle}" 글이 삭제되었습니다! 🗑️`, 'success');
                            setTimeout(() => location.reload(), 1500);
                        }
                    });
            } else {
                // 로컬 스토리지에서 글 삭제 (fallback)
                const posts = JSON.parse(localStorage.getItem('blog_posts') || '[]');
                const updatedPosts = posts.filter(post => post.id !== postId);
                localStorage.setItem('blog_posts', JSON.stringify(updatedPosts));
                this.showNotification(`"${postTitle}" 글이 삭제되었습니다! 🗑️`, 'success');
                setTimeout(() => location.reload(), 1500);
            }
        }
    }

    // 개별 댓글 삭제 (Comments 객체에서 호출)
    deleteComment(commentId) {
        if (!this.isLoggedIn) {
            this.showNotification('관리자 권한이 필요합니다! 🚫', 'error');
            return;
        }

        if (confirm('⚠️ 정말로 이 댓글을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다!')) {
            // Supabase에서 댓글 삭제
            if (window.supabase) {
                window.supabase
                    .from('comments')
                    .delete()
                    .eq('id', commentId)
                    .then(({ error }) => {
                        if (error) {
                            console.error('댓글 삭제 오류:', error);
                            this.showNotification('댓글 삭제 중 오류가 발생했습니다! ❌', 'error');
                        } else {
                            this.showNotification('댓글이 삭제되었습니다! 🗑️', 'success');
                            // 댓글 목록 새로고침
                            if (window.Comments && window.Comments.loadComments) {
                                window.Comments.loadComments();
                            }
                        }
                    });
            } else {
                // 로컬 스토리지에서 댓글 삭제 (fallback)
                const comments = JSON.parse(localStorage.getItem('blog_comments') || '[]');
                const updatedComments = comments.filter(comment => comment.id !== commentId);
                localStorage.setItem('blog_comments', JSON.stringify(updatedComments));
                this.showNotification('댓글이 삭제되었습니다! 🗑️', 'success');
                if (window.Comments && window.Comments.loadComments) {
                    window.Comments.loadComments();
                }
            }
        }
    }

    // 관리자 권한 확인
    isAdmin() {
        return this.isLoggedIn;
    }

    // 글 삭제 권한 확인 (개별 글)
    canDeletePost(postId) {
        return this.isLoggedIn;
    }

    // 댓글 삭제 권한 확인 (개별 댓글)
    canDeleteComment(commentId) {
        return this.isLoggedIn;
    }
}

// 전역 관리자 시스템 인스턴스
window.AdminSystem = new AdminSystem();

// 다른 스크립트에서 사용할 수 있도록 전역 함수 제공
window.isAdmin = () => window.AdminSystem.isAdmin();
window.canDeletePost = (postId) => window.AdminSystem.canDeletePost(postId);
window.canDeleteComment = (commentId) => window.AdminSystem.canDeleteComment(commentId);