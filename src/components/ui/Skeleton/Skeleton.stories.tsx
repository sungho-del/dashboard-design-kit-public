import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";
import { cn } from "../../../lib/cn";
import { Button } from "../Button";
import { Card, CardBody, CardHeader } from "../Card";
import { DataTableShell } from "../DataTableShell";
import { SegmentedControl } from "../SegmentedControl";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../Table";
import { Skeleton } from "./Skeleton";

const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {
    shape: { control: "inline-radio", options: ["line", "block"] },
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: [
          "데이터가 아직 오지 않은 자리에 **올 것의 형태만** 회색 면으로 그려 두는 장식입니다.",
          "값을 말하지 않고 **자리의 존재**를 말합니다. (`docs/DESIGN.md` §26-2 · `DESIGN-dashboard.md` §D8-1)",
          "",
          "### 언제 쓰는가 — 시간이 처방을 정한다",
          "",
          "| 구간 | 처방 |",
          "| --- | --- |",
          "| `< 1s` | 표시자를 **넣지 않는다** (오히려 방해가 된다) |",
          "| `1 ~ 10s` | **스켈레톤**(구조가 있는 곳) / 스피너(단일 모듈) |",
          "| `> 10s` | 진행률 표시 |",
          "",
          "지연 판단은 **호출부의 몫**입니다 — 부품에 타이머를 넣으면 수십 개가 따로 돌아 화면이 튑니다.",
          "",
          "### 접근성 — 절대 읽히지 않는다",
          "",
          '항상 `aria-hidden`이고 role·이름·텍스트가 없습니다. `Spinner`는 화면당 하나라 `role="status"`가',
          '맞지만, 스켈레톤은 한 화면에 수십 개라 같은 문법이면 **"로딩 중"이 서른 번 낭독됩니다.**',
          '로딩 사실은 **컨테이너의 `aria-busy="true"`** 가 한 번만 말합니다.',
          "",
          "### 두 가지 shape",
          "",
          "| shape | 흉내내는 것 | 높이의 정본 | radius |",
          "| --- | --- | --- | --- |",
          "| `line`(기본) | 글자 한 줄 | **그 자리의 타이포 프리셋 줄 높이**(`h-lh`) | `small`(6) |",
          '| `block` | 면(차트·썸네일·타일 전체) | **부모가 준다**(`className="h-60"`) | `medium`(8) |',
          "",
          "### 하지 말 것",
          "",
          "- `className`으로 radius·배경색을 덮지 마세요 — `cn()`은 병합하지 않아 둘 다 방출됩니다.",
          "- **갱신(refetch)을 스켈레톤으로 되돌리지 마세요** — 레이아웃이 튀고 **포커스가 사라집니다.**",
          "- **고정 텍스트는 스켈레톤으로 만들지 마세요** — 표 헤더·카드 제목·타일 라벨·툴바는 실제 텍스트로 렌더하고 변하는 것만 가립니다.",
          "- 폭으로 실제 문자열 길이를 흉내내지 마세요. 랜덤 폭도 금지입니다(리렌더마다 깜빡입니다).",
          "- 토스트·드롭다운·오버플로 메뉴·모달 안에 쓰지 마세요.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* 기본                                                                */
/* ------------------------------------------------------------------ */

/** 기본 — `line`. 폭을 주지 않으면 부모를 채운다 */
export const Line: Story = {
  args: { shape: "line" },
  render: (args) => (
    <div className="body-medium w-80">
      <Skeleton {...args} />
    </div>
  ),
};

/**
 * **높이는 타이포 프리셋이 정본이다.** 숫자로 받지 않는다.
 *
 * 각 줄의 스켈레톤은 옆의 실제 글자와 **정확히 같은 줄 높이**를 갖는다
 * (`body-small` 16 · `body-medium` 20 · `heading-medium` 24 · `metric-small` 32).
 * 숫자 prop 으로 받으면 프리셋을 바꿀 때 호출부가 따라오지 못하고,
 * 그 어긋남이 로드 직후 **레이아웃 시프트**로 나타난다 — 스켈레톤이 막으려던 증상이다.
 */
export const LineFollowsTypography: Story = {
  render: () => (
    <div className="flex w-160 flex-col gap-4">
      {(
        [
          ["body-small", "캡션 · 설명 (12 / 16)"],
          ["body-medium", "기본 본문 (14 / 20)"],
          ["heading-medium", "카드 제목 (16 / 24)"],
          ["metric-small", "지표 수치 (24 / 32)"],
        ] as const
      ).map(([preset, caption]) => (
        /*
          ⚠️ 프리셋 이름이 **완전한 문자열로 위 배열에 적혀 있어야** Tailwind 스캔이
          찾는다. `` `${계열}-${크기}` `` 처럼 조립하면 배포 CSS 에서 사라진다.
        */
        <div key={preset} className={cn(preset, "flex items-center gap-4")}>
          <span className="w-64 shrink-0 text-text-sub">{caption}</span>
          <Skeleton className="w-40" />
        </div>
      ))}
    </div>
  ),
};

/**
 * `block` — 면. **높이를 스스로 갖지 않는다**(`className="h-60"` 이 준다).
 *
 * 기본값으로 `h-full` 을 두지 않는 이유는 `cn()` 이 클래스를 병합하지 않기 때문이다.
 * 두 갈래가 `height` 를 함께 방출하면 승자를 스타일시트 순서가 정한다.
 */
export const Block: Story = {
  args: { shape: "block" },
  render: (args) => (
    <div className="w-160">
      <Skeleton {...args} className="h-60 w-full" />
    </div>
  ),
};

/**
 * 문단 — **반복은 호출부의 `map` 이 한다.** `count`/`rows` prop 을 두지 않는다.
 *
 * 마지막 줄만 짧게 두는 것은 문단의 형태를 흉내내는 것이지 **글자 수를 흉내내는 것이
 * 아니다.** 실제 문자열 길이에 맞춰 폭을 바꾸거나 랜덤 폭을 쓰면 리렌더마다 깜빡인다.
 */
export const Paragraph: Story = {
  render: () => (
    <div className="body-medium flex w-120 flex-col gap-2">
      <Skeleton className="w-full" />
      <Skeleton className="w-full" />
      <Skeleton className="w-2/3" />
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* 조립 레시피 ① 표 로딩                                                */
/* ------------------------------------------------------------------ */

const FILTERS = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제완료" },
  { value: "ready", label: "배송준비중" },
];

/**
 * 열 폭의 정본은 `<colgroup>` 이다.
 *
 * ⚠️ 로딩 뼈대도 **같은 colgroup 을 쓴다.** 스켈레톤이 폭을 다시 추측하면
 * 로드 후 열이 움직인다 — 스켈레톤이 막으려던 레이아웃 시프트가 난다.
 */
function OrderColgroup() {
  return (
    <colgroup>
      <col className="w-[18%]" />
      <col className="w-[32%]" />
      <col className="w-[12%]" />
      <col className="w-[16%]" />
      <col className="w-[22%]" />
    </colgroup>
  );
}

/** 헤더는 **실제 텍스트**다 — 고정 텍스트를 스켈레톤으로 만들지 않는다 */
function OrderTableHead() {
  return (
    <TableHead>
      <TableRow>
        <TableTh>주문번호</TableTh>
        <TableTh>상품</TableTh>
        <TableTh>주문자</TableTh>
        <TableTh>상태</TableTh>
        <TableTh>결제금액</TableTh>
      </TableRow>
    </TableHead>
  );
}

/**
 * 표 로딩 뼈대 — 헤더는 진짜, 본문 셀만 스켈레톤.
 *
 * 폭은 **열마다 고정**이다(행마다 다르게 하지 않는다). 행이 바뀔 때마다 폭이
 * 달라지면 눈이 그것을 데이터로 읽는다.
 */
function OrderTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Table>
      <OrderColgroup />
      <OrderTableHead />
      <TableBody>
        {Array.from({ length: rows }, (_, i) => (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * **① 표 로딩** — `DataTableShell` 의 `loading` 슬롯.
 *
 * - **툴바는 유지된다** — 조건을 되돌릴 수단이 남아야 한다(`isEmpty` 와 같은 이유)
 * - 표 헤더도 **실제 텍스트**다 — 어차피 안 바뀐다
 * - 본문 컨테이너에 **`aria-busy="true"`** 하나. 스켈레톤 다섯 줄이 각자 말하지 않는다
 * - 푸터(페이지네이션)는 감춘다 — 총 페이지 수를 아직 모른다
 */
export const TableLoading: Story = {
  render: () => (
    <DataTableShell
      aria-label="주문 목록"
      isLoading
      toolbarStart={
        <SegmentedControl
          items={FILTERS}
          value="all"
          onValueChange={() => {}}
        />
      }
      loading={<OrderTableSkeleton />}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    /* 로딩 사실을 말하는 것은 **컨테이너 하나**다 */
    const body = canvasElement.querySelector(
      "[data-table-shell-body]",
    ) as HTMLElement;
    await expect(body).toHaveAttribute("aria-busy", "true");

    /* 스켈레톤은 접근성 트리에 없다 — "로딩 중"이 여러 번 낭독되지 않는다 */
    await expect(canvas.queryAllByRole("status")).toHaveLength(0);
    for (const node of canvasElement.querySelectorAll("[data-skeleton]")) {
      await expect(node).toHaveAttribute("aria-hidden", "true");
    }

    /* 조건을 되돌릴 수단(툴바)은 로딩 중에도 살아 있다 */
    await expect(
      canvas.getByRole("radio", { name: "결제완료" }),
    ).toBeInTheDocument();

    /* 고정 텍스트는 진짜다 */
    await expect(canvas.getByText("주문번호")).toBeVisible();
  },
};

/**
 * **로딩 → 데이터 전이.** 규격만 있고 조립된 적이 없으면 검증된 것이 아니다.
 *
 * `isLoading` 이 내려가는 순간 `aria-busy` 가 사라지고 같은 `<colgroup>` 위에
 * 실제 행이 들어선다 — **열 폭이 그대로라 표가 움직이지 않는다.**
 * (실제 화면에서는 버튼이 아니라 요청 완료가 이 전환을 일으킨다.)
 */
export const LoadingToLoaded: Story = {
  render: function LoadingToLoadedStory() {
    const [loading, setLoading] = useState(true);

    return (
      <div className="flex flex-col gap-4">
        <Button size="small" onClick={() => setLoading((v) => !v)}>
          {loading ? "데이터 도착" : "다시 로딩"}
        </Button>
        <DataTableShell
          aria-label="주문 목록"
          isLoading={loading}
          toolbarStart={
            <SegmentedControl
              items={FILTERS}
              value="all"
              onValueChange={() => {}}
            />
          }
          loading={<OrderTableSkeleton rows={3} />}
        >
          <Table>
            <OrderColgroup />
            <OrderTableHead />
            <TableBody>
              {[
                ["20260818-0024", "무선 이어폰 24호 · 기본 구성", "김성호"],
                ["20260818-0023", "무선 이어폰 23호 · 기본 구성", "이서연"],
                ["20260818-0022", "무선 이어폰 22호 · 기본 구성", "박준영"],
              ].map(([id, product, customer]) => (
                <TableRow key={id}>
                  <TableTd>{id}</TableTd>
                  <TableTd ellipsis>{product}</TableTd>
                  <TableTd>{customer}</TableTd>
                  <TableTd>결제완료</TableTd>
                  <TableTd>128,000원</TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTableShell>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = canvasElement.querySelector(
      "[data-table-shell-body]",
    ) as HTMLElement;

    /* 1) 로딩 — 자리만 있고 값은 없다 */
    await expect(body).toHaveAttribute("aria-busy", "true");
    await expect(canvas.queryByText("20260818-0024")).toBeNull();
    await expect(
      canvasElement.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);

    /* 2) 데이터 도착 */
    await userEvent.click(canvas.getByRole("button", { name: "데이터 도착" }));

    /* 3) 값이 들어서고 로딩 신호가 사라진다 */
    await expect(canvas.getByText("20260818-0024")).toBeVisible();
    await expect(body).not.toHaveAttribute("aria-busy");
    await expect(
      canvasElement.querySelectorAll("[data-skeleton]"),
    ).toHaveLength(0);

    /* 헤더는 두 상태에서 같은 자리에 그대로 있었다 */
    await expect(canvas.getByText("주문번호")).toBeVisible();
  },
};

/* ------------------------------------------------------------------ */
/* 조립 레시피 ② 타일 로딩                                              */
/* ------------------------------------------------------------------ */

/**
 * 로딩 중인 지표 타일 한 칸.
 *
 * `StatTile`(`plain`)의 상자를 그대로 쓰되 **수치 자리만** 가린다 — 라벨은
 * 고정 텍스트라 진짜로 렌더한다. 수치 스켈레톤은 `metric-small`(24/32) 안에 있어
 * 실제 숫자와 **같은 줄 높이**를 차지한다.
 *
 * ⚠️ 상자는 흰 카드 안에서 `surface-sub` 다. 스켈레톤이 `surface-sub` 였다면
 * 여기서 **완전히 사라진다**(대비 1.00) — `surface-skeleton` 을 따로 만든 이유다.
 */
function StatTileSkeleton({ label }: { label: string }) {
  return (
    <div className="flex min-h-28 w-full flex-col justify-between gap-4 rounded-medium bg-surface-sub p-5 text-left">
      <span className="body-medium text-text-sub">{label}</span>
      <span className="metric-small flex justify-end">
        <Skeleton className="w-16" />
      </span>
    </div>
  );
}

/**
 * **② 타일 로딩** — 라벨은 진짜, 수치만 스켈레톤.
 *
 * 대시보드는 **타일 단위로 실패하고 타일 단위로 도착한다**(§D8). 한 칸이 안 왔다고
 * 화면 전체를 덮지 않는다. 여기서는 묶음 컨테이너가 `aria-busy` 로 한 번만 말한다.
 */
export const TileLoading: Story = {
  render: () => (
    <Card className="w-200">
      <CardHeader title="오늘의 주문" />
      <CardBody>
        <div
          role="group"
          aria-label="오늘의 주문 지표"
          aria-busy="true"
          className="grid grid-cols-4 gap-3"
        >
          {["결제완료", "배송준비중", "입금대기", "취소"].map((label) => (
            <StatTileSkeleton key={label} label={label} />
          ))}
        </div>
      </CardBody>
    </Card>
  ),
};

/* ------------------------------------------------------------------ */
/* 조립 레시피 ③ 차트 카드 로딩                                          */
/* ------------------------------------------------------------------ */

/**
 * **③ 차트 카드 로딩** — 카드 제목은 진짜, 그림 자리만 `block`.
 *
 * 차트는 축·범례까지 흉내내지 않는다. **면 하나**로 충분하다 —
 * 축을 그리면 아직 없는 눈금 값이 있는 것처럼 읽힌다.
 * 높이는 실제 차트와 같은 값(`h-60`)을 주어야 로드 후 카드가 늘어나지 않는다.
 */
export const ChartCardLoading: Story = {
  render: () => (
    <Card className="w-200" aria-busy="true">
      <CardHeader title="주간 매출 추이" />
      <CardBody>
        <Skeleton shape="block" className="h-60 w-full" />
        {/* 범례 자리 — 실제 범례와 같은 줄 높이(`body-small`)를 차지한다 */}
        <span className="body-small flex gap-4">
          <Skeleton className="w-20" />
          <Skeleton className="w-20" />
          <Skeleton className="w-20" />
        </span>
      </CardBody>
    </Card>
  ),
};
