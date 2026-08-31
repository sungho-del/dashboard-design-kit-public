import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Users } from "lucide-react";
import { StatTile } from "./StatTile";
import { Card, CardBody, CardHeader } from "../Card";

const meta = {
  title: "Components/StatTile",
  component: StatTile,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["plain", "card"] },
    compact: { control: "boolean" },
    selected: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "대시보드의 기본 단위. 규격: `docs/DESIGN-dashboard.md` §D3. " +
          "`plain` 은 흰 카드 **안에 들어가는 항목**이고, `card` 는 **그 자체로 카드**다.",
      },
    },
  },
} satisfies Meta<typeof StatTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 값만 보여준다. 버튼이 아니므로 탭이 멈추지 않는다 */
export const Plain: Story = {
  args: { label: "신규 주문", value: "1,284", unit: "건" },
  render: (args) => (
    <div className="w-64">
      <StatTile {...args} />
    </div>
  ),
};

/** 좁은 칸용 — 여백이 줄고 화살표가 빠진다 */
export const Compact: Story = {
  args: { label: "배송준비", value: "42", unit: "건", compact: true },
  render: (args) => (
    <div className="w-48">
      <StatTile {...args} />
    </div>
  ),
};

/** 이동 — 갈 곳이 있을 때만 화살표가 붙는다 */
export const Openable: Story = {
  args: {
    label: "전체 회원",
    value: "12,840",
    unit: "명",
    openLabel: "회원 목록 열기",
  },
  render: (args) => (
    <div className="w-64">
      <StatTile {...args} onOpen={() => {}} />
    </div>
  ),
};

/** 선택(필터) — `aria-pressed` 가 붙고 선택은 **테두리**로 그린다 */
export const Selected: Story = {
  args: {
    label: "정상",
    value: "9,120",
    unit: "명",
    selected: true,
  },
  render: (args) => (
    <div className="w-64">
      <StatTile {...args} onSelect={() => {}} />
    </div>
  ),
};

/** 흰 카드형 — 아이콘칩 · 증감 · 비교 기준을 함께 담는다 */
export const CardVariant: Story = {
  args: {
    label: "이번 달 매출",
    value: "4,820",
    unit: "만원",
    variant: "card",
    caption: "지난달 대비",
  },
  render: (args) => (
    <div className="w-72">
      <StatTile
        {...args}
        icon={<Users size={20} strokeWidth={1.2} aria-hidden />}
        delta={{ text: "+12.3%", up: true, good: true }}
      />
    </div>
  ),
};

/**
 * 방향(`up`)과 감정(`good`)은 다른 축이다 — 반품률이 **올랐는데** 그건 **나쁘다**.
 * 하나로 겸용하면 화살표는 ↑인데 색이 초록으로 나가 화면이 거짓말을 한다.
 */
export const DeltaAxes: Story = {
  args: { label: "반품률", value: "3.2", unit: "%", variant: "card" },
  render: (args) => (
    <div className="w-72">
      <StatTile
        {...args}
        caption="지난주 대비"
        delta={{ text: "+12.3%", up: true, good: true }}
      />
    </div>
  ),
};

/** 흰 카드 = 그룹, 회색 상자 = 항목 — 두 층으로 묶는다 */
export const InGroupCard: Story = {
  args: { label: "전체 회원", value: "12,840", unit: "명" },
  render: () => (
    <div className="w-[640px]">
      <Card>
        <CardHeader title="회원 지표" />
        <CardBody>
          <div className="grid grid-cols-3 gap-6">
            <StatTile label="전체 회원" value="12,840" unit="명" />
            <StatTile label="신규 가입" value="284" unit="명" />
            <StatTile label="휴면" value="1,102" unit="명" />
          </div>
        </CardBody>
      </Card>
    </div>
  ),
};

/** 선택 버튼은 누르면 `aria-pressed` 가 바뀐다 */
export const Interaction: Story = {
  args: {
    label: "정상",
    value: "9,120",
    unit: "명",
    selected: false,
  },
  render: (args) => (
    <div className="w-64">
      <StatTile {...args} onSelect={() => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const tile = canvas.getByRole("button", { name: "정상 9,120명" });

    await expect(tile).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(tile);
    await expect(tile).toBeInTheDocument();
  },
};
