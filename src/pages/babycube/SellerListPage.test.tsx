import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerListPage } from "./SellerListPage";

/* -------------------------------------------------------------------------
 * S03 셀러 관리 — 목록형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 의미**다 — 상태 대시가 곧 상태 필터라는 것 ·
 * 필터 축 3개(기간 기준 · 위생인증 · 검색 조건) · 조건부 퇴점일 열 ·
 * 값 없는 셀의 표기 · 미리보기 · **상태 색과 분류 배지 색이 갈라져 있는지**.
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 함께 본다
 * 증감(±%) 요약 카드 · 미리보기 모달의 액션 버튼 · 퇴점 처리 모달은
 * **원본 어드민에 없어서 걷어냈다.** 없다는 것을 검사로 못 박는다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker·Select·Tooltip 이 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로
 * no-op 으로 채운다.
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
      <SellerListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/sellers"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/*
 * 열 순서(원본 컬럼 배열 그대로):
 *   0 셀러명 · 1 위생인증 · 2 대표명 · 3 연락처 · 4 상태 ·
 *   5 수수료율 · 6 입점일 · [7 퇴점일] · 상품수 · 평점
 * 퇴점 필터에서만 퇴점일이 끼어들어 뒤 두 열이 밀린다.
 */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent ?? "",
  );
}

function rowOf(name: string): HTMLElement {
  return screen.getAllByText(name)[0].closest("tr") as HTMLElement;
}

/*
 * ⚠️ combobox 가 셋이다 — 기간 기준 · 위생인증 · 검색 조건.
 * 이름으로 좁히지 않으면 질의가 모호해진다
 * (`Select` 트리거의 role 은 `button` 이 아니라 `combobox` 다).
 */
const selectOf = (name: string) => screen.getByRole("combobox", { name });

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionLabel: string,
) {
  await user.click(selectOf(selectName));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", {
      name: optionLabel,
    }),
  );
}

/** 검색어 입력은 이 화면의 유일한 textbox 다 (DatePicker 트리거는 button) */
const searchBox = () => screen.getByRole("textbox");

/**
 * `<colgroup>` 의 `<col>` 개수와 표 컬럼 수.
 * 퇴점일 열이 붙고 빠지는데 한쪽만 고치면 **폭 배분이 통째로 한 칸씩 밀린다** —
 * 렌더도 되고 타입도 통과하므로 눈으로 보기 전에는 드러나지 않는다.
 */
const colCount = () => screen.getByRole("table").querySelectorAll("col").length;
const headerCount = () =>
  within(screen.getByRole("table")).getAllByRole("columnheader").length;

/**
 * 상태 대시 상자. 접근가능 이름을 `aria-label` 로 못 박아 두었으므로
 * **건수까지 정확히 맞춘다** — 건수가 틀어지면 여기서 걸린다.
 */
const statusBox = (name: string) => screen.getByRole("button", { name });

/** 미리보기 모달 — Modal 도 role="dialog" 라 이름으로 잡는다 */
const sheet = () => screen.getByRole("dialog", { name: "셀러 미리보기" });

describe("SellerListPage (S03 셀러 관리)", () => {
  describe("상태 대시 — 원본 StatDash", () => {
    it("전체와 상태 3종의 건수를 클릭 없이 보여준다", () => {
      renderPage();

      expect(statusBox("전체 7개사")).toBeVisible();
      expect(statusBox("입점 5개사")).toBeVisible();
      expect(statusBox("퇴점 처리중 1개사")).toBeVisible();
      expect(statusBox("퇴점 1개사")).toBeVisible();
    });

    it("대시 상자가 곧 상태 필터다 — 입점을 고르면 영업 중인 셀러만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("입점 5개사"));

      // 본사(베이비큐브)도 영업 중이라 5건 — PAGE_SIZE 4 라 1페이지엔 4건
      expect(visibleNames()).toEqual([
        // 본사는 셀러명 뒤에 " (본사)" 가 붙는다 — 입점사와 한 표에 섞이므로 출처를 밝힌다
        "베이비큐브 (본사)",
        "아기별상사",
        "베이비무브",
        "포근하루",
      ]);
      expect(screen.getByText("총 5건")).toBeVisible();
      expect(statusBox("입점 5개사")).toHaveAttribute("aria-pressed", "true");
    });

    it("퇴점 처리중을 고르면 정리 중인 셀러만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("퇴점 처리중 1개사"));

      expect(visibleNames()).toEqual(["튼튼주니어"]);
    });

    /** 건수는 **상태를 뺀** 나머지 조건에서 센다 — 하나를 골라도 나머지가 0 이 되지 않는다 */
    it("상태를 골라도 다른 상태의 건수는 그대로 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("퇴점 1개사"));

      expect(statusBox("입점 5개사")).toBeVisible();
      expect(statusBox("퇴점 처리중 1개사")).toBeVisible();
    });

    /** 원본은 상태 카드에 `statusTips` 를 툴팁으로 단다. "전체"에는 없다 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox("퇴점 1개사"));

      expect(
        await screen.findByText(
          "퇴점이 완료된 셀러입니다. 종결 상태라 되돌아가지 않습니다.",
        ),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 상단 카드는 상태별 **건수**뿐이고 증감(±%)도 비교 기준 문구도 없다.
     */
    it("증감 지표·비교 기준 문구를 두지 않는다", () => {
      renderPage();

      expect(screen.queryByText("전체 입점 셀러")).not.toBeInTheDocument();
      expect(screen.queryByText("평균 평점")).not.toBeInTheDocument();
      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
      expect(document.querySelector(".lucide-trending-up")).toBeNull();
      expect(document.querySelector(".lucide-trending-down")).toBeNull();
    });
  });

  describe("목록", () => {
    it("샘플 7건을 PAGE_SIZE 만큼 나눠 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("총 7건")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(3);
    });

    /** 원본 컬럼 배열의 이름과 **순서**가 정본이다 (관리 열은 없다) */
    it("표 컬럼은 원본 순서 그대로다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "셀러명",
        "위생인증",
        "대표명",
        "연락처",
        "상태",
        "수수료율",
        "입점일",
        "상품수",
        "평점",
      ]);
    });

    /**
     * 원본 수치 표기 그대로다 — 수수료율은 자릿수를 **패딩하지 않고**(`12%`),
     * 상품수는 단위 없이 천 단위만 끊고, 평점은 소수 두 자리다.
     */
    it("수수료율·상품수·평점을 원본 표기대로 낸다", () => {
      renderPage();

      const row = rowOf("아기별상사");
      expect(within(row).getByText("12%")).toBeVisible();
      expect(within(row).getByText("184")).toBeVisible();
      expect(within(row).getByText("4.82")).toBeVisible();

      // 0.5 단위가 있는 셀러는 그대로 소수가 나온다 (12.0% 처럼 맞추지 않는다)
      expect(within(rowOf("베이비무브")).getByText("9.5%")).toBeVisible();
    });

    /** 원본 `ymd` 는 `2025.11.04` 처럼 **날짜만** 낸다 */
    it("입점일은 날짜만 점 표기로 낸다", () => {
      renderPage();

      expect(within(rowOf("아기별상사")).getByText("2025.11.04")).toBeVisible();
      expect(
        within(rowOf("아기별상사")).queryByText(/10:20/),
      ).not.toBeInTheDocument();
    });

    /** 본사는 자기 자신에게 수수료를 매기지 않는다 — 0% 로 적으면 "면제"로 읽힌다 */
    it("본사 직영은 수수료율 자리를 '-' 로 둔다", () => {
      renderPage();

      const row = rowOf("베이비큐브 (본사)");
      expect(within(row).getAllByRole("cell")[5].textContent).toBe("-");
    });

    /**
     * 퇴점일은 **퇴점 필터에서만 나오는 조건부 열**이다(원본 `"퇴점" === stat` 과 같다) —
     * 영업 중인 셀러가 대부분인 기본 화면에서 늘 비어 있는 열을 세우지 않는다.
     */
    it("퇴점일 열은 퇴점 필터를 걸어야 나온다", async () => {
      const { user } = renderPage();

      expect(
        screen.queryByRole("columnheader", { name: "퇴점일" }),
      ).not.toBeInTheDocument();

      await user.click(statusBox("퇴점 1개사"));

      expect(
        screen.getByRole("columnheader", { name: "퇴점일" }),
      ).toBeInTheDocument();
      // 열 순서에 퇴점일(7)이 끼어든다
      const closed = rowOf("하늘담요");
      expect(within(closed).getAllByRole("cell")[7].textContent).toBe(
        "2026.07.30",
      );
    });

    it("퇴점일 열이 붙고 빠져도 colgroup 이 컬럼 수와 맞는다", async () => {
      const { user } = renderPage();

      expect(colCount()).toBe(headerCount());

      await user.click(statusBox("퇴점 1개사"));
      expect(colCount()).toBe(headerCount());
    });
  });

  /**
   * 원본 필터는 축이 셋이다 —
   * 기간(기준 셀렉트 + 범위) · 위생인증(칩) · 검색 조건(셀렉트 + 검색어).
   */
  describe("필터 축", () => {
    it("기간 기준을 퇴점일로 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();

      expect(screen.getByText("입점일 시작")).toBeVisible();

      await chooseOption(user, "기간 기준", "퇴점일");

      expect(screen.getByText("퇴점일 시작")).toBeVisible();
      expect(screen.getByText("퇴점일 종료")).toBeVisible();
    });

    it("위생인증은 상태와 다른 축이라 따로 건다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "위생인증", "인증안됨");

      expect(visibleNames()).toEqual(["포근하루", "튼튼주니어", "하늘담요"]);
      // 상태 대시의 건수도 이 축을 반영해 함께 줄어든다
      expect(statusBox("전체 3개사")).toBeVisible();
      expect(statusBox("입점 1개사")).toBeVisible();
    });

    it("기본 검색 조건은 셀러명이라 대표명으로는 찾히지 않는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "정다인");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 셀러가 없습니다")).toBeVisible();
    });

    it("조건을 대표명으로 바꾸면 같은 검색어로 찾힌다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "정다인");
      await chooseOption(user, "검색 조건", "대표명");

      expect(visibleNames()).toEqual(["초록숲키즈"]);
    });

    it("연락처로도 검색할 수 있다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "연락처");
      await user.type(searchBox(), "010-9903");

      expect(visibleNames()).toEqual(["초록숲키즈"]);
    });

    it("빈 상태에서 초기화하면 축 셋이 모두 되돌아간다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "대표명");
      await chooseOption(user, "기간 기준", "퇴점일");
      await chooseOption(user, "위생인증", "인증");
      await user.type(searchBox(), "없는대표");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(searchBox()).toHaveValue("");
      expect(selectOf("검색 조건")).toHaveTextContent("셀러명");
      expect(selectOf("기간 기준")).toHaveTextContent("입점일");
      expect(selectOf("위생인증")).toHaveTextContent("위생인증 전체");
    });
  });

  /**
   * 원본은 툴바 좌측(`toolsLeft`)에 엑셀 다운로드 하나만 두고 `셀러관리_N건.csv` 로 저장한다.
   */
  describe("엑셀 다운로드", () => {
    it("지금 조건으로 조회된 건수를 밝힌다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
      expect(screen.getByText("조회 결과 7건을 내려받았습니다")).toBeVisible();
    });
  });

  /**
   * ⚠️ 색 어휘를 두 갈래로 나눠 쓴다.
   * 초록/노랑/빨강 = **상태**(지금 주의를 요하는가) · 파랑(highlight) = **분류·자격**.
   * 위생인증을 success 로 칠하면 목록을 훑을 때 상태 신호와 섞여 읽힌다.
   */
  describe("색 어휘", () => {
    it("입점은 success 로 나간다", () => {
      renderPage();

      const active = within(rowOf("아기별상사")).getByText("입점");
      expect(classList(active)).toContain("text-text-success");
    });

    it("퇴점 처리중은 warning — 사람이 정리해야 끝난다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("퇴점 처리중 1개사"));

      const exiting = within(rowOf("튼튼주니어")).getByText("퇴점 처리중");
      expect(classList(exiting)).toContain("text-text-warning");
      expect(classList(exiting)).not.toContain("text-text-critical");
    });

    it("종결 상태인 퇴점은 default 라 눈에 띄지 않는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("퇴점 1개사"));

      const closed = within(rowOf("하늘담요")).getAllByText("퇴점")[0];
      expect(classList(closed)).toContain("text-text-sub");
      expect(classList(closed)).not.toContain("text-text-critical");
      expect(classList(closed)).not.toContain("text-text-warning");
    });

    it("위생인증 배지는 상태색을 쓰지 않고 highlight 계열 토큰을 주입받는다", () => {
      renderPage();

      // 배지 문구는 원본 그대로 "위생인증셀러" 다
      const certified = within(rowOf("아기별상사")).getByText("위생인증셀러");
      expect(classList(certified)).not.toContain("text-text-success");
      expect(classList(certified)).not.toContain("text-text-warning");
      expect(classList(certified)).not.toContain("text-text-critical");
      // 색은 semantic 토큰으로 주입한다 (하드코딩 금지)
      expect(
        (certified as HTMLElement).style.getPropertyValue("--tag-bg-color"),
      ).toBe("var(--color-surface-highlight-secondary)");
      expect(
        (certified as HTMLElement).style.getPropertyValue("--tag-color"),
      ).toBe("var(--color-text-highlight)");
    });

    /**
     * 위생인증은 **"있음"만 배지가 뜨는 플래그**다 — 인증받은 셀러에만 붙는다.
     * (`docs/screen-templates.md` §3-1 "분류 배지" — 플래그는 비대칭이 의도다)
     */
    it("위생인증은 있는 셀러에만 배지가 뜬다", () => {
      renderPage();

      expect(
        within(rowOf("아기별상사")).getByText("위생인증셀러"),
      ).toBeVisible();
      expect(
        within(rowOf("포근하루")).queryByText("위생인증셀러"),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * 원본에서 셀러명은 `/sellers/{id}` 링크다. 그 상세 화면이 아직 없어 미리보기로 받는다.
   */
  describe("상세 진입과 미리보기 모달", () => {
    it("셀러명을 누르면 셀러 코드와 상태 설명까지 보여준다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("퇴점 처리중 1개사"));
      await user.click(screen.getByRole("button", { name: "튼튼주니어" }));

      expect(within(sheet()).getByText("S-1155")).toBeVisible();
      expect(within(sheet()).getByText("010-5581-3027")).toBeVisible();
      expect(within(sheet()).getByText("8%")).toBeVisible();
      expect(
        within(sheet()).getByText(
          "퇴점을 신청해 잔여 주문·정산을 정리하는 중입니다. 정리가 끝나면 [퇴점]이 됩니다.",
        ),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 셀러 목록에는 행 액션이 하나도 없다. 조치는 셀러 상세 화면의 일이다.
     */
    it("모달에 액션 버튼을 두지 않고, 퇴점 처리 모달도 없다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "아기별상사" }));

      expect(
        within(sheet()).queryByRole("button", { name: "퇴점 처리" }),
      ).not.toBeInTheDocument();
      expect(
        within(sheet()).queryByRole("button", { name: "수수료율 조정" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("dialog", { name: "퇴점 처리를 시작할까요?" }),
      ).not.toBeInTheDocument();
    });

    /** 한 행이 갖는 컨트롤은 원본과 같이 **셀러명 링크 하나**뿐이다 (관리 열이 없다) */
    it("행에 다른 컨트롤을 두지 않는다", () => {
      renderPage();

      const controls = within(rowOf("아기별상사"))
        .getAllByRole("button")
        .map((button) => button.textContent);
      expect(controls).toEqual(["아기별상사"]);
    });
  });
});
