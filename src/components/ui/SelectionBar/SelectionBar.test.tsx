import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  SelectionBar,
  SelectionBarButton,
  SelectionBarDivider,
} from "./SelectionBar";

/** 기본 액션 2개 + 사이 구분선 */
function Actions() {
  return (
    <>
      <SelectionBarButton>삭제</SelectionBarButton>
      <SelectionBarDivider />
      <SelectionBarButton>내보내기</SelectionBarButton>
    </>
  );
}

const BAR_NAME = "선택 항목 일괄 작업";

describe("SelectionBar", () => {
  describe("open", () => {
    it("open이 false면 아무것도 렌더하지 않는다", () => {
      render(
        <SelectionBar open={false} count={3} onClear={() => {}}>
          <Actions />
        </SelectionBar>,
      );

      expect(screen.queryByRole("group", { name: BAR_NAME })).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("open이 true면 바가 나타난다", () => {
      render(
        <SelectionBar open count={3} onClear={() => {}}>
          <Actions />
        </SelectionBar>,
      );

      expect(screen.getByRole("group", { name: BAR_NAME })).toBeInTheDocument();
    });

    it("open이 false로 바뀌면 DOM에서 제거된다", () => {
      const { rerender } = render(
        <SelectionBar open count={1} onClear={() => {}} />,
      );
      expect(screen.getByRole("group", { name: BAR_NAME })).toBeInTheDocument();

      rerender(<SelectionBar open={false} count={0} onClear={() => {}} />);
      expect(screen.queryByRole("group", { name: BAR_NAME })).toBeNull();
    });

    it("document.body에 포털로 렌더된다", () => {
      const { container } = render(<SelectionBar open count={2} />);

      const bar = screen.getByRole("group", { name: BAR_NAME });
      expect(container).toBeEmptyDOMElement();
      expect(bar.parentElement?.parentElement).toBe(document.body);
    });

    it("container를 넘기면 그 요소 안으로 렌더된다", () => {
      const target = document.createElement("div");
      document.body.appendChild(target);

      render(<SelectionBar open count={2} container={target} />);

      expect(
        target.contains(screen.getByRole("group", { name: BAR_NAME })),
      ).toBe(true);
      target.remove();
    });
  });

  describe("count", () => {
    it("기본 문구는 'N개 선택됨'이다", () => {
      render(<SelectionBar open count={3} />);
      expect(screen.getByRole("status")).toHaveTextContent("3개 선택됨");
    });

    it("count가 바뀌면 라이브 리전의 내용만 갱신된다", () => {
      const { rerender } = render(<SelectionBar open count={1} />);
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("1개 선택됨");

      rerender(<SelectionBar open count={5} />);
      // 같은 노드가 유지되어야 스크린리더가 "변경"으로 읽는다
      expect(screen.getByRole("status")).toBe(status);
      expect(status).toHaveTextContent("5개 선택됨");
    });

    it("countLabel로 문구를 바꿀 수 있다", () => {
      render(
        <SelectionBar
          open
          count={12}
          countLabel={(count) => `주문 ${count}건 선택`}
        />,
      );

      expect(screen.getByRole("status")).toHaveTextContent("주문 12건 선택");
    });
  });

  describe("선택 해제", () => {
    it("해제 버튼을 누르면 onClear가 호출된다", () => {
      const onClear = vi.fn();
      render(<SelectionBar open count={3} onClear={onClear} />);

      fireEvent.click(screen.getByRole("button", { name: "선택 해제" }));
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it("onClear가 없으면 해제 버튼도 렌더되지 않는다", () => {
      render(<SelectionBar open count={3} />);
      expect(screen.queryByRole("button", { name: "선택 해제" })).toBeNull();
    });

    it("clearLabel로 스크린리더 이름을 바꿀 수 있다", () => {
      render(
        <SelectionBar
          open
          count={3}
          onClear={() => {}}
          clearLabel="전체 해제"
        />,
      );
      expect(
        screen.getByRole("button", { name: "전체 해제" }),
      ).toBeInTheDocument();
    });
  });

  describe("접근성", () => {
    it("개수는 polite 라이브 리전으로 노출된다", () => {
      render(<SelectionBar open count={3} />);

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("바는 이름을 가진 group이며 label로 바꿀 수 있다", () => {
      render(<SelectionBar open count={3} label="상품 일괄 작업" />);

      expect(
        screen.getByRole("group", { name: "상품 일괄 작업" }),
      ).toBeInTheDocument();
    });
  });

  describe("스펙 (DESIGN.md §25)", () => {
    it("컨테이너는 fixed · bottom 80 · 가운데 정렬 · z-modal", () => {
      render(<SelectionBar open count={3} />);

      const container = screen.getByRole("group", {
        name: BAR_NAME,
      }).parentElement;
      expect(container?.className).toContain("fixed");
      expect(container?.className).toContain("bottom-20");
      expect(container?.className).toContain("left-1/2");
      expect(container?.className).toContain("-translate-x-1/2");
      expect(container?.className).toContain("z-(--z-modal)");
    });

    it("바는 padding 10 12 · gap 12 · surface-toast · radius large · shadow-toast", () => {
      render(<SelectionBar open count={3} />);

      const className = screen.getByRole("group", { name: BAR_NAME }).className;
      expect(className).toContain("px-3");
      expect(className).toContain("py-2.5");
      expect(className).toContain("gap-3");
      expect(className).toContain("bg-surface-toast");
      expect(className).toContain("rounded-large");
      expect(className).toContain("shadow-toast");
    });

    it("개수 문구는 label-small-bold · text-on", () => {
      render(<SelectionBar open count={3} />);

      const className = screen.getByRole("status").className;
      expect(className).toContain("label-small-bold");
      expect(className).toContain("text-text-on");
    });

    it("진입 애니메이션 — 숨은 상태로 시작해 다음 프레임에 떠오른다", async () => {
      render(<SelectionBar open count={3} />);

      const bar = screen.getByRole("group", { name: BAR_NAME });
      expect(bar.className).toContain("opacity-0");
      expect(bar.className).toContain("translate-y-4");

      await waitFor(() => expect(bar.className).toContain("opacity-100"));
      expect(bar.className).toContain("translate-y-0");
    });

    it("전달한 className이 마지막에 붙어 오버라이드한다", () => {
      render(<SelectionBar open count={3} className="custom-class" />);
      expect(screen.getByRole("group", { name: BAR_NAME }).className).toMatch(
        /custom-class$/,
      );
    });
  });
});

describe("SelectionBarButton", () => {
  it("클릭하면 onClick이 호출된다", () => {
    const onClick = vi.fn();
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton onClick={onClick}>삭제</SelectionBarButton>
      </SelectionBar>,
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disabled면 클릭해도 onClick이 불리지 않는다", () => {
    const onClick = vi.fn();
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton onClick={onClick} disabled>
          삭제
        </SelectionBarButton>
      </SelectionBar>,
    );

    const button = screen.getByRole("button", { name: "삭제" });
    fireEvent.click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it("type은 submit이 아니라 button이다", () => {
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton>삭제</SelectionBarButton>
      </SelectionBar>,
    );

    expect(screen.getByRole("button", { name: "삭제" })).toHaveAttribute(
      "type",
      "button",
    );
  });

  it("padding 6 · radius small · transparent · 12/16/600", () => {
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton>삭제</SelectionBarButton>
      </SelectionBar>,
    );

    const className = screen.getByRole("button", { name: "삭제" }).className;
    expect(className).toContain("p-1.5");
    expect(className).toContain("rounded-small");
    expect(className).toContain("bg-transparent");
    expect(className).toContain("label-small-bold");
    expect(className).toContain("hover:bg-surface");
    expect(className).toContain("duration-100");
  });

  it("글자색은 배경을 따라 뒤집는다 — 검정 바에서 읽혀야 한다", () => {
    // 원본은 아이콘만 뒤집고(`svg { icon-on }` → `:hover svg { icon-secondary-hover }`)
    // 글자색은 `text-secondary`(어두움) 그대로다. 원본 버튼이 **아이콘 전용**이라
    // 그 색이 화면에 드러나지 않기 때문이다. 우리는 텍스트 라벨을 쓰므로
    // 그대로 두면 검정 바 위 어두운 글씨가 되어 읽히지 않는다.
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton>삭제</SelectionBarButton>
      </SelectionBar>,
    );

    const classes = screen
      .getByRole("button", { name: "삭제" })
      .className.split(/\s+/);

    // 기본은 on-dark(흰색), 배경이 흰색으로 바뀌는 hover/focus 에서만 어두워진다
    expect(classes).toContain("text-text-on");
    expect(classes).not.toContain("text-text-secondary");
    expect(classes).toContain("hover:text-text-secondary-hover");
    expect(classes).toContain("focus-visible:text-text-secondary-hover");
    // disabled 는 hover 보다 의사클래스가 하나 많아 명시도로 이긴다
    expect(classes).toContain("disabled:hover:text-text-disabled");
  });

  it("아이콘은 icon-on, disabled면 icon-disabled로 그린다", () => {
    const { rerender } = render(
      <SelectionBar open count={2}>
        <SelectionBarButton icon={<svg data-testid="icon" />}>
          삭제
        </SelectionBarButton>
      </SelectionBar>,
    );

    const iconSlot = () =>
      screen
        .getByRole("button", { name: "삭제" })
        .querySelector('[data-slot="icon"]');

    expect(iconSlot()?.className).toContain("text-icon-on");
    expect(iconSlot()).toHaveAttribute("aria-hidden");
    // 아이콘도 배경을 따라 뒤집는다 (원본 `:hover svg { icon-secondary-hover }`)
    expect(iconSlot()?.className).toContain(
      "group-hover:text-icon-secondary-hover",
    );

    rerender(
      <SelectionBar open count={2}>
        <SelectionBarButton icon={<svg data-testid="icon" />} disabled>
          삭제
        </SelectionBarButton>
      </SelectionBar>,
    );
    expect(iconSlot()?.className).toContain("text-icon-disabled");
  });

  it("ref를 일반 prop으로 받는다", () => {
    let node: HTMLButtonElement | null = null;
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton
          ref={(element) => {
            node = element;
          }}
        >
          삭제
        </SelectionBarButton>
      </SelectionBar>,
    );

    expect(node).toBeInstanceOf(HTMLButtonElement);
  });
});

describe("SelectionBarDivider", () => {
  it("1 × 10px · bg-divide 세로선이다", () => {
    render(
      <SelectionBar open count={2}>
        <SelectionBarButton>삭제</SelectionBarButton>
      </SelectionBar>,
    );

    // 개수 영역과 액션 사이에 자동으로 들어간 구분선
    const divider = screen
      .getByRole("group", { name: BAR_NAME })
      .querySelector('[aria-hidden="true"].w-px');

    expect(divider).not.toBeNull();
    expect(divider?.className).toContain("bg-divide");
    expect(divider).toHaveStyle({ height: "10px" });
  });

  it("children이 없으면 자동 구분선도 그리지 않는다", () => {
    render(<SelectionBar open count={2} onClear={() => {}} />);

    const divider = screen
      .getByRole("group", { name: BAR_NAME })
      .querySelector(".w-px");
    expect(divider).toBeNull();
  });
});

describe("합성 API", () => {
  it("SelectionBar.Button · SelectionBar.Divider 로도 쓸 수 있다", () => {
    expect(SelectionBar.Button).toBe(SelectionBarButton);
    expect(SelectionBar.Divider).toBe(SelectionBarDivider);
  });
});
