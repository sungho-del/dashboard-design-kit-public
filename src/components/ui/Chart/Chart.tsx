import { useId, type ReactNode } from "react";
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
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../../lib/cn";
/*
  shadcn 원본 층. **키트가 감싸고 페이지는 이 파일만 쓴다** — 페이지가
  `src/shadcn` 을 직접 import 하면 Clay 규격(§28)을 우회하는 길이 열린다.
*/
import { ChartContainer, type ChartConfig } from "../../../shadcn/ui/chart";

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

/**
 * 같은 계열의 옅은 단계(100). **면 차트는 더 이상 이 색을 쓰지 않는다** — 계열색
 * 그라디언트로 바꿨다(아래 `AREA_OPACITY_TOP`). 배경 틴트 등 차트 밖 용도로 남겨 둔다.
 */
export const CHART_FILL_COLORS = [
  "var(--color-chart-fill-1)",
  "var(--color-chart-fill-2)",
  "var(--color-chart-fill-3)",
  "var(--color-chart-fill-4)",
  "var(--color-chart-fill-5)",
] as const;

/**
 * 순서(ordinal) 4단계 — 퍼널 · 등급 · 구간처럼 **순서를 바꾸면 뜻이 달라지는 것**.
 * 계열색(정체성)과 다른 일이라 따로 둔다. 규격: `DESIGN-dashboard.md` §D7-3
 *
 * **4단계가 상한이다** — 5단계 후보는 밝기차가 모자라 단계가 안 보였다.
 * 계열색과 같은 이유로 **완전한 문자열**로 나열한다(인덱스 조립 금지).
 */
export const CHART_ORDINAL_COLORS = [
  "var(--color-chart-ordinal-1)",
  "var(--color-chart-ordinal-2)",
  "var(--color-chart-ordinal-3)",
  "var(--color-chart-ordinal-4)",
] as const;

export interface ChartSeries {
  /** 데이터 객체의 키 */
  key: string;
  /** 범례·툴팁에 표시할 이름 */
  label: string;
}

export type ChartDatum = Record<string, string | number>;

/** 계열 인덱스 → 색. 5를 넘으면 되돌리지 않고 마지막 색에 고정한다(색 순환 금지) */
/* -------------------------------------------------------------------------
 * y축 폭 — 규격 48 을 **바닥**으로 두고 라벨이 길면 늘린다
 *
 * 예전엔 `width={48}` 고정이었다. 그랬더니 금액 단위가 붙는 한글 눈금
 * `10,000만`(7글자)에서 앞의 `1` 이 잘려 화면에 **`0,000만`** 으로 떴다.
 * 한글은 전각이라 48 에 들어가지 않는다.
 *
 * ## recharts 의 `width="auto"` 를 쓰지 않는 이유
 *
 * 그것은 **렌더 시점에 실측**하는 방식이라, 텍스트 측정이 없는 jsdom 에서
 * 플롯 영역이 0 이 되어 **차트가 통째로 안 그려진다**(테스트 7건이 그렇게 깨졌다).
 * 그래서 측정에 기대지 않고 **값으로 계산**한다 — 브라우저든 jsdom 이든 같은 결과.
 * ---------------------------------------------------------------------- */

/** recharts 가 고를 법한 "둥근" 상한. 9,240 → 10,000 */
function niceCeil(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 0;
  const base = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 7.5]) {
    if (v <= m * base) return m * base;
  }
  return 10 * base;
}

/** 12px Pretendard 근사 — 숫자 7 · 구분자 4 · 그 밖(한글·기호) 12 */
function textWidth(label: string): number {
  let w = 0;
  for (const ch of label) {
    if (ch >= "0" && ch <= "9") w += 7;
    else if (ch === "," || ch === "." || ch === " ") w += 4;
    else w += 12;
  }
  return w;
}

/**
 * 눈금 중 가장 긴 것이 들어갈 폭. 기본 48, 모자라면 늘린다.
 * 눈금 간격 8 을 더해 축선과 붙지 않게 한다.
 */
function yAxisWidth(
  data: ChartDatum[],
  series: ChartSeries[],
  format?: (value: number | string) => string,
): number {
  if (!format) return 48;
  let max = 0;
  for (const row of data) {
    for (const s of series) {
      const v = Number(row[s.key]);
      if (Number.isFinite(v) && v > max) max = v;
    }
  }
  return Math.max(48, textWidth(format(niceCeil(max))) + 8);
}

const seriesColor = (i: number) =>
  CHART_SERIES_COLORS[Math.min(i, CHART_SERIES_COLORS.length - 1)];

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
  /**
   * 계열 키 모양. 기본 `dot`(10px 원형 · §28-3).
   * `line` 은 면(area) 차트용 — 선의 색 띠라서 **면의 윤곽선**과 같은 모양으로 읽힌다.
   * (shadcn `ChartTooltipContent` 의 `indicator` 와 같은 뜻이다)
   */
  indicator?: "dot" | "line";
}

/**
 * 차트 툴팁. 계열 키는 **10px 원형**, 항목 간 gap 8, padding 16 (실측 근거).
 * radius 는 참조값 2px 이 아니라 Clay `rounded-medium`(8) 을 쓴다.
 *
 * ## shadcn `ChartTooltipContent` 를 그대로 쓰지 않는 이유
 * 그쪽은 `ChartContainer` 컨텍스트 **안에서만** 렌더되고(밖이면 throw), 포맷터가
 * **행 전체**를 갈아끼우는 구조다. 키트 툴팁은 단독으로도 렌더되고 `format` 이
 * **값만** 바꾼다 — 차트를 쓰는 화면 4곳이 이 계약에 기댄다. 그래서 모양(`indicator`)과
 * 값 정렬(`tabular-nums`)만 그쪽 패턴을 가져왔다.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  indicator = "dot",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="flex min-w-40 flex-col gap-2 rounded-medium bg-surface p-4 shadow-popover outline-1 -outline-offset-1 outline-border">
      {label !== undefined && (
        <span className="body-small text-text-sub">{label}</span>
      )}
      <ul className="flex flex-col gap-2">
        {payload.map((entry, i) => (
          <li
            key={`${entry.dataKey ?? i}`}
            className={cn(
              "flex gap-2 whitespace-nowrap",
              indicator === "dot" ? "items-center" : "items-stretch",
            )}
          >
            <span
              className={cn(
                "shrink-0 rounded-full",
                indicator === "dot" ? "size-2.5" : "w-1",
              )}
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="body-small text-text-sub">{entry.name}</span>
            {/*
              값은 **등폭**이다(§D6-2) — 커서를 옮기면 값이 바뀌는데, 비례폭이면
              자릿수마다 폭이 달라 패널이 좌우로 흔들린다. 좌측 여백 16 은
              이름과 값이 붙어 한 단어로 읽히지 않게 하는 최소 간격이다.
            */}
            <strong className="body-small-bold ml-auto pl-4 text-text tabular-nums">
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
  /**
   * 계열 키 → **이미 포맷된** 값(기간 합계 등). 주면 라벨 옆에 굵게 붙는다.
   * shadcn `chart-bar-interactive` 의 헤더 패턴 — 범례가 "무엇"과 "얼마"를 함께 말한다.
   */
  values?: Readonly<Record<string, string>>;
  /** 숨긴 계열 키 — `onToggle` 과 짝. 차트의 `hiddenKeys` 에도 **같은 배열**을 넘긴다 */
  hiddenKeys?: readonly string[];
  /**
   * 주면 항목이 **토글 버튼**이 된다(`aria-pressed` = 보이는 중).
   * **마지막 하나는 끌 수 없다**(`disabled`) — 전부 끄면 빈 축만 남아 "데이터 없음"처럼 읽힌다.
   */
  onToggle?: (key: string) => void;
}

/**
 * 범례. **계열이 2개 이상이면 항상 노출한다** — 색만으로 식별하게 두지 않기 위해서다.
 * 스와치 16×16 + 간격 8 (실측 근거).
 *
 * ## 토글 모드 (`onToggle`)
 * 항목이 높이 32 칩 버튼이 된다. 숨긴 계열은 스와치가 **속 빈 테두리**가 되고 글자가
 * `text-disabled` 로 물러난다 — 색만이 아니라 **모양**(채움 ↔ 테두리)으로도 상태를 말한다.
 * 숨겨도 계열의 **색은 바뀌지 않는다** — 차트는 `hiddenKeys` 로 숨길 뿐 계열 순서를 유지한다
 * (`series` 를 걸러서 넘기면 남은 계열이 앞 색으로 당겨진다 · `DESIGN-dashboard.md` §D12).
 */
export function ChartLegend({
  series,
  colors,
  className,
  values,
  hiddenKeys,
  onToggle,
}: ChartLegendProps) {
  const colorAt = (i: number) => colors?.[i] ?? seriesColor(i);

  if (!onToggle) {
    return (
      <ul className={cn("flex flex-wrap items-center gap-4", className)}>
        {series.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className="size-4 shrink-0 rounded-small"
              style={{ backgroundColor: colorAt(i) }}
              aria-hidden
            />
            <span className="body-small text-text-sub">{s.label}</span>
            {values?.[s.key] !== undefined ? (
              <span className="body-small-bold text-text tabular-nums">
                {values[s.key]}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  const visibleCount = series.filter(
    (s) => !hiddenKeys?.includes(s.key),
  ).length;

  return (
    /* 칩 사이 8 — 버튼 경계가 이미 항목을 가르므로 텍스트 범례(16)보다 좁힌다 */
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {series.map((s, i) => {
        const visible = !hiddenKeys?.includes(s.key);
        const color = colorAt(i);
        return (
          <li key={s.key}>
            <button
              type="button"
              aria-pressed={visible}
              /*
                라벨과 값이 다른 요소라 그대로 두면 "주문 수1,284건" 으로 이어 읽힌다 —
                읽을 문장을 직접 준다 (`DESIGN-dashboard.md` §D4-2 와 같은 이유)
              */
              aria-label={
                values?.[s.key] !== undefined
                  ? `${s.label} ${values[s.key]}`
                  : s.label
              }
              disabled={visible && visibleCount === 1}
              onClick={() => onToggle(s.key)}
              className="flex h-8 cursor-pointer items-center gap-2 rounded-medium px-3 outline-1 -outline-offset-1 outline-border transition-colors duration-100 ease-out hover:bg-surface-sub focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus disabled:cursor-default disabled:hover:bg-transparent"
            >
              <span
                className="size-4 shrink-0 rounded-small"
                /*
                  숨김 = 속 빈 테두리. inset 그림자로 그려 크기가 변하지 않게 한다
                  (outline/border 를 켜고 끄면 스와치가 커 보이거나 밀린다).
                */
                style={
                  visible
                    ? { backgroundColor: color }
                    : { boxShadow: `inset 0 0 0 2px ${color}` }
                }
                aria-hidden
              />
              <span
                className={cn(
                  "body-small",
                  visible ? "text-text-sub" : "text-text-disabled",
                )}
              >
                {s.label}
              </span>
              {values?.[s.key] !== undefined ? (
                <span
                  className={cn(
                    "body-small-bold tabular-nums",
                    visible ? "text-text" : "text-text-disabled",
                  )}
                >
                  {values[s.key]}
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------
 * 프레임
 * ---------------------------------------------------------------------- */

/**
 * 차트 높이. 숫자면 그 px 고정.
 *
 * `"fill"` 은 **부모(세로 flex)에 남는 높이를 전부 차지한다** — 최소 240(§28-2 기본 높이).
 * 큰 모니터에서 화면 아래가 비는 대시보드가 남는 높이를 차트로 흡수하게 하는 값이다.
 * 부모가 세로 flex 이고 **높이가 정해져 있어야** 늘어난다(카드의 `CardBody` 에 `flex-1`).
 * 안쪽은 `absolute inset-0` 으로 채운다 — 퍼센트 높이는 조상 중 하나라도 높이가
 * 정해지지 않으면 0 이 되지만, 절대 위치는 그 상자의 실제 크기를 따른다.
 */
export type ChartHeight = number | "fill";

export interface ChartFrameProps {
  /** 차트가 무엇을 보여주는지. 스크린리더가 읽는 이름이 된다 */
  ariaLabel: string;
  height?: ChartHeight;
  children: ReactNode;
  className?: string;
  /**
   * shadcn `ChartConfig` — 계열 키 → 라벨·아이콘. **색은 넣지 않는다.**
   *
   * 색을 넣으면 `ChartContainer` 가 `--color-<키>` 변수를 만드는데, 그 이름 공간이
   * Clay 토큰과 같아 키가 `border`·`text` 면 차트 안에서 토큰을 덮어쓴다.
   * 키트 차트는 색을 `CHART_SERIES_COLORS[i]` 로 직접 준다.
   */
  config?: ChartConfig;
}

const EMPTY_CONFIG: ChartConfig = {};

/**
 * 차트 본체 래퍼. SVG 는 스크린리더에 내용이 전달되지 않으므로
 * `role="img"` + 이름을 부여하고, 표 대체 수단은 사용처가 제공한다.
 *
 * ## 안쪽은 shadcn `ChartContainer` 다
 * 크기 감지(`ResponsiveContainer`)에 더해 recharts 내부 요소를 다듬는다 —
 * 특히 **클릭하면 SVG 전체에 브라우저 포커스 테두리가 그려지던 것**(recharts 3 의
 * `accessibilityLayer` 가 surface 에 tabindex 를 준다)을 지운다. 이름·역할은
 * 바깥 `role="img"` 가 들고 있으므로 안쪽 포커스 표시는 정보가 없다.
 * 높이는 컨테이너에 준다 — 안쪽 `ResponsiveContainer` 는 그 100% 를 채운다.
 */
export function ChartFrame({
  ariaLabel,
  height = 240,
  children,
  className,
  config = EMPTY_CONFIG,
}: ChartFrameProps) {
  const fill = height === "fill";
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      className={cn(
        fill ? "relative min-h-60 w-full flex-1" : "w-full",
        className,
      )}
    >
      <ChartContainer
        config={config}
        className={fill ? "absolute inset-0 aspect-auto" : "aspect-auto w-full"}
        style={fill ? undefined : { height }}
      >
        {children as React.ReactElement}
      </ChartContainer>
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
  /** 숫자(px) 또는 `"fill"`(부모에 남는 높이 · 최소 240). `ChartHeight` 참조 */
  height?: ChartHeight;
  /**
   * 숨길 계열 키. **`series` 를 걸러서 넘기지 말고 이것을 쓴다** — 걸러 넘기면 남은 계열이
   * 인덱스가 당겨져 **색이 바뀐다**(렌트를 끄면 판매가 파랑이 된다). 여기서는 계열을 그대로 두고
   * recharts `hide` 로 감출 뿐이라 색이 대상에 붙어 있다(§D12 "색을 순위에 배정하지 말 것").
   */
  hiddenKeys?: readonly string[];
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
  /**
   * x축 **눈금 글자만** 바꾼다(`2026.10.15` → `10.15`). 툴팁 제목은 `xKey` 의 원래 값 그대로다 —
   * 짧은 라벨을 데이터에 넣으면 툴팁까지 연도를 잃는다. 기본: 원래 값
   */
  xTickFormat?: (value: string | number) => string;
  /**
   * x축 눈금을 **N칸마다 하나** 둔다. **마지막 점에서 거꾸로** 센다 — 기간의 끝(오늘)이
   * 항상 눈금에 남는다. 기본: recharts 자동 간격
   */
  xTickEvery?: number;
  /** y축 눈금을 정수로만 — 건수처럼 소수가 뜻이 없는 값. 기본 false */
  integerTicks?: boolean;
  /**
   * **보이는 계열의 최댓값 한 점**에만 값 라벨을 붙인다(모든 점 라벨 금지 — §28-5).
   * 동률이면 앞 날짜 → 앞 계열. 전부 0 이면 붙이지 않는다. 숨긴 계열은 후보가 아니다. 기본 false
   */
  markMax?: boolean;
  className?: string;
}

/** 최댓값 한 점 — 행 순서(시간) 우선, 같은 행이면 계열 순서. 0 이하는 표시할 것이 없다 */
function maxPointOf(
  data: ChartDatum[],
  series: ChartSeries[],
  hiddenKeys?: readonly string[],
): { index: number; key: string; value: number } | null {
  let best: { index: number; key: string; value: number } | null = null;
  for (let index = 0; index < data.length; index++) {
    for (const s of series) {
      if (hiddenKeys?.includes(s.key)) continue;
      const value = Number(data[index][s.key]);
      // 엄격히 클 때만 바꾼다 — 그래야 동률은 앞의 것(이른 날짜 · 앞 계열)이 남는다
      if (Number.isFinite(value) && value > (best?.value ?? 0)) {
        best = { index, key: s.key, value };
      }
    }
  }
  return best;
}

/** `xTickEvery` → 실제 눈금 값. 끝에서 거꾸로 N칸마다 */
function tickValuesOf(data: ChartDatum[], xKey: string, every: number) {
  const last = data.length - 1;
  return data
    .filter((_, i) => (last - i) % every === 0)
    .map((row) => row[xKey]);
}

interface MaxLabelProps {
  viewBox?: { x?: number; y?: number };
  text: string;
  anchor: "start" | "middle" | "end";
}

/**
 * 최댓값 라벨. 글자색은 **텍스트 토큰**이다(계열색을 글자에 쓰지 않는다 — §28-4).
 * 양 끝 점에서는 글자를 안쪽으로 붙여 차트 밖으로 잘리지 않게 한다.
 */
function MaxLabel({ viewBox, text, anchor }: MaxLabelProps) {
  if (viewBox?.x === undefined || viewBox.y === undefined) return null;
  return (
    <text
      data-max-label
      x={viewBox.x}
      y={viewBox.y - 10}
      textAnchor={anchor}
      fill="var(--color-text)"
      fontSize={12}
      fontWeight={600}
      fontFamily="var(--font-base)"
    >
      {text}
    </text>
  );
}

/**
 * 면 그라디언트의 불투명도 — 위 24% → 아래 0%.
 *
 * 면은 **장식이고 값은 선이 말한다.** 그래서 윤곽선(계열색 · 명암비 3:1 통과)은
 * 그대로 두고, 면만 아래로 갈수록 사라지게 한다. 계열 2개가 겹쳐도 24% 끼리
 * 섞일 뿐이라 앞 계열의 선이 가려지지 않는다 — 불투명한 단색 `chart-fill` 이면
 * SVG 는 나중에 그린 것이 위에 오므로 **뒤 계열의 면이 앞 계열의 선을 덮는다.**
 */
const AREA_OPACITY_TOP = 0.24;

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
  hiddenKeys,
  ariaLabel,
  format,
  yBaseline = "zero",
  xTickFormat,
  xTickEvery,
  integerTicks = false,
  markMax = false,
  className,
}: LineChartProps) {
  const Root = area ? RAreaChart : RLineChart;
  const max = markMax ? maxPointOf(data, series, hiddenKeys) : null;
  /* 양 끝 15% 안의 점이면 글자를 안쪽으로 — 가운데 정렬로 두면 절반이 차트 밖으로 나간다 */
  const maxAnchor = (index: number): MaxLabelProps["anchor"] => {
    const at = data.length > 1 ? index / (data.length - 1) : 0.5;
    return at < 0.15 ? "start" : at > 0.85 ? "end" : "middle";
  };
  /*
    그라디언트 id 는 **차트마다 달라야 한다.** SVG `<defs>` 의 id 는 문서 전역이라
    한 화면에 면 차트가 둘이면(건수·금액) 뒤 것이 앞 것의 그라디언트를 가져다 쓴다.
    `useId` 의 `:` 는 `url(#…)` 참조를 깨뜨리므로 걷어낸다.
  */
  const gradientId = `area-${useId().replace(/:/g, "")}`;

  return (
    <ChartFrame ariaLabel={ariaLabel} height={height} className={className}>
      <Root
        data={data}
        /*
          최댓값 라벨이 축 상한에 닿아도 잘리지 않게 위 여백을 늘린다.
          눈금을 직접 고르면(`xTickEvery`) 마지막 점에 눈금 글자가 걸려 가운데 정렬로 절반이
          밖으로 나간다 — 오른쪽 여백을 글자 반폭만큼 둔다.
        */
        margin={{
          top: markMax ? 24 : 8,
          right: xTickEvery ? 24 : 8,
          bottom: 0,
          left: 0,
        }}
      >
        {area ? (
          <defs>
            {series.map((s, i) => (
              <linearGradient
                key={s.key}
                id={`${gradientId}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={seriesColor(i)}
                  stopOpacity={AREA_OPACITY_TOP}
                />
                <stop
                  offset="100%"
                  stopColor={seriesColor(i)}
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
        ) : null}
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
          tickFormatter={xTickFormat}
          /* 눈금을 직접 고르면 recharts 가 다시 솎지 않게 `interval={0}` 으로 전부 그린다 */
          {...(xTickEvery
            ? { ticks: tickValuesOf(data, xKey, xTickEvery), interval: 0 }
            : {})}
        />
        <YAxis
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          width={yAxisWidth(data, series, format)}
          tickFormatter={format}
          allowDecimals={!integerTicks}
          /* `fit` 이면 recharts 가 데이터 최소·최대에 맞춰 눈금을 다시 고른다 */
          domain={yBaseline === "fit" ? ["auto", "auto"] : [0, "auto"]}
        />
        <Tooltip
          cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          content={
            <ChartTooltip format={format} indicator={area ? "line" : "dot"} />
          }
        />
        {series.map((s, i) =>
          area ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              hide={hiddenKeys?.includes(s.key)}
              stroke={seriesColor(i)}
              fill={`url(#${gradientId}-${i})`}
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
              hide={hiddenKeys?.includes(s.key)}
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
        {max ? (
          <ReferenceDot
            x={data[max.index][xKey]}
            y={max.value}
            r={0}
            label={
              <MaxLabel
                text={format ? format(max.value) : String(max.value)}
                anchor={maxAnchor(max.index)}
              />
            }
          />
        ) : null}
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
          width={yAxisWidth(data, series, format)}
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
