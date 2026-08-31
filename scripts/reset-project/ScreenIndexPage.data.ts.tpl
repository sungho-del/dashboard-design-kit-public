import {
  FileText,
  LayoutDashboard,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { TEMPLATE_ROUTES } from "./routes";

/* =========================================================================
 * 화면 목록의 데이터 — 이 저장소에 어떤 화면이 있는지의 단일 원천
 *
 * `npm run reset:project` 를 돌린 직후 상태라 **템플릿 4종만** 들어 있다.
 *
 * ## 화면을 추가할 때는 두 곳이다
 *
 * `App.tsx` 의 `ROUTES` 에만 넣고 이 배열을 빠뜨리면 화면은 열리는데
 * 목록에서 사라진다. 반대로 여기에만 넣으면 카드는 보이는데 눌러도 안 열린다.
 *
 * ## `origin` 이 이 화면의 존재 이유다
 *
 * 손으로 만든 템플릿과 Stage 5 가 만든 생성물을 **나란히** 보여주면
 * "도메인만 갈아입었는가"가 그 자리에서 드러난다. 새 화면은 `"generated"` 로 넣는다.
 * 항목이 하나도 없는 묶음은 화면에 그려지지 않는다.
 * ====================================================================== */

export type ScreenType = "목록형" | "상세형" | "통계형" | "폼형";
export type ScreenOrigin = "template" | "generated" | "classon" | "babycube";

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
];

export const TYPE_TONE = "default" as const;
