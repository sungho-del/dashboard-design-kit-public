import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from "@storybook/test";
import { Trash2 } from "lucide-react";
import { Button } from "../Button";
import { Input } from "../Input";
import { ConfirmModal, Modal, type ModalSize } from "./Modal";

/**
 * 모달은 열림 상태를 밖에서 들고 있어야 하는 제어형 컴포넌트라,
 * 스토리마다 트리거 버튼 + useState 를 갖는 데모 래퍼로 감싼다.
 */
interface ModalDemoProps {
  size?: ModalSize;
  triggerLabel?: string;
  title: string;
  description?: string;
  showClose?: boolean;
  children: ReactNode;
}

function ModalDemo({
  size,
  triggerLabel = "모달 열기",
  title,
  description,
  showClose,
  children,
}: ModalDemoProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>

      <Modal open={open} onClose={close} size={size}>
        <Modal.Header
          title={title}
          description={description}
          showClose={showClose}
        />
        <Modal.Body>{children}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="large" onClick={close}>
            취소
          </Button>
          <Button size="large" onClick={close}>
            저장
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

/** 배송지 수정 폼 — 모달 바디의 기본 리듬(블록 사이 gap 20)을 보여준다 */
function ShippingForm() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="modal-receiver" className="text-text label-medium-bold">
          받는 분
        </label>
        <Input id="modal-receiver" defaultValue="홍길동" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="modal-address" className="text-text label-medium-bold">
          주소
        </label>
        <Input id="modal-address" defaultValue="서울시 강남구 테헤란로 1" />
      </div>
    </>
  );
}

/** 실제 맥락 — 상품 목록에서 행을 삭제하기 전 확인 */
function DeleteProductDemo() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setOpen(false);
    }, 600);
  };

  return (
    <>
      <Button variant="criticalTonal" onClick={() => setOpen(true)}>
        상품 삭제
      </Button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={loading}
        title="상품을 삭제할까요?"
        description="'오버핏 코튼 셔츠' 1개가 삭제되며, 삭제한 상품은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        icon={
          <Trash2
            size={72}
            strokeWidth={1.2}
            className="text-icon-critical"
            aria-hidden
          />
        }
      />
    </>
  );
}

/** 파괴적이지 않은 결정 확인 */
function PublishDemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>상품 공개</Button>
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        tone="primary"
        title="상품을 공개할까요?"
        description="공개하면 즉시 스토어에 노출됩니다."
        confirmLabel="공개"
      />
    </>
  );
}

const meta = {
  title: "Components/Modal",
  component: Modal,
  tags: ["autodocs"],
  args: { open: false, onClose: fn() },
  argTypes: {
    children: { control: false },
    labelledBy: { control: false },
    describedBy: { control: false },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 헤더 / 바디 / 푸터 3단 조합. radius 16 · shadow-modal · 딤은 overlay-sub(50%) */
export const Default: Story = {
  render: () => (
    <ModalDemo title="배송지 수정">
      <ShippingForm />
    </ModalDemo>
  ),
};

/** 제목 아래 보조 설명 — 문장이므로 label 이 아닌 `body-medium` 을 쓴다 */
export const WithDescription: Story = {
  render: () => (
    <ModalDemo
      title="배송지 수정"
      description="주문이 출고되기 전까지만 수정할 수 있습니다."
    >
      <ShippingForm />
    </ModalDemo>
  ),
};

/** 폭 3단 — small 400 / medium 480 / large 640 */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-2">
      <ModalDemo size="small" triggerLabel="small (400)" title="small">
        <p className="text-text body-medium">max-width 400</p>
      </ModalDemo>
      <ModalDemo size="medium" triggerLabel="medium (480)" title="medium">
        <p className="text-text body-medium">max-width 480</p>
      </ModalDemo>
      <ModalDemo size="large" triggerLabel="large (640)" title="large">
        <p className="text-text body-medium">max-width 640</p>
      </ModalDemo>
    </div>
  ),
};

/** 긴 콘텐츠 — 바디만 스크롤되고 헤더·푸터는 고정된다 */
export const ScrollableBody: Story = {
  render: () => (
    <ModalDemo title="이용약관 동의" triggerLabel="약관 보기">
      {Array.from({ length: 12 }, (_, index) => (
        <p key={index} className="text-text-sub body-medium">
          제{index + 1}조 — 본 약관은 서비스 이용에 관한 회사와 회원의 권리·의무
          및 책임사항을 규정함을 목적으로 합니다.
        </p>
      ))}
    </ModalDemo>
  ),
};

/** 닫기(X) 없이 — 반드시 버튼으로 결정해야 하는 흐름에 쓴다 */
export const WithoutCloseButton: Story = {
  render: () => (
    <ModalDemo title="결제를 진행할까요?" showClose={false}>
      <p className="text-text body-medium">
        결제가 시작되면 중간에 취소할 수 없습니다.
      </p>
    </ModalDemo>
  ),
};

/**
 * **실제 맥락 — 상품 삭제 확인.**
 * ConfirmModal: 세로 center · gap 16 · 아이콘 72 × 72 · 파괴적 액션은 critical.
 */
export const DeleteProductConfirm: Story = {
  render: () => <DeleteProductDemo />,
};

/** 파괴적이지 않은 결정 — tone="primary" */
export const ConfirmPrimary: Story = {
  render: () => <PublishDemo />,
};

/**
 * 동작 검증 — 트리거로 열고 닫기(X)로 닫는다.
 * 모달은 Portal 로 `document.body` 에 렌더되므로 canvas 가 아닌 `screen` 으로 찾는다.
 */
export const OpenAndClose: Story = {
  render: () => (
    <ModalDemo title="배송지 수정">
      <ShippingForm />
    </ModalDemo>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "모달 열기" }));

    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAccessibleName("배송지 수정");

    await userEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  },
};
