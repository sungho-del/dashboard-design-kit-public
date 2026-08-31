import { render, screen } from "@testing-library/react";
import { AppShell } from "./AppShell";

function shellOf(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

function slotOf(container: HTMLElement, slot: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
}

describe("AppShell", () => {
  it("본문 자식을 렌더링한다", () => {
    render(<AppShell>대시보드</AppShell>);
    expect(screen.getByText("대시보드")).toBeVisible();
  });

  describe("셸 배치 (DESIGN.md §0)", () => {
    it("가로 flex · min-h-dvh · 페이지 배경을 쓴다", () => {
      const { container } = render(<AppShell>본문</AppShell>);
      const shell = shellOf(container);
      expect(shell).toHaveClass("flex", "min-h-dvh", "bg-bg");
    });

    it("콘텐츠 컬럼은 flex-1 · min-w-0으로 가로 스크롤을 막는다", () => {
      const { container } = render(<AppShell>본문</AppShell>);
      const content = slotOf(container, "content");
      expect(content).toHaveClass("flex-1", "min-w-0", "flex-col");
    });

    it("본문은 좌우 gutter 40 · 세로 24를 갖는다", () => {
      const { container } = render(<AppShell>본문</AppShell>);
      const body = slotOf(container, "body");
      expect(body).toHaveClass("px-10", "py-6", "flex-1");
    });

    it("본문은 main 랜드마크다", () => {
      render(<AppShell>본문</AppShell>);
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("슬롯", () => {
    it("사이드바를 콘텐츠 컬럼보다 앞에 렌더링한다", () => {
      const { container } = render(
        <AppShell sidebar={<nav aria-label="주 메뉴">메뉴</nav>}>
          본문
        </AppShell>,
      );
      const shell = shellOf(container);
      const sidebar = screen.getByRole("navigation", { name: "주 메뉴" });
      const content = slotOf(container, "content");

      expect(shell.children[0]).toBe(sidebar);
      expect(shell.children[1]).toBe(content);
    });

    it("사이드바를 래퍼로 감싸지 않는다 (GNB가 자기 폭·높이를 책임진다)", () => {
      const { container } = render(
        <AppShell sidebar={<aside data-testid="gnb" />}>본문</AppShell>,
      );
      expect(shellOf(container).children[0]).toBe(screen.getByTestId("gnb"));
    });

    it("헤더는 콘텐츠 컬럼 안, 본문 바깥(위)에 놓인다", () => {
      const { container } = render(
        <AppShell header={<div data-testid="page-header" />}>본문</AppShell>,
      );
      const content = slotOf(container, "content");
      const body = slotOf(container, "body");
      const header = screen.getByTestId("page-header");

      expect(content?.children[0]).toBe(header);
      expect(content?.children[1]).toBe(body);
      expect(body).not.toContainElement(header);
    });

    it("사이드바·헤더가 없어도 셸이 성립한다", () => {
      const { container } = render(<AppShell>본문</AppShell>);
      expect(shellOf(container).children).toHaveLength(1);
      expect(screen.getByText("본문")).toBeVisible();
    });
  });

  describe("maxWidth", () => {
    it("기본은 폭 제한이 없다 (레거시 1100px을 기본값으로 쓰지 않는다)", () => {
      const { container } = render(<AppShell>본문</AppShell>);
      expect(slotOf(container, "body")?.style.maxWidth).toBe("");
    });

    it("지정하면 본문에 최대폭을 건다", () => {
      const { container } = render(<AppShell maxWidth="1100px">본문</AppShell>);
      expect(slotOf(container, "body")).toHaveStyle({ maxWidth: "1100px" });
    });
  });

  it("className을 마지막에 붙여 오버라이드할 수 있다", () => {
    const { container } = render(
      <AppShell className="custom-shell">본문</AppShell>,
    );
    expect(shellOf(container)).toHaveClass("custom-shell");
  });
});
