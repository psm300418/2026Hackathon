# Architecture

> 문서 상태: 초안  
> 기준 문서: `docs/mainplan.md`

## 1. 목표

본 문서는 개인 피부 데이터 앱의 해커톤 MVP 구현을 위한 시스템 구조, 책임 분리, 데이터 흐름, API 방향을 정의한다.

MVP의 성공 기준은 다음 세 가지다.

- 사용자가 제품명 검색 또는 직접 입력을 통해 제품을 등록할 수 있다.
- 사용자가 제품 사용 기록과 일일 피부 상태 기록을 입력하고 저장할 수 있다.
- 사용자가 저장된 데이터를 바탕으로 분석 탭에서 AI 분석을 요청하고 결과를 확인할 수 있다.

---

## 2. 전체 구조

```text
Android App
  Kotlin + Jetpack Compose
        |
        | HTTPS + Supabase access token
        v
Backend API
  TypeScript + Node.js + Express
  Render deployment
        |
        +---- Supabase PostgreSQL
        +---- Supabase Storage
        +---- OpenAI API
        +---- MFDS cosmetic ingredient API
```

프로젝트는 해커톤 기간 동안 단일 GitHub monorepo로 관리한다.

```text
Android/   Android 앱
Backend/   Express 백엔드와 Supabase migration
docs/      기획, 구조, 보안, 백로그 문서
```

### 2.1 프로젝트 아키텍처 요약

```text
Android/
  Presentation
    Jetpack Compose Screen
    ViewModel
    UiState / UiEvent
  Domain
    UseCase
    Domain Model
  Data
    Repository
    RemoteDataSource
    DTO

Backend/
  Route
  Middleware
  Controller
  Service
  Repository
  External Gateway
  DTO / Type

Supabase/
  Auth
  PostgreSQL
  Storage
  RLS Policy
```

Android는 화면 상태와 사용자 입력을 관리하고, Backend는 인증 검증, 데이터 저장, 외부 API, AI 분석을 담당한다. 분석의 원천 데이터는 DB에 저장된 사용자 기록이며, AI는 그 기록을 해석하고 설명하는 계층으로 둔다.

---

## 3. 기술 스택

- Android 프론트엔드: Kotlin + Jetpack Compose
- 백엔드: TypeScript + Node.js + Express
- 데이터베이스: Supabase PostgreSQL
- 이미지 저장: Supabase Storage
- 인증: Supabase Auth, 백엔드에서 사용자 JWT 검증
- AI 연동: OpenAI API, 백엔드 서버에서 호출
- 성분 데이터 연동: MFDS 화장품 원료성분정보 API
- 제품 데이터: 앱 자체 공용 제품 DB
- 백엔드 배포: Render
- Android 배포: APK 빌드 후 GitHub Release 업로드

---

## 4. 책임 분리

### Android

- 회원가입, 로그인, 로그아웃 화면
- 초기 피부 설문 화면
- 제품 검색 및 등록 화면
- 루틴 등록 및 제품 사용 기록 화면
- 일일 피부 상태 기록 화면
- 피부 사진 선택 또는 촬영 및 업로드 요청
- 분석 탭 화면
- AI 분석 결과 표시
- 제품 성분표 사진 제출 및 AI 추출 결과 확인 화면

Android 앱에는 OpenAI API key, Supabase service role key, 외부 데이터 API key를 저장하지 않는다.

Android 내부 구조는 기능 단위 package와 MVVM 패턴을 기본으로 한다.

### Backend

- Supabase access token 검증
- 사용자별 데이터 접근 제어
- 제품 검색 요청 처리
- 자체 공용 제품 DB 검색
- 제품 성분표 사진 기반 AI 텍스트 추출
- 사용자가 확인한 제품 제출을 공용 제품 DB에 `community` 상태로 등록
- MFDS 화장품 원료성분정보 API 기반 성분 마스터 정규화
- 제품, 사용 기록, 피부 기록 저장 및 조회
- Supabase Storage 업로드 경로 또는 업로드 요청 처리
- 분석 요청 시 사용자 기록 집계
- AI 분석 프롬프트 구성 및 OpenAI API 호출
- 분석 결과 저장 및 반환

Backend 내부 구조는 Layered Architecture를 기본으로 한다. HTTP 처리는 controller에서 끝내고, 핵심 로직은 service, DB 접근은 repository, 외부 API 호출은 gateway로 분리한다.

### Supabase

- Supabase Auth: 사용자 인증
- PostgreSQL: 사용자 기록과 제품, 성분, 분석 결과 저장
- Storage: 피부 사진 파일 저장
- RLS: 사용자 소유 데이터 보호

### Deployment

- Backend는 Render에 배포한다.
- Backend 환경 변수는 Render dashboard에서 관리한다.
- Android 앱은 release APK를 생성해 GitHub Release에 업로드한다.
- APK에는 Backend Render URL과 Supabase anon key만 포함할 수 있다.
- OpenAI API key, Supabase service role key, 외부 API key는 APK에 포함하지 않는다.

---

## 5. 디자인 패턴

### 5.1 Android 공통 패턴

| 영역 | 패턴 | 적용 방식 |
| --- | --- | --- |
| 화면 상태 | MVVM | Compose 화면은 `ViewModel`의 `UiState`를 구독한다. |
| 상태 흐름 | Unidirectional Data Flow | UI event는 ViewModel로 전달하고, ViewModel은 새로운 UiState를 노출한다. |
| 데이터 접근 | Repository Pattern | 화면은 API client를 직접 호출하지 않고 repository/use case를 통해 데이터를 가져온다. |
| 기능 분리 | Feature-based Package | `auth`, `products`, `records`, `analysis`처럼 기능 단위로 나눈다. |
| 비동기 처리 | Coroutine + Flow | 네트워크 요청과 상태 변경은 coroutine, Flow/StateFlow 기반으로 처리한다. |
| 화면 이동 | Navigation Pattern | Jetpack Navigation Compose를 사용해 화면 route를 관리한다. |

권장 구조:

```text
Android/app/src/main/java/{package}/
  core/
    network/
    designsystem/
    storage/
  feature/
    auth/
    products/
    records/
    analysis/
  domain/
    model/
    usecase/
  data/
    remote/
    repository/
    dto/
```

### 5.2 Backend 공통 패턴

| 영역 | 패턴 | 적용 방식 |
| --- | --- | --- |
| HTTP 진입점 | Router Pattern | endpoint별 route 파일을 둔다. |
| 요청 처리 | Controller Pattern | request/response 변환과 status code 처리를 담당한다. |
| 비즈니스 로직 | Service Layer | 제품 검색, 기록 저장, 분석 실행 같은 use case를 처리한다. |
| DB 접근 | Repository Pattern | Supabase query는 repository에 모은다. |
| 인증 | Middleware Pattern | JWT 검증을 공통 middleware로 처리한다. |
| 외부 연동 | Gateway/Adapter Pattern | OpenAI API, MFDS API 호출을 gateway로 감싼다. |
| 검증 | DTO Validation | request body와 query parameter를 controller 진입 전에 검증한다. |
| 오류 처리 | Central Error Handler | 공통 error middleware에서 API 오류 형식을 통일한다. |

권장 구조:

```text
Backend/src/
  config/
  routes/
  controllers/
  services/
  repositories/
  middlewares/
  gateways/
  types/
  utils/
  modules/
    auth/
    products/
    records/
    analysis/
```

### 5.3 기능별 적용 패턴

| 기능 | Android 패턴 | Backend 패턴 | 비고 |
| --- | --- | --- | --- |
| 인증 | MVVM + Repository | Auth middleware | Android는 Supabase Auth로 로그인하고 Backend는 JWT를 검증한다. |
| 제품 검색 | MVVM + UseCase + Repository | Controller + Service + Repository | 자체 공용 제품 DB를 검색한다. |
| 제품 제출 | MVVM + UseCase + Repository | Product Submission Service + OpenAI Gateway + Repository | 성분표 사진에서 AI가 텍스트를 추출하고 사용자가 확인한 뒤 community 제품으로 저장한다. |
| 제품 등록 | MVVM + Repository | Service + Repository | 검색 결과에서 선택한 제품을 사용자 제품으로 저장한다. |
| 사용 기록 | MVVM + Repository | Service + Repository | 사용 제품/루틴과 사용 시각을 저장한다. |
| 피부 기록 | MVVM + Repository | Service + Repository | 피부 상태 점수, 생활 요인, 메모를 저장한다. |
| 사진 저장 | MVVM + Repository | Service + Storage Gateway | 사진은 Supabase Storage, DB는 메타데이터만 저장한다. |
| AI 분석 | MVVM + Repository | Analysis Service + Repository + OpenAI Gateway | Backend가 기록을 집계하고 AI는 설명을 생성한다. |
| 분석 결과 조회 | MVVM + Repository | Service + Repository | 저장된 분석 결과를 다시 조회한다. |

### 5.4 AI 분석 패턴

AI 분석은 다음 두 단계를 분리한다.

1. Evidence Aggregation
   - Backend service가 사용자 기록을 조회한다.
   - 제품 노출 횟수, 성분 노출 횟수, 피부 변화 발생 횟수, 무반응 사례, 생활 요인 중첩을 계산한다.
   - 이 단계는 재현 가능한 규칙 기반 로직으로 작성한다.

2. AI Explanation
   - OpenAI API는 집계된 근거를 사용자 친화적인 설명으로 바꾼다.
   - 긍정적 의심 성분 후보 최대 5가지와 부정적 의심 성분 후보 최대 5가지를 생성한다.
   - 데이터가 부족하면 낮은 신뢰도와 추가 기록 필요를 설명한다.
   - 원인 확정, 진단, 치료 지시는 생성하지 않는다.

AI가 DB에 없는 사실을 만들지 않도록, prompt에는 원본 개인정보가 아니라 집계된 근거 데이터와 허용된 출력 형식을 전달한다.

---

## 6. 주요 흐름

### 6.1 인증 흐름

1. 사용자는 Android 앱에서 Supabase Auth로 회원가입 또는 로그인한다.
2. Android 앱은 Supabase access token을 보관한다.
3. Backend API 호출 시 `Authorization: Bearer <token>` 헤더를 포함한다.
4. Backend는 토큰을 검증하고 사용자 ID를 확인한다.
5. Backend는 확인된 사용자 ID 기준으로만 데이터를 조회하거나 저장한다.

### 6.2 제품 등록 흐름

1. 사용자가 제품명을 검색한다.
2. Android 앱이 Backend의 제품 검색 API를 호출한다.
3. Backend는 먼저 자체 DB에서 제품을 검색한다.
4. 자체 DB 검색 결과가 있으면 사용자는 해당 제품을 선택해 등록한다.
5. 자체 DB에 없거나 성분 정보가 부족하면 사용자는 제품명, 브랜드, 제품 종류, 성분표 사진을 제출한다.
6. Backend는 성분표 사진을 OpenAI API에 전달해 텍스트와 성분 후보를 추출한다.
7. Backend는 추출된 성분 후보를 MFDS 성분 마스터와 매칭한다.
8. Android 앱은 추출 결과를 사용자에게 보여주고, 사용자는 결과를 확인하거나 수정한다.
9. 사용자가 최종 확인하면 Backend는 제품을 `community` 상태로 공용 제품 DB에 저장한다.
10. 이후 다른 사용자는 제품명 검색으로 해당 제품을 찾을 수 있다.

성분표 사진 원본은 추출 요청에만 사용하고 저장하지 않는다.

### 6.3 기록 저장 흐름

1. 사용자는 제품 또는 루틴을 선택해 사용 기록을 저장한다.
2. 사용자는 건조함, 유분, 붉음, 트러블 등 피부 상태를 기록한다.
3. 필요한 경우 수면 상태, 스트레스 수준, 특이사항을 함께 기록한다.
4. 필요한 경우 피부 사진을 업로드하고, 사진 메타데이터를 피부 기록과 연결한다.
5. Backend는 모든 기록을 사용자 ID와 함께 Supabase PostgreSQL에 저장한다.

### 6.4 AI 분석 흐름

1. 사용자가 분석 탭에서 분석을 요청한다.
2. Backend는 해당 사용자의 제품, 성분, 사용 기록, 피부 기록, 생활 요인을 조회한다.
3. Backend는 반복 반응, 무반응 사례, 시간 차이, 생활 요인 중첩을 요약한다.
4. Backend는 요약된 근거 데이터를 OpenAI API에 전달한다.
5. AI는 긍정적 의심 성분 후보 최대 5가지와 부정적 의심 성분 후보 최대 5가지를 근거와 함께 설명한다.
6. 기록이 부족하면 결과에 `데이터 부족` 또는 낮은 신뢰도를 명확히 표시한다.
7. Backend는 분석 결과를 저장하고 Android 앱에 반환한다.

AI는 원인 확정, 질환 진단, 치료 지시를 하지 않는다.

---

## 7. 데이터 저장 방향

주요 엔티티는 다음과 같다.

- `profiles`
- `products`
- `product_submissions`
- `ingredients`
- `product_ingredients`
- `user_products`
- `routines`
- `routine_products`
- `usage_logs`
- `skin_logs`
- `skin_photos`
- `analysis_runs`
- `analysis_findings`

자세한 스키마는 `docs/data-model.md`와 Supabase migration에서 관리한다.

### 7.1 외부 데이터 역할

```text
MFDS 화장품 원료성분정보
        ↓
Ingredient Master DB
        ↓
제품 전성분과 표준 성분 매칭
        ↓
사용자 제품 사용 기록
        ↓
AI 분석
```

MFDS API는 성분 사전 역할을 담당한다. 특정 제품의 전성분을 보장해서 가져오는 제품 DB API로 사용하지 않는다.

```text
제품 검색
  1. 우리 DB에서 먼저 검색
  2. 없거나 성분 정보가 부족하면 사용자가 제품명과 성분표 사진 제출
  3. AI가 성분표 텍스트와 성분 후보 추출
  4. 사용자가 추출 결과 검토/수정
  5. community 제품으로 공용 DB 등록

성분 정규화
  1. MFDS 원료성분정보와 매칭
  2. 표준 성분명으로 저장
  3. 분석은 표준화된 ingredients 기준으로 수행
```

### 7.2 실제 API 확인 결과

MFDS 화장품 원료성분정보:

- endpoint: `https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01`
- response: JSON 가능
- 확인된 전체 건수: 약 21,862건
- 주요 필드: `INGR_KOR_NAME`, `INGR_ENG_NAME`, `CAS_NO`, `ORIGIN_MAJOR_KOR_NAME`, `INGR_SYNONYM`
- 성분명 직접 검색 파라미터는 안정적이지 않아, 우리 DB 캐싱 후 자체 검색을 우선한다.

제품 성분표 사진:

- 외부 바코드 기반 제품 조회는 한국 화장품 커버리지가 부족해 MVP 범위에서 제외한다.
- 성분표 사진은 OpenAI API를 통한 텍스트 추출에만 사용한다.
- 성분표 사진 원본은 Supabase Storage나 DB에 저장하지 않는다.
- AI 추출 결과는 사용자의 최종 확인/수정 후 저장한다.
- 추출된 성분 중 MFDS 성분 마스터와 매칭되지 않는 항목은 `unmatched`로 저장한다.

---

## 8. API 방향

초기 API는 `docs/api.md`를 기준으로 한다.

필수 API 그룹은 다음과 같다.

- Auth token 검증 middleware
- Product search/register API
- Usage log API
- Skin log API
- Photo upload metadata API
- Analysis run/result API

---

## 9. 개발 우선순위

1. Supabase Auth 연결
2. Backend 기본 Express 서버와 인증 middleware
3. 제품 검색 및 등록 API
4. 제품 사용 기록 저장 API
5. 피부 상태 기록 저장 API
6. 분석 요청 API
7. Android 화면 연결
8. AI 분석 결과 화면 표시
