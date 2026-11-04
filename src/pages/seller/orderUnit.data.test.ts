import { GOLDEN_UNITS } from "./orderUnit.golden";
import {
  couponOf,
  courierOf,
  historyOf,
  optionsOf,
  orderStat,
  pointOf,
  productRef,
  salePayTotal,
  shipFeeOf,
  stageIdx,
  unitTime,
} from "./orderUnit.data";
import { UNITS } from "./seed/orders.data";

/**
 * 처리단위 파생값 — **원본 함수가 낸 값(정답)과 183건 전부 같은가.**
 * 원본은 구성품·쿠폰·시각을 주문번호 해시로 만든다. 식 하나가 어긋나면 목록·상세·정산 숫자가
 * 조용히 원본과 달라지므로, 표본이 아니라 전수로 본다.
 */
const golden = new Map(GOLDEN_UNITS.map((g) => [g.id, g]));
const sale = UNITS.filter((u) => u.type === "판매");

describe("처리단위 파생값 = 원본", () => {
  it("정답이 처리단위 전부를 덮는다", () => {
    expect(golden.size).toBe(UNITS.length);
  });

  it.each(UNITS.map((u) => [u.id, u] as const))(
    "%s — 상품 짝 · 옵션 · 배송비 · 단계 · 시각 · 택배사 · 처리 이력",
    (_, u) => {
      const g = golden.get(u.id)!;
      expect(productRef(u).id ?? null).toBe(g.refId);
      expect(optionsOf(u).map((o) => [o.name, Number(o.add) || 0])).toEqual(
        g.consts,
      );
      expect(shipFeeOf(u)).toBe(g.shipFee);
      expect(stageIdx(u)).toBe(g.stageIdx);
      expect(orderStat(u)).toBe(g.orderStat);
      expect([0, 1, 1.5, 2, 3, 4, 5, 6].map((k) => unitTime(u, k))).toEqual(
        g.t,
      );
      expect(courierOf(u)).toBe(g.courier);
      /* 원본 이력은 클레임 단계까지 붙는다 — 클레임 없는 건만 여기서 본다(클레임은 클레임 묶음에서) */
      if (!u.req) expect(historyOf(u)).toEqual(g.history);
    },
  );

  it.each(sale.map((u) => [u.id, u] as const))(
    "%s (판매) — 쿠폰 · 포인트 · 결제금액",
    (_, u) => {
      const g = golden.get(u.id)!;
      expect(couponOf(u)).toBe(g.coupon);
      expect(pointOf(u)).toBe(g.point);
      expect(salePayTotal(u)).toBe(g.payTotal);
    },
  );
});
