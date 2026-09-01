import {
  AppWindow,
  CalendarCheck,
  CalendarOff,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Code2,
  Coins,
  FileText,
  FolderTree,
  GraduationCap,
  Images,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquare,
  Package,
  PiggyBank,
  Receipt,
  ReceiptText,
  RefreshCw,
  Ruler,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Stethoscope,
  Store,
  Ticket,
  Undo2,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { CHARTON_ROUTES, TEMPLATE_ROUTES } from "./routes";

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
 * ## `origin` 이 이 화면의 존재 이유다
 * `template` 4개와 생성물을 **나란히** 두어, 같은 템플릿에서 나온 짝을
 * 눈으로 비교하게 한다 — "도메인만 갈아입었는가"가 그 자리에서 드러난다.
 * ---------------------------------------------------------------------- */

export type ScreenType = "목록형" | "상세형" | "통계형" | "폼형";
export type ScreenOrigin = "template" | "generated" | "babycube" | "classon";

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
  /* ── 손으로 만든 템플릿 4종 ── */
  {
    navId: TEMPLATE_ROUTES.dashboard,
    name: "대시보드",
    type: "통계형",
    origin: "template",
    summary: "핵심 지표 4장 + 추이·구성비·순위",
    file: "DashboardPage.tsx",
    icon: LayoutDashboard,
  },
  {
    navId: TEMPLATE_ROUTES.orders,
    name: "주문 관리",
    type: "목록형",
    origin: "template",
    summary: "필터·검색·기간으로 좁히고 행을 열어 처리",
    file: "OrderListPage.tsx",
    icon: ShoppingCart,
  },
  {
    navId: TEMPLATE_ROUTES.orderDetail,
    name: "주문 상세",
    type: "상세형",
    origin: "template",
    summary: "한 건을 정보·상품·결제·배송으로 나눠 제시",
    file: "OrderDetailPage.tsx",
    entryNote: "GNB 에 없다 — 주문 관리에서 행을 열어 들어간다",
    icon: Receipt,
  },
  {
    navId: TEMPLATE_ROUTES.productNew,
    name: "상품 등록",
    type: "폼형",
    origin: "template",
    summary: "섹션으로 나눈 입력 폼 · 검증 · 조건부 필드",
    file: "ProductFormPage.tsx",
    icon: FileText,
  },

  /* ── 차트온(병·의원 예약 관리)에서 생성된 4종 ── */
  {
    navId: CHARTON_ROUTES.clinicStatus,
    name: "진료 현황",
    type: "통계형",
    origin: "generated",
    summary: "예약 지표 + 진료과 구성비 · 시간대 분포",
    file: "ClinicStatusPage.tsx",
    icon: Stethoscope,
  },
  {
    navId: CHARTON_ROUTES.reservations,
    name: "예약 목록",
    type: "목록형",
    origin: "generated",
    summary: "상태·기간·진료과로 조회하고 노쇼·취소 처리",
    file: "ReservationListPage.tsx",
    icon: CalendarCheck,
  },
  {
    navId: CHARTON_ROUTES.reservationDetail,
    name: "예약 상세",
    type: "상세형",
    origin: "generated",
    summary: "예약 한 건의 환자·진료·수납 내역",
    file: "ReservationDetailPage.tsx",
    entryNote: "GNB 에 없다 — 예약 목록에서 행을 열어 들어간다",
    icon: ClipboardList,
  },
  {
    navId: CHARTON_ROUTES.patientNew,
    name: "환자 등록",
    type: "폼형",
    origin: "generated",
    summary: "인적사항·연락처·보험·동의 입력",
    file: "PatientFormPage.tsx",
    icon: UserPlus,
  },

  /* ── 클래스온(온라인 강의 플랫폼)에서 생성된 2종 ──
   *
   * 기획서 route 는 `/` 와 `/students` 인데 `/` 를 BabyCube 가 쓰고 있어
   * 차트온과 같은 방식으로 `/_classon` 접두사를 붙였다.
   */
  {
    navId: "/_classon/dashboard",
    name: "운영 대시보드",
    type: "통계형",
    origin: "classon",
    summary: "수강 지표 4장 + 수강 추이 · 강의별 완주율 막대",
    file: "classon/OpsDashboardPage.tsx",
    icon: LineChart,
  },
  {
    navId: "/_classon/students",
    name: "수강생 관리",
    type: "목록형",
    origin: "classon",
    summary: "상태 건수로 걸러 조회하고 선택해 독려 메일 발송",
    file: "classon/StudentListPage.tsx",
    icon: GraduationCap,
  },

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
    summary: "상태·가입기간으로 조회하고 이용 정지/해제",
    file: "babycube/MemberListPage.tsx",
    icon: Users,
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
    navId: "/products",
    name: "상품 관리",
    type: "목록형",
    origin: "babycube",
    summary: "23열 상품 목록 + 승인/반려 + 반려 사유 모달",
    file: "babycube/ProductListPage.tsx",
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
    summary: "월령 구간별 단계 · 구간 겹침 검증이 붙은 등록 모달",
    file: "babycube/GrowthStageListPage.tsx",
    icon: Ruler,
  },
  {
    navId: "/orders-all",
    name: "주문 목록",
    type: "목록형",
    origin: "babycube",
    summary: "렌트·판매 주문 27열 · 처리단위 기준 조회",
    file: "babycube/OrderListPage.tsx",
    icon: ShoppingCart,
  },
  {
    navId: "/orders-cancel",
    name: "취소 목록",
    type: "목록형",
    origin: "babycube",
    summary: "취소 요청 → 환불 완료 처리",
    file: "babycube/OrderCancelListPage.tsx",
    icon: XCircle,
  },
  {
    navId: "/orders-return",
    name: "반품 목록",
    type: "목록형",
    origin: "babycube",
    summary: "반품 신청 → 수거 → 검수 판정 → 완료",
    file: "babycube/OrderReturnListPage.tsx",
    icon: Undo2,
  },
  {
    navId: "/orders-exchange",
    name: "교환 목록",
    type: "목록형",
    origin: "babycube",
    summary: "교환 신청 → 수거 → 검수 → 재배송 → 완료",
    file: "babycube/OrderExchangeListPage.tsx",
    icon: RefreshCw,
  },
  {
    navId: "/settle-seller",
    name: "셀러 정산",
    type: "목록형",
    origin: "babycube",
    summary: "회차×셀러 지급액을 여섯 조각으로 쪼개 제시",
    file: "babycube/SellerSettlementPage.tsx",
    icon: Wallet,
  },
  {
    navId: "/rent-deposit",
    name: "보증금 내역",
    type: "목록형",
    origin: "babycube",
    summary: "점유중 → 환급/차감 추적 · 상태 대시가 곧 필터",
    file: "babycube/RentDepositListPage.tsx",
    icon: PiggyBank,
  },
  {
    navId: "/care-claims",
    name: "안심케어 승인",
    type: "목록형",
    origin: "babycube",
    summary: "복원비 청구 일괄 심사 · 행 선택 + SelectionBar",
    file: "babycube/CareClaimListPage.tsx",
    icon: ShieldCheck,
  },
  {
    navId: "/settle-statement",
    name: "정산 내역·명세서",
    type: "목록형",
    origin: "babycube",
    summary: "확정 정산을 명세서 단위로 · 자체/입점사 축",
    file: "babycube/SettlementStatementPage.tsx",
    icon: FileText,
  },
  {
    navId: "/settle-tax",
    name: "세금계산서·증빙",
    type: "목록형",
    origin: "babycube",
    summary: "수수료 세금계산서 발행 상태 관리 · 세액 자동 계산",
    file: "babycube/TaxInvoiceListPage.tsx",
    icon: ReceiptText,
  },
  {
    navId: "/promo",
    name: "쿠폰 관리",
    type: "목록형",
    origin: "babycube",
    summary: "접이식 필터 + 적용 조건 요약 · 기한 없음 표기",
    file: "babycube/CouponListPage.tsx",
    icon: Ticket,
  },
  {
    navId: "/points",
    name: "포인트 관리",
    type: "목록형",
    origin: "babycube",
    summary: "회원별 보유·누적 지급·누적 차감 포인트",
    file: "babycube/PointListPage.tsx",
    icon: Coins,
  },
  {
    navId: "/notices",
    name: "공지사항 관리",
    type: "목록형",
    origin: "babycube",
    summary: "고객·셀러 공지를 칩으로 갈라 관리 · 고정 배지",
    file: "babycube/NoticeListPage.tsx",
    icon: Megaphone,
  },
  {
    navId: "/faq-admin",
    name: "FAQ 관리",
    type: "목록형",
    origin: "babycube",
    summary: "카테고리 태그 + 행 선택 삭제",
    file: "babycube/FaqListPage.tsx",
    icon: CircleHelp,
  },
  {
    navId: "/reviews-admin",
    name: "리뷰 관리",
    type: "목록형",
    origin: "babycube",
    summary: "답글 대기/완료 대시 클릭 필터 · 별점 표기",
    file: "babycube/ReviewListPage.tsx",
    icon: Star,
  },
  {
    navId: "/support",
    name: "문의 관리",
    type: "목록형",
    origin: "babycube",
    summary: "고객·셀러 문의 탭 + 미답변 요약",
    file: "babycube/SupportListPage.tsx",
    icon: MessageSquare,
  },
  {
    navId: "/display",
    name: "배너 관리",
    type: "목록형",
    origin: "babycube",
    summary: "노출 순서·기간·상태 + 등록 모달 + 선택 삭제",
    file: "babycube/BannerListPage.tsx",
    icon: Images,
  },
  {
    navId: "/popups",
    name: "팝업 관리",
    type: "목록형",
    origin: "babycube",
    summary: "사용자 화면 팝업의 노출 기간(상시/기간 지정)",
    file: "babycube/PopupListPage.tsx",
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
