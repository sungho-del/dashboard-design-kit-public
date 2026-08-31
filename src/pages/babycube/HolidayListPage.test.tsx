import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { HolidayListPage } from "./HolidayListPage";

/**
 * S25 공휴일 관리 — **동작** 테스트.
 *
 * 이 화면의 핵심은 **"종료일을 비우면 시작일 하루만 등록된다"** 는 규칙이다.
 * 그래서 목록 표시(기간 셀)와 등록 경로(달력에서 시작일만 고르기)를 **둘 다** 본다 —
 * 표만 보면 규칙이 폼에서 깨져도 통과하고, 폼만 보면 표에서 깨져도 통과한다.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/ops-calendar` 의 툴바에는 연도 칩뿐이고("전체"가 없다), `관리` 열에는
 * 수정 버튼 하나뿐이며, 기간 셀에 일수(`3일`)를 붙이지 않는다.
 *
 * 달력은 오늘이 속한 달로 열리므로, 날짜 라벨을 **실행 시점 기준으로 계산**한다.
 * 12일·15일은 어느 달에도 있어 달이 바뀌어도 흔들리지 않는다.
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
});

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

/** 보이는 공휴일 내용 (2번째 컬럼 — 0 체크박스 · 1 내용 · … · 4 관리) */
function visibleContents(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

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
    it("올해 공휴일만 보이고 총 건수를 툴바가 든다 (페이지네이션 없음)", () => {
      renderPage();

      // 샘플 6건 중 2025년 성탄절은 다른 칩에 있다
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
      expect(bodyRows()).toHaveLength(5);
      expect(visibleContents()).not.toContain("성탄절");
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    /*
      원본은 `관리` 를 맨 앞에 두지만 의도적으로 마지막으로 옮겼다.
      되돌아가지 않는지 보는 회귀 테스트다 — 근거는 뼈대 상단 주석과 `DESIGN_참고.md` §7.
    */
    it("행 액션(관리)은 마지막 열이다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      // 0번은 전체 선택 체크박스 셀 — 텍스트가 없다
      expect(headers).toEqual(["", "내용", "기간", "등록/수정일", "관리"]);
    });

    it("2025 칩을 고르면 그 해 공휴일만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "2025" }));

      expect(visibleContents()).toEqual(["성탄절"]);
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
    });

    it("기간 셀 — 하루짜리는 날짜 하나만, 범위는 물결로 잇는다", () => {
      renderPage();

      // 개천절 — endAt 이 빈 문자열
      expect(screen.getByText("2026.10.03")).toBeVisible();
      // 추석 연휴 — 9/24 ~ 9/26
      expect(screen.getByText("2026.09.24 ~ 2026.09.26")).toBeVisible();
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

      // 검색 입력이 있었다면 모달이 닫힌 상태에서도 textbox 가 잡힌다
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
      expect(rowButtons).toHaveLength(5);
      expect(rowButtons.map((button) => button.textContent)).toEqual(
        Array(5).fill("수정"),
      );
    });
  });

  describe("행 선택·선택 삭제", () => {
    it("전체 선택은 보이는 행 전부를 고른다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));

      expect(screen.getByText("목록 (총 5건) · 5건 선택")).toBeVisible();
    });

    it("아무것도 고르지 않고 누르면 안내 토스트만 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const toast = await screen.findByText("선택된 공휴일이 없습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("1건만 지워도 토스트에 건수가 붙는다 (원본 규칙)", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "개천절 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog", { name: "공휴일 삭제" });
      expect(
        within(dialog).getByText(/대여 불가일 계산에서도 즉시 제외됩니다/),
      ).toBeVisible();
      // 위험 안내는 따로 세운다 — 한 문단에 뭉치면 묻힌다
      expect(
        within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      // 배너·팝업은 1건이면 건수를 빼는데 이 화면만 원본이 다르다
      expect(await screen.findByText("1건 삭제되었습니다.")).toBeVisible();
      expect(visibleContents()).not.toContain("개천절");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
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
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
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
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
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
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });
  });

  describe("등록 모달 — 종료일을 비우면 하루", () => {
    it("시작일만 고르고 등록하면 하루짜리로 들어간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      const modal = await formModal("공휴일 등록");

      // 안내 문구가 실제로 붙어 있어야 사용자가 이 규칙을 안다 (원본 문장)
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
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
      /*
        범위(`~`)가 아니라 날짜 하나로 그려져야 한다.
        ⚠️ 화면 전체에서 찾으면 안 된다 — 오늘 등록한 행은 **기간과 등록일이 같은 날**이라
        같은 문자열이 두 셀에 뜬다. 기간 열(2번)만 본다.
      */
      const added = bodyRows().find((row) =>
        within(row)
          .getAllByRole("cell")[1]
          .textContent?.includes("임시 물류센터 휴무"),
      );
      expect(within(added!).getAllByRole("cell")[2]).toHaveTextContent(dot(12));
      expect(visibleContents()).toContain("임시 물류센터 휴무");
    });

    it("시작일·종료일을 모두 고르면 범위로 그린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
      const modal = await formModal("공휴일 등록");

      await user.click(within(modal).getByText("시작일"));
      await user.click(
        await screen.findByRole("button", { name: dayLabel(12) }),
      );
      await user.click(
        await screen.findByRole("button", { name: dayLabel(15) }),
      );

      await user.type(
        within(modal).getByRole("textbox", { name: /내용/ }),
        "연휴 대체 휴무",
      );
      await user.click(
        within(footerOf(modal)).getByRole("button", { name: "등록" }),
      );

      expect(await screen.findByText("등록되었습니다.")).toBeVisible();
      expect(screen.getByText(`${dot(12)} ~ ${dot(15)}`)).toBeVisible();
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

    it("내용을 고쳐 저장하면 목록에 반영된다", async () => {
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
      expect(visibleContents()).toContain("개천절 (대체)");
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
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
      expect(visibleContents()).toContain("개천절");
    });
  });
});
