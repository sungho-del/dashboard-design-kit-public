import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  AppShell,
  Card,
  CardBody,
  CardHeader,
  ChartLegend,
  Gnb,
  LineChart,
  PageHeader,
  SegmentedControl,
  StatTile,
} from "../../components/ui";
import {
  asPeriod,
  count,
  DEFAULT_PERIOD,
  manwon,
  METRIC_GROUPS,
  num,
  orderCountTotals,
  ORDER_COUNT_TREND,
  ORDERS_NAV_ID,
  PERIODS,
  RENT_FUNNEL,
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
 * 회원 지표 · 셀러 지표 · 매출 지표      ← 그룹마다 카드 1장, 안에 그레이 상자 3칸
 * 총 매출 현황(건수) | 총 매출 현황(금액) ← 1행 2열
 * 렌트 관리 | 판매 관리                  ← 상태 흐름, 1행 2열 (각 4단계)
 * ```
 *
 * **배치에서 원본을 의도적으로 벗어나는 지점은 하나다** — 차트 2장.
 * 원본은 두 차트 *사이에* 흐름을 끼워 "얼마나 들어왔나(건수) → 지금 어디에 있나(흐름)
 * → 얼마가 됐나(금액)" 순으로 읽게 했는데, 그러면 **같은 것을 두 단위로 보는 한 쌍이
 * 화면에서 갈라진다.** 성격이 같은 것끼리 묶는 원리(지표 3그룹과 같다)를 우선했다.
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
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./DashboardPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                              |
 * | --------------------- | ------------------------------------------------- |
 * | 데이터·라벨·단위      | `DashboardPage.data.ts` **전체**                  |
 * | 지표 9장(3그룹)       | 같은 파일의 `METRIC_GROUPS`                       |
 * | 차트 데이터·계열      | 같은 파일의 `ORDER_COUNT_TREND` · `REVENUE_TREND` |
 * | 흐름 단계·건수        | 같은 파일의 `RENT_FUNNEL` · `SALE_FUNNEL`         |
 * | 기간 기본값           | 같은 파일의 `DEFAULT_PERIOD` (**뼈대에 박지 않는다**) |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * **흰 카드 = 그룹 / 연한 그레이 상자 = 항목** 두 층 ·
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

/**
 * 지표 그룹 한 장 (원본 `dstat-grid`).
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
  onNavSelect,
}: {
  group: (typeof METRIC_GROUPS)[number];
  onNavSelect: (path: string) => void;
}) {
  return (
    <Card>
      <CardHeader title={group.title} />
      <CardBody>
        {/*
        거터 12 — **카드 안 항목 묶음**이다(카드 사이 24 와 다른 축).
        묶음 안이 묶음 사이보다 좁아야 하나로 읽힌다. 규격: `DESIGN-dashboard.md` §D4-3
        */}
        <div className="grid grid-cols-3 gap-3">
          {group.metrics.map((metric) => {
            /* 원본의 `go` 가 있는 타일만 눌린다 — 오늘 방문자·오늘 가입자는
               그날치 집계라 대응하는 목록 화면이 없다 */
            const navId = "navId" in metric ? metric.navId : undefined;
            return (
              <StatTile
                key={metric.label}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
                onOpen={navId ? () => onNavSelect(navId) : undefined}
                openLabel={`${metric.label} ${metric.value}${metric.unit} 목록 열기`}
              />
            );
          })}
        </div>
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
  onStepSelect,
}: {
  title: string;
  steps: FunnelStep[];
  onStepSelect: (step: FunnelStep) => void;
}) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
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
                <StatTile
                  compact
                  denseLabel
                  label={step.label}
                  value={num(step.count)}
                  unit="건"
                  onOpen={() => onStepSelect(step)}
                  openLabel={`${title} ${step.label} ${count(step.count)} 목록 열기`}
                />
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
 */
function TrendChartCard({
  title,
  ariaLabel,
  period,
  onPeriodChange,
  total,
  data,
  format,
}: {
  title: string;
  ariaLabel: string;
  period: string;
  onPeriodChange: (value: string) => void;
  /** 카드 헤더 아래 한 줄 요약 — 뼈대가 세지 않고 데이터의 파생값을 받는다 */
  total: string;
  data: Record<string, string | number>[];
  /** `LineChart` 의 `format` 과 **같은 시그니처**여야 한다 */
  format: (value: string | number) => string;
}) {
  return (
    <Card>
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
      <CardBody>
        {/*
          실 API 를 붙이면 이 자리에서 `isEmpty ? <EmptyState …/> : <LineChart …/>` 로
          갈라 원본 문구 "표시할 기간 데이터가 없습니다." 를 낸다.
        */}
        <p className="body-small text-text-sub">선택한 기간 합계 {total}</p>
        {/* 계열이 2개 이상이면 범례를 항상 둔다 — 색만으로 식별하게 두지 않는다 */}
        <ChartLegend series={TREND_SERIES} />
        {/*
          `yBaseline="fit"` — 0 부터 그리면 **변화가 사라진다.**
          주별 주문 건수는 392→420 으로 움직이는데 0~600 축에서는 7% 라 직선으로 보였다.
          선은 위치로 값을 말하므로 0 baseline 이 필수가 아니다(막대였다면 유지해야 한다).
        */}
        <LineChart
          ariaLabel={ariaLabel}
          data={data}
          xKey="label"
          series={TREND_SERIES}
          format={format}
          height={240}
          yBaseline="fit"
        />
      </CardBody>
    </Card>
  );
}

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
      {/* ── 지표 9장 (회원 3 · 셀러 3 · 매출 3) ─────────────── */}
      {METRIC_GROUPS.map((group) => (
        <MetricGroupCard
          key={group.id}
          group={group}
          onNavSelect={onNavSelect}
        />
      ))}

      {/*
        ── 총 매출 현황 2종 — **같은 성격이라 나란히 둔다** ─────────────
        원본은 두 차트 사이에 상태 흐름을 끼워 넣지만, 그러면 **같은 것을 두 단위로
        보는 한 쌍**(건수 / 금액)이 화면에서 갈라진다. 지표를 성격별로 묶은 것과 같은
        원리로 여기서도 묶는다 — 원본 배치를 의도적으로 벗어나는 유일한 지점이다.
      */}
      <div className="grid grid-cols-2 gap-6">
        <TrendChartCard
          title="총 매출 현황(건수)"
          ariaLabel="총 매출 현황 건수 추이. 렌트와 판매 비교"
          period={countPeriod}
          onPeriodChange={(value) => setCountPeriod(asPeriod(value))}
          total={count(orderCountTotals[countPeriod])}
          data={ORDER_COUNT_TREND[countPeriod]}
          format={count}
        />
        <TrendChartCard
          title="총 매출 현황(금액)"
          ariaLabel="총 매출 현황 금액 추이. 렌트와 판매 비교"
          period={revenuePeriod}
          onPeriodChange={(value) => setRevenuePeriod(asPeriod(value))}
          total={`${manwon(revenueTotals[revenuePeriod])}원`}
          data={REVENUE_TREND[revenuePeriod]}
          format={manwon}
        />
      </div>

      {/* 흐름 2종 — 각 4단계라 절반 폭에 한 줄로 들어간다 */}
      <div className="grid grid-cols-2 gap-6">
        <FlowCard
          title="렌트 관리"
          steps={RENT_FUNNEL}
          onStepSelect={(step) => onNavSelect(ordersHref("렌트", step.label))}
        />
        <FlowCard
          title="판매 관리"
          steps={SALE_FUNNEL}
          onStepSelect={(step) => onNavSelect(ordersHref("판매", step.label))}
        />
      </div>
    </AppShell>
  );
}
