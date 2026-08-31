import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";
import {
  AppShell,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  CHART_SERIES_COLORS,
  ChartLegend,
  DonutChart,
  Gnb,
  LineChart,
  PageHeader,
  SegmentedControl,
  StatTile,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../components/ui";
import {
  count,
  DEPARTMENTS,
  departmentTotal,
  HOURLY_RESERVATIONS,
  HOURLY_SERIES,
  KPIS,
  minutes,
  PERIODS,
  RESERVATION_TREND,
  RESERVATION_TREND_SERIES,
  WAITING_DEPARTMENTS,
} from "./ClinicStatusPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";

/* =========================================================================
 * 진료 현황 (S03) — 통계형
 *
 * ## 화면 유형: 통계형
 * 오늘 진료가 어떻게 돌아가는지를 스크롤 없이 판단하게 한다.
 * 위에서 아래로 **요약(KPI) → 추이 → 분해(구성비·시간대·대기 순위)** 순으로 내려간다.
 * 원장·진료의가 진료 사이사이 짧게 확인하는 화면이라 첫 화면에 다 들어와야 한다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./ClinicStatusPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                               |
 * | --------------------- | -------------------------------------------------- |
 * | 데이터·라벨·단위      | `ClinicStatusPage.data.ts` **전체**                |
 * | KPI 4장의 지표        | 같은 파일의 `KPIS`                                 |
 * | 차트 데이터·계열 이름 | 같은 파일의 `RESERVATION_TREND*` · `DEPARTMENTS` … |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀     |
 * | 차트 카드 제목·설명   | 이 파일의 `CardHeader`                             |
 * | 화면 제목             | `PageHeader` 의 `title`                            |
 * | 기간 기본값           | 이 파일의 `useState("14d")` (`PERIODS` 의 value)   |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * KPI 4열 grid · 차트 2:1 grid · 차트+표 2열 grid · 도넛 옆 범례 목록 패턴 ·
 * 차트 색 인덱싱(`CHART_SERIES_COLORS[i]`, **문자열 조립 금지**) ·
 * 계열이 2개 이상이면 범례 필수 · 증감을 색이 아니라 화살표+부호로 함께 전달하는 규칙
 *
 * ## 템플릿(`DashboardPage`)과 의도적으로 다른 곳
 * - **KPI 캡션이 카드마다 다르다.** 템플릿은 "지난 기간 대비" 한 문구를 4장이 공유하는데,
 *   병원 지표는 비교 기준이 제각각이다(당일 / 최근 30일 / 최근 7일 평균).
 *   한 문구로 묶으면 노쇼율 4.2%(최근 30일)가 오늘 건수와 비교되는 것처럼 읽혀
 *   **숫자가 서로 모순되는 화면**이 된다 → `KPIS[].caption` 으로 데이터에서 받는다
 * - 기간 세그먼트는 템플릿과 같이 **표시 전용**이다 — 값을 바꿔도 차트가 바뀌지 않는다.
 *   기본값을 `"14d"` 로 둬서 선택된 기간과 라인 차트의 14일 구간이 어긋나지 않게 맞췄다
 * ====================================================================== */

export interface ClinicStatusPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function ClinicStatusPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: ClinicStatusPageProps) {
  /*
    ⚠️ 초기값은 반드시 `PERIODS[].value` 중 하나여야 한다.
    문자열이라 타입 검사가 잡지 못하고, 어긋나면 SegmentedControl 에
    **활성 항목이 없는 채로** 조용히 렌더된다.
  */
  const [period, setPeriod] = useState("14d");

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
        <PageHeader
          title="진료 현황"
          actions={
            <>
              <SegmentedControl
                items={PERIODS}
                value={period}
                onValueChange={setPeriod}
              />
              <Button variant="secondary">
                <ArrowDownToLine size={16} strokeWidth={1.2} aria-hidden />
                리포트 받기
              </Button>
            </>
          }
        />
      }
    >
      {/* ── 핵심 지표 ───────────────────────────────────────
          숫자 자체가 주인공이라 차트가 아니라 stat tile 로 둔다. */}
      <section aria-label="핵심 지표" className="grid grid-cols-4 gap-6">
        {KPIS.map(
          ({ label, value, unit, delta, caption, up, good, icon: Icon }) => (
            /*
            ⚠️ **아이콘은 `up`(방향), 색은 `good`(좋고 나쁨)** — 다른 축이다.
            내려가면 좋은 지표가 있어서(노쇼율·이탈률·확정 대기), 하나로 겸용하면
            화살표는 ↓인데 색이 빨강으로 나가 화면이 거짓말을 한다.
            비교 기준(`caption`)도 지표마다 다르다 — 데이터가 카드마다 들고 온다.
          */
            <StatTile
              key={label}
              variant="card"
              label={label}
              value={value}
              unit={unit}
              icon={<Icon size={20} strokeWidth={1.2} aria-hidden />}
              caption={caption}
              delta={{ text: delta, up, good }}
            />
          ),
        )}
      </section>

      {/* ── 예약 추이 + 진료과 구성비 ───────────────────────── */}
      <section
        aria-label="예약 추이와 진료과"
        className="grid grid-cols-3 gap-6"
      >
        <Card className="col-span-2">
          {/* CardHeader 에 설명 prop 은 없다 — 제목+설명은 children 으로 넣는다 */}
          <CardHeader>
            <div className="flex flex-col gap-1">
              <span className="heading-medium-bold text-text">예약 추이</span>
              <span className="body-small text-text-sub">
                최근 14일 예약 건수와 진료 완료 건수를 겹쳐 비교합니다
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {/* 계열이 2개 이상이면 범례를 항상 둔다 — 색만으로 식별하게 두지 않는다 */}
            <ChartLegend series={RESERVATION_TREND_SERIES} />
            <LineChart
              ariaLabel="최근 14일 예약 추이. 예약과 진료 완료 비교"
              data={RESERVATION_TREND}
              xKey="date"
              series={RESERVATION_TREND_SERIES}
              format={count}
              height={260}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="진료과 구성비" />
          <CardBody>
            <DonutChart
              ariaLabel="진료과별 예약 구성비"
              data={DEPARTMENTS}
              nameKey="name"
              valueKey="value"
              format={count}
              height={180}
              center={
                <>
                  <span className="body-small text-text-sub">오늘 예약</span>
                  <strong className="heading-large-bold text-text">
                    {departmentTotal.toLocaleString("ko-KR")}
                  </strong>
                </>
              }
            />
            {/* 도넛은 조각이 작아질수록 라벨을 못 얹으므로 이 목록이 곧 범례 역할을 한다 */}
            <ul className="flex flex-col gap-2">
              {DEPARTMENTS.map((department, i) => (
                <li key={department.name} className="flex items-center gap-2">
                  {/*
                    색은 반드시 `CHART_SERIES_COLORS` 배열에서 꺼내 쓴다.
                    `var(--color-chart-series-${i})` 처럼 조립하면 Tailwind 스캔이
                    변수를 발견하지 못해 배포 CSS 에서 통째로 사라진다.
                  */}
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_SERIES_COLORS[
                          Math.min(i, CHART_SERIES_COLORS.length - 1)
                        ],
                    }}
                    aria-hidden
                  />
                  <span className="body-small text-text-sub">
                    {department.name}
                  </span>
                  <span className="body-small-bold ml-auto text-text">
                    {Math.round((department.value / departmentTotal) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* ── 시간대별 예약 + 대기 상위 진료과 ────────────────── */}
      <section aria-label="시간대와 대기" className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="시간대별 예약" />
          <CardBody>
            {/*
              8구간(09~12 · 14~17시)을 그대로 둔다. 단일 계열 막대는 계열 인덱스로
              색을 고르므로 막대가 몇 개든 전부 같은 색이다 — 도넛의 5개 제한이
              여기엔 걸리지 않는다. 13시는 점심시간이라 진료가 없어 구간에서 뺐다.
            */}
            <BarChart
              ariaLabel="시간대별 예약 건수"
              data={HOURLY_RESERVATIONS}
              xKey="hour"
              series={HOURLY_SERIES}
              format={count}
              height={240}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="대기 상위 진료과" />
          <CardBody>
            <Table>
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[40%]" />
                <col className="w-[22%]" />
                <col className="w-[28%]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableTh>순위</TableTh>
                  <TableTh>진료과</TableTh>
                  <TableTh>대기 인원</TableTh>
                  <TableTh>평균 대기</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {WAITING_DEPARTMENTS.map((department) => (
                  <TableRow key={department.rank}>
                    <TableTd>{department.rank}</TableTd>
                    <TableTd>
                      <span className="line-clamp-1">{department.name}</span>
                    </TableTd>
                    <TableTd>{department.waiting}명</TableTd>
                    <TableTd>{minutes(department.wait)}</TableTd>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
