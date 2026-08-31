import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination, PaginationSizeSelect } from "./Pagination";
import { getPaginationRange } from "./range";

/** 화면에 보이는 페이지 버튼 라벨 목록 */
function visiblePages() {
  return screen
    .getAllByRole("button")
    .map((button) => button.textContent?.trim() ?? "")
    .filter((text) => text.length > 0);
}

describe("getPaginationRange", () => {
  it("가운데 페이지는 `1 … 4 5 6 … 20`으로 축약한다", () => {
    expect(getPaginationRange({ page: 5, totalPages: 20 })).toEqual([
      1,
      "start-ellipsis",
      4,
      5,
      6,
      "end-ellipsis",
      20,
    ]);
  });

  it("첫 페이지 근처에서는 앞쪽을 생략하지 않는다", () => {
    expect(getPaginationRange({ page: 1, totalPages: 20 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      "end-ellipsis",
      20,
    ]);
  });

  it("마지막 페이지 근처에서는 뒤쪽을 생략하지 않는다", () => {
    expect(getPaginationRange({ page: 20, totalPages: 20 })).toEqual([
      1,
      "start-ellipsis",
      16,
      17,
      18,
      19,
      20,
    ]);
  });

  it("페이지가 적으면 전부 노출한다", () => {
    expect(getPaginationRange({ page: 3, totalPages: 5 })).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("총 페이지가 1이면 1만 반환한다", () => {
    expect(getPaginationRange({ page: 1, totalPages: 1 })).toEqual([1]);
  });

  it("총 페이지가 0 이하면 빈 배열이다", () => {
    expect(getPaginationRange({ page: 1, totalPages: 0 })).toEqual([]);
  });

  it("생략 부호 대신 1개만 감춰질 때는 그 번호를 그대로 보여준다", () => {
    // 7페이지 중 4페이지 — 감출 페이지가 각 1개뿐이라 …를 쓰지 않는다
    expect(getPaginationRange({ page: 4, totalPages: 7 })).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
  });

  it("siblingCount를 늘리면 현재 페이지 주변이 넓어진다", () => {
    expect(
      getPaginationRange({ page: 50, totalPages: 100, siblingCount: 2 }),
    ).toEqual([1, "start-ellipsis", 48, 49, 50, 51, 52, "end-ellipsis", 100]);
  });

  it("boundaryCount를 늘리면 처음·끝 고정 노출이 늘어난다", () => {
    expect(
      getPaginationRange({ page: 50, totalPages: 100, boundaryCount: 2 }),
    ).toEqual([1, 2, "start-ellipsis", 49, 50, 51, "end-ellipsis", 99, 100]);
  });

  it("범위를 벗어난 page는 1~totalPages로 보정된다", () => {
    expect(getPaginationRange({ page: 999, totalPages: 5 })).toEqual(
      getPaginationRange({ page: 5, totalPages: 5 }),
    );
    expect(getPaginationRange({ page: -3, totalPages: 5 })).toEqual(
      getPaginationRange({ page: 1, totalPages: 5 }),
    );
  });
});

describe("Pagination", () => {
  it("nav + aria-label로 노출된다", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    expect(
      screen.getByRole("navigation", { name: "페이지네이션" }),
    ).toBeInTheDocument();
  });

  it("label로 nav 이름을 바꿀 수 있다", () => {
    render(
      <Pagination
        page={1}
        totalPages={5}
        onPageChange={() => {}}
        label="주문 목록 페이지"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "주문 목록 페이지" }),
    ).toBeInTheDocument();
  });

  it("컨테이너는 1fr auto 1fr 3분할 · py-4 · w-full이다", () => {
    render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
    const className = screen.getByRole("navigation").className;
    expect(className).toContain("grid-cols-[1fr_auto_1fr]");
    expect(className).toContain("py-4");
    expect(className).toContain("w-full");
  });

  it("축약된 페이지 목록을 그대로 렌더링한다", () => {
    render(<Pagination page={5} totalPages={20} onPageChange={() => {}} />);
    expect(visiblePages()).toEqual(["1", "4", "5", "6", "20"]);
    // …는 버튼이 아니라 장식 span이다
    expect(screen.getAllByText("…")).toHaveLength(2);
  });

  it("생략 부호는 스크린리더에 노출되지 않는다", () => {
    render(<Pagination page={5} totalPages={20} onPageChange={() => {}} />);
    for (const ellipsis of screen.getAllByText("…")) {
      expect(ellipsis).toHaveAttribute("aria-hidden");
      expect(ellipsis.tagName).toBe("SPAN");
    }
  });

  describe("현재 페이지", () => {
    it("aria-current=page를 갖는다", () => {
      render(<Pagination page={3} totalPages={20} onPageChange={() => {}} />);
      expect(screen.getByRole("button", { name: "3" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute(
        "aria-current",
      );
    });

    it("강한 선택(action-primary + text-inverse) 스타일을 쓴다", () => {
      render(<Pagination page={3} totalPages={20} onPageChange={() => {}} />);
      const className = screen.getByRole("button", { name: "3" }).className;
      expect(className).toContain("bg-action-primary");
      expect(className).toContain("text-text-inverse");
    });

    it("선택 상태는 hover 클래스를 방출하지 않아 hover에도 색이 고정된다", () => {
      render(<Pagination page={3} totalPages={20} onPageChange={() => {}} />);
      const className = screen.getByRole("button", { name: "3" }).className;
      expect(className).not.toContain("hover:bg-action-secondary-hover");
      expect(className).not.toContain("bg-transparent");
    });

    it("현재 페이지를 다시 눌러도 onPageChange를 호출하지 않는다", async () => {
      const onPageChange = vi.fn();
      render(
        <Pagination page={3} totalPages={20} onPageChange={onPageChange} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "3" }));
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("비선택 페이지 버튼", () => {
    it("32×32 · radius small · label-medium-bold를 쓴다", () => {
      render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
      const className = screen.getByRole("button", { name: "2" }).className;
      expect(className).toContain("h-8");
      expect(className).toContain("min-w-8");
      expect(className).toContain("rounded-small");
      expect(className).toContain("label-medium-bold");
    });

    it("hover·pressed는 action-secondary 계열이다", () => {
      render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
      const className = screen.getByRole("button", { name: "2" }).className;
      expect(className).toContain("text-text-secondary");
      expect(className).toContain("hover:bg-action-secondary-hover");
      expect(className).toContain("active:bg-action-secondary-pressed");
    });

    it("클릭하면 해당 페이지로 onPageChange를 호출한다", async () => {
      const onPageChange = vi.fn();
      render(
        <Pagination page={1} totalPages={20} onPageChange={onPageChange} />,
      );
      await userEvent.click(screen.getByRole("button", { name: "4" }));
      expect(onPageChange).toHaveBeenCalledWith(4);
    });
  });

  describe("화살표", () => {
    it("이전·다음 화살표에 접근성 이름이 있다", () => {
      render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
      expect(
        screen.getByRole("button", { name: "이전 페이지" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "다음 페이지" }),
      ).toBeInTheDocument();
    });

    it("첫 페이지에서는 이전이 비활성이다", () => {
      render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
      expect(
        screen.getByRole("button", { name: "이전 페이지" }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "다음 페이지" })).toBeEnabled();
    });

    it("마지막 페이지에서는 다음이 비활성이다", () => {
      render(<Pagination page={5} totalPages={5} onPageChange={() => {}} />);
      expect(
        screen.getByRole("button", { name: "다음 페이지" }),
      ).toBeDisabled();
      expect(screen.getByRole("button", { name: "이전 페이지" })).toBeEnabled();
    });

    it("총 1페이지면 양쪽 모두 비활성이다", () => {
      render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
      expect(
        screen.getByRole("button", { name: "이전 페이지" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "다음 페이지" }),
      ).toBeDisabled();
    });

    it("비활성 화살표는 pointer-events를 막는다", () => {
      render(<Pagination page={1} totalPages={5} onPageChange={() => {}} />);
      expect(
        screen.getByRole("button", { name: "이전 페이지" }).className,
      ).toContain("disabled:pointer-events-none");
    });

    it("이전·다음으로 페이지를 이동한다", async () => {
      const onPageChange = vi.fn();
      render(
        <Pagination page={3} totalPages={20} onPageChange={onPageChange} />,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "이전 페이지" }),
      );
      expect(onPageChange).toHaveBeenCalledWith(2);

      await userEvent.click(
        screen.getByRole("button", { name: "다음 페이지" }),
      );
      expect(onPageChange).toHaveBeenCalledWith(4);
    });

    it("비활성 화살표는 클릭해도 호출되지 않는다", async () => {
      const onPageChange = vi.fn();
      render(
        <Pagination page={1} totalPages={20} onPageChange={onPageChange} />,
      );
      await userEvent.click(
        screen.getByRole("button", { name: "이전 페이지" }),
      );
      expect(onPageChange).not.toHaveBeenCalled();
    });
  });

  describe("좌·우 슬롯", () => {
    it("start와 end를 각각 첫째·마지막 셀에 렌더링한다", () => {
      render(
        <Pagination
          page={1}
          totalPages={5}
          onPageChange={() => {}}
          start={<span>총 197건</span>}
          end={<span>페이지당 10개</span>}
        />,
      );
      expect(screen.getByText("총 197건")).toBeInTheDocument();
      expect(screen.getByText("페이지당 10개")).toBeInTheDocument();
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(
      <Pagination
        page={1}
        totalPages={5}
        onPageChange={() => {}}
        className="custom-class"
      />,
    );
    expect(screen.getByRole("navigation").className).toMatch(/custom-class$/);
  });
});

describe("PaginationSizeSelect (DESIGN.md §8 개수 셀렉트)", () => {
  /** Select 루트 — 폭 규격이 걸리는 요소 */
  function rootOf(container: HTMLElement): HTMLElement {
    return container.firstChild as HTMLElement;
  }

  it("폭 140(w-35)을 컴포넌트가 보장한다 — 사용처마다 달라지지 않는다", () => {
    const { container } = render(<PaginationSizeSelect />);
    expect(rootOf(container).className).toContain("w-35");
  });

  it("좌측 슬롯이 길어져도 눌리지 않도록 shrink-0을 건다", () => {
    const { container } = render(<PaginationSizeSelect />);
    expect(rootOf(container).className).toContain("shrink-0");
  });

  it("width를 한 곳에서만 방출한다 — 트리거는 w-full만 갖는다", () => {
    render(<PaginationSizeSelect />);
    const trigger = screen.getByRole("combobox");
    expect(trigger.className).toContain("w-full");
    expect(trigger.className).not.toContain("w-35");
  });

  it("보이는 라벨이 없으면 aria-label로 접근성 이름을 준다", () => {
    render(<PaginationSizeSelect />);
    expect(
      screen.getByRole("combobox", { name: "페이지당 개수" }),
    ).toBeInTheDocument();
  });

  it("label을 주면 <label for>가 이름이 되므로 aria-label을 붙이지 않는다", () => {
    render(<PaginationSizeSelect label="페이지당 개수" />);
    const trigger = screen.getByRole("combobox", { name: "페이지당 개수" });
    expect(trigger).not.toHaveAttribute("aria-label");
  });

  it("기본 후보는 10 · 20 · 50 · 100이다", async () => {
    const user = userEvent.setup();
    render(<PaginationSizeSelect />);

    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
  });

  it("후보와 문구를 사용처가 바꿀 수 있다", async () => {
    const user = userEvent.setup();
    render(
      <PaginationSizeSelect
        sizes={[25, 50]}
        formatLabel={(size) => `${size}줄`}
      />,
    );

    await user.click(screen.getByRole("combobox"));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["25줄", "50줄"]);
  });

  it("선택 결과를 문자열이 아니라 숫자로 돌려준다", async () => {
    const user = userEvent.setup();
    const onSizeChange = vi.fn();
    render(<PaginationSizeSelect onSizeChange={onSizeChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "50개씩 보기" }));

    expect(onSizeChange).toHaveBeenCalledWith(50);
  });

  it("제어 모드 — value(숫자)가 그대로 표시된다", () => {
    render(<PaginationSizeSelect value={50} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("50개씩 보기");
  });

  it("비제어 모드 — defaultValue(숫자)로 시작한다", () => {
    render(<PaginationSizeSelect defaultValue={100} />);
    expect(screen.getByRole("combobox")).toHaveTextContent("100개씩 보기");
  });

  it("Pagination의 end 슬롯에 그대로 들어간다 — 기존 슬롯 API를 바꾸지 않는다", () => {
    render(
      <Pagination
        page={1}
        totalPages={5}
        onPageChange={() => {}}
        end={<PaginationSizeSelect value={20} />}
      />,
    );
    expect(
      screen.getByRole("combobox", { name: "페이지당 개수" }),
    ).toBeInTheDocument();
  });
});
