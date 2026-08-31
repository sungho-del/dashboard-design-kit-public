import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Card, CardBody, CardHeader } from "../Card";
import { Tag } from "../Tag";
import {
  BarChart,
  ChartLegend,
  ChartTooltip,
  DonutChart,
  LineChart,
  type ChartSeries,
} from "./Chart";

/* -------------------------------------------------------------------------
 * 샘플 데이터 — 이커머스 관리자 대시보드 맥락
 * ---------------------------------------------------------------------- */

/** 월별 매출·주문 (최근 6개월) */
const MONTHLY = [
  { month: "3월", revenue: 28_400_000, orders: 362 },
  { month: "4월", revenue: 31_900_000, orders: 418 },
  { month: "5월", revenue: 27_600_000, orders: 351 },
  { month: "6월", revenue: 38_200_000, orders: 496 },
  { month: "7월", revenue: 44_700_000, orders: 573 },
  { month: "8월", revenue: 41_300_000, orders: 528 },
];

const SALES_SERIES: ChartSeries[] = [
  { key: "revenue", label: "매출" },
  { key: "orders", label: "주문 수" },
];

const REVENUE_ONLY: ChartSeries[] = [{ key: "revenue", label: "매출" }];

/** 주차별 채널 매출 (누적 막대용) */
const WEEKLY_BY_CHANNEL = [
  { week: "1주", search: 6_200_000, sns: 3_400_000, direct: 1_800_000 },
  { week: "2주", search: 7_100_000, sns: 4_050_000, direct: 2_100_000 },
  { week: "3주", search: 5_800_000, sns: 5_200_000, direct: 1_650_000 },
  { week: "4주", search: 8_300_000, sns: 4_700_000, direct: 2_400_000 },
];

const CHANNEL_SERIES: ChartSeries[] = [
  { key: "search", label: "검색 유입" },
  { key: "sns", label: "SNS" },
  { key: "direct", label: "직접 유입" },
];

/** 유입 채널 구성비 (도넛용) */
const CHANNEL_SESSIONS = [
  { channel: "네이버 검색", sessions: 4_820 },
  { channel: "인스타그램", sessions: 3_160 },
  { channel: "구글 검색", sessions: 2_040 },
  { channel: "카카오톡", sessions: 1_280 },
  { channel: "직접 유입", sessions: 940 },
];

const CHANNEL_LEGEND: ChartSeries[] = CHANNEL_SESSIONS.map((d) => ({
  key: d.channel,
  label: d.channel,
}));

const TOTAL_SESSIONS = CHANNEL_SESSIONS.reduce((sum, d) => sum + d.sessions, 0);

/** 축·툴팁 값 포맷터 — 원화 금액은 만원 단위로 줄여 축이 붐비지 않게 한다 */
const won = (value: number | string) =>
  `${Math.round(Number(value) / 10_000).toLocaleString("ko-KR")}만`;

const count = (value: number | string) =>
  `${Number(value).toLocaleString("ko-KR")}건`;

const sessions = (value: number | string) =>
  `${Number(value).toLocaleString("ko-KR")}회`;

/* -------------------------------------------------------------------------
 * meta
 * ---------------------------------------------------------------------- */

const meta = {
  title: "Components/Chart",
  component: LineChart,
  tags: ["autodocs"],
  argTypes: {
    area: { control: "boolean" },
    height: { control: { type: "number", min: 120, max: 480, step: 20 } },
    ariaLabel: { control: "text" },
  },
  args: {
    data: MONTHLY,
    xKey: "month",
    series: REVENUE_ONLY,
    ariaLabel: "월별 매출 추이",
    format: won,
  },
  // 차트는 부모 크기를 재서 그리므로 폭이 있는 컨테이너가 필요하다.
  // 높이는 `height` prop(기본 240)이 정하므로 클래스로 주지 않는다.
  decorators: [
    (Story) => (
      <div className="w-200 rounded-medium bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          "대시보드 데이터 시각화 차트입니다. (DESIGN.md §28)",
          "",
          "Clay 토큰 정본에 차트 색이 0건이고 원본은 Chart.js가 로드만 돼 있어 시각 언어의 선례가 없습니다.",
          "그래서 색은 Phase 7a에서 신설한 `--color-chart-*` 토큰을, 형태 규격은 데이터 시각화 일반 원칙을 따릅니다.",
          "",
          "### 언제 무엇을",
          "",
          "- **LineChart** — 시간에 따른 추이. 단일 계열이면 `area`로 면을 채워 변화량을 강조합니다.",
          "- **BarChart** — 항목 간 크기 비교. 구성까지 보여줘야 하면 `stacked`를 켭니다.",
          "- **DonutChart** — 구성비. 조각이 5개를 넘으면 읽히지 않으므로 상위 4개 + '기타'로 접습니다.",
          "",
          "### 사용 규칙",
          "",
          "- **계열은 5개까지입니다.** 6번째부터는 색이 순환하지 않고 마지막 색에 고정되므로 계열을 구분할 수 없습니다. 그 이상은 '기타'로 묶습니다.",
          "- **계열이 2개 이상이면 `ChartLegend`를 반드시 함께 놓습니다.** 색만으로 식별하게 두지 않습니다.",
          '- `ariaLabel`은 필수입니다. SVG 내용은 스크린리더에 전달되지 않으므로 `role="img"` + 이름으로 무엇을 보여주는 차트인지 알립니다.',
          "- 정확한 수치가 필요한 화면에서는 차트 대신(또는 차트와 함께) 테이블을 씁니다. 대시보드의 기본 데이터 표시는 테이블입니다. (DESIGN_참고.md §7)",
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
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------
 * Line
 * ---------------------------------------------------------------------- */

/** 선 그래프 — 시간에 따른 추이. 선 두께 2 · 가로 격자선만 그린다 */
export const Line: Story = {
  tags: ["autodocs"],
};

/**
 * 계열 2개 — 색만으로 구분하지 않도록 범례를 함께 놓는다.
 * 단위가 다른 값(원 / 건)을 한 축에 겹치면 오해를 부르므로 실제 화면에서는 축을 나누거나 차트를 나눈다.
 */
export const LineMultiSeries: Story = {
  tags: ["autodocs"],
  args: { series: SALES_SERIES, ariaLabel: "월별 매출·주문 추이" },
  render: (args) => (
    <div className="flex flex-col gap-4">
      <LineChart {...args} />
      <ChartLegend series={SALES_SERIES} />
    </div>
  ),
};

/** `area` — 단일 계열의 변화량을 강조한다. 면은 같은 계열의 옅은 fill 토큰을 쓴다 */
export const Area: Story = {
  tags: ["autodocs"],
  args: { area: true, ariaLabel: "월별 매출 추이(면)" },
};

/* -------------------------------------------------------------------------
 * Bar
 * ---------------------------------------------------------------------- */

/** 막대 그래프 — 항목 간 크기 비교. 막대 끝만 4px 라운딩하고 바닥은 기준선에 붙인다 */
export const Bar: Story = {
  tags: ["autodocs"],
  render: () => (
    <BarChart
      data={MONTHLY}
      xKey="month"
      series={REVENUE_ONLY}
      ariaLabel="월별 매출 비교"
      format={won}
    />
  ),
};

/** 계열 2개를 나란히 — 항목 안에서 계열끼리 비교한다 */
export const BarGrouped: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-4">
      <BarChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="월별 매출·주문 비교"
        format={count}
      />
      <ChartLegend series={SALES_SERIES} />
    </div>
  ),
};

/**
 * `stacked` — 합계와 구성을 한 번에 본다.
 * 쌓을 때는 라운딩을 빼고(0) 조각 경계가 어긋나지 않게 한다.
 */
export const BarStacked: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-4">
      <BarChart
        data={WEEKLY_BY_CHANNEL}
        xKey="week"
        series={CHANNEL_SERIES}
        stacked
        ariaLabel="주차별 채널 매출 누적"
        format={won}
      />
      <ChartLegend series={CHANNEL_SERIES} />
    </div>
  ),
};

/* -------------------------------------------------------------------------
 * Donut
 * ---------------------------------------------------------------------- */

/**
 * 도넛 — 구성비. 조각 사이에 표면색 2px 링을 둘러 인접 색이 맞닿지 않게 한다.
 * 가운데(`center`)에는 합계를 넣어 조각을 더하지 않아도 규모를 알 수 있게 한다.
 */
export const Donut: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col items-center gap-6">
      <DonutChart
        data={CHANNEL_SESSIONS}
        nameKey="channel"
        valueKey="sessions"
        ariaLabel="유입 채널 구성비"
        format={sessions}
        className="w-80"
        center={
          <>
            <span className="body-small text-text-sub">전체 세션</span>
            <span className="heading-xlarge-bold text-text">
              {TOTAL_SESSIONS.toLocaleString("ko-KR")}
            </span>
          </>
        }
      />
      {/* 범례는 ul 자체가 flex 컨테이너라, 방향을 바꾸려 className으로 덮어쓰면
          cn()이 클래스를 병합하지 않아 align-items 클래스가 2개 방출된다.
          그래서 세로 배치가 필요하면 override 대신 차트 아래에 그대로 놓는다 */}
      <ChartLegend series={CHANNEL_LEGEND} />
    </div>
  ),
};

/* -------------------------------------------------------------------------
 * 범례 · 툴팁
 * ---------------------------------------------------------------------- */

/**
 * `ChartLegend` — 스와치 16×16 + 간격 8.
 * **계열이 2개 이상이면 항상 노출한다.** 색만으로 식별하게 두지 않기 위해서다.
 * 계열이 5개를 넘으면 색은 마지막 색에 고정된다(순환 금지) — 6번째부터는 '기타'로 접을 것.
 */
export const Legend: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text">가로 (기본)</p>
        <ChartLegend series={CHANNEL_SERIES} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text">
          라벨이 길면 줄바꿈된다 (`flex-wrap`)
        </p>
        <ChartLegend series={CHANNEL_LEGEND} />
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text">
          색 오버라이드 (`colors`) — 도넛처럼 조각마다 색이 다를 때
        </p>
        <ChartLegend
          series={CHANNEL_SERIES}
          colors={[
            "var(--color-chart-fill-1)",
            "var(--color-chart-fill-2)",
            "var(--color-chart-fill-3)",
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-medium-bold text-text-critical">
          ❌ 계열 6개 — 5·6번째가 같은 색이라 구분되지 않는다
        </p>
        <ChartLegend
          series={Array.from({ length: 6 }, (_, i) => ({
            key: `s${i}`,
            label: `계열 ${i + 1}`,
          }))}
        />
      </div>
    </div>
  ),
};

/**
 * `ChartTooltip` — 차트가 호버될 때 뜨는 패널. 여기서는 항상 열린 상태로 보여준다.
 * 계열 키는 10px 원형 · 항목 간 gap 8 · padding 16.
 */
export const Tooltip: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex items-start gap-6">
      <ChartTooltip
        active
        label="7월"
        payload={[
          {
            name: "매출",
            value: 44_700_000,
            color: "var(--color-chart-series-1)",
            dataKey: "revenue",
          },
        ]}
        format={(v) => `₩ ${Number(v).toLocaleString("ko-KR")}`}
      />
      <ChartTooltip
        active
        label="7월"
        payload={[
          {
            name: "검색 유입",
            value: 8_300_000,
            color: "var(--color-chart-series-1)",
            dataKey: "search",
          },
          {
            name: "SNS",
            value: 4_700_000,
            color: "var(--color-chart-series-2)",
            dataKey: "sns",
          },
          {
            name: "직접 유입",
            value: 2_400_000,
            color: "var(--color-chart-series-3)",
            dataKey: "direct",
          },
        ]}
        format={won}
      />
    </div>
  ),
};

/* -------------------------------------------------------------------------
 * 조합
 * ---------------------------------------------------------------------- */

/** 실제 대시보드 맥락 — 카드 안에 차트를 넣고 헤더에 기간·증감을 둔다 */
export const InCard: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="월별 매출"
          action={<Tag tone="success">전월 대비 +8%</Tag>}
        />
        <CardBody>
          <LineChart
            data={MONTHLY}
            xKey="month"
            series={REVENUE_ONLY}
            area
            ariaLabel="최근 6개월 월별 매출 추이"
            format={won}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="주차별 채널 매출" />
        <CardBody>
          <BarChart
            data={WEEKLY_BY_CHANNEL}
            xKey="week"
            series={CHANNEL_SERIES}
            stacked
            ariaLabel="주차별 채널 매출 누적"
            format={won}
          />
          <ChartLegend series={CHANNEL_SERIES} />
        </CardBody>
      </Card>
    </div>
  ),
};

/**
 * 렌더·상호작용 검증.
 *
 * 차트 본체는 `role="img"` + `ariaLabel` 로 이름이 노출되고,
 * 범례는 목록으로 읽힌다(색 스와치는 `aria-hidden`).
 */
export const Rendered: Story = {
  tags: ["autodocs"],
  render: () => (
    <div className="flex flex-col gap-4">
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="월별 매출·주문 추이"
        format={won}
      />
      <ChartLegend series={SALES_SERIES} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // SVG 는 스크린리더에 내용이 전달되지 않으므로 프레임이 이름을 대신 말한다
    await expect(
      canvas.getByRole("img", { name: "월별 매출·주문 추이" }),
    ).toBeInTheDocument();

    // 계열이 2개 이상이면 범례로 계열 이름이 읽혀야 한다
    const items = canvas.getAllByRole("listitem");
    await expect(items).toHaveLength(2);
    await expect(items[0]).toHaveTextContent("매출");
    await expect(items[1]).toHaveTextContent("주문 수");

    // 차트 면을 호버해 본다. 툴팁 위치는 실측 좌표에 달려 있어 검증하지 않는다
    const surface =
      canvasElement.querySelector<SVGSVGElement>(".recharts-surface");
    if (surface) await userEvent.hover(surface);
  },
};
