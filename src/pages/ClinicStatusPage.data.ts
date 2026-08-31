import { CalendarDays, Hourglass, Stethoscope, UserX } from "lucide-react";
import type { ChartSeries } from "../components/ui";

/* -------------------------------------------------------------------------
 * 진료 현황(S03) 화면의 **도메인 층** — 차트온(병·의원 예약·진료 관리 SaaS).
 *
 * 짝이 되는 뼈대: `ClinicStatusPage.tsx` (레이아웃·차트 조립, 도메인 무관)
 * 원본 템플릿: `DashboardPage.data.ts` (이커머스) — 역할과 모양만 상속했다.
 *
 * ## 이 파일이 채우는 역할
 *
 * | 이 파일의 이름              | 역할                           | 템플릿(이커머스)의 이름 |
 * | --------------------------- | ------------------------------ | ----------------------- |
 * | `KPIS`                      | 상단 핵심 지표 카드 (4장)      | 동일                    |
 * | `PERIODS`                   | 헤더의 기간 세그먼트           | 동일                    |
 * | `RESERVATION_TREND`         | 추이 차트(라인) 데이터         | `REVENUE`               |
 * | `RESERVATION_TREND_SERIES`  | 추이 차트의 계열 이름          | `REVENUE_SERIES`        |
 * | `DEPARTMENTS`               | 구성비 차트(도넛) 데이터       | `CHANNELS`              |
 * | `departmentTotal`           | 도넛 중앙 합계 (파생)          | `channelTotal`          |
 * | `HOURLY_RESERVATIONS`       | 비교 차트(막대) 데이터         | `CATEGORIES`            |
 * | `HOURLY_SERIES`             | 막대 차트의 계열 이름          | `CATEGORY_SERIES`       |
 * | `WAITING_DEPARTMENTS`       | 순위 표 데이터 (5행)           | `TOP_PRODUCTS`          |
 * | `count`                     | 건수 포맷 (축·툴팁)            | `manwon`                |
 * | `minutes`                   | 분 포맷 (표)                   | `won`                   |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `KPIS` 는 **정확히 4장** — 뼈대가 `grid-cols-4` 한 줄에 깐다
 * - `KPIS[].up` 과 `KPIS[].good` 은 **다른 축이다. 둘 다 필수.** 아래 KPIS 주석 참고
 * - `*_SERIES[].key` 는 짝이 되는 데이터 객체의 **속성 이름과 정확히 일치**해야 한다
 * - 차트에 넘기는 배열의 값은 **문자열 아니면 숫자**만 (`ChartDatum`).
 *   ⚠️ 배열에 인터페이스를 붙이지 말 것 — 암묵적 index signature 로 대입되므로 대입이 깨진다
 * - **5개 제한은 `DEPARTMENTS`(도넛)에만 걸린다.** 도넛만 데이터 포인트마다 색을 바꾼다.
 *   `HOURLY_RESERVATIONS`(막대)는 단일 계열이라 8구간이 전부 같은 색이다 — 구간 수 제한 없음
 * - `PERIODS[].value` 중 하나가 뼈대의 기간 초기값(`useState("14d")`)과 일치해야 한다.
 *   ⚠️ 문자열이라 타입 검사가 잡지 못한다 — 값을 바꾸면 양쪽을 같이 본다
 *
 * ## 숫자의 출처 (화면 안에서 서로 맞물린다)
 * - 오늘 예약 **38건** = 도넛 합(14+9+7+5+3) = 막대 합(3+7+6+2+5+7+5+3) = 라인 마지막 점
 *   = 예약 목록(`ReservationListPage`)의 동명 STATS
 * - 38 = 진료 완료 26 + 대기 10 + 취소·노쇼 2
 * - 순위 표의 대기 인원 합 3+3+2+1+1 = **10** (위 식의 '대기 10')
 * - 평균 대기 **18분** = (3×26 + 3×21 + 2×14 + 1×9 + 1×6) / 10 = 18.4 → 18
 * - 도넛 퍼센트 37+24+18+13+8 = 100 (반올림 후에도 100이 되도록 값을 잡았다)
 * - 순위 표의 '가정의학과 1명'은 도넛의 '기타 3건' 안에 든다 — 진료과 목록이 모순되지 않는다
 * ---------------------------------------------------------------------- */

/** 헤더의 기간 세그먼트. 뼈대의 초기값(`"14d"`)이 이 안에 있어야 한다 */
export const PERIODS = [
  { value: "today", label: "오늘" },
  { value: "7d", label: "최근 7일" },
  { value: "14d", label: "최근 14일" },
];

/**
 * 최근 14일 일자별 예약·진료 완료 건수.
 * 마지막 점(8/19)이 오늘이라 KPI 의 "오늘 예약 38건 / 진료 완료 26건"과 맞물린다.
 * 8/12 는 정확히 7일 전(같은 요일)이라 KPI 의 증감(+6건 / +4건)이 여기서 검산된다.
 * 8/9·8/15·8/16 이 낮은 것은 주말·공휴일 반일 진료다.
 */
export const RESERVATION_TREND = [
  { date: "8/6", booked: 29, done: 24 },
  { date: "8/7", booked: 33, done: 27 },
  { date: "8/8", booked: 21, done: 17 },
  { date: "8/9", booked: 12, done: 9 },
  { date: "8/10", booked: 31, done: 26 },
  { date: "8/11", booked: 34, done: 28 },
  { date: "8/12", booked: 32, done: 22 },
  { date: "8/13", booked: 36, done: 29 },
  { date: "8/14", booked: 30, done: 25 },
  { date: "8/15", booked: 14, done: 11 },
  { date: "8/16", booked: 11, done: 8 },
  { date: "8/17", booked: 35, done: 29 },
  { date: "8/18", booked: 37, done: 31 },
  { date: "8/19", booked: 38, done: 26 },
];

/** `key` 는 `RESERVATION_TREND` 항목의 속성 이름, `label` 은 범례·툴팁에 뜨는 글자 */
export const RESERVATION_TREND_SERIES: ChartSeries[] = [
  { key: "booked", label: "예약" },
  { key: "done", label: "진료 완료" },
];

/** 도넛 조각. 5개 이하 — 계열색이 5종이라 6번째부터는 마지막 색에 눌린다 */
export const DEPARTMENTS = [
  { name: "내과", value: 14 },
  { name: "정형외과", value: 9 },
  { name: "이비인후과", value: 7 },
  { name: "피부과", value: 5 },
  { name: "기타", value: 3 },
];

/**
 * 시간대별 예약. 13시는 점심시간이라 진료가 없어 구간에서 뺐다.
 * **8구간을 그대로 둔다** — 단일 계열 막대는 구간이 몇 개든 같은 색이라
 * 도넛의 5개 제한이 여기엔 걸리지 않는다. 색 때문에 도메인을 접지 않는다.
 */
export const HOURLY_RESERVATIONS = [
  { hour: "09시", value: 3 },
  { hour: "10시", value: 7 },
  { hour: "11시", value: 6 },
  { hour: "12시", value: 2 },
  { hour: "14시", value: 5 },
  { hour: "15시", value: 7 },
  { hour: "16시", value: 5 },
  { hour: "17시", value: 3 },
];

/** 단일 계열이라 범례는 생략한다(계열이 2개 이상일 때만 범례를 둔다) */
export const HOURLY_SERIES: ChartSeries[] = [{ key: "value", label: "예약" }];

/**
 * 대기 상위 진료과. 컬럼 구성은 뼈대의 `<colgroup>`·`TableHead` 와 짝이라 함께 고친다.
 * `waiting` 합은 10 이고, `wait` 의 가중평균이 KPI "평균 대기 18분"이다.
 */
export const WAITING_DEPARTMENTS = [
  { rank: 1, name: "내과", waiting: 3, wait: 26 },
  { rank: 2, name: "정형외과", waiting: 3, wait: 21 },
  { rank: 3, name: "이비인후과", waiting: 2, wait: 14 },
  { rank: 4, name: "피부과", waiting: 1, wait: 9 },
  { rank: 5, name: "가정의학과", waiting: 1, wait: 6 },
];

/**
 * 상단 핵심 지표 4장. 아이콘은 lucide 컴포넌트 참조(JSX 아님).
 * `value` 는 이미 포맷된 문자열이다 — 지표마다 단위가 달라 한 포맷터로 묶이지 않는다.
 *
 * ⚠️ `up`(방향)과 `good`(좋고 나쁨)은 **다른 축**이다. 반드시 둘 다 채운다.
 * 이커머스는 매출·주문·방문자가 전부 "오르면 좋다"라 두 값이 우연히 같지만,
 * **병원은 갈린다** — 노쇼율과 대기시간은 내려가야 좋다.
 *
 *   오늘 예약  +6건    올랐고(up)  좋다(good)     → ↑ 초록
 *   진료 완료  +4건    올랐고(up)  좋다(good)     → ↑ 초록
 *   노쇼율     -1.2%p  내렸고(!up) 좋다(good)     → ↓ 초록  ← 겸용하면 여기가 빨강이 된다
 *   평균 대기  +3분    올랐고(up)  나쁘다(!good)  → ↑ 빨강  ← 겸용하면 여기가 초록이 된다
 *
 *   아이콘(↑/↓) ← `up`      색(초록/빨강) ← `good`
 *
 * `caption` 은 **비교 기준**이다. 템플릿은 카드 4장에 "지난 기간 대비" 한 문구를 공유하지만,
 * 병원 지표는 기준 기간이 제각각이다(당일 vs 최근 30일 vs 최근 7일 평균).
 * 한 문구로 묶으면 노쇼율 4.2%(최근 30일)가 오늘 건수와 비교되는 것처럼 읽혀
 * **숫자가 서로 모순되는 화면**이 된다. 그래서 지표마다 따로 적는다.
 */
export const KPIS = [
  {
    label: "오늘 예약",
    value: "38",
    unit: "건",
    delta: "+6건",
    caption: "지난주 같은 요일 대비",
    up: true,
    good: true,
    icon: CalendarDays,
  },
  {
    label: "진료 완료",
    value: "26",
    unit: "건",
    delta: "+4건",
    caption: "지난주 같은 요일 대비",
    up: true,
    good: true,
    icon: Stethoscope,
  },
  {
    /** 내려가야 좋은 지표 — `up: false` 인데 `good: true` 다 */
    label: "노쇼율",
    value: "4.2%",
    unit: "",
    delta: "-1.2%p",
    caption: "최근 30일 · 직전 30일 대비",
    up: false,
    good: true,
    icon: UserX,
  },
  {
    /** 내려가야 좋은 지표 — `up: true` 인데 `good: false` 다 */
    label: "평균 대기",
    value: "18",
    unit: "분",
    delta: "+3분",
    caption: "최근 7일 평균 대비",
    up: true,
    good: false,
    icon: Hourglass,
  },
];

/*
 * 단위 포맷 — 단위가 곧 도메인이라 여기 둔다 (건 · 분).
 * 축 눈금과 툴팁이 같은 함수를 공유하는데 툴팁 값이 문자열로 들어올 수 있어
 * `number | string` 을 모두 받는다.
 */
export const count = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}건` : `${value}`;
export const minutes = (value: number | string) =>
  typeof value === "number" ? `${value.toLocaleString("ko-KR")}분` : `${value}`;

/**
 * 도넛 중앙의 합계 겸 범례 퍼센트의 분모.
 * `DEPARTMENTS` 에서만 나오는 값이라 뼈대가 아니라 데이터 쪽에 둔다 —
 * 항목을 고치면 합계가 자동으로 따라온다. (14+9+7+5+3 = 38)
 */
export const departmentTotal = DEPARTMENTS.reduce(
  (sum, department) => sum + department.value,
  0,
);
