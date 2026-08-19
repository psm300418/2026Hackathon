# Data Model

> 문서 상태: 초안  
> 기준 문서: `docs/mainplan.md`, `docs/architecture.md`

## 1. 원칙

- 사용자 소유 데이터는 `user_id`를 기준으로 분리한다.
- 공개 제품/성분 데이터와 사용자 개인 기록을 구분한다.
- 과거 기억 기반 기록과 서비스 가입 이후 직접 기록된 데이터를 구분한다.
- 피부 사진은 Supabase Storage에 저장하고 PostgreSQL에는 메타데이터만 저장한다.
- 제품 성분표 사진은 AI 텍스트 추출에만 사용하고 원본 사진은 저장하지 않는다.
- 성분 함량이 공개되지 않은 경우 임의로 추정하지 않는다.
- MFDS 원료성분정보는 성분 마스터 DB로 사용한다.
- 사용자가 최종 확인한 제품과 성분 정보는 공용 제품 DB에 `community` 상태로 저장할 수 있다.

---

## 2. 주요 테이블

```text
profiles
skin_type_questionnaires
skin_type_questions
skin_type_options
skin_type_results
skin_type_responses
products
product_submissions
ingredients
product_ingredients
user_products
user_locations
routines
routine_products
daily_records
daily_record_products
daily_record_presets
daily_record_environment
skin_photos
analysis_runs
analysis_findings
```

---

## 3. 테이블 초안

### profiles

사용자 프로필과 초기 설문 기준점을 저장한다.

- `id`
- `user_id`
- `display_name`
- `baseline_dryness`
- `baseline_oiliness`
- `baseline_redness`
- `baseline_trouble_frequency`
- `main_skin_concerns`
- `skin_type_code`
- `skin_type_completed_at`
- `created_at`
- `updated_at`

### skin_type_questionnaires

초기 피부 타입 설문 버전 정보를 저장한다. 문항 원본은 `docs/DB/skin_type_question.md`를 기준으로 seed한다.

- `id`
- `version`
- `title`
- `description`
- `is_active`
- `created_at`
- `updated_at`

### skin_type_questions

설문 문항을 저장한다.

- `id`
- `questionnaire_id`
- `dimension`
- `question_key`
- `question_text`
- `display_order`
- `special_rule`
- `created_at`

`dimension`은 `oil_dry`, `sensitive_resistant`, `pigmented_non_pigmented`, `wrinkled_tight` 같은 값을 고려한다.

### skin_type_options

설문 문항의 선택지를 저장한다.

- `id`
- `question_id`
- `option_key`
- `option_text`
- `score`
- `display_order`
- `created_at`

점수와 판정 로직은 Android에 두지 않고 Backend에서 사용한다.

### skin_type_results

사용자의 초기 피부 타입 설문 결과를 저장한다.

- `id`
- `user_id`
- `questionnaire_id`
- `skin_type_code`
- `oil_dry_code`
- `oil_dry_score`
- `sensitive_resistant_code`
- `sensitive_resistant_score`
- `pigmented_non_pigmented_code`
- `pigmented_non_pigmented_score`
- `wrinkled_tight_code`
- `wrinkled_tight_score`
- `result_notice`
- `completed_at`
- `created_at`
- `updated_at`

`skin_type_code`는 `OSNT`처럼 4개 축의 결과를 조합한 값이다. 이 값은 의료 진단이 아니라 초기 기록 기준점으로 사용한다.

### skin_type_responses

사용자가 선택한 설문 응답을 저장한다. 사용자가 특정 피부 분류 축을 이미 알고 있어 직접 선택한 경우, 해당 축의 개별 문항 응답은 저장하지 않는다.

- `id`
- `skin_type_result_id`
- `user_id`
- `question_id`
- `option_id`
- `score`
- `created_at`

설문 문구가 바뀌어도 과거 응답을 해석할 수 있도록 `questionnaire_id`와 선택지 버전을 결과와 함께 보존한다. 직접 선택으로 건너뛴 축은 `skin_type_results`의 코드와 점수 필드에만 반영된다.

### products

공용 제품 DB를 저장한다. seed 제품, 사용자가 확인한 community 제품, 향후 검증된 제품을 모두 포함한다. 초기 구현은 화장품 중심이지만, 같은 구조를 샤워용품과 영양제로 확장한다.

- `id`
- `source`
- `external_id`
- `item_type`
- `name`
- `normalized_name`
- `brand`
- `category`
- `ingredients_text`
- `verification_status`
- `source_url`
- `source_checked_at`
- `region`
- `formula_version`
- `seed_batch`
- `created_from_submission_id`
- `created_at`
- `updated_at`

`source`는 `seed`, `community`, `admin` 같은 값을 고려한다.
`verification_status`는 `community`, `verified`, `needs_review` 같은 값을 고려한다.
`item_type`은 `cosmetic`, `shower_product`, `supplement`를 고려한다. 화장품과 샤워용품은 전성분을, 영양제는 원료명 또는 영양정보 라벨에서 추출한 항목을 우선 저장한다.
초기 seed 제품은 공식 출처 추적을 위해 `source_url`, `source_checked_at`, `region`, `formula_version`, `seed_batch`를 함께 저장한다.

### product_submissions

사용자가 공용 제품 DB에 제품을 추가하기 위해 제출한 정보를 저장한다. 화장품 성분표, 샤워용품 라벨, 영양제 원료명 또는 영양정보 사진 제출을 같은 흐름으로 처리한다.

- `id`
- `submitted_by`
- `product_id`
- `item_type`
- `name`
- `normalized_name`
- `brand`
- `category`
- `ai_extracted_text`
- `confirmed_ingredients_text`
- `status`
- `created_at`
- `updated_at`

성분표 또는 라벨 사진 원본은 저장하지 않는다. `ai_extracted_text`는 AI가 사진에서 추출한 원문이고, `confirmed_ingredients_text`는 사용자가 검토/수정 후 확정한 성분표, 원료명, 영양정보 텍스트다.

`status`는 `draft`, `community`, `verified`, `rejected` 같은 값을 고려한다.

### ingredients

성분 정보를 저장한다. 화장품과 샤워용품은 MFDS 원료성분정보 매칭을 우선하고, 영양제 원료는 매칭 사전이 준비되기 전까지 원문과 정규화 이름 중심으로 저장한다.

- `id`
- `source`
- `external_id`
- `name`
- `normalized_name`
- `english_name`
- `cas_no`
- `definition`
- `synonyms`
- `created_at`
- `updated_at`

MFDS 원료성분정보를 기반으로 성분 마스터를 구성한다. 같은 성분의 한글명, 영문명, 이명은 가능한 범위에서 하나의 표준 성분으로 묶는다.

### product_ingredients

제품과 성분의 관계를 저장한다.

- `id`
- `product_id`
- `ingredient_id`
- `raw_name`
- `display_order`
- `amount_text`
- `amount_status`
- `match_status`
- `created_at`

`amount_status`는 `unknown`, `known`, `not_provided` 같은 값을 고려한다.
`amount_text`는 전성분에 표시된 `10,000ppm`, `2.4%` 같은 원문 함량 표기를 보존하기 위한 선택 필드다. 실제 함량이 공개되지 않은 성분은 비워 둔다.
`match_status`는 `matched`, `unmatched`, `manual` 같은 값을 고려한다.
MFDS 성분 마스터와 매칭되지 않은 성분은 별도 보정 전까지 `unmatched`로 유지한다.

### user_products

사용자가 자신의 목록에 등록한 제품을 저장한다. 제품은 화장품, 샤워용품, 영양제를 모두 포함할 수 있다.

- `id`
- `user_id`
- `product_id`
- `usage_status`
- `started_at`
- `is_past_experience`
- `past_reaction_memo`
- `memo`
- `created_at`
- `updated_at`

사용자는 공용 제품 DB의 제품을 자신의 제품 목록에 추가한다. 제품이 공용 DB에 없다면 `product_submissions` 흐름으로 제품을 등록한다.
같은 사용자가 같은 제품을 다시 등록하면 새 행을 만들지 않고 기존 행을 갱신한다.
이전 사용 제품 등록 화면에서는 `started_at`을 입력받지 않고 `null`로 저장한다.
제품 조회 시 최근 30일 오늘 기록에 포함되지 않은 `current` 제품은 `past`로 보정한다. 오늘 기록에 다시 포함된 제품은 저장 직후 `current`로 갱신된다. 사용자는 제품 탭에서 상태를 직접 이동할 수 있다.

### user_locations

기상청 날씨 API 연동에 사용할 사용자 지역 설정을 저장한다.

- `id`
- `user_id`
- `region_label`
- `weather_station_id`
- `weather_station_name`
- `created_at`
- `updated_at`

정책:

- 사용자는 지역을 직접 설정하거나 변경한다.
- MVP에서는 정밀 GPS 좌표를 저장하지 않고, 사용자가 시/군/구 버튼으로 고른 지역명과 대표 ASOS 관측소 ID를 저장한다.
- 같은 사용자는 활성 지역 설정 1개를 기본으로 한다.

### routines

사용자가 반복적으로 함께 사용하는 제품 프리셋을 저장한다. API와 화면에서는 `product preset` 또는 `프리셋`으로 표현한다.

- `id`
- `user_id`
- `name`
- `created_at`
- `updated_at`

### routine_products

프리셋에 포함된 사용자 제품을 저장한다.

- `id`
- `routine_id`
- `user_product_id`
- `display_order`
- `created_at`

### daily_records

하루 1개의 오늘 피부 기록을 저장한다. 피부 상태가 중심이며, 사용 제품, 적용 프리셋, 수면 시간, 선택 얼굴 사진은 이 기록에 연결된다.

- `id`
- `user_id`
- `record_date`
- `logged_at`
- `dryness`
- `oiliness`
- `redness`
- `trouble`
- `sleep_hours`
- `outdoor_minutes`
- `memo`
- `created_at`
- `updated_at`

정책:

- `user_id`, `record_date` 조합은 unique로 관리한다.
- 같은 날짜 기록을 다시 저장하면 기존 기록을 갱신한다.
- `dryness`, `oiliness`, `redness`, `trouble`은 0부터 5까지의 정수다.
- `sleep_hours`는 0부터 24까지의 숫자이며 소수 1자리까지 허용한다.
- `outdoor_minutes`는 선택값이며 분 단위로 저장한다.
- 스트레스 점수는 T4 범위에서 제외한다.

### daily_record_products

오늘 기록에 포함된 사용 제품들을 저장한다.

- `id`
- `daily_record_id`
- `user_product_id`
- `created_at`

하나의 오늘 기록에는 여러 제품이 포함될 수 있다. 오늘 기록에 포함된 제품은 현재 사용중인 제품으로 간주해 `user_products.usage_status=current`로 갱신한다.

### daily_record_presets

오늘 기록에 적용한 프리셋을 저장한다. 분석에서는 실제 제품 목록인 `daily_record_products`를 우선 사용하고, 프리셋 정보는 사용자가 어떤 묶음을 적용했는지 보여주는 메타데이터로 활용한다.

- `id`
- `daily_record_id`
- `routine_id`
- `created_at`

### daily_record_environment

오늘 기록 저장 시점에 사용자의 지역 설정과 기상청 날씨 API 결과를 스냅샷으로 저장한다.

- `id`
- `daily_record_id`
- `source`
- `region_label`
- `weather_station_id`
- `weather_station_name`
- `observed_at`
- `temperature_celsius`
- `humidity_percent`
- `precipitation_amount_mm`
- `wind_speed_mps`
- `raw_payload`
- `created_at`

정책:

- `source`는 우선 `kma`를 사용한다.
- 관측값은 사용자가 오늘 기록을 저장한 시점과 가장 가까운 시각의 ASOS 관측값을 우선 사용한다.
- 날씨 API 호출이 실패해도 오늘 기록 저장은 가능해야 하며, 이 테이블의 row가 없을 수 있다.
- 분석에는 상세 위치보다 기록일의 환경 조건 요약을 우선 사용한다.

### skin_photos

피부 기록 사진 메타데이터를 저장한다.

- `id`
- `user_id`
- `daily_record_id`
- `storage_path`
- `taken_at`
- `created_at`

얼굴 사진은 오늘 기록에 선택적으로 연결된다. 사진 없이도 오늘 기록을 저장할 수 있다. 성분표 사진은 이 테이블에 저장하지 않는다.

### analysis_runs

사용자가 분석 탭에서 요청한 분석 실행 단위를 저장한다.

- `id`
- `user_id`
- `requested_at`
- `confidence_level`
- `summary`
- `trend_points`
- `notable_events`
- `factor_summaries`
- `limitations`
- `next_records_to_add`
- `created_at`

`confidence_level`은 `strong`, `medium`, `weak`, `data_insufficient`를 고려한다.
분석 실행은 최근 30일 상세 기록, 전체 기간 압축 통계, 이전 최신 분석 요약을 바탕으로 생성한다.
전체 기간의 원본 기록을 매번 AI에 모두 전달하지 않고 Backend에서 성분별 노출/개선/악화 통계로 압축한다.
`trend_points`는 최근 30일 차트용 피부 컨디션 점수와 생활·환경 값을 저장한다. 컨디션 점수는 높을수록 좋은 상태, 낮을수록 건조함·유분·붉음·트러블 기록이 두드러진 상태를 의미한다.
`notable_events`는 최근 평균 대비 피부 컨디션 점수가 낮아진 날짜와 같은 날 함께 기록된 후보 요인을 저장한다.
`factor_summaries`는 수면 부족, 높은 습도, 첫 사용 제품 같은 요인이 특이 변화일과 얼마나 함께 나타났는지 저장한다.

### analysis_findings

분석 결과의 성분 후보를 저장한다.

- `id`
- `analysis_run_id`
- `finding_type`
- `ingredient_id`
- `ingredient_name`
- `evidence_level`
- `reason`
- `supporting_logs`
- `created_at`

`finding_type`은 `positive_suspect` 또는 `negative_suspect`를 사용한다. 각 타입은 최대 5개를 기본 정책으로 한다.
분석 결과는 추천이나 금지처럼 단정하지 않고, 저장된 기록에서 긍정적 변화 또는 부정적 변화와 함께 나타난 의심 성분 후보로 표현한다.
`supporting_logs`에는 전체 노출 횟수, 최근 노출 횟수, 관련 제품 요약처럼 사용자가 이해할 수 있는 짧은 근거 문자열을 저장한다.

---

## 4. 관계 요약

- 한 사용자는 하나 이상의 `skin_type_results`와 여러 `skin_type_responses`를 가질 수 있다.
- 한 사용자는 여러 `product_submissions`, `user_products`, `routines`, `daily_records`, `analysis_runs`를 가진다.
- 한 사용자는 하나의 활성 지역 설정(`user_locations`)을 가질 수 있다.
- 한 제품은 사용자 제출(`product_submissions`)을 통해 생성될 수 있다.
- 한 제품은 여러 성분을 가질 수 있다.
- 한 사용자는 공용 제품을 자신의 제품 목록에 등록할 수 있다.
- 한 프리셋은 여러 사용자 제품을 포함할 수 있다.
- 한 오늘 기록은 여러 사용자 제품과 여러 적용 프리셋을 포함할 수 있다.
- 한 오늘 기록은 하나의 날씨·환경 스냅샷을 가질 수 있다.
- 한 오늘 기록은 선택 얼굴 사진 메타데이터와 연결될 수 있다.
- 한 분석 실행은 여러 분석 후보 결과를 가진다.

---

## 5. RLS 방향

사용자 소유 테이블은 기본적으로 `user_id = auth.uid()` 또는 제출자 기준 조건을 사용한다.

RLS 적용 대상:

- `profiles`
- `skin_type_results`
- `skin_type_responses`
- `product_submissions`
- `user_products`
- `user_locations`
- `routines`
- `daily_records`
- `daily_record_products`
- `daily_record_presets`
- `daily_record_environment`
- `skin_photos`
- `analysis_runs`
- `analysis_findings`

공용 제품/성분 테이블은 읽기 범위를 넓게 둘 수 있으나, 쓰기는 Backend service role을 통해서만 수행하는 방향을 고려한다.
