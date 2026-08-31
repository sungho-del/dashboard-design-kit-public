import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatGrid, type StatGridItem } from "./StatGrid";

const ITEMS: StatGridItem[] = [
  { value: "all", label: "전체", count: "12,840", unit: "명" },
  {
    value: "normal",
    label: "정상",
    count: "9,120",
    unit: "명",
    tip: "탈퇴·휴면이 아닌 회원",
  },
  { value: "left", label: "탈퇴", count: "2,618", unit: "명" },
];

function setup(selected = "all", onSelect = () => {}) {
  return render(
    <StatGrid
      items={ITEMS}
      selected={selected}
      onSelect={onSelect}
      ariaLabel="회원 상태"
      columns={3}
    />,
  );
}

describe("StatGrid", () => {
  it("묶음에 이름을 준다 — 무엇을 고르는 곳인지 먼저 알린다", () => {
    setup();
    expect(
      screen.getByRole("group", { name: "회원 상태" }),
    ).toBeInTheDocument();
  });

  it("항목마다 버튼을 만든다", () => {
    setup();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("접근가능 이름을 한 문자열로 못 박는다", () => {
    setup();
    /* 라벨과 수치가 두 요소로 갈라져 있으면 브라우저마다 다르게 이어붙는다 */
    expect(
      screen.getByRole("button", { name: "전체 12,840명" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "정상 9,120명" }),
    ).toBeInTheDocument();
  });

  it("단위가 없어도 이름을 만든다", () => {
    render(
      <StatGrid
        items={[{ value: "a", label: "전환율", count: "3.2%" }]}
        selected="a"
        onSelect={() => {}}
        ariaLabel="지표"
        columns={2}
      />,
    );
    expect(
      screen.getByRole("button", { name: "전환율 3.2%" }),
    ).toBeInTheDocument();
  });

  describe("선택", () => {
    it("선택된 항목만 aria-pressed 가 true 다", () => {
      setup("normal");
      expect(
        screen.getByRole("button", { name: "정상 9,120명" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("button", { name: "전체 12,840명" }),
      ).toHaveAttribute("aria-pressed", "false");
    });

    it("누르면 그 항목의 value 로 onSelect 를 부른다", async () => {
      const onSelect = vi.fn();
      setup("all", onSelect);
      await userEvent.click(
        screen.getByRole("button", { name: "탈퇴 2,618명" }),
      );
      expect(onSelect).toHaveBeenCalledWith("left");
    });

    it("선택은 테두리로 그린다", () => {
      setup("normal");
      const selected = screen.getByRole("button", { name: "정상 9,120명" });
      expect(selected.className).toContain("outline-action-primary");
    });
  });

  describe("열 수", () => {
    it("완전한 클래스 문자열을 쓴다 — 조립하면 Tailwind 스캔이 놓친다", () => {
      const { container } = render(
        <StatGrid
          items={ITEMS}
          selected="all"
          onSelect={() => {}}
          ariaLabel="회원 상태"
          columns={5}
        />,
      );
      expect(container.querySelector('[role="group"]')?.className).toContain(
        "grid-cols-5",
      );
    });

    it("묶음 안 거터는 12 다 — 카드 사이(24)보다 좁아야 한 덩어리로 읽힌다", () => {
      setup();
      expect(screen.getByRole("group").className).toContain("gap-3");
    });
  });

  it("툴팁이 있는 항목과 없는 항목이 섞여도 모두 렌더된다", () => {
    setup();
    expect(screen.getByText("전체")).toBeInTheDocument();
    expect(screen.getByText("정상")).toBeInTheDocument();
    expect(screen.getByText("탈퇴")).toBeInTheDocument();
  });

  /*
   * ⚠️ 툴팁은 조용히 죽는 종류의 회귀다 — 에러도 경고도 없이 열리지 않을 뿐이다.
   * `Tooltip` 이 `cloneElement` 로 주입하는 핸들러를 `StatTile` 이 DOM 까지
   * 흘려보내야 동작한다. 이 테스트가 그 사슬 전체를 지킨다.
   */
  it("tip 이 있는 항목은 hover 하면 툴팁이 열린다", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: "정상 9,120명" }));
    expect(
      await screen.findByText("탈퇴·휴면이 아닌 회원"),
    ).toBeInTheDocument();
  });

  it("빈 목록이면 버튼이 없다", () => {
    render(
      <StatGrid
        items={[]}
        selected=""
        onSelect={() => {}}
        ariaLabel="회원 상태"
        columns={3}
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("group")).toBeInTheDocument();
  });
});
