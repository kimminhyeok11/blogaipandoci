# 블로그 웹 애플리케이션

현대적이고 반응형인 블로그 웹 애플리케이션입니다. Editor.js를 사용한 리치 텍스트 에디터와 Supabase를 백엔드로 사용합니다.

## 🚀 주요 기능

- **리치 텍스트 에디터**: Editor.js 기반의 블록 에디터
- **반응형 디자인**: 모든 디바이스에서 최적화된 사용자 경험
- **실시간 데이터베이스**: Supabase를 통한 실시간 데이터 동기화
- **모던 UI/UX**: 깔끔하고 직관적인 사용자 인터페이스
- **다크 모드 지원**: 사용자 선호도에 따른 테마 전환
- **모바일 최적화**: 터치 친화적인 모바일 인터페이스

## 🛠️ 기술 스택

### 프론트엔드
- **HTML5**: 시맨틱 마크업
- **CSS3**: 모듈화된 스타일시트
- **JavaScript (ES6+)**: 모던 자바스크립트
- **Editor.js**: 블록 기반 리치 텍스트 에디터

### 백엔드 & 데이터베이스
- **Supabase**: 백엔드 서비스 및 PostgreSQL 데이터베이스
- **실시간 구독**: 실시간 데이터 업데이트

### 개발 도구
- **Serve**: 로컬 개발 서버
- **Highlight.js**: 코드 하이라이팅

## 📁 프로젝트 구조

```
7878/
├── css/                    # 스타일시트 모듈
│   ├── base.css           # 기본 스타일 및 CSS 변수
│   ├── layout.css         # 레이아웃 및 그리드 시스템
│   ├── buttons.css        # 버튼 컴포넌트 스타일
│   ├── forms.css          # 폼 요소 스타일
│   ├── modal.css          # 모달 컴포넌트 스타일
│   ├── toast.css          # 토스트 알림 스타일
│   ├── loader.css         # 로딩 상태 스타일
│   ├── skeleton.css       # 스켈레톤 로더 스타일
│   ├── error.css          # 에러 처리 UI 스타일
│   └── main.css           # 메인 CSS 파일 (모든 모듈 임포트)
├── js/                     # JavaScript 모듈
│   ├── config/            # 설정 파일
│   ├── components/        # UI 컴포넌트
│   ├── services/          # 서비스 레이어
│   ├── utils/             # 유틸리티 함수
│   └── main.js            # 메인 JavaScript 파일
├── index.html             # 메인 HTML 파일
├── style.css              # 레거시 스타일 (점진적 마이그레이션)
└── README.md              # 프로젝트 문서
```

## 🎨 CSS 아키텍처

### 모듈화된 CSS 구조
프로젝트는 컴포넌트 기반의 모듈화된 CSS 아키텍처를 사용합니다:

- **base.css**: CSS 변수, 리셋, 기본 타이포그래피
- **layout.css**: 그리드 시스템, 컨테이너, 반응형 레이아웃
- **buttons.css**: 모든 버튼 스타일 및 상태
- **forms.css**: 폼 요소 및 입력 필드 스타일
- **modal.css**: 모달 및 오버레이 컴포넌트
- **toast.css**: 알림 및 토스트 메시지
- **loader.css**: 로딩 스피너 및 상태 표시
- **skeleton.css**: 스켈레톤 로더 애니메이션
- **error.css**: 에러 상태 및 메시지 UI

### CSS 변수 시스템
```css
:root {
  /* 색상 팔레트 */
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --accent-color: #d946ef;
  
  /* 그레이 스케일 */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  /* ... */
  
  /* 간격 시스템 */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  /* ... */
  
  /* 타이포그래피 */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  /* ... */
}
```

## 📱 반응형 디자인

### 브레이크포인트
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### 모바일 최적화 기능
- 터치 친화적인 버튼 크기 (최소 44px)
- 스와이프 제스처 지원
- 안전 영역 (노치) 대응
- 모바일 네비게이션 패턴

## 🚀 시작하기

### 필수 조건
- Node.js (v14 이상)
- 모던 웹 브라우저

### 설치 및 실행

1. **프로젝트 클론**
   ```bash
   git clone <repository-url>
   cd 7878
   ```

2. **개발 서버 실행**
   ```bash
   npx serve -l 5500 -s
   ```

3. **브라우저에서 열기**
   ```
   http://localhost:5500
   ```

### Supabase 설정

1. Supabase 프로젝트 생성
2. 환경 변수 설정:
   ```javascript
  const SUPABASE_URL = 'your-supabase-url'
  const SUPABASE_ANON_KEY = 'your-supabase-anon-key'
  ```

### 아카이브/RSS/사이트맵

- 아카이브: `/archives` 에서 월별로 발행된 글 목록을 확인할 수 있습니다.
- RSS: `/feed.xml` (또는 `/rss.xml`) — 최신 글 50개를 포함하는 RSS 2.0 피드
- 사이트맵: `/sitemap.xml` — 공개 글 기반 URL 목록

서버리스 함수가 Supabase에서 최신 데이터를 조회해 XML을 동적으로 생성합니다. Vercel 배포 시 다음 환경변수를 설정하세요:

```
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SITE_URL=https://your-site-url
```

프런트엔드에서는 `index.html`의 `window.Config`를 통해 anon 키만 사용합니다. 서비스 롤 키는 프론트에 배포하지 않습니다.

### 배포 루트와 서버리스
- 이 레포는 Vercel에서 프로젝트 루트(`/`)만 사용하도록 정리되었습니다.
- RSS/사이트맵 서버리스 함수는 루트의 `api/`에서 제공되며, 의존성은 루트 `package.json`에만 선언되어 있습니다.
- SPA 리라이트/캐시 설정은 루트의 `vercel.json` 하나를 사용합니다.

## 🎯 사용법

### 블로그 포스트 작성
1. "새 글 작성" 버튼 클릭
2. Editor.js를 사용하여 콘텐츠 작성
3. 제목, 카테고리, 태그 설정
4. "발행" 버튼으로 포스트 게시

### 에디터 기능
- **텍스트 블록**: 제목, 단락, 인용문
- **미디어 블록**: 이미지, 비디오 임베드
- **코드 블록**: 구문 하이라이팅 지원
- **리스트**: 순서 있는/없는 목록

## 🔧 개발 가이드

### CSS 스타일 추가
1. 해당 컴포넌트의 CSS 파일 수정
2. 새로운 컴포넌트의 경우 새 CSS 파일 생성
3. `main.css`에 임포트 추가

### JavaScript 모듈 추가
1. `js/` 디렉토리에 모듈 파일 생성
2. ES6 모듈 시스템 사용
3. `main.js`에서 임포트

### 반응형 스타일 작성
```css
/* 모바일 우선 접근법 */
.component {
  /* 기본 모바일 스타일 */
}

@media (min-width: 640px) {
  .component {
    /* 태블릿 스타일 */
  }
}

@media (min-width: 1024px) {
  .component {
    /* 데스크톱 스타일 */
  }
}
```

## ✅ 테스트 실행 (브라우저 스모크 테스트)

라우팅/네비 동작을 간단히 확인하는 테스트 페이지가 포함되어 있습니다.

1. 개발 서버 실행: `npx serve -l 5500 -s`
2. 브라우저에서 `http://localhost:5500/tests/routing.spec.html` 접속
3. 페이지에 표시되는 체크 결과(✅/❌)로 성공 여부 확인

참고: 의존성 최소화를 위해 Supabase는 테스트 내에서 스텁으로 대체됩니다.

## 📝 변경 이력 및 커밋 메시지

상세 변경 이력은 루트의 `CHANGES.md`를 확인하세요. 권장 커밋 메시지 예:

- `fix(router): prevent hide/show race when navigating to same view`
- `feat(nav): highlight active route with aria-current and font-semibold`
- `test: add browser smoke tests for routing and nav`


## 🎨 디자인 시스템

### 색상 가이드라인
- **Primary**: 주요 액션 및 링크
- **Secondary**: 보조 정보 및 비활성 상태
- **Accent**: 강조 요소 및 알림
- **Gray Scale**: 텍스트 및 배경

### 타이포그래피
- **Heading**: 제목 및 섹션 헤더
- **Body**: 본문 텍스트
- **Caption**: 보조 정보 및 메타데이터

### 간격 시스템
8px 기반의 일관된 간격 시스템을 사용합니다.

## 🔍 성능 최적화

### CSS 최적화
- 모듈화된 CSS로 필요한 스타일만 로드
- CSS 변수를 통한 일관된 디자인 시스템
- 미디어 쿼리 최적화

### JavaScript 최적화
- ES6 모듈을 통한 코드 분할
- 지연 로딩 및 동적 임포트
- 이벤트 위임 패턴 사용

## 🛡️ 접근성

### 웹 접근성 준수
- 시맨틱 HTML 사용
- ARIA 레이블 및 역할 정의
- 키보드 네비게이션 지원
- 색상 대비 준수 (WCAG 2.1 AA)

### 모션 접근성
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 📊 브라우저 지원

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## 🤝 기여하기

1. Fork 프로젝트
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해 주세요.

---

**Made with ❤️ by [Your Name]**