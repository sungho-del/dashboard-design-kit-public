import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../Table";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  args: { onChange: fn() },
  argTypes: {
    label: { control: "text" },
    description: { control: "text" },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 박스 20 · 미선택은 `bg-field` + `border-minimal` 1px outline */
export const Default: Story = {
  args: { label: "이용약관에 동의합니다" },
};

/** 선택 — `action-primary` 채움 + `text-inverse` 체크 글리프 */
export const Checked: Story = {
  args: { label: "이용약관에 동의합니다", defaultChecked: true },
};

/** 라벨 없이 컨트롤만. 테이블 셀처럼 라벨이 따로 있는 자리에서 쓴다 */
export const WithoutLabel: Story = {
  args: { "aria-label": "행 선택" },
};

/** 보조 설명 — 라벨 `label-medium`, 설명 `body-small` + `text-sub` */
export const WithDescription: Story = {
  args: {
    label: "마케팅 정보 수신",
    description:
      "신규 기능·혜택 소식을 이메일로 받아봅니다. 언제든 해제할 수 있어요.",
  },
};

/**
 * 부분 선택 — 하위 항목 중 일부만 선택된 상태.
 * 네이티브 `input.indeterminate`를 함께 세팅하므로 스크린리더에도 mixed로 전달된다.
 */
export const Indeterminate: Story = {
  args: { label: "전체 선택", indeterminate: true },
};

/** disabled — `field-disabled` 배경 + `icon-disabled` + cursor not-allowed */
export const Disabled: Story = {
  args: { label: "선택할 수 없음", disabled: true },
};

export const DisabledChecked: Story = {
  args: { label: "해제할 수 없음", disabled: true, defaultChecked: true },
};

/** error — `aria-invalid` + 경계선 `border-critical` */
export const Invalid: Story = {
  args: {
    label: "필수 약관에 동의해야 합니다",
    description: "동의하지 않으면 가입을 완료할 수 없습니다.",
    invalid: true,
  },
};

/** small(16) — 밀도가 높은 테이블·필터 목록용 */
export const Small: Story = {
  args: { label: "16px 체크박스", size: "small" },
};

/** 상태 한눈에 비교 */
export const AllStates: Story = {
  args: { label: "라벨" },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Checkbox {...args} label="기본" />
      <Checkbox {...args} label="선택됨" defaultChecked />
      <Checkbox {...args} label="부분 선택" indeterminate />
      <Checkbox {...args} label="에러" invalid />
      <Checkbox {...args} label="비활성" disabled />
      <Checkbox {...args} label="비활성 + 선택됨" disabled defaultChecked />
      <Checkbox {...args} label="small" size="small" />
    </div>
  ),
};

const ROWS = [
  { id: "ORD-1042", name: "김도현", amount: "128,000원" },
  { id: "ORD-1043", name: "이서연", amount: "54,000원" },
  { id: "ORD-1044", name: "박준호", amount: "312,000원" },
];

/**
 * 헤더 체크박스는 "일부만 선택" 구간에서 반드시 indeterminate가 되어야 한다.
 * 이 상태가 없으면 사용자는 헤더 체크박스만 보고 전체 선택 여부를 오판한다.
 */
function OrderTable() {
  const [selected, setSelected] = useState<string[]>([ROWS[0].id]);
  const allChecked = selected.length === ROWS.length;
  const someChecked = selected.length > 0 && !allChecked;

  return (
    <div className="w-150 overflow-hidden rounded-medium bg-surface">
      <Table>
        <TableHead>
          <TableRow>
            <TableTh align="center" className="w-12">
              <Checkbox
                size="small"
                aria-label="전체 선택"
                checked={allChecked}
                indeterminate={someChecked}
                onChange={(event) =>
                  setSelected(event.target.checked ? ROWS.map((r) => r.id) : [])
                }
              />
            </TableTh>
            <TableTh>주문번호</TableTh>
            <TableTh>주문자</TableTh>
            <TableTh>결제금액</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.id}>
              <TableTd align="center">
                <Checkbox
                  size="small"
                  aria-label={`${row.id} 선택`}
                  checked={selected.includes(row.id)}
                  onChange={(event) =>
                    setSelected((prev) =>
                      event.target.checked
                        ? [...prev, row.id]
                        : prev.filter((id) => id !== row.id),
                    )
                  }
                />
              </TableTd>
              <TableTd>{row.id}</TableTd>
              <TableTd>{row.name}</TableTd>
              <TableTd>{row.amount}</TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** 실제 맥락 — 테이블 전체선택 헤더 (부분 선택 → indeterminate) */
export const TableSelectAll: Story = {
  render: () => <OrderTable />,
};

/** 클릭·키보드 동작 검증 — 라벨을 눌러도 토글되고 Space로도 토글된다 */
export const Toggle: Story = {
  args: { label: "알림 받기" },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const checkbox = canvas.getByRole("checkbox", { name: "알림 받기" });

    await expect(checkbox).not.toBeChecked();

    // 라벨 클릭으로 토글 (label이 컨트롤을 감싸 클릭 영역이 넓다)
    await userEvent.click(canvas.getByText("알림 받기"));
    await expect(checkbox).toBeChecked();
    await expect(args.onChange).toHaveBeenCalled();

    // Space 키로 토글 — 네이티브 input이라 별도 구현 없이 동작한다
    checkbox.focus();
    await userEvent.keyboard("[Space]");
    await expect(checkbox).not.toBeChecked();
  },
};
