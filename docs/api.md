# API

> 문서 상태: 초안  
> 기준 문서: `docs/mainplan.md`, `docs/architecture.md`

## 1. 기본 원칙

- Android 앱은 Backend API를 통해 데이터를 저장하고 조회한다.
- Android 앱은 Supabase access token을 `Authorization` 헤더에 담아 보낸다.
- Backend는 모든 보호 API에서 토큰을 검증하고 사용자 ID를 확인한다.
- OpenAI API, MFDS API, Supabase service role key는 Backend에서만 사용한다.
- 성분표 사진 원본은 AI 텍스트 추출에만 사용하고 저장하지 않는다.

```http
Authorization: Bearer <supabase_access_token>
```

---

## 2. 공통 응답 방향

성공 응답:

```json
{
  "data": {}
}
```

실패 응답:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자에게 표시 가능한 오류 메시지"
  }
}
```

---

## 3. Health

```text
GET /api/health
GET /api/health/supabase
```

서버와 Supabase 연결 상태 확인용 API다.

---

## 4. Profile

로그인한 사용자의 앱 프로필을 조회한다. 프로필이 없으면 Backend가 검증된 사용자 ID 기준으로 생성한다.

```text
GET /api/profile/me
```

인증:

- `Authorization: Bearer <supabase_access_token>` 필요
- 클라이언트가 보낸 `user_id`는 사용하지 않는다.

응답 예시:

```json
{
  "data": {
    "id": "profile-id",
    "userId": "auth-user-id",
    "displayName": null,
    "skinTypeCode": null,
    "skinTypeCompletedAt": null,
    "createdAt": "2026-08-17T08:00:00.000Z",
    "updatedAt": "2026-08-17T08:00:00.000Z"
  }
}
```

---

## 5. Onboarding / Skin Type Survey

회원가입 또는 최초 로그인 이후 초기 피부 타입 설문을 저장하고 조회한다. 설문 문항 원본은 `docs/DB/skin_type_question.md`를 기준으로 한다.

### 설문 문항 조회

```text
GET /api/onboarding/skin-type/questions
```

응답 예시:

```json
{
  "data": {
    "version": "baumann_ko_rewrite_v1",
    "sections": [
      {
        "dimension": "oil_dry",
        "title": "피부의 유분·건조 정도",
        "questions": [
          {
            "id": "OD_01",
            "text": "세안 후 아무것도 바르지 않고 2~3시간이 지나면 피부가 어떤가요?",
            "options": [
              {
                "id": "A",
                "text": "매우 건조하고 각질이 일어나거나 거칠게 느껴져요."
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 설문 응답 저장 및 피부 타입 계산

```text
POST /api/onboarding/skin-type/responses
```

요청 예시:

```json
{
  "questionnaireVersion": "baumann_ko_rewrite_v1",
  "responses": [
    {
      "questionId": "OD_01",
      "optionId": "B"
    }
  ]
}
```

응답 예시:

```json
{
    "data": {
      "skinTypeCode": "OSNT",
      "displayName": "지성 경향 · 민감성 경향 · 비색소성 경향 · 탄력 유지 경향",
      "dimensions": {
        "oilDry": {
          "code": "O",
        "label": "지성 경향",
        "score": 31
      },
      "sensitiveResistant": {
        "code": "S",
        "label": "민감성 경향",
        "score": 32
      },
      "pigmentedNonPigmented": {
        "code": "N",
        "label": "색소침착 낮은 경향",
        "score": 24
      },
      "wrinkledTight": {
        "code": "T",
        "label": "탄력 유지 경향",
        "score": 34
      }
    },
    "notice": "이 결과는 의료 진단이 아니라 초기 기록 기준점입니다."
    }
  }
  ```

저장 방향:

- 점수 계산은 Backend에서 수행한다.
- Android에는 점수표와 판정 로직을 두지 않는다.
- 결과는 `profiles`와 설문 응답 테이블에 저장한다.
- 설문 결과는 진단이 아니라 이후 기록 분석의 기준점으로 사용한다.
- 사용자 화면에서는 `OSNT` 같은 내부 코드보다 `지성 경향 · 민감성 경향 · 비색소성 경향 · 탄력 유지 경향`처럼 한국어 분류 조합을 중심으로 표시한다.

### 내 초기 설문 결과 조회

```text
GET /api/onboarding/skin-type/result
```

---

## 6. Products

### 제품 검색

```text
GET /api/products/search?q={query}
```

흐름:

1. 자체 공용 제품 DB에서 제품명, 브랜드, 카테고리를 기준으로 검색한다.
2. 검색 결과가 있으면 `community`, `verified`, `seed` 제품을 반환한다.
3. 검색 결과가 없거나 성분 정보가 부족하면 제품 제출 흐름으로 안내한다.

응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "product-id",
        "source": "community",
        "verificationStatus": "community",
        "name": "제품명",
        "brand": "브랜드명",
        "category": "크림",
        "ingredientsText": "정제수, 글리세린, 나이아신아마이드",
        "ingredients": [
          {
            "name": "글리세린",
            "normalizedName": "글리세린",
            "matchedIngredientId": "ingredient-id",
            "matchStatus": "matched"
          }
        ]
      }
    ],
    "canSubmitProduct": true
  }
}
```

### 제품 제출용 성분표 추출

```text
POST /api/product-submissions/extract
```

사용자가 제품명, 브랜드, 제품 종류, 성분표 사진을 제출하면 Backend가 OpenAI API로 텍스트와 성분 후보를 추출한다.

흐름:

1. Android 앱이 제품 정보와 성분표 사진을 Backend로 전송한다.
2. Backend는 사진 원본을 저장하지 않고 AI 추출 요청에만 사용한다.
3. AI는 성분표 텍스트와 성분 후보 목록을 추출한다.
4. Backend는 추출된 성분 후보를 MFDS 성분 마스터와 매칭한다.
5. Android 앱은 추출 결과를 사용자에게 보여준다.
6. 사용자는 결과를 확인하거나 수정한다.

요청 형식:

```text
multipart/form-data
```

필드:

| field | 설명 |
| --- | --- |
| `name` | 제품명 |
| `brand` | 브랜드명 |
| `category` | 제품 종류 |
| `ingredientLabelImage` | 성분표 사진 파일 |

응답 예시:

```json
{
  "data": {
    "extractedText": "정제수, 글리세린, 나이아신아마이드",
    "ingredients": [
      {
        "rawName": "글리세린",
        "normalizedName": "글리세린",
        "matchedIngredientId": "ingredient-id",
        "matchStatus": "matched"
      },
      {
        "rawName": "미확인성분",
        "normalizedName": "미확인성분",
        "matchedIngredientId": null,
        "matchStatus": "unmatched"
      }
    ],
    "warnings": [
      "AI 추출 결과는 사용자의 확인 후 저장됩니다."
    ]
  }
}
```

### 제품 제출 확정

```text
POST /api/product-submissions
```

사용자가 AI 추출 결과를 확인하거나 수정한 뒤 공용 제품 DB에 등록한다.

요청 예시:

```json
{
  "name": "제품명",
  "brand": "브랜드명",
  "category": "크림",
  "confirmedIngredientsText": "정제수, 글리세린, 나이아신아마이드",
  "ingredients": [
    {
      "rawName": "글리세린",
      "normalizedName": "글리세린",
      "matchedIngredientId": "ingredient-id",
      "matchStatus": "matched"
    }
  ]
}
```

등록 결과:

- 제품은 `products`에 `source=community`, `verificationStatus=community`로 저장된다.
- 제출 이력은 `product_submissions`에 저장된다.
- 성분표 사진 원본은 저장하지 않는다.
- 이후 다른 사용자가 제품명으로 검색하면 해당 제품을 볼 수 있다.

### 사용자 제품 등록

```text
POST /api/user-products
```

검색 결과에서 선택한 제품을 사용자 제품 목록에 등록한다.

요청 예시:

```json
{
  "productId": "product-id",
  "usageStatus": "current",
  "startedAt": "2026-08-13",
  "memo": "기억나는 반응"
}
```

---

## 7. Ingredients

```text
GET  /api/ingredients/search?q={query}
POST /api/ingredients/sync
POST /api/ingredients/normalize
```

MFDS 화장품 원료성분정보 API를 기반으로 성분 마스터를 조회하거나 동기화한다.

흐름:

1. 자체 `ingredients` 마스터 DB에서 먼저 검색한다.
2. 동기화가 필요하면 MFDS API를 페이지 단위로 조회한다.
3. 표준 성분명, 영문명, CAS No, 이명 등을 저장한다.
4. 제품 전성분과 매칭할 때 `ingredients` 기준으로 연결한다.

외부 API:

```text
GET https://apis.data.go.kr/1471000/CsmtcsIngdCpntInfoService01/getCsmtcsIngdCpntInfoService01
```

기본 파라미터:

| parameter | 설명 |
| --- | --- |
| `serviceKey` | MFDS 일반 인증키 |
| `pageNo` | 페이지 번호 |
| `numOfRows` | 페이지 크기 |
| `type=json` | JSON 응답 요청 |

확인된 응답 필드:

| MFDS field | 내부 필드 |
| --- | --- |
| `INGR_KOR_NAME` | `name`, `externalId` |
| `INGR_ENG_NAME` | `englishName` |
| `CAS_NO` | `casNo` |
| `ORIGIN_MAJOR_KOR_NAME` | `definition` |
| `INGR_SYNONYM` | `synonyms` |

주의:

- MFDS API key가 URL encoded 문자열이면 raw query에 그대로 넣거나, 한 번 decode한 뒤 `URLSearchParams`에 넣어야 한다.
- `INGR_KOR_NAME` 검색 파라미터는 실제 테스트에서 기대처럼 부분 검색되지 않았다.
- MVP에서는 페이지 단위로 성분을 가져와 우리 DB에 캐싱한 뒤 자체 DB에서 검색/매칭하는 방식을 우선한다.

---

## 8. Routines

```text
POST /api/routines
GET  /api/routines
POST /api/routines/:routineId/products
```

반복적으로 사용하는 제품 묶음을 등록한다.

---

## 9. Usage Logs

```text
POST /api/usage-logs
GET  /api/usage-logs?from={date}&to={date}
```

요청 예시:

```json
{
  "usedAt": "2026-08-13T21:00:00+09:00",
  "userProductIds": ["user-product-id"],
  "routineId": "routine-id",
  "memo": "저녁 루틴 사용"
}
```

---

## 10. Skin Logs

```text
POST /api/skin-logs
GET  /api/skin-logs?from={date}&to={date}
```

요청 예시:

```json
{
  "loggedAt": "2026-08-13T22:00:00+09:00",
  "dryness": 2,
  "oiliness": 3,
  "redness": 1,
  "trouble": 2,
  "sleepLevel": 3,
  "stressLevel": 4,
  "memo": "턱 주변 트러블"
}
```

척도 범위는 MVP에서 0부터 5까지를 기본 후보로 한다.

---

## 11. Skin Photos

```text
POST /api/skin-photos/upload-url
POST /api/skin-photos
```

피부 기록용 사진은 선택 기능이다. Supabase Storage에 사진을 저장하고, DB에는 사진 경로와 연결된 피부 기록 ID만 저장한다.

성분표 사진과 피부 기록 사진은 다르게 취급한다. 성분표 사진은 제품 등록 OCR에만 사용하고 저장하지 않는다.

---

## 12. Analysis

### 분석 요청

```text
POST /api/analysis/run
```

사용자가 분석 탭에서 요청하면 현재까지 저장된 기록을 바탕으로 AI 분석을 수행한다.

응답 예시:

```json
{
  "data": {
    "analysisRunId": "analysis-run-id",
    "confidenceLevel": "data_insufficient",
    "summary": "현재 기록 수가 적어 신뢰도는 낮지만 반복 후보를 요약했습니다.",
    "positiveSuspectedIngredients": [
      {
        "name": "글리세린",
        "evidenceLevel": "weak",
        "reason": "건조함 점수가 낮았던 기록과 함께 여러 번 나타난 긍정적 의심 성분 후보입니다."
      }
    ],
    "negativeSuspectedIngredients": [
      {
        "name": "향료",
        "evidenceLevel": "data_insufficient",
        "reason": "붉음 기록과 같은 날 나타났지만 기록 수가 적어 부정적 의심 성분 후보로만 표시합니다."
      }
    ],
    "limitations": [
      "기록 기간이 짧습니다.",
      "수면과 스트레스 요인이 함께 기록되었습니다."
    ],
    "nextRecordsToAdd": [
      "같은 제품을 사용하지 않은 날의 피부 상태",
      "수면 상태"
    ]
  }
}
```

### 최근 분석 조회

```text
GET /api/analysis/latest
GET /api/analysis/runs/:analysisRunId
```

---

## 13. 금지 응답

분석 API와 제품 성분 추출 API는 다음 표현을 반환하지 않아야 한다.

- 특정 질환 진단
- 치료 방법 추천
- 의약품 사용 지시
- 특정 제품 또는 성분을 피부 변화의 원인으로 확정하는 표현
- 성분표 사진에 없는 성분을 사실처럼 추가하는 표현

분석 결과는 `추천 성분` 또는 `피해야 할 성분`처럼 강하게 단정하기보다, MVP에서는 `긍정적 의심 성분 후보`, `부정적 의심 성분 후보`로 표현한다.

