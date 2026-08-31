import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OpsDashboardPage } from "./OpsDashboardPage";

/* -------------------------------------------------------------------------
 * S01 운영 대시보드 (클래스온) — 통계형
 *
 * 렌더 여부가 아니라 **동작과 의미**를 본다.
 *
 *   1. 기간을 바꾸면 차트의 내용(접근가능 이름)과 합계가 함께 바뀌는가
 *   2. 증감의 화살표는 `up`, 색은 `good` 이 정하는가 —
 *      '평균 완주율 -2.1%p' 는 **↓ 화살표에 빨강**이어야 한다.
 *      `good: up` 으로 복사하면 초록이 되고 화면이 거짓말을 한다
 *   3. 완주율 막대의 임계(40% 미만)가 **경계에서 정확히** 갈리는가
 *      (41.3% 는 주의가 아니고 32.6% 는 주의다)
 *   4. 막대마다 **주어가 붙은** 접근가능 이름이 있는가 — 열 머리글이 없는 목록이라
 *      이름이 없으면 무엇의 78% 인지 알 수 없다
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Recharts 의 `ResponsiveContainer` 와 GNB 가 둘을 요구하므로 no-op 으로 채운다.
 * **차트의 좌표·경로는 검증하지 않는다** — jsdom 에서 모든 요소의 크기가 0이라 뜻이 없다.
 * ---------------------------------------------------------------------- */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <OpsDashboardPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/_classon/dashboard"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/**
 * 값과 단위가 **갈라져 렌더되는 지표 수치**를 한 덩어리로 찾는다.
 *
 * `StatTile` 은 규격(§D3-3)대로 값(`<strong>`)과 단위(`<span>`)를 별개 요소로 낸다 —
 * 붙여 쓰면 단위까지 30px 이 되어 자릿수가 안 읽히기 때문이다.
 * 그래서 `getByText("4,820명")` 은 매칭되지 않는다. 두 조각을 감싼 바깥 `<span>` 의
 * 결합 텍스트로 찾아 **값과 단위가 나란히 있는지**까지 함께 본다.
 */
const statText = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === "SPAN" && el.textContent?.replace(/\s+/g, "") === text;

/** 막대의 필(채워진 부분) — 트랙의 첫 자식이다 */
const fillOf = (bar: HTMLElement) =>
  bar.firstElementChild?.firstElementChild ?? null;

describe("OpsDashboardPage (운영 대시보드)", () => {
  describe("핵심 지표 4장", () => {
    it("기획서 F01 의 네 지표를 값·단위와 함께 보여준다", () => {
      renderPage();

      const kpi = screen.getByRole("region", { name: "핵심 지표" });

      for (const label of [
        "총 수강생",
        "진행 중 강의",
        "이번 달 매출",
        "평균 완주율",
      ]) {
        expect(within(kpi).getByText(label)).toBeVisible();
      }

      expect(within(kpi).getByText(statText("4,820명"))).toBeVisible();
      expect(within(kpi).getByText(statText("24개"))).toBeVisible();
      expect(within(kpi).getByText(statText("12,480만원"))).toBeVisible();
      /* `%` 만은 값에 붙는다(§D6-5) — 쪼개면 단위가 작아져 오히려 어색하다 */
      expect(within(kpi).getByText(statText("62.4%"))).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 의미 계약.
     * 화살표는 `up`(방향), 색은 `good`(좋고 나쁨)이 정한다.
     * '평균 완주율 -2.1%p' 는 **오르면 좋은 지표가 내려간 것**이라 ↓ 화살표에 빨강이다.
     */
    it("'평균 완주율 -2.1%p' 는 ↓ 화살표에 critical 색으로 나간다", () => {
      renderPage();

      const tag = screen.getByText("-2.1%p");
      expect(tag.querySelector(".lucide-trending-down")).not.toBeNull();
      expect(tag.querySelector(".lucide-trending-up")).toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-down)",
      );
    });

    it("'총 수강생 +332명' 은 ↑ 화살표에 success 색으로 나간다", () => {
      renderPage();

      const tag = screen.getByText("+332명");
      expect(tag.querySelector(".lucide-trending-up")).not.toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-up)",
      );
    });

    /**
     * 비교 기준은 카드마다 다르다 — 앞 3장은 월, 완주율만 분기다.
     * 한 문구로 묶으면 분기 지표가 월 지표와 같은 기준으로 읽혀 숫자가 서로 모순된다.
     */
    it("비교 기준이 지표마다 따로 붙는다 — 완주율만 '지난 분기 대비'다", () => {
      renderPage();

      expect(screen.getAllByText("지난달 대비")).toHaveLength(3);
      expect(screen.getByText("지난 분기 대비")).toBeVisible();
    });
  });

  describe("수강 추이 차트", () => {
    it("기본은 12주 — 차트 이름과 합계가 그 기간을 말한다", () => {
      renderPage();

      /* 기간 묶음에도 이름이 있다 — 없으면 "라디오 그룹"으로만 들린다 */
      expect(
        screen.getByRole("radiogroup", { name: "수강 추이 기간" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "12주" })).toBeChecked();
      /* SVG 는 스크린리더에 내용이 전달되지 않으므로 role="img" + 이름으로 대신한다 */
      expect(
        screen.getByRole("img", { name: "최근 12주 신규 수강 등록 수 추이" }),
      ).toBeInTheDocument();
      expect(screen.getByText("선택한 기간 신규 등록 1,192명")).toBeVisible();
    });

    it("4주로 바꾸면 마지막 4주만 남아 합계가 481명이 된다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "4주" }));

      expect(
        screen.getByRole("img", { name: "최근 4주 신규 수강 등록 수 추이" }),
      ).toBeInTheDocument();
      expect(screen.getByText("선택한 기간 신규 등록 481명")).toBeVisible();
    });

    /**
     * 6개월은 월 단위 6점이다(기획서 gap — 이 화면이 정했다).
     * 뒤 3개월은 12주 데이터를 4주씩 묶은 값이라 **두 보기가 서로 모순되지 않는다** —
     * 4주 합계(481) 가 6개월의 마지막 달과 같은 값이어야 한다.
     */
    it("6개월로 바꾸면 월 단위 6점이 되고 합계가 2,049명이 된다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "6개월" }));

      expect(
        screen.getByRole("img", { name: "최근 6개월 신규 수강 등록 수 추이" }),
      ).toBeInTheDocument();
      expect(screen.getByText("선택한 기간 신규 등록 2,049명")).toBeVisible();
    });
  });

  describe("강의별 완주 현황", () => {
    it("상위 5개 강의를 강의명·수강생 수와 함께 보여준다", () => {
      renderPage();

      expect(screen.getByText("실무로 배우는 React 입문")).toBeVisible();
      expect(screen.getByText("862명")).toBeVisible();
      expect(screen.getAllByRole("progressbar")).toHaveLength(5);
    });

    /**
     * 막대는 옆의 글자를 자기 이름으로 삼지 못한다. 열 머리글도 없으므로
     * **주어를 붙인 이름**이 없으면 무엇의 78.5% 인지 알 수 없다.
     */
    it("막대마다 '강의명 + 완주율' 이름이 붙는다", () => {
      renderPage();

      const bar = screen.getByRole("progressbar", {
        name: "실무로 배우는 React 입문 완주율",
      });
      expect(bar).toHaveAttribute("aria-valuenow", "78.5");
      /* 화면에 보이는 글자와 낭독 값이 같다 */
      expect(bar).toHaveAttribute("aria-valuetext", "78.5%");
      expect(screen.getByText("78.5%")).toBeVisible();
    });

    /**
     * ⚠️ 임계(40%)는 부품이 아니라 데이터가 판정한다.
     * **경계를 양쪽에서 본다** — 41.3% 는 주의가 아니고 32.6% 는 주의다.
     * 한쪽만 보면 `<=` 와 `<` 를 바꿔 써도 통과한다.
     */
    it("완주율 40% 미만만 주의 색이 된다", () => {
      renderPage();

      const risky = screen.getByRole("progressbar", {
        name: "직장인 영어 회화 100일 완주율",
      });
      const safe = screen.getByRole("progressbar", {
        name: "UX 라이팅 실전 워크숍 완주율",
      });

      /* 색을 못 보는 사람에게도 임계가 전달된다 — 낭독 문자열에 덧말이 붙는다 */
      expect(risky).toHaveAttribute("aria-valuetext", "32.6% 완주율 낮음");
      expect(safe).toHaveAttribute("aria-valuetext", "41.3%");

      /* 클래스 검사는 배열로 — 문자열 부분 일치는 다른 클래스를 못 가른다 */
      const riskyFill = (fillOf(risky)?.className ?? "").split(/\s+/);
      const safeFill = (fillOf(safe)?.className ?? "").split(/\s+/);

      expect(riskyFill).toContain("bg-progress-warning");
      expect(riskyFill).not.toContain("bg-border-slate");
      expect(safeFill).toContain("bg-border-slate");
      expect(safeFill).not.toContain("bg-progress-warning");
    });
  });

  describe("셸", () => {
    it("화면 제목이 기획서 용어 그대로다", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "운영 대시보드", level: 1 }),
      ).toBeInTheDocument();
    });
  });
});
