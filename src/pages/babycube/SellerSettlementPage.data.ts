import {
  PAYOUT_DATE,
  SELLER_SETTLEMENTS,
  SETTLE_ROUND,
  SETTLEMENT_STATUS_META,
  SETTLEMENT_SUMMARY,
  roundLabel,
  type SettlementRow,
  type SettlementStatus,
  type SettlementSummary,
} from "./settlement.data";
import { CARE_FEE } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 셀러 정산 (BO-STL-002 · `/settle-seller`) — **도메인 층**
 * 기준 기획: v0.4 `plan-members/proto.html` 4519~4617(`SCREENS.settleSeller` · `settleAmtRows` ·
 * `SETTLE_TIP` · `SETTLE_FOOT`) · 2302~2335(확인 모달 3종) · 4248~4313(상태별 버튼 · 처리 함수).
 *
 * 짝이 되는 뼈대: `SellerSettlementPage.tsx` · 상세 `SellerSettlementDetailPage.*` 가 이 파일의
 * 명세 줄·모달 문구를 **같이** 쓴다(원본도 합산·셀러별 상세·지급 모달이 같은 함수에서 나온다).
 *
 * ## 숫자는 여기서 계산하지 않는다
 * 정산 행·요약은 공통 계산 층 `settlement.data.ts`(`SELLER_SETTLEMENTS` · `SETTLEMENT_SUMMARY`)
 * 그대로다 — 주문 처리단위 + 셀러 마스터 요율 + 과거 지급에서 나온 값이다. 이 파일은 **표기**만 한다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행은 `SettlementRow`(키 `sellerId` — 상세 경로 `/settle-seller/{sellerId}`)
 * - `STATUS_OPTIONS[0].value` 는 `"all"`(필터 해제)
 * - 금액 칸은 문자열로 받는다(`cellMoney`) — 0 일 때 `-` 인 칸과 `0원` 인 칸이 원본에서 갈린다
 * - `statementLinesOf` 가 산출 내역 줄(묶음 `group` · 종류 `kind` · 보조 글자 `hint` · 도움말)을 준다 —
 *   `SettlementCalc.tsx` 는 그리기만 한다. 묶음 순서·이름은 `STATEMENT_GROUPS`
 * - 상태별 업무 버튼은 `gateOf(status)` 가 정한다(없으면 버튼 없음)
 *
 * ## 원본과 다르게 둔 곳 (근거)
 * - **거래액 라벨 「(정가)」 → 「(판매가)」** — 정산 매출 = 셀러 할인 적용 후 판매가 − 셀러 쿠폰(판정 Q1 ·
 *   계산식 그대로). 「입점사」는 「셀러」(판정 Q10). 도움말 `list`·`point` 문구도 같은 이유로 「정가」를 뺐다
 * - 지급 모달 예시 문구의 날짜를 이 회차(2026.09 · 10.12 지급)에 맞췄다(원본 8/12 · 6/18)
 * - **산출 내역 모양**(사용자 승인 2026-11-03 — 원본 줄 나열이 계산 구조를 못 보였다): 매출(… = 정산 매출
 *   소계) · 차감 · 가산 세 묶음 → 지급액 → 미회수 경고 줄 → 참고(포인트). 괄호 설명은 보조 글자 `hint`,
 *   ⓘ 는 환수·보전·미회수 3곳만, 차감은 빨강 대신 기본 글자색 `−`. 미회수 굵은 각주 문단은 없앴다(경고 줄 하나)
 * - 날짜 `2026년 9월`(앞자리 0 없음 — 원본 `2026년 09월`) · 요약과 산출 내역을 한 카드로 ·
 *   안심케어 금액 설정은 맨 아래 「정산 설정」 작은 카드
 *
 * ## ⚠️ 기획 확인 필요 (원본 그대로 둔 모순)
 * - 안심케어 금액 설정값은 어디에서도 읽히지 않는다(원본 `CARE_PRICE`). 초기값은 주문 명세의
 *   가입 요금 `CARE_FEE` 와 맞췄다(원본은 「신설 시 0원」)
 * - 지급 모달의 환수 줄 이름이 「환수액」이라 명세의 「취소·반품 차감」과 다르다(원본 그대로)
 * - 보류 모달 「기록 후 익영업일 지급완료」 와 원본 코드(즉시 지급완료)가 다르다 — 우리는 알림만 띄운다
 * - 수수료 요율 — 정책 문구는 「10%」, 원본 코드·셀러 마스터는 셀러별 요율(명세는 셀러별 요율)
 * ---------------------------------------------------------------------- */

export { SETTLE_ROUND, SETTLEMENT_STATUS_META as STATUS_META };
export type { SettlementRow, SettlementStatus };

/** 목록 행 — 원장에 나오는 입점사, 원본 순서 그대로(정렬 없음) */
export const ROWS: SettlementRow[] = SELLER_SETTLEMENTS;

/**
 * 「정산 회차」 열 — 표 첫 열(디자인 §3 #10 · 개발 `settle-seller/columns.tsx`). 표기는 이 화면의
 * `2026년 9월` 꼴(개발은 `2026년 09월` · 고정 열·정렬과 함께 기획 확인 중 — 질문 13)
 */
export const roundOf = (row: SettlementRow) => roundLabel(row.round);

/* =========================================================================
 * 단위 표기 — 원 · 천 단위 쉼표 · 차감 `−1,000원`(U+2212) · 가산 `+1,000원` · 0 은 부호 없이 `0원`
 * ====================================================================== */

export const num = (value: number) => value.toLocaleString("ko-KR");
export const won = (value: number) => num(value) + "원";
export const minus = (value: number) => (value ? "−" + won(value) : won(0));
export const plus = (value: number) => (value ? "+" + won(value) : won(0));

/** 금액 없는 칸 — 원본 `-` */
export const NO_AMOUNT = "-";

/** `2026-10-10` → `2026.10.10` · `2026-10-02 16:40` → `2026.10.02 16:40` */
export const dotted = (at: string) => at.replace(/-/g, ".");

/**
 * 목록 금액 칸 — 원본 `SCREENS.settleSeller` 셀 그대로.
 * 쿠폰·취소반품·안심케어는 0 이면 `-`, **수수료·PG 는 0 이어도 `0원`**(원본 `- 0원` — 부호 없는 0 으로).
 */
export const cellMoney = {
  sales: (row: SettlementRow) => won(row.sales),
  coupon: (row: SettlementRow) => (row.coupon ? minus(row.coupon) : NO_AMOUNT),
  fee: (row: SettlementRow) => minus(row.fee),
  pg: (row: SettlementRow) => minus(row.pg),
  clawback: (row: SettlementRow) =>
    row.clawback ? minus(row.clawback) : NO_AMOUNT,
  care: (row: SettlementRow) => (row.care ? plus(row.care) : NO_AMOUNT),
  /** 지급액 — 셀러별 0원 하한이 이미 걸려 있어 음수가 나오지 않는다 */
  payout: (row: SettlementRow) => won(row.payout),
};

/* =========================================================================
 * 화면 머리 · 요약 (원본 `summary` 슬롯)
 * ====================================================================== */

/**
 * 요약 + 산출 내역 한 카드 — 머리 `2026년 9월 정산` · 오른쪽 `지급일 2026.10.12`
 * (D-day 는 빼기로 했다 — 사용자 결정 ①). 원본은 「정산 요약」·「정산 명세」 두 카드
 */
export const SUMMARY_TITLE = `${roundLabel(SETTLE_ROUND)} 정산`;
export const SUMMARY_SUB = `지급일 ${dotted(PAYOUT_DATE)}`;

/**
 * 요약 4값 — 원본 순서·단위. 모집단은 **필터와 무관한 전체 셀러**(원본).
 * 「이번 회차 지급 총액」 = 지급완료 셀러 금액도 더한다 — 이름만 바꾸고 계산 그대로(판정 Q2 · 디자인 §1).
 * 남은 지급은 사이드바 할 일 배지·상태 필터로 본다
 */
export const summaryStatsOf = (summary: SettlementSummary) => [
  { label: "셀러 거래액(판매가)", value: num(summary.sales), unit: "원" },
  { label: "본사 수수료 수익", value: num(summary.fee), unit: "원" },
  { label: "정산 대상", value: num(summary.sellerCount), unit: "개사" },
  { label: "이번 회차 지급 총액", value: num(summary.payout), unit: "원" },
];
export const SUMMARY_STATS = summaryStatsOf(SETTLEMENT_SUMMARY);
export { SETTLEMENT_SUMMARY as SUMMARY };

/** 카드 안 산출 내역 소제목 — 원본 `2026.06 정산 명세` · `전 입점사 합산` */
export const TOTAL_STATEMENT_TITLE = "산출 내역";
export const TOTAL_STATEMENT_SUB = "전 입점사 합산";

/** 목록 카드 머리 — 원본 소제목 `정산 대상 입점사 · N개사` 와 `목록 (총 N건)` 을 하나로 */
export const listTitleOf = (count: number) =>
  `정산 대상 입점사 (총 ${count}개사)`;

/* =========================================================================
 * 정산 설정 — 안심케어 금액 (원본 `setCarePrice` — 화면 안 값 + 알림만)
 * ====================================================================== */

/** 페이지 맨 아래 「정산 설정」 작은 카드 한 줄 — 플랫폼 전체 설정이라 정산 흐름 밖에 둔다 */
export const CARE_PRICE_COPY = {
  title: "정산 설정",
  label: "안심케어 가입 금액",
  help: "렌트 주문의 안심케어 가입 금액 · 플랫폼 전체 공통 적용",
  /** 초기값 — 주문 명세의 가입 요금과 같은 값(원본은 0원 — 기획 확인 필요) */
  initial: CARE_FEE,
  /** 원본 `Number(String(v).replace(/[^0-9]/g,''))||0` */
  parse: (text: string) => Number(text.replace(/[^0-9]/g, "")) || 0,
  done: (value: number) => `안심케어 금액을 ${won(value)}으로 설정했습니다.`,
};

/* =========================================================================
 * 검색조건 — 상태(전체 + 6) · 셀러명 (원본 `filter.settleSeller` chip + search)
 * ====================================================================== */

export const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  ...(Object.keys(SETTLEMENT_STATUS_META) as SettlementStatus[]).map((key) => ({
    value: key,
    label: SETTLEMENT_STATUS_META[key].label,
  })),
];

/** 원본 `search.ph` — 검색 필드는 셀러명 하나뿐이다 */
export const SEARCH_PLACEHOLDER = "셀러명 검색";

export interface SettlementFilters {
  status: string;
  keyword: string;
}

export const EMPTY_FILTERS: SettlementFilters = { status: "all", keyword: "" };

export const matchesFilters = (
  row: SettlementRow,
  { status, keyword }: SettlementFilters,
) =>
  (status === "all" || row.status === status) &&
  row.name.toLowerCase().includes(keyword.trim().toLowerCase());

export const NO_FILTER_TEXT = "조건 없음 (전체)";

/** 접힌 검색조건 요약 한 줄 — 다른 목록과 같은 규칙 */
export const filterSummary = ({ status, keyword }: SettlementFilters) => {
  const parts: string[] = [];
  if (status !== "all")
    parts.push(
      `상태 ${SETTLEMENT_STATUS_META[status as SettlementStatus].label}`,
    );
  if (keyword.trim() !== "") parts.push(`셀러명 «${keyword.trim()}»`);
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

/** 빈 상태 — 원본 공용 문구(다른 목록과 같다) */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

/* =========================================================================
 * 산출 내역 줄 — 합산 · 셀러별 상세 · 정산 명세서 상세 · 지급 모달 공용 (원본 `settleAmtRows` ·
 * `SETTLE_TIP`). 그리는 것은 `SettlementCalc.tsx`
 * ====================================================================== */

/**
 * 도움말 — 원본 `SETTLE_TIP` 문구 그대로. 설명이 긴 **환수 · 보전 · 미회수 3곳만** ⓘ 로 단다
 * (나머지 줄은 이름 옆 보조 글자 `hint` 로 충분하다 — 사용자 승인 2026-11-03)
 */
export const SETTLE_TIP = {
  cancel:
    "전월 이전에 확정되어 이미 지급된 건이 취소·반품 완료로 종결되면, 그 금액을 이번 지급액에서 되돌려 받습니다(환수). 환수액은 지난 회차에 셀러가 실제로 받은 금액(정산 매출 − 판매 수수료 − PG 수수료)이며, 판매 수수료는 본사가 환입합니다. 확정된 적 없는 건의 취소·반품은 매출에서 빼기만 하고 차감하지 않습니다.",
  care: "안심케어 가입 건의 복원 가능 파손은 본사 부담이라, 복원비를 셀러에게 보전해 지급액에 더합니다.",
  unpaid:
    "환수액이 이번 회차 확정 매출보다 커서 지급액으로는 다 받아내지 못한 금액입니다. 지급액은 0원이 하한이고, 이 잔액은 차기 회차로 넘기지 않고 셀러에게 별도로 청구합니다.",
} as const;

/** 묶음 — 매출(… = 소계) · 차감 · 가산. 순서가 곧 계산 순서다 */
export type StatementGroup = "sales" | "deduct" | "add";
export const STATEMENT_GROUPS: { key: StatementGroup; label: string }[] = [
  { key: "sales", label: "매출" },
  { key: "deduct", label: "차감" },
  { key: "add", label: "가산" },
];
/** 지급액 아래 참고 줄(정산 영향 없음)의 묶음 이름 */
export const NOTE_GROUP_LABEL = "참고";

/**
 * 줄 — `group` 이 있으면 그 묶음 안 줄(`kind: "subtotal"` 은 굵은 소계).
 * 묶음 밖: `total` 지급액 · `unpaid` 미회수(경고색 — **경고색은 여기만**) · `note` 참고
 */
export interface StatementLine {
  key: string;
  label: string;
  value: string;
  group?: StatementGroup;
  kind?: "subtotal" | "total" | "unpaid" | "note";
  /** 이름 옆 작은 보조 글자 — 원본 괄호 설명 */
  hint?: string;
  /** ⓘ 도움말 */
  tip?: string;
}

/** 명세가 읽는 금액 — 셀러 행(`SettlementRow`)과 회차 요약(`SettlementSummary`) 둘 다 맞는다 */
type StatementAmounts = Pick<
  SettlementSummary,
  | "sales"
  | "coupon"
  | "revenue"
  | "fee"
  | "pg"
  | "clawback"
  | "care"
  | "point"
  | "payout"
  | "unpaid"
>;

/**
 * 산출 내역 줄 — 원본 `settleAmtRows`. 쿠폰·환수·보전·포인트·미회수는 **0 이면 줄이 없다**
 * (묶음에 줄이 없으면 묶음도 없다). 수수료·PG 는 0 이어도 `0원` 으로 보인다.
 * `rate` 를 주면 판매 수수료 보조 글자가 `요율 N%`(셀러별), 없으면 `셀러별 요율 · 본사 수익`(합산).
 * `unpaidBy` — 합산에서 미회수가 **어느 셀러**인지(미회수 줄 보조 글자 앞에 붙는다).
 */
export const statementLinesOf = (
  d: StatementAmounts,
  {
    listLabel = "확정 거래액",
    totalLabel = "지급액",
    rate,
    unpaidBy,
  }: {
    listLabel?: string;
    totalLabel?: string;
    rate?: number;
    unpaidBy?: string;
  } = {},
): StatementLine[] => {
  const lines: (StatementLine | false)[] = [
    {
      key: "list",
      label: listLabel,
      hint: "판매가",
      value: won(d.sales),
      group: "sales",
    },
    d.coupon > 0 && {
      key: "coupon",
      label: "셀러 쿠폰",
      hint: "셀러 부담",
      value: minus(d.coupon),
      group: "sales",
    },
    {
      key: "gmv",
      label: "정산 매출",
      hint: "수수료 부과 기준",
      value: won(d.revenue),
      group: "sales",
      kind: "subtotal",
    },
    {
      key: "fee",
      label: "판매 수수료",
      hint: rate === undefined ? "셀러별 요율 · 본사 수익" : `요율 ${rate}%`,
      value: minus(d.fee),
      group: "deduct",
    },
    {
      key: "pg",
      label: "PG 수수료",
      hint: "요율 미정 · 데모 3%",
      value: minus(d.pg),
      group: "deduct",
    },
    d.clawback > 0 && {
      key: "cancel",
      label: "취소·반품 환수",
      hint: "전월 확정분",
      value: minus(d.clawback),
      group: "deduct",
      tip: SETTLE_TIP.cancel,
    },
    d.care > 0 && {
      key: "care",
      label: "안심케어 보전",
      hint: "본사 복원비",
      value: plus(d.care),
      group: "add",
      tip: SETTLE_TIP.care,
    },
    { key: "total", label: totalLabel, value: won(d.payout), kind: "total" },
    /* 미회수 — 지급액과 별개 금액이라 지급액 **아래** 따로 붙는다(원본 UI-272) */
    d.unpaid > 0 && {
      key: "unpaid",
      label: "미회수",
      hint: unpaidBy ? `${unpaidBy} · 별도 청구` : "별도 청구",
      value: won(d.unpaid),
      kind: "unpaid",
      tip: SETTLE_TIP.unpaid,
    },
    /* 포인트 — 계산에 끼지 않는다. 지급액 아래 참고로만(원본은 계산 중간) */
    d.point > 0 && {
      key: "point",
      label: "포인트 사용분 본사 부담",
      hint: "정산 영향 없음",
      value: won(d.point),
      kind: "note",
    },
  ];
  return lines.filter((line): line is StatementLine => line !== false);
};

/** 합산 미회수가 어느 셀러인지 — 원장 순서 그대로 */
export const UNPAID_SELLERS = SELLER_SETTLEMENTS.filter((row) => row.unpaid > 0)
  .map((row) => row.name)
  .join(", ");

/** 산출 내역 아래 안내 상자 — 원본 `SETTLE_FOOT` 를 두 줄로 */
export const SETTLE_NOTES = [
  "보증금·연체료·배상액은 매출 정산과 분리해 보증금 정산에서 처리합니다.",
  "지급완료 시 수수료 세금계산서가 동시 발행됩니다.",
];

/* =========================================================================
 * 상태별 업무 버튼 · 확인 모달 3종 (원본 `settleActBtn` · `gatePay` · `gateHold` · `gateReissue`)
 * 퍼블 범위: 처리하면 **알림만** — 행의 상태·금액은 바뀌지 않는다.
 * [확인요청]·[확인완료]·[협의 완료] 대행 버튼은 원본이 폐지했다(4263~4276) — 되살리지 말 것.
 * ====================================================================== */

export type GateKind = "pay" | "hold" | "reissue";

/** 확인완료 → [지급완료](미리보기) · 보류 → [지급완료](결론 입력) · 이의제기 → [수정 명세 재발송] */
export const gateOf = (status: SettlementStatus): GateKind | null =>
  status === "agreed"
    ? "pay"
    : status === "held"
      ? "hold"
      : status === "disputed"
        ? "reissue"
        : null;

export const GATE_BUTTON: Record<GateKind, string> = {
  pay: "지급완료",
  hold: "지급완료",
  reissue: "수정 명세 재발송",
};

/**
 * 지급 실행 모달의 명세 — 원본 `gatePay`(정산 매출부터 · 환수 줄 이름 「환수액」 그대로).
 * 같은 산출 내역 부품으로 그린다 — 미회수가 있으면 지급 예정액 아래 경고 줄
 */
export const payLinesOf = (row: SettlementRow): StatementLine[] => {
  const lines: (StatementLine | false)[] = [
    {
      key: "gmv",
      label: "정산 매출",
      value: won(row.revenue),
      group: "sales",
      kind: "subtotal",
    },
    {
      key: "fee",
      label: "판매 수수료",
      hint: `요율 ${row.rate}%`,
      value: minus(row.fee),
      group: "deduct",
    },
    { key: "pg", label: "PG 수수료", value: minus(row.pg), group: "deduct" },
    row.clawback > 0 && {
      key: "cancel",
      label: "환수액",
      value: minus(row.clawback),
      group: "deduct",
    },
    row.care > 0 && {
      key: "care",
      label: "안심케어 보전",
      value: plus(row.care),
      group: "add",
    },
    {
      key: "total",
      label: "지급 예정액",
      value: won(row.payout),
      kind: "total",
    },
    row.unpaid > 0 && {
      key: "unpaid",
      label: "미회수",
      hint: "별도 청구",
      value: won(row.unpaid),
      kind: "unpaid",
      tip: SETTLE_TIP.unpaid,
    },
  ];
  return lines.filter((line): line is StatementLine => line !== false);
};

export const GATE_COPY = {
  pay: {
    title: (name: string) => `정산 지급 실행 · ${name}`,
    note: "지급완료 처리 시 세금계산서가 동시 발행됩니다. 처리 후 되돌릴 수 없습니다.",
    confirm: "지급완료 처리",
    done: (name: string) => `${name} 지급 완료 → 세금계산서 발행`,
  },
  hold: {
    title: (name: string) => `보류 종결 — 협의 결론 기록 · ${name}`,
    label: "외부 협의 결론 요지",
    placeholder:
      "외부 협의 결론 요지를 입력해주세요 (필수 — 예: 10/14 유선 협의, 수수료 재계산 반영 합의)",
    note: "보류 회차는 외부 협의 결론 요지를 기록해야 지급 처리할 수 있습니다. 기록 후 익영업일 지급완료 처리됩니다(수정 합의 시 명세 수정 재발송 후 지급).",
    empty: "외부 협의 결론 요지를 입력해주세요.",
    confirm: "지급 처리",
    /* 원본 `gateHoldGo` → `settleSetStat(…,'지급완료')` 의 알림 */
    done: (name: string) => `${name} 지급 완료 → 세금계산서 발행`,
  },
  reissue: {
    title: (name: string) => `수정 명세 재발송 · ${name}`,
    objection: "셀러 이의 사유",
    label: "검토 결과·수정 내용",
    placeholder:
      "검토 결과와 수정 내용을 입력해주세요 (필수 — 예: 9/14 반품 1건 환수액 재계산, 지급액 32,000원 상향)",
    note: "재발송하면 명세서가 확인요청으로 돌아가 셀러가 다시 확인합니다(3일 무응답 시 자동 확인완료). 이의제기는 회차당 1회이므로 셀러는 같은 회차에 다시 제기할 수 없습니다 — 수정 내용을 구체적으로 적어주세요.",
    empty: "검토 결과·수정 내용을 입력해주세요.",
    confirm: "수정 명세 재발송",
    done: () =>
      "수정 명세를 재발송했습니다 — 셀러 재확인을 기다립니다(3일 무응답 시 자동 확인완료).",
  },
};
