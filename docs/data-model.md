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
routines
routine_products
usage_logs
usage_log_items
skin_logs
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

사용자가 선택한 설문 응답을 저장한다.

- `id`
- `skin_type_result_id`
- `user_id`
- `question_id`
- `option_id`
- `score`
- `created_at`

설문 문구가 바뀌어도 과거 응답을 해석할 수 있도록 `questionnaire_id`와 선택지 버전을 결과와 함께 보존한다.

### products

공용 제품 DB를 저장한다. seed 제품, 사용자가 확인한 community 제품, 향후 검증된 제품을 모두 포함한다.

- `id`
- `source`
- `external_id`
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
초기 seed 제품은 공식 출처 추적을 위해 `source_url`, `source_checked_at`, `region`, `formula_version`, `seed_batch`를 함께 저장한다.

### product_submissions

사용자가 공용 제품 DB에 제품을 추가하기 위해 제출한 정보를 저장한다.

- `id`
- `submitted_by`
- `product_id`
- `name`
- `normalized_name`
- `brand`
- `category`
- `ai_extracted_text`
- `confirmed_ingredients_text`
- `status`
- `created_at`
- `updated_at`

성분표 사진 원본은 저장하지 않는다. `ai_extracted_text`는 AI가 사진에서 추출한 원문이고, `confirmed_ingredients_text`는 사용자가 검토/수정 후 확정한 성분표 텍스트다.

`status`는 `draft`, `community`, `verified`, `rejected` 같은 값을 고려한다.

### ingredients

성분 정보를 저장한다.

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

사용자가 자신의 목록에 등록한 제품을 저장한다.

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

사용자는 공용 제품 DB의 제품을 자신의 제품 목록에 추가한다. 제품이 공용 DB에 없다면 먼저 `product_submissions` 흐름으로 제품을 등록한다.

### routines

사용자 루틴을 저장한다.

- `id`
- `user_id`
- `name`
- `created_at`
- `updated_at`

### routine_products

루틴에 포함된 사용자 제품을 저장한다.

- `id`
- `routine_id`
- `user_product_id`
- `display_order`
- `created_at`

### usage_logs

제품 또는 루틴 사용 기록을 저장한다.

- `id`
- `user_id`
- `routine_id`
- `used_at`
- `memo`
- `created_at`

### usage_log_items

하나의 사용 기록에 포함된 제품들을 저장한다.

- `id`
- `usage_log_id`
- `user_product_id`
- `created_at`

### skin_logs

일일 피부 상태와 생활 요인을 저장한다.

- `id`
- `user_id`
- `logged_at`
- `dryness`
- `oiliness`
- `redness`
- `trouble`
- `sleep_level`
- `stress_level`
- `memo`
- `created_at`
- `updated_at`

척도는 MVP에서 0부터 5까지를 기본 후보로 한다.

### skin_photos

피부 기록 사진 메타데이터를 저장한다.

- `id`
- `user_id`
- `skin_log_id`
- `storage_path`
- `taken_at`
- `created_at`

성분표 사진은 이 테이블에 저장하지 않는다.

### analysis_runs

사용자가 분석 탭에서 요청한 분석 실행 단위를 저장한다.

- `id`
- `user_id`
- `requested_at`
- `confidence_level`
- `summary`
- `limitations`
- `next_records_to_add`
- `created_at`

`confidence_level`은 `strong`, `medium`, `weak`, `data_insufficient`를 고려한다.

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

---

## 4. 관계 요약

- 한 사용자는 하나 이상의 `skin_type_results`와 여러 `skin_type_responses`를 가질 수 있다.
- 한 사용자는 여러 `product_submissions`, `user_products`, `routines`, `usage_logs`, `skin_logs`, `analysis_runs`를 가진다.
- 한 제품은 사용자 제출(`product_submissions`)을 통해 생성될 수 있다.
- 한 제품은 여러 성분을 가질 수 있다.
- 한 사용자는 공용 제품을 자신의 제품 목록에 등록할 수 있다.
- 한 루틴은 여러 사용자 제품을 포함할 수 있다.
- 한 사용 기록은 여러 사용자 제품을 포함할 수 있다.
- 한 피부 기록은 여러 피부 사진 메타데이터와 연결될 수 있다.
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
- `routines`
- `usage_logs`
- `skin_logs`
- `skin_photos`
- `analysis_runs`

공용 제품/성분 테이블은 읽기 범위를 넓게 둘 수 있으나, 쓰기는 Backend service role을 통해서만 수행하는 방향을 고려한다.
