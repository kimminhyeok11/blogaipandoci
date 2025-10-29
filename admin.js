/**
 * [Module: Admin]
 * 관리자(글쓰기/대시보드) 전용 기능 모듈.
 * 메인 스크립트(index.html)에서 동적으로 import 됩니다.
 * * @param {object} App - 메인 App 객체
 * @param {object} ViewRenderer - 메인 ViewRenderer 객체
 * @param {object} DOM - 메인 DOM 헬퍼 객체
 * @param {object} Services - 메인 Services (Supabase) 객체
 * @param {object} State - 메인 State 객체
 * @param {object} Config - 메인 Config 객체
 * @param {object} Router - 메인 Router 객체
 */
export default (App, ViewRenderer, DOM, Services, State, Config, Router) => {

    /**
     * [ADMIN] 대시보드 뷰 렌더링
     */
    ViewRenderer.renderDashboard = async (container) => {
        ViewRenderer.updateMetaTags({ title: '대시보드' });
        container.innerHTML = `<div class="max-w-4xl mx-auto py-8 sm:py-12"><div class="flex justify-between items-center mb-8 sm:mb-10"><h1 class="text-4xl font-black text-black tracking-tighter">대시보드</h1><a href="/writer" data-route class="px-5 py-2.5 text-sm font-bold rounded-full transition bg-[#D946EF] text-white hover:bg-[#C026D3]" aria-label="새 글 작성">새 글 작성</a></div><div id="dashboard-post-list" class="bg-transparent space-y-2 min-h-[200px] flex items-center justify-center"><div class="loader-spinner"></div></div></div>`;
        
        if (!State.user) return;
        const { data: posts, error } = await Services.getDashboardPosts(State.user.id);
        const list = DOM.$('#dashboard-post-list');
        
        if (error) {
            list.innerHTML = '<p class="text-center text-gray-400">글 목록을 불러오는 데 실패했습니다.</p>';
            return;
        }
        if (!posts?.length) {
            list.innerHTML = '<p class="text-center text-gray-400 py-10">작성한 글이 없습니다.</p>';
            return;
        }
        list.innerHTML = `<ul class="w-full" role="list">${posts.map(post => `<li class="flex justify-between items-center p-4 rounded-xl hover:bg-gray-100 transition-colors" role="listitem"><div class="flex items-center"><span class="px-3 py-1 mr-4 rounded-full text-xs font-bold text-white ${post.status === 'published' ? 'bg-[#D946EF]' : 'bg-gray-500'}">${post.status === 'published' ? '발행' : '초안'}</span><div><a href="/post/${post.slug}" data-route class="font-bold text-black hover:text-[#D946EF]" aria-label="글 보기: ${post.title}">${post.title}</a><div class="text-xs text-gray-500 mt-1">${new Date(post.created_at).toLocaleDateString('ko-KR')}</div></div></div><a href="/writer/${post.slug}" data-route class="px-4 py-2 text-xs rounded-full bg-black/5 hover:bg-black/10 text-black" aria-label="글 수정: ${post.title}">수정</a></li>`).join('')}</ul>`;
        list.classList.remove('min-h-[200px]', 'flex', 'items-center', 'justify-center');
    };

    /**
     * [ADMIN] 글 작성기 뷰 렌더링
     */
    ViewRenderer.renderWriter = async (container, slug) => {
        
        // 글 작성기 전용 스크립트 로드
        try {
             await Promise.all([
                DOM.loadScript(Config.SCRIPT_URLS.exif, 'exif-lib'),
                DOM.loadScript(Config.SCRIPT_URLS.turndown, 'turndown-lib'),
                DOM.loadScript(Config.SCRIPT_URLS.marked, 'marked-lib') // 썸네일 생성을 위해 marked도 로드
            ]);
        } catch (err) {
            console.error('글 작성기 스크립트 로드 실패:', err);
            container.innerHTML = `<p class="text-center text-red-400 py-20">에디터를 로드하는 중 오류가 발생했습니다. (스크립트 로드 실패)</p>`;
            return;
        }

        ViewRenderer.updateMetaTags({ title: slug ? '글 수정' : '새 글 작성' });

        let post = { id: null, title: '', summary: '', refined_content: '', slug: '', category: Config.CATEGORIES[0], tags: [] }; // 기본값을 빈 배열로 변경
        if (slug) {
            const { data, error } = await Services.getPostBySlug(slug);
            if (error || !data || data.author_id !== State.user.id) {
                DOM.showToast('수정 권한이 없거나 글을 찾을 수 없습니다.', true);
                Router.navigateTo('/dashboard');
                return;
            }
            post = data;
        }
        
        let currentCategories = [...Config.CATEGORIES];
        if (post.category && !currentCategories.includes(post.category)) {
            currentCategories.unshift(post.category); 
        }
        
        const categoryOpts = currentCategories.map(c => `<option value="${c}" ${post.category === c ? 'selected' : ''}>${c}</option>`).join('');
        
        // [FIX] post.tags가 배열일 경우 .join(', ')을 사용해 input 값 설정
        const tagsValue = Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || '');

        container.innerHTML = `<div class="max-w-4xl mx-auto py-8 sm:py-12">
            <form id="writer-form" class="space-y-8 sm:pb-0 pb-20" novalidate>
                <input type="hidden" id="post-id" value="${post.id || ''}"> 
                
                <div>
                    <select id="category" class="w-auto bg-gray-100 border border-gray-300 rounded-full p-2 pl-4 pr-3 text-black text-sm font-bold mb-4" required aria-label="카테고리 선택">${categoryOpts}</select>
                    <textarea id="title" class="w-full bg-transparent text-4xl font-black text-black placeholder-gray-400 focus:outline-none resize-none" rows="2" placeholder="제목을 입력하세요..." required aria-label="제목 입력" maxlength="200">${post.title || ''}</textarea>
                </div>

                <div>
                    <label for="post-slug" class="block text-lg font-bold text-black mb-3">URL 주소 (Slug)</label>
                    <input type="text" id="post-slug" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 text-black placeholder-gray-500 font-mono text-sm" placeholder="자동 생성 (영문으로 직접 수정 가능)" aria-label="URL 주소 입력" value="${post.slug || ''}">
                    <p class="text-xs text-gray-500 mt-2">이 주소는 글의 URL이 됩니다. (예: /post/my-new-post) 비워두면 제목을 기반으로 자동 생성됩니다.</p>
                </div>
                
                <div>
                    <label for="summary" class="block text-lg font-bold text-black mb-3">요약 (Summary)</label>
                    <textarea id="summary" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 text-black placeholder-gray-500" rows="3" maxlength="150" placeholder="검색 결과 및 미리보기에 표시됩니다 (150자 이내)" aria-label="요약 입력">${post.summary || ''}</textarea>
                </div>
                
                <div>
                    <label for="tags" class="block text-lg font-bold text-black mb-3">태그 (Tags)</label>
                    <input type="text" id="tags" class="w-full bg-gray-50 border border-gray-300 rounded-xl p-4 text-black placeholder-gray-500" placeholder="쉼표(,)로 구분하여 태그를 입력하세요 (예: AI, 보험, 부동산)" aria-label="태그 입력" value="${tagsValue}">
                </div>

                <div>
                    <label for="content-editor" class="block text-lg font-bold text-black mb-3">본문 (Markdown)</label>
                    <textarea id="content-editor" aria-label="본문 에디터 (마크다운)" placeholder="여기에 마크다운 형식으로 본문을 작성하세요...">${post.refined_content || ''}</textarea>
                </div>
                
                <div class="flex justify-between items-center pt-8 sm:pt-5 writer-controls-sticky">
                    <div class="flex items-center gap-3">
                        <button type="button" data-action="upload-image" class="px-4 py-2 text-xs sm:text-sm font-bold rounded-full bg-gray-200 text-black hover:bg-gray-300 transition" aria-label="이미지 업로드">이미지 업로드</button>
                        <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener" class="px-4 py-2 text-xs sm:text-sm font-bold rounded-full bg-gray-100 text-black hover:bg-gray-200 transition" aria-label="마크다운 안내">마크다운 안내</a>
                    </div>
                    <div class="flex items-center space-x-3">
                        <button type="submit" data-action="save-draft" class="px-5 py-2.5 text-sm font-bold rounded-full bg-gray-200 text-black hover:bg-gray-300 transition">초안 저장</button>
                        <button type="submit" data-action="publish" class="px-6 py-2.5 text-sm font-bold rounded-full transition bg-[#D946EF] text-white hover:bg-[#C026D3]">발행하기</button>
                        ${post.id ? `<button type="button" data-action="delete" class="ml-4 px-5 py-2.5 text-sm font-bold rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition" aria-label="글 삭제">삭제</button>` : ''}
                    </div>
                </div>
            </form>
        </div>`;
        
        // 스크립트가 로드되었으므로, 이벤트를 안전하게 바인딩
        ViewRenderer._bindWriterEvents(post);
    };
    
    /**
     * [ADMIN] 글 작성기 이벤트 바인딩
     */
    ViewRenderer._bindWriterEvents = (post) => {
        const form = DOM.$('#writer-form');
        if (!form) return;

        form.onsubmit = (e) => {
            e.preventDefault();
            if (!ViewRenderer._validateForm()) return;
            if (e.submitter?.dataset.action) App.handlePostSave(e.submitter.dataset.action, e.submitter);
        };

        const delBtn = form.querySelector('[data-action="delete"]');
        if (delBtn) delBtn.onclick = (e) => { e.preventDefault(); App.handlePostDelete(post.id); };
        
        const uploadBtn = form.querySelector('[data-action="upload-image"]');
        if (uploadBtn) uploadBtn.onclick = (e) => { 
            e.preventDefault(); 
            App.handleImageUpload(e.target); 
        };

        const contentEditor = form.querySelector('#content-editor');
        if (contentEditor) {
            contentEditor.addEventListener('paste', App.handlePaste);
        }
        
        const titleEl = DOM.$('#title');
        const slugEl = DOM.$('#post-slug');
        
        if (titleEl && slugEl) {
            const originalSlug = slugEl.value; 

            const generateSlugFromTitle = () => {
                return titleEl.value.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '') 
                    .replace(/[\s_-]+/g, '-') 
                    .replace(/^-+|-+$/g, '');
            };
            
            titleEl.oninput = DOM.debounce(() => {
                if (slugEl.dataset.manual !== 'true') { 
                    slugEl.value = generateSlugFromTitle();
                }
            }, 300);

            slugEl.oninput = () => {
                slugEl.dataset.manual = 'true';
                slugEl.value = slugEl.value.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                
                if (slugEl.value.trim() === '') {
                    delete slugEl.dataset.manual; 
                }
            };

            if (originalSlug) {
                slugEl.dataset.manual = 'true';
            }
        }
    };

    /**
     * [ADMIN] 글 작성기 폼 유효성 검사
     */
    ViewRenderer._validateForm = () => {
        const title = DOM.$('#title')?.value.trim();
        const content = DOM.$('#content-editor')?.value.trim();
        const cat = DOM.$('#category')?.value;
        if (!title) { DOM.showToast('제목은 필수 항목입니다.', true); DOM.$('#title')?.focus(); return false; }
        if (!cat) { DOM.showToast('카테고리를 선택해주세요.', true); DOM.$('#category')?.focus(); return false; }
        if (!content) { DOM.showToast('본문은 필수 항목입니다.', true); DOM.$('#content-editor')?.focus(); return false; }
        return true;
    };

    /**
     * [ADMIN] 글 저장/발행 핸들러
     */
    App.handlePostSave = async (action, btn) => {
        if (typeof marked === 'undefined') {
            DOM.showToast('라이브러리 로딩 중입니다. 잠시 후 다시 시도하세요.', true);
            return;
        }

        const origText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto"></div>`;
        
        try {
            const title = DOM.$('#title').value.trim();
            const status = action === 'publish' ? 'published' : 'draft';
            const content = DOM.$('#content-editor').value; 
            
            if (!content || content.trim().length < 10) {
                throw new Error('본문이 너무 짧습니다.');
            }
            
            let summary = DOM.$('#summary').value.trim();
            if (!summary) {
                const plainText = content.replace(/!\[.*?\]\(.*?\)/g, '') 
                                      .replace(/\[.*?\]\(.*?\)/g, '$1') 
                                      .replace(/#{1,6}\s/g, '') 
                                      .replace(/[*_`~>|]/g, '') 
                                      .replace(/\s+/g, ' ') 
                                      .trim();
                summary = plainText.slice(0, 150) + (plainText.length > 150 ? '...' : '');
            }
            
            let thumb = null;
            const contentForThumb = content
                .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
                .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n')
                .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n'); 
                
            const parsedForThumb = marked.parse(contentForThumb);
            const temp = document.createElement('div'); 
            temp.innerHTML = parsedForThumb;
            thumb = temp.querySelector('img')?.src || null;
            
            const id = DOM.$('#post-id').value || null;
            
            let slug = DOM.$('#post-slug').value.trim();
            if (!slug) {
                slug = title.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');
            }
            
            if (!id) { 
                const { data } = await Services.checkSlugExists(slug);
                if (data) slug += `-${Date.now().toString().slice(-6)}`;
            }
            
            // [BUG FIX] 쉼표로 구분된 태그 문자열을 배열로 변환
            const tagsValue = DOM.$('#tags').value.trim();
            const tagsArray = tagsValue 
                ? tagsValue.split(',').map(t => t.trim()).filter(Boolean) // 쉼표로 자르고, 공백 제거, 빈 값 제거
                : null; // 빈 문자열이면 null로 저장

            const postData = { 
                id: id,
                title, slug, status, summary, 
                author_id: State.user.id, 
                refined_content: content, 
                category: DOM.$('#category').value, 
                thumbnail_url: thumb,
                tags: tagsArray, // [FIX] 배열로 변환된 값
                updated_at: new Date().toISOString() 
            };
            
            const { data: savedPost, error } = await Services.savePost(postData);
            if (error) throw error;
            
            DOM.showToast(status === 'published' ? '발행되었습니다!' : '저장되었습니다.');
            Router.navigateTo(status === 'published' ? `/post/${savedPost.slug}` : '/dashboard');

        } catch (e) {
            console.error("Save error:", e);
            DOM.showToast(`저장 실패: ${e.message}`, true);
        } finally {
            btn.disabled = false;
            btn.textContent = origText;
        }
    };

    /**
     * [ADMIN] 글 삭제 핸들러
     */
    App.handlePostDelete = async (id) => {
        if (!id) return;
        const confirm = await ViewRenderer.showDeleteConfirmModal('정말 삭제하시겠습니까? 되돌릴 수 없습니다.');
        if (!confirm) return;
        
        DOM.showToast('삭제 중...');
        const { error } = await Services.deletePost(id);
        if (error) {
            DOM.showToast(`삭제 실패: ${error.message}`, true);
        } else {
            DOM.showToast('삭제되었습니다.');
            Router.navigateTo('/dashboard');
        }
    };

    /**
     * [ADMIN] 붙여넣기 핸들러 (HTML -> Markdown)
     */
    App.handlePaste = (e) => {
        if (typeof TurndownService === 'undefined') {
            DOM.showToast('붙여넣기 기능 로딩 중... 일반 텍스트로 붙여넣습니다.', true);
            return;
        }

        const textarea = DOM.$('#content-editor');
        if (!textarea) return;
        
        e.preventDefault(); 

        const clipboardData = e.clipboardData;
        const pastedTextPlain = clipboardData.getData('text/plain');
        const pastedTextHtml = clipboardData.getData('text/html');

        let contentToInsert = pastedTextPlain; 
        let restOfText = '';

        const jsonBlobRegex = /^({[\s\S]*?})([\s\S]*)/m;
        const match = pastedTextPlain.match(jsonBlobRegex);

        if (match && match[1]) {
            const jsonString = match[1].trim();
            restOfText = match[2] ? match[2].trim() : '';

            try {
                const schema = JSON.parse(jsonString);
                if (schema['@context'] && schema['@context'].includes('schema.org')) {
                    if (schema.headline) DOM.$('#title').value = schema.headline;
                    if (schema.description) DOM.$('#summary').value = schema.description;
                    
                    const keywords = schema.keywords; 
                    if (keywords) {
                        if (Array.isArray(keywords)) {
                            DOM.$('#tags').value = keywords.join(', ');
                        } else if (typeof keywords === 'string') {
                            DOM.$('#tags').value = keywords;
                        }
                    }

                    const categorySource = schema.articleSection || (Array.isArray(schema.keywords) ? schema.keywords[0] : null);
                    if (categorySource) {
                        const matchedCategory = Config.CATEGORIES.find(c => c.toLowerCase() === categorySource.toLowerCase().trim());
                        if (matchedCategory) DOM.$('#category').value = matchedCategory;
                    }
                    
                    contentToInsert = restOfText; 
                    DOM.showToast('JSON-LD 스키마를 감지하여 필드를 자동 완성했습니다.', false);
                }
            } catch (err) {
                console.warn('Pasted content start failed to parse as JSON.', err);
            }
        } 
        
        if (!match || (match && contentToInsert === pastedTextPlain)) { 
            if (pastedTextHtml && typeof TurndownService !== 'undefined') {
                try {
                    if (!window.turndownService) {
                        window.turndownService = new TurndownService({
                            headingStyle: 'atx',
                            codeBlockStyle: 'fenced',
                            bulletListMarker: '*',
                            emDelimiter: '_',
                        });
                        
                        window.turndownService.keep(function (node) {
                            const nodeName = node.nodeName.toLowerCase();
                            if (node.hasAttribute('style')) {
                                return true;
                            }
                            return ['u', 's'].includes(nodeName); 
                        });

                        window.turndownService.addRule('listItemFix', {
                            filter: 'li',
                            replacement: function (content, node, options) {
                                let originalContent = content; 
                                content = content
                                    .replace(/^\n+/, '') 
                                    .replace(/\n+$/, '\n') 
                                    .replace(/\n/gm, '\n    '); 

                                const childNodes = node.childNodes;
                                if (childNodes.length === 1 && childNodes[0].nodeName.toLowerCase() === 'p') {
                                    content = childNodes[0].innerHTML.trim();
                                } else {
                                    content = content.trim().replace(/^<p>/i, '').replace(/<\/p>$/i, '').trim();
                                    if(content === '' && /<p>/.test(originalContent)) {
                                        content = originalContent
                                            .replace(/^\n+/, '') 
                                            .replace(/\n+$/, '\n')
                                            .replace(/\n/gm, '\n    ');
                                    }
                                    content = content.replace(/<\/p>\s*<p>/gi, '\n\n    '); 
                                    content = content.replace(/<p>|<\/p>/gi, '');
                                }
                                
                                let prefix = options.bulletListMarker + '   '; 
                                let parent = node.parentNode;
                                
                                while(parent && parent.nodeName.toLowerCase() !== 'ul' && parent.nodeName.toLowerCase() !== 'ol') {
                                    parent = parent.parentNode;
                                }

                                if (parent && parent.nodeName.toLowerCase() === 'ol') {
                                    let start = parent.getAttribute('start');
                                    let index = Array.prototype.indexOf.call(parent.children, node);
                                    prefix = (start ? Number(start) + index : index + 1) + '.  '; 
                                }
                                
                                return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
                            }
                        });
                    }
                    
                    contentToInsert = window.turndownService.turndown(pastedTextHtml);
                    contentToInsert = `\n${contentToInsert}\n`;
                    DOM.showToast('HTML을 마크다운(리스트 수정)으로 변환했습니다.', false);
                    
                } catch (err) {
                    console.warn('HTML to Markdown conversion failed. Falling back to plain text.', err);
                    contentToInsert = pastedTextPlain; 
                }
            } else {
                contentToInsert = pastedTextPlain;
            }
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + contentToInsert + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + contentToInsert.length;
        textarea.focus();
    };

    /**
     * [ADMIN] 이미지 업로드 핸들러
     */
    App.handleImageUpload = async (btn) => {
        if (typeof EXIF === 'undefined') {
            DOM.showToast('이미지 처리 라이브러리 로딩 중... 잠시 후 다시 시도하세요.', true);
            return;
        }

        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*';
        input.click();
        
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const origText = btn.textContent;
            btn.disabled = true; btn.textContent = '업로드 중...';
            DOM.showToast('이미지 업로드 중...');

            try {
                const fileToUpload = await App.convertToWebP(file);
                const url = await Services.uploadImage(fileToUpload);
                
                const textarea = DOM.$('#content-editor');
                if (textarea) {
                    const markdownImage = `\n![이미지 설명](${url})\n`;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.substring(0, start) + markdownImage + textarea.value.substring(end);
                    
                    const newCursorPos = start + markdownImage.indexOf(']') - 4;
                    textarea.selectionStart = newCursorPos;
                    textarea.selectionEnd = newCursorPos + 6;
                    textarea.focus();
                }

                DOM.showToast('업로드 완료!', false);
            } catch (e) {
                console.error('Upload failed:', e);
                DOM.showToast(`이미지 업로드 실패: ${e.message}`, true);
            } finally {
                btn.disabled = false; btn.textContent = origText;
            }
        };
    };

    /**
     * [ADMIN] 이미지 EXIF Orientation (회전) 처리
     */
    App.getOrientation = (file) => new Promise((res) => {
        if (typeof EXIF === 'undefined') { 
            console.warn('EXIF.js not loaded. Assuming orientation 1.');
            res(1); 
            return; 
        }
        EXIF.getData(file, function() { 
            res(EXIF.getTag(this, 'Orientation') || 1);
        });
    });

    /**
     * [ADMIN] 이미지 WebP 변환 및 리사이징
     */
    App.convertToWebP = (file, quality = 0.8) => new Promise((res) => {
        if (typeof FileReader === 'undefined' || typeof Image === 'undefined' || typeof EXIF === 'undefined') {
            console.warn('WebP 변환 API 미지원. 원본 파일 사용.');
            res(file);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            const img = new Image(); 
            img.src = e.target.result;
            img.onload = async () => {
                const orient = await App.getOrientation(file); 
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let w = img.width, h = img.height;
                
                // [Optional] 이미지 리사이징 (예: 최대 너비 1200px)
                const MAX_WIDTH = 1200;
                if (w > MAX_WIDTH) {
                    h = (h * MAX_WIDTH) / w;
                    w = MAX_WIDTH;
                }

                if (orient >= 5 && orient <= 8) { [w, h] = [h, w]; }
                canvas.width = w; canvas.height = h;
                const transforms = {2: [-1,0,0,1,w,0], 3: [-1,0,0,-1,w,h], 4: [1,0,0,-1,0,h], 5: [0,1,1,0,0,0], 6: [0,1,-1,0,h,0], 7: [0,-1,-1,0,h,w], 8: [0,-1,1,0,0,w]};
                ctx.transform(...(transforms[orient] || [1,0,0,1,0,0]));
                
                // 리사이징된 너비/높이로 그리기
                if (orient >= 5 && orient <= 8) {
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, h, w);
                } else {
                    ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, w, h);
                }
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        let baseName = 'image';
                        if (file.name) {
                            const parts = file.name.split('.');
                            if (parts.length > 1) {
                                baseName = parts.slice(0, -1).join('.');
                            } else {
                                baseName = file.name;
                            }
                        }
                        const sanitizedBaseName = baseName.replace(/[^\w-]/g, '_') || 'image';
                        const webpFile = new File([blob], `${sanitizedBaseName}.webp`, { type: 'image/webp' });
                        res(webpFile);
                    } else {
                         res(file);
                    }
                }, 'image/webp', quality);
            };
            img.onerror = () => res(file);
        };
        reader.onerror = () => res(file);
    });
};

