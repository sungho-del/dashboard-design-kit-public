import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Switch } from "./Switch";

const meta = {
  title: "Components/Switch",
  component: Switch,
  tags: ["autodocs"],
  args: { onChange: fn() },
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본(off) — 트랙 `action-toggle` · thumb `surface` + `shadow-raised-button` */
export const Default: Story = {
  args: { label: "이메일 알림" },
};

/** on — 트랙 `action-primary` */
export const Checked: Story = {
  args: { label: "이메일 알림", defaultChecked: true },
};

/** 라벨 없이 컨트롤만. 테이블 행 안의 on/off 컬럼 등에서 쓴다 */
export const WithoutLabel: Story = {
  args: { "aria-label": "이메일 알림" },
};

/** 보조 설명 — 라벨 `label-medium`, 설명 `body-small` + `text-sub` */
export const WithDescription: Story = {
  args: {
    label: "야간 알림 허용",
    description: "오후 9시~오전 8시에도 푸시 알림을 받습니다.",
    defaultChecked: true,
  },
};

/**
 * disabled — opacity가 아니라 토큰으로 표현한다.
 * 꺼짐 `action-primary-tonal-disabled` / 켜짐 `action-primary-tonal`,
 * thumb는 그림자를 걷어 "떠 있지 않은" 상태로 만든다.
 */
export const Disabled: Story = {
  args: { label: "변경할 수 없음", disabled: true },
};

export const DisabledChecked: Story = {
  args: { label: "항상 켜짐", disabled: true, defaultChecked: true },
};

/** error — `aria-invalid` + 경계선 `border-critical` */
export const Invalid: Story = {
  args: {
    label: "필수 동의 항목입니다",
    description: "켜야 다음 단계로 진행할 수 있습니다.",
    invalid: true,
  },
};

/** small(트랙 20) — 밀도가 높은 목록·테이블 행용 */
export const Small: Story = {
  args: { label: "20px 스위치", size: "small" },
};

/** 크기 비교 — medium 24 / small 20 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Switch {...args} label="medium (24)" size="medium" defaultChecked />
      <Switch {...args} label="small (20)" size="small" defaultChecked />
    </div>
  ),
};

/** 상태 한눈에 비교 */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Switch {...args} label="꺼짐" />
      <Switch {...args} label="켜짐" defaultChecked />
      <Switch {...args} label="에러" invalid />
      <Switch {...args} label="비활성 (꺼짐)" disabled />
      <Switch {...args} label="비활성 (켜짐)" disabled defaultChecked />
    </div>
  ),
};

const NOTIFICATIONS = [
  {
    id: "order",
    label: "주문 알림",
    description: "새 주문이 들어오면 즉시 알려드립니다.",
  },
  {
    id: "stock",
    label: "재고 부족 알림",
    description: "재고가 5개 이하로 떨어지면 알려드립니다.",
  },
  {
    id: "review",
    label: "리뷰 알림",
    description: "새 리뷰가 등록되면 알려드립니다.",
  },
];

function NotificationSettings() {
  const [enabled, setEnabled] = useState<string[]>(["order"]);

  return (
    <div className="flex w-125 flex-col gap-4 rounded-medium bg-surface p-6">
      <h3 className="heading-medium-bold text-text">알림 수신 설정</h3>
      <div className="flex flex-col gap-4">
        {NOTIFICATIONS.map((item) => (
          <Switch
            key={item.id}
            label={item.label}
            description={item.description}
            checked={enabled.includes(item.id)}
            onChange={(event) =>
              setEnabled((prev) =>
                event.target.checked
                  ? [...prev, item.id]
                  : prev.filter((id) => id !== item.id),
              )
            }
            className="w-full flex-row-reverse justify-between"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 실제 맥락 — 알림 수신 설정.
 *
 * 설정 목록에서는 컨트롤을 오른쪽 끝에 두는 배치가 흔하다.
 * `className`이 바깥 `<label>`에 붙으므로 `flex-row-reverse`로 순서만 뒤집으면 된다.
 */
export const NotificationList: Story = {
  render: () => <NotificationSettings />,
};

/** 토글 동작 검증 — 라벨 클릭·Space 모두로 켜고 끌 수 있다 */
export const Toggle: Story = {
  args: { label: "이메일 알림" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const control = canvas.getByRole("switch", { name: "이메일 알림" });

    await expect(control).not.toBeChecked();

    await userEvent.click(canvas.getByText("이메일 알림"));
    await expect(control).toBeChecked();
    await expect(args.onChange).toHaveBeenCalled();

    control.focus();
    await userEvent.keyboard("[Space]");
    await expect(control).not.toBeChecked();
  },
};
