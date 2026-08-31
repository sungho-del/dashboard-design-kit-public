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
 * **승인 게이트에서 수수료율을 확정해야만 넘어가는지** · 승인이 표에 반영되고
 * 그 행이 다시는 선택되지 않는지 · 사유 없이는 반려가 막히는지.
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 함께 본다
 * 증감(±%) 요약 카드 · 미리보기 모달의 단건 심사 버튼은 **원본 어드민에 없어서 걷어냈다.**
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

const sheet = () => screen.getByRole("dialog", { name: "입점 신청 미리보기" });
const approveModal = () =>
  screen.getByRole("dialog", { name: /입점 심사 일괄 승인/ });
const rejectModal = () =>
  screen.getByRole("dialog", { name: /입점 심사 반려 사유/ });

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 신청의 "셀러명" 셀(2번째 열)만 뽑는다 */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

function rowOf(name: string): HTMLElement {
  return screen.getAllByText(name)[0].closest("tr") as HTMLElement;
}

/**
 * 열 순서(원본 컬럼 배열 그대로):
 *   0 선택 · 1 셀러명 · 2 대표명 · 3 연락처 · 4 유형 · 5 사업자 · 6 신청일 ·
 *   [7 승인일 | 7 반려일] · 상태
 * 승인일·반려일은 그 상태로 좁혔을 때만 끼어든다.
 */
const cellText = (name: string, index: number) =>
  within(rowOf(name)).getAllByRole("cell")[index].textContent;

/**
 * `<colgroup>` 의 `<col>` 개수와 표 컬럼 수.
 * 이 표는 상태에 따라 열이 붙고 빠지는데, 한쪽만 고치면 **폭 배분이 통째로 한 칸씩 밀린다.**
 * 렌더도 되고 타입도 통과하므로 눈으로 보기 전에는 드러나지 않는다 — 실제로 그렇게 어긋나 있었다.
 */
const colCount = () => screen.getByRole("table").querySelectorAll("col").length;
const headerCount = () =>
  within(screen.getByRole("table")).getAllByRole("columnheader").length;

const rowCheckbox = (name: string) =>
  screen.getByRole("checkbox", { name: `${name} 선택` });

const selectAll = () => screen.getByRole("checkbox", { name: "전체 선택" });

const searchBox = () => screen.getByRole("textbox");

/**
 * 상태 대시 상자. 접근가능 이름을 `aria-label` 로 못 박아 두었으므로
 * **건수까지 정확히 맞춘다**.
 */
const statusBox = (name: string) => screen.getByRole("button", { name });

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

describe("SellerReviewPage (S04 입점 심사)", () => {
  describe("상태 대시 — 원본 StatDash", () => {
    it("전체와 상태 3종의 건수를 클릭 없이 보여준다", () => {
      renderPage();

      expect(statusBox("전체 7건")).toBeVisible();
      expect(statusBox("승인요청 3건")).toBeVisible();
      expect(statusBox("승인 2건")).toBeVisible();
      expect(statusBox("반려 2건")).toBeVisible();
    });

    it("대시 상자가 곧 상태 필터다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("반려 2건"));

      expect(visibleNames()).toEqual(["맘스케어", "밤톨상회"]);
      expect(statusBox("반려 2건")).toHaveAttribute("aria-pressed", "true");
    });

    /** 원본은 상태 카드에 `statusTips` 를 툴팁으로 단다 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox("승인요청 3건"));

      expect(
        await screen.findByText(
          "입점 신청이 접수돼 심사를 기다리는 건입니다. 심사는 상세에서 서류를 보고 처리합니다.",
        ),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 상단 카드는 상태별 **건수**뿐이고 증감(±%)도 비교 기준 문구도 없다.
     */
    it("증감 지표·비교 기준 문구를 두지 않는다", () => {
      renderPage();

      expect(screen.queryByText("승인요청 대기")).not.toBeInTheDocument();
      expect(screen.queryByText("반려율")).not.toBeInTheDocument();
      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
      expect(document.querySelector(".lucide-trending-up")).toBeNull();
      expect(document.querySelector(".lucide-trending-down")).toBeNull();
    });
  });

  describe("목록", () => {
    /** 원본 컬럼 배열의 이름과 **순서**가 정본이다 */
    it("표 컬럼은 원본 순서 그대로다 — 연락처가 대표명 뒤에 온다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "", // 선택 체크박스 열 (접근가능 이름은 체크박스가 갖는다)
        "셀러명",
        "대표명",
        "연락처",
        "유형",
        "사업자",
        "신청일",
        "상태",
      ]);
    });

    /**
     * 승인일·반려일은 **그 상태로 좁혔을 때만** 붙는 조건부 열이다(원본과 같다).
     * 늘 세워 두면 대부분의 행이 `-` 인 열이 둘이나 생긴다.
     */
    it("승인일 열은 승인 필터에서만, 반려일 열은 반려 필터에서만 나온다", async () => {
      const { user } = renderPage();

      expect(
        screen.queryByRole("columnheader", { name: "승인일" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "반려일" }),
      ).not.toBeInTheDocument();

      await user.click(statusBox("승인 2건"));
      expect(
        screen.getByRole("columnheader", { name: "승인일" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "반려일" }),
      ).not.toBeInTheDocument();
      expect(cellText("소복이", 7)).toBe("2026.08.16");

      await user.click(statusBox("반려 2건"));
      expect(
        screen.getByRole("columnheader", { name: "반려일" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("columnheader", { name: "승인일" }),
      ).not.toBeInTheDocument();
      expect(cellText("맘스케어", 7)).toBe("2026.08.13");
    });

    it("조건부 열이 붙고 빠져도 colgroup 이 컬럼 수와 맞는다", async () => {
      const { user } = renderPage();

      expect(colCount()).toBe(headerCount());

      await user.click(statusBox("승인 2건"));
      expect(colCount()).toBe(headerCount());

      await user.click(statusBox("반려 2건"));
      expect(colCount()).toBe(headerCount());
    });

    /**
     * 원본은 `dealType === "전체"` 인 신청을 **렌트·판매 두 배지**로 편다 —
     * "전체"라고 한 단어로 적으면 무엇과 무엇인지가 사라진다.
     */
    it("렌트·판매를 함께 하겠다는 신청은 배지가 둘 뜬다", () => {
      renderPage();

      const kinds = within(rowOf("리틀그린")).getAllByRole("cell")[4];
      expect(within(kinds).getByText("렌트")).toBeVisible();
      expect(within(kinds).getByText("판매")).toBeVisible();

      // 한쪽만 신청한 건은 배지가 하나다
      expect(cellText("포근한잠", 4)).toBe("렌트");
    });

    /** 신청일만 시각까지 낸다(원본 `ymdhms`) — 같은 날 접수 순서가 곧 심사 순서다 */
    it("신청일은 시각까지, 승인일·반려일은 날짜만 낸다", async () => {
      const { user } = renderPage();

      expect(cellText("포근한잠", 6)).toBe("2026.08.22 10:14");

      await user.click(statusBox("승인 2건"));
      expect(cellText("소복이", 7)).toBe("2026.08.16");
    });
  });

  describe("필터 축", () => {
    it("기간 기준을 승인일로 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();

      expect(screen.getByText("신청일 시작")).toBeVisible();

      await chooseOption(user, "기간 기준", "승인일");

      expect(screen.getByText("승인일 시작")).toBeVisible();
      expect(screen.getByText("승인일 종료")).toBeVisible();
    });

    it("검색 조건을 바꾸면 같은 검색어의 결과가 달라진다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "오지안");
      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 신청이 없습니다")).toBeVisible();

      await chooseOption(user, "검색 조건", "대표명");
      expect(visibleNames()).toEqual(["리틀그린"]);
    });

    it("빈 상태에서 초기화하면 축이 모두 되돌아간다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "검색 조건", "대표명");
      await chooseOption(user, "기간 기준", "반려일");
      await user.type(searchBox(), "없는대표");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(searchBox()).toHaveValue("");
      expect(selectOf("검색 조건")).toHaveTextContent("셀러명");
      expect(selectOf("기간 기준")).toHaveTextContent("신청일");
    });
  });

  /**
   * ⚠️ 이 화면의 가장 중요한 계약 —
   * 원본의 "승인요청 상태인 신청만 심사할 수 있습니다"를 **UI 로** 강제한다.
   */
  describe("행 선택", () => {
    it("승인요청 건만 고를 수 있다", () => {
      renderPage();

      expect(rowCheckbox("포근한잠")).toBeEnabled();
      expect(rowCheckbox("하루베베")).toBeEnabled();
      expect(rowCheckbox("리틀그린")).toBeEnabled();
      // 소복이는 이미 승인된 건이라 다시 심사할 수 없다
      expect(rowCheckbox("소복이")).toBeDisabled();
    });

    it("전체 선택은 심사 가능한 행만 고른다", async () => {
      const { user } = renderPage();

      await user.click(selectAll());

      expect(rowCheckbox("포근한잠")).toBeChecked();
      expect(rowCheckbox("리틀그린")).toBeChecked();
      expect(rowCheckbox("소복이")).not.toBeChecked();
      expect(within(bar()).getByText("3건 선택됨")).toBeVisible();
    });

    it("일부만 고르면 전체 선택이 부분 선택 상태가 된다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));

      expect(selectAll()).toBePartiallyChecked();
    });

    it("선택이 없으면 일괄 작업 바가 아예 없다", async () => {
      const { user } = renderPage();

      expect(queryBar()).not.toBeInTheDocument();

      await user.click(rowCheckbox("포근한잠"));
      expect(bar()).toBeVisible();

      await user.click(rowCheckbox("포근한잠"));
      expect(queryBar()).not.toBeInTheDocument();
    });
  });

  /**
   * ⚠️ 원본 승인 모달은 단순 확인이 아니라 **셀러별 수수료율·위생인증을 확정하는 게이트**다.
   * 승인과 동시에 셀러가 생성되므로 두 값이 비어 있으면 셀러를 만들 수 없다.
   */
  describe("승인 게이트", () => {
    it("신청자가 적어 낸 수수료율·위생인증을 초깃값으로 연다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      const modal = approveModal();
      expect(
        within(modal).getByRole("textbox", { name: "포근한잠 수수료율" }),
      ).toHaveValue("12");
      expect(within(modal).getByRole("radio", { name: "인증" })).toBeChecked();
      expect(
        within(modal).getByText(
          "승인할 셀러별 수수료율과 위생인증 여부를 확정해 주세요. 요청 전체가 함께 승인되거나 함께 취소됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(modal).getByText(
          "승인하면 셀러·계정이 생성되며 이 심사 화면에서 되돌릴 수 없습니다.",
        ),
      ).toBeVisible();
    });

    /** 제안하지 않았으면(`0`) 빈 칸이다 — 0% 를 채워 두면 "0% 로 합의됐다"로 읽힌다 */
    it("수수료율을 제안하지 않은 신청은 빈 칸으로 연다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("하루베베"));
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      expect(
        within(approveModal()).getByRole("textbox", {
          name: "하루베베 수수료율",
        }),
      ).toHaveValue("");
    });

    it("6~16% 를 벗어나면 처리되지 않고 오류만 낸다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("하루베베"));
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      const modal = approveModal();
      await user.type(
        within(modal).getByRole("textbox", { name: "하루베베 수수료율" }),
        "20",
      );
      await user.click(
        within(modal).getByRole("button", { name: "승인 처리" }),
      );

      expect(within(approveModal()).getByRole("alert")).toHaveTextContent(
        "모든 셀러의 수수료율을 6~16% 사이로 입력해 주세요.",
      );
      // 모달이 열린 채 남고 표도 그대로다
      expect(within(rowOf("하루베베")).getByText("승인요청")).toBeVisible();
    });

    /**
     * "요청 전체가 함께 승인되거나 함께 취소됩니다" —
     * 하나라도 범위를 벗어나면 **아무것도** 처리되지 않는다.
     */
    it("여러 건 중 하나만 잘못돼도 전부 처리되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(selectAll());
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      // 하루베베만 빈 칸이다
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(within(approveModal()).getByRole("alert")).toBeVisible();
      expect(within(rowOf("포근한잠")).getByText("승인요청")).toBeVisible();
      expect(within(rowOf("리틀그린")).getByText("승인요청")).toBeVisible();
    });

    /**
     * 승인은 되돌릴 수 없다 — 상태가 바뀌고 그 행은 다시 고를 수 없게 된다.
     * 경고가 화면에서도 사실이어야 한다.
     */
    it("승인하면 표에 반영되고 그 행은 다시 고를 수 없다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "승인 처리" }),
      );

      expect(screen.getByText("1건 승인 처리되었습니다.")).toBeVisible();
      expect(within(rowOf("포근한잠")).getByText("승인")).toBeVisible();
      expect(rowCheckbox("포근한잠")).toBeDisabled();
      // 처리된 건은 선택에서도 빠져 바가 닫힌다
      expect(queryBar()).not.toBeInTheDocument();

      // 승인일이 채워졌다 — 승인 필터로 좁히면 그 열이 보인다
      await user.click(statusBox("승인 3건"));
      expect(cellText("포근한잠", 7)).toBe("2026.08.24");
    });

    it("취소하면 아무 일도 일어나지 않는다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );
      await user.click(
        within(approveModal()).getByRole("button", { name: "취소" }),
      );

      expect(
        screen.queryByRole("dialog", { name: /입점 심사 일괄 승인/ }),
      ).not.toBeInTheDocument();
      expect(within(rowOf("포근한잠")).getByText("승인요청")).toBeVisible();
    });

    /** 원본 제목은 건수를 항상 붙인다 — 몇 건을 한 번에 승인하는지가 가장 중요하다 */
    it("제목이 몇 건을 처리하는지 밝힌다", async () => {
      const { user } = renderPage();

      await user.click(selectAll());
      await user.click(
        within(bar()).getByRole("button", { name: "승인 처리" }),
      );

      expect(
        screen.getByRole("dialog", { name: "입점 심사 일괄 승인 (3건)" }),
      ).toBeVisible();
    });
  });

  describe("반려 모달", () => {
    it("사유를 쓰기 전에는 반려할 수 없다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      const modal = rejectModal();
      expect(
        within(modal).getByRole("button", { name: "반려 처리" }),
      ).toBeDisabled();
      // 원본 문구 그대로 — 사유가 신청자에게 전달된다는 사실을 미리 알린다
      expect(
        within(modal).getByPlaceholderText(
          "반려 사유를 입력해 주세요. 신청자에게 알림톡으로 전달됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(modal).getByText(
          "반려는 종결 처리이며, 사유는 심사 이력과 결과 알림에 그대로 남습니다.",
        ),
      ).toBeVisible();
    });

    it("사유를 쓰면 반려되고 표에 반영된다", async () => {
      const { user } = renderPage();

      await user.click(rowCheckbox("포근한잠"));
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      const modal = rejectModal();
      await user.type(
        within(modal).getByRole("textbox", { name: /반려 사유/ }),
        "사업자등록증의 업태가 신청 유형과 맞지 않습니다.",
      );
      await user.click(
        within(modal).getByRole("button", { name: "반려 처리" }),
      );

      expect(screen.getByText("1건 반려 처리되었습니다.")).toBeVisible();
      expect(within(rowOf("포근한잠")).getByText("반려")).toBeVisible();
      expect(rowCheckbox("포근한잠")).toBeDisabled();
    });

    /** 여러 건일 때만 제목에 건수를 붙인다(원본 `count > 1`) */
    it("여러 건이면 제목에 건수가 붙는다", async () => {
      const { user } = renderPage();

      await user.click(selectAll());
      await user.click(
        within(bar()).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        screen.getByRole("dialog", { name: "입점 심사 반려 사유 (3건)" }),
      ).toBeVisible();
    });
  });

  /**
   * ⚠️ 색 어휘를 두 갈래로 나눠 쓴다.
   * 초록/노랑/빨강 = **상태** · 그 밖 = 분류. 유형(렌트/판매)은 분류라 상태색을 쓰지 않는다.
   */
  describe("색 어휘", () => {
    it("승인요청은 warning — 지금 사람이 심사해야 끝난다", () => {
      renderPage();

      const requested = within(rowOf("포근한잠")).getByText("승인요청");
      expect(classList(requested)).toContain("text-text-warning");
    });

    it("반려는 critical — 비정상 종료라 눈에 띄어야 한다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("반려 2건"));

      const rejected = within(rowOf("맘스케어")).getAllByText("반려")[0];
      expect(classList(rejected)).toContain("text-text-critical");
    });

    it("승인은 default — 제대로 끝난 일이라 눈에 띌 이유가 없다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("승인 2건"));

      const approved = within(rowOf("소복이")).getAllByText("승인")[0];
      expect(classList(approved)).toContain("text-text-sub");
      expect(classList(approved)).not.toContain("text-text-success");
      expect(classList(approved)).not.toContain("text-text-critical");
    });

    it("유형 배지는 상태색을 쓰지 않는다", () => {
      renderPage();

      const rent = within(rowOf("포근한잠")).getByText("렌트");
      expect(classList(rent)).not.toContain("text-text-success");
      expect(classList(rent)).not.toContain("text-text-warning");
      expect(classList(rent)).not.toContain("text-text-critical");
    });
  });

  describe("미리보기 모달", () => {
    it("셀러명을 누르면 표에 없는 정보까지 보여준다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "리틀그린" }));

      expect(within(sheet()).getByText("오지안")).toBeVisible();
      expect(within(sheet()).getByText("010-8852-1163")).toBeVisible();
      expect(
        within(sheet()).getByText(
          "입점 신청이 접수돼 심사를 기다리는 건입니다. 심사는 상세에서 서류를 보고 처리합니다.",
        ),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 목록의 심사 경로는 **선택 → 일괄 처리** 하나뿐이다.
     */
    it("모달에 단건 심사 버튼을 두지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "리틀그린" }));

      expect(
        within(sheet()).queryByRole("button", { name: /승인 처리/ }),
      ).not.toBeInTheDocument();
      expect(
        within(sheet()).queryByRole("button", { name: /반려 처리/ }),
      ).not.toBeInTheDocument();
    });
  });
});
