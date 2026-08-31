import {
  CreditCard,
  MousePointerClick,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { ChartSeries } from "../components/ui";

/* -------------------------------------------------------------------------
 * 통계형 화면의 **도메인 층** — 여기가 서비스마다 통째로 갈리는 부분이다.
 *
 * 짝이 되는 뼈대: `DashboardPage.tsx` (레이아웃·차트 조립, 도메인 무관)
 *
 * ## 다른 서비스로 바꿀 때
 * 이 파일을 **전부 새로 쓴다.** 아래 12개 **역할**을 채우면 뼈대는 거의 손대지 않아도 된다.
 *
 * ⚠️ **계약은 이름이 아니라 역할과 모양이다.** 아래 "실물 이름"은 이 파일이 이커머스라서
 * 그런 것이고, 병원 화면이라면 `RESERVATIONS`·`DEPARTMENTS`·`minutes` 로 짓는 것이 옳다.
 * 템플릿 이름을 그대로 복사하면 병원 대시보드에 `REVENUE`·`CHANNELS` 가 남는다.
 *
 * | 실물 이름         | 역할                            | 예: 물류 SaaS           |
 * | ----------------- | ------------------------------- | ----------------------- |
 * | `KPIS`            | 상단 핵심 지표 카드 (4장)       | 집화/간선/배송완료/지연 |
 * | `PERIODS`         | 헤더의 기간 세그먼트            | 오늘/이번주/이번달      |
 * | `REVENUE`         | 추이 차트(라인) 데이터          | 일자별 배송 건수        |
 * | `REVENUE_SERIES`  | 추이 차트의 계열 이름           | 올해/지난해             |
 * | `CHANNELS`        | 구성비 차트(도넛) 데이터        | 지역별 물량             |
 * | `CATEGORIES`      | 비교 차트(막대) 데이터          | 터미널별 처리량         |
 * | `CATEGORY_SERIES` | 막대 차트의 계열 이름           | 처리량                  |
 * | `TOP_PRODUCTS`    | 순위 표 데이터 (5행)            | 물량 상위 노선 Top 5    |
 * | `channelTotal`    | 도넛 중앙 합계 (CHANNELS 파생)  | 전체 물량               |
 * | `manwon`          | 라인 차트 축·툴팁 단위 포맷     | 건 · kg                 |
 * | `people`          | 도넛 툴팁 단위 포맷             | 대 · 개                 |
 * | `won`             | 표의 금액 포맷                  | 운임(원)                |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `KPIS` 는 **정확히 4장** — 뼈대가 `grid-cols-4` 한 줄에 깐다. 개수가 바뀌면
 *   뼈대의 grid 열 수도 함께 고쳐야 한다
 * - `KPIS[].up` 과 `KPIS[].good` 은 **다른 축이다. 둘 다 필수.**
 *   `up` → 화살표(↑/↓) · `good` → Tag tone(초록/빨강).
 *   노쇼율·이탈률처럼 **내려가면 좋은 지표**가 있으므로 `good: up` 으로 복사하지 말 것.
 *   `delta` 문자열에는 **부호를 직접 넣는다**(증감을 색만으로 전달하지 않기 위해서다)
 * - `KPIS[].caption` 은 **비교 기준이다. 필수.** 뼈대는 이 문자열을 그대로 찍는다 —
 *   **비교 기준이 지표마다 다를 수 있어서** 카드가 각자 들고 오게 했다.
 *   한 문구로 묶으면 기준이 다른 지표까지 같은 기준으로 읽혀 **숫자가 서로 모순되는 화면**이 된다
 *   (병원이면 노쇼율 4.2%(최근 30일)가 오늘 건수 2/38 과 비교되는 것처럼 읽힌다).
 *   이커머스는 4장이 우연히 같은 기준이라 값이 겹칠 뿐, 생략해도 되는 필드가 아니다
 * - `*_SERIES[].key` 는 짝이 되는 데이터 객체의 **속성 이름과 정확히 일치**해야 한다
 *   (`REVENUE_SERIES[0].key === "current"` ↔ `REVENUE[0].current`). 어긋나면 선이
 *   그려지지 않는다 — 타입으로는 잡히지 않으니 이름을 바꿀 때 양쪽을 같이 본다
 * - 차트에 넘기는 배열의 값은 **문자열 아니면 숫자**만 (`ChartDatum` =
 *   `Record<string, string | number>`). 중첩 객체·배열을 넣지 말 것
 * - **5개 제한은 `CHANNELS`(도넛)에만 걸린다.** 도넛만 `data.map((d, i) => <Cell
 *   fill={seriesColor(i)}>)` 로 **데이터 포인트마다** 색을 바꾸기 때문이다. 계열색이 5종이고
 *   순환하지 않아 6번째부터 마지막 색에 눌린다 — 더 많으면 "기타"로 접는다.
 * - **`CATEGORIES`(막대)는 개수 제한이 없다.** `BarChart` 는 `series.map((s, i) =>
 *   <Bar fill={seriesColor(i)}>)` 로 **계열 인덱스**를 쓰는데 `CATEGORY_SERIES` 가 단일 계열이라
 *   막대가 몇 개든 전부 같은 색(`seriesColor(0)`)이다. 시간대 24구간도 문제없다.
 *   (라인 차트도 같다 — 데이터 포인트 수는 색과 무관하다)
 * - 포맷 함수는 **number 와 string 을 모두** 받는다. 축 눈금 포맷터와 툴팁이 같은
 *   함수를 공유하는데 툴팁 값이 문자열로 들어올 수 있다
 * - `PERIODS[].value` 중 하나가 뼈대의 기간 초기값이다. 여기 value 를 바꾸면
 *   `DashboardPage.tsx` 의 `useState("12m")` 도 같이 고쳐야 한다
 * ---------------------------------------------------------------------- */

/** 헤더의 기간 세그먼트. 뼈대의 초기값(`"12m"`)이 이 안에 있어야 한다 */
export const PERIODS = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "12m", label: "최근 12개월" },
];

/** 매출은 **만원 단위**로 저장한다 — 축과 툴팁이 같은 포맷을 공유하게 하기 위해서다 */
export const REVENUE = [
  { month: "1월", current: 3820, previous: 3140 },
  { month: "2월", current: 4260, previous: 3520 },
  { month: "3월", current: 3980, previous: 3810 },
  { month: "4월", current: 5140, previous: 4020 },
  { month: "5월", current: 5820, previous: 4360 },
  { month: "6월", current: 5240, previous: 4680 },
  { month: "7월", current: 6480, previous: 4920 },
  { month: "8월", current: 7120, previous: 5240 },
  { month: "9월", current: 6840, previous: 5680 },
  { month: "10월", current: 7960, previous: 6120 },
  { month: "11월", current: 9240, previous: 6840 },
  { month: "12월", current: 8620, previous: 7280 },
];

/** `key` 는 `REVENUE` 항목의 속성 이름, `label` 은 범례·툴팁에 뜨는 글자 */
export const REVENUE_SERIES: ChartSeries[] = [
  { key: "current", label: "올해" },
  { key: "previous", label: "지난해" },
];

/** 도넛 조각. 5개 이하 — 계열색이 5종이라 6번째부터는 마지막 색에 눌린다 */
export const CHANNELS = [
  { name: "검색 유입", value: 4820 },
  { name: "직접 방문", value: 3140 },
  { name: "SNS", value: 2460 },
  { name: "광고", value: 1580 },
  { name: "기타", value: 620 },
];

/** 막대 차트 데이터. 매출은 `REVENUE` 와 같은 **만원 단위** */
export const CATEGORIES = [
  { name: "의류", value: 2840 },
  { name: "잡화", value: 1960 },
  { name: "뷰티", value: 1620 },
  { name: "리빙", value: 1180 },
  { name: "식품", value: 740 },
];

/** 단일 계열이라 범례는 생략한다(계열이 2개 이상일 때만 범례를 둔다) */
export const CATEGORY_SERIES: ChartSeries[] = [{ key: "value", label: "매출" }];

/**
 * 순위 표. 컬럼 구성은 뼈대의 `<colgroup>`·`TableHead` 와 짝이라 함께 고친다.
 * `up` 은 현재 뼈대가 그리지 않는다 — 증감 화살표를 표에도 붙일 때 쓰라고 남겨둔 자리다.
 */
export const TOP_PRODUCTS = [
  { rank: 1, name: "오버핏 코튼 셔츠", qty: 284, amount: 8520000, up: true },
  { rank: 2, name: "린넨 와이드 팬츠", qty: 216, amount: 6480000, up: true },
  { rank: 3, name: "베이직 니트 가디건", qty: 198, amount: 5940000, up: false },
  { rank: 4, name: "레더 크로스백", qty: 152, amount: 4560000, up: true },
  { rank: 5, name: "울 블렌드 코트", qty: 96, amount: 4320000, up: false },
];

/**
 * 상단 핵심 지표 4장. 아이콘은 lucide 컴포넌트 참조(JSX 아님).
 * `value` 는 이미 포맷된 문자열이다 — 지표마다 단위가 달라 한 포맷터로 묶이지 않는다.
 */
/*
 * ⚠️ `up`(방향)과 `good`(좋고 나쁨)은 **다른 축**이다. 반드시 둘 다 채운다.
 *
 * 이커머스는 매출·주문·방문자가 전부 "오르면 좋다"라 두 값이 우연히 같지만,
 * 다른 도메인에서는 갈린다 — **노쇼율·이탈률·대기시간·오류율은 내려가면 좋다.**
 * `up` 하나로 겸용하면 그런 지표에서 **화면이 거짓말을 한다**(↓인데 빨강).
 *
 *   아이콘(↑/↓) ← `up`      색(초록/빨강) ← `good`
 *
 * 같아 보인다고 `good: up` 으로 복사하지 말 것. 지표마다 따로 판단한다.
 *
 * ⚠️ `caption` 은 **비교 기준**이다. 카드마다 따로 적는다.
 *
 * 이커머스는 4장이 전부 같은 기간과 비교해 "지난 기간 대비"로 겹치지만, 그건 **우연**이다.
 * 병원이라면 오늘 예약은 당일, 노쇼율은 최근 30일, 평균 대기는 최근 7일 평균과 비교한다 —
 * 한 문구로 묶으면 **노쇼율 4.2%(최근 30일)가 오늘 건수(2/38 = 5.3%)와 비교되는 것처럼 읽혀**
 * 숫자가 서로 모순되는 화면이 된다. 그래서 뼈대에 박지 않고 여기서 지표마다 들고 온다.
 */
export const KPIS = [
  {
    label: "총 매출",
    value: "9,240",
    unit: "만원",
    delta: "+18.2%",
    caption: "지난 기간 대비",
    up: true,
    good: true,
    icon: CreditCard,
  },
  {
    label: "주문 수",
    value: "1,284",
    unit: "건",
    delta: "+12.4%",
    caption: "지난 기간 대비",
    up: true,
    good: true,
    icon: ShoppingCart,
  },
  {
    label: "방문자",
    value: "12,620",
    unit: "명",
    delta: "+6.8%",
    caption: "지난 기간 대비",
    up: true,
    good: true,
    icon: Users,
  },
  {
    label: "결제 전환율",
    value: "3.42%",
    unit: "",
    delta: "-0.4%",
    caption: "지난 기간 대비",
    up: false,
    good: false,
    icon: MousePointerClick,
  },
];

/*
 * 단위 포맷 — 단위가 곧 도메인이라 여기 둔다 (만원 · 명 · 원 → 건 · kg · km …).
 * 축 눈금과 툴팁이 같은 함수를 공유하는데 툴팁 값이 문자열로 들어올 수 있어
 * `number | string` 을 모두 받는다.
 */
export const manwon = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}만` : `${value}`;
export const people = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}명` : `${value}`;
export const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * 도넛 중앙의 합계 겸 범례 퍼센트의 분모.
 * `CHANNELS` 에서만 나오는 값이라 뼈대가 아니라 데이터 쪽에 둔다 —
 * 항목을 고치면 합계가 자동으로 따라온다.
 */
export const channelTotal = CHANNELS.reduce((sum, c) => sum + c.value, 0);
