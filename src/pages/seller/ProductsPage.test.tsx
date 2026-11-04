import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { MY_PRODUCTS, saleStatOf } from "./ProductsPage.data";
import { ProductsPage } from "./ProductsPage";

/* -------------------------------------------------------------------------
 * 상품 관리 — 원본 캡처 `orig/01_products`(카드 38·2·6·6·4·1 · 첫 화면 38건 · 렌트가 원/일).
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
      <ProductsPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/products"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const bodyRows = () => screen.getAllByRole("row").slice(1);
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByRole("option", { name: option }));
}
const cards = () => screen.getByRole("group", { name: "판매 상태별 건수" });

describe("상품 관리", () => {
  it("모집단 57건(본사 등록분 제외) · 상태 카드 건수가 원본과 같다", () => {
    expect(MY_PRODUCTS).toHaveLength(57);
    const count = (s: string) =>
      MY_PRODUCTS.filter((p) => saleStatOf(p) === s).length;
    expect(
      ["임시저장", "판매중", "품절", "판매중지", "반려", "재심사요청"].map(
        count,
      ),
    ).toEqual([2, 38, 6, 6, 4, 1]);
  });

  it("처음엔 판매중 카드가 켜져 38건 · 첫 행 원본 첫 상품", () => {
    renderPage();
    expect(screen.getByText("목록 (총 38건)")).toBeInTheDocument();
    const first = bodyRows()[0];
    expect(within(first).getByText("NZ269940")).toBeInTheDocument();
    expect(
      within(first).getByText("스토케 트립트랩 하이체어"),
    ).toBeInTheDocument();
    expect(within(first).getByText("39,000원/일")).toBeInTheDocument();
  });

  it("카드를 누르면 그 상태만 — 반려 4건은 [사유 보기] → 원본 사유 창", async () => {
    const { user } = renderPage();
    await user.click(within(cards()).getByRole("button", { name: /반려/ }));
    expect(screen.getByText("목록 (총 4건)")).toBeInTheDocument();
    await user.click(
      within(bodyRows()[0]).getByRole("button", { name: "사유 보기" }),
    );
    const dialog = screen.getByRole("dialog", { name: "반려 사유" });
    expect(
      within(dialog).getByText(/상품 상세 하단 바에서 \[재심사 요청\]/),
    ).toBeInTheDocument();
  });

  it("유형 판매 → 렌트 가격 열이 빠지고 카테고리가 열린다", async () => {
    const { user } = renderPage();
    expect(screen.getByRole("combobox", { name: "카테고리" })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "카테고리" }),
    ).toHaveTextContent("유형 먼저 선택");
    await pick(user, "유형", "판매");
    expect(
      screen.queryByRole("columnheader", { name: /렌트 원가/ }),
    ).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: /판매 원가/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "카테고리" })).toBeEnabled();
    await pick(user, "카테고리", "외출·이동");
    expect(
      screen.getByText("유형 판매 · 카테고리 외출·이동"),
    ).toBeInTheDocument();
  });

  it("가격을 고치면 렌트가가 다시 계산되고 「변경됨」 · 체크한 행만 [수정 저장]", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(
      await screen.findByText("수정할 상품의 체크박스를 선택해주세요."),
    ).toBeInTheDocument();
    const first = bodyRows()[0];
    const disc = within(first).getByRole("textbox", { name: /할인 금액/ });
    await user.clear(disc);
    await user.type(disc, "4000");
    expect(within(first).getByText("35,000원/일")).toBeInTheDocument();
    expect(within(first).getByText("변경됨")).toBeInTheDocument();
    await user.click(within(first).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(
      await screen.findByText("1건의 상품 가격이 저장되었습니다."),
    ).toBeInTheDocument();
  });

  it("상품명·[수정] → 상품 상세", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(
      within(bodyRows()[0]).getByRole("button", {
        name: "스토케 트립트랩 하이체어 수정",
      }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/products/P-001");
  });
});
