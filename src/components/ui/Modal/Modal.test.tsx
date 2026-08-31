import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmModal, Modal } from "./Modal";

/** 딤은 장식용이라 role 이 없다. data-slot 으로 찾는다 */
function getOverlay() {
  return document.querySelector('[data-slot="overlay"]') as HTMLElement;
}

/** 포커스 가능한 요소 3개(닫기 X · 인풋 · 저장)를 갖는 표준 모달 */
function renderModal(props: Partial<Parameters<typeof Modal>[0]> = {}) {
  const onClose = vi.fn();

  const result = render(
    <Modal open onClose={onClose} {...props}>
      <Modal.Header title="배송지 수정" />
      <Modal.Body>
        <input aria-label="받는 분" />
      </Modal.Body>
      <Modal.Footer>
        <button type="button">저장</button>
      </Modal.Footer>
    </Modal>,
  );

  return { ...result, onClose };
}

/** 트리거로 열고 닫는 제어형 사용 예 — 포커스 복원 검증용 */
function ModalHarness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        모달 열기
      </button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Modal.Header title="배송지 수정" />
        <Modal.Body>
          <input aria-label="받는 분" />
        </Modal.Body>
        <Modal.Footer>
          <button type="button">저장</button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  describe("열림 / 닫힘", () => {
    it("open=false면 아무것도 렌더하지 않는다", () => {
      render(
        <Modal open={false} onClose={vi.fn()}>
          <Modal.Header title="배송지 수정" />
        </Modal>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("open=true면 dialog를 document.body에 포털로 렌더한다", () => {
      const { container } = renderModal();

      const dialog = screen.getByRole("dialog");
      expect(dialog).toBeInTheDocument();
      // 렌더 컨테이너가 아니라 body 직속에 붙는다
      expect(container).not.toContainElement(dialog);
      expect(document.body).toContainElement(dialog);
    });
  });

  describe("접근성 속성", () => {
    it("role=dialog · aria-modal=true를 노출한다", () => {
      renderModal();
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("aria-labelledby를 제목 요소의 id에 연결한다", () => {
      renderModal();

      const dialog = screen.getByRole("dialog");
      const title = screen.getByRole("heading", { name: "배송지 수정" });

      expect(dialog).toHaveAttribute("aria-labelledby", title.id);
      expect(dialog).toHaveAccessibleName("배송지 수정");
    });

    it("labelledBy를 직접 주면 그 값을 우선한다", () => {
      render(
        <>
          <h1 id="external-title">외부 제목</h1>
          <Modal open onClose={vi.fn()} labelledBy="external-title">
            <Modal.Body>본문</Modal.Body>
          </Modal>
        </>,
      );

      expect(screen.getByRole("dialog")).toHaveAccessibleName("외부 제목");
    });
  });

  describe("닫기 트리거", () => {
    it("Escape를 누르면 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.keyboard("{Escape}");

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("closeOnEscape=false면 Escape를 무시한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal({ closeOnEscape: false });

      await user.keyboard("{Escape}");

      expect(onClose).not.toHaveBeenCalled();
    });

    it("딤을 클릭하면 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(getOverlay());

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("패널 안을 클릭해도 닫히지 않는다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(screen.getByLabelText("받는 분"));

      expect(onClose).not.toHaveBeenCalled();
    });

    it("closeOnOverlayClick=false면 딤 클릭을 무시한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal({ closeOnOverlayClick: false });

      await user.click(getOverlay());

      expect(onClose).not.toHaveBeenCalled();
    });

    it("헤더의 닫기 버튼이 onClose를 호출한다", async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await user.click(screen.getByRole("button", { name: "닫기" }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("showClose=false면 닫기 버튼을 렌더하지 않는다", () => {
      render(
        <Modal open onClose={vi.fn()}>
          <Modal.Header title="배송지 수정" showClose={false} />
        </Modal>,
      );

      expect(
        screen.queryByRole("button", { name: "닫기" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("포커스", () => {
    it("열리면 다이얼로그 컨테이너로 포커스가 들어간다", () => {
      renderModal();
      expect(screen.getByRole("dialog")).toHaveFocus();
    });

    it("Tab이 다이얼로그 안에서만 순환한다", async () => {
      const user = userEvent.setup();
      renderModal();

      const close = screen.getByRole("button", { name: "닫기" });
      const input = screen.getByLabelText("받는 분");
      const save = screen.getByRole("button", { name: "저장" });

      await user.tab();
      expect(close).toHaveFocus();
      await user.tab();
      expect(input).toHaveFocus();
      await user.tab();
      expect(save).toHaveFocus();

      // 마지막에서 한 번 더 → 첫 요소로 되돌아온다 (밖으로 나가지 않는다)
      await user.tab();
      expect(close).toHaveFocus();
    });

    it("Shift+Tab이 첫 요소에서 마지막 요소로 되돌아간다", async () => {
      const user = userEvent.setup();
      renderModal();

      const close = screen.getByRole("button", { name: "닫기" });
      const save = screen.getByRole("button", { name: "저장" });

      await user.tab();
      expect(close).toHaveFocus();

      await user.tab({ shift: true });
      expect(save).toHaveFocus();
    });

    it("닫히면 열기 직전 포커스를 갖고 있던 트리거로 되돌린다", async () => {
      const user = userEvent.setup();
      render(<ModalHarness />);

      const trigger = screen.getByRole("button", { name: "모달 열기" });
      await user.click(trigger);
      expect(screen.getByRole("dialog")).toHaveFocus();

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(trigger).toHaveFocus();
    });
  });

  describe("배경 스크롤 잠금", () => {
    it("열려 있는 동안 body의 overflow를 hidden으로 만들고 닫히면 되돌린다", () => {
      const { unmount } = renderModal();

      expect(document.body.style.overflow).toBe("hidden");

      unmount();
      expect(document.body.style.overflow).toBe("");
    });
  });

  describe("스타일", () => {
    it("컨테이너에 radius xlarge · shadow-modal · surface를 적용한다", () => {
      renderModal();

      const className = screen.getByRole("dialog").className;
      expect(className).toContain("rounded-xlarge");
      expect(className).toContain("shadow-modal");
      expect(className).toContain("bg-surface");
    });

    it("딤은 overlay-sub · z-modal 토큰을 쓴다", () => {
      renderModal();

      const className = getOverlay().className;
      expect(className).toContain("bg-overlay-sub");
      expect(className).toContain("z-(--z-modal)");
    });

    it("바디는 gap 20 · 상하 24 · overflow-auto", () => {
      renderModal();

      const className =
        document.querySelector('[data-slot="body"]')?.className ?? "";
      expect(className).toContain("gap-5");
      expect(className).toContain("py-6");
      expect(className).toContain("overflow-auto");
    });

    it("푸터는 우측 정렬이다", () => {
      renderModal();

      const className =
        document.querySelector('[data-slot="footer"]')?.className ?? "";
      expect(className).toContain("justify-end");
    });

    it("전달한 className이 마지막에 붙어 패널을 오버라이드한다", () => {
      renderModal({ className: "custom-class" });
      expect(screen.getByRole("dialog").className).toMatch(/custom-class$/);
    });
  });
});

describe("ConfirmModal", () => {
  function renderConfirm(
    props: Partial<Parameters<typeof ConfirmModal>[0]> = {},
  ) {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    const result = render(
      <ConfirmModal
        open
        onClose={onClose}
        onConfirm={onConfirm}
        title="상품을 삭제할까요?"
        description="삭제한 상품은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        icon={<span data-testid="confirm-icon" />}
        {...props}
      />,
    );

    return { ...result, onClose, onConfirm };
  }

  it("제목·설명·버튼을 렌더하고 제목으로 이름을 만든다", () => {
    renderConfirm();

    expect(screen.getByRole("dialog")).toHaveAccessibleName(
      "상품을 삭제할까요?",
    );
    expect(
      screen.getByText("삭제한 상품은 되돌릴 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();
  });

  it("아이콘을 72 × 72 프레임(size-18)에 넣는다", () => {
    renderConfirm();

    const frame = document.querySelector('[data-slot="icon"]');
    expect(frame).toContainElement(screen.getByTestId("confirm-icon"));
    expect(frame?.className).toContain("size-18");
  });

  it("바디는 세로 center · gap 16", () => {
    renderConfirm();

    const className =
      document.querySelector('[data-slot="body"]')?.className ?? "";
    expect(className).toContain("items-center");
    expect(className).toContain("gap-4");
    // Modal.Body의 gap-5가 섞여 들어오면 안 된다
    expect(className).not.toContain("gap-5");
  });

  it("확인 버튼은 onConfirm, 취소 버튼은 onClose를 호출한다", async () => {
    const user = userEvent.setup();
    const { onClose, onConfirm } = renderConfirm();

    await user.click(screen.getByRole("button", { name: "삭제" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("기본값에서는 딤을 클릭해도 닫히지 않는다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderConfirm();

    await user.click(getOverlay());

    expect(onClose).not.toHaveBeenCalled();
  });

  it("loading이면 확인 버튼이 로딩 상태가 되고 취소는 비활성화된다", () => {
    renderConfirm({ loading: true });

    expect(screen.getByRole("button", { name: /삭제/ })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
  });

  it("Escape로 닫을 수 있다", async () => {
    const user = userEvent.setup();
    const { onClose } = renderConfirm();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
