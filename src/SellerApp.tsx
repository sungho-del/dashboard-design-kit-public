import { useState, type ComponentType } from "react";
import { ToastProvider } from "./components/ui";
import { navigate, usePathname } from "./lib/router";
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
import { SaleOrderDetailPage } from "./pages/seller/SaleOrderDetailPage";
import { SaleProcPage } from "./pages/seller/SaleProcPage";
import { ShippingDetailPage } from "./pages/seller/ShippingDetailPage";
import { ShippingPage } from "./pages/seller/ShippingPage";
import { pendingScreen } from "./pages/seller/SellerPendingPage";
import { SellerScreenIndexPage } from "./pages/seller/SellerScreenIndexPage";

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
 * 아직 퍼블하지 않은 화면은 `pendingScreen(원본 제목)` 으로 열린다 — 화면을 만들면 그 줄만 바꾼다.
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
  "/": pendingScreen("대시보드"),
  "/products": pendingScreen("상품 관리"),
  "/product-new": pendingScreen("상품 등록 폼"),
  "/sale-orders": pendingScreen("주문 통합 관리"),
  "/sale-proc": SaleProcPage,
  "/shipping": ShippingPage,
  "/sale-cancel": SaleCancelPage,
  "/sale-return": SaleReturnPage,
  "/sale-exchange": SaleExchangePage,
  "/rent-orders": pendingScreen("렌트 주문 통합 관리"),
  "/rent-list": pendingScreen("렌트 발주 관리"),
  "/rent-dispatch": pendingScreen("배송 관리"),
  "/rent-use": pendingScreen("대여·연체 관리"),
  "/rent-insp-return": pendingScreen("검수·반납 관리"),
  "/rent-cancel": pendingScreen("취소 관리"),
  "/rent-rma": pendingScreen("반품 관리"),
  "/settle-own": pendingScreen("매출 정산"),
  "/rent-deposit": pendingScreen("보증금 내역"),
  "/settle-statement": pendingScreen("정산 내역/명세서"),
  "/settle-tax": pendingScreen("세금계산서·증빙"),
  "/promo": pendingScreen("쿠폰관리"),
  "/seller-notice": pendingScreen("공지사항"),
  "/support": pendingScreen("문의 관리"),
  "/seller-reviews": pendingScreen("리뷰 관리"),
  "/seller-ask": pendingScreen("1:1 문의"),
  "/store": pendingScreen("스토어 정보 · 설정"),
  "/ops-calendar": pendingScreen("공휴일 관리"),

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
];

/** 없는 경로 — 화면 목록(본사와 같다) */
const FALLBACK = SellerScreenIndexPage;

export function SellerApp() {
  const [navOpen, setNavOpen] = useState(true);
  const pathname = usePathname();

  /* 상세에서도 GNB 는 부모 항목이 선택된 채로 남는다(본사와 같다) */
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
