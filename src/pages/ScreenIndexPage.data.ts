import {
  AppWindow,
  CalendarOff,
  CircleHelp,
  ClipboardCheck,
  Code2,
  Coins,
  FileText,
  FolderTree,
  Images,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  PiggyBank,
  ReceiptText,
  RefreshCw,
  Ruler,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  Undo2,
  UserRound,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

/* -------------------------------------------------------------------------
 * 화면 목록의 **데이터 층**.
 *
 * 다른 `*.data.ts` 와 성격이 다르다 — 여기 담긴 것은 서비스 도메인이 아니라
 * **이 저장소에 어떤 화면이 있는가** 라는 메타데이터다.
 *
 * ## 화면을 추가하면 여기도 추가한다
 * `App.tsx` 의 `SCREENS` 맵에만 넣고 이 배열을 빠뜨리면 목록에서 사라진다.
 * Stage 5(`@agent-screen-builder`)가 화면을 생성할 때도 이 배열에 등록해야 한다.
 *
 * ## 베이비큐브 화면만 둔다
 * 이 저장소는 베이비큐브 본사 어드민 전용이다(2026-10-15 전환). 화면 생성기의 원본인
 * 템플릿 4종은 `/_template/*` 경로로만 열리고 이 목록에는 없다. `origin` 은 묶음 이름표용이다.
 * ---------------------------------------------------------------------- */

export type ScreenType = "목록형" | "상세형" | "통계형" | "폼형";
export type ScreenOrigin = "babycube";

export interface ScreenEntry {
  /** `App.tsx` 의 `ROUTES` 맵 키(= URL 경로). 여기가 어긋나면 카드를 눌러도 안 열린다 */
  navId: string;
  name: string;
  type: ScreenType;
  origin: ScreenOrigin;
  /** 무엇을 하는 화면인가 — 한 줄 */
  summary: string;
  /** `src/pages/` 기준 파일명. 소스를 찾아가는 단서 */
  file: string;
  /** GNB 로 직접 갈 수 없는 화면이면 들어가는 경로를 적는다 */
  entryNote?: string;
  icon: typeof LayoutDashboard;
}

export const SCREENS: ScreenEntry[] = [
  /* ──────────────────────────────────────────────────────────────────
   * BabyCube 본사 운영 어드민 28종 (Stage 5)
   *
   * 유아용품 렌트·판매 멀티셀러 마켓플레이스. 실서비스 어드민을 기획서로 넣어
   * 만든 것이라 **28화면이 한 도메인으로 이어진다** — 위 두 묶음(4종씩)과 달리
   * 화면 간 숫자·상태 어휘가 서로 맞물린다.
   *
   * ⚠️ 원본에서 가져온 것은 **도메인 내용뿐**이다(화면 목록·컬럼명·상태 어휘·문구).
   * 색·레이아웃·간격·타이포는 100% 이 저장소의 토큰이다.
   * ────────────────────────────────────────────────────────────────── */
  {
    navId: "/",
    name: "대시보드",
    type: "통계형",
    origin: "babycube",
    summary: "회원·셀러·매출 지표 9타일 + 매출 추이 + 주문 상태 퍼널",
    file: "babycube/DashboardPage.tsx",
    icon: LayoutDashboard,
  },
  {
    navId: "/members",
    name: "회원 관리",
    type: "목록형",
    origin: "babycube",
    summary: "상태·가입기간으로 조회하고 이름을 눌러 상세로",
    file: "babycube/MemberListPage.tsx",
    icon: Users,
  },
  /*
   * 상세형은 GNB 항목이 아니다(목록의 하위 화면). 경로에 회원 id 가 붙으므로
   * 색인에서는 **대표 회원 하나**로 연다 — 차트온 `예약 상세`와 같은 방식이다.
   * id 가 이메일이라 `@` 가 들어가므로 여기에도 인코딩된 형태로 적는다.
   */
  {
    navId: `/members/${encodeURIComponent("sujin.park@example.com")}`,
    name: "회원 상세",
    type: "상세형",
    origin: "babycube",
    summary: "회원 한 명의 기본 정보·계정 상태·자녀·이용 이력",
    file: "babycube/MemberDetailPage.tsx",
    entryNote: "GNB 에 없다 — 회원 관리에서 이름이나 [상세] 를 눌러 들어간다",
    icon: UserRound,
  },
  {
    navId: "/sellers",
    name: "셀러 관리",
    type: "목록형",
    origin: "babycube",
    summary: "수수료율·상품수·평점·위생인증 조회 · 퇴점 처리",
    file: "babycube/SellerListPage.tsx",
    icon: Store,
  },
  /* 상세형은 GNB 항목이 아니다 — 목록에서 셀러명을 눌러 들어간다 */
  {
    navId: "/sellers/S-1042",
    name: "셀러 상세",
    type: "상세형",
    origin: "babycube",
    summary: "셀러 한 곳의 서류·운영 값(수수료율·위생인증)과 등록 상품",
    file: "babycube/SellerDetailPage.tsx",
    entryNote: "GNB 에 없다 — 셀러 관리에서 셀러명을 눌러 들어간다",
    icon: Store,
  },
  {
    navId: "/seller-review",
    name: "입점 심사",
    type: "목록형",
    origin: "babycube",
    summary: "입점 신청을 행 선택으로 골라 일괄 승인/반려",
    file: "babycube/SellerReviewPage.tsx",
    icon: ClipboardCheck,
  },
  {
    navId: "/seller-review/A-2026-0141",
    name: "입점 심사 상세",
    type: "상세형",
    origin: "babycube",
    summary: "신청 서류를 보고 수수료율을 정해 승인하거나 사유를 적어 반려",
    file: "babycube/SellerReviewDetailPage.tsx",
    entryNote: "GNB 에 없다 — 입점 심사에서 셀러명을 눌러 들어간다",
    icon: ClipboardCheck,
  },
  {
    navId: "/products",
    name: "상품 관리",
    type: "목록형",
    origin: "babycube",
    summary: "23열 상품 목록 + 승인/반려 + 반려 사유 모달",
    file: "babycube/ProductListPage.tsx",
    icon: Package,
  },
  {
    navId: "/products/BL240814",
    name: "상품 상세",
    type: "폼형",
    origin: "babycube",
    summary: "상품 한 개의 등록 정보 수정 · 본사 처분",
    file: "babycube/ProductDetailPage.tsx",
    entryNote: "GNB 에 없다 — 상품 관리에서 상품명을 눌러 들어간다",
    icon: Package,
  },
  {
    navId: "/categories",
    name: "카테고리 관리",
    type: "목록형",
    origin: "babycube",
    summary: "대·중·소 3단 트리 + 이름변경·삭제 모달",
    file: "babycube/CategoryListPage.tsx",
    icon: FolderTree,
  },
  {
    navId: "/stages",
    name: "성장단계 관리",
    type: "목록형",
    origin: "babycube",
    summary: "월령 구간별 단계 · 등록·수정 모달 · 삭제 시 '없음' 대체 안내",
    file: "babycube/GrowthStageListPage.tsx",
    icon: Ruler,
  },
  {
    navId: "/orders-all",
    name: "주문 목록",
    type: "목록형",
    origin: "babycube",
    summary:
      "렌트·판매 유형 카드 · 처리단위 기준 26열 · 주문번호·행 → 주문 상세",
    file: "babycube/OrderListPage.tsx",
    icon: ShoppingCart,
  },
  {
    navId: "/orders-all/U-R01",
    name: "주문 상세",
    type: "상세형",
    origin: "babycube",
    summary: "처리단위 하나의 주문·상품·배송·이력 · 주문 명세(조회 전용)",
    file: "babycube/OrderDetailPage.tsx",
    entryNote:
      "GNB 에 없다 — 주문 목록에서 주문번호나 행을 눌러 들어간다. 취소·반품·교환 상세도 이 화면이 맡는다",
    icon: ShoppingCart,
  },
  {
    navId: "/orders-cancel",
    name: "취소 목록",
    type: "목록형",
    origin: "babycube",
    summary: "주문 목록과 같은 틀 · 취소 클레임 처리단위 · 행 → 취소 상세",
    file: "babycube/OrderCancelListPage.tsx",
    icon: XCircle,
  },
  {
    navId: "/orders-return",
    name: "반품 목록",
    type: "목록형",
    origin: "babycube",
    summary:
      "주문 목록과 같은 틀 · 반품 클레임(수거·검수·거부·재반송) · 행 → 반품 상세",
    file: "babycube/OrderReturnListPage.tsx",
    icon: Undo2,
  },
  {
    navId: "/orders-exchange",
    name: "교환 목록",
    type: "목록형",
    origin: "babycube",
    summary: "주문 목록과 같은 틀 · 판매 전용 교환 클레임 · 행 → 교환 상세",
    file: "babycube/OrderExchangeListPage.tsx",
    icon: RefreshCw,
  },
  {
    navId: "/settle-seller",
    name: "셀러 정산",
    type: "목록형",
    origin: "babycube",
    summary:
      "2026년 9월 회차 · 요약 + 산출 내역 · 셀러별 지급완료/재발송 · 행 → 셀러 정산 상세",
    file: "babycube/SellerSettlementPage.tsx",
    icon: Wallet,
  },
  {
    navId: "/settle-seller/S-231",
    name: "셀러 정산 상세",
    type: "상세형",
    origin: "babycube",
    summary: "셀러 한 곳의 회차 산출 내역 · 정산 정보 · 거래 내역",
    file: "babycube/SellerSettlementDetailPage.tsx",
    entryNote: "GNB 에 없다 — 셀러 정산에서 행을 눌러 들어간다",
    icon: Wallet,
  },
  {
    navId: "/rent-deposit",
    name: "보증금 내역",
    type: "목록형",
    origin: "babycube",
    summary: "반납 이후 보증금 · 상태·차감·반환액 · 행 → 보증금 상세",
    file: "babycube/RentDepositListPage.tsx",
    icon: PiggyBank,
  },
  {
    navId: "/rent-deposit/U-R30",
    name: "보증금 상세",
    type: "상세형",
    origin: "babycube",
    summary: "보증금 정보 · 정산 계산 · 처리 상태(조회 전용)",
    file: "babycube/RentDepositDetailPage.tsx",
    entryNote: "GNB 에 없다 — 보증금 내역에서 행을 눌러 들어간다",
    icon: PiggyBank,
  },
  {
    navId: "/care-claims",
    name: "안심케어 승인",
    type: "목록형",
    origin: "babycube",
    summary: "접수·승인·반려 카드 · 접수 건 일괄 심사 · 행 → 청구 상세",
    file: "babycube/CareClaimListPage.tsx",
    icon: ShieldCheck,
  },
  {
    navId: "/care-claims/U-R28",
    name: "안심케어 청구 상세",
    type: "상세형",
    origin: "babycube",
    summary: "청구 근거 · 청구 심사(증빙 이미지) · 접수 건 승인/반려",
    file: "babycube/CareClaimDetailPage.tsx",
    entryNote: "GNB 에 없다 — 안심케어 승인에서 행을 눌러 들어간다",
    icon: ShieldCheck,
  },
  {
    navId: "/settle-statement",
    name: "정산 내역·명세서",
    type: "목록형",
    origin: "babycube",
    summary: "이번 회차 명세서(본사 1 + 셀러) · 행 → 명세서 상세",
    file: "babycube/SettlementStatementPage.tsx",
    icon: FileText,
  },
  {
    navId: "/settle-statement/STM-2609-0231",
    name: "정산 명세서 상세",
    type: "상세형",
    origin: "babycube",
    summary: "지급 정보 · 산출 내역 · 회차 거래 내역 · 정산 정책",
    file: "babycube/SettlementStatementDetailPage.tsx",
    entryNote: "GNB 에 없다 — 정산 내역/명세서에서 행을 눌러 들어간다",
    icon: FileText,
  },
  {
    navId: "/settle-tax",
    name: "세금계산서·증빙",
    type: "목록형",
    origin: "babycube",
    summary: "공급가액 = 셀러 정산 수수료 · [발행]/[다운로드]",
    file: "babycube/TaxInvoiceListPage.tsx",
    icon: ReceiptText,
  },
  {
    navId: "/promo",
    name: "쿠폰 관리",
    type: "목록형",
    origin: "babycube",
    summary: "쿠폰 원장 18건 · 사용/사용중지/만료 · 행 → 쿠폰 상세",
    file: "babycube/CouponListPage.tsx",
    icon: Ticket,
  },
  {
    navId: "/promo/CP-2610-01",
    name: "쿠폰 상세",
    type: "상세형",
    origin: "babycube",
    summary: "기본 정보 · 할인 내용 · 사용 기간 · 상태(조회 전용)",
    file: "babycube/CouponDetailPage.tsx",
    entryNote: "GNB 에 없다 — 쿠폰관리에서 행을 눌러 들어간다",
    icon: Ticket,
  },
  {
    navId: "/points",
    name: "포인트 관리",
    type: "목록형",
    origin: "babycube",
    summary: "포인트 원장에서 계산한 회원별 보유·누적 · 행 → 포인트 현황 상세",
    file: "babycube/PointListPage.tsx",
    icon: Coins,
  },
  {
    navId: `/points/${encodeURIComponent("chaewon.lim@example.com")}`,
    name: "포인트 현황 상세",
    type: "상세형",
    origin: "babycube",
    summary: "회원 정보 · 포인트 현황 · 이력(잔여 포인트) · 포인트 조정",
    file: "babycube/PointDetailPage.tsx",
    entryNote: "GNB 에 없다 — 포인트 관리에서 행을 눌러 들어간다",
    icon: Coins,
  },
  {
    navId: "/notices",
    name: "공지사항 관리",
    type: "목록형",
    origin: "babycube",
    summary: "고객/셀러 탭 · 게시/숨김 · 고정 배지 · 행 → 공지 등록/수정",
    file: "babycube/NoticeListPage.tsx",
    icon: Megaphone,
  },
  {
    navId: "/notices/new",
    name: "공지 등록/수정",
    type: "폼형",
    origin: "babycube",
    summary: "공지 내용 · 게시 설정(대상·노출·고정·기간)",
    file: "babycube/NoticeFormPage.tsx",
    entryNote:
      "GNB 에 없다 — 공지사항 관리에서 [+ 공지 작성]이나 행을 눌러 들어간다",
    icon: Megaphone,
  },
  {
    navId: "/faq-admin",
    name: "FAQ 관리",
    type: "목록형",
    origin: "babycube",
    summary: "카테고리 칩 · 행 선택 삭제 · 행 → FAQ 등록/수정",
    file: "babycube/FaqListPage.tsx",
    icon: CircleHelp,
  },
  {
    navId: "/faq-admin/new",
    name: "FAQ 등록/수정",
    type: "폼형",
    origin: "babycube",
    summary: "카테고리 · 질문 · 답변",
    file: "babycube/FaqFormPage.tsx",
    entryNote: "GNB 에 없다 — FAQ 관리에서 [FAQ 추가]나 행을 눌러 들어간다",
    icon: CircleHelp,
  },
  {
    navId: "/reviews-admin",
    name: "리뷰 관리",
    type: "목록형",
    origin: "babycube",
    summary: "노출/숨김 · 별점 · 행 → 리뷰 상세(숨김 처리·복원)",
    file: "babycube/ReviewListPage.tsx",
    icon: Star,
  },
  {
    navId: "/reviews-admin/RV-30",
    name: "리뷰 상세",
    type: "상세형",
    origin: "babycube",
    summary: "리뷰 정보 · 노출 관리(숨김 사유 · 복원)",
    file: "babycube/ReviewDetailPage.tsx",
    entryNote: "GNB 에 없다 — 리뷰 관리에서 행을 눌러 들어간다",
    icon: Star,
  },
  {
    navId: "/support",
    name: "문의 관리",
    type: "목록형",
    origin: "babycube",
    summary: "고객(미답변·답변완료)/셀러 문의 탭 · 행 → 문의 상세(답변)",
    file: "babycube/SupportListPage.tsx",
    icon: MessageSquare,
  },
  {
    navId: "/support/Q-8841",
    name: "문의 상세",
    type: "상세형",
    origin: "babycube",
    summary: "고객·셀러 문의 정보와 답변 작성",
    file: "babycube/SupportDetailPage.tsx",
    entryNote: "GNB 에 없다 — 문의 관리에서 행을 눌러 들어간다",
    icon: MessageSquare,
  },
  {
    navId: "/display",
    name: "배너 관리",
    type: "목록형",
    origin: "babycube",
    summary: "노출 순서 정렬 · 게시/숨김 · 선택 삭제 · 행 → 배너 등록/수정",
    file: "babycube/BannerListPage.tsx",
    icon: Images,
  },
  {
    navId: "/display/new",
    name: "배너 등록/수정",
    type: "폼형",
    origin: "babycube",
    summary: "제목 · PC/모바일 이미지 · 노출 기간 · 노출 순서 · 노출 여부",
    file: "babycube/DisplayFormPage.tsx",
    entryNote: "GNB 에 없다 — 배너 관리에서 [배너 등록]이나 행을 눌러 들어간다",
    icon: Images,
  },
  {
    navId: "/popups",
    name: "팝업 관리",
    type: "목록형",
    origin: "babycube",
    summary: "글 팝업 · 게시/숨김 · 선택 삭제 · 행 → 팝업 등록/수정",
    file: "babycube/PopupListPage.tsx",
    icon: AppWindow,
  },
  {
    navId: "/popups/new",
    name: "팝업 등록/수정",
    type: "폼형",
    origin: "babycube",
    summary:
      "제목 · 내용(HTML 원문) · 노출 기간 · 노출 여부 — 배너와 같은 화면",
    file: "babycube/DisplayFormPage.tsx",
    entryNote: "GNB 에 없다 — 팝업 관리에서 [팝업 등록]이나 행을 눌러 들어간다",
    icon: AppWindow,
  },
  {
    navId: "/ops-calendar",
    name: "공휴일 관리",
    type: "목록형",
    origin: "babycube",
    summary: "휴무일 등록 → 대여 불가일 반영 · 종료일 비우면 하루",
    file: "babycube/HolidayListPage.tsx",
    icon: CalendarOff,
  },
  {
    navId: "/terms-admin",
    name: "약관 관리",
    type: "폼형",
    origin: "babycube",
    summary: "좌 목록에서 문서 선택 · 우 편집기에서 본문 저장",
    file: "babycube/TermsAdminPage.tsx",
    icon: ScrollText,
  },
  {
    navId: "/scripts",
    name: "스크립트 관리",
    type: "폼형",
    origin: "babycube",
    summary: "헤더·바디·푸터 스크립트 + 하단 고정 저장 바",
    file: "babycube/ScriptSettingsPage.tsx",
    icon: Code2,
  },
  {
    navId: "/settings",
    name: "설정",
    type: "폼형",
    origin: "babycube",
    summary: "고객센터·사업자 정보 · 섹션 접기 + 필수 표시",
    file: "babycube/SettingsPage.tsx",
    icon: Settings,
  },
];

/** 유형별 Tag tone — 유형은 상태가 아니라 분류라 전부 중립색을 쓴다 */
export const TYPE_TONE = "default" as const;
