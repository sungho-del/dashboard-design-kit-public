import { useState, type ComponentType } from "react";
import { ToastProvider } from "./components/ui";
import { navigate, usePathname } from "./lib/router";
import { DashboardPage } from "./pages/DashboardPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderListPage } from "./pages/OrderListPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ScreenIndexPage } from "./pages/ScreenIndexPage";
import { TEMPLATE_ROUTES } from "./pages/routes";

/**
 * 앱 진입점 — **경로 → 화면 매핑과 전역 Provider 만 책임진다.**
 * 화면 구현은 전부 `src/pages/` 에 있다.
 *
 * ## 지금은 템플릿 4종만 있다
 *
 * `npm run reset:project` 를 돌린 직후 상태다. 여기 있는 4개는 **예시가 아니라
 * 출발점**이다 — Stage 5(`/build-screens`)가 이 4종을 읽어 당신 서비스의 화면을 만든다.
 *
 * 새 화면이 생기면 여기에 **한 줄씩** 추가하면 된다:
 *
 * ```ts
 * "/members": MemberListPage,
 * ```
 *
 * ## 화면마다 URL 이 있다
 *
 * 라우터는 `src/lib/router.ts` 의 60줄짜리 최소 구현이다. 실제 제품에 이식할 때는
 * 그 파일을 지우고 react-router 로 갈아끼우면 된다 — 화면 코드는 손댈 필요가 없다.
 *
 * ## 사이드바 상태를 여기서 소유하는 이유
 *
 * 페이지가 각자 `useState` 를 가지면 화면을 바꿀 때마다 GNB 접힘 상태가 초기화된다.
 * 여기서 소유해 props 로 내려준다. (경로와 달리 URL 에 남길 값이 아니다)
 */

/** 모든 화면이 공유하는 props — 사이드바 상태 + 화면 전환 */
interface NavProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  /** 현재 경로. GNB 가 선택 상태를 그리는 데 쓴다 */
  activeNav: string;
  /** 경로로 이동. 화면 안의 링크(타일·퍼널·시트 버튼)가 부른다 */
  onNavSelect: (path: string) => void;
}

/*
 * 경로 → 화면.
 *
 * ⚠️ `gnbSections.tsx` 의 항목 id 와 **같은 문자열**을 쓴다. 매핑표를 따로 두면
 * 한쪽만 고쳤을 때 메뉴는 멀쩡한데 화면이 안 열리는 식으로 조용히 어긋난다.
 */
const ROUTES: Record<string, ComponentType<NavProps>> = {
  /* ── 템플릿 4종 — 여기에 당신 서비스의 화면을 더해 나간다 ── */
  [TEMPLATE_ROUTES.dashboard]: DashboardPage,
  [TEMPLATE_ROUTES.orders]: OrderListPage,
  /* 상세형은 GNB 항목이 아니다(목록의 하위 화면). 메뉴에 없어도 **경로는 반드시 만든다** */
  [TEMPLATE_ROUTES.orderDetail]: OrderDetailPage,
  [TEMPLATE_ROUTES.productNew]: ProductFormPage,

  /* ── 저장소 색인 — 만들어진 화면을 한자리에 펼쳐 본다 ── */
  "/screens": ScreenIndexPage,
};

/** 없는 경로에서 보여줄 화면 — 화면 목록이 가장 덜 당황스럽다 */
const FALLBACK = ScreenIndexPage;

export function App() {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();

  const nav = {
    navOpen,
    onNavOpenChange: setNavOpen,
    activeNav: pathname,
    onNavSelect: navigate,
  };

  const Screen = ROUTES[pathname] ?? FALLBACK;

  return (
    <ToastProvider position="bottom">
      <Screen {...nav} />
    </ToastProvider>
  );
}
