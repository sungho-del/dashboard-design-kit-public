import { flowStatOf } from "./orderUnit.labels";
import { flowOptionsOf } from "./ordersOverview.data";
import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `SaleOrdersPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./SaleOrdersPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

/** 처리구분 — 원본 `ORDER_CATS.saleOrders` */
export const CATS = ["판매", "취소", "반품", "교환"] as const;
export const flowOptions = (cat: string) =>
  flowOptionsOf(CATS, cat ? [cat] : []);

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
