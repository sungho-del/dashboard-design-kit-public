# screen-plan.schema.md — Stage 5 산출물 스키마

> `pipeline/05-screen-plan.json`의 계약. **파일을 만들기 전에 이 계획서를 먼저 내고 승인받는다.**
> 화면 20개면 파일 60개가 생기므로, 만들고 나서 "아니었다"가 되면 손실이 크다.
>
> 입력: `pipeline/01-service-brief.json`의 `keyScreens` · 판정 기준: `docs/screen-templates.md` §2

## 구조

```jsonc
{
  "meta": {
    // ── 필수
    "generatedAt": "2026-08-19T12:00:00Z",
    "source": "pipeline/01-service-brief.json",
    "sourceScreens": 12, // keyScreens 총 개수
    "planned": 8, // 실제로 만들 화면 수
    "skipped": 4, // template: null 인 화면 수 (합이 sourceScreens 와 같아야 한다)
    "platformNote": null, // 기획서가 모바일 앱이면 그 사실을 여기 적고 사용자에게 물었는지 기록
  },

  "screens": [
    {
      // ── 필수
      "screenId": "S03", // keyScreens[].id — 반드시 존재하는 id
      "name": "주문 관리", // 화면 이름 (한국어) — 기획서 용어를 그대로 쓴다
      "template": "list", // list | detail | stats | form | null
      "reason": "purpose에 '조회·검색', components에 Table·Pagination", // 판정 근거 — 무슨 신호를 봤나
      "navId": "order-manage", // App.tsx 화면 분기 키 (kebab-case, 중복 불가). 아래 ⚠️
      "inGnb": true, // gnb[].items 에 메뉴로 노출할지. 상세형처럼 목록에서 진입하는 화면은 false
      "entryFrom": null, // GNB 에서 갈 수 없는 화면이면 필수 (아래 ⚠️)

      "files": {
        // template: null 이면 이 키 자체를 생략한다
        "page": "src/pages/OrderManagePage.tsx",
        "data": "src/pages/OrderManagePage.data.ts",
        "test": "src/pages/OrderManagePage.test.tsx",
      },

      // ── 유형별 도메인 설계. 해당 유형의 키만 채운다
      "domain": {
        // list 일 때
        "rowType": {
          "name": "Order",
          "fields": [
            { "key": "id", "type": "string", "label": "주문번호" },
            { "key": "date", "type": "string", "label": "주문일시" }, // YYYY-MM-DD HH:mm 필수
            { "key": "amount", "type": "number", "label": "결제금액" },
            // … product·customer·status 등 columns 에 쓰는 필드는 **전부** 여기 적는다
          ],
        },
        // 표 컬럼 순서. 마지막 "actions"(액션 열)까지 **전부** 적는다.
        // "actions" 를 뺀 나머지는 rowType.fields 의 key 여야 한다
        "columns": [
          "id",
          "product",
          "customer",
          "status",
          "amount",
          "date",
          "actions",
        ],
        // 합 100% · **길이가 columns 와 같아야 한다** (colgroup 이 1:1 대응)
        "columnWidths": ["16%", "24%", "10%", "12%", "14%", "17%", "7%"],
        "statuses": [
          { "value": "paid", "label": "결제완료", "tone": "success" }, // tone: default|success|warning|critical
        ],
        "filters": ["all", "paid", "ready"], // [0] 은 반드시 "all"
        "stats": [
          {
            "label": "오늘 주문",
            "value": "42건", // 카드에 찍히는 수치 본문. **단위까지 붙인 완성 문자열** (아래 ⚠️)
            "unit": "건", // 위 value 의 단위. 포맷터(unit.fn)를 고를 때 쓴다
            "icon": "ShoppingCart",
            "delta": "+12%", // 부호를 문자열에 직접 넣는다 (색만으로 전달하지 않는다)
            "up": true, // 화살표 방향 ↑/↓ — 값이 올랐나
            "good": true, // Tag 색 초록/빨강 — 그게 좋은 소식인가
            "goodDirection": "up", // up | down — 이 지표는 어느 쪽이 좋은가 (아래 ⚠️)
            "caption": "지난주 대비", // **비교 기준. 카드마다 따로 든다** (아래 ⚠️)
          },
        ], // 정확히 3개
        "unit": { "fn": "won", "suffix": "원" }, // 주요 수치 단위. 금액이 없는 도메인이면 fn 이름을 도메인에 맞게(minutes·count…)
        "rowActions": ["상세 보기", "복사", "삭제"], // Dropdown 항목

        // ── 목록형이 품는 SideSheet · Modal (뼈대에 이미 있다. 문구·행선지를 여기서 정한다)
        "sideSheetItems": ["상품", "주문자", "결제금액", "주문일시"], // InfoList **미리보기** 4항목 내외
        "sideSheetActions": [
          // 푸터 버튼 2개. [0] secondary · [1] primary
          {
            "label": "전체 상세 보기",
            "variant": "secondary",
            "goTo": "order-detail",
          },
          { "label": "배송 처리", "variant": "primary", "goTo": null }, // goTo: null 이면 toast 로 끝난다
        ],
        "confirmModal": {
          // 파괴적 액션 확인. 없으면 null
          "trigger": "주문 취소", // 어느 rowActions 항목이 이 모달을 여는가
          "title": "주문을 취소할까요?",
          "description": "주문번호 · 상품명", // 헤더 보조 문구에 무엇을 넣나
          "body": "취소한 주문은 되돌릴 수 없고, 결제 금액은 영업일 기준 3일 내 환불됩니다.",
          "confirmLabel": "주문 취소",
          "tone": "critical", // default | critical
        },
        "emptyState": {
          // 템플릿 문구가 그대로 남으면 안 된다 (검증 규칙 B-17)
          "title": "조건에 맞는 주문이 없습니다",
          "description": "필터를 바꾸거나 검색어를 지워 보세요",
        },

        // detail 일 때
        "sections": [
          {
            "title": "주문 정보",
            "items": ["주문번호", "주문일시", "주문경로"],
            // 라벨이 기본 80px 에 안 들어갈 때만(대략 6글자 이상). §30-3 배타 분기.
            // cn() 이 클래스를 병합하지 않아 w-20 과 인라인 width 가 함께 나가면 순서가 승자를 정한다.
            // ⚠️ width: 80(기본값)은 적지 않는다 — 적으면 no-op 오버라이드가 된다
            // ⚠️ 한 섹션(= InfoList 블록) 안에서는 값 하나로 통일한다 (값 시작선이 어긋나면 정렬 이점이 사라진다)
            "labelWidthOverrides": [
              {
                "label": "배송 메시지",
                "width": 96,
                "reason": "6글자 — 기본 80 에 안 들어간다",
              },
            ],
          },
        ],
        "amountBreakdown": ["상품 금액", "배송비", "할인"], // 합계는 뼈대가 아니라 .data.ts 가 계산
        "itemTable": {
          // 없으면 생략
          "columns": ["상품명", "옵션", "수량", "금액"],
          "columnWidths": ["44%", "24%", "12%", "20%"], // columns 와 길이 일치 · 합 100%
        },

        // stats 일 때
        "kpis": [
          {
            "label": "총 매출",
            "value": "9,240만원", // 수치 본문 — B-19(숫자 정합)가 검사하는 값이다
            "unit": "만원",
            "icon": "CreditCard",
            "delta": "+18.2%",
            "caption": "지난 기간 대비", // 무엇과 비교한 delta 인가. **카드마다 따로 적는다** (아래 ⚠️)
            "up": true,
            "good": true,
            "goodDirection": "up",
          },
        ], // 정확히 4개. 나머지 필드 규칙은 stats[] 와 같다
        "charts": [
          {
            "kind": "line", // line | bar | donut
            "title": "매출 추이",
            "series": ["올해", "지난해"], // 2개 이상이면 범례 필수
            "unit": "만원",
            "legend": true,
          },
        ],
        "rankTable": {
          // 없으면 생략
          "columns": ["순위", "상품명", "판매량", "매출"],
          "columnWidths": ["10%", "48%", "18%", "24%"], // columns 와 길이 일치 · 합 100%
        },

        // form 일 때 — ⚠️ 데이터가 아니라 필드 설계다 (screen-templates.md §3-4)
        "formSections": [
          {
            "title": "기본 정보",
            "fields": [
              {
                "label": "상품명",
                "control": "Input", // Input|Select|Textarea|SegmentedControl|RadioGroup|DatePicker|Switch|Checkbox
                "required": true,
                "group": false, // RadioGroup·SegmentedControl 은 반드시 true
                "wrap": true, // Switch·Checkbox 는 반드시 false (FormField 로 감싸지 않는다 · §3-4 규칙 6)
                "description": "검색 결과에 노출됩니다",
                "options": null, // Select·Radio·Segmented 일 때 [{value,label}] 또는 .data.ts export 이름
                "suffix": null, // rightIcon 으로 붙일 단위 ("원"·"개")
                "showIf": null, // 조건부 노출 — 예: "shipping !== 'free'"

                // ── 컨트롤별 부속 prop (§3-4 규칙 5). 해당 컨트롤에만 붙인다
                "inputMode": null, // Input — "numeric" 등
                "format": null, // Input — 입력 중 표시 포맷터 이름 ("won"·"phone")
                "minRows": null, // Textarea — 초기 높이
                "mode": null, // DatePicker — "single" | "range"
                "rightIcon": null, // Input — 아이콘 이름
                "labelAction": null, // 라벨 우측 보조 액션 문구
              },
            ],
          },
        ],
        "validations": ["상품명 필수", "할인가 < 판매가"], // 폼 단위 규칙도 여기
      },

      "notes": [], // 판정이 애매했던 점, 기획서에 없어 추정한 것, 스키마에 없는 키를 쓴 이유
    },

    {
      // 상세형 예시 — **GNB 항목이 아닌 화면**
      "screenId": "S04",
      "name": "주문 상세",
      "template": "detail",
      "reason": "purpose가 '주문 한 건'이라는 단일 레코드를 가리킨다",
      "navId": "order-detail", // 분기 키는 있다. 다만 gnb[] items 에는 넣지 않는다
      "inGnb": false, // ← 메뉴에 노출하지 않는다
      "entryFrom": {
        "screenId": "S03", // 어느 화면에서 들어오나
        "via": "표 행 클릭 → SideSheet → '전체 상세 보기' 버튼",
        "backTo": "order-manage", // 뒤로가기가 돌아갈 navId
        "activeNavFallback": "activeNav === 'order-detail' ? 'order-list' : activeNav", // 부모 메뉴를 활성으로 세우는 식
      },
      "files": {/* 위와 같음 */},
      "domain": {/* 위 detail 키들 */},
      "notes": [],
    },

    {
      // template: null 예시 — 만들지 않는 화면
      "screenId": "S09",
      "name": "로그인",
      "template": null,
      "reason": "4종(목록·상세·통계·폼) 어디에도 맞지 않는다. 인증 화면 템플릿이 없다",
      "navId": null,
      "inGnb": false,
    },
  ],

  "gnb": [
    // ── 필수. 생성 후 gnbSections.tsx 를 어떻게 바꿀지.
    // inGnb: true 인 화면만 여기 등장한다
    {
      "sectionId": "sell",
      "label": "판매 관리",
      "items": [
        // 2단계 메뉴가 필요하면 items[].items 로 중첩한다 (gnbSections.tsx 참고)
        { "id": "order-manage", "label": "주문 관리", "icon": "ShoppingCart" },
      ],
    },
  ],

  // ── 필수. gnb[] 가 **추가**인지 **교체**인지. 지우고 되돌리는 비용이 달라 반드시 명시한다
  "gnbMode": "add", // add: 기존 섹션을 두고 덧붙인다 | replace: 기존 섹션을 걷어내고 갈아끼운다
  "gnbNote": "기존 4섹션(home·sell·customer·etc)은 그대로 두고 위 섹션을 추가한다. 이커머스 4종은 참조용 템플릿이라 남긴다. 실서비스 이식이면 replace 가 맞다 — 사용자 판단.",

  "openQuestions": [
    // 사람에게 물어야 진행되는 것. 비어 있어도 된다
    {
      "id": "Q1",
      "screenId": "S07",
      "question": "정산 화면이 목록형인지 통계형인지 기획서로는 판단 불가",
      "recommendation": "목록형", // 권고안을 함께 낸다 — 질문만 던지면 왕복이 늘어난다
    },
  ],

  "validation": {
    // 아래 검증 규칙을 직접 돌린 결과. 체크포인트 보고 전에 채운다
    "runAt": "2026-08-19T12:00:00Z",
    "results": [
      {
        "rule": 2,
        "name": "planned + skipped === sourceScreens",
        "pass": true,
        "note": "8 + 4 = 12",
      },
    ],
    "allPassed": true,
  },
}
```

> ⚠️ **위에 없는 키가 필요하면** 임의로 넣지 말고, 넣되 **`notes` 에 왜 필요했는지 남긴다.**
> 같은 키가 두 번 이상 필요해지면 이 스키마에 정식 필드로 올린다.

---

## ⚠️ `up` · `good` — 증감 지표는 축이 **두 개**다

`stats[]`(목록형 3장) · `kpis[]`(통계형 4장) 공통. **세 필드를 모두 채운다.**

| 필드            | 무엇을 정하나      | 값                                          |
| --------------- | ------------------ | ------------------------------------------- |
| `up`            | 화살표 ↑ / ↓       | 값이 올랐으면 `true`                        |
| `good`          | Tag 색 초록 / 빨강 | **그게 좋은 소식이면** `true`               |
| `goodDirection` | 이 지표의 성격     | `"up"`(오르면 좋다) / `"down"`(내리면 좋다) |

이커머스는 매출·주문·방문자가 전부 "오르면 좋다"라 `up` 과 `good` 이 **우연히** 같다.
다른 도메인에서는 갈린다 — **노쇼율 · 이탈률 · 대기시간 · 오류율 · 반품률은 내려가면 좋다.**
`up` 하나로 겸용하면 그런 지표에서 화면이 거짓말을 한다(↓인데 빨강, +3건인데 초록).

```
아이콘(↑/↓) ← up        색(초록/빨강) ← good
```

**`good: up` 으로 복사하지 말 것.** 지표마다 따로 판단한다. `goodDirection` 은 계획서 전용 필드로
(코드로 나가지 않는다) 그 판단을 명시적으로 남겨 검증을 기계화하기 위한 것이다:

```
good === (up === (goodDirection === "up"))
```

`goodDirection` 이 계획서의 모든 지표에서 `"up"` 이면, 그 도메인에 정말 "내려가면 좋은 지표"가
하나도 없는지 다시 본다. 대개는 빠뜨린 것이다.

## ⚠️ `value` · `caption` — 수치 본문과 비교 기준

| 필드      | 무엇을 정하나          | 값                                             | 어디에                        |
| --------- | ---------------------- | ---------------------------------------------- | ----------------------------- |
| `value`   | 카드에 찍히는 수치     | 단위까지 붙인 **완성 문자열** (`"38건"`)       | `stats[]` · `kpis[]` **필수** |
| `caption` | delta 의 **비교 기준** | `"지난주 같은 요일 대비"` · `"최근 30일 대비"` | `stats[]` · `kpis[]` **필수** |

**`value` 는 계획 단계에서 정한다.** 전 버전 스키마는 `unit` 만 두고 "수치 문자열은 `.data.ts` 가
만든다"고 미뤘는데, 그러면 **B-19(숫자 정합)를 계획서로 검사할 수 없다** — 도넛 조각 합·표 행 수·
KPI 건수가 서로 맞는지는 수치를 나란히 놓아야 보인다. 지표마다 단위가 달라 하나의 포맷터로
묶이지 않으므로(`"38건"` · `"4.2%"` · `"9,240만원"`) 완성 문자열로 적고, 천 단위 구분자는 **쉼표**를 쓴다.

**`caption` 은 카드마다 따로 적는다.** 비교 기준은 지표마다 다르다 — 병원이면 오늘 예약은 당일,
노쇼율은 최근 30일, 평균 대기는 최근 7일 평균이다. 한 문구로 묶으면 **노쇼율 4.2%(최근 30일)가
오늘 건수(2/38 = 5.3%)와 비교되는 것처럼 읽혀 숫자가 서로 모순되는 화면**이 된다.
기준이 정말 같은 도메인이라도 4장에 **같은 문자열을 4번 적는다**(이커머스 템플릿이 그렇다).

> **`stats[]`(목록형)도 이제 `caption` 을 든다.** 한때 목록형 뼈대(`OrderListPage.tsx`)가
> `"지난주 대비"` 한 문구를 3장이 공유하도록 박아 두어 "계획서에 적어도 갈 곳이 없다"고 적었으나,
> 통계형과 **완전히 같은 결함**이었고 생성물(`ReservationListPage`)까지 그대로 물려받은 것이
> 리허설에서 드러나 뼈대를 고쳤다. 지금은 두 유형이 같은 모양이다.
>
> 병원 목록형이 좋은 예다 — 당일 건수 2장은 `"어제 대비"`, 비율 지표 1장은
> `"최근 30일 평균 대비"` 로 **한 화면 안에서 기준이 갈린다.**

## ⚠️ `navId` · `inGnb` · `entryFrom` — GNB 항목이 아닌 화면

`navId` 는 **GNB 메뉴 id 이자 `App.tsx` 의 화면 분기 키**로 한 네임스페이스를 쓴다.
"메뉴에 있다"와 "화면이 있다"는 다른 문제다.

| 상황                                             | `navId` | `inGnb` | `entryFrom` |
| ------------------------------------------------ | ------- | ------- | ----------- |
| GNB 메뉴로 들어가는 화면 (목록·통계·폼)          | 문자열  | `true`  | 생략        |
| 메뉴에 없고 다른 화면에서 진입 (상세형이 대표적) | 문자열  | `false` | **필수**    |
| 자체 분기 키 없이 부모 화면 안에서만 렌더        | `null`  | `false` | **필수**    |
| 만들지 않는 화면 (`template: null`)              | `null`  | `false` | 생략        |

- **`navId: null` 은 정상 값이다.** 전 버전 스키마가 사실상 필수처럼 둬서 상세형을 표현할 자리가 없었다.
- `inGnb: false` 인 화면은 `gnb[].items` 에 **넣지 않는다.** 넣으면 목록을 거치지 않고 빈 상세가 열린다.
- 상세형은 부모 메뉴를 활성으로 세워야 GNB 가 비지 않는다 → `entryFrom.activeNavFallback`.

---

## 검증 규칙 (Stage 5 에이전트가 계획서 제출 전에 실행)

결과는 `validation.results` 에 규칙 번호와 함께 남긴다.

### A. 형태 검증 — 문법이 맞는가

1. JSON 파싱 가능
2. `meta.planned + meta.skipped === meta.sourceScreens`
3. 모든 `screens[].screenId` 가 `01-service-brief.json` 의 `keyScreens[].id` 에 존재
4. `template` 이 `null` 이면 `reason` 이 비어 있으면 안 되고, `files` 는 생략 · `navId: null` · `inGnb: false`
5. `template` 이 `null` 이 아니면 `files` 3종(page·data·test)이 전부 있고 경로가 `src/pages/` 로 시작
6. `navId` 중복 없음 · `gnbSections.tsx` 의 기존 id 와도 충돌 없음 ·
   `gnb[].items[].id` 는 **`inGnb: true` 인 화면의 `navId` 집합과 정확히 일치**
7. 유형별 필수 키
   - `list` → `rowType`(`id`·`date` 필드 포함) · `columns` · `statuses` · `filters`(`[0] === "all"`) ·
     `stats`(**3개** · 각 항목에 `value`·`caption`·`up`·`good`·`goodDirection` 전부 존재) · `emptyState`
   - `stats` → `kpis`(**4개** · 각 항목에 `value`·`caption`·`up`·`good`·`goodDirection` 전부 존재) ·
     `charts`(1개 이상)
   - `detail` → `sections`(1개 이상)
   - `form` → `formSections`(1개 이상) · 각 필드의 `control` 이 8종 중 하나 ·
     `control` 이 `RadioGroup`·`SegmentedControl` 이면 `group: true` ·
     `Switch`·`Checkbox` 면 `wrap: false` · 부속 prop 이 해당 컨트롤에만 붙어 있다
8. **`columns` 와 `columnWidths` 의 길이가 같다** · 합 100% —
   `domain.columns`(액션 열 `"actions"` 포함) · `itemTable` · `rankTable` **셋 다**
9. `columns` 의 `"actions"` 를 제외한 모든 항목이 `rowType.fields[].key` 에 존재
10. GNB 에서 갈 수 없는 화면(`navId: null` 또는 `inGnb: false`)에 `entryFrom` 이 있고,
    `entryFrom.screenId` 가 **실제로 만드는 화면**이다 (`template != null`)
11. `gnbMode` 가 `"add"` 또는 `"replace"` 이고 `gnbNote` 에 그 선택의 이유가 있다
12. 파일명이 서로 겹치지 않음 — 기존 템플릿 4종(`OrderListPage`·`OrderDetailPage`·`DashboardPage`·`ProductFormPage`)과도
13. 잔가지 계약
    - `charts[].series` 가 2개 이상이면 `legend: true` · 아니면 `notes` 에 사유
    - `labelWidthOverrides[].width !== 80`(기본값은 적지 않는다) · 한 섹션 안에서 값이 하나다 · `reason` 필수
    - `sideSheetActions[].goTo` 가 `null` 이 아니면 **계획에 있는 화면의 `navId`** 다
      (상세형을 안 만들었으면 `goTo: null` 로 두고 그 버튼을 도메인 액션으로 바꾼 뒤 `notes` 에 남긴다)

### B. 의미 검증 — 뜻이 맞는가 (형태만 맞고 틀릴 수 있는 것)

> A 를 전부 통과해도 **색이 의미와 정반대인 계획서**는 그대로 살아남는다. 아래는 눈으로 읽어 확인한다.
> 에이전트의 5-B(생성 후 검증)와 같은 6항목이다 — 계획 단계에서 한 번, 생성 후에 한 번 본다.

14. **증감 지표의 색이 의미와 맞는가** — 모든 `stats[]`·`kpis[]` 항목에서
    `good === (up === (goodDirection === "up"))`.
    그리고 `goodDirection` 이 전부 `"up"` 이면 도메인에 "내려가면 좋은 지표"가 정말 없는지
    `notes` 에 근거를 남긴다 (노쇼율·이탈률·대기시간·오류율·반품률)
15. **상태 색이 의미와 맞는가** — `statuses[].tone` 의 `critical`·`warning` 이
    "지금 사람의 주의를 요하는 상태"에만 붙었는가. 단순 종료 상태(완료·취소)는 `default`
16. **차트 유형이 데이터 성격과 맞는가** — 구성비에 `donut`, 추이에 `line`, 구간 비교에 `bar`.
    구성비를 막대로, 추이를 도넛으로 그리지 않았는가. `donut` 의 조각은 5개 이하
    (단일 계열 `bar` 는 구간이 5개를 넘어도 된다 — 색이 계열 인덱스에 매인다)
17. **문구가 그 도메인의 말인가** — `emptyState`·`confirmModal`·`sideSheetActions` 에
    템플릿 문구("주문이 없습니다"·"배송 처리")가 남아 있지 않은가
18. **화면 제목·메뉴 이름이 기획서 용어와 일치하는가** — `name`·`gnb[].items[].label` 을
    임의로 바꾸지 않았는가 (바꿨으면 `notes` 에 이유)
19. **숫자가 서로 모순되지 않는가** — 검사 대상은 `stats[].value`·`kpis[].value` 의 **수치 본문**이다.
    `amountBreakdown` 의 합이 합계인가, 도넛 조각의 퍼센트 합이 100인가,
    `stats`·`kpis` 의 건수와 표의 행 수·차트 합이 어긋나지 않는가
    (예: "오늘 예약 38건" = 도넛 조각 합 = 막대 합 = 라인 마지막 점).
    그리고 **`kpis[].caption` 의 비교 기준이 지표마다 맞는가** — 기준이 다른 지표에 같은 문구를
    복사하면 형태 검증은 통과하면서 화면의 숫자끼리 모순된다(위 ⚠️ `value`·`caption`)
