import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BabycubeDashboardPage } from "./DashboardPage";

/* -------------------------------------------------------------------------
 * S01 대시보드 (BabyCube 본사 운영 어드민) — 통계형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 의미**다 —
 * 기간 전환이 실제로 데이터를 바꾸는지 · 두 차트가 서로의 기간을 침범하지 않는지 ·
 * 타일·퍼널이 올바른 화면으로 나가는지 · **증감 색이 의미와 맞는지**.
 *
 * ## jsdom 에서 Recharts 를 렌더시키기
 * `ResponsiveContainer`(recharts 3) 는 `ResizeObserver` 전역과 **양수
 * `getBoundingClientRect()`** 를 함께 요구한다. 둘 중 하나라도 없으면 children 을
 * 통째로 null 로 반환해 **차트가 사라진다.**
 *
 * **검증하지 않는 것**: 경로 `d`·좌표·축 눈금·선 색 (jsdom 에 레이아웃이 없다).
 * 여기서 지켜야 할 계약은 좌표가 아니라 접근가능 이름·범례·수치 정합·증감 색이다.
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

/**
 * 기간 세그먼트 2개는 DOM 순서로 갈린다 — 0 = 건수 차트, 1 = 금액 차트.
 * 두 차트가 **서로의 기간을 침범하지 않는지**를 보려면 둘을 따로 잡아야 한다.
 */
const periodGroups = () => screen.getAllByRole("radiogroup");

/**
 * 플로우 단계 버튼.
 *
 * 접근가능 이름은 `"${흐름} ${단계} ${건수}건 목록 열기"` 다 — 렌트와 판매가 "신규 주문"
 * 처럼 **같은 단계 이름을 공유**하므로, 흐름 이름이 없으면 스크린리더로 구별할 수 없다.
 */
const stepButton = (flow: string | RegExp, stepName: string) => {
  const prefix = typeof flow === "string" ? flow : flow.source;
  return screen.getByRole("button", {
    name: new RegExp(`^(${prefix}) ${stepName} `),
  });
};

/** 그 단계가 속한 플로우 카드의 `<ol>` */
const flowListOf = (flow: string, stepName: string) =>
  stepButton(flow, stepName).closest('[role="list"]') as HTMLElement;

describe("BabycubeDashboardPage (S01 대시보드)", () => {
  /*
   * ⚠️ 원본 타일은 **라벨 · 값 · 단위**가 전부다. 한때 여기에 아이콘 · 증감(±%) ·
   * 비교 기준 문구 · "회원 목록" 링크 버튼을 얹었다가 전부 걷어냈다.
   * 되살리려는 변경이 오면 이 블록이 막는다.
   */
  describe("지표 9장", () => {
    it("그룹마다 박스 하나에 3칸씩 담는다", () => {
      renderPage();

      for (const title of ["회원 지표", "셀러 지표", "매출 지표"]) {
        expect(screen.getByText(title)).toBeVisible();
      }

      // 타일마다 카드를 세우지 않는다 — 그룹 경계가 카드 경계에 지면 묶임이 안 읽힌다
      expect(screen.getByText("오늘 방문자")).toBeVisible();
      expect(screen.getByText("입점 등록 상품")).toBeVisible();
      expect(screen.getByText("본사 수수료 수익")).toBeVisible();
    });

    /** 값과 단위는 **다른 요소**다 — 크기 위계를 주려면 문자열이 갈려 있어야 한다 */
    it("값과 단위를 나눠 보여준다", () => {
      renderPage();

      expect(screen.getByText("12,847")).toBeVisible();
      expect(screen.getByText("824,000,000")).toBeVisible();
      // 단위는 여러 타일이 공유하므로 개수로 본다 (명 3 · 원 3)
      expect(screen.getAllByText("명")).toHaveLength(3);
      expect(screen.getAllByText("원")).toHaveLength(3);
    });

    it("증감·비교 기준·아이콘은 없다 — 원본에 없는 것들이다", () => {
      renderPage();

      expect(screen.queryByText("-4.1%")).not.toBeInTheDocument();
      expect(screen.queryByText("+12명")).not.toBeInTheDocument();
      expect(screen.queryByText("어제 같은 시각 대비")).not.toBeInTheDocument();
      expect(screen.queryByText("회원 목록")).not.toBeInTheDocument();
      // 증감 화살표가 화면 어디에도 남아 있지 않다
      expect(document.body.querySelector(".lucide-trending-up")).toBeNull();
      expect(document.body.querySelector(".lucide-trending-down")).toBeNull();
    });

    /** 갈 곳이 있는 타일만 링크가 된다 (원본의 `go`) */
    it("값을 누르면 해당 목록 화면으로 나간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "전체 회원 12,847명 목록 열기" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/members");

      onNavSelect.mockClear();
      await user.click(
        screen.getByRole("button", { name: "전체 입점 셀러 128사 목록 열기" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
    });

    /**
     * 화살표가 이 화면의 **affordance** 다. 그전에는 hover 색만으로 링크임을 알려서
     * 마우스를 올려보기 전에는 어느 항목이 눌리는지 알 수 없었다.
     * 아이콘은 `aria-hidden` 이라 이름은 버튼의 `aria-label` 이 든다 —
     * 아이콘만으로 뜻을 전달하지 않는다.
     */
    it("화살표는 갈 수 있는 항목에만 붙는다", () => {
      renderPage();

      const linked = screen.getByRole("button", {
        name: "전체 회원 12,847명 목록 열기",
      });
      expect(linked.querySelector(".lucide-arrow-up-right")).not.toBeNull();

      // 링크가 아닌 항목의 상자에는 화살표가 없다
      const plain = screen.getByText("오늘 방문자").closest("div");
      expect(plain?.querySelector(".lucide-arrow-up-right")).toBeNull();

      /*
       * 화살표는 **지표에만** 붙는다 — 7개(전체 회원 + 셀러 3 + 매출 3).
       *
       * 흐름 단계에는 붙이지 않는다. 거기서는 **4단계가 전부 링크**라 화살표가
       * 구별하는 것이 없고(지표에서는 갈 수 있는 것과 없는 것을 가른다),
       * 절반 폭 4칸에 아이콘까지 넣으면 `반납완료`·`구매확정` 라벨이 두 줄로 접힌다.
       */
      expect(
        document.body.querySelectorAll(".lucide-arrow-up-right"),
      ).toHaveLength(7);
    });

    it("갈 곳이 없는 타일은 링크가 아니다", () => {
      renderPage();

      // 오늘 방문자·오늘 가입자는 그날치 집계라 대응하는 목록 화면이 없다
      expect(
        screen.queryByRole("button", { name: /오늘 방문자/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /오늘 가입자/ }),
      ).not.toBeInTheDocument();
    });

    /** 매출 3장이 전부 같은 화면으로 가므로 이름이 겹치기 쉽다 */
    it("같은 화면으로 가는 링크도 접근가능 이름이 서로 다르다", () => {
      renderPage();

      const names = screen
        .getAllByRole("button", { name: /목록 열기$/ })
        .map((button) => button.getAttribute("aria-label"));

      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe("총 매출 현황 차트", () => {
    it("두 차트가 접근가능 이름을 갖는다 (SVG 는 이름이 유일한 전달 경로다)", () => {
      renderPage();

      expect(
        screen.getByRole("img", {
          name: "총 매출 현황 건수 추이. 렌트와 판매 비교",
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("img", {
          name: "총 매출 현황 금액 추이. 렌트와 판매 비교",
        }),
      ).toBeInTheDocument();
    });

    it("계열이 2개라 범례로 렌트·판매를 구별시킨다", () => {
      renderPage();

      // 차트 2장 × 계열 2개
      expect(screen.getAllByText("렌트")).toHaveLength(2);
      expect(screen.getAllByText("판매")).toHaveLength(2);
    });

    it("기본 기간은 1개월이고 합계가 그 기간의 값이다", () => {
      renderPage();

      // 기간 세그먼트가 차트마다 하나씩이라 두 개 모두 1개월로 시작한다
      expect(
        within(periodGroups()[0]).getByRole("radio", { name: "1개월" }),
      ).toBeChecked();
      expect(
        within(periodGroups()[1]).getByRole("radio", { name: "1개월" }),
      ).toBeChecked();
      expect(screen.getByText("선택한 기간 합계 3,634건")).toBeVisible();
      expect(screen.getByText("선택한 기간 합계 35,612만원")).toBeVisible();
    });

    it("건수 차트의 기간을 바꾸면 그 차트의 합계만 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(
        within(periodGroups()[0]).getByRole("radio", { name: "1주" }),
      );

      expect(screen.getByText("선택한 기간 합계 942건")).toBeVisible();
      // 금액 차트는 건드리지 않았으므로 1개월 그대로다
      expect(screen.getByText("선택한 기간 합계 35,612만원")).toBeVisible();
    });

    it("금액 차트의 기간을 바꾸면 그 차트의 합계만 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(
        within(periodGroups()[1]).getByRole("radio", { name: "3개월" }),
      );

      expect(screen.getByText("선택한 기간 합계 96,700만원")).toBeVisible();
      expect(screen.getByText("선택한 기간 합계 3,634건")).toBeVisible();
    });

    /** 기간이 길수록 합계가 커야 한다 — 버킷 단위가 달라도 숫자는 모순되면 안 된다 */
    it("기간이 길수록 합계가 커진다", async () => {
      const { user } = renderPage();

      const countPeriods = periodGroups()[0];

      await user.click(
        within(countPeriods).getByRole("radio", { name: "1주" }),
      );
      expect(screen.getByText("선택한 기간 합계 942건")).toBeVisible();

      await user.click(
        within(countPeriods).getByRole("radio", { name: "3개월" }),
      );
      expect(screen.getByText("선택한 기간 합계 9,860건")).toBeVisible();
    });
  });

  /*
   * ⚠️ 원본은 단계를 `›` 로 쭉 이어 놓을 뿐이다 — 그 순서가 곧 생애주기다.
   * 한때 중요도 4등급으로 갈라 "처리 대기 128건" 합계와 경보 배너를 세웠는데
   * **원본에 없는 구성**이라 되돌렸다. 되살리려는 변경이 오면 이 블록이 막는다.
   */
  /*
   * ⚠️ **원본 대시보드의 흐름은 각 4단계다.**
   * 렌트 `신규 주문 › 대여중 › 검수중 › 반납완료` ·
   * 판매 `신규 주문 › 배송 준비 › 배송 완료 › 구매확정`.
   *
   * 한때 상태 어휘 목록(교환·반품까지 130여 개)에서 부풀려 렌트 11 · 판매 5 단계를
   * 만들었는데 대시보드에 있는 것이 아니었다. 전체 상태 어휘는 **주문 목록 화면**이 든다.
   * 다시 부풀리려는 변경이 오면 이 블록이 막는다.
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

      // 배송중·연체중·수거 신청 등은 주문 목록 화면이 든다
      for (const label of ["배송중", "연체중", "수거 신청", "검수완료"]) {
        expect(
          screen.queryByRole("button", { name: new RegExp(` ${label} `) }),
        ).not.toBeInTheDocument();
      }
    });

    it("단계 이름과 건수를 값·단위로 나눠 보여준다", () => {
      renderPage();

      const renting = stepButton("렌트 관리", "대여중");
      expect(within(renting).getByText("24")).toBeVisible();
      expect(within(renting).getByText("건")).toBeVisible();
    });

    it("등급 요약·경보 배너는 없다 — 원본에 없는 구성이다", () => {
      renderPage();

      expect(screen.queryByText("처리 대기")).not.toBeInTheDocument();
      expect(screen.queryByText("즉시 조치")).not.toBeInTheDocument();
    });

    it("단계를 누르면 그 상태로 필터된 주문 목록으로 이동한다", async () => {
      const { user, onNavSelect } = renderPage();

      /*
       * 원본과 **쿼리 이름까지 같다** — `?stat=<유형>&flow=<단계>`.
       * 원본 주문 목록이 `get("stat") ?? "렌트"` 로 읽으므로 `stat` 이 유형이다.
       */
      await user.click(stepButton("렌트 관리", "검수중"));
      const [rentHref] = onNavSelect.mock.calls[0];
      const rentParams = new URLSearchParams(rentHref.split("?")[1]);
      expect(rentHref.split("?")[0]).toBe("/orders-all");
      expect(rentParams.get("stat")).toBe("렌트");
      expect(rentParams.get("flow")).toBe("검수중");

      onNavSelect.mockClear();
      await user.click(stepButton("판매 관리", "구매확정"));
      const [saleHref] = onNavSelect.mock.calls[0];
      const saleParams = new URLSearchParams(saleHref.split("?")[1]);
      expect(saleParams.get("stat")).toBe("판매");
      expect(saleParams.get("flow")).toBe("구매확정");
    });
  });
});
