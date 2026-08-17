# Git Workflow

> 문서 상태: 초안  
> 협업 방식: GitHub Flow, PR 중심 단순 병합 전략

## 1. 기본 원칙

이 프로젝트는 해커톤 기간 동안 2명이 빠르게 협업하기 위해 GitHub Flow를 사용한다.

- `main` 브랜치는 항상 실행 가능한 상태를 유지한다.
- 모든 작업은 `main`에서 기능 브랜치를 만들어 진행한다.
- `main`으로 직접 push하지 않는다.
- 병합은 Pull Request를 통해 진행한다.
- PR은 작게 유지하고, 하나의 PR은 하나의 목적만 가진다.
- 비밀키, API key, DB key, `.env` 파일은 절대 커밋하지 않는다.

---

## 2. 브랜치 구조

```text
main
  feat/android-login
  feat/backend-auth
  feat/product-search
  feat/analysis-api
  fix/skin-log-save
  docs/update-architecture
```

### 브랜치 이름 규칙

```text
type/scope-summary
```

권장 type:

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 동작 변경 없는 구조 개선
- `chore`: 설정, 의존성, 기타 작업
- `test`: 테스트 추가 또는 수정

예시:

```text
feat/backend-product-search
feat/android-analysis-tab
docs/git-workflow
fix/auth-token-verify
```

---

## 3. PR 규칙

PR을 만들기 전에 확인한다.

- 최신 `main`에서 브랜치를 만들었는가?
- 작업 범위가 하나의 목적에 집중되어 있는가?
- 관련 문서를 확인했는가?
- `.env`, API key, DB key, 개인 token이 포함되지 않았는가?
- 최소한의 실행 또는 빌드 검증을 했는가?

PR 설명에는 다음을 포함한다.

- 변경 요약
- 테스트 또는 검증 결과
- 관련 문서 또는 이슈
- 남은 리스크

---

## 4. 병합 전략

기본 병합 방식은 `Squash and merge`를 권장한다.

이유:

- 해커톤 중 작은 시행착오 commit이 많아져도 `main` 히스토리를 단순하게 유지할 수 있다.
- 기능 단위로 되돌리기 쉽다.
- PR 하나가 하나의 변경 단위로 남는다.

단, 여러 commit의 맥락이 의미 있는 경우에는 일반 merge를 사용할 수 있다.

---

## 5. 2인 협업 규칙

작업을 시작하기 전에 서로 담당 영역을 짧게 공유한다.

권장 분담:

- Android 담당: 화면, ViewModel, API client, 사용자 흐름
- Backend 담당: Express API, Supabase schema, OpenAI 연동, 외부 API 연동

충돌이 잦을 수 있는 파일은 동시에 수정하지 않는다.

- `docs/api.md`
- `docs/data-model.md`
- Supabase migration
- 공통 DTO
- Android navigation
- Backend route index

공통 계약을 바꾸는 작업은 먼저 PR 설명이나 문서에 남긴다.

---

## 6. 바이브 코딩 협업 규칙

두 명 모두 AI 도구를 사용해 개발할 수 있으므로 다음 규칙을 지킨다.

- AI에게 작업을 맡기기 전에 관련 문서를 먼저 읽게 한다.
- AI가 생성한 코드는 PR 작성자가 직접 검토한다.
- 큰 범위의 자동 수정은 피하고, 기능 단위로 작게 요청한다.
- 보안키와 `.env` 파일 내용을 AI prompt나 PR에 붙이지 않는다.
- AI가 만든 API 응답 형식, DB 필드명, route 이름은 `docs/api.md`, `docs/data-model.md`와 맞는지 확인한다.
- AI가 임의로 의료 진단, 치료, 원인 확정 표현을 넣지 않았는지 확인한다.

---

## 7. 충돌 줄이는 방법

- 하루 작업 시작 전에 오늘 건드릴 파일을 공유한다.
- API 계약 변경은 먼저 `docs/api.md`를 수정하고 PR로 공유한다.
- DB schema 변경은 migration 파일 하나에 몰아서 관리한다.
- Android와 Backend가 동시에 필요한 기능은 API mock 또는 임시 response 형식을 먼저 합의한다.
- PR은 오래 열어두지 않고 작게 자주 병합한다.

---

## 8. PR 완료 조건

PR은 다음 조건을 만족해야 merge한다.

- 변경 목적이 명확하다.
- 실행 가능한 최소 검증을 완료했다.
- 비밀키가 포함되지 않았다.
- 문서와 실제 구현이 크게 어긋나지 않는다.
- AI 분석 관련 변경은 안전 표현 규칙을 지킨다.

---

## 9. 권장 Git 명령 흐름

```bash
git checkout main
git pull origin main
git checkout -b feat/backend-product-search

# 작업 후
git status
git add .
git commit -m "feat: add backend product search"
git push origin feat/backend-product-search
```

GitHub에서 PR을 만들고 리뷰 후 `Squash and merge`로 병합한다.

커밋 메시지 형식은 `docs/conventions.md`의 Conventional Commits 규칙을 따른다.
