import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials", // docs(autodocs) · controls · actions 포함
    "@storybook/addon-interactions", // play function 디버깅 패널
    "@storybook/addon-designs", // 스토리 옆에 Figma 디자인 임베드
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
