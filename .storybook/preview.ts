import type { Preview } from "@storybook/react";
import "../src/index.css"; // 디자인 토큰 + Tailwind 로드 — 스토리가 실제 앱과 같은 스타일을 쓰게 한다

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
