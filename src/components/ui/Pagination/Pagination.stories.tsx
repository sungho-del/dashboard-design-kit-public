import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { Tag } from "../Tag";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../Table";
import {
  Pagination,
  PaginationSizeSelect,
  type PaginationProps,
} from "./Pagination";

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  tags: ["autodocs"],
  args: {
    page: 1,
    totalPages: 20,
    onPageChange: () => {},
  },
  argTypes: {
    page: { control: { type: "number", min: 1 } },
    totalPages: { control: { type: "number", min: 1 } },
    siblingCount: { control: { type: "number", min: 0 } },
    boundaryCount: { control: { type: "number", min: 1 } },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 첫 페이지 — 이전 화살표는 비활성이고 뒤쪽만 생략된다 */
export const Default: Story = {};

/** 가운데 페이지 — `1 … 4 5 6 … 20` 형태로 양쪽이 축약된다 */
export const Middle: Story = { args: { page: 5 } };

/** 마지막 페이지 — 다음 화살표가 비활성이다 */
export const LastPage: Story = { args: { page: 20 } };

/** 페이지가 적으면 생략 없이 전부 보여준다 */
export const FewPages: Story = { args: { page: 2, totalPages: 5 } };

/** 페이지가 1개면 화살표가 모두 비활성이다 */
export const SinglePage: Story = { args: { page: 1, totalPages: 1 } };

/** siblingCount를 늘리면 현재 페이지 주변이 더 넓게 보인다 */
export const WideSiblings: Story = {
  args: { page: 50, totalPages: 100, siblingCount: 2 },
};

/** boundaryCount를 늘리면 처음·끝을 더 많이 고정 노출한다 */
export const WideBoundaries: Story = {
  args: { page: 50, totalPages: 100, boundaryCount: 2 },
};

/** 좌·우 슬롯은 `1fr auto 1fr` 3분할이라 버튼 그룹의 중앙 정렬을 흔들지 않는다 */
export const WithSlots: Story = {
  args: {
    page: 3,
    start: <span className="body-small text-text-sub">총 197건</span>,
    end: <span className="body-small text-text-sub">페이지당 10개</span>,
  },
};

/**
 * **개수 셀렉트**는 `end` 슬롯에 `PaginationSizeSelect`를 넣어 쓴다.
 * 폭 140(DESIGN.md §8)이 컴포넌트에 박혀 있어 사용처마다 달라지지 않는다.
 */
function WithSizeSelectExample(args: PaginationProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.ceil(197 / pageSize);

  return (
    <Pagination
      {...args}
      page={Math.min(page, totalPages)}
      totalPages={totalPages}
      onPageChange={setPage}
      start={<span className="body-small text-text-sub">총 197건</span>}
      end={
        <PaginationSizeSelect
          value={pageSize}
          onSizeChange={(next) => {
            setPageSize(next);
            // 개수가 바뀌면 페이지 수가 달라지므로 첫 페이지로 되돌린다
            setPage(1);
          }}
        />
      }
    />
  );
}

export const WithSizeSelect: Story = {
  render: (args) => <WithSizeSelectExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 보이는 라벨이 없는 자리이므로 트리거는 aria-label로 이름을 갖는다
    const trigger = canvas.getByRole("combobox", { name: "페이지당 개수" });
    await expect(trigger).toHaveTextContent("20개씩 보기");

    // 패널은 FloatingPortal로 body에 그려지므로 canvas 밖에서 찾는다
    await userEvent.click(trigger);
    const panel = within(document.body);
    await userEvent.click(
      await panel.findByRole("option", { name: "50개씩 보기" }),
    );

    await expect(trigger).toHaveTextContent("50개씩 보기");
  },
};

/** 후보 개수와 문구는 사용처가 바꿀 수 있다 */
export const SizeSelectCustomOptions: Story = {
  render: (args) => (
    <Pagination
      {...args}
      end={
        <PaginationSizeSelect
          sizes={[25, 50, 75]}
          defaultValue={25}
          formatLabel={(size) => `${size}줄`}
        />
      }
    />
  ),
};

/** 상태를 사용처가 소유하는 제어 예시 */
function ControlledPagination(args: PaginationProps) {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      {...args}
      page={page}
      onPageChange={(next) => {
        setPage(next);
        args.onPageChange(next);
      }}
      start={<span className="body-small text-text-sub">{page} 페이지</span>}
    />
  );
}

export const Controlled: Story = {
  render: (args) => <ControlledPagination {...args} />,
};

/** 주문 목록 데이터 (대시보드 맥락 예시용) */
const STATUSES = ["결제완료", "배송중", "입금대기", "취소"] as const;
const STATUS_TONES = ["success", "default", "warning", "critical"] as const;

const ALL_ORDERS = Array.from({ length: 43 }, (_, index) => {
  const seq = 43 - index;
  const slot = seq % STATUSES.length;
  return {
    id: `20250814-${String(seq).padStart(4, "0")}`,
    product: `상품 ${seq}호 · 기본 구성`,
    status: STATUSES[slot],
    tone: STATUS_TONES[slot],
    amount: 12000 + seq * 1500,
    orderedAt: `2025-08-14 ${String(9 + (seq % 10)).padStart(2, "0")}:0${seq % 10}`,
  };
});

const PAGE_SIZE = 10;

/**
 * 실제 대시보드 맥락 — 주문 목록 테이블 + 페이지네이션.
 * DESIGN.md §7-1대로 페이지네이션은 테이블 셸 하단에 좌우 24 padding으로 붙인다.
 */
function OrderListShell() {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(ALL_ORDERS.length / PAGE_SIZE);
  const rows = ALL_ORDERS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="w-full rounded-medium bg-surface py-6 shadow-card">
      <div className="flex items-center justify-between gap-2 px-6 pb-6">
        <h2 className="heading-large-bold text-text">주문 목록</h2>
        <span className="body-small text-text-sub">
          총 {ALL_ORDERS.length}건
        </span>
      </div>

      <div className="w-full overflow-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableTh className="w-40">주문번호</TableTh>
              <TableTh>상품명</TableTh>
              <TableTh className="w-28">상태</TableTh>
              <TableTh className="w-28">금액</TableTh>
              <TableTh className="w-40">주문일시</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((order) => (
              <TableRow key={order.id} clickable>
                <TableTd>{order.id}</TableTd>
                <TableTd ellipsis>{order.product}</TableTd>
                <TableTd>
                  <Tag tone={order.tone} dot>
                    {order.status}
                  </Tag>
                </TableTd>
                <TableTd>{order.amount.toLocaleString("ko-KR")}원</TableTd>
                <TableTd>{order.orderedAt}</TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="px-6">
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          start={
            <span className="body-small text-text-sub">
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, ALL_ORDERS.length)} /{" "}
              {ALL_ORDERS.length}
            </span>
          }
        />
      </div>
    </div>
  );
}

export const OrderListWithTable: Story = {
  render: () => <OrderListShell />,
};

/** 렌더 검증: nav 이름·현재 페이지 표시·화살표 비활성·페이지 이동이 모두 동작한다 */
export const Rendered: Story = {
  render: (args) => <ControlledPagination {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(
      canvas.getByRole("navigation", { name: "페이지네이션" }),
    ).toBeVisible();

    // 현재 페이지는 aria-current="page"로 알린다
    await expect(canvas.getByRole("button", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // 첫 페이지에서는 이전 화살표가 비활성
    await expect(
      canvas.getByRole("button", { name: "이전 페이지" }),
    ).toBeDisabled();

    // 3페이지로 이동하면 aria-current가 옮겨간다
    await userEvent.click(canvas.getByRole("button", { name: "3" }));
    await expect(canvas.getByRole("button", { name: "3" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(canvas.getByRole("button", { name: "1" })).not.toHaveAttribute(
      "aria-current",
    );
  },
};
