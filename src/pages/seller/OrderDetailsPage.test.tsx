import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { OrderDetailsPage } from "./OrderDetailsPage";

/* -------------------------------------------------------------------------
 * 주문 상세(통합) — 원본 `DETAILS.orderDetail`. 처리단위 2건짜리 결제 20260705880011 로 본다.
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

function renderAt(path: string) {
  act(() => navigate(path));
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderDetailsPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-orders"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

describe("주문 상세(통합)", () => {
  it("한 결제의 처리단위를 모두 늘어놓고 상품명 → 유형별 처리단위 상세", async () => {
    const { user, onNavSelect } = renderAt("/order-details/20260705880011");
    expect(
      screen.getByRole("heading", { name: "주문 상세(통합)" }),
    ).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    await user.click(within(rows[0]).getByRole("button"));
    expect(onNavSelect.mock.calls[0][0]).toMatch(
      /^\/rent-list\/20260705880011-/,
    );
  });

  it("결제 요약 · [변경 저장] 알림 · [목록] → 주문 통합 관리", async () => {
    const { user, onNavSelect } = renderAt("/order-details/20260705880011");
    expect(screen.getByText("결제 합계")).toBeInTheDocument();
    expect(screen.getByText("렌탈료 합계")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "입금확인" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(await screen.findByText("저장되었습니다.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sale-orders");
  });

  it("없는 주문번호 — 찾을 수 없음", () => {
    renderAt("/order-details/0000");
    expect(screen.getByText("찾을 수 없는 주문입니다")).toBeInTheDocument();
  });
});
