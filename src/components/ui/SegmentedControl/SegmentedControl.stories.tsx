import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import {
  SegmentedControl,
  type SegmentedControlItem,
  type SegmentedControlProps,
} from "./SegmentedControl";

const ITEMS: SegmentedControlItem[] = [
  { value: "day", label: "일간" },
  { value: "week", label: "주간" },
  { value: "month", label: "월간" },
];

const meta = {
  title: "Components/SegmentedControl",
  component: SegmentedControl,
  tags: ["autodocs"],
  args: {
    items: ITEMS,
    onValueChange: fn(),
    "aria-label": "기간 선택",
  },
  argTypes: {
    variant: { control: "select", options: ["solid", "outline", "raised"] },
    fill: { control: "select", options: ["filled", "plain"] },
    size: { control: "select", options: ["small", "medium", "large"] },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — solid 인디케이터 + filled 트랙 */
export const Solid: Story = { args: { variant: "solid" } };

/** 테두리만 그리는 인디케이터 (선택 글자색은 기본 text) */
export const Outline: Story = { args: { variant: "outline" } };

/** 흰 thumb + shadow-raised-button */
export const Raised: Story = { args: { variant: "raised" } };

/** 트랙 배경 있음(filled) / 없음(plain) */
export const Fills: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      <SegmentedControl {...args} fill="filled" />
      <SegmentedControl {...args} fill="plain" variant="raised" />
    </div>
  ),
};

/** 높이 32 / 36 / 44 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      <SegmentedControl {...args} size="small" />
      <SegmentedControl {...args} size="medium" />
      <SegmentedControl {...args} size="large" />
    </div>
  ),
};

/** 3종 variant 비교 */
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      <SegmentedControl {...args} variant="solid" />
      <SegmentedControl {...args} variant="outline" />
      <SegmentedControl {...args} variant="raised" />
    </div>
  ),
};

/** disabled 항목은 클릭·화살표 이동 모두에서 건너뛴다 */
export const WithDisabled: Story = {
  args: {
    items: [
      { value: "day", label: "일간" },
      { value: "week", label: "주간", disabled: true },
      { value: "month", label: "월간" },
    ],
  },
};

/** 컨테이너 가로를 채우고 항목을 균등 분배한다 */
export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div className="w-100">
      <SegmentedControl {...args} />
    </div>
  ),
};

function ControlledSegmentedControl(args: SegmentedControlProps) {
  const [value, setValue] = useState("week");
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
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
  render: (args) => <ControlledSegmentedControl {...args} />,
};

/** 전환 동작 검증 — 클릭과 화살표 키 모두로 선택이 옮겨간다 */
export const Interaction: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const week = canvas.getByRole("radio", { name: "주간" });
    await userEvent.click(week);
    await expect(week).toHaveAttribute("aria-checked", "true");
    await expect(args.onValueChange).toHaveBeenCalledWith("week");

    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "월간" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  },
};
