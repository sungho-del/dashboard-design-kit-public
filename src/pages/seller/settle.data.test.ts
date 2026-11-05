import { describe, expect, it } from "vitest";
import { UNITS } from "./seed/orders.data";
import {
  DEPOSIT_LIST,
  DEPOSIT_UNITS,
  SETTLE_TIP,
  SETTLE_TX,
  STATEMENTS,
  SUMMARY,
  TAX_INVOICES,
  depBackOf,
  depStatOf,
  depositStats,
  settleBlocksOf,
  settleCouponOf,
  settlePointOf,
  txFootOf,
  txNoteOf,
  txNoteText,
  txStatusOf,
} from "./settle.data";
import {
  DEPOSIT_GOLDEN,
  SETTLE_SUM_GOLDEN,
  SETTLE_TX_GOLDEN,
} from "./settle.golden";

describe("정산 — 원본 정답 대조", () => {
  it("거래 내역 156건이 원본 정렬 순서·금액·상태·정산 반영·쿠폰·포인트까지 같다", () => {
    expect(
      SETTLE_TX.map((u) => [
        u.id,
        u.amt,
        txStatusOf(u),
        txNoteText(txNoteOf(u)),
        settleCouponOf(u),
        settlePointOf(u),
      ]),
    ).toEqual(SETTLE_TX_GOLDEN);
  });

  it("2026.06 명세 합계가 원본 settleMyData 와 같다", () => {
    /* 셀러 귀속 3종(판정 Q3 · 개발대로)은 원본에 없는 칸이라 대조에서 뺀다 — 예시 값은 0원 */
    const { units, penalty, pickup, shipping, ...rest } = SUMMARY;
    expect({ ...rest, included: units.length }).toEqual(SETTLE_SUM_GOLDEN);
    expect([penalty, pickup, shipping]).toEqual([0, 0, 0]);
  });

  it("각주 — 반영 14건 · 1,979,000원 · 제외 142건(원본 캡처)", () => {
    expect(txFootOf(SETTLE_TX)).toEqual({
      count: 14,
      amount: 1979000,
      excluded: 142,
    });
  });

  it("보증금 94건의 반환 예정액·상태·상태 변경일·목록 포함 여부가 같다", () => {
    const listed = new Set(DEPOSIT_LIST.map((u) => u.id));
    expect(
      DEPOSIT_UNITS.map((u) => [
        u.id,
        u.dep,
        depBackOf(u),
        depStatOf(u),
        u.depStatAt || "",
        listed.has(u.id),
      ]),
    ).toEqual(DEPOSIT_GOLDEN);
  });

  it("보증금 요약 4값 — 원본 캡처 458,600 · 27,500 · 20,500 · 5,000", () => {
    expect(depositStats()).toEqual({
      hold: 458600,
      pending: 27500,
      refunded: 20500,
      deducted: 5000,
    });
  });

  it("명세서 3행 · 세금계산서 3행 — 원본 캡처 숫자", () => {
    expect(
      STATEMENTS.map((s) => [s.no, s.gmv, s.ded, s.payout, s.stat]),
    ).toEqual([
      ["STM-2606", 1878500, 244205, 1639695, "확인요청"],
      ["STM-2605", 2841000, 398000, 2443000, "지급완료"],
      ["STM-2604", 2312000, 324000, 1988000, "지급완료"],
    ]);
    expect(
      TAX_INVOICES.map((t) => [
        t.no,
        t.supply,
        t.vat,
        t.supply + t.vat,
        t.stat,
      ]),
    ).toEqual([
      ["TX-2606", 187850, 18785, 206635, "발행예정"],
      ["TX-2605", 286560, 28656, 315216, "수취완료"],
      ["TX-2604", 233280, 23328, 256608, "수취완료"],
    ]);
  });
});

describe("정산 명세 묶음", () => {
  it("원본 줄 순서 — 0원 항목(환수·미회수)은 줄이 없다", () => {
    const blocks = settleBlocksOf(SUMMARY);
    expect(
      blocks.flatMap((b) => b.lines.map((l) => `${l.label}=${l.value}`)),
    ).toEqual([
      "확정 거래액=1,979,000원",
      "셀러 쿠폰=−100,500원",
      "정산 매출=1,878,500원",
      "판매 수수료=−187,850원",
      "PG 수수료=−56,355원",
      "안심케어 보전=+5,400원",
      "지급 예정액=1,639,695원",
      "포인트 사용분 본사 부담=21,400원",
    ]);
  });

  /** 본사 판정 Q3 · 부록 A B5(입점사 매출 정산도 같이) — 셀러 귀속 3줄은 0원 초과일 때만 ⓘ 와 함께 가산에 */
  it("셀러 귀속 3줄은 0원 초과일 때만 가산 묶음에 선다", () => {
    const addOf = (blocks: ReturnType<typeof settleBlocksOf>) =>
      blocks.find((b) => b.key === "add")?.lines ?? [];
    expect(addOf(settleBlocksOf(SUMMARY)).map((l) => l.key)).toEqual(["care"]);

    const lines = addOf(
      settleBlocksOf({
        ...SUMMARY,
        penalty: 1700,
        pickup: 5000,
        shipping: 3000,
      }),
    );
    expect(lines.map((l) => [l.label, l.hint, l.value, l.tip])).toEqual([
      ["안심케어 보전", "손상에 대한 본사 복원비", "+5,400원", SETTLE_TIP.care],
      ["위약금", "셀러 귀속", "+1,700원", SETTLE_TIP.penalty],
      ["픽업 요금", "셀러 귀속", "+5,000원", SETTLE_TIP.pickup],
      ["배송비", "셀러 귀속", "+3,000원", SETTLE_TIP.shipping],
    ]);
  });

  it("환수·미회수가 생기면 그 줄이 붙는다(지급액 0원 하한)", () => {
    const blocks = settleBlocksOf({
      ...SUMMARY,
      cancel: 2000000,
      payout: 0,
      unpaid: 120000,
    });
    const labels = blocks.flatMap((b) => b.lines.map((l) => l.label));
    expect(labels).toContain("취소·반품 차감");
    expect(labels.indexOf("미회수 잔액")).toBe(
      labels.indexOf("지급 예정액") + 1,
    );
  });

  it("모집단은 내 스토어 건만 — 본사 자체·다른 셀러 건이 섞이지 않는다", () => {
    expect(SETTLE_TX).toHaveLength(156);
    expect(
      SETTLE_TX.every((u) => u.owner === "입점사" && u.seller === "리틀베이비"),
    ).toBe(true);
    expect(UNITS.length).toBeGreaterThan(SETTLE_TX.length);
  });
});
