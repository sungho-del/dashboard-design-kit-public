import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

/** 루트 엘리먼트의 className을 꺼내는 헬퍼 */
function classOf(container: HTMLElement): string {
  return (container.firstChild as HTMLElement).className;
}

describe("EmptyState", () => {
  it("제목을 렌더링한다", () => {
    render(<EmptyState title="등록된 상품이 없습니다" />);
    expect(screen.getByText("등록된 상품이 없습니다")).toBeVisible();
  });

  it("설명은 선택이며, 주지 않으면 렌더링하지 않는다", () => {
    const { rerender } = render(<EmptyState title="비었습니다" />);
    expect(screen.queryByText("첫 상품을 등록해 보세요")).toBeNull();

    rerender(
      <EmptyState title="비었습니다" description="첫 상품을 등록해 보세요" />,
    );
    expect(screen.getByText("첫 상품을 등록해 보세요")).toBeVisible();
  });

  it("액션(children)을 하단 슬롯에 렌더링한다", () => {
    render(
      <EmptyState title="비었습니다">
        <button type="button">상품 등록</button>
      </EmptyState>,
    );
    expect(screen.getByRole("button", { name: "상품 등록" })).toBeVisible();
  });

  describe("공통 레이아웃", () => {
    it("세로 flex center · text-center · pre-wrap을 항상 적용한다", () => {
      const { container } = render(<EmptyState title="비었습니다" />);
      const className = classOf(container);
      expect(className).toContain("flex-col");
      expect(className).toContain("items-center");
      expect(className).toContain("justify-center");
      expect(className).toContain("text-center");
      expect(className).toContain("whitespace-pre-wrap");
    });

    it("문구의 줄바꿈이 pre-wrap으로 보존된다", () => {
      render(<EmptyState title={"첫 줄\n둘째 줄"} />);
      expect(screen.getByText(/첫 줄/)).toBeVisible();
    });
  });

  describe("size 프리셋 (DESIGN.md §16)", () => {
    it("기본값은 page다 — 높이 400(min-h-100) · gap 20", () => {
      const { container } = render(<EmptyState title="비었습니다" />);
      const className = classOf(container);
      expect(className).toContain("min-h-100");
      expect(className).toContain("gap-5");
    });

    it("table은 높이 320(min-h-80) · gap 20", () => {
      const { container } = render(
        <EmptyState size="table" title="비었습니다" />,
      );
      const className = classOf(container);
      expect(className).toContain("min-h-80");
      expect(className).toContain("gap-5");
    });

    it("section은 높이 240(min-h-60) · gap 4", () => {
      const { container } = render(
        <EmptyState size="section" title="비었습니다" />,
      );
      const className = classOf(container);
      expect(className).toContain("min-h-60");
      expect(className).toContain("gap-1");
    });

    /**
     * 214는 4px 그리드에 없는 유일한 값이다. 임의 px(`min-h-[…px]`)가 아니라
     * spacing 토큰의 소수 배수(`min-h-53.5` = 4 × 53.5)로 표현했는지까지 고정한다.
     */
    it("search는 높이 214(min-h-53.5) · gap 8 — 임의 px를 쓰지 않는다", () => {
      const { container } = render(
        <EmptyState size="search" title="비었습니다" />,
      );
      const className = classOf(container);
      expect(className).toContain("min-h-53.5");
      expect(className).toContain("gap-2");
      expect(className).not.toContain("[214px]");
    });

    it("compact는 높이 120(min-h-30) · gap 8", () => {
      const { container } = render(
        <EmptyState size="compact" title="비었습니다" />,
      );
      const className = classOf(container);
      expect(className).toContain("min-h-30");
      expect(className).toContain("gap-2");
    });

    it("size를 data 속성으로 노출한다", () => {
      const { container } = render(
        <EmptyState size="table" title="비었습니다" />,
      );
      expect(container.firstChild).toHaveAttribute("data-size", "table");
    });
  });

  describe("타이포 (프리셋 클래스만)", () => {
    it("page·table은 제목 heading-medium-bold · 설명 body-medium", () => {
      render(<EmptyState size="page" title="제목" description="설명" />);
      expect(screen.getByText("제목").className).toContain(
        "heading-medium-bold",
      );
      expect(screen.getByText("설명").className).toContain("body-medium");
    });

    it("section·compact는 제목 body-medium-bold · 설명 body-small로 내려간다", () => {
      render(<EmptyState size="section" title="제목" description="설명" />);
      expect(screen.getByText("제목").className).toContain("body-medium-bold");
      expect(screen.getByText("설명").className).toContain("body-small");
    });

    it("search도 좁은 자리라 section과 같은 단계를 쓴다", () => {
      render(<EmptyState size="search" title="제목" description="설명" />);
      expect(screen.getByText("제목").className).toContain("body-medium-bold");
      expect(screen.getByText("설명").className).toContain("body-small");
    });

    it("설명은 text-sub로 제목과 위계를 만든다", () => {
      render(<EmptyState title="제목" description="설명" />);
      expect(screen.getByText("설명").className).toContain("text-text-sub");
    });
  });

  describe("아이콘", () => {
    it("page·table은 72px(size-18) 프레임을 쓴다", () => {
      const { container } = render(
        <EmptyState title="비었습니다" icon={<svg />} />,
      );
      const icon = container.querySelector("[data-empty-state-icon]");
      expect(icon?.className).toContain("size-18");
    });

    it("section·search·compact는 48px(size-12) 프레임으로 줄어든다", () => {
      for (const size of ["section", "search", "compact"] as const) {
        const { container, unmount } = render(
          <EmptyState size={size} title="비었습니다" icon={<svg />} />,
        );
        const icon = container.querySelector("[data-empty-state-icon]");
        expect(icon?.className).toContain("size-12");
        unmount();
      }
    });

    it("장식용이라 접근성 트리에서 숨긴다", () => {
      const { container } = render(
        <EmptyState title="비었습니다" icon={<svg />} />,
      );
      expect(
        container.querySelector("[data-empty-state-icon]"),
      ).toHaveAttribute("aria-hidden");
    });

    it("아이콘을 주지 않으면 프레임 자체를 만들지 않는다", () => {
      const { container } = render(<EmptyState title="비었습니다" />);
      expect(container.querySelector("[data-empty-state-icon]")).toBeNull();
    });
  });

  describe("sticky (테이블 빈 상태)", () => {
    it("기본은 sticky가 아니다", () => {
      const { container } = render(<EmptyState title="비었습니다" />);
      expect(classOf(container)).not.toContain("sticky");
    });

    it("sticky면 가로 스크롤과 무관하게 중앙 고정된다", () => {
      const { container } = render(
        <EmptyState size="table" title="비었습니다" sticky />,
      );
      const className = classOf(container);
      expect(className).toContain("sticky");
      expect(className).toContain("left-1/2");
      expect(className).toContain("-translate-x-1/2");
      // translateX(-50%)가 내용 폭 기준으로 맞으려면 폭이 내용에 맞아야 한다
      expect(className).toContain("w-fit");
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    const { container } = render(
      <EmptyState title="비었습니다" className="custom-class" />,
    );
    expect(classOf(container)).toMatch(/custom-class$/);
  });

  it("나머지 props는 루트로 전달된다", () => {
    const { container } = render(
      <EmptyState title="비었습니다" id="products-empty" />,
    );
    expect(container.firstChild).toHaveAttribute("id", "products-empty");
  });
});
