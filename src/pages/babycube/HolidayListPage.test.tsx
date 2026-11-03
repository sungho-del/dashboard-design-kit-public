import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { HolidayListPage } from "./HolidayListPage";

/**
 * S25 공휴일 관리 — **동작** 테스트.
 *
 * 핵심 규칙 **"종료일을 비우면 시작일 하루"** 는 표의 기간 셀(하루짜리 = 날짜 하나)과
 * 등록 모달의 안내 문구로 본다. 등록은 알림만이라 새 행이 표에 생기지 않는다.
 *
 * ⚠️ 업무 확정(등록·수정·삭제)은 **알림만** 띄운다 — 매 경로에서 목록이 원본 8건 그대로인지 본다.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/ops-calendar` 의 툴바에는 연도 칩뿐이고("전체"가 없다), `관리` 열에는
 * 수정 버튼 하나뿐이며, 기간 셀에 일수(`3일`)를 붙이지 않는다.
 *
 * 달력은 오늘이 속한 달로 열리므로, 날짜 라벨을 **실행 시점 기준으로 계산**한다.
 * 12일·15일은 어느 달에도 있어 달이 바뀌어도 흔들리지 않는다.
 *
 * ⚠️ 단, 오늘이 12일·15일이면 그 칸의 이름이 `오늘, 2026년 10월 15일` 이 되어
 * 찾지 못한다. 그래서 시계를 **이번 달 20일**로 고정한다 (Date 만 — 타이머는 실제).
 */
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
  vi.useRealTimers();
});

const NOW = new Date();
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date(NOW.getFullYear(), NOW.getMonth(), 20));

const TODAY = new Date();
const YEAR = TODAY.getFullYear();
const MONTH = TODAY.getMonth() + 1;

/** 달력 날짜 셀의 접근가능 이름 — `2026년 8월 15일` */
const dayLabel = (day: number) => `${YEAR}년 ${MONTH}월 ${day}일`;
/** 같은 날짜의 저장 형식 — `2026-08-15` */
const iso = (day: number) =>
  `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/**
 * 같은 날짜의 **화면 표기** — `2026.08.15`.
 * 저장은 하이픈, 화면은 점이다. 한때 이 화면들만 저장 형식을 그대로 흘려
 * 다른 목록과 표기가 갈렸다 (`ymd` 이름이 `Date` 변환기와 겹쳤던 탓).
 */
const dot = (day: number) => iso(day).replace(/-/g, ".");

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <HolidayListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/ops-calendar"
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

/** 보이는 공휴일 내용 (0 체크박스 · 1 No · 2 내용 · 3 기간 · 4 등록/수정일 · 5 관리) */
function visibleContents(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[2].textContent ?? "",
  );
}

/** 원본 8건을 시작일 순으로 — 표가 이 순서여야 한다 */
const ORIGINAL_ORDER = [
  "물류센터 정기 점검",
  "전사 재고 실사",
  "광복절",
  "광복절 대체공휴일",
  "추석 연휴",
  "개천절",
  "한글날",
  "성탄절",
];

function editButton(content: string): HTMLElement {
  return screen.getByRole("button", { name: `${content} 수정` });
}

function footerOf(dialog: HTMLElement): HTMLElement {
  return dialog.querySelector('[data-slot="footer"]') as HTMLElement;
}

/** 등록/수정 모달 (달력 패널도 dialog 라 이름으로 콕 집는다) */
function formModal(name: "공휴일 등록" | "공휴일 수정") {
  return screen.findByRole("dialog", { name });
}

describe("HolidayListPage", () => {
  describe("목록·연도 칩", () => {
    it("원본 8건을 시작일 순으로 그리고 No 를 1..N 으로 매긴다", () => {
      renderPage();

      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
      expect(visibleContents()).toEqual(ORIGINAL_ORDER);
      expect(
        bodyRows().map(
          (row) => within(row).getAllByRole("cell")[1].textContent,
        ),
      ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("열은 [체크] No 내용 기간 등록/수정일 관리 — 관리가 마지막이다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      // 0번은 전체 선택 체크박스 셀 — 텍스트가 없다
      expect(headers).toEqual([
        "",
        "No",
        "내용",
        "기간",
        "등록/수정일",
        "관리",
      ]);
    });

    it("연도 칩은 데이터에 있는 해만 — 2026 하나가 골라져 있다", () => {
      renderPage();

      const chips = screen.getAllByRole("radio");
      expect(chips.map((chip) => chip.textContent)).toEqual(["2026"]);
      expect(chips[0]).toBeChecked();
    });

    it("기간 셀 — 하루짜리는 날짜 하나만, 범위는 물결로 잇는다 · 등록일은 원본 값", () => {
      renderPage();

      expect(screen.getByText("2026.10.03")).toBeVisible();
      expect(screen.getByText("2026.09.24 ~ 2026.09.26")).toBeVisible();
      const first = within(bodyRows()[0]).getAllByRole("cell");
      expect(first[4]).toHaveTextContent("2026.07.27");
    });
  });

  describe("표 도구줄 버튼", () => {
    it("[공휴일 등록][선택 삭제] 가 원본 순서로 표 위에 있다 · 도움말 없음", () => {
      renderPage();

      const create = screen.getByRole("button", { name: "공휴일 등록" });
      const remove = screen.getByRole("button", { name: "선택 삭제" });
      const table = screen.getByRole("table");
      expect(
        create.compareDocumentPosition(remove) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      // 머리(제목) 다음 · 표 앞 — 표 도구줄 자리다
      expect(
        screen
          .getByRole("heading", { name: "공휴일 관리" })
          .compareDocumentPosition(create) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        remove.compareDocumentPosition(table) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen.getByText("목록 (총 8건)").compareDocumentPosition(create) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: "도움말" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("원본에 없는 축 — 되살아나지 않는지", () => {
    it("일수 꼬리표(3일·하루)를 붙이지 않는다", () => {
      renderPage();

      expect(screen.queryByText(/\(3일\)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/\(하루\)/)).not.toBeInTheDocument();
    });

    it("내용 검색·초기화·'전체' 칩이 없다", () => {
      renderPage();

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("radio", { name: "전체" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "초기화" }),
      ).not.toBeInTheDocument();
    });

    it("행에는 수정 버튼뿐이다 — 행 단위 삭제가 없다", () => {
      renderPage();

      const rowButtons = within(screen.getByRole("table")).getAllByRole(
        "button",
      );
      expect(rowButtons).toHaveLength(8);
      expect(rowButtons.map((button) => button.textContent)).toEqual(
        Array(8).fill("수정"),
      );
    });
  });

  describe("행 선택·선택 삭제", () => {
    it("전체 선택은 보이는 행 전부를 고른다 — 건수 줄에 선택 꼬리를 달지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));

      for (const content of ORIGINAL_ORDER) {
        expect(
          screen.getByRole("checkbox", { name: `${content} 선택` }),
        ).toBeChecked();
      }
      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
    });

    it("아무것도 고르지 않고 누르면 안내 토스트만 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const toast = await screen.findByText("선택된 공휴일이 없습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("1건 — 원본 문구 · 대상 표기 없음 · 알림만 뜨고 목록은 그대로", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "개천절 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog", { name: "공휴일 삭제" });
      expect(
        within(dialog).getByText(
          "삭제하면 목록에서 사라지고 대여 불가일 계산에서도 즉시 제외됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();
      // 대상 이름을 적지 않는다(원본 UI-323)
      expect(within(dialog).queryByText("개천절")).not.toBeInTheDocument();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("1건 삭제되었습니다.")).toBeVisible();
      expect(visibleContents()).toEqual(ORIGINAL_ORDER);
      expect(
        screen.getByRole("checkbox", { name: "개천절 선택" }),
      ).not.toBeChecked();
    });

    it("2건 이상이면 모달 제목에 건수가 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "개천절 선택" }));
      await user.click(screen.getByRole("checkbox", { name: "한글날 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog", {
        name: "공휴일 삭제 (2건)",
      });
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
    });
  });

  describe("등록 모달 — 검증 순서", () => {
    it("시작일이 없으면 내용을 채웠어도 시작일부터 알린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      const modal = await formModal("공휴일 등록");

      await user.type(
        within(modal).getByRole("textbox", { name: /내용/ }),
        "임시 휴무",
      );
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "등록" }),
      );

      const toast = await screen.findByText("시작일을 선택해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(modal).toBeVisible();
    });

    it("시작일을 골라도 내용이 비면 저장되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      const modal = await formModal("공휴일 등록");

      await user.click(within(modal).getByText("시작일"));
      await user.click(
        await screen.findByRole("button", { name: dayLabel(12) }),
      );
      // 달력 패널을 닫으려고 내용 칸을 한 번 누른다
      await user.click(within(modal).getByRole("textbox", { name: /내용/ }));

      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "등록" }),
      );

      const toast = await screen.findByText("내용을 입력해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(modal).toBeVisible();
    });
  });

  describe("등록 모달 — 알림만", () => {
    it("종료일 안내가 붙어 있고, 등록하면 알림 후 닫히며 목록은 그대로다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      const modal = await formModal("공휴일 등록");

      expect(
        within(modal).getByText("종료일을 비우면 시작일 하루만 등록됩니다."),
      ).toBeVisible();

      await user.click(within(modal).getByText("시작일"));
      await user.click(
        await screen.findByRole("button", { name: dayLabel(12) }),
      );
      await user.type(
        within(modal).getByRole("textbox", { name: /내용/ }),
        "임시 물류센터 휴무",
      );
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "등록" }),
      );

      expect(await screen.findByText("등록되었습니다.")).toBeVisible();
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "공휴일 등록" }),
        ).not.toBeInTheDocument(),
      );
      expect(visibleContents()).toEqual(ORIGINAL_ORDER);
      expect(screen.queryByText(dot(12))).not.toBeInTheDocument();
    });

    it("다시 열면 이전 초안이 남지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      let modal = await formModal("공휴일 등록");
      await user.type(
        within(modal).getByRole("textbox", { name: /내용/ }),
        "초안",
      );
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "취소" }),
      );
      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "공휴일 등록" }),
        ).not.toBeInTheDocument(),
      );

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      modal = await formModal("공휴일 등록");
      expect(within(modal).getByRole("textbox", { name: /내용/ })).toHaveValue(
        "",
      );
    });
  });

  describe("수정 모달", () => {
    it("행의 수정 버튼을 누르면 그 값이 채워진 채로 열린다", async () => {
      const { user } = renderPage();

      await user.click(editButton("추석 연휴"));

      const modal = await formModal("공휴일 수정");
      expect(within(modal).getByRole("textbox", { name: /내용/ })).toHaveValue(
        "추석 연휴",
      );
      // 등록은 `등록`, 수정은 `저장` 이다 (원본 규칙)
      expect(
        within(footerOf(modal)).getByRole("button", { name: "저장" }),
      ).toBeVisible();
    });

    it("내용을 고쳐 저장하면 알림만 뜨고 목록은 원본 그대로다", async () => {
      const { user } = renderPage();

      await user.click(editButton("개천절"));

      const modal = await formModal("공휴일 수정");
      const contentBox = within(modal).getByRole("textbox", { name: /내용/ });
      await user.clear(contentBox);
      await user.type(contentBox, "개천절 (대체)");
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "저장" }),
      );

      expect(await screen.findByText("수정되었습니다.")).toBeVisible();
      expect(visibleContents()).toEqual(ORIGINAL_ORDER);
    });

    it("'취소'는 아무것도 바꾸지 않는다", async () => {
      const { user } = renderPage();

      await user.click(editButton("개천절"));
      const modal = await formModal("공휴일 수정");
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "취소" }),
      );

      await waitFor(() =>
        expect(
          screen.queryByRole("dialog", { name: "공휴일 수정" }),
        ).not.toBeInTheDocument(),
      );
      expect(visibleContents()).toEqual(ORIGINAL_ORDER);
    });
  });
});
