# Design

> 문서 상태: 초안  
> 기준 이미지: `C:/Users/psm30/Desktop/1.png`  
> 목적: Android Jetpack Compose 화면을 만들 때 색상, 여백, 글자 크기, 컴포넌트 형태를 일관되게 유지하기 위한 디자인 기준을 정의한다.

## 1. 디자인 방향

이 앱의 시각 방향은 화장품 앱 특유의 깨끗함, 차분함, 제품 신뢰감을 우선한다. 화면은 많은 장식보다 넓은 여백, 밝은 배경, 실제 제품 또는 피부 기록 이미지를 중심으로 구성한다.

핵심 키워드:

- Clean
- Soft
- Clinical
- Warm
- Minimal
- Premium

전체 인상은 흰색과 따뜻한 아이보리를 기본으로 하고, 주요 행동과 선택 상태에만 올리브 그린을 사용한다. 강조 색은 많지 않게 제한하여 기록, 분석, 제품 등록 화면이 모두 같은 서비스처럼 보이게 한다.

## 2. 컬러 토큰

스크린샷에서 추출한 주요 색상은 다음과 같다.

| 토큰 | Hex | 용도 |
| --- | --- | --- |
| `Color.BackgroundWarm` | `#F2F3EE` | 기본 앱 배경, 온보딩 배경 |
| `Color.BackgroundIvory` | `#E8E8D8` | 사진 뒤 배경, 큰 빈 영역 |
| `Color.Surface` | `#FFFFFF` | 카드, 검색창, 기본 화면 |
| `Color.SurfaceSoft` | `#F8F8F8` | 입력창, 비활성 영역, 리스트 배경 |
| `Color.PrimaryOlive` | `#A9B184` | 주요 CTA, 선택된 칩, 활성 내비게이션 |
| `Color.PrimaryOlivePressed` | `#949D6D` | CTA pressed 상태 |
| `Color.PrimaryOliveSoft` | `#EEF1E4` | 연한 선택 배경, 안내 배지 |
| `Color.AccentCoral` | `#D8A08E` | 선택 탭 테두리, 보조 강조 |
| `Color.AccentCoralSoft` | `#F7EEE8` | 선택 탭 배경 |
| `Color.TextPrimary` | `#181818` | 제목, 주요 본문 |
| `Color.TextSecondary` | `#707070` | 본문 보조, 설명 텍스트 |
| `Color.TextTertiary` | `#B8B8B0` | placeholder, 비활성 텍스트 |
| `Color.Border` | `#EDEDEB` | 기본 구분선, 칩 테두리 |
| `Color.ShadowWarm` | `rgba(64, 56, 44, 0.08)` | 카드와 검색창 그림자 |

사용 규칙:

- 올리브는 한 화면에서 1개 주요 행동 또는 선택 상태에 집중해서 쓴다.
- 코랄은 작은 보조 강조에만 사용한다. CTA 색으로 쓰지 않는다.
- 배경은 순백만 쓰기보다 `BackgroundWarm`과 `Surface`를 섞어 따뜻한 느낌을 유지한다.
- 분석 경고나 오류 색은 별도 기능 구현 시 추가하되, 전체 화면을 강한 빨강으로 덮지 않는다.

## 3. 타이포그래피

폰트는 Android 기본 시스템 폰트를 우선 사용한다. 서비스 톤을 더 정리할 수 있으면 `Pretendard`를 앱 폰트로 추가한다.

권장 폰트 스택:

```text
Pretendard, Noto Sans KR, Android System Font
```

| 역할 | 크기 | 줄높이 | 굵기 | 용도 |
| --- | ---: | ---: | ---: | --- |
| `Display` | 28sp | 36sp | 700 | 온보딩 핵심 문구 |
| `ScreenTitle` | 24sp | 32sp | 700 | 주요 화면 제목 |
| `SectionTitle` | 18sp | 24sp | 700 | 섹션 제목 |
| `CardTitle` | 15sp | 20sp | 700 | 제품명, 분석 결과 제목 |
| `Body` | 14sp | 22sp | 400 | 일반 설명, 기록 내용 |
| `BodyStrong` | 14sp | 22sp | 600 | 짧은 강조 텍스트 |
| `Caption` | 12sp | 16sp | 400 | 보조 설명, 가격, 메타데이터 |
| `NavLabel` | 10sp | 12sp | 500 | 하단 내비게이션 라벨 |

문장 스타일:

- 제목은 짧고 중앙 정렬 또는 좌측 정렬 중 화면 목적에 맞게 선택한다.
- 온보딩과 선택 화면은 중앙 정렬을 사용한다.
- 홈, 검색, 기록, 분석 화면은 좌측 정렬을 기본으로 한다.
- 한국어 본문은 너무 얇게 보이지 않도록 400 이상을 사용한다.

## 4. 여백과 레이아웃

기본 단위는 4dp 그리드를 사용한다.

| 항목 | 값 |
| --- | ---: |
| 화면 좌우 기본 여백 | 20dp |
| 온보딩/선택 화면 좌우 여백 | 24dp |
| 섹션 간격 | 28dp |
| 제목과 설명 간격 | 8dp |
| 설명과 콘텐츠 간격 | 32dp |
| 리스트 아이템 간격 | 12dp |
| 카드 간격 | 16dp |
| 칩 가로 간격 | 12dp |
| 칩 세로 간격 | 16dp |
| 하단 CTA 좌우 여백 | 20dp |
| 하단 CTA와 화면 하단 간격 | 24dp |
| 하단 내비게이션 높이 | 72dp |

화면 구성 원칙:

- 한 화면에 모든 정보를 밀어 넣지 말고, 가장 중요한 행동 1개를 먼저 보이게 한다.
- 상단 여백은 넉넉하게 두되 홈 화면은 콘텐츠 밀도를 조금 높인다.
- 제품 카드와 기록 카드는 2열 또는 가로 스크롤을 사용할 수 있다.
- 버튼, 칩, 검색창은 높이를 고정해 화면 이동 시 흔들림이 없게 한다.

## 5. 형태와 반경

| 컴포넌트 | Radius | 높이 또는 크기 |
| --- | ---: | ---: |
| Primary Button | 28dp | 56dp |
| Circular CTA | 999dp | 60dp |
| Icon Button | 999dp | 40dp |
| Category Chip | 999dp | 44dp |
| Search Field | 4dp-8dp | 48dp |
| Product Image | 14dp-16dp | 화면에 맞게 |
| Product Card | 8dp-12dp | 콘텐츠에 맞게 |
| Bottom Sheet | 24dp top | 화면에 맞게 |
| Dialog/Card | 8dp | 콘텐츠에 맞게 |

참고 이미지의 느낌을 살리기 위해 버튼과 칩은 둥글게 유지한다. 다만 정보가 많은 기록 카드와 분석 카드는 과하게 둥글게 만들지 않고 8dp 중심으로 정리한다.

## 6. 그림자와 경계선

그림자는 약하게 사용한다.

권장 그림자:

```text
elevation: 2dp-6dp
color: rgba(64, 56, 44, 0.08)
```

사용 규칙:

- 검색창, 제품 카드, 하단 내비게이션에는 약한 그림자를 허용한다.
- 기록 리스트와 분석 결과는 경계선 중심으로 정리한다.
- 그림자와 테두리를 동시에 강하게 쓰지 않는다.
- 구분선은 `Border` 색상으로 얇게 사용한다.

## 7. 주요 컴포넌트

### 7.1 Primary Button

- 배경: `PrimaryOlive`
- 텍스트: 흰색, 15sp, 600
- 높이: 56dp
- 좌우 패딩: 24dp
- radius: 28dp
- disabled: `#D0D0D0` 배경, 흰색 텍스트

주요 사용처:

- 계속하기
- 저장하기
- 분석 요청하기
- 제품 등록 완료

### 7.2 Text Button

- 배경 없음
- 텍스트: `TextTertiary`, 14sp
- 보조 행동에만 사용한다.

주요 사용처:

- 나중에 하기
- 건너뛰기
- 취소

### 7.3 Category Chip

- 기본 배경: `Surface`
- 기본 테두리: `Border`
- 기본 텍스트: `TextPrimary`
- 선택 배경: `PrimaryOlive`
- 선택 텍스트: 흰색
- 높이: 44dp
- 좌우 패딩: 16dp
- 아이콘이 있으면 텍스트 왼쪽 8dp 간격에 둔다.

제품 카테고리, 피부 상태 태그, 생활 요인 태그에 사용한다.

### 7.4 Search Field

- 높이: 48dp
- 배경: `Surface`
- placeholder: `TextTertiary`
- leading icon: 검색 아이콘, 20dp
- 좌우 패딩: 16dp
- 그림자: 2dp

제품 검색 화면의 최상단 주요 입력으로 사용한다.

### 7.5 Product Card

- 이미지가 카드의 시각 중심이 되도록 상단에 크게 배치한다.
- 제품명은 15sp, 700으로 2줄까지 허용한다.
- 설명은 12sp 또는 13sp로 2줄까지 제한한다.
- 제품 등록 상태는 작은 배지로 표시한다.
- 찜, 추가, 선택 같은 보조 행동은 원형 아이콘 버튼으로 처리한다.

제품 카드 상태:

- `seed`: 기본 제품
- `community`: 사용자 등록 제품
- `verified`: 검토된 제품
- `needs_review`: 성분 확인 필요

### 7.6 Bottom Navigation

- 높이: 72dp
- 배경: `Surface`
- 활성 아이콘/라벨: `PrimaryOlive`
- 비활성 아이콘/라벨: `TextTertiary`
- 아이콘 크기: 22dp
- 라벨: 10sp

초기 탭 권장:

- Home
- Products
- Record
- Analysis
- Profile

### 7.7 Analysis Result Card

분석 결과는 신뢰감을 주기 위해 장식보다 구조를 우선한다.

- 카드 radius: 8dp
- 배경: `Surface`
- 테두리: `Border`
- 제목: 16sp, 700
- 본문: 14sp, 22sp
- 근거 수준 배지:
  - 강함: `PrimaryOlive`
  - 중간: `PrimaryOliveSoft`
  - 약함: `AccentCoralSoft`
  - 데이터 부족: `SurfaceSoft`

AI 분석은 원인을 확정하지 않는 문장으로 표시한다.

## 8. 이미지 스타일

이미지는 앱의 분위기를 결정하는 핵심 요소로 사용한다.

제품 이미지:

- 밝은 배경
- 부드러운 자연광
- 흰색, 아이보리, 연한 회색 배경
- 제품 라벨을 읽을 수 있는 선명도
- 과한 필터, 어두운 그림자, 복잡한 소품 지양

피부 기록 이미지:

- 분석 보조 자료로만 보이게 한다.
- 의료 진단처럼 보이는 강한 표시나 판정 UI를 피한다.
- 같은 각도와 조명으로 촬영하도록 안내한다.

성분표 사진:

- 원본 사진은 저장하지 않는다.
- 추출 중에는 임시 미리보기만 제공한다.
- 추출 완료 후에는 사용자가 검토할 텍스트와 성분 후보를 중심으로 보여준다.

## 9. 화면별 적용

### 9.1 온보딩

- 배경: `BackgroundWarm`
- 상단: 큰 이미지
- 중앙: 짧은 제목과 설명
- 하단: 원형 CTA 또는 full width CTA
- 페이지 인디케이터는 작고 연하게 표시한다.

### 9.2 제품 검색 홈

- 배경: `Surface`
- 상단 검색창
- 카테고리 또는 상태 필터는 가로 스크롤 칩으로 구성한다.
- 제품 카드는 이미지 중심으로 배치한다.
- 등록된 제품이 없으면 직접 등록 CTA를 제공한다.

### 9.3 제품 등록 및 AI 추출 검토

- 첫 화면은 제품명, 브랜드, 카테고리 입력과 성분표 사진 제출에 집중한다.
- AI 추출 결과 화면은 원문 텍스트, 표준화된 성분 후보, 매칭 실패 성분을 분리해 보여준다.
- 사용자가 직접 수정하고 최종 확인해야 저장된다.
- 저장 CTA는 화면 하단에 고정한다.

### 9.4 기록 화면

- 빠르게 입력할 수 있도록 큰 카드보다 작은 선택 칩과 stepper를 우선한다.
- 오늘 사용한 제품, 피부 상태, 생활 요인을 한 화면에서 빠르게 기록한다.
- 사진 추가는 보조 옵션으로 배치한다.

### 9.5 분석 화면

- 상단에 데이터 충분도와 분석 신뢰도 안내를 표시한다.
- 긍정적 의심 성분 최대 5개, 부정적 의심 성분 최대 5개를 분리한다.
- 각 항목은 근거, 관련 기록, 신뢰도 배지를 포함한다.
- 데이터가 부족하면 부족한 기록 종류를 명확히 안내한다.

## 10. 아이콘 규칙

- 아이콘은 선형 스타일을 기본으로 한다.
- 두께는 1.75dp-2dp 수준으로 유지한다.
- 아이콘 단독 버튼은 최소 40dp 터치 영역을 가진다.
- 기능 아이콘은 의미가 분명한 경우에만 사용한다.
- 제품, 기록, 분석처럼 중요한 탭은 같은 스타일의 아이콘 세트를 사용한다.

권장 아이콘 매핑:

| 기능 | 아이콘 방향 |
| --- | --- |
| Home | home |
| Products | search 또는 package |
| Record | calendar 또는 edit |
| Analysis | chart 또는 sparkles |
| Profile | user |
| Save | check |
| Add | plus |
| Favorite | heart |
| Notification | bell |

## 11. 상태 표현

Loading:

- 큰 spinner보다 skeleton placeholder를 우선한다.
- 제품 카드, 검색 결과, 분석 결과는 실제 레이아웃과 같은 크기의 skeleton을 사용한다.

Empty:

- 설명은 짧게 쓴다.
- 바로 실행할 수 있는 CTA를 함께 제공한다.

Error:

- 강한 경고색보다 차분한 문장과 재시도 버튼을 사용한다.
- 보안 키, API 키, 내부 에러 내용을 노출하지 않는다.

Disabled:

- 비활성 버튼은 회색 배경과 흰색 텍스트를 사용한다.
- 왜 비활성인지 필요한 경우 입력창 아래에 짧게 안내한다.

Selected:

- 선택 상태는 `PrimaryOlive` 배경 또는 `AccentCoral` 테두리 중 하나로 표현한다.
- 같은 화면에서 선택 표현 방식을 섞지 않는다.

## 12. 접근성

- 터치 영역은 최소 40dp, 주요 버튼은 48dp 이상을 유지한다.
- 본문 텍스트는 12sp 미만으로 만들지 않는다.
- `TextTertiary`는 긴 본문에 사용하지 않는다.
- 이미지 위 텍스트는 사용하지 않는다.
- 색상만으로 상태를 구분하지 말고 텍스트나 아이콘을 함께 제공한다.

## 13. Compose 적용 기준

초기 구현 시 `Android/app/src/main/java/.../core/designsystem` 아래에 다음 토큰을 만든다.

```text
SkinColors
SkinTypography
SkinSpacing
SkinRadius
SkinTheme
```

권장 네이밍:

```kotlin
PrimaryOlive
PrimaryOlivePressed
PrimaryOliveSoft
AccentCoral
AccentCoralSoft
BackgroundWarm
BackgroundIvory
SurfaceSoft
TextPrimary
TextSecondary
TextTertiary
Border
```

화면에서 색상, 폰트 크기, radius 값을 직접 쓰지 않고 디자인 토큰을 통해 사용한다.

## 14. 금지 또는 주의 사항

- 한 화면을 올리브 계열로만 채우지 않는다.
- 과한 그라데이션 배경을 사용하지 않는다.
- 제품 이미지 대신 의미 없는 추상 이미지를 메인 시각 요소로 쓰지 않는다.
- 카드 안에 또 다른 카드를 중첩하지 않는다.
- 분석 결과를 의료 진단처럼 보이게 하는 빨간 경고 UI를 남발하지 않는다.
- 버튼 텍스트가 좁은 화면에서 잘리지 않도록 고정 높이와 충분한 좌우 여백을 둔다.
