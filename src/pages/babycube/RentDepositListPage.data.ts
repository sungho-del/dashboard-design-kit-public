import type { DateRange, SelectOption } from "../../components/ui";
import {
  DEPOSIT_STATUS_META,
  depositOf,
  type DepositStatus,
} from "./deposit.data";
import {
  ORDERS,
  STATUS_META,
  sellerLabel,
  type Order,
  type OrderStatus,
  type SellerKind,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S13 보증금 내역 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `RentDepositListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 짝이 되는 상세: `RentDepositDetailPage.*` (`/rent-deposit/{처리단위}`)
 * 기준 기획: **v0.4** `SCREENS.rentDeposit`(proto.html 4490~4520) · `FILTERS.rentDeposit`(2042~2047)
 *
 * ## 이 화면이 무엇인가
 * 렌트 보증금이 **점유중 → 환급대기 → 환급완료(전액·일부·전액차감)** 로 가는 과정을 금액과 함께 보는
 * **조회 전용 원장**이다(원본 4462 — 환급 실행은 셀러의 검수·반납 관리). 한 행에 상태가 **둘** 붙는다 —
 * 주문 상태(물건)와 보증금 상태(돈).
 *
 * ## 샘플 — 주문 처리단위에서 **파생**한다 (손 샘플 없음)
 * 행 = `ORDERS` 의 렌트 처리단위. 보증금 상태·차감·반환액·상태 변경일은 **`depositOf` 하나**가 정한다 —
 * 주문 상세의 「보증금 상태」 칸, 클레임 명세의 보증금 반환액과 같은 처리단위에서 같은 값이 나온다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입 `DepositRow` 는 `id`(**처리단위** — 행 key·선택·상세 경로) · `orderNo`(표시) ·
 *   `changedAt`(상태 변경일 `YYYY-MM-DD HH:mm` | `null`) 을 갖는다. 기간 필터 축은 상태 변경일 하나뿐이고
 *   (원본 `date.key: depStatAt`), **변경일이 없는 점유중 행은 기간을 걸면 빠진다**(원본 `_normDate` 그대로)
 * - `STATUS_OPTIONS[0]` · `SOURCE_OPTIONS[0]` 의 값은 `"all"`(필터 해제)
 * - 요약 4값(`SUMMARY_STATS`)·표의 금액은 **데이터가 만든다** — 뼈대는 계산하지 않는다
 * - `filterSummary` 는 검색조건 요약줄 — 원본 순서(기간 → 상태 → 출처 → 검색어)
 *
 * ## 원본과 맞춘 것
 * 목록 범위(검수중·검수완료·반납완료) · 요약 4값과 집계 범위 · 11열 이름·순서 · 체크박스(엑셀 선택분) ·
 * No 없음 · 정렬 없음 · 상태 5종과 **셀에서만 길어지는 라벨**(`환급완료(전액환급)`) · 구분 `본사/셀러` ·
 * 셀러명 자체면 `본사` · 상품 옆 안심케어 표식 · 차감 없으면 `-` · 점유중의 상태 변경일 `-` ·
 * 검색 2종(주문번호·회원명, 대소문자 무시) · 기간 빠른 선택 7종.
 *
 * ## ⚠️ 기획 확인 필요 (원본 그대로 둔 모순)
 * - **점유중 타일이 목록에 없는 건까지 더한다** — 타일은 보증금 있는 렌트 **전체**(원본 4492 `src`),
 *   목록은 반납 이후 3단계뿐(4493). 지금 샘플: 점유중 타일 1,870,000원(21건) vs 목록의 점유중 1건 80,000원.
 *   환급 대기액·반환 완료액에도 목록 밖 클레임 건(취소 환불 처리중·취소 완료·반품 완료)이 들어간다
 * - 상태 필터 줄 라벨 — 원본은 사전 누락으로 「상태」라 나온다(2102). 표에 상태 열이 둘이라 「보증금 상태」로 적었다
 * ---------------------------------------------------------------------- */

/**
 * 보증금 상태 어휘·라벨·톤은 보증금 순수 함수 파일(`deposit.data.ts`)이 원본이다 —
 * 주문 상세도 같은 파일을 읽는다(이 파일을 주문 상세가 import 하면 순환이 생긴다).
 */
export { DEPOSIT_STATUS_META, type DepositStatus };
/** 주문 상태 배지 — 주문 목록과 같은 표(같은 글자가 화면마다 다른 색이면 안 된다) */
export const ORDER_STATUS_META = STATUS_META;

/** 표 한 행 — 주문 처리단위 + 그 보증금 */
export interface DepositRow {
  /** 처리단위 코드 — 고유 키. 같은 주문번호에 처리단위가 여럿일 수 있다(U-R09·U-R22) */
  id: string;
  orderNo: string;
  member: string;
  /** 회원 ID — 회원 상세 경로 */
  memberId: string;
  sellerKind: SellerKind;
  /** 셀러명 칸 — 자체면 `본사`(원본 `owner==='자체'?'본사':seller`) */
  seller: string;
  product: string;
  /** 안심케어 가입 — 상품 옆 표식(열이 아니다) */
  care: boolean;
  period: string;
  deposit: number;
  /** 실효 차감(검수 차감 + 고객 귀책 반품 배송비, 상한 보증금) — `depositOf` 값 그대로 */
  deduction: number;
  /** 반환 예정액 = max(0, 보증금 − 차감) — `depositOf` 값 그대로 */
  refund: number;
  status: DepositStatus;
  /** 상태 변경일 — 점유중은 `null` */
  changedAt: string | null;
  orderStatus: OrderStatus;
  /** 상세가 더 읽는 원래 처리단위 */
  order: Order;
}

/** 처리단위 → 행. 렌트가 아니거나 보증금이 없으면 `null`(원본 `RENT_UNITS().filter(u=>u.dep)`) */
export const depositRowOf = (order: Order): DepositRow | null => {
  const state = depositOf(order);
  if (!state) return null;
  return {
    id: order.id,
    orderNo: order.orderNo,
    member: order.buyerName,
    memberId: order.buyerId,
    sellerKind: order.sellerKind,
    seller: sellerLabel(order),
    product: order.productName,
    care: order.care !== null,
    period: order.period,
    deposit: state.deposit,
    deduction: state.deduction,
    refund: state.refund,
    status: state.status,
    changedAt: state.changedAt,
    orderStatus: order.status,
    order,
  };
};

/** 보증금 있는 렌트 **전체** — 요약 타일의 모집단(원본 `src`) */
export const ALL_DEPOSITS: DepositRow[] = ORDERS.map(depositRowOf).filter(
  (row): row is DepositRow => row !== null,
);

/** 목록 범위 — 주문 상태가 반납 이후 3단계인 건만(원본 4493 · 사용자 결정 2026-11-02 원본 그대로) */
export const LIST_STATUSES: OrderStatus[] = [
  "inspecting",
  "inspected",
  "returned",
];

/** 표의 모집단. 순서는 주문 샘플 그대로(결제 최신순) — 원본에 정렬이 없다 */
export const DEPOSITS: DepositRow[] = ALL_DEPOSITS.filter((row) =>
  LIST_STATUSES.includes(row.orderStatus),
);

/* =========================================================================
 * 요약 4값 — 원본 `rentDeposit.stats` (4495~4515). **필터와 무관**하게 `ALL_DEPOSITS` 에서 센다
 * ====================================================================== */

const DONE: DepositStatus[] = ["fullRefund", "partialRefund", "fullDeduct"];

const sum = (rows: DepositRow[], pick: (row: DepositRow) => number) =>
  rows.reduce((acc, row) => acc + pick(row), 0);

/** 점유중 예수금 — 점유중 건의 **보증금** 합 */
export const holdingTotal = sum(
  ALL_DEPOSITS.filter((row) => row.status === "holding"),
  (row) => row.deposit,
);

/** 환급 실행 대기액 — 환급대기 건의 **반환 예정액** 합 */
export const pendingRefundTotal = sum(
  ALL_DEPOSITS.filter((row) => row.status === "pendingRefund"),
  (row) => row.refund,
);

/** 환급 실행 완료 — 종결 3종의 반환액 합 */
export const returnedTotal = sum(
  ALL_DEPOSITS.filter((row) => DONE.includes(row.status)),
  (row) => row.refund,
);

/** 차감 수익 — 종결 3종의 `min(보증금, 차감)` 합(차감은 이미 보증금 한도 안이다) */
export const deductedTotal = sum(
  ALL_DEPOSITS.filter((row) => DONE.includes(row.status)),
  (row) => Math.min(row.deposit, row.deduction),
);

/** 단위를 뗀 수치 — 요약 상자가 값과 단위를 다른 크기로 그린다 */
export const num = (value: number) => value.toLocaleString("ko-KR");

/**
 * 요약 4값 — 라벨·값만. 원본 라벨 괄호 설명(「판정됨·실행 전」 · 「연체료+손상 · 상한=보증금」)은 지웠다(부록 A C14 · C15).
 * 환급 대기는 정상 진행 상태라 경고색을 쓰지 않는다(경고색은 실제 이상에만 — 정산 화면 공통).
 * 원본 색: 차감 수익 = brand(우리 타일에 해당 색조 없음 — 무채색).
 */
export const SUMMARY_STATS: { label: string; value: string; unit: string }[] = [
  { label: "점유중 보증금 총액", value: num(holdingTotal), unit: "원" },
  { label: "환급 대기액", value: num(pendingRefundTotal), unit: "원" },
  { label: "반환 완료액", value: num(returnedTotal), unit: "원" },
  { label: "차감 수익", value: num(deductedTotal), unit: "원" },
];

/* =========================================================================
 * 셀 표기
 * ====================================================================== */

/** 구분 칸 — 원본 `본사`/`셀러` 배지(분류라 무채색) */
export const SOURCE_CELL_LABEL: Record<SellerKind, string> = {
  hq: "본사",
  seller: "셀러",
};

/** 금액 — 천 단위 쉼표 + `원` */
export const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 금액이 없는 칸 — 원본 그대로 `0원` 이 아니라 `-` */
export const NONE = "-";

/** 차감 칸 — 있으면 `−25,000원`(U+2212 · 정산 화면 공통 부호), 없으면 `-`(원본) */
export const deductText = (value: number) =>
  value > 0 ? `−${won(value)}` : NONE;

/** 상태 변경일 — 원본 `depStatAt` 처럼 날짜만(`2026.09.19`), 점유중은 `-` */
export const ymd = (dateText: string | null) =>
  dateText ? dateText.slice(0, 10).replace(/-/g, ".") : NONE;

/* =========================================================================
 * 검색조건 — 원본 순서: 상태 변경일 → 상태 → 출처 → 검색 대상 + 검색어
 * ====================================================================== */

/** 보증금 상태 — 원본 단일 체크칩 6개(전체 포함)를 셀렉트로(공통 규칙). 짧은 라벨 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "보증금 상태 전체" },
  ...(Object.keys(DEPOSIT_STATUS_META) as DepositStatus[]).map((value) => ({
    value,
    label: DEPOSIT_STATUS_META[value].label,
  })),
];

/**
 * 출처 — 원본 「출처: 전체 / 자체 / 입점사」(다중 체크) 를 셀렉트로(공통 규칙 「판매자/출처 라디오는
 * 셀렉트 하나」). 둘을 다 고르면 전체와 같아 단일 선택으로 잃는 것이 없다.
 * 글자는 표의 「구분」 칸과 같은 `본사/셀러`(판정 Q10 — 원본 `자체/입점사` 는 내부 값 `hq`·`seller` 로만).
 */
export const SOURCE_OPTIONS: SelectOption[] = [
  { value: "all", label: "출처 전체" },
  { value: "hq", label: "본사" },
  { value: "seller", label: "셀러" },
];

export type DepositSearchField = "orderNo" | "member";

/** 검색 대상 — 원본 `fieldOpts` 2종, 기본 주문번호 */
export const SEARCH_FIELDS: { value: DepositSearchField; label: string }[] = [
  { value: "orderNo", label: "주문번호" },
  { value: "member", label: "회원명" },
];

export const SEARCH_PLACEHOLDER = "검색어 입력";

/** 검색 대상 → 그 행의 값. 뼈대가 소문자로 비교한다(원본 `toLowerCase`) */
export const searchValueOf = (row: DepositRow, field: DepositSearchField) =>
  row[field];

export interface DepositFilters {
  period?: DateRange;
  status: string;
  source: string;
  searchField: DepositSearchField;
  keyword: string;
}

export const EMPTY_FILTERS: DepositFilters = {
  period: undefined,
  status: "all",
  source: "all",
  searchField: "orderNo",
  keyword: "",
};

/** 상태·출처 조건에 드는가(기간·검색은 뼈대가 본다 — 다른 목록과 같은 규칙) */
export const matchesFilters = (row: DepositRow, filters: DepositFilters) =>
  (filters.status === "all" || row.status === filters.status) &&
  (filters.source === "all" || row.sellerKind === filters.source);

/** 접힌 검색조건의 요약 — 걸린 조건이 없으면 이 글자 */
export const NO_FILTER_TEXT = "조건 없음 (전체)";

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const dotDay = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")}`;

/** 요약 — 원본 `fbSummary` 순서(기간 → 상태 → 출처 → 검색어) */
export const filterSummary = (filters: DepositFilters): string => {
  const parts: string[] = [];
  const { period } = filters;
  if (period?.from) {
    parts.push(
      `상태 변경일 ${dotDay(period.from)}${period.to ? `~${dotDay(period.to)}` : ""}`,
    );
  }
  if (filters.status !== "all") {
    parts.push(`보증금 상태 ${labelOf(STATUS_OPTIONS, filters.status)}`);
  }
  if (filters.source !== "all") {
    parts.push(`출처 ${labelOf(SOURCE_OPTIONS, filters.source)}`);
  }
  if (filters.keyword.trim() !== "") {
    parts.push(
      `${labelOf(SEARCH_FIELDS, filters.searchField)} «${filters.keyword.trim()}»`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};

/** 빈 상태 — 원본 공용 문구(형제 목록과 같다) */
export const EMPTY_TITLE = "해당 조건의 항목이 없습니다";
export const EMPTY_DESCRIPTION =
  "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.";

/** 한 페이지 행 수 — 원본 기본 10, 고를 수 있는 크기 4종 */
export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
