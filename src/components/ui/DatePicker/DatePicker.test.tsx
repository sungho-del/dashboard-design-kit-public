import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DatePicker, type DateRange } from "./DatePicker";

/**
 * jsdom 에는 레이아웃이 없어 `ResizeObserver` / `IntersectionObserver` 가 없다.
 * floating-ui 의 `autoUpdate` 가 둘을 요구하므로 no-op 으로 채운다.
 * **좌표는 검증하지 않는다** — jsdom 에서 모든 요소의 크기는 0 이라 의미가 없다.
 */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

/** 오늘 날짜와 절대 겹치지 않는 과거 달을 고정해 라벨을 결정적으로 만든다 */
const FIXED_MONTH = new Date(2020, 0, 1);

/**
 * 패널이 열리면 날짜 버튼이 잔뜩 생겨 role 질의가 모호해진다.
 * 트리거는 `data-slot` 으로 콕 집어 찾는다.
 */
function getTrigger(): HTMLElement {
  const trigger = document.querySelector('[data-slot="trigger"]');
  if (!trigger) throw new Error("트리거를 찾지 못했다");
  return trigger as HTMLElement;
}

describe("DatePicker", () => {
  it("단일 모드 트리거에 placeholder 를 렌더링한다", () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    expect(screen.getByText("날짜 선택")).toBeInTheDocument();
  });

  it("범위 모드 트리거는 시작일·종료일 두 칸을 렌더링한다", () => {
    render(<DatePicker mode="range" defaultMonth={FIXED_MONTH} />);

    expect(screen.getByText("시작일")).toBeInTheDocument();
    expect(screen.getByText("종료일")).toBeInTheDocument();
  });

  it("트리거에 aria-haspopup='dialog' 와 aria-expanded 가 있다", () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    const trigger = getTrigger();
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("트리거를 클릭하면 role='dialog' 패널이 열린다", async () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(getTrigger());

    const panel = await screen.findByRole("dialog", { name: "날짜 선택" });
    expect(panel).toBeInTheDocument();
    expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
  });

  it("Escape 로 패널이 닫힌다", async () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    await userEvent.click(getTrigger());
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("바깥을 클릭하면 패널이 닫힌다", async () => {
    render(
      <div>
        <button type="button">바깥 버튼</button>
        <DatePicker defaultMonth={FIXED_MONTH} />
      </div>,
    );

    await userEvent.click(screen.getByText("날짜 선택"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "바깥 버튼" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("날짜를 클릭하면 onChange 에 해당 날짜가 전달된다", async () => {
    const onChange = vi.fn();
    render(<DatePicker defaultMonth={FIXED_MONTH} onChange={onChange} />);

    await userEvent.click(getTrigger());
    await userEvent.click(
      await screen.findByRole("button", { name: "2020년 1월 15일" }),
    );

    expect(onChange).toHaveBeenCalledTimes(1);
    const selected = onChange.mock.calls[0][0] as Date;
    expect(selected.getFullYear()).toBe(2020);
    expect(selected.getMonth()).toBe(0);
    expect(selected.getDate()).toBe(15);
  });

  it("제어형으로 값을 내려주면 트리거 표기가 바뀐다", () => {
    render(
      <DatePicker value={new Date(2020, 0, 15)} defaultMonth={FIXED_MONTH} />,
    );

    expect(screen.getByText("2020.01.15")).toBeInTheDocument();
  });

  it("선택된 날짜 셀에 data-selected 가 붙는다", async () => {
    render(
      <DatePicker value={new Date(2020, 0, 15)} defaultMonth={FIXED_MONTH} />,
    );

    await userEvent.click(getTrigger());
    const panel = await screen.findByRole("dialog");

    expect(panel.querySelector('[data-day="2020-01-15"]')).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("범위 모드에서 두 번 클릭하면 from·to 가 채워진다", async () => {
    const onChange = vi.fn();

    function ControlledRange() {
      const [range, setRange] = useState<DateRange | undefined>(undefined);
      return (
        <DatePicker
          mode="range"
          defaultMonth={FIXED_MONTH}
          value={range}
          onChange={(next) => {
            setRange(next);
            onChange(next);
          }}
        />
      );
    }

    render(<ControlledRange />);

    await userEvent.click(screen.getByText("시작일"));
    await userEvent.click(
      await screen.findByRole("button", { name: "2020년 1월 10일" }),
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "2020년 1월 14일" }),
    );

    expect(onChange).toHaveBeenCalledTimes(2);
    const last = onChange.mock.calls[1][0] as DateRange;
    expect(last.from?.getDate()).toBe(10);
    expect(last.to?.getDate()).toBe(14);
    expect(screen.getByText("2020.01.10")).toBeInTheDocument();
    expect(screen.getByText("2020.01.14")).toBeInTheDocument();
  });

  it("범위 중간 날짜에는 range_middle 배경 클래스가 붙는다", async () => {
    render(
      <DatePicker
        mode="range"
        defaultMonth={FIXED_MONTH}
        value={{ from: new Date(2020, 0, 10), to: new Date(2020, 0, 14) }}
      />,
    );

    await userEvent.click(screen.getByText("2020.01.10"));
    const panel = await screen.findByRole("dialog");

    const middle = panel.querySelector('[data-day="2020-01-12"]');
    expect(middle).toHaveClass("data-selected:bg-surface-sub");
    // 시작·끝 날짜는 강한 선택(action-primary)만 갖는다
    const start = panel.querySelector('[data-day="2020-01-10"]');
    expect(start).not.toHaveClass("data-selected:bg-surface-sub");
  });

  it("disabled 트리거는 클릭해도 패널이 열리지 않는다", async () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} disabled />);

    const trigger = getTrigger();
    expect(trigger).toBeDisabled();

    await userEvent.click(trigger);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  describe("트리거 상태 스타일이 서로 덮어쓰지 않는다", () => {
    // cn() 은 클래스를 병합하지 않는다. base 가 bg/outline 을 무조건 내보내고
    // disabled 가 덮으려 하면 명시도가 (0,1,0) 으로 같아 스타일시트 순서가 승자를
    // 정하고, 실제로 비활성 트리거가 활성과 똑같이 그려졌다(Input 과 같은 사고).
    // 있어야 할 것이 있는지가 아니라 **없어야 할 것이 없는지**를 검사한다.
    function triggerClasses(disabled: boolean) {
      render(<DatePicker defaultMonth={FIXED_MONTH} disabled={disabled} />);
      return getTrigger().className.split(/\s+/);
    }

    it("disabled 면 활성 배경·경계선을 아예 방출하지 않는다", () => {
      const cls = triggerClasses(true);

      expect(cls).toContain("bg-field-disabled");
      expect(cls).toContain("outline-0");
      expect(cls).not.toContain("bg-surface");
      expect(cls).not.toContain("outline-1");
      expect(cls).not.toContain("outline-border");
    });

    it("기본 상태에서는 disabled 용 클래스가 없다", () => {
      const cls = triggerClasses(false);

      expect(cls).toContain("bg-surface");
      expect(cls).toContain("outline-1");
      expect(cls).toContain("outline-border");
      expect(cls).not.toContain("bg-field-disabled");
      expect(cls).not.toContain("outline-0");
    });
  });

  it("disabledDates 로 지정한 날짜의 버튼은 비활성이다", async () => {
    render(
      <DatePicker
        defaultMonth={FIXED_MONTH}
        disabledDates={{ before: new Date(2020, 0, 15) }}
      />,
    );

    await userEvent.click(getTrigger());
    await screen.findByRole("dialog");

    expect(
      screen.getByRole("button", { name: "2020년 1월 10일" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "2020년 1월 20일" }),
    ).not.toBeDisabled();
  });

  it("inline 모드는 트리거 없이 달력만 렌더링한다", () => {
    const { container } = render(
      <DatePicker inline defaultMonth={FIXED_MONTH} aria-label="배송일 선택" />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
    // 인라인형은 radius 0 (DESIGN.md §17)
    expect(container.querySelector('[data-slot="panel"]')).toHaveClass(
      "rounded-none",
    );
  });

  it("월 캡션은 한국어로 표기된다", async () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    await userEvent.click(getTrigger());

    expect(await screen.findByText("2020년 1월")).toBeInTheDocument();
  });

  it("이전·다음 달 이동 버튼이 있다", async () => {
    render(<DatePicker defaultMonth={FIXED_MONTH} />);

    await userEvent.click(getTrigger());
    await screen.findByRole("dialog");

    await userEvent.click(screen.getByRole("button", { name: /다음 달/ }));

    expect(screen.getByText("2020년 2월")).toBeInTheDocument();
  });
});
