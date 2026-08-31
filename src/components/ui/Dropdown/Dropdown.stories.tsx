import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, waitFor, within } from "@storybook/test";
import {
  Check,
  Copy,
  Download,
  EllipsisVertical,
  Eye,
  Pencil,
  Settings,
  Share2,
  Trash2,
} from "lucide-react";
import type { Placement } from "@floating-ui/react";
import { Button } from "../Button";
import { IconButton } from "../IconButton";
import { Dropdown } from "./Dropdown";

/** 메뉴 아이템 아이콘 기본 규격 — 16 / strokeWidth 1.2 (DESIGN_참고.md §8) */
function MenuIcon({ icon: Icon }: { icon: typeof Pencil }) {
  return <Icon size={16} strokeWidth={1.2} aria-hidden />;
}

/** 드롭다운은 앵커 기준으로 뜨므로, 어느 방향으로도 펼칠 자리를 만들어 준다 */
function Stage({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-80 items-center justify-center">{children}</div>
  );
}

const meta = {
  title: "Components/Dropdown",
  component: Dropdown,
  tags: ["autodocs"],
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
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — min-width 280 패널이 트리거 좌측 아래에 붙는다 */
export const Default: Story = {
  render: () => (
    <Stage>
      <Dropdown>
        <Dropdown.Trigger>
          <Button variant="secondary">메뉴 열기</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>상세 보기</Dropdown.Item>
          <Dropdown.Item>수정</Dropdown.Item>
          <Dropdown.Item>복제</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
};

/** 컴팩트 — DESIGN.md §11 "액션 팝오버" width 128. 짧은 액션 3~4개용 */
export const Compact: Story = {
  render: () => (
    <Stage>
      <Dropdown size="compact">
        <Dropdown.Trigger>
          <IconButton
            label="행 메뉴"
            variant="ghost"
            icon={<EllipsisVertical size={16} strokeWidth={1.2} aria-hidden />}
          />
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>수정</Dropdown.Item>
          <Dropdown.Item>복제</Dropdown.Item>
          <Dropdown.Item tone="critical">삭제</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
};

/** 아이콘 슬롯 — 좌측은 액션 아이콘, 우측은 단축키·상태 표시에 쓴다 */
export const WithIcons: Story = {
  render: () => (
    <Stage>
      <Dropdown defaultOpen>
        <Dropdown.Trigger>
          <Button variant="secondary">액션</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item leftIcon={<MenuIcon icon={Eye} />}>
            미리 보기
          </Dropdown.Item>
          <Dropdown.Item leftIcon={<MenuIcon icon={Download} />}>
            내보내기
          </Dropdown.Item>
          <Dropdown.Item
            leftIcon={<MenuIcon icon={Share2} />}
            rightIcon={<MenuIcon icon={Settings} />}
          >
            공유 설정
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
};

/** 위험 액션 — `tone="critical"` 로 글자·아이콘만 critical 로 바뀐다 */
export const CriticalItem: Story = {
  render: () => (
    <Stage>
      <Dropdown defaultOpen size="compact">
        <Dropdown.Trigger>
          <Button variant="secondary">관리</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item leftIcon={<MenuIcon icon={Pencil} />}>
            수정
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item tone="critical" leftIcon={<MenuIcon icon={Trash2} />}>
            삭제
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
};

/**
 * 선택 상태 — 약한 선택(`action-primary-tonal`).
 * 선택 의미가 있으므로 `role="menuitemradio"` 로 바꿔 `aria-checked` 를 노출한다.
 */
export const SelectedItem: Story = {
  render: function SortMenu() {
    const [sort, setSort] = useState("latest");

    const options = [
      { value: "latest", label: "최신순" },
      { value: "oldest", label: "오래된순" },
      { value: "amount", label: "금액 높은순" },
    ];

    return (
      <Stage>
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button variant="secondary">정렬</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            {options.map((option) => (
              <Dropdown.Item
                key={option.value}
                role="menuitemradio"
                selected={sort === option.value}
                rightIcon={
                  sort === option.value ? <MenuIcon icon={Check} /> : undefined
                }
                onSelect={() => setSort(option.value)}
              >
                {option.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown>
      </Stage>
    );
  },
};

/** 비활성 아이템 — `aria-disabled` 라 스크린리더에는 읽히되 선택되지 않는다 */
export const DisabledItem: Story = {
  render: () => (
    <Stage>
      <Dropdown defaultOpen size="compact">
        <Dropdown.Trigger>
          <Button variant="secondary">관리</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>수정</Dropdown.Item>
          <Dropdown.Item disabled>복제</Dropdown.Item>
          <Dropdown.Item tone="critical">삭제</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
};

/* -------------------------------------------------------------------------
 * placement 변형 — flip() 이 붙어 있어 공간이 없으면 자동으로 반대편으로 뒤집힌다
 * ---------------------------------------------------------------------- */

function PlacementDemo({ placement }: { placement: Placement }) {
  return (
    <Stage>
      <Dropdown defaultOpen placement={placement} size="compact">
        <Dropdown.Trigger>
          <Button variant="secondary">{placement}</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>수정</Dropdown.Item>
          <Dropdown.Item>복제</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  );
}

/** 기본값 — 트리거 왼쪽 모서리에 맞춰 아래로 */
export const PlacementBottomStart: Story = {
  render: () => <PlacementDemo placement="bottom-start" />,
};

/** 우측 정렬 헤더 액션에서 주로 쓴다 */
export const PlacementBottomEnd: Story = {
  render: () => <PlacementDemo placement="bottom-end" />,
};

/** 화면 하단에 붙은 트리거용 */
export const PlacementTopStart: Story = {
  render: () => <PlacementDemo placement="top-start" />,
};

/** 사이드바 메뉴처럼 옆으로 펼치는 경우 */
export const PlacementRightStart: Story = {
  render: () => <PlacementDemo placement="right-start" />,
};

/* -------------------------------------------------------------------------
 * 실제 맥락 — 테이블 행 더보기 메뉴
 * ---------------------------------------------------------------------- */

interface OrderRow {
  id: string;
  customer: string;
  amount: string;
}

const rows: OrderRow[] = [
  { id: "20260814-0042", customer: "홍길동", amount: "89,000원" },
  { id: "20260814-0041", customer: "김서연", amount: "132,500원" },
  { id: "20260814-0040", customer: "이준호", amount: "24,000원" },
];

function RowActionsDemo() {
  const [log, setLog] = useState<string>("아직 선택한 액션이 없습니다.");

  return (
    <div className="flex flex-col gap-4">
      <table className="w-160 border-collapse">
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className={index % 2 === 0 ? "bg-surface" : "bg-surface-sub"}
            >
              <td className="h-12 px-6 text-text body-medium">{row.id}</td>
              <td className="h-12 px-3 text-text body-medium">
                {row.customer}
              </td>
              <td className="h-12 px-3 text-right text-text body-medium">
                {row.amount}
              </td>
              <td className="h-12 px-6 text-right">
                <Dropdown size="compact" placement="bottom-end">
                  <Dropdown.Trigger>
                    <IconButton
                      label={`${row.id} 행 메뉴`}
                      size="small"
                      variant="ghost"
                      icon={
                        <EllipsisVertical
                          size={16}
                          strokeWidth={1.2}
                          aria-hidden
                        />
                      }
                    />
                  </Dropdown.Trigger>

                  <Dropdown.Menu>
                    <Dropdown.Item
                      leftIcon={<MenuIcon icon={Pencil} />}
                      onSelect={() => setLog(`${row.id} · 수정`)}
                    >
                      수정
                    </Dropdown.Item>
                    <Dropdown.Item
                      leftIcon={<MenuIcon icon={Copy} />}
                      onSelect={() => setLog(`${row.id} · 복제`)}
                    >
                      복제
                    </Dropdown.Item>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      tone="critical"
                      leftIcon={<MenuIcon icon={Trash2} />}
                      onSelect={() => setLog(`${row.id} · 삭제`)}
                    >
                      삭제
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p data-testid="action-log" className="text-text-sub body-small">
        {log}
      </p>
    </div>
  );
}

/**
 * **실제 맥락 — 테이블 행 더보기 메뉴.** 대시보드에서 가장 흔한 사용처다.
 * 행이 우측 정렬이라 `placement="bottom-end"`, 액션이 짧아 `size="compact"`.
 */
export const RowActions: Story = {
  render: () => <RowActionsDemo />,
};

/* -------------------------------------------------------------------------
 * 동작 검증
 * ---------------------------------------------------------------------- */

/**
 * 키보드만으로 열고 → 이동하고 → 선택한다.
 * 포털로 `document.body` 에 렌더되므로 canvas 가 아닌 `screen` 으로 찾는다.
 */
export const KeyboardNavigation: Story = {
  render: () => <RowActionsDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const trigger = canvas.getByRole("button", {
      name: "20260814-0042 행 메뉴",
    });
    trigger.focus();

    // 닫힌 상태의 접근성 계약
    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    // ↓ 로 열면 첫 아이템으로 포커스가 들어간다
    await userEvent.keyboard("{ArrowDown}");
    await screen.findByRole("menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus(),
    );

    // ↓↓ 로 마지막(삭제)까지 이동 — 구분선은 건너뛴다
    await userEvent.keyboard("{ArrowDown}");
    await expect(screen.getByRole("menuitem", { name: "복제" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(screen.getByRole("menuitem", { name: "삭제" })).toHaveFocus();

    // Home 으로 되돌아와 Enter 로 선택 → 메뉴가 닫히고 로그가 갱신된다
    await userEvent.keyboard("{Home}");
    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    await expect(canvas.getByTestId("action-log")).toHaveTextContent(
      "20260814-0042 · 수정",
    );
  },
};

/** Escape 로 닫으면 포커스가 트리거로 되돌아온다 */
export const EscapeClosesAndRestoresFocus: Story = {
  render: () => (
    <Stage>
      <Dropdown>
        <Dropdown.Trigger>
          <Button variant="secondary">메뉴 열기</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item>수정</Dropdown.Item>
          <Dropdown.Item>복제</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </Stage>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "메뉴 열기" });

    await userEvent.click(trigger);
    await screen.findByRole("menu");

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
