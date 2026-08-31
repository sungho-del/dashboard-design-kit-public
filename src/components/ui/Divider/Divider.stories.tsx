import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Divider, type DividerTone } from "./Divider";

const meta = {
  title: "Components/Divider",
  component: Divider,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: "inline-radio",
      options: ["horizontal", "vertical"],
    },
    tone: {
      control: "select",
      options: ["divide", "divide-sub", "divide-minimal"],
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: DividerTone[] = ["divide", "divide-sub", "divide-minimal"];

/** 기본 — 부모 너비를 채우는 1px 가로선 */
export const Horizontal: Story = {
  args: { orientation: "horizontal" },
  render: (args) => (
    <div className="w-80">
      <Divider {...args} />
    </div>
  ),
};

/** 세로선. 기본 길이 16px (DESIGN.md §26) */
export const Vertical: Story = {
  args: { orientation: "vertical" },
  render: (args) => (
    <div className="flex items-center gap-3">
      <span className="label-medium text-text-secondary">이전</span>
      <Divider {...args} />
      <span className="label-medium text-text-secondary">다음</span>
    </div>
  ),
};

/** 3종 tone 비교 — divide(기본) · divide-sub(진함) · divide-minimal(옅음) */
export const Tones: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-6">
      {TONES.map((tone) => (
        <div key={tone} className="flex flex-col gap-2">
          <code className="label-small text-text-minimal">{tone}</code>
          <Divider tone={tone} />
        </div>
      ))}
    </div>
  ),
};

/** 세로선 길이는 length prop으로 조절한다 */
export const VerticalLengths: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {[12, 16, 24, 40].map((length) => (
        <div key={length} className="flex flex-col items-center gap-2">
          <Divider orientation="vertical" length={length} />
          <code className="label-small text-text-minimal">{length}</code>
        </div>
      ))}
    </div>
  ),
};

/** 툴바처럼 액션 그룹을 나누는 용도 — 시각적 장식이므로 기본값(aria-hidden) */
export const InToolbar: Story = {
  render: () => (
    <div className="flex items-center gap-2 rounded-medium bg-surface-sub p-2">
      <span className="label-medium text-text-secondary">복사</span>
      <Divider orientation="vertical" />
      <span className="label-medium text-text-secondary">붙여넣기</span>
      <Divider orientation="vertical" />
      <span className="label-medium text-text-secondary">삭제</span>
    </div>
  ),
};

/**
 * 의미 있는 경계선. `decorative={false}`면 스크린리더에
 * `separator`로 노출된다.
 */
export const Semantic: Story = {
  args: { decorative: false },
  render: (args) => (
    <div className="flex w-80 flex-col gap-4">
      <p className="body-medium text-text">주문 정보</p>
      <Divider {...args} />
      <p className="body-medium text-text">배송 정보</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const separator = canvas.getByRole("separator");
    await expect(separator).toBeInTheDocument();
    await expect(separator).toHaveAttribute("aria-orientation", "horizontal");
  },
};
