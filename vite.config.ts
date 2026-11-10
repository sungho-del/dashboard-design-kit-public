import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  /*
    `@/` → `src/`. tsconfig 의 `paths` 와 짝이다(shadcn CLI 가 그쪽을 읽는다).
    `/src` 는 Vite 가 프로젝트 루트 기준으로 푸는 경로라 node:path 없이 동작한다.
  */
  resolve: { alias: { "@": "/src" } },
  /*
    PostCSS 설정을 위 폴더에서 찾지 않게 막는다. 전달본은 받는 저장소의 `publishing/` 에 놓이는데,
    그 저장소 루트에 `postcss.config.mjs`(Next 앱 것)가 있으면 Vite 가 그것을 집어 빌드가 깨진다.
    Tailwind 는 위의 Vite 플러그인이 처리하므로 PostCSS 플러그인은 필요 없다.
  */
  css: { postcss: { plugins: [] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    /* scripts/export-publishing/files/ 는 전달본에 들어갈 사본이라 여기서는 돌지 않는다 */
    exclude: [...configDefaults.exclude, "scripts/**"],
  },
});
