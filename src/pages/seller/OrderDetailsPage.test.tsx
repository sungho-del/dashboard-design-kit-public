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
  it("한 결제의 내 스토어 처리단위를 늘어놓고 상품명 → 유형별 처리단위 상세", async () => {
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
    /* 개발 요청 14번 — 내 스토어 두 줄 · 담당·셀러 열과 주문 전체 합계·보증금 줄은 없다 */
    expect(
      screen.getByRole("heading", { name: "내 스토어 결제 요약" }),
    ).toBeInTheDocument();
    expect(screen.getByText("내 스토어 유닛 수")).toBeInTheDocument();
    expect(screen.getByText("2건")).toBeInTheDocument();
    expect(screen.getByText("내 스토어 유닛 결제 합계")).toBeInTheDocument();
    for (const gone of ["결제 합계", "렌탈료 합계", "보증금"])
      expect(screen.queryByText(gone)).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "담당" }),
    ).toBeNull();
    expect(
      screen.queryByRole("columnheader", { name: "셀러" }),
    ).toBeNull();
    /* 기획 답 2026-11-06 §2 #6 — 「안내」 구역 없음 */
    expect(screen.queryByText("별도 점유")).toBeNull();
    expect(screen.queryByRole("heading", { name: "안내" })).toBeNull();
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
