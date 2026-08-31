import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, within } from "@storybook/test";
import { Button } from "../Button";
import { Toast, type ToastSize, type ToastTone } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast } from "./useToast";

const meta = {
  title: "Components/Toast",
  component: Toast,
  tags: ["autodocs"],
  args: {
    message: "저장되었습니다",
    tone: "default",
    size: "medium",
    position: "top",
    open: true,
  },
  argTypes: {
    message: { control: "text" },
    tone: { control: "inline-radio", options: ["default", "critical"] },
    size: { control: "inline-radio", options: ["large", "medium", "small"] },
    position: { control: "inline-radio", options: ["top", "bottom"] },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 — medium(높이 40 · 좌우 16 · body-medium) · tone default.
 *
 * Toast 자체는 위치를 갖지 않는 프레젠테이션 컴포넌트라 이렇게 인라인으로 렌더된다.
 * 실제 화면 고정·큐 관리는 ToastProvider가 맡는다.
 */
export const Default: Story = {};

/** tone default — `surface-toast`(반투명 딤) 배경 */
export const ToneDefault: Story = {
  args: { tone: "default", message: "변경사항이 저장되었습니다" },
};

/** tone critical — `surface-toast-critical`. `aria-live`가 assertive로 올라간다 */
export const ToneCritical: Story = {
  args: { tone: "critical", message: "삭제에 실패했습니다" },
};

/** size large — 높이 48 · 좌우 20 · body-large(16/24) */
export const SizeLarge: Story = {
  args: { size: "large", message: "큰 토스트입니다" },
};

/** size medium — 높이 40 · 좌우 16 · body-medium(14/20) */
export const SizeMedium: Story = {
  args: { size: "medium", message: "기본 토스트입니다" },
};

/** size small — 높이 32 · 좌우 12 · body-small(12/16) */
export const SizeSmall: Story = {
  args: { size: "small", message: "작은 토스트입니다" },
};

/** 크기 3단 비교. min-width 180이라 짧은 문구도 폭이 무너지지 않는다 */
export const AllSizes: Story = {
  render: (args) => (
    <div className="flex flex-col items-center gap-3">
      <Toast {...args} size="large" message="large — 높이 48" />
      <Toast {...args} size="medium" message="medium — 높이 40" />
      <Toast {...args} size="small" message="small — 높이 32" />
    </div>
  ),
};

/** tone 2종 비교 */
export const AllTones: Story = {
  render: (args) => (
    <div className="flex flex-col items-center gap-3">
      <Toast {...args} tone="default" message="default — 일반 알림" />
      <Toast {...args} tone="critical" message="critical — 오류 알림" />
    </div>
  ),
};

/** 긴 문구 — max-width 480에서 잘린다 */
export const LongMessage: Story = {
  args: {
    message:
      "요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  },
};

/** 퇴장 상태(open=false) — 방향에 맞춰 16px 밀리며 투명해진다 */
export const Closing: Story = {
  args: { open: false, message: "사라지는 중" },
};

/** Provider를 통해 토스트를 띄우는 버튼 */
function ToastTrigger({
  label,
  message,
  tone,
  size,
  duration,
}: {
  label: string;
  message: string;
  tone?: ToastTone;
  size?: ToastSize;
  duration?: number;
}) {
  const { toast } = useToast();

  return (
    <Button onClick={() => toast({ message, tone, size, duration })}>
      {label}
    </Button>
  );
}

/** 상단 위치 — 화면 위에서 16px 아래로 내려오며 나타난다 */
export const PositionTop: Story = {
  render: () => (
    <ToastProvider position="top" duration={4000}>
      <div className="flex justify-center p-6">
        <ToastTrigger label="상단 토스트 띄우기" message="상단에서 등장" />
      </div>
    </ToastProvider>
  ),
};

/** 하단 위치 — 화면 아래에서 16px 위로 올라오며 나타난다 */
export const PositionBottom: Story = {
  render: () => (
    <ToastProvider position="bottom" duration={4000}>
      <div className="flex justify-center p-6">
        <ToastTrigger label="하단 토스트 띄우기" message="하단에서 등장" />
      </div>
    </ToastProvider>
  ),
};

/** 여러 개를 연속으로 띄우면 세로로 쌓인다 */
export const Stacked: Story = {
  render: () => (
    <ToastProvider position="top" duration={6000}>
      <div className="flex flex-wrap justify-center gap-3 p-6">
        <ToastTrigger label="첫 번째" message="첫 번째 알림" />
        <ToastTrigger label="두 번째" message="두 번째 알림" />
        <ToastTrigger
          label="오류"
          message="세 번째는 오류 알림"
          tone="critical"
        />
      </div>
    </ToastProvider>
  ),
};

/**
 * 인터랙션 검증 — 버튼을 누르면 토스트가 body 포털에 나타난다.
 *
 * 포털은 캔버스 밖(document.body)에 렌더되므로 `screen`으로 찾는다.
 */
export const TriggerByClick: Story = {
  render: () => (
    <ToastProvider duration={10000}>
      <div className="flex justify-center p-6">
        <ToastTrigger label="저장하기" message="저장되었습니다" />
      </div>
    </ToastProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "저장하기" }));

    const toast = await screen.findByRole("status");
    await expect(toast).toHaveTextContent("저장되었습니다");
    await expect(toast).toHaveAttribute("aria-live", "polite");
  },
};
