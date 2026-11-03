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
  METRIC_ROWS,
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
 * ## 배치 = 원본 v0.4 2단 (proto.html:87·3087~3116 · 사용자 승인 2026-11-03)
 *
 * ```
 * ┌ 지표 9장 (3 × 3) ─────────────┐ ┌ 총 매출 현황(건수) ──┐   ← 1줄: 두 칸이 위아래 끝을 맞춘다
 * │ 회원 3 / 셀러 3 / 매출 3      │ │                      │
 * └───────────────────────────────┘ └──────────────────────┘
 * ┌ 렌트 관리 (4단계) ────────────┐ ┌ 총 매출 현황(금액) ──┐   ← 2줄
 * ┌ 판매 관리 (4단계) ────────────┐ │                      │
 * └───────────────────────────────┘ └──────────────────────┘
 * ```
 * 왼쪽 : 오른쪽 = 1.12 : 1 (원본 값). 2026-09-18 의 「지표 3그룹 카드 1행 3열」 배치를 대체한다.
 * 2단이 안 되는 폭(이 영역 60rem 미만)에서는 **지표 → 흐름 → 차트** 순으로 한 줄씩 쌓는다
 * (원본 `@media(max-width:1200px)` 와 같은 순서). 판단 기준은 뷰포트가 아니라 **이 영역의 폭**
 * (`@container`)이다 — GNB 를 접고 펴도 맞는다.
 * 원본의 706px 한 화면을 억지로 맞추지 않는다 — 글자·차트 최소 높이(240)를 줄이지 않는다.
 *
 * ## 원본과 다르게 둔 것 (전부 결정됨)
 * - **차트 2계열(렌트·판매) + 토글 칩 + 기간 합계** — 원본은 전사 단일 계열·합계 없음.
 *   사용자 결정(2026-09-18, 2026-11-03 유지). 건수 칩 합 ≠ 합계(혼합 결제) — 칩 아래 한 줄이 말한다
 * - 타일·흐름·차트의 모양은 Clay 부품(카드 · `StatTile` · `LineChart` · `SegmentedControl`)
 * - 거래액 라벨 「(할인 후)」 — 정산 기준 결정
 *
 * ## 원본에 없어서 걷어낸 것 (되살리지 말 것)
 * 타일의 아이콘 · 증감(±%) · 비교 기준 문구 · 「회원 목록」 버튼 · 줄 제목(「회원 지표」) ·
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
 * | 지표 9장(3줄)         | `METRIC_ROWS`                                           |
 * | 차트 데이터·계열      | `ORDER_COUNT_TREND` · `REVENUE_TREND` · `TREND_SERIES`  |
 * | 기간·계열 합계        | `*Totals` · `*SeriesTotals` (**뼈대가 세지 않는다**)    |
 * | 축 눈금 간격·날짜     | `TICK_EVERY` · `shortDay` · `periodRangeText`           |
 * | 흐름 단계·건수        | `RENT_FUNNEL` · `SALE_FUNNEL`                           |
 * | 기간 기본값           | `DEFAULT_PERIOD` (**뼈대에 박지 않는다**)               |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * 위 2단 배치 · 카드 표면 `soft`(흰 면) · 지표는 **갈 수 있는 타일에만** 화살표 ·
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

/**
 * 지표 타일의 면 — `Card variant="soft"` 와 같은 흰 면 · radius 12 · 옅은 그림자 · 경계선.
 *
 * ## 왜 `Card` 나 `StatTile` 이 아닌가
 * 원본은 **카드 1장 = 수치 1개**다. `Card` 는 안쪽 24 가 고정이라 1280 에서 타일 안쪽이
 * 104px 로 줄어 `489,700원` 이 들어가지 않는다. `StatTile plain` 은 흰 카드 **안에** 드는 회색
 * 항목이고, `card` 는 표시 전용이라 누를 수 없다. 그래서 같은 토큰으로 면만 페이지 안에서 만든다
 * (`DESIGN-dashboard.md` §D3-6). 두 번째 화면이 쓰게 되면 `StatTile` variant 로 올린다.
 */
const TILE_FACE =
  "flex h-full w-full min-w-0 flex-col justify-center gap-2 rounded-large bg-surface p-4 text-left shadow-xsmall outline-1 -outline-offset-1 outline-border";

/**
 * 지표 타일 한 장 — 라벨(위) · 값 + 단위(아래). 원본 `.dstat` (proto.html:95~100).
 *
 * 줄 높이가 차트에 맞춰 늘어나도 라벨과 값을 **붙인 채 세로 가운데**에 둔다(원본
 * `.dstat{justify-content:center}`) — 위아래 끝으로 벌리면 1440 에서 둘 사이가 50px 넘게 떠 한 쌍으로 안 읽힌다.
 * 갈 곳이 있을 때만 버튼이 되고 화살표가 붙는다(§D3-5). hover 는 면, focus 는 테두리.
 * 라벨은 줄을 바꿔도 자르지 않는다 — 잘리면 무엇을 세는지 알 수 없다.
 */
function MetricTile({
  label,
  value,
  unit,
  status,
  onOpen,
}: {
  label: string;
  value: string;
  unit: string;
  status: DataStatus;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-1">
        <span className="body-medium break-keep text-text-sub">{label}</span>
        {onOpen ? (
          <ArrowUpRight
            size={16}
            strokeWidth={1.2}
            aria-hidden
            className="mt-0.5 shrink-0 text-icon-sub transition-colors duration-100 group-hover:text-icon"
          />
        ) : null}
      </span>
      {status === "loading" ? (
        /* 줄높이(`h-lh`)를 감싼 수치 프리셋에서 받아 실제 값과 높이가 같다 */
        <span className="metric-small w-24">
          <Skeleton />
        </span>
      ) : (
        /* 값은 비례폭이다 — 큰 글자에 등폭을 주면 `30` 이 헐거워 보인다 (§D6-2) */
        <span
          className={cn(
            "flex flex-wrap items-baseline gap-1",
            dimWhile(status),
          )}
        >
          <strong className="metric-small text-text">{value}</strong>
          <span className="body-medium text-text-sub">{unit}</span>
        </span>
      )}
    </>
  );

  if (!onOpen || status === "loading") {
    return (
      <div className={TILE_FACE} aria-busy={isBusy(status)}>
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label} ${value}${unit} 목록 열기`}
      aria-busy={isBusy(status)}
      className={cn(
        TILE_FACE,
        "group cursor-pointer transition-colors duration-100 ease-out hover:bg-surface-sub focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
      )}
    >
      {body}
    </button>
  );
}

/**
 * 상태 흐름 한 장 (원본 `dflow`). **도메인을 모른다** — 단계 배열과 제목만 받는다.
 * 단계는 `StatTile compact` — 지표와 같은 「무엇이 몇 개인가」라 같은 상자 문법을 쓴다.
 *
 * ## `<ol>` 이 아니라 `role="list"` 인 이유
 * 화살표를 **칸 밖**에 두어야 상자 4개의 폭이 같고 화살표가 두 상자 딱 중간에 온다.
 * `<ol>` 안에는 `<li>` 만 올 수 있어 화살표를 형제로 둘 수 없다.
 *
 * 줄 높이가 차트에 맞춰 늘어나면 본문을 **세로 가운데**에 둔다(원본 `align-content:center`).
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
      <CardBody className={cn("flex-1 justify-center", dimWhile(status))}>
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
 * 합계는 숨김과 상관없이 전체다. 칩 합과 합계가 다를 수 있는 이유는 `note` 가 말한다.
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

/*
  2단 자리 — 컨테이너 폭 60rem 이상에서만. 위치를 **명시**해 DOM 순서(지표 → 흐름 → 차트)와
  2단 배치(왼쪽 지표·흐름 / 오른쪽 차트)를 함께 얻는다. 접히면 DOM 순서대로 쌓인다.
*/
const AT_TILES = "@min-[60rem]:col-start-1 @min-[60rem]:row-start-1";
const AT_FLOWS = "@min-[60rem]:col-start-1 @min-[60rem]:row-start-2";
const AT_COUNT = "@min-[60rem]:col-start-2 @min-[60rem]:row-start-1";
const AT_REVENUE = "@min-[60rem]:col-start-2 @min-[60rem]:row-start-2";

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
        `flex-1` — 큰 모니터에서 남는 세로 공간을 두 줄이 나눠 갖는다(차트가 늘어난다).
        `@container` — 2단 전환을 뷰포트가 아니라 이 영역의 폭으로 판단한다.
      */}
      <div className="@container flex flex-1 flex-col">
        <div className="grid flex-1 gap-6 @min-[60rem]:grid-cols-[1.12fr_1fr]">
          {/*
            ── 지표 9장 — 줄 = 집계 범위(회원 · 셀러 · 매출) ──────────────
            줄 제목은 없다(원본). 묶음 이름은 스크린리더에만 준다.
            거터 24 — 카드 사이 규격(§D2-2).
          */}
          <section
            aria-label="현황 지표"
            className={cn("grid grid-rows-3 gap-6", AT_TILES)}
          >
            {METRIC_ROWS.map((row) => (
              <div
                key={row.id}
                role="group"
                aria-label={row.name}
                className="grid grid-cols-3 gap-6"
              >
                {row.metrics.map((metric) => {
                  /* 원본 `go` 가 있는 타일만 눌린다 — 오늘 방문자·가입자는 갈 곳이 없다 */
                  const navId = "navId" in metric ? metric.navId : undefined;
                  return (
                    <MetricTile
                      key={metric.label}
                      label={metric.label}
                      value={metric.value}
                      unit={metric.unit}
                      status={countsStatus}
                      onOpen={navId ? () => onNavSelect(navId) : undefined}
                    />
                  );
                })}
              </div>
            ))}
          </section>

          {/* ── 흐름 2장 — 렌트 · 판매 (각 4단계) ───────────────────────── */}
          <div className={cn("grid grid-rows-2 gap-6", AT_FLOWS)}>
            <FlowCard
              title="렌트 관리"
              steps={RENT_FUNNEL}
              status={countsStatus}
              onStepSelect={(step) =>
                onNavSelect(ordersHref("렌트", step.label))
              }
            />
            <FlowCard
              title="판매 관리"
              steps={SALE_FUNNEL}
              status={countsStatus}
              onStepSelect={(step) =>
                onNavSelect(ordersHref("판매", step.label))
              }
            />
          </div>

          {/* ── 총 매출 현황 2종 — 결제 기준 일별 ───────────────────────── */}
          <TrendChartCard
            title="총 매출 현황(건수)"
            measure="결제 건수"
            className={AT_COUNT}
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
            className={AT_REVENUE}
            period={revenuePeriod}
            onPeriodChange={(value) => setRevenuePeriod(asPeriod(value))}
            total={{ value: num(revenueTotals[revenuePeriod]), unit: "원" }}
            seriesValues={seriesValuesOf(
              revenueSeriesTotals[revenuePeriod],
              won,
            )}
            note={REVENUE_NOTE}
            status={status}
            data={REVENUE_TREND[revenuePeriod]}
            format={won}
          />
        </div>
      </div>
    </AppShell>
  );
}
