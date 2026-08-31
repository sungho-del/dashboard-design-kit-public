import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Avatar, type AvatarSize } from "./Avatar";

/** 로드 가능한 실제 이미지가 없어도 되도록 인라인 SVG data URI를 쓴다 */
const SAMPLE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
      <rect width="48" height="48" fill="currentColor" opacity="0.4"/>
      <circle cx="24" cy="18" r="9" fill="currentColor" opacity="0.7"/>
      <circle cx="24" cy="48" r="17" fill="currentColor" opacity="0.7"/>
    </svg>`,
  );

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  tags: ["autodocs"],
  args: { name: "김민수" },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["small", "medium", "large"],
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES: AvatarSize[] = ["small", "medium", "large"];

/** 기본 — 이미지가 없으면 이름 첫 글자로 폴백한다 */
export const Default: Story = {};

export const Small: Story = { args: { size: "small" } };
export const Medium: Story = { args: { size: "medium" } };
export const Large: Story = { args: { size: "large" } };

/** 24 / 32 / 48 — DESIGN.md §26 크기 체계 */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-end gap-4">
      {SIZES.map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Avatar {...args} size={size} />
          <code className="label-small text-text-minimal">{size}</code>
        </div>
      ))}
    </div>
  ),
};

/** 이미지가 있으면 object-cover로 프레임을 채운다 */
export const WithImage: Story = {
  args: { src: SAMPLE_IMAGE, size: "large" },
};

export const WithImageSizes: Story = {
  args: { src: SAMPLE_IMAGE },
  render: (args) => (
    <div className="flex items-end gap-4">
      {SIZES.map((size) => (
        <Avatar key={size} {...args} size={size} />
      ))}
    </div>
  ),
};

/** 한글은 첫 글자 그대로, 라틴 문자는 대문자로 정규화된다 */
export const Initials: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      {["김민수", "이서연", "alex kim", " 박", "🙂 이모지"].map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Avatar name={name} size="large" />
          <code className="label-small text-text-minimal">{name}</code>
        </div>
      ))}
    </div>
  ),
};

/** 이미지 URL이 깨져도 이니셜로 자연스럽게 폴백된다 */
export const BrokenImageFallback: Story = {
  args: { src: "https://example.invalid/not-found.png", size: "large" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // onError 이후 래퍼가 img role + 이름 라벨을 갖는다
    await expect(
      await canvas.findByRole("img", { name: "김민수" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("김")).toBeInTheDocument();
  },
};

/** 이니셜 색상 근거 검증 — 밝은 slate-300 배경 위에서 text-text가 9.7:1로 읽힌다 */
export const InitialContrast: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-medium bg-surface-sub p-6">
      {SIZES.map((size) => (
        <Avatar key={size} name="김민수" size={size} />
      ))}
    </div>
  ),
};

/** 목록에서 겹쳐 쓰는 예시 */
export const Stacked: Story = {
  render: () => (
    <div className="flex items-center">
      {["김민수", "이서연", "박지훈"].map((name, index) => (
        <Avatar
          key={name}
          name={name}
          size="medium"
          className={index > 0 ? "-ml-2" : ""}
        />
      ))}
    </div>
  ),
};
