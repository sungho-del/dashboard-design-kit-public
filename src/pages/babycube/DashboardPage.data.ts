import type { ChartSeries } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 통계형 화면의 **도메인 층**
 *
 * 짝이 되는 뼈대: `DashboardPage.tsx` (레이아웃·차트 조립, 도메인 무관)
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름              | 역할                                    |
 * | ---------------------- | --------------------------------------- |
 * | `METRIC_GROUPS`        | 상단 지표 타일 — **3그룹 × 3장 = 9장**  |
 * | `PERIODS`              | 차트별 기간 세그먼트 (1주/1개월/3개월)  |
 * | `DEFAULT_PERIOD`       | 뼈대의 `useState` 초기값 (아래 ⚠️)      |
 * | `ORDER_COUNT_TREND`    | 총 매출 현황(건수) 라인 차트 데이터     |
 * | `REVENUE_TREND`        | 총 매출 현황(금액) 라인 차트 데이터     |
 * | `TREND_SERIES`         | 두 차트가 공유하는 계열(렌트·판매)      |
 * | `orderCountTotals`     | 기간별 건수 합계 (파생값)               |
 * | `revenueTotals`        | 기간별 금액 합계 (파생값)               |
 * | `RENT_FUNNEL`          | 렌트 관리 흐름 4단계                   |
 * | `SALE_FUNNEL`          | 판매 관리 흐름 4단계                    |
 * | `count` · `manwon`     | 차트 축·툴팁 단위 포맷                  |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `METRIC_GROUPS[].metrics` 는 **그룹마다 정확히 3장** — 뼈대가 `grid-cols-3` 한 줄에 깐다
 * - `metrics[].up` 과 `metrics[].good` 은 **다른 축이다. 둘 다 필수.**
 *   `up` → 화살표(↑/↓) · `good` → Tag tone(초록/빨강).
 *   **처리 대기 건수·탈퇴·반려율처럼 내려가야 좋은 지표**가 이 도메인에 있으므로
 *   `good: up` 으로 복사하면 화면이 거짓말을 한다
 * - `metrics[].caption` 은 **비교 기준이다. 카드마다 따로 든다.**
 *   방문자는 어제, 회원 총계는 지난달 말, 거래액은 정산 회차 기준이라 한 문구로 묶을 수 없다
 * - `metrics[].navId` 는 그 타일이 여는 목록 화면의 GNB id (F01 "각 타일은 해당 목록 화면으로 이동")
 * - `TREND_SERIES[].key` 는 차트 데이터 객체의 속성 이름(`rent`·`sale`)과 정확히 일치해야 한다
 * - 차트 배열에는 **타입을 새로 달지 않는다** — `ChartDatum`(`Record<string, string | number>`)
 *   에 암묵적 index signature 로 대입되므로 인터페이스를 붙이면 대입이 깨진다
 *
 * ## 템플릿(`src/pages/DashboardPage`)과 의도적으로 다른 곳
 * 1. **KPI 가 4장이 아니라 3그룹 × 3장이다.** 기획서 S01 이 회원 3 · 셀러 3 · 매출 3 으로
 *    타일을 묶어 두었다. 4장으로 줄이면 5개 지표가 화면에서 사라진다 —
 *    템플릿 계약("4장 · grid-cols-4")은 개수를 바꾸면 뼈대의 grid 열 수도 함께 고치라고
 *    적어 두었으므로, 뼈대를 `grid-cols-3` × 3섹션으로 맞췄다
 * 2. **기간 세그먼트가 차트마다 하나씩이다.** 기획서가 건수 차트·금액 차트에 각각
 *    1주/1개월/3개월 선택을 붙였다. 그리고 **표시 전용이 아니라 실제로 데이터를 바꾼다**
 * 3. **`DEFAULT_PERIOD` 를 데이터가 들고 있다.** 템플릿은 뼈대에 `useState("12m")` 이
 *    하드코딩돼 있어 `PERIODS` 를 새로 쓰면 활성 항목이 없는 채로 조용히 렌더된다.
 *    초기값을 여기서 내보내 그 사고를 구조적으로 막는다
 * 4. **도넛·순위표가 없다.** 기획서 S01 에 구성비·순위 섹션이 없다. 대신 도메인의 핵심인
 *    상태 퍼널 2종이 그 자리에 온다
 *
 * ## 원본 저장본(`_plan/babycube-admin/`)에서 가져온 것 / 버린 것
 * - **가져온 것**: 타일 9개의 이름, 차트 제목, 흐름 단계 어휘(각 4단계), 단위(건·원·명·개)
 * - **버린 것**: 원본의 색 체계(`b-green`/`b-blue`/`b-prog`/`b-done`/`b-exc`,
 *   `--brand`/`--warn`/`--danger`)와 커스텀 SVG 차트. 색·레이아웃은 전부 Clay 토큰과
 *   `Chart`(Recharts) 컴포넌트로 다시 만들었다
 * ---------------------------------------------------------------------- */

/* =========================================================================
 * 1. 기간 세그먼트
 * ====================================================================== */

export type PeriodValue = "1w" | "1m" | "3m";

/** 차트 카드마다 하나씩 붙는 기간 세그먼트 (원본 어휘 그대로) */
export const PERIODS = [
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
];

/**
 * 뼈대의 `useState` 초기값. **반드시 `PERIODS[].value` 중 하나여야 한다.**
 * 템플릿은 이 값을 뼈대에 문자열로 박아 두어, 기간 목록을 새로 쓰면
 * SegmentedControl 이 활성 항목 없이 렌더되는 사고가 났다. 여기서 내보내 잇는다.
 */
export const DEFAULT_PERIOD: PeriodValue = "1m";

/**
 * SegmentedControl 은 `string` 을 돌려주므로 유니온으로 좁혀 받는다.
 * 캐스팅(`as`) 대신 값 비교로 좁혀 런타임에도 안전하게 만든다.
 */
export const asPeriod = (value: string): PeriodValue =>
  value === "1w" ? "1w" : value === "3m" ? "3m" : "1m";

/* =========================================================================
 * 2. 총 매출 현황 차트 2종
 *
 * 기간마다 **버킷 단위가 다르다** — 1주는 일자별 / 1개월은 주별 / 3개월은 월별.
 * 그래서 기간을 바꾸면 x축 라벨과 점 개수가 함께 바뀐다.
 *
 * ⚠️ 숫자는 서로 모순되지 않게 맞춰 두었다(5-B 숫자 정합):
 *   1주 합계 < 1개월 합계 < 3개월 합계 이고,
 *   1개월 데이터의 **마지막 주**(08-18)는 1주 데이터 7일치의 합과 정확히 같다.
 * ====================================================================== */

/** 최근 7일 · 일자별 주문 건수 */
const COUNT_1W = [
  { label: "08-18", rent: 62, sale: 78 },
  { label: "08-19", rent: 58, sale: 71 },
  { label: "08-20", rent: 71, sale: 84 },
  { label: "08-21", rent: 66, sale: 79 },
  { label: "08-22", rent: 74, sale: 92 },
  { label: "08-23", rent: 48, sale: 63 },
  { label: "08-24", rent: 41, sale: 55 },
];

/** 최근 4주 · 주별 주문 건수 (마지막 주 = COUNT_1W 7일치의 합) */
const COUNT_1M = [
  { label: "07-28", rent: 392, sale: 470 },
  { label: "08-04", rent: 405, sale: 496 },
  { label: "08-11", rent: 418, sale: 511 },
  { label: "08-18", rent: 420, sale: 522 },
];

/** 최근 3개월 · 월별 주문 건수 (8월은 24일까지라 4주치보다 작다) */
const COUNT_3M = [
  { label: "6월", rent: 1480, sale: 1790 },
  { label: "7월", rent: 1555, sale: 1880 },
  { label: "8월", rent: 1420, sale: 1735 },
];

/** 최근 7일 · 일자별 거래 금액 (**만원 단위** — 축과 툴팁이 같은 포맷을 공유한다) */
const REVENUE_1W = [
  { label: "08-18", rent: 744, sale: 624 },
  { label: "08-19", rent: 696, sale: 568 },
  { label: "08-20", rent: 852, sale: 672 },
  { label: "08-21", rent: 792, sale: 632 },
  { label: "08-22", rent: 888, sale: 736 },
  { label: "08-23", rent: 576, sale: 504 },
  { label: "08-24", rent: 492, sale: 440 },
];

/** 최근 4주 · 주별 거래 금액(만원). 마지막 주 = REVENUE_1W 7일치의 합 */
const REVENUE_1M = [
  { label: "07-28", rent: 4704, sale: 3760 },
  { label: "08-04", rent: 4860, sale: 3968 },
  { label: "08-11", rent: 5016, sale: 4088 },
  { label: "08-18", rent: 5040, sale: 4176 },
];

/** 최근 3개월 · 월별 거래 금액(만원) */
const REVENUE_3M = [
  { label: "6월", rent: 17760, sale: 14320 },
  { label: "7월", rent: 18660, sale: 15040 },
  { label: "8월", rent: 17040, sale: 13880 },
];

/**
 * 기간 → 차트 데이터. **타입을 달지 않는다** — 뼈대가 `ChartDatum[]` 로 받을 때
 * 암묵적 index signature 로 대입되는데, 인터페이스를 붙이면 그 대입이 깨진다.
 */
export const ORDER_COUNT_TREND = {
  "1w": COUNT_1W,
  "1m": COUNT_1M,
  "3m": COUNT_3M,
};

export const REVENUE_TREND = {
  "1w": REVENUE_1W,
  "1m": REVENUE_1M,
  "3m": REVENUE_3M,
};

/**
 * 두 차트가 공유하는 계열. `key` 는 위 데이터 객체의 속성 이름과 정확히 일치한다.
 * 계열이 2개라 뼈대가 **범례를 반드시 붙인다**(색만으로 렌트/판매를 구별하게 두지 않는다).
 */
export const TREND_SERIES: ChartSeries[] = [
  { key: "rent", label: "렌트" },
  { key: "sale", label: "판매" },
];

/** 카드 헤더의 합계 문구용 파생값 — 항목을 고치면 합계가 자동으로 따라온다 */
const sumTrend = (rows: { rent: number; sale: number }[]) =>
  rows.reduce((sum, row) => sum + row.rent + row.sale, 0);

export const orderCountTotals = {
  "1w": sumTrend(COUNT_1W),
  "1m": sumTrend(COUNT_1M),
  "3m": sumTrend(COUNT_3M),
};

export const revenueTotals = {
  "1w": sumTrend(REVENUE_1W),
  "1m": sumTrend(REVENUE_1M),
  "3m": sumTrend(REVENUE_3M),
};

/* =========================================================================
 * 3. 상태 흐름 (F02)
 *
 * 단계를 누르면 그 상태로 필터된 주문 목록으로 이동한다.
 * 단계 어휘는 원본 저장본에서 그대로 가져왔다 — 색은 가져오지 않았다.
 * ====================================================================== */

/**
 * 상태 흐름 한 단계.
 *
 * ⚠️ **원본 대시보드의 흐름은 각 4단계다.** 한때 상태 어휘 목록(교환·반품까지 130여 개)에서
 * 부풀려 렌트 11 · 판매 5 단계를 만들었는데, 대시보드에 있는 것이 아니었다.
 * 전체 상태 어휘는 **주문 목록 화면**이 든다 — 대시보드는 큰 국면만 짚는다.
 */
export type FunnelStep = {
  /** 주문 목록의 상태 필터 값 */
  value: string;
  label: string;
  count: number;
};

/**
 * 렌트 생애주기 4국면 — 접수 → 이용 → 검수 → 종료.
 * 배송·수거·연체 같은 중간 상태는 **주문 목록**이 든다.
 */
export const RENT_FUNNEL: FunnelStep[] = [
  { value: "new", label: "신규 주문", count: 12 },
  { value: "renting", label: "대여중", count: 24 },
  { value: "inspecting", label: "검수중", count: 4 },
  { value: "returned", label: "반납완료", count: 13 },
];

/** 판매 생애주기 4국면 — 접수 → 출고 준비 → 도착 → 종료 */
export const SALE_FUNNEL: FunnelStep[] = [
  { value: "new", label: "신규 주문", count: 10 },
  { value: "ready", label: "배송 준비", count: 4 },
  { value: "delivered", label: "배송 완료", count: 2 },
  { value: "confirmed", label: "구매확정", count: 23 },
];

/**
 * 흐름 단계가 여는 화면의 GNB id — 주문 목록(S08)이다.
 *
 * ⚠️ 실제 id 는 `bc-orders-all` 이다. `bc-orders` 로 두면 **GNB 의 부모 항목**(주문 관리 그룹)과
 * 겹쳐서, 눌러도 화면이 열리지 않고 그룹만 접혔다 펴진다. `gnbSections.tsx` 참조.
 */
export const ORDERS_NAV_ID = "/orders-all";

/* =========================================================================
 * 4. 상단 지표 타일 9장 (F01)
 *
 * ⚠️ `up`(방향)과 `good`(좋고 나쁨)은 **다른 축**이다. 반드시 둘 다 채운다.
 *
 *   아이콘(↑/↓) ← `up`      색(초록/빨강) ← `good`
 *
 * 이 도메인에는 **내려가야 좋은 지표**가 실제로 있다 —
 * `입점 심사 요청`은 운영자가 처리해야 할 **대기 건수**라, 줄어든 것이 좋은 소식이다.
 * `good: up` 으로 복사하면 "-3건"에 빨간 태그가 붙어 화면이 거짓말을 한다.
 *
 * ⚠️ `caption`(비교 기준)도 카드마다 따로 든다.
 * 방문자는 어제 같은 시각, 회원 총계는 지난달 말, 거래액은 정산 회차 기준이다.
 * 한 문구로 묶으면 기준이 다른 지표가 같은 기준으로 읽혀 숫자가 서로 모순된다.
 *
 * ⚠️ 매출 3장의 숫자는 서로 맞춰 두었다 —
 *   입점사 거래액 82,400만 − 지급 예정 71,860만 = 10,540만
 *   그중 본사 수수료 수익이 9,480만(거래액의 11.5%), 나머지 1,060만은
 *   PG수수료·셀러쿠폰·취소/반품 차감분이다.
 * ====================================================================== */

/**
 * 상단 지표 타일 — **3그룹 × 3장 = 9장.**
 *
 * ## ⚠️ 원본 타일은 라벨 · 값 · 단위뿐이다
 * 원본 컴포넌트는 이게 전부다:
 * ```js
 * <span className="dsl">{label}</span>
 * <span><b className={go ? "dsv go" : "dsv"} onClick={…}>{value}</b>
 *       <span className="dsu">{unit}</span></span>
 * ```
 * 한때 여기에 **아이콘 · 증감(±%) · 비교 기준 문구 · "회원 목록" 링크 버튼**을 얹었는데
 * 넷 다 원본에 없는 것이라 걷어냈다(타일 9장 × 4 = 36개 요소). 값 자체가 링크다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 그룹마다 **정확히 3장** — 뼈대가 한 박스 안에 3열로 깐다
 * - `unit` 은 값과 **분리한다.** 원본이 값과 단위에 다른 크기를 주기 때문이다
 *   (값은 크게, 단위는 작게). 붙여서 한 문자열로 넣으면 그 위계를 만들 수 없다
 * - `navId` 는 **있을 때만** 그 타일이 링크가 된다. 원본도 `go` 가 있는 타일만 눌린다 —
 *   오늘 방문자·오늘 가입자는 갈 곳이 없다(그날치 집계라 목록 화면이 없다)
 */
export const METRIC_GROUPS = [
  {
    id: "member",
    title: "회원 지표",
    metrics: [
      { label: "오늘 방문자", value: "4,182", unit: "명" },
      { label: "오늘 가입자", value: "68", unit: "명" },
      { label: "전체 회원", value: "12,847", unit: "명", navId: "/members" },
    ],
  },
  {
    id: "seller",
    title: "셀러 지표",
    metrics: [
      {
        label: "입점 심사 요청",
        value: "8",
        unit: "건",
        /* 원본도 상태를 걸어 보낸다 — `/seller-review?stat=승인요청` */
        navId: "/seller-review?stat=%EC%8A%B9%EC%9D%B8%EC%9A%94%EC%B2%AD",
      },
      {
        label: "입점 등록 상품",
        value: "3,264",
        unit: "개",
        navId: "/products",
      },
      { label: "전체 입점 셀러", value: "128", unit: "사", navId: "/sellers" },
    ],
  },
  {
    id: "sales",
    title: "매출 지표",
    metrics: [
      {
        label: "입점사 거래액(정가)",
        value: "824,000,000",
        unit: "원",
        navId: "/settle-seller",
      },
      {
        label: "지급 예정 총액",
        value: "718,600,000",
        unit: "원",
        navId: "/settle-seller",
      },
      {
        label: "본사 수수료 수익",
        value: "94,800,000",
        unit: "원",
        navId: "/settle-seller",
      },
    ],
  },
];

/* =========================================================================
 * 5. 단위 포맷
 *
 * 단위가 곧 도메인이라 여기 둔다(건 · 만원 · 개사).
 * 축 눈금과 툴팁이 같은 함수를 공유하는데 툴팁 값이 문자열로 들어올 수 있어
 * `number | string` 을 모두 받는다.
 * ====================================================================== */

export const count = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}건` : `${value}`;

/**
 * 단위를 뗀 숫자만. **값과 단위에 다른 크기를 주려면 문자열이 갈려 있어야 한다** —
 * 원본도 값(`dsv`)과 단위(`dsu`)를 다른 요소로 낸다.
 * 차트 축·툴팁은 단위가 붙은 `count`·`manwon` 을 그대로 쓴다.
 */
export const num = (value: number) => value.toLocaleString("ko-KR");

export const manwon = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}만` : `${value}`;
