/// <reference types="vitest/config" />
import { defineConfig } from "vite";
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
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
