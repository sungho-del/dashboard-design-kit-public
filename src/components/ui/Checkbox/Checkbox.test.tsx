import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("checkbox role로 렌더링된다", () => {
    render(<Checkbox label="동의" />);
    expect(screen.getByRole("checkbox", { name: "동의" })).toBeInTheDocument();
  });

  it("label prop이 컨트롤과 연결된다 — 라벨 텍스트로 찾을 수 있다", () => {
    render(<Checkbox label="마케팅 정보 수신" />);
    expect(screen.getByLabelText("마케팅 정보 수신")).toBeInstanceOf(
      HTMLInputElement,
    );
  });

  it("id를 넘기지 않아도 자동 생성된 id로 label과 연결된다", () => {
    render(<Checkbox label="자동 연결" />);
    const input = screen.getByRole("checkbox");
    expect(input.id).not.toBe("");
    expect(screen.getByText("자동 연결").closest("label")).toHaveAttribute(
      "for",
      input.id,
    );
  });

  it("description을 aria-describedby로 연결한다", () => {
    render(<Checkbox label="알림" description="언제든 해제할 수 있어요" />);
    const input = screen.getByRole("checkbox");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "언제든 해제할 수 있어요",
    );
  });

  it("클릭하면 토글되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    render(<Checkbox label="동의" onChange={onChange} />);

    const input = screen.getByRole("checkbox");
    await userEvent.click(input);

    expect(input).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("라벨 텍스트를 클릭해도 토글된다", async () => {
    render(<Checkbox label="동의" />);

    await userEvent.click(screen.getByText("동의"));

    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("Space 키로 토글된다", async () => {
    render(<Checkbox label="동의" />);
    const input = screen.getByRole("checkbox");

    await userEvent.tab();
    expect(input).toHaveFocus();

    await userEvent.keyboard(" ");
    expect(input).toBeChecked();

    await userEvent.keyboard(" ");
    expect(input).not.toBeChecked();
  });

  it("비제어 모드에서 defaultChecked가 초기값이 된다", () => {
    render(<Checkbox label="동의" defaultChecked />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("제어 모드에서는 사용처 상태를 따른다", async () => {
    function Controlled() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          label="동의"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
        />
      );
    }
    render(<Controlled />);

    const input = screen.getByRole("checkbox");
    await userEvent.click(input);
    expect(input).toBeChecked();
  });

  describe("indeterminate", () => {
    it("네이티브 indeterminate 프로퍼티를 세팅한다", () => {
      render(<Checkbox label="전체 선택" indeterminate />);
      expect(screen.getByRole("checkbox")).toBePartiallyChecked();
    });

    it("indeterminate가 아니면 부분 선택이 아니다", () => {
      render(<Checkbox label="전체 선택" />);
      expect(screen.getByRole("checkbox")).not.toBePartiallyChecked();
    });

    it("부분 선택도 선택과 같은 채움(action-primary)을 쓴다", () => {
      const { container } = render(<Checkbox indeterminate />);
      const box = container.querySelector('[data-part="box"]');
      expect(box?.className).toContain("bg-action-primary");
    });
  });

  describe("disabled", () => {
    it("클릭해도 토글되지 않는다", async () => {
      const onChange = vi.fn();
      render(<Checkbox label="동의" disabled onChange={onChange} />);

      const input = screen.getByRole("checkbox");
      expect(input).toBeDisabled();

      await userEvent.click(input);
      expect(input).not.toBeChecked();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("비활성 토큰과 cursor-not-allowed를 적용한다", () => {
      const { container } = render(<Checkbox label="동의" disabled />);
      const box = container.querySelector('[data-part="box"]');

      expect(box?.className).toContain("bg-field-disabled");
      expect(box?.className).toContain("text-icon-disabled");
      expect(container.firstElementChild?.className).toContain(
        "cursor-not-allowed",
      );
    });
  });

  describe("invalid", () => {
    it("aria-invalid와 critical 경계선을 적용한다", () => {
      const { container } = render(<Checkbox label="동의" invalid />);

      expect(screen.getByRole("checkbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(container.querySelector('[data-part="box"]')?.className).toContain(
        "outline-border-critical",
      );
    });

    it("기본 상태에서는 aria-invalid를 붙이지 않는다", () => {
      render(<Checkbox label="동의" />);
      expect(screen.getByRole("checkbox")).not.toHaveAttribute("aria-invalid");
    });
  });

  it("네이티브 input을 sr-only로 숨기고 시각 표현은 형제 요소가 그린다", () => {
    const { container } = render(<Checkbox label="동의" />);

    expect(screen.getByRole("checkbox").className).toContain("sr-only");
    expect(container.querySelector('[data-part="box"]')).toBeInTheDocument();
  });

  it("경계선을 border가 아닌 outline + 음수 offset으로 그린다", () => {
    const { container } = render(<Checkbox />);
    const box = container.querySelector('[data-part="box"]');

    expect(box?.className).toContain("outline-1");
    expect(box?.className).toContain("-outline-offset-1");
    expect(box?.className).not.toContain("border-1");
  });
});
