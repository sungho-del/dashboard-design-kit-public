import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Textarea } from "./Textarea";

const meta = {
  title: "Components/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { onChange: fn(), placeholder: "내용을 입력하세요" },
  argTypes: {
    minRows: { control: { type: "number", min: 1 } },
    resize: { control: "inline-radio", options: ["none", "vertical"] },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — min-width 240 · padding 12 · 기본 3행(24 × 3 + 12 × 2 = 96) · outline 1px border */
export const Default: Story = {};

/** placeholder는 `text-minimal`로 값 텍스트보다 한 단계 흐리게 */
export const Placeholder: Story = {
  args: { placeholder: "예: 배송 시 요청사항을 입력해 주세요" },
};

/** 값이 채워진 상태 (14 / 24 / 400) */
export const WithValue: Story = {
  args: {
    defaultValue:
      "부재 시 경비실에 맡겨주세요.\n택배함 비밀번호는 주문 메모를 확인해 주세요.",
  },
};

/** 6행짜리 큰 입력 — `minRows`로 최소 높이를 조절한다 */
export const MinRows6: Story = {
  args: { minRows: 6, placeholder: "상세 설명을 입력하세요" },
};

/** 한 행짜리 컴팩트 입력 */
export const MinRows1: Story = {
  args: { minRows: 1, placeholder: "한 줄 메모" },
};

/**
 * 글자수 카운터 — `maxLength`를 주면 `bottom 8 / right 12`에 `현재/최대`가 표시된다.
 * (원본 `style_textareaCount`에서 확인된 유일한 실측값)
 */
export const WithCounter: Story = {
  args: { maxLength: 500, placeholder: "최대 500자까지 입력할 수 있습니다" },
};

/**
 * 카운터 + 세로 리사이즈를 함께 쓰면 카운터와 브라우저 기본 리사이즈 그립이
 * 오른쪽 아래에서 겹쳐 보인다. 카운터를 쓸 때는 `resize="none"`을 권장한다.
 */
export const CounterWithoutResize: Story = {
  args: {
    maxLength: 200,
    resize: "none",
    defaultValue: "카운터가 있는 입력은 크기를 고정하는 편이 깔끔하다.",
  },
};

/** 카운터가 한계에 가까운 상태 */
export const CounterNearLimit: Story = {
  args: {
    maxLength: 40,
    resize: "none",
    defaultValue: "카운터는 입력할 때마다 현재 글자수를 갱신한다.",
  },
};

/** 리사이즈 잠금 — 레이아웃이 흔들리면 안 되는 자리에 쓴다 */
export const ResizeNone: Story = {
  args: { resize: "none", placeholder: "크기를 조절할 수 없습니다" },
};

/** disabled — 배경 `field-disabled`, 경계선 제거, cursor not-allowed */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "수정할 수 없는 내용입니다." },
};

export const DisabledWithCounter: Story = {
  args: {
    disabled: true,
    maxLength: 100,
    defaultValue: "비활성 상태에서는 카운터도 흐려진다.",
  },
};

/** error — 배경 `surface-critical-secondary`. hover 시 경계선이 critical로 바뀐다 */
export const Invalid: Story = {
  args: { invalid: true, defaultValue: "필수 입력 항목입니다." },
};

/** 라벨과 함께 — `id`를 넘겨 `<label htmlFor>`로 연결한다 */
export const WithLabel: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-1.5">
      <label htmlFor="textarea-with-label" className="label-medium text-text">
        요청사항
      </label>
      <Textarea {...args} id="textarea-with-label" maxLength={300} />
    </div>
  ),
};

/** 상태 한눈에 비교 */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-3">
      <Textarea {...args} placeholder="default" />
      <Textarea {...args} placeholder="with counter" maxLength={200} />
      <Textarea {...args} placeholder="invalid" invalid />
      <Textarea {...args} placeholder="disabled" disabled />
    </div>
  ),
};

/** 입력 동작 검증 — 타이핑하면 값이 반영되고 onChange가 호출된다 */
export const Typing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");

    await userEvent.type(textarea, "디자인 시스템");

    await expect(textarea).toHaveValue("디자인 시스템");
    await expect(args.onChange).toHaveBeenCalled();
  },
};

/** 카운터 동작 검증 — 타이핑한 만큼 현재 글자수가 갱신된다 */
export const CounterUpdates: Story = {
  args: { maxLength: 100, resize: "none" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");

    await expect(canvas.getByText("0/100")).toBeInTheDocument();

    await userEvent.type(textarea, "12345");

    await expect(canvas.getByText("5/100")).toBeInTheDocument();
  },
};
