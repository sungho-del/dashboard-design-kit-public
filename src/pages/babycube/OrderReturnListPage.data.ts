import type { SelectOption } from "../../components/ui";
import {
  CLAIM_FLOW,
  DEFAULT_TYPE,
  ORDERS,
  SELLER_ALL,
  SELLER_ANY,
  SELLER_HQ,
  STATUS_META,
  TYPE_FILTERS,
  type OrderFilters,
  type OrderType,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S10 반품 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderReturnListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 기준 기획: **v0.4** `SCREENS.ordersReturn` → `ordersRmaScreen` — 주문 목록과 **같은 함수**
 * (`ordersFlatCard`/`ordersFlatHead`/`ordersFlatRow`)로 그린다. 다른 것은 셋뿐이다:
 *   ① 모집단(`req.type==='반품'`) ② 상태 선택지(`FLOW_STEPS['반품']`) ③ 주문번호가 가는 상세.
 *
 * ## 이 화면이 무엇인가
 * 반품이 걸린 **처리단위**를 조회하는 목록. 조회 전용이다(행 액션·처리 버튼 없음 —
 * 원본 정책 「목록은 조회 전용 — 일상 처리는 셀러 어드민」).
 *
 * ## 샘플 — 자체 샘플이 없다. **주문 샘플에서 거른다**
 * 원본도 반품 목록 = 주문 목록의 부분집합이다(`ordersUnitsFiltered` 가 모든 처리단위를 읽는다).
 * 그래서 같은 처리단위(예: U-R21)가 두 목록에서 같은 사람·같은 상품·같은 상태로 보인다.
 * 타입·라벨·포맷터·유형 카드·검색 대상도 주문 목록 것을 그대로 다시 내보낸다.
 *
 * ## 이 파일에만 있는 것
 * - 모집단 `RETURNS` · 상세 경로 `RETURN_DETAIL_PATH`
 * - 상태 선택지 `STATUS_OPTIONS` — **유형(렌트·판매)과 무관하게 하나**(원본 `FLOW_STEPS['반품']` 10단계)
 * - 판매자 선택지 `SELLER_OPTIONS` — 셀러명은 **이 화면 모집단**에서 뽑는다
 * - URL 해석 `filtersFromQuery` — 상태 라벨은 **이 화면 선택지 안에서만** 뒤집는다
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - 행 타입은 `Order`(주문 목록과 같다) — `id` 처리단위 키 · `date` 결제 일시
 * - `TYPE_FILTERS` 는 렌트·판매 2장, 기본 렌트([전체] 없음 — 원본 `_OTYPE_ALL`·`OTYPE_DEF`)
 * - `STATUS_OPTIONS[0].value === "all"`
 * - `searchValueOf` 는 검색 대상 7종 → 그 행의 값(뼈대가 소문자로 비교)
 * ---------------------------------------------------------------------- */

export {
  DASH_UNIT,
  EMPTY_DESCRIPTION,
  EMPTY_FILTERS,
  EMPTY_TITLE,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
  TYPE_FILTERS,
  TYPE_META,
  filterSummary,
  matchesSeller,
  perDay,
  periodText,
  rentPriceOf,
  searchValueOf,
  sellerLabel,
  won,
  ymdhm,
  type Order,
  type OrderFilters,
  type OrderSearchField,
  type OrderType,
} from "./OrderListPage.data";

/** 이 화면의 모집단 — 반품이 걸린 처리단위. `ORDERS` 가 이미 결제 최신순이다 */
export const RETURNS = ORDERS.filter((order) => order.claim?.type === "return");

/** 주문번호 링크가 가는 반품 상세 — `/orders-return/{처리단위}` (원본 `rmaReturn`/`rentRmaReturn`) */
export const RETURN_DETAIL_PATH = "/orders-return";

/**
 * 상태 셀렉트 — 원본 `FLOW_STEPS['반품']` 10단계, 순서 그대로.
 * 주문 목록과 달리 **유형에 따라 갈리지 않는다**(렌트·판매 반품이 같은 흐름이다).
 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  ...CLAIM_FLOW.return.map((value) => ({
    value,
    label: STATUS_META[value].label,
  })),
];

/**
 * 판매자 셀렉트 — 주문 목록과 같은 형식(사용자 결정 2026-10-19: 라디오 + 셀러 지정 → 셀렉트 하나).
 * 셀러명은 **반품 모집단에 나오는 셀러**에서 뽑는다 — 고르면 늘 0건인 셀러를 내놓지 않는다.
 */
const SELLER_NAMES = [
  ...new Set(
    RETURNS.filter((order) => order.sellerKind === "seller").map(
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
 * URL 쿼리 → 초기 필터 — 주문 목록과 **같은 파라미터·같은 보정**
 *
 * | 파라미터     | 뜻      | 값                                   |
 * | ------------ | ------- | ------------------------------------ |
 * | `stat`       | 유형    | `렌트` · `판매` (없거나 모르면 렌트) |
 * | `flow`       | 상태    | `반품 수거중` · `재반송` …           |
 * | `owner`      | 판매자  | `본사` · `셀러`                      |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때)           |
 * | `q`          | 검색어  | 주문번호로 찾는다                    |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD`      |
 *
 * ⚠️ v0.4 에는 URL 해석이 없다(필터는 메모리) — 우리 앱 쪽 확장이고, 주문 목록과 맞춘다.
 * ====================================================================== */

const TYPE_BY_LABEL: Record<string, OrderType> = Object.fromEntries(
  TYPE_FILTERS.map((item) => [item.label, item.value]),
);

/**
 * `재반송` → `returnResend`. **이 화면의 선택지 안에서만** 뒤집는다 —
 * 「환불 처리중」(취소에도)·「재반송」(교환에도)은 글자가 같아 전체 `STATUS_META` 에서 뒤집으면 덮인다.
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
 *   · `owner=본사&sellerName=…` → 셀러 지정을 버린다 · 모르는 셀러명 → 「셀러 전체」
 *   · 종료일만 있으면 시작일이 없어 기간을 걸지 않는다
 */
export function filtersFromQuery(params: URLSearchParams): OrderFilters {
  const owner = params.get("owner");
  const sellerName = params.get("sellerName") ?? "";
  const from = parseDay(params.get("paidAt_from"));
  const to = parseDay(params.get("paidAt_to"));

  return {
    type: TYPE_BY_LABEL[params.get("stat") ?? ""] ?? DEFAULT_TYPE,
    status: STATUS_BY_LABEL[params.get("flow") ?? ""] ?? "all",
    seller:
      owner === "본사"
        ? SELLER_HQ
        : owner === "셀러"
          ? SELLER_NAMES.includes(sellerName)
            ? sellerName
            : SELLER_ANY
          : SELLER_ALL,
    searchField: "orderNo",
    keyword: params.get("q") ?? "",
    period: from ? { from, to } : undefined,
  };
}
