import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Tabs, type TabItem, type TabsProps } from "./Tabs";

const ITEMS: TabItem[] = [
  { value: "all", label: "전체" },
  { value: "orders", label: "주문" },
  { value: "claims", label: "취소·반품" },
  { value: "settlement", label: "정산" },
];

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  args: {
    items: ITEMS,
    onValueChange: fn(),
    "aria-label": "주문 관리 탭",
  },
  argTypes: {
    value: { control: "text" },
    defaultValue: { control: "text" },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 비제어 — 첫 번째 활성 탭이 자동 선택된다 */
export const Default: Story = {};

/** defaultValue로 초기 선택을 지정한 비제어 모드 */
export const DefaultValue: Story = {
  args: { defaultValue: "claims" },
};

/** disabled 탭은 클릭·화살표 이동 모두에서 건너뛴다 */
export const WithDisabled: Story = {
  args: {
    items: [
      { value: "all", label: "전체" },
      { value: "orders", label: "주문" },
      { value: "claims", label: "취소·반품", disabled: true },
      { value: "settlement", label: "정산" },
    ],
  },
};

function ControlledTabs(args: TabsProps) {
  const [value, setValue] = useState("orders");
  return (
    <div className="flex flex-col gap-3">
      <Tabs
        {...args}
        value={value}
        onValueChange={(next) => {
          setValue(next);
          args.onValueChange?.(next);
        }}
      />
      <p className="text-text-sub label-medium">선택된 값: {value}</p>
    </div>
  );
}

/** 제어 모드 — 선택 상태를 사용처가 소유한다 */
export const Controlled: Story = {
  render: (args) => <ControlledTabs {...args} />,
};

/** 탭 ↔ 패널 연결. `controls`로 패널 id를, 패널은 탭 id를 되짚는다 */
export const WithPanel: Story = {
  args: {
    items: [
      { value: "all", label: "전체", id: "tab-all", controls: "panel-all" },
      {
        value: "orders",
        label: "주문",
        id: "tab-orders",
        controls: "panel-orders",
      },
    ],
  },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Tabs {...args} />
      <div
        id="panel-all"
        role="tabpanel"
        aria-labelledby="tab-all"
        className="text-text-sub body-medium"
      >
        전체 목록 영역
      </div>
    </div>
  ),
};

/**
 * 탭 전환 동작 검증 — 클릭으로 선택이 옮겨가고,
 * 좌우 화살표로도 이동한다(자동 활성화).
 */
export const Interaction: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const orders = canvas.getByRole("tab", { name: "주문" });
    await userEvent.click(orders);
    await expect(orders).toHaveAttribute("aria-selected", "true");
    await expect(args.onValueChange).toHaveBeenCalledWith("orders");

    await userEvent.keyboard("{ArrowRight}");
    await expect(
      canvas.getByRole("tab", { name: "취소·반품" }),
    ).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowLeft}");
    await expect(orders).toHaveAttribute("aria-selected", "true");
  },
};
