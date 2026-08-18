# Backlog

> 문서 상태: 개발용 상세 초안  
> 기준 문서: `docs/mainplan.md`, `docs/architecture.md`, `docs/api.md`, `docs/data-model.md`, `docs/design.md`, `docs/security.md`  
> 목적: 혼자 바이브 코딩으로 MVP를 개발할 때 기능 순서가 흔들리지 않도록 풀스택 작업 단위를 정의한다.

## 1. MVP 핵심 흐름

이 프로젝트의 MVP 핵심 흐름은 다음 6단계다.

```text
1. 회원가입 / 로그인
2. 초기 설문을 통한 피부 타입 검사
3. 이전에 사용해봤던 제품 등록
4. 오늘의 피부 기록 저장
5. 저장한 기록 확인
6. 저장한 기록 기반 긍정적 의심 성분 / 부정적 의심 성분 분석
```

이 흐름이 실제 Android 앱에서 끝까지 동작하면 MVP 성공으로 본다.

## 2. 현재 준비 상태

### 완료 또는 준비됨

- Monorepo 구조: `Android/`, `Backend/`, `docs/`
- Android 기본 프로젝트
- Backend Express 서버
- `/api/health`, `/api/health/supabase`
- Supabase client 설정
- JWT auth middleware 초안
- 제품 seed 원본 문서: `docs/DB/*.md`
- 초기 피부 타입 설문 문서: `docs/DB/skin_type_question.md`
- 제품 seed 정리 스크립트: `npm run prepare:product-seed`
- 제품 seed import 스크립트: `npm run import:product-seed`
- 제품/성분 seed migration SQL
- 디자인 기준 문서: `docs/design.md`

### 완료로 간주하는 초기 작업

사용자가 T-03까지 진행했다고 했으므로, 현재 백로그에서는 아래 작업을 완료 또는 완료 직전 상태로 본다.

- T0-1 Supabase 제품 seed 테이블 생성
- T0-2 제품 seed import
- T0-3 demo 계정 또는 인증 준비

## 3. 개발 우선순위

기존 백로그는 제품 검색을 너무 앞에 두었지만, 실제 앱 경험에서는 로그인 직후 초기 피부 타입 검사가 먼저다. 따라서 앞으로는 다음 순서로 진행한다.

1. Auth + Profile
2. Initial Skin Type Survey
3. Past Product Registration
4. Daily Skin Record
5. Log History
6. Ingredient Analysis
7. Product Submission OCR
8. Deploy

성분표 사진 기반 community 제품 등록은 AI 핵심성을 보여주기 좋은 기능이지만, 기본 MVP에서는 “이전에 사용해봤던 제품을 seed DB에서 찾아 등록”하는 흐름을 먼저 완성한다.

## 4. 공통 개발 원칙

- Android에는 OpenAI key, Supabase service role key, MFDS key를 넣지 않는다.
- 초기 피부 타입 결과는 의료 진단이 아니라 기록 기준점으로 표시한다.
- 제품 분석 결과는 원인 확정이 아니라 긍정적/부정적 의심 성분 후보로 표현한다.
- TypeScript에서 `any` 타입은 금지한다.
- API/DB 계약이 바뀌면 `docs/api.md`, `docs/data-model.md`를 함께 수정한다.
- Android 화면은 `docs/design.md`의 디자인 토큰과 상태 규칙을 따른다.

## 5. Phase 0: DB Seed와 인증 준비

### T0-1. Supabase 제품 seed 테이블 생성

- 상태: 완료 또는 완료 확인 필요
- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/202608170001_create_product_seed_tables.sql`
- 완료 조건:
  - `products`, `ingredients`, `product_ingredients` 테이블 존재
  - seed 제품 읽기 가능
  - public write는 열지 않음

검증:

```sql
select count(*) from public.products;
select count(*) from public.product_ingredients;
```

### T0-2. 제품 seed import

- 상태: 완료 또는 완료 확인 필요
- 우선순위: P0
- 명령:

```bash
cd Backend
npm run prepare:product-seed
npm run import:product-seed
```

- 완료 조건:
  - `products`: 197개
  - `product_ingredients`: 6,805행

### T0-3. Demo 계정 준비

- 상태: 완료 또는 완료 확인 필요
- 우선순위: P0
- 대상: Supabase Auth
- 완료 조건:
  - 이메일 인증 없이 demo 계정으로 로그인 가능
  - 공개 문서에는 실제 비밀번호를 적지 않음

## 6. Phase 1: 회원가입 / 로그인

### T1-1. Auth middleware 최종 점검

- 우선순위: P0
- 대상:
  - `Backend/src/middlewares/auth.ts`
- 작업:
  - `Authorization: Bearer <token>` 검증
  - token 없으면 401
  - 잘못된 token이면 401
  - 검증된 user id를 request context에 저장
  - 클라이언트가 보낸 `user_id`는 신뢰하지 않음
- 완료 조건:
  - 보호 API에서 backend가 인증된 user id를 사용할 수 있음
  - `any` 없이 타입 처리

### T1-2. Profile migration 작성

- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/*_create_profiles.sql`
- 테이블:
  - `profiles`
- 필드:
  - `user_id`
  - `display_name`
  - `skin_type_code`
  - `skin_type_completed_at`
  - `created_at`
  - `updated_at`
- 완료 조건:
  - 사용자별 RLS 적용
  - 로그인 후 profile 생성 또는 조회 가능

### T1-3. Android 로그인 화면

- 우선순위: P0
- 대상:
  - `Android/.../feature/auth`
- 작업:
  - 이메일/비밀번호 로그인
  - 회원가입 최소 입력
  - Demo Login 버튼
  - 로그인 상태 저장
  - 로그아웃
- 완료 조건:
  - demo 계정으로 10초 안에 앱 진입
  - access token으로 backend 보호 API 호출 가능

## 7. Phase 2: 초기 설문을 통한 피부 타입 검사

설문 원본은 `docs/DB/skin_type_question.md`를 기준으로 한다. 이 결과는 진단이 아니라 이후 기록 분석을 위한 초기 기준점이다.

### T2-1. 피부 타입 설문 migration 작성

- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/*_create_skin_type_survey_tables.sql`
- 테이블:
  - `skin_type_questionnaires`
  - `skin_type_questions`
  - `skin_type_options`
  - `skin_type_results`
  - `skin_type_responses`
- 완료 조건:
  - 설문 문항과 선택지를 version별로 관리 가능
  - 사용자 응답과 결과는 user id로 분리
  - 사용자별 RLS 적용

### T2-2. 설문 문항 seed 작성

- 우선순위: P0
- 대상:
  - `Backend/supabase/seed`
  - 필요 시 `Backend/src/scripts/prepare-skin-type-survey.ts`
  - 필요 시 `Backend/src/scripts/import-skin-type-survey.ts`
- 작업:
  - `docs/DB/skin_type_question.md`를 구조화
  - 문항 id, dimension, option id, option text, score 분리
  - 특수 규칙 문항 표시
- 완료 조건:
  - Backend가 설문 문항을 DB 또는 정적 JSON에서 반환 가능
  - 점수표는 Android에 직접 넣지 않음

### T2-3. 피부 타입 계산 service

- 우선순위: P0
- 대상:
  - `Backend/src/services/skin-type.service.ts`
- 작업:
  - O/D, S/R, P/N, W/T 점수 계산
  - `OSNT` 같은 최종 조합 생성
  - 결과 안내 문구 생성
  - 공개 자료 기반 비공식 설문이라는 제한 안내
  - 완료 조건:
    - 응답이 부족하면 validation error
    - 결과는 의료 진단으로 표현하지 않음
    - 사용자에게는 `OSNT` 같은 내부 코드보다 `지성 경향 · 민감성 경향 · 비색소성 경향 · 탄력 유지 경향`처럼 한국어 분류 조합을 중심으로 표시

### T2-4. 초기 설문 API

- 우선순위: P0
- API:

```text
GET  /api/onboarding/skin-type/questions
POST /api/onboarding/skin-type/responses
GET  /api/onboarding/skin-type/result
```

- 완료 조건:
  - 로그인 사용자만 응답 저장 가능
  - 설문 완료 시 `profiles.skin_type_code`와 `skin_type_completed_at` 갱신
  - 이미 완료한 사용자는 결과 조회 가능

### T2-5. Android 초기 설문 화면

- 우선순위: P0
- 대상:
  - `Android/.../feature/onboarding`
- 작업:
  - 로그인 후 설문 미완료면 설문 화면으로 이동
  - 질문 하나씩 또는 섹션별 표시
  - 진행률 표시
  - 응답 저장
  - 결과 화면 표시
  - 완료 조건:
    - 설문 완료 전에는 메인 탭으로 바로 가지 않음
    - 결과 화면에 한국어 4분류 조합과 쉬운 설명 표시
    - 의료 진단이 아니라 기준점이라는 안내 표시

## 8. Phase 3: 이전에 사용해봤던 제품 등록

초기 설문 이후 사용자는 과거에 사용해본 제품을 등록한다. 이 데이터는 분석에서 참고 데이터로 사용한다.

### T3-1. 사용자 제품 migration 작성

- 상태: 완료
- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/*_create_user_products.sql`
- 테이블:
  - `user_products`
- 필드:
  - `user_id`
  - `product_id`
  - `usage_status`: `current`, `past`, `paused`
  - `started_at`
  - `is_past_experience`
  - `past_reaction_memo`
  - `memo`
- 완료 조건:
  - 사용자는 자기 제품만 조회 가능
  - 같은 사용자가 같은 제품을 다시 등록하면 새 row를 만들지 않고 기존 등록 정보를 갱신한다

### T3-2. 제품 검색 API

- 상태: 완료
- 우선순위: P0
- API:

```text
GET /api/products/search?q={query}
```

- 작업:
  - seed 제품 검색
  - 제품명, 브랜드, 카테고리 기준 검색
  - 검색어와 유사한 순으로 제품명, 브랜드, 카테고리 매칭 결과 정렬
  - 검색 결과의 전성분 목록과 원문 반환
- 완료 조건:
  - `독도`, `라운드랩`, `크림` 같은 검색어로 결과 반환
  - 검색 결과가 없더라도 이번 단계에서는 직접 등록으로 진입하지 않음

### T3-3. 사용자 제품 등록 API

- 상태: 완료
- 우선순위: P0
- API:

```text
POST /api/user-products
GET  /api/user-products
```

- 요청 예시:

```json
{
  "productId": "uuid",
  "usageStatus": "past",
  "isPastExperience": true,
  "pastReactionMemo": "예전에 사용했을 때 건조함이 줄었던 것 같음"
}
```

- 완료 조건:
  - 과거 사용 제품을 등록 가능
  - 현재 사용 제품도 등록 가능
  - 등록한 제품을 다시 조회 가능
  - `startedAt`은 T3 화면에서 입력받지 않고 null로 저장

### T3-4. Android 과거 제품 등록 화면

- 상태: 완료
- 우선순위: P0
- 작업:
  - 제품 탭에서 제품 검색
  - 제품 선택
  - 기억나는 반응 메모 입력
  - 내 제품 목록 저장
- 완료 조건:
  - 로그인 후 초기 피부 타입 설문을 완료하면 메인 탭으로 진입
  - 제품 탭에서 이전에 사용해본 제품을 등록 가능
  - 제품 이미지는 사용하지 않고 브랜드, 카테고리, 대표 전성분 중심 카드로 표시
  - Android 카드의 대표 전성분에서는 `정제수`를 제외

## 9. Phase 4: 오늘의 피부 기록 저장

오늘 기록은 하루 1개다. 피부 상태 기록이 중심이며, 오늘 사용한 제품 여러 개, 적용한 제품 프리셋, 수면 시간, 선택 얼굴 사진을 같은 저장 흐름에서 함께 기록한다.

### T4-1. 오늘 기록 migration 작성

- 우선순위: P0
- 테이블:
  - `daily_records`
  - `daily_record_products`
  - `daily_record_presets`
  - `skin_photos` 확장 또는 연결
- 완료 조건:
  - 사용자별 RLS
  - 피부 점수는 0부터 5까지
  - `user_id + record_date` 기준 하루 1개만 저장
  - 같은 날짜 기록을 다시 저장하면 기존 기록 갱신
  - 수면 시간은 0부터 24까지, 소수 1자리까지 허용
  - 얼굴 사진은 선택 입력이며 사진 없이 저장 가능

### T4-2. 제품 프리셋 API

- 우선순위: P0
- API:

```text
POST /api/product-presets
GET  /api/product-presets
```

- 작업:
  - 사용자가 자주 함께 쓰는 제품 묶음을 프리셋으로 저장
  - 사용자의 제품인지 검증
  - 오늘 기록 화면에서 프리셋 적용 시 포함 제품을 오늘 사용 제품으로 선택
- 완료 조건:
  - 프리셋 생성/조회 가능
  - 프리셋 제품 중복 저장 방지

### T4-3. 오늘 기록 API

- 우선순위: P0
- API:

```text
POST /api/daily-records
GET  /api/daily-records?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- 작업:
  - 건조함, 유분, 붉음, 트러블
  - 오늘 사용한 제품 여러 개
  - 적용한 프리셋
  - 수면 시간
  - 선택 얼굴 사진 업로드
  - 메모
- 완료 조건:
  - 하루 1개 오늘 기록 저장/갱신 가능
  - 같은 기록 안에서 오늘 사용 제품을 여러 개 저장 가능
  - 얼굴 사진 없이도 저장 가능
  - 스트레스는 T4 범위에서 제외
  - 분석에서 사용할 수 있음

### T4-4. Android 오늘 기록 화면

- 우선순위: P0
- 작업:
  - 기록 탭에서 오늘 기록 작성
  - 피부 상태 점수 입력
  - 수면 시간 입력
  - 내 제품 목록에서 오늘 사용 제품 여러 개 선택
  - 제품 프리셋 적용
  - 공용 제품 DB 검색 후 내 제품에 추가하고 바로 오늘 사용 제품으로 선택
  - 얼굴 사진 업로드 영역 표시
  - 저장 성공/실패 표시
- 완료 조건:
  - 오늘의 피부 상태, 사용 제품, 수면 시간, 선택 사진을 한 번에 저장 가능
  - 공용 제품 DB에 없는 제품의 성분표 사진 기반 직접 등록은 이 단계에서 제외하고 Phase 7로 연결

## 10. Phase 5: 저장한 기록 확인

### T5-1. 기록 조회 service 정리

- 우선순위: P0
- 작업:
  - 날짜별 사용 제품 조회
  - 날짜별 피부 상태 조회
  - 적용한 프리셋과 선택 사진 조회
  - 최근 기록 요약
- 완료 조건:
  - 분석 이전에 사용자가 본인 기록을 확인 가능

### T5-2. 기록 히스토리 API

- 우선순위: P0
- API:

```text
GET /api/daily-records?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- 완료 조건:
  - 오늘 기록, 사용 제품, 수면 시간, 선택 사진을 합쳐 반환
  - Backend는 저장된 기록만 반환하고, 기록 없는 날짜는 Android에서 empty state로 표시

### T5-3. Android 기록 확인 화면

- 우선순위: P0
- 작업:
  - 최근 기록 목록
  - 날짜별 상세
  - 오늘 사용 제품과 적용 프리셋
  - 피부 상태 점수
  - `Record` 탭 안에서 `오늘 / 기록` 전환
- 완료 조건:
  - 저장한 기록을 사용자가 앱에서 다시 확인 가능

## 11. Phase 6: 외출·날씨·환경 기록 연동

오늘 기록은 피부 상태와 사용 제품이 중심이며, T4 이후에는 외출 시간과 사용자 지역 기반 날씨 정보를 같은 기록에 연결한다.

### T6-1. user_locations migration

- 우선순위: P0
- 테이블:
  - `user_locations`
- 완료 조건:
  - 사용자별 지역명과 대표 ASOS 관측소 ID 저장
  - 사용자별 RLS
  - 정밀 GPS 좌표 저장 없이도 기상청 API 호출 가능

### T6-2. 기상청 날씨 gateway

- 우선순위: P0
- 작업:
  - 기상청 API허브 ASOS 관측 API 연동
  - 기록 저장 시점과 가장 가까운 시각의 관측값 조회
  - 기온, 습도, 강수량, 풍속 등 피부 기록에 참고할 환경 값 추출
  - Backend 환경 변수로 API key 관리
  - API 실패 시 기록 저장 흐름을 막지 않는 fallback 처리
- 완료 조건:
  - Android에 기상청 API key가 포함되지 않음
  - Backend service가 대표 관측소 ID 기준으로 날씨 스냅샷을 가져올 수 있음

### T6-3. daily_record_environment migration

- 우선순위: P0
- 테이블:
  - `daily_record_environment`
- 완료 조건:
  - 오늘 기록과 1:1 환경 스냅샷 저장
  - `source=kma`
  - 기온, 습도, 강수량, 풍속, 관측 시각 저장
  - 사용자별 RLS는 `daily_records` 소유권 기준으로 보호

### T6-4. 지역 설정 및 환경 API

- 우선순위: P0
- API:

```text
GET /api/profile/location-options
PUT /api/profile/location
GET /api/profile/location
```

- 완료 조건:
  - 사용자가 먼저 도/특별시/광역시/특별자치시/특별자치도를 선택한 뒤 해당 시/군/구를 선택해 지역을 설정하거나 변경 가능
  - 전국 도 단위와 각 도에 속한 시/군/구 선택지를 제공
  - 오늘 기록 저장 시 지역이 있으면 환경 스냅샷 자동 연결
  - 지역이 없어도 오늘 기록 저장 가능

### T6-5. Android 기록 화면 환경 영역

- 우선순위: P0
- 작업:
  - 외출 시간 입력
  - 설정된 지역과 날씨 요약 표시
  - 지역 미설정 empty state
  - 날씨 조회 실패 시 재시도 또는 안내 표시
- 완료 조건:
  - 사용자가 오늘 기록 안에서 외출 시간을 함께 저장 가능
  - 날씨 정보는 사용자가 직접 입력하지 않고 Backend에서 불러온 값으로 표시

## 12. Phase 7: 샤워용품·영양제 등록 확장

화장품 등록과 같은 흐름을 재사용한다. 사용자가 성분표, 라벨, 원료명 또는 영양정보 사진을 제출하면 AI가 텍스트를 추출하고 사용자가 확인한 뒤 공용 DB에 저장한다.

### T7-1. products item_type 확장 migration

- 우선순위: P1
- 작업:
  - `products.item_type`
  - `product_submissions.item_type`
- 완료 조건:
  - `cosmetic`, `shower_product`, `supplement` 구분 가능
  - 기존 화장품 seed 데이터는 `cosmetic`으로 유지

### T7-2. 성분표·라벨 사진 추출 API 확장

- 우선순위: P1
- API:

```text
POST /api/product-submissions/extract
```

- 완료 조건:
  - `itemType`에 따라 화장품, 샤워용품, 영양제 추출 프롬프트 분기
  - 사진 원본 저장 안 함
  - AI 추출 텍스트와 사용자 확정 텍스트만 저장

### T7-3. community 항목 확정 API 확장

- 우선순위: P1
- API:

```text
POST /api/product-submissions
```

- 완료 조건:
  - 사용자가 검토한 항목이 `community`로 저장
  - 이후 검색 결과에 항목 유형과 함께 노출
  - 영양제는 의료·복용 지시 표현 없이 원료 기록용 데이터로 저장

### T7-4. Android 제품 관리 화면 타입 탭

- 우선순위: P1
- 작업:
  - 화장품
  - 샤워용품
  - 영양제
- 완료 조건:
  - 제품 탭에서 항목 유형을 선택해 성분표 또는 라벨 사진 기반 등록 가능
  - 확정 등록 후 바로 내 제품 목록에 추가
  - 오늘 기록에서는 내 제품 목록에 추가된 항목을 바로 선택 가능

## 13. Phase 8: 피부 상태 추이 화면

### T8-1. 추이 조회 service

- 우선순위: P1
- 작업:
  - 날짜 범위별 피부 상태 점수 집계
  - 사용 제품, 수면, 외출, 날씨 스냅샷을 함께 조회
  - 데이터가 없는 날짜 empty 처리
- 완료 조건:
  - 분석 이전에도 사용자가 직접 변화 흐름을 확인 가능

### T8-2. 추이 API

- 우선순위: P1
- API:

```text
GET /api/daily-records/trends?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- 완료 조건:
  - 기간 내 모든 날짜를 그래프용 point로 반환
  - 기록이 없는 날짜는 피부 점수를 `null`로 반환
  - 건조함, 유분, 붉음, 트러블 점수와 수면, 외출, 날씨 요약을 함께 반환
  - 사용 제품은 대표 제품명 최대 3개와 나머지 개수를 반환

### T8-3. Android 추이 화면

- 우선순위: P1
- 작업:
  - `Record` 탭 안에서 `오늘 / 기록 / 추이` 전환
  - 7일, 14일, 30일 기간 선택
  - 피부 상태 변화 요약
  - 사용 제품과 환경 요인 요약
- 완료 조건:
  - 사용자가 특정 기간의 피부 상태 변화를 한눈에 확인 가능

## 14. Phase 9: 저장 기록 기반 긍정/부정 의심 성분 분석

### T9-1. 분석 migration 작성

- 우선순위: P0
- 테이블:
  - `analysis_runs`
  - `analysis_findings`
- 완료 조건:
  - `finding_type`: `positive_suspect`, `negative_suspect`
  - `evidence_level`: `strong`, `medium`, `weak`, `data_insufficient`
  - 사용자별 RLS

### T9-2. 사용자 기록 집계 service

- 우선순위: P0
- 대상:
  - `Backend/src/services/analysis-evidence.service.ts`
- 작업:
  - 과거 사용 제품과 일일 사용 기록 분리
  - 최근 30일 기록은 상세 evidence로 집계
  - 전체 기간 기록은 장기 성분 통계로 압축
  - 이전 최신 분석 요약과 후보 성분을 evidence에 포함
  - 성분 노출 횟수 계산
  - 피부 상태 변화와 함께 등장한 성분 집계
  - 긍정적 변화 후보와 부정적 변화 후보 분리
  - 수면 시간 중첩 여부 계산
  - 외출 시간, 온도, 습도, 강수 등 환경 요인 중첩 여부 계산
- 완료 조건:
  - AI 호출 전 evidence JSON 생성
  - 전체 기간 원본 기록을 AI에 그대로 전달하지 않음
  - 데이터 부족 시 limitations 포함

### T9-3. OpenAI 분석 gateway

- 우선순위: P0
- 작업:
  - 최근 30일 상세 evidence, 이전 분석 요약, 전체 기간 압축 통계만 AI에 전달
  - 긍정적 의심 성분 최대 5개
  - 부정적 의심 성분 최대 5개
  - 근거 수준과 이유 포함
  - 진단/치료/원인 확정 금지
- 완료 조건:
  - 응답 schema validation
  - 데이터 부족 시 신뢰도 낮음 안내

### T9-4. 분석 API

- 우선순위: P0
- API:

```text
POST /api/analysis/run
GET  /api/analysis/latest
GET  /api/analysis/runs/:analysisRunId
```

- 완료 조건:
  - 분석 결과 저장
  - 최근 분석 조회 가능
  - AI 실패 시 fallback 분석 제공

### T9-5. Android 분석 화면

- 우선순위: P0
- 작업:
  - 분석 탭 진입 시 최근 분석 조회
  - 분석 요청 버튼
  - 긍정적 의심 성분 카드
  - 부정적 의심 성분 카드
  - 근거 수준 배지
  - 데이터 부족 안내
  - 최근 분석 결과 표시
- 완료 조건:
  - 저장한 기록 기반 분석 결과 확인 가능
  - “원인”이 아니라 “의심 성분 후보”로 표현

## 15. Phase 10: 알림

알림은 서버 저장 없이 Android 로컬 알림으로 우선 제공한다. 사용자는 설정 탭에서 하루 한 번 오늘 기록을 남기도록 알림 시간을 설정할 수 있다.

### T10-1. 기록 알림 설정

- 우선순위: P2
- 상태: 완료
- 완료 조건:
  - 사용자가 기록 알림 시간을 설정 가능
  - 알림 미사용 상태에서도 핵심 기록 흐름이 동작

### T10-2. Android 로컬 알림

- 우선순위: P2
- 상태: 완료
- 완료 조건:
  - 권한 요청과 거부 상태 처리
  - 기록 작성 화면으로 이동
  - 기기 재부팅 후에도 켜진 알림은 다시 예약

## 16. Phase 11: Android 앱 구조와 디자인 시스템

Android 작업은 Backend API와 병렬로 일부 진행 가능하지만, 기능 연결은 API 완성 후 진행한다.

### T11-1. Android package 구조 정리

- 우선순위: P0
- 상태: 완료
- 구조:

```text
core/designsystem
core/notification
core/network
core/session
feature/auth
feature/main
feature/onboarding
feature/products
feature/records
feature/analysis
feature/settings
```

### T11-2. 디자인 토큰 적용

- 우선순위: P0
- 상태: 완료
- 기준: `docs/design.md`
- 완료 조건:
  - 색상, typography, spacing, radius token 사용
  - 공통 버튼, 입력창, 칩, 카드 컴포넌트 준비

### T11-3. Navigation shell 작성

- 우선순위: P0
- 상태: 완료
- 흐름:

```text
로그인 전
  -> Auth
로그인 후 설문 미완료
  -> Skin Type Survey
로그인 후 설문 완료
  -> Main Tabs
```

- 탭:
  - Products
  - Record
  - Analysis
  - Settings
- 하단 내비게이션은 아이콘과 라벨을 함께 표시한다.
- 홈 탭은 MVP 핵심 기능이 없어 제외한다.

## 17. Phase 12: 배포와 시연 안정화

### T12-1. Backend Render 배포

- 우선순위: P0
- 완료 조건:
  - Render URL에서 `/api/health` 성공
  - 환경 변수는 Render dashboard에서 관리

### T12-2. APK 빌드

- 우선순위: P0
- 완료 조건:
  - 실제 기기 또는 에뮬레이터에서 로그인부터 분석까지 동작

### T12-3. 시연 데이터 준비

- 우선순위: P0
- 작업:
  - demo 계정 설문 완료
  - 과거 제품 2-3개 등록
  - 일일 기록 3일치 이상 생성
  - 날씨/환경 스냅샷이 포함된 기록 1개 이상 생성
  - 분석 결과가 표시되는 데이터 구성

## 18. 권장 작업 순서

현재 완료된 T4 이후에는 아래 순서로 이어간다.

1. T1-1 Auth middleware 최종 점검
2. T1-2 Profile migration 작성
3. T1-3 Android 로그인 화면
4. T2-1 피부 타입 설문 migration 작성
5. T2-2 설문 문항 seed 작성
6. T2-3 피부 타입 계산 service
7. T2-4 초기 설문 API
8. T2-5 Android 초기 설문 화면
9. T3-1 사용자 제품 migration 작성
10. T3-2 제품 검색 API
11. T3-3 사용자 제품 등록 API
12. T3-4 Android 과거 제품 등록 화면
13. T4-1 오늘 기록 migration 작성
14. T4-2 제품 프리셋 API
15. T4-3 오늘 기록 API
16. T4-4 Android 오늘 기록 화면
17. T5-1 기록 조회 service 정리
18. T5-2 기록 히스토리 API
19. T5-3 Android 기록 확인 화면
20. T6-1 user_locations migration
21. T6-2 기상청 날씨 gateway
22. T6-3 daily_record_environment migration
23. T6-4 지역 설정 및 환경 API
24. T6-5 Android 기록 화면 환경 영역
25. T7-1 products item_type 확장 migration
26. T7-2 성분표·라벨 사진 추출 API 확장
27. T7-3 community 항목 확정 API 확장
28. T7-4 Android 제품 관리 화면 타입 탭
29. T8-1 추이 조회 service
30. T8-2 추이 API
31. T8-3 Android 추이 화면
32. T9-1 분석 migration 작성
33. T9-2 사용자 기록 집계 service
34. T9-3 OpenAI 분석 gateway
35. T9-4 분석 API
36. T9-5 Android 분석 화면
37. T10-1 기록 알림 설정
38. T10-2 Android 로컬 알림
39. T11-1 Android package 구조 정리
40. T11-2 디자인 토큰 적용
41. T11-3 Navigation shell 작성
42. T12-1 Backend Render 배포
43. T12-2 APK 빌드
44. T12-3 시연 데이터 준비

## 19. 수동 검증 체크리스트

- 회원가입 또는 demo login이 된다.
- 로그인 후 설문 미완료 사용자는 초기 피부 타입 설문으로 이동한다.
- 설문 완료 후 피부 타입 코드와 결과 안내가 저장된다.
- 이전에 사용해본 제품을 검색하고 등록할 수 있다.
- 등록한 과거 제품을 다시 조회할 수 있다.
- 오늘의 피부 기록 안에 사용 제품, 피부 상태, 수면 시간, 선택 사진을 저장할 수 있다.
- 제품 프리셋을 만들어 오늘 기록에 적용할 수 있다.
- 저장한 기록을 날짜별로 확인할 수 있다.
- 사용자 지역을 설정하면 오늘 기록에 날씨, 습도, 온도 등 환경 정보가 연결된다.
- 샤워용품과 영양제를 성분표 또는 라벨 사진 기반으로 등록할 수 있다.
- 피부 상태 추이 화면에서 기간별 변화를 확인할 수 있다.
- 분석 탭에서 긍정적 의심 성분과 부정적 의심 성분을 확인할 수 있다.
- 분석 결과는 원인 확정, 진단, 치료 표현을 사용하지 않는다.
- 데이터가 부족하면 신뢰도 낮음이 표시된다.
- 설정 탭에서 기록 알림을 켜고 끌 수 있다.
- Android 앱에 OpenAI key, Supabase service role key, MFDS key, 기상청 API key가 포함되지 않는다.

## 20. 컷라인

시간이 부족하면 반드시 살릴 것:

- 회원가입 / 로그인
- 초기 피부 타입 설문
- 과거 제품 등록
- 오늘의 피부 기록
- 저장 기록 확인
- 날씨/환경 스냅샷 연동
- 긍정적 의심 성분 / 부정적 의심 성분 분석

시간이 부족하면 미룰 것:

- 샤워용품과 영양제 등록 확장
- 피부 사진 저장
- 복잡한 루틴 관리
- MFDS 전체 자동 sync
- admin 검수
- 기록 알림
- 계정 탈퇴와 내보내기
