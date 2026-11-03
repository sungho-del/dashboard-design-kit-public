import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input, InputGroup, InputAttachedButton } from "./Input";

describe("Input", () => {
  it("textbox role로 렌더링된다", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("placeholder를 노출한다", () => {
    render(<Input placeholder="내용을 입력하세요" />);
    expect(
      screen.getByPlaceholderText("내용을 입력하세요"),
    ).toBeInTheDocument();
  });

  it("입력하면 값이 반영되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);

    const input = screen.getByRole("textbox");
    await userEvent.type(input, "홍길동");

    expect(input).toHaveValue("홍길동");
    expect(onChange).toHaveBeenCalled();
  });

  describe("disabled", () => {
    it("입력이 막힌다", async () => {
      const onChange = vi.fn();
      render(<Input disabled onChange={onChange} />);

      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();

      await userEvent.type(input, "홍길동");
      expect(input).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("래퍼에 disabled 배경·커서 클래스를 적용한다", () => {
      const { container } = render(<Input disabled />);
      const field = container.firstElementChild;
      expect(field?.className).toContain("bg-field-disabled");
      expect(field?.className).toContain("cursor-not-allowed");
    });
  });

  describe("invalid", () => {
    it("aria-invalid를 노출하고 critical 배경을 적용한다", () => {
      const { container } = render(<Input invalid />);
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(container.firstElementChild?.className).toContain(
        "bg-surface-critical-secondary",
      );
    });

    it("기본 상태에서는 aria-invalid를 붙이지 않는다", () => {
      render(<Input />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });
  });

  it("leftIcon / rightIcon 슬롯을 렌더링한다", () => {
    render(
      <Input
        leftIcon={<span data-testid="left" />}
        rightIcon={<span data-testid="right" />}
      />,
    );
    expect(screen.getByTestId("left")).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("경계선을 border가 아닌 outline + 음수 offset으로 그린다", () => {
    const { container } = render(<Input />);
    const className = container.firstElementChild?.className ?? "";
    expect(className).toContain("outline-1");
    expect(className).toContain("-outline-offset-1");
    expect(className).toContain("focus-within:outline-2");
    expect(className).not.toMatch(/(^|\s)border(-|\s|$)/);
  });

  it("전달한 className이 마지막에 붙어 래퍼를 오버라이드한다", () => {
    const { container } = render(<Input className="custom-class" />);
    expect(container.firstElementChild?.className).toMatch(/custom-class$/);
  });

  it("inputClassName은 내부 input에 붙는다", () => {
    render(<Input inputClassName="custom-input" />);
    expect(screen.getByRole("textbox").className).toMatch(/custom-input$/);
  });

  describe("상태 스타일이 서로 덮어쓰지 않는다", () => {
    // cn() 은 클래스를 병합하지 않는다. base 에서 bg/outline 을 내보내고 disabled 에서
    // 덮으려 하면 명시도가 같아 스타일시트 순서가 승자를 정하고, 실제로 disabled 가
    // 활성 상태와 똑같이 그려졌다. 그래서 "동시에 나오지 않는다"를 직접 검사한다.
    function fieldClasses(ui: ReactElement) {
      const { container } = render(ui);
      return (container.firstElementChild?.className ?? "").split(/\s+/);
    }

    it("disabled 면 활성 배경·경계선을 아예 방출하지 않는다", () => {
      const cls = fieldClasses(<Input disabled />);

      expect(cls).toContain("bg-field-disabled");
      expect(cls).toContain("outline-0");
      expect(cls).not.toContain("bg-surface");
      expect(cls).not.toContain("outline-1");
      expect(cls).not.toContain("outline-border");
    });

    it("invalid 면 기본 배경을 방출하지 않는다", () => {
      const cls = fieldClasses(<Input invalid />);

      expect(cls).toContain("bg-surface-critical-secondary");
      expect(cls).not.toContain("bg-surface");
    });

    it("기본 상태에서는 disabled 용 클래스가 없다", () => {
      const cls = fieldClasses(<Input />);

      expect(cls).toContain("bg-surface");
      expect(cls).toContain("outline-1");
      expect(cls).not.toContain("bg-field-disabled");
      expect(cls).not.toContain("outline-0");
    });
  });

  describe("§5-1 부착형 버튼", () => {
    it("버튼은 40×56 · 3면 inset 경계선을 갖는다", () => {
      render(<InputAttachedButton>검색</InputAttachedButton>);
      const cls = screen.getByRole("button", { name: "검색" }).className;

      expect(cls).toContain("h-(--size-control-medium)");
      expect(cls).toContain("w-14");
      // 좌측은 필드 outline 이 담당하므로 위·오른쪽·아래 3면만 그린다.
      // 원본 `.sjcokig` 와 같은 inset box-shadow 3개.
      expect(cls).toContain("inset_0_1px_0_var(--color-border)");
      expect(cls).toContain("inset_-1px_0_0_var(--color-border)");
      expect(cls).toContain("inset_0_-1px_0_var(--color-border)");
    });

    it("그룹은 맞닿는 면의 radius만 지운다", () => {
      const { container } = render(
        <InputGroup>
          <Input />
          <InputAttachedButton>검색</InputAttachedButton>
        </InputGroup>,
      );
      const group = container.firstElementChild;

      expect(group?.className).toContain(
        "[&>*:not(:last-child)]:rounded-r-none",
      );
      // 우측 모서리는 붙는 쪽이 자기 몫으로 갖는다 — 그룹에서 또 방출하면 중복이다
      expect(group?.className).not.toContain("rounded-r-medium");
      expect(screen.getByRole("button").className).toContain(
        "rounded-r-medium",
      );
    });

    it("disabled 와 hover 배경이 동시에 성립하지 않도록 enabled: 로 못박는다", () => {
      render(<InputAttachedButton>검색</InputAttachedButton>);
      const cls = screen.getByRole("button").className;

      expect(cls).toContain("enabled:hover:bg-action-secondary-hover");
      expect(cls).toContain("disabled:bg-field-disabled");
    });

    it("active 는 data 속성으로 나가고 hover 보다 명시도가 높다", () => {
      render(<InputAttachedButton active>검색</InputAttachedButton>);
      const btn = screen.getByRole("button");

      expect(btn).toHaveAttribute("data-active");
      expect(btn.className).toContain(
        "enabled:data-[active]:hover:bg-action-primary-tonal",
      );
    });

    it("기본 type 은 button 이다 — 폼 안에서 의도치 않게 submit 되면 안 된다", () => {
      render(<InputAttachedButton>검색</InputAttachedButton>);

      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    });
  });
});

/* -------------------------------------------------------------------------
 * 크기 — 표 셀 안에 들어가는 small (셀러 관리 수수료율 인라인 수정)
 * ---------------------------------------------------------------------- */

describe("size", () => {
  const fieldOf = (container: HTMLElement) =>
    (container.firstChild as HTMLElement).className.split(/\s+/);

  it("기본은 medium — 높이 40 · 최소폭 240", () => {
    const { container } = render(<Input aria-label="검색어" />);
    const classes = fieldOf(container);

    expect(classes).toContain("h-(--size-control-medium)");
    expect(classes).toContain("min-w-60");
    expect(classes).toContain("px-3");
  });

  /*
   * 표 행 높이는 48이라 medium(40)은 셀을 꽉 채워 답답하고, min-width 240은
   * 셀을 밀어내 표 레이아웃을 깨뜨린다.
   */
  it("small 은 높이 32 · 최소폭 해제 · padding 8", () => {
    const { container } = render(<Input size="small" aria-label="수수료율" />);
    const classes = fieldOf(container);

    expect(classes).toContain("h-(--size-control-small)");
    expect(classes).toContain("min-w-0");
    expect(classes).toContain("px-2");
  });

  it("높이·최소폭·패딩을 한 번씩만 방출한다 — cn() 은 병합하지 않는다", () => {
    const { container } = render(<Input size="small" aria-label="수수료율" />);
    const classes = fieldOf(container);

    expect(classes.filter((c) => c.startsWith("h-("))).toHaveLength(1);
    expect(classes.filter((c) => c.startsWith("min-w-"))).toHaveLength(1);
    expect(classes.filter((c) => c.startsWith("px-"))).toHaveLength(1);
    expect(classes).not.toContain("min-w-60");
  });

  /*
   * 수수료율(%)처럼 몇 자리만 받는 폼 칸 — 높이 40 은 그대로 두고 최소폭만 푼다.
   * `w-24` 만 주면 min-w-60 이 이겨 240 으로 남았다(셀러 상세 · 입점 심사 상세).
   */
  it("noMinWidth 는 medium 의 높이·패딩을 지키고 최소폭만 배타적으로 푼다", () => {
    const { container } = render(
      <Input noMinWidth className="w-24" aria-label="수수료율" />,
    );
    const classes = fieldOf(container);

    expect(classes).toContain("h-(--size-control-medium)");
    expect(classes).toContain("px-3");
    expect(classes).toContain("w-24");
    expect(classes.filter((c) => c.startsWith("min-w-"))).toEqual(["min-w-0"]);
  });

  it("기본 medium 은 최소폭 클래스를 하나만 낸다", () => {
    const { container } = render(<Input aria-label="검색어" />);
    expect(fieldOf(container).filter((c) => c.startsWith("min-w-"))).toEqual([
      "min-w-60",
    ]);
  });
});
