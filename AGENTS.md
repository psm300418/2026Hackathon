# AGENTS

이 파일은 Codex가 이 프로젝트에서 작업할 때 따를 기준이다.

## 1. 프로젝트 방향

본 프로젝트는 해커톤용 개인 피부 데이터 앱 프로토타입이다.

핵심 목표:

- 사용자가 제품을 등록할 수 있다.
- 사용자가 제품 사용 기록과 피부 상태 기록을 저장할 수 있다.
- 저장된 데이터를 바탕으로 AI 분석을 받을 수 있다.

서비스는 의료 진단, 치료, 원인 확정을 제공하지 않는다. 분석 결과는 사용자 기록을 바탕으로 관련 가능성이 있는 제품, 성분, 생활 요인을 근거와 함께 좁혀주는 방식으로 표현한다.

## 2. 문서 참조 순서

작업 전에 필요한 범위의 문서를 확인한다.

1. `docs/mainplan.md`
2. `docs/architecture.md`
3. `docs/design.md`
4. `docs/security.md`
5. `docs/git-workflow.md`
6. `docs/conventions.md`
7. `docs/backlog.md`
8. `docs/api.md`
9. `docs/data-model.md`

화면 UX 작업은 `docs/design.md`를 따른다.

코드 작성 전에는 작업과 직접 관련된 `docs/` 문서를 반드시 확인한다. API, DB, 보안, Git, 컨벤션 중 하나라도 영향을 받는 작업이면 해당 문서를 먼저 읽고, 구현과 문서가 어긋나면 문서를 함께 수정한다.

## 3. 기술 스택

- Android: Kotlin + Jetpack Compose
- Backend: TypeScript + Node.js + Express
- DB: Supabase PostgreSQL
- Storage: Supabase Storage
- Auth: Supabase Auth
- AI: OpenAI API, Backend에서만 호출

## 4. 저장소 구조

```text
Android/   Android 앱
Backend/   Express 백엔드와 Supabase migration
docs/      프로젝트 문서
```

해커톤 기간에는 monorepo 구조를 유지한다.

## 5. 보안 규칙

- Android 앱에 OpenAI API key, Supabase service role key, 외부 API key를 넣지 않는다.
- 보호 API는 Supabase access token을 검증해야 한다.
- 사용자 ID는 클라이언트 입력값으로 신뢰하지 않는다.
- 피부 사진은 Supabase Storage에 저장하고 DB에는 메타데이터만 저장한다.
- AI 요청에는 필요한 최소 데이터만 포함한다.
- `.env` 파일은 커밋하지 않는다.

## 6. AI 분석 표현 규칙

AI 분석 결과는 다음을 지켜야 한다.

- 추천 성분 후보는 최대 5가지로 제한한다.
- 피해야 할 성분 후보는 최대 5가지로 제한한다.
- 각 후보에는 근거를 함께 표시한다.
- 근거 수준은 강함, 중간, 약함, 데이터 부족 중 하나로 표현한다.
- 데이터가 부족하면 신뢰도가 낮다는 점을 명확히 안내한다.
- 특정 성분이나 제품을 원인으로 확정하지 않는다.
- 피부 질환 진단, 치료 방법, 의약품 사용 지시를 제공하지 않는다.

## 7. 개발 규칙

- 기존 문서와 구조를 우선 따른다.
- 범위가 애매하면 MVP 성공 기준에 직접 필요한 작업을 우선한다.
- Backend 비즈니스 로직은 route, controller, service, repository 책임을 분리한다.
- Supabase schema 변경은 `Backend/supabase/migrations`에 둔다.
- Android 화면은 기능 단위로 나누고, API DTO와 UI 상태를 섞지 않는다.
- TypeScript에서 `any` 타입은 금지한다. 외부 입력은 `unknown` 또는 구체 타입으로 받고 검증 후 사용한다.
- 불가피하게 `any`가 필요한 경우 아주 좁은 범위로 제한하고, 코드 근처에 이유를 남긴다.
- 해커톤 속도를 위해 과한 추상화는 피한다.
- Git 협업은 `docs/git-workflow.md`의 GitHub Flow 전략을 따른다.
- 코드 스타일, 네이밍, 커밋 메시지는 `docs/conventions.md`를 따른다.
- `main` 브랜치에 직접 push하지 않고 PR로 병합한다.

## 8. 완료 보고

작업 완료 시 다음을 간단히 보고한다.

- 수정한 파일
- 구현 또는 문서화한 내용
- 실행한 검증
- 남은 리스크 또는 다음 작업
