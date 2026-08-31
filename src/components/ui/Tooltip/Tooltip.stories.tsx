import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, waitFor, within } from "@storybook/test";
import { CircleHelp, Copy, Info, Trash2 } from "lucide-react";
import type { Placement } from "@floating-ui/react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Tooltip } from "./Tooltip";

/** 툴팁은 앵커 기준으로 뜨므로, 어느 방향으로도 펼칠 자리를 만들어 준다 */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-60 items-center justify-center">{children}</div>
  );
}

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  // children(트리거)은 각 story 의 render 가 직접 조합한다.
  // 여기 값은 CSF 타입을 만족시키기 위한 기본 트리거일 뿐이다.
  args: {
    content: "재고를 즉시 동기화합니다",
    children: <Button variant="secondary">동기화</Button>,
  },
  argTypes: {
    children: { control: false },
    placement: { control: false },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본(컴팩트) — 한 줄짜리 보조 설명. padding 6/8 · label-small */
export const Default: Story = {
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">동기화</Button>
      </Tooltip>
    </Stage>
  ),
};

/**
 * 본문형 — `title` 을 주면 자동으로 `rich` 가 된다.
 * padding 12/16 · gap 8 · 제목 label-medium-bold + 내용 body-small.
 */
export const Rich: Story = {
  args: {
    title: "재고 동기화",
    content:
      "연결된 판매 채널의 재고를 즉시 맞춥니다. 자동 동기화는 10분마다 실행됩니다.",
  },
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">동기화</Button>
      </Tooltip>
    </Stage>
  ),
};

/**
 * **닫기 버튼(§12 — absolute · top/right 8).** 본문형 전용이다.
 *
 * 켜면 열림/닫힘이 hover 가 아니라 **클릭 토글**로 바뀐다 — hover 로 열리는 패널에
 * 닫기 버튼을 달면, 눌러 닫아도 포인터가 트리거 위에 남아 있는 한 곧바로 다시 열려
 * 버튼이 무의미해지기 때문이다. 닫는 경로는 닫기 버튼 · Escape · 바깥 클릭 셋이며,
 * 패널 role 도 `tooltip` 이 아니라 `dialog` 가 된다.
 *
 * 본문이 버튼 밑으로 들어가지 않도록 우측 패딩만 36(`pr-9` = 8 + 28)으로 넓혔다.
 */
export const Closable: Story = {
  args: {
    closable: true,
    title: "재고 동기화 안내",
    content:
      "연결된 판매 채널의 재고를 즉시 맞춥니다. 자동 동기화는 10분마다 실행되며, 수동 실행은 하루 20회까지 가능합니다.",
  },
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">
          <Info size={16} strokeWidth={1.2} aria-hidden />
          도움말
        </Button>
      </Tooltip>
    </Stage>
  ),
};

/**
 * 닫기 버튼 동작 검증 — 클릭으로 열고, 닫기 버튼으로 닫고,
 * 닫은 뒤 포커스가 트리거로 되돌아오는지까지 확인한다.
 */
export const ClosableInteraction: Story = {
  args: {
    closable: true,
    title: "재고 동기화 안내",
    content: "자동 동기화는 10분마다 실행됩니다.",
  },
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">도움말</Button>
      </Tooltip>
    </Stage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "도움말" });

    // hover 로는 열리지 않는다 (클릭 전용 모드)
    await userEvent.hover(trigger);
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await userEvent.click(trigger);

    const panel = await screen.findByRole("dialog");
    await expect(panel).toHaveAccessibleName("재고 동기화 안내");

    const close = screen.getByRole("button", { name: "닫기" });
    await userEvent.click(close);

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    // 포털에 떠 있던 패널이 사라진 뒤 포커스는 트리거로 돌아온다
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};

/** 긴 문장 — max-width 256 에서 줄바꿈된다 */
export const MaxWidth: Story = {
  args: {
    content:
      "주문 상태가 배송준비중으로 바뀌면 고객에게 알림이 발송되며, 이후에는 배송지를 수정할 수 없습니다.",
  },
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">주문 상태</Button>
      </Tooltip>
    </Stage>
  ),
};

/** 화살표 없이 — 밀도 높은 툴바에서 앵커와 아주 가깝게 붙일 때 */
export const WithoutArrow: Story = {
  args: { showArrow: false },
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">동기화</Button>
      </Tooltip>
    </Stage>
  ),
};

/**
 * 아이콘 버튼 위 — 아이콘만으로 의미를 전달하지 않기 위한 대표 용도다.
 * 이름은 `IconButton` 의 `label`(aria-label)이 맡고, 툴팁은 `aria-describedby` 로
 * 설명만 얹는다. (DESIGN_참고.md §8)
 */
export const OnIconButton: Story = {
  args: { content: "주문번호 복사" },
  render: (args) => (
    <Stage>
      <div className="flex items-center gap-2">
        <Tooltip {...args}>
          <IconButton
            label="주문번호 복사"
            variant="ghost"
            icon={<Copy size={16} strokeWidth={1.2} aria-hidden />}
          />
        </Tooltip>

        <Tooltip content="이 주문을 삭제합니다">
          <IconButton
            label="주문 삭제"
            variant="ghost"
            icon={<Trash2 size={16} strokeWidth={1.2} aria-hidden />}
          />
        </Tooltip>
      </div>
    </Stage>
  ),
};

/**
 * **실제 맥락 — 테이블 헤더의 용어 설명.**
 * 지표 이름 옆 도움말 아이콘에 본문형 툴팁을 건다.
 */
export const TableHeaderHelp: Story = {
  args: {
    title: "전환율",
    content: "선택한 기간 동안 방문 대비 결제 완료 비율입니다. (결제 / 방문)",
  },
  render: (args) => (
    <div className="flex h-60 justify-center pt-10">
      <table className="w-120 border-collapse">
        <thead>
          <tr>
            <th className="h-12 px-6 text-left text-text-sub label-medium">
              채널
            </th>
            <th className="h-12 px-3 text-right text-text-sub label-medium">
              방문
            </th>
            <th className="h-12 px-6 text-right text-text-sub label-medium">
              <span className="inline-flex items-center gap-1">
                전환율
                <Tooltip {...args} placement="top-end">
                  <IconButton
                    label="전환율 설명"
                    size="xsmall"
                    variant="ghost"
                    icon={
                      <CircleHelp size={16} strokeWidth={1.2} aria-hidden />
                    }
                  />
                </Tooltip>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-surface">
            <td className="h-12 px-6 text-text body-medium">네이버</td>
            <td className="h-12 px-3 text-right text-text body-medium">
              1,240
            </td>
            <td className="h-12 px-6 text-right text-text body-medium">3.2%</td>
          </tr>
          <tr className="bg-surface-sub">
            <td className="h-12 px-6 text-text body-medium">인스타그램</td>
            <td className="h-12 px-3 text-right text-text body-medium">860</td>
            <td className="h-12 px-6 text-right text-text body-medium">1.9%</td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
};

/* -------------------------------------------------------------------------
 * placement 변형 — flip() 이 붙어 있어 공간이 없으면 자동으로 반대편으로 뒤집힌다
 * ---------------------------------------------------------------------- */

function PlacementDemo({
  placement,
  content,
}: {
  placement: Placement;
  content: ReactNode;
}) {
  return (
    <Stage>
      <Tooltip content={content} placement={placement}>
        <Button variant="secondary">{placement}</Button>
      </Tooltip>
    </Stage>
  );
}

/** 기본값 — 앵커 위 중앙 */
export const PlacementTop: Story = {
  render: (args) => <PlacementDemo placement="top" content={args.content} />,
};

/** 화면 상단에 붙은 앵커용 */
export const PlacementBottom: Story = {
  render: (args) => <PlacementDemo placement="bottom" content={args.content} />,
};

/** 좁은 세로 공간에서 옆으로 */
export const PlacementRight: Story = {
  render: (args) => <PlacementDemo placement="right" content={args.content} />,
};

/** 우측 정렬 영역에서 왼쪽으로 */
export const PlacementLeft: Story = {
  render: (args) => <PlacementDemo placement="left" content={args.content} />,
};

/* -------------------------------------------------------------------------
 * 제어형
 * ---------------------------------------------------------------------- */

/** 제어형 — 온보딩 코치마크처럼 hover 와 무관하게 띄워야 할 때 */
export const Controlled: Story = {
  args: {
    title: "여기서 필터를 저장하세요",
    content: "자주 쓰는 조건은 저장해 두면 다음 방문에 바로 적용됩니다.",
  },
  render: function ControlledTooltip(args) {
    const [open, setOpen] = useState(true);

    return (
      <Stage>
        <div className="flex items-center gap-2">
          <Tooltip {...args} open={open} onOpenChange={setOpen}>
            <Button variant="secondary">
              <Info size={16} strokeWidth={1.2} aria-hidden />
              필터 저장
            </Button>
          </Tooltip>

          <Button variant="ghost" onClick={() => setOpen((prev) => !prev)}>
            {open ? "숨기기" : "보이기"}
          </Button>
        </div>
      </Stage>
    );
  },
};

/* -------------------------------------------------------------------------
 * 동작 검증
 * ---------------------------------------------------------------------- */

/**
 * hover 로 열고 Escape 로 닫는다. 열려 있는 동안 트리거의 `aria-describedby` 가
 * 툴팁 id 를 가리키는지도 함께 확인한다.
 * 포털로 `document.body` 에 렌더되므로 canvas 가 아닌 `screen` 으로 찾는다.
 */
export const HoverAndDismiss: Story = {
  render: (args) => (
    <Stage>
      <Tooltip {...args}>
        <Button variant="secondary">동기화</Button>
      </Tooltip>
    </Stage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "동기화" });

    await expect(trigger).not.toHaveAttribute("aria-describedby");

    await userEvent.hover(trigger);

    // delay.open = 200ms 뒤에 나타난다
    const tooltip = await screen.findByRole("tooltip");
    await expect(tooltip).toHaveTextContent("재고를 즉시 동기화합니다");
    await expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument(),
    );
  },
};
