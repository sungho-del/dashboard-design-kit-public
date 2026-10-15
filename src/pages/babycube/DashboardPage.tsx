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
  DEFAULT_PERIOD,
  manwon,
  METRIC_GROUPS,
  num,
  orderCountSeriesTotals,
  orderCountTotals,
  ORDER_COUNT_TREND,
  ORDERS_NAV_ID,
  PERIODS,
  RENT_FUNNEL,
  revenueSeriesTotals,
  revenueTotals,
  REVENUE_TREND,
  SALE_FUNNEL,
  TREND_SERIES,
  type FunnelStep,
} from "./DashboardPage.data";
import { APP_CHROME, GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 통계형
 *
 * ## ⚠️ 내용은 **원본 어드민 그대로**다 — 임의로 더하지 말 것
 *
 * ```
 * 회원 지표 | 셀러 지표 | 매출 지표         ← 1행 3열. 카드 안은 "라벨 ··· 값 단위" 3행
 * 총 매출 현황(건수) | 총 매출 현황(금액) ← 1행 2열. **남는 세로 공간을 이 줄이 흡수한다**
 * 렌트 관리 | 판매 관리                  ← 상태 흐름, 1행 2열 (각 4단계)
 * ```
 *
 * ## 배치에서 원본을 의도적으로 벗어나는 지점 — 셋
 *
 * 1. **차트 2장을 붙였다.** 원본은 두 차트 *사이에* 흐름을 끼워 "얼마나 들어왔나(건수)
 *    → 지금 어디에 있나(흐름) → 얼마가 됐나(금액)" 순으로 읽게 했는데, 그러면 **같은 것을
 *    두 단위로 보는 한 쌍이 화면에서 갈라진다.** 성격이 같은 것끼리 묶는 원리를 우선했다.
 * 2. **지표 3그룹을 한 줄에 세웠다.** 그룹마다 전폭 카드였을 때 지표 9개가 **첫 화면의
 *    절반 이상**을 차지해 차트가 접힘 아래로 밀렸고, 타일 안에서 라벨(좌상단)과
 *    수치(우하단)가 ~400px 벌어져 한 쌍으로 읽히지 않았다. 지금은 그룹이 열이고
 *    항목이 행이라 **세 수치가 한 세로줄에 선다** — 그룹 안 비교가 눈 이동 없이 된다.
 * 3. **차트 헤더에 계열별 합계가 있다**("렌트 1,635건 | 판매 1,999건"). ⚠️ **원본에 없는
 *    숫자다** — 원본은 두 계열을 더한 합계 한 줄뿐이다. 사용자 결정으로 들였다(2026-09-18,
 *    shadcn `chart-bar-interactive` 패턴). 새 데이터가 아니라 추이를 계열별로 더한 파생값이다.
 *    칩을 누르면 그 계열을 숨긴다 — 범례와 토글이 한 컨트롤이다(둘로 두면 상태가 갈린다).
 *
 * ## 원본에 없어서 걷어낸 것들 (되살리지 말 것)
 *
 * 원본 타일 컴포넌트는 **라벨 · 값 · 단위**가 전부다:
 * ```js
 * <span className="dsl">{label}</span>
 * <span><b className={go ? "dsv go" : "dsv"}>{value}</b>
 *       <span className="dsu">{unit}</span></span>
 * ```
 * 한때 여기에 아이콘 · 증감(±%) · 비교 기준 문구 · "회원 목록" 링크 버튼을 얹었다가
 * **9장 × 4 = 36개 요소**를 걷어냈다. 값 자체가 링크다.
 *
 * 상태 흐름도 마찬가지다. 한때 단계를 중요도 4등급으로 갈라 "처리 대기 128건" 합계와
 * 경보 배너를 세웠는데, **원본에 없는 구성**이라 되돌렸다. 원본은 단계를 `›` 로
 * 쭉 이어 놓을 뿐이다 — 그 순서가 곧 생애주기다.
 * 단계 아래 **비중 막대**도 한때 붙였다가 걷어냈다(사용자 판단 — 어색하다).
 *
 * ## 데이터 상태 — 실 API 를 붙이면 `status` 를 fetch 상태로 바꾼다
 *
 * | status       | 처리 (`DESIGN-dashboard.md` §D8)                                   |
 * | ------------ | ------------------------------------------------------------------ |
 * | `ready`      | 그대로                                                             |
 * | `loading`    | 제목은 **실제 글자**, 변하는 것만 스켈레톤 — 크기가 같아 화면이 안 튄다 |
 * | `empty`      | 차트 자리에 원본 문구 "표시할 기간 데이터가 없습니다."            |
 * | `refreshing` | 스켈레톤으로 되돌리지 않는다 — **이전 값을 흐리게** 두고 `aria-busy` |
 *
 * 지금은 API 가 없으므로 **주소로 미리 본다**: `/?preview=loading` · `empty` · `refreshing`.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./DashboardPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                                    |
 * | --------------------- | ------------------------------------------------------- |
 * | 데이터·라벨·단위      | `DashboardPage.data.ts` **전체**                        |
 * | 지표 9장(3그룹)       | 같은 파일의 `METRIC_GROUPS`                             |
 * | 차트 데이터·계열      | 같은 파일의 `ORDER_COUNT_TREND` · `REVENUE_TREND`       |
 * | 기간·계열 합계        | 같은 파일의 `*Totals` · `*SeriesTotals` (**뼈대가 세지 않는다**) |
 * | 흐름 단계·건수        | 같은 파일의 `RENT_FUNNEL` · `SALE_FUNNEL`               |
 * | 기간 기본값           | 같은 파일의 `DEFAULT_PERIOD` (**뼈대에 박지 않는다**)   |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 · 카드 표면은 `Card variant="soft"` ·
 * 지표에서는 **갈 수 있는 항목에만** 화살표(흐름은 전부 링크라 붙이지 않는다) ·
 * 위 배치 순서 · 단계를 chevron 으로 잇는 가로 체인 ·
 * 기간 세그먼트가 데이터를 바꾸는 흐름 · 계열이 2개 이상이면 범례 필수
 * ====================================================================== */

export interface BabycubeDashboardPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

/**
 * 흐름 단계 → 주문 목록 링크. **원본과 쿼리 이름까지 같게** 만든다.
 *
 * 원본: `u = (e, s) => "/orders-all?" + new URLSearchParams({ stat: e, flow: s })`
 * 이고 `href: (step) => u("렌트", step)` 로 부른다.
 *
 * ⚠️ 이름이 뒤바뀐 것처럼 보이지만 맞다 — 원본 주문 목록이 `get("stat") ?? "렌트"` 로
 * 읽으므로 **`stat` 이 유형(렌트/판매), `flow` 가 단계**다.
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
 * 1440px 에서 카드 안쪽이 약 315px 인데 `입점사 거래액(정가)` + `824,000,000원` 은
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
  onOpen,
  openLabel,
}: {
  label: string;
  value: string;
  unit: string;
  onOpen?: () => void;
  openLabel: string;
}) {
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1 @min-[22rem]:flex-row @min-[22rem]:items-baseline @min-[22rem]:justify-between @min-[22rem]:gap-3">
        <span className="body-medium break-keep text-text-sub">{label}</span>
        {/* 값은 비례폭이다 — 큰 글자에 등폭을 주면 `128` 이 헐거워 보인다 (§D6-2) */}
        <span className="flex shrink-0 items-baseline gap-1">
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
 * 스켈레톤 줄 높이는 감싼 타이포 프리셋의 줄높이(`h-lh`)를 그대로 받는다.
 */
function MetricRowSkeleton() {
  return (
    <div className={ROW_BOX}>
      <span className="body-medium w-24">
        <Skeleton />
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
      <CardBody className={dimWhile(status)}>
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
                  <MetricRowSkeleton />
                </li>
              );
            }
            /* 원본의 `go` 가 있는 타일만 눌린다 — 오늘 방문자·오늘 가입자는
               그날치 집계라 대응하는 목록 화면이 없다 */
            const navId = "navId" in metric ? metric.navId : undefined;
            return (
              <li key={metric.label}>
                <MetricRow
                  label={metric.label}
                  value={metric.value}
                  unit={metric.unit}
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
 *
 * ## ⚠️ 원본 흐름은 **각 4단계**다
 * 렌트 `신규 주문 › 대여중 › 검수중 › 반납완료` · 판매 `신규 주문 › 배송 준비 › 배송 완료 › 구매확정`.
 * 한때 상태 어휘 목록(교환·반품까지 130여 개)에서 부풀려 렌트 11 · 판매 5 단계를 만들었는데
 * **대시보드에 있는 것이 아니었다.** 전체 상태 어휘는 주문 목록 화면이 든다 —
 * 대시보드는 큰 국면만 짚는다.
 *
 * 4단계라 절반 폭에서도 한 줄에 들어간다. 그래서 두 카드를 **1행 2열**로 둘 수 있다.
 * 단계를 `›` 로 잇고 폭에 고르게 펴 두어, 순서가 곧 생애주기로 읽힌다.
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
        {/*
          단계도 지표와 **같은 상자**(`StatTile`)를 쓴다 — 둘 다 "무엇이 몇 개인가"라
          성격이 같은데 다르게 생기면 화면 안에 시각 언어가 둘이 된다.

          ## `<ol>` 이 아니라 `role="list"` 인 이유
          화살표를 **칸 밖**에 두어야 (1) 상자 4개의 폭이 정확히 같아지고
          (2) 화살표가 두 상자 **딱 중간**에 온다.
          `<ol>` 안에는 `<li>` 만 올 수 있어 화살표를 형제로 둘 수 없었고,
          그래서 칸 안에 넣었더니 **앞 상자에 붙고 첫 칸만 넓어지는** 문제가 있었다.
          `role="list"` + `role="listitem"` 은 같은 시맨틱을 유지하면서 그 제약을 푼다.
        */}
        <div role="list" className="flex items-stretch">
          {steps.map((step, index) => (
            <Fragment key={step.value}>
              {index > 0 ? (
                /*
                  단계를 잇는 화살표.

                  원본은 `›` 라는 **활자 글리프**였는데, 이 저장소의 기호는 전부
                  lucide 아이콘이라 혼자 폰트 글자면 굵기·크기·수직 정렬이 아무것과도
                  맞지 않는다 — "툭 놓인" 느낌의 원인이 그것이었다. 그래서 아이콘으로 바꿨다.

                  ⚠️ **`strokeWidth` 는 1.2 로 고정한다**(CLAUDE.md · Clay 아이콘 규격).
                  더 굵게 보이려고 이 값을 올리면 화면의 다른 아이콘과 굵기가 어긋난다.
                  대신 **크기를 키운다** — lucide 는 24 단위 viewBox 안에서 stroke 를 그리므로
                  렌더 크기가 커지면 선도 그만큼 굵게 나온다(14 → 24 면 약 1.7배).

                  `mx-2` 로 좌우 여백을 **같게** 주어 두 상자 정확히 가운데 선다.
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
 * 기간 세그먼트는 카드마다 독립이다 — 원본도 각자 `useState(30)` 을 갖는다.
 *
 * ## 기간 합계는 **수치**다
 * 원본은 합계를 차트 위 한 줄 문구로 둔다. 예전엔 그 문구를 12px 캡션으로 두어
 * 카드에서 가장 중요한 숫자가 가장 작은 글자였다. 지금은 라벨(작게) + 값(`metric-small`)
 * + 단위(작게)로 **지표 행과 같은 문법**을 쓴다 — 화면 안의 "숫자를 읽는 방식"이 하나다.
 *
 * ## 계열 토글 칩 (범례 겸용)
 * 오른쪽의 `[● 렌트 1,635건] [● 판매 1,999건]` 는 **범례이자 토글**이다. 누르면 그 계열을
 * 숨긴다. 차트에는 `series` 를 걸러 넘기지 않고 `hiddenKeys` 를 준다 — 걸러 넘기면
 * 판매가 렌트의 파랑으로 당겨진다(§D12). 마지막 하나는 끌 수 없다.
 * 기간 합계는 **숨김과 상관없이 전체**다 — 무엇을 끄든 "이 기간에 얼마였나"는 같다.
 *
 * ## 남는 세로 공간을 차트가 흡수한다
 * `CardBody` 가 `flex-1`, 차트가 `height="fill"` 이라 카드가 늘어나면 차트가 늘어난다.
 * 카드를 늘리는 것은 이 카드들이 든 줄(`flex-1`)이다 — 큰 모니터에서 화면 아래가
 * 비지 않는다. 공간이 없으면 최소 240(§28-2)을 지키고 페이지가 스크롤된다.
 */
function TrendChartCard({
  title,
  ariaLabel,
  period,
  onPeriodChange,
  total,
  seriesValues,
  status,
  data,
  format,
}: {
  title: string;
  ariaLabel: string;
  period: string;
  onPeriodChange: (value: string) => void;
  /** 기간 합계 — 뼈대가 세지 않고 데이터의 파생값을 받는다. **값과 단위를 나눠** 받는다 */
  total: { value: string; unit: string };
  /** 계열 키 → 이미 포맷된 계열 합계. 칩에 그대로 붙는다 */
  seriesValues: Record<string, string>;
  status: DataStatus;
  data: Record<string, string | number>[];
  /** `LineChart` 의 `format` 과 **같은 시그니처**여야 한다 */
  format: (value: string | number) => string;
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
        원본 문구 그대로. 빈 것은 에러가 아니다(§D8-2) — 기간 세그먼트는 헤더에 그대로
        살아 있어 다른 기간을 고를 수 있다. 합계·칩은 보여줄 것이 없어 뺀다.
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="body-small text-text-sub">선택한 기간 합계</span>
            <span className="flex items-baseline gap-1">
              <strong className="metric-small text-text">{total.value}</strong>
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
        {/*
          `area` — 계열색이 아래로 사라지는 그라디언트 면. 값은 윤곽선이 말하고
          면은 "얼마나 쌓였나"의 인상만 준다. 반투명이라 두 계열이 겹쳐도 앞 선이 가려지지 않는다.
          `yBaseline="fit"` — 0 부터 그리면 **변화가 사라진다.**
          주별 주문 건수는 392→420 으로 움직이는데 0~600 축에서는 7% 라 직선으로 보였다.
          선은 위치로 값을 말하므로 0 baseline 이 필수가 아니다(막대였다면 유지해야 한다).
        */}
        <LineChart
          area
          ariaLabel={ariaLabel}
          data={data}
          xKey="label"
          series={TREND_SERIES}
          hiddenKeys={hidden}
          format={format}
          height="fill"
          yBaseline="fit"
        />
      </>
    );
  }

  return (
    <Card variant="soft" aria-busy={isBusy(status)}>
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
  /*
    두 차트가 **각자** 기간을 갖는다(원본과 같다). 초기값은 데이터에서 받는다 —
    뼈대에 문자열을 박으면 `PERIODS` 를 고칠 때 활성 항목이 사라지는 사고가 난다.
  */
  const [countPeriod, setCountPeriod] = useState(DEFAULT_PERIOD);
  const [revenuePeriod, setRevenuePeriod] = useState(DEFAULT_PERIOD);

  /* 실 API 를 붙이면 이 한 줄을 fetch 상태로 바꾼다 — 지금은 `?preview=` 로 미리 본다 */
  const status = asStatus(useSearchParams().get("preview"));

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
        지표는 "빈 기간"이 없다(누적·당일 집계) — `empty` 는 차트만 받는다.
      */}
      <section aria-label="핵심 지표" className="grid grid-cols-3 gap-6">
        {METRIC_GROUPS.map((group) => (
          <MetricGroupCard
            key={group.id}
            group={group}
            status={status === "empty" ? "ready" : status}
            onNavSelect={onNavSelect}
          />
        ))}
      </section>

      {/*
        ── 총 매출 현황 2종 — **같은 성격이라 나란히 둔다** ─────────────
        원본은 두 차트 사이에 상태 흐름을 끼워 넣지만, 그러면 **같은 것을 두 단위로
        보는 한 쌍**(건수 / 금액)이 화면에서 갈라진다.

        `flex-1` — 이 줄이 **남는 세로 공간을 흡수한다.** `AppShell` 본문은 화면 높이를
        채우는 세로 flex 라, 콘텐츠가 화면보다 짧은 큰 모니터(2560×1215 실측: 콘텐츠가 1032px 에서 끝나 아래가 비었다)에서
        이 줄이 늘어나고 안의 차트(`height="fill"`)가 따라 늘어난다.
      */}
      <div className="grid flex-1 grid-cols-2 gap-6">
        <TrendChartCard
          title="총 매출 현황(건수)"
          ariaLabel="총 매출 현황 건수 추이. 렌트와 판매 비교"
          period={countPeriod}
          onPeriodChange={(value) => setCountPeriod(asPeriod(value))}
          total={{ value: num(orderCountTotals[countPeriod]), unit: "건" }}
          seriesValues={seriesValuesOf(
            orderCountSeriesTotals[countPeriod],
            count,
          )}
          status={status}
          data={ORDER_COUNT_TREND[countPeriod]}
          format={count}
        />
        <TrendChartCard
          title="총 매출 현황(금액)"
          ariaLabel="총 매출 현황 금액 추이. 렌트와 판매 비교"
          period={revenuePeriod}
          onPeriodChange={(value) => setRevenuePeriod(asPeriod(value))}
          total={{ value: num(revenueTotals[revenuePeriod]), unit: "만원" }}
          seriesValues={seriesValuesOf(
            revenueSeriesTotals[revenuePeriod],
            (value) => `${manwon(value)}원`,
          )}
          status={status}
          data={REVENUE_TREND[revenuePeriod]}
          format={manwon}
        />
      </div>

      {/* 흐름 2종 — 각 4단계라 절반 폭에 한 줄로 들어간다 */}
      <div className="grid grid-cols-2 gap-6">
        <FlowCard
          title="렌트 관리"
          steps={RENT_FUNNEL}
          status={status === "empty" ? "ready" : status}
          onStepSelect={(step) => onNavSelect(ordersHref("렌트", step.label))}
        />
        <FlowCard
          title="판매 관리"
          steps={SALE_FUNNEL}
          status={status === "empty" ? "ready" : status}
          onStepSelect={(step) => onNavSelect(ordersHref("판매", step.label))}
        />
      </div>
    </AppShell>
  );
}
