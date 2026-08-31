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
  CATEGORIES,
  CATEGORY_SERIES,
  CHANNELS,
  channelTotal,
  KPIS,
  manwon,
  people,
  PERIODS,
  REVENUE,
  REVENUE_SERIES,
  TOP_PRODUCTS,
  won,
} from "./DashboardPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "./gnbSections";

/* =========================================================================
 * 통계형 화면 템플릿 — 뼈대
 *
 * ## 화면 유형: 통계형
 * 핵심 지표를 한눈에 보여주고, 추이·구성비·순위를 차트와 표로 제시한다.
 * "지금 잘 되고 있는가"를 스크롤 없이 판단하게 하는 것이 목적이라,
 * 위에서 아래로 **요약 → 추이 → 분해** 순으로 내려간다.
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./DashboardPage.data.ts` 에 있다
 *
 * | 갈아끼울 것           | 위치                                             |
 * | --------------------- | ------------------------------------------------ |
 * | 데이터·라벨·단위      | `DashboardPage.data.ts` **전체**                 |
 * | KPI 4장의 지표        | 같은 파일의 `KPIS`                               |
 * | 차트 데이터·계열 이름 | 같은 파일의 `REVENUE*` · `CHANNELS` · `CATEGOR*` |
 * | 표 컬럼 구성          | 이 파일의 `<colgroup>` + `TableHead` + 본문 셀   |
 * | 차트 카드 제목·설명   | 이 파일의 `CardHeader`                           |
 * | 화면 제목             | `PageHeader` 의 `title`                          |
 * | 기간 기본값           | 이 파일의 `useState("12m")` (`PERIODS` 의 value) |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * KPI 4열 grid · 차트 2:1 grid · 차트+표 2열 grid · 도넛 옆 범례 목록 패턴 ·
 * 차트 색 인덱싱(`CHART_SERIES_COLORS[i]`, **문자열 조립 금지**) ·
 * 계열이 2개 이상이면 범례 필수(색만으로 식별하게 두지 않는다) ·
 * 증감을 색이 아니라 화살표+부호로 함께 전달하는 규칙
 *
 * > **네 화면 중 근거가 가장 약하다.** 아래 주석대로 원본에 통계 화면 선례가 없어
 * > 배치는 우리가 정한 것이다. 확정 규격이 아니라 **출발점**으로 쓸 것.
 * ====================================================================== */

/* -------------------------------------------------------------------------
 * 대시보드 (통계형) — Phase 8
 *
 * 아임웹 관리자 원본(`admin.html`)은 게스트 리다이렉트 페이지라 실제 마크업이 없고
 * (React CSR), Clay CSS 에도 통계 화면 선례가 없다. **이 화면은 재현이 아니라 설계다.**
 * 토큰·컴포넌트 레벨까지는 원본과 일치하지만 배치는 우리가 정한 것이다.
 *
 * ## CSS Grid 사용 `[확장]`
 * Clay 원본 CSS 7,835줄에 `display:grid` 는 단 1건(달력 캡션)이고 나머지는 전부
 * flex column 이다. 다만 KPI 4열·차트 2:1 배치는 flex 로 짜면 각 자식이 폭 계산을
 * 떠안아야 해서, 통계형 화면에 한해 grid 를 쓴다.
 * ---------------------------------------------------------------------- */

export interface DashboardPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function DashboardPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: DashboardPageProps) {
  const [period, setPeriod] = useState("12m");

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
          title="대시보드"
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
      {/* ── KPI ─────────────────────────────────────────────
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

      {/* ── 매출 추이 + 유입 채널 ───────────────────────────── */}
      <section aria-label="매출과 유입" className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          {/* CardHeader 에 설명 prop 은 없다 — 제목+설명은 children 으로 넣는다 */}
          <CardHeader>
            <div className="flex flex-col gap-1">
              <span className="heading-medium-bold text-text">매출 추이</span>
              <span className="body-small text-text-sub">
                올해와 지난해 같은 기간을 겹쳐 비교합니다
              </span>
            </div>
          </CardHeader>
          <CardBody>
            {/* 계열이 2개 이상이면 범례를 항상 둔다 — 색만으로 식별하게 두지 않는다 */}
            <ChartLegend series={REVENUE_SERIES} />
            <LineChart
              ariaLabel="월별 매출 추이. 올해와 지난해 비교"
              data={REVENUE}
              xKey="month"
              series={REVENUE_SERIES}
              format={manwon}
              height={260}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="유입 채널" />
          <CardBody>
            <DonutChart
              ariaLabel="채널별 방문자 구성비"
              data={CHANNELS}
              nameKey="name"
              valueKey="value"
              format={people}
              height={180}
              center={
                <>
                  <span className="body-small text-text-sub">전체 방문</span>
                  <strong className="heading-large-bold text-text">
                    {channelTotal.toLocaleString("ko-KR")}
                  </strong>
                </>
              }
            />
            {/* 도넛은 조각이 작아질수록 라벨을 못 얹으므로 범례가 곧 표 역할을 한다 */}
            <ul className="flex flex-col gap-2">
              {CHANNELS.map((c, i) => (
                <li key={c.name} className="flex items-center gap-2">
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
                  <span className="body-small text-text-sub">{c.name}</span>
                  <span className="body-small-bold ml-auto text-text">
                    {Math.round((c.value / channelTotal) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>

      {/* ── 카테고리별 매출 + 인기 상품 ─────────────────────── */}
      <section aria-label="카테고리와 상품" className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="카테고리별 매출" />
          <CardBody>
            <BarChart
              ariaLabel="카테고리별 매출"
              data={CATEGORIES}
              xKey="name"
              series={CATEGORY_SERIES}
              format={manwon}
              height={240}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="인기 상품 Top 5" />
          <CardBody>
            <Table>
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[48%]" />
                <col className="w-[18%]" />
                <col className="w-[24%]" />
              </colgroup>
              <TableHead>
                <TableRow>
                  <TableTh>순위</TableTh>
                  <TableTh>상품명</TableTh>
                  <TableTh>판매량</TableTh>
                  <TableTh>매출</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {TOP_PRODUCTS.map((p) => (
                  <TableRow key={p.rank}>
                    <TableTd>{p.rank}</TableTd>
                    <TableTd>
                      <span className="line-clamp-1">{p.name}</span>
                    </TableTd>
                    <TableTd>{p.qty.toLocaleString("ko-KR")}개</TableTd>
                    <TableTd>{won(p.amount)}</TableTd>
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
