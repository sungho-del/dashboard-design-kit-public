import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App";

/**
 * Recharts 의 `ResponsiveContainer` 는 부모 크기를 재려고 `ResizeObserver` 를 쓰는데
 * jsdom 에는 레이아웃도 이 API 도 없다. no-op 으로 채워 렌더만 통과시킨다.
 * **차트의 좌표·경로는 검증하지 않는다** — jsdom 에서 모든 요소의 크기가 0이라 의미가 없다.
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

/**
 * ⚠️ 화면은 **URL 로 정해진다**(`src/lib/router.ts`). 그래서 테스트마다 경로를 먼저 세운다.
 * jsdom 은 테스트 간에 `location` 을 초기화하지 않으므로, 안 세우면 **앞 테스트의 경로가
 * 그대로 새어 들어온다.**
 */
function renderAt(path: string) {
  window.history.pushState(null, "", path);
  return render(<App />);
}

afterEach(() => {
  window.history.pushState(null, "", "/");
});

describe("App", () => {
  /*
   * 화면 목록의 카드 버튼은 `"${묶음} · ${화면명} 열기"` 로 이름이 붙는다.
   * 묶음까지 붙이는 이유는 화면이 늘어나면 "대시보드" 같은 이름이 겹치기 때문이다 —
   * 이름을 바꿔 피하면 기획서 문구가 훼손된다.
   */
  async function openFromIndex(origin: string, screenName: string) {
    await userEvent.click(
      screen.getByRole("button", { name: `${origin} · ${screenName} 열기` }),
    );
  }

  describe("경로 → 화면", () => {
    it("루트(/)는 대시보드다", () => {
      renderAt("/");

      expect(
        screen.getByRole("heading", { name: "대시보드", level: 1 }),
      ).toBeInTheDocument();
    });

    it("경로로 바로 들어갈 수 있다 (딥링크)", () => {
      renderAt("/orders");

      expect(
        screen.getByRole("heading", { name: "주문 관리", level: 1 }),
      ).toBeInTheDocument();
    });

    it("없는 경로는 화면 목록으로 떨어진다", () => {
      renderAt("/이런-경로는-없다");

      expect(
        screen.getByRole("heading", { name: "화면 목록", level: 1 }),
      ).toBeInTheDocument();
    });

    it("GNB 로 이동하면 주소창도 함께 바뀐다", async () => {
      renderAt("/");

      await userEvent.click(screen.getByRole("button", { name: "주문 목록" }));

      expect(window.location.pathname).toBe("/orders");
      expect(
        screen.getByRole("heading", { name: "주문 관리", level: 1 }),
      ).toBeInTheDocument();
    });
  });

  describe("GNB", () => {
    /**
     * ⚠️ GNB 항목 id 와 `App.tsx` 의 `ROUTES` 키는 **같은 문자열**이어야 한다.
     * 한쪽만 고치면 메뉴는 보이는데 눌러도 화면 목록으로 떨어진다.
     */
    it("메뉴 이름이 서로 겹치지 않는다", () => {
      renderAt("/");

      const nav = screen.getByRole("navigation");
      const labels = within(nav)
        .getAllByRole("button")
        .map((b) => b.textContent?.trim())
        .filter((t): t is string => !!t);

      expect(labels).toContain("대시보드");
      expect(labels).toContain("주문 목록");
      expect(labels).toContain("화면 목록");
      expect(new Set(labels).size).toBe(labels.length);
    });
  });

  describe("화면 목록", () => {
    it("템플릿 4종을 보여준다", () => {
      renderAt("/screens");

      const template = screen.getByRole("region", { name: "템플릿" });

      expect(
        within(template).getAllByRole("button", { name: /열기$/ }),
      ).toHaveLength(4);
    });

    it("카드 버튼 이름이 전부 유일하다", () => {
      renderAt("/screens");

      /*
       * 이름이 겹치면 스크린리더로 카드를 고를 수 없다. 화면명만으로는 겹칠 수 있으므로
       * 묶음 이름을 접두로 붙여 유일성을 **구조적으로** 보장한다.
       */
      const names = screen
        .getAllByRole("button", { name: /열기$/ })
        .map((b) => b.getAttribute("aria-label"));

      expect(new Set(names).size).toBe(names.length);
    });

    it("GNB 에 없는 상세 화면도 목록에서 바로 열린다", async () => {
      renderAt("/screens");

      /*
       * 이것이 이 화면의 존재 이유다 — 상세형은 GNB 항목이 아니라
       * 원래는 목록 → 행 클릭 → 사이드시트 → 버튼을 거쳐야 열린다.
       */
      await openFromIndex("템플릿", "주문 상세");

      expect(
        screen.getByRole("heading", { name: "주문 상세", level: 1 }),
      ).toBeInTheDocument();
    });

    it("폼 화면도 목록에서 열린다", async () => {
      renderAt("/screens");
      await openFromIndex("템플릿", "상품 등록");

      expect(
        screen.getByRole("heading", { name: "상품 등록", level: 1 }),
      ).toBeInTheDocument();
      // FormField 가 라벨과 컨트롤을 이어 준다 — id 를 손으로 넘기지 않았는데도 찾힌다
      expect(screen.getByLabelText(/상품명/)).toBeInTheDocument();
    });
  });

  describe("템플릿 화면의 상호작용", () => {
    it("핵심 지표 4종을 보여준다", () => {
      renderAt("/");

      const kpi = screen.getByRole("region", { name: "핵심 지표" });

      for (const label of ["총 매출", "주문 수", "방문자", "결제 전환율"]) {
        expect(within(kpi).getByText(label)).toBeInTheDocument();
      }
    });

    it("차트에 접근 가능한 이름이 붙는다", () => {
      renderAt("/");

      // SVG 는 스크린리더에 내용이 전달되지 않으므로 role="img" + 이름으로 대신한다
      expect(
        screen.getByRole("img", { name: /월별 매출 추이/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: /채널별 방문자 구성비/ }),
      ).toBeInTheDocument();
    });

    it("주문 행 → 사이드시트 → 전체 상세 보기 순으로 상세 페이지에 도달한다", async () => {
      renderAt("/orders");

      const firstRow = screen.getAllByRole("row")[1];
      await userEvent.click(firstRow);

      // 사이드시트는 빠른 미리보기 — InfoList 로 렌더된다
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await userEvent.click(
        screen.getByRole("button", { name: "전체 상세 보기" }),
      );

      expect(
        screen.getByRole("heading", { name: "주문 상세", level: 1 }),
      ).toBeInTheDocument();
      // InfoList 는 dl/dt/dd 시맨틱을 쓴다 — 라벨이 term 으로 읽힌다
      expect(screen.getAllByRole("term").length).toBeGreaterThan(0);
      expect(screen.getByText("ORD-2026-0142")).toBeInTheDocument();
    });
  });
});
