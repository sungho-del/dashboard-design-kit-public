import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IconButton } from "./IconButton";

const icon = <svg data-testid="icon" />;

describe("IconButton", () => {
  it("label을 접근 가능한 이름으로 노출한다", () => {
    render(<IconButton label="검색" icon={icon} />);
    expect(screen.getByRole("button", { name: "검색" })).toBeInTheDocument();
  });

  it("전달한 아이콘을 렌더링한다", () => {
    render(<IconButton label="검색" icon={icon} />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("기본 type은 button이다", () => {
    render(<IconButton label="검색" icon={icon} />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("클릭하면 onClick이 호출된다", async () => {
    const onClick = vi.fn();
    render(<IconButton label="검색" icon={icon} onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled면 클릭해도 onClick이 호출되지 않는다", async () => {
    const onClick = vi.fn();
    render(<IconButton label="검색" icon={icon} disabled onClick={onClick} />);
    await userEvent.click(screen.getByRole("button", { name: "검색" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  describe("loading", () => {
    it("클릭을 막고 aria-busy를 노출한다", () => {
      render(<IconButton label="검색" icon={icon} loading />);
      const button = screen.getByRole("button", { name: "검색" });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute("aria-busy", "true");
    });

    it("로딩 중에는 아이콘 대신 스피너를 보여준다", () => {
      render(<IconButton label="검색" icon={icon} loading />);
      expect(screen.queryByTestId("icon")).not.toBeInTheDocument();
    });
  });

  it("size에 따라 정사각 컨트롤 크기를 적용한다", () => {
    const { rerender } = render(
      <IconButton label="검색" icon={icon} size="large" />,
    );
    expect(screen.getByRole("button").className).toContain(
      "h-(--size-control-large)",
    );

    rerender(<IconButton label="검색" icon={icon} size="small" />);
    expect(screen.getByRole("button").className).toContain(
      "h-(--size-control-small)",
    );
  });

  it("pill이면 radius가 full로 바뀐다", () => {
    render(<IconButton label="검색" icon={icon} pill />);
    expect(screen.getByRole("button").className).toContain("rounded-full");
  });

  it("기본 variant는 ghost다 (툴바·행 안에서 가장 흔한 형태)", () => {
    render(<IconButton label="검색" icon={icon} />);
    expect(screen.getByRole("button").className).toContain("bg-transparent");
  });
});
