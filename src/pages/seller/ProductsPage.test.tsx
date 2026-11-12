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
    const large = () =>
      screen.getByRole("combobox", { name: "카테고리 대분류" });
    expect(large()).toBeDisabled();
    expect(large()).toHaveTextContent("유형 먼저 선택");
    await pick(user, "유형", "판매");
    expect(
      screen.queryByRole("columnheader", { name: /렌트 원가/ }),
    ).toBeNull();
    expect(
      screen.getByRole("columnheader", { name: /판매 원가/ }),
    ).toBeInTheDocument();
    expect(large()).toBeEnabled();
    await pick(user, "카테고리 대분류", "외출·이동");
    expect(
      screen.getByText("유형 판매 · 카테고리 외출·이동"),
    ).toBeInTheDocument();
  });

  it("가격을 고치면 렌트가가 다시 계산되고 「변경됨」 · 체크한 행만 [수정 저장]", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "수정할 상품의 체크박스를 선택해주세요.",
    );
    const first = bodyRows()[0];
    const disc = within(first).getByRole("textbox", { name: /할인 금액/ });
    await user.clear(disc);
    await user.type(disc, "4000");
    expect(within(first).getByText("35,000원/일")).toBeInTheDocument();
    expect(within(first).getByText("변경됨")).toBeInTheDocument();
    await user.click(within(first).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    /* 알림 + 목록 제목 옆 저장 결과 한 줄(개발 요청 5번) — 둘 다 같은 글자 */
    expect(
      await screen.findAllByText("1건의 상품 가격이 저장되었습니다."),
    ).toHaveLength(2);
  });

  /* ---- 개발 요청 2026-11-12 3~6번 ---- */

  it("카테고리 3단 — 하위 분류가 있을 때만 중·소 셀렉트 · 대분류를 바꾸면 아래를 비운다", async () => {
    const { user } = renderPage();
    await pick(user, "유형", "렌트");
    await pick(user, "카테고리 대분류", "유축기");
    expect(
      screen.queryByRole("combobox", { name: "카테고리 중분류" }),
    ).toBeNull();
    await pick(user, "카테고리 대분류", "유모차");
    await pick(user, "카테고리 중분류", "디럭스");
    await pick(user, "카테고리 소분류", "4륜");
    expect(screen.getByText("목록 (총 1건)")).toBeInTheDocument();
    expect(
      within(bodyRows()[0]).getByText("부가부 폭스3 디럭스 유모차"),
    ).toBeInTheDocument();
    expect(screen.getByText("유형 렌트 · 카테고리 4륜")).toBeInTheDocument();
    await pick(user, "카테고리 대분류", "카시트");
    expect(
      screen.getByRole("combobox", { name: "카테고리 중분류" }),
    ).toHaveTextContent("중분류 전체");
    expect(
      screen.queryByRole("combobox", { name: "카테고리 소분류" }),
    ).toBeNull();
  });

  it("성장단계 — 전체 · 단계 · 없음 · 유형을 바꿔도 남는다 · 요약에 단계 글자", async () => {
    const { user } = renderPage();
    const stage = () => screen.getByRole("combobox", { name: "성장단계" });
    expect(stage()).toHaveTextContent("성장단계 전체");
    await user.click(stage());
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
      "성장단계 전체",
      "신생아 (0~3개월)",
      "영아 (4~12개월)",
      "걸음마 (13~24개월)",
      "유아 (24개월~)",
      "없음",
    ]);
    await user.click(screen.getByRole("option", { name: "영아 (4~12개월)" }));
    await pick(user, "유형", "렌트");
    expect(stage()).toHaveTextContent("영아 (4~12개월)");
    expect(screen.getByText("유형 렌트 · 영아 (4~12개월)")).toBeInTheDocument();
    await pick(user, "성장단계", "없음");
    expect(screen.getByText("유형 렌트 · 성장단계 없음")).toBeInTheDocument();
  });

  it("정률 할인 상품은 할인 칸이 잠기고 고친 원가로 다시 환산 · 안내 아이콘", async () => {
    const { user } = renderPage();
    const row = bodyRows().find((r) =>
      within(r).queryByText("부가부 폭스3 디럭스 유모차"),
    )!;
    const disc = within(row).getByRole("textbox", { name: /할인 금액/ });
    expect(disc).toBeDisabled();
    expect(disc).toHaveValue("8,900");
    expect(within(row).getByText("80,100원/일")).toBeInTheDocument();
    expect(
      within(row).getByLabelText("할인 금액 잠김 안내"),
    ).toBeInTheDocument();
    const base = within(row).getByRole("textbox", { name: /렌트 원가/ });
    await user.clear(base);
    await user.type(base, "100000");
    expect(disc).toHaveValue("10,000");
    expect(within(row).getByText("90,000원/일")).toBeInTheDocument();
  });

  it("가격을 고치면 [가격 변경 취소] · 충돌하면 안내 + [서버값 다시 불러오기] → 초안만 버린다", async () => {
    const { user } = renderPage();
    expect(screen.queryByRole("button", { name: "가격 변경 취소" })).toBeNull();
    const row = bodyRows().find((r) =>
      within(r).queryByText("잘레토 전동 바운서 4세대"),
    )!;
    const base = within(row).getByRole("textbox", { name: /렌트 원가/ });
    await user.clear(base);
    await user.type(base, "50000");
    expect(
      screen.getByRole("button", { name: "가격 변경 취소" }),
    ).toBeInTheDocument();
    const box = within(row).getByRole("checkbox");
    await user.click(box);
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "다른 작업에서 상품이 먼저 수정되었습니다. 입력값과 선택은 유지했습니다. [서버값 다시 불러오기]로 충돌을 해소해주세요.",
    );
    await user.click(
      screen.getByRole("button", { name: "서버값 다시 불러오기" }),
    );
    expect(within(row).queryByText("변경됨")).toBeNull();
    expect(base).toHaveValue("45,000");
    expect(box).toBeChecked();
    expect(
      screen.getByText(
        "입력한 가격 변경을 취소하고 서버 값을 다시 불러왔습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "가격 변경 취소" })).toBeNull();
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
