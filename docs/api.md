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
GET /api/products/search?q={query}&itemType={itemType}
```

흐름:

1. 자체 공용 제품 DB에서 제품명, 브랜드, 카테고리를 기준으로 검색한다.
2. 검색 결과가 있으면 `community`, `verified`, `seed` 제품을 반환한다.
3. 검색 결과는 검색어와 유사한 순으로 정렬한다.
4. `itemType`이 있으면 화장품, 샤워용품, 영양제 중 해당 항목만 반환한다.
5. 검색 결과가 없거나 성분 정보가 부족하면 `product-submissions` 흐름으로 직접 등록할 수 있다.

응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "product-id",
        "source": "community",
        "verificationStatus": "community",
        "itemType": "cosmetic",
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

정책:

- `q`는 앞뒤 공백을 제거한 뒤 1자 이상이어야 한다.
- `itemType`은 선택값이며 `cosmetic`, `shower_product`, `supplement` 중 하나다.
- 결과는 최대 20개를 반환한다.
- `ingredients`는 `product_ingredients.raw_name`을 기준으로 반환한다.
- MFDS 성분 마스터와 매칭되지 않은 성분은 `matchedIngredientId: null`, `matchStatus: "unmatched"`로 반환할 수 있다.

### 제품 제출용 성분표 추출

```text
POST /api/product-submissions/extract
```

사용자가 성분표 또는 라벨 사진을 제출하면 Backend가 OpenAI API로 텍스트와 성분·원료 후보를 추출한다. 화장품, 샤워용품, 영양제는 같은 제출 API를 사용하고 `itemType`으로 구분한다.

흐름:

1. Android 앱이 항목 유형과 성분표 또는 라벨 사진을 Backend로 전송한다.
2. Backend는 사진 원본을 저장하지 않고 AI 추출 요청에만 사용한다.
3. AI는 성분표, 원료명, 영양정보 텍스트와 후보 목록을 추출한다.
4. T7에서는 추출 후보를 원문과 정규화 이름 중심으로 반환하고 `matchStatus=unmatched`로 둔다. MFDS 성분 마스터 매칭은 후속 보강으로 확장한다.
5. Android 앱은 추출 결과를 사용자에게 보여준다.
6. 사용자는 결과를 확인하거나 수정한다.

요청 형식:

```text
multipart/form-data
```

필드:

| field | 설명 |
| --- | --- |
| `itemType` | `cosmetic`, `shower_product`, `supplement` |
| `ingredientLabelImage` | 성분표, 라벨, 원료명 또는 영양정보 사진 파일 |

응답 예시:

```json
{
  "data": {
    "extractedText": "정제수, 글리세린, 나이아신아마이드",
    "ingredients": [
      {
        "rawName": "글리세린",
        "normalizedName": "글리세린",
          "matchedIngredientId": null,
          "matchStatus": "unmatched"
      },
      {
        "rawName": "미확인성분",
        "normalizedName": "미확인성분",
        "matchedIngredientId": null,
        "matchStatus": "unmatched"
      }
    ],
    "warnings": ["AI 추출 결과는 사용자의 확인 후 저장됩니다."]
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
  "itemType": "cosmetic",
  "name": "제품명",
  "brand": "브랜드명",
  "category": "크림",
  "aiExtractedText": "정제수, 글리세린, 나이아신아마이드",
  "confirmedIngredientsText": "정제수, 글리세린, 나이아신아마이드",
}
```

응답 예시:

```json
{
  "data": {
    "submissionId": "submission-id",
    "productId": "product-id",
    "userProduct": {
      "id": "user-product-id",
      "productId": "product-id",
      "usageStatus": "past",
      "startedAt": null,
      "isPastExperience": true,
      "pastReactionMemo": null,
      "memo": null,
      "createdAt": "2026-08-18T08:00:00.000Z",
      "updatedAt": "2026-08-18T08:00:00.000Z",
      "product": {
        "id": "product-id",
        "source": "community",
        "verificationStatus": "community",
        "itemType": "cosmetic",
        "name": "제품명",
        "brand": "브랜드명",
        "category": "크림",
        "ingredientsText": "정제수, 글리세린, 나이아신아마이드",
        "ingredients": []
      }
    }
  }
}
```

등록 결과:

- 제품은 `products`에 `source=community`, `verificationStatus=community`로 저장된다.
- 제출 이력은 `product_submissions`에 저장된다.
- 성분표 또는 라벨 사진 원본은 저장하지 않는다.
- 등록된 제품은 같은 요청에서 로그인 사용자의 `user_products`에도 추가된다.
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
  "usageStatus": "past",
  "isPastExperience": true,
  "pastReactionMemo": "예전에 사용했을 때 건조함이 줄었던 것 같음"
}
```

정책:

- 인증 필요.
- Backend는 Supabase access token에서 확인한 사용자 ID만 사용한다.
- `startedAt`은 T3 Android 화면에서 입력받지 않으며 `null`로 저장한다.
- 같은 사용자가 같은 제품을 다시 등록하면 기존 row를 갱신한다.
- 제품이 공용 제품 DB에 없으면 `404 NOT_FOUND`를 반환한다.

응답 예시:

```json
{
  "data": {
    "id": "user-product-id",
    "productId": "product-id",
    "usageStatus": "past",
    "startedAt": null,
    "isPastExperience": true,
    "pastReactionMemo": "예전에 사용했을 때 건조함이 줄었던 것 같음",
    "memo": null,
    "createdAt": "2026-08-17T08:20:00.000Z",
    "updatedAt": "2026-08-17T08:20:00.000Z",
      "product": {
        "id": "product-id",
        "source": "seed",
        "verificationStatus": "verified",
        "itemType": "cosmetic",
        "name": "제품명",
      "brand": "브랜드명",
      "category": "크림",
      "ingredientsText": "정제수, 글리세린, 나이아신아마이드",
      "ingredients": [
        {
          "name": "글리세린",
          "normalizedName": "글리세린",
          "matchedIngredientId": null,
          "matchStatus": "unmatched"
        }
      ]
    }
  }
}
```

### 사용자 제품 조회

```text
GET /api/user-products
```

응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "user-product-id",
        "productId": "product-id",
        "usageStatus": "past",
        "startedAt": null,
        "isPastExperience": true,
        "pastReactionMemo": "겨울에 사용했을 때 건조함이 줄었던 것 같음",
        "memo": null,
        "createdAt": "2026-08-17T08:20:00.000Z",
        "updatedAt": "2026-08-17T08:20:00.000Z",
        "product": {
        "id": "product-id",
        "source": "seed",
        "verificationStatus": "verified",
        "itemType": "cosmetic",
        "name": "제품명",
          "brand": "브랜드명",
          "category": "크림",
          "ingredientsText": "정제수, 글리세린",
          "ingredients": []
        }
      }
    ]
  }
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

## 8. Product Presets

```text
POST /api/product-presets
GET  /api/product-presets
```

반복적으로 함께 사용하는 제품 묶음을 등록한다. 오늘 기록 화면에서 프리셋을 적용하면 프리셋에 포함된 제품들이 오늘 사용 제품으로 선택된다.

요청 예시:

```json
{
  "name": "저녁 루틴",
  "userProductIds": ["user-product-id-1", "user-product-id-2"]
}
```

응답 예시:

```json
{
  "data": {
    "id": "preset-id",
    "name": "저녁 루틴",
    "products": [
      {
        "userProductId": "user-product-id-1",
        "product": {
          "id": "product-id",
          "name": "제품명",
          "brand": "브랜드명",
          "category": "크림"
        }
      }
    ],
    "createdAt": "2026-08-17T08:30:00.000Z",
    "updatedAt": "2026-08-17T08:30:00.000Z"
  }
}
```

정책:

- 인증 필요.
- `userProductIds`는 모두 로그인 사용자의 `user_products`여야 한다.
- 같은 프리셋 안에 같은 제품을 중복 저장하지 않는다.

---

## 9. Daily Records

오늘의 피부 상태 기록은 하루 1개다. 제품 사용, 수면 시간, 얼굴 사진은 별도 기능이 아니라 오늘 기록에 포함되는 데이터다.

### 사용자 지역 설정

```text
GET /api/profile/location-options
PUT /api/profile/location
GET /api/profile/location
```

기상청 날씨 API 연동을 위해 사용자의 지역 정보를 저장한다. MVP에서는 정밀 GPS 좌표나 격자 좌표를 저장하지 않고, 사용자가 시/군/구 버튼으로 고른 지역명과 대표 ASOS 관측소 ID를 저장한다.

지역 옵션 응답 예시:

```json
{
  "data": {
    "items": [
      {
        "id": "seoul-gangnam",
        "regionLabel": "서울특별시 강남구",
        "weatherStationId": 108,
        "weatherStationName": "서울"
      }
    ]
  }
}
```

요청 예시:

```json
{
  "locationId": "seoul-gangnam"
}
```

정책:

- 인증 필요.
- Android에는 기상청 API key를 저장하지 않는다.
- 사용자는 시/군/구 버튼으로 지역을 선택하고 설정 탭에서 변경할 수 있다.
- 위치 정보가 없으면 오늘 기록은 저장하되 날씨 스냅샷은 비워 둔다.

### 오늘 기록 저장 또는 갱신

```text
POST /api/daily-records
```

요청 형식:

```text
multipart/form-data
```

필드:

| field | 설명 |
| --- | --- |
| `recordDate` | `YYYY-MM-DD`. 없으면 Backend가 요청 시점 기준 날짜를 사용 |
| `dryness` | 건조함 점수, 0-5 |
| `oiliness` | 유분 점수, 0-5 |
| `redness` | 붉음 점수, 0-5 |
| `trouble` | 트러블 점수, 0-5 |
| `sleepHours` | 수면 시간, 0-24. 소수 1자리까지 허용 |
| `outdoorMinutes` | 선택 외출 시간, 분 단위 |
| `userProductIds` | JSON 문자열 배열. 오늘 사용한 사용자 제품 ID 목록 |
| `appliedPresetIds` | JSON 문자열 배열. 적용한 프리셋 ID 목록 |
| `memo` | 선택 메모 |
| `facePhoto` | 선택 얼굴 사진 파일 |

JSON 요청이 필요한 테스트나 사진 없는 저장에서는 `application/json`도 허용할 수 있다.

```json
{
  "recordDate": "2026-08-17",
  "dryness": 2,
  "oiliness": 3,
  "redness": 1,
  "trouble": 2,
  "sleepHours": 6.5,
  "outdoorMinutes": 40,
  "userProductIds": ["user-product-id"],
  "appliedPresetIds": ["preset-id"],
  "memo": "저녁에 보습 제품을 추가로 사용"
}
```

정책:

- 인증 필요.
- 하루 기록은 `user_id + record_date` 기준 1개만 유지한다.
- 같은 날짜로 다시 저장하면 기존 오늘 기록과 연결 제품 목록, 선택 사진 메타데이터를 갱신한다.
- 오늘 사용 제품은 여러 개 선택할 수 있다.
- 기록 화면에서 공용 제품 DB에 있는 제품을 검색해 `user_products`에 추가한 뒤 바로 `userProductIds`에 포함할 수 있다.
- 공용 제품 DB에 없는 제품을 성분표 사진으로 새로 등록하는 흐름은 `product-submissions` 단계에서 제공한다.
- 제품 사용 기록 저장만으로 `user_products.usage_status`를 자동 변경하지 않는다.
- 얼굴 사진은 선택 입력이다. 사진 없이도 오늘 기록을 저장할 수 있다.
- 사용자의 지역이 설정되어 있으면 Backend가 기상청 API허브 ASOS 관측 API에서 기록 저장 시점과 가장 가까운 시각의 기온, 습도, 강수량, 풍속 등을 조회해 기록에 스냅샷으로 저장한다.
- 날씨 API 호출이 실패해도 오늘 기록 저장은 실패시키지 않고, 환경 정보만 비워 둘 수 있다.
- 스트레스 점수는 T4 범위에서 제외한다.

응답 예시:

```json
{
  "data": {
    "id": "daily-record-id",
    "recordDate": "2026-08-17",
    "loggedAt": "2026-08-17T22:00:00+09:00",
    "dryness": 2,
    "oiliness": 3,
    "redness": 1,
    "trouble": 2,
    "sleepHours": 6.5,
    "outdoorMinutes": 40,
    "memo": "저녁에 보습 제품을 추가로 사용",
    "environment": {
      "source": "kma",
      "regionLabel": "서울특별시 강남구",
      "weatherStationId": 108,
      "weatherStationName": "서울",
      "observedAt": "2026-08-17T21:00:00+09:00",
      "temperatureCelsius": 27.4,
      "humidityPercent": 78,
      "precipitationAmountMm": 0,
      "windSpeedMps": 1.8
    },
    "products": [
      {
        "userProductId": "user-product-id",
        "product": {
          "id": "product-id",
          "name": "제품명",
          "brand": "브랜드명",
          "category": "크림"
        }
      }
    ],
    "appliedPresets": [
      {
        "id": "preset-id",
        "name": "저녁 루틴"
      }
    ],
    "facePhoto": {
      "id": "skin-photo-id",
      "storagePath": "user-id/daily-record-id/photo.jpg"
    },
    "createdAt": "2026-08-17T13:00:00.000Z",
    "updatedAt": "2026-08-17T13:00:00.000Z"
  }
}
```

### 오늘 기록 조회

```text
GET /api/daily-records?from={date}&to={date}
```

정책:

- `from`, `to`가 모두 없으면 오늘 날짜 기록만 조회한다.
- 최근 기록 화면은 Android가 최근 14일 범위를 계산해 `from`, `to`를 함께 전달한다.
- Backend는 저장된 기록만 반환한다.
- 기록이 없는 날짜의 empty state는 Android가 날짜 범위를 기준으로 채운다.
- 최신 기록 1개가 필요하면 별도 `latest` API를 만들지 않고, `GET /api/daily-records?from&to` 결과를 최신순으로 받아 클라이언트 또는 service에서 첫 번째 항목을 사용한다.

정책:

- `from`, `to`가 없으면 오늘 기록을 조회한다.
- 날짜 범위는 `YYYY-MM-DD`로 검증한다.

### 피부 상태 추이 조회

```text
GET /api/daily-records/trends?from={date}&to={date}
```

기록 탭의 추이 화면에서 사용할 그래프 친화 응답을 반환한다.

정책:

- 인증 필요.
- `from`, `to`가 모두 없으면 오늘 기준 최근 14일을 반환한다.
- 기간 내 모든 날짜를 `points`에 포함한다.
- 기록이 없는 날짜는 피부 점수와 생활 데이터가 `null`로 내려간다.
- 사용 제품은 대표 제품명 최대 3개와 나머지 개수를 함께 반환한다.

응답 예시:

```json
{
  "data": {
    "from": "2026-08-05",
    "to": "2026-08-18",
    "points": [
      {
        "date": "2026-08-18",
        "scores": {
          "dryness": 2,
          "oiliness": 3,
          "redness": 1,
          "trouble": 2
        },
        "sleepHours": 6.5,
        "outdoorMinutes": 40,
        "productSummary": {
          "count": 4,
          "names": ["제품 A", "제품 B", "제품 C"],
          "remainingCount": 1
        },
        "environment": {
          "source": "kma",
          "regionLabel": "서울특별시 강남구",
          "weatherStationId": 108,
          "weatherStationName": "서울",
          "observedAt": "2026-08-18T21:00:00+09:00",
          "temperatureCelsius": 27.4,
          "humidityPercent": 78,
          "precipitationAmountMm": 0,
          "windSpeedMps": 1.8
        }
      },
      {
        "date": "2026-08-17",
        "scores": {
          "dryness": null,
          "oiliness": null,
          "redness": null,
          "trouble": null
        },
        "sleepHours": null,
        "outdoorMinutes": null,
        "productSummary": {
          "count": 0,
          "names": [],
          "remainingCount": 0
        },
        "environment": null
      }
    ]
  }
}
```

---

## 10. Skin Photos

```text
POST /api/skin-photos/upload-url
POST /api/skin-photos
```

피부 기록용 사진은 선택 기능이다. Supabase Storage에 사진을 저장하고, DB에는 사진 경로와 연결된 오늘 기록 ID만 저장한다.

성분표 사진과 피부 기록 사진은 다르게 취급한다. 성분표 사진은 제품 등록 OCR에만 사용하고 저장하지 않는다.

---

## 11. Analysis

### 분석 요청

```text
POST /api/analysis/run
```

사용자가 분석 탭에서 요청하면 현재까지 저장된 기록을 바탕으로 AI 분석을 수행한다.

분석 입력 범위:

- 최근 30일의 피부 기록은 상세 evidence로 사용한다.
- 전체 기간의 피부 기록은 Backend가 성분별 노출 횟수, 개선일 동반 횟수, 악화일 동반 횟수, 마지막 노출일 같은 압축 통계로 집계한다.
- 이전 최신 분석 결과의 요약과 후보 성분 이름을 함께 사용해 분석 맥락을 이어간다.
- AI에는 전체 기간의 원본 기록 전체를 그대로 전달하지 않고, 최근 상세 기록과 장기 압축 통계, 이전 분석 요약만 전달한다.
- OpenAI 호출 실패 시 Backend 집계 기반 fallback 분석을 저장하고 반환할 수 있다.

응답 예시:

```json
{
  "data": {
    "analysisRunId": "analysis-run-id",
    "requestedAt": "2026-08-18T09:00:00.000Z",
    "confidenceLevel": "data_insufficient",
    "summary": "현재 기록 수가 적어 신뢰도는 낮지만 반복 후보를 요약했습니다.",
    "positiveSuspectedIngredients": [
      {
        "id": "finding-id",
        "name": "글리세린",
        "evidenceLevel": "weak",
        "reason": "건조함 점수가 낮았던 기록과 함께 여러 번 나타난 긍정적 의심 성분 후보입니다.",
        "supportingLogs": ["전체 노출 4회", "최근 30일 노출 2회"]
      }
    ],
    "negativeSuspectedIngredients": [
      {
        "id": "finding-id",
        "name": "향료",
        "evidenceLevel": "data_insufficient",
        "reason": "붉음 기록과 같은 날 나타났지만 기록 수가 적어 부정적 의심 성분 후보로만 표시합니다.",
        "supportingLogs": ["전체 노출 1회"]
      }
    ],
    "limitations": [
      "기록 기간이 짧습니다.",
      "수면 시간이 짧았던 날이 함께 기록되었습니다."
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

정책:

- 인증 필요.
- 분석 탭 진입 시 `GET /api/analysis/latest`로 마지막 분석을 조회한다.
- 사용자가 `분석하기`를 누르면 `POST /api/analysis/run`으로 새 분석을 생성한다.
- 긍정적 의심 성분 후보와 부정적 의심 성분 후보는 각각 최대 5개다.
- 결과는 원인 확정, 진단, 치료 표현 없이 관련 가능성으로 표시한다.

---

## 12. 금지 응답

분석 API와 제품 성분 추출 API는 다음 표현을 반환하지 않아야 한다.

- 특정 질환 진단
- 치료 방법 추천
- 의약품 사용 지시
- 특정 제품 또는 성분을 피부 변화의 원인으로 확정하는 표현
- 성분표 사진에 없는 성분을 사실처럼 추가하는 표현

분석 결과는 `추천 성분` 또는 `피해야 할 성분`처럼 강하게 단정하기보다, MVP에서는 `긍정적 의심 성분 후보`, `부정적 의심 성분 후보`로 표현한다.

