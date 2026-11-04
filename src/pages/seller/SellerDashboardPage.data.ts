import { MY_PRODUCTS, saleStatOf } from "./ProductsPage.data";
import { DEMO_TODAY } from "./processList.data";
import {
  SELLER_ASKS,
  SELLER_NOTICES,
  SL_INQUIRIES,
  SL_REVIEWS,
} from "./seed/board.data";
import { UNITS } from "./seed/orders.data";
import { SUMMARY } from "./settle.data";

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

/* ---------- 공지 — 고정 먼저 + 최근순, 3건(원본 `noticeTop`) ---------- */

export const NOTICE_TOP = [...SELLER_NOTICES]
  .sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0))
  .slice(0, 3);

/* ---------- 지표 3그룹 ---------- */

const prodCount = (s: string) =>
  MY_PRODUCTS.filter((p) => saleStatOf(p) === s).length;

export interface Metric {
  label: string;
  value: string;
  unit: string;
  navId: string;
}

export const METRIC_GROUPS: { id: string; title: string; metrics: Metric[] }[] =
  [
    {
      id: "product",
      title: "내 상품",
      metrics: [
        {
          label: "판매중",
          value: num(prodCount("판매중")),
          unit: "개",
          navId: "/products",
        },
        {
          label: "판매중지",
          value: num(prodCount("판매중지")),
          unit: "개",
          navId: "/products",
        },
        {
          label: "품절",
          value: num(prodCount("품절")),
          unit: "개",
          navId: "/products",
        },
      ],
    },
    {
      id: "cs",
      title: "내 응대",
      metrics: [
        {
          label: "미답변 문의",
          value: num(SL_INQUIRIES.filter((q) => q.stat === "접수").length),
          unit: "건",
          navId: "/support",
        },
        {
          label: "답글 미작성 리뷰",
          value: num(SL_REVIEWS.filter((r) => !r.reply).length),
          unit: "건",
          navId: "/seller-reviews",
        },
        {
          label: "1:1 문의 답변 대기",
          value: num(SELLER_ASKS.filter((a) => a.stat === "접수").length),
          unit: "건",
          navId: "/seller-ask",
        },
      ],
    },
    {
      id: "settle",
      title: "내 정산",
      metrics: [
        {
          label: "확정 거래액 (정가)",
          value: num(SUMMARY.list),
          unit: "원",
          navId: "/settle-own",
        },
        /* 차감 = 명세서 「차감(수수료·PG)」과 같은 식 — 두 화면이 다른 값을 내지 않게(원본 주석) */
        {
          label: "차감 (수수료·PG)",
          value: num(SUMMARY.fee + SUMMARY.pg + SUMMARY.cancel),
          unit: "원",
          navId: "/settle-own",
        },
        {
          label: "지급 예정액",
          value: num(SUMMARY.payout),
          unit: "원",
          navId: "/settle-own",
        },
      ],
    },
  ];

/* ---------- 흐름 — 원본 `dStat`(처리단위 원래 상태 그대로 센다) ---------- */

export interface FlowStep {
  label: string;
  count: number;
  navId: string;
}

const dStat = (type: string, stat: string) =>
  UNITS.filter((u) => u.type === type && u.stat === stat).length;

export const SALE_FLOW: FlowStep[] = [
  {
    label: "신규 주문",
    count: dStat("판매", "신규 주문"),
    navId: "/sale-proc",
  },
  {
    label: "배송 준비",
    count: dStat("판매", "배송 준비"),
    navId: "/sale-proc",
  },
  { label: "배송 완료", count: dStat("판매", "배송 완료"), navId: "/shipping" },
  { label: "구매확정", count: dStat("판매", "구매확정"), navId: "/shipping" },
];
export const RENT_FLOW: FlowStep[] = [
  {
    label: "신규 주문",
    count: dStat("렌트", "신규 주문"),
    navId: "/rent-list",
  },
  { label: "대여중", count: dStat("렌트", "대여중"), navId: "/rent-use" },
  {
    label: "검수중",
    count: dStat("렌트", "검수중"),
    navId: "/rent-insp-return",
  },
  {
    label: "반납완료",
    count: dStat("렌트", "반납완료"),
    navId: "/rent-insp-return",
  },
];

/* ---------- 매출 추이 — 원본 `salesDaily`(결제일 = `orderedAt` · 기준일까지 N일) ---------- */

export type PeriodValue = "1w" | "1m" | "3m";
export const PERIODS = [
  { value: "1w", label: "1주" },
  { value: "1m", label: "1개월" },
  { value: "3m", label: "3개월" },
];
export const DEFAULT_PERIOD: PeriodValue = "1m";
const PERIOD_DAYS: Record<PeriodValue, number> = {
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

const pad = (n: number) => String(n).padStart(2, "0");

/** 일별 [날짜(점 표기), 건수, 금액] — 원본과 같은 식 */
export function salesDaily(days: number) {
  const cnt: Record<string, number> = {};
  const amt: Record<string, number> = {};
  for (const u of UNITS) {
    const k = String(u.orderedAt || "").slice(0, 10);
    if (!k) continue;
    cnt[k] = (cnt[k] || 0) + 1;
    amt[k] = (amt[k] || 0) + (Number(u.amt) || 0);
  }
  const base = new Date(`${DEMO_TODAY}T00:00:00`);
  const out: { label: string; count: number; amount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i);
    const k = `${t.getFullYear()}.${pad(t.getMonth() + 1)}.${pad(t.getDate())}`;
    out.push({ label: k, count: cnt[k] || 0, amount: amt[k] || 0 });
  }
  return out;
}

export const trendOf = (period: PeriodValue) => salesDaily(PERIOD_DAYS[period]);

export const COUNT_SERIES = [{ key: "count", label: "주문 건수" }];
export const AMOUNT_SERIES = [{ key: "amount", label: "주문 금액" }];

/** 축 눈금 — 「06.05」(툴팁은 연도 포함 원래 값) */
export const shortDay = (label: string | number) => String(label).slice(5);
