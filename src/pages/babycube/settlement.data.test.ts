import { describe, expect, it } from "vitest";
import { ORDERS, type Order } from "./OrderListPage.data";
import { PRODUCTS } from "./ProductListPage.data";
import { SELLERS } from "./SellerListPage.data";
import {
  HQ_SETTLEMENT,
  SELLER_SETTLEMENTS,
  SETTLEMENT_SUMMARY,
  STATEMENTS,
  TAX_INVOICES,
  findStatement,
  sellerSettlementsOf,
  taxInvoicesOf,
  settleTxOf,
} from "./settlement.data";

/*
 * 정산 계산 — 기대값은 사례표(scratchpad `settle-cases.md`)의 **원 단위 손계산**이다.
 * 계산 함수를 양쪽에서 다시 불러 비교하지 않는다.
 */

const row = (name: string) =>
  SELLER_SETTLEMENTS.find((item) => item.name === name)!;
const order = (id: string) => ORDERS.find((item) => item.id === id)!;
const tx = (name: string, id: string) =>
  row(name).transactions.find((item) => item.order.id === id)!;

describe("셀러별 정산 (2026.09)", () => {
  it.each([
    // 이름, 요율, 정산 매출, 수수료, PG, 환수, 보전, 지급액, 미회수, 반영 건
    ["베이비루", 12, 109_000, 13_080, 3_270, 0, 0, 92_650, 0, 1],
    ["리틀스텝", 11, 0, 0, 0, 77_400, 0, 0, 77_400, 0],
    ["아이랑", 8, 16_800, 1_344, 504, 0, 0, 14_952, 0, 1],
    ["맘스케어", 9.5, 14_000, 1_330, 420, 0, 0, 12_250, 0, 1],
    ["리틀베이비", 10, 84_000, 8_400, 2_520, 0, 0, 73_080, 0, 1],
    ["코지베이비", 13.5, 37_800, 5_103, 1_134, 0, 18_000, 49_563, 0, 1],
    ["아기별상사", 12, 190_000, 22_800, 5_700, 0, 0, 161_500, 0, 1],
    ["베베하우스", 9.8, 23_100, 2_264, 693, 0, 12_000, 32_143, 0, 1],
  ])(
    "%s — 요율 %s% · 매출 %s · 수수료 %s · PG %s · 환수 %s · 보전 %s → 지급 %s · 미회수 %s",
    (name, rate, revenue, fee, pg, clawback, care, payout, unpaid, count) => {
      const r = row(name as string);
      expect(r.rate).toBe(rate);
      expect(r.revenue).toBe(revenue);
      expect(r.fee).toBe(fee);
      expect(r.pg).toBe(pg);
      expect(r.clawback).toBe(clawback);
      expect(r.care).toBe(care);
      expect(r.payout).toBe(payout);
      expect(r.unpaid).toBe(unpaid);
      expect(r.count).toBe(count);
      /* 정산 반영 거래 건수 = 거래 내역의 반영 행 수 */
      expect(
        r.transactions.filter((item) => item.kind === "included"),
      ).toHaveLength(count as number);
    },
  );

  it("원장에 나오는 입점사 8곳만 행이 된다 — 마스터 38곳을 복제하지 않는다", () => {
    expect(SELLER_SETTLEMENTS.map((item) => item.name).sort()).toEqual(
      [
        "리틀베이비",
        "리틀스텝",
        "맘스케어",
        "베베하우스",
        "베이비루",
        "아기별상사",
        "아이랑",
        "코지베이비",
      ].sort(),
    );
  });

  it("셀러 쿠폰은 매출에서 빼고, 포인트는 정산에 영향이 없다", () => {
    /* 아기별상사 U-S35 — 200,000 − 쿠폰 10,000 = 190,000 · 포인트 3,000 은 참고 값 */
    expect(row("아기별상사").sales).toBe(200_000);
    expect(row("아기별상사").coupon).toBe(10_000);
    expect(row("아기별상사").point).toBe(3_000);
    expect(row("아기별상사").payout).toBe(190_000 - 22_800 - 5_700);
  });

  it("수수료 반올림은 셀러별로 — 23,100 × 9.8% = 2,263.8 → 2,264", () => {
    expect(row("베베하우스").fee).toBe(2_264);
  });

  it("상태 6종이 모두 있고 셀러마다 하나다", () => {
    expect(new Set(SELLER_SETTLEMENTS.map((item) => item.status))).toEqual(
      new Set(["waiting", "requested", "agreed", "paid", "disputed", "held"]),
    );
    expect(row("리틀스텝").objection?.at).toBe("2026-10-02 16:40");
    expect(row("코지베이비").resend?.at).toBe("2026-10-17 15:00");
    expect(row("아기별상사").paidAt).toBe("2026-10-12");
    expect(row("리틀베이비").paidAt).toBeNull();
  });

  it("명세서번호는 회차 + 셀러 id 로 정해진다", () => {
    expect(row("아기별상사").statementNo).toBe("STM-2609-1042");
    expect(row("리틀베이비").statementNo).toBe("STM-2609-0201");
    expect(HQ_SETTLEMENT.statementNo).toBe("STM-2609-0001");
    expect(findStatement("STM-2609-0227")?.name).toBe("리틀스텝");
    expect(STATEMENTS).toHaveLength(9);
  });
});

describe("처리단위 판정", () => {
  it("9/30 확정은 반영, 10/1 확정은 다음 회차 — 결제월이 아니라 확정일로 가른다", () => {
    expect(order("U-S31").confirmedAt).toBe("2026-09-30 13:10");
    expect(order("U-S32").confirmedAt).toBe("2026-10-01 13:10");
    expect(tx("리틀베이비", "U-S31")).toMatchObject({
      kind: "included",
      note: "반영",
    });
    expect(tx("리틀베이비", "U-S32")).toMatchObject({
      kind: "excluded",
      note: "제외 · 2026.10 확정",
    });
  });

  it("미확정은 제외만 한다(차감 아님)", () => {
    expect(tx("베이비루", "U-R01")).toMatchObject({
      kind: "excluded",
      note: "제외 · 미확정",
      clawback: 0,
    });
  });

  it("진행 중 반품·취소는 제외, 반려로 끝난 반품은 거래 유지로 반영, 교환은 미확정", () => {
    expect(tx("베이비루", "U-R25").note).toBe("제외 · 반품");
    expect(tx("아기별상사", "U-S11").note).toBe("제외 · 취소");
    expect(tx("베이비루", "U-S33")).toMatchObject({
      kind: "included",
      note: "반영 · 반품 불성립 · 거래 유지",
      amount: 109_000,
    });
    expect(tx("아기별상사", "U-S25").note).toBe("제외 · 미확정");
  });

  it("환수는 지난 회차 지급분이 이번 회차에 완료된 것 한 번만 — 당시 지급액 그대로", () => {
    expect(tx("리틀스텝", "U-S30")).toMatchObject({
      kind: "clawback",
      note: "제외 · 반품 환수",
      clawback: 77_400,
    });
    /* 같은 건이 다음 회차에 다시 빠지지 않는다 */
    const october = sellerSettlementsOf("2026.10").find(
      (item) => item.name === "리틀스텝",
    )!;
    expect(october.clawback).toBe(0);
    /* 지급 이력이 없는 완료 반품(U-R27)은 제외만 */
    expect(tx("리틀스텝", "U-R27")).toMatchObject({
      kind: "excluded",
      clawback: 0,
    });
  });

  it("보전은 승인분 중 이번 회차 반납분만 — 접수·반려(10월 반납)는 0", () => {
    expect(tx("베베하우스", "U-R28").care).toBe(12_000);
    expect(tx("코지베이비", "U-R29").care).toBe(18_000);
    expect(tx("베이비루", "U-R18")).toMatchObject({
      kind: "excluded",
      care: 0,
    });
    expect(tx("리틀베이비", "U-R19").care).toBe(0);
    /* 승인이어도 회차 밖 반납이면 보전하지 않는다 */
    const base = order("U-R28");
    const late: Order = { ...base, confirmedAt: "2026-10-02 16:00" };
    expect(settleTxOf(late, "2026.09")).toMatchObject({
      kind: "excluded",
      care: 0,
    });
  });

  it("거래 내역은 반영 → 환수 → 제외 순이다", () => {
    const kinds = row("리틀스텝").transactions.map((item) => item.kind);
    expect(kinds[0]).toBe("clawback");
    expect(kinds.slice(1).every((kind) => kind === "excluded")).toBe(true);
    expect(row("리틀베이비").transactions[0].order.id).toBe("U-S31");
  });
});

describe("회차 요약", () => {
  it("셀러별 하한 뒤 합산 — 미회수가 다른 셀러 지급과 상계되지 않는다", () => {
    expect(SETTLEMENT_SUMMARY).toMatchObject({
      sellerCount: 8,
      sales: 489_700,
      coupon: 15_000,
      revenue: 474_700,
      fee: 54_321,
      pg: 14_241,
      clawback: 77_400,
      care: 30_000,
      point: 3_000,
      payout: 436_138,
      unpaid: 77_400,
    });
    /* net 합(358,738)에 하한을 한 번 거는 것과 다르다 */
    expect(SETTLEMENT_SUMMARY.payout).not.toBe(358_738);
  });
});

describe("본사 명세", () => {
  it("셀러와 같은 확정 규칙 — 9월 확정분만, 수수료·PG 없음, 지급 대상 아님", () => {
    expect(HQ_SETTLEMENT).toMatchObject({
      kind: "hq",
      name: "본사",
      saleSales: 159_000,
      rentSales: 12_600,
      revenue: 171_600,
      fee: 0,
      pg: 0,
      payout: 171_600,
      count: 2,
      status: "paid",
    });
    expect(
      HQ_SETTLEMENT.transactions.find((item) => item.order.id === "U-S10")
        ?.note,
    ).toBe("제외 · 2026.10 확정");
  });

  it("셀러 행·요약·세금계산서에 본사가 없다", () => {
    expect(SELLER_SETTLEMENTS.some((item) => item.kind === "hq")).toBe(false);
    expect(TAX_INVOICES.some((item) => item.sellerId === "S-0001")).toBe(false);
  });
});

describe("세금계산서", () => {
  it("수수료 > 0 셀러만 — 리틀스텝(수수료 0)은 없다", () => {
    expect(TAX_INVOICES).toHaveLength(7);
    expect(TAX_INVOICES.some((item) => item.buyer === "리틀스텝")).toBe(false);
  });

  it("공급가액 = 수수료, 세액은 반올림, 작성일 = 발행일 10.12", () => {
    const of = (buyer: string) =>
      TAX_INVOICES.find((item) => item.buyer === buyer)!;
    expect(of("베베하우스")).toMatchObject({
      no: "TX-2609-0229",
      supply: 2_264,
      vat: 226,
      total: 2_490,
      status: "pending",
      date: "2026-10-12",
      supplier: "BabyCube(본사)",
    });
    expect(of("코지베이비").vat).toBe(510); // 510.3
    expect(of("아기별상사")).toMatchObject({ vat: 2_280, status: "issued" });
    expect(of("베이비루").status).toBe("issued");
  });

  /** 판정 Q4 — 매월 10일 자동 발행, 지급·보류와 분리. 미발행 = 자동 발행 실패 건(예시 수는 질문 19) */
  it("발행 상태는 정산 지급 상태를 따라가지 않는다", () => {
    const flipped = taxInvoicesOf(
      SELLER_SETTLEMENTS.map((row) =>
        row.name === "베이비루"
          ? { ...row, status: "held" as const }
          : row.name === "리틀베이비"
            ? { ...row, status: "paid" as const }
            : row,
      ),
    );
    const statusOf = (buyer: string) =>
      flipped.find((item) => item.buyer === buyer)?.status;
    expect(statusOf("베이비루")).toBe("issued");
    expect(statusOf("리틀베이비")).toBe("pending");
  });

  it("공급가액 합 = 수수료 합", () => {
    expect(TAX_INVOICES.reduce((sum, item) => sum + item.supply, 0)).toBe(
      54_321,
    );
    expect(TAX_INVOICES.reduce((sum, item) => sum + item.vat, 0)).toBe(5_431);
  });
});

describe("샘플 연결", () => {
  it("셀러 입점일 ≤ 상품 등록일 ≤ 주문일 — 주문의 셀러는 모두 셀러 마스터에 있다", () => {
    ORDERS.filter((item) => item.sellerKind === "seller").forEach((item) => {
      const seller = SELLERS.find((master) => master.name === item.seller);
      const product = PRODUCTS.find((entry) => entry.id === item.productCode)!;
      expect(seller, item.seller).toBeDefined();
      expect(seller!.date.slice(0, 10) <= product.date.slice(0, 10)).toBe(true);
      expect(product.date.slice(0, 16) <= item.date).toBe(true);
    });
  });
});
