import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Radio, RadioGroup } from "./Radio";

describe("Radio", () => {
  it("radio role로 렌더링된다", () => {
    render(<Radio label="카드" value="card" />);
    expect(screen.getByRole("radio", { name: "카드" })).toBeInTheDocument();
  });

  it("label prop이 컨트롤과 연결된다", () => {
    render(<Radio label="계좌이체" value="transfer" />);
    expect(screen.getByLabelText("계좌이체")).toBeInstanceOf(HTMLInputElement);
  });

  it("description을 aria-describedby로 연결한다", () => {
    render(
      <Radio label="계좌이체" value="transfer" description="1일 이내 확인" />,
    );
    const input = screen.getByRole("radio");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "1일 이내 확인",
    );
  });

  it("클릭하면 선택되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    render(<Radio label="카드" value="card" onChange={onChange} />);

    const input = screen.getByRole("radio");
    await userEvent.click(input);

    expect(input).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("Space 키로 선택된다", async () => {
    render(<Radio label="카드" value="card" />);
    const input = screen.getByRole("radio");

    await userEvent.tab();
    expect(input).toHaveFocus();

    await userEvent.keyboard(" ");
    expect(input).toBeChecked();
  });

  it("같은 name끼리는 하나만 선택된다", async () => {
    render(
      <>
        <Radio name="pay" value="card" label="카드" />
        <Radio name="pay" value="transfer" label="계좌이체" />
      </>,
    );

    await userEvent.click(screen.getByRole("radio", { name: "카드" }));
    await userEvent.click(screen.getByRole("radio", { name: "계좌이체" }));

    expect(screen.getByRole("radio", { name: "카드" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "계좌이체" })).toBeChecked();
  });

  describe("disabled", () => {
    it("클릭해도 선택되지 않는다", async () => {
      const onChange = vi.fn();
      render(<Radio label="카드" value="card" disabled onChange={onChange} />);

      const input = screen.getByRole("radio");
      expect(input).toBeDisabled();

      await userEvent.click(input);
      expect(input).not.toBeChecked();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("비활성 토큰과 cursor-not-allowed를 적용한다", () => {
      const { container } = render(
        <Radio label="카드" value="card" disabled />,
      );
      const circle = container.querySelector('[data-part="circle"]');

      expect(circle?.className).toContain("bg-field-disabled");
      expect(circle?.className).toContain("text-icon-disabled");
      expect(container.firstElementChild?.className).toContain(
        "cursor-not-allowed",
      );
    });
  });

  describe("invalid", () => {
    it("aria-invalid와 critical 경계선을 적용한다", () => {
      const { container } = render(<Radio label="카드" value="card" invalid />);

      expect(screen.getByRole("radio")).toHaveAttribute("aria-invalid", "true");
      expect(
        container.querySelector('[data-part="circle"]')?.className,
      ).toContain("outline-border-critical");
    });

    it("기본 상태에서는 aria-invalid를 붙이지 않는다", () => {
      render(<Radio label="카드" value="card" />);
      expect(screen.getByRole("radio")).not.toHaveAttribute("aria-invalid");
    });
  });

  it("네이티브 input을 sr-only로 숨기고 시각 표현은 형제 요소가 그린다", () => {
    const { container } = render(<Radio label="카드" value="card" />);

    expect(screen.getByRole("radio").className).toContain("sr-only");
    expect(container.querySelector('[data-part="circle"]')).toBeInTheDocument();
  });

  it("경계선을 border가 아닌 outline + 음수 offset으로 그린다", () => {
    const { container } = render(<Radio value="card" />);
    const circle = container.querySelector('[data-part="circle"]');

    expect(circle?.className).toContain("outline-1");
    expect(circle?.className).toContain("-outline-offset-1");
  });
});

describe("RadioGroup", () => {
  it("radiogroup role과 접근성 이름을 갖는다", () => {
    render(
      <RadioGroup label="배송 방법">
        <Radio value="standard" label="일반 배송" />
      </RadioGroup>,
    );

    expect(
      screen.getByRole("radiogroup", { name: "배송 방법" }),
    ).toBeInTheDocument();
  });

  it("배치 방향을 aria-orientation으로 알린다", () => {
    render(
      <RadioGroup label="정렬" orientation="horizontal">
        <Radio value="recent" label="최신순" />
      </RadioGroup>,
    );

    expect(screen.getByRole("radiogroup")).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
  });

  it("name을 지정하지 않아도 같은 그룹으로 묶인다", () => {
    render(
      <RadioGroup label="배송 방법">
        <Radio value="standard" label="일반 배송" />
        <Radio value="express" label="빠른 배송" />
      </RadioGroup>,
    );

    const [first, second] = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(first.name).not.toBe("");
    expect(first.name).toBe(second.name);
  });

  it("비제어 모드 — defaultValue가 초기 선택이고 클릭하면 옮겨간다", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        label="배송 방법"
        defaultValue="standard"
        onValueChange={onValueChange}
      >
        <Radio value="standard" label="일반 배송" />
        <Radio value="express" label="빠른 배송" />
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "일반 배송" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "빠른 배송" }));

    expect(screen.getByRole("radio", { name: "빠른 배송" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "일반 배송" })).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("express");
  });

  it("제어 모드 — 사용처 상태를 따른다", async () => {
    function Controlled() {
      const [value, setValue] = useState("standard");
      return (
        <RadioGroup label="배송 방법" value={value} onValueChange={setValue}>
          <Radio value="standard" label="일반 배송" />
          <Radio value="express" label="빠른 배송" />
        </RadioGroup>
      );
    }
    render(<Controlled />);

    await userEvent.click(screen.getByRole("radio", { name: "빠른 배송" }));

    expect(screen.getByRole("radio", { name: "빠른 배송" })).toBeChecked();
  });

  it("그룹 disabled가 항목 전체에 내려간다", () => {
    render(
      <RadioGroup label="배송 방법" defaultValue="standard" disabled>
        <Radio value="standard" label="일반 배송" />
        <Radio value="express" label="빠른 배송" />
      </RadioGroup>,
    );

    screen.getAllByRole("radio").forEach((radio) => {
      expect(radio).toBeDisabled();
    });
  });

  it("항목의 disabled 지정이 그룹 설정보다 우선한다", () => {
    render(
      <RadioGroup label="배송 방법" disabled>
        <Radio value="standard" label="일반 배송" disabled={false} />
      </RadioGroup>,
    );

    expect(screen.getByRole("radio", { name: "일반 배송" })).toBeEnabled();
  });
});
