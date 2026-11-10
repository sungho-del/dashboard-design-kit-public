import type { CalcBlock, CalcLine } from "../babycube/CalcBreakdown";
import { autoConfirmDateOf, flowStatOf, unitHash } from "./orderUnit.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";
import { STORE } from "./seed/store.data";

/* =========================================================================
 * 정산 도메인 — 매출 정산 · 정산 내역/명세서 · 세금계산서 · 보증금 내역(+ 상세)이 같이 쓴다
 *
 * ## 원본 함수를 그대로 옮겼다 (기획 v0.4 `apps/admin-seller/index.html`)
 * | 여기                         | 원본                                  | 줄        |
 * | ---------------------------- | ------------------------------------- | --------- |
 * | `myUnits`                    | `myUnits`                             | 4297      |
 * | `settleVoided`               | `settleVoided`                        | 1616      |
 * | `confirmDateOf`              | `confirmDate`                         | 1619      |
 * | `settleInMonth`·`settleClawback` | 같은 이름                         | 1629·1632 |
 * | `settleCouponOf`·`settlePointOf` | `settleCoupon`·`settlePoint`      | 4291      |
 * | `clawbackOf`                 | `clawbackAmt`                         | 4302      |
 * | `settleSummary`              | `settleMyData`                        | 4305      |
 * | `STATEMENTS`                 | `myStatements`                        | 4331      |
 * | `txNoteOf`·`sortTx`·`txFootOf` | `settleTxNote`·`settleTxSort`·`settleTxFoot` | 4398~4416 |
 * | `TAX_INVOICES`               | `SCREENS.settleTax` 행 정규화          | 4463      |
 * | `depBackOf`·`DEP_LABEL`      | `depBack`·`DEP_LABEL`                 | 4250~4255 |
 *
 * `settle.data.test.ts` 가 **원본을 브라우저로 열어 뽑은 값**(`settle.golden.ts` — 거래 156건 · 명세 합계 ·
 * 보증금 94건)과 전부 맞는지 본다. 식을 하나라도 바꾸면 거기서 깨진다.
 *
 * ## 원본 그대로 둔 이상한 점 (기획 확인 — `docs/seller/plan-changes.md` ⑥)
 * - 확정 거래액 = `u.amt`(라벨 「판매가」 — 개발 §3-2-1 · 원본 「정가」) — 주문 명세 결제금액(할인·쿠폰 뒤)과 기준이 다르다(원본 주석도 인정)
 * - 셀러 쿠폰·포인트는 주문 명세와 따로 해시로 정한다 — 같은 건의 명세 쿠폰과 다를 수 있다
 * - 지난 회차(2026.05·04) 명세는 고정값 · 세금계산서 공급가액 = 차감 × 0.72(근거 없음)
 * ====================================================================== */

/** 정산 회차 — 명세 제목과 단일 출처 */
export const SETTLE_MONTH = "2026.06";
/** 표시용 「2026년 06월」 */
export const SETTLE_MONTH_KO = `${SETTLE_MONTH.replace(".", "년 ")}월`;
/** 이번 회차 지급일 */
export const SETTLE_PAYDAY = "2026.07.10";
/** 내 계약 수수료율(%) — 원본 `STORE_FEE_RATE` */
export const STORE_FEE_RATE = 10;
/** PG 수수료율 — 원본 「요율 미정 · 데모 3%」 */
const PG_RATE = 0.03;

/** 내 스토어 거래 모집단 — 명세 집계와 거래 내역 표가 **같은 모집단**(원본 UI-263) */
export const myUnits = () =>
  UNITS.filter((u) => u.owner === "입점사" && u.seller === STORE.name);

/** 클레임 불성립(거래 유지) */
const RMA_FAILED = /거부|반려|거절|재반송/;

/** 매출 무효 — 취소·반품이 걸렸고 거부·반려로 끝나지 않은 건 */
export const settleVoided = (u: OrderUnit) =>
  !!(
    u.req &&
    (u.req.type === "취소" || u.req.type === "반품") &&
    !RMA_FAILED.test(u.req.stat || "")
  );

/** 매출 확정일(YYYY.MM.DD · 미확정이면 빈 문자) — 판매=구매확정 · 렌트=반납완료(대여 종료일) */
export function confirmDateOf(u: OrderUnit) {
  if (u.type === "판매") {
    if (u.stat === "구매확정") return String(u.confirmedAt || "").slice(0, 10);
    if (u.req && /거부|반려/.test(u.req.stat || ""))
      return String(u.confirmedAt || "").slice(0, 10);
    return autoConfirmDateOf(u);
  }
  if (u.stat !== "반납완료") return "";
  const p = String(u.period || "").split("~");
  return p.length > 1 ? p[1].trim().slice(0, 10) : "";
}

export const settleInMonth = (u: OrderUnit) =>
  confirmDateOf(u).slice(0, 7) === SETTLE_MONTH;

/** 환수 — 전월 이전에 확정(지급)된 건이 취소·반품 「완료」로 끝난 경우만 */
export function settleClawback(u: OrderUnit) {
  const d = confirmDateOf(u);
  return !!(
    u.req &&
    (u.req.stat === "취소 완료" || u.req.stat === "반품 완료") &&
    d &&
    d.slice(0, 7) < SETTLE_MONTH
  );
}

/** 셀러 발행 쿠폰 10%(셀러 부담) */
export const settleCouponOf = (u: OrderUnit) =>
  unitHash(u) % 3 === 0 ? Math.round(((u.amt || 0) * 0.1) / 100) * 100 : 0;
/** 포인트 사용 5%(본사 부담 · 정산 영향 없음) */
export const settlePointOf = (u: OrderUnit) =>
  unitHash(u) % 4 === 0 ? Math.round(((u.amt || 0) * 0.05) / 100) * 100 : 0;

/** 환수액 = 지난 회차에 실제로 받은 금액(정산 매출 − 판매 수수료 − PG 수수료) */
export function clawbackOf(u: OrderUnit) {
  const gmv = Math.max(0, (u.amt || 0) - settleCouponOf(u));
  return (
    gmv - Math.round((gmv * STORE_FEE_RATE) / 100) - Math.round(gmv * PG_RATE)
  );
}

const sum = (units: OrderUnit[], of: (u: OrderUnit) => number) =>
  units.reduce((acc, u) => acc + of(u), 0);

export interface SettleSummary {
  /** 이번 회차 반영 건 */
  units: OrderUnit[];
  sale: number;
  rent: number;
  /** 확정 거래액(판매가) */
  list: number;
  coupon: number;
  point: number;
  /** 정산 매출(수수료 부과 기준) */
  gmv: number;
  fee: number;
  pg: number;
  cancel: number;
  care: number;
  /** 셀러 귀속 — 위약금 · 픽업 요금 · 배송비(가산 · 수수료 비대상). 예시 값 없음(0 — 퍼블이 정함) */
  penalty: number;
  pickup: number;
  shipping: number;
  payout: number;
  unpaid: number;
}

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

/* ---------- 금액 표기 — 부호 `−N원`(U+2212 · 0 은 부호 없이) · 본사 정산과 같다 ---------- */

export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
export const minus = (n: number) => (n > 0 ? `−${won(n)}` : won(0));
export const plus = (n: number) => (n > 0 ? `+${won(n)}` : won(0));

/* ---------- 정산 명세 — 원본 `settleAmtRows`(4380) ---------- */

/** 항목 도움말 — 원본 `SETTLE_TIP` 문구 그대로 */
export const SETTLE_TIP = {
  list: "전월에 구매확정·반납완료된 거래의 합계입니다.",
  coupon:
    "셀러가 발행한 할인이라 셀러 부담입니다. 확정 거래액에서 빼서 정산 매출을 만듭니다.",
  gmv: "판매·PG 수수료를 매기는 기준 금액입니다. 확정 거래액에서 셀러 쿠폰을 뺀 값입니다.",
  fee: "셀러별 계약 요율로 정산 매출에 매기는 본사 수익입니다.",
  pg: "결제대행사에 내는 수수료입니다.",
  cancel:
    "전월 이전에 확정되어 이미 지급된 건이 취소·반품 완료로 종결되면, 그 금액을 이번 지급액에서 되돌려 받습니다(환수). 환수액은 지난 회차에 셀러가 실제로 받은 금액(정산 매출 − 판매 수수료 − PG 수수료)이며, 판매 수수료는 본사가 환입합니다. 확정된 적 없는 건의 취소·반품은 매출에서 빼기만 하고 차감하지 않습니다.",
  care: "안심케어 가입 건의 복원 가능 파손은 본사 부담이라, 복원비를 셀러에게 보전해 지급액에 더합니다.",
  /* 셀러 귀속 3줄 — 위약금·픽업 요금 = 개발 `SETTLE_TIP` 그대로 · 배송비 = 부록 A B5 바꿈(입점사 매출 정산도 같이) */
  penalty:
    "렌트·연장 취소 위약금은 회수·재소독 비용 주체인 셀러에게 귀속됩니다(수수료 비대상).",
  pickup: "자체 수령 픽업·반납 요금은 셀러 수입입니다(수수료 비대상).",
  shipping:
    "고객이 부담한 출고비·반품비·출고 후 취소 배송비는 실비로 셀러에게 귀속됩니다(수수료 비대상).",
  point:
    "포인트 사용분은 본사가 부담합니다. 셀러는 판매가 기준으로 정산받으므로 지급액에는 영향이 없습니다.",
  unpaid:
    "환수액이 이번 회차 확정 매출보다 커서 지급액으로는 다 받아내지 못한 금액입니다. 지급액은 0원이 하한이고, 이 잔액은 차기 회차로 넘기지 않고 본사가 별도로 청구합니다.",
} as const;

/**
 * 정산 명세 묶음 — 원본 줄 순서·조건 그대로(0원 항목은 줄을 빼고, 미회수는 총액 아래).
 * 묶음 이름(매출·차감·결과·참고)은 본사 정산 명세와 같은 꼴(`CalcBreakdown`).
 */
export function settleBlocksOf(
  d: SettleSummary,
  totalLabel = "지급 예정액",
): CalcBlock[] {
  const sales: CalcLine[] = [
    {
      key: "list",
      label: "확정 거래액",
      hint: "판매가",
      value: won(d.list),
      tip: SETTLE_TIP.list,
    },
  ];
  if (d.coupon > 0)
    sales.push({
      key: "coupon",
      label: "셀러 쿠폰",
      hint: "셀러 부담",
      value: minus(d.coupon),
      tip: SETTLE_TIP.coupon,
    });
  sales.push({
    key: "gmv",
    label: "정산 매출",
    hint: "수수료 부과 기준",
    value: won(d.gmv),
    kind: "subtotal",
    tip: SETTLE_TIP.gmv,
  });
  const deduct: CalcLine[] = [
    {
      key: "fee",
      label: "판매 수수료",
      hint: `요율 ${STORE_FEE_RATE}% · 본사 수익`,
      value: minus(d.fee),
      tip: SETTLE_TIP.fee,
    },
    {
      key: "pg",
      label: "PG 수수료",
      value: minus(d.pg),
      tip: SETTLE_TIP.pg,
    },
  ];
  if (d.cancel > 0)
    deduct.push({
      key: "cancel",
      label: "취소·반품 차감",
      hint: "전월 확정분 환수",
      value: minus(d.cancel),
      tip: SETTLE_TIP.cancel,
    });
  const add: CalcLine[] =
    d.care > 0
      ? [
          {
            key: "care",
            label: "안심케어 보전",
            hint: "손상에 대한 본사 복원비",
            value: plus(d.care),
            tip: SETTLE_TIP.care,
          },
        ]
      : [];
  /* 셀러 귀속 3줄 — 개발 순서(위약금 · 픽업 요금 · 배송비) · 0원 초과일 때만(본사 판정 Q3 · Q20-3·4) */
  for (const [key, label, amount] of [
    ["penalty", "위약금", d.penalty],
    ["pickup", "픽업 요금", d.pickup],
    ["shipping", "배송비", d.shipping],
  ] as const)
    if (amount > 0)
      add.push({
        key,
        label,
        hint: "셀러 귀속",
        value: plus(amount),
        tip: SETTLE_TIP[key],
      });
  const result: CalcLine[] = [
    { key: "total", label: totalLabel, value: won(d.payout), kind: "total" },
  ];
  if (d.unpaid > 0)
    result.push({
      key: "unpaid",
      label: "미회수 잔액",
      hint: "별도 청구",
      value: won(d.unpaid),
      kind: "warning",
      tip: SETTLE_TIP.unpaid,
    });
  const note: CalcLine[] =
    d.point > 0
      ? [
          {
            key: "point",
            label: "포인트 사용분 본사 부담",
            hint: "참고 · 정산 영향 없음",
            value: won(d.point),
            kind: "note",
            tip: SETTLE_TIP.point,
          },
        ]
      : [];
  return [
    { key: "sales", label: "매출", lines: sales },
    { key: "deduct", label: "차감", lines: deduct },
    { key: "add", label: "가산", lines: add },
    { key: "result", lines: result, emphasis: true },
    { key: "note", label: "참고", lines: note },
  ];
}

/** 명세 박스 하단 각주 — 원본 `SETTLE_FOOT` */
export const SETTLE_FOOT =
  "보증금·연체료·배상액은 매출 정산과 분리해 보증금 정산에서 처리합니다. 세금계산서는 매월 10일에 발행됩니다(연동 준비 중).";

/** 미회수 각주 — 원본 `settleUnpaidNote`(미회수가 있을 때만) */
export const unpaidNoteOf = (unpaid: number) =>
  unpaid > 0
    ? `환수액이 이번 회차 확정 매출을 넘어 ${won(unpaid)}이 회수되지 않았습니다. 지급액은 0원이 하한이며, 남은 잔액은 차기 회차로 넘기지 않고 본사가 별도 청구합니다(1회 지급 완결).`
    : "";

/* ---------- 거래 내역 — 원본 `settleTxNote`·`settleTxSort`·`settleTxFoot` ---------- */

/** 클레임이 걸렸는데도 매출이 유지되는 사유 */
const keptReasonOf = (u: OrderUnit) => {
  const type = u.req?.type ?? "";
  return RMA_FAILED.test(u.req?.stat || "")
    ? `${type} 불성립 · 거래 유지`
    : `${type} 진행 · 거래 유지`;
};

/** 「정산 반영」 칸 — `main` 은 본문색, `sub` 는 보조색(원본 `muted`) */
export interface TxNote {
  main?: string;
  sub?: string;
}

export function txNoteOf(u: OrderUnit): TxNote {
  if (settleVoided(u))
    return {
      sub: `제외 · ${u.req?.type ?? ""}${settleClawback(u) ? " 환수" : ""}`,
    };
  if (settleInMonth(u))
    return u.req
      ? { main: "반영", sub: `· ${keptReasonOf(u)}` }
      : { main: "반영" };
  const d = confirmDateOf(u);
  return { sub: d ? `제외 · ${d.slice(0, 7)} 확정` : "제외 · 미확정" };
}

export const txNoteText = (n: TxNote) =>
  [n.main, n.sub].filter(Boolean).join(" ");

/** 이번 회차 근거가 위로 — 반영 → 환수 차감 → 그 밖 제외, 같은 군은 주문번호 내림차순 */
export function sortTx(units: OrderUnit[]) {
  const rank = (u: OrderUnit) =>
    settleVoided(u) ? (settleClawback(u) ? 1 : 2) : settleInMonth(u) ? 0 : 2;
  return units
    .slice()
    .sort(
      (a, b) => rank(a) - rank(b) || String(b.no).localeCompare(String(a.no)),
    );
}

/** 이번 회차 거래 내역(정렬 끝) — 매출 정산 · 명세서 상세가 같이 쓴다 */
export const SETTLE_TX = sortTx(myUnits());

export function txFootOf(units: OrderUnit[]) {
  const inc = units.filter((u) => !settleVoided(u) && settleInMonth(u));
  return {
    count: inc.length,
    amount: sum(inc, (u) => u.amt || 0),
    excluded: units.length - inc.length,
  };
}

/** 각주 규칙 3줄 — 원본 `settleTxFoot` 목록(굵은 낱말 `**`) */
export const TX_RULES = [
  `**${SETTLE_MONTH_KO} 확정분**만 이번 회차 매출로 반영 — 판매=구매확정(배송 완료 7일 경과 자동 확정 포함) / 렌트=반납완료`,
  "취소·반품 건은 매출에서 제외 — 그중 **전월 이전에 확정(지급)된 건이 완료로 종결된 경우만** 차감(환수), 확정 이력 없는 건은 제외만",
  "**거부·반려로 끝난 건**은 거래가 유지되어 매출에 반영",
];

/** 거래 상태 칸 — 원본 `statusBadge(flowStat(u))` */
export const txStatusOf = flowStatOf;

/** 주문번호 목적지 — 원본 `settleTxRow` idLink(렌트 → 렌트 발주 상세 · 판매 → 발주 상세) */
export const txPathOf = (u: OrderUnit) =>
  u.type === "렌트" ? `/rent-list/${u.id}` : `/sale-proc/${u.id}`;

/* ---------- 명세서 — 원본 `myStatements`(이번 달 실계산 · 지난달 고정값) ---------- */

export type StatementStatus =
  "지급대기" | "확인요청" | "확인완료" | "지급완료" | "이의제기" | "보류";

export interface Statement {
  no: string;
  month: string;
  gmv: number;
  /** 차감(수수료·PG·환수) */
  ded: number;
  /** 가산(보전·셀러 귀속) — 안심케어 보전 + 셀러 귀속 3종. 0 이면 목록에 「-」(기획 답 2026-11-06 §2 #7) */
  add: number;
  payout: number;
  payday: string;
  stat: StatementStatus;
  /** 이번 회차 — 명세·거래 내역을 실제로 계산한다 */
  live: boolean;
  unpaid: number;
}

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

/** 지난 회차 명세 — 원본은 합계 3줄만 */
export const pastStatementBlocks = (s: Statement): CalcBlock[] => [
  {
    key: "past",
    lines: [
      { key: "gmv", label: "매출 합계", value: won(s.gmv) },
      {
        key: "ded",
        label: "차감 합계",
        hint: "수수료·PG",
        value: minus(s.ded),
      },
    ],
  },
  {
    key: "result",
    emphasis: true,
    lines: [
      { key: "total", label: "지급액", value: won(s.payout), kind: "total" },
    ],
  },
];

/** 지급 계좌 — 원본 고정 문구 */
export const PAYOUT_ACCOUNT = `우리은행 1002-***-****** (${STORE.name})`;

/** 확인요청 안내 — 원본 `sellerStmtPage` 지급 정보 하단(굵은 낱말 `**`) */
export const STMT_REQUEST_NOTE =
  "본사가 정산 명세를 **확인요청**한 건입니다. 내용에 이상이 없으면 하단 **[확인]** 버튼으로 확정해 주세요. **이상이 있으면 [이의제기]**로 사유를 접수하시면 본사 검토 후 수정 명세가 재발송됩니다(확인·이의제기 기간 **3일** · 회차당 1회).";

/** 정산 정책 — 원본 문면(굵은 낱말 `**`) */
export const SETTLE_POLICY =
  "**매출 확정 기준** — 판매는 **구매확정**, 렌트는 **반납완료** 시 매출로 확정되어 정산 대상이 됩니다(확정 전 건은 정산 제외). 지급액 = 확정 매출 − 판매 수수료(셀러별 요율) − PG 수수료 − 취소·반품 차감 **+ 안심케어 보전**이며, **수수료는 본사 수익**으로 귀속됩니다. 세금계산서는 매월 10일에 발행됩니다(연동 준비 중). **보증금·연체료·배상은 보증금 내역**에서 분리 관리됩니다. **지급 전 발견 오류는 본사가 직권 정정**합니다.";

export const PAST_TX_NOTE =
  "지난달 거래 내역은 명세서 다운로드로 확인할 수 있습니다.";

/** 확인·이의제기 창 — 원본 `gateStmt`·`gateObject`(2839~2856) 문구 */
export const STMT_GATE = {
  confirmTitle: "정산 명세 확인",
  confirmBody:
    "이상없음으로 확인하면 **확인완료**로 확정되어 본사에 전달됩니다.",
  confirmWarn:
    "확인 후에는 이 회차에 이의를 제기할 수 없습니다 — 이상이 있으면 [취소] 후 [이의제기]로 사유를 접수해주세요.",
  confirmButton: "이상없음 확인",
  confirmDone: "이상없음 확인 완료. 본사에 전달되었습니다.",
  objectTitle: "정산 이의제기",
  objectPlaceholder:
    "이의제기 사유를 입력하세요 (예: 취소·반품 차감 금액 상이, 수수료 요율 상이, 누락 거래 있음)",
  objectHelp:
    "입력한 사유는 본사 정산 담당자에게 전달되며, 본사 검토 후 수정 명세가 재발송되면 다시 확인해 주세요.",
  objectWarn: "이의제기는 정산 회차당 1회만 가능합니다.",
  objectButton: "이의제기 접수",
  objectEmpty: "이의제기 사유를 입력해주세요.",
  objectDone:
    "이의제기가 접수되었습니다. 본사 검토 후 수정 명세가 재발송됩니다.",
} as const;

/* ---------- 세금계산서 — 명세서 1건 = 계산서 1건(수수료분) ---------- */

export interface TaxInvoice {
  no: string;
  month: string;
  supplier: string;
  receiver: string;
  date: string;
  supply: number;
  vat: number;
  /** 본사 발행 상태 — 셀러 상태는 정산 지급 상태가 아니라 이것을 따른다(기획 답 2026-11-06 §2 #39) */
  issue: HqTaxIssue;
  stat: "수취완료" | "발행예정";
}

export type HqTaxIssue = "미발행" | "발행완료";

/** 본사 발행 상태(예시 값 — 퍼블이 정함 · 실제는 본사 세금계산서 발행 데이터). 정산월 → 상태 */
const HQ_TAX_ISSUE: Record<string, HqTaxIssue> = {
  "2026.06": "미발행",
  "2026.05": "발행완료",
  "2026.04": "발행완료",
};

/** 본사 미발행 → 「발행예정」 · 발행완료 → 「수취완료」 */
export const taxStatOf = (issue: HqTaxIssue): TaxInvoice["stat"] =>
  issue === "발행완료" ? "수취완료" : "발행예정";

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

/* ---------- 보증금 — 원본 `depBack`·`DEP_LABEL`·`SCREENS.rentDeposit` ---------- */

/** 반환 예정액 — 차감 상한이 보증금이라 음수 없음(연체료 자동 산정 폐지 → 0) */
export const depBackOf = (u: OrderUnit) =>
  Math.max(0, (u.dep || 0) - (u.deduct || 0));
/** 차감(연체료+손상 통합) */
export const depCutOf = (u: OrderUnit) => (u.dep || 0) - depBackOf(u);
export const depStatOf = (u: OrderUnit) => u.depStat || "점유중";

/** 셀 라벨 — 종결 3종은 「환급완료(…)」 */
export const DEP_LABEL: Record<string, string> = {
  전액환급: "환급완료(전액환급)",
  일부환급: "환급완료(일부환급)",
  전액차감: "환급완료(전액차감)",
};
export const depLabelOf = (u: OrderUnit) =>
  DEP_LABEL[depStatOf(u)] ?? depStatOf(u);

export const DEP_STATUSES = [
  "점유중",
  "환급대기",
  "전액환급",
  "일부환급",
  "전액차감",
];

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
