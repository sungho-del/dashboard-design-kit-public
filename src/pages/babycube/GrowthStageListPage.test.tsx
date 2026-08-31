import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { GrowthStageListPage } from "./GrowthStageListPage";

/* -------------------------------------------------------------------------
 * 성장단계 관리 (S07) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 추가/수정 모달의 검증 2종 · 표시 순서 ·
 * 삭제 확인과 그 결과 문구.
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 열린 구간(`monthTo === null`)이 원본 표기 `36개월~` 로 나가는가
 *   2. 표시 순서가 **월령 오름차순**인가 (추가·수정 뒤에도)
 *   3. 삭제 결과가 **'없음'으로 밀려난 상품 수**까지 말하는가
 *      (그 상품들이 방치되면 앱의 성장단계 추천에서 통째로 빠진다)
 *
 * 그리고 **원본에 없는 것이 다시 자라지 않는지**도 본다 —
 * 페이지네이션 · 도움말 툴팁 · 필터/검색 · **월령 구간 겹침 검사**는 이 화면에 없다.
 *
 * jsdom 에는 `ResizeObserver`/`IntersectionObserver` 가 없다.
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
      <GrowthStageListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/stages"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 셀 인덱스 — 컬럼 순서가 바뀌면 여기부터 깨지도록 이름을 붙여 둔다 */
const CELL = {
  name: 0,
  range: 1,
  note: 2,
  productCount: 3,
  manage: 4,
} as const;

/** 표 컬럼 이름과 순서 — 원본 어드민 그대로다 */
const COLUMN_LABELS = [
  "단계 명칭",
  "월령 구간",
  "내용 (사용자 안내 문구)",
  "등록 상품수",
  "관리",
];

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

function cellsOf(row: HTMLElement) {
  return within(row).getAllByRole("cell");
}

function visibleNames(): string[] {
  return bodyRows().map((row) => cellsOf(row)[CELL.name].textContent ?? "");
}

function visibleRanges(): string[] {
  return bodyRows().map((row) => cellsOf(row)[CELL.range].textContent ?? "");
}

function rowOf(name: string): HTMLElement {
  const row = bodyRows().find(
    (candidate) => (cellsOf(candidate)[CELL.name].textContent ?? "") === name,
  );
  if (!row) throw new Error(`행을 찾지 못했습니다: ${name}`);
  return row;
}

/** 행 액션은 `${단계명} ${동작}` 이라는 접근가능 이름을 갖는다 */
function rowAction(stageName: string, action: string): HTMLElement {
  return screen.getByRole("button", { name: `${stageName} ${action}` });
}

/** 모달의 월령 입력을 다시 채운다 */
async function fillRange(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  from: string,
  to: string,
) {
  const fromInput = within(dialog).getByLabelText(/^시작 개월/);
  const toInput = within(dialog).getByLabelText(/^종료 개월/);
  await user.clear(fromInput);
  if (from !== "") await user.type(fromInput, from);
  await user.clear(toInput);
  if (to !== "") await user.type(toInput, to);
}

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "단계 추가" }));
  return screen.findByRole("dialog");
}

describe("GrowthStageListPage", () => {
  describe("표 구조 (원본 계약)", () => {
    it("5열의 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      expect(headers.map((th) => th.textContent)).toEqual(COLUMN_LABELS);
    });

    it("`<col>` 개수가 컬럼 수와 일치한다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup > col");
      expect(cols).toHaveLength(COLUMN_LABELS.length);
    });

    /** ⚠️ 열린 구간 표기는 원본 그대로 `36개월~` 다 ("36개월 이상"이 아니다) */
    it("월령 구간이 원본 표기로 나가고 오름차순으로 늘어선다", () => {
      renderPage();

      expect(visibleNames()).toEqual([
        "신생아",
        "영아",
        "걸음마",
        "유아",
        "취학 전",
      ]);
      expect(visibleRanges()).toEqual([
        "0~3개월",
        "4~11개월",
        "12~23개월",
        "24~35개월",
        "36개월~",
      ]);
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("안내 문구가 비면 `-` 로 흐리게 낸다", () => {
      renderPage();

      expect(cellsOf(rowOf("취학 전"))[CELL.note].textContent).toBe("-");
      expect(cellsOf(rowOf("신생아"))[CELL.note].textContent).toBe(
        "목을 못 가누는 시기예요",
      );
    });
  });

  /**
   * 원본에는 이 카드 하나뿐이다 — 필터도, 검색도, 요약 카드도, 페이지네이션도 없다.
   */
  describe("원본에 없는 것 (되살아나지 않는지)", () => {
    it("페이지네이션·도움말·필터가 없다", () => {
      renderPage();

      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "도움말" })).toBeNull();
      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(screen.queryByRole("combobox")).toBeNull();
      // 5건이 한 화면에 다 뜬다
      expect(bodyRows()).toHaveLength(5);
    });

    it("행 액션은 수정·삭제 둘뿐이다", () => {
      renderPage();

      const manage = within(cellsOf(rowOf("신생아"))[CELL.manage]).getAllByRole(
        "button",
      );
      expect(manage).toHaveLength(2);
      expect(manage[0]).toHaveAccessibleName("신생아 수정");
      expect(manage[1]).toHaveAccessibleName("신생아 삭제");
    });
  });

  describe("성장단계 추가", () => {
    it("빈 채로 저장하면 명칭·시작 개월 두 가지를 짚는다", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      expect(within(dialog).getByText("성장단계 추가")).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        within(dialog).getByText("단계 명칭을 입력해주세요."),
      ).toBeVisible();
      expect(
        within(dialog).getByText("시작 개월을 입력해주세요."),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("저장하면 월령 순서에 맞는 자리에 들어간다", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "이유식기");
      await fillRange(user, dialog, "6", "8");
      await user.type(
        within(dialog).getByLabelText(/^내용/),
        "이유식을 시작해요",
      );
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("성장단계가 등록되었습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      expect(visibleNames()).toEqual([
        "신생아",
        "영아",
        "이유식기",
        "걸음마",
        "유아",
        "취학 전",
      ]);
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
      expect(cellsOf(rowOf("이유식기"))[CELL.productCount].textContent).toBe(
        "0개",
      );
    });

    it("종료 개월을 비우면 '이상' 구간으로 들어간다", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "학령기");
      await fillRange(user, dialog, "84", "");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(cellsOf(rowOf("학령기"))[CELL.range].textContent).toBe("84개월~");
    });

    /**
     * ⚠️ 되살아나면 안 되는 규칙. 저장 전에 원본이 보는 것은 명칭과 시작 개월뿐이고,
     * 구간이 겹치는지는 서버가 판정한다. 한때 여기서 겹침을 막고
     * "○○ 단계(0~3개월)와 월령 구간이 겹칩니다." 라고 말했는데 **원본에 없는 문장**이었다.
     */
    it("기존 구간과 겹쳐도 화면이 막지 않는다 (원본에 없는 규칙)", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "겹침단계");
      await fillRange(user, dialog, "0", "3");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("성장단계가 등록되었습니다."),
      ).toBeVisible();
      expect(screen.queryByText(/겹칩니다/)).toBeNull();
      expect(visibleNames()).toContain("겹침단계");
    });
  });

  describe("성장단계 수정", () => {
    it("기존 값이 채워진 채로 열린다 (열린 구간은 종료가 빈칸)", async () => {
      const { user } = renderPage();

      await user.click(rowAction("취학 전", "수정"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByText("성장단계 수정")).toBeVisible();
      expect(within(dialog).getByLabelText(/^단계 명칭/)).toHaveValue(
        "취학 전",
      );
      expect(within(dialog).getByLabelText(/^시작 개월/)).toHaveValue("36");
      expect(within(dialog).getByLabelText(/^종료 개월/)).toHaveValue("");
    });

    it("고쳐 저장하면 표와 순서에 그대로 반영된다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("걸음마", "수정"));
      const dialog = await screen.findByRole("dialog");

      await user.clear(within(dialog).getByLabelText(/^단계 명칭/));
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "첫걸음");
      await fillRange(user, dialog, "13", "23");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("성장단계가 수정되었습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      expect(visibleNames()).toContain("첫걸음");
      expect(visibleNames()).not.toContain("걸음마");
      expect(cellsOf(rowOf("첫걸음"))[CELL.range].textContent).toBe(
        "13~23개월",
      );
      // 상품 수는 수정으로 바뀌지 않는다
      expect(cellsOf(rowOf("첫걸음"))[CELL.productCount].textContent).toBe(
        "118개",
      );
    });
  });

  describe("성장단계 삭제", () => {
    it("안내 두 줄을 원본 문구 그대로 보여준다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("신생아", "삭제"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByText("성장단계 삭제")).toBeVisible();
      expect(
        within(dialog).getByText(
          "삭제하면 이 단계를 쓰던 상품의 성장단계가 '없음'으로 바뀝니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();
    });

    /**
     * ⚠️ '없음'으로 밀려난 상품이 몇 개인지 말하지 않으면, 그 상품들은
     * 앱의 성장단계 추천에서 조용히 빠진 채 방치된다.
     */
    it("쓰던 상품이 있으면 밀려난 수와 다음에 할 일까지 알린다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("신생아", "삭제"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText(
          "'신생아' 단계가 삭제되었습니다 — 사용 중이던 상품 42개는 '없음'으로 대체되었습니다. 상품 관리의 성장단계 필터('없음')로 재설정하세요.",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).not.toContain("신생아");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("쓰던 상품이 없으면 한 줄로 짧게 알린다", async () => {
      const { user } = renderPage();

      // 방금 만든 단계는 등록 상품이 0개다
      const create = await openCreate(user);
      await user.type(within(create).getByLabelText(/^단계 명칭/), "임시단계");
      await fillRange(user, create, "60", "71");
      await user.click(within(create).getByRole("button", { name: "저장" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      await user.click(rowAction("임시단계", "삭제"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText("'임시단계' 단계가 삭제되었습니다."),
      ).toBeVisible();
      expect(visibleNames()).not.toContain("임시단계");
    });

    it("취소하면 아무것도 지워지지 않는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("영아", "삭제"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "취소" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).toContain("영아");
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });
  });
});
