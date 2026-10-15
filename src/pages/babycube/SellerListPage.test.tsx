import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerListPage } from "./SellerListPage";

/* -------------------------------------------------------------------------
 * S03 셀러 관리 — 목록형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 의미**다 — 상태 대시가 곧 상태 필터라는 것 ·
 * 필터 축 3개(기간 기준 · 위생인증 · 검색 조건)와 접힌 요약 · 조건부 퇴점일 열 ·
 * No 순번 · 선택분 엑셀 · **상태 색과 분류 배지 색이 갈라져 있는지**.
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 함께 본다
 * 증감(±%) 요약 카드 · 행 액션(퇴점 처리 등)은
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
 *   0 체크박스 · 1 No · 2 셀러명 · 3 위생인증 · 4 대표명 · 5 연락처 · 6 상태 ·
 *   7 수수료율 · 8 입점일 · [9 퇴점일] · 상품수 · 평점
 * 퇴점 필터에서만 퇴점일이 끼어들어 뒤 두 열이 밀린다.
 */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");

/** 셀러명 칸의 **이름 버튼** 글자 — 본사 배지는 버튼 밖이라 섞이지 않는다 */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(cellsOf(row)[2]).getByRole("button").textContent ?? "",
  );
}

const visibleNos = () => bodyRows().map((row) => cellsOf(row)[1].textContent);

function rowOf(name: string): HTMLElement {
  return screen.getByRole("button", { name }).closest("tr") as HTMLElement;
}

/**
 * 검색조건을 펼친다.
 *
 * ⚠️ 조건 영역(`FilterBar`)은 **접힌 채로 열린다**(원본). 닫혀 있는 동안은 안의 컨트롤이
 * **DOM 에 아예 없으므로** 기간·위생인증·검색을 건드리는 테스트는 반드시 먼저 이것을 부른다.
 */
const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

/*
 * ⚠️ combobox 가 넷이다 — 기간 기준 · 위생인증 · 검색 조건 · 페이지당 개수.
 * 이름으로 좁히지 않으면 질의가 모호해진다.
 */
const selectOf = (name: string) => screen.getByRole("combobox", { name });

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionLabel: string,
) {
  await openFilters(user);
  await user.click(selectOf(selectName));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", {
      name: optionLabel,
    }),
  );
}

/**
 * 검색어 입력. 펼친 조건 영역 안에 있으므로 **먼저 펼친다.**
 * ⚠️ 수수료율 입력칸(행마다 하나)도 textbox 라 자리표시자로 찾는다.
 */
const searchBox = async (user: ReturnType<typeof userEvent.setup>) => {
  await openFilters(user);
  return screen.getByPlaceholderText("검색어 입력");
};

/**
 * `<colgroup>` 의 `<col>` 개수와 표 컬럼 수.
 * 퇴점일 열이 붙고 빠지는데 한쪽만 고치면 **폭 배분이 통째로 한 칸씩 밀린다**.
 */
const colCount = () => screen.getByRole("table").querySelectorAll("col").length;
const headerCount = () =>
  within(screen.getByRole("table")).getAllByRole("columnheader").length;

/**
 * 상태 대시 상자. 접근가능 이름을 `aria-label` 로 못 박아 두었으므로
 * **건수까지 정확히 맞춘다** — 건수가 틀어지면 여기서 걸린다.
 */
const statusBox = (name: string) => screen.getByRole("button", { name });

/** 샘플: 입점 26 · 퇴점 처리중 3 · 퇴점 3 (상세까지 갖춘 7곳 + 원본 v0.4 간이 25곳) */
const ACTIVE = "입점 26건";
const EXITING = "퇴점 처리중 3건";
const CLOSED = "퇴점 3건";

describe("SellerListPage (S03 셀러 관리)", () => {
  describe("상태 대시 — 원본 StatDash", () => {
    /*
     * ⚠️ 원본에는 **[전체] 카드가 없다** — `sellers.dash` 주석이
     * "목록은 항상 한 상태만 보여준다"로 못 박는다. 되살리려는 변경을 이 블록이 막는다.
     */
    it("상태 3종만 카드로 세운다 — 전체 카드는 없다 · 단위는 원본대로 「건」", () => {
      renderPage();

      expect(statusBox(ACTIVE)).toBeVisible();
      expect(statusBox(EXITING)).toBeVisible();
      expect(statusBox(CLOSED)).toBeVisible();
      expect(screen.queryByRole("button", { name: /^전체 / })).toBeNull();
    });

    it("화면은 [입점] 이 선택된 채로 열린다 (원본 기본값)", () => {
      renderPage();

      expect(statusBox(ACTIVE)).toHaveAttribute("aria-pressed", "true");
      expect(visibleNames()).not.toContain("하늘담요");
    });

    it("대시 상자가 곧 상태 필터다 — 퇴점 처리중을 고르면 정리 중인 셀러만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(EXITING));

      expect(visibleNames()).toEqual([
        "튼튼주니어",
        "장난감아저씨",
        "두리하우스",
      ]);
      expect(statusBox(EXITING)).toHaveAttribute("aria-pressed", "true");
    });

    /** 건수는 **상태를 뺀** 나머지 조건에서 센다 — 하나를 골라도 나머지가 0 이 되지 않는다 */
    it("상태를 골라도 다른 상태의 건수는 그대로 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(CLOSED));

      expect(statusBox(ACTIVE)).toBeVisible();
      expect(statusBox(EXITING)).toBeVisible();
    });

    /** 원본 v0.4 `STAT_TIP` — 설명과 다음 단계 두 문장 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox(CLOSED));

      expect(
        await screen.findByText(
          "퇴점이 끝나 거래가 종결된 셀러입니다. 더 진행할 단계가 없습니다.",
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

    /** 원본 `subnav` — 상태를 바꾸면 정렬·선택·페이지가 함께 풀린다 */
    it("상태를 바꾸면 정렬·선택·페이지가 풀린다", async () => {
      const { user } = renderPage();

      /* 정렬하면 아기별상사가 1페이지 밖으로 나가므로 먼저 고른다 */
      await user.click(
        screen.getByRole("checkbox", { name: "아기별상사 선택" }),
      );
      await user.click(
        within(screen.getByRole("columnheader", { name: "상품수" })).getByRole(
          "button",
        ),
      );
      await user.click(screen.getByRole("button", { name: "2" }));

      await user.click(statusBox(EXITING));
      await user.click(statusBox(ACTIVE));

      expect(
        screen.getByRole("columnheader", { name: "상품수" }),
      ).toHaveAttribute("aria-sort", "none");
      expect(visibleNos()[0]).toBe("26");
      expect(
        screen.getByRole("checkbox", { name: "아기별상사 선택" }),
      ).not.toBeChecked();
    });
  });

  describe("목록", () => {
    it("기본 상태(입점) 26건을 10건씩 나눠 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(10);
      expect(
        screen.getByRole("heading", { name: "목록 (총 26건)" }),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "3" }));
      expect(bodyRows()).toHaveLength(6);
    });

    /**
     * 원본 표의 No 는 **조회 결과의 역순 순번**(`total - start - i`)이다 — 레코드 번호가 아니다.
     * 페이지를 넘겨도 이어지고, 필터를 바꾸면 다시 센다.
     */
    it("No 는 조회 결과의 역순 순번이다", async () => {
      const { user } = renderPage();

      expect(visibleNos()).toEqual([
        "26",
        "25",
        "24",
        "23",
        "22",
        "21",
        "20",
        "19",
        "18",
        "17",
      ]);

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(visibleNos()[0]).toBe("16");

      await user.click(statusBox(CLOSED));
      expect(visibleNos()).toEqual(["3", "2", "1"]);
    });

    /** 원본 컬럼 배열의 이름과 **순서**가 정본이다 (관리 열은 없다) */
    it("표 컬럼은 원본 순서 그대로다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "",
        "No",
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
     * 원본 v0.4 표기 — 상품수 `184개` · 평점 `★ 4.8`.
     * 수수료율은 **셀 안 입력칸**이다(원본 `feecell`) — 글자가 아니라 값으로 확인한다.
     */
    it("상품수·평점을 원본 표기대로 내고, 수수료율은 셀 입력칸에 담는다", () => {
      renderPage();

      const row = rowOf("아기별상사");
      expect(within(row).getByText("184개")).toBeVisible();
      expect(within(row).getByText("★ 4.8")).toBeVisible();
      expect(within(row).getByLabelText("아기별상사 수수료율")).toHaveValue(
        "12",
      );

      // 0.5 단위가 있는 셀러는 그대로 소수가 나온다 (12.0% 처럼 맞추지 않는다)
      expect(
        within(rowOf("베이비무브")).getByLabelText("베이비무브 수수료율"),
      ).toHaveValue("9.5");
    });

    /** 원본 `ymd` 는 `2025.11.04` 처럼 **날짜만** 낸다 */
    it("입점일은 날짜만 점 표기로 낸다", () => {
      renderPage();

      expect(within(rowOf("아기별상사")).getByText("2025.11.04")).toBeVisible();
      expect(
        within(rowOf("아기별상사")).queryByText(/10:20/),
      ).not.toBeInTheDocument();
    });

    /** 본사는 수수료율 0% 확정 — 입력칸을 만들지 않는다. 셀러명 옆에는 「본사」 배지(원본 b-blue) */
    it("본사 직영은 「본사」 배지를 달고 수수료율은 0% 로 고정이다", () => {
      renderPage();

      const row = rowOf("베이비큐브");
      const badge = within(cellsOf(row)[2]).getByText("본사");
      expect(
        (badge as HTMLElement).style.getPropertyValue("--tag-bg-color"),
      ).toBe("var(--color-surface-highlight-secondary)");
      expect(cellsOf(row)[7].textContent).toBe("0%");
      expect(
        within(row).queryByLabelText("베이비큐브 수수료율"),
      ).not.toBeInTheDocument();
    });

    /**
     * 퇴점일은 **퇴점 필터에서만 나오는 조건부 열**이다(원본 `"퇴점" === stat` 과 같다).
     */
    it("퇴점일 열은 퇴점 필터를 걸어야 나온다", async () => {
      const { user } = renderPage();

      expect(
        screen.queryByRole("columnheader", { name: "퇴점일" }),
      ).not.toBeInTheDocument();

      await user.click(statusBox(CLOSED));

      expect(
        screen.getByRole("columnheader", { name: "퇴점일" }),
      ).toBeInTheDocument();
      expect(cellsOf(rowOf("하늘담요"))[9].textContent).toBe("2026.07.30");
    });

    it("퇴점일 열이 붙고 빠져도 colgroup 이 컬럼 수와 맞는다", async () => {
      const { user } = renderPage();

      expect(colCount()).toBe(headerCount());

      await user.click(statusBox(CLOSED));
      expect(colCount()).toBe(headerCount());
    });
  });

  /**
   * 원본 필터는 축이 셋이다 —
   * 기간(기준 셀렉트 + 범위) · 위생인증(칩) · 검색 조건(셀렉트 + 검색어).
   * 접힌 검색조건 줄은 걸린 조건을 요약한다.
   */
  describe("검색조건", () => {
    it("접힌 채로 열리고, 조건이 없으면 「조건 없음 (전체)」 다", () => {
      renderPage();

      expect(screen.getByRole("button", { name: /검색 열기/ })).toBeVisible();
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("기간 기준을 퇴점일로 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();

      await openFilters(user);
      expect(screen.getByText("입점일 시작")).toBeVisible();

      await chooseOption(user, "기간 기준", "퇴점일");

      expect(screen.getByText("퇴점일 시작")).toBeVisible();
      expect(screen.getByText("퇴점일 종료")).toBeVisible();
    });

    it("위생인증은 상태와 다른 축이라 따로 걸고, 요약이 그것을 말한다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "위생인증", "인증안됨");

      expect(visibleNames()).toContain("포근하루");
      expect(visibleNames()).not.toContain("아기별상사");
      // 상태 대시의 건수는 상태를 뺀 나머지 축(위생인증)을 반영해 함께 줄어든다
      expect(statusBox("입점 11건")).toBeVisible();
      expect(statusBox("퇴점 처리중 3건")).toBeVisible();
      expect(statusBox("퇴점 2건")).toBeVisible();
      expect(screen.getByText("위생인증 인증안됨")).toBeVisible();
    });

    it("기본 검색 조건은 셀러명이라 대표명으로는 찾히지 않는다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "정다인");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 셀러가 없습니다")).toBeVisible();
    });

    /** 기본 상태([입점]) 밖의 셀러는 검색어가 맞아도 나오지 않는다 — 목록은 한 상태만 본다 */
    it("다른 상태의 셀러는 검색으로 끌어오지 않는다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "하늘담요");

      expect(bodyRows()).toHaveLength(0);
      await user.click(statusBox("퇴점 1건"));
      expect(visibleNames()).toEqual(["하늘담요"]);
    });

    it("조건을 대표명으로 바꾸면 같은 검색어로 찾힌다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "정다인");
      await chooseOption(user, "검색 조건", "대표명");

      expect(visibleNames()).toEqual(["초록숲키즈"]);
      expect(screen.getByText("대표명 «정다인»")).toBeVisible();
    });

    it("연락처로도 검색할 수 있다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "연락처");
      await user.type(await searchBox(user), "010-9903");

      expect(visibleNames()).toEqual(["초록숲키즈"]);
    });

    it("빈 상태에서 초기화하면 축 셋이 모두 되돌아간다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "대표명");
      await chooseOption(user, "기간 기준", "퇴점일");
      await chooseOption(user, "위생인증", "인증");
      await user.type(await searchBox(user), "없는대표");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(10);
      expect(statusBox(ACTIVE)).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
      await openFilters(user);
      expect(screen.getByPlaceholderText("검색어 입력")).toHaveValue("");
      expect(selectOf("검색 조건")).toHaveTextContent("셀러명");
      expect(selectOf("기간 기준")).toHaveTextContent("입점일");
      expect(selectOf("위생인증")).toHaveTextContent("위생인증 전체");
    });
  });

  /**
   * 원본 `exportCsv` — **지금 조회 결과 안에서 고른 행**이 있으면 그것만, 없으면 조회 결과 전체.
   * 퍼블은 파일을 만들지 않고 대상 건수만 알린다.
   */
  describe("엑셀 다운로드", () => {
    it("고른 행이 없으면 조회 결과 전체가 대상이다 — 1페이지만이 아니다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
      expect(screen.getByText("조회 결과 26건을 내려받았습니다")).toBeVisible();
    });

    it("고른 행이 있으면 그 행만 대상이다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "아기별상사 선택" }),
      );
      await user.click(screen.getByRole("checkbox", { name: "포근하루 선택" }));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(screen.getByText("선택한 2건을 내려받았습니다")).toBeVisible();
    });

    /** 조건을 바꿔 결과 밖으로 나간 선택은 세지 않는다 — 보이지 않는 행이 담기면 안 된다 */
    it("조회 결과 밖으로 나간 선택은 세지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "아기별상사 선택" }),
      );
      await user.type(await searchBox(user), "포근");
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      /* 포근하루 · 포근하우스 · 포근솜사탕 — 아기별상사는 결과에 없다 */
      expect(screen.getByText("조회 결과 3건을 내려받았습니다")).toBeVisible();
    });

    it("머리글 체크박스는 이 페이지의 행만 고른다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(screen.getByText("선택한 10건을 내려받았습니다")).toBeVisible();
    });
  });

  /**
   * ⚠️ 색 어휘를 두 갈래로 나눠 쓴다.
   * 초록/노랑/빨강 = **상태**(지금 주의를 요하는가) · 파랑(highlight) = **분류·자격**.
   */
  describe("색 어휘", () => {
    it("입점은 success 로 나간다", () => {
      renderPage();

      const active = within(rowOf("아기별상사")).getByText("입점");
      expect(classList(active)).toContain("text-text-success");
    });

    it("퇴점 처리중은 warning — 사람이 정리해야 끝난다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(EXITING));

      const exiting = within(rowOf("튼튼주니어")).getByText("퇴점 처리중");
      expect(classList(exiting)).toContain("text-text-warning");
      expect(classList(exiting)).not.toContain("text-text-critical");
    });

    it("종결 상태인 퇴점은 default 라 눈에 띄지 않는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(CLOSED));

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

    /** 위생인증은 **"있음"만 배지가 뜨는 플래그**다 — 인증받은 셀러에만 붙는다 */
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

  describe("상세 진입", () => {
    it("셀러명을 누르면 셀러 상세로 이동한다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(statusBox(EXITING));
      await user.click(screen.getByRole("button", { name: "튼튼주니어" }));

      expect(onNavSelect).toHaveBeenCalledWith("/sellers/S-1155");
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 행의 컨트롤은 **체크박스 · 셀러명 링크 · 수수료율 [수정]** 뿐이다.
     */
    it("행 컨트롤은 체크박스·셀러명·수수료율 수정뿐이다", () => {
      renderPage();

      const row = rowOf("아기별상사");
      expect(
        within(row)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["아기별상사", "수정"]);
      expect(within(row).getAllByRole("checkbox")).toHaveLength(1);
      expect(
        screen.queryByRole("button", { name: "퇴점 처리" }),
      ).not.toBeInTheDocument();
    });
  });
});

/* -------------------------------------------------------------------------
 * 정렬 — 원본 헤더에 ↕ 가 붙은 열 (입점일 · [퇴점일] · 상품수 · 평점)
 * ---------------------------------------------------------------------- */

describe("정렬", () => {
  const header = (name: string) => screen.getByRole("columnheader", { name });
  const sortButton = (name: string) => within(header(name)).getByRole("button");

  it("원본이 ↕ 를 붙인 열만 누를 수 있다", () => {
    renderPage();

    for (const name of ["입점일", "상품수", "평점"]) {
      expect(header(name)).toHaveAttribute("aria-sort", "none");
    }
    /* 셀러명·수수료율에는 원본에 ↕ 가 없다 */
    for (const name of ["셀러명", "수수료율", "No"]) {
      expect(header(name)).not.toHaveAttribute("aria-sort");
      expect(within(header(name)).queryByRole("button")).toBeNull();
    }
  });

  it("상품수 오름차순 → 내림차순 → 해제 순으로 돈다", async () => {
    const { user } = renderPage();
    const original = visibleNames();

    await user.click(sortButton("상품수"));
    expect(header("상품수")).toHaveAttribute("aria-sort", "ascending");
    const asc = visibleNames();
    expect(asc).not.toEqual(original);

    await user.click(sortButton("상품수"));
    expect(header("상품수")).toHaveAttribute("aria-sort", "descending");
    expect(visibleNames()).not.toEqual(asc);

    await user.click(sortButton("상품수"));
    expect(header("상품수")).toHaveAttribute("aria-sort", "none");
    expect(visibleNames()).toEqual(original);
  });

  it("평점 정렬은 소수까지 비교한다", async () => {
    const { user } = renderPage();

    await user.click(sortButton("평점"));

    const ratings = bodyRows().map((row) =>
      Number(cellsOf(row)[10].textContent?.replace("★ ", "")),
    );
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  /** 원본 `sortHead(scr, "퇴점일", "quitAt")` — [퇴점] 탭의 퇴점일도 정렬한다 */
  it("[퇴점] 탭에서는 퇴점일로도 정렬한다", async () => {
    const { user } = renderPage();

    await user.click(statusBox(CLOSED));
    await user.click(sortButton("퇴점일"));

    expect(visibleNames()).toEqual(["방긋상회", "봄날유아", "하늘담요"]);
  });

  /** No 는 순번이라 정렬해도 위에서부터 다시 센다 — 건너뛰는 번호가 없다 */
  it("정렬해도 No 는 위에서부터 역순 순번이다", async () => {
    const { user } = renderPage();

    await user.click(sortButton("상품수"));

    expect(visibleNos()[0]).toBe("26");
    expect(visibleNos()[9]).toBe("17");
  });
});

/* -------------------------------------------------------------------------
 * 수수료율 인라인 수정 (원본 `feecell`) — 퍼블은 검증 + 알림만
 * ---------------------------------------------------------------------- */

describe("수수료율 인라인 수정", () => {
  const feeOf = (name: string) =>
    within(rowOf(name)).getByLabelText(`${name} 수수료율`);

  it("셀에서 고치고 [수정] 을 누르면 알린다", async () => {
    const { user } = renderPage();

    await user.clear(feeOf("아기별상사"));
    await user.type(feeOf("아기별상사"), "15");
    await user.click(
      within(rowOf("아기별상사")).getByRole("button", { name: "수정" }),
    );

    expect(feeOf("아기별상사")).toHaveValue("15");
    expect(
      await screen.findByText("아기별상사 수수료율을 15% 로 변경했습니다"),
    ).toBeVisible();
  });

  it("Enter 로도 확정된다 — 버튼까지 가지 않아도 된다", async () => {
    const { user } = renderPage();

    await user.clear(feeOf("베이비무브"));
    await user.type(feeOf("베이비무브"), "7{Enter}");

    expect(
      await screen.findByText("베이비무브 수수료율을 7% 로 변경했습니다"),
    ).toBeVisible();
  });

  /*
   * 범위를 벗어나거나 숫자가 아니면 **되돌리고 알린다.** 조용히 버리면
   * 사용자는 고쳐졌다고 믿는다.
   */
  it("0~100 밖의 값은 되돌리고 알린다", async () => {
    const { user } = renderPage();

    await user.clear(feeOf("아기별상사"));
    await user.type(feeOf("아기별상사"), "150{Enter}");

    expect(feeOf("아기별상사")).toHaveValue("12");
    expect(
      await screen.findByText("수수료율은 0~100 사이의 숫자로 입력해 주세요"),
    ).toBeVisible();
  });

  /** 저장하지 않으므로(퍼블 범위) 초기화하면 고친 값이 모두 처음 값으로 돌아간다 */
  it("초기화하면 고친 수수료율이 처음 값으로 돌아간다", async () => {
    const { user } = renderPage();

    await user.clear(feeOf("아기별상사"));
    await user.type(feeOf("아기별상사"), "15{Enter}");

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(feeOf("아기별상사")).toHaveValue("12");
  });
});

/* -------------------------------------------------------------------------
 * 페이지당 개수 · 데이터 상태
 * ---------------------------------------------------------------------- */

describe("페이지당 개수", () => {
  it("원본처럼 10·20·50·100 이고, 늘리면 한 페이지에 더 담고 1페이지로 돌아간다", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    await user.click(screen.getByRole("option", { name: "50개씩 보기" }));

    expect(bodyRows()).toHaveLength(26);
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  const renderAt = (url: string) => {
    window.history.replaceState(null, "", url);
    return renderPage();
  };

  afterEach(() => window.history.replaceState(null, "", "/sellers"));

  it("loading — 툴바·헤더는 남기고 본문만 스켈레톤이다", () => {
    renderAt("/sellers?preview=loading");

    expect(screen.getByRole("button", { name: "엑셀 다운로드" })).toBeVisible();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("해당 조건의 셀러가 없습니다")).toBeNull();
  });

  it("empty — 빈 상태를 보여주고 스켈레톤은 없다", () => {
    renderAt("/sellers?preview=empty");

    expect(screen.getByText("해당 조건의 셀러가 없습니다")).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });
});
