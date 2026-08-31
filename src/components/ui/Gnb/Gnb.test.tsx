import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gnb, GnbBadge, type GnbSection } from "./Gnb";

const SECTIONS: GnbSection[] = [
  {
    id: "shop",
    label: "쇼핑몰",
    items: [
      {
        id: "orders",
        label: "주문",
        badge: <GnbBadge tone="count">12</GnbBadge>,
        items: [
          { id: "orders-list", label: "주문 조회" },
          { id: "orders-delivery", label: "배송 관리" },
        ],
      },
      { id: "products", label: "상품", href: "/products" },
    ],
  },
  {
    id: "operation",
    items: [{ id: "stats", label: "통계" }],
  },
];

/** 아코디언 토글 버튼(= depth2를 가진 depth1 항목)만 골라낸다 */
function accordionButton(name: string): HTMLButtonElement {
  return screen.getByText(name).closest("button") as HTMLButtonElement;
}

describe("Gnb", () => {
  it("nav와 섹션·메뉴 항목을 렌더링한다", () => {
    render(<Gnb sections={SECTIONS} />);

    expect(
      screen.getByRole("navigation", { name: "주 메뉴" }),
    ).toBeInTheDocument();
    expect(screen.getByText("쇼핑몰")).toBeInTheDocument();
    expect(screen.getByText("주문")).toBeInTheDocument();
    expect(screen.getByText("상품")).toBeInTheDocument();
    expect(screen.getByText("통계")).toBeInTheDocument();
  });

  it("ariaLabel로 nav 이름을 바꿀 수 있다", () => {
    render(<Gnb sections={SECTIONS} ariaLabel="관리자 메뉴" />);
    expect(
      screen.getByRole("navigation", { name: "관리자 메뉴" }),
    ).toBeInTheDocument();
  });

  it("활성 항목에 data-active와 aria-current='page'가 붙는다", () => {
    render(<Gnb sections={SECTIONS} activeId="stats" />);

    const active = accordionButton("통계");
    expect(active).toHaveAttribute("data-active", "true");
    expect(active).toHaveAttribute("aria-current", "page");
  });

  it("활성 항목은 label-medium-bold, 나머지는 label-medium을 쓴다", () => {
    render(<Gnb sections={SECTIONS} activeId="stats" />);

    expect(screen.getByText("통계").parentElement).toHaveClass(
      "label-medium-bold",
    );
    expect(screen.getByText("주문").parentElement).toHaveClass("label-medium");
  });

  it("href가 있으면 링크로 렌더링한다", () => {
    render(<Gnb sections={SECTIONS} />);
    expect(screen.getByRole("link", { name: "상품" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  it("depth2가 있는 항목은 기본적으로 접혀 있고 aria-expanded를 노출한다", () => {
    render(<Gnb sections={SECTIONS} />);

    expect(accordionButton("주문")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("주문 조회")).not.toBeInTheDocument();
  });

  it("클릭하면 depth2가 펼쳐지고 다시 클릭하면 접힌다", async () => {
    render(<Gnb sections={SECTIONS} />);
    const orders = accordionButton("주문");

    await userEvent.click(orders);
    expect(orders).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("주문 조회")).toBeInTheDocument();

    await userEvent.click(orders);
    expect(orders).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("주문 조회")).not.toBeInTheDocument();
  });

  it("활성 하위 메뉴를 가진 아코디언은 처음부터 펼쳐진다", () => {
    render(<Gnb sections={SECTIONS} activeId="orders-delivery" />);

    expect(accordionButton("주문")).toHaveAttribute("aria-expanded", "true");
    expect(accordionButton("배송 관리")).toHaveAttribute("data-active", "true");
  });

  it("하위 메뉴가 없는 항목을 클릭하면 onSelect가 호출된다", async () => {
    const onSelect = vi.fn();
    render(<Gnb sections={SECTIONS} onSelect={onSelect} />);

    await userEvent.click(screen.getByText("통계"));
    expect(onSelect).toHaveBeenCalledWith("stats");
  });

  it("아코디언 부모를 클릭해도 onSelect는 호출되지 않는다", async () => {
    const onSelect = vi.fn();
    render(<Gnb sections={SECTIONS} onSelect={onSelect} />);

    await userEvent.click(accordionButton("주문"));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("depth2 항목을 클릭하면 그 id로 onSelect가 호출된다", async () => {
    const onSelect = vi.fn();
    render(
      <Gnb sections={SECTIONS} activeId="orders-list" onSelect={onSelect} />,
    );

    await userEvent.click(screen.getByText("배송 관리"));
    expect(onSelect).toHaveBeenCalledWith("orders-delivery");
  });

  it("확장 상태는 data-open='true' + 224 폭 클래스를 갖는다", () => {
    const { container } = render(<Gnb sections={SECTIONS} open />);
    const wrapper = container.querySelector("[data-open]");

    expect(wrapper).toHaveAttribute("data-open", "true");
    expect(wrapper).toHaveClass("w-(--size-gnb-expanded)");
    expect(wrapper).toHaveClass("@container");
  });

  it("축소 상태는 data-open='false' + absolute·60 폭·hover 확장 클래스를 갖는다", () => {
    const { container } = render(<Gnb sections={SECTIONS} open={false} />);
    const wrapper = container.querySelector("[data-open]");

    expect(wrapper).toHaveAttribute("data-open", "false");
    expect(wrapper).toHaveClass("absolute");
    expect(wrapper).toHaveClass("w-(--size-gnb-collapsed)");
    expect(wrapper).toHaveClass("hover:w-(--size-gnb-expanded)");
    // 확장 폭 클래스가 함께 방출되면 두 규칙이 충돌한다
    expect(wrapper).not.toHaveClass("w-(--size-gnb-expanded)");
  });

  /**
   * ⚠️ `z-index` 는 **sticky 래퍼에** 있어야 한다 — 안쪽 패널이 아니라.
   *
   * `position: sticky` 는 z-index 와 무관하게 **항상 쌓임 맥락을 만든다.**
   * 안쪽 패널에만 `z-(--z-sidesheet)` 를 주면 그 9000 이 맥락 안에 갇히고,
   * 래퍼는 `z-index: auto` 라 뒤에 오는 콘텐츠 컬럼이 그 위에 그려진다 —
   * 실제로 축소 상태에서 hover 로 펼쳤을 때 표 카드가 GNB 를 덮어 글자가 겹쳤다.
   *
   * jsdom 에는 레이아웃이 없어 겹침 자체는 재현되지 않는다. 클래스 위치로 못박는다.
   */
  it("z-index 는 sticky 래퍼가 든다 — 안쪽 패널에 두면 쌓임 맥락에 갇힌다", () => {
    const { container } = render(<Gnb sections={SECTIONS} open={false} />);
    const sticky = container.firstElementChild as HTMLElement;
    const panel = container.querySelector("[data-open]") as HTMLElement;

    expect(sticky.className.split(/\s+/)).toEqual(
      expect.arrayContaining(["sticky", "z-(--z-sidesheet)"]),
    );
    // 패널에 남아 있으면 갇힌 z 를 다시 만든다
    expect(panel.className.split(/\s+/)).not.toContain("z-(--z-sidesheet)");
  });

  it("섹션 라벨이 있으면 축소용 구분선과 짝으로 렌더링된다", () => {
    const { container } = render(<Gnb sections={SECTIONS} />);
    const dividers = container.querySelectorAll("[data-gnb-divider]");

    // 라벨이 있는 섹션(쇼핑몰) 하나만 구분선을 갖는다
    expect(dividers).toHaveLength(1);
    expect(dividers[0]).toHaveClass("hidden");
    expect(dividers[0]).toHaveClass("@max-[60px]:block");

    // 상하 대칭. 원본의 4/24 는 아이템 자체 여백(상하 6)과 겹쳐
    // 시각 간격이 10/30 으로 벌어져 아래 아이콘만 밀려 보였다.
    expect(dividers[0]).toHaveClass("my-3");
    expect(dividers[0]).not.toHaveClass("mb-6");
  });

  it("섹션 사이 여백은 확장 모드에만 걸린다 — 축소 모드는 구분선이 담당", () => {
    // 레퍼런스에 없는 우리 확장. 축소 모드에서 되돌리지 않으면
    // 구분선의 margin(4/24)과 겹쳐 이중 여백이 된다.
    render(<Gnb sections={SECTIONS} />);
    const nav = screen.getByRole("navigation", { name: "주 메뉴" });

    expect(nav).toHaveClass("gap-4");
    expect(nav).toHaveClass("@max-[60px]:gap-0");
  });

  it("onOpenChange를 넘기면 하단에 접기 토글이 붙고 상태에 따라 이름·동작이 바뀐다", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Gnb sections={SECTIONS} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: "메뉴 접기" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    rerender(
      <Gnb sections={SECTIONS} open={false} onOpenChange={onOpenChange} />,
    );
    onOpenChange.mockClear();

    await user.click(screen.getByRole("button", { name: "메뉴 펼치기" }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("onOpenChange가 없으면 토글을 만들지 않는다", () => {
    render(<Gnb sections={SECTIONS} />);

    expect(screen.queryByRole("button", { name: "메뉴 접기" })).toBeNull();
  });

  it("축소 모드에서 로고는 좌측 기준선을 유지하고 하단 여백만 지운다", () => {
    // pl-2 를 되돌리면 아이콘 열(x=20)보다 8px 왼쪽으로 튄다.
    // mb-4 를 남기면 로고 아래만 40이 되어 나머지 블록 간격(24)과 어긋난다.
    const { container } = render(
      <Gnb sections={SECTIONS} logo={<span>로고</span>} />,
    );
    const row = container.querySelector(".h-7");

    expect(row).toHaveClass("pl-2");
    expect(row).not.toHaveClass("@max-[60px]:pl-0");
    expect(row).toHaveClass("@max-[60px]:mb-0");
  });

  it("로고는 확장용·축소용이 컨테이너 쿼리로 스왑된다", () => {
    render(
      <Gnb
        sections={SECTIONS}
        logo={<span>풀 로고</span>}
        collapsedLogo={<span>심볼</span>}
      />,
    );

    expect(screen.getByText("풀 로고").parentElement).toHaveClass(
      "@max-[60px]:hidden",
    );
    expect(screen.getByText("심볼").parentElement).toHaveClass(
      "@max-[60px]:block",
    );
  });

  it("header 슬롯을 렌더링한다", () => {
    render(<Gnb sections={SECTIONS} header={<div>사이트 선택기</div>} />);
    expect(screen.getByText("사이트 선택기")).toBeInTheDocument();
  });

  describe("모바일 드로어", () => {
    it("open=false면 아무것도 렌더링하지 않는다", () => {
      const { container } = render(
        <Gnb sections={SECTIONS} variant="drawer" open={false} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("open=true면 딤과 280 폭 패널을 렌더링한다", () => {
      const { container } = render(
        <Gnb sections={SECTIONS} variant="drawer" open />,
      );

      expect(container.querySelector("[data-gnb-dim]")).toBeInTheDocument();
      expect(container.querySelector("[data-open]")).toHaveClass(
        "w-(--size-gnb-drawer)",
      );
    });

    it("닫기 버튼과 딤 클릭이 onOpenChange(false)를 호출한다", async () => {
      const onOpenChange = vi.fn();
      const { container } = render(
        <Gnb
          sections={SECTIONS}
          variant="drawer"
          open
          onOpenChange={onOpenChange}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "메뉴 닫기" }));
      expect(onOpenChange).toHaveBeenCalledWith(false);

      onOpenChange.mockClear();
      await userEvent.click(container.querySelector("[data-gnb-dim]")!);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    /**
     * 드로어는 딤을 깔고 화면을 가리는 **모달**이라 `Modal`·`SideSheet` 와 같은
     * 대접을 받아야 한다. 트랩이 없으면 키보드 사용자가 딤 뒤로 탭해 나가
     * 보이지 않는 것을 조작하게 되고, Escape 로 닫을 수도 없다.
     */
    it("모달로 선언되고 Escape 로 닫힌다 — 딤 뒤로 탭해 나가지 않게", async () => {
      const onOpenChange = vi.fn();
      render(
        <Gnb
          sections={SECTIONS}
          variant="drawer"
          open
          onOpenChange={onOpenChange}
        />,
      );

      const drawer = screen.getByRole("dialog", { name: "주 메뉴" });
      expect(drawer).toHaveAttribute("aria-modal", "true");

      await userEvent.keyboard("{Escape}");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    /** 사이드바(비모달)에는 트랩이 걸리면 안 된다 — 늘 떠 있는 내비게이션이다 */
    it("사이드바는 dialog 가 아니다", () => {
      render(<Gnb sections={SECTIONS} />);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

describe("GnbBadge", () => {
  it("count는 surface-inverse 배경과 20 크기 규격을 쓴다", () => {
    render(<GnbBadge tone="count">12</GnbBadge>);
    const badge = screen.getByText("12");

    expect(badge).toHaveClass("bg-surface-inverse");
    expect(badge).toHaveClass("h-5");
    expect(badge).toHaveClass("min-w-5");
    expect(badge).toHaveClass("rounded-full");
  });

  it("update는 surface-warning-primary + rounded-small을 쓴다", () => {
    render(<GnbBadge tone="update">UP</GnbBadge>);
    const badge = screen.getByText("UP");

    expect(badge).toHaveClass("bg-surface-warning-primary");
    expect(badge).toHaveClass("rounded-small");
  });

  it("warning은 하드코딩 대신 surface-critical-primary를 쓴다", () => {
    render(<GnbBadge tone="warning">!</GnbBadge>);
    expect(screen.getByText("!")).toHaveClass("bg-surface-critical-primary");
  });

  /*
   * 메뉴 스크롤 위치 유지.
   *
   * 화면 37개가 각자 자기 `<Gnb>` 를 렌더하고 `App.tsx` 는 경로가 바뀔 때 화면을
   * **다른 컴포넌트 타입으로 교체**하므로, 메뉴를 누르면 `Gnb` 가 통째로 리마운트된다.
   * 그때 스크롤이 0 으로 돌아가면 **아래쪽 메뉴를 고를 때마다 맨 위로 튄다.**
   * 실제로 보고된 버그이고, 이 테스트가 그 재발을 막는다.
   */
  describe("메뉴 스크롤 위치", () => {
    const scroller = (root: HTMLElement) =>
      root.querySelector(".overflow-y-auto") as HTMLDivElement;

    it("리마운트돼도 직전 스크롤 위치를 이어받는다", () => {
      const first = render(
        <Gnb sections={SECTIONS} activeId="products" onSelect={() => {}} />,
      );
      const el = scroller(first.container);

      el.scrollTop = 240;
      fireEvent.scroll(el);

      /* 화면 전환 = 페이지 언마운트 → Gnb 도 함께 사라진다 */
      first.unmount();

      const second = render(
        <Gnb sections={SECTIONS} activeId="stats" onSelect={() => {}} />,
      );
      expect(scroller(second.container).scrollTop).toBe(240);
    });

    it("스크롤이 바뀌면 최신 위치를 기억한다", () => {
      const first = render(
        <Gnb sections={SECTIONS} activeId="products" onSelect={() => {}} />,
      );
      const el = scroller(first.container);

      el.scrollTop = 100;
      fireEvent.scroll(el);
      el.scrollTop = 30;
      fireEvent.scroll(el);
      first.unmount();

      const second = render(
        <Gnb sections={SECTIONS} activeId="stats" onSelect={() => {}} />,
      );
      expect(scroller(second.container).scrollTop).toBe(30);
    });
  });
});
