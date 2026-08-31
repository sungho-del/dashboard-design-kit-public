import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SideSheet } from "./SideSheet";

/** 오버레이는 장식용이라 role 이 없다. data-slot 으로 찾는다 */
function getOverlay() {
  return document.querySelector('[data-slot="overlay"]') as HTMLElement;
}

function getSlot(name: string) {
  return document.querySelector(`[data-slot="${name}"]`) as HTMLElement | null;
}

/** 포커스 가능한 요소 3개(닫기 X · 인풋 · 확인)를 갖는 표준 사이드시트 */
function renderSideSheet(props: Partial<Parameters<typeof SideSheet>[0]> = {}) {
  const onClose = vi.fn();

  const result = render(
    <SideSheet open onClose={onClose} {...props}>
      <SideSheet.Header title="주문 상세" />
      <SideSheet.Body>
        <input aria-label="메모" />
      </SideSheet.Body>
      <SideSheet.Footer>
        <button type="button">확인</button>
      </SideSheet.Footer>
    </SideSheet>,
  );

  return { ...result, onClose };
}

/** 트리거로 열고 닫는 제어형 사용 예 — 포커스 복원·언마운트 지연 검증용 */
function SideSheetHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        주문 상세 보기
      </button>
      <SideSheet open={open} onClose={() => setOpen(false)}>
        <SideSheet.Header title="주문 상세" />
        <SideSheet.Body>
          <input aria-label="메모" />
        </SideSheet.Body>
        <SideSheet.Footer>
          <button type="button">확인</button>
        </SideSheet.Footer>
      </SideSheet>
    </>
  );
}

describe("SideSheet", () => {
  describe("열림 / 닫힘", () => {
    it("open=false면 아무것도 렌더하지 않는다", () => {
      render(
        <SideSheet open={false} onClose={vi.fn()}>
          <SideSheet.Header title="주문 상세" />
        </SideSheet>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("open=true면 dialog를 document.body에 포털로 렌더한다", () => {
      const { container } = renderSideSheet();

      const dialog = screen.getByRole("dialog");
      expect(container).not.toContainElement(dialog);
      expect(document.body).toContainElement(dialog);
    });

    it("닫으면 슬라이드 아웃이 끝난 뒤 DOM에서 제거된다", async () => {
      const user = userEvent.setup();
      render(<SideSheetHarness />);

      await user.click(screen.getByRole("button", { name: "주문 상세 보기" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.keyboard("{Escape}");

      // 닫기 직후에는 아직 남아 있고(애니메이션 중), 잠시 뒤 사라진다
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("접근성 속성", () => {
    it("role=dialog · aria-modal=true를 노출한다", () => {
      renderSideSheet();
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("aria-labelledby를 제목 요소의 id에 연결한다", () => {
      renderSideSheet();

      const dialog = screen.getByRole("dialog");
      const title = screen.getByRole("heading", { name: "주문 상세" });

      expect(dialog).toHaveAttribute("aria-labelledby", title.id);
      expect(dialog).toHaveAccessibleName("주문 상세");
    });
  });

  describe("닫기 트리거", () => {
    it("Escape를 누르면 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet();

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closeOnEscape=false면 Escape를 무시한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet({ closeOnEscape: false });

      await user.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
    });

    it("오버레이를 클릭하면 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet();

      await user.click(getOverlay());

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("패널 안을 클릭해도 닫히지 않는다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet();

      await user.click(screen.getByLabelText("메모"));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("closeOnOverlayClick=false면 오버레이 클릭을 무시한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet({ closeOnOverlayClick: false });

      await user.click(getOverlay());

      expect(onClose).not.toHaveBeenCalled();
    });

    it("헤더의 닫기 버튼이 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderSideSheet();

      await user.click(screen.getByRole("button", { name: "닫기" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("포커스", () => {
    it("열리면 다이얼로그 컨테이너로 포커스가 들어간다", () => {
      renderSideSheet();
      expect(screen.getByRole("dialog")).toHaveFocus();
    });

    it("Tab이 다이얼로그 안에서만 순환한다", async () => {
      const user = userEvent.setup();
      renderSideSheet();

      const close = screen.getByRole("button", { name: "닫기" });
      const memo = screen.getByLabelText("메모");
      const confirm = screen.getByRole("button", { name: "확인" });

      await user.tab();
      expect(close).toHaveFocus();
      await user.tab();
      expect(memo).toHaveFocus();
      await user.tab();
      expect(confirm).toHaveFocus();

      await user.tab();
      expect(close).toHaveFocus();

      await user.tab({ shift: true });
      expect(confirm).toHaveFocus();
    });

    it("닫히면 열기 직전 포커스를 갖고 있던 트리거로 되돌린다", async () => {
      const user = userEvent.setup();
      render(<SideSheetHarness />);

      const trigger = screen.getByRole("button", { name: "주문 상세 보기" });
      await user.click(trigger);
      expect(screen.getByRole("dialog")).toHaveFocus();

      await user.keyboard("{Escape}");

      // 슬라이드 아웃이 끝나기를 기다리지 않고, 닫기를 누른 즉시 복원된다
      expect(trigger).toHaveFocus();
    });
  });

  describe("배경 스크롤 잠금", () => {
    it("열려 있는 동안 body의 overflow를 hidden으로 만들고 닫히면 되돌린다", () => {
      const { unmount } = renderSideSheet();

      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("슬라이드 애니메이션", () => {
    it("translate-x-full로 시작해 다음 프레임에 translate-x-0으로 들어온다", async () => {
      renderSideSheet();

      expect(getSlot("positioner")?.className).toContain("translate-x-full");

      await waitFor(() =>
        expect(getSlot("positioner")?.className).toContain("translate-x-0"),
      );
    });

    it("이동은 transform 0.2s linear다", () => {
      renderSideSheet();

      const className = getSlot("positioner")?.className ?? "";
      expect(className).toContain("transition-transform");
      expect(className).toContain("duration-200");
      expect(className).toContain("ease-linear");
    });
  });

  describe("스타일", () => {
    it("패널은 width 380 · radius large · shadow-page-side · surface", () => {
      renderSideSheet();

      const className = screen.getByRole("dialog").className;
      expect(className).toContain("w-(--size-sidesheet)");
      expect(className).toContain("max-h-full");
      expect(className).toContain("rounded-large");
      expect(className).toContain("shadow-page-side");
      expect(className).toContain("bg-surface");
    });

    it("오버레이는 overlay · z-sidesheet 토큰을 쓴다", () => {
      renderSideSheet();

      const className = getOverlay().className;
      expect(className).toContain("bg-overlay");
      expect(className).toContain("z-(--z-sidesheet)");
    });

    it("배치는 우측 하단 고정 + 여백 12", () => {
      renderSideSheet();

      const className = getSlot("positioner")?.className ?? "";
      expect(className).toContain("right-0");
      expect(className).toContain("bottom-0");
      expect(className).toContain("p-3");
    });

    it("헤더 하단 border는 divided일 때만 붙는다", () => {
      const { unmount } = renderSideSheet();
      expect(getSlot("header")?.className).not.toContain("border-b");
      unmount();

      render(
        <SideSheet open onClose={vi.fn()}>
          <SideSheet.Header title="주문 상세" divided />
        </SideSheet>,
      );
      expect(getSlot("header")?.className).toContain("border-b");
      expect(getSlot("header")?.className).toContain("border-divide");
    });

    it("바디는 px 24 · pt 16 · pb 0 · overflow-y-auto", () => {
      renderSideSheet();

      const className = getSlot("body")?.className ?? "";
      expect(className).toContain("px-6");
      expect(className).toContain("pt-4");
      expect(className).toContain("pb-0");
      expect(className).toContain("overflow-y-auto");
    });

    it("푸터는 세로 flex · gap 20 · padding 16 24", () => {
      renderSideSheet();

      const className = getSlot("footer")?.className ?? "";
      expect(className).toContain("flex-col");
      expect(className).toContain("gap-5");
      expect(className).toContain("px-6");
      expect(className).toContain("py-4");
    });

    it("전달한 className이 마지막에 붙어 패널을 오버라이드한다", () => {
      renderSideSheet({ className: "custom-class" });
      expect(screen.getByRole("dialog").className).toMatch(/custom-class$/);
    });
  });
});
