import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Funnel, Inbox, PackageOpen, Plus, SearchX } from "lucide-react";
import { Button } from "../Button";
import { EmptyState, type EmptyStateSize } from "./EmptyState";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  // icon·description은 스토리마다 다르므로 meta 기본값에 두지 않는다.
  // (Storybook의 args 병합에서 `undefined`로 지우는 것이 명확하지 않기 때문)
  args: {
    title: "등록된 상품이 없습니다",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["page", "table", "section", "search", "compact"],
    },
    sticky: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component: [
          "데이터가 없을 때 자리를 채우는 안내 블록입니다. (DESIGN.md §16)",
          "",
          "- 목록·표·위젯은 **빈 상태를 반드시 처리**합니다. 빈 영역을 그대로 두지 않습니다. (DESIGN_참고.md §7)",
          "- `size` 하나로 높이·gap·아이콘 크기가 함께 바뀝니다. 개별로 맞추지 마세요.",
          "- 문구는 *무엇이 없는지* + *다음에 무엇을 할지* 순서로 씁니다. 액션이 있으면 Button을 함께 둡니다.",
          "- 아이콘은 장식이므로 의미를 아이콘만으로 전달하지 않습니다. `strokeWidth`는 1.2입니다. (DESIGN_참고.md §8)",
        ].join("\n"),
      },
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

const SIZES: EmptyStateSize[] = [
  "page",
  "table",
  "section",
  "search",
  "compact",
];

/** 콘텐츠 전역 — 높이 400 · gap 20 · 아이콘 72 */
export const Page: Story = {
  args: {
    size: "page",
    icon: <PackageOpen strokeWidth={1.2} aria-hidden />,
    description: "첫 상품을 등록하면 여기에서 재고와 판매 현황을 볼 수 있어요.",
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="primary">
        <Plus size={20} strokeWidth={1.2} aria-hidden />
        상품 등록
      </Button>
    </EmptyState>
  ),
};

/** 테이블 본문 — 높이 320 · gap 20 · 아이콘 72 */
export const Table: Story = {
  args: {
    size: "table",
    icon: <Inbox strokeWidth={1.2} aria-hidden />,
    title: "표시할 주문이 없습니다",
    description: "선택한 기간에 접수된 주문이 없어요.",
  },
};

/** 필터 결과 없음 — 높이 240 · gap 4 · 아이콘 48 */
export const Section: Story = {
  args: {
    size: "section",
    icon: <Funnel strokeWidth={1.2} aria-hidden />,
    title: "조건에 맞는 결과가 없습니다",
    description: "필터를 넓혀서 다시 찾아보세요.",
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="secondary" size="small">
        필터 초기화
      </Button>
    </EmptyState>
  ),
};

/**
 * 검색 결과 없음 — 높이 **214** · gap 8 · 아이콘 48.
 *
 * `section`(필터 결과 없음)과 크기가 비슷하지만 쓰는 자리가 다르다.
 * 필터는 조건 패널 아래 결과 영역, 검색은 검색어 입력 결과 영역이다.
 * 214는 4px 그리드에 없는 유일한 값이라 spacing 토큰의 소수 배수
 * (`min-h-53.5` = `calc(var(--spacing) * 53.5)`)로 표현했다.
 */
export const Search: Story = {
  args: {
    size: "search",
    icon: <SearchX strokeWidth={1.2} aria-hidden />,
    title: "검색 결과가 없습니다",
    description: "다른 검색어로 다시 찾아보세요.",
  },
};

/** 리스트 내 — 높이 120 · gap 8 · 아이콘 48 */
export const Compact: Story = {
  args: {
    size: "compact",
    icon: <Inbox strokeWidth={1.2} aria-hidden />,
    title: "새 알림이 없습니다",
  },
};

/** 다섯 프리셋 비교. 높이·gap·아이콘이 한 묶음으로 움직인다 */
export const AllSizes: Story = {
  args: { icon: <PackageOpen strokeWidth={1.2} aria-hidden /> },
  render: (args) => (
    <div className="flex flex-col gap-6">
      {SIZES.map((size) => (
        <div
          key={size}
          className="rounded-medium bg-surface outline-1 -outline-offset-1 outline-border"
        >
          <EmptyState {...args} size={size} title={`size="${size}"`} />
        </div>
      ))}
    </div>
  ),
};

/** 아이콘 없이 문구만. 좁은 자리에서 쓴다 */
export const WithoutIcon: Story = {
  args: {
    size: "compact",
    title: "표시할 항목이 없습니다",
  },
};

/** 설명 없이 제목만 */
export const TitleOnly: Story = {
  args: {
    size: "section",
    icon: <PackageOpen strokeWidth={1.2} aria-hidden />,
    title: "등록된 상품이 없습니다",
  },
};

/**
 * 문구는 `white-space: pre-wrap`이라 줄바꿈(`\n`)이 그대로 살아 있다.
 * 긴 안내는 의미 단위로 직접 끊어 준다.
 */
export const MultilineDescription: Story = {
  args: {
    size: "page",
    icon: <Inbox strokeWidth={1.2} aria-hidden />,
    title: "아직 정산 내역이 없습니다",
    description:
      "첫 주문이 완료되면 정산 내역이 쌓입니다.\n정산은 매주 수요일에 이루어져요.",
  },
};

/**
 * 액션은 1개가 기본이다. 2개를 둘 때는 주 액션 1개(primary) +
 * 보조 1개(secondary) 조합으로 강한 강조가 겹치지 않게 한다. (DESIGN_참고.md §1-1)
 */
export const WithTwoActions: Story = {
  args: {
    size: "page",
    icon: <PackageOpen strokeWidth={1.2} aria-hidden />,
    title: "연동된 판매 채널이 없습니다",
    description: "채널을 연결하면 주문이 자동으로 모입니다.",
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="primary">채널 연결</Button>
      <Button variant="secondary">가이드 보기</Button>
    </EmptyState>
  ),
};

/**
 * 검색 결과 없음 실제 사용 예 — 사용자가 입력한 검색어를 문구에 되돌려 주고,
 * 되돌아갈 액션(검색 초기화)을 함께 둔다.
 */
export const SearchResultEmpty: Story = {
  args: {
    size: "search",
    icon: <SearchX strokeWidth={1.2} aria-hidden />,
    title: '"청바지" 검색 결과가 없습니다',
    description: "다른 검색어를 입력하거나 필터를 지워 보세요.",
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="secondary" size="small">
        검색 초기화
      </Button>
    </EmptyState>
  ),
};

/**
 * **테이블 빈 상태**는 `sticky`를 켠다.
 * 가로로 스크롤되는 표에서도 안내 블록이 화면 중앙에 머문다.
 * (`position: sticky; left: 50%; transform: translateX(-50%)` — DESIGN.md §16)
 *
 * 아래 예시는 가로 스크롤을 만들어 둔 상태다. 좌우로 스크롤해 보면
 * 헤더는 흘러가지만 빈 상태는 중앙에 남는다.
 */
export const StickyInScrollableTable: Story = {
  args: {
    size: "table",
    sticky: true,
    icon: <Inbox strokeWidth={1.2} aria-hidden />,
    title: "표시할 주문이 없습니다",
    description: "선택한 기간에 접수된 주문이 없어요.",
  },
  render: (args) => (
    <div className="w-150 overflow-x-auto rounded-medium bg-surface outline-1 -outline-offset-1 outline-border">
      {/* 스크롤을 만들기 위한 넓은 헤더 행 (실제 테이블 컴포넌트 대용) */}
      <div className="flex w-300 items-center gap-6 px-6 py-3 label-medium-bold text-text-sub shadow-[inset_0_-1px_0_0_var(--color-divide)]">
        <span className="w-30 shrink-0">주문번호</span>
        <span className="w-30 shrink-0">주문일시</span>
        <span className="w-30 shrink-0">주문자</span>
        <span className="w-30 shrink-0">상품</span>
        <span className="w-30 shrink-0">결제금액</span>
        <span className="w-30 shrink-0">상태</span>
      </div>
      <div className="w-300">
        <EmptyState {...args} />
      </div>
    </div>
  ),
};

/**
 * 대시보드 위젯 안에서. 위젯 높이가 작으므로 `compact`를 쓴다.
 */
export const InsideWidget: Story = {
  args: {
    size: "compact",
    icon: <Inbox strokeWidth={1.2} aria-hidden />,
    title: "처리할 문의가 없습니다",
  },
  render: (args) => (
    <div className="flex w-90 flex-col gap-4 rounded-medium bg-surface p-6 outline-1 -outline-offset-1 outline-border">
      <p className="heading-medium-bold text-text">최근 문의</p>
      <EmptyState {...args} />
    </div>
  ),
};

/**
 * 액션 버튼의 클릭 핸들러 mock.
 *
 * `args.onClick`(= EmptyState 루트 div의 핸들러)을 Button에 넘기면
 * `MouseEventHandler<HTMLDivElement>` → `HTMLButtonElement` 타입이 어긋난다.
 * 액션 버튼의 핸들러는 EmptyState의 prop이 아니므로 모듈 스코프 mock을 쓴다.
 */
const onRegisterProduct = fn();

/** 렌더·상호작용 검증: 제목·설명이 보이고 액션 버튼이 눌린다 */
export const Rendered: Story = {
  args: {
    size: "page",
    icon: <PackageOpen strokeWidth={1.2} aria-hidden />,
    title: "등록된 상품이 없습니다",
    description: "첫 상품을 등록해 보세요.",
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button variant="primary" onClick={onRegisterProduct}>
        상품 등록
      </Button>
    </EmptyState>
  ),
  play: async ({ canvasElement }) => {
    onRegisterProduct.mockClear();
    const canvas = within(canvasElement);
    await expect(canvas.getByText("등록된 상품이 없습니다")).toBeVisible();
    await expect(canvas.getByText("첫 상품을 등록해 보세요.")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "상품 등록" }));
    await expect(onRegisterProduct).toHaveBeenCalled();
  },
};
