import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ShippingPage } from "./ShippingPage";

/* -------------------------------------------------------------------------
 * 배송 관리 — 원본 v0.4 의 카드·버튼·송장 수정·배송 완료 게이트.
 * 숫자는 원본을 브라우저로 열어 읽은 값이다(캡처 `orig/07_shipping` — 배송중 7 · 배송 완료 5 · 구매확정 10).
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
      <ShippingPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/shipping"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const cards = () => screen.getByRole("group", { name: "처리 상태별 건수" });
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
/** 머리 [송장수정] — 행마다 같은 이름의 버튼이 있어 표 밖의 것 */
const headInvoiceEdit = () =>
  screen
    .getAllByRole("button", { name: "송장수정" })
    .find((b) => !b.closest("table"))!;

describe("ShippingPage — 배송 관리", () => {
  it("카드 3장 — 원본 건수, 들어오면 배송중 · 첫 행은 원본 첫 행", () => {
    renderPage();
    expect(
      within(cards())
        .getAllByRole("button")
        .map((b) => b.textContent?.replace(/\s+/g, "")),
    ).toEqual(["배송중7건", "배송완료5건", "구매확정10건"]);
    expect(
      screen.getByRole("heading", { name: "목록 (총 7건)" }),
    ).toBeVisible();
    expect(rows()[0]).toHaveTextContent("20260622541158");
    expect(rows()[0]).toHaveTextContent("203,000원");
  });

  it("머리 — [송장수정] + 배송중 카드는 [배송 완료]만, 배송 완료 카드는 상태변경 없음", async () => {
    const { user } = renderPage();
    expect(headInvoiceEdit()).toBeVisible();
    expect(
      within(screen.getByRole("group", { name: "상태 변경" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["배송 완료"]);

    await user.click(
      within(cards()).getByRole("button", { name: /배송 완료/ }),
    );
    expect(
      screen.queryByRole("group", { name: "상태 변경" }),
    ).not.toBeInTheDocument();
    expect(headInvoiceEdit()).toBeVisible();
  });

  it("[배송 완료] → 「배송 완료 처리」 고지 창 → 원본 알림(자동 구매확정 기산)", async () => {
    const { user } = renderPage();
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(
      within(screen.getByRole("group", { name: "상태 변경" })).getByRole(
        "button",
        { name: "배송 완료" },
      ),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "배송 완료 처리",
    });
    expect(within(dialog).getByText(/7일 경과 시 자동 구매확정/)).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "배송 완료 처리" }),
    );
    expect(
      await screen.findByText(
        "배송 완료 처리되었습니다 — 완료일부터 7일 경과 시 자동 구매확정됩니다.",
      ),
    ).toBeVisible();
  });

  it("머리 [송장수정] — 0건이면 막고, 고르면 송장 있는 건수로 알림(원본 `rentInvoiceEditBulk`)", async () => {
    const { user } = renderPage();
    await user.click(headInvoiceEdit());
    expect(await screen.findByText("선택된 항목이 없습니다.")).toBeVisible();

    for (const row of rows().slice(0, 2))
      await user.click(within(row).getByRole("checkbox"));
    await user.click(headInvoiceEdit());
    expect(await screen.findByText("2건 송장번호 수정 완료")).toBeVisible();
  });

  it("행 [송장수정] — 송장번호를 비우면 막고, 있으면 수정 알림", async () => {
    const { user } = renderPage();
    const row = rows()[0];
    const invoice = within(row).getByRole("textbox", { name: /송장번호/ });
    expect(invoice).toHaveValue("8820-1102-3344");
    await user.click(within(row).getByRole("button", { name: "송장수정" }));
    expect(await screen.findByText("송장번호를 수정했습니다.")).toBeVisible();
    await user.clear(invoice);
    await user.click(within(row).getByRole("button", { name: "송장수정" }));
    expect(await screen.findByText("송장번호를 입력해주세요.")).toBeVisible();
  });

  it("주문번호 → 배송 관리 상세", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(screen.getByRole("button", { name: "20260622541158" }));
    expect(onNavSelect).toHaveBeenCalledWith("/shipping/20260622541158-1");
  });
});
