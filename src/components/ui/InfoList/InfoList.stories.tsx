import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { Tag } from "../Tag";
import { TextButton } from "../TextButton";
import { Card, CardBody, CardHeader } from "../Card";
import { InfoItem, InfoList } from "./InfoList";

const meta = {
  title: "Components/InfoList",
  component: InfoList,
  tags: ["autodocs"],
  argTypes: {
    children: { control: false },
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
          "상세 화면에서 **라벨 : 값** 쌍을 나열하는 블록입니다. 주문 상세·회원 상세처럼",
          "'읽기만 하는 정보'를 표 대신 담는 자리입니다.",
          "",
          "### 실측 규격 (원본 그대로)",
          "",
          "- `.style_infoList` — `flex-direction:column` · padding **16** · 항목 간 gap **8** · 배경 `surface-sub` · radius `medium`",
          "- `.style_infoItem` — `display:flex` · `align-items:center` · gap **10**",
          "- `.style_infoLabel` — width **80** · `flex-shrink:0`",
          "",
          "### 사용 규칙",
          "",
          "- **단순한 `<dl>` 이 아니라 회색 박스입니다.** 배경이 `surface-sub` 라 카드(흰 면) 안에 넣으면 표면 위계(`bg` → `surface` → `surface-sub`)가 그대로 성립합니다. 카드 중첩 대신 이 블록을 씁니다. (DESIGN_참고.md §1-2)",
          "- **라벨 폭은 80 고정입니다.** 여러 항목의 값이 같은 세로선에서 시작해야 눈이 값만 훑을 수 있습니다. 라벨이 80 에 안 들어갈 때만 `labelWidth` 로 블록 전체를 함께 넓힙니다.",
          "- **항목마다 `labelWidth` 를 다르게 주지 않습니다.** 값 시작선이 어긋나면 정렬의 이점이 사라집니다.",
          "- **편집 가능한 값은 여기 넣지 않습니다.** 입력이 필요하면 `FormField` 를 씁니다. 이 블록은 읽기 전용입니다.",
          "- 값 자리에는 텍스트뿐 아니라 `Tag`·`TextButton` 같은 요소를 넣을 수 있습니다. `<dd>` 안에 그대로 들어갑니다.",
          "",
          "### 시맨틱",
          "",
          "루트가 `<dl>`, 라벨이 `<dt>`, 값이 `<dd>` 입니다.",
          "스크린리더가 '용어 - 정의' 쌍으로 읽으므로 라벨과 값의 연결이 시각에만 의존하지 않습니다.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof InfoList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 라벨 80 고정, 값이 같은 세로선에서 시작한다 */
export const Default: Story = {
  render: (args) => (
    <InfoList {...args}>
      <InfoItem label="주문번호">20260814-0012</InfoItem>
      <InfoItem label="주문일시">2026-08-14 11:02</InfoItem>
      <InfoItem label="결제수단">신용카드 (국민 1234)</InfoItem>
    </InfoList>
  ),
};

/** 항목 하나만 — 값 한 줄을 강조해서 보여줄 때도 그대로 쓴다 */
export const SingleItem: Story = {
  render: (args) => (
    <InfoList {...args}>
      <InfoItem label="송장번호">1234-5678-9012</InfoItem>
    </InfoList>
  ),
};

/**
 * 긴 값 — `<dd>` 에 `min-w-0` 이 걸려 있어 값이 줄바꿈된다.
 * 라벨은 `shrink-0` 이라 값이 아무리 길어도 폭이 찌그러지지 않는다.
 */
export const LongValue: Story = {
  render: (args) => (
    <InfoList {...args}>
      <InfoItem label="배송지">
        서울특별시 강남구 테헤란로 000길 00, 000빌딩 12층 아임웹 물류센터 수령팀
        (06232)
      </InfoItem>
      <InfoItem label="배송메모">
        부재 시 경비실에 맡겨 주시고, 맡기신 뒤에 꼭 문자로 알려 주세요.
        공동현관 비밀번호는 #0000 입니다.
      </InfoItem>
      <InfoItem label="수령인">김아임</InfoItem>
    </InfoList>
  ),
};

/**
 * `labelWidth` — 라벨이 80 에 안 들어갈 때만 쓴다.
 * 한 블록 안에서는 **모든 항목에 같은 값**을 줘야 값 시작선이 유지된다.
 */
export const CustomLabelWidth: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-sub">
          기본 80 — 긴 라벨이 두 줄로 접힌다
        </p>
        <InfoList {...args}>
          <InfoItem label="정산 예정 금액">₩ 1,248,000</InfoItem>
          <InfoItem label="정산 예정일">2026-08-31</InfoItem>
        </InfoList>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-sub">
          labelWidth 120 — 라벨이 한 줄에 들어간다
        </p>
        <InfoList {...args}>
          <InfoItem label="정산 예정 금액" labelWidth={120}>
            ₩ 1,248,000
          </InfoItem>
          <InfoItem label="정산 예정일" labelWidth={120}>
            2026-08-31
          </InfoItem>
        </InfoList>
      </div>
    </div>
  ),
};

/**
 * 값에 요소 넣기 — `Tag`·`TextButton` 등이 `<dd>` 안에 그대로 들어간다.
 * 항목이 `align-items:center` 라 태그와 텍스트의 세로 중심이 맞는다.
 */
export const WithElements: Story = {
  render: (args) => (
    <InfoList {...args}>
      <InfoItem label="주문상태">
        <Tag tone="success" dot>
          배송완료
        </Tag>
      </InfoItem>
      <InfoItem label="결제상태">
        <Tag tone="warning" dot>
          부분환불
        </Tag>
      </InfoItem>
      <InfoItem label="송장번호">
        <span className="flex items-center gap-2">
          1234-5678-9012
          <TextButton size="small">배송조회</TextButton>
        </span>
      </InfoItem>
    </InfoList>
  ),
};

/**
 * 실사용 — 주문 상세.
 * 카드(흰 면) 안에 회색 블록을 넣어 `bg` → `surface` → `surface-sub` 3단 위계를 만든다.
 * 정보 묶음이 여러 개면 블록을 나란히 쌓는다.
 */
export const OrderDetail: Story = {
  render: () => (
    <div className="flex flex-col gap-4 bg-bg p-6">
      <Card>
        <CardHeader title="주문 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="주문번호">20260814-0012</InfoItem>
            <InfoItem label="주문일시">2026-08-14 11:02</InfoItem>
            <InfoItem label="주문경로">모바일 웹</InfoItem>
            <InfoItem label="주문상태">
              <Tag tone="success" dot>
                배송완료
              </Tag>
            </InfoItem>
          </InfoList>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="배송 정보" />
        <CardBody>
          <InfoList>
            <InfoItem label="수령인">김아임</InfoItem>
            <InfoItem label="연락처">010-0000-0000</InfoItem>
            <InfoItem label="배송지">
              서울특별시 강남구 테헤란로 000길 00, 000빌딩 12층 (06232)
            </InfoItem>
            <InfoItem label="배송메모">부재 시 경비실에 맡겨 주세요</InfoItem>
          </InfoList>
        </CardBody>
      </Card>
    </div>
  ),
};

/**
 * ❌ **하지 말 것 — 항목마다 라벨 폭 바꾸기.**
 * 값 시작선이 어긋나면 눈이 값만 따라 훑을 수 없어, 정렬로 얻는 이점이 사라진다.
 */
export const DontMixLabelWidths: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-critical">
          ❌ 항목마다 다른 labelWidth
        </p>
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
          <InfoItem label="결제수단" labelWidth={140}>
            신용카드
          </InfoItem>
          <InfoItem label="주문경로" labelWidth={60}>
            모바일 웹
          </InfoItem>
        </InfoList>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-success">
          ✅ 블록 전체를 같은 폭으로
        </p>
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
          <InfoItem label="결제수단">신용카드</InfoItem>
          <InfoItem label="주문경로">모바일 웹</InfoItem>
        </InfoList>
      </div>
    </div>
  ),
};

/**
 * 렌더 검증 — 라벨이 `term`, 값이 `definition` 으로 접근성 트리에 노출되고
 * 쌍이 개수대로 맞는지 확인한다.
 */
export const Rendered: Story = {
  render: () => (
    <InfoList>
      <InfoItem label="주문번호">20260814-0012</InfoItem>
      <InfoItem label="주문일시">2026-08-14 11:02</InfoItem>
      <InfoItem label="주문상태">
        <Tag tone="success" dot>
          배송완료
        </Tag>
      </InfoItem>
    </InfoList>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const terms = canvas.getAllByRole("term");
    const definitions = canvas.getAllByRole("definition");

    // 라벨과 값은 항상 같은 개수로 짝지어야 한다
    await expect(terms).toHaveLength(3);
    await expect(definitions).toHaveLength(3);
    await expect(terms[0]).toHaveTextContent("주문번호");
    await expect(definitions[0]).toHaveTextContent("20260814-0012");

    // 값 자리에 넣은 요소도 <dd> 안에 들어간다
    await expect(definitions[2]).toContainElement(canvas.getByText("배송완료"));
  },
};
