import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { ArrowDownToLine, Plus } from "lucide-react";
import { Button } from "../Button";
import { Tabs } from "../Tabs";
import { Tag } from "../Tag";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
  args: {
    title: "주문 관리",
  },
  argTypes: {
    compact: { control: "boolean" },
    sticky: { control: "boolean" },
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "페이지 최상단의 제목 + 액션 바입니다. (DESIGN.md §24)",
          "",
          "데스크톱 `min-height 72` · padding `16 40 0` · gap 16, 컴팩트 `min-height 52` · padding `0 16` · gap 12.",
          "하단 경계선은 `border`가 아니라 **안쪽 그림자**(`inset 0 -1px 0 0 border`)로 그립니다 — border를 쓰면 72가 73이 됩니다.",
          "",
          "### 사용 규칙",
          "",
          "- 제목은 `heading-2xlarge-bold`(24/32) 한 종류입니다. 페이지마다 크기를 바꾸지 않습니다.",
          "- 우측 액션은 2~3개까지만 두고, 나머지는 `Dropdown`(더보기)으로 접습니다.",
          '- 뒤로가기 버튼은 32×32(`IconButton size="small"`)입니다.',
          "- 탭은 `tabs` 슬롯에 `Tabs`를 넣습니다. 제목과 좌측 기준선을 맞추기 위해 `padding-left: 40`이 붙습니다.",
          "- 앱 골격에 얹을 때는 `AppShell`의 `header` 슬롯에 넣습니다.",
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
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const actions = (
  <>
    <Button variant="secondary">
      <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
      내보내기
    </Button>
    <Button>
      <Plus size={16} strokeWidth={1.2} aria-hidden />
      주문 등록
    </Button>
  </>
);

const TAB_ITEMS = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제완료" },
  { value: "ready", label: "배송준비중" },
];

/** 기본 — 데스크톱 규격(min-h 72 · gutter 40) + 우측 액션 */
export const Default: Story = {
  args: { actions },
};

/** 보조 설명 — 제목 아래 한 줄 요약을 덧붙입니다 */
export const WithDescription: Story = {
  args: {
    description: "결제·배송 상태별로 주문을 확인하고 처리합니다.",
    actions,
  },
};

/** 컴팩트 — 모바일·중첩 화면용(min-h 52 · gutter 16 · gap 12) */
export const Compact: Story = {
  args: {
    compact: true,
    actions: <Button size="small">주문 등록</Button>,
  },
};

/** 뒤로가기 — 상세 화면처럼 되돌아갈 곳이 있을 때만 붙입니다 (32×32) */
export const WithBack: Story = {
  args: {
    title: "주문 상세",
    description: "20260818-0001",
    onBack: fn(),
    actions: <Button variant="secondary">목록으로</Button>,
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    const back = canvas.getByRole("button", { name: "뒤로 가기" });
    await userEvent.click(back);
    await expect(args.onBack).toHaveBeenCalledTimes(1);

    // 제목은 페이지의 h1 이다
    await expect(
      canvas.getByRole("heading", { level: 1, name: "주문 상세" }),
    ).toBeVisible();
  },
};

/** 배지 — 제목 옆에 상태를 붙입니다 (gap 4) */
export const WithBadges: Story = {
  args: {
    title: "여름 프로모션",
    badges: (
      <>
        <Tag tone="success" dot>
          진행중
        </Tag>
        <Tag size="small">기간한정</Tag>
      </>
    ),
    actions,
  },
};

/** 탭 포함 — 하단 탭 슬롯. 제목과 좌측 기준선이 맞도록 `padding-left: 40` */
export const WithTabs: Story = {
  args: {
    actions,
    tabs: <Tabs items={TAB_ITEMS} defaultValue="all" />,
  },
};

/**
 * sticky — `position: sticky`로 콘텐츠 컬럼 상단에 붙습니다.
 * 자기 자리를 흐름에 남기므로 본문이 헤더 높이만큼 위로 튀지 않고,
 * `AppShell` 에서 GNB 를 덮지도 않습니다.
 */
export const Sticky: Story = {
  args: {
    sticky: true,
    actions,
  },
  render: (args) => (
    <div className="min-h-dvh bg-bg">
      <PageHeader {...args} />
      {/* 고정 헤더(72)에 가리지 않도록 본문을 밀어 준다 */}
      <div className="flex flex-col gap-4 px-10 pt-18 pb-6">
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index} className="body-medium text-text-sub">
            스크롤해도 헤더는 상단에 고정됩니다. ({index + 1}/20)
          </p>
        ))}
      </div>
    </div>
  ),
};
