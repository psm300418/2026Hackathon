# 개인 피부 데이터 프로토타입

개인 피부 데이터 앱을 위한 해커톤 프로토타입입니다.

해커톤 기간 동안 Android, 백엔드, 데이터베이스 스키마, 공통 API 문서를 함께 발전시킬 수 있도록 프로젝트를 모노레포로 구성합니다.

## 구조

```text
Android/   Kotlin + Jetpack Compose 앱
Backend/   TypeScript + Node.js + Express API 서버
docs/      공통 API, 아키텍처, 데이터 모델 문서
```

## 개발 방향

* Android는 사용자 플로우, 로컬 UI 상태, 사진 촬영/업로드 플로우, API 호출을 담당합니다.
* Backend는 OpenAI 호출, 외부 화장품/건강기능식품 API 연동, Supabase 접근, 분석 규칙을 담당합니다.
* Supabase PostgreSQL에는 사용자 정보, 제품, 성분, 사용 기록, 피부 기록, 분석 결과를 저장합니다.
* 사용자가 업로드한 피부 사진은 Supabase Storage에 저장합니다.

## 저장소 전략

해커톤 기간에는 하나의 GitHub 저장소를 사용합니다.
프로젝트 규모가 커질 경우 `Android/`와 `Backend/`의 경계가 이미 명확하게 구분되어 있으므로 추후 별도의 저장소로 분리할 수 있습니다.

## 협업 방식

짧게 유지되는 기능 브랜치와 Pull Request를 사용하는 GitHub Flow 방식을 사용합니다.

* `main` 브랜치에서 새로운 브랜치를 생성합니다.
* 모든 변경사항에 대해 PR을 생성합니다.
* `Squash and merge` 방식을 권장합니다.
* `.env` 파일이나 실제 API 키는 절대 커밋하지 않습니다.

자세한 내용은 `docs/git-workflow.md`를 참고하세요.
코드 컨벤션과 커밋 메시지 규칙은 `docs/conventions.md`를 참고하세요.

## 개발 방법

Backend:

```bash
cd Backend
npm install
npm run dev
```

Android:

```bash
cd Android
./gradlew :app:assembleDebug
```

Windows에서는:

```powershell
cd Android
.\gradlew.bat :app:assembleDebug
```