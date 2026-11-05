import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BabycubeDashboardPage } from "./DashboardPage";
import {
  METRIC_GROUPS,
  ORDER_COUNT_TREND,
  orderCountSeriesTotals,
  orderCountTotals,
  paymentsOf,
  RENT_FUNNEL,
  REVENUE_TREND,
  revenueTotals,
  SALE_FUNNEL,
  trendOf,
  windowDays,
  type Payment,
} from "./DashboardPage.data";
import { MEMBERS } from "./MemberListPage.data";
import { payTotalOf } from "./OrderDetailPage.data";
import {
  DEMO_TODAY,
  filtersFromQuery,
  ORDERS,
  type Order,
} from "./OrderListPage.data";
import { LISTED_PRODUCTS } from "./ProductListPage.data";
import { SELLERS } from "./SellerListPage.data";
import { APPLICATIONS } from "./SellerReviewPage.data";
import { SETTLEMENT_SUMMARY } from "./settlement.data";

/* -------------------------------------------------------------------------
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 통계형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 의미**다 — 숫자가 샘플에서 나오는지(손으로 적은 값과 비교하지 않는다) ·
 * 결제 집계 계약(혼합 결제 · 같은 유형 다중 처리단위) · 날짜 창 경계와 0일 채움 ·
 * 기간 전환이 그 차트만 바꾸는지 · 계열 토글의 색 유지와 최댓값 재선정 · 링크가 도착 필터와 맞는지.
 *
 * ## jsdom 에서 Recharts 를 렌더시키기
 * `ResponsiveContainer` 는 `ResizeObserver` 전역과 **양수 `getBoundingClientRect()`** 를 함께
 * 요구한다. 둘 중 하나라도 없으면 차트가 통째로 사라진다.
 *
 * **검증하지 않는 것**: 좌표·2단 배치·높이(jsdom 에 레이아웃이 없다 — 브라우저로 잰다).
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

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <BabycubeDashboardPage
      navOpen
      onNavOpenChange={onNavOpenChange}
      activeNav="/"
      onNavSelect={onNavSelect}
    />,
  );

  return { user, onNavSelect, onNavOpenChange };
}

const fmt = (n: number) => n.toLocaleString("ko-KR");

/** 기간 세그먼트 2개 — 0 = 건수 차트, 1 = 금액 차트 */
const periodGroups = () => screen.getAllByRole("radiogroup");

/** 기간 합계 — 라벨 다음 형제(값+단위)의 글자. 0 = 건수, 1 = 금액 */
const periodTotal = (index: number) =>
  screen.getAllByText("선택한 기간 합계")[index].nextElementSibling
    ?.textContent;

const countChart = () =>
  screen.getByRole("img", { name: /^총 매출 현황\(건수\)/ });
const revenueChart = () =>
  screen.getByRole("img", { name: /^총 매출 현황\(금액\)/ });
const maxLabelsIn = (chart: HTMLElement) =>
  Array.from(chart.querySelectorAll("[data-max-label]")).map(
    (el) => el.textContent,
  );

/** 라벨이 든 지표 타일(면) — 라벨 줄의 부모가 타일이다 */
const tileOfLabel = (label: string) =>
  screen.getByText(label).parentElement?.parentElement as HTMLElement;

/** 흐름 단계 버튼 — 이름 `"${흐름} ${단계} ${건수}건 목록 열기"` */
const stepButton = (flow: string, stepName: string) =>
  screen.getByRole("button", { name: new RegExp(`^${flow} ${stepName} `) });

const flowListOf = (flow: string, stepName: string) =>
  stepButton(flow, stepName).closest('[role="list"]') as HTMLElement;

/** 보이는 계열의 최댓값 — 동률은 앞 날짜 → 앞 계열(`LineChart markMax` 규칙) */
const expectedMax = (
  rows: { rent: number; sale: number }[],
  keys: ("rent" | "sale")[],
) => Math.max(0, ...rows.flatMap((row) => keys.map((key) => row[key])));

/* =========================================================================
 * 1. 집계 — 샘플 → 숫자 (화면 없이)
 * ====================================================================== */

describe("결제 집계 계약", () => {
  const unit = (over: Partial<Order>): Order =>
    ({ ...ORDERS[0], ...over }) as Order;

  it("혼합 결제는 전체 1건 · 렌트 1건 · 판매 1건이고, 금액은 처리단위별로 나뉜다", () => {
    const rent = ORDERS.find((o) => o.type === "rent")!;
    const sale = ORDERS.find((o) => o.type === "sale")!;
    const mixed = [
      unit({ ...rent, orderNo: "M1", date: "2026-10-19 10:00" }),
      unit({ ...sale, orderNo: "M1", date: "2026-10-19 10:00" }),
    ];
    const trend = trendOf(paymentsOf(mixed), ["2026-10-19"]);

    expect(trend.countTotal).toBe(1);
    expect(trend.countSeries).toEqual({ rent: 1, sale: 1 });
    expect(trend.revenueSeries).toEqual({
      rent: payTotalOf(mixed[0]),
      sale: payTotalOf(mixed[1]),
    });
    expect(trend.revenueTotal).toBe(
      payTotalOf(mixed[0]) + payTotalOf(mixed[1]),
    );
  });

  it("같은 유형 처리단위 둘이 묶인 결제는 그 계열에서도 1건이다 (혼합만 예외 처리하면 틀린다)", () => {
    const rent = ORDERS.find((o) => o.type === "rent")!;
    const twoRents = [
      unit({ ...rent, orderNo: "R2", date: "2026-10-18 09:00" }),
      unit({ ...rent, id: "X", orderNo: "R2", date: "2026-10-18 09:00" }),
    ];
    const trend = trendOf(paymentsOf(twoRents), ["2026-10-18"]);

    expect(trend.countTotal).toBe(1);
    expect(trend.countSeries.rent).toBe(1);
    // 금액은 두 처리단위를 모두 더한다 — 하나만 대표로 고르면 다른 상품 몫이 빠진다
    expect(trend.revenueSeries.rent).toBe(2 * payTotalOf(rent));
  });

  it("실제 샘플에서 기간 합계 = 창 안의 고유 주문번호 수, 칩 = 그 유형을 포함한 결제 수", () => {
    const days = windowDays(30);
    const inWindow = ORDERS.filter((o) => days.includes(o.date.slice(0, 10)));
    const nos = (type?: Order["type"]) =>
      new Set(
        inWindow.filter((o) => !type || o.type === type).map((o) => o.orderNo),
      ).size;

    expect(orderCountTotals["1m"]).toBe(nos());
    expect(orderCountSeriesTotals["1m"]).toEqual({
      rent: nos("rent"),
      sale: nos("sale"),
    });
    // 금액은 보증금 없이 결제금액(payTotalOf) 합 — 환불·취소를 빼지 않는다
    expect(revenueTotals["1m"]).toBe(
      inWindow.reduce((sum, o) => sum + payTotalOf(o), 0),
    );
  });

  it("날짜 창은 기준일 포함 7·30·90일 연속이고, 결제가 없는 날도 0 으로 채운다", () => {
    for (const [period, n] of [
      ["1w", 7],
      ["1m", 30],
      ["3m", 90],
    ] as const) {
      const rows = ORDER_COUNT_TREND[period];
      expect(rows).toHaveLength(n);
      expect(rows[rows.length - 1].label).toBe(DEMO_TODAY.replace(/-/g, "."));
      expect(REVENUE_TREND[period]).toHaveLength(n);
    }

    // 월 경계 · 로컬 날짜(UTC 변환으로 하루 밀리지 않는다)
    expect(windowDays(3, "2026-03-01")).toEqual([
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ]);

    // 결제가 없는 날은 0 행으로 남는다 — 날짜 간격이 같은 시간 간격을 뜻한다
    const paidDays = new Set(ORDERS.map((o) => o.date.slice(0, 10)));
    const emptyDay = windowDays(30).find((d) => !paidDays.has(d))!;
    const row = ORDER_COUNT_TREND["1m"].find(
      (r) => r.label === emptyDay.replace(/-/g, "."),
    );
    expect(row).toEqual({
      label: emptyDay.replace(/-/g, "."),
      rent: 0,
      sale: 0,
    });
  });

  it("창 밖(미래·오래된) 결제는 세지 않는다", () => {
    const pays: Payment[] = [
      {
        orderNo: "a",
        day: "2026-10-20",
        hasRent: true,
        hasSale: false,
        rentAmount: 1,
        saleAmount: 0,
      },
      {
        orderNo: "b",
        day: "2026-10-13",
        hasRent: true,
        hasSale: false,
        rentAmount: 1,
        saleAmount: 0,
      },
    ];
    expect(trendOf(pays, windowDays(7)).countTotal).toBe(1);
  });
});

/* =========================================================================
 * 2. 화면
 * ====================================================================== */

describe("BabycubeDashboardPage (S01 대시보드)", () => {
  describe("지표 9장", () => {
    it("그룹 카드 3장(회원·셀러·매출)에 항목이 3개씩 — 그룹이 열, 항목이 행이다", () => {
      renderPage();
      const metrics = screen.getByRole("region", { name: "핵심 지표" });

      for (const group of METRIC_GROUPS) {
        expect(within(metrics).getByText(group.title)).toBeVisible();
        expect(group.metrics).toHaveLength(3);
      }
      expect(metrics.querySelectorAll("li")).toHaveLength(9);
    });

    it("숫자는 샘플에서 나온다 — 타일을 눌러 간 화면과 같은 모집단", () => {
      renderPage();
      const valueOf = (label: string) =>
        tileOfLabel(label).querySelector("strong")?.textContent;

      expect(valueOf("오늘 방문자")).toBe("54"); // 원천 없음 — 원본 시드 상수
      expect(valueOf("오늘 가입자")).toBe(
        fmt(MEMBERS.filter((m) => m.date.startsWith(DEMO_TODAY)).length),
      );
      /* 판정 Q6 — 각 목록 처음 화면(정상 · 입점 카드)과 같은 값. 전체 30 · 본사 제외 37 이 아니다 */
      expect(valueOf("정상 회원")).toBe(
        fmt(MEMBERS.filter((m) => m.status === "active").length),
      );
      expect(valueOf("정상 회원")).toBe("20");
      expect(valueOf("입점 심사 요청")).toBe(
        fmt(APPLICATIONS.filter((a) => a.status === "requested").length),
      );
      expect(valueOf("입점 등록 상품")).toBe(fmt(LISTED_PRODUCTS.length));
      expect(valueOf("입점 셀러")).toBe(
        fmt(SELLERS.filter((s) => s.status === "active").length),
      );
      expect(valueOf("입점 셀러")).toBe("32"); // 본사 행 포함 · 퇴점 처리중·퇴점 제외
      expect(
        SELLERS.find((s) => s.isHeadquarters && s.status === "active"),
      ).toBeDefined();
      expect(valueOf("셀러 거래액(판매가)")).toBe(
        fmt(SETTLEMENT_SUMMARY.sales),
      );
      expect(valueOf("이번 회차 지급 총액")).toBe(
        fmt(SETTLEMENT_SUMMARY.payout),
      );
      expect(valueOf("본사 수수료 수익")).toBe(fmt(SETTLEMENT_SUMMARY.fee));
    });

    it("0 도 값이다 — 오늘 가입자가 0 이어도 숫자로 보인다", () => {
      renderPage();
      expect(tileOfLabel("오늘 가입자").querySelector("strong")).toBeVisible();
    });

    it("값과 단위를 나눠 보여준다", () => {
      renderPage();
      expect(screen.getAllByText("명")).toHaveLength(3);
      expect(screen.getAllByText("원").length).toBeGreaterThanOrEqual(3);
    });

    it("증감·비교 기준은 없다 — 원본에 없는 것들이다", () => {
      renderPage();
      expect(document.body.querySelector(".lucide-trending-up")).toBeNull();
      expect(document.body.querySelector(".lucide-trending-down")).toBeNull();
      expect(screen.queryByText("회원 목록")).not.toBeInTheDocument();
    });

    it("값을 누르면 해당 목록 화면으로 나간다 — 7곳", async () => {
      const { user, onNavSelect } = renderPage();
      const links = METRIC_GROUPS.flatMap((group) => group.metrics).filter(
        (m): m is typeof m & { navId: string } => "navId" in m,
      );
      expect(links).toHaveLength(7);

      for (const metric of links) {
        await user.click(
          screen.getByRole("button", {
            name: `${metric.label} ${metric.value}${metric.unit} 목록 열기`,
          }),
        );
        expect(onNavSelect).toHaveBeenLastCalledWith(metric.navId);
      }
    });

    it("화살표는 갈 수 있는 타일에만 붙고, 갈 곳이 없는 타일은 버튼이 아니다", () => {
      renderPage();

      const metrics = screen.getByRole("region", { name: "핵심 지표" });
      expect(metrics.querySelectorAll(".lucide-arrow-up-right")).toHaveLength(
        7,
      );
      expect(
        screen.queryByRole("button", { name: /오늘 방문자/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /오늘 가입자/ }),
      ).not.toBeInTheDocument();
    });

    it("입점 심사 요청 타일과 GNB 입점 심사 배지는 같은 수다", () => {
      renderPage();
      const nav = screen.getByRole("navigation");
      const requested = APPLICATIONS.filter(
        (a) => a.status === "requested",
      ).length;
      expect(
        within(nav).getByRole("button", {
          /* jsdom 은 이름을 이을 때 공백을 지운다 — 브라우저는 「입점 심사 처리 대기 8건」 */
          name: new RegExp(`^입점 심사 ?처리 대기 ?${requested}건$`),
        }),
      ).toBeInTheDocument();
    });

    it("사이드바 배지는 본사가 직접 처리할 일만 — 주문 목록 배지 없음(판정 Q7)", () => {
      renderPage();
      const nav = screen.getByRole("navigation");
      const badged = within(nav)
        .getAllByRole("button", { name: /처리 대기/ })
        .map((b) => b.textContent?.replace(/ 처리 대기 \d+건$/, "").trim());
      expect(badged).toEqual(["입점 심사", "셀러 정산", "안심케어 승인"]);
      expect(
        within(nav).getByRole("button", { name: "주문 목록" }),
      ).toBeInTheDocument();
    });
  });

  describe("총 매출 현황 차트", () => {
    it("두 차트가 기간(연도 포함)과 측정 대상을 이름으로 말한다", () => {
      renderPage();

      expect(countChart()).toHaveAccessibleName(
        "총 매출 현황(건수) — 2026.09.20~2026.10.19 일별 결제 건수. 렌트와 판매 비교",
      );
      expect(revenueChart()).toHaveAccessibleName(
        /^총 매출 현황\(금액\) — 2026\.09\.20~2026\.10\.19 일별 결제 금액/,
      );
    });

    it("기본 기간은 1개월 — 합계는 원 단위 그대로이고 만 단위로 나누지 않는다", () => {
      renderPage();

      for (const group of periodGroups()) {
        expect(
          within(group).getByRole("radio", { name: "1개월" }),
        ).toBeChecked();
      }
      expect(periodTotal(0)).toBe(`${fmt(orderCountTotals["1m"])}건`);
      expect(periodTotal(1)).toBe(`${fmt(revenueTotals["1m"])}원`);
      expect(screen.queryByText(/만원/)).not.toBeInTheDocument();
    });

    it("기간을 바꾸면 그 차트의 합계·칩·이름만 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(
        within(periodGroups()[0]).getByRole("radio", { name: "1주" }),
      );

      expect(periodTotal(0)).toBe(`${fmt(orderCountTotals["1w"])}건`);
      expect(
        screen.getByRole("button", {
          name: `렌트 ${fmt(orderCountSeriesTotals["1w"].rent)}건`,
        }),
      ).toBeInTheDocument();
      expect(countChart()).toHaveAccessibleName(/2026\.10\.13~2026\.10\.19/);
      // 금액 차트는 1개월 그대로
      expect(periodTotal(1)).toBe(`${fmt(revenueTotals["1m"])}원`);
      expect(revenueChart()).toHaveAccessibleName(/2026\.09\.20~/);
    });

    it("칩 아래 한 줄이 무엇을 셌는지 말한다 — 「결제 기준」(디자인 §3 #19)", () => {
      renderPage();
      expect(screen.getByText("결제 기준")).toBeVisible();
      expect(screen.getByText("결제금액 기준 · 보증금 제외")).toBeVisible();
    });

    /** 디자인 §3 #19 · `DM` #23 — 렌트와 판매는 한 번에 결제되지 않아 칩 합이 기간 합계와 같다 */
    it.each(["1w", "1m", "3m"] as const)(
      "%s 건수 칩 합 = 기간 합계",
      (period) => {
        const { rent, sale } = orderCountSeriesTotals[period];
        expect(rent + sale).toBe(orderCountTotals[period]);
      },
    );

    it("두 차트 모두 그라디언트 면으로 그린다", () => {
      renderPage();
      for (const chart of [countChart(), revenueChart()]) {
        const fills = Array.from(
          chart.querySelectorAll(".recharts-area-area"),
        ).map((el) => el.getAttribute("fill"));
        expect(fills).toHaveLength(2);
        for (const fill of fills) expect(fill).toMatch(/^url\(#/);
      }
    });

    it("최댓값 라벨은 보이는 계열의 최댓값 한 점에만 — 계열을 끄면 다시 고른다", async () => {
      const { user } = renderPage();
      const rows = ORDER_COUNT_TREND["1m"];

      expect(maxLabelsIn(countChart())).toEqual([
        `${expectedMax(rows, ["rent", "sale"])}건`,
      ]);

      await user.click(
        screen.getByRole("button", {
          name: `렌트 ${fmt(orderCountSeriesTotals["1m"].rent)}건`,
        }),
      );
      expect(maxLabelsIn(countChart())).toEqual([
        `${expectedMax(rows, ["sale"])}건`,
      ]);

      const revenueRows = REVENUE_TREND["1m"];
      expect(maxLabelsIn(revenueChart())).toEqual([
        `${fmt(expectedMax(revenueRows, ["rent", "sale"]))}원`,
      ]);
    });

    it("칩을 누르면 그 계열만 숨기고, 남은 계열의 색은 그대로다 · 마지막 하나는 끌 수 없다", async () => {
      const { user } = renderPage();
      const curves = () =>
        Array.from(countChart().querySelectorAll(".recharts-area-curve")).map(
          (el) => el.getAttribute("stroke"),
        );
      const rent = screen.getByRole("button", {
        name: `렌트 ${fmt(orderCountSeriesTotals["1m"].rent)}건`,
      });
      const sale = screen.getByRole("button", {
        name: `판매 ${fmt(orderCountSeriesTotals["1m"].sale)}건`,
      });

      await user.click(rent);
      expect(rent).toHaveAttribute("aria-pressed", "false");
      expect(curves()).toEqual(["var(--color-chart-series-2)"]);
      expect(sale).toBeDisabled();
      // 합계는 숨김과 상관없이 전체
      expect(periodTotal(0)).toBe(`${fmt(orderCountTotals["1m"])}건`);
      // 금액 차트는 건드리지 않았다
      expect(
        revenueChart().querySelectorAll(".recharts-area-curve"),
      ).toHaveLength(2);

      await user.click(rent);
      expect(sale).toBeEnabled();
    });

    it("기간이 길수록 합계가 커지거나 같다", () => {
      expect(orderCountTotals["1w"]).toBeLessThanOrEqual(
        orderCountTotals["1m"],
      );
      expect(orderCountTotals["1m"]).toBeLessThanOrEqual(
        orderCountTotals["3m"],
      );
      expect(revenueTotals["1w"]).toBeLessThanOrEqual(revenueTotals["1m"]);
      expect(revenueTotals["1m"]).toBeLessThanOrEqual(revenueTotals["3m"]);
    });
  });

  /*
   * ⚠️ 원본 대시보드의 흐름은 각 4단계다 — 중간 상태는 주문 목록이 든다.
   * 중요도 등급·「처리 대기」 합계·경보 배너·비중 막대는 원본에 없어 되돌렸다.
   */
  describe("상태 흐름", () => {
    it("렌트·판매 각 4단계를 원본 순서대로 보여준다", () => {
      renderPage();

      const rent = flowListOf("렌트 관리", "신규 주문");
      const sale = flowListOf("판매 관리", "신규 주문");
      expect(within(rent).getAllByRole("listitem")).toHaveLength(4);
      expect(within(sale).getAllByRole("listitem")).toHaveLength(4);
      expect(
        within(rent)
          .getAllByRole("button")
          .map((b) => b.textContent?.replace(/\d[\d,]*건?/g, "").trim()),
      ).toEqual(["신규 주문", "대여중", "검수중", "반납완료"]);
    });

    it("대시보드에 없는 중간 상태는 넣지 않는다", () => {
      renderPage();
      for (const label of ["배송중", "연체중", "수거 신청", "검수완료"]) {
        expect(
          screen.queryByRole("button", { name: new RegExp(` ${label} `) }),
        ).not.toBeInTheDocument();
      }
    });

    it("단계 아래에 비중 막대·등급 요약이 없다", () => {
      renderPage();
      for (const item of within(
        flowListOf("렌트 관리", "신규 주문"),
      ).getAllByRole("listitem")) {
        expect(item.children).toHaveLength(1);
        expect(item.firstElementChild?.tagName).toBe("BUTTON");
      }
      expect(
        within(document.querySelector("main") as HTMLElement).queryByText(
          /처리 대기/,
        ),
      ).not.toBeInTheDocument();
    });

    /**
     * 8단계 전부 — 링크를 주문 목록이 읽는 방식(`filtersFromQuery`)으로 풀어,
     * 도착 필터(유형 · 상태)로 거른 주문 수가 단계 건수와 같은지 본다.
     */
    it("단계를 누르면 그 유형·상태로 필터된 주문 목록이 열리고, 도착 건수가 단계 건수와 같다", async () => {
      const { user, onNavSelect } = renderPage();

      for (const [flow, steps] of [
        ["렌트 관리", RENT_FUNNEL],
        ["판매 관리", SALE_FUNNEL],
      ] as const) {
        for (const step of steps) {
          await user.click(stepButton(flow, step.label));
          const href: string = onNavSelect.mock.lastCall?.[0];
          expect(href.split("?")[0]).toBe("/orders-all");

          const filters = filtersFromQuery(
            new URLSearchParams(href.split("?")[1]),
          );
          expect(filters.status).toBe(step.value);
          const landed = ORDERS.filter(
            (o) => o.type === filters.type && o.status === filters.status,
          ).length;
          expect(landed).toBe(step.count);
          expect(
            within(stepButton(flow, step.label)).getByText(fmt(step.count)),
          ).toBeVisible();
        }
      }
    });
  });
});

/*
 * 데이터 상태 — `DESIGN-dashboard.md` §D8. 실 API 가 없어 `?preview=` 로 미리 본다.
 */
describe("데이터 상태 미리보기 (?preview=)", () => {
  const renderAt = (url: string) => {
    window.history.replaceState(null, "", url);
    return renderPage();
  };

  afterEach(() => window.history.replaceState(null, "", "/"));

  const tileOf = (label: string) =>
    screen.getByText(label).closest("[aria-busy]") as HTMLElement;

  it("loading — 라벨은 실제 글자, 변하는 값만 스켈레톤이고 aria-busy 다", () => {
    renderAt("/?preview=loading");

    expect(screen.getByText("오늘 방문자")).toBeVisible();
    expect(screen.getAllByText("선택한 기간 합계")).toHaveLength(2);
    expect(tileOf("오늘 방문자")).toHaveAttribute("aria-busy", "true");

    expect(tileOfLabel("오늘 방문자").querySelector("strong")).toBeNull();
    expect(
      screen.queryByText("표시할 기간 데이터가 없습니다."),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: /총 매출 현황/ }),
    ).not.toBeInTheDocument();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 차트 자리에 문구를 두고, 기간 세그먼트·지표·흐름은 살아 있다", () => {
    renderAt("/?preview=empty");

    expect(screen.getAllByText("표시할 기간 데이터가 없습니다.")).toHaveLength(
      2,
    );
    expect(periodGroups()).toHaveLength(2);
    expect(
      screen.queryByRole("img", { name: /총 매출 현황/ }),
    ).not.toBeInTheDocument();
    expect(tileOfLabel("오늘 방문자")).toHaveTextContent("54");
    expect(stepButton("렌트 관리", "대여중")).toBeInTheDocument();
  });

  it("refreshing — 스켈레톤으로 되돌리지 않고 값만 흐리게 둔다", () => {
    renderAt("/?preview=refreshing");

    const value = tileOfLabel("오늘 방문자").querySelector(
      "strong",
    ) as HTMLElement;
    expect(value).toHaveTextContent("54");
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    expect(tileOf("오늘 방문자")).toHaveAttribute("aria-busy", "true");
    // 라벨은 흐리지 않고 값 묶음만 흐린다
    expect(value.parentElement?.className.split(/\s+/)).toContain("opacity-50");
  });

  it("모르는 preview 값은 평소 화면이다 — 주소 오타로 화면이 비지 않는다", () => {
    renderAt("/?preview=lodaing");

    expect(tileOfLabel("오늘 방문자")).toHaveTextContent("54");
    expect(tileOf("오늘 방문자")).toHaveAttribute("aria-busy", "false");
  });
});
