import { useState, type ComponentType } from "react";
import { ToastProvider } from "./components/ui";
import { navigate, usePathname } from "./lib/router";
import { ClinicStatusPage } from "./pages/ClinicStatusPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { OrderListPage } from "./pages/OrderListPage";
import { PatientFormPage } from "./pages/PatientFormPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ReservationDetailPage } from "./pages/ReservationDetailPage";
import { ReservationListPage } from "./pages/ReservationListPage";
import { ScreenIndexPage } from "./pages/ScreenIndexPage";
import { CHARTON_ROUTES, TEMPLATE_ROUTES } from "./pages/routes";

/* 클래스온 — 온라인 강의 플랫폼 운영 어드민 (기획서 2화면, Stage 5 생성물) */
import { OpsDashboardPage } from "./pages/classon/OpsDashboardPage";
import { StudentListPage } from "./pages/classon/StudentListPage";

/* BabyCube — 기획서(pipeline/01-service-brief.json)에서 Stage 5 가 생성한 28화면 */
import { BannerListPage } from "./pages/babycube/BannerListPage";
import { CareClaimListPage } from "./pages/babycube/CareClaimListPage";
import { CategoryListPage } from "./pages/babycube/CategoryListPage";
import { CouponListPage } from "./pages/babycube/CouponListPage";
import { BabycubeDashboardPage } from "./pages/babycube/DashboardPage";
import { FaqListPage } from "./pages/babycube/FaqListPage";
import { GrowthStageListPage } from "./pages/babycube/GrowthStageListPage";
import { HolidayListPage } from "./pages/babycube/HolidayListPage";
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
import { SellerListPage } from "./pages/babycube/SellerListPage";
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
 * 템플릿·차트온은 원본에 없는 화면이라 `/_` 접두사로 갈라 둔다. 서비스 경로와 섞이면
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

  /* ── 손으로 만든 템플릿 4종 (이커머스) ── */
  [TEMPLATE_ROUTES.dashboard]: DashboardPage,
  [TEMPLATE_ROUTES.orders]: OrderListPage,
  [TEMPLATE_ROUTES.orderDetail]: OrderDetailPage,
  [TEMPLATE_ROUTES.productNew]: ProductFormPage,

  /* ── 차트온 — 병·의원 예약 관리 (첫 리허설 생성물) ── */
  [CHARTON_ROUTES.clinicStatus]: ClinicStatusPage,
  [CHARTON_ROUTES.reservations]: ReservationListPage,
  /*
   * 상세형은 GNB 항목이 아니다(목록의 하위 화면). 메뉴에 없다고 화면이 없는 것은
   * 아니므로 **경로는 반드시 만든다** — 빠뜨리면 '전체 상세 보기'가 폴백으로 떨어진다.
   */
  [CHARTON_ROUTES.reservationDetail]: ReservationDetailPage,
  [CHARTON_ROUTES.patientNew]: PatientFormPage,

  /*
   * ── 클래스온 — 온라인 강의 플랫폼 운영 어드민 (두 번째 리허설 생성물) ──
   *
   * 기획서의 route 는 `/` 와 `/students` 지만 `/` 는 이미 BabyCube 대시보드가 쓰고 있다.
   * 차트온과 같은 방식으로 `/_classon` 접두사를 붙여 서비스 경로와 갈라 둔다 —
   * 실서비스로 이식할 때 접두사만 떼면 기획서 경로가 된다.
   */
  "/_classon/dashboard": OpsDashboardPage,
  "/_classon/students": StudentListPage,
};

/** 없는 경로에서 보여줄 화면 — 저장소 색인이 가장 덜 당황스럽다 */
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
