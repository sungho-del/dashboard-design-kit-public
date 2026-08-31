import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClinicStatusPage } from "./ClinicStatusPage";

/* -------------------------------------------------------------------------
 * 진료 현황 (S03) — 통계형
 *
 * ## jsdom 에서 Recharts 를 렌더시키기 (DashboardPage.test.tsx 와 같은 스텁)
 *
 * `ResponsiveContainer`(recharts 3) 는 `ResizeObserver` 전역과 **양수
 * `getBoundingClientRect()`** 를 요구한다. 둘 중 하나라도 없으면 children 을 통째로
 * null 로 반환해 **차트가 사라진다.**
 *
 * **검증하지 않는 것**: 경로 `d`·좌표·축 눈금 텍스트·막대 fill (jsdom 에 레이아웃이 없다).
 * 여기서 지켜야 할 계약은 좌표가 아니라 **접근가능 이름·범례·수치 정합·증감 색**이다.
 *
 * `useToast()` 를 쓰지 않으므로 `ToastProvider` 는 필요 없다.
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
    <ClinicStatusPage
      navOpen
      onNavOpenChange={onNavOpenChange}
      activeNav="clinic-status"
      onNavSelect={onNavSelect}
    />,
  );

  return { onNavSelect, onNavOpenChange };
}

/** KPI 영역 — "오늘 예약"·"평균 대기"가 도넛 중앙·표 헤더와 겹치므로 반드시 좁혀서 본다 */
function kpiRegion(): HTMLElement {
  return screen.getByRole("region", { name: "핵심 지표" });
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

describe("ClinicStatusPage", () => {
  describe("KPI", () => {
    it("핵심 지표 4장을 라벨·수치·증감·비교기준과 함께 보여준다", () => {
      renderPage();

      const kpi = kpiRegion();
      const rows: [string, string, string][] = [
        ["오늘 예약", "38건", "+6건"],
        ["진료 완료", "26건", "+4건"],
        ["노쇼율", "4.2%", "-1.2%p"],
        ["평균 대기", "18분", "+3분"],
      ];

      for (const [label, value, delta] of rows) {
        expect(within(kpi).getByText(label)).toBeVisible();
        expect(within(kpi).getByText(statText(value))).toBeVisible();
        // 증감은 색만으로 전달하지 않는다 — 부호가 붙은 텍스트가 함께 있어야 한다
        expect(within(kpi).getByText(delta)).toBeVisible();
      }
    });

    /**
     * 비교 기준이 지표마다 다르다. 한 문구로 묶으면 노쇼율 4.2%(최근 30일)가
     * 오늘 건수(2/38 = 5.3%)와 비교되는 것처럼 읽혀 숫자가 모순된다.
     */
    it("KPI 마다 비교 기준을 따로 밝힌다", () => {
      renderPage();

      const kpi = kpiRegion();
      expect(within(kpi).getAllByText("지난주 같은 요일 대비")).toHaveLength(2);
      expect(within(kpi).getByText("최근 30일 · 직전 30일 대비")).toBeVisible();
      expect(within(kpi).getByText("최근 7일 평균 대비")).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 의미 계약.
     * 병원에는 **내려가야 좋은 지표**가 있다. 화살표는 `up`, 색은 `good` 이 정한다.
     * `good: up` 으로 복사하면 아래 두 검사가 동시에 뒤집힌다.
     *
     * 색은 `text-text-success/critical` 이 아니라 **`chart-delta-*`** 다 —
     * 상태색은 틴트 배경 위에서 명암비 2.61/3.97 로 작은 글자 기준(4.5:1)에 미달한다.
     */
    it("'노쇼율 -1.2%p' 는 ↓ 화살표에 success 색 — 내려가서 좋은 지표다", () => {
      renderPage();

      const tag = within(kpiRegion()).getByText("-1.2%p");
      expect(tag.querySelector(".lucide-trending-down")).not.toBeNull();
      expect(tag.querySelector(".lucide-trending-up")).toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-up)",
      );
      expect(tag.style.getPropertyValue("--tag-color")).not.toBe(
        "var(--color-chart-delta-down)",
      );
    });

    it("'평균 대기 +3분' 은 ↑ 화살표에 critical 색 — 올라가서 나쁜 지표다", () => {
      renderPage();

      const tag = within(kpiRegion()).getByText("+3분");
      expect(tag.querySelector(".lucide-trending-up")).not.toBeNull();
      expect(tag.querySelector(".lucide-trending-down")).toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-down)",
      );
      expect(tag.style.getPropertyValue("--tag-color")).not.toBe(
        "var(--color-chart-delta-up)",
      );
    });

    it("'오늘 예약 +6건' 은 ↑ 화살표에 success 색으로 나간다", () => {
      renderPage();

      const tag = within(kpiRegion()).getByText("+6건");
      expect(tag.querySelector(".lucide-trending-up")).not.toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-up)",
      );
    });
  });

  /**
   * SVG 는 내용이 스크린리더에 전달되지 않는다. `ChartFrame` 이 씌우는
   * `role="img"` + 이름이 유일한 전달 경로라, 이름이 빠지면 차트는 통째로 침묵한다.
   */
  describe("차트 접근가능 이름", () => {
    it("라인·도넛·막대 세 차트가 각자 병원 도메인의 이름을 갖는다", () => {
      renderPage();

      expect(
        screen.getByRole("img", {
          name: "최근 14일 예약 추이. 예약과 진료 완료 비교",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "진료과별 예약 구성비" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: "시간대별 예약 건수" }),
      ).toBeInTheDocument();
    });

    it("차트 내부에 실제로 SVG 가 그려진다", () => {
      renderPage();

      const line = screen.getByRole("img", {
        name: "최근 14일 예약 추이. 예약과 진료 완료 비교",
      });
      expect(line.querySelector("svg")).not.toBeNull();
    });
  });

  /** 계열이 2개 이상이면 범례를 항상 둔다 — 색만으로 식별하게 두지 않는다 */
  describe("범례", () => {
    it("예약 추이에 예약·진료 완료 범례가 보인다", () => {
      renderPage();

      // "진료 완료"는 KPI 라벨과 겹치므로 범례 목록 안으로 좁혀서 본다
      const legend = screen.getByText("예약").closest("ul") as HTMLElement;
      expect(within(legend).getByText("예약")).toBeVisible();
      expect(within(legend).getByText("진료 완료")).toBeVisible();
    });
  });

  /**
   * 도넛은 조각이 작아질수록 라벨을 얹지 못하므로 옆의 목록이 곧 표 역할을 한다.
   * 퍼센트는 `value / 38 * 100` 을 반올림한 값이고, 반올림 후에도 합이 100이다.
   */
  describe("진료과 구성비 목록", () => {
    it("진료과 5개를 계산된 퍼센트와 함께 나열하고 합이 100이 된다", () => {
      renderPage();

      // 진료과 이름은 순위 표에도 있으므로 도넛 카드 안으로 좁혀서 본다
      // (role=img → DonutChart 래퍼 → CardBody)
      const donutCard = screen.getByRole("img", {
        name: "진료과별 예약 구성비",
      }).parentElement?.parentElement as HTMLElement;
      const items = within(within(donutCard).getByRole("list")).getAllByRole(
        "listitem",
      );

      expect(items).toHaveLength(5);
      // 14/9/7/5/3 ÷ 38 → 37/24/18/13/8 (합 100)
      expect(items.map((li) => li.textContent)).toEqual([
        "내과37%",
        "정형외과24%",
        "이비인후과18%",
        "피부과13%",
        "기타8%",
      ]);
    });

    it("도넛 중앙이 오늘 예약 합계를 보여준다 — KPI 38건과 같은 값이다", () => {
      renderPage();

      // 14 + 9 + 7 + 5 + 3 = 38
      const donut = screen.getByRole("img", { name: "진료과별 예약 구성비" })
        .parentElement as HTMLElement;
      expect(within(donut).getByText("38")).toBeVisible();
    });
  });

  /** SegmentedControl 은 radiogroup 패턴이다 — 값 하나를 고르는 의미가 role 에 드러난다 */
  describe("기간 선택", () => {
    it("기본값은 최근 14일이다 — 라인 차트의 14일 구간과 맞춘 값", () => {
      renderPage();

      const group = screen.getByRole("radiogroup");
      expect(
        within(group).getByRole("radio", { name: "최근 14일" }),
      ).toBeChecked();
    });

    it("다른 기간을 고르면 선택이 옮겨간다", async () => {
      const user = userEvent.setup();
      renderPage();

      const group = screen.getByRole("radiogroup");
      await user.click(within(group).getByRole("radio", { name: "오늘" }));

      expect(within(group).getByRole("radio", { name: "오늘" })).toBeChecked();
      expect(
        within(group).getByRole("radio", { name: "최근 14일" }),
      ).not.toBeChecked();
    });
  });

  describe("대기 상위 진료과 표", () => {
    it("5개 진료과를 대기 인원·평균 대기와 함께 보여준다", () => {
      renderPage();

      const rows = screen.getAllByRole("row");
      const top = rows.find((r) =>
        r.textContent?.includes("내과"),
      ) as HTMLElement;

      expect(within(top).getByText("3명")).toBeInTheDocument();
      expect(within(top).getByText("26분")).toBeInTheDocument();
    });

    /**
     * 대기 인원 합(3+3+2+1+1 = 10)은 "38 = 진료 완료 26 + 대기 10 + 취소·노쇼 2"의
     * 대기 10과 같아야 하고, 가중평균 18.4분이 KPI "평균 대기 18분"이 된다.
     * 표를 손으로 고치면서 이 정합이 깨지는 것을 여기서 잡는다.
     */
    it("대기 인원 합이 10이고 가중평균이 KPI 평균 대기(18분)와 맞는다", () => {
      renderPage();

      const rows = screen
        .getAllByRole("row")
        .filter((r) => within(r).queryAllByRole("cell").length === 4);

      expect(rows).toHaveLength(5);

      const parsed = rows.map((r) => {
        const cells = within(r).getAllByRole("cell");
        return {
          waiting: Number((cells[2].textContent ?? "").replace("명", "")),
          wait: Number((cells[3].textContent ?? "").replace("분", "")),
        };
      });

      const waitingTotal = parsed.reduce((sum, d) => sum + d.waiting, 0);
      const weighted = parsed.reduce((sum, d) => sum + d.waiting * d.wait, 0);

      expect(waitingTotal).toBe(10);
      expect(Math.round(weighted / waitingTotal)).toBe(18);
      expect(within(kpiRegion()).getByText(statText("18분"))).toBeVisible();
    });
  });
});
