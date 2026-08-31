import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { DataTableShell } from "./DataTableShell";

function shellOf(container: HTMLElement): HTMLElement {
  return container.firstChild as HTMLElement;
}

function slot(container: HTMLElement, name: string): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-table-shell-${name}]`);
}

/** `p-6` `px-6` `pt-4` … 어떤 형태의 패딩 유틸이든 잡는다 */
const PADDING_CLASS = /(?:^|\s)-?p[xytrbles]?-/;

describe("DataTableShell", () => {
  it("자식(표)을 렌더링한다", () => {
    render(
      <DataTableShell>
        <table>
          <tbody>
            <tr>
              <td>주문 1</td>
            </tr>
          </tbody>
        </table>
      </DataTableShell>,
    );
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  describe("표면 (DESIGN.md §7-1 · DESIGN_참고.md §5)", () => {
    it("surface 배경 · radius medium(8) · 보더 경계를 쓴다", () => {
      const { container } = render(<DataTableShell />);
      const className = shellOf(container).className;
      expect(className).toContain("bg-surface");
      expect(className).toContain("rounded-medium");
      // 경계선은 ::after 오버레이로 그린다 — 표 행의 불투명 배경이
      // outline-offset 음수 띠를 덮어 좌우 세로선이 끊기기 때문이다.
      expect(className).toContain("after:outline-1");
      expect(className).toContain("after:-outline-offset-1");
      expect(className).toContain("after:outline-border");
      expect(className).toContain("after:absolute");
      expect(className).toContain("after:inset-0");
      expect(className).toContain("after:pointer-events-none");
      expect(className).toContain("relative");
    });

    it("그림자를 쓰지 않는다 — 페이지에 붙은 섹션이다", () => {
      const { container } = render(<DataTableShell />);
      expect(shellOf(container).className).not.toContain("shadow-");
    });

    it("radius 밖으로 표가 삐져나오지 않도록 overflow-hidden이다", () => {
      const { container } = render(<DataTableShell />);
      expect(shellOf(container).className).toContain("overflow-hidden");
    });

    it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
      const { container } = render(<DataTableShell className="custom-class" />);
      expect(shellOf(container).className).toMatch(/custom-class$/);
    });
  });

  describe("표 래퍼 (회귀 방지)", () => {
    /**
     * 이 컴포넌트의 존재 이유다. 셀의 `first:pl-6`/`last:pr-6`(24)가 곧
     * 컨테이너 가장자리 정렬이므로 래퍼에 패딩을 주면 좌우가 48이 되어
     * 툴바(24)와 어긋나고 zebra가 좌우 끝까지 차지 않는다.
     */
    it("어떤 패딩 클래스도 갖지 않는다", () => {
      const { container } = render(
        <DataTableShell toolbar={<span>툴바</span>}>
          <table />
        </DataTableShell>,
      );
      const body = slot(container, "body");
      expect(body).not.toBeNull();
      expect(body?.className).not.toMatch(PADDING_CLASS);
    });

    it("가로 스크롤을 위해 width 100% · overflow auto를 쓴다", () => {
      const { container } = render(<DataTableShell />);
      const className = slot(container, "body")?.className ?? "";
      expect(className).toContain("w-full");
      expect(className).toContain("overflow-auto");
    });

    it("bodyClassName은 스크롤 래퍼에만 붙는다 (sticky 헤더용 높이 제한 등)", () => {
      const { container } = render(
        <DataTableShell bodyClassName="max-h-150" />,
      );
      expect(slot(container, "body")?.className).toContain("max-h-150");
      expect(shellOf(container).className).not.toContain("max-h-150");
    });
  });

  describe("툴바", () => {
    it("슬롯이 하나도 없으면 툴바 영역을 만들지 않는다", () => {
      const { container } = render(
        <DataTableShell>
          <table />
        </DataTableShell>,
      );
      expect(slot(container, "toolbar")).toBeNull();
    });

    it("toolbar 노드를 렌더링한다", () => {
      render(<DataTableShell toolbar={<button type="button">필터</button>} />);
      expect(screen.getByRole("button", { name: "필터" })).toBeVisible();
    });

    it("toolbarStart·toolbarEnd를 좌우로 나눠 렌더링한다", () => {
      const { container } = render(
        <DataTableShell
          toolbarStart={<button type="button">상태</button>}
          toolbarEnd={<button type="button">검색</button>}
        />,
      );
      const toolbar = slot(container, "toolbar");
      expect(toolbar?.className).toContain("justify-between");
      expect(toolbar?.children).toHaveLength(2);
      expect(screen.getByRole("button", { name: "상태" })).toBeVisible();
      expect(screen.getByRole("button", { name: "검색" })).toBeVisible();
    });

    it("좌우 24 패딩과 gap 8을 갖는다 (§7-1)", () => {
      const { container } = render(
        <DataTableShell toolbar={<span>툴바</span>} />,
      );
      const className = slot(container, "toolbar")?.className ?? "";
      expect(className).toContain("p-6");
      expect(className).toContain("gap-2");
    });

    it("필터 래퍼는 모바일 100% · 데스크톱 fit-content다 (§7-1)", () => {
      const { container } = render(
        <DataTableShell toolbarStart={<span>상태</span>} />,
      );
      const wrapper = slot(container, "toolbar")?.firstElementChild;
      expect(wrapper?.className).toContain("w-full");
      expect(wrapper?.className).toContain("sm:w-fit");
    });
  });

  describe("빈 상태", () => {
    it("isEmpty면 표 대신 empty를 렌더링한다", () => {
      render(
        <DataTableShell isEmpty empty={<p>주문이 없습니다</p>}>
          <table />
        </DataTableShell>,
      );
      expect(screen.getByText("주문이 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("빈 상태에서도 툴바는 유지한다 — 필터를 되돌릴 수 있어야 한다", () => {
      render(
        <DataTableShell
          isEmpty
          toolbarStart={<button type="button">초기화</button>}
          empty={<p>주문이 없습니다</p>}
        />,
      );
      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
    });

    it("빈 상태에서는 푸터·더보기를 감춘다", () => {
      const { container } = render(
        <DataTableShell
          isEmpty
          empty={<p>주문이 없습니다</p>}
          footer={<nav aria-label="페이지네이션" />}
          loadMore={<button type="button">더보기</button>}
        />,
      );
      expect(slot(container, "footer")).toBeNull();
      expect(slot(container, "more")).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(screen.queryByRole("button", { name: "더보기" })).toBeNull();
    });

    it("isEmpty가 아니면 empty를 렌더링하지 않는다", () => {
      render(
        <DataTableShell empty={<p>주문이 없습니다</p>}>
          <table />
        </DataTableShell>,
      );
      expect(screen.queryByText("주문이 없습니다")).toBeNull();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });
  });

  describe("로딩 상태", () => {
    it("isLoading 이면 표 대신 loading 을 렌더링한다", () => {
      render(
        <DataTableShell isLoading loading={<p>불러오는 중</p>}>
          <table />
        </DataTableShell>,
      );
      expect(screen.getByText("불러오는 중")).toBeVisible();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it("우선순위는 loading > empty 다 — 끝나기 전에 '없음'을 그리지 않는다", () => {
      render(
        <DataTableShell
          isLoading
          isEmpty
          loading={<p>불러오는 중</p>}
          empty={<p>주문이 없습니다</p>}
        >
          <table />
        </DataTableShell>,
      );
      expect(screen.getByText("불러오는 중")).toBeVisible();
      expect(screen.queryByText("주문이 없습니다")).toBeNull();
    });

    it("로딩 중에도 툴바는 유지한다 — 조건을 되돌릴 수단이 있어야 한다", () => {
      render(
        <DataTableShell
          isLoading
          toolbarStart={<button type="button">초기화</button>}
          loading={<p>불러오는 중</p>}
        />,
      );
      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
    });

    it("본문 컨테이너가 aria-busy 로 로딩을 알린다 — 스켈레톤이 각자 말하지 않는다", () => {
      const { container } = render(
        <DataTableShell isLoading loading={<p>불러오는 중</p>} />,
      );
      expect(slot(container, "body")).toHaveAttribute("aria-busy", "true");
      /* 로딩 표시자가 접근성 트리에 이름을 여러 개 만들지 않는다 */
      expect(screen.queryAllByRole("status")).toHaveLength(0);
    });

    it("로딩이 아니면 aria-busy 속성 자체가 없다 — false 를 남기지 않는다", () => {
      const { container } = render(
        <DataTableShell>
          <table />
        </DataTableShell>,
      );
      expect(slot(container, "body")).not.toHaveAttribute("aria-busy");
    });

    it("로딩 중에는 푸터·더보기를 감춘다 — 총 페이지 수를 아직 모른다", () => {
      const { container } = render(
        <DataTableShell
          isLoading
          loading={<p>불러오는 중</p>}
          footer={<nav aria-label="페이지네이션" />}
          loadMore={<button type="button">더보기</button>}
        />,
      );
      expect(slot(container, "footer")).toBeNull();
      expect(slot(container, "more")).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();
    });

    it("isLoading 이 아니면 loading 을 렌더링하지 않는다", () => {
      render(
        <DataTableShell loading={<p>불러오는 중</p>}>
          <table />
        </DataTableShell>,
      );
      expect(screen.queryByText("불러오는 중")).toBeNull();
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    it("로딩 → 데이터 전이: 같은 자리에서 뼈대가 값으로 바뀌고 aria-busy 가 사라진다", () => {
      const { container, rerender } = render(
        <DataTableShell isLoading loading={<p>불러오는 중</p>}>
          <table>
            <tbody>
              <tr>
                <td>주문 1</td>
              </tr>
            </tbody>
          </table>
        </DataTableShell>,
      );

      const bodyBefore = slot(container, "body");
      expect(bodyBefore).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByText("주문 1")).toBeNull();

      rerender(
        <DataTableShell isLoading={false} loading={<p>불러오는 중</p>}>
          <table>
            <tbody>
              <tr>
                <td>주문 1</td>
              </tr>
            </tbody>
          </table>
        </DataTableShell>,
      );

      expect(screen.getByText("주문 1")).toBeVisible();
      expect(screen.queryByText("불러오는 중")).toBeNull();
      expect(slot(container, "body")).not.toHaveAttribute("aria-busy");
      /*
        본문 컨테이너가 **같은 DOM 노드**다 — React 가 래퍼를 버리고 다시 만들지
        않았다는 뜻이다. 스크롤 위치·sticky 헤더가 전이에서 살아남는 근거다.
      */
      expect(slot(container, "body")).toBe(bodyBefore);
    });
  });

  describe("푸터·더보기", () => {
    it("footer를 좌우 24 패딩만 준 채로 렌더링한다 (상하 16은 Pagination 몫)", () => {
      const { container } = render(
        <DataTableShell footer={<nav aria-label="페이지네이션" />} />,
      );
      const footer = slot(container, "footer");
      expect(footer?.className).toContain("px-6");
      expect(footer?.className).not.toMatch(/(?:^|\s)-?p[ytb]?-/);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("footer가 없으면 푸터 영역을 만들지 않는다", () => {
      const { container } = render(<DataTableShell />);
      expect(slot(container, "footer")).toBeNull();
    });

    it("더보기 슬롯은 높이 48 · 가로 100% · 중앙 정렬이다 (§7-1)", () => {
      const { container } = render(
        <DataTableShell loadMore={<button type="button">더보기</button>} />,
      );
      const more = slot(container, "more");
      expect(more?.className).toContain("h-12");
      expect(more?.className).toContain("w-full");
      expect(more?.className).toContain("justify-center");
      expect(screen.getByRole("button", { name: "더보기" })).toBeVisible();
    });
  });

  /**
   * 고정 열이 있는 표에서 스크롤바가 표 전체 폭에 깔리면 "당기면 고정 열도 움직이겠지"로
   * 읽히는데 실제로는 안 움직인다. 그래서 스크롤바를 고정 폭만큼 들여서 그린다.
   *
   * jsdom 에는 레이아웃이 없어 `scrollWidth` 가 늘 0 이라 **바가 눈에 보이지는 않는다.**
   * 그래도 엘리먼트와 리스너는 여기서 검사할 수 있다 — 실제로 "폭을 잰 뒤에 렌더"
   * 하도록 짰다가 **리스너가 하나도 안 붙는 바**를 만든 적이 있다.
   * 끌었을 때의 감각만 브라우저에서 확인하면 된다.
   */
  describe("가로 스크롤바 들여쓰기 (scrollLeadWidth)", () => {
    it("넘기지 않으면 표 래퍼의 스크롤바를 감추지 않는다 — 기존 동작 그대로", () => {
      const { container } = render(
        <DataTableShell>
          <table />
        </DataTableShell>,
      );
      const body = slot(container, "body");
      expect(body?.className).toContain("overflow-auto");
      expect(body?.className).not.toContain("scrollbar-width");
      expect(slot(container, "scrollbar")).toBeNull();
    });

    it("넘기면 표 래퍼의 가로 스크롤바를 감춘다 — 바가 둘이면 안 된다", () => {
      const { container } = render(
        <DataTableShell scrollLeadWidth={696}>
          <table />
        </DataTableShell>,
      );
      const body = slot(container, "body");
      expect(body?.className).toContain("[scrollbar-width:none]");
      expect(body?.className).toContain("[&::-webkit-scrollbar]:hidden");
    });

    it("0을 넘기면 꺼진 것으로 본다 — 고정 열이 없다는 뜻이다", () => {
      const { container } = render(
        <DataTableShell scrollLeadWidth={0}>
          <table />
        </DataTableShell>,
      );
      expect(slot(container, "body")?.className).not.toContain(
        "scrollbar-width",
      );
      expect(slot(container, "scrollbar")).toBeNull();
    });

    /**
     * 폭을 재기 **전에도** 바가 있어야 한다. 폭이 생긴 뒤에 렌더하면 동기화 effect 가
     * 처음 돌 때 ref 가 비어 있어 리스너가 영영 안 붙는다.
     * jsdom 은 `scrollWidth` 가 0 이므로, 여기서 바가 잡히면 그 계약이 지켜진 것이다.
     */
    it("폭을 재기 전에도 바 엘리먼트가 있다 — 리스너를 붙일 자리가 있어야 한다", () => {
      const { container } = render(
        <DataTableShell scrollLeadWidth={696}>
          <table />
        </DataTableShell>,
      );
      const bar = slot(container, "scrollbar");
      expect(bar).not.toBeNull();
      expect(bar).toHaveStyle({ marginLeft: "696px" });
      // 표시 전용이라 스크린리더에는 잡히지 않는다
      expect(bar).toHaveAttribute("aria-hidden");
    });

    /**
     * 상품 관리처럼 `관리` 열을 오른쪽에 붙여 둔 표는 **양쪽**을 비켜야 한다.
     * 한쪽만 비키면 반대쪽에서 같은 오해가 생긴다.
     */
    it("우측 고정 열이 있으면 그쪽도 비켜서 그린다", () => {
      const { container } = render(
        <DataTableShell scrollLeadWidth={568} scrollTrailWidth={80}>
          <table />
        </DataTableShell>,
      );
      expect(slot(container, "scrollbar")).toHaveStyle({
        marginLeft: "568px",
        marginRight: "80px",
      });
    });

    it("바를 끌면 표가 따라간다 (scrollLeft 를 서로 물린다)", () => {
      const { container } = render(
        <DataTableShell scrollLeadWidth={696}>
          <table />
        </DataTableShell>,
      );
      const body = slot(container, "body")!;
      const bar = slot(container, "scrollbar")!;

      bar.scrollLeft = 400;
      bar.dispatchEvent(new Event("scroll"));
      expect(body.scrollLeft).toBe(400);

      // 반대 방향도 — 표를 굴리면 바가 따라온다
      body.scrollLeft = 120;
      body.dispatchEvent(new Event("scroll"));
      expect(bar.scrollLeft).toBe(120);
    });
  });

  it("ref로 셸 요소에 접근할 수 있다", () => {
    const ref = createRef<HTMLElement>();
    render(<DataTableShell ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe("SECTION");
  });

  it("aria-label 등 나머지 속성은 셸 요소로 전달된다", () => {
    render(<DataTableShell aria-label="주문 목록" />);
    expect(screen.getByRole("region", { name: "주문 목록" })).toBeVisible();
  });
});
