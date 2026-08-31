import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("switch role로 렌더링된다", () => {
    render(<Switch label="이메일 알림" />);
    expect(
      screen.getByRole("switch", { name: "이메일 알림" }),
    ).toBeInTheDocument();
  });

  it("checkbox가 아니라 switch로 노출된다 — 선택이 아니라 켜짐/꺼짐이다", () => {
    render(<Switch label="이메일 알림" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("label prop이 컨트롤과 연결된다", () => {
    render(<Switch label="야간 알림" />);
    expect(screen.getByLabelText("야간 알림")).toBeInstanceOf(HTMLInputElement);
  });

  it("description을 aria-describedby로 연결한다", () => {
    render(
      <Switch label="야간 알림" description="오후 9시 이후에도 받습니다" />,
    );
    const input = screen.getByRole("switch");
    const describedBy = input.getAttribute("aria-describedby");

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      "오후 9시 이후에도 받습니다",
    );
  });

  it("클릭하면 토글되고 onChange가 호출된다", async () => {
    const onChange = vi.fn();
    render(<Switch label="이메일 알림" onChange={onChange} />);

    const control = screen.getByRole("switch");
    await userEvent.click(control);

    expect(control).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("라벨 텍스트를 클릭해도 토글된다", async () => {
    render(<Switch label="이메일 알림" />);

    await userEvent.click(screen.getByText("이메일 알림"));

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("Space 키로 토글된다", async () => {
    render(<Switch label="이메일 알림" />);
    const control = screen.getByRole("switch");

    await userEvent.tab();
    expect(control).toHaveFocus();

    await userEvent.keyboard(" ");
    expect(control).toBeChecked();

    await userEvent.keyboard(" ");
    expect(control).not.toBeChecked();
  });

  it("비제어 모드에서 defaultChecked가 초기값이 된다", () => {
    render(<Switch label="이메일 알림" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("제어 모드에서는 사용처 상태를 따른다", async () => {
    function Controlled() {
      const [on, setOn] = useState(false);
      return (
        <Switch
          label="이메일 알림"
          checked={on}
          onChange={(event) => setOn(event.target.checked)}
        />
      );
    }
    render(<Controlled />);

    await userEvent.click(screen.getByRole("switch"));
    expect(screen.getByRole("switch")).toBeChecked();
  });

  describe("트랙·thumb", () => {
    it("off 트랙은 action-toggle, on 트랙은 action-primary를 쓴다", () => {
      const { container } = render(<Switch label="이메일 알림" />);
      const track = container.querySelector('[data-part="track"]');

      expect(track?.className).toContain("bg-action-toggle");
      expect(track?.className).toContain(
        "group-has-[:checked]:bg-action-primary",
      );
    });

    it("thumb는 surface + shadow-raised-button이고 0.2s로 이동한다", () => {
      const { container } = render(<Switch label="이메일 알림" />);
      const thumb = container.querySelector('[data-part="thumb"]');

      expect(thumb?.className).toContain("bg-surface");
      expect(thumb?.className).toContain("shadow-raised-button");
      expect(thumb?.className).toContain("transition-transform");
      expect(thumb?.className).toContain("duration-200");
    });
  });

  describe("disabled", () => {
    it("클릭해도 토글되지 않는다", async () => {
      const onChange = vi.fn();
      render(<Switch label="이메일 알림" disabled onChange={onChange} />);

      const control = screen.getByRole("switch");
      expect(control).toBeDisabled();

      await userEvent.click(control);
      expect(control).not.toBeChecked();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("opacity가 아니라 토큰으로 비활성을 표현한다", () => {
      const { container } = render(<Switch label="이메일 알림" disabled />);
      const track = container.querySelector('[data-part="track"]');
      const thumb = container.querySelector('[data-part="thumb"]');

      expect(track?.className).toContain("bg-action-primary-tonal-disabled");
      expect(track?.className).not.toContain("opacity-");
      expect(thumb?.className).toContain("shadow-none");
      expect(container.firstElementChild?.className).toContain(
        "cursor-not-allowed",
      );
    });
  });

  describe("invalid", () => {
    it("aria-invalid와 critical 경계선을 적용한다", () => {
      const { container } = render(<Switch label="이메일 알림" invalid />);

      expect(screen.getByRole("switch")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(
        container.querySelector('[data-part="track"]')?.className,
      ).toContain("outline-border-critical");
    });

    it("기본 상태에서는 aria-invalid를 붙이지 않는다", () => {
      render(<Switch label="이메일 알림" />);
      expect(screen.getByRole("switch")).not.toHaveAttribute("aria-invalid");
    });
  });

  it("네이티브 input을 sr-only로 숨기고 시각 표현은 형제 요소가 그린다", () => {
    const { container } = render(<Switch label="이메일 알림" />);

    expect(screen.getByRole("switch").className).toContain("sr-only");
    expect(container.querySelector('[data-part="track"]')).toBeInTheDocument();
  });

  it("size에 따라 트랙 높이가 20 / 24로 갈린다", () => {
    const { container: small } = render(<Switch size="small" />);
    const { container: medium } = render(<Switch size="medium" />);

    expect(
      small.querySelector('[data-part="track"]')?.parentElement?.className,
    ).toContain("h-5");
    expect(
      medium.querySelector('[data-part="track"]')?.parentElement?.className,
    ).toContain("h-6");
  });
});
