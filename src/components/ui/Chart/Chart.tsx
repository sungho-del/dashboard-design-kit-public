import type { ReactNode } from "react";
import {
  Area,
  AreaChart as RAreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RLineChart,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../../lib/cn";

/* -------------------------------------------------------------------------
 * 차트 — DESIGN.md §28
 *
 * Clay 토큰 정본에 차트 색이 0건이고 원본은 Chart.js 가 로드만 돼 있어
 * (`new Chart(` 호출·`<canvas>` 0건) **시각 언어의 선례가 없다.**
 * 그래서 색은 Phase 7a 에서 신설한 `--color-chart-*` 를, 형태 규격은
 * 데이터 시각화 일반 원칙을 따른다. 근거는 PROGRESS.md.
 *
 * ## 계열색을 배열 상수로 두는 이유
 *
 * Tailwind v4 는 `@theme` 변수 중 **소스에서 실제로 발견된 것만** 출력한다.
 * `var(--color-chart-series-1)` 문자열이 소스에 그대로 있어야 스캔에 걸려
 * 배포 CSS 에 살아남는다. 인덱스로 문자열을 조립하면(`series-${i}`) 스캔이
 * 놓쳐서 **변수가 통째로 사라진다.** 반드시 완전한 문자열로 나열할 것.
 * ---------------------------------------------------------------------- */

/** 계열색 5종. 순서 고정 — 순환시키지 않는다(6번째 계열은 "기타"로 접는다) */
export const CHART_SERIES_COLORS = [
  "var(--color-chart-series-1)",
  "var(--color-chart-series-2)",
  "var(--color-chart-series-3)",
  "var(--color-chart-series-4)",
  "var(--color-chart-series-5)",
] as const;

/** area 면 채우기. series 와 같은 계열의 옅은 단계 */
export const CHART_FILL_COLORS = [
  "var(--color-chart-fill-1)",
  "var(--color-chart-fill-2)",
  "var(--color-chart-fill-3)",
  "var(--color-chart-fill-4)",
  "var(--color-chart-fill-5)",
] as const;

export interface ChartSeries {
  /** 데이터 객체의 키 */
  key: string;
  /** 범례·툴팁에 표시할 이름 */
  label: string;
}

export type ChartDatum = Record<string, string | number>;

/** 계열 인덱스 → 색. 5를 넘으면 되돌리지 않고 마지막 색에 고정한다(색 순환 금지) */
const seriesColor = (i: number) =>
  CHART_SERIES_COLORS[Math.min(i, CHART_SERIES_COLORS.length - 1)];
const fillColor = (i: number) =>
  CHART_FILL_COLORS[Math.min(i, CHART_FILL_COLORS.length - 1)];

/* -------------------------------------------------------------------------
 * 공통 축·그리드
 * ---------------------------------------------------------------------- */

/** 축 눈금: 텍스트는 항상 텍스트 토큰을 입는다 — 계열색을 글자에 쓰지 않는다 */
const tickStyle = {
  fill: "var(--color-text-sub)",
  fontSize: 12,
  fontFamily: "var(--font-base)",
} as const;

const AXIS_LINE = { stroke: "var(--color-divide)" } as const;

/* -------------------------------------------------------------------------
 * 툴팁 · 범례
 * ---------------------------------------------------------------------- */

interface TooltipEntry {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  /** 값 포맷터 (예: 원화, %) */
  format?: (value: number | string) => string;
}

/**
 * 차트 툴팁. 계열 키는 **10px 원형**, 항목 간 gap 8, padding 16 (실측 근거).
 * radius 는 참조값 2px 이 아니라 Clay `rounded-medium`(8) 을 쓴다.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-medium bg-surface p-4 shadow-popover outline-1 -outline-offset-1 outline-border">
      {label !== undefined && (
        <span className="body-small text-text-sub">{label}</span>
      )}
      <ul className="flex flex-col gap-2">
        {payload.map((entry, i) => (
          <li
            key={`${entry.dataKey ?? i}`}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="body-small text-text-sub">{entry.name}</span>
            <strong className="body-small-bold ml-auto text-text">
              {format && entry.value !== undefined
                ? format(entry.value)
                : entry.value}
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface ChartLegendProps {
  series: ChartSeries[];
  /** 계열별 색 오버라이드 (도넛처럼 조각마다 색이 다른 경우) */
  colors?: readonly string[];
  className?: string;
}

/**
 * 범례. **계열이 2개 이상이면 항상 노출한다** — 색만으로 식별하게 두지 않기 위해서다.
 * 스와치 16×16 + 간격 8 (실측 근거).
 */
export function ChartLegend({ series, colors, className }: ChartLegendProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-4", className)}>
      {series.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2">
          <span
            className="size-4 shrink-0 rounded-small"
            style={{ backgroundColor: colors?.[i] ?? seriesColor(i) }}
            aria-hidden
          />
          <span className="body-small text-text-sub">{s.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------
 * 프레임
 * ---------------------------------------------------------------------- */

export interface ChartFrameProps {
  /** 차트가 무엇을 보여주는지. 스크린리더가 읽는 이름이 된다 */
  ariaLabel: string;
  height?: number;
  children: ReactNode;
  className?: string;
}

/**
 * 차트 본체 래퍼. SVG 는 스크린리더에 내용이 전달되지 않으므로
 * `role="img"` + 이름을 부여하고, 표 대체 수단은 사용처가 제공한다.
 */
export function ChartFrame({
  ariaLabel,
  height = 240,
  children,
  className,
}: ChartFrameProps) {
  return (
    <div role="img" aria-label={ariaLabel} className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Line / Area
 * ---------------------------------------------------------------------- */

export interface LineChartProps {
  data: ChartDatum[];
  /** x축으로 쓸 키 */
  xKey: string;
  series: ChartSeries[];
  /** 면을 채운다(area). 단일 계열 추이에 쓴다 */
  area?: boolean;
  height?: number;
  ariaLabel: string;
  /** 축·툴팁 값 포맷터 */
  format?: (value: number | string) => string;
  /**
   * y축 시작점. 기본은 `zero`(0부터) — 지금까지의 동작이다.
   *
   * `fit` 은 축을 **데이터 범위에 맞춘다.** 값이 큰 수 주변에서 조금씩 움직이는 추이는
   * 0부터 그리면 선이 직선으로 보여 **변화가 통째로 사라진다**
   * (실측: 주별 주문 건수 392→420 은 0~600 축에서 7% 라 눈에 띄지 않는다).
   *
   * ⚠️ **막대에는 쓰지 않는다.** 막대는 길이 자체가 값을 뜻하므로 0 baseline 이 필수고,
   * 잘라내면 차이를 과장한다. 선은 위치로 값을 말하므로 그 제약이 없다.
   * 대신 `fit` 을 쓰면 **축 눈금을 반드시 읽게** 해야 한다 — 축 라벨을 숨기지 말 것.
   */
  yBaseline?: "zero" | "fit";
  className?: string;
}

/**
 * 추이(시간에 따른 변화). 선 두께 2 · 마커 지름 8 · 가로 격자선만.
 * 격자·축은 `divide` 로 눌러 데이터가 앞에 오게 한다.
 */
export function LineChart({
  data,
  xKey,
  series,
  area = false,
  height = 240,
  ariaLabel,
  format,
  yBaseline = "zero",
  className,
}: LineChartProps) {
  const Root = area ? RAreaChart : RLineChart;

  return (
    <ChartFrame ariaLabel={ariaLabel} height={height} className={className}>
      <Root data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          vertical={false}
          stroke="var(--color-divide)"
          strokeDasharray="0"
        />
        <XAxis
          dataKey={xKey}
          tick={tickStyle}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickMargin={8}
        />
        <YAxis
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={format}
          /* `fit` 이면 recharts 가 데이터 최소·최대에 맞춰 눈금을 다시 고른다 */
          domain={yBaseline === "fit" ? ["auto", "auto"] : [0, "auto"]}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          content={<ChartTooltip format={format} />}
        />
        {series.map((s, i) =>
          area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(i)}
              fill={fillColor(i)}
              strokeWidth={2}
              // 마커는 지름 8 이상 — 작은 점은 터치·클릭 대상이 되지 못한다
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "var(--color-surface)",
              }}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={seriesColor(i)}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 2,
                stroke: "var(--color-surface)",
              }}
            />
          ),
        )}
      </Root>
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------
 * Bar
 * ---------------------------------------------------------------------- */

export interface BarChartProps {
  data: ChartDatum[];
  xKey: string;
  series: ChartSeries[];
  /** 계열을 쌓는다 */
  stacked?: boolean;
  height?: number;
  ariaLabel: string;
  format?: (value: number | string) => string;
  className?: string;
}

/**
 * 크기 비교. 막대 끝만 4px 라운딩하고 **바닥은 기준선에 붙인다**
 * (양끝을 둥글리면 값이 기준선에서 떠 보인다).
 */
export function BarChart({
  data,
  xKey,
  series,
  stacked = false,
  height = 240,
  ariaLabel,
  format,
  className,
}: BarChartProps) {
  return (
    <ChartFrame ariaLabel={ariaLabel} height={height} className={className}>
      <RBarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-divide)" />
        <XAxis
          dataKey={xKey}
          tick={tickStyle}
          tickLine={false}
          axisLine={AXIS_LINE}
          tickMargin={8}
        />
        <YAxis
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={format}
        />
        <Tooltip
          cursor={{ fill: "var(--color-surface-sub)" }}
          content={<ChartTooltip format={format} />}
        />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={seriesColor(i)}
            stackId={stacked ? "stack" : undefined}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </RBarChart>
    </ChartFrame>
  );
}

/* -------------------------------------------------------------------------
 * Donut
 * ---------------------------------------------------------------------- */

export interface DonutChartProps {
  data: ChartDatum[];
  /** 조각 이름 키 */
  nameKey: string;
  /** 조각 값 키 */
  valueKey: string;
  height?: number;
  ariaLabel: string;
  format?: (value: number | string) => string;
  /** 도넛 가운데에 넣을 요약(합계 등) */
  center?: ReactNode;
  className?: string;
}

/**
 * 구성비. 조각 사이에 **표면색 2px 링**을 둘러 경계를 만든다
 * (인접 색이 맞닿으면 어느 쪽 색인지 읽기 어려워진다).
 */
export function DonutChart({
  data,
  nameKey,
  valueKey,
  height = 240,
  ariaLabel,
  format,
  center,
  className,
}: DonutChartProps) {
  return (
    <div className={cn("relative", className)}>
      <ChartFrame ariaLabel={ariaLabel} height={height}>
        <RPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius="62%"
            outerRadius="92%"
            stroke="var(--color-surface)"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((d, i) => (
              <Cell key={`${d[nameKey]}`} fill={seriesColor(i)} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip format={format} />} />
        </RPieChart>
      </ChartFrame>
      {center && (
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1"
          aria-hidden
        >
          {center}
        </div>
      )}
    </div>
  );
}
