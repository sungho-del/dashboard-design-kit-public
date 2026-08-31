import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Search, X } from "lucide-react";
import { Input, InputGroup, InputAttachedButton } from "./Input";

const meta = {
  title: "Components/Input",
  component: Input,
  tags: ["autodocs"],
  args: { onChange: fn(), onClick: fn(), placeholder: "내용을 입력하세요" },
  argTypes: {
    leftIcon: { control: false },
    rightIcon: { control: false },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — height 40 · min-width 240 · outline 1px border */
export const Default: Story = {};

/** placeholder는 `text-minimal`로 값 텍스트보다 한 단계 흐리게 */
export const Placeholder: Story = {
  args: { placeholder: "예: 홍길동" },
};

/** 값이 채워진 상태 (14 / 24 / 400) */
export const WithValue: Story = {
  args: { defaultValue: "홍길동" },
};

/** 좌측 아이콘 슬롯 — 아이콘은 shrink-0이라 필드가 좁아져도 찌그러지지 않는다 */
export const WithLeftIcon: Story = {
  args: {
    leftIcon: <Search size={16} strokeWidth={1.2} aria-hidden />,
    placeholder: "검색어를 입력하세요",
  },
};

/** 우측 아이콘 슬롯 */
export const WithRightIcon: Story = {
  args: {
    rightIcon: <X size={16} strokeWidth={1.2} aria-hidden />,
    defaultValue: "지울 수 있는 값",
  },
};

/** 검색 필드 예시 — 좌우 아이콘을 함께 사용 */
export const SearchField: Story = {
  args: {
    type: "search",
    leftIcon: <Search size={16} strokeWidth={1.2} aria-hidden />,
    rightIcon: <X size={16} strokeWidth={1.2} aria-hidden />,
    placeholder: "상품명, 주문번호 검색",
  },
};

/** disabled — 배경 `field-disabled`, 경계선 제거, cursor not-allowed */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "수정할 수 없음" },
};

export const DisabledPlaceholder: Story = {
  args: { disabled: true, placeholder: "입력할 수 없습니다" },
};

/** error — 배경 `surface-critical-secondary`. hover 시 경계선이 critical로 바뀐다 */
export const Invalid: Story = {
  args: { invalid: true, defaultValue: "형식이 올바르지 않습니다" },
};

/** 상태 한눈에 비교 */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex w-80 flex-col gap-3">
      <Input {...args} placeholder="default" />
      <Input
        {...args}
        placeholder="with icon"
        leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
      />
      <Input {...args} placeholder="invalid" invalid />
      <Input {...args} placeholder="disabled" disabled />
    </div>
  ),
};

/** 입력 동작 검증 — 타이핑하면 값이 반영되고 onChange가 호출된다 */
export const Typing: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox");

    await userEvent.type(input, "디자인 시스템");

    await expect(input).toHaveValue("디자인 시스템");
    await expect(args.onChange).toHaveBeenCalled();
  },
};

/**
 * §5-1 부착형 버튼 — 필드 **우측**에 40×56 버튼을 붙인다.
 *
 * 맞닿는 면의 radius는 `InputGroup`이 지우고, 바깥쪽 모서리는 각 요소가 유지한다.
 * 버튼의 경계선은 위·오른쪽·아래 **3면만** 그린다 — 좌측은 필드의 outline이
 * 이미 차지하고 있어 또 그리면 2px로 겹쳐 보인다.
 */
export const Attached: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      <InputGroup>
        <Input {...args} placeholder="주문번호·상품·주문자 검색" />
        <InputAttachedButton>검색</InputAttachedButton>
      </InputGroup>

      <InputGroup>
        <Input {...args} placeholder="눌린 상태(드롭다운 열림 등)" />
        <InputAttachedButton active>검색</InputAttachedButton>
      </InputGroup>

      <InputGroup>
        <Input {...args} placeholder="비활성" disabled />
        <InputAttachedButton disabled>검색</InputAttachedButton>
      </InputGroup>
    </div>
  ),
};

/** 부착 버튼 클릭 동작 */
export const AttachedClick: Story = {
  render: (args) => (
    <InputGroup>
      <Input {...args} placeholder="검색어" />
      <InputAttachedButton onClick={args.onClick}>검색</InputAttachedButton>
    </InputGroup>
  ),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole("button", { name: "검색" }));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
