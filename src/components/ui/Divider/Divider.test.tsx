import { render, screen } from "@testing-library/react";
import { Divider } from "./Divider";

describe("Divider", () => {
  it("기본은 가로 방향이며 1px 두께로 부모 너비를 채운다", () => {
    const { container } = render(<Divider />);
    const className = (container.firstChild as HTMLElement).className;
    expect(className).toContain("h-px");
    expect(className).toContain("w-full");
  });

  it("기본 tone은 divide다", () => {
    const { container } = render(<Divider />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-divide",
    );
  });

  it("tone에 따라 semantic 색상 클래스를 바꾼다", () => {
    const { container, rerender } = render(<Divider tone="divide-sub" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-divide-sub",
    );

    rerender(<Divider tone="divide-minimal" />);
    expect((container.firstChild as HTMLElement).className).toContain(
      "bg-divide-minimal",
    );
  });

  describe("orientation", () => {
    it("vertical이면 두께가 가로 1px이 된다", () => {
      const { container } = render(<Divider orientation="vertical" />);
      const className = (container.firstChild as HTMLElement).className;
      expect(className).toContain("w-px");
      expect(className).not.toContain("h-px");
    });

    it("vertical의 기본 길이는 16px이다", () => {
      const { container } = render(<Divider orientation="vertical" />);
      expect(container.firstChild).toHaveStyle({ height: "16px" });
    });

    it("length prop으로 vertical 길이를 조절한다", () => {
      const { container } = render(
        <Divider orientation="vertical" length={40} />,
      );
      expect(container.firstChild).toHaveStyle({ height: "40px" });
    });

    it("horizontal에는 length를 적용하지 않는다", () => {
      const { container } = render(<Divider length={40} />);
      expect(container.firstChild).not.toHaveStyle({ height: "40px" });
    });
  });

  describe("접근성", () => {
    it("기본은 장식용이라 접근성 트리에서 숨긴다", () => {
      const { container } = render(<Divider />);
      expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
    });

    it("decorative=false면 separator role로 노출된다", () => {
      render(<Divider decorative={false} />);
      const separator = screen.getByRole("separator");
      expect(separator).toBeInTheDocument();
      expect(separator).not.toHaveAttribute("aria-hidden");
    });

    it("decorative=false면 aria-orientation을 방향에 맞게 노출한다", () => {
      const { rerender } = render(<Divider decorative={false} />);
      expect(screen.getByRole("separator")).toHaveAttribute(
        "aria-orientation",
        "horizontal",
      );

      rerender(<Divider decorative={false} orientation="vertical" />);
      expect(screen.getByRole("separator")).toHaveAttribute(
        "aria-orientation",
        "vertical",
      );
    });
  });

  it("hr이 아니라 div로 렌더링한다 (vertical 지원 · flex 내부 제어)", () => {
    const { container } = render(<Divider />);
    expect((container.firstChild as HTMLElement).tagName).toBe("DIV");
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    const { container } = render(<Divider className="custom-class" />);
    expect((container.firstChild as HTMLElement).className).toMatch(
      /custom-class$/,
    );
  });
});
