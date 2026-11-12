import type { CalcBlock } from "../babycube/CalcBreakdown";
import { PAYORDERS, UNITS, type PayOrder } from "./seed/orders.data";
import { won } from "./OrderDetailsPage.labels";

export * from "./OrderDetailsPage.labels";

/* 예시 데이터(`seed/`)에 기대는 것만 여기 둔다 — 행 목록 · 시드 조회 · 시드로 계산하는 값. 라벨·상수·문구·포맷터는 `./OrderDetailsPage.labels`(개발 요청 2026-11-12 46번) */

export const findPayOrder = (no: string) => PAYORDERS.find((o) => o.no === no);
export const unitsOf = (no: string) => UNITS.filter((u) => u.no === no);

export function summaryBlocks(o: PayOrder): CalcBlock[] {
  const us = unitsOf(o.no);
  const sum = (type: string) =>
    us.filter((u) => u.type === type).reduce((a, u) => a + u.amt, 0);
  return [
    {
      key: "sum",
      lines: [
        { key: "sale", label: "판매 합계", value: won(sum("판매")) },
        { key: "rent", label: "렌탈료 합계", value: won(sum("렌트")) },
        {
          key: "dep",
          label: "보증금",
          value: won(us.reduce((a, u) => a + (u.dep || 0), 0)),
        },
      ],
    },
    {
      key: "total",
      emphasis: true,
      lines: [
        { key: "total", label: "결제 합계", value: won(o.amt), kind: "total" },
      ],
    },
  ];
}
