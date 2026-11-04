import { flowStatOf } from "./orderUnit.data";
import {
  flowOptionsOf,
  type OrdersOverviewConfig,
} from "./ordersOverview.data";
import { UNITS, type OrderUnit } from "./seed/orders.data";

/* =========================================================================
 * 렌트 주문 통합 관리(SO-ORD-004) — **도메인 층**(화면 설정). 뼈대는 공용 `OrdersOverview.tsx`.
 *
 * 원본 = 기획 v0.4 `SCREENS.rentOrders`(3918) · `FILTERS.rentOrders`(2442) · `orderHomeScr`(3846).
 * 정답 대조: `rentOrders.golden.ts`(원본에서 렌트 처리단위 94건마다 뽑은 처리상태·담당 메뉴).
 * ====================================================================== */

/** 원본 `RENT_UNITS()` — 렌트 처리단위 전부 */
export const RENT_ORDER_UNITS: OrderUnit[] = UNITS.filter(
  (u) => u.type === "렌트",
);

/** 처리구분 — 원본 `ORDER_CATS.rentOrders`(렌트에는 교환이 없다 · H-11) */
export const RENT_CATS = ["렌트", "취소", "반품"] as const;
export const rentFlowOptions = (cat: string) => flowOptionsOf(RENT_CATS, cat);

/**
 * 주문번호 목적지 — 원본 `orderHomeScr` 렌트 갈래. 클레임이면 취소/반품 메뉴, 아니면 처리상태(`flowStat`)로
 * 발주 · 배송 · 대여·연체 · 검수·반납
 */
export function rentHomePathOf(u: OrderUnit) {
  const t = u.req?.stat ? u.req.type : null;
  const st = flowStatOf(u);
  const base = t
    ? t === "취소"
      ? "/rent-cancel"
      : "/rent-rma"
    : ["신규 주문", "배송 준비", "배송 지연"].includes(st)
      ? "/rent-list"
      : st === "배송중"
        ? "/rent-dispatch"
        : ["대여중", "대여중(연장)", "연체중"].includes(st)
          ? "/rent-use"
          : "/rent-insp-return";
  return `${base}/${u.id}`;
}

export const RENT_ORDERS: OrdersOverviewConfig = {
  title: "렌트 주문 통합 관리",
  units: RENT_ORDER_UNITS,
  cats: RENT_CATS,
  rent: true,
  homePathOf: rentHomePathOf,
};
