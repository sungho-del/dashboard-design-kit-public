import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { ProgressBar } from "./ProgressBar";
import { Card, CardBody, CardHeader } from "../Card";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "../Table";

const meta = {
  title: "Components/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
  argTypes: {
    value: { control: { type: "range", min: 0, max: 100, step: 0.1 } },
    tone: { control: "inline-radio", options: ["default", "warning"] },
    showValue: { control: "boolean" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "전체 대비 현재 위치를 **가로 막대 하나와 숫자 하나**로 말한다. " +
          "규격: `docs/DESIGN.md` §26 ← §19(FileUpload 진행바) 실측. " +
          "라벨·이름은 담지 않는다 — 그것은 표의 다른 열이거나 카드 제목이다. " +
          "상호작용하지 않으므로 탭이 서지 않고, 어느 조건에서도 버튼이 되지 않는다.",
      },
    },
  },
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 값은 반올림해 `%` 와 한 덩어리로 붙는다 */
export const Default: Story = {
  args: { value: 62, ariaLabel: "React 입문 완주율" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/**
 * 주의 — **막대 색 · 아이콘 · 낭독 문구 세 채널**로 전달한다.
 *
 * 값 글자색은 바꾸지 않는다. `text-warning`(mustard-600)은 흰 배경 2.85:1 로
 * 본문 기준에 미달하기 때문이다. 막대에는 전용 토큰 `progress-warning`(mustard-700,
 * 트랙 위 3.66:1)을 쓴다.
 */
export const Warning: Story = {
  args: { value: 18, ariaLabel: "SQL 기초 완주율", tone: "warning" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/** 0% — 트랙만 남고 필은 렌더되지 않는다. **미집계가 아니라 "시작 안 함"이다** */
export const Zero: Story = {
  args: { value: 0, ariaLabel: "머신러닝 심화 완주율" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/** 1% — 필의 최소 폭이 트랙 높이(4)만큼 보장돼 `0%` 와 구별된다 */
export const NearZero: Story = {
  args: { value: 1, ariaLabel: "타입스크립트 완주율" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/** 100% */
export const Complete: Story = {
  args: { value: 100, ariaLabel: "HTML/CSS 완주율" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/** 값 숨김 — 옆 열이 이미 숫자를 말하고 있을 때. 낭독에는 그대로 남는다 */
export const WithoutValue: Story = {
  args: { value: 74, ariaLabel: "디자인 시스템 완주율", showValue: false },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/** 표기 덮어쓰기 — 소수·분수 등 도메인이 정한 표기를 쓴다 */
export const CustomValueText: Story = {
  args: {
    value: 62.4,
    ariaLabel: "React 입문 완주율",
    valueText: "62.4%",
  },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
};

/**
 * S01 대시보드 — 강의별 완주 현황.
 *
 * 값 슬롯이 고정이라 **막대의 끝 x 좌표가 행마다 같다.** 그래서 길이 비교가 성립한다.
 * 임계(여기서는 30% 미만)는 **화면이 판정하고** 부품은 결과인 `tone` 만 받는다.
 */
export const InCard: Story = {
  args: { value: 62, ariaLabel: "React 입문 완주율" },
  render: () => {
    const courses = [
      { name: "React 입문", rate: 82 },
      { name: "타입스크립트 실전", rate: 61 },
      { name: "SQL 기초", rate: 18 },
      { name: "머신러닝 심화", rate: 0 },
    ];
    return (
      <div className="w-120">
        <Card>
          <CardHeader title="강의별 완주 현황" />
          <CardBody>
            <ul className="flex flex-col gap-4">
              {courses.map((course) => (
                <li key={course.name} className="flex flex-col gap-2">
                  <span className="body-medium text-text">{course.name}</span>
                  <ProgressBar
                    value={course.rate}
                    ariaLabel={`${course.name} 완주율`}
                    tone={course.rate < 30 ? "warning" : "default"}
                  />
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    );
  },
};

/**
 * S02 표 — 진도율 컬럼(셀 안 인라인).
 *
 * **이 표에는 임계가 없다.** 진도율이 낮은 것은 아직 수강 중이라는 뜻이지 문제가
 * 아니다 — 그래서 `tone` 을 넘기지 않는다. 임계를 부품에 박아 두었다면
 * 여기서 쓸 수 없었을 것이다.
 *
 * 미집계 행은 컴포넌트를 렌더하지 않고 `—` 를 둔다. **0% 와 "모름"은 다른 말이다.**
 */
export const InTableCell: Story = {
  args: { value: 62, ariaLabel: "진도율" },
  render: () => {
    const rows = [
      { name: "김서연", course: "React 입문", rate: 92 },
      { name: "박도윤", course: "SQL 기초", rate: 47.5 },
      { name: "이하늘", course: "타입스크립트 실전", rate: 8 },
      { name: "정민재", course: "머신러닝 심화", rate: null },
    ];
    return (
      <div className="w-150">
        <Table>
          <TableHead>
            <TableRow>
              <TableTh>수강생</TableTh>
              <TableTh>강의</TableTh>
              <TableTh className="w-52">진도율</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.name}>
                <TableTd>{row.name}</TableTd>
                <TableTd>{row.course}</TableTd>
                <TableTd>
                  {row.rate === null ? (
                    <span className="text-text-minimal">—</span>
                  ) : (
                    <ProgressBar
                      value={row.rate}
                      ariaLabel={`${row.name} 진도율`}
                      valueText={`${row.rate}%`}
                    />
                  )}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};

/**
 * 접근성 — 이름·범위·낭독 문자열을 확인한다.
 *
 * `warning` 이면 낭독 문자열 뒤에 `warningText` 가 붙어 **색과 아이콘 없이도**
 * 경고가 귀로 전달된다.
 */
export const A11y: Story = {
  args: { value: 18.6, ariaLabel: "SQL 기초 완주율", tone: "warning" },
  render: (args) => (
    <div className="w-80">
      <ProgressBar {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("progressbar", { name: "SQL 기초 완주율" });

    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "100");
    /* 반올림하지 않는다 — 보이는 글자와 낭독 값은 별개다 */
    await expect(bar).toHaveAttribute("aria-valuenow", "18.6");
    await expect(bar).toHaveAttribute("aria-valuetext", "19% 주의");
    await expect(canvas.getByText("19%")).toBeInTheDocument();
  },
};
