import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { MoreVertical } from "lucide-react";
import { IconButton } from "../IconButton";
import { Tag } from "../Tag";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "./Table";

const meta = {
  title: "Components/Table",
  component: Table,
  tags: ["autodocs"],
  argTypes: {
    zebra: { control: "boolean" },
    dividers: { control: "boolean" },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 주문 목록 — 대시보드에서 가장 흔한 테이블 형태 */
type OrderStatus = "결제완료" | "배송중" | "배송완료" | "입금대기" | "취소";

interface Order {
  id: string;
  product: string;
  status: OrderStatus;
  amount: number;
  orderedAt: string;
}

const ORDERS: Order[] = [
  {
    id: "20250814-0001",
    product: "라이트 코튼 셔츠 / 아이보리 / M",
    status: "결제완료",
    amount: 39000,
    orderedAt: "2025-08-14 09:12",
  },
  {
    id: "20250814-0002",
    product: "데일리 백팩 20L",
    status: "배송중",
    amount: 78000,
    orderedAt: "2025-08-14 10:41",
  },
  {
    id: "20250813-0018",
    product: "우드 데스크 오거나이저 세트",
    status: "배송완료",
    amount: 24500,
    orderedAt: "2025-08-13 18:03",
  },
  {
    id: "20250813-0017",
    product: "무선 충전 마우스패드",
    status: "입금대기",
    amount: 32000,
    orderedAt: "2025-08-13 17:22",
  },
  {
    id: "20250813-0016",
    product: "베이직 머그 320ml",
    status: "취소",
    amount: 12000,
    orderedAt: "2025-08-13 11:55",
  },
];

/** 상태 값은 텍스트만 쓰지 않고 Tag(dot + 라벨)로 표현한다 (DESIGN_참고.md §7) */
const STATUS_TONE: Record<
  OrderStatus,
  "default" | "success" | "warning" | "critical"
> = {
  결제완료: "success",
  배송중: "default",
  배송완료: "success",
  입금대기: "warning",
  취소: "critical",
};

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

/** 기본 zebra 테이블. 숫자 컬럼(금액)만 우측 정렬한다 */
export const Default: Story = {
  render: (args) => (
    <Table {...args}>
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
        {ORDERS.map((order) => (
          <TableRow key={order.id}>
            <TableTd>{order.id}</TableTd>
            <TableTd>{order.product}</TableTd>
            <TableTd>
              <Tag tone={STATUS_TONE[order.status]} dot>
                {order.status}
              </Tag>
            </TableTd>
            <TableTd>{won(order.amount)}</TableTd>
            <TableTd>{order.orderedAt}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * 실제 대시보드 맥락 — 테이블 셸(DESIGN.md §7-1) 안에 넣은 모습.
 * 헤더 영역 padding `0 24 24 24`, 래퍼는 `overflow-auto`.
 * 행 끝에는 IconButton으로 행 단위 액션을 둔다.
 */
export const OrderList: Story = {
  render: (args) => (
    <div className="w-full rounded-medium bg-surface py-6 shadow-card">
      <div className="flex items-center justify-between gap-2 px-6 pb-6">
        <h2 className="heading-large-bold text-text">주문 목록</h2>
        <span className="body-small text-text-sub">총 5건</span>
      </div>
      <div className="w-full overflow-auto">
        <Table {...args}>
          <TableHead>
            <TableRow>
              <TableTh className="w-40">주문번호</TableTh>
              <TableTh>상품명</TableTh>
              <TableTh className="w-28">상태</TableTh>
              <TableTh className="w-28">금액</TableTh>
              <TableTh className="w-40">주문일시</TableTh>
              <TableTh className="w-16">
                <span className="sr-only">액션</span>
              </TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {ORDERS.map((order) => (
              <TableRow key={order.id} clickable>
                <TableTd>{order.id}</TableTd>
                <TableTd ellipsis>{order.product}</TableTd>
                <TableTd>
                  <Tag tone={STATUS_TONE[order.status]} dot>
                    {order.status}
                  </Tag>
                </TableTd>
                <TableTd>{won(order.amount)}</TableTd>
                <TableTd>{order.orderedAt}</TableTd>
                <TableTd>
                  <IconButton
                    label={`${order.id} 더보기`}
                    size="small"
                    icon={<MoreVertical strokeWidth={1.2} aria-hidden />}
                  />
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  ),
};

/** 행 클릭이 가능하면 hover 배경 + pointer 커서를 반드시 함께 준다 */
export const ClickableRows: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh>주문번호</TableTh>
          <TableTh>상품명</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDERS.slice(0, 3).map((order) => (
          <TableRow key={order.id} clickable>
            <TableTd>{order.id}</TableTd>
            <TableTd>{order.product}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** `zebra={false}` = DESIGN.md §7의 noBackground — 줄무늬 대신 td 하단 구분선 */
export const NoBackground: Story = {
  args: { zebra: false },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh>주문번호</TableTh>
          <TableTh>상품명</TableTh>
          <TableTh>금액</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDERS.map((order) => (
          <TableRow key={order.id}>
            <TableTd>{order.id}</TableTd>
            <TableTd>{order.product}</TableTd>
            <TableTd>{won(order.amount)}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** 스크롤 컨테이너 상단에 헤더를 고정한다 */
export const StickyHeader: Story = {
  render: (args) => (
    <div className="h-64 w-full overflow-auto rounded-medium bg-surface">
      <Table {...args}>
        <TableHead sticky>
          <TableRow>
            <TableTh className="w-40">주문번호</TableTh>
            <TableTh>상품명</TableTh>
            <TableTh className="w-28">금액</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...ORDERS, ...ORDERS, ...ORDERS].map((order, index) => (
            <TableRow key={`${order.id}-${index}`}>
              <TableTd>{order.id}</TableTd>
              <TableTd>{order.product}</TableTd>
              <TableTd>{won(order.amount)}</TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

/**
 * `dividers` — 컬럼 사이 세로 구분선(DESIGN.md §7 `border-right: 1px divide`).
 * 숫자·코드처럼 열 경계가 있어야 읽히는 표에서만 켠다. 마지막 컬럼에는 붙지 않는다.
 */
export const Dividers: Story = {
  args: { dividers: true },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh className="w-40">주문번호</TableTh>
          <TableTh>상품명</TableTh>
          <TableTh className="w-28">금액</TableTh>
          <TableTh className="w-40">주문일시</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDERS.map((order) => (
          <TableRow key={order.id}>
            <TableTd>{order.id}</TableTd>
            <TableTd ellipsis>{order.product}</TableTd>
            <TableTd>{won(order.amount)}</TableTd>
            <TableTd>{order.orderedAt}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const firstCell = canvas.getByText("20250814-0001");

    // 세로선은 border-right 로 그린다 (§7)
    await expect(firstCell).toHaveClass("border-r");
    // 마지막 컬럼은 last:border-r-0 으로 지운다 — 표 바깥에 선이 남지 않는다
    await expect(
      canvas.getByRole("columnheader", { name: "주문일시" }),
    ).toHaveClass("last:border-r-0");
  },
};

/** 세로 구분선 + noBackground(zebra 해제) — 가로선은 행이, 세로선은 셀이 그린다 */
export const DividersWithoutZebra: Story = {
  args: { dividers: true, zebra: false },
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh className="w-40">주문번호</TableTh>
          <TableTh>상품명</TableTh>
          <TableTh className="w-28">금액</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDERS.map((order) => (
          <TableRow key={order.id}>
            <TableTd>{order.id}</TableTd>
            <TableTd ellipsis>{order.product}</TableTd>
            <TableTd>{won(order.amount)}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/**
 * 세로 구분선 + sticky 헤더.
 * `border-collapse: collapse`에서는 sticky 셀의 border가 함께 스크롤돼 사라지므로,
 * 헤더 셀만 `::after`로 같은 1px을 그린다. 스크롤해도 세로선이 유지되는지 확인용.
 */
export const DividersWithStickyHeader: Story = {
  args: { dividers: true },
  render: (args) => (
    <div className="h-64 w-full overflow-auto rounded-medium bg-surface">
      <Table {...args}>
        <TableHead sticky>
          <TableRow>
            <TableTh className="w-40">주문번호</TableTh>
            <TableTh>상품명</TableTh>
            <TableTh className="w-28">금액</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...ORDERS, ...ORDERS, ...ORDERS].map((order, index) => (
            <TableRow key={`${order.id}-${index}`}>
              <TableTd>{order.id}</TableTd>
              <TableTd>{order.product}</TableTd>
              <TableTd>{won(order.amount)}</TableTd>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

/**
 * 셀 단위 제어 — 고정 컬럼(주문번호) 뒤에만 경계를 두고 나머지는 붙이지 않는다.
 * `Table`은 `dividers`를 끈 채로 두고 해당 셀에서만 `divider`를 켠다.
 */
export const DividerPerCell: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh className="w-40" divider>
            주문번호
          </TableTh>
          <TableTh>상품명</TableTh>
          <TableTh className="w-28">금액</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {ORDERS.slice(0, 3).map((order) => (
          <TableRow key={order.id}>
            <TableTd divider>{order.id}</TableTd>
            <TableTd>{order.product}</TableTd>
            <TableTd>{won(order.amount)}</TableTd>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

/** 긴 텍스트는 `ellipsis`로 2줄까지만 보여준다 */
export const Ellipsis: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh className="w-32">주문번호</TableTh>
          <TableTh className="w-48">상품명</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableTd>20250814-0001</TableTd>
          <TableTd ellipsis>
            라이트 코튼 셔츠 / 아이보리 / M · 여름 시즌 한정 패키지 · 사은품
            포함 · 무료 반품 가능 상품
          </TableTd>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** 정렬 옵션 — 텍스트 좌측, 숫자 우측, 필요 시 가운데 */
export const Alignment: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableTh align="left">left</TableTh>
          <TableTh align="center">center</TableTh>
          <TableTh>right</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        <TableRow>
          <TableTd align="left">좌측 정렬</TableTd>
          <TableTd align="center">가운데</TableTd>
          <TableTd>{won(39000)}</TableTd>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

/** `<Table.Row>` 같은 합성 표기도 동일하게 동작한다 */
export const CompoundNotation: Story = {
  render: (args) => (
    <Table {...args}>
      <Table.Head>
        <Table.Row>
          <Table.Th>주문번호</Table.Th>
          <Table.Th>금액</Table.Th>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {ORDERS.slice(0, 2).map((order) => (
          <Table.Row key={order.id}>
            <Table.Td>{order.id}</Table.Td>
            <Table.Td>{won(order.amount)}</Table.Td>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/**
 * 렌더 검증: 시맨틱 table 구조가 유지되고, 상태 Tag가 함께 그려지며,
 * 클릭 가능한 행이 클릭에 반응한다.
 */
export const Rendered: Story = {
  render: () => {
    const handleClick = () => {};
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableTh>주문번호</TableTh>
            <TableTh>상태</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow clickable onClick={handleClick}>
            <TableTd>20250814-0001</TableTd>
            <TableTd>
              <Tag tone="success" dot>
                결제완료
              </Tag>
            </TableTd>
          </TableRow>
        </TableBody>
      </Table>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 헤더 셀은 columnheader 롤로 노출된다
    await expect(
      canvas.getByRole("columnheader", { name: "주문번호" }),
    ).toBeVisible();

    const row = canvas.getByText("20250814-0001").closest("tr");
    await expect(row).not.toBeNull();
    await expect(row).toHaveAttribute("data-clickable", "true");

    // 상태는 Tag로 표현된다
    await expect(canvas.getByText("결제완료")).toBeVisible();

    await userEvent.click(canvas.getByText("20250814-0001"));
  },
};
