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
  taxInvoiceOf,
  taxStatOf,
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

  /* 기획 답 2026-11-06 §2 #39 — 정산 지급 상태가 아니라 본사 발행 상태를 따른다 */
  it("세금계산서 상태는 본사 발행 상태에서 정한다 — 미발행 → 발행예정 · 발행완료 → 수취완료", () => {
    expect(taxStatOf("미발행")).toBe("발행예정");
    expect(taxStatOf("발행완료")).toBe("수취완료");
    expect(TAX_INVOICES.map((t) => t.issue)).toEqual([
      "미발행",
      "발행완료",
      "발행완료",
    ]);
    for (const t of TAX_INVOICES) expect(t.stat).toBe(taxStatOf(t.issue));
    /* 지급 상태와 발행 상태가 어긋나도 발행 상태를 따른다 */
    const paid = STATEMENTS.find((x) => x.stat === "지급완료")!;
    const unpaid = STATEMENTS.find((x) => x.stat !== "지급완료")!;
    expect(taxInvoiceOf(paid, "미발행").stat).toBe("발행예정");
    expect(taxInvoiceOf(unpaid, "발행완료").stat).toBe("수취완료");
  });

  /* 기획 답 2026-11-06 §2 #7 — 가산 = 안심케어 보전 + 셀러 귀속 3종 · 지급액 = 매출 − 차감 + 가산 */
  it("명세서 가산 — 이번 회차 5,400원 · 지난 회차 0 · 지급액과 맞는다", () => {
    expect(STATEMENTS.map((s) => s.add)).toEqual([5400, 0, 0]);
    for (const s of STATEMENTS) expect(s.gmv - s.ded + s.add).toBe(s.payout);
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

  /** 부록 A A9-1 · B4-1 · B7 · A3 · B4-2 · A20 (개발 §3-2-1 — 입점사 매출 정산도 같이) */
  it("확정 거래액은 「판매가」 · PG 수수료는 보조 글자 없이 · 도움말은 바뀐 문구", () => {
    const lines = settleBlocksOf(SUMMARY).flatMap((b) => b.lines);
    const line = (key: string) => lines.find((l) => l.key === key);
    expect([line("list")?.hint, line("list")?.tip]).toEqual([
      "판매가",
      "전월에 구매확정·반납완료된 거래의 합계입니다.",
    ]);
    expect([line("pg")?.hint, line("pg")?.tip]).toEqual([
      undefined,
      "결제대행사에 내는 수수료입니다.",
    ]);
    expect(SETTLE_TIP.point).toBe(
      "포인트 사용분은 본사가 부담합니다. 셀러는 판매가 기준으로 정산받으므로 지급액에는 영향이 없습니다.",
    );
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
