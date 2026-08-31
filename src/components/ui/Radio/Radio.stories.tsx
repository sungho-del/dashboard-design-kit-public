import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Radio, RadioGroup } from "./Radio";

const meta = {
  title: "Components/Radio",
  component: Radio,
  tags: ["autodocs"],
  args: { onChange: fn(), name: "story-radio" },
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
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 원 20 · 미선택은 `bg-field` + `border-minimal` 1px outline */
export const Default: Story = {
  args: { label: "신용·체크카드", value: "card" },
};

/** 선택 — 테두리 2px `action-primary` + 가운데 점 8 */
export const Checked: Story = {
  args: { label: "신용·체크카드", value: "card", defaultChecked: true },
};

/** 라벨 없이 컨트롤만 */
export const WithoutLabel: Story = {
  args: { value: "card", "aria-label": "신용·체크카드" },
};

/** 보조 설명 — 라벨 `label-medium`, 설명 `body-small` + `text-sub` */
export const WithDescription: Story = {
  args: {
    label: "계좌이체",
    description: "영업일 기준 1일 이내에 입금 확인이 완료됩니다.",
    value: "transfer",
  },
};

/** disabled — `field-disabled` 배경 + `icon-disabled` 점 + cursor not-allowed */
export const Disabled: Story = {
  args: { label: "휴대폰 결제 (점검 중)", value: "phone", disabled: true },
};

export const DisabledChecked: Story = {
  args: {
    label: "변경할 수 없음",
    value: "fixed",
    disabled: true,
    defaultChecked: true,
  },
};

/** error — `aria-invalid` + 경계선 `border-critical` */
export const Invalid: Story = {
  args: {
    label: "결제 수단을 선택해주세요",
    value: "none",
    invalid: true,
  },
};

/** small(16) — 밀도가 높은 필터 목록용 */
export const Small: Story = {
  args: { label: "16px 라디오", value: "small", size: "small" },
};

/** 상태 한눈에 비교 */
export const AllStates: Story = {
  args: { value: "state" },
  render: (args) => (
    <div className="flex flex-col gap-3">
      <Radio {...args} name="all-a" label="기본" value="a" />
      <Radio {...args} name="all-b" label="선택됨" value="b" defaultChecked />
      <Radio {...args} name="all-c" label="에러" value="c" invalid />
      <Radio {...args} name="all-d" label="비활성" value="d" disabled />
      <Radio
        {...args}
        name="all-e"
        label="비활성 + 선택됨"
        value="e"
        disabled
        defaultChecked
      />
      <Radio {...args} name="all-f" label="small" value="f" size="small" />
    </div>
  ),
};

/** RadioGroup — 세로 배치 + 그룹 접근성 이름 */
export const Group: Story = {
  render: () => (
    <RadioGroup label="배송 방법" defaultValue="standard" name="delivery">
      <Radio
        value="standard"
        label="일반 배송"
        description="2~3일 소요 · 무료"
      />
      <Radio
        value="express"
        label="빠른 배송"
        description="익일 도착 · 3,000원"
      />
      <Radio
        value="pickup"
        label="매장 픽업"
        description="주문 후 2시간 뒤 수령"
      />
    </RadioGroup>
  ),
};

/** RadioGroup — 가로 배치 */
export const GroupHorizontal: Story = {
  render: () => (
    <RadioGroup
      label="정렬 기준"
      orientation="horizontal"
      defaultValue="recent"
      name="sort"
    >
      <Radio value="recent" label="최신순" />
      <Radio value="popular" label="인기순" />
      <Radio value="price" label="가격순" />
    </RadioGroup>
  ),
};

/** RadioGroup — 그룹 전체 비활성 */
export const GroupDisabled: Story = {
  render: () => (
    <RadioGroup
      label="결제 수단"
      defaultValue="card"
      name="pay-disabled"
      disabled
    >
      <Radio value="card" label="신용·체크카드" />
      <Radio value="transfer" label="계좌이체" />
    </RadioGroup>
  ),
};

function DeliveryForm() {
  const [method, setMethod] = useState("standard");

  return (
    <div className="flex w-100 flex-col gap-4 rounded-medium bg-surface p-6">
      <RadioGroup
        label="배송 방법"
        name="delivery-controlled"
        value={method}
        onValueChange={setMethod}
      >
        <Radio
          value="standard"
          label="일반 배송"
          description="2~3일 소요 · 무료"
        />
        <Radio
          value="express"
          label="빠른 배송"
          description="익일 도착 · 3,000원"
        />
        <Radio
          value="pickup"
          label="매장 픽업"
          description="재고가 있는 매장에서만 선택할 수 있습니다"
          disabled
        />
      </RadioGroup>
      <p className="body-small text-text-sub">선택된 값: {method}</p>
    </div>
  );
}

/** 실제 맥락 — 제어 모드 그룹. 선택값을 폼 상태로 끌어올린다 */
export const ControlledGroup: Story = {
  render: () => <DeliveryForm />,
};

/** 선택 동작 검증 — 클릭으로 선택되고, 같은 그룹의 다른 항목은 해제된다 */
export const SelectOne: Story = {
  render: () => (
    <RadioGroup label="배송 방법" defaultValue="standard" name="play-delivery">
      <Radio value="standard" label="일반 배송" />
      <Radio value="express" label="빠른 배송" />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const standard = canvas.getByRole("radio", { name: "일반 배송" });
    const express = canvas.getByRole("radio", { name: "빠른 배송" });

    await expect(standard).toBeChecked();

    await userEvent.click(canvas.getByText("빠른 배송"));

    await expect(express).toBeChecked();
    await expect(standard).not.toBeChecked();
    await expect(canvas.getByRole("radiogroup")).toHaveAttribute(
      "aria-orientation",
      "vertical",
    );
  },
};
