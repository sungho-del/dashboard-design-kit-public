import { render, screen } from "@testing-library/react";
import {
  BarChart,
  CHART_FILL_COLORS,
  CHART_SERIES_COLORS,
  ChartFrame,
  ChartLegend,
  ChartTooltip,
  DonutChart,
  LineChart,
  type ChartSeries,
} from "./Chart";

/* -------------------------------------------------------------------------
 * jsdom 에서 Recharts 를 렌더시키기
 *
 * `ResponsiveContainer`(recharts 3) 는 두 가지를 요구한다.
 *
 * 1. **`ResizeObserver` 전역** — 없으면 크기 감지 effect 가 `noop` 으로 빠져나가
 *    컨테이너 크기가 초기값 `{-1,-1}` 에 머문다. 그러면 내부적으로
 *    `isAcceptableSize()` 가 false 가 되어 **children 을 통째로 null 로 반환**한다.
 *    (jsdom 에는 `ResizeObserver` 가 없다)
 * 2. **양수 `getBoundingClientRect()`** — effect 는 옵저버 콜백을 기다리지 않고
 *    먼저 `containerRef.current.getBoundingClientRect()` 를 읽어 크기를 세팅한다.
 *    jsdom 은 모든 요소에 0 을 돌려주므로 여기서도 차트가 사라진다.
 *    `offsetWidth/offsetHeight` 는 recharts 3 이 쓰지 않으므로 스텁하지 않는다.
 *
 * 그래서 옵저버는 no-op 으로 채우고, 사각형만 양수로 고정한다.
 * **좌표·경로(`d`)·축 눈금 텍스트는 검증하지 않는다** — 눈금은 텍스트 폭 실측
 * 결과로 솎아내지는데 jsdom 실측이 0 이라 마지막 한 개만 살아남는다.
 * ---------------------------------------------------------------------- */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const CONTAINER_WIDTH = 640;
const CONTAINER_HEIGHT = 240;

const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("IntersectionObserver", ObserverStub);
  Element.prototype.getBoundingClientRect = function () {
    return {
      width: CONTAINER_WIDTH,
      height: CONTAINER_HEIGHT,
      top: 0,
      left: 0,
      right: CONTAINER_WIDTH,
      bottom: CONTAINER_HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  };
});

afterAll(() => {
  vi.unstubAllGlobals();
  Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

/* -------------------------------------------------------------------------
 * 픽스처 — 이커머스 대시보드 맥락
 * ---------------------------------------------------------------------- */

const MONTHLY = [
  { month: "1월", revenue: 32_800_000, orders: 412 },
  { month: "2월", revenue: 29_400_000, orders: 386 },
  { month: "3월", revenue: 41_200_000, orders: 508 },
];

const SALES_SERIES: ChartSeries[] = [
  { key: "revenue", label: "매출" },
  { key: "orders", label: "주문 수" },
];

const CHANNELS = [
  { channel: "네이버 검색", value: 4820 },
  { channel: "인스타그램", value: 3160 },
  { channel: "직접 유입", value: 1940 },
];

/** 계열 6개 — 5개 초과 구간의 색 처리를 확인하기 위한 픽스처 */
const SIX_SERIES: ChartSeries[] = Array.from({ length: 6 }, (_, i) => ({
  key: `s${i}`,
  label: `계열 ${i + 1}`,
}));

const SIX_SERIES_DATA = [
  { month: "1월", s0: 10, s1: 20, s2: 30, s3: 40, s4: 50, s5: 60 },
  { month: "2월", s0: 12, s1: 22, s2: 32, s3: 42, s4: 52, s5: 62 },
];

/** `<li>` 안의 색 스와치(aria-hidden span)들의 배경색을 순서대로 뽑는다 */
function swatchColors(container: HTMLElement): (string | undefined)[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("li > span[aria-hidden]"),
  ).map((el) => el.style.backgroundColor);
}

/* -------------------------------------------------------------------------
 * 계열색 상수
 * ---------------------------------------------------------------------- */

describe("계열색 상수", () => {
  it("series·fill 은 각각 5종이고 짝이 맞는다", () => {
    expect(CHART_SERIES_COLORS).toHaveLength(5);
    expect(CHART_FILL_COLORS).toHaveLength(5);
    expect(CHART_FILL_COLORS).toHaveLength(CHART_SERIES_COLORS.length);
  });

  it("Tailwind 스캐너가 찾을 수 있도록 완전한 var() 문자열로 나열한다", () => {
    // 인덱스로 조립(`series-${i}`)하면 `@theme` 변수가 배포 CSS 에서 사라진다
    expect([...CHART_SERIES_COLORS]).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
      "var(--color-chart-series-3)",
      "var(--color-chart-series-4)",
      "var(--color-chart-series-5)",
    ]);
    expect([...CHART_FILL_COLORS]).toEqual([
      "var(--color-chart-fill-1)",
      "var(--color-chart-fill-2)",
      "var(--color-chart-fill-3)",
      "var(--color-chart-fill-4)",
      "var(--color-chart-fill-5)",
    ]);
  });

  it("하드코딩된 색이 아니라 전부 토큰 참조다", () => {
    for (const color of [...CHART_SERIES_COLORS, ...CHART_FILL_COLORS]) {
      expect(color).toMatch(/^var\(--color-chart-/);
    }
  });
});

/* -------------------------------------------------------------------------
 * ChartFrame
 * ---------------------------------------------------------------------- */

describe("ChartFrame", () => {
  it("SVG 내용은 스크린리더에 전달되지 않으므로 role=img + 이름을 붙인다", () => {
    render(
      <ChartFrame ariaLabel="월별 매출 추이">
        <LineChart
          data={MONTHLY}
          xKey="month"
          series={SALES_SERIES}
          ariaLabel="내부"
        />
      </ChartFrame>,
    );

    expect(
      screen.getByRole("img", { name: "월별 매출 추이" }),
    ).toBeInTheDocument();
  });

  it("가로를 꽉 채우고, className 은 뒤에 덧붙는다", () => {
    render(
      <ChartFrame ariaLabel="빈 프레임" className="mt-4">
        <LineChart data={[]} xKey="month" series={[]} ariaLabel="내부" />
      </ChartFrame>,
    );

    const classes = screen
      .getByRole("img", { name: "빈 프레임" })
      .className.split(/\s+/);

    expect(classes).toContain("w-full");
    expect(classes).toContain("mt-4");
  });

  it("height 기본값은 240 이고 prop 으로 바꿀 수 있다", () => {
    const { container, rerender } = render(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="기본 높이"
      />,
    );

    const responsive = () =>
      container.querySelector<HTMLElement>(".recharts-responsive-container");

    expect(responsive()?.style.height).toBe("240px");

    rerender(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        height={320}
        ariaLabel="큰 높이"
      />,
    );

    expect(responsive()?.style.height).toBe("320px");
  });
});

/* -------------------------------------------------------------------------
 * LineChart
 * ---------------------------------------------------------------------- */

describe("LineChart", () => {
  it("계열 수만큼 선을 그리고 계열색을 순서대로 입힌다", () => {
    const { container } = render(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="월별 매출"
      />,
    );

    const strokes = Array.from(
      container.querySelectorAll(".recharts-line-curve"),
    ).map((el) => el.getAttribute("stroke"));

    expect(strokes).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
    ]);
  });

  it("선 두께는 2 — 격자보다 데이터가 앞에 와야 한다", () => {
    const { container } = render(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={[SALES_SERIES[0]]}
        ariaLabel="월별 매출"
      />,
    );

    expect(
      container
        .querySelector(".recharts-line-curve")
        ?.getAttribute("stroke-width"),
    ).toBe("2");
  });

  it("area 를 켜면 선 대신 면을 그리고, 면은 옅은 fill 토큰을 쓴다", () => {
    const { container } = render(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={[SALES_SERIES[0]]}
        area
        ariaLabel="매출 추이"
      />,
    );

    expect(container.querySelectorAll(".recharts-line-curve")).toHaveLength(0);

    const areaShape = container.querySelector(".recharts-area-area");
    expect(areaShape?.getAttribute("fill")).toBe("var(--color-chart-fill-1)");

    // 면 위의 윤곽선은 같은 계열의 진한 색
    const areaCurve = container.querySelector(".recharts-area-curve");
    expect(areaCurve?.getAttribute("stroke")).toBe(
      "var(--color-chart-series-1)",
    );
  });

  it("격자는 가로선만 그리고 divide 토큰으로 눌러 둔다", () => {
    const { container } = render(
      <LineChart
        data={MONTHLY}
        xKey="month"
        series={[SALES_SERIES[0]]}
        ariaLabel="월별 매출"
      />,
    );

    expect(
      container.querySelectorAll(".recharts-cartesian-grid-vertical"),
    ).toHaveLength(0);

    const horizontal = container.querySelectorAll(
      ".recharts-cartesian-grid-horizontal line",
    );
    expect(horizontal.length).toBeGreaterThan(0);
    for (const line of horizontal) {
      expect(line.getAttribute("stroke")).toBe("var(--color-divide)");
    }
  });

  it("계열이 5를 넘으면 색을 되돌리지 않고 마지막 색에 고정한다", () => {
    const { container } = render(
      <LineChart
        data={SIX_SERIES_DATA}
        xKey="month"
        series={SIX_SERIES}
        ariaLabel="계열 6개"
      />,
    );

    const strokes = Array.from(
      container.querySelectorAll(".recharts-line-curve"),
    ).map((el) => el.getAttribute("stroke"));

    expect(strokes).toHaveLength(6);
    // 6번째가 1번 색으로 되돌아가면 1번 계열과 구분되지 않는다
    expect(strokes[5]).not.toBe("var(--color-chart-series-1)");
    expect(strokes[5]).toBe("var(--color-chart-series-5)");
  });
});

/* -------------------------------------------------------------------------
 * BarChart
 * ---------------------------------------------------------------------- */

describe("BarChart", () => {
  it("계열 수만큼 막대 레이어를, 데이터 수만큼 막대를 만든다", () => {
    const { container } = render(
      <BarChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="월별 비교"
      />,
    );

    expect(container.querySelectorAll(".recharts-bar")).toHaveLength(
      SALES_SERIES.length,
    );
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      SALES_SERIES.length * MONTHLY.length,
    );
  });

  it("stacked 를 켜도 계열·막대 수는 그대로다 (쌓기만 바뀐다)", () => {
    const { container } = render(
      <BarChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        stacked
        ariaLabel="월별 누적"
      />,
    );

    expect(container.querySelectorAll(".recharts-bar")).toHaveLength(
      SALES_SERIES.length,
    );
    expect(container.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      SALES_SERIES.length * MONTHLY.length,
    );
  });

  it("세로 격자는 그리지 않는다", () => {
    const { container } = render(
      <BarChart
        data={MONTHLY}
        xKey="month"
        series={[SALES_SERIES[0]]}
        ariaLabel="월별 비교"
      />,
    );

    expect(
      container.querySelectorAll(".recharts-cartesian-grid-vertical"),
    ).toHaveLength(0);
  });

  it("role=img 이름으로 찾을 수 있다", () => {
    render(
      <BarChart
        data={MONTHLY}
        xKey="month"
        series={SALES_SERIES}
        ariaLabel="월별 매출·주문 비교"
      />,
    );

    expect(
      screen.getByRole("img", { name: "월별 매출·주문 비교" }),
    ).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------
 * DonutChart
 * ---------------------------------------------------------------------- */

describe("DonutChart", () => {
  it("조각마다 계열색을 순서대로 입힌다", () => {
    const { container } = render(
      <DonutChart
        data={CHANNELS}
        nameKey="channel"
        valueKey="value"
        ariaLabel="유입 채널 구성비"
      />,
    );

    const fills = Array.from(
      container.querySelectorAll(".recharts-pie-sector path"),
    ).map((el) => el.getAttribute("fill"));

    expect(fills).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
      "var(--color-chart-series-3)",
    ]);
  });

  it("조각 사이에 표면색 2px 링을 둘러 경계를 만든다", () => {
    const { container } = render(
      <DonutChart
        data={CHANNELS}
        nameKey="channel"
        valueKey="value"
        ariaLabel="유입 채널 구성비"
      />,
    );

    const sector = container.querySelector(".recharts-pie-sector path");
    expect(sector?.getAttribute("stroke")).toBe("var(--color-surface)");
    expect(sector?.getAttribute("stroke-width")).toBe("2");
  });

  it("center 는 조각 위에 겹치되 클릭을 가로채지 않고 스크린리더에서 감춘다", () => {
    render(
      <DonutChart
        data={CHANNELS}
        nameKey="channel"
        valueKey="value"
        ariaLabel="유입 채널 구성비"
        center={<span className="heading-xlarge-bold text-text">9,920</span>}
      />,
    );

    const overlay = screen.getByText("9,920").parentElement;
    const classes = overlay?.className.split(/\s+/) ?? [];

    expect(classes).toContain("absolute");
    expect(classes).toContain("inset-0");
    // 도넛 조각의 호버·툴팁을 막지 않아야 한다
    expect(classes).toContain("pointer-events-none");
    expect(overlay).toHaveAttribute("aria-hidden");
  });

  it("center 를 주지 않으면 겹침 레이어 자체를 만들지 않는다", () => {
    const { container } = render(
      <DonutChart
        data={CHANNELS}
        nameKey="channel"
        valueKey="value"
        ariaLabel="유입 채널 구성비"
      />,
    );

    expect(container.querySelectorAll(".pointer-events-none")).toHaveLength(0);
  });
});

/* -------------------------------------------------------------------------
 * ChartTooltip — 순수 DOM 이라 ResponsiveContainer 없이 단독으로 검증한다
 * ---------------------------------------------------------------------- */

describe("ChartTooltip", () => {
  const PAYLOAD = [
    {
      name: "매출",
      value: 32_800_000,
      color: "var(--color-chart-series-1)",
      dataKey: "revenue",
    },
    {
      name: "주문 수",
      value: 412,
      color: "var(--color-chart-series-2)",
      dataKey: "orders",
    },
  ];

  it("active 가 아니면 아무것도 그리지 않는다", () => {
    const { container } = render(
      <ChartTooltip label="1월" payload={PAYLOAD} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("payload 가 비면 아무것도 그리지 않는다", () => {
    const { container } = render(
      <ChartTooltip active label="1월" payload={[]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("라벨과 계열별 이름·값을 모두 보여준다", () => {
    render(<ChartTooltip active label="1월" payload={PAYLOAD} />);

    expect(screen.getByText("1월")).toBeInTheDocument();
    expect(screen.getByText("매출")).toBeInTheDocument();
    expect(screen.getByText("32800000")).toBeInTheDocument();
    expect(screen.getByText("주문 수")).toBeInTheDocument();
    expect(screen.getByText("412")).toBeInTheDocument();
  });

  it("label 이 없으면 라벨 줄을 빼고 항목만 그린다", () => {
    const { container } = render(
      <ChartTooltip active payload={[PAYLOAD[0]]} />,
    );

    // 항목은 li 안에 있으므로, li 밖의 텍스트 줄이 없어야 한다
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(
      container.querySelectorAll(".rounded-medium > .body-small"),
    ).toHaveLength(0);
  });

  it("format 을 주면 값에만 적용한다", () => {
    render(
      <ChartTooltip
        active
        label="1월"
        payload={[PAYLOAD[0]]}
        format={(v) => `₩ ${Number(v).toLocaleString("ko-KR")}`}
      />,
    );

    expect(screen.getByText("₩ 32,800,000")).toBeInTheDocument();
    // 이름·라벨은 포맷 대상이 아니다
    expect(screen.getByText("매출")).toBeInTheDocument();
    expect(screen.getByText("1월")).toBeInTheDocument();
  });

  it("계열 키는 10px 원형이고 payload 색을 그대로 쓴다", () => {
    const { container } = render(
      <ChartTooltip active label="1월" payload={PAYLOAD} />,
    );

    expect(swatchColors(container)).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
    ]);

    const dot = container.querySelector<HTMLElement>("li > span[aria-hidden]");
    const classes = dot?.className.split(/\s+/) ?? [];
    expect(classes).toContain("size-2.5");
    expect(classes).toContain("rounded-full");
    expect(classes).toContain("shrink-0");
  });

  it("경계는 border 가 아니라 음수 offset outline 으로 그린다", () => {
    const { container } = render(
      <ChartTooltip active label="1월" payload={PAYLOAD} />,
    );

    const panel = container.firstElementChild as HTMLElement;
    const classes = panel.className.split(/\s+/);

    expect(classes).toContain("outline-1");
    expect(classes).toContain("-outline-offset-1");
    expect(classes).toContain("outline-border");
    // border 계열 클래스가 섞이면 레이아웃이 1px 밀린다
    expect(classes).not.toContain("border");
    expect(classes).not.toContain("border-border");
  });

  it("팝오버 규격 — surface 배경 · rounded-medium · padding 16 · gap 8", () => {
    const { container } = render(
      <ChartTooltip active label="1월" payload={PAYLOAD} />,
    );

    const classes = (
      container.firstElementChild as HTMLElement
    ).className.split(/\s+/);

    expect(classes).toContain("bg-surface");
    expect(classes).toContain("rounded-medium");
    expect(classes).toContain("shadow-popover");
    expect(classes).toContain("p-4");
    expect(classes).toContain("gap-2");
    // 참조값 2px(rounded-small)이 아니라 Clay 8px 을 쓴다
    expect(classes).not.toContain("rounded-small");
  });
});

/* -------------------------------------------------------------------------
 * ChartLegend — 순수 DOM
 * ---------------------------------------------------------------------- */

describe("ChartLegend", () => {
  it("계열 라벨을 목록으로 노출한다", () => {
    render(<ChartLegend series={SALES_SERIES} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items.map((li) => li.textContent)).toEqual(["매출", "주문 수"]);
  });

  it("스와치는 16×16 · rounded-small 이고 계열색을 순서대로 쓴다", () => {
    const { container } = render(<ChartLegend series={SALES_SERIES} />);

    expect(swatchColors(container)).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
    ]);

    const swatch = container.querySelector<HTMLElement>(
      "li > span[aria-hidden]",
    );
    const classes = swatch?.className.split(/\s+/) ?? [];
    expect(classes).toContain("size-4");
    expect(classes).toContain("rounded-small");
    expect(classes).toContain("shrink-0");
    // 툴팁의 원형 점(size-2.5/rounded-full)과 규격이 다르다
    expect(classes).not.toContain("size-2.5");
    expect(classes).not.toContain("rounded-full");
  });

  it("colors 를 주면 계열색 대신 그 색을 쓴다 (도넛 조각용)", () => {
    const { container } = render(
      <ChartLegend
        series={SALES_SERIES}
        colors={["var(--color-chart-fill-1)", "var(--color-chart-fill-2)"]}
      />,
    );

    expect(swatchColors(container)).toEqual([
      "var(--color-chart-fill-1)",
      "var(--color-chart-fill-2)",
    ]);
  });

  it("colors 가 계열보다 짧으면 모자란 자리는 기본 계열색으로 채운다", () => {
    const { container } = render(
      <ChartLegend
        series={SALES_SERIES}
        colors={["var(--color-chart-fill-1)"]}
      />,
    );

    expect(swatchColors(container)).toEqual([
      "var(--color-chart-fill-1)",
      "var(--color-chart-series-2)",
    ]);
  });

  it("계열이 5를 넘으면 색을 순환시키지 않고 마지막 색에 고정한다", () => {
    const { container } = render(<ChartLegend series={SIX_SERIES} />);

    const colors = swatchColors(container);
    expect(colors).toHaveLength(6);
    expect(colors).toEqual([
      "var(--color-chart-series-1)",
      "var(--color-chart-series-2)",
      "var(--color-chart-series-3)",
      "var(--color-chart-series-4)",
      "var(--color-chart-series-5)",
      // 6번째가 1번 색으로 돌아가면 계열을 구분할 수 없다
      "var(--color-chart-series-5)",
    ]);
  });

  it("가로로 흐르고 넘치면 줄바꿈한다 · className 은 뒤에 덧붙는다", () => {
    const { container } = render(
      <ChartLegend series={SALES_SERIES} className="mt-4" />,
    );

    const classes = (
      container.firstElementChild as HTMLElement
    ).className.split(/\s+/);

    expect(classes).toContain("flex");
    expect(classes).toContain("flex-wrap");
    expect(classes).toContain("items-center");
    expect(classes).toContain("gap-4");
    expect(classes).toContain("mt-4");
  });

  it("색 스와치는 스크린리더에서 감춘다 — 라벨이 이미 이름을 말한다", () => {
    const { container } = render(<ChartLegend series={SALES_SERIES} />);

    for (const swatch of container.querySelectorAll("li > span[aria-hidden]")) {
      expect(swatch).toHaveAttribute("aria-hidden");
    }
  });
});
