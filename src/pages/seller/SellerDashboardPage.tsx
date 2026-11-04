import { Fragment, useState } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  LineChart,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatTile,
  Tag,
  TextButton,
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
  AMOUNT_SERIES,
  COUNT_SERIES,
  DEFAULT_PERIOD,
  METRIC_GROUPS,
  NOTICE_TOP,
  PERIODS,
  RENT_FLOW,
  SALE_FLOW,
  TICK_EVERY,
  asPeriod,
  count,
  num,
  shortDay,
  trendOf,
  won,
  type FlowStep,
  type Metric,
  type PeriodValue,
} from "./SellerDashboardPage.data";
import { SellerShell, type SellerNavProps } from "./SettleParts";

/* =========================================================================
 * 셀러 대시보드(SO-DSH-001) — 통계형 · 뼈대. **본사 대시보드와 같은 틀**(`babycube/DashboardPage`)
 *
 * ```
 * 공지사항 (고정 먼저 3건 · 전체보기)                       ← 원본 맨 위
 * 내 상품 | 내 응대 | 내 정산                               ← 1행 3열 · 카드 안 "라벨 ··· 값 단위 →"
 * 내 매출 현황(건수) | 내 매출 현황(금액)                   ← 1행 2열 · 남는 세로 공간을 흡수
 * 판매 관리 | 렌트 관리                                     ← 흐름 각 4단계(원본 순서 — 판매 먼저)
 * ```
 * 지표·흐름은 누르면 그 목록으로 간다(원본 `dashGo`/`nav`). 숫자·이동 = `./SellerDashboardPage.data.ts`.
 * 데이터 상태는 본사와 같다 — `/?preview=loading|empty|refreshing`(0 도 값이다).
 * ====================================================================== */

const ROW_BOX =
  "flex w-full items-center gap-3 rounded-medium bg-surface-sub px-4 py-3 text-left";

/** 지표 한 행 — 본사 `MetricRow` 와 같은 모양(좁으면 두 줄 · 화살표 자리는 늘 비운다) */
function MetricRow({
  metric,
  status,
  onOpen,
}: {
  metric: Metric;
  status: DataStatus;
  onOpen: () => void;
}) {
  if (status === "loading") {
    return (
      <div className={ROW_BOX}>
        <span className="flex min-w-0 flex-1">
          <span className="body-medium break-keep text-text-sub">
            {metric.label}
          </span>
        </span>
        <span className="metric-small ml-auto w-28">
          <Skeleton />
        </span>
        <span className="size-4 shrink-0" aria-hidden />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${metric.label} ${metric.value}${metric.unit} 목록 열기`}
      className={cn(
        ROW_BOX,
        "group cursor-pointer transition-colors duration-100 ease-out hover:bg-surface-slate-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1 @min-[22rem]:flex-row @min-[22rem]:items-baseline @min-[22rem]:justify-between @min-[22rem]:gap-3">
        <span className="body-medium break-keep text-text-sub">
          {metric.label}
        </span>
        <span
          className={cn("flex shrink-0 items-baseline gap-1", dimWhile(status))}
        >
          <strong className="metric-small text-text">{metric.value}</strong>
          <span className="body-medium text-text-sub">{metric.unit}</span>
        </span>
      </span>
      <ArrowUpRight
        size={16}
        strokeWidth={1.2}
        aria-hidden
        className="shrink-0 text-icon-sub transition-colors duration-100 group-hover:text-icon"
      />
    </button>
  );
}

function FlowCard({
  title,
  steps,
  status,
  onNavSelect,
}: {
  title: string;
  steps: FlowStep[];
  status: DataStatus;
  onNavSelect: (path: string) => void;
}) {
  return (
    <Card variant="soft" aria-busy={isBusy(status)}>
      <CardHeader title={title} />
      <CardBody className={dimWhile(status)}>
        <div role="list" className="flex items-stretch">
          {steps.map((step, index) => (
            <Fragment key={step.label}>
              {index > 0 ? (
                <ChevronRight
                  aria-hidden
                  size={24}
                  strokeWidth={1.2}
                  className="mx-2 shrink-0 self-center text-icon-sub"
                />
              ) : null}
              <div role="listitem" className="min-w-0 flex-1">
                {status === "loading" ? (
                  <Skeleton shape="block" className="h-24 w-full" />
                ) : (
                  <StatTile
                    compact
                    denseLabel
                    label={step.label}
                    value={num(step.count)}
                    unit="건"
                    onOpen={() => onNavSelect(step.navId)}
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

/** 매출 추이 한 장 — 단일 계열(원본 「단일 계열이라 범례 없음 — 제목이 계열명」) · 기간은 카드마다 */
function TrendCard({
  title,
  kind,
  status,
}: {
  title: string;
  kind: "count" | "amount";
  status: DataStatus;
}) {
  const [period, setPeriod] = useState<PeriodValue>(DEFAULT_PERIOD);
  const data = trendOf(period);
  return (
    <Card variant="soft" aria-busy={isBusy(status)}>
      <CardHeader
        title={title}
        action={
          <SegmentedControl
            items={PERIODS}
            value={period}
            onValueChange={(v) => setPeriod(asPeriod(v))}
          />
        }
      />
      <CardBody className={cn("flex-1", dimWhile(status))}>
        {status === "loading" ? (
          <Skeleton shape="block" className="min-h-60 w-full flex-1" />
        ) : status === "empty" ? (
          <p className="body-medium text-text-sub">
            표시할 기간 데이터가 없습니다.
          </p>
        ) : (
          <LineChart
            area
            ariaLabel={`${title} — 최근 ${data.length}일 일별 추이`}
            data={data}
            xKey="label"
            series={kind === "count" ? COUNT_SERIES : AMOUNT_SERIES}
            format={kind === "count" ? count : won}
            height="fill"
            markMax
            xTickFormat={shortDay}
            xTickEvery={TICK_EVERY[period]}
            integerTicks={kind === "count"}
          />
        )}
      </CardBody>
    </Card>
  );
}

export function SellerDashboardPage(props: SellerNavProps) {
  const status = asStatus(useSearchParams().get("preview"));
  /* 지표·흐름·공지는 「빈 기간」이 없다 — `empty` 는 차트만 받는다(본사와 같다) */
  const countsStatus = status === "empty" ? "ready" : status;
  const { onNavSelect } = props;

  return (
    <SellerShell {...props} header={<PageHeader title="대시보드" />}>
      {/* 공지사항 — 고정 먼저 + 최근순 3건(원본 `noticeTop`) · 줄을 누르면 공지 상세 */}
      <Card variant="soft" aria-busy={isBusy(countsStatus)}>
        <CardHeader
          title="공지사항"
          action={
            <TextButton
              size="small"
              onClick={() => onNavSelect("/seller-notice")}
            >
              전체보기
            </TextButton>
          }
        />
        <CardBody className={dimWhile(countsStatus)}>
          <ul className="flex flex-col">
            {NOTICE_TOP.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => onNavSelect(`/seller-notice/${n.id}`)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-medium px-2 py-2 text-left transition-colors duration-100 hover:bg-surface-sub focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                >
                  <span className="w-10 shrink-0">
                    {n.pin && <Tag size="small">고정</Tag>}
                  </span>
                  <span className="body-medium min-w-0 flex-1 truncate text-text">
                    {n.title}
                  </span>
                  <span className="body-small shrink-0 text-text-sub tabular-nums">
                    {n.date}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <section aria-label="핵심 지표" className="grid grid-cols-3 gap-6">
        {METRIC_GROUPS.map((group) => (
          <Card key={group.id} variant="soft" aria-busy={isBusy(countsStatus)}>
            <CardHeader title={group.title} />
            <CardBody>
              <ul className="@container flex flex-col gap-2">
                {group.metrics.map((metric) => (
                  <li key={metric.label}>
                    <MetricRow
                      metric={metric}
                      status={countsStatus}
                      onOpen={() => onNavSelect(metric.navId)}
                    />
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ))}
      </section>

      <div className="grid flex-1 grid-cols-2 gap-6">
        <TrendCard title="내 매출 현황(건수)" kind="count" status={status} />
        <TrendCard title="내 매출 현황(금액)" kind="amount" status={status} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <FlowCard
          title="판매 관리"
          steps={SALE_FLOW}
          status={countsStatus}
          onNavSelect={onNavSelect}
        />
        <FlowCard
          title="렌트 관리"
          steps={RENT_FLOW}
          status={countsStatus}
          onNavSelect={onNavSelect}
        />
      </div>
    </SellerShell>
  );
}
