import { UNITS } from "./seed/orders.data";
import { STORE } from "./seed/store.data";
import {
  type SettleSummary,
  settleVoided,
  settleInMonth,
  sum,
  settleCouponOf,
  settlePointOf,
  STORE_FEE_RATE,
  PG_RATE,
  settleClawback,
  clawbackOf,
  sortTx,
  type Statement,
  SETTLE_MONTH,
  SETTLE_PAYDAY,
  type HqTaxIssue,
  type TaxInvoice,
  taxStatOf,
  HQ_TAX_ISSUE,
  depStatOf,
  depBackOf,
} from "./settle.labels";

export * from "./settle.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./settle.labels`(개발 요청 2026-11-12 46번) */

/** 내 스토어 거래 모집단 — 명세 집계와 거래 내역 표가 **같은 모집단**(원본 UI-263) */
export const myUnits = () =>
  UNITS.filter((u) => u.owner === "입점사" && u.seller === STORE.name);

/** 이번 회차 내 매출 집계 — 원본 `settleMyData` */
export function settleSummary(): SettleSummary {
  const mine = myUnits();
  const units = mine.filter((u) => !settleVoided(u) && settleInMonth(u));
  const sale = sum(
    units.filter((u) => u.type === "판매"),
    (u) => u.amt,
  );
  const rent = sum(
    units.filter((u) => u.type === "렌트"),
    (u) => u.amt,
  );
  const list = sale + rent;
  const coupon = sum(units, settleCouponOf);
  const point = sum(units, settlePointOf);
  const gmv = Math.max(0, list - coupon);
  const fee = Math.round((gmv * STORE_FEE_RATE) / 100);
  const pg = Math.round(gmv * PG_RATE);
  const cancel = sum(mine.filter(settleClawback), clawbackOf);
  /* 안심케어 보전 — 이번 회차 반납완료 확정분 중 **본사 승인 건만** */
  const care = sum(
    mine.filter(
      (u) =>
        u.type === "렌트" &&
        u.stat === "반납완료" &&
        !!u.careClaim &&
        u.careStat === "승인" &&
        settleInMonth(u),
    ),
    (u) => u.careClaim ?? 0,
  );
  /* 셀러 귀속 3종 — 예시 값이 없다(값을 지어내지 않는다 · 본사 정산과 같다) */
  const penalty = 0;
  const pickup = 0;
  const shipping = 0;
  const net = gmv - fee - pg - cancel + care + penalty + pickup + shipping;
  return {
    units,
    sale,
    rent,
    list,
    coupon,
    point,
    gmv,
    fee,
    pg,
    cancel,
    care,
    penalty,
    pickup,
    shipping,
    payout: Math.max(0, net),
    unpaid: Math.max(0, -net),
  };
}

export const SUMMARY = settleSummary();

/** 이번 회차 거래 내역(정렬 끝) — 매출 정산 · 명세서 상세가 같이 쓴다 */
export const SETTLE_TX = sortTx(myUnits());

export const STATEMENTS: Statement[] = [
  {
    no: "STM-2606",
    month: SETTLE_MONTH,
    gmv: SUMMARY.gmv,
    ded: SUMMARY.fee + SUMMARY.pg + SUMMARY.cancel,
    add: SUMMARY.care + SUMMARY.penalty + SUMMARY.pickup + SUMMARY.shipping,
    payout: SUMMARY.payout,
    payday: SETTLE_PAYDAY,
    stat: "확인요청",
    live: true,
    unpaid: SUMMARY.unpaid,
  },
  {
    no: "STM-2605",
    month: "2026.05",
    gmv: 2841000,
    ded: 398000,
    add: 0,
    payout: 2443000,
    payday: "2026.06.10",
    stat: "지급완료",
    live: false,
    unpaid: 0,
  },
  {
    no: "STM-2604",
    month: "2026.04",
    gmv: 2312000,
    ded: 324000,
    add: 0,
    payout: 1988000,
    payday: "2026.05.11", // 05.10 이 일요일 — 휴일이면 다음 영업일(디자인 §1 정산)
    stat: "지급완료",
    live: false,
    unpaid: 0,
  },
];

export const findStatement = (month: string) =>
  STATEMENTS.find((s) => s.month === month);

/** 지급 계좌 — 원본 고정 문구 */
export const PAYOUT_ACCOUNT = `우리은행 1002-***-****** (${STORE.name})`;

/** 명세서 한 회차 + 본사 발행 상태 → 세금계산서 한 줄. 상태는 `s.stat`(지급 상태)을 읽지 않는다 */
export const taxInvoiceOf = (s: Statement, issue: HqTaxIssue): TaxInvoice => {
  const supply = s.live ? SUMMARY.fee : Math.round(s.ded * 0.72);
  return {
    no: `TX-${s.month.slice(2).replace(".", "")}`,
    month: s.month,
    supplier: "주식회사 렌티크", // 발행 사업자의 등록 상호(반영 결과 답(2026-11-10) 3번)
    receiver: STORE.name,
    date: s.payday,
    supply,
    vat: Math.round(supply * 0.1),
    issue,
    stat: taxStatOf(issue),
  };
};

export const TAX_INVOICES: TaxInvoice[] = STATEMENTS.map((s) =>
  taxInvoiceOf(s, HQ_TAX_ISSUE[s.month] ?? "미발행"),
);

/** 보증금 있는 렌트 전부 — 요약 타일 기준(목록보다 넓다 · 원본 그대로) */
export const DEPOSIT_UNITS = UNITS.filter((u) => u.type === "렌트" && u.dep);
/** 목록 = 검수·반납 단계만 */
export const DEPOSIT_LIST = DEPOSIT_UNITS.filter((u) =>
  ["검수중", "검수완료", "반납완료"].includes(u.stat ?? ""),
);

export function depositStats() {
  const src = DEPOSIT_UNITS;
  const done = src.filter((u) =>
    ["전액환급", "일부환급", "전액차감"].includes(u.depStat ?? ""),
  );
  return {
    hold: sum(
      src.filter((u) => depStatOf(u) === "점유중"),
      (u) => u.dep || 0,
    ),
    pending: sum(
      src.filter((u) => u.depStat === "환급대기"),
      depBackOf,
    ),
    refunded: sum(done, depBackOf),
    deducted: sum(done, (u) => Math.min(u.dep || 0, u.deduct || 0)),
  };
}
