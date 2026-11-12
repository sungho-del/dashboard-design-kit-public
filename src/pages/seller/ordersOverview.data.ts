import type { DateRange } from "../../components/ui";
import { CLAIM_DONE } from "./claim.labels";
import { FLOW_STEPS, flowCatOf, flowStatOf } from "./orderUnit.labels";
import { careLabelOf } from "./processList.data";
import type { OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 주문 통합 관리 공용 **도메인 계약** — 판매(SO-ORD-003) · 렌트(SO-ORD-004)가 이 꼴로 설정을 준다.
 * 뼈대는 `OrdersOverview.tsx`, 화면별 설정은 `SaleOrdersPage.data.ts` · `RentOrdersPage.data.ts`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleOrders|rentOrders`(3913~3922) · `FILTERS.saleOrders|rentOrders`(2373·2442) ·
 * `orderAllTable`(3866) · `orderAllStats`(3901) · `orderFlowOpts`(1566) — 원본도 두 화면이 한 표·한 집계를 쓴다.
 *
 * | 설정        | 판매                         | 렌트                                   |
 * | ----------- | ---------------------------- | -------------------------------------- |
 * | 처리구분    | 판매 · 취소 · 반품 · 교환     | 렌트 · 취소 · 반품(교환 없음 · H-11)    |
 * | 검색조건    | 배송 방법                    | 배송 방법 + **안심케어**               |
 * | 표          | 11열                         | + **이용기간 ↕** · 상품명 옆 안심케어   |
 * | 주문번호 →  | 발주 · 배송 · 클레임 상세     | 렌트 발주 · 배송 · 대여·연체 · 검수·반납 · 클레임 |
 *
 * ## 원본을 그대로 둔 것
 * - **조회 전용** — 상태변경 버튼이 없다(전이 실행 지점은 처리 메뉴 하나뿐 · UI-313). 행 체크박스는 선택분 엑셀용(개발 요청 13번)
 * - 상태 카드가 아니라 **읽기 전용 집계 타일**(카드를 두면 [전체]가 성립하지 않는다) · 세는 대상은 검색 결과
 * - 주문번호를 누르면 그 건을 **지금 담당하는 메뉴의 상세**로 간다(클레임이 걸리면 그 클레임 메뉴)
 * - 왼쪽 고정 열 없음 — 표 전체가 한 덩어리로 가로 스크롤(원본 2026-08-06 사용자 지시)
 *
 * ## 원본과 다르게 둔 곳
 * - 안심케어(원본 다중 칩)는 **하나만 고르는 칸**(값이 둘뿐이라 결과가 같다)
 * - 처리구분은 **체크박스 묶음(복수)** — develop 이 「취소+반품」 같은 조합 검색을 지키려고 복수로 둔다(개발 요청 2026-11-12 13번).
 *   아무것도 안 고르면 전체 · 처리구분을 바꿔 고른 처리상태가 선택지에서 빠지면 처리상태를 푼다
 * ====================================================================== */

export interface OrdersOverviewConfig {
  title: string;
  /** 모집단 — 원본 `SALE_UNITS()` · `RENT_UNITS()`(판매자를 거르지 않는다 · 기획 확인) */
  units: OrderUnit[];
  /** 처리구분 — 원본 `ORDER_CATS` */
  cats: readonly string[];
  /** 렌트 — 안심케어 검색 · 이용기간 열 · 상품명 옆 안심케어 */
  rent?: boolean;
  /** 주문번호 목적지 — 원본 `orderHomeScr` → `SCR_DETAIL` */
  homePathOf: (u: OrderUnit) => string;
}

export const DATE_FIELDS = [
  { value: "orderedAt", label: "결제일" },
  { value: "confirmedAt", label: "주문 확인일" },
] as const;

/**
 * 처리상태 선택지 — 원본 `orderFlowOpts`: 고른 처리구분들의 단계만, 없으면 전 계열.
 * 「배송 지연」은 표준 단계에 없지만 어드민에 실재하는 상태라 「배송 준비」 다음에 끼운다(원본)
 */
export function flowOptionsOf(
  cats: readonly string[],
  chosen: readonly string[],
) {
  const picked = (chosen.length ? chosen : cats).filter((c) => FLOW_STEPS[c]);
  const list: string[] = [];
  picked.forEach((c) =>
    FLOW_STEPS[c].forEach((s) => {
      if (!list.includes(s)) list.push(s);
      if (s === "배송 준비" && !list.includes("배송 지연"))
        list.push("배송 지연");
    }),
  );
  return [
    { value: "", label: "처리상태 전체" },
    ...list.map((s) => ({ value: s, label: s })),
  ];
}

export const SHIP_WAYS = [
  { value: "all", label: "배송 방법 전체" },
  { value: "택배", label: "택배" },
  { value: "방문 수령", label: "방문 수령" },
] as const;

/** 검색 대상 — 원본 `search.fieldOpts` 순서(판매·렌트 같다). 「전체」는 나머지를 모두 훑는다 */
export const SEARCH_FIELDS = [
  { value: "all", label: "전체" },
  { value: "no", label: "주문번호" },
  { value: "mem", label: "구매자명" },
  { value: "email", label: "구매자 ID" },
  { value: "receiver", label: "수령인" },
  { value: "receiverTel", label: "수령인 연락처" },
  { value: "code", label: "상품코드" },
  { value: "prod", label: "상품명" },
  { value: "invoice", label: "송장번호" },
] as const;

export interface OrderFilters {
  dateField: string;
  period?: DateRange;
  /** 처리구분 — 복수 · 비면 전체 */
  cats: string[];
  shipWay: string;
  care: string;
  flow: string;
  searchField: string;
  keyword: string;
}
export const EMPTY_FILTERS: OrderFilters = {
  dateField: "orderedAt",
  period: undefined,
  cats: [],
  shipWay: "all",
  care: "all",
  flow: "",
  searchField: "all",
  keyword: "",
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (text: unknown) =>
  typeof text === "string" && text ? text.slice(0, 10).replace(/\./g, "-") : "";

/** 원본 `applyFilters` — 기간 → 처리구분 → 배송 방법 → 안심케어 → 처리상태 → 검색 */
export function matchesFilters(u: OrderUnit, f: OrderFilters) {
  if (f.period?.from) {
    const day = dayOf(u[f.dateField as keyof OrderUnit]);
    if (!day || day < ymd(f.period.from)) return false;
    if (day > ymd(f.period.to ?? f.period.from)) return false;
  }
  if (f.cats.length && !f.cats.includes(flowCatOf(u))) return false;
  if (f.shipWay !== "all" && u.shipWay !== f.shipWay) return false;
  if (f.care !== "all" && careLabelOf(u) !== f.care) return false;
  if (f.flow && flowStatOf(u) !== f.flow) return false;
  const q = f.keyword.trim().toLowerCase();
  if (q) {
    const fields =
      f.searchField === "all"
        ? SEARCH_FIELDS.map((o) => o.value).filter((v) => v !== "all")
        : [f.searchField];
    if (
      !fields.some((k) =>
        String(u[k as keyof OrderUnit] ?? "")
          .toLowerCase()
          .includes(q),
      )
    )
      return false;
  }
  return true;
}

/**
 * 처리구분 체크 하나를 켜고 끈다 — 처리구분 순서(원본 `ORDER_CATS`)로 다시 적고,
 * 고른 처리상태가 새 선택지에 없으면 푼다(develop `catToggle`)
 */
export function catToggle(
  f: OrderFilters,
  all: readonly string[],
  cat: string,
): Partial<OrderFilters> {
  const cats = all.filter((c) =>
    c === cat ? !f.cats.includes(c) : f.cats.includes(c),
  );
  const keep =
    !f.flow || flowOptionsOf(all, cats).some((o) => o.value === f.flow);
  return keep ? { cats } : { cats, flow: "" };
}

const dot = (d: Date) => ymd(d).replace(/-/g, ".");

/** 검색조건 요약 — 원본 `fbSummary` 꼴 */
export function filterSummary(f: OrderFilters) {
  const out: string[] = [];
  const dateLabel = DATE_FIELDS.find((d) => d.value === f.dateField)?.label;
  if (f.period?.from)
    out.push(
      `${dateLabel} ${dot(f.period.from)}~${dot(f.period.to ?? f.period.from)}`,
    );
  if (f.cats.length) out.push(`처리구분 ${f.cats.join(", ")}`);
  if (f.shipWay !== "all") out.push(`배송 방법 ${f.shipWay}`);
  if (f.care !== "all") out.push(`안심케어 ${f.care}`);
  if (f.flow) out.push(`처리상태 ${f.flow}`);
  if (f.keyword.trim()) out.push(`검색어 "${f.keyword.trim()}"`);
  return out.length ? out.join(" · ") : "조건 없음 (전체)";
}

/**
 * 종결 — 더 진행할 단계가 없는 값. 원본 `ORDER_DONE`: 정규식으로 가르지 않는다
 * (`/완료$/` 는 중간 단계 「배송 완료」·「반품 수거완료」까지 빨아들였다 — 원본 주석)
 */
const ORDER_DONE = [
  ...CLAIM_DONE,
  "구매확정",
  "반납완료",
  "반품 거부",
  "반품 반려",
  "교환 거부",
  "교환 반려",
];

/** 집계 타일 4장 — 원본 `orderAllStats`. 검색 결과를 센다(원본 2026-08-06 사용자 지시) */
export function orderStats(units: OrderUnit[]) {
  const done = (u: OrderUnit) => ORDER_DONE.includes(flowStatOf(u));
  const claim = (u: OrderUnit) => !!u.req?.stat;
  const n = (f: (u: OrderUnit) => boolean) => units.filter(f).length;
  return [
    { label: "전체 주문", value: units.length },
    { label: "진행 중", value: n((u) => !claim(u) && !done(u)) },
    {
      label: "클레임 진행 중",
      value: n((u) => claim(u) && !done(u)),
      warning: true,
    },
    { label: "종결", value: n(done) },
  ];
}

export const PAGE_SIZE = 10;
export const PAGE_SIZES = [10, 20, 50, 100];
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export const COPY = {
  excelEmpty: "다운로드할 데이터가 없습니다.",
  excel: (n: number) => `${n}건을 엑셀(CSV)로 다운로드했습니다.`,
  emptyTitle: "해당 조건의 항목이 없습니다.",
  emptyDescription: "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
} as const;
