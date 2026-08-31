import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardPage } from "./DashboardPage";

/* -------------------------------------------------------------------------
 * 대시보드 화면
 *
 * ## jsdom 에서 Recharts 를 렌더시키기 (Chart.test.tsx 와 같은 스텁)
 *
 * `ResponsiveContainer`(recharts 3) 는 두 가지를 요구한다.
 *
 * 1. **`ResizeObserver` 전역** — 없으면 크기 감지 effect 가 그대로 빠져나가
 *    컨테이너 크기가 초기값 `{-1,-1}` 에 머물고, `isAcceptableSize()` 가 false 가 되어
 *    **children 을 통째로 null 로 반환**한다. 즉 차트가 통째로 사라진다.
 * 2. **양수 `getBoundingClientRect()`** — effect 는 옵저버 콜백을 기다리지 않고 먼저
 *    `containerRef.current.getBoundingClientRect()` 를 **동기적으로** 읽어 초기 크기를 잡는다.
 *    jsdom 은 모든 요소에 0 을 돌려주므로 여기서도 차트가 사라진다.
 *
 * **검증하지 않는 것**: 경로 `d`·좌표(레이아웃이 없다) · 축 눈금 텍스트(눈금은 텍스트 폭
 * 실측으로 솎아내는데 jsdom 실측이 0 이라 마지막 한 개만 살아남는다) · 막대 fill
 * (진입 애니메이션이 끝나지 않아 내부 도형이 아직 없다).
 * 이 화면에서 우리가 지켜야 할 계약은 좌표가 아니라 **접근가능 이름·범례·수치 요약**이다.
 *
 * `useToast()` 를 쓰지 않으므로 `ToastProvider` 는 필요 없다 (다른 두 페이지와 다른 점).
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
const CONTAINER_HEIGHT = 260;

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

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();

  render(
    <DashboardPage
      navOpen
      onNavOpenChange={onNavOpenChange}
      activeNav="dashboard"
      onNavSelect={onNavSelect}
    />,
  );

  return { onNavSelect, onNavOpenChange };
}

/**
 * 값과 단위가 **갈라져 렌더되는 지표 수치**를 한 덩어리로 찾는다.
 *
 * `StatTile` 은 규격(§D3-3)대로 값(`<strong>`)과 단위(`<span>`)를 별개 요소로 낸다 —
 * 단위를 값에 붙여 쓰면 단위까지 30px 이 되어 자릿수가 안 읽히기 때문이다.
 * 그래서 `getByText("42건")` 은 매칭되지 않는다. 두 조각을 감싼 바깥 `<span>` 의
 * 결합 텍스트로 찾아, **값과 단위가 나란히 있는지**까지 함께 검증한다.
 */
const statText = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === "SPAN" && el.textContent?.replace(/\s+/g, "") === text;

describe("DashboardPage", () => {
  describe("KPI", () => {
    it("핵심 지표 4장을 라벨·수치·증감과 함께 보여준다", () => {
      renderPage();

      const kpi = screen.getByRole("region", { name: "핵심 지표" });

      const rows: [string, string, string][] = [
        ["총 매출", "9,240만원", "+18.2%"],
        ["주문 수", "1,284건", "+12.4%"],
        ["방문자", "12,620명", "+6.8%"],
        ["결제 전환율", "3.42%", "-0.4%"],
      ];

      for (const [label, value, delta] of rows) {
        expect(within(kpi).getByText(label)).toBeVisible();
        expect(within(kpi).getByText(statText(value))).toBeVisible();
        // 증감은 색만으로 전달하지 않는다 — 부호가 붙은 텍스트가 함께 있어야 한다
        expect(within(kpi).getByText(delta)).toBeVisible();
      }
    });
  });

  /**
   * SVG 는 내용이 스크린리더에 전달되지 않는다. `ChartFrame` 이 씌우는
   * `role="img"` + 이름이 유일한 전달 경로라, 이름이 빠지면 차트는 통째로 침묵한다.
   */
  describe("차트 접근가능 이름", () => {
    it("라인·도넛·막대 세 차트가 각자 이름을 갖는다", () => {
      renderPage();

      expect(
        screen.getByRole("img", { name: "월별 매출 추이. 올해와 지난해 비교" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "채널별 방문자 구성비" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "카테고리별 매출" }),
      ).toBeInTheDocument();
    });

    it("차트 내부에 실제로 SVG 가 그려진다", () => {
      // 스텁이 빠지면 ResponsiveContainer 가 children 을 null 로 반환해
      // role=img 껍데기만 남는다 — 그 회귀를 여기서 잡는다
      renderPage();

      const line = screen.getByRole("img", {
        name: "월별 매출 추이. 올해와 지난해 비교",
      });
      expect(line.querySelector("svg")).not.toBeNull();
    });
  });

  /** 계열이 2개 이상이면 범례를 항상 둔다 — 색만으로 식별하게 두지 않는다 */
  describe("범례", () => {
    it("매출 추이에 올해·지난해 범례가 보인다", () => {
      renderPage();

      expect(screen.getByText("올해")).toBeVisible();
      expect(screen.getByText("지난해")).toBeVisible();
    });
  });

  /**
   * 도넛은 조각이 작아질수록 라벨을 얹지 못하므로 옆의 목록이 곧 표 역할을 한다.
   * 퍼센트는 `value / 전체(12,620) * 100` 을 반올림한 값이다.
   */
  describe("유입 채널 목록", () => {
    it("채널 5개를 계산된 퍼센트와 함께 나열한다", () => {
      renderPage();

      const list = screen.getByText("검색 유입").closest("ul") as HTMLElement;
      const items = within(list).getAllByRole("listitem");

      expect(items).toHaveLength(5);
      // 4820/3140/2460/1580/620 ÷ 12620 → 38/25/19/13/5
      expect(items.map((li) => li.textContent)).toEqual([
        "검색 유입38%",
        "직접 방문25%",
        "SNS19%",
        "광고13%",
        "기타5%",
      ]);
    });

    it("도넛 중앙이 채널 합계를 보여준다", () => {
      renderPage();

      // 4,820 + 3,140 + 2,460 + 1,580 + 620 = 12,620
      const donut = screen.getByRole("img", { name: "채널별 방문자 구성비" })
        .parentElement as HTMLElement;
      expect(within(donut).getByText("12,620")).toBeVisible();
    });
  });

  /** SegmentedControl 은 radiogroup 패턴이다 — 값 하나를 고르는 의미가 role 에 드러난다 */
  describe("기간 선택", () => {
    it("기본값은 최근 12개월이다", () => {
      renderPage();

      const group = screen.getByRole("radiogroup");
      expect(
        within(group).getByRole("radio", { name: "최근 12개월" }),
      ).toBeChecked();
    });

    it("다른 기간을 고르면 선택이 옮겨간다", async () => {
      const user = userEvent.setup();
      renderPage();

      const group = screen.getByRole("radiogroup");
      await user.click(within(group).getByRole("radio", { name: "최근 7일" }));

      expect(
        within(group).getByRole("radio", { name: "최근 7일" }),
      ).toBeChecked();
      expect(
        within(group).getByRole("radio", { name: "최근 12개월" }),
      ).not.toBeChecked();
    });
  });

  describe("인기 상품 표", () => {
    it("Top 5 를 순위·판매량·매출과 함께 보여준다", () => {
      renderPage();

      const rows = screen.getAllByRole("row");
      const top = rows.find((r) =>
        r.textContent?.includes("오버핏 코튼 셔츠"),
      ) as HTMLElement;

      expect(within(top).getByText("284개")).toBeInTheDocument();
      expect(within(top).getByText("8,520,000원")).toBeInTheDocument();
    });
  });
});
