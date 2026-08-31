import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { ProgressBar } from "./ProgressBar";

/** 트랙 = 루트의 첫 자식 · 필 = 트랙의 첫 자식 */
function parts(container: HTMLElement) {
  const root = screen.getByRole("progressbar");
  const track = root.firstElementChild as HTMLElement;
  return { container, root, track, fill: track.firstElementChild };
}

describe("ProgressBar", () => {
  describe("접근성 계약", () => {
    it("progressbar role 로 노출되고 ariaLabel 이 이름이 된다", () => {
      render(<ProgressBar value={62} ariaLabel="React 입문 완주율" />);
      expect(
        screen.getByRole("progressbar", { name: "React 입문 완주율" }),
      ).toBeInTheDocument();
    });

    it("min·max 를 명시한다 — 기본값에 기대면 브라우저마다 환산이 갈린다", () => {
      render(<ProgressBar value={62} ariaLabel="완주율" />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuemin", "0");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    });

    it("aria-valuenow 는 반올림하지 않는다", () => {
      render(<ProgressBar value={62.4} ariaLabel="완주율" />);
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "62.4",
      );
    });

    it("aria-valuetext 가 화면에 보이는 문자열과 글자 그대로 같다", () => {
      render(<ProgressBar value={62.4} ariaLabel="완주율" />);
      const bar = screen.getByRole("progressbar");
      const shown = screen.getByText("62%");
      expect(bar.getAttribute("aria-valuetext")).toBe(shown.textContent);
    });

    it("값 텍스트가 접근가능 이름에 섞이지 않는다 — 이름은 ariaLabel 하나뿐이다", () => {
      render(<ProgressBar value={62} ariaLabel="React 입문 완주율" />);
      expect(screen.getByRole("progressbar")).toHaveAccessibleName(
        "React 입문 완주율",
      );
    });

    it("탭이 서지 않는다 — 상호작용하지 않는 부품이다", () => {
      render(<ProgressBar value={62} ariaLabel="완주율" />);
      const bar = screen.getByRole("progressbar");
      expect(bar).not.toHaveAttribute("tabindex");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(bar.tagName).toBe("DIV");
    });
  });

  describe("값 처리", () => {
    it("필의 폭이 value 를 백분율로 반영한다", () => {
      const { fill } = parts(
        render(<ProgressBar value={62} ariaLabel="완주율" />).container,
      );
      expect(fill).toHaveStyle({ width: "62%" });
    });

    it("100 을 넘는 값을 클램프한다 — 폭·낭독·표시가 모두 100% 로 눕는다", () => {
      const { fill } = parts(
        render(<ProgressBar value={140} ariaLabel="완주율" />).container,
      );
      expect(fill).toHaveStyle({ width: "100%" });
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "100",
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
    });

    it("음수를 0 으로 클램프한다", () => {
      render(<ProgressBar value={-20} ariaLabel="완주율" />);
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("유한하지 않은 값은 0 으로 눕는다 — width: NaN% 이라는 무효 CSS 를 막는다", () => {
      render(<ProgressBar value={Number.NaN} ariaLabel="완주율" />);
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "0",
      );
    });

    it("0% 는 트랙만 남기고 필을 렌더하지 않는다", () => {
      const { track } = parts(
        render(<ProgressBar value={0} ariaLabel="완주율" />).container,
      );
      expect(track.children).toHaveLength(0);
      expect(screen.getByText("0%")).toBeInTheDocument();
    });

    it("value>0 이면 필의 최소 폭이 트랙 높이(4)만큼 보장된다 — 1% 가 0% 와 같아 보이면 안 된다", () => {
      const { fill } = parts(
        render(<ProgressBar value={1} ariaLabel="완주율" />).container,
      );
      expect(fill).not.toBeNull();
      expect(fill?.className).toContain("min-w-1");
    });

    it("valueText 가 표시와 낭독을 함께 덮어쓴다", () => {
      render(
        <ProgressBar value={62.4} ariaLabel="완주율" valueText="42/60명" />,
      );
      expect(screen.getByText("42/60명")).toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "42/60명",
      );
      /* 덮어써도 기계용 값은 그대로다 */
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuenow",
        "62.4",
      );
    });

    it("기본 표기는 반올림한 정수 %", () => {
      render(<ProgressBar value={62.6} ariaLabel="완주율" />);
      expect(screen.getByText("63%")).toBeInTheDocument();
    });
  });

  describe("값 텍스트", () => {
    it("showValue=false 면 화면에서 사라지지만 낭독에는 남는다", () => {
      render(<ProgressBar value={74} ariaLabel="완주율" showValue={false} />);
      expect(screen.queryByText("74%")).not.toBeInTheDocument();
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "74%",
      );
    });

    it("등폭 + 최소 폭 고정 — 값 폭이 행마다 달라지면 막대 길이 비교가 무너진다", () => {
      render(<ProgressBar value={7} ariaLabel="완주율" />);
      const text = screen.getByText("7%");
      expect(text.className).toContain("tabular-nums");
      expect(text.className).toContain("min-w-10");
      expect(text.className).toContain("text-right");
    });

    it("showValue=false 이고 default 면 값 묶음을 통째로 렌더하지 않는다 — 원인 없는 여백을 막는다", () => {
      const { root } = parts(
        render(<ProgressBar value={74} ariaLabel="완주율" showValue={false} />)
          .container,
      );
      expect(root.children).toHaveLength(1);
    });
  });

  describe("tone", () => {
    it("default 필은 border-slate 다", () => {
      const { fill } = parts(
        render(<ProgressBar value={62} ariaLabel="완주율" />).container,
      );
      expect(fill?.className).toContain("bg-border-slate");
      expect(fill?.className).not.toContain("bg-progress-warning");
    });

    it("warning 필은 전용 토큰 progress-warning 을 쓴다 — 배경색을 한 번만 방출한다", () => {
      const { fill } = parts(
        render(<ProgressBar value={18} ariaLabel="완주율" tone="warning" />)
          .container,
      );
      expect(fill?.className).toContain("bg-progress-warning");
      expect(fill?.className).not.toContain("bg-border-slate");
    });

    it("warning 이면 낭독 문자열 뒤에 경고가 붙는다 — 색·아이콘 없이도 귀로 전달된다", () => {
      render(<ProgressBar value={18} ariaLabel="완주율" tone="warning" />);
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "18% 주의",
      );
    });

    it("warningText 로 덧붙는 말을 바꾼다", () => {
      render(
        <ProgressBar
          value={18}
          ariaLabel="완주율"
          tone="warning"
          warningText="이수 위험"
        />,
      );
      expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "18% 이수 위험",
      );
    });

    it("warning 이면 아이콘이 붙고 default 면 붙지 않는다 — 색 단독 신호를 쓰지 않는다", () => {
      const { container, rerender } = render(
        <ProgressBar value={18} ariaLabel="완주율" tone="warning" />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();

      rerender(<ProgressBar value={18} ariaLabel="완주율" />);
      expect(container.querySelector("svg")).not.toBeInTheDocument();
    });

    it("아이콘은 16 · strokeWidth 1.2 · 접근성 트리에서 숨겨진다", () => {
      const { container } = render(
        <ProgressBar value={18} ariaLabel="완주율" tone="warning" />,
      );
      const icon = container.querySelector("svg");
      expect(icon).toHaveAttribute("width", "16");
      expect(icon).toHaveAttribute("stroke-width", "1.2");
      expect(icon).toHaveAttribute("aria-hidden", "true");
    });

    it("warning 이어도 값 글자색은 바꾸지 않는다 — text-warning 은 흰 배경 2.85:1 로 미달이다", () => {
      render(<ProgressBar value={18} ariaLabel="완주율" tone="warning" />);
      const text = screen.getByText("18%");
      expect(text.className).toContain("text-text");
      expect(text.className).not.toContain("text-text-warning");
    });
  });

  describe("규격", () => {
    it("트랙은 height 4 · radius full · surface-slate-secondary · 남는 폭 전부", () => {
      const { track } = parts(
        render(<ProgressBar value={62} ariaLabel="완주율" />).container,
      );
      expect(track.className).toContain("h-1");
      expect(track.className).toContain("rounded-full");
      expect(track.className).toContain("bg-surface-slate-secondary");
      expect(track.className).toContain("flex-1");
    });

    it("width 트랜지션을 쓰지 않는다 — 표에서 일어나지 않은 변화를 지어낸다", () => {
      const { root, track, fill } = parts(
        render(<ProgressBar value={62} ariaLabel="완주율" />).container,
      );
      for (const el of [root, track, fill]) {
        expect(el?.className ?? "").not.toContain("transition");
      }
    });
  });

  describe("DOM props 통로", () => {
    it("className 이 루트에 붙는다 — 부모가 폭을 배분하는 통로다", () => {
      render(<ProgressBar value={62} ariaLabel="완주율" className="w-80" />);
      expect(screen.getByRole("progressbar").className).toContain("w-80");
    });

    it("ref 와 DOM props 를 루트로 흘려보낸다 — 없으면 Tooltip 이 조용히 죽는다", () => {
      const ref = createRef<HTMLDivElement>();
      const onMouseEnter = vi.fn();
      render(
        <ProgressBar
          value={62}
          ariaLabel="완주율"
          ref={ref}
          onMouseEnter={onMouseEnter}
          aria-describedby="tip-1"
        />,
      );
      const bar = screen.getByRole("progressbar");
      expect(ref.current).toBe(bar);
      expect(bar).toHaveAttribute("aria-describedby", "tip-1");
      bar.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      expect(onMouseEnter).toHaveBeenCalled();
    });
  });

  /*
   * 경고 아이콘은 **정보 전달용 그래픽**이라 WCAG 1.4.11 의 3:1 을 받는다.
   * `icon-warning`(mustard-600)은 흰 배경 2.85 로 미달이고 `progress-warning`(mustard-700)이 4.62 다.
   * 필과 같은 토큰이어야 한다 — 둘이 같은 한 가지 사실을 말한다.
   */
  it("경고 아이콘은 필과 같은 progress-warning 을 쓴다 (icon-warning 아님)", () => {
    const { container } = render(
      <ProgressBar value={32} tone="warning" ariaLabel="완주율" />,
    );
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    const cls = (icon?.getAttribute("class") ?? "").split(/\s+/);
    expect(cls).toContain("text-progress-warning");
    expect(cls).not.toContain("text-icon-warning");
  });

  /*
   * 값의 위치는 맥락이 정한다.
   * 표 셀에서 값을 뒤에 두면 셀 오른쪽 끝으로 밀려 **다음 컬럼과 마주 본다**
   * (사이가 셀 패딩 16px 뿐이라 붙어 보이고 소속도 모호해진다).
   * 실제 화면에서 보고된 결함이고, 이 테스트가 그 재발을 막는다.
   */
  describe("valueSide", () => {
    const order = (root: HTMLElement) =>
      Array.from(root.querySelectorAll(":scope > *")).map((el) =>
        el.className.includes("flex-1") ? "track" : "value",
      );

    it("기본은 막대 → 값 순서다", () => {
      const { container } = render(
        <ProgressBar value={62} ariaLabel="진도율" />,
      );
      expect(order(container.firstElementChild as HTMLElement)).toEqual([
        "track",
        "value",
      ]);
    });

    it("start 면 값 → 막대 순서가 된다 (표 셀용)", () => {
      const { container } = render(
        <ProgressBar value={62} ariaLabel="진도율" valueSide="start" />,
      );
      expect(order(container.firstElementChild as HTMLElement)).toEqual([
        "value",
        "track",
      ]);
    });

    it("start 여도 값 슬롯은 우측 정렬 + 고정 폭을 유지한다", () => {
      render(<ProgressBar value={5} ariaLabel="진도율" valueSide="start" />);
      const cls = screen.getByText("5%").className.split(/\s+/);
      expect(cls).toContain("min-w-10");
      expect(cls).toContain("text-right");
      expect(cls).toContain("tabular-nums");
    });
  });
});
