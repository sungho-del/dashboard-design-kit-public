import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatTile } from "./StatTile";
import { Tooltip } from "../Tooltip";

describe("StatTile", () => {
  it("라벨과 값을 렌더링한다", () => {
    render(<StatTile label="신규 주문" value="1,284" unit="건" />);
    expect(screen.getByText("신규 주문")).toBeInTheDocument();
    expect(screen.getByText("1,284")).toBeInTheDocument();
    expect(screen.getByText("건")).toBeInTheDocument();
  });

  it("값과 단위는 별개 요소다 — 붙여 쓰지 않는다", () => {
    render(<StatTile label="신규 주문" value="1,284" unit="건" />);
    /* 한 요소에 "1,284건" 으로 합쳐져 있으면 단위까지 큰 글자가 된다 */
    expect(screen.queryByText("1,284건")).not.toBeInTheDocument();
    expect(screen.getByText("1,284").tagName).toBe("STRONG");
  });

  it("단위는 선택이다", () => {
    render(<StatTile label="전환율" value="3.2%" />);
    expect(screen.getByText("3.2%")).toBeInTheDocument();
  });

  describe("상호작용이 없을 때", () => {
    it("버튼이 아니다 — 누를 수 없는 버튼은 키보드 사용자에게 빈 정거장이다", () => {
      render(<StatTile label="신규 주문" value="1,284" unit="건" />);
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("onOpen — 이동", () => {
    it("버튼이 되고 openLabel 이 접근가능 이름이 된다", () => {
      render(
        <StatTile
          label="전체 회원"
          value="12,840"
          unit="명"
          openLabel="회원 목록 열기"
          onOpen={() => {}}
        />,
      );
      expect(
        screen.getByRole("button", { name: "회원 목록 열기" }),
      ).toBeInTheDocument();
    });

    it("클릭하면 onOpen 을 부른다", async () => {
      const onOpen = vi.fn();
      render(
        <StatTile
          label="전체 회원"
          value="12,840"
          openLabel="회원 목록 열기"
          onOpen={onOpen}
        />,
      );
      await userEvent.click(screen.getByRole("button"));
      expect(onOpen).toHaveBeenCalledOnce();
    });

    it("토글이 아니므로 aria-pressed 를 갖지 않는다", () => {
      render(
        <StatTile
          label="전체 회원"
          value="12,840"
          openLabel="회원 목록 열기"
          onOpen={() => {}}
        />,
      );
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
    });

    it("compact 면 화살표를 떼어 라벨이 접히지 않게 한다", () => {
      const { container, rerender } = render(
        <StatTile
          label="배송준비"
          value="42"
          openLabel="배송준비 보기"
          onOpen={() => {}}
        />,
      );
      expect(container.querySelector("svg")).toBeInTheDocument();

      rerender(
        <StatTile
          label="배송준비"
          value="42"
          openLabel="배송준비 보기"
          onOpen={() => {}}
          compact
        />,
      );
      expect(container.querySelector("svg")).not.toBeInTheDocument();
    });
  });

  describe("onSelect — 필터", () => {
    it("aria-pressed 로 선택 상태를 알린다", () => {
      const { rerender } = render(
        <StatTile label="정상" value="9,120" unit="명" onSelect={() => {}} />,
      );
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      rerender(
        <StatTile
          label="정상"
          value="9,120"
          unit="명"
          selected
          onSelect={() => {}}
        />,
      );
      expect(screen.getByRole("button")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("접근가능 이름을 라벨·값·단위로 조립한다", () => {
      render(
        <StatTile label="정상" value="9,120" unit="명" onSelect={() => {}} />,
      );
      expect(
        screen.getByRole("button", { name: "정상 9,120명" }),
      ).toBeInTheDocument();
    });

    it("selectLabel 을 주면 그것이 이긴다", () => {
      render(
        <StatTile
          label="정상"
          value="9,120"
          unit="명"
          selectLabel="정상 회원 9,120명 보기"
          onSelect={() => {}}
        />,
      );
      expect(
        screen.getByRole("button", { name: "정상 회원 9,120명 보기" }),
      ).toBeInTheDocument();
    });

    it("선택은 테두리로 그린다 — 면(배경)으로 그리지 않는다", () => {
      const { rerender } = render(
        <StatTile label="정상" value="9,120" onSelect={() => {}} />,
      );
      const before = screen.getByRole("button").className;
      expect(before).toContain("outline-transparent");

      rerender(
        <StatTile label="정상" value="9,120" selected onSelect={() => {}} />,
      );
      const after = screen.getByRole("button").className;
      expect(after).toContain("outline-action-primary");
      /* hover 는 면이 맡는다 — 선택이 배경을 바꾸면 두 신호가 같은 축에서 충돌한다 */
      expect(after).toContain("bg-surface-sub");
      expect(after).not.toContain("bg-action-primary-tonal");
    });

    it("고른 상자에는 hover 면을 걸지 않는다 — 골라 둔 것이 흐려 보인다", () => {
      const { rerender } = render(
        <StatTile label="정상" value="9,120" onSelect={() => {}} />,
      );
      expect(screen.getByRole("button").className).toContain(
        "hover:bg-surface-slate-secondary",
      );

      rerender(
        <StatTile label="정상" value="9,120" selected onSelect={() => {}} />,
      );
      expect(screen.getByRole("button").className).not.toContain(
        "hover:bg-surface-slate-secondary",
      );
    });

    it("이동 버튼은 선택 개념이 없으므로 hover 가 항상 걸린다", () => {
      render(
        <StatTile
          label="전체 회원"
          value="12,840"
          onOpen={() => {}}
          openLabel="열기"
        />,
      );
      expect(screen.getByRole("button").className).toContain(
        "hover:bg-surface-slate-secondary",
      );
    });

    it("클릭하면 onSelect 를 부른다", async () => {
      const onSelect = vi.fn();
      render(<StatTile label="정상" value="9,120" onSelect={onSelect} />);
      await userEvent.click(screen.getByRole("button"));
      expect(onSelect).toHaveBeenCalledOnce();
    });
  });

  describe("variant", () => {
    it("plain 은 회색 면이다 — 흰 카드 안의 항목이라 층이 생겨야 한다", () => {
      render(<StatTile label="신규 주문" value="1,284" />);
      expect(screen.getByText("신규 주문").parentElement?.className).toContain(
        "bg-surface-sub",
      );
    });

    it("card 는 흰 면 + 경계선이다 — 혼자 서기 때문이다", () => {
      render(<StatTile label="매출" value="4,820" variant="card" />);
      const root = screen.getByText("매출").closest("div")?.parentElement;
      expect(root?.className).toContain("bg-surface");
      expect(root?.className).toContain("outline-border");
    });

    it("card 는 아이콘·증감·캡션을 함께 담는다", () => {
      render(
        <StatTile
          label="매출"
          value="4,820"
          unit="만원"
          variant="card"
          icon={<svg data-testid="chip-icon" />}
          delta={{ text: "+12.3%", up: true, good: true }}
          caption="지난달 대비"
        />,
      );
      expect(screen.getByTestId("chip-icon")).toBeInTheDocument();
      expect(screen.getByText("+12.3%")).toBeInTheDocument();
      expect(screen.getByText("지난달 대비")).toBeInTheDocument();
    });

    it("card 는 표시 전용이다 — 핸들러를 줘도 버튼이 되지 않는다", () => {
      /*
        타입으로 막지 않는 계약이라 테스트가 대신 고정한다. card 에 onSelect/onOpen 을
        주면 조용히 버려지므로, 그 사실을 여기서 드러내 놓는다.
      */
      render(
        <StatTile
          label="매출"
          value="4,820"
          variant="card"
          onSelect={() => {}}
          onOpen={() => {}}
          openLabel="열기"
        />,
      );
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("card 는 증감·캡션이 없으면 그 줄을 만들지 않는다", () => {
      render(<StatTile label="매출" value="4,820" variant="card" />);
      expect(screen.queryByText("지난달 대비")).not.toBeInTheDocument();
    });
  });

  describe("tone", () => {
    it("기본은 본문색이다", () => {
      render(<StatTile label="미답변" value="12" />);
      expect(screen.getByText("12").className).toContain("text-text");
      expect(screen.getByText("12").className).not.toContain(
        "text-text-warning",
      );
    });

    it("warning 은 값에 주의색을 준다 — 라벨이 뜻을 들고 색은 보조다", () => {
      render(<StatTile label="미답변" value="12" tone="warning" />);
      expect(screen.getByText("12").className).toContain("text-text-warning");
    });

    it("card 에서도 tone 이 적용된다", () => {
      render(
        <StatTile label="미답변" value="12" variant="card" tone="warning" />,
      );
      expect(screen.getByText("12").className).toContain("text-text-warning");
    });
  });

  describe("타이포", () => {
    it("plain 값은 metric-small 을 쓴다", () => {
      render(<StatTile label="신규 주문" value="1,284" />);
      expect(screen.getByText("1,284").className).toContain("metric-small");
    });

    it("card 값은 한 단 큰 metric-medium 을 쓴다", () => {
      render(<StatTile label="매출" value="4,820" variant="card" />);
      expect(screen.getByText("4,820").className).toContain("metric-medium");
    });

    it("값에 tabular-nums 를 붙이지 않는다 — 큰 글자에서 헐거워 보인다", () => {
      render(<StatTile label="신규 주문" value="121" />);
      expect(screen.getByText("121").className).not.toContain("tabular-nums");
    });
  });

  it("버튼일 때 w-full 을 유지한다 — 폼 컨트롤은 flex 로도 부모를 채우지 않는다", () => {
    render(<StatTile label="정상" value="9,120" onSelect={() => {}} />);
    expect(screen.getByRole("button").className).toContain("w-full");
  });

  /*
   * ⚠️ 이 묶음이 이 컴포넌트에서 가장 중요한 테스트다.
   *
   * `Tooltip` 은 `cloneElement` 로 hover·focus 핸들러와 `ref`, `aria-describedby` 를
   * 자식에게 주입한다. `StatTile` 이 그 props 를 DOM 으로 흘려보내지 않으면
   * **에러도 경고도 없이 툴팁만 열리지 않는다.** 승격 이전 페이지 코드에 남아 있던
   * "컴포넌트로 빼지 말 것" 경고가 정확히 이 함정을 가리키고 있었다.
   */
  describe("Tooltip 트리거", () => {
    it("hover 하면 툴팁이 열린다 — 주입된 핸들러를 DOM 으로 넘긴다", async () => {
      render(
        <Tooltip variant="rich" content="탈퇴·휴면이 아닌 회원">
          <StatTile label="정상" value="9,120" unit="명" onSelect={() => {}} />
        </Tooltip>,
      );

      await userEvent.hover(
        screen.getByRole("button", { name: "정상 9,120명" }),
      );
      expect(
        await screen.findByText("탈퇴·휴면이 아닌 회원"),
      ).toBeInTheDocument();
    });

    it("버튼이 아닌 타일도 트리거가 된다", async () => {
      render(
        <Tooltip variant="rich" content="지난 30일 기준">
          <StatTile label="신규 주문" value="1,284" unit="건" />
        </Tooltip>,
      );

      await userEvent.hover(screen.getByText("신규 주문"));
      expect(await screen.findByText("지난 30일 기준")).toBeInTheDocument();
    });

    it("주입된 props 가 우리 aria-label 을 덮지 않는다", () => {
      render(
        <Tooltip variant="rich" content="설명">
          <StatTile label="정상" value="9,120" unit="명" onSelect={() => {}} />
        </Tooltip>,
      );
      expect(
        screen.getByRole("button", { name: "정상 9,120명" }),
      ).toBeInTheDocument();
    });
  });
});
