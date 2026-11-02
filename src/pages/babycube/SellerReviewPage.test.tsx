import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerReviewPage } from "./SellerReviewPage";

/* -------------------------------------------------------------------------
 * S04 입점 심사 — 목록형 (+ 행 선택 · 일괄 심사)
 *
 * ## 무엇을 검증하는가
 * 이 화면의 핵심은 **누구를 고를 수 있고, 고른 뒤 무슨 일이 벌어지는가**다 —
 * 승인요청 건만 선택되는지 · 전체 선택이 처리 완료 건까지 집어가지 않는지 ·
 * **승인 창에서 수수료율을 확정해야만 넘어가는지** · 처리는 알림만(퍼블 범위) ·
 * 사유 없이는 반려가 막히는지 · No 순번 · 검색조건 접기 · v0.4 문구.
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 함께 본다
 * 증감(±%) 요약 카드 · 단건 심사 버튼 · 엑셀 다운로드는 **원본 어드민에 없어서 걷어냈다.**
 *
 * ## 같은 글자의 버튼이 두 곳에 있다
 * "승인 처리"·"반려 처리"는 일괄 작업 바와 확인 모달에 모두 있다.
 * 화면 전체에서 이름으로 찾으면 어느 쪽인지 알 수 없으므로
 * **쿼리는 반드시 영역을 좁혀서** 한다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다 — no-op 으로 채운다.
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
      <SellerReviewPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/seller-review"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 일괄 작업 바 — 선택이 있을 때만 존재한다 */
const bar = () => screen.getByRole("group", { name: "선택한 신청 일괄 심사" });
const queryBar = () =>
  screen.queryByRole("group", { name: "선택한 신청 일괄 심사" });

const approveModal = () =>
  screen.getByRole("dialog", { name: /^입점 심사 승인/ });
const rejectModal = () =>
  screen.getByRole("dialog", { name: /^입점 반려 사유 입력/ });

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/**
 * 열 순서(원본 컬럼 배열 그대로):
 *   0 선택 · 1 No · 2 셀러명 · 3 대표명 · 4 연락처 · 5 유형 · 6 사업자 · 7 신청일 ·
 *   [8 승인일 | 8 반려일] · 상태
 */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");

function visibleNames(): string[] {
  return bodyRows().map((row) => cellsOf(row)[2].textContent ?? "");
}

const visibleNos = () => bodyRows().map((row) => cellsOf(row)[1].textContent);

function rowOf(name: string): HTMLElement {
  return screen.getByRole("button", { name }).closest("tr") as HTMLElement;
}

const cellText = (name: string, index: number) =>
  cellsOf(rowOf(name))[index].textContent;

/** `<colgroup>` 의 `<col>` 개수와 표 컬럼 수 — 조건부 열이 붙고 빠질 때 어긋나지 않는지 */
const colCount = () => screen.getByRole("table").querySelectorAll("col").length;
const headerCount = () =>
  within(screen.getByRole("table")).getAllByRole("columnheader").length;

const rowCheckbox = (name: string) =>
  screen.getByRole("checkbox", { name: `${name} 선택` });

const selectAll = () => screen.getByRole("checkbox", { name: "전체 선택" });

/** 상태 대시 상자 — 접근가능 이름에 건수까지 들어 있다 */
const statusBox = (name: string) => screen.getByRole("button", { name });

/**
 * 검색조건을 펼친다. 접힌 동안은 안의 컨트롤이 **DOM 에 없으므로**
 * 기간·검색을 건드리는 테스트는 먼저 이것을 부른다.
 */
const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

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

const searchBox = async (user: ReturnType<typeof userEvent.setup>) => {
  await openFilters(user);
  return screen.getByPlaceholderText("검색어 입력");
};

/** 샘플: v0.4 `SELLER_REVIEW` 14건 — 승인요청 8 · 승인 3 · 반려 3 */
const REQUESTED = "승인요청 8건";
const APPROVED = "승인 3건";
const REJECTED = "반려 3건";

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  ...names: string[]
) {
  for (const name of names) await user.click(rowCheckbox(name));
}

describe("SellerReviewPage (S04 입점 심사)", () => {
  describe("상태 대시 — 원본 StatDash", () => {
    it("상태 3종만 카드로 세운다 — 전체 카드는 없다", () => {
      renderPage();

      expect(statusBox(REQUESTED)).toBeVisible();
      expect(statusBox(APPROVED)).toBeVisible();
      expect(statusBox(REJECTED)).toBeVisible();
      expect(screen.queryByRole("button", { name: /^전체 / })).toBeNull();
    });

    it("화면은 [승인요청] 이 선택된 채로 열린다 (원본 기본값)", () => {
      renderPage();

      expect(statusBox(REQUESTED)).toHaveAttribute("aria-pressed", "true");
      expect(visibleNames()).toEqual([
        "코지베이비",
        "그린키즈",
        "도담도담",
        "꼬망세",
        "베이비플로우",
        "몽실베베",
        "토실토실",
        "폴짝상점",
      ]);
    });

    it("대시 상자가 곧 상태 필터다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(REJECTED));

      expect(visibleNames()).toEqual(["베베리움", "라라키즈", "자란다"]);
    });

    /** 원본 v0.4 `STAT_TIP` — 설명과 다음 단계 두 문장 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox(APPROVED));

      expect(
        await screen.findByText(
          "본사 심사를 통과한 건입니다. 더 진행할 단계가 없습니다.",
        ),
      ).toBeVisible();
    });

    it("상태를 바꾸면 정렬·선택이 풀린다 (원본 subnav)", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(screen.getByRole("columnheader", { name: "신청일" })).getByRole(
          "button",
        ),
      );

      await user.click(statusBox(APPROVED));
      await user.click(statusBox(REQUESTED));

      expect(
        screen.getByRole("columnheader", { name: "신청일" }),
      ).toHaveAttribute("aria-sort", "none");
      expect(rowCheckbox("코지베이비")).not.toBeChecked();
      expect(queryBar()).toBeNull();
    });

    it("증감 지표·비교 기준 문구를 두지 않는다", () => {
      renderPage();

      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
      expect(document.querySelector(".lucide-trending-up")).toBeNull();
    });
  });

  describe("목록", () => {
    it("머리에 「목록 (총 N건)」 을 내고, 엑셀 다운로드는 없다 (원본 EXPORT_SPEC 미등록)", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "목록 (총 8건)" }),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "엑셀 다운로드" }),
      ).toBeNull();
    });

    /** 원본 `total - start - i` — 레코드 번호가 아니라 조회 결과의 역순 순번이다 */
    it("No 는 조회 결과의 역순 순번이다 — 필터를 바꾸면 다시 센다", async () => {
      const { user } = renderPage();

      expect(visibleNos()).toEqual(["8", "7", "6", "5", "4", "3", "2", "1"]);

      await user.click(statusBox(APPROVED));
      expect(visibleNos()).toEqual(["3", "2", "1"]);
    });

    it("표 컬럼은 원본 순서 그대로다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "",
        "No",
        "셀러명",
        "대표명",
        "연락처",
        "유형",
        "사업자",
        "신청일",
        "상태",
      ]);
    });

    it("사업자 열은 법인/개인이다 (원본 s.biz)", () => {
      renderPage();

      expect(cellText("코지베이비", 6)).toBe("법인");
      expect(cellText("그린키즈", 6)).toBe("개인");
    });

    it("렌트·판매를 함께 하겠다는 신청은 배지가 둘 뜬다", () => {
      renderPage();

      const kinds = within(cellsOf(rowOf("코지베이비"))[5]).getAllByText(
        /렌트|판매/,
      );
      expect(kinds.map((tag) => tag.textContent)).toEqual(["렌트", "판매"]);
    });

    it("신청일은 초까지, 승인일·반려일은 날짜만 낸다", async () => {
      const { user } = renderPage();

      expect(cellText("코지베이비", 7)).toBe("2026.06.20 14:32:08");

      await user.click(statusBox(APPROVED));
      expect(cellText("맘스토이", 8)).toBe("2026.06.14");
    });

    it("승인일 열은 승인 필터에서만, 반려일 열은 반려 필터에서만 나온다", async () => {
      const { user } = renderPage();
      const header = (name: string) =>
        screen.queryByRole("columnheader", { name });

      expect(header("승인일")).toBeNull();
      expect(header("반려일")).toBeNull();

      await user.click(statusBox(APPROVED));
      expect(header("승인일")).toBeInTheDocument();
      expect(header("반려일")).toBeNull();

      await user.click(statusBox(REJECTED));
      expect(header("승인일")).toBeNull();
      expect(header("반려일")).toBeInTheDocument();
    });

    it("조건부 열이 붙고 빠져도 colgroup 이 컬럼 수와 맞는다", async () => {
      const { user } = renderPage();

      expect(colCount()).toBe(headerCount());
      await user.click(statusBox(APPROVED));
      expect(colCount()).toBe(headerCount());
      await user.click(statusBox(REJECTED));
      expect(colCount()).toBe(headerCount());
    });

    it("페이지당 개수는 원본처럼 10·20·50·100 이다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    });
  });

  describe("정렬 — 원본 헤더의 ↕", () => {
    const header = (name: string) => screen.getByRole("columnheader", { name });
    const sortButton = (name: string) =>
      within(header(name)).getByRole("button");

    it("신청일 오름차순 → 내림차순 → 해제", async () => {
      const { user } = renderPage();
      const original = visibleNames();

      await user.click(sortButton("신청일"));
      expect(visibleNames()[0]).toBe("폴짝상점");

      await user.click(sortButton("신청일"));
      expect(visibleNames()[0]).toBe("코지베이비");

      await user.click(sortButton("신청일"));
      expect(visibleNames()).toEqual(original);
    });

    it("[승인] 탭에서는 승인일로도 정렬한다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(APPROVED));
      await user.click(sortButton("승인일"));

      expect(visibleNames()).toEqual(["우리아기첫날", "오구오구", "맘스토이"]);
    });

    it("정렬해도 No 는 위에서부터 역순 순번이다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("신청일"));

      expect(visibleNos()[0]).toBe("8");
    });
  });

  describe("검색조건", () => {
    /* 사용자 결정 2026-10-19 — 원본은 접힘이지만 펼친 채로 연다 */
    it("펼친 채로 열리고, 접으면 「조건 없음 (전체)」 다", async () => {
      const { user } = renderPage();
      expect(screen.getByRole("button", { name: /검색 닫기/ })).toBeVisible();

      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("기간 기준을 승인일로 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "기간 기준", "승인일");

      expect(screen.getByText("승인일 시작")).toBeVisible();
    });

    it("검색 조건을 바꾸면 같은 검색어의 결과가 달라지고 요약이 그것을 말한다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "배수정");
      expect(bodyRows()).toHaveLength(0);

      await chooseOption(user, "검색 조건", "대표명");
      expect(visibleNames()).toEqual(["그린키즈"]);
      expect(screen.getByText("대표명 «배수정»")).toBeVisible();
    });

    it("빈 상태에서 초기화하면 축이 모두 되돌아간다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "대표명");
      await user.type(await searchBox(user), "없는사람");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(8);
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });
  });

  /**
   * ⚠️ 이 화면의 핵심 — **승인요청 건만** 고를 수 있다.
   * 원본은 모든 행을 고를 수 있지만, 이미 처리된 건을 다시 처리할 근거가 없다.
   */
  describe("행 선택", () => {
    it("승인요청 목록의 행은 모두 고를 수 있다", () => {
      renderPage();

      for (const row of bodyRows()) {
        expect(within(row).getByRole("checkbox")).toBeEnabled();
      }
    });

    it("이미 처리된 건은 고를 수 없고, 전체 선택도 잠긴다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(APPROVED));

      expect(rowCheckbox("맘스토이")).toBeDisabled();
      expect(selectAll()).toBeDisabled();
    });

    it("전체 선택은 지금 페이지의 심사 가능한 행을 고른다", async () => {
      const { user } = renderPage();

      await user.click(selectAll());

      expect(within(bar()).getByText("8건 선택됨")).toBeVisible();
    });

    it("일부만 고르면 전체 선택이 부분 선택 상태가 된다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");

      expect(selectAll()).toBePartiallyChecked();
    });

    it("선택이 없으면 일괄 작업 바가 아예 없다", () => {
      renderPage();

      expect(queryBar()).toBeNull();
    });
  });

  /**
   * 승인 창 — v0.4 `gateApprove` 의 제목·본문·경고 + 셀러별 수수료율·위생인증 확정(우리 추가).
   * 수수료율 규칙은 상세와 같다(0 초과 100 이하).
   */
  describe("일괄 승인", () => {
    it("원본 문구로 열리고, 1건이면 제목에 건수가 붙지 않는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      const dialog = screen.getByRole("dialog", { name: "입점 심사 승인" });
      expect(
        within(dialog).getByText(
          "승인하면 입점 상태로 전환되어 셀러가 상품을 등록·판매할 수 있게 됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("승인 후에는 이 화면에서 되돌릴 수 없습니다."),
      ).toBeVisible();
    });

    it("여러 건이면 제목에 건수가 붙는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비", "그린키즈");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      expect(
        screen.getByRole("dialog", { name: "입점 심사 승인 (2건)" }),
      ).toBeVisible();
    });

    /** 신청 단계의 0% 는 "아직 정하지 않음" — 빈 칸으로 연다 */
    it("수수료율은 빈 칸, 위생인증은 인증안됨으로 연다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      expect(
        within(approveModal()).getByLabelText("코지베이비 수수료율"),
      ).toHaveValue("");
      expect(
        within(approveModal()).getByRole("radio", { name: "인증안됨" }),
      ).toBeChecked();
    });

    it("수수료율이 비었거나 0 이면 처리되지 않고 오류만 낸다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(within(approveModal()).getByRole("alert")).toHaveTextContent(
        "모든 셀러의 수수료율을 0보다 크고 100 이하로 입력해 주세요.",
      );

      await user.type(
        within(approveModal()).getByLabelText("코지베이비 수수료율"),
        "0",
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );
      expect(approveModal()).toBeVisible();
      expect(screen.queryByText("승인 처리되었습니다.")).toBeNull();
    });

    it("여러 건 중 하나만 비어도 전부 처리되지 않는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비", "그린키즈");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.type(
        within(approveModal()).getByLabelText("코지베이비 수수료율"),
        "12",
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(approveModal()).toBeVisible();
      expect(screen.queryByText(/승인 처리되었습니다/)).toBeNull();
    });

    /** 퍼블은 저장하지 않는다 — 알리고 선택을 풀 뿐, 행·건수는 그대로다 */
    it("모두 맞으면 알리고 선택을 푼다 — 행과 건수는 바꾸지 않는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비", "그린키즈");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.type(
        within(approveModal()).getByLabelText("코지베이비 수수료율"),
        "12",
      );
      await user.type(
        within(approveModal()).getByLabelText("그린키즈 수수료율"),
        "9.5",
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(await screen.findByText("2건 승인 처리되었습니다.")).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(queryBar()).toBeNull();
      expect(statusBox(REQUESTED)).toHaveAttribute("aria-pressed", "true");
      expect(visibleNames()).toContain("코지베이비");
    });

    it("1건이면 「승인 처리되었습니다.」 다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.type(
        within(approveModal()).getByLabelText("코지베이비 수수료율"),
        "12",
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(await screen.findByText("승인 처리되었습니다.")).toBeVisible();
    });

    it("취소하면 아무 일도 일어나지 않는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "취소" }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(rowCheckbox("코지베이비")).toBeChecked();
    });
  });

  /** 반려 창 — v0.4 `_MODAL_CFG.reject` 문구. 빈 사유(공백만 포함)는 막는다 */
  describe("일괄 반려", () => {
    it("원본 문구로 열린다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      const dialog = screen.getByRole("dialog", {
        name: "입점 반려 사유 입력",
      });
      expect(within(dialog).getByRole("textbox")).toHaveAttribute(
        "placeholder",
        "반려 사유를 입력하세요 (예: 사업자등록증 미비, KC 미인증, 취급 품목 부적합 등)",
      );
      expect(
        within(dialog).getByText("입력한 사유는 입점 심사 상세에 기록됩니다."),
      ).toBeVisible();
    });

    it("사유가 비거나 공백뿐이면 반려되지 않고 이유를 낸다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );
      await user.type(within(rejectModal()).getByRole("textbox"), "   ");
      await user.click(
        within(rejectModal()).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        within(rejectModal()).getByText("반려 사유를 입력해주세요."),
      ).toBeVisible();
      expect(screen.queryByText("반려 처리되었습니다.")).toBeNull();
    });

    it("여러 건이면 제목에 건수가 붙고, 처리하면 「N건을 반려 처리했습니다.」", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비", "그린키즈");
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        screen.getByRole("dialog", { name: "입점 반려 사유 입력 (2건)" }),
      ).toBeVisible();

      await user.type(within(rejectModal()).getByRole("textbox"), "서류 미비");
      await user.click(
        within(rejectModal()).getByRole("button", { name: "반려 처리" }),
      );

      expect(await screen.findByText("2건을 반려 처리했습니다.")).toBeVisible();
      expect(queryBar()).toBeNull();
    });

    it("닫았다 다시 열면 적던 사유가 남지 않는다", async () => {
      const { user } = renderPage();

      await pick(user, "코지베이비");
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );
      await user.type(
        within(rejectModal()).getByRole("textbox"),
        "적다 만 사유",
      );
      await user.click(
        within(rejectModal()).getByRole("button", { name: "취소" }),
      );
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      expect(within(rejectModal()).getByRole("textbox")).toHaveValue("");
    });
  });

  describe("상태 색", () => {
    it("승인요청은 warning — 지금 사람이 심사해야 끝난다", () => {
      renderPage();

      const tag = within(rowOf("코지베이비")).getByText("승인요청");
      expect(classList(tag)).toContain("text-text-warning");
    });

    it("반려는 critical — 비정상 종료라 눈에 띄어야 한다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(REJECTED));

      const tag = within(rowOf("베베리움")).getByText("반려");
      expect(classList(tag)).toContain("text-text-critical");
    });

    it("승인은 default — 제대로 끝난 일이라 눈에 띌 이유가 없다", async () => {
      const { user } = renderPage();

      await user.click(statusBox(APPROVED));

      const tag = within(rowOf("맘스토이")).getByText("승인");
      expect(classList(tag)).toContain("text-text-sub");
    });

    it("유형 배지는 상태색을 쓰지 않는다", () => {
      renderPage();

      const tag = within(rowOf("그린키즈")).getByText("렌트");
      expect(classList(tag)).not.toContain("text-text-success");
      expect(classList(tag)).not.toContain("text-text-warning");
    });
  });

  describe("상세 진입", () => {
    it("셀러명을 누르면 입점 심사 상세로 이동한다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "코지베이비" }));

      expect(onNavSelect).toHaveBeenCalledWith("/seller-review/SR-318");
    });

    /** 링크 글자만 눌려 「못 들어가는 곳인가」 헷갈리던 것 — 행 어디를 눌러도 간다(사용자 결정 2026-11-02) */
    it("행의 다른 칸을 눌러도 같은 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf("코지베이비");

      await user.click(within(row).getAllByRole("cell")[1]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/seller-review/SR-318");
    });

    it("목록에 단건 심사 버튼을 두지 않는다", () => {
      renderPage();

      expect(
        within(rowOf("코지베이비"))
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["코지베이비"]);
    });
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  const renderAt = (url: string) => {
    window.history.replaceState(null, "", url);
    return renderPage();
  };

  afterEach(() => window.history.replaceState(null, "", "/seller-review"));

  it("loading — 머리는 남기고 본문만 스켈레톤이다", () => {
    renderAt("/seller-review?preview=loading");

    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("해당 조건의 신청이 없습니다")).toBeNull();
  });

  it("empty — 빈 상태를 보여주고 스켈레톤은 없다", () => {
    renderAt("/seller-review?preview=empty");

    expect(screen.getByText("해당 조건의 신청이 없습니다")).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });
});
