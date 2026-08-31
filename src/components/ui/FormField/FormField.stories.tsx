import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Button } from "../Button";
import { Input } from "../Input";
import { Select } from "../Select";
import { Switch } from "../Switch";
import { Textarea } from "../Textarea";
import { TextButton } from "../TextButton";
import { FormField } from "./FormField";

const meta = {
  title: "Components/FormField",
  component: FormField,
  tags: ["autodocs"],
  args: {
    label: "상품명",
    children: <Input placeholder="상품명을 입력하세요" />,
  },
  argTypes: {
    label: { control: "text" },
    labelDescription: { control: "text" },
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
    htmlFor: { control: "text" },
    orientation: {
      control: "inline-radio",
      options: ["column", "row"],
    },
    children: { control: false },
    labelAction: { control: false },
  },
  decorators: [
    (Story) => (
      <div className="w-120">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "`Input`·`Textarea`·`Select` 에 라벨·도움말·에러를 붙이는 래퍼입니다. (DESIGN.md §29)",
          "",
          "`Checkbox`·`Radio`·`Switch` 는 라벨이 컨트롤 옆에 붙는 형태라 자체적으로 라벨을 갖고 있고,",
          "이 래퍼는 **라벨이 컨트롤 위(또는 왼쪽)에 오는 필드**의 자리를 표준화합니다.",
          "폼마다 손으로 조립하면 필드가 늘어날수록 간격이 흔들립니다.",
          "",
          "### 간격 (전부 실측)",
          "",
          "- 라벨 텍스트 ↔ 라벨 부연설명 **4** (`gap-1`)",
          "- 라벨 ↔ 입력 ↔ 메시지 **6** (`gap-1.5`)",
          "- 필드 ↔ 필드 **20** (`gap-5`) — 이건 폼 쪽 책임이라 이 컴포넌트가 내지 않습니다",
          "- 가로 배치는 row-gap **24** / column-gap **12**, 991px 이하에서만 줄바꿈",
          "",
          "### 사용 규칙",
          "",
          "- **`label` 에 설명을 섞지 않습니다.** 라벨은 접근성 이름이 되므로, 부연은 `labelDescription`(라벨 아래) 또는 `description`(입력 아래)으로 분리합니다. (§29-7)",
          "- **도움말과 에러를 동시에 띄우지 않습니다.** `error` 는 `description` 을 같은 자리에서 교체합니다. 레이아웃이 밀리지 않고 시선도 흩어지지 않습니다. (§29-5)",
          "- **필수 표시 `*` 는 시각 기호일 뿐입니다.** `aria-hidden` 으로 감추고 의미는 컨트롤의 `aria-required` 가 전달합니다.",
          "- **id 를 손으로 잇지 않습니다.** 자식이 단일 요소면 `id`·`aria-describedby`·`aria-required`·`invalid` 를 자동 주입하며, 이미 지정한 값은 존중합니다.",
          "- **폼 2열 grid 는 만들지 않습니다.** 한 필드 안에서 `flex-1 min-w-0` 으로 컨트롤을 병치합니다. (§29-4)",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 세로 배치. 라벨 ↔ 입력 gap 6 */
export const Default: Story = {};

/**
 * `required` — 라벨 뒤에 `*` 를 `text-critical` 로 붙인다.
 * 기호는 `aria-hidden` 이라 스크린리더가 "별표" 를 읽지 않고,
 * 필수 여부는 컨트롤의 `aria-required` 가 전달한다.
 */
export const Required: Story = {
  args: { required: true },
};

/**
 * `labelDescription` — 라벨 바로 아래 부연설명. gap 4 · `body-small` · `text-sub`.
 * **`<label>` 바깥**에 렌더된다 — 안에 넣으면 접근성 이름에 섞인다. (§29-7)
 */
export const WithLabelDescription: Story = {
  args: {
    labelDescription: "고객에게 그대로 노출되는 이름입니다",
  },
};

/**
 * `labelAction` — 라벨 행 우측 액션. gap 8 · 양끝 정렬.
 * 액션이 없으면 `justify-between` 을 방출하지 않아 라벨이 좌측에 붙는다.
 */
export const WithLabelAction: Story = {
  args: {
    labelAction: <TextButton size="small">기본값으로</TextButton>,
  },
};

/** `description` — 입력 아래 도움말. gap 6 · `aria-describedby` 로 연결된다 */
export const WithDescription: Story = {
  args: {
    description: "최대 100자까지 입력할 수 있습니다",
  },
};

/**
 * `error` — 메시지가 `text-critical` 로 바뀌고 `role="alert"` 로 즉시 읽힌다.
 * 자식에는 `invalid` 와 `aria-invalid` 가 함께 주입되어 컨트롤 배경도 critical 이 된다.
 */
export const WithError: Story = {
  args: {
    required: true,
    error: "상품명을 입력해 주세요",
  },
};

/**
 * ❌ **하지 말 것 — 도움말과 에러를 동시에 표시.**
 * `error` 는 `description` 을 **같은 자리에서 교체**한다 (§29-5).
 * 둘 다 넘겨도 아래처럼 에러만 남는다 — 레이아웃이 밀리지 않는다.
 */
export const ErrorReplacesDescription: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-sub">평상시 — 도움말</p>
        <FormField
          label="상품명"
          required
          description="최대 100자까지 입력할 수 있습니다"
        >
          <Input defaultValue="블랙 오버핏 티셔츠" />
        </FormField>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-sub">
          에러 — 같은 자리를 에러가 차지한다
        </p>
        <FormField
          label="상품명"
          required
          description="최대 100자까지 입력할 수 있습니다"
          error="상품명을 입력해 주세요"
        >
          <Input defaultValue="" />
        </FormField>
      </div>
    </div>
  ),
};

/**
 * `orientation="row"` — 원본에 세로와 **동급 변형으로 존재한다** (§29-3).
 * 라벨이 남는 폭을 점유하고(`flex-1`) 컨트롤이 우측에 붙는다.
 * 토글·옵션 행처럼 **컨트롤이 작고 라벨이 문장**인 경우에 쓴다.
 * 991px 이하에서만 줄바꿈한다 — 폼 규칙 중 유일한 반응형 처리다.
 */
export const Row: Story = {
  args: {
    orientation: "row",
    label: "재고 자동 차감",
    labelDescription: "주문이 결제되면 재고 수량에서 자동으로 뺍니다",
    children: <Switch defaultChecked />,
  },
};

/** 가로 배치 여러 줄 — 설정 화면의 토글 목록 */
export const RowGroup: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <FormField
        orientation="row"
        label="재고 자동 차감"
        labelDescription="주문이 결제되면 재고 수량에서 자동으로 뺍니다"
      >
        <Switch defaultChecked />
      </FormField>
      <FormField
        orientation="row"
        label="품절 상품 자동 숨김"
        labelDescription="재고가 0이 되면 상품 목록에서 감춥니다"
      >
        <Switch />
      </FormField>
      <FormField
        orientation="row"
        label="배송 완료 알림"
        labelDescription="구매자에게 알림톡을 보냅니다"
      >
        <Switch defaultChecked />
      </FormField>
    </div>
  ),
};

/**
 * `Select`·`Textarea` 조합 — 자식이 단일 요소면 컨트롤 종류와 무관하게
 * `id`·`aria-describedby`·`aria-required`·`invalid` 가 그대로 주입된다.
 * `Textarea` 는 자체 글자수 카운터를 `aria-describedby` 로 이미 잇고 있으므로
 * 도움말과 카운터가 **함께** 읽힌다.
 */
export const WithSelectAndTextarea: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      <FormField
        label="판매 상태"
        required
        description="비공개는 검색에 노출되지 않습니다"
      >
        <Select
          defaultValue="public"
          options={[
            { value: "public", label: "판매중" },
            { value: "soldout", label: "품절" },
            { value: "private", label: "비공개" },
          ]}
        />
      </FormField>

      <FormField
        label="상세 설명"
        labelDescription="상품 상세 페이지 상단에 노출됩니다"
      >
        <Textarea maxLength={200} placeholder="상품을 설명해 주세요" />
      </FormField>

      <FormField label="배송 안내" error="배송 안내 문구를 입력해 주세요">
        <Textarea minRows={2} />
      </FormField>
    </div>
  ),
};

/**
 * 실제 폼 — 필드 간격은 실측 **20**(`gap-5`)이다.
 * 이 간격은 폼(부모)의 책임이고 `FormField` 자신은 내지 않는다.
 */
export const ProductForm: Story = {
  render: () => (
    <form className="flex flex-col gap-5">
      <FormField
        label="상품명"
        required
        labelDescription="고객에게 그대로 노출됩니다"
        labelAction={<TextButton size="small">기본값으로</TextButton>}
      >
        <Input defaultValue="블랙 오버핏 티셔츠" />
      </FormField>

      <FormField label="판매가" required description="원 단위로 입력하세요">
        <Input defaultValue="39000" inputMode="numeric" />
      </FormField>

      <FormField label="판매 상태" required>
        <Select
          defaultValue="public"
          options={[
            { value: "public", label: "판매중" },
            { value: "soldout", label: "품절" },
            { value: "private", label: "비공개" },
          ]}
        />
      </FormField>

      <FormField label="재고 수량" error="재고는 0 이상이어야 합니다">
        <Input defaultValue="-1" inputMode="numeric" />
      </FormField>

      <FormField
        label="상세 설명"
        labelDescription="상품 상세 페이지 상단에 노출됩니다"
      >
        <Textarea maxLength={200} placeholder="상품을 설명해 주세요" />
      </FormField>

      <FormField
        orientation="row"
        label="재고 자동 차감"
        labelDescription="주문이 결제되면 재고 수량에서 자동으로 뺍니다"
      >
        <Switch defaultChecked />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button">
          취소
        </Button>
        <Button variant="primary" type="button">
          저장
        </Button>
      </div>
    </form>
  ),
};

/**
 * 렌더·접근성 검증.
 *
 * 이 컴포넌트의 존재 이유가 "이름은 라벨뿐, 설명은 describedby 로만" 이므로
 * play 에서도 그것을 직접 확인한다. (§29-7)
 */
export const Rendered: Story = {
  args: {
    label: "상품명",
    required: true,
    labelDescription: "고객에게 그대로 노출됩니다",
    description: "최대 100자까지 입력할 수 있습니다",
    children: <Input placeholder="상품명을 입력하세요" />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // required 라벨의 텍스트는 "상품명 *" 이므로 라벨 텍스트가 아닌 role 로 찾는다
    const input = canvas.getByRole("textbox");

    // 접근성 이름은 라벨 텍스트뿐 — 부연설명도 `*` 도 섞이지 않는다
    await expect(input).toHaveAccessibleName("상품명");
    await expect(input).toHaveAccessibleDescription(
      "최대 100자까지 입력할 수 있습니다",
    );
    await expect(input).toHaveAttribute("aria-required", "true");
    await expect(input).not.toHaveAttribute("aria-invalid");

    await userEvent.type(input, "블랙 오버핏 티셔츠");
    await expect(input).toHaveValue("블랙 오버핏 티셔츠");
  },
};
