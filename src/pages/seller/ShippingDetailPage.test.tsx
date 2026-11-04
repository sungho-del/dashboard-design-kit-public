import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { ShippingDetailPage } from "./ShippingDetailPage";

/* -------------------------------------------------------------------------
 * 배송 관리 상세 — 원본 v0.4 값(캡처 `orig/08_shipping` — 20260622541158-1)과 처리 버튼.
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

function renderAt(id: string) {
  navigate(`/shipping/${id}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <ShippingDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/shipping"
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

describe("ShippingDetailPage — 배송 관리 상세", () => {
  it("원본 값 — 배송중이라 주문확인·배송처리일이 찍히고 배송완료일은 「-」", () => {
    renderAt("20260622541158-1");
    expect(valueOf("주문확인일")).toHaveTextContent("2026.06.22 18:57:05");
    expect(valueOf("배송처리일")).toHaveTextContent("2026.06.23 02:57:05");
    expect(valueOf("배송완료일")).toHaveTextContent(/-$/);
    expect(valueOf("수량")).toHaveTextContent("2개");
    expect(screen.getByRole("combobox", { name: "택배사" })).toHaveTextContent(
      "한진택배",
    );
  });

  it("상태 셀렉트는 배송중·배송 완료뿐(구매확정은 어드민 금지 전이) · [배송 완료] 은 고지 창", async () => {
    const { user } = renderAt("20260622541158-1");
    await user.click(screen.getByRole("combobox", { name: "상품주문상태" }));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "배송중",
      "배송 완료",
    ]);
    await user.click(screen.getByRole("option", { name: "배송 완료" }));
    expect(
      await screen.findByRole("dialog", { name: "배송 완료 처리" }),
    ).toBeVisible();
  });

  it("하단 바 — 배송중이면 [배송 완료 처리]·[배송 추적] · 송장 [송장수정]", async () => {
    const { user } = renderAt("20260622541158-1");
    expect(barButtons()).toEqual([
      "배송 완료 처리",
      "배송 추적",
      "취소",
      "변경 저장",
    ]);
    await user.click(screen.getByRole("button", { name: "배송 추적" }));
    /* 버튼 글자 + 알림 */
    expect(await screen.findAllByText("배송 추적")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "송장수정" }));
    expect(await screen.findByText("송장번호를 수정했습니다.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "배송 완료 처리" }));
    const dialog = await screen.findByRole("dialog", {
      name: "배송 완료 처리",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "배송 완료 처리" }),
    );
    expect(await screen.findByText(/배송 완료 처리되었습니다/)).toBeVisible();
  });

  it("구매확정 건 — 상태는 배지, 처리 버튼 없음", () => {
    renderAt("20260621138969-1");
    expect(
      screen.queryByRole("combobox", { name: "상품주문상태" }),
    ).not.toBeInTheDocument();
    expect(barButtons()).toEqual(["취소", "변경 저장"]);
  });

  it("[목록] 은 배송 관리로", async () => {
    const { user, onNavSelect } = renderAt("20260622541158-1");
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/shipping");
  });
});
