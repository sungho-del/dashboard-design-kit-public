import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ChevronRight } from "lucide-react";
import { TextButton, type TextButtonTone } from "./TextButton";

const meta = {
  title: "Components/TextButton",
  component: TextButton,
  tags: ["autodocs"],
  args: { onClick: fn(), children: "더보기" },
  argTypes: {
    tone: {
      control: "select",
      options: ["accent", "secondary", "critical", "warning", "on"],
    },
    size: {
      control: "select",
      options: ["large", "medium", "small"],
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof TextButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: TextButtonTone[] = [
  "accent",
  "secondary",
  "critical",
  "warning",
  "on",
];

export const Accent: Story = { args: { tone: "accent" } };
export const Secondary: Story = { args: { tone: "secondary" } };
export const Critical: Story = { args: { tone: "critical", children: "삭제" } };
export const Warning: Story = {
  args: { tone: "warning", children: "확인 필요" },
};

/** `on`은 어두운 배경 위에 얹는 톤이라 배경을 깔고 확인한다 */
export const On: Story = {
  args: { tone: "on", children: "자세히" },
  render: (args) => (
    <div className="bg-surface-inverse inline-flex rounded-medium p-4">
      <TextButton {...args} />
    </div>
  ),
};

/** tone 5종 한눈에 비교 — `on`만 어두운 배경 위에 둔다 */
export const AllTones: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-4">
      {TONES.map((tone) =>
        tone === "on" ? (
          <div key={tone} className="bg-surface-inverse rounded-medium p-2">
            <TextButton {...args} tone={tone}>
              {tone}
            </TextButton>
          </div>
        ) : (
          <TextButton key={tone} {...args} tone={tone}>
            {tone}
          </TextButton>
        ),
      )}
    </div>
  ),
};

/** large 16/24 · medium 14/24 · small 12/16 (상하 padding 4) */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      <TextButton {...args} size="large">
        large
      </TextButton>
      <TextButton {...args} size="medium">
        medium
      </TextButton>
      <TextButton {...args} size="small">
        small
      </TextButton>
    </div>
  ),
};

export const Large: Story = { args: { size: "large" } };
export const Medium: Story = { args: { size: "medium" } };
export const Small: Story = { args: { size: "small" } };

/** 텍스트 옆 아이콘 — base gap 2px(small은 1px)로 붙는다 */
export const WithIcon: Story = {
  args: {
    children: (
      <>
        더보기
        <ChevronRight size={16} strokeWidth={1.2} aria-hidden />
      </>
    ),
  },
};

export const Disabled: Story = { args: { disabled: true } };

/** 클릭 시 onClick이 호출되는지 확인한다 */
export const Clicked: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "더보기" }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
