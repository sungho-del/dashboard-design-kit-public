import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Tag, type TagSize, type TagTone } from "./Tag";

const meta = {
  title: "Components/Tag",
  component: Tag,
  tags: ["autodocs"],
  args: { children: "배지" },
  argTypes: {
    tone: {
      control: "select",
      options: ["default", "success", "warning", "critical", "custom"],
    },
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
    dot: { control: "boolean" },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

const TONES: Exclude<TagTone, "custom">[] = [
  "default",
  "success",
  "warning",
  "critical",
];

const SIZES: TagSize[] = ["small", "medium", "large"];

/** 분류·중립 라벨. 의미가 없는 값에는 상태 색을 쓰지 않는다 */
export const Default: Story = { args: { tone: "default", children: "일반" } };

/** 성공·완료 (결제완료, 배송완료) */
export const Success: Story = {
  args: { tone: "success", children: "결제완료" },
};

/** 주의·확인 필요 (재고 부족, 승인 대기) */
export const Warning: Story = {
  args: { tone: "warning", children: "승인대기" },
};

/** 오류·위험 (결제실패, 취소) */
export const Critical: Story = {
  args: { tone: "critical", children: "결제실패" },
};

/**
 * custom tone은 색을 로컬 CSS 변수로 주입받는다.
 * 값에는 반드시 semantic 토큰을 넣는다 — 하드코딩 색상 금지.
 */
export const Custom: Story = {
  args: {
    tone: "custom",
    children: "진행중",
    style: {
      "--tag-bg-color": "var(--color-surface-highlight-secondary)",
      "--tag-color": "var(--color-text-accent)",
    },
  },
};

/** 4종 기본 tone 비교 */
export const AllTones: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {TONES.map((tone) => (
        <Tag key={tone} {...args} tone={tone}>
          {tone}
        </Tag>
      ))}
    </div>
  ),
};

/** small 11/12 · medium 12/16 · large 14/24 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {SIZES.map((size) => (
        <Tag key={size} {...args} size={size}>
          {size}
        </Tag>
      ))}
    </div>
  ),
};

export const Small: Story = { args: { size: "small", children: "small" } };
export const Medium: Story = { args: { size: "medium", children: "medium" } };
export const Large: Story = { args: { size: "large", children: "large" } };

/** dot은 8×8 원형이며, 색은 해당 tone의 글자색을 그대로 따라간다 */
export const WithDot: Story = {
  args: { tone: "success", dot: true, children: "배송완료" },
};

export const DotAllTones: Story = {
  args: { dot: true },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2">
      {TONES.map((tone) => (
        <Tag key={tone} {...args} tone={tone}>
          {tone}
        </Tag>
      ))}
    </div>
  ),
};

/**
 * 실제 대시보드 맥락 — 주문 상태 컬럼.
 * 같은 열에 놓이는 태그는 size를 통일하고, 상태별 tone만 바꾼다.
 */
export const OrderStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(
        [
          { label: "결제완료", tone: "success" },
          { label: "배송중", tone: "custom" },
          { label: "배송완료", tone: "success" },
          { label: "입금대기", tone: "warning" },
          { label: "취소", tone: "critical" },
          { label: "반품", tone: "default" },
        ] as const
      ).map(({ label, tone }) => (
        <div key={label} className="flex items-center gap-3">
          <Tag
            tone={tone}
            dot
            style={
              tone === "custom"
                ? {
                    "--tag-bg-color":
                      "var(--color-surface-highlight-secondary)",
                    "--tag-color": "var(--color-text-accent)",
                  }
                : undefined
            }
          >
            {label}
          </Tag>
        </div>
      ))}
    </div>
  ),
};

/** 텍스트가 짧아도 min-width 덕분에 폭이 들쭉날쭉하지 않는다 */
export const ShortLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      {SIZES.map((size) => (
        <Tag key={size} {...args} size={size}>
          1
        </Tag>
      ))}
    </div>
  ),
};

/** 렌더 검증: 라벨 텍스트가 보이고, dot이 함께 그려진다 */
export const Rendered: Story = {
  args: { tone: "success", dot: true, children: "결제완료" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tag = canvas.getByText("결제완료");
    await expect(tag).toBeVisible();
    await expect(tag.querySelector("[data-tag-dot]")).not.toBeNull();
  },
};
