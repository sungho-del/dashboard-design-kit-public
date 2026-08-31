import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageHeader } from "./PageHeader";

function headerOf(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

function slotOf(container: HTMLElement, slot: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
}

describe("PageHeader", () => {
  it("제목을 h1으로 렌더링한다", () => {
    render(<PageHeader title="주문 관리" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "주문 관리" }),
    ).toBeVisible();
  });

  it("banner 랜드마크(header)로 렌더링한다", () => {
    render(<PageHeader title="주문 관리" />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("보조 설명을 제목 아래에 렌더링한다", () => {
    render(<PageHeader title="주문 상세" description="20260818-0001" />);
    expect(screen.getByText("20260818-0001")).toBeVisible();
  });

  describe("바 (DESIGN.md §24)", () => {
    it("surface 배경 + 안쪽 그림자로 하단선을 그린다 (border 아님)", () => {
      const { container } = render(<PageHeader title="주문 관리" />);
      const className = headerOf(container).className;
      expect(className).toContain("bg-surface");
      expect(className).toContain(
        "shadow-[inset_0_-1px_0_0_var(--color-border)]",
      );
      expect(className).not.toContain("border-b");
    });

    /**
     * §24 규격의 **아래 패딩 0 은 탭이 붙는 경우를 전제한 값**이다 —
     * 탭이 타이틀 행 아래에 와서 나머지 높이를 채운다.
     * 탭이 없으면 그 0 이 드러나 내용이 바 중앙보다 아래로 쏠려 보이므로 `py-4` 로 맞춘다.
     */
    it("탭이 있으면 §24 그대로 padding 16 40 0 이다", () => {
      const { container } = render(
        <PageHeader title="주문 관리" tabs={<div>탭</div>} />,
      );
      const bar = slotOf(container, "bar");
      expect(bar).toHaveClass("min-h-18", "gap-4", "px-10", "pt-4");
      expect(bar?.className).not.toContain("py-4");
    });

    it("탭이 없으면 위아래 패딩을 맞춘다 — 내용이 바 중앙에 온다", () => {
      const { container } = render(<PageHeader title="주문 관리" />);
      const bar = slotOf(container, "bar");
      expect(bar).toHaveClass("min-h-18", "gap-4", "px-10", "py-4");
      // cn() 은 병합하지 않으므로 두 패딩이 함께 나오면 안 된다
      expect(bar?.className).not.toContain("pt-4");
    });

    it("compact는 min-h 52 · padding 0 16 · gap 12로 분기한다", () => {
      const { container } = render(<PageHeader title="주문 관리" compact />);
      const bar = slotOf(container, "bar");
      expect(bar).toHaveClass("min-h-13", "gap-3", "px-4");
      // cn()은 병합하지 않으므로 데스크톱 값이 함께 나오면 안 된다
      expect(bar?.className).not.toContain("min-h-18");
      expect(bar?.className).not.toContain("px-10");
      expect(bar?.className).not.toContain("gap-4");
    });

    it("compact 여부를 data-compact로 노출한다", () => {
      const { container, rerender } = render(<PageHeader title="제목" />);
      expect(headerOf(container)).not.toHaveAttribute("data-compact");

      rerender(<PageHeader title="제목" compact />);
      expect(headerOf(container)).toHaveAttribute("data-compact", "true");
    });
  });

  describe("타이틀 행", () => {
    it("flex-1 · min-w-0 · gap 12 · min-h 40이다", () => {
      const { container } = render(<PageHeader title="주문 관리" />);
      const row = slotOf(container, "title-row");
      expect(row).toHaveClass("flex-1", "min-w-0", "gap-3", "min-h-10");
    });

    it("compact 타이틀 행은 min-h 52다", () => {
      const { container } = render(<PageHeader title="주문 관리" compact />);
      const row = slotOf(container, "title-row");
      expect(row).toHaveClass("min-h-13");
      expect(row?.className).not.toContain("min-h-10");
    });
  });

  describe("슬롯", () => {
    it("우측 액션 그룹을 shrink-0 · gap 8로 렌더링한다", () => {
      const { container } = render(
        <PageHeader title="주문 관리" actions={<button>등록</button>} />,
      );
      const group = slotOf(container, "actions");
      expect(group).toHaveClass("shrink-0", "gap-2");
      expect(screen.getByRole("button", { name: "등록" })).toBeVisible();
    });

    it("액션이 없으면 액션 그룹을 만들지 않는다", () => {
      const { container } = render(<PageHeader title="주문 관리" />);
      expect(slotOf(container, "actions")).toBeNull();
    });

    it("배지 슬롯은 gap 4다", () => {
      const { container } = render(
        <PageHeader title="프로모션" badges={<span>진행중</span>} />,
      );
      const badges = slotOf(container, "badges");
      expect(badges).toHaveClass("gap-1", "shrink-0");
      expect(screen.getByText("진행중")).toBeVisible();
    });

    it("탭 슬롯은 padding-left 40으로 제목과 기준선을 맞춘다", () => {
      const { container } = render(
        <PageHeader title="상품" tabs={<div>탭</div>} />,
      );
      expect(slotOf(container, "tabs")).toHaveClass("pl-10");
    });

    it("compact 탭 슬롯은 padding-left 16이다", () => {
      const { container } = render(
        <PageHeader title="상품" compact tabs={<div>탭</div>} />,
      );
      const tabs = slotOf(container, "tabs");
      expect(tabs).toHaveClass("pl-4");
      expect(tabs?.className).not.toContain("pl-10");
    });

    it("탭이 없으면 탭 슬롯을 만들지 않는다", () => {
      const { container } = render(<PageHeader title="상품" />);
      expect(slotOf(container, "tabs")).toBeNull();
    });
  });

  describe("뒤로가기", () => {
    it("onBack이 없으면 뒤로가기 버튼을 만들지 않는다", () => {
      render(<PageHeader title="주문 관리" />);
      expect(
        screen.queryByRole("button", { name: "뒤로 가기" }),
      ).not.toBeInTheDocument();
    });

    it("클릭하면 onBack을 호출한다", async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      render(<PageHeader title="주문 상세" onBack={onBack} />);

      await user.click(screen.getByRole("button", { name: "뒤로 가기" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("32×32(control-small) 크기를 쓴다", () => {
      render(<PageHeader title="주문 상세" onBack={() => {}} />);
      const back = screen.getByRole("button", { name: "뒤로 가기" });
      expect(back.className).toContain("h-(--size-control-small)");
      expect(back.className).toContain("w-(--size-control-small)");
    });

    it("backLabel로 스크린리더 이름을 바꿀 수 있다", () => {
      render(
        <PageHeader title="주문 상세" onBack={() => {}} backLabel="목록으로" />,
      );
      expect(screen.getByRole("button", { name: "목록으로" })).toBeVisible();
    });
  });

  describe("sticky", () => {
    /**
     * ⚠️ 클래스는 **배열로** 검사한다. 문자열 `toContain` 은 부분 일치라
     * `data-sticky` 나 다른 유틸리티에 걸려 헛통과할 수 있다.
     */
    const classesOf = (container: HTMLElement) =>
      headerOf(container).className.split(/\s+/);

    it("기본은 고정하지 않는다", () => {
      const { container } = render(<PageHeader title="주문 관리" />);
      expect(classesOf(container)).not.toContain("sticky");
      expect(classesOf(container)).not.toContain("fixed");
      expect(headerOf(container)).not.toHaveAttribute("data-sticky");
    });

    it("sticky면 position:sticky + z-header로 상단에 붙인다", () => {
      const { container } = render(<PageHeader title="주문 관리" sticky />);
      const classes = classesOf(container);

      expect(classes).toContain("sticky");
      expect(classes).toContain("top-0");
      expect(classes).toContain("z-(--z-header)");
      expect(headerOf(container)).toHaveAttribute("data-sticky", "true");
    });

    /**
     * `fixed` 로 되돌리지 못하게 막는 가드.
     *
     * `AppShell` 에서 헤더는 GNB **오른쪽** 콘텐츠 컬럼의 자식인데, `fixed` 는
     * 뷰포트 기준이라 `left-0` 이 GNB(224)까지 덮어 버린다. 게다가 흐름에서 빠져
     * 본문이 헤더 높이(72)만큼 위로 올라붙는다 — jsdom 에는 레이아웃이 없어
     * 렌더 테스트로는 절대 잡히지 않으므로 클래스로 못박는다.
     */
    it("fixed 를 쓰지 않는다 — GNB 를 덮고 본문이 위로 튄다", () => {
      const { container } = render(<PageHeader title="주문 관리" sticky />);
      expect(classesOf(container)).not.toContain("fixed");
    });

    it("stickyTop으로 top 값을 지정한다", () => {
      const { container } = render(
        <PageHeader title="주문 관리" sticky stickyTop="56px" />,
      );
      expect(headerOf(container)).toHaveStyle({ top: "56px" });
    });
  });

  it("className을 마지막에 붙여 오버라이드할 수 있다", () => {
    const { container } = render(
      <PageHeader title="주문 관리" className="custom-header" />,
    );
    expect(headerOf(container)).toHaveClass("custom-header");
  });
});
