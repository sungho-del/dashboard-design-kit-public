import { NOTICE_ROWS } from "./BoardPages.data";
import { MY_PRODUCTS, saleStatOf } from "./ProductsPage.data";
import { DEMO_TODAY } from "./processList.data";
import { SELLER_ASKS, SL_INQUIRIES, SL_REVIEWS } from "./seed/board.data";
import { UNITS } from "./seed/orders.data";
import { SUMMARY } from "./settle.data";
import {
  type Metric,
  num,
  type FlowStep,
  pad,
  type PeriodValue,
  PERIOD_DAYS,
} from "./SellerDashboardPage.labels";

export * from "./SellerDashboardPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./SellerDashboardPage.labels`(개발 요청 2026-11-12 46번) */

/* ---------- 공지 — 고정 먼저(최신순) → 일반(최신순), 3건(원본 `noticeTop` · 판정 Q13 — 공지 목록과 같은 순서) ---------- */

export const NOTICE_TOP = NOTICE_ROWS.slice(0, 3);

/* ---------- 지표 3그룹 ---------- */

const prodCount = (s: string) =>
  MY_PRODUCTS.filter((p) => saleStatOf(p) === s).length;

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
          label: "확정 거래액 (판매가)",
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
