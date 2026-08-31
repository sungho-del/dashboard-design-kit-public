import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Spinner } from "./Spinner";

const meta = {
  title: "Components/Spinner",
  component: Spinner,
  tags: ["autodocs"],
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {[16, 20, 24, 32].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <Spinner size={size} />
          <code className="label-small text-text-minimal">{size}</code>
        </div>
      ))}
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      {(["icon", "accent", "critical", "warning"] as const).map((tone) => (
        <div key={tone} className="flex flex-col items-center gap-2">
          <Spinner tone={tone} size={24} />
          <code className="label-small text-text-minimal">{tone}</code>
        </div>
      ))}
    </div>
  ),
};

export const OnDarkSurface: Story = {
  render: () => (
    <div className="flex items-center gap-6 rounded-medium bg-surface-inverse p-6">
      <Spinner tone="on" size={24} />
      <Spinner tone="inverse" size={24} />
    </div>
  ),
};

export const WithLabel: Story = {
  args: { label: "불러오는 중", size: 24 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("status")).toHaveAccessibleName(
      "불러오는 중",
    );
  },
};
