import { useState, type ComponentType } from "react";
import { AppShellProvider, ToastProvider } from "./components/ui";
import { navigate, usePathname } from "./lib/router";
import { AccountBar } from "./pages/AccountBar";
import {
  LoginPage,
  PasswordChangePage,
  PasswordResetConfirmPage,
  PasswordResetRequestPage,
} from "./pages/babycube/AuthPages";
import { SELLER_ACCOUNT } from "./pages/sellerGnbSections";
import {
  InqDetailPage,
  AskDetailPage,
  NoticeDetailPage,
  ReviewDetailPage,
} from "./pages/seller/BoardDetailPages";
import {
  SellerAskPage,
  SellerNoticePage,
  SellerReviewsPage,
  SupportPage,
} from "./pages/seller/BoardPages";
import { useDirectAccount, withDirect } from "./pages/seller/sellerAccount";
import {
  RentCancelDetailPage,
  RentInspDetailPage,
  RentOrderDetailPage,
  RentOrdersDetailPage,
  RentRmaDetailPage,
  RentShipDetailPage,
  RentUseDetailPage,
} from "./pages/seller/RentDetailPages";
import {
  RentDepositDetailPage,
  RentDepositPage,
} from "./pages/seller/RentDepositPages";
import { CouponFormPage, CouponListPage } from "./pages/seller/CouponPages";
import {
  ProductDetailPage,
  ProductNewPage,
} from "./pages/seller/ProductFormPage";
import { OrderDetailsPage } from "./pages/seller/OrderDetailsPage";
import { ProductsPage } from "./pages/seller/ProductsPage";
import { SellerDashboardPage } from "./pages/seller/SellerDashboardPage";
import { OpsCalendarPage, StorePage } from "./pages/seller/SystemPages";
import { RentOrdersPage } from "./pages/seller/RentOrdersPage";
import {
  RentCancelPage,
  RentDispatchPage,
  RentInspReturnPage,
  RentListPage,
  RentRmaPage,
  RentUsePage,
} from "./pages/seller/RentProcessPages";
import {
  SaleCancelDetailPage,
  SaleExchangeDetailPage,
  SaleReturnDetailPage,
} from "./pages/seller/SaleClaimDetailPage";
import {
  SaleCancelPage,
  SaleExchangePage,
  SaleReturnPage,
} from "./pages/seller/SaleClaimPages";
import {
  SaleOrderDetailPage,
  SaleOrdersDetailPage,
} from "./pages/seller/SaleOrderDetailPage";
import { SaleOrdersPage } from "./pages/seller/SaleOrdersPage";
import { SaleProcPage } from "./pages/seller/SaleProcPage";
import { ShippingDetailPage } from "./pages/seller/ShippingDetailPage";
import { ShippingPage } from "./pages/seller/ShippingPage";
import { SellerScreenIndexPage } from "./pages/seller/SellerScreenIndexPage";
import {
  SettleOwnDetailPage,
  SettleOwnPage,
  SettleStatementPage,
  SettleStmtDetailPage,
  SettleTaxPage,
} from "./pages/seller/SettlePages";

/**
 * **입점사(셀러) 어드민** 앱 진입점 — 경로 → 화면 매핑과 전역 Provider 만 책임진다.
 * 본사 앱(`App.tsx`)과 같은 구조이고, `main.tsx` 가 실행 모드로 둘 중 하나를 고른다
 * (`npm run dev` = 본사 · `npm run dev:seller` = 셀러).
 *
 * ## 왜 본사 앱과 한 맵에 두지 않나
 * 경로가 겹친다(`/products` `/promo` `/support` `/ops-calendar` `/rent-deposit`
 * `/settle-statement` `/settle-tax` — 같은 이름, 다른 화면). 전달본 경로는 **셀러 개발 저장소
 * (`babycube-admin-seller`) App Router 경로와 같아야** 하므로 접두사로 피하지 않고 앱을 나눈다.
 *
 * ## 경로
 * 셀러 개발 저장소 경로 그대로. GNB 항목 id 가 곧 경로다(`sellerGnbSections.tsx`).
 * 원본 메뉴 27항목이 전부 화면을 가진다(2026-11-04 — 임시 자리 `SellerPendingPage` 는 지웠다).
 */

/** 모든 화면이 공유하는 props — 본사 앱과 같다 */
interface NavProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

/* 경로 → 화면. 제목은 원본 탑바 h1(TITLES) — 판매·렌트에 같은 이름(배송·취소·반품 관리)이 있다 */
const ROUTES: Record<string, ComponentType<NavProps>> = {
  "/": SellerDashboardPage,
  "/products": ProductsPage,
  "/product-new": ProductNewPage,
  /* 개발 저장소는 `/products/new` 를 `/product-new` 로 보낸다 — 같은 화면 */
  "/products/new": ProductNewPage,
  "/sale-orders": SaleOrdersPage,
  "/sale-proc": SaleProcPage,
  "/shipping": ShippingPage,
  "/sale-cancel": SaleCancelPage,
  "/sale-return": SaleReturnPage,
  "/sale-exchange": SaleExchangePage,
  "/rent-orders": RentOrdersPage,
  "/rent-list": RentListPage,
  "/rent-dispatch": RentDispatchPage,
  "/rent-use": RentUsePage,
  "/rent-insp-return": RentInspReturnPage,
  "/rent-cancel": RentCancelPage,
  "/rent-rma": RentRmaPage,
  "/settle-own": SettleOwnPage,
  "/rent-deposit": RentDepositPage,
  "/settle-statement": SettleStatementPage,
  "/settle-tax": SettleTaxPage,
  "/promo": CouponListPage,
  "/seller-notice": SellerNoticePage,
  "/support": SupportPage,
  "/seller-reviews": SellerReviewsPage,
  "/seller-ask": SellerAskPage,
  "/store": StorePage,
  "/ops-calendar": OpsCalendarPage,

  /*
   * 인증 4화면 — 본사 퍼블과 같은 화면 · 셀러 develop 문구(개발 요청 2026-11-12 1번).
   * 셸(메뉴·계정 줄) 없이 가운데 창 하나다. 정확 일치라 `/password-reset/confirm` 과 `/password-reset` 이 서로를 가리지 않는다
   */
  "/login": (props) => <LoginPage {...props} account="입점사" />,
  "/password": (props) => <PasswordChangePage {...props} account="입점사" />,
  "/password-reset/confirm": (props) => (
    <PasswordResetConfirmPage {...props} account="입점사" />
  ),
  "/password-reset": (props) => (
    <PasswordResetRequestPage {...props} account="입점사" />
  ),

  /* 저장소 색인 — 원본에 없다(본사와 같다) */
  "/screens": SellerScreenIndexPage,
};

/**
 * 상세 화면 — 경로 뒤에 식별자가 붙는다(`/sale-proc/{처리단위}`). 본사 `DETAIL_ROUTES` 와 같은 꼴.
 * 상세는 화면을 만들 때 하나씩 넣는다.
 */
const DETAIL_ROUTES: {
  prefix: string;
  parent: string;
  screen: ComponentType<NavProps>;
}[] = [
  { prefix: "/products/", parent: "/products", screen: ProductDetailPage },
  /* 주문 통합 관리에서 여는 상세(개발 요청 2026-11-12 2번) */
  {
    prefix: "/sale-orders/",
    parent: "/sale-orders",
    screen: SaleOrdersDetailPage,
  },
  {
    prefix: "/rent-orders/",
    parent: "/rent-orders",
    screen: RentOrdersDetailPage,
  },
  {
    prefix: "/order-details/",
    parent: "/sale-orders",
    screen: OrderDetailsPage,
  },
  { prefix: "/sale-proc/", parent: "/sale-proc", screen: SaleOrderDetailPage },
  { prefix: "/shipping/", parent: "/shipping", screen: ShippingDetailPage },
  {
    prefix: "/sale-cancel/",
    parent: "/sale-cancel",
    screen: SaleCancelDetailPage,
  },
  {
    prefix: "/sale-return/",
    parent: "/sale-return",
    screen: SaleReturnDetailPage,
  },
  {
    prefix: "/sale-exchange/",
    parent: "/sale-exchange",
    screen: SaleExchangeDetailPage,
  },
  { prefix: "/rent-list/", parent: "/rent-list", screen: RentOrderDetailPage },
  {
    prefix: "/rent-dispatch/",
    parent: "/rent-dispatch",
    screen: RentShipDetailPage,
  },
  { prefix: "/rent-use/", parent: "/rent-use", screen: RentUseDetailPage },
  {
    prefix: "/rent-insp-return/",
    parent: "/rent-insp-return",
    screen: RentInspDetailPage,
  },
  {
    prefix: "/rent-cancel/",
    parent: "/rent-cancel",
    screen: RentCancelDetailPage,
  },
  { prefix: "/rent-rma/", parent: "/rent-rma", screen: RentRmaDetailPage },
  {
    prefix: "/settle-own/",
    parent: "/settle-own",
    screen: SettleOwnDetailPage,
  },
  { prefix: "/promo/", parent: "/promo", screen: CouponFormPage },
  {
    prefix: "/seller-notice/",
    parent: "/seller-notice",
    screen: NoticeDetailPage,
  },
  { prefix: "/support/", parent: "/support", screen: InqDetailPage },
  {
    prefix: "/seller-reviews/",
    parent: "/seller-reviews",
    screen: ReviewDetailPage,
  },
  { prefix: "/seller-ask/", parent: "/seller-ask", screen: AskDetailPage },
  {
    prefix: "/rent-deposit/",
    parent: "/rent-deposit",
    screen: RentDepositDetailPage,
  },
  {
    prefix: "/settle-statement/",
    parent: "/settle-statement",
    screen: SettleStmtDetailPage,
  },
];

/** 없는 경로 — 화면 목록(본사와 같다) */
const FALLBACK = SellerScreenIndexPage;

/** 계정 줄 내용 — [로그아웃]은 본사와 같이 로그인 화면으로(로그인 화면이 생겼다 · 개발 요청 2026-11-12 1번) */
function SellerAccountBar() {
  return <AccountBar {...SELLER_ACCOUNT} onLogout={() => navigate("/login")} />;
}

export function SellerApp() {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();
  const direct = useDirectAccount();

  /* 상세에서도 GNB 는 부모 항목이 선택된 채로 남는다(본사와 같다) */
  const detail = DETAIL_ROUTES.find((route) =>
    pathname.startsWith(route.prefix),
  );

  const nav = {
    navOpen,
    onNavOpenChange: setNavOpen,
    activeNav: detail?.parent ?? pathname,
    /* 직영 계정 미리보기(`?account=direct`)는 화면을 옮겨도 이어 간다(`sellerAccount.ts`) */
    onNavSelect: (path: string) => navigate(direct ? withDirect(path) : path),
  };

  const Screen = ROUTES[pathname] ?? detail?.screen ?? FALLBACK;

  return (
    <ToastProvider position="bottom">
      {/* 계정 줄 — 여기서 한 번 넣으면 `AppShell` 을 그리는 모든 화면 맨 위에 나온다(본사와 같다) */}
      <AppShellProvider topBar={<SellerAccountBar />}>
        <Screen {...nav} />
      </AppShellProvider>
    </ToastProvider>
  );
}
