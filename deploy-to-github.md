# GitHub 배포 가이드

## Git 설치 후 실행할 명령어들

### 1. Git 저장소 초기화
```bash
git init
```

### 2. 모든 파일 추가
```bash
git add .
```

### 3. 첫 번째 커밋
```bash
git commit -m "블로그 초기 배포"
```

### 4. GitHub 저장소 연결 (GitHub에서 저장소 생성 후)
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
```

### 5. GitHub에 푸시
```bash
git push -u origin main
```

## GitHub Pages 설정

1. GitHub 저장소 → Settings
2. Pages 섹션으로 이동
3. Source: "Deploy from a branch" 선택
4. Branch: "main" 선택, 폴더: "/ (root)" 선택
5. Save 클릭

## 업데이트 시 사용할 명령어들

```bash
git add .
git commit -m "블로그 업데이트"
git push origin main
```

## 주의사항

- `index.html`이 메인 파일이므로 GitHub Pages에서 자동으로 인식됩니다
- 배포 후 몇 분 정도 기다려야 사이트가 업데이트됩니다
- 사이트 주소: `https://YOUR_USERNAME.github.io/YOUR_REPOSITORY`