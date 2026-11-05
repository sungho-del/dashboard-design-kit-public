import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerScreenIndexPage } from "./SellerScreenIndexPage";
import { SELLER_SCREENS } from "./SellerScreenIndexPage.data";

/* -------------------------------------------------------------------------
 * 셀러 화면 목록 — 본사 화면 목록 테스트와 같은 것을 본다.
 * 값어치는 **카드를 누르면 그 화면의 경로가 넘어간다**는 것 하나다.
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

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SellerScreenIndexPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/screens"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const section = () =>
  screen.getByRole("region", { name: "베이비큐브 입점사 어드민" });

describe("SellerScreenIndexPage", () => {
  it("원본 메뉴 27항목(화면 26 + 상품 등록) + 만든 상세가 카드로 선다", () => {
    renderPage();
    const details = SELLER_SCREENS.filter((s) => s.type === "상세형");
    expect(SELLER_SCREENS.length - details.length).toBe(27);
    expect(
      within(section()).getAllByRole("button", { name: / 열기$/ }),
    ).toHaveLength(SELLER_SCREENS.length);
  });

  it("상세형은 만든 것만 싣는다 — 파일이 있고 경로에 대표 처리단위가 붙는다", () => {
    for (const s of SELLER_SCREENS.filter((e) => e.type === "상세형")) {
      expect(s.file).toBeTruthy();
      expect(s.navId.split("/").length).toBe(3);
    }
  });

  it("카드 버튼 이름이 전부 유일하다 — 판매·렌트에 같은 이름의 화면이 있어도", () => {
    renderPage();
    const names = within(section())
      .getAllByRole("button", { name: / 열기$/ })
      .map((b) => b.getAttribute("aria-label"));
    expect(new Set(names).size).toBe(names.length);
  });

  it("경로가 전부 다르다 — navId 가 곧 경로다", () => {
    const paths = SELLER_SCREENS.map((s) => s.navId);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("카드를 누르면 그 화면의 경로가 넘어간다", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(
      screen.getByRole("button", {
        name: "베이비큐브 입점사 어드민 · 검수·반납 관리 열기",
      }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/rent-insp-return");
  });

  it("아직 만들지 않은 화면은 파일 자리에 「퍼블 작업 전」이 뜬다", () => {
    renderPage();
    const pending = SELLER_SCREENS.filter((s) => !s.file).length;
    expect(within(section()).queryAllByText("퍼블 작업 전")).toHaveLength(
      pending,
    );
  });
});
