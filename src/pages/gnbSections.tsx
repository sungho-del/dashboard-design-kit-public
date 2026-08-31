import {
  AppWindow,
  CalendarOff,
  CircleHelp,
  ClipboardCheck,
  Code2,
  Coins,
  FileText,
  FolderTree,
  GraduationCap,
  Images,
  LayoutDashboard,
  LayoutGrid,
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
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { Avatar, Tag, type GnbSection } from "../components/ui";
/*
 * 로고는 **에셋 파일로 참조**한다(인라인 SVG 로 넣지 않는다).
 * 브랜드 색(#062dee · #a0c1f7)은 디자인 토큰이 아니라 로고 고유의 고정색인데,
 * TSX 에 인라인하면 하드코딩 hex 가 되어 토큰 규칙과 저장 훅(`check-design-tokens.mjs`)에
 * 걸린다. `.svg` 안에 두면 그 색은 **에셋의 일부**로 남는다.
 */
import babycubeLogo from "../assets/babycube-logo.svg";
import babycubeSymbol from "../assets/babycube-symbol.svg";

/**
 * GNB 메뉴 구성 — BabyCube 본사 운영 어드민.
 *
 * ## ⚠️ 이 구조는 **원본 기획서에서 그대로 뽑은 것**이다 — 임의로 재편하지 말 것
 *
 * `_plan/babycube-admin/chunks/` 의 `[[그룹명, [{id, icon, label, badge, route}]]]`
 * 데이터를 파싱해 **9그룹 · 28항목 · 순서까지 원본 그대로** 옮겼다.
 *
 * 한때 이걸 "1섹션 + 2뎁스 9그룹"으로 접고 라벨도 5개 바꿨었다(운영 대시보드 · 전체 주문 ·
 * 서비스 설정 · 셀러 운영 · 상품 운영). GNB 높이를 줄이고 이름 충돌을 피하려던 것인데,
 * **원본 구조가 아니게 되어** 되돌렸다. 이름 충돌은 이커머스·차트온 메뉴가 같은 사이드바에
 * 섞여 있어서 생긴 문제였고, BabyCube 만 남은 지금은 **28개 라벨이 전부 유일하다**
 * (`App.test.tsx` 가 검사한다).
 *
 * ## 항목 id 가 곧 URL 이다
 *
 * `id` 에 원본 route 를 그대로 넣는다(`/`, `/members`, …). 그래서 GNB 선택 상태는
 * `activeId={pathname}` 한 줄이면 되고, **id↔경로 매핑표가 아예 없다.**
 * 매핑표를 따로 두면 한쪽만 고쳤을 때 조용히 어긋난다(실제로 `bc-orders` ↔ `bc-orders-all`
 * 로 대시보드 퍼널 링크가 통째로 죽은 적이 있다).
 */

/** GNB 아이콘은 §23-3 실측대로 20px · stroke 1.2 */
const navIcon = (Icon: typeof ShoppingCart) => (
  <Icon size={20} strokeWidth={1.2} aria-hidden />
);

/*
 * 로고 슬롯도 여기서 공유한다.
 * 페이지마다 따로 넘기면 **넘긴 화면에서만 로고가 보이고 나머지는 빈칸**이 된다.
 * 프레임 크기는 §23-2 원본 규격(114 × 24).
 *
 * ⚠️ 객체로 묶는 이유: JSX 요소를 그대로 export 하면 eslint 의
 * `react-refresh/only-export-components` 가 이를 컴포넌트로 보고 경고한다.
 */
export const GNB_LOGO_SLOTS = {
  /**
   * 확장(224) 상태 — 워드마크.
   * 원본 비율이 3478×694 ≈ **5.01:1** 이라, 폭 114 에 맞추면 높이가 22.7 이 되어
   * §23-2 규격(114 × 24) 안에 들어온다. **폭만 고정하고 높이는 비율에 맡긴다** —
   * `h-6`(24) 을 같이 주면 세로로 늘어난다.
   */
  logo: (
    /*
      워드마크 **우측에 계정 칩**을 붙인다. 로고 아래 슬롯(§23-5)에 두었더니
      메뉴와 로고 사이에 한 줄이 더 생겨 사이드바가 위에서부터 뜸해 보였다.
      한 줄에 놓으면 "어느 브랜드의 · 어느 계정" 이 한 번에 읽힌다.

      폭은 워드마크만 114 로 고정하고(§23-2) 칩은 자기 크기를 갖는다 —
      묶어서 114 로 조이면 워드마크가 찌그러진다.
    */
    <span className="flex items-center gap-2">
      <img
        src={babycubeLogo}
        alt="BabyCube"
        className="block w-(--size-gnb-logo) shrink-0"
      />
      {/*
        ⚠️ `tone="default"` 은 `bg-surface-sub`(slate-50)라 **흰 GNB 위에서 거의 안 보인다.**
        칩은 "지금 어느 계정인가"를 한눈에 알리는 자리라 대비가 약하면 존재 이유가 없다.
        상태색(success/warning/critical)은 쓰면 안 되므로 — 계정은 상태가 아니다 —
        `custom` 에 **반전 면**을 주입한다. 값은 semantic 토큰만 쓴다(하드코딩 금지).
      */}
      <Tag
        tone="custom"
        size="small"
        style={{
          "--tag-bg-color": "var(--color-surface-inverse)",
          "--tag-color": "var(--color-text-inverse)",
        }}
      >
        본사
      </Tag>
    </span>
  ),
  /**
   * 축소(60) 상태 — 심볼.
   * 워드마크는 5:1 이라 24px 폭에서 글자가 뭉개진다. 원본 우측 상단의
   * **둥근 사각형 + 마름모 그래픽**(거의 정사각, 진한 파랑)만 잘라 쓴다.
   * 이니셜 `B` 도 후보였지만 연파랑(#a0c1f7)이라 24px 에서 흐려진다.
   *
   * `alt=""` 인 이유: 확장/축소는 같은 브랜드를 가리키고, GNB 는 이미
   * `<nav aria-label>` 로 이름이 있다. 또 이름을 주면 중복해서 읽힌다.
   */
  collapsed: <img src={babycubeSymbol} alt="" className="block size-6" />,
};

/**
 * GNB·헤더의 **앱 크롬 슬롯**. 로고와 같은 이유로 여기서 공유한다 —
 * 화면마다 직접 넣으면 **넣은 화면에서만 보이고 나머지에서는 사라진다**
 * (실제로 GNB 로고가 그랬다).
 *
 * ⚠️ 객체로 묶는 이유는 `GNB_LOGO_SLOTS` 와 같다 — JSX 를 그대로 export 하면
 * eslint 의 `react-refresh/only-export-components` 가 컴포넌트로 보고 경고한다.
 */
export const APP_CHROME = {
  /**
   * 페이지 헤더 우측 — 로그인한 운영자.
   *
   * 이름과 역할이 둘 다 필요하다: 이름만으로는 **권한 범위**를 알 수 없고
   * (본사 운영자와 셀러 운영자가 보는 것이 다르다), 역할만으로는 누가 로그인했는지 모른다.
   * `Avatar` 는 `name` 의 첫 글자를 이니셜로 쓰므로 "운영관리자" → **운**.
   */
  headerAccount: (
    <div className="flex items-center gap-2">
      <Avatar name="운영관리자" size="medium" />
      {/* 두 줄이지만 한 덩이로 읽혀야 한다 */}
      <span className="flex flex-col">
        <span className="label-medium-bold text-text">운영관리자</span>
        <span className="body-small text-text-sub">본사 운영관리자</span>
      </span>
    </div>
  ),
};

/**
 * 원본 9그룹.
 *
 * ⚠️ **그룹 1·2 는 라벨을 비웠다.** 원본 데이터의 그룹명이 그 그룹의 유일한 항목명과
 * 똑같아서("대시보드" 그룹 > "대시보드" 항목), 그대로 그리면 같은 글자가 두 줄 겹친다.
 * 나머지 7그룹은 항목이 여럿이라 그룹명이 제 역할을 한다.
 */
export const GNB_SECTIONS: GnbSection[] = [
  {
    id: "g-dashboard",
    items: [{ id: "/", label: "대시보드", icon: navIcon(LayoutDashboard) }],
  },
  {
    id: "g-members",
    items: [{ id: "/members", label: "회원 관리", icon: navIcon(Users) }],
  },
  {
    id: "g-sellers",
    label: "셀러 관리",
    items: [
      { id: "/sellers", label: "셀러 관리", icon: navIcon(Store) },
      {
        id: "/seller-review",
        label: "입점 심사",
        icon: navIcon(ClipboardCheck),
      },
    ],
  },
  {
    id: "g-products",
    label: "상품 관리(통합)",
    items: [
      { id: "/products", label: "상품 관리", icon: navIcon(Package) },
      { id: "/categories", label: "카테고리 관리", icon: navIcon(FolderTree) },
      { id: "/stages", label: "성장단계 관리", icon: navIcon(Ruler) },
    ],
  },
  {
    id: "g-orders",
    label: "주문 관리 (통합)",
    items: [
      { id: "/orders-all", label: "주문 목록", icon: navIcon(ShoppingCart) },
      { id: "/orders-cancel", label: "취소 목록", icon: navIcon(XCircle) },
      { id: "/orders-return", label: "반품 목록", icon: navIcon(Undo2) },
      { id: "/orders-exchange", label: "교환 목록", icon: navIcon(RefreshCw) },
    ],
  },
  {
    id: "g-settle",
    label: "정산 관리",
    items: [
      { id: "/settle-seller", label: "셀러 정산", icon: navIcon(Wallet) },
      { id: "/rent-deposit", label: "보증금 내역", icon: navIcon(PiggyBank) },
      {
        id: "/care-claims",
        label: "안심케어 승인",
        icon: navIcon(ShieldCheck),
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
    items: [
      { id: "/promo", label: "쿠폰관리", icon: navIcon(Ticket) },
      { id: "/points", label: "포인트 관리", icon: navIcon(Coins) },
    ],
  },
  {
    id: "g-board",
    label: "게시판 관리",
    items: [
      { id: "/notices", label: "공지사항 관리", icon: navIcon(Megaphone) },
      { id: "/faq-admin", label: "FAQ 관리", icon: navIcon(CircleHelp) },
      { id: "/reviews-admin", label: "리뷰 관리", icon: navIcon(Star) },
      { id: "/support", label: "문의 관리", icon: navIcon(MessageSquare) },
    ],
  },
  {
    id: "g-system",
    label: "시스템·운영 관리",
    items: [
      { id: "/display", label: "배너 관리", icon: navIcon(Images) },
      { id: "/popups", label: "팝업 관리", icon: navIcon(AppWindow) },
      { id: "/ops-calendar", label: "공휴일 관리", icon: navIcon(CalendarOff) },
      { id: "/terms-admin", label: "약관 관리", icon: navIcon(ScrollText) },
      { id: "/scripts", label: "스크립트 관리", icon: navIcon(Code2) },
      { id: "/settings", label: "설정", icon: navIcon(Settings) },
    ],
  },
  /*
   * 클래스온 — **BabyCube 원본에 없는 섹션이다.** 다른 기획서(온라인 강의 플랫폼 운영
   * 어드민)로 Stage 5 가 만든 2화면이라, 원본 9그룹을 건드리지 않고 아래에 덧붙인다.
   *
   * ⚠️ 이 저장소의 관행은 원래 "BabyCube 이외의 생성물은 GNB 가 아니라 화면 목록
   * (`/screens`)으로 들어간다" 였다(템플릿 4종·차트온 4종이 GNB 에 없는 이유다 —
   * 여러 서비스 메뉴가 한 사이드바에 섞여 이름이 충돌한 이력이 있다). 이번 2화면은
   * 메뉴 배선까지 요구받아 섹션을 두되, **서비스 이름을 그룹 라벨로 달아** 어느 서비스의
   * 메뉴인지 먼저 읽히게 했다. 실서비스로 이식할 때는 이 섹션만 남기고 나머지를 걷어낸다.
   */
  {
    id: "g-classon",
    label: "클래스온",
    items: [
      {
        id: "/_classon/dashboard",
        label: "운영 대시보드",
        icon: navIcon(LayoutDashboard),
      },
      {
        id: "/_classon/students",
        label: "수강생 관리",
        icon: navIcon(GraduationCap),
      },
    ],
  },
  /*
   * 저장소 색인 — **원본에 없는 항목이다.** 서비스 메뉴가 아니라 이 저장소의 색인이라
   * 맨 아래 따로 뒀다. 여기서 템플릿 4종·차트온 4종까지 38화면 전부로 갈 수 있다.
   * 실제 서비스로 이식할 때는 이 섹션과 `ScreenIndexPage` 를 함께 걷어낸다.
   */
  {
    id: "g-repo",
    label: "저장소",
    items: [{ id: "/screens", label: "화면 목록", icon: navIcon(LayoutGrid) }],
  },
];
