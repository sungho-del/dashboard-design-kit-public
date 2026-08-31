import { LayoutDashboard, LayoutGrid, Package, ShoppingCart } from "lucide-react";
import { Avatar, type GnbSection } from "../components/ui";
import { TEMPLATE_ROUTES } from "./routes";

/**
 * GNB 메뉴 구성 — **당신 서비스의 메뉴로 갈아끼울 자리다.**
 *
 * `npm run reset:project` 를 돌린 직후 상태라 템플릿 4종에 맞춘 최소 메뉴만 있다.
 *
 * ## 항목 id 가 곧 URL 이다
 *
 * `id` 에 경로를 그대로 넣는다(`/`, `/orders`, …). 그래서 GNB 선택 상태는
 * `activeId={pathname}` 한 줄이면 되고, **id↔경로 매핑표가 아예 없다.**
 * 매핑표를 따로 두면 한쪽만 고쳤을 때 조용히 어긋난다.
 *
 * ⚠️ 여기에 항목을 추가하면 `App.tsx` 의 `ROUTES` 에도 **같은 문자열**로 넣어야 한다.
 * 한쪽만 넣으면 메뉴는 보이는데 눌러도 화면 목록으로 떨어진다.
 *
 * ## 상세형은 여기에 넣지 않는다
 *
 * 상세 화면은 "어느 건"이 정해져야 열리므로 메뉴가 될 수 없다. 목록에서 행을 열어
 * 들어간다. 메뉴에 없다고 화면이 없는 것은 아니므로 **경로는 반드시 만든다.**
 */

/** GNB 아이콘은 §23-3 실측대로 20px · stroke 1.2 */
const navIcon = (Icon: typeof ShoppingCart) => (
  <Icon size={20} strokeWidth={1.2} aria-hidden />
);

/*
 * 로고 슬롯은 여기서 공유한다.
 * 페이지마다 따로 넘기면 **넘긴 화면에서만 로고가 보이고 나머지는 빈칸**이 된다.
 *
 * ⚠️ 객체로 묶는 이유: JSX 요소를 그대로 export 하면 eslint 의
 * `react-refresh/only-export-components` 가 이를 컴포넌트로 보고 경고한다.
 *
 * ## 브랜드 로고로 바꿀 때
 *
 * 이미지 파일을 `src/assets/` 에 두고 `<img src={로고} …>` 로 참조한다.
 * **인라인 SVG 로 넣지 말 것** — 로고 고유색이 TSX 안의 하드코딩 hex 가 되어
 * 토큰 규칙과 저장 훅(`check-design-tokens.mjs`)에 걸린다. `.svg` 안에 두면
 * 그 색은 에셋의 일부로 남는다. 프레임 규격은 §23-2 의 114 × 24.
 */
export const GNB_LOGO_SLOTS = {
  /** 확장(224) 상태 — 워드마크 자리 */
  logo: <span className="heading-medium-bold text-text">ADMIN</span>,
  /**
   * 축소(60) 상태 — 심볼 자리.
   *
   * `aria-hidden` 인 이유: 확장/축소는 같은 브랜드를 가리키고, GNB 는 이미
   * `<nav aria-label>` 로 이름이 있다. 또 이름을 주면 중복해서 읽힌다.
   */
  collapsed: (
    <span className="label-large-bold text-text" aria-hidden>
      A
    </span>
  ),
};

/**
 * GNB·헤더의 **앱 크롬 슬롯**. 로고와 같은 이유로 여기서 공유한다 —
 * 화면마다 직접 넣으면 넣은 화면에서만 보이고 나머지에서는 사라진다.
 */
export const APP_CHROME = {
  /**
   * 페이지 헤더 우측 — 로그인한 운영자.
   *
   * 이름과 역할이 둘 다 필요하다: 이름만으로는 **권한 범위**를 알 수 없고,
   * 역할만으로는 누가 로그인했는지 모른다.
   * `Avatar` 는 `name` 의 첫 글자를 이니셜로 쓴다.
   */
  headerAccount: (
    <div className="flex items-center gap-2">
      <Avatar name="관리자" size="medium" />
      {/* 두 줄이지만 한 덩이로 읽혀야 한다 */}
      <span className="flex flex-col">
        <span className="label-medium-bold text-text">관리자</span>
        <span className="body-small text-text-sub">운영 관리자</span>
      </span>
    </div>
  ),
};

/**
 * 메뉴 구성.
 *
 * ⚠️ **첫 섹션은 라벨을 비웠다.** 항목이 하나뿐인 그룹에 그룹명을 달면 같은 글자가
 * 두 줄 겹쳐 보인다("대시보드" 그룹 > "대시보드" 항목). 항목이 여럿인 그룹에서만
 * 그룹명이 제 역할을 한다.
 */
export const GNB_SECTIONS: GnbSection[] = [
  {
    id: "g-dashboard",
    items: [
      {
        id: TEMPLATE_ROUTES.dashboard,
        label: "대시보드",
        icon: navIcon(LayoutDashboard),
      },
    ],
  },
  {
    id: "g-orders",
    label: "주문 관리",
    items: [
      {
        id: TEMPLATE_ROUTES.orders,
        label: "주문 목록",
        icon: navIcon(ShoppingCart),
      },
    ],
  },
  {
    id: "g-products",
    label: "상품 관리",
    items: [
      {
        id: TEMPLATE_ROUTES.productNew,
        label: "상품 등록",
        icon: navIcon(Package),
      },
    ],
  },
  /*
   * 저장소 색인 — **서비스 메뉴가 아니다.** 만들어진 화면을 한자리에서 확인하는
   * 개발용 항목이라 맨 아래 따로 뒀다. 실제 제품으로 이식할 때는 이 섹션과
   * `ScreenIndexPage` 를 함께 걷어낸다.
   */
  {
    id: "g-repo",
    label: "저장소",
    items: [{ id: "/screens", label: "화면 목록", icon: navIcon(LayoutGrid) }],
  },
];
