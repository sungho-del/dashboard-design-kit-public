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

  /** 디자인 §3 #3 — 직영 상품 등록·수정은 셀러 상세 본사 행에서 들어간다(사이드바 메뉴 없음) */
  it("셀러 상세 본사 행의 [+ 상품 등록] 은 직영 상품 등록에 도착한다", async () => {
    renderAt("/sellers/S-0001");

    await userEvent.click(screen.getByRole("button", { name: "상품 등록" }));
    expect(window.location.pathname).toBe("/products/new");
    expect(pageTitle()).toBe("상품 등록");
  });

  it("셀러 상세 본사 행의 상품코드는 직영 상품 상세에 도착한다", async () => {
    renderAt("/sellers/S-0001");

    await userEvent.click(screen.getByRole("button", { name: "HQ240806" }));
    expect(window.location.pathname).toBe("/products/HQ240806");
    expect(pageTitle()).toBe("상품 상세 (수정)");
    expect(
      screen.getByText("폴딩 놀이매트 220 그레이 · HQ240806"),
    ).toBeVisible();
    expect(
      screen.getByText("본사 직영 상품 · 베이비큐브 (S-0001)"),
    ).toBeVisible();
  });

  /** 주문번호는 그 처리단위의 주문 상세로 간다(같은 주문번호의 두 처리단위는 목록 테스트가 본다) */
  it("주문 목록의 주문번호를 누르면 그 처리단위의 주문 상세에 도착한다", async () => {
    renderAt("/orders-all");

    await userEvent.click(
      screen.getByRole("button", { name: "20261018143205" }),
    );

    expect(window.location.pathname).toBe("/orders-all/U-R01");
    expect(pageTitle()).toBe("주문 상세(렌트)");

    await userEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(window.location.pathname).toBe("/orders-all");
  });

  /** 번호 없이 들어온 상세는 그 목록으로(개발 §2-4) — 주소를 바꿔 달아 「뒤로」가 빈 주소로 돌아가 다시 튕기지 않는다 */
  it.each([
    ["/orders-all/", "/orders-all"],
    ["/orders-cancel/", "/orders-cancel"],
    ["/orders-return/", "/orders-return"],
    ["/orders-exchange/", "/orders-exchange"],
  ])(
    "번호 없이 %s 로 들어오면 %s 목록이 열리고 기록은 쌓이지 않는다",
    (path, list) => {
      window.history.pushState(null, "", path);
      const depth = window.history.length;
      render(<App />);

      expect(window.location.pathname).toBe(list);
      expect(window.history.length).toBe(depth);
      expect(screen.queryByText(/찾을 수 없는/)).not.toBeInTheDocument();
      expect(screen.getByRole("table")).toBeVisible();
    },
  );

  /** 클레임 상세도 주문 상세 화면 하나가 맡는다 — 경로가 모드를 정하고 [목록]은 그 클레임 목록으로 */
  it.each([
    ["/orders-cancel", "20261017221014", "U-R20", "취소 상세(렌트)"],
    ["/orders-return", "20261009110216", "U-R25", "반품 상세(렌트)"],
    ["/orders-exchange", "20261011213746", "U-S12", "교환 상세(판매)"],
  ])(
    "%s 의 주문번호를 누르면 그 클레임 상세에 도착하고 [목록]으로 돌아온다",
    async (list, orderNo, id, title) => {
      renderAt(list);

      await userEvent.click(screen.getByRole("button", { name: orderNo }));

      expect(window.location.pathname).toBe(`${list}/${id}`);
      expect(pageTitle()).toBe(title);

      await userEvent.click(screen.getByRole("button", { name: "목록" }));
      expect(window.location.pathname).toBe(list);
    },
  );

  /** 정산 관리의 숨은 상세 4개 — 행을 누르면 그 대상의 상세에 **도착**하고 [목록]으로 돌아온다 */
  it.each([
    ["/settle-seller", "셀러 정산"],
    ["/rent-deposit", "보증금"],
    ["/care-claims", "안심케어"],
    ["/settle-statement", "명세서"],
    /* 프로모션 · 게시판의 상세/폼 */
    ["/promo", "쿠폰"],
    ["/points", "포인트 현황"],
    ["/notices", "공지"],
    ["/faq-admin", "FAQ"],
    ["/reviews-admin", "리뷰"],
    ["/support", "문의"],
    /* 시스템·운영 — 배너·팝업 등록/수정 */
    ["/display", "배너"],
    ["/popups", "팝업"],
  ])("%s 의 첫 행을 누르면 %s 상세에 도착한다", async (list) => {
    renderAt(list);

    const firstRow = within(screen.getByRole("table")).getAllByRole("row")[1];
    await userEvent.click(within(firstRow).getAllByRole("cell")[1]);

    expect(window.location.pathname).toMatch(new RegExp(`^${list}/[^/]+$`));
    expect(pageTitle()).not.toBe("화면 목록");
    expect(screen.queryByText(/^찾을 수 없는/)).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "목록" }));
    expect(window.location.pathname).toBe(list);
  });
});
