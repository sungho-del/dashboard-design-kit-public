import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { StatGrid, type StatGridItem } from "./StatGrid";
import { Card, CardBody } from "../Card";

const meta = {
  title: "Components/StatGrid",
  component: StatGrid,
  tags: ["autodocs"],
  argTypes: {
    columns: { control: "inline-radio", options: [2, 3, 4, 5, 6] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "목록 화면 상단의 **건수 대시 = 필터**. 규격: `docs/DESIGN-dashboard.md` §D4. " +
          "지표처럼 생겼지만 누르면 아래 표가 걸러지므로 `aria-pressed` 를 가진 토글이다.",
      },
    },
  },
} satisfies Meta<typeof StatGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const MEMBER_ITEMS: StatGridItem[] = [
  { value: "all", label: "전체", count: "12,840", unit: "명" },
  {
    value: "normal",
    label: "정상",
    count: "9,120",
    unit: "명",
    tip: "탈퇴·휴면이 아닌 회원",
  },
  {
    value: "dormant",
    label: "휴면",
    count: "1,102",
    unit: "명",
    tip: "1년 이상 미접속",
  },
  { value: "left", label: "탈퇴", count: "2,618", unit: "명" },
];

/** 상태를 들고 도는 래퍼 — 실제 화면에서는 목록 필터가 이 자리에 온다 */
function Demo({ columns }: { columns: 2 | 3 | 4 | 5 | 6 }) {
  const [selected, setSelected] = useState("all");
  return (
    <div className="w-[880px]">
      <Card>
        <CardBody>
          <StatGrid
            items={MEMBER_ITEMS.slice(0, columns)}
            selected={selected}
            onSelect={setSelected}
            ariaLabel="회원 상태"
            columns={columns}
          />
        </CardBody>
      </Card>
    </div>
  );
}

/** 기본 — 흰 카드 안에 회색 상자들이 들어간다 */
export const Default: Story = {
  args: {
    items: MEMBER_ITEMS,
    selected: "all",
    onSelect: () => {},
    ariaLabel: "회원 상태",
    columns: 4,
  },
  render: () => <Demo columns={4} />,
};

/** 열 수는 항목 수에 맞춘다. `grid-cols-*` 는 조립하지 않고 맵에서 꺼낸다 */
export const ThreeColumns: Story = {
  args: {
    items: MEMBER_ITEMS.slice(0, 3),
    selected: "all",
    onSelect: () => {},
    ariaLabel: "주문 유형",
    columns: 3,
  },
  render: () => <Demo columns={3} />,
};

/** 툴팁은 설명이 필요한 항목에만 — "전체"처럼 자명한 것에는 붙이지 않는다 */
export const WithTooltips: Story = {
  args: {
    items: MEMBER_ITEMS,
    selected: "normal",
    onSelect: () => {},
    ariaLabel: "회원 상태",
    columns: 4,
  },
  render: (args) => (
    <div className="w-[880px]">
      <Card>
        <CardBody>
          <StatGrid {...args} />
        </CardBody>
      </Card>
    </div>
  ),
};

/** 고르면 선택이 옮겨 간다 — 선택은 테두리, hover 는 면 */
export const Interaction: Story = {
  args: {
    items: MEMBER_ITEMS,
    selected: "all",
    onSelect: () => {},
    ariaLabel: "회원 상태",
    columns: 4,
  },
  render: () => <Demo columns={4} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const group = canvas.getByRole("group", { name: "회원 상태" });
    await expect(group).toBeInTheDocument();

    const all = canvas.getByRole("button", { name: "전체 12,840명" });
    const normal = canvas.getByRole("button", { name: "정상 9,120명" });

    await expect(all).toHaveAttribute("aria-pressed", "true");
    await expect(normal).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(normal);

    await expect(normal).toHaveAttribute("aria-pressed", "true");
    await expect(all).toHaveAttribute("aria-pressed", "false");
  },
};
