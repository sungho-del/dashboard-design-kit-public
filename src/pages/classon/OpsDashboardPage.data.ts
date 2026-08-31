import { BookOpen, GraduationCap, Users, Wallet } from "lucide-react";
import type { ChartSeries, ProgressBarTone } from "../../components/ui";

/* -------------------------------------------------------------------------
 * S01 운영 대시보드 (클래스온 — 온라인 강의 플랫폼 운영 어드민) — **도메인 층**
 *
 * 짝이 되는 뼈대: `OpsDashboardPage.tsx` (레이아웃·차트 조립, 도메인 무관)
 * 템플릿 원형: `src/pages/DashboardPage.*` (통계형)
 *
 * ## 기획서가 정한 것 (pipeline/01-service-brief.json)
 * - F01 핵심 지표 4종 — 총 수강생 · 진행 중 강의 · 이번 달 매출 · 평균 완주율.
 *   **앞 3개는 지난달 대비, 평균 완주율은 지난 분기 대비**이고 넷 다 "오르면 좋은" 지표다
 * - F02 수강 추이 — 최근 12주 신규 수강 등록 수 · 선 그래프 · 기간 4주/12주/6개월
 * - F03 강의별 완주 현황 — 상위 5개 · 강의명 · 수강생 수 · 완주율 가로 막대 ·
 *   **40% 미만이면 주의 색**
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `KPIS` 는 **정확히 4장** (뼈대가 `grid-cols-4` 한 줄에 깐다)
 * - `KPIS[].up`(방향, 화살표)과 `.good`(좋고 나쁨, 색)은 **다른 축이다. 둘 다 필수.**
 *   이 도메인은 기획서가 "네 지표 모두 오르면 좋다"고 못 박아 두 값이 같은 방향을 가리키지만,
 *   **평균 완주율은 실제로 내려간 지표**라 `up: false / good: false` 로 갈린다.
 *   `good: up` 으로 복사하면 그 카드가 초록으로 나가 화면이 거짓말을 한다
 * - `KPIS[].caption` 은 **비교 기준이다. 카드마다 따로 든다.** 여기서는 실제로 갈린다 —
 *   앞 3장 "지난달 대비" / 완주율 "지난 분기 대비". 한 문구로 묶으면 분기 지표가
 *   월 지표와 같은 기준으로 읽혀 숫자가 서로 모순되는 화면이 된다
 * - 차트에 넘기는 배열에 **타입을 새로 달지 않는다** — `ChartDatum`(`Record<string,
 *   string | number>`)에 암묵적 index signature 로 대입되므로 인터페이스를 붙이면 대입이 깨진다
 * - `DEFAULT_PERIOD` 는 `PERIODS[].value` 중 하나여야 한다. 뼈대는 이 상수를 `useState`
 *   초기값으로 받는다 — 문자열을 뼈대에 박으면 여기를 고칠 때 세그먼트에 활성 항목이 사라진다
 * - 완주율 **임계 판정은 이 파일이 한다**(`completionTone`). `ProgressBar` 는 결과인 `tone` 만
 *   받는다 — 극성("미만이면 경고")이 부품에 박히면 이탈률처럼 높을수록 나쁜 지표에 못 쓴다
 *   (`docs/DESIGN.md` §26-1)
 * ---------------------------------------------------------------------- */

/* -------------------------------------------------------------------------
 * 단위 포맷 — 단위가 곧 도메인이라 여기 둔다 (명 · 개 · 만원 · %).
 * 축 눈금과 툴팁이 같은 함수를 공유하는데 툴팁 값이 문자열로 들어올 수 있어
 * `number | string` 을 모두 받는다.
 * ---------------------------------------------------------------------- */

export const num = (value: number) => value.toLocaleString("ko-KR");

/** 사람 수 — 차트 축·툴팁과 목록이 함께 쓴다 */
export const people = (value: number | string) =>
  typeof value === "number" ? `${num(value)}명` : `${value}`;

/**
 * 완주율·진도율. 기획서 formats — "0~100 정수 또는 소수 1자리 %".
 *
 * ⚠️ `%` 는 값과 쪼개지 않는다(§D6-5) — `62.4` + `%` 로 나누면 단위가 작아져 오히려 어색하다.
 * 백분율은 관례상 한 덩어리로 읽힌다.
 */
export const pct = (value: number) =>
  `${Number.isInteger(value) ? value : value.toFixed(1)}%`;

/* -------------------------------------------------------------------------
 * 기간 세그먼트 (F02)
 * ---------------------------------------------------------------------- */

/** 헤더가 아니라 **차트 카드**의 세그먼트다 — 이 화면에서 기간이 걸리는 것은 추이 차트뿐이다 */
export const PERIODS = [
  { value: "4w", label: "4주" },
  { value: "12w", label: "12주" },
  { value: "6m", label: "6개월" },
];

/** 기획서 기본값 — "최근 12주 신규 수강 등록 수" */
export const DEFAULT_PERIOD = "12w";

/**
 * 최근 12주 주별 신규 수강 등록 수. `label` 은 그 주의 시작일(월요일)이다.
 *
 * 12주(약 3개월) 구간이라 **6개월 보기의 마지막 3개월은 이 배열에서 계산한다**(아래
 * `MONTHLY_ENROLLMENTS`). 상수로 따로 박으면 두 보기가 조용히 어긋난다.
 */
export const WEEKLY_ENROLLMENTS = [
  { label: "6/8", value: 74 },
  { label: "6/15", value: 82 },
  { label: "6/22", value: 68 },
  { label: "6/29", value: 91 },
  { label: "7/6", value: 86 },
  { label: "7/13", value: 103 },
  { label: "7/20", value: 95 },
  { label: "7/27", value: 112 },
  { label: "8/3", value: 108 },
  { label: "8/10", value: 124 },
  { label: "8/17", value: 118 },
  { label: "8/24", value: 131 },
];

/** 4주 보기 = 12주의 **마지막 4점**. 잘라서 만들어야 두 보기가 같은 값을 말한다 */
const RECENT_4_WEEKS = WEEKLY_ENROLLMENTS.slice(-4);

/** 4주씩 묶어 월 합계를 낸다 — 6·7·8월이 각각 12주 데이터의 한 덩어리다 */
const sumWeeks = (from: number, to: number) =>
  WEEKLY_ENROLLMENTS.slice(from, to).reduce((sum, week) => sum + week.value, 0);

/**
 * 6개월 보기. 기획서 gap — "6개월을 골랐을 때 주 단위인지 월 단위인지" 정의가 없어
 * **월 단위 6점**으로 정했다(주 단위 26점은 축 라벨이 겹쳐 읽히지 않는다).
 *
 * 뒤 3개월은 위 주별 데이터의 파생값이다. 앞 3개월만 이 화면이 들고 있는 과거 값이다.
 */
export const MONTHLY_ENROLLMENTS = [
  { label: "3월", value: 268 },
  { label: "4월", value: 302 },
  { label: "5월", value: 287 },
  { label: "6월", value: sumWeeks(0, 4) },
  { label: "7월", value: sumWeeks(4, 8) },
  { label: "8월", value: sumWeeks(8, 12) },
];

const TREND_BY_PERIOD: Record<string, { label: string; value: number }[]> = {
  "4w": RECENT_4_WEEKS,
  "12w": WEEKLY_ENROLLMENTS,
  "6m": MONTHLY_ENROLLMENTS,
};

/** 모르는 값이 들어오면 기본 기간으로 떨어뜨린다 — 차트가 빈 채로 서는 것보다 낫다 */
export const trendFor = (period: string) =>
  TREND_BY_PERIOD[period] ?? TREND_BY_PERIOD[DEFAULT_PERIOD];

/** 선택한 기간의 신규 등록 합계. 파생값이라 뼈대가 아니라 여기서 센다 */
export const trendTotal = (period: string) =>
  trendFor(period).reduce((sum, point) => sum + point.value, 0);

/**
 * 차트의 접근가능 이름. **기간에 따라 바뀐다** — SVG 는 스크린리더에 내용이 전달되지
 * 않으므로(§28-4) 이 문장이 곧 차트의 내용이다. 기간을 바꿨는데 이름이 그대로면
 * 무엇을 보고 있는지 알 수 없다.
 */
export const trendAriaLabel = (period: string) =>
  `최근 ${PERIODS.find((item) => item.value === period)?.label ?? ""} 신규 수강 등록 수 추이`;

/**
 * 계열 하나뿐이라 **범례를 두지 않는다**(계열이 2개 이상일 때만 범례 필수 · §3-3).
 * `key` 는 데이터 객체의 속성 이름과 정확히 일치해야 한다 — 어긋나면 선이 그려지지 않는다.
 */
export const ENROLLMENT_SERIES: ChartSeries[] = [
  { key: "value", label: "신규 수강 등록" },
];

/* -------------------------------------------------------------------------
 * 강의별 완주 현황 (F03)
 * ---------------------------------------------------------------------- */

export interface CourseCompletion {
  id: string;
  name: string;
  /** 수강생 수 */
  students: number;
  /** 완주율 0~100 */
  rate: number;
}

/**
 * **수강생 수 상위 5개** 강의다(기획서는 "상위 5개"라고만 하고 기준을 정하지 않았다).
 *
 * ⚠️ 이 5개의 가중평균 완주율은 59.1% 로 KPI 의 `평균 완주율 62.4%`(24개 강의 전체 평균)와
 * 다르다. 모집단이 다르기 때문이며, 그래서 카드 설명에 "수강생 수 상위 5개 강의"라고
 * 밝힌다 — 밝히지 않으면 같은 수치를 두 번 말한 것처럼 읽혀 화면이 모순돼 보인다.
 */
export const TOP_COURSES: CourseCompletion[] = [
  {
    id: "C-2041",
    name: "실무로 배우는 React 입문",
    students: 862,
    rate: 78.5,
  },
  {
    id: "C-1875",
    name: "데이터 분석 첫걸음: 파이썬",
    students: 743,
    rate: 64.2,
  },
  { id: "C-2210", name: "비전공자를 위한 SQL 기초", students: 615, rate: 58.9 },
  { id: "C-1932", name: "UX 라이팅 실전 워크숍", students: 528, rate: 41.3 },
  { id: "C-2158", name: "직장인 영어 회화 100일", students: 412, rate: 32.6 },
];

/**
 * 기획서 thresholds — "강의별 완주율 40% 미만이면 막대를 주의 색으로 표시".
 * 화면이 아니라 데이터가 판정한다.
 */
export const COMPLETION_WARNING_BELOW = 40;

/** 임계 판정. `ProgressBar` 는 숫자가 아니라 이 결과만 받는다 (`docs/DESIGN.md` §26-1) */
export const completionTone = (rate: number): ProgressBarTone =>
  rate < COMPLETION_WARNING_BELOW ? "warning" : "default";

/** 막대에 붙는 낭독 덧말 — 색을 못 보는 사람에게 임계를 전달하는 두 번째 채널 */
export const COMPLETION_WARNING_TEXT = "완주율 낮음";

/* -------------------------------------------------------------------------
 * 핵심 지표 4장 (F01)
 * ---------------------------------------------------------------------- */

/**
 * 아이콘은 lucide **컴포넌트 참조**(JSX 아님). `value` 는 이미 포맷된 문자열이다.
 *
 * ⚠️ **값과 단위를 한 문자열로 합치지 않는다**(§D3-3) — `"4,820명"` 으로 붙이면 단위까지
 * 30px 이 되어 자릿수가 몇인지 한눈에 안 들어온다. `%` 만 예외로 값에 붙이고 `unit: ""` 를 준다
 * (필드 구조는 다른 지표와 같게 유지해 타입이 갈라지지 않게 한다).
 *
 * ⚠️ `up`(화살표)과 `good`(색)은 다른 축이다. 기획서 F01 이 네 지표 모두 "오르면 좋다"고
 * 명시했지만, **평균 완주율은 실제로 내려갔다** — 그래서 ↓ 화살표에 빨강이다.
 * 반대로 이 도메인에 "내려가면 좋은 지표"(노쇼율·이탈률 류)는 기획서에 없다.
 *
 * 숫자 정합: 이번 달(8월) 신규 등록은 추이 차트의 8월 값 481명이고, 총 수강생 증감
 * `+332명` 은 거기서 환불·이탈을 뺀 순증이다.
 */
export const KPIS = [
  {
    label: "총 수강생",
    value: "4,820",
    unit: "명",
    delta: "+332명",
    caption: "지난달 대비",
    up: true,
    good: true,
    icon: Users,
  },
  {
    label: "진행 중 강의",
    value: "24",
    unit: "개",
    delta: "+2개",
    caption: "지난달 대비",
    up: true,
    good: true,
    icon: BookOpen,
  },
  {
    label: "이번 달 매출",
    value: "12,480",
    unit: "만원",
    delta: "+11.4%",
    caption: "지난달 대비",
    up: true,
    good: true,
    icon: Wallet,
  },
  {
    /* 기획서 F01 — 이 지표만 비교 기준이 분기다. 4장이 공유하는 문구가 아니다 */
    label: "평균 완주율",
    value: "62.4%",
    unit: "",
    delta: "-2.1%p",
    caption: "지난 분기 대비",
    up: false,
    good: false,
    icon: GraduationCap,
  },
];
