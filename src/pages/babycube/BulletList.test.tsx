import { render, screen } from "@testing-library/react";
import { BulletList } from "./BulletList";

describe("BulletList", () => {
  it("점은 도형 — 글자 글머리(list-disc·「·」) 없이 항목마다 4px 원", () => {
    const { container } = render(<BulletList items={["첫 줄", "둘째 줄"]} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent(/^첫 줄$/);
    expect(container.querySelector("ul")).not.toHaveClass("list-disc");
    expect(container.querySelectorAll(".rounded-full.size-1")).toHaveLength(2);
  });
});
