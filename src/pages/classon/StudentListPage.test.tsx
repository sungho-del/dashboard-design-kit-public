import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { StudentListPage } from "./StudentListPage";

/* -------------------------------------------------------------------------
 * S02 수강생 관리 (클래스온) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 상태 대시 필터 · 검색 · 초기화 · 빈 상태 ·
 * 페이지네이션 · 선택 → 독려 메일 → 확인 모달 · 행 클릭 → 요약 시트.
 *
 * 여기에 **의미 검증**이 셋 붙는다 — 타입·린트가 절대 못 잡는 자리다.
 *   1. 상태 색: 중단 warning(조치 필요) · 환불 critical(비정상 종료) ·
 *      완료 default(정상 종료) · 수강중 success(정상 진행)
 *   2. 상태 건수를 **상태 축을 뺀 나머지 조건**에서 센다 — 검색을 좁히면 대시도 줄어야 한다
 *   3. 진도율 막대에 **주의 색을 쓰지 않는다** — 40% 임계는 기획서상 S01 전용이다
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker(floating-ui)·GNB 가 둘을 요구하므로 no-op 으로 채운다.
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

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <StudentListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/_classon/students"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 통째로 사라지므로 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 수강생의 "이름" 셀(2번째 컬럼 — 1번째는 선택 체크박스다) */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 (DatePicker 트리거는 button) */
const searchBox = () => screen.getByRole("textbox");

/**
 * 상태 대시의 상자 하나. `StatGrid` 는 접근가능 이름을 `라벨 값단위` 로 **한 문자열에**
 * 못 박는다 — 라벨과 수치가 두 요소로 갈라져 있어 그대로 두면 브라우저마다 다르게
 * 이어붙기 때문이다("수강중4명" / "수강중 4 명").
 */
const dashTile = (name: string) => screen.getByRole("button", { name });

describe("StudentListPage (수강생 관리)", () => {
  describe("상태 건수 대시 (StatGrid)", () => {
    it("다섯 상태의 건수를 보여주고 묶음에 이름이 붙는다", () => {
      renderPage();

      const group = screen.getByRole("group", { name: "수강 상태" });
      expect(within(group).getAllByRole("button")).toHaveLength(5);

      /* 표본 8건 = 수강중 4 + 완료 2 + 중단 1 + 환불 1 */
      expect(dashTile("전체 8명")).toBeVisible();
      expect(dashTile("수강중 4명")).toBeVisible();
      expect(dashTile("완료 2명")).toBeVisible();
      expect(dashTile("중단 1명")).toBeVisible();
      expect(dashTile("환불 1명")).toBeVisible();
    });

    it("상자를 누르면 그 상태로 표가 걸러지고 선택 상태가 남는다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("중단 1명"));

      expect(visibleNames()).toEqual(["이서준"]);
      expect(screen.getByText("총 1명")).toBeVisible();
      expect(dashTile("중단 1명")).toHaveAttribute("aria-pressed", "true");
      expect(dashTile("전체 8명")).toHaveAttribute("aria-pressed", "false");
    });

    /**
     * ⚠️ 건수는 **상태 축을 뺀 나머지 조건**에서 센다.
     * 이미 상태로 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 되어
     * 대시가 비교할 것을 잃는다. 반대로 검색을 좁히면 건수도 함께 줄어야 표와 맞는다.
     */
    it("검색으로 좁히면 대시 건수도 함께 줄어든다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "실무로 배우는 React 입문");

      expect(dashTile("전체 2명")).toBeVisible();
      expect(dashTile("수강중 2명")).toBeVisible();
      expect(dashTile("완료 0명")).toBeVisible();
      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe("검색·기간·초기화", () => {
    it("기본은 전체 — 첫 페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      // 표본 8건 / PAGE_SIZE 5 → 1페이지 5건, 2페이지 3건
      expect(bodyRows()).toHaveLength(5);
      expect(screen.getByText("총 8명")).toBeVisible();

      /* 페이지 버튼은 **숫자만** 렌더한다 — "2 페이지" 라는 이름은 없다 */
      await user.click(screen.getByRole("button", { name: "2" }));
      expect(visibleNames()).toEqual(["강태오", "윤소미", "한지우"]);
    });

    it("이름으로 검색하면 그 수강생만 남는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "윤소미");

      expect(visibleNames()).toEqual(["윤소미"]);
    });

    it("이메일로도 강의명으로도 같은 입력창에서 찾는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "doyun.park@example.com");
      expect(visibleNames()).toEqual(["박도윤"]);

      await user.clear(searchBox());
      await user.type(searchBox(), "SQL");
      expect(visibleNames()).toEqual(["이서준", "한지우"]);
    });

    it("결과가 없으면 도메인 문구의 빈 상태가 서고, 초기화로 되돌아온다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는이름");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("조건에 맞는 수강생이 없습니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(5);
      expect(searchBox()).toHaveValue("");
    });

    it("초기화는 상태 필터와 검색어를 함께 되돌린다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("완료 2명"));
      await user.type(searchBox(), "한지우");
      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(bodyRows()).toHaveLength(5);
      expect(dashTile("전체 8명")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("표", () => {
    it("기획서 F06 의 7열 + 선택 열을 보여준다", () => {
      renderPage();

      const header = within(screen.getByRole("table")).getAllByRole("row")[0];
      const labels = within(header)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent?.trim());

      /*
        ⚠️ **진도율이 이름 바로 옆이다.** 한때 `… 강의 · 진도율 · 최근 학습 …` 이었는데,
        진도율과 최근 학습이 붙어 있으면 **섞여 읽힌다**(둘 다 학습 수치라 "62%"가
        최근 학습에 딸린 비율처럼 보인다). 실제로 보고된 혼동이고, 순서를 갈라 해결했다.
        이 순서를 되돌리지 말 것 — 부품이나 폭을 고쳐도 옆에 있는 한 같은 혼동이 돌아온다.
      */
      expect(labels).toEqual([
        "",
        "이름",
        "진도율",
        "이메일",
        "수강 강의",
        "최근 학습",
        "상태",
        "관리",
      ]);
      /* 첫 열은 글자가 아니라 '이 페이지 전체 선택' 체크박스다 */
      expect(
        within(header).getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      ).toBeInTheDocument();
    });

    it("진도율은 행마다 이름이 붙은 막대 + 숫자로 나온다", () => {
      renderPage();

      const bar = screen.getByRole("progressbar", { name: "김하늘 진도율" });
      expect(bar).toHaveAttribute("aria-valuenow", "72.5");
      expect(bar).toHaveAttribute("aria-valuetext", "72.5%");
      expect(within(bar).getByText("72.5%")).toBeVisible();

      /* 100% 는 소수점을 붙이지 않는다 (기획서 formats — 정수 또는 소수 1자리) */
      expect(
        screen.getByRole("progressbar", { name: "박도윤 진도율" }),
      ).toHaveAttribute("aria-valuetext", "100%");
    });

    /**
     * ⚠️ 표의 막대에는 **주의 색을 쓰지 않는다.** 기획서 thresholds 의 '40% 미만 주의'는
     * `appliesTo: ["S01"]`(강의별 완주율)로 못 박혀 있다. 여기서 칠하면 기획서에 없는
     * 판정을 화면이 지어내는 것이 된다 — 진도 18% 인 '이서준' 이 그 반례다.
     */
    it("진도율 막대에 임계 색이 붙지 않는다 — 40% 임계는 S01 전용이다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("중단 1명"));

      const bar = screen.getByRole("progressbar", { name: "이서준 진도율" });
      /*
        DOM 순서에 기대지 않는다 — 표 셀은 `valueSide="start"` 라 값이 먼저 온다.
        필은 "폭이 inline style 로 주어진 요소" 로 찾는다(트랙은 폭을 갖지 않는다).
      */
      const fill = bar.querySelector<HTMLElement>("[style*='width']");

      expect(bar).toHaveAttribute("aria-valuetext", "18%");
      expect(classList(fill)).toContain("bg-border-slate");
      expect(classList(fill)).not.toContain("bg-progress-warning");
    });

    it("최근 학습은 YYYY-MM-DD HH:mm 형식이다", () => {
      renderPage();

      expect(screen.getByText("2026-08-27 21:14")).toBeVisible();
    });
  });

  /**
   * ⚠️ 상태 색이 의미와 맞는가 — 형태 검증이 통과시켜 버리는 자리다.
   * '중단'은 지금 조치(독려 메일)를 요하는 상태라 warning,
   * '환불'은 정상적으로 끝나지 않은 종료라 critical,
   * '완료'는 정상 종료라 default, '수강중'은 진행 중이고 정상이라 success 다.
   */
  describe("상태 색", () => {
    /*
      `Tag` 의 루트 `<span>` 자체가 라벨 텍스트를 직접 담는다(도트는 형제 span 이다).
      그래서 `getByText` 가 돌려주는 것이 곧 tone 클래스를 가진 요소다 —
      `.parentElement` 로 한 단 올라가면 `<td>` 가 잡혀 tone 이 보이지 않는다.
    */
    const tagOfRow = (name: string) => {
      const row = bodyRows().find((r) => within(r).queryByText(name));
      return within(row!).getByText(/^(수강중|완료|중단|환불)$/);
    };

    it("중단은 warning, 환불은 critical 이다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("중단 1명"));
      expect(classList(tagOfRow("이서준"))).toContain(
        "bg-surface-warning-secondary",
      );

      await user.click(dashTile("환불 1명"));
      expect(classList(tagOfRow("정민서"))).toContain(
        "bg-surface-critical-secondary",
      );
    });

    it("수강중은 success, 완료는 default 다 — 정상 종료는 눈에 띌 이유가 없다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("수강중 4명"));
      expect(classList(tagOfRow("김하늘"))).toContain(
        "bg-surface-success-secondary",
      );

      await user.click(dashTile("완료 2명"));
      const completed = classList(tagOfRow("박도윤"));
      expect(completed).toContain("bg-surface-sub");
      expect(completed).not.toContain("bg-surface-success-secondary");
    });
  });

  describe("독려 메일 (F08)", () => {
    it("행을 고르면 일괄 작업 바가 떠오르고 개수를 알린다", async () => {
      const { user } = renderPage();

      expect(
        screen.queryByRole("group", { name: "선택 항목 일괄 작업" }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("checkbox", { name: "김하늘 선택" }));

      const bar = screen.getByRole("group", { name: "선택 항목 일괄 작업" });
      expect(within(bar).getByRole("status")).toHaveTextContent("1명 선택됨");
    });

    it("헤더 체크박스로 이 페이지를 통째로 고른다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );

      const bar = screen.getByRole("group", { name: "선택 항목 일괄 작업" });
      expect(within(bar).getByRole("status")).toHaveTextContent("5명 선택됨");
    });

    it("발송은 확인 모달을 거치고, 보낸 뒤 선택이 풀린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "김하늘 선택" }));
      await user.click(screen.getByRole("checkbox", { name: "최유나 선택" }));

      const bar = screen.getByRole("group", { name: "선택 항목 일괄 작업" });
      await user.click(
        within(bar).getByRole("button", { name: "독려 메일 보내기" }),
      );

      /*
        ⚠️ 같은 이름의 버튼이 바에도 모달에도 있다 — 반드시 대화상자 안에서 집는다.
        모달을 열지 않고 바로 보내는 회귀가 생기면 여기서 잡힌다.
      */
      const dialog = screen.getByRole("dialog");
      expect(
        within(dialog).getByText("선택한 수강생에게 독려 메일을 보낼까요?"),
      ).toBeVisible();
      expect(within(dialog).getByText("2명 선택")).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "독려 메일 보내기" }),
      );

      expect(
        await screen.findByText("2명에게 독려 메일을 보냈습니다"),
      ).toBeVisible();
      expect(
        screen.queryByRole("group", { name: "선택 항목 일괄 작업" }),
      ).not.toBeInTheDocument();
    });

    it("닫기로 나가면 아무것도 보내지 않고 선택이 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "김하늘 선택" }));
      const bar = screen.getByRole("group", { name: "선택 항목 일괄 작업" });
      await user.click(
        within(bar).getByRole("button", { name: "독려 메일 보내기" }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "닫기",
        }),
      );

      expect(
        screen.queryByText("1명에게 독려 메일을 보냈습니다"),
      ).not.toBeInTheDocument();
      expect(
        within(
          screen.getByRole("group", { name: "선택 항목 일괄 작업" }),
        ).getByRole("status"),
      ).toHaveTextContent("1명 선택됨");
    });
  });

  describe("요약 패널 (F07)", () => {
    it("행을 누르면 우측 시트가 열리고 4항목을 보여준다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = screen.getByRole("dialog");
      expect(within(sheet).getByText("수강생 미리보기")).toBeVisible();
      expect(within(sheet).getByText("김하늘")).toBeVisible();
      /* InfoList 는 dl/dt/dd 시맨틱을 쓴다 — 라벨이 term 으로 읽힌다 */
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((t) => t.textContent),
      ).toEqual(["수강 강의", "진도율", "최근 학습", "등록일"]);
      expect(within(sheet).getByText("실무로 배우는 React 입문")).toBeVisible();
      /* 상태는 라벨만이 아니라 뜻(기획서 statusTones)까지 함께 낸다 */
      expect(within(sheet).getByText("진도 1~99% · 정상 진행")).toBeVisible();
    });

    it("`상세` 버튼도 같은 시트를 연다 — 수강생 상세 화면은 기획서에 없다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        within(bodyRows()[2]).getByRole("button", { name: "상세" }),
      );

      /* 표에도 시트에도 같은 이름이 있다 — 반드시 시트 안에서 집는다 */
      const sheet = screen.getByRole("dialog");
      expect(within(sheet).getByText("이서준")).toBeVisible();
      /* 다른 화면으로 나가지 않는다 — 죽은 링크를 만들지 않기 위한 결정이다 */
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    /**
     * 시트는 **빠른 미리보기**다. 상세 화면도, 기획서가 정한 단건 액션도 없으므로
     * 푸터를 두지 않는다 — 버튼을 만드는 순간 없는 기능을 지어내게 된다.
     */
    it("시트에 푸터 액션이 없다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = screen.getByRole("dialog");
      expect(
        within(sheet).queryByRole("button", { name: "전체 상세 보기" }),
      ).not.toBeInTheDocument();
      /* 남는 버튼은 헤더의 닫기 하나뿐이다 */
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });

    it("행의 체크박스를 눌러도 시트가 열리지 않는다 — 선택과 열기는 다른 동작이다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "김하늘 선택" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("셸", () => {
    it("화면 제목이 기획서 용어 그대로다", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "수강생 관리", level: 1 }),
      ).toBeInTheDocument();
    });

    it("엑셀 다운로드는 지금 조회된 건수를 함께 알린다", async () => {
      const { user } = renderPage();

      await user.click(dashTile("완료 2명"));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("조회 결과 2명을 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
