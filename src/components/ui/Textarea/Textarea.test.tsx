import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./Textarea";

describe("Textarea", () => {
  it("textbox role로 렌더링된다", () => {
    render(<Textarea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("placeholder를 노출한다", () => {
    render(<Textarea placeholder="내용을 입력하세요" />);
    expect(
      screen.getByPlaceholderText("내용을 입력하세요"),
    ).toBeInTheDocument();
  });

  it("입력하면 값이 반영되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);

    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "여러 줄 입력");

    expect(textarea).toHaveValue("여러 줄 입력");
    expect(onChange).toHaveBeenCalled();
  });

  describe("최소 높이", () => {
    it("기본 3행 — rows=3 · min-height 72(+ 상하 패딩 24 = 96)", () => {
      render(<Textarea />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "3");
      expect(textarea).toHaveStyle({ minHeight: "72px" });
    });

    it("minRows로 조절된다", () => {
      render(<Textarea minRows={6} />);
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveAttribute("rows", "6");
      expect(textarea).toHaveStyle({ minHeight: "144px" });
    });

    it("사용처가 넘긴 style이 기본 min-height를 덮는다", () => {
      render(<Textarea style={{ minHeight: 200 }} />);
      expect(screen.getByRole("textbox")).toHaveStyle({ minHeight: "200px" });
    });
  });

  describe("resize", () => {
    it("기본값은 세로 리사이즈다", () => {
      render(<Textarea />);
      expect(screen.getByRole("textbox").className).toContain("resize-y");
    });

    it('resize="none"이면 리사이즈를 잠근다', () => {
      render(<Textarea resize="none" />);
      const className = screen.getByRole("textbox").className;
      expect(className).toContain("resize-none");
      expect(className).not.toContain("resize-y");
    });
  });

  describe("글자수 카운터", () => {
    it("maxLength가 없으면 표시되지 않는다", () => {
      const { container } = render(<Textarea />);
      expect(container.querySelector('[data-part="count"]')).toBeNull();
    });

    it("maxLength가 있으면 현재/최대 형태로 표시된다", () => {
      render(<Textarea maxLength={500} />);
      expect(screen.getByText("0/500")).toBeInTheDocument();
    });

    it("defaultValue 길이를 초기값으로 센다", () => {
      render(<Textarea maxLength={500} defaultValue="12345" />);
      expect(screen.getByText("5/500")).toBeInTheDocument();
    });

    it("입력할 때마다 갱신된다", async () => {
      render(<Textarea maxLength={100} />);

      await userEvent.type(screen.getByRole("textbox"), "안녕하세요");

      expect(screen.getByText("5/100")).toBeInTheDocument();
    });

    it("제어 컴포넌트에서는 value 길이를 그대로 반영한다", () => {
      render(<Textarea maxLength={20} value="1234567890" onChange={vi.fn()} />);
      expect(screen.getByText("10/20")).toBeInTheDocument();
    });

    it("maxLength를 넘겨 입력할 수 없다", async () => {
      render(<Textarea maxLength={5} />);

      const textarea = screen.getByRole("textbox");
      await userEvent.type(textarea, "1234567890");

      expect(textarea).toHaveValue("12345");
      expect(screen.getByText("5/5")).toBeInTheDocument();
    });

    it("카운터는 실측 위치(bottom 8 / right 12)에 절대배치되고 클릭을 가로채지 않는다", () => {
      const { container } = render(<Textarea maxLength={10} />);
      const className =
        container.querySelector('[data-part="count"]')?.className ?? "";
      expect(className).toContain("absolute");
      expect(className).toContain("bottom-2");
      expect(className).toContain("right-3");
      expect(className).toContain("pointer-events-none");
    });

    it("카운터가 보이면 텍스트가 겹치지 않도록 아래 여백을 확보한다", () => {
      render(<Textarea maxLength={10} />);
      expect(screen.getByRole("textbox").className).toContain("pb-4");
    });
  });

  describe("disabled", () => {
    it("입력이 막힌다", async () => {
      const onChange = vi.fn();
      render(<Textarea disabled onChange={onChange} />);

      const textarea = screen.getByRole("textbox");
      expect(textarea).toBeDisabled();

      await userEvent.type(textarea, "입력 시도");
      expect(textarea).toHaveValue("");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("래퍼에 disabled 배경·커서 클래스를 적용하고 경계선을 지운다", () => {
      const { container } = render(<Textarea disabled />);
      const className = container.firstElementChild?.className ?? "";
      expect(className).toContain("bg-field-disabled");
      expect(className).toContain("cursor-not-allowed");
      expect(className).toContain("outline-0");
      expect(className).not.toContain("bg-surface");
    });
  });

  describe("invalid", () => {
    it("aria-invalid를 노출하고 critical 배경을 적용한다", () => {
      const { container } = render(<Textarea invalid />);
      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(container.firstElementChild?.className).toContain(
        "bg-surface-critical-secondary",
      );
    });

    it("hover 경계선이 critical로 바뀐다", () => {
      const { container } = render(<Textarea invalid />);
      const className = container.firstElementChild?.className ?? "";
      expect(className).toContain("hover:outline-border-critical-hover");
      expect(className).not.toContain("hover:outline-border-hover");
    });

    it("기본 상태에서는 aria-invalid를 붙이지 않는다", () => {
      render(<Textarea />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
    });
  });

  it("경계선을 border가 아닌 outline + 음수 offset으로 그린다", () => {
    const { container } = render(<Textarea />);
    const className = container.firstElementChild?.className ?? "";
    expect(className).toContain("outline-1");
    expect(className).toContain("-outline-offset-1");
    expect(className).toContain("focus-within:outline-2");
    expect(className).not.toMatch(/(^|\s)border(-|\s|$)/);
  });

  describe("접근성", () => {
    it("label htmlFor로 연결된다", () => {
      render(
        <>
          <label htmlFor="memo">요청사항</label>
          <Textarea id="memo" />
        </>,
      );
      expect(screen.getByLabelText("요청사항")).toBe(
        screen.getByRole("textbox"),
      );
    });

    it("id를 넘기지 않아도 카운터가 aria-describedby로 연결된다", () => {
      const { container } = render(<Textarea maxLength={50} />);
      const describedby = screen
        .getByRole("textbox")
        .getAttribute("aria-describedby");
      const countId = container
        .querySelector('[data-part="count"]')
        ?.getAttribute("id");

      expect(countId).toBeTruthy();
      expect(describedby).toBe(countId);
    });

    it("사용처가 넘긴 aria-describedby를 유지한 채 카운터를 덧붙인다", () => {
      render(
        <>
          <span id="help">300자 이내로 작성하세요</span>
          <Textarea maxLength={300} aria-describedby="help" />
        </>,
      );
      const describedby =
        screen.getByRole("textbox").getAttribute("aria-describedby") ?? "";
      expect(describedby.split(" ")).toContain("help");
      expect(describedby.split(" ")).toHaveLength(2);
    });

    it("카운터가 없으면 aria-describedby를 만들지 않는다", () => {
      render(<Textarea />);
      expect(screen.getByRole("textbox")).not.toHaveAttribute(
        "aria-describedby",
      );
    });
  });

  it("전달한 className이 마지막에 붙어 래퍼를 오버라이드한다", () => {
    const { container } = render(<Textarea className="custom-class" />);
    expect(container.firstElementChild?.className).toMatch(/custom-class$/);
  });

  it("textareaClassName은 내부 textarea에 붙는다", () => {
    render(<Textarea textareaClassName="custom-textarea" />);
    expect(screen.getByRole("textbox").className).toMatch(/custom-textarea$/);
  });
});
