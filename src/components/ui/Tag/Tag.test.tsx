import { render, screen } from "@testing-library/react";
import { Tag } from "./Tag";

describe("Tag", () => {
  it("자식 텍스트를 렌더링한다", () => {
    render(<Tag>결제완료</Tag>);
    expect(screen.getByText("결제완료")).toBeInTheDocument();
  });

  it("클릭 대상이 아니므로 span으로 렌더링한다", () => {
    render(<Tag>결제완료</Tag>);
    const tag = screen.getByText("결제완료");
    expect(tag.tagName).toBe("SPAN");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("base 스타일(radius full · w-fit · shrink-0)을 적용한다", () => {
    render(<Tag>결제완료</Tag>);
    const className = screen.getByText("결제완료").className;
    expect(className).toContain("rounded-full");
    expect(className).toContain("w-fit");
    expect(className).toContain("shrink-0");
  });

  describe("tone", () => {
    it("기본 tone은 default다", () => {
      render(<Tag>일반</Tag>);
      const className = screen.getByText("일반").className;
      expect(className).toContain("bg-surface-sub");
      expect(className).toContain("text-text-sub");
    });

    it("success는 옅은 배경 + 같은 계열 글자색을 쓴다", () => {
      render(<Tag tone="success">결제완료</Tag>);
      const className = screen.getByText("결제완료").className;
      expect(className).toContain("bg-surface-success-secondary");
      expect(className).toContain("text-text-success");
    });

    it("warning은 옅은 배경 + 같은 계열 글자색을 쓴다", () => {
      render(<Tag tone="warning">승인대기</Tag>);
      const className = screen.getByText("승인대기").className;
      expect(className).toContain("bg-surface-warning-secondary");
      expect(className).toContain("text-text-warning");
    });

    it("critical은 옅은 배경 + 같은 계열 글자색을 쓴다", () => {
      render(<Tag tone="critical">결제실패</Tag>);
      const className = screen.getByText("결제실패").className;
      expect(className).toContain("bg-surface-critical-secondary");
      expect(className).toContain("text-text-critical");
    });

    it("custom은 로컬 CSS 변수로 색을 주입받는다", () => {
      render(
        <Tag
          tone="custom"
          style={{
            "--tag-bg-color": "var(--color-surface-highlight-secondary)",
            "--tag-color": "var(--color-text-accent)",
          }}
        >
          진행중
        </Tag>,
      );
      const tag = screen.getByText("진행중");
      expect(tag.className).toContain("bg-(--tag-bg-color)");
      expect(tag.className).toContain("text-(--tag-color)");
      expect(tag.style.getPropertyValue("--tag-bg-color")).toBe(
        "var(--color-surface-highlight-secondary)",
      );
    });
  });

  describe("size", () => {
    it("기본 size는 medium이다 (12/16 · padding 4/8 · min-w 24)", () => {
      render(<Tag>배지</Tag>);
      const className = screen.getByText("배지").className;
      expect(className).toContain("label-small-bold");
      expect(className).toContain("min-w-6");
      expect(className).toContain("px-2");
      expect(className).toContain("py-1");
    });

    it("small은 11/12 타이포와 min-w 20을 쓴다", () => {
      render(<Tag size="small">배지</Tag>);
      const className = screen.getByText("배지").className;
      expect(className).toContain("label-xsmall");
      expect(className).toContain("min-w-5");
      expect(className).toContain("px-1.5");
    });

    it("large는 14/24 타이포와 min-w 28을 쓴다", () => {
      render(<Tag size="large">배지</Tag>);
      const className = screen.getByText("배지").className;
      expect(className).toContain("label-medium-bold");
      expect(className).toContain("min-w-7");
      expect(className).toContain("px-2.5");
      expect(className).toContain("py-0.5");
    });
  });

  describe("dot", () => {
    it("dot이면 8×8 원형 도트를 그린다", () => {
      render(<Tag dot>배송중</Tag>);
      const dotEl = screen.getByText("배송중").querySelector("[data-tag-dot]");
      expect(dotEl).not.toBeNull();
      expect(dotEl?.className).toContain("size-2");
      expect(dotEl?.className).toContain("rounded-full");
    });

    it("도트 색은 tone의 글자색(currentColor)을 따라간다", () => {
      render(
        <Tag tone="critical" dot>
          취소
        </Tag>,
      );
      const dotEl = screen.getByText("취소").querySelector("[data-tag-dot]");
      expect(dotEl?.className).toContain("bg-current");
    });

    it("도트는 스크린리더에 노출되지 않는다", () => {
      render(<Tag dot>배송중</Tag>);
      const dotEl = screen.getByText("배송중").querySelector("[data-tag-dot]");
      expect(dotEl).toHaveAttribute("aria-hidden");
    });

    it("기본값은 도트 없음이다", () => {
      render(<Tag>배송중</Tag>);
      expect(
        screen.getByText("배송중").querySelector("[data-tag-dot]"),
      ).toBeNull();
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<Tag className="custom-class">배지</Tag>);
    expect(screen.getByText("배지").className).toMatch(/custom-class$/);
  });
});
