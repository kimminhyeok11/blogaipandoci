/**
 * 고급 이미지 최적화 시스템
 * WebP, AVIF 지원 및 지능형 이미지 로딩
 */

class ImageOptimizer {
    constructor() {
        this.supportedFormats = {
            avif: false,
            webp: false,
            jpeg: true,
            png: true
        };
        this.isInitialized = false;
        this.lazyLoadObserver = null;
        this.imageCache = new Map();
    }

    /**
     * 이미지 최적화 시스템 초기화
     */
    async init() {
        if (this.isInitialized) return;

        console.log('[ImageOptimizer] 이미지 최적화 시스템 초기화');
        
        // 브라우저 포맷 지원 확인
        await this.detectFormatSupport();
        
        // Lazy Loading 설정
        this.setupLazyLoading();
        
        // 기존 이미지 최적화
        this.optimizeExistingImages();
        
        // 동적 이미지 처리 설정
        this.setupDynamicImageHandling();
        
        this.isInitialized = true;
        console.log('[ImageOptimizer] 초기화 완료:', this.supportedFormats);
    }

    /**
     * 브라우저의 이미지 포맷 지원 확인
     */
    async detectFormatSupport() {
        // AVIF 지원 확인
        this.supportedFormats.avif = await this.canUseFormat('image/avif');
        
        // WebP 지원 확인
        this.supportedFormats.webp = await this.canUseFormat('image/webp');
        
        console.log('[ImageOptimizer] 지원 포맷:', this.supportedFormats);
    }

    /**
     * 특정 이미지 포맷 지원 여부 확인
     */
    canUseFormat(mimeType) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            
            try {
                const dataURL = canvas.toDataURL(mimeType);
                resolve(dataURL.indexOf(`data:${mimeType}`) === 0);
            } catch (error) {
                resolve(false);
            }
        });
    }

    /**
     * Lazy Loading 설정
     */
    setupLazyLoading() {
        if (!('IntersectionObserver' in window)) {
            console.warn('[ImageOptimizer] IntersectionObserver 미지원, 즉시 로딩');
            this.loadAllImages();
            return;
        }

        const options = {
            root: null,
            rootMargin: '50px 0px',
            threshold: 0.01
        };

        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.lazyLoadObserver.unobserve(entry.target);
                }
            });
        }, options);

        // 기존 이미지에 lazy loading 적용
        this.observeImages();
    }

    /**
     * 이미지 관찰 시작
     */
    observeImages() {
        const images = document.querySelectorAll('img[data-src], img[loading="lazy"]:not([src])');
        images.forEach(img => {
            this.lazyLoadObserver.observe(img);
        });
    }

    /**
     * 기존 이미지 최적화
     */
    optimizeExistingImages() {
        const images = document.querySelectorAll('img:not([data-optimized])');
        images.forEach(img => {
            this.optimizeImage(img);
        });
    }

    /**
     * 개별 이미지 최적화
     */
    async optimizeImage(img) {
        if (img.dataset.optimized) return;

        const originalSrc = img.src || img.dataset.src;
        if (!originalSrc) return;

        try {
            // 최적화된 URL 생성
            const optimizedSrc = await this.getOptimizedImageUrl(originalSrc);
            
            // 이미지 로드 전 placeholder 설정
            if (!img.src && img.dataset.src) {
                this.setPlaceholder(img);
            }

            // 최적화된 이미지로 교체
            if (optimizedSrc !== originalSrc) {
                await this.replaceImageSrc(img, optimizedSrc, originalSrc);
            }

            // 최적화 완료 표시
            img.dataset.optimized = 'true';
            
        } catch (error) {
            console.warn('[ImageOptimizer] 이미지 최적화 실패:', originalSrc, error);
            // 원본 이미지 사용
            if (img.dataset.src && !img.src) {
                img.src = img.dataset.src;
            }
        }
    }

    /**
     * 최적화된 이미지 URL 생성
     */
    async getOptimizedImageUrl(originalUrl) {
        // 이미 최적화된 URL인지 확인
        if (originalUrl.includes('.avif') || originalUrl.includes('.webp')) {
            return originalUrl;
        }

        // 캐시 확인
        if (this.imageCache.has(originalUrl)) {
            return this.imageCache.get(originalUrl);
        }

        let optimizedUrl = originalUrl;

        // 파일 확장자 확인
        const extension = this.getFileExtension(originalUrl);
        if (!['jpg', 'jpeg', 'png'].includes(extension.toLowerCase())) {
            return originalUrl;
        }

        // 최적 포맷 결정
        const bestFormat = this.getBestFormat();
        
        if (bestFormat !== extension) {
            // URL 변환 시도
            const testUrl = originalUrl.replace(
                new RegExp(`\\.${extension}$`, 'i'), 
                `.${bestFormat}`
            );
            
            // 최적화된 이미지 존재 여부 확인
            if (await this.imageExists(testUrl)) {
                optimizedUrl = testUrl;
            }
        }

        // 캐시에 저장
        this.imageCache.set(originalUrl, optimizedUrl);
        return optimizedUrl;
    }

    /**
     * 최적 이미지 포맷 결정
     */
    getBestFormat() {
        if (this.supportedFormats.avif) return 'avif';
        if (this.supportedFormats.webp) return 'webp';
        return 'jpg';
    }

    /**
     * 파일 확장자 추출
     */
    getFileExtension(url) {
        const match = url.match(/\.([^.?#]+)(?:\?|#|$)/);
        return match ? match[1] : '';
    }

    /**
     * 이미지 존재 여부 확인
     */
    imageExists(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
            
            // 타임아웃 설정 (2초)
            setTimeout(() => resolve(false), 2000);
        });
    }

    /**
     * 이미지 소스 교체
     */
    async replaceImageSrc(img, newSrc, fallbackSrc) {
        return new Promise((resolve, reject) => {
            const tempImg = new Image();
            
            tempImg.onload = () => {
                img.src = newSrc;
                img.dataset.originalSrc = fallbackSrc;
                resolve();
            };
            
            tempImg.onerror = () => {
                // 최적화된 이미지 로드 실패 시 원본 사용
                img.src = fallbackSrc;
                reject(new Error('최적화된 이미지 로드 실패'));
            };
            
            tempImg.src = newSrc;
        });
    }

    /**
     * 이미지 로딩 (Lazy Loading용)
     */
    async loadImage(img) {
        const src = img.dataset.src || img.src;
        if (!src) return;

        try {
            // 로딩 상태 표시
            img.classList.add('loading');
            
            // 이미지 최적화 및 로드
            await this.optimizeImage(img);
            
            // 로딩 완료
            img.classList.remove('loading');
            img.classList.add('loaded');
            
            // 페이드인 효과
            this.fadeInImage(img);
            
        } catch (error) {
            console.error('[ImageOptimizer] 이미지 로드 실패:', src, error);
            img.classList.remove('loading');
            img.classList.add('error');
        }
    }

    /**
     * 모든 이미지 즉시 로딩 (fallback)
     */
    loadAllImages() {
        const images = document.querySelectorAll('img[data-src]');
        images.forEach(img => {
            this.loadImage(img);
        });
    }

    /**
     * 플레이스홀더 설정
     */
    setPlaceholder(img) {
        // 블러 효과가 있는 저화질 플레이스홀더
        const placeholder = this.generatePlaceholder(img.width || 300, img.height || 200);
        img.src = placeholder;
        img.style.filter = 'blur(5px)';
        img.style.transition = 'filter 0.3s ease';
    }

    /**
     * 플레이스홀더 이미지 생성
     */
    generatePlaceholder(width, height) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = Math.min(width, 50);
        canvas.height = Math.min(height, 50);
        
        // 그라데이션 배경
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#f3f4f6');
        gradient.addColorStop(1, '#e5e7eb');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/jpeg', 0.1);
    }

    /**
     * 이미지 페이드인 효과
     */
    fadeInImage(img) {
        img.style.filter = 'blur(0px)';
        img.style.opacity = '0';
        
        requestAnimationFrame(() => {
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '1';
        });
    }

    /**
     * 동적 이미지 처리 설정
     */
    setupDynamicImageHandling() {
        // MutationObserver로 새로 추가되는 이미지 감지
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 새로운 이미지 요소
                        if (node.tagName === 'IMG') {
                            this.handleNewImage(node);
                        }
                        
                        // 하위 이미지 요소들
                        const images = node.querySelectorAll?.('img');
                        images?.forEach(img => this.handleNewImage(img));
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * 새로운 이미지 처리
     */
    handleNewImage(img) {
        if (img.dataset.optimized) return;

        // Lazy loading 설정
        if (!img.src && img.dataset.src) {
            this.lazyLoadObserver?.observe(img);
        } else {
            // 즉시 최적화
            this.optimizeImage(img);
        }
    }

    /**
     * 파일을 최적화된 포맷으로 변환
     */
    async convertFile(file, quality = 0.8) {
        if (!file.type.startsWith('image/')) {
            return file;
        }

        const bestFormat = this.getBestFormat();
        const targetMimeType = `image/${bestFormat}`;

        // 이미 최적 포맷인 경우
        if (file.type === targetMimeType) {
            return file;
        }

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        const baseName = file.name.replace(/\.[^/.]+$/, '');
                        const optimizedFile = new File(
                            [blob], 
                            `${baseName}.${bestFormat}`, 
                            { type: targetMimeType }
                        );
                        resolve(optimizedFile);
                    } else {
                        resolve(file);
                    }
                }, targetMimeType, quality);
            };

            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * 성능 통계 수집
     */
    getPerformanceStats() {
        return {
            supportedFormats: this.supportedFormats,
            cacheSize: this.imageCache.size,
            optimizedImages: document.querySelectorAll('img[data-optimized="true"]').length,
            lazyImages: document.querySelectorAll('img[data-src]').length
        };
    }

    /**
     * 최적화 상태 반환
     */
    getOptimizationStatus() {
        const totalImages = document.querySelectorAll('img').length;
        const optimizedImages = document.querySelectorAll('img[data-optimized="true"]').length;
        const lazyImages = document.querySelectorAll('img[loading="lazy"]').length;
        
        return {
            timestamp: new Date().toISOString(),
            totalImages,
            optimizedImages,
            lazyImages,
            optimizationRate: totalImages > 0 ? Math.round((optimizedImages / totalImages) * 100) : 0,
            supportedFormats: this.supportedFormats,
            cacheSize: this.imageCache.size,
            lazyLoadEnabled: !!this.lazyLoadObserver,
            performance: this.getPerformanceStats()
        };
    }

    /**
     * AVIF 지원 확인
     */
    checkAVIFSupport() {
        return {
            supported: this.supportedFormats.avif,
            webpSupported: this.supportedFormats.webp,
            fallbackFormats: ['jpeg', 'png'],
            recommendation: this.supportedFormats.avif ? 
                'AVIF 포맷을 사용하여 최대 50% 파일 크기 절약 가능' :
                this.supportedFormats.webp ? 
                'WebP 포맷을 사용하여 최대 30% 파일 크기 절약 가능' :
                'JPEG/PNG 포맷만 지원됨'
        };
    }

    /**
     * 정리
     */
    cleanup() {
        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.disconnect();
            this.lazyLoadObserver = null;
        }
        this.imageCache.clear();
        this.isInitialized = false;
    }
}

// 전역 노출 (즉시 실행)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageOptimizer;
} else {
    // 전역 인스턴스 생성 (강력한 보호)
    let imageOptimizer;
    
    // 더 엄격한 인스턴스 체크
    if (window.ImageOptimizer && 
        typeof window.ImageOptimizer === 'object' && 
        window.ImageOptimizer.constructor && 
        window.ImageOptimizer.constructor.name === 'ImageOptimizer' &&
        typeof window.ImageOptimizer.getOptimizationStatus === 'function') {
        // 기존 인스턴스 사용
        imageOptimizer = window.ImageOptimizer;
        console.log('=== 기존 ImageOptimizer 인스턴스 재사용 ===');
        console.log('기존 인스턴스 메서드 확인:', typeof imageOptimizer.getOptimizationStatus);
    } else {
        // 새 인스턴스 생성
        imageOptimizer = new ImageOptimizer();
        console.log('=== 새 ImageOptimizer 인스턴스 생성 ===');
        console.log('새 인스턴스 메서드 확인:', typeof imageOptimizer.getOptimizationStatus);
        
        // 인스턴스를 전역에 노출 (클래스는 별도 보관)
        window.ImageOptimizer = imageOptimizer;
        window.ImageOptimizerClass = ImageOptimizer;
        window.imageOptimizer = imageOptimizer;
        
        // 즉시 초기화 시도
        try {
            imageOptimizer.init();
            console.log('ImageOptimizer 즉시 초기화 완료');
        } catch (error) {
            console.warn('ImageOptimizer 즉시 초기화 실패:', error);
            // DOM 로드 완료 후 초기화
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    imageOptimizer.init();
                });
            } else {
                setTimeout(() => imageOptimizer.init(), 100);
            }
        }
    }
    
    console.log('=== ImageOptimizer 전역 노출 완료 ===');
    console.log('window.ImageOptimizer 타입:', typeof window.ImageOptimizer);
    console.log('window.ImageOptimizer.getOptimizationStatus 타입:', typeof window.ImageOptimizer.getOptimizationStatus);
    console.log('window.ImageOptimizer 생성자:', window.ImageOptimizer.constructor.name);
    console.log('인스턴스 확인:', window.ImageOptimizer instanceof ImageOptimizer);
    
    // 즉시 초기화 시도 (비동기)
    (async () => {
        try {
            await imageOptimizer.init();
            console.log('ImageOptimizer 즉시 초기화 완료');
        } catch (error) {
            console.warn('ImageOptimizer 즉시 초기화 실패:', error);
            // DOM 로드 완료 후 초기화
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', async () => {
                    await imageOptimizer.init();
                });
            } else {
                setTimeout(async () => await imageOptimizer.init(), 100);
            }
        }
    })();
}