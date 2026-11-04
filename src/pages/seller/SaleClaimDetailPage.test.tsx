import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { refundOf, unrefundedShipFeeOf } from "./claim.data";
import { salePayTotal } from "./orderUnit.data";
import {
  SaleCancelDetailPage,
  SaleExchangeDetailPage,
  SaleReturnDetailPage,
  type SaleClaimDetailPageProps,
} from "./SaleClaimDetailPage";
import { claimActionsOf, VISIT_RETURN_WAIT } from "./SaleClaimDetailPage.data";
import { UNITS } from "./seed/orders.data";

/* -------------------------------------------------------------------------
 * 취소·반품·교환 상세 — 원본 v0.4 값(캡처 `orig/10·12·14`) · 클레임 6줄 · 처리 버튼 · 명세 환불 몫.
 * 기획 변경: D-61(변심 반품 출고비 환불 없음) · D-315(방문 수령 반납).
 * ---------------------------------------------------------------------- */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});
afterAll(() => vi.unstubAllGlobals());

function renderAt(Page: ComponentType<SaleClaimDetailPageProps>, path: string) {
  navigate(path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-return"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const valueOf = (label: string) =>
  screen.getByText(label, { selector: "dt, span, div" }).parentElement!;
const barButtons = () =>
  within(
    screen.getByRole("button", { name: "목록" }).parentElement!
      .lastElementChild as HTMLElement,
  )
    .getAllByRole("button")
    .map((b) => b.textContent);
const unit = (id: string) => UNITS.find((u) => u.id === id)!;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

describe("취소 상세", () => {
  it("원본 클레임 6줄 · 상태 두 칸 · 취소 완료라 처리 버튼 없음 · 「환불 완료」", () => {
    renderAt(SaleCancelDetailPage, "/sale-cancel/20260615988808-1");
    expect(screen.getByRole("heading", { name: "취소 정보" })).toBeVisible();
    expect(valueOf("신청 구분")).toHaveTextContent("취소 요청");
    expect(valueOf("신청일시")).toHaveTextContent("2026.06.16 06:07:38");
    expect(valueOf("발송 여부")).toHaveTextContent("발송 전");
    expect(valueOf("귀책 판정")).toHaveTextContent("고객 귀책");
    expect(valueOf("신청 사유")).toHaveTextContent("배송 전 취소");
    expect(valueOf("배송비 부담")).toHaveTextContent(
      "해당 없음 (발송 전 취소)",
    );
    expect(valueOf("상품주문상태")).toHaveTextContent("배송 준비");
    expect(
      screen.getByRole("combobox", { name: "취소상태" }),
    ).toHaveTextContent("취소 완료");
    expect(barButtons()).toEqual(["취소", "변경 저장"]);
    expect(valueOf("환불 완료")).toBeVisible();
  });

  it("경로 유형과 클레임 유형이 다르면 「찾을 수 없음」 + 취소 관리로", async () => {
    const { user, onNavSelect } = renderAt(
      SaleCancelDetailPage,
      "/sale-cancel/20260618360510-1",
    );
    expect(screen.getByText("찾을 수 없는 주문입니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "취소 관리로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sale-cancel");
  });
});

describe("반품 상세", () => {
  const ID = "20260618360510-1";

  it("원본 클레임 6줄(발송 후 송장 · 고객 귀책) + D-61 출고비 문구", () => {
    renderAt(SaleReturnDetailPage, `/sale-return/${ID}`);
    expect(valueOf("신청일시")).toHaveTextContent("2026.06.19 11:13:14");
    expect(valueOf("발송 여부")).toHaveTextContent(
      "발송 후 · 한진택배 8820-3321-0099",
    );
    expect(valueOf("신청 사유")).toHaveTextContent("단순변심 (청약철회)");
    expect(valueOf("배송비 부담")).toHaveTextContent(
      "고객 부담 — 반품 배송비(편도) 3,000원 · 환불액에서 차감",
    );
  });

  it("반품 수거중 → [반품 수거완료 처리]·[반품 반려](원본 캡처 버튼) · 반려는 사유 창", async () => {
    const { user } = renderAt(SaleReturnDetailPage, `/sale-return/${ID}`);
    expect(barButtons()).toEqual([
      "반품 수거완료 처리",
      "반품 반려",
      "취소",
      "변경 저장",
    ]);
    await user.click(screen.getByRole("button", { name: "반품 반려" }));
    expect(
      await screen.findByRole("dialog", { name: "반품 반려 사유 입력" }),
    ).toBeVisible();
  });

  it("처리 이력 — 주문 흐름 뒤에 클레임이 거친 단계(신청 → 승인 → 지연 → 수거중)", () => {
    renderAt(SaleReturnDetailPage, `/sale-return/${ID}`);
    const text = within(screen.getByRole("table"))
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent?.replace(/\d{4}\.\d{2}\.\d{2}.*/, ""));
    expect(text.slice(-4)).toEqual([
      "반품 신청",
      "반품 승인",
      "반품 지연",
      "반품 수거중",
    ]);
  });

  it("주문 명세 — 결제금액 → 출고 배송비(변심 · 환불 제외 · D-61) → 반품 배송비 → 환불 예정액", async () => {
    const { user } = renderAt(SaleReturnDetailPage, `/sale-return/${ID}`);
    const u = unit(ID);
    expect(unrefundedShipFeeOf(u)).toBeGreaterThan(0);
    expect(refundOf(u)).toBe(salePayTotal(u) - unrefundedShipFeeOf(u) - 3000);
    await user.click(screen.getByRole("button", { name: "주문 명세" }));
    const dialog = await screen.findByRole("dialog", { name: /^주문 명세/ });
    expect(within(dialog).getByText("단순 변심 · 환불 제외")).toBeVisible();
    expect(within(dialog).getByText("반품 배송비")).toBeVisible();
    expect(within(dialog).getByText(won(refundOf(u)))).toBeVisible();
  });

  it("셀러 책임 반품은 출고비까지 환불(D-61) — 출고 배송비 줄 없음", () => {
    const seller = UNITS.find(
      (u) => u.req?.type === "반품" && /불량|오배송|파손/.test(u.req.reason),
    )!;
    expect(unrefundedShipFeeOf(seller)).toBe(0);
    expect(refundOf(seller)).toBe(salePayTotal(seller));
  });

  it("D-315 — 방문 수령 반품은 승인 뒤 [방문 반납 대기 처리], 그다음 [수거완료 처리]", () => {
    const pickup = unit("20260612923774-1");
    const at = (stat: string) => ({ ...pickup, req: { ...pickup.req!, stat } });
    expect(claimActionsOf(at("반품 승인"), "반품")[0]).toEqual({
      label: "방문 반납 대기 처리",
      to: VISIT_RETURN_WAIT,
    });
    expect(claimActionsOf(at(VISIT_RETURN_WAIT), "반품")[0]).toEqual({
      label: "수거완료 처리",
      to: "반품 수거완료",
    });
    /* 택배 건은 원본 그대로 다음 단계 */
    expect(claimActionsOf(at("반품 신청"), "반품")[0].label).toBe(
      "반품 승인 처리",
    );
  });
});

describe("교환 상세", () => {
  const ID = "20260617540318-1";

  it("판매자 귀책 · 판매자 부담 · 교환 신청이라 [교환 승인 처리]·[교환 반려] · 결과 「환불 없음 — 검수 후 재배송」", () => {
    renderAt(SaleExchangeDetailPage, `/sale-exchange/${ID}`);
    expect(valueOf("귀책 판정")).toHaveTextContent("판매자 귀책");
    expect(valueOf("배송비 부담")).toHaveTextContent(
      "판매자 부담 (하자·배송 문제)",
    );
    expect(valueOf("처리 결과")).toHaveTextContent(
      "환불 없음 — 검수 후 재배송",
    );
    expect(barButtons()).toEqual([
      "교환 승인 처리",
      "교환 반려",
      "취소",
      "변경 저장",
    ]);
  });

  it("[교환 승인 처리] → 확인 창(현재 교환 신청 → 교환 승인) → 「수거 절차를 진행해주세요」", async () => {
    const { user } = renderAt(SaleExchangeDetailPage, `/sale-exchange/${ID}`);
    await user.click(screen.getByRole("button", { name: "교환 승인 처리" }));
    const dialog = await screen.findByRole("dialog", {
      name: "상태 변경 확인",
    });
    expect(within(dialog).getByText("교환 신청")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "확인" }));
    expect(
      await screen.findByText(
        "'교환 승인' 상태로 변경했습니다. 수거 절차를 진행해주세요.",
      ),
    ).toBeVisible();
  });

  it("교환상태 셀렉트에서 [재반송] 은 송장 창(되돌릴 수 없음 고지)", async () => {
    const { user } = renderAt(SaleExchangeDetailPage, `/sale-exchange/${ID}`);
    await user.click(screen.getByRole("combobox", { name: "교환상태" }));
    await user.click(screen.getByRole("option", { name: "재반송" }));
    const dialog = await screen.findByRole("dialog", { name: "재반송 처리" });
    expect(within(dialog).getByText(/재반송은 종결 상태입니다/)).toBeVisible();
  });
});
