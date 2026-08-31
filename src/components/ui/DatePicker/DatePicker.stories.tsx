import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Button } from "../Button";
import { DatePicker, type DateRange } from "./DatePicker";

/** 스토리 결과가 오늘 날짜에 흔들리지 않도록 기준 달을 고정한다 */
const FIXED_MONTH = new Date(2026, 7, 1);

const meta = {
  title: "Components/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------
 * 제어형 래퍼 — DatePicker 는 제어형만 지원하므로 스토리마다 상태를 소유한다
 * ---------------------------------------------------------------------- */

function ControlledSingle({
  inline = false,
  disabled = false,
}: {
  inline?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState<Date | undefined>(undefined);
  return (
    <div className="flex flex-col items-start gap-3">
      <DatePicker
        value={value}
        onChange={setValue}
        defaultMonth={FIXED_MONTH}
        inline={inline}
        disabled={disabled}
      />
      <p className="text-text-sub label-medium">
        선택된 값: {value ? value.toLocaleDateString("ko-KR") : "없음"}
      </p>
    </div>
  );
}

function ControlledRange({ numberOfMonths = 1 }: { numberOfMonths?: number }) {
  const [value, setValue] = useState<DateRange | undefined>(undefined);
  return (
    <div className="flex flex-col items-start gap-3">
      <DatePicker
        mode="range"
        value={value}
        onChange={setValue}
        numberOfMonths={numberOfMonths}
        defaultMonth={FIXED_MONTH}
      />
      <p className="text-text-sub label-medium">
        {value?.from
          ? `${value.from.toLocaleDateString("ko-KR")} ~ ${value.to?.toLocaleDateString("ko-KR") ?? "…"}`
          : "기간 미선택"}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Stories
 * ---------------------------------------------------------------------- */

/** 기본 — 단일 날짜. 트리거의 날짜 텍스트는 min-width 192 (DESIGN.md §17-1) */
export const Single: Story = {
  render: () => <ControlledSingle />,
};

/** 기간 선택. 트리거가 시작일·종료일 두 칸 + 가운데 구분 아이콘으로 나뉜다 */
export const Range: Story = {
  render: () => <ControlledRange />,
};

/** 두 달을 나란히. 월 간격이 24 → 32 로 넓어진다 (DESIGN.md §17) */
export const TwoMonths: Story = {
  render: () => <ControlledRange numberOfMonths={2} />,
};

/** 인라인형 — 트리거 없이 달력만. radius 0 · 그림자 없음 */
export const Inline: Story = {
  render: () => <ControlledSingle inline />,
};

/** 비활성 트리거. 배경이 field-disabled 로 바뀌고 경계선이 사라진다 */
export const Disabled: Story = {
  render: () => <ControlledSingle disabled />,
};

/** 선택 불가 날짜 — 과거 날짜를 막은 예약일 선택 */
export const WithDisabledDates: Story = {
  render: function WithDisabledDatesStory() {
    const [value, setValue] = useState<Date | undefined>(undefined);
    return (
      <DatePicker
        value={value}
        onChange={setValue}
        defaultMonth={FIXED_MONTH}
        disabledDates={{ before: new Date(2026, 7, 15) }}
        placeholder="예약일 선택"
      />
    );
  },
};

/** 오늘 표시 · 선택 상태를 함께 보는 예 (오늘 날짜에 4px 점이 찍힌다) */
export const TodayAndSelected: Story = {
  render: function TodayAndSelectedStory() {
    const today = new Date();
    const [value, setValue] = useState<Date | undefined>(today);
    return (
      <DatePicker
        inline
        value={value}
        onChange={setValue}
        defaultMonth={today}
      />
    );
  },
};

/**
 * 대시보드 맥락 — 주문 조회 기간 필터.
 * 같은 행의 컨트롤은 높이를 40 으로 통일한다 (DESIGN_참고.md §2).
 */
export const OrderPeriodFilter: Story = {
  render: function OrderPeriodFilterStory() {
    const [period, setPeriod] = useState<DateRange | undefined>({
      from: new Date(2026, 7, 1),
      to: new Date(2026, 7, 14),
    });

    return (
      <div className="flex flex-col gap-4 rounded-medium bg-surface p-6">
        <h3 className="text-text heading-medium-bold">주문 조회</h3>

        <div className="flex items-center gap-3">
          <span className="text-text-sub label-medium">조회 기간</span>
          <DatePicker
            mode="range"
            value={period}
            onChange={setPeriod}
            numberOfMonths={2}
            defaultMonth={FIXED_MONTH}
            aria-label="주문 조회 기간"
          />
          <Button variant="secondary">초기화</Button>
          <Button>조회</Button>
        </div>

        <p className="text-text-sub body-medium">
          {period?.from && period.to
            ? `${period.from.toLocaleDateString("ko-KR")} ~ ${period.to.toLocaleDateString("ko-KR")} 주문 내역을 조회합니다.`
            : "조회할 기간을 선택하세요."}
        </p>
      </div>
    );
  },
};

/**
 * 동작 검증 — 트리거를 눌러 패널을 열고, 날짜를 고르면 트리거 표기가 바뀐다.
 * 패널은 body 로 포털되므로 canvas 가 아니라 `screen` 으로 찾는다.
 */
export const Interaction: Story = {
  render: () => <ControlledSingle />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const trigger = canvas.getByRole("button", { name: /날짜 선택/ });
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    const panel = await screen.findByRole("dialog", { name: "날짜 선택" });
    await expect(panel).toBeInTheDocument();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    // 오늘이 그 날이면 라벨 앞에 "오늘, " 이 붙으므로 정규식으로 찾는다
    await userEvent.click(
      await screen.findByRole("button", { name: /2026년 8월 14일/ }),
    );

    await expect(canvas.getByText("2026.08.14")).toBeInTheDocument();
  },
};
