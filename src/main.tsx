import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { SellerApp } from "./SellerApp";

/*
  앱 선택 — `vite --mode seller`(`npm run dev:seller`)면 입점사 어드민, 그 밖은 본사 어드민.
  두 앱은 경로가 겹쳐 한 맵에 둘 수 없다(`SellerApp.tsx` 주석).
  전달본은 이 파일을 앱 하나만 여는 꼴로 다시 쓴다(`scripts/export-publishing.mjs`).
*/
const Root = import.meta.env.MODE === "seller" ? SellerApp : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
