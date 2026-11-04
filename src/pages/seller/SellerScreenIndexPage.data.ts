import {
  CalendarCheck,
  CalendarOff,
  CalendarRange,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
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

/* -------------------------------------------------------------------------
 * 셀러 화면 목록의 **데이터 층** — 본사 `ScreenIndexPage.data.ts` 와 같은 성격(서비스 도메인이 아니라
 * 「이 앱에 어떤 화면이 있는가」라는 메타데이터).
 *
 * ## 원본
 * 기획 저장소 `apps/admin-seller/index.html` v0.4 의 `SCREEN_MAP`(menu:true 27항목) ·
 * `SCREEN_IDS`(화면 코드 SO-*) · 주석 `screen.<id>` 「기능 개요」 첫 줄.
 * 주석이 없는 6화면(주문 통합·렌트 주문 통합·공지·리뷰·1:1 문의·공휴일)은 원본 `SCREEN_MAP` 옆 주석에서 옮겼다.
 *
 * ## 화면을 만들면 여기도 고친다
 * `file` 은 화면 파일이 생긴 뒤에 채운다 — 비어 있으면 화면 목록 카드에 「퍼블 작업 전」이 뜬다.
 * 상세·등록 화면도 만들 때 여기 추가한다(본사 목록과 같은 방식).
 * ---------------------------------------------------------------------- */

export type SellerScreenType = "목록형" | "상세형" | "통계형" | "폼형";

export interface SellerScreenEntry {
  /** `SellerApp.tsx` 의 경로 키 = URL = 셀러 개발 저장소 App Router 경로 */
  navId: string;
  /** 원본 화면 코드(`SCREEN_IDS`). 원본에 없으면 비운다 */
  code?: string;
  name: string;
  type: SellerScreenType;
  summary: string;
  /** `src/pages/` 기준 화면 파일. 만들기 전이면 없다 */
  file?: string;
  icon: typeof LayoutDashboard;
}

export const SELLER_SCREENS: SellerScreenEntry[] = [
  {
    navId: "/",
    code: "SO-SYS-001",
    name: "대시보드",
    type: "통계형",
    summary:
      "내 스토어의 상품·주문·렌트·정산 현황을 한눈에 보고, 각 위젯에서 운영 화면으로 진입하는 시작 화면",
    file: "seller/SellerDashboardPage.tsx",
    icon: LayoutDashboard,
  },
  {
    navId: "/products",
    code: "SO-PRD-001",
    name: "상품 관리",
    type: "목록형",
    summary: "내 스토어에 등록한 상품을 조회·수정하고 가격을 관리하는 화면",
    file: "seller/ProductsPage.tsx",
    icon: Package,
  },
  {
    navId: "/products/P-001",
    code: "SO-PRD-002",
    name: "상품 상세 (수정)",
    type: "상세형",
    summary:
      "등록 폼의 수정 모드 — 11구역 · 반려 건은 [재심사 요청] · 임시저장 초안은 [임시저장]",
    file: "seller/ProductFormPage.tsx",
    icon: Package,
  },
  {
    navId: "/product-new",
    code: "SO-PRD-003",
    name: "상품 등록",
    type: "폼형",
    summary: "신규 상품을 섹션형 폼으로 등록하는 화면",
    file: "seller/ProductFormPage.tsx",
    icon: PackagePlus,
  },
  {
    navId: "/sale-orders",
    code: "SO-ORD-003",
    name: "주문 통합 관리",
    type: "목록형",
    summary:
      "판매 주문 전체 조회 창구 — 조회 전용, 상태 변경은 각 처리 메뉴에서만 한다",
    file: "seller/SaleOrdersPage.tsx",
    icon: ShoppingCart,
  },
  {
    navId: "/order-details/20260705880011",
    code: "SO-ORD-002",
    name: "주문 상세(통합)",
    type: "상세형",
    summary:
      "결제 한 건의 처리단위 표 · 주문 정보(결제상태) · 결제 요약 — 원본 orderDetail",
    file: "seller/OrderDetailsPage.tsx",
    icon: ShoppingCart,
  },
  {
    navId: "/sale-proc",
    code: "SO-ORD-001",
    name: "발주 관리",
    type: "목록형",
    summary: "신규 판매 주문 접수부터 배송 준비 단계를 처리하는 화면",
    file: "seller/SaleProcPage.tsx",
    icon: ClipboardList,
  },
  /* 상세형은 GNB 항목이 아니다 — 목록에서 주문번호를 눌러 들어간다. 색인은 대표 처리단위로 연다 */
  {
    navId: "/sale-proc/20260623864962-1",
    code: "SO-ORD-002",
    name: "발주 관리 상세",
    type: "상세형",
    summary:
      "판매 처리단위 하나의 주문·상품·배송·배송지·이력 — 상태 변경·송장 등록·배송지 변경·주문 취소",
    file: "seller/SaleOrderDetailPage.tsx",
    icon: ClipboardList,
  },
  {
    navId: "/shipping",
    code: "SO-DLV-001",
    name: "배송 관리",
    type: "목록형",
    summary: "판매 주문의 배송중~구매확정 단계를 관리하는 화면",
    file: "seller/ShippingPage.tsx",
    icon: Truck,
  },
  {
    navId: "/shipping/20260622541158-1",
    code: "SO-DLV-002",
    name: "배송 관리 상세",
    type: "상세형",
    summary:
      "판매 처리단위 하나의 배송 진행 — 송장 수정 · 배송 완료 처리 · 배송 추적",
    file: "seller/ShippingDetailPage.tsx",
    icon: Truck,
  },
  {
    navId: "/sale-cancel",
    code: "SO-RMA-001",
    name: "취소 관리",
    type: "목록형",
    summary: "판매 주문의 취소 요청을 처리하는 화면",
    file: "seller/SaleClaimPages.tsx",
    icon: XCircle,
  },
  {
    navId: "/sale-cancel/20260628200061-1",
    code: "SO-RMA-002",
    name: "취소 상세",
    type: "상세형",
    summary: "취소 건의 신청 정보·환불 예정액 — 다음 단계 처리",
    file: "seller/SaleClaimDetailPage.tsx",
    icon: XCircle,
  },
  {
    navId: "/sale-return",
    code: "SO-RMA-003",
    name: "반품 관리",
    type: "목록형",
    summary: "판매 주문의 반품 신청을 접수·수거·검수·환불 처리하는 화면",
    file: "seller/SaleClaimPages.tsx",
    icon: Undo2,
  },
  {
    navId: "/sale-return/20260618360510-1",
    code: "SO-RMA-004",
    name: "반품 상세",
    type: "상세형",
    summary: "반품 건의 귀책·배송비 부담·환불 예정액 — 다음 단계 · 반려",
    file: "seller/SaleClaimDetailPage.tsx",
    icon: Undo2,
  },
  {
    navId: "/sale-exchange",
    code: "SO-RMA-005",
    name: "교환 관리",
    type: "목록형",
    summary: "판매 주문의 교환 신청을 접수·수거·검수·재배송 처리하는 화면",
    file: "seller/SaleClaimPages.tsx",
    icon: RefreshCw,
  },
  {
    navId: "/sale-exchange/20260617540318-1",
    code: "SO-RMA-006",
    name: "교환 상세",
    type: "상세형",
    summary: "교환 건의 귀책·배송비 부담 — 다음 단계 · 반려 · 재배송",
    file: "seller/SaleClaimDetailPage.tsx",
    icon: RefreshCw,
  },
  {
    navId: "/rent-orders",
    code: "SO-ORD-004",
    name: "렌트 주문 통합 관리",
    type: "목록형",
    summary:
      "렌트 주문 전체 조회 창구 — 판매 「주문 통합 관리」와 같은 역할·같은 규칙(조회 전용)",
    file: "seller/RentOrdersPage.tsx",
    icon: CalendarRange,
  },
  {
    navId: "/rent-list",
    code: "SO-RNT-001",
    name: "렌트 발주 관리",
    type: "목록형",
    summary: "신규 렌트 주문 접수부터 배송 준비 단계를 처리하는 화면",
    file: "seller/RentProcessPages.tsx",
    icon: CalendarCheck,
  },
  {
    navId: "/rent-list/20260624225758-1",
    code: "SO-RNT-002",
    name: "렌트 발주 관리 상세",
    type: "상세형",
    summary:
      "렌트 처리단위 하나의 주문·상품·출고 이미지·배송 — 송장 등록(출고 이미지 안내) · 배송지 변경 · 주문 취소",
    file: "seller/RentDetailPages.tsx",
    icon: CalendarCheck,
  },
  {
    navId: "/rent-dispatch",
    code: "SO-DLV-003",
    name: "배송 관리(렌트)",
    type: "목록형",
    summary: "렌트 주문의 배송중 단계를 관리하는 배송 전용 큐 화면",
    file: "seller/RentProcessPages.tsx",
    icon: Truck,
  },
  {
    navId: "/rent-dispatch/20260623452502-1",
    code: "SO-DLV-004",
    name: "배송 관리 상세(렌트)",
    type: "상세형",
    summary:
      "렌트 배송 진행 — 송장 수정 · 배송 완료 처리(대여 시작) · 배송 추적",
    file: "seller/RentDetailPages.tsx",
    icon: Truck,
  },
  {
    navId: "/rent-use",
    code: "SO-RNT-003",
    name: "대여·연체 관리",
    type: "목록형",
    summary: "대여중·대여중(연장)·연체 단계의 렌트 계약을 관리하는 화면",
    file: "seller/RentProcessPages.tsx",
    icon: Clock,
  },
  {
    navId: "/rent-use/20260623493905-1",
    code: "SO-RNT-005",
    name: "대여·연체 관리 상세",
    type: "상세형",
    summary: "대여 기간·반납 예정일·보증금 — 수거 송장 등록(수거 신청)",
    file: "seller/RentDetailPages.tsx",
    icon: Clock,
  },
  {
    navId: "/rent-insp-return",
    code: "SO-INS-001",
    name: "검수·반납 관리",
    type: "목록형",
    summary: "렌트 수거·검수·보증금 정산·반납을 한 화면에서 처리하는 실행 화면",
    file: "seller/RentProcessPages.tsx",
    icon: ScanSearch,
  },
  {
    navId: "/rent-insp-return/20260621138968-1",
    code: "SO-INS-002",
    name: "검수·반납 관리 상세",
    type: "상세형",
    summary:
      "검수 판정 · 보증금 정산(차감 · 환급 실행) · 안심케어 청구 · 상품 상태 이미지",
    file: "seller/RentDetailPages.tsx",
    icon: ScanSearch,
  },
  {
    navId: "/rent-cancel",
    code: "SO-RMA-007",
    name: "취소 관리(렌트)",
    type: "목록형",
    summary: "렌트 주문의 취소 요청을 처리하는 화면",
    file: "seller/RentProcessPages.tsx",
    icon: XCircle,
  },
  {
    navId: "/rent-cancel/20260623445120-1",
    code: "SO-RMA-010",
    name: "취소 상세(렌트)",
    type: "상세형",
    summary:
      "렌트 취소 건의 환불(결제금액 전액)과 보증금 반환 — 다음 단계 처리",
    file: "seller/RentDetailPages.tsx",
    icon: XCircle,
  },
  {
    navId: "/rent-rma",
    code: "SO-RMA-008",
    name: "반품 관리(렌트)",
    type: "목록형",
    summary: "렌트 주문의 반품 신청을 접수·수거·검수 처리하는 화면",
    file: "seller/RentProcessPages.tsx",
    icon: Undo2,
  },
  {
    navId: "/rent-rma/20260620338890-1",
    code: "SO-RMA-011",
    name: "반품 상세(렌트)",
    type: "상세형",
    summary:
      "렌트 반품 건의 귀책·보증금 반환(고객 귀책 배송비 보증금에서 차감) — 다음 단계 · 반려",
    file: "seller/RentDetailPages.tsx",
    icon: Undo2,
  },
  {
    navId: "/settle-own",
    code: "SO-STL-001",
    name: "매출 정산",
    type: "목록형",
    summary: "내 스토어의 확정 매출 정산 내역을 확인하는 화면",
    file: "seller/SettlePages.tsx",
    icon: Wallet,
  },
  {
    navId: "/settle-own/2026.06",
    code: "SO-STL-001",
    name: "매출 정산 상세",
    type: "상세형",
    summary:
      "2026.06 회차 지급 정보 · 정산 명세 · 거래 내역 · 정산 정책 — 확인·이의제기",
    file: "seller/SettlePages.tsx",
    icon: Wallet,
  },
  {
    navId: "/rent-deposit",
    code: "SO-STL-002",
    name: "보증금 내역",
    type: "목록형",
    summary:
      "렌트 보증금을 조회하는 예수금 원장 화면(반환 실행은 검수·반납 관리에서 수행)",
    file: "seller/RentDepositPages.tsx",
    icon: PiggyBank,
  },
  {
    navId: "/rent-deposit/20260618360509-1",
    code: "SO-STL-003",
    name: "보증금 내역 상세",
    type: "상세형",
    summary:
      "보증금 정보 · 정산 계산(보증금 − 차감 = 반환 예정액) · 처리 상태(조회 전용)",
    file: "seller/RentDepositPages.tsx",
    icon: PiggyBank,
  },
  {
    navId: "/settle-statement",
    code: "SO-STL-006",
    name: "정산 내역/명세서",
    type: "목록형",
    summary: "내 스토어의 월별 정산 명세서와 진행 상황을 확인하는 화면",
    file: "seller/SettlePages.tsx",
    icon: FileText,
  },
  {
    navId: "/settle-statement/2026.06",
    code: "SO-STL-006",
    name: "정산 명세서 상세",
    type: "상세형",
    summary:
      "명세서번호·지급 정보 · 정산 명세 · 거래 내역 · 정산 정책 — 확인·이의제기",
    file: "seller/SettlePages.tsx",
    icon: FileText,
  },
  {
    navId: "/settle-tax",
    code: "SO-STL-007",
    name: "세금계산서·증빙",
    type: "목록형",
    summary: "플랫폼 수수료에 대한 세금계산서를 수취·보관하는 화면",
    file: "seller/SettlePages.tsx",
    icon: ReceiptText,
  },
  {
    navId: "/promo",
    code: "SO-MKT-001",
    name: "쿠폰관리",
    type: "목록형",
    summary: "내 스토어가 발행한 쿠폰을 등록·수정·관리하는 화면",
    file: "seller/CouponPages.tsx",
    icon: Ticket,
  },
  {
    navId: "/promo/CP-2608-01",
    code: "SO-MKT-002",
    name: "쿠폰 상세 (수정)",
    type: "상세형",
    summary: "발행 쿠폰 수정 — 기본 정보 · 할인 내용 · 사용 기간 · 상태",
    file: "seller/CouponPages.tsx",
    icon: Ticket,
  },
  {
    navId: "/promo/new",
    code: "SO-MKT-002",
    name: "쿠폰 등록",
    type: "상세형",
    summary: "새 쿠폰 발행 — 등록 시 발행일 자동 기록",
    file: "seller/CouponPages.tsx",
    icon: Ticket,
  },
  {
    navId: "/seller-notice",
    code: "SO-CSC-002",
    name: "공지사항",
    type: "목록형",
    summary: "본사 공지를 받아 보는 화면 — 목록의 제목을 눌러 상세로",
    file: "seller/BoardPages.tsx",
    icon: Megaphone,
  },
  {
    navId: "/seller-notice/N-S26",
    code: "SO-CSC-006",
    name: "공지 상세",
    type: "상세형",
    summary: "본사 공지 읽기 — 고정 여부 · 게시일 · 내용",
    file: "seller/BoardDetailPages.tsx",
    icon: Megaphone,
  },
  {
    navId: "/support",
    code: "SO-CSC-001",
    name: "문의 관리",
    type: "목록형",
    summary: "내 상품 관련 고객 문의·신고를 처리하고 본사 공지를 확인하는 화면",
    file: "seller/BoardPages.tsx",
    icon: MessageSquare,
  },
  {
    navId: "/support/Q-8842",
    code: "SO-CSC-005",
    name: "문의 상세",
    type: "상세형",
    summary: "고객 문의 원문을 보며 답변 등록·수정 — 주문 문의는 주문번호",
    file: "seller/BoardDetailPages.tsx",
    icon: MessageSquare,
  },
  {
    navId: "/seller-reviews",
    code: "SO-CSC-003",
    name: "리뷰 관리",
    type: "목록형",
    summary: "내 상품 리뷰를 보고 상세에서 답글을 다는 화면",
    file: "seller/BoardPages.tsx",
    icon: Star,
  },
  {
    navId: "/seller-reviews/RV-31",
    code: "SO-CSC-007",
    name: "리뷰 상세",
    type: "상세형",
    summary: "리뷰 원문 · 별점을 보며 답글 등록·수정",
    file: "seller/BoardDetailPages.tsx",
    icon: Star,
  },
  {
    navId: "/seller-ask",
    code: "SO-CSC-004",
    name: "1:1 문의",
    type: "목록형",
    summary: "본사에 1:1 문의를 등록하고 답변을 확인하는 화면",
    file: "seller/BoardPages.tsx",
    icon: MessageCircle,
  },
  {
    navId: "/seller-ask/SQ-11",
    code: "SO-CSC-008",
    name: "1:1 문의 상세 (등록/수정)",
    type: "상세형",
    summary:
      "본사에 보낸 문의 수정 · 본사 답변 확인 · 새 문의는 /seller-ask/new",
    file: "seller/BoardDetailPages.tsx",
    icon: MessageCircle,
  },
  {
    navId: "/store",
    code: "SO-SEL-001",
    name: "스토어 정보 · 설정",
    type: "폼형",
    summary:
      "스토어 기본 정보·정산 계좌·배송 정책·본사 공통 정책·내 계정을 한 화면에서 관리하는 화면",
    file: "seller/SystemPages.tsx",
    icon: Settings,
  },
  {
    navId: "/ops-calendar",
    name: "공휴일 관리",
    type: "목록형",
    summary:
      "본사 등록 공휴일(수정 불가)을 보고 자사 휴무를 따로 등록하는 화면",
    file: "seller/SystemPages.tsx",
    icon: CalendarOff,
  },
];

/** 유형 칩 — 본사 목록과 같은 무채색 */
export const SELLER_TYPE_TONE = "default" as const;
