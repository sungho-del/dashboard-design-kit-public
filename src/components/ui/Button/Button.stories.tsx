import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Plus } from "lucide-react";
import { Button, type ButtonVariant } from "./Button";

const meta = {
  title: "Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: { onClick: fn(), children: "확인" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "primary",
        "primaryTonal",
        "ghost",
        "secondary",
        "critical",
        "criticalTonal",
        "accent",
        "accentTonal",
      ],
    },
    size: {
      control: "select",
      options: ["large", "medium", "small", "xsmall"],
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: ButtonVariant[] = [
  "primary",
  "primaryTonal",
  "ghost",
  "secondary",
  "critical",
  "criticalTonal",
  "accent",
  "accentTonal",
];

export const Primary: Story = { args: { variant: "primary" } };
export const PrimaryTonal: Story = { args: { variant: "primaryTonal" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Critical: Story = {
  args: { variant: "critical", children: "삭제" },
};
export const CriticalTonal: Story = {
  args: { variant: "criticalTonal", children: "삭제" },
};
export const Accent: Story = { args: { variant: "accent" } };
export const AccentTonal: Story = { args: { variant: "accentTonal" } };

/** 8종 variant 한눈에 비교 */
export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

/** 48 / 40 / 32 / 28 — 컨트롤 높이 체계 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-2">
      <Button {...args} size="large">
        large 48
      </Button>
      <Button {...args} size="medium">
        medium 40
      </Button>
      <Button {...args} size="small">
        small 32
      </Button>
      <Button {...args} size="xsmall">
        xsmall 28
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Plus size={16} strokeWidth={1.2} aria-hidden />
        상품 등록
      </>
    ),
  },
};

export const Disabled: Story = { args: { disabled: true } };

/**
 * loading은 disabled와 다르다 — 배경만 pressed로 내려가고
 * 텍스트·아이콘 색은 그대로 유지된다. (DESIGN.md §1-3)
 */
export const Loading: Story = {
  args: { loading: true, children: "저장 중" },
};

export const LoadingVsDisabled: Story = {
  render: (args) => (
    <div className="flex gap-2">
      <Button {...args} loading>
        loading
      </Button>
      <Button {...args} disabled>
        disabled
      </Button>
    </div>
  ),
};

export const FullWidth: Story = {
  args: { fullWidth: true },
  render: (args) => (
    <div className="w-80">
      <Button {...args} />
    </div>
  ),
};

export const Pill: Story = { args: { pill: true } };

export const Clicked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "확인" }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
