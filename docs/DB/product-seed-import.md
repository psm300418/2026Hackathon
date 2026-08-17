# Product Seed Import

> 문서 상태: 초안  
> 목적: `docs/DB` 원본 Markdown을 Supabase `products`, `product_ingredients` 테이블에 연결하는 절차를 기록한다.

## 1. 원본과 산출물

원본 파일:

- `docs/DB/kbeauty_skin_products_ingredients_seed_97_ko_official_names.md`
- `docs/DB/kbeauty_skin_products_ingredients_seed_additional_100_ko_official.md`

정리 산출물:

- `Backend/supabase/seed/product_seed.products.json`
- `Backend/supabase/seed/product_seed.product_ingredients.json`
- `Backend/supabase/seed/product_seed.ingredient_candidates.json`
- `Backend/supabase/seed/product_seed.summary.md`
- 동일 데이터의 CSV 파일

## 2. 전체 흐름

```text
docs/DB Markdown
  -> npm run prepare:product-seed
  -> Backend/supabase/seed/*.json, *.csv
  -> Supabase migration 적용
  -> npm run import:product-seed
  -> products, product_ingredients
```

## 3. Seed 파일 재생성

```bash
cd Backend
npm run prepare:product-seed
```

이 명령은 원본 Markdown을 다시 파싱하고 seed JSON/CSV/summary 파일을 생성한다.

현재 정리 결과:

- 제품: 197개
- 제품-성분 행: 6,805개
- 고유 성분 후보: 1,020개
- 중복 제품: 없음

## 4. Supabase 테이블 생성

먼저 다음 migration SQL을 Supabase에 적용한다.

```text
Backend/supabase/migrations/202608170001_create_product_seed_tables.sql
```

현재 프로젝트는 `SUPABASE_DB_URL`을 사용한 자동 migration 실행이 아직 준비되지 않았으므로, MVP 단계에서는 Supabase Dashboard의 SQL Editor에서 위 SQL을 실행하는 방식을 사용한다.

생성되는 주요 테이블:

- `products`
- `ingredients`
- `product_ingredients`

RLS 방향:

- `products`, `ingredients`, `product_ingredients`는 읽기만 공개한다.
- insert, update, delete는 public policy를 만들지 않는다.
- seed import와 향후 community 제품 등록은 Backend service role을 통해 수행한다.

## 5. Supabase에 Seed Import

`Backend/.env`에 다음 값이 있어야 한다.

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

실행:

```bash
cd Backend
npm run import:product-seed
```

동작:

1. `product_seed.products.json`을 읽어 `products`에 `external_id` 기준으로 upsert한다.
2. seed 제품의 기존 `product_ingredients` 행을 삭제한다.
3. `product_seed.product_ingredients.json`을 읽어 전성분 순서대로 다시 insert한다.
4. 아직 MFDS 매칭 전이므로 `ingredient_id`는 `null`, `match_status`는 `unmatched`로 저장한다.

## 6. 확인 쿼리

Supabase SQL Editor에서 다음 쿼리로 확인한다.

```sql
select count(*) from public.products where source = 'seed';
select count(*) from public.product_ingredients;
select brand, count(*)
from public.products
where source = 'seed'
group by brand
order by count(*) desc;
```

기대값:

- `products`: 197
- `product_ingredients`: 6,805

## 7. 주의사항

- 원본 Markdown은 조사 자료로 보존한다.
- DB에는 원본 전성분 순서와 출처 URL, 출처 확인일을 함께 저장한다.
- `ingredientNameCandidate`는 MFDS 표준 성분명이 아니라 매칭 전 후보명이다.
- 성분 표준화와 `ingredient_id` 연결은 MFDS ingredient master import 이후 별도 단계로 처리한다.
- service role key는 Android 앱, GitHub, 문서에 넣지 않는다.

