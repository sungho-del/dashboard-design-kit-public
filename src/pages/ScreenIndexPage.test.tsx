import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { ScreenIndexPage } from "./ScreenIndexPage";
import { SCREENS } from "./ScreenIndexPage.data";

/* -------------------------------------------------------------------------
 * 화면 목록 — 이 저장소가 만든 화면들을 한자리에 펼쳐 보여주는 색인.
 *
 * ## 무엇을 검증하는가
 * 이 화면의 값어치는 **링크가 실제로 그 화면을 연다**는 것 하나다.
 * 카드가 예쁘게 렌더되는지가 아니라, 누르면 `onNavSelect` 에 **그 화면의 경로**가
 * 넘어가는지를 본다 — 경로가 틀리면 화면은 멀쩡하고 링크만 죽는다.
 *
 * 함께 못박는 것:
 *   1. 세 묶음(템플릿·차트온·BabyCube)이 모두 서고, 카드 수가 데이터와 맞는가
 *   2. 카드 버튼의 접근가능 이름이 **유일한가** — `"열기"` 로만 두면 36개가 같아진다
 *   3. `navId` 가 곧 경로다(라우터가 경로로 화면을 고른다)
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * GNB·Tooltip 이 쓰는 관측기를 no-op 으로 채운다.
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
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <ScreenIndexPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 묶음 하나(섹션)를 이름으로 집는다 */
const group = (name: string) => screen.getByRole("region", { name });

describe("ScreenIndexPage (화면 목록)", () => {
  describe("구성", () => {
    it("세 묶음이 모두 서고 카드 수가 데이터와 같다", () => {
      renderPage();

      for (const origin of ["template", "generated", "babycube"] as const) {
        const items = SCREENS.filter((entry) => entry.origin === origin);
        expect(items.length).toBeGreaterThan(0);
      }

      // 카드마다 `열기` 버튼이 하나씩 — 전체 개수가 데이터와 맞아야 한다
      expect(screen.getAllByRole("button", { name: /열기$/ })).toHaveLength(
        SCREENS.length,
      );
    });

    it("총 화면 수를 헤더가 데이터에서 세어 말한다", () => {
      renderPage();
      expect(screen.getByText(`${SCREENS.length}개`)).toBeVisible();
    });
  });

  /**
   * ⚠️ 이 화면의 존재 이유다. 카드를 눌렀을 때 넘어가는 값이 곧 라우터의 경로라,
   * 여기가 어긋나면 **링크는 열리고 엉뚱한 화면이 뜨거나 아무 일도 안 일어난다.**
   * 타입·린트로는 절대 잡히지 않는다 — 둘 다 그냥 문자열이기 때문이다.
   */
  describe("링크", () => {
    it("카드를 누르면 그 화면의 경로가 넘어간다", async () => {
      const { user, onNavSelect } = renderPage();

      const target = SCREENS.find((entry) => entry.origin === "babycube")!;
      /*
        ⚠️ 화면 이름만으로는 집히지 않는다 — 템플릿 묶음에도 `대시보드` 가 있어
        같은 꼬리를 가진 버튼이 둘이다. 버튼 이름이 **묶음 이름까지 싣는 이유**가
        바로 이것이라, 테스트도 완전한 이름으로 집는다.
      */
      await user.click(
        screen.getByRole("button", {
          name: `생성물 · BabyCube · ${target.name} 열기`,
        }),
      );

      expect(onNavSelect).toHaveBeenCalledWith(target.navId);
    });

    it("모든 카드의 경로가 서로 다르다 — 두 카드가 같은 화면을 열지 않는다", () => {
      const ids = SCREENS.map((entry) => entry.navId);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("경로는 모두 `/` 로 시작한다 — 라우터가 경로로 화면을 고른다", () => {
      for (const entry of SCREENS) {
        expect(entry.navId.startsWith("/")).toBe(true);
      }
    });
  });

  /**
   * 라벨을 `"열기"` 로만 두면 접근가능 이름이 같은 버튼이 화면 수만큼 생겨
   * 스크린리더로 구별할 수 없다. 묶음 이름과 화면 이름을 함께 실어 유일하게 만든다.
   */
  describe("접근성", () => {
    it("`열기` 버튼의 이름이 서로 겹치지 않는다", () => {
      renderPage();

      const names = screen
        .getAllByRole("button", { name: /열기$/ })
        .map((button) => button.getAttribute("aria-label"));

      expect(new Set(names).size).toBe(names.length);
    });

    it("묶음마다 이름표가 붙어 있다", () => {
      renderPage();

      // 이름으로 집힌다는 것 자체가 `aria-label` 이 살아 있다는 뜻이다
      const babycube = SCREENS.filter((entry) => entry.origin === "babycube");
      const section = group("생성물 · BabyCube");
      expect(
        within(section).getAllByRole("button", { name: /열기$/ }),
      ).toHaveLength(babycube.length);
    });
  });
});
