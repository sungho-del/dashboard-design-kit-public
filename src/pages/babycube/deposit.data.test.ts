import { describe, expect, it } from "vitest";
import { depositOf } from "./deposit.data";
import { claimStatementOf, depositStatusOf } from "./OrderDetailPage.data";
import { DEMO_TODAY, ORDERS, type Order } from "./OrderListPage.data";

/*
 * 보증금 순수 함수 — 기대값은 사례표(scratchpad `settle-cases.md`)의 손계산이다.
 */

const order = (id: string) => ORDERS.find((item) => item.id === id)!;
const of = (id: string) => depositOf(order(id))!;

describe("정상 반납 — 차감액으로 종결 3종", () => {
  it("파손(복원불가) 25,000원 차감 → 일부환급 55,000원 (U-R30)", () => {
    expect(of("U-R30")).toEqual({
      status: "partialRefund",
      deposit: 80_000,
      deduction: 25_000,
      refund: 55_000,
      changedAt: "2026-09-19 16:00",
      done: true,
    });
  });

  it("분실 — 차감 = 보증금 → 전액차감 0원 (U-R31)", () => {
    expect(of("U-R31")).toMatchObject({
      status: "fullDeduct",
      deduction: 40_000,
      refund: 0,
    });
  });

  it("안심케어 가입 + 복원가능 파손은 차감하지 않는다 → 전액환급 (U-R28)", () => {
    expect(of("U-R28")).toMatchObject({
      status: "fullRefund",
      deduction: 0,
      refund: 80_000,
    });
    /* 셀러가 차감을 적어 왔어도 본사 부담이라 0 이다 */
    const charged: Order = { ...order("U-R28"), deduction: 18_000 };
    expect(depositOf(charged)?.deduction).toBe(0);
  });

  it("차감은 보증금 한도 안이다", () => {
    const over: Order = { ...order("U-R30"), deduction: 200_000 };
    expect(depositOf(over)).toMatchObject({
      status: "fullDeduct",
      deduction: 80_000,
      refund: 0,
    });
  });

  it("본사 렌트도 같은 규칙이다 (U-R32 전액환급)", () => {
    expect(of("U-R32")).toMatchObject({
      status: "fullRefund",
      refund: 50_000,
      changedAt: "2026-09-22 16:00",
    });
  });

  it("검수완료는 환급대기, 그 전은 점유중(변경일 없음)", () => {
    expect(of("U-R17")).toMatchObject({
      status: "pendingRefund",
      refund: 70_000,
      changedAt: "2026-10-12 11:00",
      done: false,
    });
    expect(of("U-R16")).toMatchObject({ status: "holding", changedAt: null });
  });
});

describe("클레임 — 기존 분기를 지킨다", () => {
  it("렌트 무료 취소: 완료 = 전액환급 · 환불 처리중 = 환급대기", () => {
    expect(of("U-R24")).toMatchObject({ status: "fullRefund", refund: 90_000 });
    expect(of("U-R23")).toMatchObject({
      status: "pendingRefund",
      refund: 90_000,
    });
  });

  it("판매자 귀책 반품 완료 → 전액환급 (U-R27)", () => {
    expect(of("U-R27")).toMatchObject({
      status: "fullRefund",
      deduction: 0,
      refund: 130_000,
    });
  });

  it("고객 귀책 반품 — 배송비를 한 번만 뺀다, 진행 중이면 예정액에", () => {
    /* U-R26 LB846102 — 보증금 150,000 − 반품 배송비 8,000 (수거완료 · 점유중) */
    expect(of("U-R26")).toMatchObject({
      status: "holding",
      deduction: 8_000,
      refund: 142_000,
    });
    /* 완료되면 금액으로 종결 — U-R27 을 고객 귀책으로 바꾼 예: 130,000 − 6,000 */
    const base = order("U-R27");
    const customer: Order = {
      ...base,
      claim: { ...base.claim!, fault: "customer" },
    };
    expect(depositOf(customer)).toMatchObject({
      status: "partialRefund",
      deduction: 6_000,
      refund: 124_000,
    });
    /* 배송비 0원이면 고객 귀책이라도 전액환급 */
    expect(depositOf({ ...customer, returnFee: 0 })?.status).toBe("fullRefund");
  });

  it("판매는 보증금이 없다", () => {
    expect(depositOf(order("U-S01"))).toBeNull();
  });
});

describe("주문 상세와 같은 값", () => {
  it("모든 렌트 처리단위에서 주문 상세의 보증금 상태 = 보증금 함수", () => {
    ORDERS.filter((item) => item.type === "rent").forEach((item) => {
      expect(depositStatusOf(item)).toBe(depositOf(item)!.status);
    });
  });

  it("클레임 명세의 보증금 반환액이 보증금 함수와 같다 — 배송비를 두 번 빼지 않는다", () => {
    const total = (id: string) =>
      claimStatementOf(order(id)).find((line) => line.tone === "total")?.value;
    expect(total("U-R26")).toBe("142,000원");
    expect(total("U-R27")).toBe("130,000원");
  });
});

describe("안심케어 청구 — 가입·검수와 같은 처리단위", () => {
  it("청구는 가입한 렌트의 복원가능 파손에만, 검수 뒤에, 시연 기준일 안에 있다", () => {
    const claimed = ORDERS.filter((item) => item.care?.claim);
    expect(claimed.map((item) => item.id).sort()).toEqual(
      ["U-R18", "U-R19", "U-R28", "U-R29"].sort(),
    );
    claimed.forEach((item) => {
      const claim = item.care!.claim!;
      expect(item.type).toBe("rent");
      expect(item.inspection).toBe("repairable");
      expect(claim.claimedAt > item.inspectedAt!).toBe(true);
      expect(
        (claim.decidedAt ?? claim.claimedAt) <= `${DEMO_TODAY} 23:59`,
      ).toBe(true);
      /* 승인·접수·반려 모두 보증금은 차감 없이 전액환급(원본 — 반려 건도 원본대로) */
      expect(depositOf(item)).toMatchObject({
        status: "fullRefund",
        deduction: 0,
      });
    });
  });
});
