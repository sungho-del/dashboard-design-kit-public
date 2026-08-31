import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { MoreVertical, Search, SearchX } from "lucide-react";
import { useState } from "react";
import { Button } from "../Button";
import { EmptyState } from "../EmptyState";
import { IconButton } from "../IconButton";
import { Input } from "../Input";
import { Pagination } from "../Pagination";
import { SegmentedControl } from "../SegmentedControl";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../Table";
import { Tag, type TagTone } from "../Tag";
import { TextButton } from "../TextButton";
import { Skeleton } from "../Skeleton";
import { DataTableShell } from "./DataTableShell";

const meta = {
  title: "Components/DataTableShell",
  component: DataTableShell,
  tags: ["autodocs"],
  argTypes: {
    isEmpty: { control: "boolean" },
    isLoading: { control: "boolean" },
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "목록 화면의 표준 골격입니다. (DESIGN.md §7-1 테이블 셸)",
          "",
          "툴바(`p-6`) · 표 래퍼(**패딩 0** + `overflow-auto`) · 푸터(`px-6`) 3단으로 구성됩니다.",
          "",
          "### 표 래퍼에 패딩을 주지 않는 이유",
          "",
          "셀이 이미 `first:pl-6`/`last:pr-6`(24)를 갖고 있어(§7) 그 24가 곧 컨테이너 가장자리 정렬이 됩니다.",
          "래퍼에 패딩을 더하면 좌우만 48이 되어 툴바(24)와 첫 컬럼이 어긋나고, zebra 줄무늬도 좌우 끝까지 차지 않습니다.",
          "같은 이유로 이 셸은 `Card`(p-6)로 감싸지 않습니다.",
          "",
          "### `colgroup`으로 컬럼 폭을 지정하세요 (필수)",
          "",
          "`Table`은 `table-fixed`입니다. 폭을 지정하지 않으면 컬럼이 **균등 분배**되어",
          "짧은 컬럼(주문자·관리)이 과하게 넓어집니다.",
          "한 컬럼만 `auto`로 남기는 것도 피하세요 — 화면이 넓어질 때 그 컬럼이 남는 공간을",
          "전부 흡수해 다른 컬럼과 멀어집니다. **합이 100%가 되도록 비율(%)로 배분**하는 것이 안전합니다.",
          "%는 4px 그리드와 무관한 축이므로 `w-[16%]` 같은 임의값을 씁니다.",
          "",
          "```tsx",
          "<Table>",
          "  <colgroup>",
          '    <col className="w-[16%]" />',
          '    <col className="w-[24%]" />',
          "    {/* … 합 100% */}",
          "  </colgroup>",
          "</Table>",
          "```",
          "",
          "### 그 밖의 규칙",
          "",
          "- 모든 셀은 **좌측 정렬**이 기본입니다. 금액 컬럼만 우측 정렬하지 않습니다. (DESIGN_참고.md §7)",
          "- 상태 값은 텍스트가 아니라 **Tag(dot + 라벨)** 로 표현합니다.",
          "- `isEmpty`일 때 툴바는 유지되고 표 자리만 `empty`로 바뀝니다. 푸터·더보기는 함께 숨습니다.",
          '- `isLoading`은 같은 문법이고 **`empty`보다 우선합니다** — 로딩이 끝나기 전에 "없음"을 그리지 않습니다(§D8-2).',
          '  본문 컨테이너에 `aria-busy="true"`가 붙어 로딩 사실을 **한 번만** 알립니다.',
          "- `footer`와 `loadMore`는 둘 중 하나만 씁니다.",
        ].join("\n"),
      },
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof DataTableShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* 예시 데이터                                                          */
/* ------------------------------------------------------------------ */

type OrderStatus = "paid" | "ready" | "pending" | "canceled";

interface Order {
  id: string;
  product: string;
  customer: string;
  status: OrderStatus;
  amount: number;
  orderedAt: string;
}

const STATUS_META: Record<OrderStatus, { label: string; tone: TagTone }> = {
  paid: { label: "결제완료", tone: "success" },
  ready: { label: "배송준비중", tone: "default" },
  pending: { label: "입금대기", tone: "warning" },
  canceled: { label: "취소", tone: "critical" },
};

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제완료" },
  { value: "ready", label: "배송준비중" },
  { value: "pending", label: "입금대기" },
];

const STATUS_ORDER: OrderStatus[] = ["paid", "ready", "pending", "canceled"];

const ORDERS: Order[] = Array.from({ length: 24 }, (_, index) => {
  const seq = 24 - index;
  const status = STATUS_ORDER[seq % STATUS_ORDER.length];
  return {
    id: `20260818-${String(seq).padStart(4, "0")}`,
    product: `무선 이어폰 ${seq}호 · 기본 구성`,
    customer: ["김성호", "이서연", "박준영", "최다은"][seq % 4],
    status,
    amount: 42000 + seq * 3500,
    orderedAt: `2026-08-18 ${String(9 + (seq % 10)).padStart(2, "0")}:0${seq % 10}`,
  };
});

const PAGE_SIZE = 8;

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/**
 * 컬럼 폭 비율 배분(합 100%).
 * `table-fixed`이므로 반드시 지정한다 — 자세한 이유는 상단 문서 참고.
 */
function OrderColgroup() {
  return (
    <colgroup>
      <col className="w-[16%]" />
      <col className="w-[24%]" />
      <col className="w-[10%]" />
      <col className="w-[12%]" />
      <col className="w-[14%]" />
      <col className="w-[17%]" />
      <col className="w-[7%]" />
    </colgroup>
  );
}

function OrderTableHead() {
  return (
    <TableHead>
      <TableRow>
        <TableTh>주문번호</TableTh>
        <TableTh>상품</TableTh>
        <TableTh>주문자</TableTh>
        <TableTh>상태</TableTh>
        <TableTh>결제금액</TableTh>
        <TableTh>주문일시</TableTh>
        <TableTh align="center">관리</TableTh>
      </TableRow>
    </TableHead>
  );
}

function OrderRow({ order }: { order: Order }) {
  const status = STATUS_META[order.status];
  return (
    <TableRow clickable>
      <TableTd>{order.id}</TableTd>
      <TableTd ellipsis>{order.product}</TableTd>
      <TableTd>{order.customer}</TableTd>
      <TableTd>
        {/* 상태는 텍스트가 아니라 Tag(dot + 라벨)로 (DESIGN_참고.md §7) */}
        <Tag tone={status.tone} dot>
          {status.label}
        </Tag>
      </TableTd>
      <TableTd>{won(order.amount)}</TableTd>
      <TableTd>{order.orderedAt}</TableTd>
      <TableTd align="center">
        <IconButton
          size="small"
          label={`${order.id} 관리`}
          icon={<MoreVertical strokeWidth={1.2} aria-hidden />}
        />
      </TableTd>
    </TableRow>
  );
}

/* ------------------------------------------------------------------ */
/* 스토리                                                              */
/* ------------------------------------------------------------------ */

/**
 * 주문 목록 실사용 예시.
 *
 * 툴바 좌측에 상태 필터(SegmentedControl), 우측에 검색·초기화를 두고
 * 푸터에 Pagination을 붙인 표준 조합이다. 표는 `colgroup`으로 컬럼 폭을
 * 비율 배분한다.
 */
function OrderListExample() {
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);

  const filtered = ORDERS.filter((order) => {
    const matchStatus = filter === "all" || order.status === filter;
    const matchKeyword =
      keyword.trim() === "" ||
      order.id.includes(keyword) ||
      order.product.includes(keyword) ||
      order.customer.includes(keyword);
    return matchStatus && matchKeyword;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const reset = () => {
    setFilter("all");
    setKeyword("");
    setPage(1);
  };

  return (
    <DataTableShell
      aria-label="주문 목록"
      isEmpty={filtered.length === 0}
      toolbarStart={
        <SegmentedControl
          items={FILTERS}
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
      }
      toolbarEnd={
        <>
          <Input
            placeholder="주문번호·상품·주문자 검색"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(1);
            }}
            leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
          />
          <TextButton tone="secondary" onClick={reset}>
            초기화
          </TextButton>
        </>
      }
      empty={
        <EmptyState
          size="table"
          icon={<SearchX strokeWidth={1.2} aria-hidden />}
          title="조건에 맞는 주문이 없습니다"
          description="검색어나 상태 필터를 바꿔보세요."
        >
          <Button variant="secondary" onClick={reset}>
            필터 초기화
          </Button>
        </EmptyState>
      }
      footer={
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          start={
            <span className="body-small text-text-sub">
              총 {filtered.length}건
            </span>
          }
        />
      }
    >
      <Table>
        <OrderColgroup />
        <OrderTableHead />
        <TableBody>
          {rows.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

export const OrderList: Story = {
  render: () => <OrderListExample />,
};

/**
 * 빈 상태 — 툴바는 그대로 남고 표 자리만 `EmptyState`로 바뀐다.
 * 푸터(페이지네이션)는 함께 숨는다. "결과 없음" 아래에 페이지 번호가
 * 남으면 안 되기 때문이다.
 */
export const Empty: Story = {
  args: {
    isEmpty: true,
    toolbarStart: (
      <SegmentedControl
        items={FILTERS}
        value="pending"
        onValueChange={() => {}}
      />
    ),
    toolbarEnd: (
      <Input
        placeholder="주문번호·상품·주문자 검색"
        leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        readOnly
      />
    ),
    empty: (
      <EmptyState
        size="table"
        icon={<SearchX strokeWidth={1.2} aria-hidden />}
        title="조건에 맞는 주문이 없습니다"
        description="검색어나 상태 필터를 바꿔보세요."
      >
        <Button variant="secondary">필터 초기화</Button>
      </EmptyState>
    ),
    // isEmpty라 렌더되지 않는다 — 사용처가 조건 분기를 하지 않아도 됨을 보여준다
    footer: <Pagination page={1} totalPages={5} onPageChange={() => {}} />,
  },
};

/**
 * 로딩 — 표 자리만 스켈레톤 뼈대로 바뀐다. **툴바와 표 헤더는 그대로 남는다.**
 *
 * 고정 텍스트(헤더·필터)는 어차피 안 바뀌므로 실제 텍스트로 렌더하고 **변하는 것만**
 * 가린다. 열 폭은 `<colgroup>` 이 정본이라 로딩 뼈대도 **같은 colgroup** 을 쓴다 —
 * 폭을 다시 추측하면 로드 후 열이 움직인다.
 *
 * 로딩 사실은 본문 컨테이너의 `aria-busy="true"` 가 **한 번만** 말한다.
 * 스켈레톤 하나하나가 `role="status"` 를 가지면 "로딩 중"이 다섯 번 낭독된다.
 */
export const Loading: Story = {
  args: {
    isLoading: true,
    toolbarStart: (
      <SegmentedControl items={FILTERS} value="all" onValueChange={() => {}} />
    ),
    toolbarEnd: (
      <Input
        placeholder="주문번호·상품·주문자 검색"
        leftIcon={<Search size={16} strokeWidth={1.2} aria-hidden />}
        readOnly
      />
    ),
    loading: (
      <Table>
        <OrderColgroup />
        <OrderTableHead />
        <TableBody>
          {Array.from({ length: 5 }, (_, i) => (
            <TableRow key={i}>
              <TableTd>
                <Skeleton className="w-24" />
              </TableTd>
              <TableTd>
                <Skeleton className="w-full" />
              </TableTd>
              <TableTd>
                <Skeleton className="w-12" />
              </TableTd>
              <TableTd>
                <Skeleton className="w-16" />
              </TableTd>
              <TableTd>
                <Skeleton className="w-20" />
              </TableTd>
              <TableTd>
                <Skeleton className="w-28" />
              </TableTd>
              <TableTd align="center">
                <Skeleton className="w-6" />
              </TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ),
    // isLoading 이라 렌더되지 않는다 — 총 페이지 수를 아직 모른다
    footer: <Pagination page={1} totalPages={5} onPageChange={() => {}} />,
  },
};

/**
 * 툴바 없음 — 필터가 필요 없는 짧은 목록이나, 페이지 헤더가 이미
 * 필터를 갖고 있는 화면에서 쓴다. 표가 컨테이너 상단에 바로 붙는다.
 */
export const WithoutToolbar: Story = {
  args: {
    children: (
      <Table>
        <OrderColgroup />
        <OrderTableHead />
        <TableBody>
          {ORDERS.slice(0, 5).map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    ),
    footer: (
      <Pagination
        page={1}
        totalPages={3}
        onPageChange={() => {}}
        start={<span className="body-small text-text-sub">총 5건</span>}
      />
    ),
  },
};

/**
 * 더보기 버튼형 — 페이지네이션 대신 하단에 높이 48짜리 전체폭 버튼을 둔다.
 * (DESIGN.md §7-1) `footer`와 함께 쓰지 않는다.
 */
function LoadMoreExample() {
  const [count, setCount] = useState(5);
  const rows = ORDERS.slice(0, count);
  const hasMore = count < ORDERS.length;

  return (
    <DataTableShell
      aria-label="주문 목록"
      toolbarStart={
        <span className="heading-medium-bold text-text">최근 주문</span>
      }
      loadMore={
        hasMore ? (
          <TextButton
            tone="secondary"
            onClick={() => setCount((prev) => prev + 5)}
          >
            더보기
          </TextButton>
        ) : (
          <span className="body-small text-text-minimal">
            마지막 주문까지 모두 불러왔습니다
          </span>
        )
      }
    >
      <Table>
        <OrderColgroup />
        <OrderTableHead />
        <TableBody>
          {rows.map((order) => (
            <OrderRow key={order.id} order={order} />
          ))}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

export const LoadMore: Story = {
  render: () => <LoadMoreExample />,
};

/**
 * 렌더·상호작용 검증 — 툴바 필터를 바꾸면 표 자리가 빈 상태로 바뀌고
 * 페이지네이션이 사라진다. 툴바는 그대로 남아 다시 되돌릴 수 있다.
 */
export const Rendered: Story = {
  render: () => <OrderListExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 툴바·표·푸터가 모두 렌더된다
    await expect(canvas.getByRole("radio", { name: "전체" })).toBeVisible();
    await expect(canvas.getByRole("table")).toBeVisible();
    await expect(
      canvas.getByRole("navigation", { name: "페이지네이션" }),
    ).toBeVisible();

    // 결과가 없는 조건으로 좁히면 표 자리만 빈 상태로 바뀐다
    await userEvent.type(
      canvas.getByPlaceholderText("주문번호·상품·주문자 검색"),
      "없는주문",
    );
    await expect(canvas.getByText("조건에 맞는 주문이 없습니다")).toBeVisible();
    await expect(canvas.queryByRole("table")).toBeNull();
    // 빈 상태에서는 페이지네이션도 함께 숨는다
    await expect(canvas.queryByRole("navigation")).toBeNull();

    // 툴바는 유지되므로 그대로 되돌릴 수 있다
    await userEvent.click(canvas.getByRole("button", { name: "초기화" }));
    await expect(canvas.getByRole("table")).toBeVisible();
  },
};
