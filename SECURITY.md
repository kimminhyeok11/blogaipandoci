# 法 BLOG 보안 가이드

## 🔐 2단계: 보안 설정 요약

### 적용된 보안 조치

#### 1. RLS (Row Level Security) 정책
- **posts 테이블**: 작성자만 수정/삭제 가능, 비로그인 사용자는 발행된 글만 조회
- **users 테이블**: 본인 프로필만 수정 가능, 모든 사용자 조회 가능
- **images 테이블**: 본인 이미지만 삭제 가능, 업로드는 인증된 사용자만
- **tags/post_tags**: 읽기는 모두 가능, 쓰기는 인증된 사용자만

#### 2. 인증 흐름
- Supabase Auth 사용 (JWT 기반)
- 이메일/비밀번호 인증
- 자동 토큰 갱신
- 비밀번호 재설정 지원

#### 3. 입력 검증
- 파일 업로드: WebP 변환, 크기 제한 (1MB), 이미지 타입만 허용
- 슬러그: URL-safe 문자만 허용, 길이 제한 (200자)
- 콘텐츠: XSS 방지를 위한 마크다운 처리

#### 4. Storage 보안
- `images` 버킷: public 읽기, 인증된 사용자만 쓰기
- 파일 경로: 타임스탬프 + 랜덤 문자열 (예측 불가)

### 취약점 대응

| 위협 | 대응책 |
|------|--------|
| SQL Injection | Supabase ORM 사용, 파라미터화된 쿼리 |
| XSS | 마크다운 렌더링 시 이스케이프 처리 |
| CSRF | SameSite 쿠키, JWT 토큰 기반 인증 |
| IDOR | RLS 정책으로 본인 데이터만 접근 |
| 파일 업로드 | MIME 타입 검증, WebP 변환, 크기 제한 |

### 환경 변수 보안
- `.env` 파일은 `.gitignore`에 포함됨
- 클라이언트에 노출되는 키는 `NEXT_PUBLIC_` prefix 사용
- 서버 전용 키는 prefix 없이 사용 (Service Role Key 등)

### 권장 추가 설정
1. **Rate Limiting**: Supabase 제한 또는 Cloudflare 사용
2. **2FA**: 중요한 계정에 이중 인증 추가
3. **Audit Log**: 중요 작업 로깅
4. **HTTPS 강제**: 모든 통신 TLS 암호화
