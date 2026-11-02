import type { DateRange, SelectOption } from "../../components/ui";
import {
  CLAIM_FLOW,
  NO_FILTER_TEXT,
  ORDERS,
  SEARCH_FIELDS,
  SELLER_ALL,
  SELLER_ANY,
  SELLER_HQ,
  STATUS_META,
  type Order,
  type OrderSearchField,
  type OrderStatus,
} from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S11 교환 목록 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `OrderExchangeListPage.tsx` (레이아웃·상호작용, 도메인 무관)
 * 기준 기획: **v0.4** `SCREENS.ordersExchange` → `ordersRmaScreen('ordersExchange','교환')`
 *   · `ordersFlatHead`/`ordersFlatRow` · `_ordersUnitFilter` · `FLOW_STEPS['교환']`
 *
 * ## 이 화면이 무엇인가
 * 교환이 걸린 **처리단위**를 조회하는 목록. 원본은 주문 목록과 **같은 함수**로 그린다 —
 * 다른 것은 셋뿐이다: ① 모집단(`u.req.type==='교환'`) ② 상태 선택지(`FLOW_STEPS['교환']`)
 * ③ 주문번호 링크가 가는 상세(`rmaExchange`).
 * 교환은 **판매 전용**이다(원본 FAQ·주석 · 렌트 교환 상세 라우트 없음) — 그래서 **유형 카드가
 * 없다**(원본 `OTYPE_SCR` 에서 교환 제외 · `dash=''`). 유형 **열**은 표에 그대로 있다.
 *
 * ## 샘플 — 주문 샘플에서 **거른다** (자체 샘플 없음)
 * 모집단은 `ORDERS` 의 교환 부분집합이다. 주문 목록·주문 상세와 **같은 처리단위**라
 * 같은 건이 화면마다 다른 값을 갖지 않는다(예: U-S12 교환 신청). 순서는 `ORDERS` 그대로
 * 결제 일시 최신순이다.
 * 타입·라벨·포맷터(`STATUS_META`·`won`·`perDay`…)는 주문 목록의 것을 **다시 내보낸다** —
 * 같은 글자가 화면마다 다른 색이면 안 된다(재반송·거부·반려 = `critical`).
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `EXCHANGES` 의 행은 `Order` 다 — `id`(처리단위 코드 · 행 key·선택·상세 경로) ·
 *   `date`(결제 일시 `YYYY-MM-DD HH:mm`) · `period`(판매는 빈 문자열)
 * - `STATUS_OPTIONS[0].value === "all"`, 나머지는 `CLAIM_FLOW.exchange` 와 값·순서가 같다
 * - `SELLER_OPTIONS` 의 셀러명은 **이 화면 모집단**에서 뽑는다 · 거르기는 `matchesSeller`
 * - `detailPathOf` 는 주문번호 링크의 목적지(`/orders-exchange/{처리단위}`, 원본 `orderRowDetail`)
 * - `filtersFromQuery` 는 **URL 쿼리 → 초기 필터**. 주문 목록과 같은 파라미터 이름
 * ---------------------------------------------------------------------- */

export {
  EMPTY_DESCRIPTION,
  EMPTY_TITLE,
  NO_FILTER_TEXT,
  PAGE_SIZE,
  PAGE_SIZES,
  SEARCH_FIELDS,
  SEARCH_PLACEHOLDER,
  STATUS_META,
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
} from "./OrderListPage.data";

/** 이 화면의 모집단 — 교환이 걸린 처리단위(판매만). 결제 일시 최신순 */
export const EXCHANGES: Order[] = ORDERS.filter(
  (order) => order.claim?.type === "exchange",
);

/** 교환 상세의 경로 머리 — 원본 `rmaExchange` (부모 목록 = 교환 목록) */
export const DETAIL_PATH = "/orders-exchange";

/** 주문번호 링크 → **그 처리단위의** 교환 상세 */
export const detailPathOf = (order: Order) => `${DETAIL_PATH}/${order.id}`;

/**
 * 판매자 셀렉트 — 주문 목록과 같은 방식(라디오 + 셀러 지정을 셀렉트 하나로 · 사용자 결정 2026-10-19).
 * 값: `all` 전체 · `hq` 본사 · `seller` 셀러 전체 · 그 밖은 **셀러명**.
 * 셀러명은 **이 화면 모집단**에서 뽑는다 — 교환 건이 없는 셀러를 고르면 늘 0건이다.
 */
const SELLER_NAMES = [
  ...new Set(
    EXCHANGES.filter((order) => order.sellerKind === "seller").map(
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

/** 상태 셀렉트 — 원본 `FLOW_STEPS['교환']` 10단계 그대로. 유형으로 갈리지 않는다 */
export const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "상태 전체" },
  ...CLAIM_FLOW.exchange.map((value) => ({
    value,
    label: STATUS_META[value].label,
  })),
];

/** 뼈대가 들고 있는 조회 조건 한 덩어리 — 유형 축이 없다 */
export interface ExchangeFilters {
  /** 판매자 셀렉트 값 — `SELLER_OPTIONS` 참고 */
  seller: string;
  status: string;
  searchField: OrderSearchField;
  keyword: string;
  period?: DateRange;
}

/** "초기화"가 되돌아가는 자리 — 전부 해제, 검색 대상은 주문번호 */
export const EMPTY_FILTERS: ExchangeFilters = {
  seller: SELLER_ALL,
  status: "all",
  searchField: "orderNo",
  keyword: "",
  period: undefined,
};

/* =========================================================================
 * URL 쿼리 → 초기 필터  (주문 목록과 같은 이름)
 *
 * | 파라미터     | 뜻      | 값                         |
 * | ------------ | ------- | -------------------------- |
 * | `flow`       | 상태    | `교환 신청` · `재반송` …   |
 * | `owner`      | 판매자  | `본사` · `셀러`            |
 * | `sellerName` | 셀러    | 셀러명 (`owner=셀러`일 때) |
 * | `q`          | 검색어  | 주문번호로 찾는다          |
 * | `paidAt_from` / `paidAt_to` | 결제일 구간 | `YYYY-MM-DD` |
 *
 * ⚠️ `stat`(유형)은 **읽지 않는다** — 이 화면에 유형 축이 없다. 한때 `stat` 을 상태로 읽었는데
 * v0.4 이전 근거였다(형제 셋과 같이 상태는 `flow`).
 * ====================================================================== */

/**
 * `재반송` → `exchangeResend`. **이 화면의 상태 선택지 안에서만** 뒤집는다 —
 * 「재반송」「환불 처리중」은 다른 클레임에도 같은 글자가 있어 한데 뒤집으면 키가 덮인다.
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
 * URL 쿼리를 읽어 초기 조회 조건을 만든다. 모르는 값은 **조용히 무시**한다 —
 * 남이 만든 링크로 들어오는 자리라, 오타 하나로 화면이 비면 안 된다.
 *   · `flow` 가 교환 상태가 아니면(예: 「환불 처리중」) 상태를 걸지 않는다
 *   · `owner=본사&sellerName=…` → 셀러 지정을 버린다 · 모르는 셀러명 → 셀러 전체
 *   · 종료일만 있으면 시작일이 없어 기간을 걸지 않는다
 */
export function filtersFromQuery(params: URLSearchParams): ExchangeFilters {
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

/** 접힌 검색조건의 요약 — 걸린 조건이 없으면 `NO_FILTER_TEXT` */
export const filterSummary = (filters: ExchangeFilters): string => {
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
