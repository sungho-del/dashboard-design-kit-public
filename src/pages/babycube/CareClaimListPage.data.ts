import type { TagTone } from "../../components/ui";
import { INSPECTION_META } from "./deposit.data";
import {
  CARE_CLAIM_STATUS_LABEL,
  ORDERS,
  won,
  type CareClaimStatus,
  type Inspection,
  type Order,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S14 안심케어 승인 (BabyCube 본사 운영 어드민) — 목록형 화면의 **도메인 층**
 * 기준 기획: v0.4 `plan-members/proto.html` `SCREENS.careClaims`(3175~3195) ·
 * 설정(1967~1972) · 승인 창(2415~2423) · 반려 창 `_MODAL_CFG.carereject`(2247) · 처리(2547~2580).
 * annotations 에는 이 화면 설명이 없다 — 정책 근거는 C-2 · B-2 · 약관(3555~3557)뿐이다.
 *
 * 짝이 되는 뼈대: `CareClaimListPage.tsx` (레이아웃·선택·일괄 처리, 도메인 무관)
 * 상세: `CareClaimDetailPage.*` (`/care-claims/{처리단위}`) — 같은 행·같은 창 문구를 읽는다.
 *
 * ## 이 화면이 무엇인가
 * 셀러가 반납 검수 뒤 올린 **안심케어 복원비 청구를 본사가 승인·반려**한다.
 * 승인한 복원비만 그 렌트가 확정된 회차의 셀러 정산에 **보전(+)** 된다(`settlement.data.ts`).
 * 금액은 셀러 입력값 그대로 — 본사는 고치지 않는다(원본 #13).
 *
 * ## 샘플 — **주문 처리단위(`ORDERS`)에서만** 뽑는다 (원본 `careClaimRows`)
 * 렌트 · 안심케어 가입 · 청구가 있는 건(`order.care.claim`). 지금은 4건 —
 * 접수 U-R18 · 승인 U-R28 · U-R29 · 반려 U-R19 (사례표 `settle-cases.md`, 원본 분포 접수 1·승인 2·반려 1 과 같다).
 * 같은 처리단위가 주문 상세(가입 요금)·보증금 내역(차감 0)·셀러 정산(보전)에서 같은 값을 말한다.
 *
 * ## 갈아끼울 것 (이 파일 전체)
 *
 * | 실물 이름          | 역할                                                 |
 * | ------------------ | ---------------------------------------------------- |
 * | `CareClaimRow`     | 표 한 행의 타입 (처리단위 1건 = 청구 1건)            |
 * | `CLAIM_ROWS`       | 주문 처리단위 → 청구 행                              |
 * | `STATUS_META`      | 청구 상태 → 라벨 · tone · 상태 카드 툴팁             |
 * | `FILTERS`          | 상태 대시 = 상태 필터 (3장, 전체 없음)               |
 * | `DATE_FIELDS`      | 기간 기준 (청구일 / 승인일 / 반려일)                 |
 * | `SEARCH_FIELDS`    | 검색 조건 (주문번호 / 셀러명 / 상품명)               |
 * | `REVIEW_COPY`      | 승인·반려 창과 알림 문구 (**목록·상세 공용**)        |
 * | `filterSummary`    | 접은 검색조건 줄의 요약                              |
 * | `won`·`ymd`        | 금액·날짜 포맷                                       |
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 키는 `id`(처리단위) — 선택·상세 경로(`/care-claims/{id}`)가 이 값을 쓴다
 * - `claimedAt`(`YYYY-MM-DD HH:mm`)이 기본 기간축이다. 승인일·반려일은 그 상태가 아니면 `null` →
 *   기간을 걸면 그 행은 빠진다(`DATE_FIELDS[].pick`)
 * - **`REVIEWABLE_STATUS`(청구 접수)만 고를 수 있다** — 뼈대는 이 값으로 체크박스를 잠근다
 * - **승인 창의 합계는 데이터가 낸다**(`sumAmount`) — 원본도 심사 대상 복원비 합을 찍는다(2416)
 *
 * ## 원본 결함 — 어떻게 다뤘나
 * - `파손(복원가능)` 배지 색이 원본 사전에 없어 회색으로 나온다(1922) → 보증금과 같은 판정 사전
 *   (`INSPECTION_META` — `critical`)을 쓴다
 * - 반려 카드 툴팁이 **상품** 문장이다(2818) → 지금은 부록 A C48 문장(승인 카드는 C47).
 *   청구 접수 카드는 원본에 툴팁이 없었다 → 부록 A C46 문장
 * - ⚠️ **기획 확인 필요**: 반려 안내는 「셀러가 보증금 차감 여부를 다시 판단합니다」(부록 A C48·C58)인데, 원본 반려 건의
 *   보증금은 이미 전액환급이다(1557). 우리도 원본대로 둔다(사용자 결정 ④ — U-R19 전액환급 · 질문 22)
 * - ⚠️ **기획 확인 필요**: 「익월 정산 보전」의 회차는 승인일이 아니라 **렌트 종료(반납 확정)월**로 정한다
 *   (원본 `settleCare`·`settleInMonth` 4171·4192). 지급이 끝난 회차의 렌트를 늦게 승인하면 닫힌 회차가 바뀐다
 * ---------------------------------------------------------------------- */

/** 청구 1건 = 렌트 처리단위 1건 */
export interface CareClaimRow {
  /** 처리단위 — **고유 키** */
  id: string;
  /** 주문번호 14자리 — 표의 「주문번호」 열 · 검색 대상 */
  orderNo: string;
  seller: string;
  product: string;
  /** 검수 판정 — 청구가 있으면 늘 `repairable`(약관: 복원가능 파손만 청구할 수 있다) */
  inspection: Inspection | null;
  /** 청구 복원비 — 셀러 입력값 */
  amount: number;
  /** 청구일시 `YYYY-MM-DD HH:mm` */
  claimedAt: string;
  /** 승인일시 — 승인 건만 */
  approvedAt: string | null;
  /** 반려일시 — 반려 건만 */
  rejectedAt: string | null;
  rejectReason: string | null;
  status: CareClaimStatus;
  /** 원래 처리단위 — 상세가 이용 기간·보증금을 여기서 읽는다 */
  order: Order;
}

const toRow = (order: Order): CareClaimRow | null => {
  const claim = order.care?.claim;
  if (order.type !== "rent" || !claim) return null;
  return {
    id: order.id,
    orderNo: order.orderNo,
    seller: order.seller,
    product: order.productName,
    inspection: order.inspection,
    amount: claim.amount,
    claimedAt: claim.claimedAt,
    approvedAt: claim.status === "approved" ? claim.decidedAt : null,
    rejectedAt: claim.status === "rejected" ? claim.decidedAt : null,
    rejectReason: claim.rejectReason,
    status: claim.status,
    order,
  };
};

/** 원본 `careClaimRows()` — 렌트 · 청구 있음. 순서는 주문 목록과 같다(결제 최신순) */
export const CLAIM_ROWS: CareClaimRow[] = ORDERS.map(toRow).filter(
  (row): row is CareClaimRow => row !== null,
);

/** **심사할 수 있는 상태** — 뼈대가 이 값으로 행 선택·상세 [승인][반려] 를 정한다 */
export const REVIEWABLE_STATUS: CareClaimStatus = "received";

/**
 * 청구 상태 → 라벨 · tone · 상태 카드 툴팁(원본 `STAT_TIP`).
 * 원본 배지: 청구 접수 b-prog · 승인 b-done · 반려 b-exc — 입점 심사와 같은 대응(warning/default/critical).
 * 청구 접수는 원본에 툴팁이 없었다 — 부록 A C46 문장을 넣는다.
 */
export const STATUS_META: Record<
  CareClaimStatus,
  { label: string; tone: TagTone; tip?: string }
> = {
  received: {
    label: CARE_CLAIM_STATUS_LABEL.received,
    tone: "warning",
    /* 부록 A C46 — 기한 표현만 DM 에 맞춘 예외 문장 */
    tip: "접수일 기준 3번째 영업일까지 승인 또는 반려합니다.",
  },
  approved: {
    label: CARE_CLAIM_STATUS_LABEL.approved,
    tone: "default",
    tip: "복원비가 다음 달 정산에 더해집니다.",
  },
  rejected: {
    label: CARE_CLAIM_STATUS_LABEL.rejected,
    tone: "critical",
    /* 원본 2818 은 상품 문장(결함) — 부록 A C48 */
    tip: "셀러가 보증금 차감 여부를 다시 판단합니다.",
  },
};

/** 검수 판정 배지 — 보증금 화면과 **같은 사전**이다. 판정이 없으면 원본처럼 「미검수」 */
export const inspectionMetaOf = (
  inspection: Inspection | null,
): { label: string; tone: TagTone } =>
  inspection
    ? INSPECTION_META[inspection]
    : { label: "미검수", tone: "default" };

/**
 * 상태 대시 = 상태 필터 — 원본 `chip.values` 3장. **[전체] 카드는 없다**(`dash:true` 라 `chip.all` 을 쓰지 않는다).
 */
export const FILTERS: { value: CareClaimStatus; label: string }[] = [
  { value: "received", label: STATUS_META.received.label },
  { value: "approved", label: STATUS_META.approved.label },
  { value: "rejected", label: STATUS_META.rejected.label },
];

/** 들어오면 「청구 접수」 — 원본 `chip.def`. [초기화]도 여기로 돌아간다 */
export const DEFAULT_FILTER: CareClaimStatus = "received";

/** 기간 기준 — 원본 `date.fields`. `pick` 이 `null` 이면 그 행은 기간에서 빠진다 */
export const DATE_FIELDS = [
  {
    value: "claimedAt",
    label: "청구일",
    pick: (row: CareClaimRow) => row.claimedAt,
  },
  {
    value: "approvedAt",
    label: "승인일",
    pick: (row: CareClaimRow) => row.approvedAt,
  },
  {
    value: "rejectedAt",
    label: "반려일",
    pick: (row: CareClaimRow) => row.rejectedAt,
  },
];

/** 검색 조건 — 원본 `search.fieldOpts` 어휘·순서 그대로 */
export const SEARCH_FIELDS = [
  {
    value: "no",
    label: "주문번호",
    pick: (row: CareClaimRow) => row.orderNo,
  },
  { value: "seller", label: "셀러명", pick: (row: CareClaimRow) => row.seller },
  { value: "prod", label: "상품명", pick: (row: CareClaimRow) => row.product },
];

/** 승인 창 합계 — 심사 대상(청구 접수 건) 복원비의 합(원본 2416) */
export const sumAmount = (rows: CareClaimRow[]) =>
  rows.reduce((sum, row) => sum + row.amount, 0);

/**
 * 승인·반려 창 문구는 부록 A C54~C59, 알림은 원본 v0.4 그대로(질문 31). **목록 일괄과 상세가 같은 문구를 쓴다.**
 * 제목의 (N건)은 2건 이상일 때만(원본).
 */
export const REVIEW_COPY = {
  approveTitle: (count: number) =>
    `안심케어 승인${count > 1 ? ` (${count}건)` : ""}`,
  approveBody: (amount: number) =>
    `복원비 ${won(amount)}이 다음 달 정산에 더해지고, 보증금은 차감 없이 종결됩니다.`,
  approveWarning: "승인 후에는 되돌릴 수 없습니다.",
  approveConfirm: "승인 처리",
  approved: (count: number) =>
    count > 1
      ? `${count}건 승인 처리되었습니다. 익월 정산에 보전됩니다.`
      : "승인 처리되었습니다. 익월 정산에 보전됩니다.",
  rejectTitle: (count: number) =>
    `안심케어 반려 사유 입력${count > 1 ? ` (${count}건)` : ""}`,
  rejectPlaceholder: "예: 복원 견적서 미첨부",
  rejectNote:
    "반려하면 셀러가 보증금 차감 여부를 다시 판단합니다. 반려 사유는 셀러에게 보입니다.",
  rejectEmpty: "반려 사유를 입력해주세요.",
  rejectConfirm: "반려 처리",
  rejected: (count: number) =>
    count > 1 ? `${count}건을 반려 처리했습니다.` : "반려 처리되었습니다.",
};

/** 상태 카드·선택 바의 단위 */
export const REVIEW_UNIT = "건";

export { won };

/** 날짜 표기 — 원본 `2026.07.23`(날짜만). 값이 없으면 `-` */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : "-";

/** 페이지당 행 수 — 원본 `pager` 기본 10 · 셀렉트 10/20/50/100 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];

/* -------------------------------------------------------------------------
 * 검색조건 요약 — 접은 `FilterBar` 한 줄 (입점 심사와 같은 규칙).
 * 조건이 없으면 원본 문구 `조건 없음 (전체)`. 상태는 넣지 않는다 — 건수 카드가 말한다.
 * ---------------------------------------------------------------------- */

export const NO_FILTER_TEXT = "조건 없음 (전체)";

const dotDate = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(
    value.getDate(),
  ).padStart(2, "0")}`;

export const filterSummary = ({
  dateLabel,
  from,
  to,
  fieldLabel,
  keyword,
}: {
  dateLabel: string;
  from?: Date;
  to?: Date;
  fieldLabel: string;
  keyword: string;
}): string => {
  const parts: string[] = [];
  if (from)
    parts.push(`${dateLabel} ${dotDate(from)}${to ? `~${dotDate(to)}` : ""}`);
  if (keyword.trim() !== "") parts.push(`${fieldLabel} «${keyword.trim()}»`);
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
