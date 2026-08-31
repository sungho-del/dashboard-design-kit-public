import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("label이 있으면 status role로 노출된다", () => {
    render(<Spinner label="불러오는 중" />);
    expect(screen.getByRole("status")).toHaveAccessibleName("불러오는 중");
  });

  it("label이 없으면 장식으로 간주해 접근성 트리에서 숨긴다", () => {
    const { container } = render(<Spinner />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("size를 px로 반영한다", () => {
    const { container } = render(<Spinner size={24} />);
    expect(container.firstChild).toHaveStyle({ width: "24px", height: "24px" });
  });

  it("기본 크기는 16px이다", () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveStyle({ width: "16px" });
  });
});
