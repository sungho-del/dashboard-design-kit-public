import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from "@storybook/test";
import { Select, type SelectOption } from "./Select";

/** 주문 상태 — 대시보드에서 가장 흔한 셀렉트 사용처 */
const ORDER_STATUS_OPTIONS: SelectOption[] = [
  { value: "pending", label: "결제대기" },
  { value: "paid", label: "결제완료" },
  { value: "preparing", label: "상품준비중" },
  { value: "shipping", label: "배송중" },
  { value: "done", label: "배송완료" },
  { value: "canceled", label: "취소/환불", disabled: true },
];

/** 페이지당 노출 개수 — 테이블 하단 페이지네이션 옆에 붙는 셀렉트 */
const PAGE_SIZE_OPTIONS: SelectOption[] = [
  { value: "10", label: "10개씩 보기" },
  { value: "20", label: "20개씩 보기" },
  { value: "50", label: "50개씩 보기" },
  { value: "100", label: "100개씩 보기" },
];

/** 패널이 아래로 펼쳐질 자리를 만들어 준다 (트리거 폭은 사용처가 정한다) */
function Stage({ children }: { children: ReactNode }) {
  return <div className="h-96 w-60">{children}</div>;
}

const meta = {
  title: "Components/Select",
  component: Select,
  tags: ["autodocs"],
  args: {
    options: ORDER_STATUS_OPTIONS,
    onValueChange: fn(),
    "aria-label": "주문 상태",
  },
  argTypes: {
    options: { control: false },
    placement: { control: false },
    ref: { control: false },
  },
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 값이 없으면 placeholder 가 `text-minimal` 로 보인다 */
export const Default: Story = {
  args: {
    label: "주문 상태",
    placeholder: "상태 선택",
  },
};

/** 선택됨 — 값이 있으면 글자색이 `text` 로 올라가고, 패널에서 tonal 배경으로 표시된다 */
export const Selected: Story = {
  args: {
    label: "주문 상태",
    defaultValue: "shipping",
  },
};

/** placeholder만 — 라벨 없이 필터 바에 나란히 놓는 형태 */
export const Placeholder: Story = {
  args: {
    placeholder: "상태 전체",
  },
};

/** 비활성 — 배경 `field-disabled` · 경계선 제거 · 클릭 불가 (DESIGN.md §5) */
export const Disabled: Story = {
  args: {
    label: "주문 상태",
    defaultValue: "paid",
    disabled: true,
  },
};

/** 에러 — 배경 `surface-critical-secondary`, hover 시 경계선만 critical 로 바뀐다 */
export const Invalid: Story = {
  args: {
    label: "주문 상태",
    placeholder: "상태를 선택하세요",
    invalid: true,
  },
};

/** 비활성 옵션 — 키보드 이동·타이핑 검색 모두 건너뛴다 */
export const WithDisabledOption: Story = {
  args: {
    label: "주문 상태",
    defaultValue: "pending",
  },
};

/**
 * 많은 옵션 — 패널이 max-height 232 에서 멈추고 스크롤된다.
 * `overscroll-contain` 이라 목록 끝에서 페이지가 따라 움직이지 않는다.
 */
export const ManyOptions: Story = {
  args: {
    label: "담당자",
    placeholder: "담당자 선택",
    options: Array.from({ length: 40 }, (_, index) => ({
      value: `staff-${index + 1}`,
      label: `운영자 ${String(index + 1).padStart(2, "0")}`,
    })),
  },
};

/**
 * 패널 최대 높이 — 기본은 §5-2 검색 결과 패널 규격인 **232**다.
 *
 * 쓰는 자리마다 규격이 달라 `panelMaxHeight` 로 열어 두었다. 대표적으로 §8
 * 페이지네이션의 개수 셀렉트는 **292**이며, `PaginationSizeSelect` 가 이 값을 넘긴다.
 * 뷰포트가 좁으면 이 값과 무관하게 `availableHeight` 로 더 줄어든다.
 */
export const PanelMaxHeight: Story = {
  args: {
    label: "담당자",
    placeholder: "담당자 선택",
    panelMaxHeight: 292,
    options: Array.from({ length: 40 }, (_, index) => ({
      value: `staff-${index + 1}`,
      label: `운영자 ${String(index + 1).padStart(2, "0")}`,
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("combobox"));

    // 패널 높이는 floating-ui 가 inline style 로 넣는다(뷰포트에 따라 더 줄어들 수 있어
    // 클래스로 두지 않는다). 여기서는 패널이 실제로 열리는지까지만 확인한다.
    await waitFor(() => expect(screen.getByRole("listbox")).toBeVisible());
  },
};

/** 긴 라벨 — 트리거·옵션 모두 말줄임 처리된다. 패널 폭은 트리거와 같다 */
export const LongLabels: Story = {
  args: {
    label: "유입 경로",
    defaultValue: "search",
    options: [
      { value: "search", label: "검색 유입 (네이버·구글·다음 통합 집계)" },
      { value: "sns", label: "SNS 유입 (인스타그램·페이스북·유튜브)" },
      { value: "direct", label: "직접 유입 (URL 직접 입력·즐겨찾기)" },
    ],
  },
};

/**
 * 대시보드 맥락 1 — 주문 상세에서 상태를 바꾸는 제어형 셀렉트.
 * 값의 소유권이 화면에 있으므로 `value` + `onValueChange` 를 쓴다.
 */
export const OrderStatusChange: Story = {
  args: { label: "주문 상태" },
  // 훅을 쓰므로 이름 있는 함수로 둔다 — 렌더 함수가 컴포넌트로 인식돼야 한다
  render: function OrderStatusDemo(args) {
    const [status, setStatus] = useState("paid");
    return (
      <div className="flex flex-col gap-3">
        <Select {...args} value={status} onValueChange={setStatus} />
        <p className="body-medium text-text-sub">
          현재 상태: <span className="text-text">{status}</span>
        </p>
      </div>
    );
  },
};

/** 대시보드 맥락 2 — 테이블 하단의 페이지당 개수. 라벨 없이 짧은 폭으로 쓴다 */
export const PageSize: Story = {
  args: {
    options: PAGE_SIZE_OPTIONS,
    defaultValue: "20",
    "aria-label": "페이지당 노출 개수",
    className: "w-40",
  },
};

/**
 * 키보드 선택 흐름 — 트리거에서 ↓ 로 이동하고 Enter 로 확정한다.
 * 포커스는 트리거에 남고 활성 옵션은 `aria-activedescendant` 로만 가리킨다.
 */
export const KeyboardFlow: Story = {
  args: {
    label: "주문 상태",
    placeholder: "상태 선택",
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox");

    // 닫힌 상태 — aria-expanded 는 false
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // ↓ 로 열면 첫 활성 옵션이 잡힌다 (패널은 포털이라 screen 으로 찾는다)
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const listbox = await screen.findByRole("listbox");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveFocus();

    await waitFor(() =>
      expect(trigger).toHaveAttribute(
        "aria-activedescendant",
        within(listbox).getByRole("option", { name: "결제대기" }).id,
      ),
    );

    // ↓ 두 번 → 상품준비중, Enter 로 확정
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    await waitFor(() => expect(listbox).not.toBeInTheDocument());
    await expect(args.onValueChange).toHaveBeenCalledWith("preparing");
    await expect(trigger).toHaveTextContent("상품준비중");
  },
};
