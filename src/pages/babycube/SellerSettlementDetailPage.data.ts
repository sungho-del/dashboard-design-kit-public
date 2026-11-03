import {
  findSettlement,
  PAYOUT_DATE,
  roundLabel,
  SETTLE_ROUND,
  type SettleTx,
  type SettlementRow,
} from "./settlement.data";
import {
  STATUS_META as ORDER_STATUS_META,
  TYPE_META,
} from "./OrderListPage.data";
import { dotted, minus, plus, won } from "./SellerSettlementPage.data";

/* -------------------------------------------------------------------------
 * 셀러 정산 상세 (BO-STL-003 · `/settle-seller/{셀러 id}`) — **도메인 층**
 * 기준 기획: v0.4 `proto.html` 5199~5213(`DETAILS.settlement`) · 4557~4587(거래 내역 표·요약·각주).
 *
 * 짝이 되는 뼈대: `SellerSettlementDetailPage.tsx`. 명세 줄·모달·각주는 목록 데이터
 * (`SellerSettlementPage.data.ts`)의 것을 **그대로** 쓴다 — 원본도 합산·상세가 한 함수를 공유한다.
 * 숫자는 `settlement.data.ts` 의 정산 행(`SettlementRow`) 그대로다(화면에서 다시 계산하지 않는다).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `findRow(id)` — 경로 마지막 조각(셀러 마스터 id)으로 이번 회차 행을 찾는다. 없으면 `undefined`
 * - `infoOf(row)` 가 「정산 정보」 줄을 준다(재발송 이력은 있을 때만) · `objectionOf(row)` 는 명세 위 경고 상자
 * - `txNoteOf(tx)` 가 거래 내역 「정산 반영」 칸(앞 진하게 / 뒤 흐리게 · 환수 −N원 · 보전 +N원)
 * - 거래 내역은 `row.transactions`(반영 → 환수 → 제외 순으로 이미 정렬)
 *
 * ## ⚠️ 기획 확인 필요 (원본 그대로)
 * - 지급 계좌는 원본이 하드코딩한 표기(`국민은행 45**-**-****** ({셀러})`) — 셀러 마스터에 계좌가 없다
 * - 하단 [확인]·[취소]는 둘 다 목록으로 간다 — [목록]과 하는 일이 같다(사용자 결정: 원본 버튼 유지)
 * ---------------------------------------------------------------------- */

export const findRow = (sellerId: string): SettlementRow | undefined =>
  findSettlement(sellerId);

export const LIST_PATH = "/settle-seller";
export const LIST_LABEL = "셀러 정산";
/** 원본 `DETAIL_TITLES.settlement` */
export const TITLE = "셀러 정산 상세";

export const NOT_FOUND = {
  title: "찾을 수 없는 셀러 정산입니다",
  description:
    "주소가 잘못되었거나 이번 회차 정산 대상이 아닌 셀러일 수 있습니다.",
};

/** 머리 한 줄 — `{셀러} · 2026년 9월` (날짜는 3화면 모두 `roundLabel` 표기) */
export const headlineOf = (row: SettlementRow) =>
  `${row.name} · ${roundLabel(row.round)}`;

export const SECTIONS = {
  statement: "정산 명세",
  info: "정산 정보",
  /** 원본 `${SETTLE_MONTH_KO} 거래 내역` */
  transactions: `${roundLabel(SETTLE_ROUND)} 거래 내역`,
};

/** 원본 `act('{셀러} 명세서 다운로드')` */
export const statementDownloaded = (name: string) => `${name} 명세서 다운로드`;

/** 지급 계좌 — 원본 하드코딩 표기 그대로(기획 확인 필요) */
export const accountOf = (row: SettlementRow) =>
  `국민은행 45**-**-****** (${row.name})`;

export const sellerPathOf = (row: SettlementRow) => `/sellers/${row.sellerId}`;
export const orderPathOf = (tx: SettleTx) => `/orders-all/${tx.order.id}`;

/** 「정산 정보」 값 — 재발송은 이력이 있을 때만(원본) */
export const infoOf = (row: SettlementRow) => ({
  count: `${row.count}건`,
  round: roundLabel(row.round),
  payoutDate: dotted(PAYOUT_DATE),
  account: accountOf(row),
  resend: row.resend
    ? { text: row.resend.note, at: dotted(row.resend.at) }
    : null,
});

/**
 * 셀러 이의 사유 — **이의제기 상태이고 사유가 있을 때만**(원본 조건 그대로). 이 화면에서 할 일
 * ([수정 명세 재발송])의 근거라 「정산 정보」 줄이 아니라 정산 명세 카드 맨 위 경고 상자로 그린다.
 * 사유·일시를 함께 보존한다(한 곳에만 — 정산 정보에서는 뺐다)
 */
export const OBJECTION_LABEL = "셀러 이의 사유";
export const objectionOf = (row: SettlementRow) =>
  row.status === "disputed" && row.objection
    ? { text: row.objection.reason, at: dotted(row.objection.at) }
    : null;

/* =========================================================================
 * 거래 내역 표 (원본 `settleTxTable` · `settleTxFoot`)
 * ====================================================================== */

export const TX_PAGE_SIZE = 10;
export const TX_PAGE_SIZES = [10, 20, 50, 100];

export const txCells = (tx: SettleTx) => ({
  type: TYPE_META[tx.order.type],
  status: ORDER_STATUS_META[tx.order.status],
  amount: won(tx.amount),
});

/**
 * 「정산 반영」 칸 — 앞(`strong` · 기본 글자색) + 뒤(`muted` · 보조 글자색).
 * 이번 회차 지급액을 실제로 바꾸는 줄은 흐리지 않는다:
 * - 반영: `반영`(+ 승인 보전이 있으면 ` · 보전 +N원`) · 뒤에 클레임 불성립 등 사유
 * - 환수: 원본 문구 `제외 · 반품 환수` + ` −N원`(그 건의 `clawback` 값 — 원거래 「금액」 칸은 그대로)
 * - 그 밖 제외: 전부 흐리게(원본 `muted`). ⚠️ 환수 값이 없는 제외 건에 환수를 붙이지 않는다
 * 정산 명세서 상세도 이 함수를 쓴다(두 화면의 같은 표가 같은 모양)
 */
export const txNoteOf = (tx: SettleTx): { strong: string; muted: string } => {
  if (tx.kind === "clawback" && tx.clawback > 0) {
    return { strong: `${tx.note} ${minus(tx.clawback)}`, muted: "" };
  }
  if (tx.kind === "included") {
    const care = tx.care > 0 ? ` · 보전 ${plus(tx.care)}` : "";
    return { strong: `반영${care}`, muted: tx.note.slice("반영".length) };
  }
  return { strong: "", muted: tx.note };
};

/** 표 아래 요약 — `반영 N건 · N원(= 확정 거래액) · 제외 N건` */
export const txSummaryOf = (row: SettlementRow) => {
  const included = row.transactions.filter((tx) => tx.kind === "included");
  return {
    included: `${included.length}건 · ${won(row.sales)}`,
    excluded: `${row.transactions.length - included.length}건`,
  };
};

/** 표 아래 규칙 3줄 — 원본 그대로 */
export const TX_RULES = [
  `${roundLabel(SETTLE_ROUND)} 확정분만 이번 회차 매출로 반영 — 판매=구매확정(배송 완료 7일 경과 자동 확정 포함) / 렌트=반납완료`,
  "취소·반품 건은 매출에서 제외 — 그중 전월 이전에 확정(지급)된 건이 완료로 종결된 경우만 차감(환수), 확정 이력 없는 건은 제외만",
  "거부·반려로 끝난 건은 거래가 유지되어 매출에 반영",
];
