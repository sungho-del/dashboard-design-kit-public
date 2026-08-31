import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextButton } from "./TextButton";

describe("TextButton", () => {
  it("button role과 라벨을 렌더링한다", () => {
    render(<TextButton>더보기</TextButton>);
    expect(screen.getByRole("button", { name: "더보기" })).toBeInTheDocument();
  });

  it("기본 type은 button이다 (폼 submit 오발동 방지)", () => {
    render(<TextButton>더보기</TextButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("클릭하면 onClick이 호출된다", async () => {
    const onClick = vi.fn();
    render(<TextButton onClick={onClick}>더보기</TextButton>);
    await userEvent.click(screen.getByRole("button", { name: "더보기" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled면 클릭해도 onClick이 호출되지 않는다", async () => {
    const onClick = vi.fn();
    render(
      <TextButton disabled onClick={onClick}>
        더보기
      </TextButton>,
    );
    const button = screen.getByRole("button", { name: "더보기" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("tone", () => {
    it("기본 tone은 accent다", () => {
      render(<TextButton>더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "text-text-accent",
      );
    });

    it("tone에 따라 색 토큰 클래스를 적용한다", () => {
      const { rerender } = render(
        <TextButton tone="secondary">더보기</TextButton>,
      );
      expect(screen.getByRole("button").className).toContain(
        "text-text-secondary",
      );

      rerender(<TextButton tone="critical">더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "text-text-critical",
      );

      rerender(<TextButton tone="warning">더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "text-text-warning",
      );
    });

    it("on tone의 hover는 색이 아니라 opacity로 표현한다 (DESIGN.md §3)", () => {
      render(<TextButton tone="on">더보기</TextButton>);
      const className = screen.getByRole("button").className;
      expect(className).toContain("text-text-on");
      expect(className).toContain("hover:opacity-75");
    });
  });

  describe("size", () => {
    it("기본 size는 medium이다", () => {
      render(<TextButton>더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "label-medium-bold",
      );
    });

    it("size에 따라 타이포 프리셋 클래스를 적용한다", () => {
      const { rerender } = render(<TextButton size="large">더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "label-large-bold",
      );

      rerender(<TextButton size="small">더보기</TextButton>);
      expect(screen.getByRole("button").className).toContain(
        "label-small-bold",
      );
    });

    it("small만 상하 padding 4와 gap 1px을 갖는다", () => {
      const { rerender } = render(<TextButton size="small">더보기</TextButton>);
      const small = screen.getByRole("button").className;
      expect(small).toContain("py-1");
      expect(small).toContain("gap-px");

      rerender(<TextButton size="medium">더보기</TextButton>);
      const medium = screen.getByRole("button").className;
      expect(medium).toContain("p-0");
      expect(medium).toContain("gap-0.5");
    });
  });

  it("disabled면 커서를 not-allowed로 바꾼다", () => {
    render(<TextButton disabled>더보기</TextButton>);
    expect(screen.getByRole("button").className).toContain(
      "disabled:cursor-not-allowed",
    );
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<TextButton className="custom-class">더보기</TextButton>);
    expect(screen.getByRole("button").className).toMatch(/custom-class$/);
  });
});
