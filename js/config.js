// 애플리케이션 설정 (기본값). 기존 window.Config 값을 덮어쓰지 않고 병합합니다.
(function(){
    const defaults = {
        SUPABASE_URL: 'https://ddehwkwzmmvcxltlplua.supabase.co',
        // 기본 키는 예시 값입니다. 실제 키가 window.Config에 이미 있다면 그 값을 유지합니다.
        SUPABASE_ANON_KEY: 'PLACEHOLDER_REPLACE_WITH_REAL_KEY',
        DB_TABLE_NAME: 'posts',
        IMAGE_BUCKET_NAME: 'thought-images',
        SITE_URL: 'https://blogaipandoci.vercel.app',
        CATEGORIES: ['AI', '기술', '보험', '일상', '기타'],
        POSTS_PER_PAGE: 10,
        MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
        ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    };
    const existing = (typeof window !== 'undefined' && window.Config) ? window.Config : {};
    // 기존 값을 우선으로 유지하고, 누락된 키만 기본값으로 채우기
    const merged = Object.assign({}, defaults, existing);
    if (typeof window !== 'undefined') {
        window.Config = merged;
    }
})();