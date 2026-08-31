import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, screen, userEvent, waitFor, within } from "@storybook/test";
import { Download, FolderInput, Trash2 } from "lucide-react";
import { cn } from "../../../lib/cn";
import { Checkbox } from "../Checkbox";
import { Table } from "../Table";
import {
  SelectionBar,
  SelectionBarButton,
  SelectionBarDivider,
} from "./SelectionBar";

/**
 * 스토리 전용 무대.
 *
 * 바는 `position: fixed` 라 기본값(document.body 포털)으로 두면 Docs 페이지에서
 * 모든 스토리의 바가 화면 하단 한 자리에 겹친다. 무대에 `transform-gpu`
 * (= translateZ(0))를 걸면 이 요소가 fixed 자식의 containing block 이 되어
 * 바가 무대 안에 갇힌다. `container` 로 포털 대상까지 무대로 돌려 스토리마다
 * 독립적으로 보이게 했다.
 */
function Stage({
  children,
  className = "",
}: {
  children: (container: HTMLElement) => ReactNode;
  className?: string;
}) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <div
      ref={setNode}
      className={cn(
        "relative w-full transform-gpu overflow-hidden rounded-medium bg-bg",
        className,
      )}
    >
      {node ? children(node) : null}
    </div>
  );
}

/** 자주 쓰는 액션 3종. 아이콘은 소형 규격 16 · strokeWidth 1.2 */
function DefaultActions() {
  return (
    <>
      <SelectionBarButton icon={<Trash2 size={16} strokeWidth={1.2} />}>
        삭제
      </SelectionBarButton>
      <SelectionBarDivider />
      <SelectionBarButton icon={<FolderInput size={16} strokeWidth={1.2} />}>
        이동
      </SelectionBarButton>
      <SelectionBarDivider />
      <SelectionBarButton icon={<Download size={16} strokeWidth={1.2} />}>
        내보내기
      </SelectionBarButton>
    </>
  );
}

const meta = {
  title: "Components/SelectionBar",
  component: SelectionBar,
  tags: ["autodocs"],
  args: {
    open: true,
    count: 3,
    onClear: () => {},
    children: <DefaultActions />,
  },
  argTypes: {
    open: { control: "boolean" },
    count: { control: { type: "number", min: 0 } },
    clearLabel: { control: "text" },
    label: { control: "text" },
  },
  render: (args) => (
    <Stage className="h-60">
      {(container) => <SelectionBar {...args} container={container} />}
    </Stage>
  ),
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof SelectionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 — 개수 · 선택 해제(X) · 구분선 · 액션 버튼.
 *
 * 바: bottom 80 · 가운데 정렬 · padding 10 12 · gap 12 ·
 * `surface-toast` · radius 12 · `shadow-toast` (DESIGN.md §25)
 */
export const Default: Story = {};

/** 1개만 선택한 상태 */
export const SingleSelection: Story = {
  args: { count: 1 },
};

/** 많은 항목을 선택한 상태 — 숫자만 바뀌고 폭이 자연스럽게 늘어난다 */
export const ManySelected: Story = {
  args: { count: 128 },
};

/** 액션 한 개 — 구분선은 개수 영역과 액션 사이에 자동으로 한 줄만 들어간다 */
export const SingleAction: Story = {
  args: {
    count: 5,
    children: (
      <SelectionBarButton icon={<Trash2 size={16} strokeWidth={1.2} />}>
        삭제
      </SelectionBarButton>
    ),
  },
};

/** 아이콘 없는 텍스트 버튼도 그대로 쓸 수 있다 */
export const TextOnlyActions: Story = {
  args: {
    count: 2,
    children: (
      <>
        <SelectionBarButton>승인</SelectionBarButton>
        <SelectionBarDivider />
        <SelectionBarButton>반려</SelectionBarButton>
      </>
    ),
  },
};

/** 비활성 액션 — 색은 `text-disabled`·`icon-disabled`, hover 배경도 뜨지 않는다 */
export const DisabledAction: Story = {
  args: {
    count: 4,
    children: (
      <>
        <SelectionBarButton icon={<Trash2 size={16} strokeWidth={1.2} />}>
          삭제
        </SelectionBarButton>
        <SelectionBarDivider />
        <SelectionBarButton
          icon={<Download size={16} strokeWidth={1.2} />}
          disabled
        >
          내보내기
        </SelectionBarButton>
      </>
    ),
  },
};

/** `onClear` 를 넘기지 않으면 해제 버튼이 사라진다 */
export const WithoutClear: Story = {
  args: { count: 7, onClear: undefined },
};

/** 액션 없이 개수만 — 구분선도 그려지지 않는다 */
export const CountOnly: Story = {
  args: { count: 9, children: undefined },
};

/** 문구 커스터마이징 — 단위·언어를 바꿀 때 */
export const CustomCountLabel: Story = {
  args: {
    count: 12,
    countLabel: (count) => `주문 ${count}건 선택`,
    clearLabel: "전체 해제",
  },
};

/** 닫힌 상태 — 아무것도 렌더하지 않는다 */
export const Closed: Story = {
  args: { open: false },
};

/* -------------------------------------------------------------------------
 * 실사용 흐름 — 테이블 행 선택 → 바 등장
 * ---------------------------------------------------------------------- */

interface OrderRow {
  id: string;
  customer: string;
  product: string;
  amount: string;
}

const ORDERS: OrderRow[] = [
  {
    id: "20240117-001",
    customer: "김민준",
    product: "베이직 티셔츠",
    amount: "29,000원",
  },
  {
    id: "20240117-002",
    customer: "이서연",
    product: "린넨 셔츠",
    amount: "58,000원",
  },
  {
    id: "20240117-003",
    customer: "박도윤",
    product: "코튼 팬츠",
    amount: "45,000원",
  },
  {
    id: "20240117-004",
    customer: "최지우",
    product: "니트 가디건",
    amount: "72,000원",
  },
];

/**
 * 목록에서 행을 고르면 하단 바가 떠오르는 실제 사용 흐름.
 *
 * 선택 상태는 화면(목록)이 들고 있고, SelectionBar 는 그 상태를 비추기만 한다.
 * 바는 무대 안으로 포털된다 — 실제 앱에서는 `container` 없이 body 로 나간다.
 */
function SelectableTableDemo() {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const allSelected = selected.length === ORDERS.length;
  const someSelected = selected.length > 0 && !allSelected;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );

  return (
    <div
      ref={setNode}
      className="relative min-h-100 w-full transform-gpu overflow-hidden rounded-medium bg-bg p-6"
    >
      <div className="overflow-hidden rounded-medium bg-surface">
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Th className="w-12">
                <Checkbox
                  size="small"
                  aria-label="전체 선택"
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() =>
                    setSelected(allSelected ? [] : ORDERS.map((row) => row.id))
                  }
                />
              </Table.Th>
              <Table.Th>주문번호</Table.Th>
              <Table.Th>주문자</Table.Th>
              <Table.Th>상품</Table.Th>
              <Table.Th>결제금액</Table.Th>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {ORDERS.map((row) => (
              <Table.Row key={row.id}>
                <Table.Td>
                  <Checkbox
                    size="small"
                    aria-label={`${row.customer} 주문 선택`}
                    checked={selected.includes(row.id)}
                    onChange={() => toggle(row.id)}
                  />
                </Table.Td>
                <Table.Td>{row.id}</Table.Td>
                <Table.Td>{row.customer}</Table.Td>
                <Table.Td>{row.product}</Table.Td>
                <Table.Td>{row.amount}</Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </div>

      {node ? (
        <SelectionBar
          open={selected.length > 0}
          count={selected.length}
          onClear={() => setSelected([])}
          container={node}
        >
          <SelectionBarButton icon={<Trash2 size={16} strokeWidth={1.2} />}>
            삭제
          </SelectionBarButton>
          <SelectionBarDivider />
          <SelectionBarButton icon={<Download size={16} strokeWidth={1.2} />}>
            내보내기
          </SelectionBarButton>
        </SelectionBar>
      ) : null}
    </div>
  );
}

/**
 * 실사용 흐름 — 체크박스로 행을 고르면 바가 등장하고, 개수가 실시간으로 바뀐다.
 * 해제(X)를 누르면 선택이 모두 풀리고 바도 사라진다.
 */
export const WithSelectableTable: Story = {
  render: () => <SelectableTableDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 아무것도 고르지 않았으면 바 자체가 없다
    await expect(canvas.queryByRole("group")).toBeNull();

    await userEvent.click(
      canvas.getByRole("checkbox", { name: "김민준 주문 선택" }),
    );

    const bar = await screen.findByRole("group", {
      name: "선택 항목 일괄 작업",
    });
    const status = within(bar).getByRole("status");
    await expect(status).toHaveTextContent("1개 선택됨");
    await expect(status).toHaveAttribute("aria-live", "polite");

    // 개수 변화가 라이브 리전으로 전달된다
    await userEvent.click(
      canvas.getByRole("checkbox", { name: "이서연 주문 선택" }),
    );
    await expect(status).toHaveTextContent("2개 선택됨");

    // 전체 선택
    await userEvent.click(canvas.getByRole("checkbox", { name: "전체 선택" }));
    await expect(within(bar).getByRole("status")).toHaveTextContent(
      "4개 선택됨",
    );

    // 해제하면 바가 사라진다
    await userEvent.click(
      within(bar).getByRole("button", { name: "선택 해제" }),
    );
    await waitFor(() => expect(canvas.queryByRole("group")).toBeNull());
  },
};
