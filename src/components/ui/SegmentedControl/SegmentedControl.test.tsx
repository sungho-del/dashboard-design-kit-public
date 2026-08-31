import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SegmentedControl,
  type SegmentedControlItem,
} from "./SegmentedControl";

const ITEMS: SegmentedControlItem[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

/** 인디케이터는 장식 요소라 role이 없다 — data-part로 찾는다 */
function getIndicator(container: HTMLElement) {
  return container.querySelector('[data-part="indicator"]');
}

describe("SegmentedControl", () => {
  it("radiogroup과 radio 목록을 렌더링한다", () => {
    render(<SegmentedControl items={ITEMS} aria-label="기간 선택" />);
    expect(
      screen.getByRole("radiogroup", { name: "기간 선택" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("defaultValue가 없으면 첫 번째 활성 항목이 선택된다", () => {
    render(<SegmentedControl items={ITEMS} />);
    expect(screen.getByRole("radio", { name: "일간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("defaultValue로 초기 선택을 지정한다", () => {
    render(<SegmentedControl items={ITEMS} defaultValue="month" />);
    expect(screen.getByRole("radio", { name: "월간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("클릭하면 선택이 옮겨가고 onValueChange가 호출된다", async () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl items={ITEMS} onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "주간" }));

    expect(onValueChange).toHaveBeenCalledWith("week");
    expect(screen.getByRole("radio", { name: "주간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "일간" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("제어 모드에서는 value가 바뀌기 전까지 선택이 유지된다", async () => {
    const onValueChange = vi.fn();
    render(
      <SegmentedControl
        items={ITEMS}
        value="day"
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "주간" }));

    expect(onValueChange).toHaveBeenCalledWith("week");
    expect(screen.getByRole("radio", { name: "일간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("좌우 화살표로 선택이 이동하고 순환한다", async () => {
    render(<SegmentedControl items={ITEMS} />);

    await userEvent.click(screen.getByRole("radio", { name: "일간" }));
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "주간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "주간" })).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "월간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  describe("disabled 항목", () => {
    it("클릭해도 선택이 바뀌지 않는다", async () => {
      const onValueChange = vi.fn();
      render(
        <SegmentedControl
          items={[ITEMS[0], { ...ITEMS[1], disabled: true }]}
          onValueChange={onValueChange}
        />,
      );

      await userEvent.click(screen.getByRole("radio", { name: "주간" }));

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("radio", { name: "주간" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
    });

    it("화살표 이동에서도 건너뛴다", async () => {
      render(
        <SegmentedControl
          items={[ITEMS[0], { ...ITEMS[1], disabled: true }, ITEMS[2]]}
        />,
      );

      await userEvent.click(screen.getByRole("radio", { name: "일간" }));
      await userEvent.keyboard("{ArrowRight}");

      expect(screen.getByRole("radio", { name: "월간" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
    });

    it("cursor-not-allowed와 disabled 텍스트 색을 적용한다", () => {
      render(
        <SegmentedControl
          items={[ITEMS[0], { ...ITEMS[1], disabled: true }]}
        />,
      );
      const className = screen.getByRole("radio", { name: "주간" }).className;
      expect(className).toContain("cursor-not-allowed");
      expect(className).toContain("text-text-disabled");
    });
  });

  describe("variant", () => {
    it("solid는 인디케이터를 action-primary로 채우고 선택 글자를 반전시킨다", () => {
      const { container } = render(
        <SegmentedControl items={ITEMS} variant="solid" />,
      );
      expect(getIndicator(container)?.className).toContain("bg-action-primary");
      expect(screen.getByRole("radio", { name: "일간" }).className).toContain(
        "text-text-inverse",
      );
    });

    it("outline은 테두리만 그리고 선택 글자색은 text를 유지한다", () => {
      const { container } = render(
        <SegmentedControl items={ITEMS} variant="outline" />,
      );
      expect(getIndicator(container)?.className).toContain(
        "outline-action-primary",
      );
      expect(
        screen.getByRole("radio", { name: "일간" }).className,
      ).not.toContain("text-text-inverse");
    });

    it("raised는 secondary 배경 + raised-button 그림자를 쓴다", () => {
      const { container } = render(
        <SegmentedControl items={ITEMS} variant="raised" />,
      );
      const className = getIndicator(container)?.className ?? "";
      expect(className).toContain("bg-action-secondary");
      expect(className).toContain("shadow-raised-button");
    });
  });

  it("fill에 따라 트랙 배경·패딩이 달라진다", () => {
    const { rerender } = render(<SegmentedControl items={ITEMS} />);
    expect(screen.getByRole("radiogroup").className).toContain(
      "bg-surface-sub",
    );

    rerender(<SegmentedControl items={ITEMS} fill="plain" />);
    expect(screen.getByRole("radiogroup").className).toContain(
      "bg-transparent",
    );
  });

  it("size에 따라 padding·min-width가 달라진다", () => {
    const { rerender } = render(
      <SegmentedControl items={ITEMS} size="small" />,
    );
    expect(screen.getByRole("radio", { name: "일간" }).className).toContain(
      "min-w-[54px]",
    );

    rerender(<SegmentedControl items={ITEMS} size="large" />);
    expect(screen.getByRole("radio", { name: "일간" }).className).toContain(
      "min-w-16",
    );
  });

  it("fullWidth면 컨테이너는 w-full, 항목은 flex-1이 된다", () => {
    render(<SegmentedControl items={ITEMS} fullWidth />);
    expect(screen.getByRole("radiogroup").className).toContain("w-full");
    expect(screen.getByRole("radio", { name: "일간" }).className).toContain(
      "flex-1",
    );
  });

  describe("접근성 속성", () => {
    it("선택된 항목만 tabIndex 0을 갖는다 (roving tabindex)", () => {
      render(<SegmentedControl items={ITEMS} />);
      expect(screen.getByRole("radio", { name: "일간" })).toHaveAttribute(
        "tabindex",
        "0",
      );
      expect(screen.getByRole("radio", { name: "주간" })).toHaveAttribute(
        "tabindex",
        "-1",
      );
    });

    it("인디케이터는 aria-hidden이고 포인터 이벤트를 받지 않는다", () => {
      const { container } = render(<SegmentedControl items={ITEMS} />);
      const indicator = getIndicator(container);
      expect(indicator).toHaveAttribute("aria-hidden", "true");
      expect(indicator?.className).toContain("pointer-events-none");
    });

    it("기본 type은 button이다 (폼 submit 오발동 방지)", () => {
      render(<SegmentedControl items={ITEMS} />);
      expect(screen.getByRole("radio", { name: "일간" })).toHaveAttribute(
        "type",
        "button",
      );
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<SegmentedControl items={ITEMS} className="custom-class" />);
    expect(screen.getByRole("radiogroup").className).toMatch(/custom-class$/);
  });
});
