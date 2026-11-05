import { Fragment, useState, type ReactNode } from "react";
import { ArrowUpRight, ChartArea, ChevronRight } from "lucide-react";
import {
  AppShell,
  Card,
  CardBody,
  CardHeader,
  ChartLegend,
  EmptyState,
  Gnb,
  LineChart,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatTile,
} from "../../components/ui";
import { cn } from "../../lib/cn";
import {
  asStatus,
  dimWhile,
  isBusy,
  type DataStatus,
} from "../../lib/dataStatus";
import { useSearchParams } from "../../lib/router";
import {
  asPeriod,
  count,
  COUNT_NOTE,
  DEFAULT_PERIOD,
  METRIC_GROUPS,
  num,
  orderCountSeriesTotals,
  orderCountTotals,
  ORDER_COUNT_TREND,
  ORDERS_NAV_ID,
  PERIODS,
  periodRangeText,
  RENT_FUNNEL,
  REVENUE_NOTE,
  revenueSeriesTotals,
  revenueTotals,
  REVENUE_TREND,
  SALE_FUNNEL,
  shortDay,
  TICK_EVERY,
  TREND_SERIES,
  won,
  type FunnelStep,
  type PeriodValue,
} from "./DashboardPage.data";
import { APP_CHROME, GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 통계형
 *
 * ## 배치 = 지표 3그룹 → 차트 → 흐름 (2026-09-18 결정 · 2026-11-03 원본 2단을 되돌림)
 *
 * ```
 * 회원 지표 | 셀러 지표 | 매출 지표         ← 1행 3열. 카드 안은 "라벨 ··· 값 단위" 3행
 * 총 매출 현황(건수) | 총 매출 현황(금액) ← 1행 2열. **남는 세로 공간을 이 줄이 흡수한다**
 * 렌트 관리 | 판매 관리                  ← 상태 흐름, 1행 2열 (각 4단계)
 * ```
 * - **차트 2장을 붙였다** — 원본은 두 차트 사이에 흐름을 끼우는데, 그러면 같은 것을 두 단위로 보는
 *   한 쌍(건수/금액)이 갈라진다.
 * - **지표 3그룹을 한 줄에** — 그룹이 열, 항목이 행이라 세 수치가 한 세로줄에 선다.
 * - 원본 v0.4 2단(지표 9장 + 흐름 / 차트 2장)을 2026-11-03 에 적용했다가 사용자가 되돌렸다
 *   (「레이아웃은 기존으로」). 차트(일별 · 결제 기준 · 원 단위 · 최댓값 라벨)와 샘플 계산 숫자는 그대로다.
 *
 * ## 원본과 다르게 둔 것 (전부 결정됨)
 * - **차트 2계열(렌트·판매) + 토글 칩 + 기간 합계** — 원본은 전사 단일 계열·합계 없음.
 *   사용자 결정(2026-09-18, 2026-11-03 유지). 렌트와 판매는 한 번에 결제되지 않아 건수 칩 합 = 합계(디자인 §3 #19)
 * - 타일·흐름·차트의 모양은 Clay 부품(카드 · `StatTile` · `LineChart` · `SegmentedControl`)
 * - 거래액 라벨 「셀러 거래액(판매가)」 — 판정 Q1 · Q10 · 디자인 §1
 *
 * ## 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * 타일의 아이콘 · 증감(±%) · 비교 기준 문구 · 「회원 목록」 버튼 ·
 * 흐름의 중요도 등급 · 「처리 대기」 합계 · 경보 배너 · 단계 아래 비중 막대(사용자 판단).
 *
 * ## 데이터 상태 — 실 API 를 붙이면 `status` 를 fetch 상태로 바꾼다 (§D8)
 *
 * | status       | 처리                                                               |
 * | ------------ | ------------------------------------------------------------------ |
 * | `ready`      | 그대로. **0 도 값이다** — 0건·0원 기간을 빈 상태로 바꾸지 않는다  |
 * | `loading`    | 제목은 **실제 글자**, 변하는 것만 스켈레톤 — 크기가 같아 화면이 안 튄다 |
 * | `empty`      | 차트 자리에 「표시할 기간 데이터가 없습니다.」(데이터 집합 자체가 없을 때) |
 * | `refreshing` | 스켈레톤으로 되돌리지 않는다 — **이전 값을 흐리게** 두고 `aria-busy` |
 *
 * 지금은 API 가 없으므로 **주소로 미리 본다**: `/?preview=loading` · `empty` · `refreshing`.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./DashboardPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                                    |
 * | --------------------- | ------------------------------------------------------- |
 * | 지표 9장(3그룹)       | `METRIC_GROUPS`                                         |
 * | 차트 데이터·계열      | `ORDER_COUNT_TREND` · `REVENUE_TREND` · `TREND_SERIES`  |
 * | 기간·계열 합계        | `*Totals` · `*SeriesTotals` (**뼈대가 세지 않는다**)    |
 * | 축 눈금 간격·날짜     | `TICK_EVERY` · `shortDay` · `periodRangeText`           |
 * | 흐름 단계·건수        | `RENT_FUNNEL` · `SALE_FUNNEL`                           |
 * | 기간 기본값           | `DEFAULT_PERIOD` (**뼈대에 박지 않는다**)               |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * 위 배치 순서 · **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 · 지표는 **갈 수 있는 항목에만** 화살표 ·
 * 단계를 chevron 으로 잇는 가로 체인 · 기간 세그먼트가 그 차트의 데이터만 바꾸는 흐름 ·
 * 계열이 2개 이상이면 범례 필수 · 차트는 흰 면 위(§D7-9)
 * ====================================================================== */

export interface BabycubeDashboardPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

/**
 * 흐름 단계 → 주문 목록 링크. `stat` 이 유형(렌트/판매), `flow` 가 단계다 —
 * 주문 목록 `filtersFromQuery` 가 이 이름으로 읽는다(원본 `dashFlow` 와 같은 뜻).
 */
const ordersHref = (kind: "렌트" | "판매", step: string) =>
  `${ORDERS_NAV_ID}?${new URLSearchParams({ stat: kind, flow: step })}`;

/** 행 상자 — `StatTile plain` 과 같은 층(회색 면 · radius 8). 로딩 자리도 같은 상자를 쓴다 */
const ROW_BOX =
  "flex w-full items-center gap-3 rounded-medium bg-surface-sub px-4 py-3 text-left";

/**
 * 지표 한 행 — "라벨 ··· 값 단위 →".
 *
 * ## 왜 `StatTile` 이 아니라 행인가
 * `StatTile` 은 라벨을 좌상단, 수치를 우하단에 둔다(§D3). 그룹이 **열**이 되면서
 * 항목은 세로로 쌓이는데, 그 배치로 쌓으면 상자 하나가 112px 이라 지표 영역 높이가
 * 줄지 않는다. 행으로 두면 56px 이고, **세 수치가 오른쪽 한 세로줄에 서서** 그룹 안
 * 비교가 된다. 모양은 `StatTile plain` 과 같은 층(회색 상자 · `metric-small` · 값/단위 분리)을 쓴다.
 *
 * ## 좁으면 두 줄로 접힌다 — 컨테이너 쿼리
 * 1440px 에서 카드 안쪽이 약 315px 인데 `셀러 거래액(판매가)` + 억 단위 금액(`824,000,000원`)은
 * 한 줄에 들어가지 않는다. 뷰포트가 아니라 **목록 자신의 폭**(`@container`)으로 갈라
 * 22rem(352px) 이상일 때만 한 줄로 편다 — 열 수가 바뀌어도 이 판단은 그대로 맞는다.
 *
 * ## 화살표 자리는 **모든 행에** 비워 둔다
 * 갈 수 있는 행에만 화살표 폭(16)을 주면 그 행의 수치만 16px 왼쪽으로 밀려
 * **세로줄이 깨진다.** 갈 곳이 없는 행은 같은 폭의 빈 칸을 둔다(아이콘 없음 — 테스트가 센다).
 */
function MetricRow({
  label,
  value,
  unit,
  status,
  onOpen,
  openLabel,
}: {
  label: string;
  value: string;
  unit: string;
  status: DataStatus;
  onOpen?: () => void;
  openLabel: string;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1 @min-[22rem]:flex-row @min-[22rem]:items-baseline @min-[22rem]:justify-between @min-[22rem]:gap-3">
        <span className="body-medium break-keep text-text-sub">{label}</span>
        {/* 값은 비례폭이다 — 큰 글자에 등폭을 주면 `128` 이 헐거워 보인다 (§D6-2) */}
        {/* 갱신 중에는 값 묶음만 흐린다 — 라벨은 그대로(§D8) */}
        <span
          className={cn("flex shrink-0 items-baseline gap-1", dimWhile(status))}
        >
          <strong className="metric-small text-text">{value}</strong>
          <span className="body-medium text-text-sub">{unit}</span>
        </span>
      </span>
      {onOpen ? (
        <ArrowUpRight
          size={16}
          strokeWidth={1.2}
          aria-hidden
          className="shrink-0 text-icon-sub transition-colors duration-100 group-hover:text-icon"
        />
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}
    </>
  );

  if (!onOpen) {
    return <div className={ROW_BOX}>{body}</div>;
  }

  /*
    갈 곳이 있을 때만 버튼이 된다(§D3-5). hover 는 면, focus 는 테두리 —
    `StatTile` 의 PRESSABLE 과 같은 규칙이다. `w-full` 은 버튼이 부모를 채우게 하는 필수값.
  */
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={openLabel}
      className={cn(
        ROW_BOX,
        "group cursor-pointer transition-colors duration-100 ease-out hover:bg-surface-slate-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
      )}
    >
      {body}
    </button>
  );
}

/**
 * 지표 행의 로딩 자리. **실제 행과 높이가 같다**(py-3 + `metric-small` 줄높이 32 = 56) —
 * 라벨은 **실제 글자**(안 바뀐다 · §D8-1), 값만 스켈레톤이다.
 */
function MetricRowSkeleton({ label }: { label: string }) {
  return (
    <div className={ROW_BOX}>
      <span className="flex min-w-0 flex-1">
        <span className="body-medium break-keep text-text-sub">{label}</span>
      </span>
      <span className="metric-small ml-auto w-28">
        <Skeleton />
      </span>
      <span className="size-4 shrink-0" aria-hidden />
    </div>
  );
}

/**
 * 지표 그룹 한 장 (원본 `dstat-grid`). 3열 중 한 칸이다.
 *
 * ## 왜 타일마다 카드를 세우지 않는가
 * 9장이 전부 독립 **카드**였을 때 "회원 지표"라는 제목이 붙어 있어도 묶여 보이지 않았다 —
 * 카드 경계 9개가 그룹 경계 3개보다 세서 그룹핑이 시각적으로 지고 있었다.
 *
 * 지금은 층이 둘이다: **흰 카드 = 그룹, 연한 그레이 상자 = 항목.**
 * 면(fill)으로 항목을 가르면 경계선이 하나도 늘지 않아 그룹이 계속 이긴다.
 */
function MetricGroupCard({
  group,
  status,
  onNavSelect,
}: {
  group: (typeof METRIC_GROUPS)[number];
  status: DataStatus;
  onNavSelect: (path: string) => void;
}) {
  return (
    <Card variant="soft" aria-busy={isBusy(status)}>
      <CardHeader title={group.title} />
      <CardBody>
        {/*
          간격 8 — **카드 안 항목 묶음**이다(카드 사이 24 와 다른 축).
          행은 타일보다 낮아서 12 를 주면 행 사이가 행 높이의 20% 가 되어
          목록이 아니라 따로 떨어진 상자로 읽힌다.
        */}
        <ul className="@container flex flex-col gap-2">
          {group.metrics.map((metric) => {
            if (status === "loading") {
              return (
                <li key={metric.label}>
                  <MetricRowSkeleton label={metric.label} />
                </li>
              );
            }
            /* 원본의 `go` 가 있는 타일만 눌린다 — 이번 달 가입자·오늘 가입자는
               그날치 집계라 대응하는 목록 화면이 없다 */
            const navId = "navId" in metric ? metric.navId : undefined;
            return (
              <li key={metric.label}>
                <MetricRow
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
                  status={status}
                  onOpen={navId ? () => onNavSelect(navId) : undefined}
                  openLabel={`${metric.label} ${metric.value}${metric.unit} 목록 열기`}
                />
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}

/**
 * 상태 흐름 한 장 (원본 `dflow`). **도메인을 모른다** — 단계 배열과 제목만 받는다.
 * 단계는 `StatTile compact` — 지표와 같은 「무엇이 몇 개인가」라 같은 상자 문법을 쓴다.
 *
 * ## `<ol>` 이 아니라 `role="list"` 인 이유
 * 화살표를 **칸 밖**에 두어야 상자 4개의 폭이 같고 화살표가 두 상자 딱 중간에 온다.
 * `<ol>` 안에는 `<li>` 만 올 수 있어 화살표를 형제로 둘 수 없다.
 */
function FlowCard({
  title,
  steps,
  status,
  onStepSelect,
}: {
  title: string;
  steps: FunnelStep[];
  status: DataStatus;
  onStepSelect: (step: FunnelStep) => void;
}) {
  return (
    <Card variant="soft" aria-busy={isBusy(status)}>
      <CardHeader title={title} />
      <CardBody className={dimWhile(status)}>
        <div role="list" className="flex items-stretch">
          {steps.map((step, index) => (
            <Fragment key={step.value}>
              {index > 0 ? (
                /*
                  원본 `›` 글리프 대신 lucide 아이콘 — 이 저장소의 기호는 전부 lucide 라 혼자 폰트
                  글자면 굵기·정렬이 어긋난다. ⚠️ `strokeWidth` 1.2 고정(Clay 규격) — 크기로 굵기를 낸다.
                */
                <ChevronRight
                  aria-hidden
                  size={24}
                  strokeWidth={1.2}
                  className="mx-2 shrink-0 self-center text-icon-sub"
                />
              ) : null}
              <div role="listitem" className="min-w-0 flex-1">
                {status === "loading" ? (
                  /* `StatTile compact` 의 최소 높이(96)와 같은 자리 — 로딩이 끝나도 안 튄다 */
                  <Skeleton shape="block" className="h-24 w-full" />
                ) : (
                  <StatTile
                    compact
                    denseLabel
                    label={step.label}
                    value={num(step.count)}
                    unit="건"
                    onOpen={() => onStepSelect(step)}
                    openLabel={`${title} ${step.label} ${count(step.count)} 목록 열기`}
                  />
                )}
              </div>
            </Fragment>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * 총 매출 현황 차트 카드 (원본 `dchart`). 건수·금액 두 장이 같은 모양이라 하나로 묶는다.
 * 기간 세그먼트는 카드마다 독립이다 — 원본도 차트마다 `DASH_PERIOD[cid]` 를 갖는다.
 *
 * ## 헤더 아래 = 기간 합계 · 계열 칩 · 한 줄 설명
 * 합계는 라벨(작게) + 값(`metric-small`) + 단위(작게) — 타일과 같은 「숫자를 읽는 방식」이다.
 * 칩은 **범례이자 토글**이다 — 차트에는 `series` 를 걸러 넘기지 않고 `hiddenKeys` 를 준다
 * (걸러 넘기면 판매가 렌트의 파랑으로 당겨진다 · §D12). 마지막 하나는 끌 수 없다.
 * 합계는 숨김과 상관없이 전체다. 무엇을 셌는지는 `note` 가 말한다.
 *
 * ## 차트
 * 일별 7/30/90점 · 0 기준 축 · 눈금은 `10.15`(툴팁은 연도 포함) · 끝에서 N일마다 ·
 * **보이는 계열의 최댓값 한 점에만 값 라벨**(원본 `.dc-max`, annotations 정책).
 * 카드가 줄 높이만큼 늘어나면 차트(`height="fill"`, 최소 240)가 그 높이를 흡수한다.
 */
function TrendChartCard({
  title,
  measure,
  period,
  onPeriodChange,
  total,
  seriesValues,
  note,
  status,
  data,
  format,
  integerTicks = false,
  className,
}: {
  title: string;
  /** 접근 설명에 들어갈 「무엇을」 — `결제 건수` */
  measure: string;
  period: PeriodValue;
  onPeriodChange: (value: string) => void;
  /** 기간 합계 — 뼈대가 세지 않고 데이터의 파생값을 받는다. **값과 단위를 나눠** 받는다 */
  total: { value: string; unit: string };
  /** 계열 키 → 이미 포맷된 계열 합계. 칩에 그대로 붙는다 */
  seriesValues: Record<string, string>;
  /** 칩 아래 한 줄 — 무엇을 셌는지 */
  note: string;
  status: DataStatus;
  data: Record<string, string | number>[];
  /** `LineChart` 의 `format` 과 **같은 시그니처**여야 한다 */
  format: (value: string | number) => string;
  integerTicks?: boolean;
  className?: string;
}) {
  const [hidden, setHidden] = useState<string[]>([]);
  const toggle = (key: string) =>
    setHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  let body: ReactNode;
  if (status === "loading") {
    body = (
      <>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            {/* 고정 문구는 스켈레톤으로 만들지 않는다 — 어차피 안 바뀐다(§D8-1) */}
            <span className="body-small text-text-sub">선택한 기간 합계</span>
            <span className="metric-small w-32">
              <Skeleton />
            </span>
          </div>
          <Skeleton shape="block" className="h-8 w-60" />
        </div>
        <Skeleton shape="block" className="min-h-60 w-full flex-1" />
      </>
    );
  } else if (status === "empty") {
    body = (
      /*
        데이터 집합 자체가 없을 때만 — 0건·0원인 기간은 이것이 아니라 0 선이다.
        빈 것은 에러가 아니다(§D8-2) — 기간 세그먼트는 헤더에 살아 있다.
      */
      <EmptyState
        size="section"
        className="flex-1"
        icon={<ChartArea strokeWidth={1.2} aria-hidden />}
        title="표시할 기간 데이터가 없습니다."
      />
    );
  } else {
    body = (
      <>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="flex flex-col gap-1">
              <span className="body-small text-text-sub">선택한 기간 합계</span>
              <span className="flex items-baseline gap-1">
                <strong className="metric-small text-text">
                  {total.value}
                </strong>
                <span className="body-medium text-text-sub">{total.unit}</span>
              </span>
            </div>
            {/* 계열이 2개 이상이면 범례를 항상 둔다 — 이 칩들이 범례다 */}
            <ChartLegend
              series={TREND_SERIES}
              values={seriesValues}
              hiddenKeys={hidden}
              onToggle={toggle}
            />
          </div>
          <p className="body-small break-keep text-text-sub">{note}</p>
        </div>
        <LineChart
          area
          ariaLabel={`${title} — ${periodRangeText(period)} 일별 ${measure}. 렌트와 판매 비교`}
          data={data}
          xKey="label"
          series={TREND_SERIES}
          hiddenKeys={hidden}
          format={format}
          height="fill"
          markMax
          xTickFormat={shortDay}
          xTickEvery={TICK_EVERY[period]}
          integerTicks={integerTicks}
        />
      </>
    );
  }

  return (
    <Card variant="soft" aria-busy={isBusy(status)} className={className}>
      <CardHeader
        title={title}
        action={
          <SegmentedControl
            items={PERIODS}
            value={period}
            onValueChange={onPeriodChange}
          />
        }
      />
      <CardBody className={cn("flex-1", dimWhile(status))}>{body}</CardBody>
    </Card>
  );
}

/** 계열 합계 → 칩 문자열. 계열 키는 `TREND_SERIES` 가 정한다 — 뼈대는 키 이름을 모른다 */
const seriesValuesOf = (
  totals: Record<string, number>,
  format: (value: number) => string,
) =>
  Object.fromEntries(
    TREND_SERIES.map((s) => [s.key, format(totals[s.key] ?? 0)]),
  );

export function BabycubeDashboardPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: BabycubeDashboardPageProps) {
  /* 두 차트가 **각자** 기간을 갖는다(원본과 같다). 초기값은 데이터에서 받는다 */
  const [countPeriod, setCountPeriod] = useState(DEFAULT_PERIOD);
  const [revenuePeriod, setRevenuePeriod] = useState(DEFAULT_PERIOD);

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다 */
  const status = asStatus(useSearchParams().get("preview"));
  /* 지표·흐름은 「빈 기간」이 없다(누적·당일 집계) — `empty` 는 차트만 받는다 */
  const countsStatus = status === "empty" ? "ready" : status;

  return (
    <AppShell
      sidebar={
        <Gnb
          sections={GNB_SECTIONS}
          activeId={activeNav}
          onSelect={onNavSelect}
          open={navOpen}
          onOpenChange={onNavOpenChange}
          logo={GNB_LOGO_SLOTS.logo}
          collapsedLogo={GNB_LOGO_SLOTS.collapsed}
        />
      }
      header={
        <PageHeader title="대시보드" actions={APP_CHROME.headerAccount} />
      }
    >
      {/*
        ── 지표 9장 (회원 3 · 셀러 3 · 매출 3) — 그룹이 열이다 ─────────
        거터 24 — 카드 사이 규격(§D2-2). 세 그룹이 같은 무게라 균등 3열이다.
      */}
      <section aria-label="핵심 지표" className="grid grid-cols-3 gap-6">
        {METRIC_GROUPS.map((group) => (
          <MetricGroupCard
            key={group.id}
            group={group}
            status={countsStatus}
            onNavSelect={onNavSelect}
          />
        ))}
      </section>

      {/*
        ── 총 매출 현황 2종 — **같은 성격이라 나란히 둔다** ─────────────
        `flex-1` — 이 줄이 **남는 세로 공간을 흡수한다**(차트가 `height="fill"`).
      */}
      <div className="grid flex-1 grid-cols-2 gap-6">
        <TrendChartCard
          title="총 매출 현황(건수)"
          measure="결제 건수"
          period={countPeriod}
          onPeriodChange={(value) => setCountPeriod(asPeriod(value))}
          total={{ value: num(orderCountTotals[countPeriod]), unit: "건" }}
          seriesValues={seriesValuesOf(
            orderCountSeriesTotals[countPeriod],
            count,
          )}
          note={COUNT_NOTE}
          status={status}
          data={ORDER_COUNT_TREND[countPeriod]}
          format={count}
          integerTicks
        />
        <TrendChartCard
          title="총 매출 현황(금액)"
          measure="결제 금액"
          period={revenuePeriod}
          onPeriodChange={(value) => setRevenuePeriod(asPeriod(value))}
          total={{ value: num(revenueTotals[revenuePeriod]), unit: "원" }}
          seriesValues={seriesValuesOf(revenueSeriesTotals[revenuePeriod], won)}
          note={REVENUE_NOTE}
          status={status}
          data={REVENUE_TREND[revenuePeriod]}
          format={won}
        />
      </div>

      {/* 흐름 2종 — 각 4단계라 절반 폭에 한 줄로 들어간다 */}
      <div className="grid grid-cols-2 gap-6">
        <FlowCard
          title="렌트 관리"
          steps={RENT_FUNNEL}
          status={countsStatus}
          onStepSelect={(step) => onNavSelect(ordersHref("렌트", step.label))}
        />
        <FlowCard
          title="판매 관리"
          steps={SALE_FUNNEL}
          status={countsStatus}
          onStepSelect={(step) => onNavSelect(ordersHref("판매", step.label))}
        />
      </div>
    </AppShell>
  );
}
