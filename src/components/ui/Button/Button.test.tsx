import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("button role과 라벨을 렌더링한다", () => {
    render(<Button>확인</Button>);
    expect(screen.getByRole("button", { name: "확인" })).toBeInTheDocument();
  });

  it("기본 type은 button이다 (폼 submit 오발동 방지)", () => {
    render(<Button>확인</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("클릭하면 onClick이 호출된다", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>확인</Button>);
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled면 클릭해도 onClick이 호출되지 않는다", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        확인
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "확인" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("loading", () => {
    it("클릭을 막고 aria-busy를 노출한다", async () => {
      const onClick = vi.fn();
      render(
        <Button loading onClick={onClick}>
          저장
        </Button>,
      );
      const button = screen.getByRole("button", { name: /저장/ });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("disabled와 구분되도록 data-loading을 표시한다", () => {
      render(<Button loading>저장</Button>);
      expect(screen.getByRole("button")).toHaveAttribute(
        "data-loading",
        "true",
      );
    });

    it("loading이 아니면 data-loading을 붙이지 않는다", () => {
      render(<Button>저장</Button>);
      expect(screen.getByRole("button")).not.toHaveAttribute("data-loading");
    });

    it("로딩 중에도 라벨 텍스트를 유지한다", () => {
      render(<Button loading>저장 중</Button>);
      expect(screen.getByRole("button", { name: /저장 중/ })).toBeVisible();
    });
  });

  it("size에 따라 컨트롤 높이 토큰을 적용한다", () => {
    const { rerender } = render(<Button size="large">확인</Button>);
    expect(screen.getByRole("button").className).toContain(
      "h-(--size-control-large)",
    );

    rerender(<Button size="xsmall">확인</Button>);
    expect(screen.getByRole("button").className).toContain(
      "h-(--size-control-xsmall)",
    );
  });

  it("pill이면 radius가 full로 바뀐다", () => {
    render(<Button pill>확인</Button>);
    const className = screen.getByRole("button").className;
    expect(className).toContain("rounded-full");
    expect(className).not.toContain("rounded-medium");
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<Button className="custom-class">확인</Button>);
    expect(screen.getByRole("button").className).toMatch(/custom-class$/);
  });
});
