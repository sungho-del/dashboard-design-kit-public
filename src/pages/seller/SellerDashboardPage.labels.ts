/* 셀러 `SellerDashboardPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SellerDashboardPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/* =========================================================================
 * 셀러 대시보드(SO-DSH-001) — 통계형 · 도메인
 *
 * 원본 = 기획 v0.4 `SCREENS.dashboard`(3397) · `salesDaily`(3329) · `dStat`(3325) · `dashGo`(3318).
 * 본사 대시보드와 같은 골격(지표 3그룹 → 차트 → 흐름 · 2026-11-03 사용자 결정 「레이아웃은 기존으로」)에
 * 집계 스코프만 자사 — 회원·셀러 현황 대신 **내 상품 / 내 응대 / 내 정산**, 맨 위에 공지 3건.
 * 숫자는 전부 다른 화면과 **같은 식**을 읽는다(상품 = `saleStatOf` · 정산 = `settle.data` `SUMMARY`).
 * `SellerDashboardPage.test.tsx` 가 원본에서 뽑은 정답(`sellerDashboard.golden.ts`)과 대조한다.
 *
 * ## 원본과 다르게 둔 것
 * - 차트는 본사와 같은 `LineChart`(단일 계열 · 최댓값 라벨 · 범례 없음 — 원본 「단일 계열이라 범례 없음」)
 * - 흐름 단계 화살표 `›` → 아이콘 · 공지 「고정」 배지 = 중립 `Tag`
 *
 * ## 기획 확인 필요 (원본대로 둔 것)
 * - 차트·흐름은 `UNITS` **전부**를 센다 — 본사 자체 처리단위 6건이 섞인다(목록과 같은 원본 특이점)
 * - 차트 금액 = 처리단위 저장 금액(`u.amt` · 정가) — 결제금액(할인·쿠폰 뒤)이 아니다
 * - 원본 `dashGo` 는 도착 화면의 상태 카드까지 골라 주지만 우리 목록은 주소로 상태를 받지 않는다 —
 *   이동만 한다(본사 대시보드와 같다). 상품 「판매중」은 목록 기본 카드라 건수가 맞고, 나머지는 카드를 한 번 더 눌러야 한다
 * ====================================================================== */

export const num = (n: number) => n.toLocaleString("ko-KR");
export const won = (v: string | number) =>
  `${Number(v).toLocaleString("ko-KR")}원`;
export const count = (v: string | number) =>
  `${Number(v).toLocaleString("ko-KR")}건`;

export interface Metric {
  label: string;
  value: string;
  unit: string;
  navId: string;
}

/* ---------- 흐름 — 원본 `dStat`(처리단위 원래 상태 그대로 센다) ---------- */

export interface FlowStep {
  label: string;
  count: number;
  navId: string;
}

/* ---------- 매출 추이 — 원본 `salesDaily`(결제일 = `orderedAt` · 기준일까지 N일) ---------- */

export type PeriodValue = "1w" | "1m" | "3m";
export const PERIODS = [
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
];
export const DEFAULT_PERIOD: PeriodValue = "1m";
export const PERIOD_DAYS: Record<PeriodValue, number> = {
  "1w": 7,
  "1m": 30,
  "3m": 90,
};
/** x축 눈금 간격 — 원본 `lblStep`(1주 매일 · 1개월 5일 · 3개월 15일) */
export const TICK_EVERY: Record<PeriodValue, number> = {
  "1w": 1,
  "1m": 5,
  "3m": 15,
};
export const asPeriod = (v: string): PeriodValue =>
  v === "1w" ? "1w" : v === "3m" ? "3m" : "1m";

export const pad = (n: number) => String(n).padStart(2, "0");

export const COUNT_SERIES = [{ key: "count", label: "주문 건수" }];
export const AMOUNT_SERIES = [{ key: "amount", label: "주문 금액" }];

/** 축 눈금 — 「06.05」(툴팁은 연도 포함 원래 값) */
export const shortDay = (label: string | number) => String(label).slice(5);

/**
 * 흐름 카드 숫자 넘침 — 세 자리 이상이면 좁은 폭에서 2×2 로 접는다(develop · 본사 포크와 같은 접기 · 개발 요청 44번).
 * 100건↑ = 480px 아래 접기 · 1,000건↑ = 480px 이상에서 숫자 한 단계 작게 · 10,000건↑ = 640px 아래 접기
 */
export const flowFoldOf = (counts: number[]) => ({
  wide3: counts.some((n) => n >= 100),
  wide4: counts.some((n) => n >= 1000),
  wide5: counts.some((n) => n >= 10000),
});
