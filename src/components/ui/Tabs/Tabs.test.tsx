import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, type TabItem } from "./Tabs";

const ITEMS: TabItem[] = [
  { value: "all", label: "전체" },
  { value: "orders", label: "주문" },
  { value: "claims", label: "취소·반품" },
];

describe("Tabs", () => {
  it("tablist와 tab 목록을 렌더링한다", () => {
    render(<Tabs items={ITEMS} aria-label="주문 탭" />);
    expect(
      screen.getByRole("tablist", { name: "주문 탭" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("defaultValue가 없으면 첫 번째 활성 탭이 선택된다", () => {
    render(<Tabs items={ITEMS} />);
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("첫 탭이 disabled면 그다음 활성 탭이 선택된다", () => {
    render(
      <Tabs items={[{ ...ITEMS[0], disabled: true }, ITEMS[1], ITEMS[2]]} />,
    );
    expect(screen.getByRole("tab", { name: "주문" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("defaultValue로 초기 선택을 지정한다", () => {
    render(<Tabs items={ITEMS} defaultValue="claims" />);
    expect(screen.getByRole("tab", { name: "취소·반품" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("클릭하면 선택이 옮겨가고 onValueChange가 호출된다", async () => {
    const onValueChange = vi.fn();
    render(<Tabs items={ITEMS} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "주문" }));

    expect(onValueChange).toHaveBeenCalledWith("orders");
    expect(screen.getByRole("tab", { name: "주문" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("제어 모드에서는 value가 바뀌기 전까지 선택이 유지된다", async () => {
    const onValueChange = vi.fn();
    render(<Tabs items={ITEMS} value="all" onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("tab", { name: "주문" }));

    expect(onValueChange).toHaveBeenCalledWith("orders");
    expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("선택된 탭에만 밑줄(after) 클래스가 붙는다", () => {
    render(<Tabs items={ITEMS} defaultValue="orders" />);
    expect(screen.getByRole("tab", { name: "주문" }).className).toContain(
      "after:bg-action-primary",
    );
    expect(screen.getByRole("tab", { name: "전체" }).className).not.toContain(
      "after:bg-action-primary",
    );
  });

  describe("키보드 이동", () => {
    it("좌우 화살표로 선택이 이동한다", async () => {
      render(<Tabs items={ITEMS} />);

      await userEvent.click(screen.getByRole("tab", { name: "전체" }));
      await userEvent.keyboard("{ArrowRight}");
      expect(screen.getByRole("tab", { name: "주문" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      await userEvent.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("양 끝에서 화살표를 누르면 반대편으로 순환한다", async () => {
      render(<Tabs items={ITEMS} />);

      await userEvent.click(screen.getByRole("tab", { name: "전체" }));
      await userEvent.keyboard("{ArrowLeft}");
      expect(screen.getByRole("tab", { name: "취소·반품" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("Home·End로 처음·마지막 탭으로 이동한다", async () => {
      render(<Tabs items={ITEMS} defaultValue="orders" />);

      await userEvent.click(screen.getByRole("tab", { name: "주문" }));
      await userEvent.keyboard("{End}");
      expect(screen.getByRole("tab", { name: "취소·반품" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      await userEvent.keyboard("{Home}");
      expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("이동 시 다음 탭으로 포커스도 함께 옮긴다", async () => {
      render(<Tabs items={ITEMS} />);

      await userEvent.click(screen.getByRole("tab", { name: "전체" }));
      await userEvent.keyboard("{ArrowRight}");

      expect(screen.getByRole("tab", { name: "주문" })).toHaveFocus();
    });

    it("disabled 탭은 건너뛴다", async () => {
      render(
        <Tabs items={[ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]} />,
      );

      await userEvent.click(screen.getByRole("tab", { name: "전체" }));
      await userEvent.keyboard("{ArrowRight}");

      expect(screen.getByRole("tab", { name: "취소·반품" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });
  });

  describe("disabled 탭", () => {
    it("클릭해도 선택이 바뀌지 않는다", async () => {
      const onValueChange = vi.fn();
      render(
        <Tabs
          items={[ITEMS[0], { ...ITEMS[1], disabled: true }]}
          onValueChange={onValueChange}
        />,
      );

      await userEvent.click(screen.getByRole("tab", { name: "주문" }));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("tab", { name: "주문" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    it("cursor-not-allowed와 disabled 텍스트 색을 적용한다", () => {
      render(<Tabs items={[ITEMS[0], { ...ITEMS[1], disabled: true }]} />);
      const className = screen.getByRole("tab", { name: "주문" }).className;
      expect(className).toContain("cursor-not-allowed");
      expect(className).toContain("text-text-disabled");
    });
  });

  describe("접근성 속성", () => {
    it("선택된 탭만 tabIndex 0을 갖는다 (roving tabindex)", () => {
      render(<Tabs items={ITEMS} />);
      expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
        "tabindex",
        "0",
      );
      expect(screen.getByRole("tab", { name: "주문" })).toHaveAttribute(
        "tabindex",
        "-1",
      );
    });

    it("controls를 주면 aria-controls로 패널을 연결한다", () => {
      render(
        <Tabs items={[{ ...ITEMS[0], controls: "panel-all" }, ITEMS[1]]} />,
      );
      expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
        "aria-controls",
        "panel-all",
      );
    });

    it("id를 주면 그대로 쓰고, 없으면 인스턴스별로 자동 생성한다", () => {
      render(
        <>
          <Tabs items={[{ ...ITEMS[0], id: "tab-all" }]} />
          <Tabs items={[ITEMS[0]]} />
        </>,
      );
      const tabs = screen.getAllByRole("tab", { name: "전체" });
      expect(tabs[0]).toHaveAttribute("id", "tab-all");
      expect(tabs[1].id).not.toBe("");
      expect(tabs[1].id).not.toBe("tab-all");
    });

    it("기본 type은 button이다 (폼 submit 오발동 방지)", () => {
      render(<Tabs items={ITEMS} />);
      expect(screen.getByRole("tab", { name: "전체" })).toHaveAttribute(
        "type",
        "button",
      );
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<Tabs items={ITEMS} className="custom-class" />);
    expect(screen.getByRole("tablist").className).toMatch(/custom-class$/);
  });
});
