import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { flowCatOf, flowStatOf } from "./orderUnit.data";
import { FLOW_OPTIONS_GOLDEN, SALE_ORDERS_GOLDEN } from "./saleOrders.golden";
import { SaleOrdersPage } from "./SaleOrdersPage";
import {
  SALE_ORDER_UNITS,
  flowOptions,
  homePathOf,
} from "./SaleOrdersPage.data";

/* -------------------------------------------------------------------------
 * 주문 통합 관리 — 원본 v0.4 처리상태 파생 · 담당 메뉴 · 집계 · 조회 전용 표.
 * 정답은 원본을 브라우저로 열어 뽑은 값(`saleOrders.golden.ts`) · 캡처 `orig/04_saleOrders`(89 · 30 · 34 · 25).
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

function renderPage() {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SaleOrdersPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-orders"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const PATH: Record<string, string> = {
  saleProc: "/sale-proc",
  shipping: "/shipping",
  saleCancel: "/sale-cancel",
  saleReturn: "/sale-return",
  saleExchange: "/sale-exchange",
};
const tiles = () =>
  within(screen.getByRole("region", { name: "주문 집계" })).getAllByText(
    /^\d+$/,
  );
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("SaleOrdersPage — 주문 통합 관리", () => {
  it("원본 정답 — 판매 89건 처리상태·처리구분·주문번호 목적지가 전부 같다", () => {
    expect(SALE_ORDER_UNITS).toHaveLength(SALE_ORDERS_GOLDEN.length);
    for (const [id, flow, home, cat] of SALE_ORDERS_GOLDEN) {
      const u = SALE_ORDER_UNITS.find((x) => x.id === id)!;
      expect([id, flowStatOf(u), flowCatOf(u)]).toEqual([id, flow, cat]);
      expect(homePathOf(u)).toBe(`${PATH[home]}/${id}`);
    }
  });

  it("처리상태 선택지 — 원본 `orderFlowOpts` 와 같다(처리구분별)", () => {
    for (const [key, labels] of Object.entries(FLOW_OPTIONS_GOLDEN)) {
      if (key.includes(",")) continue; // 다중 처리구분은 없다(하나만 고르는 칸)
      expect(flowOptions(key === "-" ? "" : key).map((o) => o.label)).toEqual(
        labels,
      );
    }
  });

  it("집계 타일 4장 — 원본 값(전체 89 · 진행 중 30 · 클레임 진행 중 34 · 종결 25)", () => {
    renderPage();
    expect(tiles().map((t) => t.textContent)).toEqual(["89", "30", "34", "25"]);
    expect(
      screen.getByRole("heading", { name: "목록 (총 89건)" }),
    ).toBeVisible();
  });

  it("조회 전용 — 체크박스·상태변경 버튼 없음 · 11열", () => {
    renderPage();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "상태 변경" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("table")).getAllByRole("columnheader"),
    ).toHaveLength(11);
    expect(rows()[0]).toHaveTextContent("89신규 주문20260623864962");
    expect(rows()[1]).toHaveTextContent("배송중");
  });

  it("처리구분을 고르면 집계·목록이 같이 줄고, 처리상태 선택지가 그 계열로 바뀐다", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("combobox", { name: "처리구분" }));
    await user.click(screen.getByRole("option", { name: "취소" }));
    const total = SALE_ORDER_UNITS.filter(
      (u) => flowCatOf(u) === "취소",
    ).length;
    expect(
      screen.getByRole("heading", { name: `목록 (총 ${total}건)` }),
    ).toBeVisible();
    expect(tiles()[0]).toHaveTextContent(String(total));
    await user.click(screen.getByRole("combobox", { name: "처리상태" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "처리상태 전체",
      "취소 요청",
      "환불 처리중",
      "취소 완료",
    ]);
  });

  it("주문번호 → 지금 담당하는 메뉴의 상세(신규 주문 = 발주 관리 · 배송중 = 배송 관리)", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(screen.getByRole("button", { name: "20260623864962" }));
    await user.click(screen.getByRole("button", { name: "20260622541158" }));
    expect(onNavSelect.mock.calls).toEqual([
      ["/sale-proc/20260623864962-1"],
      ["/shipping/20260622541158-1"],
    ]);
  });

  it("엑셀은 조회 결과 건수를 알린다", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: /엑셀 다운로드/ }));
    expect(
      await screen.findByText("89건을 엑셀(CSV)로 다운로드했습니다."),
    ).toBeVisible();
  });
});
