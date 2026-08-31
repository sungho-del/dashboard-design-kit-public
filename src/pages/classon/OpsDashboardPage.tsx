import { useState } from "react";
import {
  AppShell,
  Card,
  CardBody,
  CardHeader,
  Gnb,
  LineChart,
  PageHeader,
  ProgressBar,
  SegmentedControl,
  StatTile,
} from "../../components/ui";
import {
  COMPLETION_WARNING_TEXT,
  completionTone,
  DEFAULT_PERIOD,
  ENROLLMENT_SERIES,
  KPIS,
  people,
  PERIODS,
  pct,
  TOP_COURSES,
  trendAriaLabel,
  trendFor,
  trendTotal,
} from "./OpsDashboardPage.data";
import { GNB_LOGO_SLOTS, GNB_SECTIONS } from "../gnbSections";

/* =========================================================================
 * S01 운영 대시보드 (클래스온 — 온라인 강의 플랫폼 운영 어드민) — 뼈대
 *
 * ## 화면 유형: 통계형 (템플릿 원형 `src/pages/DashboardPage.tsx`)
 * "지금 몇 명이 어디까지 왔는가"를 스크롤 없이 판단하게 한다.
 * 위에서 아래로 **요약(지표 4장) → 추이(선) → 분해(강의별 완주율)** 순으로 내려간다.
 *
 * ## 구성은 기획서 sections 그대로다
 *
 * ```
 * 핵심 지표 4종 (총 수강생 · 진행 중 강의 · 이번 달 매출 · 평균 완주율)   ← F01
 * 수강 추이 (최근 12주 신규 등록 · 선 그래프 · 기간 4주/12주/6개월)      ← F02
 * 강의별 완주 현황 (상위 5개 · 강의명 · 수강생 수 · 완주율 가로 막대)     ← F03
 * ```
 *
 * ## 이 파일은 도메인을 모른다 — 도메인은 `./OpsDashboardPage.data.ts` 에 있다
 *
 * | 갈아끼울 것            | 위치                                      |
 * | ---------------------- | ----------------------------------------- |
 * | 데이터·라벨·단위       | `OpsDashboardPage.data.ts` **전체**       |
 * | KPI 4장                | 같은 파일의 `KPIS`                        |
 * | 추이 데이터·기간       | `WEEKLY/MONTHLY_ENROLLMENTS` · `PERIODS`  |
 * | 완주율 목록·임계 판정  | `TOP_COURSES` · `completionTone`          |
 * | 화면 제목              | 이 파일의 `PageHeader` 의 `title`         |
 *
 * ## 그대로 두는 것 (도메인 무관)
 * KPI 4열 grid · 차트 2:1 grid · 증감을 색이 아니라 화살표+부호로 함께 전달하는 규칙 ·
 * 완주율 목록의 **두 줄 배치**(아래) · 기간 초기값을 데이터에서 받는 것
 *
 * ## ⚠️ KPI 는 `StatTile variant="card"` 다 — `Card`+`CardBody` 로 직접 짜지 말 것
 * 증감의 **부호·아이콘·색**을 `StatTile` 이 책임진다. 호출부가 `Tag` 를 조립하던 때는
 * 5개 화면이 같은 코드를 복붙했고 그 색이 틴트 배경 위에서 명암비 미달이었다(§D6-5).
 *
 * ## ⚠️ 완주율 막대는 강의명·수강생 수와 **다른 줄**에 둔다
 * 한 줄에 놓으면 강의명 길이가 막대의 시작 x 좌표를 바꿔 **5개 행의 막대 길이 비교가
 * 무너진다.** 이름은 위 줄, 막대는 아래 줄 — 모든 막대가 카드 폭 전체를 기준으로 그려진다.
 * (표 안에서는 `colgroup` 이 폭을 고정하므로 셀 안에 그대로 둔다 — S02 가 그 경우다)
 * ====================================================================== */

export interface OpsDashboardPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (id: string) => void;
}

export function OpsDashboardPage({
  navOpen,
  onNavOpenChange,
  activeNav,
  onNavSelect,
}: OpsDashboardPageProps) {
  /* 초기값을 데이터에서 받는다 — 뼈대에 문자열을 박으면 `PERIODS` 를 고칠 때
     세그먼트에 활성 항목이 없는 채로 렌더된다(타입으로는 안 잡힌다) */
  const [period, setPeriod] = useState(DEFAULT_PERIOD);

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
      header={<PageHeader title="운영 대시보드" />}
    >
      {/* ── 핵심 지표 (F01) ─────────────────────────────────
          숫자 자체가 주인공이라 차트가 아니라 지표 타일로 둔다. */}
      <section aria-label="핵심 지표" className="grid grid-cols-4 gap-6">
        {KPIS.map(
          ({ label, value, unit, delta, caption, up, good, icon: Icon }) => (
            /*
              ⚠️ **아이콘은 `up`(방향), 색은 `good`(좋고 나쁨)** — 다른 축이다.
              이 화면에서는 '평균 완주율 -2.1%p' 가 그 자리다: 내려갔고(↓) 나쁜 소식(빨강).
              `good` 을 `up` 으로 복사하면 초록으로 나가 화면이 거짓말을 한다.
              비교 기준(`caption`)도 카드마다 다르다 — 앞 3장은 월, 완주율은 분기다.
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

      {/* ── 수강 추이 (F02) + 강의별 완주 현황 (F03) ───────── */}
      <section
        aria-label="수강 추이와 완주 현황"
        className="grid grid-cols-3 gap-6"
      >
        <Card className="col-span-2">
          <CardHeader
            title="수강 추이"
            /* 기간은 이 차트에만 걸린다 — 페이지 헤더가 아니라 카드가 든다 */
            action={
              /*
                `role="radiogroup"` 에 이름을 준다 — 카드 제목은 시각적으로만 이 묶음과
                이어져 있어서, 이름이 없으면 스크린리더에 "라디오 그룹"으로만 들린다.
              */
              <SegmentedControl
                aria-label="수강 추이 기간"
                items={PERIODS}
                value={period}
                onValueChange={setPeriod}
              />
            }
          />
          <CardBody>
            {/* 합계는 뼈대가 세지 않는다 — 기간이 바뀌면 데이터가 다시 계산해 준다 */}
            <p className="body-small text-text-sub">
              선택한 기간 신규 등록 {people(trendTotal(period))}
            </p>
            {/*
              계열이 하나뿐이라 범례를 두지 않는다(2개 이상일 때만 필수 · §3-3).
              접근가능 이름은 기간에 따라 바뀐다 — SVG 는 내용이 전달되지 않으므로
              이 문장이 곧 차트의 내용이다(§28-4).
            */}
            <LineChart
              ariaLabel={trendAriaLabel(period)}
              data={trendFor(period)}
              xKey="label"
              series={ENROLLMENT_SERIES}
              format={people}
              height={260}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            {/* 제목 + 보조 설명은 children 으로 넣는다 (CardHeader 에 설명 prop 이 없다) */}
            <div className="flex flex-col gap-1">
              <span className="heading-medium-bold text-text">
                강의별 완주 현황
              </span>
              {/*
                모집단을 밝힌다. 위 KPI 의 '평균 완주율 62.4%' 는 전체 24개 강의 평균이고
                여기 5개는 수강생 수 상위 5개라 값이 다르다 — 밝히지 않으면 같은 수치를
                두 번 말한 것처럼 읽혀 화면이 모순돼 보인다.
              */}
              <span className="body-small text-text-sub">
                수강생 수 상위 5개 강의
              </span>
            </div>
          </CardHeader>
          <CardBody>
            <ul className="flex flex-col gap-4">
              {TOP_COURSES.map((course) => (
                <li key={course.id} className="flex flex-col gap-2">
                  {/* ① 이름과 수강생 수 — 막대와 다른 줄이다(위 주석 참고) */}
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="label-medium line-clamp-1 text-text">
                      {course.name}
                    </span>
                    <span className="body-small shrink-0 text-text-sub">
                      {people(course.students)}
                    </span>
                  </div>
                  {/*
                    ② 완주율 막대. 열 머리글이 없는 목록이라 **이름에 주어를 붙인다** —
                    없으면 스크린리더에 "진행률 표시줄 78%" 만 들려 무엇의 78% 인지 모른다.
                    임계(40% 미만)는 부품이 아니라 데이터가 판정한다.
                  */}
                  <ProgressBar
                    value={course.rate}
                    ariaLabel={`${course.name} 완주율`}
                    valueText={pct(course.rate)}
                    tone={completionTone(course.rate)}
                    warningText={COMPLETION_WARNING_TEXT}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
