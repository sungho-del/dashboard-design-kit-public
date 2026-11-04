import { flowStatOf } from "./orderUnit.data";
import {
  flowOptionsOf,
  type OrdersOverviewConfig,
} from "./ordersOverview.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 주문 통합 관리(SO-ORD-003) — **도메인 층**(화면 설정). 뼈대는 공용 `OrdersOverview.tsx` ·
 * 계약·검색·집계는 `ordersOverview.data.ts`.
 *
 * 원본 = 기획 v0.4 `SCREENS.saleOrders`(3913) · `FILTERS.saleOrders`(2373) · `orderHomeScr`(3846).
 * 정답 대조: `saleOrders.golden.ts`(원본에서 판매 처리단위 89건마다 뽑은 처리상태·담당 메뉴).
 * ====================================================================== */

/** 원본 `SALE_UNITS()` — 판매 처리단위 전부(판매자를 거르지 않는다 · 본사 자체 건도 섞인다 · 기획 확인) */
export const SALE_ORDER_UNITS: OrderUnit[] = UNITS.filter(
  (u) => u.type === "판매",
);

/** 처리구분 — 원본 `ORDER_CATS.saleOrders` */
export const CATS = ["판매", "취소", "반품", "교환"] as const;
export const flowOptions = (cat: string) => flowOptionsOf(CATS, cat);

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

export const SALE_ORDERS: OrdersOverviewConfig = {
  title: "주문 통합 관리",
  units: SALE_ORDER_UNITS,
  cats: CATS,
  homePathOf,
};
