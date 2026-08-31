import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Bell, MoreVertical, Search, Trash2, X } from "lucide-react";
import { IconButton, type IconButtonVariant } from "./IconButton";

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  tags: ["autodocs"],
  args: {
    onClick: fn(),
    label: "검색",
    icon: <Search strokeWidth={1.2} aria-hidden />,
  },
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
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const VARIANTS: IconButtonVariant[] = [
  "primary",
  "primaryTonal",
  "ghost",
  "secondary",
  "critical",
  "criticalTonal",
  "accent",
  "accentTonal",
];

/** 툴바·테이블 행에서 가장 흔한 기본형 */
export const Default: Story = {};

export const AllVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((variant) => (
        <IconButton key={variant} {...args} variant={variant} label={variant} />
      ))}
    </div>
  ),
};

/**
 * 48 / 40 / 32 / 28 — Button과 동일한 컨트롤 높이 체계.
 * 아이콘은 large만 24px, 나머지는 16px로 자동 적용된다.
 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <IconButton {...args} size="large" label="large" />
      <IconButton {...args} size="medium" label="medium" />
      <IconButton {...args} size="small" label="small" />
      <IconButton {...args} size="xsmall" label="xsmall" />
    </div>
  ),
};

/** 원형 — 알림·프로필 등 */
export const Pill: Story = {
  args: {
    pill: true,
    label: "알림",
    icon: <Bell strokeWidth={1.2} aria-hidden />,
  },
};

export const Loading: Story = { args: { loading: true } };

export const Disabled: Story = { args: { disabled: true } };

/** 테이블 행에서 쓰이는 조합 */
export const InTableRow: Story = {
  render: (args) => (
    <div className="flex items-center gap-1">
      <IconButton
        {...args}
        size="small"
        label="더보기"
        icon={<MoreVertical strokeWidth={1.2} aria-hidden />}
      />
      <IconButton
        {...args}
        size="small"
        variant="criticalTonal"
        label="삭제"
        icon={<Trash2 strokeWidth={1.2} aria-hidden />}
      />
    </div>
  ),
};

/** 모달·시트 우상단 닫기 */
export const CloseButton: Story = {
  args: {
    label: "닫기",
    size: "small",
    icon: <X strokeWidth={1.2} aria-hidden />,
  },
};

export const Clicked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "검색" }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
