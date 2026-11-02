import type { SelectOption } from "../../components/ui";
import {
  CLAIM_FLOW,
  DEFAULT_TYPE,
  NO_FILTER_TEXT,
  ORDERS,
  SEARCH_FIELDS,
  SELLER_ALL,
  SELLER_ANY,
  SELLER_HQ,
  STATUS_META,
  TYPE_FILTERS,
  type Order,
  type OrderFilters,
  type OrderStatus,
  type OrderType,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S09 취소 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderCancelListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 기준 기획: **v0.4** `SCREENS.ordersCancel` → `ordersRmaScreen('ordersCancel','취소')`
 * (proto.html:4446). 원본은 이 화면을 **주문 목록과 같은 함수**로 그린다 —
 * `ordersFlatHead`/`ordersFlatRow` · `_ordersUnitFilter` · `orderTypeDash` · `EXPORT_SPEC`.
 * 다른 것은 셋뿐이다: ① 모집단 ② 상태 선택지 ③ 주문번호 링크가 가는 상세.
 *
 * ## 이 파일에 두는 것 = 이 화면만의 것
 * 모집단 · 상태 선택지 · 판매자 선택지 · URL 해석 · 요약 · 상세 경로.
 * 타입·라벨·포맷터·검색 대상은 주문 목록 도메인(`./OrderListPage.data`)을 **그대로 다시 내보낸다**
 * — 같은 처리단위가 두 목록에 같은 글자·같은 색으로 보여야 한다(원본도 같은 `UNITS`).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `CANCEL_ORDERS` 는 `Order[]`, 결제 최신순. 행 key·선택은 처리단위 코드(`id`)
 * - `TYPE_FILTERS` 는 렌트·판매 **2장**, 기본 렌트(원본 `OTYPE_DEF` · `OTYPE_SCR.ordersCancel=1`)
 * - `STATUS_OPTIONS[0].value === "all"` — 유형과 무관하게 하나(원본 `FLOW_STEPS['취소']`)
 * - `detailPathOf` 는 주문번호 링크의 목적지(원본 `orderRowDetail` → `rentRmaCancel`/`rmaCancel`)
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**. 주문 목록과 같은 파라미터 이름·같은 보정
 *
 * ## 샘플 — 주문 샘플에서 **거른다** (자체 샘플 없음)
 * 모집단 = `ORDERS` 중 `claim.type === "cancel"` (렌트 3 · 판매 3, 상태마다 한 건 이상).
 * 같은 처리단위가 주문 목록에도 「취소 요청」 등으로 보인다(원본 그대로).
 * ---------------------------------------------------------------------- */

export {
  DASH_UNIT,
  DEFAULT_TYPE,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  NO_FILTER_TEXT,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
  TYPE_FILTERS,
  TYPE_META,
  matchesSeller,
  perDay,
  periodText,
  rentPriceOf,
  searchValueOf,
  sellerLabel,
  won,
  ymdhm,
  type Order,
  type OrderSearchField,
  type OrderType,
} from "./OrderListPage.data";

/** 뼈대가 들고 있는 조회 조건 — 주문 목록과 같은 모양이다 */
export type CancelFilters = OrderFilters;

/** 모집단 — 취소 클레임이 걸린 처리단위. `ORDERS` 가 이미 결제 최신순이다 */
export const CANCEL_ORDERS: Order[] = ORDERS.filter(
  (order) => order.claim?.type === "cancel",
);

/** 주문번호 링크 → 그 처리단위의 취소 상세(상세 화면은 다음 단계) */
export const detailPathOf = (order: Order) => `/orders-cancel/${order.id}`;

/** 상태 셀렉트 — 원본 `FLOW_STEPS['취소']` 순서 그대로(취소 요청 · 환불 처리중 · 취소 완료) */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  ...CLAIM_FLOW.cancel.map((value) => ({
    value,
    label: STATUS_META[value].label,
  })),
];

/**
 * 판매자 셀렉트 — 주문 목록과 같은 셀렉트 하나(사용자 결정 2026-10-19).
 * 셀러명은 **이 화면 모집단**에 나오는 셀러에서 뽑는다 — 고르면 늘 1건 이상이다.
 */
const SELLER_NAMES = [
  ...new Set(
    CANCEL_ORDERS.filter((order) => order.sellerKind === "seller").map(
      (order) => order.seller,
    ),
  ),
].sort((a, b) => a.localeCompare(b, "ko"));

export const SELLER_OPTIONS: SelectOption[] = [
  { value: SELLER_ALL, label: "판매자 전체" },
  { value: SELLER_HQ, label: "본사" },
  { value: SELLER_ANY, label: "셀러 전체" },
  ...SELLER_NAMES.map((name) => ({ value: name, label: name })),
];

/* =========================================================================
 * URL 쿼리 → 초기 필터 — 주문 목록과 같은 이름(`stat` 유형 · `flow` 상태 · `owner` ·
 * `sellerName` · `q` · `paidAt_from/to`). v0.4 에는 이 화면으로 오는 링크가 없지만
 * 형제 목록과 같은 입구를 둔다.
 * ====================================================================== */

const TYPE_BY_LABEL: Record<string, OrderType> = Object.fromEntries(
  TYPE_FILTERS.map((item) => [item.label, item.value]),
);

/**
 * `취소 요청` → `cancelRequested`. **이 화면의 선택지 안에서만** 뒤집는다 —
 * 「환불 처리중」은 반품에도 있어(`returnRefunding`) 한데 뒤집으면 다른 클레임 키로 풀린다.
 */
const STATUS_BY_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => [
    option.label,
    option.value,
  ]),
);

/** `YYYY-MM-DD` → `Date`. 형식이 아니면 `undefined`(필터 없음으로 떨어진다) */
function parseDay(text: string | null): Date | undefined {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const at = new Date(`${text}T00:00:00`);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

/**
 * URL 쿼리를 읽어 초기 조회 조건을 만든다. 모르는 값은 **조용히 무시**한다.
 *   · 없거나 모르는 `stat` → 렌트
 *   · `owner=셀러` 일 때만 `sellerName` 을 본다(모르는 셀러면 셀러 전체)
 *   · 종료일만 있으면 기간을 걸지 않는다
 */
export function filtersFromQuery(params: URLSearchParams): CancelFilters {
  const owner = params.get("owner");
  const sellerName = params.get("sellerName") ?? "";
  const seller =
    owner === "본사"
      ? SELLER_HQ
      : owner === "셀러"
        ? SELLER_NAMES.includes(sellerName)
          ? sellerName
          : SELLER_ANY
        : SELLER_ALL;

  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type: TYPE_BY_LABEL[params.get("stat") ?? ""] ?? DEFAULT_TYPE,
    status: STATUS_BY_LABEL[params.get("flow") ?? ""] ?? "all",
    seller,
    searchField: "orderNo",
    keyword: params.get("q") ?? "",
    period: from ? { from, to } : undefined,
  };
}

const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value;

const dotDay = (value: Date) =>
  `${value.getFullYear()}.${String(value.getMonth() + 1).padStart(2, "0")}.${String(value.getDate()).padStart(2, "0")}`;

/** 접힌 검색조건의 요약. 유형은 위의 카드가 말하므로 넣지 않는다 */
export const filterSummary = (filters: CancelFilters): string => {
  const parts: string[] = [];
  const { period } = filters;
  if (period?.from) {
    parts.push(
      `결제일 ${dotDay(period.from)}${period.to ? `~${dotDay(period.to)}` : ""}`,
    );
  }
  if (filters.seller !== SELLER_ALL) {
    parts.push(
      SELLER_NAMES.includes(filters.seller)
        ? `셀러 ${filters.seller}`
        : labelOf(SELLER_OPTIONS, filters.seller),
    );
  }
  if (filters.status !== "all") {
    parts.push(`상태 ${STATUS_META[filters.status as OrderStatus].label}`);
  }
  if (filters.keyword.trim() !== "") {
    parts.push(
      `${labelOf(SEARCH_FIELDS, filters.searchField)} «${filters.keyword.trim()}»`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : NO_FILTER_TEXT;
};
