import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Ellipsis, Inbox, RefreshCw } from "lucide-react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Tag } from "../Tag";
import { EmptyState } from "../EmptyState";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  argTypes: {
    elevated: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component: [
          "관련 있는 정보를 하나의 면으로 묶는 컨테이너입니다. (DESIGN.md §26 `[유추]`)",
          "",
          "`bg: surface` · `radius: medium(8)` · padding 24 · 헤더/바디/푸터 구조.",
          "Clay 원본에는 `--shadow-card` 토큰만 있고 카드 CSS가 없어 규격에서 유추했습니다.",
          "레거시 Material 카드(radius 2px, `0 1px 3px` 그림자)는 참고하지 않습니다.",
          "",
          "### 사용 규칙",
          "",
          "- **기본 카드에 그림자를 쓰지 않습니다.** 페이지에 붙어 있는 카드는 흰 면 + 보더로 경계를 냅니다. `elevated`는 페이지에서 떠 있는 패널일 때만 켭니다. (DESIGN_참고.md §5)",
          "- **카드 안에 카드를 중첩하지 않습니다.** 표면 위계는 3단이면 충분합니다 (`bg` → `surface` → `surface-sub`). 카드 안에서 영역을 더 나눠야 하면 중첩 카드 대신 `Divider`나 `surface-sub` 배경 블록을 씁니다. (DESIGN_참고.md §1-2)",
          "- **목록형 화면에서 카드 그리드를 먼저 고려하지 않습니다.** 대시보드의 기본 데이터 표시는 테이블입니다. (DESIGN_참고.md §7)",
          "- 헤더·바디·푸터는 `CardHeader` / `CardBody` / `CardFooter` named export로 조합합니다.",
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
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 그림자 없이 흰 면 + 보더 */
export const Default: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader title="오늘의 매출" />
      <CardBody>
        <p className="body-medium text-text-sub">
          결제 완료된 주문 기준으로 집계한 금액입니다.
        </p>
      </CardBody>
    </Card>
  ),
};

/**
 * `elevated` — 페이지에서 떠 있는 카드일 때만. 그림자가 경계를 대신하므로 보더를 뺀다.
 * 대시보드 본문에서는 남발하지 않는다. (DESIGN_참고.md §5)
 */
export const Elevated: Story = {
  args: { elevated: true },
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader title="새 기능 안내" />
      <CardBody>
        <p className="body-medium text-text-sub">
          이제 주문을 채널별로 나눠서 볼 수 있어요.
        </p>
      </CardBody>
    </Card>
  ),
};

/** 기본 vs elevated 비교 */
export const Elevation: Story = {
  render: () => (
    <div className="flex flex-col gap-8 bg-bg p-6">
      <Card className="w-120">
        <CardHeader title="기본 (그림자 없음 + 보더)" />
        <CardBody>
          <p className="body-medium text-text-sub">
            페이지에 붙어 있는 카드·섹션의 기본값입니다.
          </p>
        </CardBody>
      </Card>
      <Card elevated className="w-120">
        <CardHeader title="elevated (shadow-card)" />
        <CardBody>
          <p className="body-medium text-text-sub">
            떠 있는 패널·강조 배너에만 씁니다.
          </p>
        </CardBody>
      </Card>
    </div>
  ),
};

/** 헤더만 — 위젯 제목 + 우측 액션 */
export const HeaderOnly: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader
        title="주문 현황"
        action={
          <IconButton
            label="새로고침"
            size="small"
            icon={<RefreshCw strokeWidth={1.2} aria-hidden />}
          />
        }
      />
    </Card>
  ),
};

/** 헤더 + 바디 — 가장 흔한 조합 */
export const WithBody: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader title="배송 정보" />
      <CardBody>
        <div className="flex items-center justify-between gap-2">
          <span className="body-medium text-text-sub">수령인</span>
          <span className="body-medium text-text">김아임</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="body-medium text-text-sub">연락처</span>
          <span className="body-medium text-text">010-0000-0000</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="body-medium text-text-sub">배송 상태</span>
          <Tag tone="success" dot>
            배송완료
          </Tag>
        </div>
      </CardBody>
    </Card>
  ),
};

/** 헤더 + 바디 + 푸터 — 푸터 액션은 우측 정렬, 간격 8 */
export const WithFooter: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader title="반품 요청" />
      <CardBody>
        <p className="body-medium text-text-sub">
          주문번호 20260814-0012 의 반품 요청이 접수되었습니다.
        </p>
      </CardBody>
      <CardFooter>
        <Button variant="secondary" size="small">
          거절
        </Button>
        <Button variant="primary" size="small">
          승인
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * 헤더 액션 슬롯에는 IconButton·Button·Tag 등을 넣는다.
 * 강한 강조(primary)는 화면당 한 곳이므로 카드 헤더에는 보조 액션을 둔다. (DESIGN_참고.md §1-1)
 */
export const HeaderActions: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <Card {...args} className="w-120">
        <CardHeader
          title="아이콘 버튼"
          action={
            <IconButton
              label="더보기"
              size="small"
              icon={<Ellipsis strokeWidth={1.2} aria-hidden />}
            />
          }
        />
      </Card>
      <Card {...args} className="w-120">
        <CardHeader
          title="텍스트 버튼"
          action={
            <Button variant="secondary" size="small">
              전체 보기
            </Button>
          }
        />
      </Card>
      <Card {...args} className="w-120">
        <CardHeader
          title="상태 태그"
          action={
            <Tag tone="warning" dot>
              동기화 필요
            </Tag>
          }
        />
      </Card>
    </div>
  ),
};

/**
 * 제목 영역을 통째로 바꾸고 싶으면 `children`을 쓴다.
 * 큰 단독 카드에서 18/28이 필요하면 여기에 `heading-large-bold`를 직접 넘긴다.
 */
export const CustomHeader: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader
        action={
          <Button variant="secondary" size="small">
            기간 변경
          </Button>
        }
      >
        <h3 className="heading-large-bold text-text">이번 달 정산</h3>
        <p className="body-small text-text-sub">2026년 8월 1일 ~ 8월 14일</p>
      </CardHeader>
      <CardBody>
        <p className="heading-2xlarge-bold text-text">₩ 12,480,000</p>
      </CardBody>
    </Card>
  ),
};

/**
 * 실제 대시보드 맥락 — 통계 요약 카드 3장.
 * 같은 줄에 놓이는 카드는 구조·타이포를 통일하고 값만 바꾼다.
 */
export const StatSummary: Story = {
  render: () => (
    <div className="flex gap-4 bg-bg p-6">
      {(
        [
          {
            label: "오늘 주문",
            value: "128건",
            delta: "+12%",
            tone: "success",
          },
          {
            label: "오늘 매출",
            value: "₩ 4,820,000",
            delta: "+8%",
            tone: "success",
          },
          {
            label: "취소·반품",
            value: "6건",
            delta: "+2건",
            tone: "critical",
          },
        ] as const
      ).map(({ label, value, delta, tone }) => (
        <Card key={label} className="w-70">
          {/* 라벨-값-증감은 한 덩어리라 CardBody(gap 20)보다 촘촘해야 한다.
              CardBody의 gap을 className으로 덮어쓰면 cn()이 클래스를 병합하지
              않아 gap 클래스가 2개 방출되므로, 대신 자체 블록을 쓴다 */}
          <div className="flex flex-col gap-2">
            <span className="body-small text-text-sub">{label}</span>
            <span className="heading-xlarge-bold text-text">{value}</span>
            <Tag tone={tone} size="small">
              {delta}
            </Tag>
          </div>
        </Card>
      ))}
    </div>
  ),
};

/**
 * 카드 안의 빈 상태. 카드 높이가 크지 않으므로 `compact`~`section`을 쓴다.
 * 빈 영역은 반드시 처리한다. (DESIGN_참고.md §7)
 */
export const WithEmptyState: Story = {
  render: (args) => (
    <Card {...args} className="w-120">
      <CardHeader
        title="최근 문의"
        action={
          <Button variant="secondary" size="small">
            전체 보기
          </Button>
        }
      />
      <CardBody>
        <EmptyState
          size="compact"
          icon={<Inbox strokeWidth={1.2} aria-hidden />}
          title="처리할 문의가 없습니다"
        />
      </CardBody>
    </Card>
  ),
};

/**
 * ❌ **하지 말 것 — 카드 중첩.**
 * 카드 안에 카드를 넣으면 보더가 겹치고 표면 위계가 무너진다.
 * 카드 안에서 영역을 나눠야 하면 `surface-sub` 블록이나 구분선을 쓴다.
 */
export const DontNestCards: Story = {
  render: () => (
    <div className="flex flex-col gap-6 bg-bg p-6">
      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-critical">❌ 카드 중첩</p>
        <Card className="w-120">
          <CardHeader title="정산 요약" />
          <CardBody>
            <Card>
              <CardBody>
                <p className="body-medium text-text-sub">중첩된 카드</p>
              </CardBody>
            </Card>
          </CardBody>
        </Card>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-success">
          ✅ surface-sub 블록으로 나누기
        </p>
        <Card className="w-120">
          <CardHeader title="정산 요약" />
          <CardBody>
            <div className="rounded-medium bg-surface-sub p-4">
              <p className="body-medium text-text-sub">
                하위 블록은 옅은 톤 배경으로 구분한다
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  ),
};

/**
 * 푸터 액션의 클릭 핸들러 mock.
 *
 * `args.onClick`(= Card 루트 div의 핸들러)을 Button에 넘기면
 * `MouseEventHandler<HTMLDivElement>` → `HTMLButtonElement` 타입이 어긋나므로
 * 모듈 스코프 mock을 쓴다.
 */
const onApproveReturn = fn();

/** 렌더·상호작용 검증: 제목이 heading으로 노출되고 푸터 액션이 눌린다 */
export const Rendered: Story = {
  render: () => (
    <Card className="w-120">
      <CardHeader title="반품 요청" />
      <CardBody>
        <p className="body-medium text-text-sub">반품 요청이 접수되었습니다.</p>
      </CardBody>
      <CardFooter>
        <Button variant="primary" size="small" onClick={onApproveReturn}>
          승인
        </Button>
      </CardFooter>
    </Card>
  ),
  play: async ({ canvasElement }) => {
    onApproveReturn.mockClear();
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("heading", { name: "반품 요청" }),
    ).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "승인" }));
    await expect(onApproveReturn).toHaveBeenCalled();
  },
};
