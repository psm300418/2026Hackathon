# Backlog

> 문서 상태: 개발용 상세 초안  
> 기준 문서: `docs/mainplan.md`, `docs/architecture.md`, `docs/api.md`, `docs/data-model.md`, `docs/design.md`, `docs/security.md`  
> 목적: 혼자 바이브 코딩으로 MVP를 개발할 때 바로 작업 단위로 사용할 수 있도록 백로그를 잘게 나눈다.

## 1. MVP 성공 기준

초기 MVP는 다음 3가지 흐름이 실제 Android APK 또는 에뮬레이터에서 끝까지 동작하면 성공으로 본다.

1. 사용자가 로그인한 뒤 제품을 검색하고, 검색 결과에서 제품을 자신의 목록에 등록할 수 있다.
2. 사용자가 제품 사용 기록과 일일 피부 상태 기록을 저장하고 다시 조회할 수 있다.
3. 사용자가 저장된 기록을 바탕으로 분석 탭에서 AI 분석을 요청하고 결과를 확인할 수 있다.

제품 DB 초기 seed, 성분표 사진 기반 제품 제출, MFDS 성분 매칭은 MVP 가치를 높이는 핵심 기능이지만, 시연 안정성을 위해 다음 순서로 구현한다.

```text
제품 seed 검색
  -> 사용자 제품 등록
  -> 제품 사용 기록
  -> 피부 상태 기록
  -> AI 분석
  -> 성분표 사진 기반 community 제품 등록
```

## 2. 현재 준비 상태

### 완료 또는 준비됨

- Monorepo 구조: `Android/`, `Backend/`, `docs/`
- Android 기본 프로젝트
- Backend Express 서버
- `/api/health`, `/api/health/supabase`
- Supabase client 설정
- JWT auth middleware 초안
- MFDS gateway 초안
- 제품 seed 원본 문서: `docs/DB/*.md`
- 제품 seed 정리 스크립트: `npm run prepare:product-seed`
- 제품 seed import 스크립트: `npm run import:product-seed`
- 제품/성분 seed migration SQL
- 디자인 기준 문서: `docs/design.md`

### 지금 막 해야 하는 수동 작업

`SUPABASE_DB_URL`이 비어 있어 migration 자동 적용은 아직 불가하다.

1. Supabase SQL Editor에서 실행:

```text
Backend/supabase/migrations/202608170001_create_product_seed_tables.sql
```

2. 테이블 생성 후 실행:

```bash
cd Backend
npm run import:product-seed
```

기대값:

- `products`: 197개
- `product_ingredients`: 6,805행

## 3. 개발 원칙

- 먼저 백엔드 API를 완성하고, Android는 API가 동작하는 흐름부터 연결한다.
- 화면은 예쁘게 만들기 전에 loading, empty, error, success 상태를 먼저 갖춘다.
- AI 기능은 반드시 백엔드에서 호출한다.
- Android에는 OpenAI key, Supabase service role key, MFDS key를 넣지 않는다.
- TypeScript에서 `any`는 금지한다.
- API/DB 계약이 바뀌면 `docs/api.md`, `docs/data-model.md`를 같이 수정한다.

## 4. Phase 개요

| Phase | 목표 | MVP 필수 |
| --- | --- | --- |
| 0 | DB seed와 개발 환경 확정 | Yes |
| 1 | Backend 제품 검색 API | Yes |
| 2 | Backend 인증과 사용자 제품 등록 | Yes |
| 3 | Backend 기록 API | Yes |
| 4 | Backend AI 분석 API | Yes |
| 5 | Android 앱 뼈대와 디자인 시스템 | Yes |
| 6 | Android 핵심 화면 연결 | Yes |
| 7 | 성분표 사진 기반 제품 제출 | High |
| 8 | 배포와 시연 안정화 | Yes |
| 9 | P1 확장 기능 | No |

## 5. Phase 0: DB Seed와 환경 확정

### T0-1. Supabase 제품 seed 테이블 생성

- 우선순위: P0
- 대상: Supabase SQL Editor
- 입력 문서: `docs/DB/product-seed-import.md`
- 작업:
  - `202608170001_create_product_seed_tables.sql` 실행
  - `products`, `ingredients`, `product_ingredients` 생성 확인
  - RLS policy 확인
- 완료 조건:
  - Supabase에서 세 테이블이 보인다.
  - anon/authenticated는 select만 가능하다.
  - service role로 insert 가능하다.
- 검증:

```sql
select count(*) from public.products;
select count(*) from public.product_ingredients;
```

### T0-2. 제품 seed import

- 우선순위: P0
- 대상: `Backend/supabase/seed`
- 작업:
  - 제품 seed 재생성
  - Supabase import 실행
- 명령:

```bash
cd Backend
npm run prepare:product-seed
npm run import:product-seed
```

- 완료 조건:
  - 제품 197개 저장
  - 제품-성분 6,805행 저장
  - 같은 명령을 다시 실행해도 중복 없이 갱신된다.

### T0-3. 개발용 demo 계정 준비

- 우선순위: P0
- 대상: Supabase Auth
- 작업:
  - 시연용 이메일/비밀번호 계정 생성
  - 이메일 인증 비활성화 확인
  - 계정 정보 공유 방식 결정
- 완료 조건:
  - Android에서 10초 안에 demo login 가능
  - README 또는 개인 메모에 demo 계정 정보가 있다.
- 주의:
  - 공개 GitHub 문서에는 실제 비밀번호를 적지 않는다.

## 6. Phase 1: Backend 제품 검색

### T1-1. 제품 검색 repository 작성

- 우선순위: P0
- 대상 파일:
  - `Backend/src/repositories/products.repository.ts`
  - 필요 시 `Backend/src/types/products.ts`
- 작업:
  - `products` 검색 함수 작성
  - 제품명, 브랜드, 카테고리 부분 검색
  - 검색어 trim, 빈 검색어 validation
  - seed/community/verified 상태 포함
  - 최대 결과 수 제한
- 완료 조건:
  - seed 제품을 검색할 수 있다.
  - 검색 결과에 `id`, `name`, `brand`, `category`, `ingredients_text`, `source`, `verification_status`가 포함된다.
- 검증:
  - repository 단위 테스트 또는 임시 script로 `독도`, `라운드랩`, `크림` 검색

### T1-2. 제품 검색 service 작성

- 우선순위: P0
- 대상 파일:
  - `Backend/src/services/products.service.ts`
- 작업:
  - 검색 결과 DTO 변환
  - `canSubmitProduct` 계산
  - 성분 정보 부족 상태 계산
  - 빈 검색어는 사용자 오류로 처리
- 완료 조건:
  - 검색 결과 없음이면 `items=[]`, `canSubmitProduct=true`
  - 검색 결과 있음이면 `canSubmitProduct`도 true로 유지해 직접 등록 흐름을 막지 않는다.

### T1-3. 제품 검색 API 연결

- 우선순위: P0
- 대상 파일:
  - `Backend/src/controllers/products.controller.ts`
  - `Backend/src/routes/products.ts`
  - `Backend/src/routes/index.ts`
- API:

```text
GET /api/products/search?q={query}
```

- 완료 조건:
  - 성공 응답은 `docs/api.md`의 `{ data: ... }` 형식
  - 오류 응답은 공통 error handler 사용
  - 검색어가 없으면 400
- 검증:

```bash
cd Backend
npm run typecheck
npm test
```

수동:

```bash
curl "http://localhost:3000/api/products/search?q=독도"
```

## 7. Phase 2: Backend 인증과 사용자 제품 등록

### T2-1. 사용자 관련 migration 작성

- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/*_create_user_product_tables.sql`
- 테이블:
  - `profiles`
  - `user_products`
- 작업:
  - `user_id uuid not null`
  - `product_id`는 `products(id)` 참조
  - `usage_status`: `current`, `past`, `paused`
  - `is_past_experience`
  - RLS 정책 작성
- 완료 조건:
  - 사용자는 자기 `user_products`만 조회 가능
  - backend service role은 insert/update/delete 가능

### T2-2. auth middleware 점검

- 우선순위: P0
- 대상:
  - `Backend/src/middlewares/auth.ts`
- 작업:
  - Authorization header 없는 경우 401
  - 잘못된 token 401
  - 검증된 user id를 request context에 저장
  - 클라이언트가 보낸 user id는 사용하지 않음
- 완료 조건:
  - 보호 API에서 `req.user.id` 또는 equivalent 사용 가능
  - `any` 없이 타입 확장 처리

### T2-3. 사용자 제품 등록 API

- 우선순위: P0
- 대상:
  - `Backend/src/repositories/user-products.repository.ts`
  - `Backend/src/services/user-products.service.ts`
  - `Backend/src/controllers/user-products.controller.ts`
  - `Backend/src/routes/user-products.ts`
- API:

```text
POST /api/user-products
GET  /api/user-products
```

- 요청:

```json
{
  "productId": "uuid",
  "usageStatus": "current",
  "startedAt": "2026-08-17",
  "memo": "저녁에 사용"
}
```

- 완료 조건:
  - 로그인 사용자 기준으로 저장
  - 같은 제품 중복 등록 처리 방식 결정
  - 제품 존재하지 않으면 404
  - 목록 조회 시 제품 기본 정보 포함

## 8. Phase 3: Backend 기록 API

### T3-1. 기록용 migration 작성

- 우선순위: P0
- 대상:
  - `Backend/supabase/migrations/*_create_record_tables.sql`
- 테이블:
  - `usage_logs`
  - `usage_log_items`
  - `skin_logs`
- MVP에서 제외 가능:
  - `routines`
  - `routine_products`
  - `skin_photos`
- 완료 조건:
  - `usage_logs.user_id` 기준 RLS
  - `skin_logs.user_id` 기준 RLS
  - 피부 점수는 0부터 5까지 check constraint

### T3-2. 제품 사용 기록 저장/조회 API

- 우선순위: P0
- API:

```text
POST /api/usage-logs
GET  /api/usage-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- 작업:
  - `usedAt` 기본값 처리
  - `userProductIds` 검증
  - 사용자의 제품만 기록 가능
  - 날짜 범위 조회
- 완료 조건:
  - 사용 기록 저장 후 다시 조회 가능
  - 다른 사용자의 `userProductId`를 넣으면 거절

### T3-3. 피부 상태 기록 저장/조회 API

- 우선순위: P0
- API:

```text
POST /api/skin-logs
GET  /api/skin-logs?from=YYYY-MM-DD&to=YYYY-MM-DD
```

- 작업:
  - `dryness`, `oiliness`, `redness`, `trouble` 0-5 validation
  - `sleepLevel`, `stressLevel` 0-5 validation
  - `memo` optional
  - 날짜 범위 조회
- 완료 조건:
  - 같은 날짜 여러 기록 허용 여부 결정
  - 저장된 피부 기록을 분석 API에서 조회 가능

## 9. Phase 4: Backend AI 분석 API

### T4-1. 분석용 migration 작성

- 우선순위: P0
- 테이블:
  - `analysis_runs`
  - `analysis_findings`
- 완료 조건:
  - 사용자별 RLS
  - `finding_type`: `recommended`, `avoid`
  - `evidence_level`: `strong`, `medium`, `weak`, `data_insufficient`

### T4-2. 사용자 기록 집계 service

- 우선순위: P0
- 대상:
  - `Backend/src/services/analysis-evidence.service.ts`
- 작업:
  - 사용자 제품 사용 기록 조회
  - 제품 성분 노출 횟수 계산
  - 피부 변화 점수 요약
  - 수면/스트레스 중첩 요약
  - 데이터 부족 기준 계산
- 완료 조건:
  - AI 호출 전 재현 가능한 evidence JSON 생성
  - 기록이 거의 없어도 빈 배열과 limitations를 반환

### T4-3. OpenAI 분석 gateway

- 우선순위: P0
- 대상:
  - `Backend/src/gateways/openai-analysis.gateway.ts`
- 작업:
  - OpenAI API key는 backend env에서만 사용
  - structured JSON 출력 요청
  - 추천 성분 최대 5개
  - 피해야 할 성분 최대 5개
  - 금지 표현 prompt에 포함
  - 응답 zod validation
- 완료 조건:
  - AI 응답이 schema를 벗어나면 안전한 오류
  - 원인 확정, 진단, 치료 표현을 요청하지 않음

### T4-4. 분석 실행 API

- 우선순위: P0
- API:

```text
POST /api/analysis/run
GET  /api/analysis/latest
GET  /api/analysis/runs/:analysisRunId
```

- 완료 조건:
  - 분석 요청 결과 저장
  - 최근 분석 조회 가능
  - 기록 부족 시 `data_insufficient` 반환
  - AI 실패 시 사용자 기록은 손상되지 않음

### T4-5. AI 없이 fallback 분석

- 우선순위: P0
- 이유:
  - 해커톤 시연 중 OpenAI 장애나 key 문제를 대비
- 작업:
  - OpenAI 호출 실패 시 evidence 기반 간단 요약 반환
  - 결과에 `limitations`와 `data_insufficient` 표시
- 완료 조건:
  - AI 장애에도 분석 탭이 빈 화면으로 끝나지 않는다.

## 10. Phase 5: Android 앱 뼈대와 디자인 시스템

### T5-1. Android package 구조 정리

- 우선순위: P0
- 대상:
  - `Android/app/src/main/java/com/hackathon/skindata`
- 구조:

```text
core/designsystem
core/network
core/session
feature/auth
feature/products
feature/records
feature/analysis
```

- 완료 조건:
  - 기능별 Screen, ViewModel, Repository 위치가 정해짐

### T5-2. 디자인 토큰 적용

- 우선순위: P0
- 기준: `docs/design.md`
- 작업:
  - 색상 토큰
  - typography 토큰
  - spacing/radius object
  - PrimaryButton, AppTextField, Chip, ProductCard 기본 컴포넌트
- 완료 조건:
  - 화면에서 raw color를 직접 쓰지 않음
  - 올리브 CTA와 따뜻한 배경 톤 적용

### T5-3. Navigation shell 작성

- 우선순위: P0
- 탭:
  - Home
  - Products
  - Record
  - Analysis
  - Profile
- 완료 조건:
  - 로그인 전/후 route 분리
  - 하단 내비게이션 표시
  - 빈 화면이라도 탭 이동 가능

### T5-4. API client 기본 구조

- 우선순위: P0
- 작업:
  - Backend base URL 설정
  - Authorization header 삽입
  - 공통 response wrapper 처리
  - 공통 error model 처리
- 완료 조건:
  - `/api/health` 호출 가능
  - token 필요한 API와 필요 없는 API 분리

## 11. Phase 6: Android 핵심 화면 연결

### T6-1. 로그인과 Demo Login

- 우선순위: P0
- 작업:
  - 이메일/비밀번호 로그인
  - 회원가입 최소 입력
  - Demo Login 버튼
  - 로그인 상태 보존
  - 로그아웃
- 완료 조건:
  - demo 계정으로 빠르게 진입
  - access token으로 backend 보호 API 호출 가능

### T6-2. 제품 검색 화면

- 우선순위: P0
- 작업:
  - 검색 입력
  - 검색 결과 리스트
  - loading/empty/error
  - 제품 성분 요약
  - 사용자 제품 등록 버튼
- 완료 조건:
  - `독도`, `크림`, `라운드랩` 등 seed 제품 검색 가능
  - 검색 결과에서 내 제품으로 저장 가능

### T6-3. 내 제품 목록 화면

- 우선순위: P0
- 작업:
  - `GET /user-products`
  - 현재 사용/과거 사용 구분
  - 비어 있을 때 제품 검색 CTA
- 완료 조건:
  - 저장한 제품이 앱 재실행 후에도 보임

### T6-4. 기록 입력 화면

- 우선순위: P0
- 작업:
  - 오늘 사용 제품 선택
  - 사용 기록 저장
  - 건조함/유분/붉음/트러블 점수 입력
  - 수면/스트레스 선택
  - 메모 입력
  - 저장 후 오늘 기록 요약
- 완료 조건:
  - 제품 사용 기록과 피부 상태 기록을 각각 저장 가능
  - 저장 성공/실패 표시

### T6-5. 분석 화면

- 우선순위: P0
- 작업:
  - 분석 요청 버튼
  - loading
  - 데이터 부족 안내
  - 추천 성분 최대 5개
  - 피해야 할 성분 최대 5개
  - 근거 수준 배지
  - limitations 표시
- 완료 조건:
  - 분석 결과가 카드 형태로 표시
  - 진단/치료/원인 확정처럼 보이지 않음

## 12. Phase 7: 성분표 사진 기반 제품 제출

이 Phase는 AI 핵심성을 보여주는 데 좋지만, 시간이 부족하면 제품 seed 검색 기반 MVP가 먼저다.

### T7-1. 제품 제출 migration

- 우선순위: P0-High
- 테이블:
  - `product_submissions`
- 완료 조건:
  - 성분표 사진 원본 경로 저장 안 함
  - `ai_extracted_text`, `confirmed_ingredients_text` 저장

### T7-2. 성분표 사진 추출 API

- 우선순위: P0-High
- API:

```text
POST /api/product-submissions/extract
```

- 작업:
  - multipart 처리
  - 사진 원본 미저장
  - OpenAI vision/text extraction
  - 성분 후보 분리
  - MFDS 또는 ingredient 후보 매칭
- 완료 조건:
  - 이미지에서 텍스트 추출
  - 결과를 저장하지 않고 응답으로만 반환
  - 실패 시 사용자에게 재촬영/직접 입력 안내 가능

### T7-3. 제품 제출 확정 API

- 우선순위: P0-High
- API:

```text
POST /api/product-submissions
```

- 작업:
  - 사용자가 검토한 성분표 저장
  - `products.source=community`
  - `verification_status=community`
  - `product_ingredients` 저장
  - unmatched 성분 보존
- 완료 조건:
  - 저장 후 제품 검색 결과에 노출
  - 성분표 사진 원본은 어디에도 저장되지 않음

### T7-4. Android 제품 제출 화면

- 우선순위: P0-High
- 작업:
  - 제품명/브랜드/카테고리 입력
  - 성분표 사진 선택
  - 추출 요청 loading
  - 추출된 성분 편집
  - 성분 추가/삭제
  - 최종 저장
- 완료 조건:
  - 사용자가 AI 추출 결과를 직접 검토한 뒤 저장
  - 저장 완료 후 내 제품으로 추가 가능

## 13. Phase 8: 배포와 시연 안정화

### T8-1. Backend Render 배포

- 우선순위: P0
- 작업:
  - Render service 생성
  - environment variables 설정
  - `/api/health` 확인
  - `/api/health/supabase` 확인
- 완료 조건:
  - Render URL에서 health 성공
  - 비밀키는 Render env에만 존재

### T8-2. Android release APK

- 우선순위: P0
- 작업:
  - release 빌드 설정
  - Backend URL을 release 환경에 설정
  - APK 생성
  - 실제 기기 또는 에뮬레이터 설치
- 완료 조건:
  - APK에서 로그인부터 분석까지 동작

### T8-3. README와 Release note

- 우선순위: P0
- 작업:
  - 앱 소개
  - 실행 방법
  - APK 설치 방법
  - demo 계정 안내 방식
  - API key가 필요 없는 체험 흐름
- 완료 조건:
  - 심사자 또는 팀원이 문서만 보고 실행 가능

### T8-4. 시연 데이터 준비

- 우선순위: P0
- 작업:
  - demo 계정에 제품 2-3개 등록
  - 사용 기록 3일치 이상 생성
  - 피부 상태 기록 3일치 이상 생성
  - 분석 결과가 보기 좋게 나오는 데이터 구성
- 완료 조건:
  - 3분 이내 시연 흐름 가능
  - 네트워크가 느려도 보여줄 최근 분석 결과 존재

## 14. P1 확장 기능

### E9-1. 루틴

- `routines`
- `routine_products`
- 루틴 생성/수정/삭제
- 루틴 기반 사용 기록

### E9-2. 피부 사진

- Supabase Storage upload URL
- `skin_photos` metadata
- 피부 기록과 사진 연결
- 사진 없이도 기록 가능

### E9-3. 분석 고도화

- 제품별 반복 패턴
- 무반응 사례 표시
- 생활 요인 중첩 표시
- 기록 부족 시 추가 질문 추천
- 최근 분석 히스토리 목록

### E9-4. 제품 데이터 고도화

- MFDS ingredient master 전체 sync
- product ingredient 자동 매칭
- community 제품 중복 후보 감지
- admin verified 전환

## 15. 권장 작업 순서

혼자 진행할 때는 아래 순서가 가장 안전하다.

1. T0-1 Supabase 제품 seed 테이블 생성
2. T0-2 제품 seed import
3. T1-1 제품 검색 repository
4. T1-2 제품 검색 service
5. T1-3 제품 검색 API
6. T2-1 사용자 제품 migration
7. T2-2 auth middleware 점검
8. T2-3 사용자 제품 등록 API
9. T3-1 기록 migration
10. T3-2 제품 사용 기록 API
11. T3-3 피부 상태 기록 API
12. T4-1 분석 migration
13. T4-2 사용자 기록 집계 service
14. T4-3 OpenAI 분석 gateway
15. T4-4 분석 실행 API
16. T4-5 AI fallback 분석
17. T5-1 Android package 구조
18. T5-2 디자인 토큰
19. T5-3 Navigation shell
20. T5-4 API client
21. T6-1 로그인과 Demo Login
22. T6-2 제품 검색 화면
23. T6-3 내 제품 목록 화면
24. T6-4 기록 입력 화면
25. T6-5 분석 화면
26. T7-1 제품 제출 migration
27. T7-2 성분표 사진 추출 API
28. T7-3 제품 제출 확정 API
29. T7-4 Android 제품 제출 화면
30. T8-1 Render 배포
31. T8-2 APK 빌드
32. T8-3 README와 Release note
33. T8-4 시연 데이터 준비

## 16. 작업 프롬프트 템플릿

각 티켓을 진행할 때 Codex에 이렇게 요청한다.

```text
docs/backlog.md의 T1-3을 진행해줘.
작업 전에 관련 docs를 읽고, API/DB 계약이 바뀌면 문서도 같이 수정해줘.
완료 후 실행한 검증과 남은 리스크를 알려줘.
```

Android 화면 작업은 이렇게 요청한다.

```text
docs/backlog.md의 T6-2를 진행해줘.
docs/design.md의 디자인 토큰과 컴포넌트 규칙을 따라줘.
API DTO와 UI state를 섞지 말고 loading/empty/error/success 상태를 포함해줘.
```

## 17. 수동 검증 체크리스트

시연 직전 반드시 확인한다.

- demo 계정으로 빠르게 로그인된다.
- 제품명을 검색하면 seed 제품이 표시된다.
- 검색 결과에서 제품을 내 제품으로 등록할 수 있다.
- 내 제품 목록이 다시 조회된다.
- 제품 사용 기록을 저장할 수 있다.
- 피부 상태 기록을 저장할 수 있다.
- 분석 탭에서 분석을 요청할 수 있다.
- 추천 성분과 피해야 할 성분 후보가 근거와 함께 표시된다.
- 데이터가 부족하면 신뢰도 낮음이 표시된다.
- 성분표 사진 기반 제품 제출을 구현했다면 사진 원본이 저장되지 않는다.
- Android 앱에 OpenAI key, Supabase service role key, MFDS key가 포함되지 않는다.
- Render 배포 환경에서 `/api/health`가 성공한다.
- APK 설치 후 핵심 흐름이 동작한다.

## 18. 컷라인

시간이 부족하면 아래 순서로 과감히 줄인다.

반드시 살릴 것:

- demo login
- 제품 seed 검색
- 내 제품 등록
- 제품 사용 기록
- 피부 상태 기록
- 분석 요청과 결과 표시

나중으로 미룰 것:

- 루틴
- 피부 사진 저장
- 성분표 사진 기반 community 제품 등록
- MFDS 전체 자동 sync
- admin 검수
- 계정 탈퇴와 내보내기

