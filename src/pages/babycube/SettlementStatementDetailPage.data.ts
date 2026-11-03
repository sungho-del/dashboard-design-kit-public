import {
  PAYOUT_DATE,
  findStatement,
  roundLabel,
  type SettleTx,
  type SettlementRow,
} from "./settlement.data";
import { SETTLE_TIP } from "./SellerSettlementPage.data";
import { LIST_PATH, won } from "./SettlementStatementPage.data";

/* -------------------------------------------------------------------------
 * 정산 명세서 상세 (BO-STL-008) — **도메인 층** · 조회 전용
 * 기준 기획: v0.4 `plan-members/proto.html` 5472~5490 (`hqStmtPage`) · 4527~4580(명세 행·거래 내역) ·
 * 5462~5471(지급액 표기·미회수 각주) · 4734~4742(`nvEditPage` 하단 바)
 *
 * 짝이 되는 뼈대: `SettlementStatementDetailPage.tsx`
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 대상은 경로 마지막 조각(명세서번호)으로 `findStatementByNo` 가 찾는다. 없으면 「찾을 수 없음」
 * - 금액은 공통 정산 계산(`settlement.data.ts`) 값 그대로 — 여기는 **줄 이름·부호·표기**만 정한다
 * - `calcLinesOf(row)` 의 `tone`: base(기준) · sub(딸린 가감 — 들여씀) · strong(정산 매출) · total(지급액)
 * - 안내 문구는 `Rich` 조각 배열 — 문자열 · `{ bold }` · `{ link }`(셀러 정산 메뉴로)
 *
 * ## 원본과 다르게 둔 곳
 * - 머리: 원본은 제목·배지·요약을 넘기고도 그리지 않는다(결함) — 형제 상세처럼 그리고 명세서번호를 더했다
 * - 명세 첫 줄 「확정 거래액 (할인 후)」 — 정산 기준을 할인 후로 바꾼 사용자 결정 ② 때문(원본 「정가」).
 *   도움말·포인트 도움말의 「정가 기준」 문구도 같은 이유로 고쳤다
 * - 본사 명세: 지급 정보 끝에 「지급 대상이 아니다」 안내 한 줄 추가(GPT 계약 — 원본은 지급 계좌 칸에만 적는다)
 * - 금액 부호 `- N원` · `+ N원`(형제 표기 · 원본 `-N원`)
 *
 * ## ⚠️ 기획 확인 필요 (원본 그대로 둔 모순)
 * - 시연용 상태: 지급일(10.10)이 지났는데 지급대기·확인완료 명세가 있다(사용자 결정 ①)
 * - 본사 명세의 지급액 = 매출(원본 표기) — 실제 외부 지급은 없다
 * - 정책 문단의 「수수료 10%」(B-2)와 셀러별 요율 · 「정가」 기준과 할인 후 기준
 * ---------------------------------------------------------------------- */

export const DETAIL_TITLE = "정산 명세서 상세";
export const SELLER_SETTLE_PATH = "/settle-seller";
export const sellerSettlePathOf = (sellerId: string) =>
  `${SELLER_SETTLE_PATH}/${sellerId}`;
export { LIST_PATH };

export const findStatementByNo = (statementNo: string) =>
  findStatement(decodeURIComponent(statementNo));

/** `2026-10-10` → `2026.10.10` */
const dot = (date: string) => date.replace(/-/g, ".");

export const PAYOUT_DATE_TEXT = dot(PAYOUT_DATE);

/** 머리 설명 — 원본 `title` + `sub` 를 한 줄로, 명세서번호를 앞에 */
export const headlineOf = (row: SettlementRow) =>
  `${row.statementNo} · ${row.name} · ${row.round} 명세서 · 매출 ${won(row.revenue)} · 지급액 ${won(row.payout)} · 지급일 ${PAYOUT_DATE_TEXT}`;

export type Rich = (string | { bold: string } | { link: string })[];

const SELLER_LINK = { link: "셀러 정산" };

/* =========================================================================
 * 지급 정보
 * ====================================================================== */

export interface PayLine {
  label: string;
  value: string;
}

export const payLinesOf = (row: SettlementRow): PayLine[] => {
  const hq = row.kind === "hq";
  return [
    { label: "정산 대상", value: hq ? "본사 (자체)" : row.name },
    { label: "정산월", value: row.round },
    { label: "지급일", value: `${PAYOUT_DATE_TEXT} (익월 10일)` },
    {
      label: "지급 계좌",
      value: hq
        ? "본사 (자체 매출 · 지급 대상 아님)"
        : `국민은행 45**-**-****** (${row.name})`,
    },
    { label: "정산 반영 거래 건수", value: `${row.count}건` },
  ];
};

/** 지급 정보 아래 안내 — 상태별(확인요청·이의제기) + 셀러면 조회 전용 / 본사면 지급 대상 아님 */
export const payNotesOf = (row: SettlementRow): Rich[] => {
  const notes: Rich[] = [];
  if (row.status === "requested") {
    notes.push([
      "셀러에게 ",
      { bold: "확인요청" },
      "을 발송해 확인·이의제기 기간(3일)을 기다리는 상태입니다. 무응답 시 자동 ",
      { bold: "확인완료" },
      " 처리되며, 확인완료 후 ",
      SELLER_LINK,
      " 메뉴에서 ",
      { bold: "지급완료" },
      "로 지급을 처리합니다.",
    ]);
  }
  if (row.status === "disputed") {
    notes.push([
      "셀러가 ",
      { bold: "이의를 제기" },
      "한 회차입니다. 명세를 검토해 ",
      SELLER_LINK,
      " 메뉴에서 ",
      { bold: "[수정 명세 재발송]" },
      "으로 되돌리면 셀러가 다시 확인합니다 — 확인완료는 셀러가 하거나 3일 무응답으로 자동 처리됩니다.",
    ]);
  }
  notes.push(
    row.kind === "hq"
      ? [
          "본사 직영 매출의 명세입니다. ",
          { bold: "외부로 지급하는 금액이 아니며" },
          ", 지급액은 확정 매출 합계를 그대로 표기합니다. 세금계산서도 발행하지 않습니다.",
        ]
      : [
          "이 화면은 ",
          { bold: "조회 전용" },
          "입니다. 상태 변경·확인요청·지급 처리는 ",
          SELLER_LINK,
          " 메뉴에서 수행합니다.",
        ],
  );
  return notes;
};

/* =========================================================================
 * 정산 명세 — 원본 `settleAmtRows` (셀러 정산 상세와 **문면 동일**이어야 한다)
 * ====================================================================== */

export type CalcTone = "base" | "sub" | "strong" | "total";

export interface CalcLine {
  label: string;
  value: string;
  tone: CalcTone;
  /** 빼는 금액 — 경고색 */
  minus?: boolean;
  /** 참고 값 — 흐린 글자 */
  info?: boolean;
  /** 항목 옆 도움말(원본 `SETTLE_TIP`) */
  tip?: string;
}

/* 도움말은 셀러 정산과 **같은 문면** — 원본도 두 상세가 `SETTLE_TIP` 하나를 쓴다 */
export { SETTLE_TIP };

const minus = (value: number) => `- ${won(value)}`;

export const calcLinesOf = (row: SettlementRow): CalcLine[] => {
  if (row.kind === "hq") {
    return [
      { label: "판매 매출", value: won(row.saleSales), tone: "base" },
      { label: "렌트 매출", value: won(row.rentSales), tone: "base" },
      { label: "매출 합계", value: won(row.sales), tone: "base" },
      { label: "차감", value: "0원 (직영 — 수수료 없음)", tone: "base" },
      { label: "지급액", value: won(row.payout), tone: "total" },
    ];
  }
  const lines: (CalcLine | false)[] = [
    {
      label: "확정 거래액 (할인 후)",
      value: won(row.sales),
      tone: "base",
      tip: SETTLE_TIP.list,
    },
    row.coupon > 0 && {
      label: "셀러 쿠폰 (셀러 부담)",
      value: minus(row.coupon),
      tone: "sub",
      minus: true,
      tip: SETTLE_TIP.coupon,
    },
    {
      label: "정산 매출 (수수료 부과 기준)",
      value: won(row.revenue),
      tone: "strong",
      tip: SETTLE_TIP.gmv,
    },
    {
      label: `판매 수수료 (요율 ${row.rate}% · 본사 수익)`,
      value: minus(row.fee),
      tone: "sub",
      minus: true,
      tip: SETTLE_TIP.fee,
    },
    {
      label: "PG 수수료 (요율 미정 · 데모 3%)",
      value: minus(row.pg),
      tone: "sub",
      minus: true,
      tip: SETTLE_TIP.pg,
    },
    row.clawback > 0 && {
      label: "취소·반품 차감 (전월 확정분 환수)",
      value: minus(row.clawback),
      tone: "sub",
      minus: true,
      tip: SETTLE_TIP.cancel,
    },
    row.care > 0 && {
      label: "안심케어 보전 (손상에 대한 본사 복원비)",
      value: `+ ${won(row.care)}`,
      tone: "sub",
      tip: SETTLE_TIP.care,
    },
    row.point > 0 && {
      label: "포인트 사용분 본사 부담 (참고 · 정산 영향 없음)",
      value: won(row.point),
      tone: "sub",
      info: true,
      tip: SETTLE_TIP.point,
    },
    { label: "지급액", value: won(row.payout), tone: "total" },
    row.unpaid > 0 && {
      label: "미회수 잔액 (별도 청구)",
      value: won(row.unpaid),
      tone: "sub",
      minus: true,
      tip: SETTLE_TIP.unpaid,
    },
  ];
  return lines.filter((line): line is CalcLine => line !== false);
};

/** 명세 박스 아래 미회수 각주 — 미회수가 있을 때만(원본 `settleUnpaidNote`) */
export const unpaidNoteOf = (row: SettlementRow): Rich | null =>
  row.unpaid > 0
    ? [
        {
          bold: `환수액이 이번 회차 확정 매출을 넘어 ${won(row.unpaid)}을 회수하지 못했습니다.`,
        },
        " 지급액은 0원이 하한이며, 남은 잔액은 ",
        { bold: "차기 회차로 넘기지 않고 셀러에게 별도 청구" },
        "합니다(1회 지급 완결).",
      ]
    : null;

/* =========================================================================
 * 거래 내역 — 원본 `settleTxTable` · `settleTxFoot`
 * ====================================================================== */

export const txTitleOf = (row: SettlementRow) =>
  `${roundLabel(row.round)} 거래 내역`;

export const orderPathOf = (tx: SettleTx) => `/orders-all/${tx.order.id}`;

/** 「정산 반영」 칸 — 앞 낱말(반영)만 진하게, 나머지는 흐리게(원본 `muted`) */
export const txNoteParts = (tx: SettleTx) =>
  tx.kind === "included"
    ? { head: "반영", rest: tx.note.slice("반영".length) }
    : { head: "", rest: tx.note };

export interface TxFoot {
  count: number;
  amount: number;
  excluded: number;
}

/** 각주 수치 — 반영 건수·금액 = 명세의 확정 거래액과 같은 값 */
export const txFootOf = (row: SettlementRow): TxFoot => ({
  count: row.count,
  amount: row.sales,
  excluded: row.transactions.length - row.count,
});

export const txRulesOf = (row: SettlementRow): Rich[] => [
  [
    { bold: `${roundLabel(row.round)} 확정분` },
    "만 이번 회차 매출로 반영 — 판매=구매확정(배송 완료 7일 경과 자동 확정 포함) / 렌트=반납완료",
  ],
  [
    "취소·반품 건은 매출에서 제외 — 그중 ",
    { bold: "전월 이전에 확정(지급)된 건이 완료로 종결된 경우만" },
    " 차감(환수), 확정 이력 없는 건은 제외만",
  ],
  [{ bold: "거부·반려로 끝난 건" }, "은 거래가 유지되어 매출에 반영"],
];

export const TX_EMPTY = "연관 항목 없음";
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

/* =========================================================================
 * 정산 정책 — 원본 문단 그대로
 * ====================================================================== */

export const POLICY: Rich = [
  { bold: "매출 확정 기준" },
  " — 판매는 ",
  { bold: "구매확정" },
  ", 렌트는 ",
  { bold: "반납완료" },
  " 시 매출로 확정되어 정산 대상이 됩니다(확정 전 건은 정산 제외). 입점사 지급액 = 확정 매출 − 판매 수수료(셀러별 요율) − PG 수수료(요율 미정 — PG사 계약 시 확정) − 취소·반품 차감 ",
  { bold: "+ 안심케어 보전" },
  "이며, ",
  { bold: "수수료는 본사 수익" },
  "으로 귀속되고 정산 확정 시 수수료 세금계산서가 동시 발행됩니다. ",
  { bold: "보증금·연체료·배상은 보증금 내역" },
  "에서 분리 관리되어 이 명세에 포함되지 않습니다. ",
  { bold: "지급 전 발견 오류는 본사 직권 정정" },
  "하며, 지급 후 발견분 처리는 ",
  { bold: "미정의" },
  "입니다(차기 회차 상계 없음 — 1회 지급 완결).",
];

export const SECTIONS = {
  pay: "지급 정보",
  calc: "정산 명세",
  policy: "정산 정책",
};

/** [다운로드] 알림 — 원본 `act('{대상} 명세서 다운로드')` */
export const downloadMessageOf = (row: SettlementRow) =>
  `${row.name} 명세서 다운로드`;
