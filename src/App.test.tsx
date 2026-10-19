import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";
import { SCREENS } from "./pages/ScreenIndexPage.data";

/**
 * 라우팅 테스트 — **등록된 화면이 전부 실제로 열리는가.**
 *
 * 화면 목록(`SCREENS`)을 단일 원천으로 삼아, 목록의 모든 경로가 폴백(화면 목록)이
 * 아니라 그 화면으로 열리는지를 본다. 퍼블리싱 전달본에도 이 파일이 그대로 들어간다
 * (`npm run export:publishing`) — 그래서 전달본에 없는 템플릿 경로는 여기서 다루지 않는다.
 */
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

/** jsdom 은 테스트 간에 location 을 초기화하지 않는다 — 경로를 먼저 세운다 */
function renderAt(path: string) {
  window.history.pushState(null, "", path);
  return render(<App />);
}

afterEach(() => {
  window.history.pushState(null, "", "/");
});

const pageTitle = () =>
  screen.getAllByRole("heading", { level: 1 })[0].textContent?.trim();

describe("App (전달본)", () => {
  it.each(SCREENS.map((s) => [s.navId, s.name] as const))(
    "%s 는 폴백이 아니라 그 화면으로 열린다 (%s)",
    (path) => {
      renderAt(path);
      expect(pageTitle()).not.toBe("화면 목록");
    },
  );

  it("없는 경로는 화면 목록으로 떨어진다", () => {
    renderAt("/이런-경로는-없다");
    expect(pageTitle()).toBe("화면 목록");
  });

  it("화면 목록에는 BabyCube 화면만 있다", () => {
    renderAt("/screens");
    expect(SCREENS.every((s) => s.origin === "babycube")).toBe(true);
    expect(screen.getAllByRole("button", { name: / 열기$/ })).toHaveLength(
      SCREENS.length,
    );
  });

  it("GNB 라벨이 전부 유일하다 — 원본 9그룹 28항목 + 화면 목록", () => {
    renderAt("/");
    const labels = within(screen.getByRole("navigation"))
      .getAllByRole("button")
      .map((b) => b.textContent?.trim())
      .filter((t): t is string => !!t);

    expect(labels).toContain("대시보드");
    expect(labels).toContain("세금계산서·증빙");
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("GNB 에 데모 메뉴가 없고, 이동하면 주소창이 바뀐다", async () => {
    renderAt("/");
    const nav = screen.getByRole("navigation");
    expect(within(nav).queryByText("클래스온")).not.toBeInTheDocument();

    await userEvent.click(
      within(nav).getByRole("button", { name: "회원 관리" }),
    );
    expect(window.location.pathname).toBe("/members");
  });

  /** 테스트가 이동 호출만 보면 경로가 없어도 통과한다 — 실제로 상세 화면에 **도착**하는지 본다 */
  it("상품 목록의 상품명을 누르면 그 상품의 상세 화면에 도착한다", async () => {
    renderAt("/products");

    await userEvent.click(
      screen.getByRole("button", { name: "회전형 카시트 스핀 360" }),
    );

    expect(window.location.pathname).toBe("/products/BL240814");
    expect(pageTitle()).toBe("상품 상세 (수정)");
    expect(
      screen.getByText("회전형 카시트 스핀 360 · BL240814 · 베이비루"),
    ).toBeVisible();
  });
});
