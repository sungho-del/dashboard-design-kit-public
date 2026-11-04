import type { DateRange } from "../../components/ui";
import { CLAIM_DONE } from "./claim.data";
import { FLOW_STEPS, flowCatOf, flowStatOf } from "./orderUnit.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 주문 통합 관리(SO-ORD-003) — **도메인 층**. 뼈대는 `SaleOrdersPage.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleOrders`(3913) · `FILTERS.saleOrders`(2373) · `orderAllTable`(3866) ·
 * `orderAllStats`(3901) · `orderHomeScr`(3846) · `orderFlowOpts`(1566) · `deriveFlow`(1580).
 * 정답 대조: `saleOrders.golden.ts`(원본에서 판매 처리단위 89건마다 뽑은 처리상태·담당 메뉴).
 *
 * | 갈아끼울 것   | 여기                                            |
 * | ------------- | ----------------------------------------------- |
 * | 모집단        | `SALE_ORDER_UNITS` (판매 처리단위 전부)          |
 * | 집계 타일     | `orderStats`                                    |
 * | 검색조건      | `DATE_FIELDS` · `CATS` · `flowOptions` · `SEARCH_FIELDS` |
 * | 주문번호 목적지 | `homePathOf` (지금 담당하는 처리 메뉴의 상세)   |
 *
 * ## 원본을 그대로 둔 것
 * - **조회 전용** — 상태변경 버튼·체크박스가 없다(전이 실행 지점은 처리 메뉴 하나뿐 · UI-313)
 * - 상태 카드가 아니라 **읽기 전용 집계 타일**(카드를 두면 [전체]가 성립하지 않는다) · 세는 대상은 검색 결과
 * - 주문번호를 누르면 그 건을 **지금 담당하는 메뉴의 상세**로 간다(클레임이 걸리면 그 클레임 메뉴)
 * - 왼쪽 고정 열 없음 — 표 전체가 한 덩어리로 가로 스크롤(원본 2026-08-06 사용자 지시)
 *
 * ## 원본과 다르게 둔 곳
 * - 처리구분(원본 다중 칩)은 **하나만 고르는 칸** — 본사 퍼블이 검색조건 줄의 칩·라디오를 셀렉트로 모은
 *   결정(2026-10-19)과 같다. 두 구분을 함께 거르는 조합(취소+반품)은 없어진다
 * ====================================================================== */

/** 원본 `SALE_UNITS()` — 판매 처리단위 전부(판매자를 거르지 않는다 · 본사 자체 건도 섞인다 · 기획 확인) */
export const SALE_ORDER_UNITS: OrderUnit[] = UNITS.filter(
  (u) => u.type === "판매",
);

export const DATE_FIELDS = [
  { value: "orderedAt", label: "결제일" },
  { value: "confirmedAt", label: "주문 확인일" },
] as const;

/** 처리구분 — 원본 `ORDER_CATS.saleOrders` */
export const CATS = ["판매", "취소", "반품", "교환"] as const;
export const CAT_OPTIONS = [
  { value: "", label: "처리구분 전체" },
  ...CATS.map((c) => ({ value: c, label: c })),
];

/**
 * 처리상태 선택지 — 원본 `orderFlowOpts`: 고른 처리구분의 단계만, 없으면 전 계열.
 * 「배송 지연」은 표준 단계에 없지만 어드민에 실재하는 상태라 「배송 준비」 다음에 끼운다(원본)
 */
export function flowOptions(cat: string) {
  const cats = (cat ? [cat] : [...CATS]).filter((c) => FLOW_STEPS[c]);
  const list: string[] = [];
  cats.forEach((c) =>
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

/** 검색 대상 — 원본 `search.fieldOpts` 순서. 「전체」는 나머지를 모두 훑는다 */
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
  cat: string;
  shipWay: string;
  flow: string;
  searchField: string;
  keyword: string;
}
export const EMPTY_FILTERS: OrderFilters = {
  dateField: "orderedAt",
  period: undefined,
  cat: "",
  shipWay: "all",
  flow: "",
  searchField: "all",
  keyword: "",
};

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayOf = (text: unknown) =>
  typeof text === "string" && text ? text.slice(0, 10).replace(/\./g, "-") : "";

/** 원본 `applyFilters` — 기간 → 처리구분 → 배송 방법 → 처리상태 → 검색 */
export function matchesFilters(u: OrderUnit, f: OrderFilters) {
  if (f.period?.from) {
    const day = dayOf(u[f.dateField as keyof OrderUnit]);
    if (!day || day < ymd(f.period.from)) return false;
    if (day > ymd(f.period.to ?? f.period.from)) return false;
  }
  if (f.cat && flowCatOf(u) !== f.cat) return false;
  if (f.shipWay !== "all" && u.shipWay !== f.shipWay) return false;
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

const dot = (d: Date) => ymd(d).replace(/-/g, ".");

/** 검색조건 요약 — 원본 `fbSummary` 꼴 */
export function filterSummary(f: OrderFilters) {
  const out: string[] = [];
  const dateLabel = DATE_FIELDS.find((d) => d.value === f.dateField)?.label;
  if (f.period?.from)
    out.push(
      `${dateLabel} ${dot(f.period.from)}~${dot(f.period.to ?? f.period.from)}`,
    );
  if (f.cat) out.push(`처리구분 ${f.cat}`);
  if (f.shipWay !== "all") out.push(`배송 방법 ${f.shipWay}`);
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

/**
 * 주문번호 목적지 — 원본 `orderHomeScr` → `SCR_DETAIL`. 클레임이 걸려 있으면 그 클레임 메뉴,
 * 아니면 **화면이 보여 주는 처리상태**(`flowStat`)로 발주/배송을 가른다(원본 주석: 저장값으로 가르면 엇갈린다)
 */
export function homePathOf(u: OrderUnit) {
  const t = u.req?.stat ? u.req.type : null;
  const base =
    t === "취소"
      ? "/sale-cancel"
      : t === "반품"
        ? "/sale-return"
        : t === "교환"
          ? "/sale-exchange"
          : ["신규 주문", "배송 준비", "배송 지연"].includes(flowStatOf(u))
            ? "/sale-proc"
            : "/shipping";
  return `${base}/${u.id}`;
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
