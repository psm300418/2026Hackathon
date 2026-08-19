# Demo Data

> 문서 상태: 초안
> 목적: 해커톤 시연용 계정, 제품, 프리셋, 최근 30일 기록 준비

## 1. 실행 방법

Backend의 Supabase 환경변수가 설정된 상태에서 실행한다.

```bash
cd Backend
npm run seed:demo-data
```

기본 데모 계정:

- 이메일: `demo@example.com`
- 비밀번호: `demo1234`

다른 계정을 쓰려면 `Backend/.env`에 아래 값을 추가한다.

```text
DEMO_USER_EMAIL=demo@example.com
DEMO_USER_PASSWORD=demo1234
```

## 2. 생성 데이터

### 공용 제품 DB

시연 데이터는 역할이 다른 제품과 분석 포인트를 보여주기 위해 아래 11개 제품을 준비한다.

| 역할 | 브랜드 | 제품명 | item_type | 출처 |
| --- | --- | --- | --- | --- |
| 스킨 | 라운드랩 | 1025 독도 토너 | `cosmetic` | 기존 공식 seed |
| 로션 | 라운드랩 | 소나무 진정 시카 로션 | `cosmetic` | 기존 공식 seed |
| 에센스 | 라운드랩 | 자작나무 수분 앰플 | `cosmetic` | 기존 공식 seed |
| 선크림 | 에스트라 | 더마UV365 장벽수분 무기자차 선크림 | `cosmetic` | 기존 공식 seed |
| 테스트 크림 | 데모랩 | 글로우 리치 나이트 크림 | `cosmetic` | 해커톤 데모용 admin 제품 |
| 1주차 클렌저 | COSRX | 하이드리움 트리플 히알루로닉 모이스처라이징 클렌저 | `cosmetic` | COSRX 공식몰 |
| 2주차 클렌저 | COSRX | AC 컬렉션 카밍 폼 클렌저 | `cosmetic` | COSRX 공식몰 |
| 3주차 클렌저 | COSRX | 약산성 굿모닝 젤 클렌저 | `cosmetic` | COSRX 공식몰 |
| 4주차 클렌저 | COSRX | 레드 라이스 이노시톨 포어 클라리파잉 딥 클렌저 | `cosmetic` | COSRX 공식몰 |
| 샴푸 | 닥터포헤어 | 폴리젠 플러스 탈모 완화 샴푸 | `shower_product` | DailyMed label, 닥터포헤어 공식몰 |
| 영양제 | 센트룸 | 센트룸 멀티구미 | `supplement` | Haleon Korea 보도자료 |

테스트 크림, 주차별 클렌저, 샴푸, 영양제는 기존 DB에 부족한 카테고리와 분석 시나리오를 보완하기 위해 `source=admin`, `verification_status=verified`, `seed_batch=demo_hackathon_20260818`로 저장한다.

### 내 제품

데모 계정의 `user_products`에 11개 제품을 모두 `current`로 등록한다. `past_reaction_memo`에는 사용자가 이전 사용 경험을 입력한 것처럼 짧은 현실적인 메모를 넣는다.

### 프리셋

7개 프리셋을 만든다.

| 프리셋 | 구성 |
| --- | --- |
| 아침 기본 루틴 | 토너, 로션, 선크림 |
| 저녁 회복 루틴 | 토너, 앰플, 로션 |
| 1주차 수분 클렌징 | 하이드리움 트리플 히알루로닉 모이스처라이징 클렌저 |
| 2주차 BHA 클렌징 | AC 컬렉션 카밍 폼 클렌저 |
| 3주차 약산성 클렌징 | 약산성 굿모닝 젤 클렌저 |
| 4주차 포어 클렌징 | 레드 라이스 이노시톨 포어 클라리파잉 딥 클렌저 |
| 두피/영양 관리 | 샴푸, 센트룸 멀티구미 |

### 최근 30일 일일 기록

실행일 기준 최근 30일의 `daily_records`를 생성한다. `2026-08-19`에 실행하면 `2026-07-21`부터 `2026-08-19`까지다.

기록에는 다음 값을 현실적인 범위로 넣는다.

- 피부 점수: 건조함, 유분, 붉음, 트러블을 0-5 범위로 기록
- 생활 변수: 수면 시간, 외출 시간
- 사용 제품: 아침 기본 루틴은 대부분 매일, 저녁 회복 루틴은 주 4-5회, 폼/젤 클렌저는 1주일 단위로 교체, 두피/영양 관리는 격일 또는 주기적으로 반영
- 환경 스냅샷: 서울특별시 강남구 기준의 데모 온도, 습도, 강수량, 풍속
- 메모: 수면 부족, 외출, 보습, 두피 관리 같은 짧은 사용자 메모

분석 시연이 밋밋하지 않도록 아래 포인트를 의도적으로 포함한다.

- 최근 30일 중간 지점에 `글로우 리치 나이트 크림` 첫 사용일을 만들고, 같은 날 수면 부족, 긴 외출, 높은 습도를 함께 기록한다.
- 2주차에는 `AC 컬렉션 카밍 폼 클렌저` 사용과 함께 트러블·붉음이 내려가는 흐름을 만들어 `Salicylic Acid`, `Asiaticoside`, `Madecassic Acid` 같은 특징 성분이 긍정 후보로 잡히게 한다.
- 4주차에는 `레드 라이스 이노시톨 포어 클라리파잉 딥 클렌저` 사용과 낮은 습도·건조 급증을 겹치게 해 `Kaolin`, `Hydrated Silica`, `Cellulose` 같은 성분이 부정 후보로 잡히게 한다.
- 다음 날에도 높은 습도와 강수, 트러블 지속 기록을 남겨 “첫 사용 제품 + 환경 요인”을 후보 요인으로 볼 수 있게 한다.
- 후반부에는 수면 부족과 긴 외출 후 붉음이 크게 오른 날을 만든다.
- 별도의 날에는 낮은 습도와 건조함 급증을 만들어 제품 후보뿐 아니라 환경 후보도 보이게 한다.

## 3. 출처

- 라운드랩 1025 독도 토너: `https://roundlab.com/products/1025-dokdo-toner`
- 라운드랩 소나무 진정 시카 로션: `https://roundlab.com/products/pine-calming-cica-lotion`
- 라운드랩 자작나무 수분 앰플: `https://roundlab.com/products/birch-moisturizing-serum`
- 에스트라 더마UV365 장벽수분 무기자차 선크림: `https://www.aestura.com/web/product/view.do?prdSeq=1107`
- COSRX Hydrium Triple Hyaluronic Moisturizing Cleanser: `https://www.cosrx.com/products/triple-hyaluronic-moisturizing-cleanser`
- COSRX AC Collection Calming Foam Cleanser: `https://www.cosrx.com/products/ac-collection-calming-foam-cleanser`
- COSRX Low pH Good Morning Gel Cleanser: `https://www.cosrx.com/products/low-ph-good-morning-gel-cleanser`
- COSRX RED RICE INOSITOL Pore Clarifying Deep Cleanser: `https://www.cosrx.com/products/cosrx-red-rice-inositol-pore-clarifying-deep-cleanser`
- 닥터포헤어 폴리젠 플러스 탈모 완화 샴푸 공식몰: `https://drforhair.co.kr/product/%ED%8F%B4%EB%A6%AC%EC%A0%A0-%ED%94%8C%EB%9F%AC%EC%8A%A4-%ED%83%88%EB%AA%A8-%EC%99%84%ED%99%94-%EC%83%B4%ED%91%B8-500ml/968/`
- Dr.FORHAIR FOLLIGEN DailyMed label: `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?audience=consumer&setid=f2dcca44-72a4-4e90-92e9-08c3d95e4893`
- 센트룸 멀티구미 Haleon Korea 보도자료: `https://www.haleon.com/kr/news/press-releases/brand/2021/2021-04-01`
- 글로우 리치 나이트 크림: 해커톤 분석 시연을 위한 데모 제품이며 실제 제품 출처가 아니다.

## 4. 시연 시 보완하면 좋은 데이터

- 초기 피부 타입 설문 응답 완료 상태: 온보딩을 건너뛰지 않고 자연스럽게 보여주려면 데모 계정으로 한 번 설문을 완료해두는 것이 좋다.
- 분석 실행 결과: seed 스크립트가 마지막에 `analysis_runs`를 하나 생성하므로 분석 탭 진입 시 이전 분석 결과를 바로 보여줄 수 있다.
- 제품 직접 등록 시연용 사진: 실제 DB에는 사진을 저장하지 않지만, OCR 흐름을 보여주려면 성분표 사진 1장을 로컬 시연 자료로 준비하면 좋다.
