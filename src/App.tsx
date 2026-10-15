import { useState, type ComponentType } from "react";
import { ToastProvider } from "./components/ui";
import { navigate, usePathname } from "./lib/router";
import { DashboardPage } from "./pages/DashboardPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderListPage } from "./pages/OrderListPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ScreenIndexPage } from "./pages/ScreenIndexPage";
import { TEMPLATE_ROUTES } from "./pages/routes";

/* BabyCube — 기획서(pipeline/01-service-brief.json)에서 Stage 5 가 생성한 28화면 */
import { BannerListPage } from "./pages/babycube/BannerListPage";
import { CareClaimListPage } from "./pages/babycube/CareClaimListPage";
import { CategoryListPage } from "./pages/babycube/CategoryListPage";
import { CouponListPage } from "./pages/babycube/CouponListPage";
import { BabycubeDashboardPage } from "./pages/babycube/DashboardPage";
import { FaqListPage } from "./pages/babycube/FaqListPage";
import { GrowthStageListPage } from "./pages/babycube/GrowthStageListPage";
import { HolidayListPage } from "./pages/babycube/HolidayListPage";
import { MemberDetailPage } from "./pages/babycube/MemberDetailPage";
import { MemberListPage } from "./pages/babycube/MemberListPage";
import { NoticeListPage } from "./pages/babycube/NoticeListPage";
import { OrderCancelListPage } from "./pages/babycube/OrderCancelListPage";
import { OrderExchangeListPage } from "./pages/babycube/OrderExchangeListPage";
/* ⚠️ 이름이 템플릿의 `OrderListPage` 와 겹친다 — 유일한 충돌이라 여기서만 별칭을 준다 */
import { OrderListPage as BcOrderListPage } from "./pages/babycube/OrderListPage";
import { OrderReturnListPage } from "./pages/babycube/OrderReturnListPage";
import { PointListPage } from "./pages/babycube/PointListPage";
import { PopupListPage } from "./pages/babycube/PopupListPage";
import { ProductListPage } from "./pages/babycube/ProductListPage";
import { RentDepositListPage } from "./pages/babycube/RentDepositListPage";
import { ReviewListPage } from "./pages/babycube/ReviewListPage";
import { ScriptSettingsPage } from "./pages/babycube/ScriptSettingsPage";
import { SellerDetailPage } from "./pages/babycube/SellerDetailPage";
import { SellerListPage } from "./pages/babycube/SellerListPage";
import { SellerReviewDetailPage } from "./pages/babycube/SellerReviewDetailPage";
import { SellerReviewPage } from "./pages/babycube/SellerReviewPage";
import { SellerSettlementPage } from "./pages/babycube/SellerSettlementPage";
import { SettingsPage } from "./pages/babycube/SettingsPage";
import { SettlementStatementPage } from "./pages/babycube/SettlementStatementPage";
import { SupportListPage } from "./pages/babycube/SupportListPage";
import { TaxInvoiceListPage } from "./pages/babycube/TaxInvoiceListPage";
import { TermsAdminPage } from "./pages/babycube/TermsAdminPage";

/**
 * 앱 진입점 — **경로 → 화면 매핑과 전역 Provider 만 책임진다.**
 * 화면 구현은 전부 `src/pages/` 에 있다.
 *
 * ## 화면마다 URL 이 있다
 *
 * 경로는 **원본 어드민의 route 를 그대로** 쓴다(`/`, `/members`, `/orders-all`, …).
 * 그래서 딥링크·새로고침·뒤로가기가 전부 동작하고, 원본과 화면을 1:1 로 대조할 수 있다.
 * 라우터는 `src/lib/router.ts` 의 60줄짜리 최소 구현이다 — 실제 앱에 이식할 때
 * 그 파일을 지우고 react-router 로 갈아끼우면 된다.
 *
 * ## 사이드바 상태를 여기서 소유하는 이유
 *
 * 페이지가 각자 `useState` 를 가지면 화면을 바꿀 때마다 GNB 접힘 상태가 초기화된다.
 * 여기서 소유해 props 로 내려준다. (경로와 달리 URL 에 남길 값이 아니다)
 *
 * ## 삼항 연쇄 대신 조회 맵을 쓰는 이유
 *
 * 화면이 8개였을 때는 `activeNav === "x" ? <X/> : …` 연쇄로 충분했다.
 * BabyCube 28화면이 들어오며 **36갈래**가 되었고, 그 길이의 연쇄는 읽을 수도
 * 리뷰할 수도 없다. 맵은 항목 하나가 한 줄이고 중복 키를 타입이 잡아 준다.
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
 * BabyCube 28개는 **원본 route 를 그대로** 쓴다. `gnbSections.tsx` 의 항목 id 도
 * 같은 문자열이라 **id↔경로 매핑표가 없다** — 따로 두면 한쪽만 고쳤을 때 조용히 어긋난다.
 *
 * 템플릿은 원본에 없는 화면이라 `/_` 접두사로 갈라 둔다. 서비스 경로와 섞이면
 * 어느 것이 실제 제품 화면인지 알 수 없다.
 */
const ROUTES: Record<string, ComponentType<NavProps>> = {
  /* ── BabyCube 본사 운영 어드민 (원본 경로 그대로) ── */
  "/": BabycubeDashboardPage,
  "/members": MemberListPage,
  "/sellers": SellerListPage,
  "/seller-review": SellerReviewPage,
  "/products": ProductListPage,
  "/categories": CategoryListPage,
  "/stages": GrowthStageListPage,
  "/orders-all": BcOrderListPage,
  "/orders-cancel": OrderCancelListPage,
  "/orders-return": OrderReturnListPage,
  "/orders-exchange": OrderExchangeListPage,
  "/settle-seller": SellerSettlementPage,
  "/rent-deposit": RentDepositListPage,
  "/care-claims": CareClaimListPage,
  "/settle-statement": SettlementStatementPage,
  "/settle-tax": TaxInvoiceListPage,
  "/promo": CouponListPage,
  "/points": PointListPage,
  "/notices": NoticeListPage,
  "/faq-admin": FaqListPage,
  "/reviews-admin": ReviewListPage,
  "/support": SupportListPage,
  "/display": BannerListPage,
  "/popups": PopupListPage,
  "/ops-calendar": HolidayListPage,
  "/terms-admin": TermsAdminPage,
  "/scripts": ScriptSettingsPage,
  "/settings": SettingsPage,

  /* ── 저장소 색인 (원본에 없는 화면) ── */
  "/screens": ScreenIndexPage,

  /*
   * ── 템플릿 4종 (이커머스) — 화면 생성기(screen-builder)의 원본 ──
   * GNB·화면 목록에는 없다. 생성기·점검 에이전트가 경로로 직접 연다.
   */
  [TEMPLATE_ROUTES.dashboard]: DashboardPage,
  [TEMPLATE_ROUTES.orders]: OrderListPage,
  [TEMPLATE_ROUTES.orderDetail]: OrderDetailPage,
  [TEMPLATE_ROUTES.productNew]: ProductFormPage,
};

/**
 * 상세 화면 — **경로 뒤에 식별자가 붙는다**(`/members/{id}`).
 *
 * 위 `ROUTES` 는 정확히 일치하는 경로만 찾으므로 여기 접두사 맵을 한 벌 더 둔다.
 * 순서는 상관없다 — 접두사끼리 겹치지 않기 때문이다(겹치면 더 긴 쪽을 먼저 둘 것).
 *
 * ## 왜 react-router 를 넣지 않는가
 * "가져다 쓰는 쪽에 라우터 선택을 강요하지 않는다"는 이 저장소의 원칙 때문이다
 * (`src/lib/router.ts` 주석). 상세 화면 하나 때문에 의존성과 API 를 고정하지 않는다.
 *
 * ## id 는 화면이 직접 읽는다
 * 라우터가 파라미터를 파싱해 props 로 내려주지 않는다 — 그러려면 화면 계약
 * (`{navOpen, onNavOpenChange, activeNav, onNavSelect}`)이 화면마다 갈라진다.
 * 상세 화면은 `usePathname()` 에서 마지막 구간을 직접 떼어 쓴다.
 */
const DETAIL_ROUTES: {
  prefix: string;
  parent: string;
  screen: ComponentType<NavProps>;
}[] = [
  { prefix: "/members/", parent: "/members", screen: MemberDetailPage },
  { prefix: "/sellers/", parent: "/sellers", screen: SellerDetailPage },
  {
    prefix: "/seller-review/",
    parent: "/seller-review",
    screen: SellerReviewDetailPage,
  },
];

/** 없는 경로에서 보여줄 화면 — 저장소 색인이 가장 덜 당황스럽다 */
const FALLBACK = ScreenIndexPage;

export function App() {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();

  /*
    상세 화면에서도 GNB 는 **부모 항목**이 선택된 채로 남아야 한다.
    `activeNav` 에 `/members/sujin...` 을 그대로 넘기면 일치하는 GNB 항목이 없어
    사이드바에서 아무것도 강조되지 않는다 — "내가 어디에 있는지"가 사라진다.
  */
  const detail = DETAIL_ROUTES.find((route) =>
    pathname.startsWith(route.prefix),
  );

  const nav = {
    navOpen,
    onNavOpenChange: setNavOpen,
    activeNav: detail?.parent ?? pathname,
    onNavSelect: navigate,
  };

  const Screen = ROUTES[pathname] ?? detail?.screen ?? FALLBACK;

  return (
    <ToastProvider position="bottom">
      <Screen {...nav} />
    </ToastProvider>
  );
}
