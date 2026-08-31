import { render, screen } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

/** 루트 = 컨테이너의 첫 자식. 자식도 텍스트도 없는 단일 요소다 */
function root(container: HTMLElement) {
  return container.firstElementChild as HTMLElement;
}

/** 클래스 목록에서 접두사가 맞는 것만 센다 — 같은 속성이 두 번 방출되는지 보는 용도 */
function classesStartingWith(el: HTMLElement, prefix: string) {
  return [...el.classList].filter((c) => c.startsWith(prefix));
}

describe("Skeleton", () => {
  describe("접근성 계약 — 절대 읽히지 않는다", () => {
    it("항상 aria-hidden 이다", () => {
      const { container } = render(<Skeleton />);
      expect(root(container)).toHaveAttribute("aria-hidden", "true");
    });

    it("shape 과 무관하게 aria-hidden 이다", () => {
      const { container } = render(<Skeleton shape="block" className="h-60" />);
      expect(root(container)).toHaveAttribute("aria-hidden", "true");
    });

    it("role 도 이름도 갖지 않는다 — 스피너와 달리 화면에 수십 개가 놓인다", () => {
      const { container } = render(<Skeleton />);
      const el = root(container);
      expect(el).not.toHaveAttribute("role");
      expect(el).not.toHaveAttribute("aria-label");
      expect(el).not.toHaveAttribute("aria-labelledby");
      /* 컨테이너가 aria-busy 로 한 번만 말한다 — 부품이 말하지 않는다 */
      expect(el).not.toHaveAttribute("aria-busy");
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("텍스트 노드가 없다 — 낭독될 글자를 남기지 않는다", () => {
      const { container } = render(<Skeleton />);
      const el = root(container);
      expect(el.textContent).toBe("");
      expect(el.childNodes).toHaveLength(0);
    });

    it("탭이 서지 않는다 — 어느 조건에서도 button 이 되지 않는다", () => {
      const { container } = render(<Skeleton shape="block" className="h-60" />);
      const el = root(container);
      expect(el).not.toHaveAttribute("tabindex");
      expect(el.tagName).toBe("SPAN");
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("<p> 안에 넣어도 유효한 HTML 이다 — 루트가 span 이라 DOM 이 재구성되지 않는다", () => {
      const { container } = render(
        <p className="body-medium">
          <Skeleton className="w-24" />
        </p>,
      );
      const p = container.querySelector("p") as HTMLElement;
      /* div 였다면 브라우저가 <p> 를 끊어 스켈레톤이 밖으로 튀어나간다 */
      expect(p.firstElementChild?.tagName).toBe("SPAN");
      expect(p.children).toHaveLength(1);
    });
  });

  describe("shape — 높이·radius 의 정본", () => {
    it("기본은 line 이다", () => {
      const { container } = render(<Skeleton />);
      expect(root(container)).toHaveAttribute("data-skeleton", "line");
    });

    it("line 은 타이포 프리셋 줄 높이(h-lh)를 쓴다 — 숫자를 받지 않는다", () => {
      const { container } = render(<Skeleton shape="line" />);
      expect(root(container)).toHaveClass("h-lh");
    });

    it("line 의 radius 는 small(6)", () => {
      const { container } = render(<Skeleton shape="line" />);
      expect(root(container)).toHaveClass("rounded-small");
    });

    it("block 의 radius 는 medium(8)", () => {
      const { container } = render(<Skeleton shape="block" />);
      expect(root(container)).toHaveClass("rounded-medium");
    });

    it("block 은 높이 클래스를 하나도 방출하지 않는다 — 높이는 부모·className 이 준다", () => {
      const { container } = render(<Skeleton shape="block" />);
      expect(classesStartingWith(root(container), "h-")).toHaveLength(0);
    });

    it("폭 클래스도 방출하지 않는다 — display:block 이라 기본이 이미 부모 폭이다", () => {
      const { container } = render(<Skeleton />);
      expect(classesStartingWith(root(container), "w-")).toHaveLength(0);
      expect(root(container)).toHaveClass("block");
    });
  });

  describe("cn() 은 병합하지 않는다 — 같은 속성을 두 번 내보내지 않는 계약", () => {
    it("radius 를 정확히 한 번만 방출한다", () => {
      for (const shape of ["line", "block"] as const) {
        const { container, unmount } = render(<Skeleton shape={shape} />);
        expect(classesStartingWith(root(container), "rounded-")).toHaveLength(
          1,
        );
        unmount();
      }
    });

    it("line 의 높이 선언은 하나뿐이다", () => {
      const { container } = render(<Skeleton shape="line" />);
      expect(classesStartingWith(root(container), "h-")).toEqual(["h-lh"]);
    });

    it("배경색을 정확히 한 번만 방출한다 — 전용 토큰 surface-skeleton", () => {
      const { container } = render(<Skeleton />);
      const bg = classesStartingWith(root(container), "bg-");
      expect(bg).toEqual(["bg-surface-skeleton"]);
    });

    it("두 shape 이 서로 다른 radius 를 쓴다 — 분기가 실제로 갈린다", () => {
      const line = render(<Skeleton shape="line" />);
      const block = render(<Skeleton shape="block" />);
      expect(classesStartingWith(root(line.container), "rounded-")).not.toEqual(
        classesStartingWith(root(block.container), "rounded-"),
      );
    });
  });

  describe("className — 폭(과 block 의 높이)을 주는 통로", () => {
    it("폭 유틸이 그대로 붙는다", () => {
      const { container } = render(<Skeleton className="w-24" />);
      const el = root(container);
      expect(el).toHaveClass("w-24");
      /* 기본 폭 클래스가 없으므로 폭 선언은 이것 하나뿐이다 */
      expect(classesStartingWith(el, "w-")).toEqual(["w-24"]);
    });

    it("block 의 높이가 className 으로만 들어와 충돌하지 않는다", () => {
      const { container } = render(
        <Skeleton shape="block" className="h-60 w-full" />,
      );
      expect(classesStartingWith(root(container), "h-")).toEqual(["h-60"]);
    });

    it("className 없이도 shape·배경은 그대로 방출된다", () => {
      const { container } = render(<Skeleton shape="block" />);
      const el = root(container);
      expect(el).toHaveClass("bg-surface-skeleton");
      expect(el).toHaveClass("rounded-medium");
    });
  });

  describe("반복은 호출부의 몫이다", () => {
    it("count/rows prop 없이 map 으로 여러 줄을 만든다", () => {
      const { container } = render(
        <div className="body-medium">
          {["w-full", "w-full", "w-1/2"].map((w, i) => (
            <Skeleton key={i} className={w} />
          ))}
        </div>,
      );
      const nodes = container.querySelectorAll("[data-skeleton]");
      expect(nodes).toHaveLength(3);
      /* 세 개가 모두 숨겨져 있다 — "로딩 중"이 세 번 낭독되지 않는다 */
      for (const n of nodes) {
        expect(n).toHaveAttribute("aria-hidden", "true");
      }
    });
  });
});
