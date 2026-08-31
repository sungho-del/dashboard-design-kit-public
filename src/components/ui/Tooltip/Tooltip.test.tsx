import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";
import { Tooltip } from "./Tooltip";

/**
 * floating-ui 의 `autoUpdate` 는 ResizeObserver·IntersectionObserver 를 쓴다.
 * jsdom 에는 둘 다 없으므로 아무 것도 하지 않는 스텁을 심는다.
 *
 * ⚠️ jsdom 에는 레이아웃이 없어 모든 요소의 크기가 0이다 —
 * floating-ui 가 계산한 실제 좌표나 화살표 위치는 검증할 수 없다.
 * 따라서 이 파일은 **위치가 아니라 동작·접근성**만 검증한다.
 */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver =
  ObserverStub as unknown as typeof IntersectionObserver;

function renderTooltip(props: Partial<Parameters<typeof Tooltip>[0]> = {}) {
  return render(
    <Tooltip content="재고를 즉시 동기화합니다" {...props}>
      <Button>동기화</Button>
    </Tooltip>,
  );
}

function getTrigger() {
  return screen.getByRole("button", { name: "동기화" });
}

describe("Tooltip", () => {
  describe("열림 / 닫힘", () => {
    it("기본은 렌더하지 않는다", () => {
      renderTooltip();
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("hover 하면 열린다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());

      expect(await screen.findByRole("tooltip")).toHaveTextContent(
        "재고를 즉시 동기화합니다",
      );
    });

    it("hover 를 풀면 닫힌다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());
      await screen.findByRole("tooltip");

      await user.unhover(getTrigger());

      await waitFor(() =>
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
      );
    });

    it("키보드 포커스로도 열린다 (마우스가 없는 사용자 대응)", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.tab();
      expect(getTrigger()).toHaveFocus();

      expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    });

    it("포커스가 빠지면 닫힌다", async () => {
      const user = userEvent.setup();
      render(
        <>
          <Tooltip content="재고를 즉시 동기화합니다">
            <Button>동기화</Button>
          </Tooltip>
          <button type="button">다음</button>
        </>,
      );

      await user.tab();
      await screen.findByRole("tooltip");

      await user.tab();

      await waitFor(() =>
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
      );
    });

    it("Escape 를 누르면 닫힌다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());
      await screen.findByRole("tooltip");

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
      );
    });

    it("포털로 document.body 에 렌더된다", async () => {
      const user = userEvent.setup();
      const { container } = renderTooltip();

      await user.hover(getTrigger());

      const tooltip = await screen.findByRole("tooltip");
      expect(container).not.toContainElement(tooltip);
      expect(document.body).toContainElement(tooltip);
    });

    it("제어형 — open prop 을 그대로 따른다", async () => {
      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <>
            <button type="button" onClick={() => setOpen(true)}>
              열기
            </button>
            <Tooltip content="설명" open={open} onOpenChange={setOpen}>
              <Button>동기화</Button>
            </Tooltip>
          </>
        );
      }

      const user = userEvent.setup();
      render(<Harness />);

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "열기" }));

      expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    });
  });

  describe("접근성 속성", () => {
    it("패널은 role=tooltip 이다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());

      expect(await screen.findByRole("tooltip")).toBeInTheDocument();
    });

    it("트리거의 aria-describedby 가 툴팁 id 를 가리킨다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());

      const tooltip = await screen.findByRole("tooltip");
      expect(getTrigger()).toHaveAttribute("aria-describedby", tooltip.id);
    });

    it("닫혀 있으면 aria-describedby 가 없다 (설명은 열렸을 때만)", () => {
      renderTooltip();
      expect(getTrigger()).not.toHaveAttribute("aria-describedby");
    });

    it("트리거의 이름은 툴팁이 아니라 버튼 라벨이 유지한다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());
      await screen.findByRole("tooltip");

      expect(getTrigger()).toHaveAccessibleName("동기화");
    });
  });

  describe("변형", () => {
    it("컴팩트 — padding 6/8 · label-small", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());

      const className = (await screen.findByRole("tooltip")).className;
      expect(className).toContain("px-2");
      expect(className).toContain("py-1.5");
      expect(className).toContain("label-small");
    });

    it("title 을 주면 본문형이 된다 — padding 12/16 · gap 8", async () => {
      const user = userEvent.setup();
      renderTooltip({ title: "재고 동기화" });

      await user.hover(getTrigger());

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip.className).toContain("px-4");
      expect(tooltip.className).toContain("py-3");
      expect(tooltip.className).toContain("gap-2");

      expect(tooltip.querySelector('[data-slot="title"]')).toHaveClass(
        "label-medium-bold",
      );
      expect(tooltip.querySelector('[data-slot="content"]')).toHaveClass(
        "body-small",
      );
    });

    it("variant 를 직접 주면 title 유무보다 우선한다", async () => {
      const user = userEvent.setup();
      renderTooltip({ title: "재고 동기화", variant: "compact" });

      await user.hover(getTrigger());

      const className = (await screen.findByRole("tooltip")).className;
      expect(className).toContain("px-2");
      expect(className).not.toContain("px-4");
    });
  });

  describe("닫기 버튼 (DESIGN.md §12)", () => {
    const closableProps = {
      closable: true,
      title: "재고 동기화",
      content: "연결된 판매 채널의 재고를 즉시 맞춥니다.",
    };

    function getPanel() {
      return screen.getByRole("dialog");
    }

    it("기본(closable=false)에는 닫기 버튼이 없다", async () => {
      const user = userEvent.setup();
      renderTooltip({ title: "재고 동기화" });

      await user.hover(getTrigger());
      await screen.findByRole("tooltip");

      expect(
        screen.queryByRole("button", { name: "닫기" }),
      ).not.toBeInTheDocument();
    });

    it("closable이면 hover 로는 열리지 않는다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.hover(getTrigger());

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("closable이면 키보드 포커스만으로도 열리지 않는다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.tab();
      expect(getTrigger()).toHaveFocus();

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("트리거 클릭으로 연다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());

      expect(await screen.findByRole("dialog")).toHaveTextContent(
        "연결된 판매 채널의 재고를 즉시 맞춥니다.",
      );
    });

    it("패널은 role=tooltip 이 아니라 role=dialog 다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
    });

    it("제목이 패널의 접근 가능한 이름이 된다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());

      expect(await screen.findByRole("dialog")).toHaveAccessibleName(
        "재고 동기화",
      );
    });

    it("닫기 버튼에 접근 가능한 이름이 있다 (기본 '닫기')", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();
    });

    it("closeLabel 로 닫기 버튼 이름을 바꿀 수 있다", async () => {
      const user = userEvent.setup();
      renderTooltip({ ...closableProps, closeLabel: "도움말 닫기" });

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      expect(
        screen.getByRole("button", { name: "도움말 닫기" }),
      ).toBeInTheDocument();
    });

    it("닫기 버튼을 누르면 닫힌다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      await user.click(screen.getByRole("button", { name: "닫기" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("닫은 뒤 포커스가 트리거로 돌아온다 (포털이라 놓치면 문서 처음으로 튄다)", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      await user.click(screen.getByRole("button", { name: "닫기" }));

      await waitFor(() => expect(getTrigger()).toHaveFocus());
    });

    it("Escape 로도 닫힌다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("제어형에서는 onOpenChange(false) 만 알리고 직접 닫지 않는다", async () => {
      const onOpenChange = vi.fn();
      const user = userEvent.setup();
      renderTooltip({ ...closableProps, open: true, onOpenChange });

      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "닫기" }));

      expect(onOpenChange).toHaveBeenCalledWith(false);
      // open prop 이 그대로면 열린 채로 남는다
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("title 없이 closable 만 줘도 본문형으로 올라간다", async () => {
      const user = userEvent.setup();
      renderTooltip({ closable: true });

      await user.click(getTrigger());

      const panel = await screen.findByRole("dialog");
      expect(panel.querySelector('[data-slot="content"]')).toHaveClass(
        "body-small",
      );
      // 제목이 없으면 본문이 dialog 의 이름을 맡는다 (이름 없는 dialog 방지)
      expect(panel).toHaveAccessibleName("재고를 즉시 동기화합니다");
    });

    it("variant='compact' 를 명시하면 closable 은 무시된다 (hover 툴팁 그대로)", async () => {
      const user = userEvent.setup();
      renderTooltip({ ...closableProps, variant: "compact" });

      await user.hover(getTrigger());

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip.className).toContain("px-2");
      expect(
        screen.queryByRole("button", { name: "닫기" }),
      ).not.toBeInTheDocument();
    });

    it("닫기 버튼은 absolute top/right 8 에 놓인다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());
      await screen.findByRole("dialog");

      const className = screen.getByRole("button", { name: "닫기" }).className;
      expect(className).toContain("absolute");
      expect(className).toContain("top-2");
      expect(className).toContain("right-2");
    });

    it("본문이 버튼과 겹치지 않게 우측 패딩만 36(pr-9)으로 넓힌다", async () => {
      const user = userEvent.setup();
      renderTooltip(closableProps);

      await user.click(getTrigger());

      const className = getPanel().className;
      expect(className).toContain("pl-4");
      expect(className).toContain("pr-9");
      expect(className).toContain("py-3");
      expect(className).toContain("gap-2");
      // px-4 와 pr-9 를 함께 내보내면 padding-right 가 두 번 방출된다
      expect(className).not.toContain("px-4");
    });
  });

  describe("화살표", () => {
    it("기본으로 화살표를 그리고 fill 은 surface 다", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());
      const tooltip = await screen.findByRole("tooltip");

      const arrow = tooltip.querySelector('[data-slot="arrow"]');
      expect(arrow).toBeInTheDocument();
      expect(arrow).toHaveClass("fill-surface");
    });

    it("showArrow=false 면 그리지 않는다", async () => {
      const user = userEvent.setup();
      renderTooltip({ showArrow: false });

      await user.hover(getTrigger());
      const tooltip = await screen.findByRole("tooltip");

      expect(tooltip.querySelector('[data-slot="arrow"]')).toBeNull();
    });
  });

  describe("스타일", () => {
    it("max-w-64 · surface · radius medium · shadow-layer · z-toast", async () => {
      const user = userEvent.setup();
      renderTooltip();

      await user.hover(getTrigger());

      const className = (await screen.findByRole("tooltip")).className;
      expect(className).toContain("max-w-64");
      expect(className).toContain("bg-surface");
      expect(className).toContain("rounded-medium");
      expect(className).toContain("shadow-layer");
      expect(className).toContain("z-(--z-toast)");
    });

    it("전달한 className 이 마지막에 붙어 오버라이드한다", async () => {
      const user = userEvent.setup();
      renderTooltip({ className: "custom-class" });

      await user.hover(getTrigger());

      expect((await screen.findByRole("tooltip")).className).toMatch(
        /custom-class$/,
      );
    });
  });
});
