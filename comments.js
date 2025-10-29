// Comments 모듈 - Supabase 기반 댓글 시스템
const Comments = {
    // 댓글 시스템 초기화 여부
    isInitialized: false,
    
    // 현재 포스트 ID
    currentPostId: null,
    
    // 댓글 목록
    comments: [],
    
    // 초기화
    init(postId) {
        if (!window.supabase) {
            console.warn('[Comments] Supabase가 초기화되지 않았습니다.');
            return;
        }
        
        this.currentPostId = postId;
        this.isInitialized = true;
        
        console.log('[Comments] 초기화 완료, 포스트 ID:', postId);
        
        // 댓글 로드
        this.loadComments();
        
        // 실시간 구독 설정
        this.setupRealtimeSubscription();
    },
    
    // 댓글 목록 로드
    async loadComments() {
        if (!this.isInitialized || !this.currentPostId) return;
        
        try {
            const { data, error } = await window.supabase
                .from('comments')
                .select(`
                    id,
                    content,
                    author_name,
                    author_email,
                    created_at,
                    parent_id,
                    is_approved
                `)
                .eq('post_id', this.currentPostId)
                .eq('is_approved', true)
                .order('created_at', { ascending: true });
            
            if (error) {
                console.error('[Comments] 댓글 로드 오류:', error);
                return;
            }
            
            this.comments = data || [];
            this.renderComments();
            
            console.log('[Comments] 댓글 로드 완료:', this.comments.length + '개');
            
        } catch (error) {
            console.error('[Comments] 댓글 로드 중 오류:', error);
        }
    },
    
    // 댓글 추가
    async addComment(content, authorName, authorEmail, parentId = null) {
        if (!this.isInitialized || !this.currentPostId) return false;
        
        if (!content.trim() || !authorName.trim() || !authorEmail.trim()) {
            this.showMessage('모든 필드를 입력해주세요.', 'error');
            return false;
        }
        
        // 이메일 형식 검증
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(authorEmail)) {
            this.showMessage('올바른 이메일 주소를 입력해주세요.', 'error');
            return false;
        }
        
        try {
            const { data, error } = await window.supabase
                .from('comments')
                .insert([{
                    post_id: this.currentPostId,
                    content: content.trim(),
                    author_name: authorName.trim(),
                    author_email: authorEmail.trim(),
                    parent_id: parentId,
                    is_approved: false // 관리자 승인 필요
                }])
                .select();
            
            if (error) {
                console.error('[Comments] 댓글 추가 오류:', error);
                this.showMessage('댓글 추가 중 오류가 발생했습니다.', 'error');
                return false;
            }
            
            this.showMessage('댓글이 추가되었습니다. 관리자 승인 후 표시됩니다.', 'success');
            this.clearCommentForm();
            
            // Analytics 추적
            if (typeof Analytics !== 'undefined') {
                Analytics.trackCustomEvent('comment_submit', {
                    post_id: this.currentPostId,
                    is_reply: !!parentId
                });
            }
            
            console.log('[Comments] 댓글 추가 완료:', data);
            return true;
            
        } catch (error) {
            console.error('[Comments] 댓글 추가 중 오류:', error);
            this.showMessage('댓글 추가 중 오류가 발생했습니다.', 'error');
            return false;
        }
    },
    
    // 댓글 삭제 (관리자용)
    async deleteComment(commentId) {
        if (!this.isInitialized) return false;
        
        try {
            const { error } = await window.supabase
                .from('comments')
                .delete()
                .eq('id', commentId);
            
            if (error) {
                console.error('[Comments] 댓글 삭제 오류:', error);
                return false;
            }
            
            console.log('[Comments] 댓글 삭제 완료:', commentId);
            return true;
            
        } catch (error) {
            console.error('[Comments] 댓글 삭제 중 오류:', error);
            return false;
        }
    },
    
    // 댓글 승인 (관리자용)
    async approveComment(commentId) {
        if (!this.isInitialized) return false;
        
        try {
            const { error } = await window.supabase
                .from('comments')
                .update({ is_approved: true })
                .eq('id', commentId);
            
            if (error) {
                console.error('[Comments] 댓글 승인 오류:', error);
                return false;
            }
            
            console.log('[Comments] 댓글 승인 완료:', commentId);
            return true;
            
        } catch (error) {
            console.error('[Comments] 댓글 승인 중 오류:', error);
            return false;
        }
    },
    
    // 댓글 렌더링
    renderComments() {
        const container = document.getElementById('comments-container');
        if (!container) return;
        
        if (this.comments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!</p>
                </div>
            `;
            return;
        }
        
        // 댓글을 계층 구조로 정리
        const commentTree = this.buildCommentTree(this.comments);
        
        const commentsHTML = commentTree.map(comment => this.renderComment(comment)).join('');
        
        container.innerHTML = `
            <div class="space-y-6">
                ${commentsHTML}
            </div>
        `;
    },
    
    // 댓글 트리 구조 생성
    buildCommentTree(comments) {
        const commentMap = new Map();
        const rootComments = [];
        
        // 모든 댓글을 맵에 저장
        comments.forEach(comment => {
            comment.replies = [];
            commentMap.set(comment.id, comment);
        });
        
        // 부모-자식 관계 설정
        comments.forEach(comment => {
            if (comment.parent_id) {
                const parent = commentMap.get(comment.parent_id);
                if (parent) {
                    parent.replies.push(comment);
                } else {
                    rootComments.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });
        
        return rootComments;
    },
    
    // 개별 댓글 렌더링
    renderComment(comment, depth = 0) {
        const marginLeft = depth > 0 ? 'ml-8' : '';
        const borderLeft = depth > 0 ? 'border-l-2 border-gray-200 pl-4' : '';
        
        const repliesHTML = comment.replies
            .map(reply => this.renderComment(reply, depth + 1))
            .join('');
        
        return `
            <div class="comment ${marginLeft} ${borderLeft}" data-comment-id="${comment.id}">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                ${comment.author_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p class="font-medium text-gray-900 dark:text-white">${this.escapeHtml(comment.author_name)}</p>
                                <p class="text-sm text-gray-500">${this.formatDate(comment.created_at)}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button onclick="Comments.showReplyForm('${comment.id}')" 
                                    class="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                답글
                            </button>
                            ${window.isAdmin && window.isAdmin() ? `<button onclick="Comments.deleteComment('${comment.id}')" class="text-sm text-red-600 hover:text-red-800" title="댓글 삭제">🗑️</button>` : ''}
                        </div>
                    </div>
                    <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${this.escapeHtml(comment.content)}</div>
                    
                    <div id="reply-form-${comment.id}" class="reply-form mt-4 hidden">
                        ${this.createReplyForm(comment.id)}
                    </div>
                </div>
                
                ${repliesHTML ? `<div class="mt-4">${repliesHTML}</div>` : ''}
            </div>
        `;
    },
    
    // 댓글 폼 생성
    createCommentForm() {
        return `
            <div id="comment-form" class="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">댓글 작성</h3>
                
                <div class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="comment-author" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                이름 *
                            </label>
                            <input type="text" id="comment-author" 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                   placeholder="이름을 입력하세요">
                        </div>
                        <div>
                            <label for="comment-email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                이메일 *
                            </label>
                            <input type="email" id="comment-email" 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                   placeholder="이메일을 입력하세요">
                        </div>
                    </div>
                    
                    <div>
                        <label for="comment-content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            댓글 *
                        </label>
                        <textarea id="comment-content" rows="4" 
                                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                  placeholder="댓글을 입력하세요..."></textarea>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <p class="text-sm text-gray-500">
                            * 필수 항목입니다. 댓글은 관리자 승인 후 표시됩니다.
                        </p>
                        <button onclick="Comments.submitComment()" 
                                class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            댓글 작성
                        </button>
                    </div>
                </div>
                
                <div id="comment-message" class="mt-4 hidden"></div>
            </div>
        `;
    },
    
    // 답글 폼 생성
    createReplyForm(parentId) {
        return `
            <div class="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                <h4 class="text-md font-medium mb-3 text-gray-900 dark:text-white">답글 작성</h4>
                
                <div class="space-y-3">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" id="reply-author-${parentId}" 
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                               placeholder="이름">
                        <input type="email" id="reply-email-${parentId}" 
                               class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                               placeholder="이메일">
                    </div>
                    
                    <textarea id="reply-content-${parentId}" rows="3" 
                              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                              placeholder="답글을 입력하세요..."></textarea>
                    
                    <div class="flex items-center space-x-2">
                        <button onclick="Comments.submitReply('${parentId}')" 
                                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors">
                            답글 작성
                        </button>
                        <button onclick="Comments.hideReplyForm('${parentId}')" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm transition-colors">
                            취소
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // 댓글 제출
    async submitComment() {
        const author = document.getElementById('comment-author')?.value || '';
        const email = document.getElementById('comment-email')?.value || '';
        const content = document.getElementById('comment-content')?.value || '';
        
        await this.addComment(content, author, email);
    },
    
    // 답글 제출
    async submitReply(parentId) {
        const author = document.getElementById(`reply-author-${parentId}`)?.value || '';
        const email = document.getElementById(`reply-email-${parentId}`)?.value || '';
        const content = document.getElementById(`reply-content-${parentId}`)?.value || '';
        
        const success = await this.addComment(content, author, email, parentId);
        if (success) {
            this.hideReplyForm(parentId);
        }
    },
    
    // 답글 폼 표시
    showReplyForm(commentId) {
        // 다른 답글 폼들 숨기기
        document.querySelectorAll('.reply-form').forEach(form => {
            form.classList.add('hidden');
        });
        
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.classList.remove('hidden');
        }
    },
    
    // 답글 폼 숨기기
    hideReplyForm(commentId) {
        const replyForm = document.getElementById(`reply-form-${commentId}`);
        if (replyForm) {
            replyForm.classList.add('hidden');
        }
    },
    
    // 댓글 폼 초기화
    clearCommentForm() {
        const fields = ['comment-author', 'comment-email', 'comment-content'];
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
    },
    
    // 메시지 표시
    showMessage(message, type = 'info') {
        const messageEl = document.getElementById('comment-message');
        if (!messageEl) return;
        
        const bgColor = type === 'error' ? 'bg-red-100 text-red-700 border-red-300' : 
                       type === 'success' ? 'bg-green-100 text-green-700 border-green-300' : 
                       'bg-blue-100 text-blue-700 border-blue-300';
        
        messageEl.innerHTML = `
            <div class="p-3 rounded-md border ${bgColor}">
                ${message}
            </div>
        `;
        messageEl.classList.remove('hidden');
        
        // 3초 후 메시지 숨기기
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 3000);
    },
    
    // 실시간 구독 설정
    setupRealtimeSubscription() {
        if (!window.supabase || !this.currentPostId) return;
        
        const subscription = window.supabase
            .channel(`comments-${this.currentPostId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'comments',
                filter: `post_id=eq.${this.currentPostId}`
            }, (payload) => {
                console.log('[Comments] 실시간 업데이트:', payload);
                
                // 승인된 댓글만 실시간 업데이트
                if (payload.new && payload.new.is_approved) {
                    this.loadComments();
                }
            })
            .subscribe();
        
        console.log('[Comments] 실시간 구독 설정 완료');
    },
    
    // 댓글 시스템 HTML 생성
    createCommentsSection() {
        return `
            <div id="comments-section" class="mt-12 border-t border-gray-200 dark:border-gray-700 pt-8">
                <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    댓글 <span id="comment-count" class="text-lg font-normal text-gray-500">(${this.comments.length})</span>
                </h2>
                
                ${this.createCommentForm()}
                
                <div id="comments-container" class="mt-8">
                    <!-- 댓글 목록이 여기에 렌더링됩니다 -->
                </div>
            </div>
        `;
    },
    
    // 유틸리티 함수들
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        if (diffDays < 7) return `${diffDays}일 전`;
        
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};