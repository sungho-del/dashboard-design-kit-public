import type { CalcBlock } from "../babycube/CalcBreakdown";
import { PAYORDERS, UNITS, type PayOrder } from "./seed/orders.data";
import { STORE } from "./seed/store.data";
import { won } from "./OrderDetailsPage.labels";

export * from "./OrderDetailsPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./OrderDetailsPage.labels`(개발 요청 2026-11-12 46번) */

export const findPayOrder = (no: string) => PAYORDERS.find((o) => o.no === no);
/**
 * 이 결제의 **내 스토어 처리단위만** — 셀러는 한 결제의 다른 셀러·본사 몫을 볼 수 없다
 * (develop 은 서버가 내 스토어 유닛만 준다 · 개발 요청 2026-11-12 14번)
 */
export const unitsOf = (no: string) =>
  UNITS.filter(
    (u) => u.no === no && u.owner === "입점사" && u.seller === STORE.name,
  );

/** 결제 요약 — develop 두 줄(내 스토어 유닛 수 · 내 스토어 유닛 결제 합계). 주문 전체 합계·보증금 줄은 없다 */
export function summaryBlocks(o: PayOrder): CalcBlock[] {
  const us = unitsOf(o.no);
  return [
    {
      key: "sum",
      lines: [
        { key: "count", label: "내 스토어 유닛 수", value: `${us.length}건` },
      ],
    },
    {
      key: "total",
      emphasis: true,
      lines: [
        {
          key: "total",
          label: "내 스토어 유닛 결제 합계",
          value: won(us.reduce((a, u) => a + u.amt, 0)),
          kind: "total",
        },
      ],
    },
  ];
}
