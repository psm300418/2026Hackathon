# Product Seed Summary

> 자동 생성 파일이다. 원본은 `docs/DB/*.md`이며, 재생성은 `npm run prepare:product-seed`로 수행한다.

## 전체 요약

| 항목 | 수 |
| --- | ---: |
| 제품 | 197 |
| 제품-성분 행 | 6805 |
| 고유 성분 후보 | 1020 |
| 함량 표기 포함 성분 행 | 183 |
| 제품당 평균 성분 수 | 34.5 |

## 원본 파일별 제품 수

| 원본 | batch id | 제품 수 |
| --- | --- | ---: |
| 국내 공식 제품명 확인판 97종 | `seed_97_ko_official` | 97 |
| 추가 100종 | `seed_additional_100_ko_official` | 100 |

## 브랜드별 제품 수

| 항목 | 수 |
| --- | ---: |
| 비플레인 | 40 |
| 라운드랩 | 27 |
| 스킨1004 | 21 |
| 닥터지 | 20 |
| 셀리맥스 | 20 |
| 에스트라 | 20 |
| 코스알엑스 | 18 |
| 아누아 | 12 |
| 토리든 | 10 |
| 조선미녀 | 9 |

## 카테고리별 제품 수

| 항목 | 수 |
| --- | ---: |
| 크림 | 32 |
| 세럼 | 25 |
| 토너 | 25 |
| 클렌저 | 23 |
| 마스크 | 19 |
| 앰플 | 12 |
| 선크림 | 11 |
| 패드 | 8 |
| 로션 | 7 |
| 에센스 | 4 |
| 미스트 | 3 |
| 아이크림 | 3 |
| 클렌징 오일 | 3 |
| 각질 케어 | 2 |
| 립케어 | 2 |
| 바디 패드 | 2 |
| 선스틱 | 2 |
| 스팟 크림 | 2 |
| 젤 크림 | 2 |
| 클렌저/마스크 | 2 |
| 필링 | 2 |
| 바디 로션 | 1 |
| 바디 크림 | 1 |
| 스팟 트리트먼트 | 1 |
| 자외선차단제 | 1 |
| 클렌징 밤 | 1 |
| 클렌징 워터 | 1 |

## 중복 검사

중복 제품은 발견되지 않았다.

## 생성 파일

- `product_seed.products.json`: `products` 테이블에 넣을 제품 원천 데이터
- `product_seed.product_ingredients.json`: `product_ingredients` 테이블에 넣을 제품별 전성분 순서 데이터
- `product_seed.ingredient_candidates.json`: MFDS 매칭 전 성분 후보 사전
- `product_seed.products.csv`: Supabase CSV import 또는 수동 검토용 제품 데이터
- `product_seed.product_ingredients.csv`: Supabase CSV import 또는 수동 검토용 제품별 성분 데이터
- `product_seed.ingredient_candidates.csv`: 성분 후보 검토용 CSV

## Import 절차

1. Supabase SQL Editor에서 `Backend/supabase/migrations/202608170001_create_product_seed_tables.sql`을 실행한다.
2. `Backend/.env`에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있는지 확인한다.
3. `cd Backend && npm run import:product-seed`를 실행한다.

## 적용 원칙

- `products.source`는 `seed`로 저장한다.
- `products.verification_status`는 공식 출처 기반 seed임을 고려해 `verified`로 둔다.
- `product_ingredients.match_status`는 MFDS 표준 성분 매칭 전이므로 `unmatched`로 둔다.
- `product_ingredients.raw_name`은 원본 전성분 표기와 순서를 보존한다.
- `ingredientNameCandidate`는 함량 표기를 제거한 매칭 후보일 뿐, MFDS 표준명으로 확정하지 않는다.
