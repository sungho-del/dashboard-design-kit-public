import { flowStatOf } from "./orderUnit.labels";
import { flowOptionsOf } from "./ordersOverview.data";
import type { OrderUnit } from "./seed/orders.data";

/* 셀러 `RentOrdersPage.data.ts` 의 라벨·상수·문구·포맷터 — 예시 데이터(`seed/`)를 값으로 불러오지 않는다(개발 요청 2026-11-12 46번).
 * 화면은 지금처럼 `./RentOrdersPage.data` 에서 가져온다(그 파일이 이 파일을 다시 내보낸다). 예시 배열에 기대는 것만 그쪽에 남았다. */

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
