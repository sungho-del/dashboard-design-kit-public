import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { careOf, flowCatOf, flowStatOf } from "./orderUnit.data";
import {
  RENT_FLOW_OPTIONS_GOLDEN,
  RENT_ORDERS_GOLDEN,
} from "./rentOrders.golden";
import { RentOrdersPage } from "./RentOrdersPage";
import {
  RENT_ORDER_UNITS,
  rentFlowOptions,
  rentHomePathOf,
} from "./RentOrdersPage.data";

/* -------------------------------------------------------------------------
 * 렌트 주문 통합 관리 — 원본 v0.4 처리상태 파생 · 담당 메뉴 · 집계 · 조회 전용 표.
 * 정답은 원본을 브라우저로 열어 뽑은 값(`rentOrders.golden.ts`) · 캡처 `orig/15_rentOrders`(94 · 74 · 9 · 11).
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
      <RentOrdersPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/rent-orders"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const PATH: Record<string, string> = {
  rentList: "/rent-list",
  rentDispatch: "/rent-dispatch",
  rentUse: "/rent-use",
  rentInspReturn: "/rent-insp-return",
  rentCancel: "/rent-cancel",
  rentRma: "/rent-rma",
};
const tiles = () =>
  within(screen.getByRole("region", { name: "주문 집계" })).getAllByText(
    /^\d+$/,
  );
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);

describe("RentOrdersPage — 렌트 주문 통합 관리", () => {
  it("원본 정답 — 렌트 94건 처리상태·처리구분·주문번호 목적지가 전부 같다", () => {
    expect(RENT_ORDER_UNITS).toHaveLength(RENT_ORDERS_GOLDEN.length);
    for (const [id, flow, home, cat] of RENT_ORDERS_GOLDEN) {
      const u = RENT_ORDER_UNITS.find((x) => x.id === id)!;
      expect([id, flowStatOf(u), flowCatOf(u)]).toEqual([id, flow, cat]);
      expect(rentHomePathOf(u)).toBe(`${PATH[home]}/${id}`);
    }
  });

  it("처리상태 선택지 — 원본 `orderFlowOpts` 와 같다(처리구분별)", () => {
    for (const [key, labels] of Object.entries(RENT_FLOW_OPTIONS_GOLDEN))
      expect(
        rentFlowOptions(key === "-" ? "" : key).map((o) => o.label),
      ).toEqual(labels);
  });

  it("집계 타일 4장 — 원본 값(전체 94 · 진행 중 74 · 클레임 진행 중 9 · 종결 11) · 12열(이용기간)", () => {
    renderPage();
    expect(tiles().map((t) => t.textContent)).toEqual(["94", "74", "9", "11"]);
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent?.trim()),
    ).toEqual([
      "",
      "No",
      "주문상태",
      "주문번호",
      "결제일시",
      "결제금액",
      "이용기간",
      "상품코드",
      "상품명",
      "상품 수량",
      "옵션",
      "옵션 수량",
      "구매자명",
    ]);
    /* 행 체크박스(선택분 엑셀 · 개발 요청 26번) */
    expect(within(rows()[0]).getByRole("checkbox")).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent("3,824,000원");
    expect(rows()[0]).toHaveTextContent("2026.06.27 ~ 2026.09.27");
  });

  it("안심케어 가입만 — 집계·목록이 같이 줄고 행마다 안심케어 태그", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("combobox", { name: "안심케어" }));
    await user.click(screen.getByRole("option", { name: "가입" }));
    const n = RENT_ORDER_UNITS.filter(careOf).length;
    expect(
      screen.getByRole("heading", { name: `목록 (총 ${n}건)` }),
    ).toBeVisible();
    expect(rows().every((r) => within(r).queryByText("안심케어"))).toBe(true);
  });

  it("이용기간 정렬 — 오름차순이면 가장 이른 이용 기간이 맨 위", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: /이용기간/ }));
    const first = [...RENT_ORDER_UNITS]
      .map((u) => (u.period || "-").replace(/^예정\s*/, ""))
      .sort()[0];
    expect(rows()[0]).toHaveTextContent(first);
  });

  it("주문번호 → 지금 담당하는 메뉴의 상세(신규 주문 = 렌트 발주 · 대여중 = 대여·연체)", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(screen.getByRole("button", { name: "20260624225758" }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/rent-list/20260624225758-1");
    await user.click(screen.getByRole("combobox", { name: "처리상태" }));
    await user.click(screen.getByRole("option", { name: "대여중" }));
    await user.click(within(rows()[0]).getAllByRole("button")[0]);
    expect(onNavSelect.mock.lastCall?.[0]).toMatch(/^\/rent-use\//);
  });
});
