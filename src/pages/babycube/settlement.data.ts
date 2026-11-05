import type { TagTone } from "../../components/ui";
import {
  CLAIM_TYPE_LABEL,
  isClaimRefused,
  ORDERS,
  rentPriceOf,
  type Order,
} from "./OrderListPage.data";
import { SELLERS } from "./SellerListPage.data";

/* -------------------------------------------------------------------------
 * 정산 — **순수 계산 층** (화면 없음 · 2026-11-02)
 *
 * 주문 처리단위(`ORDERS`) + 셀러 마스터 요율(`SELLERS.commission`) + 회차 + 과거 지급(환수용)
 * → 셀러별 정산 행 · 본사 행 · 회차 요약 · 세금계산서 행.
 * 셀러 정산 · 정산 내역/명세서 · 세금계산서 · 대시보드 정산 타일이 **이 결과만** 읽는다(원본도
 * `settleSellerRows()` 하나에서 세 화면이 나온다). 화면 상태(필터·모달)는 넣지 않는다.
 *
 * 기준 기획: v0.4 proto.html 4157~4245 (`settleVoided`·`confirmDate`·`settleClawback`·
 * `clawbackAmt`·`settleSellerRows`) · 4560~4580(거래 내역 「정산 반영」 문구·정렬) · 4632~4646(세금계산서).
 *
 * ## 공식 (셀러마다 — 반올림·0원 하한을 **셀러별로** 건 뒤 합산한다)
 * - 확정 거래액 = Σ 할인 후 상품 소계(렌트 원/일 × 렌트일 · 판매가 × 수량) — 이번 회차 반영분
 * - 정산 매출 = max(0, 확정 거래액 − 셀러 쿠폰) — 셀러 할인 적용 후 판매가 − 셀러 쿠폰(판정 Q1 「계산식은 그대로」 ·
 *   화면 이름 「정가」 → 「판매가」). 포인트·본사 쿠폰은 본사 부담(디자인 §1)
 * - 판매 수수료 = round(정산 매출 × 셀러 요율 %/100) · PG = round(정산 매출 × 3%) (요율 미정 · 데모)
 *   ⚠️ **기획 확인 필요**: 정책 B-2 문구는 「수수료 10%」, 원본 코드·셀러 마스터는 셀러별 요율
 * - 환수 = 지난 회차에 **실제 지급한 금액**(고정값 `PAST_PAYOUTS` — 지금 요율로 다시 계산하지 않는다)
 * - 안심케어 보전 = 이번 회차 확정(반납완료) 렌트 중 복원비 청구가 **승인**된 것의 청구액
 * - 셀러 귀속 = 위약금 · 픽업 요금 · 배송비 — 가산(수수료 비대상 · 판정 Q3 · Q20-3·4 「develop대로」).
 *   예시 값이 없어 모두 0원이다(화면에는 0원 초과일 때만 줄이 선다 — 예시 값은 기획 확인 요청 18번)
 * - net = 정산 매출 − 수수료 − PG − 환수 + 보전 + 셀러 귀속 · 지급액 = max(0, net) · 미회수 = max(0, −net)(별도 청구, 이월 없음)
 *   — 「매출 − 차감 + 가산 = 지급액」(판정 Q3, 0원 하한 행 제외)
 * - 포인트 = 본사 부담 · 정산 영향 없음(참고 값). 보증금·안심케어 가입 요금·배송비는 매출에 넣지 않는다(배송비는 셀러 귀속 가산)
 *
 * ## 처리단위 판정 (원본 순서 그대로)
 * 1. 취소·반품이 걸렸고 불성립(반려·거부·재반송)이 아니면 **제외**(`voided`) —
 *    그중 지난 회차에 지급됐고 이번 회차에 완료로 끝난 건이 **환수**
 * 2. 확정일(`Order.confirmedAt` — 판매 구매확정 · 렌트 반납완료)이 이번 회차 달이면 **반영**.
 *    클레임이 반려·거부로 끝난 건은 거래가 살아 있어 반영(교환은 확정이 없어 미확정)
 * 3. 그 밖은 **제외** — 다른 달 확정 / 미확정(차감이 아니다)
 * ---------------------------------------------------------------------- */

/**
 * 이번 회차 — 2026년 9월 확정분, 익월 10일 지급 (사용자 결정 2026-11-02 ①).
 * 휴일이면 다음 영업일 — 10.10(토) → 10.12(월)(디자인 §1 · `DM` #10 정산 일정)
 */
export const SETTLE_ROUND = "2026.09";
export const PAYOUT_DATE = "2026-10-12";

/** `2026.09` → `2026년 9월` (원본 `SETTLE_MONTH_KO` 는 `2026년 09월` — 앞자리 0 은 뺐다 · 사용자 승인 2026-11-03) */
export const roundLabel = (round: string) => {
  const [year, month] = round.split(".");
  return `${year}년 ${Number(month)}월`;
};

/** PG 수수료율 — 요율 미정 · 데모 3%(원본) */
export const PG_RATE = 0.03;
/** 세금계산서 세액률 */
export const VAT_RATE = 0.1;
/** 세금계산서 공급자 — 원본 표기 */
export const TAX_SUPPLIER = "BabyCube(본사)";

/**
 * 세금계산서 발행일 — 매월 10일(휴일이면 다음 영업일) 자동 발행, **지급·보류와 분리**(판정 Q4).
 * 이번 달은 10.10(토) → 10.12(월). 지급일과 같은 날이지만 지급 처리에 묶이지 않는다
 */
export const TAX_ISSUE_DATE = "2026-10-12";

/**
 * 자동 발행이 실패해 「미발행」으로 남은 계산서(셀러 id) — [발행]은 이 건에만(판정 Q4).
 * 몇 건을 둘지는 기획 확인 요청 19번 — 답 전까지 지금 화면(발행완료 2 · 미발행 5) 그대로 두되,
 * 정산 지급 상태에서는 떼었다(「지급·보류와 분리」)
 */
const TAX_ISSUE_FAILED = ["S-201", "S-228", "S-229", "S-230", "S-231"];

/**
 * 셀러 정산 상태 6종 — 원본 G-2(지급대기 → 확인요청 → 확인완료 → 지급완료 + 예외 이의제기·보류).
 * 키·라벨·톤은 지금 셀러 정산 화면(`SellerSettlementPage.data.ts` `STATUS_META`)과 같다.
 */
export type SettlementStatus =
  "waiting" | "requested" | "agreed" | "paid" | "disputed" | "held";

export const SETTLEMENT_STATUS_META: Record<
  SettlementStatus,
  { label: string; tone: TagTone }
> = {
  waiting: { label: "지급대기", tone: "default" },
  requested: { label: "확인요청", tone: "success" },
  agreed: { label: "확인완료", tone: "warning" },
  paid: { label: "지급완료", tone: "default" },
  disputed: { label: "이의제기", tone: "critical" },
  held: { label: "보류", tone: "critical" },
};

/**
 * 과거 회차 지급 — 환수의 근거. **당시 실지급액을 고정값으로** 든다(GPT 계약 3 — 지금 요율로 다시 셈하면
 * 과다·중복 환수가 된다). 환수는 클레임이 **이번 회차 달에 완료**된 회차에서 한 번만 일어난다.
 *
 * - U-S30 리틀스텝 · 2026.08 회차(09.10 지급) · 정산 매출 90,000 − 수수료 11% 9,900 − PG 2,700 = 77,400
 */
export const PAST_PAYOUTS: Record<string, { round: string; amount: number }> = {
  "U-S30": { round: "2026.08", amount: 77_400 },
};

/**
 * 회차별 셀러 상태 — 2026.09 회차. 셀러 마스터 id 로 잇는다(이름 문자열로 잇지 않는다).
 *
 * 시간 흐름(원본 G-2): 09.30 마감 → 10.01 확인요청 자동 발송 → 3일 확인·이의제기 → 10.12 지급(10.10 토 → 다음 영업일).
 * ⚠️ **시연용 상태**: 시연 기준일 10.19 에 「지급대기」(리틀베이비)·「확인완료」(베베하우스·아이랑)가
 * 남아 있는 것은 시간상 맞지 않는다 — 상태 6종을 한 회차에 다 보이려고 둔 예외다(사용자 결정 ①).
 * 확인요청(코지베이비)은 이의제기 → 수정 명세 재발송(10.17) 뒤라 3일 기한(10.20) 안이다.
 */
interface SettlementSeed {
  status: SettlementStatus;
  /** 셀러 이의 사유 — 이의제기했던 회차 */
  objection?: { reason: string; at: string };
  /** 본사 수정 명세 재발송 — 검토 결과 요지 */
  resend?: { note: string; at: string };
}

const SETTLEMENT_SEEDS: Record<string, Record<string, SettlementSeed>> = {
  "2026.09": {
    "S-1042": { status: "paid" }, // 아기별상사 — 셀러 상세 「미지급 정산 0」과 맞는다
    "S-226": { status: "paid" }, // 베이비루
    "S-201": { status: "waiting" }, // 리틀베이비 — 시연용 상태
    "S-227": {
      /* 리틀스텝 — 환수로 net 이 음수(지급 0 · 미회수) */
      status: "disputed",
      objection: {
        reason:
          "8월 회차에 지급된 U-S30 반품 건 환수(77,400원)로 9월 지급액이 0원입니다 — 환수 금액 산정 근거 확인 요청",
        at: "2026-10-02 16:40",
      },
    },
    "S-228": { status: "held" }, // 맘스케어
    "S-229": { status: "agreed" }, // 베베하우스 — 시연용 상태
    "S-230": { status: "agreed" }, // 아이랑 — 시연용 상태
    "S-231": {
      /* 코지베이비 — 이의제기 → 수정 명세 재발송 → 다시 확인요청 */
      status: "requested",
      objection: {
        reason:
          "U-R29 안심케어 승인분(18,000원) 보전이 명세에 빠져 있습니다 — 확인 부탁드립니다",
        at: "2026-10-03 10:15",
      },
      resend: {
        note: "U-R29 안심케어 승인 복원비 18,000원 보전 반영해 재발송",
        at: "2026-10-17 15:00",
      },
    },
  },
};

/* =========================================================================
 * 처리단위 판정
 * ====================================================================== */

export type SettleTxKind = "included" | "clawback" | "excluded";

/** 거래 내역 한 줄 — 셀러(본사) 처리단위 **전부**(제외분 포함) */
export interface SettleTx {
  order: Order;
  kind: SettleTxKind;
  /** 「정산 반영」 칸 문구 — 원본 `settleTxNote` */
  note: string;
  /** 할인 후 상품 소계 — 거래 내역 「금액」 칸. 합산은 반영분만 */
  amount: number;
  /** 이 건이 이번 회차에서 빼는 환수액(환수 건만) */
  clawback: number;
  /** 이 건이 이번 회차에 더하는 안심케어 보전(반영 + 승인 건만) */
  care: number;
}

/** 할인 후 상품 소계 — 주문 명세의 「소계」와 같은 값 */
export const subtotalOf = (order: Order) =>
  order.type === "rent"
    ? (rentPriceOf(order) ?? 0) * (order.rentDays ?? 0)
    : Math.max(0, (order.saleBasePrice ?? 0) - (order.saleDiscount ?? 0)) *
      order.qty;

/** `YYYY-MM-DD …` → `YYYY.MM` */
const monthOf = (at: string) => at.slice(0, 7).replace("-", ".");

/** 취소·반품이 걸렸고 불성립이 아니다 → 매출 제외(원본 `settleVoided`). 교환은 해당 없음 */
const isVoided = (order: Order) =>
  (order.claim?.type === "cancel" || order.claim?.type === "return") &&
  !isClaimRefused(order);

const CLAIM_DONE = ["canceled", "returnDone"];

export const settleTxOf = (order: Order, round: string): SettleTx => {
  const amount = subtotalOf(order);
  const claim = order.claim;
  if (claim && isVoided(order)) {
    const past = PAST_PAYOUTS[order.id];
    const doneAt = claim.events[claim.events.length - 1].at;
    const clawback =
      past &&
      past.round < round &&
      CLAIM_DONE.includes(claim.status) &&
      monthOf(doneAt) === round
        ? past.amount
        : 0;
    return {
      order,
      kind: clawback > 0 ? "clawback" : "excluded",
      note: `제외 · ${CLAIM_TYPE_LABEL[claim.type]}${clawback > 0 ? " 환수" : ""}`,
      amount,
      clawback,
      care: 0,
    };
  }
  const month = order.confirmedAt ? monthOf(order.confirmedAt) : null;
  if (month === round) {
    const care = order.care?.claim;
    const kept = claim
      ? ` · ${CLAIM_TYPE_LABEL[claim.type]} ${isClaimRefused(order) ? "불성립" : "진행"} · 거래 유지`
      : "";
    return {
      order,
      kind: "included",
      note: `반영${kept}`,
      amount,
      clawback: 0,
      care:
        order.type === "rent" && care?.status === "approved" ? care.amount : 0,
    };
  }
  return {
    order,
    kind: "excluded",
    note: month ? `제외 · ${month} 확정` : "제외 · 미확정",
    amount,
    clawback: 0,
    care: 0,
  };
};

/** 거래 내역 정렬 — 반영 → 환수 → 그 밖 제외, 같은 군은 주문번호 내림차순(원본 `settleTxSort`) */
const TX_RANK: Record<SettleTxKind, number> = {
  included: 0,
  clawback: 1,
  excluded: 2,
};
const sortTx = (rows: SettleTx[]) =>
  [...rows].sort(
    (a, b) =>
      TX_RANK[a.kind] - TX_RANK[b.kind] ||
      b.order.orderNo.localeCompare(a.order.orderNo) ||
      a.order.id.localeCompare(b.order.id),
  );

/* =========================================================================
 * 정산 행
 * ====================================================================== */

export interface SettlementRow {
  /** 본사 행은 지급 대상이 아니다(본사 명세용 · 세금계산서 없음) */
  kind: "seller" | "hq";
  /** 셀러 마스터 id — 본사는 `S-0001`. 상세 경로·번호의 안정 키 */
  sellerId: string;
  /** 표시 이름 — 본사는 「본사」 */
  name: string;
  round: string;
  /** 명세서번호 `STM-{YYMM}-{셀러 id 숫자 4자리}` — 본사 `STM-2609-0001` */
  statementNo: string;
  /** 수수료율 % — 셀러 마스터 `commission`(본사 0) */
  rate: number;
  /** 확정 거래액(할인 후 소계) — 판매·렌트 나눠서도 든다(본사 명세) */
  saleSales: number;
  rentSales: number;
  sales: number;
  coupon: number;
  /** 정산 매출 = max(0, 확정 거래액 − 셀러 쿠폰) */
  revenue: number;
  fee: number;
  pg: number;
  clawback: number;
  care: number;
  /** 셀러 귀속 — 위약금 · 픽업 요금 · 배송비(가산 · 수수료 비대상). 예시 값 없음(0) */
  penalty: number;
  pickupFee: number;
  shippingFee: number;
  /** 포인트 사용 — 본사 부담, 참고 값 */
  point: number;
  /** 순차감 = 수수료 + PG + 환수 − 보전 − 셀러 귀속 (가산이 크면 음수) */
  netDeduction: number;
  /** net = 정산 매출 − 순차감 — 음수일 수 있다 */
  net: number;
  /** 지급액 = max(0, net) — 본사는 매출 그대로(원본 표기, 실제 외부 지급 아님) */
  payout: number;
  /** 미회수 = max(0, −net) — 별도 청구 */
  unpaid: number;
  /** 정산 반영 거래 건수 = `transactions` 의 반영 행 수 */
  count: number;
  status: SettlementStatus;
  objection: { reason: string; at: string } | null;
  resend: { note: string; at: string } | null;
  /** 지급 처리일 — 지급완료만 */
  paidAt: string | null;
  /** 처리단위 전부, 반영 → 환수 → 제외 순 */
  transactions: SettleTx[];
}

const HQ = SELLERS.find((seller) => seller.isHeadquarters)!;

/** 명세서·계산서 번호의 셀러 키 — `S-201` → `0201`, `S-1042` → `1042` */
const sellerKeyOf = (sellerId: string) =>
  sellerId.replace(/\D/g, "").padStart(4, "0");

/** `2026.09` → `2609` */
const yymmOf = (round: string) => round.slice(2, 4) + round.slice(5, 7);

export const statementNoOf = (round: string, sellerId: string) =>
  `STM-${yymmOf(round)}-${sellerKeyOf(sellerId)}`;

export const taxInvoiceNoOf = (round: string, sellerId: string) =>
  `TX-${yymmOf(round)}-${sellerKeyOf(sellerId)}`;

const sum = (rows: SettleTx[], pick: (tx: SettleTx) => number) =>
  rows.reduce((total, tx) => total + pick(tx), 0);

const rowOf = (
  kind: SettlementRow["kind"],
  sellerId: string,
  name: string,
  rate: number,
  orders: Order[],
  round: string,
): SettlementRow => {
  const transactions = sortTx(orders.map((order) => settleTxOf(order, round)));
  const included = transactions.filter((tx) => tx.kind === "included");
  const salesOf = (type: Order["type"]) =>
    sum(
      included.filter((tx) => tx.order.type === type),
      (tx) => tx.amount,
    );
  const saleSales = salesOf("sale");
  const rentSales = salesOf("rent");
  const sales = saleSales + rentSales;
  const coupon = sum(included, (tx) => tx.order.coupon);
  const revenue = Math.max(0, sales - coupon);
  const hq = kind === "hq";
  /* 본사 직영은 수수료·PG 없음(원본 「0원 (직영 — 수수료 없음)」) */
  const fee = hq ? 0 : Math.round(revenue * (rate / 100));
  const pg = hq ? 0 : Math.round(revenue * PG_RATE);
  const clawback = sum(transactions, (tx) => tx.clawback);
  const care = sum(included, (tx) => tx.care);
  /* 셀러 귀속 3종 — 예시 값이 없다(기획 확인 요청 18번 — 값을 지어내지 않는다) */
  const penalty = 0;
  const pickupFee = 0;
  const shippingFee = 0;
  const netDeduction =
    fee + pg + clawback - care - (penalty + pickupFee + shippingFee);
  const net = revenue - netDeduction;
  const seed: SettlementSeed = hq
    ? { status: "paid" }
    : (SETTLEMENT_SEEDS[round]?.[sellerId] ?? { status: "waiting" });

  return {
    kind,
    sellerId,
    name,
    round,
    statementNo: statementNoOf(round, sellerId),
    rate,
    saleSales,
    rentSales,
    sales,
    coupon,
    revenue,
    fee,
    pg,
    clawback,
    care,
    penalty,
    pickupFee,
    shippingFee,
    point: sum(included, (tx) => tx.order.point),
    netDeduction,
    net,
    payout: Math.max(0, net),
    unpaid: Math.max(0, -net),
    count: included.length,
    status: seed.status,
    objection: seed.objection ?? null,
    resend: seed.resend ?? null,
    paidAt: seed.status === "paid" ? PAYOUT_DATE : null,
    transactions,
  };
};

/**
 * 셀러별 정산 행 — **원장(주문)에 나오는 입점사만**, 처음 나온 순서로(원본 `settleSellerRows` ·
 * 마스터 38곳을 복제하지 않는다). 이번 회차 매출이 0원이고 제외·환수만 있는 셀러도 행이 있다.
 * 주문의 셀러명이 마스터에 없으면 샘플 연결 실패로 멈춘다.
 */
export const sellerSettlementsOf = (
  round: string,
  orders: Order[] = ORDERS,
): SettlementRow[] => {
  const names = [
    ...new Set(
      orders
        .filter((order) => order.sellerKind === "seller")
        .map((order) => order.seller),
    ),
  ];
  return names.map((name) => {
    const seller = SELLERS.find(
      (item) => item.name === name && !item.isHeadquarters,
    );
    if (!seller) throw new Error(`셀러 마스터에 없는 셀러: ${name}`);
    return rowOf(
      "seller",
      seller.id,
      name,
      seller.commission,
      orders.filter(
        (order) => order.sellerKind === "seller" && order.seller === name,
      ),
      round,
    );
  });
};

/** 본사(자체) 명세 — 셀러와 **같은 확정 규칙**(원본 결함: 자체 전 건 합). 지급 대상 아님 */
export const hqSettlementOf = (
  round: string,
  orders: Order[] = ORDERS,
): SettlementRow =>
  rowOf(
    "hq",
    HQ.id,
    "본사",
    0,
    orders.filter((order) => order.sellerKind === "hq"),
    round,
  );

export interface SettlementSummary {
  round: string;
  /** 정산 대상 입점사 수 */
  sellerCount: number;
  sales: number;
  coupon: number;
  revenue: number;
  fee: number;
  pg: number;
  clawback: number;
  care: number;
  penalty: number;
  pickupFee: number;
  shippingFee: number;
  point: number;
  /**
   * 지급 총액 = Σ셀러별 지급액(하한 뒤 합산 — 미회수와 상계하지 않는다).
   * 지급완료 셀러 금액까지 더한다 — 화면 이름 「이번 회차 지급 총액」(판정 Q2 · 계산 그대로)
   */
  payout: number;
  unpaid: number;
}

/** 회차 요약 — 셀러 행만 더한다(본사 제외) */
export const summaryOf = (rows: SettlementRow[]): SettlementSummary => {
  const total = (pick: (row: SettlementRow) => number) =>
    rows.reduce((acc, row) => acc + pick(row), 0);
  return {
    round: rows[0]?.round ?? SETTLE_ROUND,
    sellerCount: rows.length,
    sales: total((row) => row.sales),
    coupon: total((row) => row.coupon),
    revenue: total((row) => row.revenue),
    fee: total((row) => row.fee),
    pg: total((row) => row.pg),
    clawback: total((row) => row.clawback),
    care: total((row) => row.care),
    penalty: total((row) => row.penalty),
    pickupFee: total((row) => row.pickupFee),
    shippingFee: total((row) => row.shippingFee),
    point: total((row) => row.point),
    payout: total((row) => row.payout),
    unpaid: total((row) => row.unpaid),
  };
};

/* =========================================================================
 * 세금계산서 — 셀러 정산 행에서 파생(데이터를 따로 갖지 않는다)
 * ====================================================================== */

export type TaxInvoiceStatus = "pending" | "issued";

export interface TaxInvoiceRow {
  /** `TX-{YYMM}-{셀러 id 숫자 4자리}` — 필터·정렬과 무관하게 고정 */
  no: string;
  sellerId: string;
  supplier: string;
  /** 공급받는자 = 셀러 */
  buyer: string;
  /** 작성일 = 발행일 `TAX_ISSUE_DATE`(매월 10일 · 휴일이면 다음 영업일 — 판정 Q4) */
  date: string;
  /** 공급가액 = 판매 수수료 */
  supply: number;
  /** 세액 = round(공급가액 × 10%) — 원본 `Math.round` */
  vat: number;
  total: number;
  /** 자동 발행 = 발행완료 · 자동 발행 실패 = 미발행(`pending`) — 지급 상태와 무관(판정 Q4) */
  status: TaxInvoiceStatus;
}

/** 수수료 > 0 셀러만, 셀러 정산 행 순서대로 — 본사 · 수수료 0원 셀러는 없다 */
export const taxInvoicesOf = (rows: SettlementRow[]): TaxInvoiceRow[] =>
  rows
    .filter((row) => row.kind === "seller" && row.fee > 0)
    .map((row) => {
      const vat = Math.round(row.fee * VAT_RATE);
      return {
        no: taxInvoiceNoOf(row.round, row.sellerId),
        sellerId: row.sellerId,
        supplier: TAX_SUPPLIER,
        buyer: row.name,
        date: TAX_ISSUE_DATE,
        supply: row.fee,
        vat,
        total: row.fee + vat,
        status: TAX_ISSUE_FAILED.includes(row.sellerId) ? "pending" : "issued",
      };
    });

/* =========================================================================
 * 이번 회차(2026.09) 결과 — 화면이 import 하는 값
 * ====================================================================== */

export const SELLER_SETTLEMENTS = sellerSettlementsOf(SETTLE_ROUND);
export const HQ_SETTLEMENT = hqSettlementOf(SETTLE_ROUND);
export const SETTLEMENT_SUMMARY = summaryOf(SELLER_SETTLEMENTS);
export const TAX_INVOICES = taxInvoicesOf(SELLER_SETTLEMENTS);

/** 명세서 목록 = 본사 1 + 셀러 행(원본 순서) */
export const STATEMENTS: SettlementRow[] = [
  HQ_SETTLEMENT,
  ...SELLER_SETTLEMENTS,
];

/** 셀러 id → 이번 회차 정산 행 (상세 경로 `/settle-seller/{id}`) */
export const findSettlement = (sellerId: string) =>
  SELLER_SETTLEMENTS.find((row) => row.sellerId === sellerId);

/** 명세서번호 → 명세 행 (상세 경로 `/settle-statement/{번호}`) */
export const findStatement = (statementNo: string) =>
  STATEMENTS.find((row) => row.statementNo === statementNo);
