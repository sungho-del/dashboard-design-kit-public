import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  BarChart3,
  ChevronDown,
  FileText,
  Megaphone,
  Package,
  Settings,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { Gnb, GnbBadge, type GnbSection } from "./Gnb";

/** DESIGN_참고.md §8 — GNB 아이콘은 20px · strokeWidth 1.2 · icon 토큰 색 */
const iconProps = {
  size: 20,
  strokeWidth: 1.2,
  className: "text-icon",
  "aria-hidden": true,
} as const;

/** 아임웹 관리자 실제 메뉴 구조 */
const SECTIONS: GnbSection[] = [
  {
    id: "shop",
    label: "쇼핑몰",
    items: [
      {
        id: "orders",
        label: "주문",
        icon: <ShoppingCart {...iconProps} />,
        badge: <GnbBadge tone="count">12</GnbBadge>,
        items: [
          { id: "orders-list", label: "주문 조회" },
          { id: "orders-claim", label: "취소·반품·교환" },
          { id: "orders-delivery", label: "배송 관리" },
        ],
      },
      {
        id: "products",
        label: "상품",
        icon: <Package {...iconProps} />,
        items: [
          { id: "products-list", label: "상품 조회" },
          { id: "products-add", label: "상품 등록" },
          { id: "products-category", label: "카테고리 관리" },
          { id: "products-stock", label: "재고 관리" },
        ],
      },
      {
        id: "members",
        label: "회원",
        icon: <Users {...iconProps} />,
        items: [
          { id: "members-list", label: "회원 조회" },
          { id: "members-grade", label: "등급 관리" },
          { id: "members-point", label: "적립금" },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "콘텐츠",
    items: [
      {
        id: "boards",
        label: "게시판·리뷰",
        icon: <FileText {...iconProps} />,
        badge: <GnbBadge tone="new">N</GnbBadge>,
        items: [
          { id: "boards-list", label: "게시판 관리" },
          { id: "boards-review", label: "상품 리뷰" },
          { id: "boards-qna", label: "상품 문의" },
        ],
      },
      {
        id: "promotion",
        label: "프로모션",
        icon: <Megaphone {...iconProps} />,
        badge: <GnbBadge tone="update">UP</GnbBadge>,
        items: [
          { id: "promotion-coupon", label: "쿠폰" },
          { id: "promotion-sale", label: "할인 설정" },
          { id: "promotion-message", label: "메시지 발송" },
        ],
      },
    ],
  },
  {
    id: "operation",
    label: "운영",
    items: [
      {
        id: "stats",
        label: "통계",
        icon: <BarChart3 {...iconProps} />,
      },
      {
        id: "settings",
        label: "설정",
        icon: <Settings {...iconProps} />,
        badge: <GnbBadge tone="warning">!</GnbBadge>,
        items: [
          { id: "settings-shop", label: "쇼핑몰 설정" },
          { id: "settings-pay", label: "결제 설정" },
          { id: "settings-delivery", label: "배송 설정" },
        ],
      },
    ],
  },
];

/** 로고 자리 — 실제 이미지 대신 토큰 그레이 플레이스홀더 (DESIGN_참고.md §8) */
function LogoPlaceholder() {
  return (
    <span className="flex h-6 w-[114px] shrink-0 items-center justify-center rounded-small bg-surface-sub text-text-sub label-small-bold">
      IMWEB
    </span>
  );
}

function SymbolPlaceholder() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-small bg-surface-sub text-text-sub label-small-bold">
      I
    </span>
  );
}

/** DESIGN.md §23-5 상단 사이트 선택기 슬롯 */
function SiteSelector() {
  return (
    <button
      type="button"
      className="flex min-h-8 w-full cursor-pointer items-center gap-2 rounded-small px-2 py-0.5 transition-[background-color] duration-100 ease-in-out hover:bg-action-secondary-hover"
    >
      <span
        aria-hidden
        className="flex size-5 shrink-0 items-center justify-center rounded-small bg-surface-sub"
      >
        <Store size={16} strokeWidth={1.2} className="text-icon-sub" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left label-medium">
        아임웹 데모 스토어
      </span>
      <ChevronDown
        aria-hidden
        size={20}
        strokeWidth={1.2}
        className="shrink-0 text-icon-sub"
      />
    </button>
  );
}

/** 앱 셸(DESIGN.md §0) 흉내 — GNB 옆에 본문이 붙었을 때의 폭 거동을 보기 위함 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh bg-bg">
      {children}
      <div className="flex-1 p-10">
        <p className="heading-2xlarge-bold">주문 관리</p>
        <p className="mt-2 text-text-sub body-medium">
          GNB 축소 상태에서는 wrapper가 absolute로 떠서, hover로 224까지
          벌어져도 이 영역이 밀리지 않는다.
        </p>
      </div>
    </div>
  );
}

const meta = {
  title: "Components/Gnb",
  component: Gnb,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
    // design: {
    //   type: "figma",
    //   url: "https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>",
    // },
  },
  args: {
    sections: SECTIONS,
    activeId: "orders-list",
    onSelect: fn(),
    logo: <LogoPlaceholder />,
    collapsedLogo: <SymbolPlaceholder />,
    header: <SiteSelector />,
  },
  argTypes: {
    open: { control: "boolean" },
    variant: { control: "inline-radio", options: ["sidebar", "drawer"] },
  },
  render: (args) => (
    <Shell>
      <Gnb {...args} />
    </Shell>
  ),
} satisfies Meta<typeof Gnb>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 확장(224). 활성 항목이 속한 아코디언은 자동으로 펼쳐진다 */
export const Expanded: Story = {
  args: { open: true },
};

/**
 * 축소(60). wrapper가 `absolute`로 떠 있고, **hover하면 224로 즉시 펼쳐진다**.
 * 이때 뷰포트 폭은 그대로이므로 미디어쿼리로는 판별할 수 없다 —
 * 섹션 라벨↔구분선 스왑, 로고 스왑, depth2 숨김은 모두 컨테이너 쿼리가 처리한다.
 */
export const Collapsed: Story = {
  args: { open: false },
};

/**
 * 축소 ↔ 확장 토글.
 *
 * `onOpenChange`를 넘기면 **GNB 하단에 접기 토글이 자동으로 붙는다.**
 * 우측 버튼은 외부에서도 같은 상태를 제어할 수 있음을 보여주는 데모용이다.
 */
function ToggleDemo(args: ComponentProps<typeof Gnb>) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex h-dvh bg-bg">
      <Gnb {...args} open={open} onOpenChange={setOpen} />
      <div className="flex-1 p-10">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="rounded-medium bg-action-primary px-3 py-2 text-text-inverse label-medium-bold"
        >
          {open ? "GNB 접기" : "GNB 펼치기"}
        </button>
      </div>
    </div>
  );
}

export const Toggleable: Story = {
  render: (args) => <ToggleDemo {...args} />,
};

/** 모바일 드로어 — 딤 + 280px 고정 패널 (DESIGN.md §23-1) */
function DrawerDemo(args: ComponentProps<typeof Gnb>) {
  const [open, setOpen] = useState(true);
  return (
    <div className="h-dvh bg-bg p-10">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-medium bg-action-primary px-3 py-2 text-text-inverse label-medium-bold"
      >
        메뉴 열기
      </button>
      <Gnb {...args} variant="drawer" open={open} onOpenChange={setOpen} />
    </div>
  );
}

export const MobileDrawer: Story = {
  render: (args) => <DrawerDemo {...args} />,
};

/** depth2가 있는 항목만 모아 아코디언 동작을 확인한다 */
export const Depth2: Story = {
  args: {
    activeId: "products-stock",
    sections: [
      {
        id: "shop",
        label: "쇼핑몰",
        items: [SECTIONS[0].items[1], SECTIONS[0].items[2]],
      },
    ],
  },
};

/** §4-1 GNB 전용 배지 5종 */
export const Badges: Story = {
  args: {
    activeId: "orders",
    sections: [
      {
        id: "badges",
        label: "배지",
        items: [
          {
            id: "count",
            label: "주문",
            icon: <ShoppingCart {...iconProps} />,
            badge: <GnbBadge tone="count">12</GnbBadge>,
          },
          {
            id: "countInverse",
            label: "상품 문의",
            icon: <FileText {...iconProps} />,
            badge: <GnbBadge tone="countInverse">3</GnbBadge>,
          },
          {
            id: "new",
            label: "프로모션",
            icon: <Megaphone {...iconProps} />,
            badge: <GnbBadge tone="new">NEW</GnbBadge>,
          },
          {
            id: "update",
            label: "통계",
            icon: <BarChart3 {...iconProps} />,
            badge: <GnbBadge tone="update">UP</GnbBadge>,
          },
          {
            id: "warning",
            label: "설정",
            icon: <Settings {...iconProps} />,
            badge: <GnbBadge tone="warning">!</GnbBadge>,
          },
        ],
      },
    ],
  },
};

/** 아코디언을 접었다 펴고, 하위 메뉴 선택이 onSelect로 올라오는지 확인한다 */
export const Interaction: Story = {
  args: { open: true, activeId: "orders-list" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // 활성 하위 메뉴가 속한 "주문" 아코디언은 처음부터 열려 있다
    const orders = canvas
      .getByText("주문")
      .closest("button") as HTMLButtonElement;
    await expect(orders).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText("주문 조회")).toBeInTheDocument();

    // 접으면 depth2가 사라진다
    await userEvent.click(orders);
    await expect(orders).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByText("주문 조회")).not.toBeInTheDocument();

    // 다시 펼치고 하위 메뉴를 선택한다
    await userEvent.click(orders);
    await userEvent.click(canvas.getByText("배송 관리"));
    await expect(args.onSelect).toHaveBeenCalledWith("orders-delivery");
  },
};
