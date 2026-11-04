import {
  CalendarCheck,
  CalendarOff,
  CalendarRange,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Package,
  PackagePlus,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  ScanSearch,
  Settings,
  ShoppingCart,
  Star,
  Ticket,
  Truck,
  Undo2,
  Wallet,
  XCircle,
} from "lucide-react";
import { Avatar, GnbBadge, Tag, type GnbSection } from "../components/ui";
import { UNITS } from "./seller/seed/orders.data";
/* 로고 에셋은 본사와 같다 — 같은 브랜드의 다른 계정이다(`gnbSections.tsx` 주석) */
import babycubeLogo from "../assets/babycube-logo.svg";
import babycubeSymbol from "../assets/babycube-symbol.svg";

/**
 * GNB 메뉴 구성 — BabyCube **입점사(셀러) 어드민**.
 *
 * ## ⚠️ 원본 `SCREEN_MAP` 에서 그대로 뽑았다 — 임의로 재편하지 말 것
 *
 * 원본 = 기획 저장소 `rentmall-planning` `apps/admin-seller/index.html` v0.4 (2131~2206행).
 * `menu:true` 항목만 사이드바에 나온다 → **8그룹 · 27항목**(화면 26 + 「상품 등록」). 순서·라벨 원본 그대로.
 *
 * - 「배송 관리」·「취소 관리」·「반품 관리」는 **판매·렌트 두 그룹에 같은 이름으로** 있다(원본 그대로).
 *   그룹 라벨이 둘을 가른다.
 * - 항목 id = 경로 = 셀러 개발 저장소(`babycube-admin-seller`)의 App Router 경로.
 *   「상품 등록」의 정본 경로는 `/product-new` 다(그 저장소의 `/products/new` 는 여기로 넘긴다).
 * - 아이콘은 본사와 같은 기능이면 **본사와 같은 아이콘**을 쓴다(톤 통일) — 쿠폰·공지·리뷰·문의·공휴일·
 *   보증금·명세서·세금계산서·취소·반품·교환·상품·대시보드.
 *
 * 처리 대기 배지 = 원본 `NAV_BADGE`(2113~2123행) + 보증금 내역 `TODO.rentOverdue`(2109행) — 아래 `NAV_COUNTS`.
 */

/**
 * 처리 대기 배지 — 원본 식 그대로, **원본 시드에서 센다.** 각 메뉴의 「첫 처리 대기」 상태 1종만 센다
 * (원본 주석: 대시보드 「오늘 처리할 일」과 별개). 클레임은 신청 첫 단계(`RMA_MAIN[유형][0]`)만.
 * 배송 관리(판매·렌트)는 원본도 배지가 없다.
 *
 * ⚠️ 원본은 `u.stat` 을 그대로 본다 — 처리단위 중 `stat` 없이 `flow` 만 가진 건(전체 주문 목록 커버리지용)은
 * 세지 않는다. 원본과 숫자를 맞추려고 같은 식을 쓴다.
 */
const sale = UNITS.filter((u) => u.type === "판매");
const rent = UNITS.filter((u) => u.type === "렌트");
const claimFirst = (
  units: typeof UNITS,
  type: "취소" | "반품" | "교환",
  first: string,
) => units.filter((u) => u.req?.type === type && u.req.stat === first).length;

export const NAV_COUNTS = {
  saleProc: sale.filter((u) => u.stat === "신규 주문").length,
  saleCancel: claimFirst(sale, "취소", "취소 요청"),
  saleReturn: claimFirst(sale, "반품", "반품 신청"),
  saleExchange: claimFirst(sale, "교환", "교환 신청"),
  rentList: rent.filter((u) => u.stat === "신규 주문").length,
  rentUse: rent.filter((u) => u.stat === "연체중").length,
  rentInspReturn: rent.filter((u) => u.stat === "수거 신청").length,
  rentCancel: claimFirst(rent, "취소", "취소 요청"),
  rentRma: claimFirst(rent, "반품", "반품 신청"),
  /* 보증금 내역 — 원본 `TODO.rentOverdue`: 연체료가 있거나 검수 결과가 파손·분실인 렌트 */
  rentDeposit: rent.filter(
    (u) =>
      (u.od ?? 0) > 0 || /^파손/.test(u.inspect ?? "") || u.inspect === "분실",
  ).length,
};

/** 숫자만 보이고 스크린리더에는 「처리 대기 N건」(본사와 같다). 0 이면 두지 않는다 */
const todoBadge = (n: number) =>
  n > 0 ? (
    <GnbBadge tone="count">
      <span className="sr-only">{" 처리 대기 "}</span>
      {n}
      <span className="sr-only">건</span>
    </GnbBadge>
  ) : undefined;

/** GNB 아이콘은 §23-3 실측대로 20px · stroke 1.2 */
const navIcon = (Icon: typeof ShoppingCart) => (
  <Icon size={20} strokeWidth={1.2} aria-hidden />
);

/**
 * 로고 슬롯 — 본사와 같은 형태(워드마크 + 계정 칩), 칩 글자만 「입점사」(원본 `.sb-logo small`).
 * 칩 색이 본사와 같은 이유: 칩은 "지금 어느 계정인가"를 알리는 자리이고 계정은 상태가 아니다 —
 * 상태색을 쓰지 않는 규칙이 같다(`gnbSections.tsx` 주석).
 */
export const SELLER_GNB_LOGO_SLOTS = {
  logo: (
    <span className="flex items-center gap-2">
      <img
        src={babycubeLogo}
        alt="BabyCube"
        className="block w-(--size-gnb-logo) shrink-0"
      />
      <Tag
        tone="custom"
        size="small"
        style={{
          "--tag-bg-color": "var(--color-surface-inverse)",
          "--tag-color": "var(--color-text-inverse)",
        }}
      >
        입점사
      </Tag>
    </span>
  ),
  collapsed: <img src={babycubeSymbol} alt="" className="block size-6" />,
};

/**
 * 앱 크롬 — 페이지 헤더 우측 계정.
 *
 * 원본은 사이드바 로고 아래 **스토어 상자**(「리틀베이비 / 김유진 대표」)와 탑바 우측(「김유진 대표」)에
 * 나눠 적는다. 본사 퍼블은 로고 아래 줄을 두지 않고 헤더 한 곳에 「이름 / 역할」 두 줄로 모았다
 * (메뉴 위가 뜸해지지 않게 — `gnbSections.tsx`). 톤을 맞추려고 같은 자리·같은 꼴로 두고,
 * 두 번째 줄에 **스토어명**을 넣어 원본 스토어 상자의 정보를 잃지 않는다.
 */
export const SELLER_APP_CHROME = {
  headerAccount: (
    <div className="flex items-center gap-2">
      <Avatar name="김유진" size="medium" />
      <span className="flex flex-col">
        <span className="label-medium-bold text-text">김유진</span>
        <span className="body-small text-text-sub">리틀베이비 대표</span>
      </span>
    </div>
  ),
};

/**
 * 원본 8그룹.
 * 그룹 「대시보드」는 라벨을 비운다 — 그룹명이 유일한 항목명과 같아 같은 글자가 두 줄 겹친다(본사와 같은 처리).
 */
export const SELLER_GNB_SECTIONS: GnbSection[] = [
  {
    id: "g-dashboard",
    items: [{ id: "/", label: "대시보드", icon: navIcon(LayoutDashboard) }],
  },
  {
    id: "g-products",
    label: "상품 관리",
    items: [
      { id: "/products", label: "상품 관리", icon: navIcon(Package) },
      { id: "/product-new", label: "상품 등록", icon: navIcon(PackagePlus) },
    ],
  },
  {
    id: "g-sale",
    label: "판매 관리",
    items: [
      {
        id: "/sale-orders",
        label: "주문 통합 관리",
        icon: navIcon(ShoppingCart),
      },
      {
        id: "/sale-proc",
        label: "발주 관리",
        icon: navIcon(ClipboardList),
        badge: todoBadge(NAV_COUNTS.saleProc),
      },
      { id: "/shipping", label: "배송 관리", icon: navIcon(Truck) },
      {
        id: "/sale-cancel",
        label: "취소 관리",
        icon: navIcon(XCircle),
        badge: todoBadge(NAV_COUNTS.saleCancel),
      },
      {
        id: "/sale-return",
        label: "반품 관리",
        icon: navIcon(Undo2),
        badge: todoBadge(NAV_COUNTS.saleReturn),
      },
      {
        id: "/sale-exchange",
        label: "교환 관리",
        icon: navIcon(RefreshCw),
        badge: todoBadge(NAV_COUNTS.saleExchange),
      },
    ],
  },
  {
    id: "g-rent",
    label: "렌트 관리",
    items: [
      {
        id: "/rent-orders",
        label: "렌트 주문 통합 관리",
        icon: navIcon(CalendarRange),
      },
      {
        id: "/rent-list",
        label: "렌트 발주 관리",
        icon: navIcon(CalendarCheck),
        badge: todoBadge(NAV_COUNTS.rentList),
      },
      { id: "/rent-dispatch", label: "배송 관리", icon: navIcon(Truck) },
      {
        id: "/rent-use",
        label: "대여·연체 관리",
        icon: navIcon(Clock),
        badge: todoBadge(NAV_COUNTS.rentUse),
      },
      {
        id: "/rent-insp-return",
        label: "검수·반납 관리",
        icon: navIcon(ScanSearch),
        badge: todoBadge(NAV_COUNTS.rentInspReturn),
      },
      {
        id: "/rent-cancel",
        label: "취소 관리",
        icon: navIcon(XCircle),
        badge: todoBadge(NAV_COUNTS.rentCancel),
      },
      {
        id: "/rent-rma",
        label: "반품 관리",
        icon: navIcon(Undo2),
        badge: todoBadge(NAV_COUNTS.rentRma),
      },
    ],
  },
  {
    id: "g-settle",
    label: "정산 관리",
    items: [
      { id: "/settle-own", label: "매출 정산", icon: navIcon(Wallet) },
      {
        id: "/rent-deposit",
        label: "보증금 내역",
        icon: navIcon(PiggyBank),
        badge: todoBadge(NAV_COUNTS.rentDeposit),
      },
      {
        id: "/settle-statement",
        label: "정산 내역/명세서",
        icon: navIcon(FileText),
      },
      {
        id: "/settle-tax",
        label: "세금계산서·증빙",
        icon: navIcon(ReceiptText),
      },
    ],
  },
  {
    id: "g-marketing",
    label: "마케팅",
    items: [{ id: "/promo", label: "쿠폰관리", icon: navIcon(Ticket) }],
  },
  {
    id: "g-board",
    label: "게시판 관리",
    items: [
      { id: "/seller-notice", label: "공지사항", icon: navIcon(Megaphone) },
      { id: "/support", label: "문의 관리", icon: navIcon(MessageSquare) },
      { id: "/seller-reviews", label: "리뷰 관리", icon: navIcon(Star) },
      { id: "/seller-ask", label: "1:1 문의", icon: navIcon(MessageCircle) },
    ],
  },
  {
    id: "g-system",
    label: "시스템·운영 관리",
    items: [
      { id: "/store", label: "스토어 정보 · 설정", icon: navIcon(Settings) },
      { id: "/ops-calendar", label: "공휴일 관리", icon: navIcon(CalendarOff) },
    ],
  },
  /* 저장소 색인 — 원본에 없는 항목(본사와 같다). 이식할 때 이 섹션과 화면 목록을 함께 걷어낸다 */
  {
    id: "g-repo",
    label: "저장소",
    items: [{ id: "/screens", label: "화면 목록", icon: navIcon(LayoutGrid) }],
  },
];
