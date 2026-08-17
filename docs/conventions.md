# Conventions

> 문서 상태: 초안  
> 목적: 코드 작성, 네이밍, 타입, 커밋 로그 규칙을 정의한다.

## 1. 기본 원칙

- 작업 전 관련 문서를 먼저 확인한다.
- MVP 범위와 문서에 맞지 않는 기능을 임의로 추가하지 않는다.
- 코드보다 API 계약과 데이터 모델이 먼저 바뀌어야 하는 경우 `docs/api.md`, `docs/data-model.md`를 먼저 수정한다.
- 비밀키, API key, DB key, `.env` 파일은 커밋하지 않는다.
- 해커톤 속도를 위해 과한 추상화는 피하되, 인증, DB 접근, 외부 API, AI 호출은 책임을 분리한다.

---

## 2. TypeScript / Backend 컨벤션

### 구조

Backend는 가벼운 Layered Architecture를 따른다.

```text
routes -> controllers -> services -> repositories / gateways
```

- `routes`: URL과 middleware 연결
- `controllers`: HTTP request/response 처리
- `services`: 비즈니스 로직
- `repositories`: Supabase DB 접근
- `gateways`: OpenAI, 외부 화장품 API, Storage 등 외부 시스템 접근
- `middlewares`: 인증, 오류 처리, 요청 전처리

### 타입

- `any` 타입은 금지한다.
- 타입을 알 수 없는 외부 입력은 `unknown`으로 받고 검증 후 사용한다.
- request body, query parameter, 외부 API 응답은 `zod` 등으로 검증한다.
- DTO 타입과 domain/service 타입을 필요 이상으로 섞지 않는다.
- null 가능성이 있는 값은 명시적으로 처리한다.

허용 예외:

- 외부 라이브러리 타입 결함 때문에 불가피한 경우
- 아주 좁은 범위에서 type guard 또는 schema validation 직전에만 필요한 경우

예외가 필요하면 코드 근처에 짧은 이유를 남긴다.

### 네이밍

- 파일명: `kebab-case.ts`
- 변수/함수: `camelCase`
- 타입/interface/class: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- API route: 복수 명사 사용

예:

```text
products.controller.ts
analysis.service.ts
openai.gateway.ts
```

### 오류 처리

- controller에서 raw error를 그대로 응답하지 않는다.
- 공통 `ApiError`와 error middleware를 사용한다.
- 사용자에게 보여줄 수 있는 오류 메시지와 내부 로그를 구분한다.

---

## 3. Android / Kotlin 컨벤션

### 구조

Android는 MVVM, 단방향 상태 흐름, Repository Pattern을 따른다.

```text
Screen -> ViewModel -> UseCase(optional) -> Repository -> RemoteDataSource
```

- 단순 CRUD는 `ViewModel -> Repository`를 허용한다.
- 분석 요청, 제품 등록처럼 규칙이 있는 기능은 UseCase 사용을 고려한다.
- API DTO와 UI state를 섞지 않는다.

### 네이밍

- package: 소문자
- class/object/interface: `PascalCase`
- function/property: `camelCase`
- Composable 함수: `PascalCase`
- ViewModel: `{Feature}ViewModel`
- UI state: `{Feature}UiState`
- UI event: `{Feature}UiEvent`

예:

```text
ProductSearchScreen
ProductSearchViewModel
ProductSearchUiState
ProductRepository
```

### Compose

- Composable은 가능한 한 상태를 직접 소유하지 않고 state를 전달받는다.
- 화면 단위 Composable과 재사용 UI Composable을 분리한다.
- loading, empty, error, success 상태를 명시한다.
- 버튼, 입력값, 리스트 등 사용자 액션은 ViewModel event로 전달한다.

---

## 4. API / DB 컨벤션

- API 응답 형식은 `docs/api.md`를 따른다.
- 사용자 소유 데이터는 `user_id` 기준으로 분리한다.
- 클라이언트가 보낸 `user_id`를 신뢰하지 않는다.
- DB schema 변경은 `Backend/supabase/migrations`에 기록한다.
- 외부 API 응답은 내부 DTO로 정규화한 뒤 사용한다.

---

## 5. AI 분석 컨벤션

- AI에게 원본 개인정보를 불필요하게 전달하지 않는다.
- Backend에서 먼저 근거를 집계한 뒤 AI가 설명하도록 한다.
- 제품 성분표 추출에서는 사진에 없는 성분을 임의로 추가하지 않는다.
- AI가 추출한 성분은 사용자가 최종 확인한 뒤 저장한다.
- 긍정적 의심 성분 후보는 최대 5가지로 제한한다.
- 부정적 의심 성분 후보는 최대 5가지로 제한한다.
- 각 후보에는 근거를 함께 표시한다.
- 데이터가 부족하면 신뢰도 낮음과 추가 기록 필요를 명확히 안내한다.
- 질환 진단, 치료 방법, 원인 확정 표현은 금지한다.

---

## 6. 커밋 메시지 규칙

커밋 메시지는 Conventional Commits 형식을 사용한다.

```text
type(scope): summary
```

예:

```text
feat(backend): add product search endpoint
feat(android): add analysis tab shell
fix(auth): handle expired supabase token
docs(backlog): split mvp tasks
chore(android): configure gradle wrapper
```

### type

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `refactor`: 동작 변경 없는 구조 개선
- `test`: 테스트 추가 또는 수정
- `chore`: 설정, 의존성, 빌드 작업
- `style`: 포맷팅, 코드 의미 없는 스타일 변경

### scope

권장 scope:

- `android`
- `backend`
- `docs`
- `auth`
- `products`
- `records`
- `analysis`
- `supabase`
- `deploy`

### summary

- 영어 소문자 동사로 시작한다.
- 마침표를 붙이지 않는다.
- 72자 이내를 권장한다.
- 한 커밋에는 하나의 의도만 담는다.

좋은 예:

```text
feat(products): add external cosmetic api gateway
fix(analysis): show low confidence for sparse records
docs(security): document ignored secret files
```

피해야 할 예:

```text
update
fix stuff
feat: many changes
```

---

## 7. PR 전 체크리스트

- 관련 문서를 확인했는가?
- API/DB 계약 변경이 문서에 반영됐는가?
- `any` 타입을 사용하지 않았는가?
- `.env`, API key, DB key가 포함되지 않았는가?
- 최소 실행 또는 빌드 검증을 했는가?
- AI 분석 문구가 안전 표현 규칙을 지키는가?
