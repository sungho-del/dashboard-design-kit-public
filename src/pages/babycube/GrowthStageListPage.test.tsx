import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { GrowthStageListPage } from "./GrowthStageListPage";
import {
  EMPTY_TITLE,
  STAGES,
  deletedMessage,
  stageCountsOf,
} from "./GrowthStageListPage.data";
import { draftOf } from "./ProductDetailPage.data";
import { PRODUCTS } from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * 성장단계 관리 (S07) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 추가/수정 모달의 검증 2종 · 표시 순서 ·
 * 삭제 확인과 그 결과 문구.
 *
 * ⚠️ **편집은 알림만 띄운다**(퍼블 범위) — 확정해도 표가 바뀌지 않는 것까지 본다.
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 시드가 원본 4단계 그대로인가, 열린 구간이 원본 표기 `24개월~` 로 나가는가
 *   2. 등록 상품수가 **상품 샘플과 같은가** (상품 상세의 처음 단계 값과 같은 배정)
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

    /**
     * 원본 `STAGES` 그대로다. ⚠️ 24개월이 걸음마·유아 두 단계에 겹치는 것도 원본 그대로 —
     * 기획 확인 사항으로 남겼다. 열린 구간 표기는 `24개월~` 다("24개월 이상"이 아니다).
     */
    it("원본 4단계가 원본 표기로 오름차순으로 늘어선다", () => {
      renderPage();

      expect(visibleNames()).toEqual(["신생아", "영아", "걸음마", "유아"]);
      expect(visibleRanges()).toEqual([
        "0~3개월",
        "4~12개월",
        "13~24개월",
        "24개월~",
      ]);
      expect(
        bodyRows().map((row) => cellsOf(row)[CELL.note].textContent),
      ).toEqual([
        "갓 태어난 아기를 위한 필수템",
        "뒤집기부터 첫 걸음 준비까지",
        "아장아장 걸음마 시기 용품",
        "놀이와 배움이 커지는 시기",
      ]);
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("단계 명칭은 굵게 낸다 (원본과 같다)", () => {
      renderPage();

      expect(cellsOf(rowOf("신생아"))[CELL.name].className).toContain(
        "body-medium-bold",
      );
    });
  });

  describe("등록 상품수 (상품 샘플에서 계산)", () => {
    it("계산 규칙: 단계 id 가 배정된 상품 수를 센다", () => {
      const counts = stageCountsOf(STAGES, [
        "newborn",
        "newborn",
        "preschool",
        "없는-단계",
      ]);

      expect(counts.get("newborn")).toBe(2);
      expect(counts.get("infant")).toBe(0);
      expect(counts.get("preschool")).toBe(1);
    });

    /** 상품 상세가 처음 여는 단계 값과 같아야 두 화면이 서로 모순되지 않는다 */
    it("상품 상세의 성장단계 값으로 센 수와 같고, 합계는 상품 전체(본사 직영 포함)다", () => {
      renderPage();

      const shown = (name: string) =>
        Number(
          (cellsOf(rowOf(name))[CELL.productCount].textContent ?? "").replace(
            /[^0-9]/g,
            "",
          ),
        );

      STAGES.forEach((stage) => {
        expect(shown(stage.name)).toBe(
          PRODUCTS.filter((product) => draftOf(product).stage === stage.id)
            .length,
        );
      });
      expect(STAGES.reduce((sum, stage) => sum + shown(stage.name), 0)).toBe(
        PRODUCTS.length,
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
      // 4건이 한 화면에 다 뜬다
      expect(bodyRows()).toHaveLength(4);
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

    it("저장하면 알림만 띄우고 표는 그대로다", async () => {
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
      expect(visibleNames()).toEqual(["신생아", "영아", "걸음마", "유아"]);
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("시작 0개월·종료 빈칸('이상')은 정상 값이다", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "전체");
      await fillRange(user, dialog, "0", "");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("성장단계가 등록되었습니다."),
      ).toBeVisible();
    });

    /**
     * ⚠️ 되살아나면 안 되는 규칙. 저장 전에 원본이 보는 것은 명칭과 시작 개월뿐이다.
     * 한때 여기서 겹침을 막고 "○○ 단계(0~3개월)와 월령 구간이 겹칩니다." 라고
     * 말했는데 **원본에 없는 문장**이었다. 이름 중복도 원본은 보지 않는다.
     */
    it("구간이 겹치거나 이름이 같아도 화면이 막지 않는다 (원본에 없는 규칙)", async () => {
      const { user } = renderPage();

      const dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "신생아");
      await fillRange(user, dialog, "0", "3");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("성장단계가 등록되었습니다."),
      ).toBeVisible();
      expect(screen.queryByText(/겹칩니다/)).toBeNull();
    });

    it("다시 열면 지난 입력과 오류가 남아 있지 않다", async () => {
      const { user } = renderPage();

      let dialog = await openCreate(user);
      await user.type(within(dialog).getByLabelText(/^단계 명칭/), "임시");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));
      expect(
        within(dialog).getByText("시작 개월을 입력해주세요."),
      ).toBeVisible();
      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      dialog = await openCreate(user);
      expect(within(dialog).getByLabelText(/^단계 명칭/)).toHaveValue("");
      expect(
        within(dialog).queryByText("시작 개월을 입력해주세요."),
      ).toBeNull();
    });
  });

  describe("성장단계 수정", () => {
    it("기존 값이 채워진 채로 열린다 (열린 구간은 종료가 빈칸)", async () => {
      const { user } = renderPage();

      await user.click(rowAction("유아", "수정"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByText("성장단계 수정")).toBeVisible();
      expect(within(dialog).getByLabelText(/^단계 명칭/)).toHaveValue("유아");
      expect(within(dialog).getByLabelText(/^시작 개월/)).toHaveValue("24");
      expect(within(dialog).getByLabelText(/^종료 개월/)).toHaveValue("");
    });

    it("고쳐 저장하면 알림만 띄우고 표는 그대로다", async () => {
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
      expect(visibleNames()).toContain("걸음마");
      expect(visibleNames()).not.toContain("첫걸음");
      expect(cellsOf(rowOf("걸음마"))[CELL.range].textContent).toBe(
        "13~24개월",
      );
    });
  });

  describe("성장단계 삭제", () => {
    /** 행마다 진한 빨강이면 표 전체가 경고로 읽힌다 — 진한 경고는 되돌릴 수 없는 마지막 한 번(확인 창)뿐 */
    it("행 [삭제]는 옅은 경고(tonal), 확인 창의 최종 [삭제]만 진한 경고다", async () => {
      const { user } = renderPage();

      const rowDelete = rowAction("신생아", "삭제");
      expect(rowDelete.classList.contains("bg-action-critical-tonal")).toBe(
        true,
      );
      expect(rowDelete.classList.contains("bg-action-critical")).toBe(false);

      await user.click(rowDelete);
      const dialog = await screen.findByRole("dialog");
      const confirm = within(dialog).getByRole("button", { name: "삭제" });
      expect(confirm.classList.contains("bg-action-critical")).toBe(true);
    });

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
     * 앱의 성장단계 추천에서 조용히 빠진 채 방치된다. 그 수는 표의 상품수와 같다.
     */
    it("쓰던 상품이 있으면 밀려난 수와 다음에 할 일까지 알리고, 표는 그대로다", async () => {
      const { user } = renderPage();
      const used = cellsOf(rowOf("신생아"))[CELL.productCount].textContent;

      await user.click(rowAction("신생아", "삭제"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText(
          `'신생아' 단계가 삭제되었습니다 — 사용 중이던 상품 ${used}는 '없음'으로 대체되었습니다. 상품 관리의 성장단계 필터('없음')로 재설정하세요.`,
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).toContain("신생아");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    /** 시드 4단계는 모두 상품이 있어 화면에서는 볼 수 없는 갈래다 — 문구 함수로 확인한다 */
    it("쓰던 상품이 없으면 한 줄로 짧게 알린다", () => {
      expect(deletedMessage("임시단계", 0)).toBe(
        "'임시단계' 단계가 삭제되었습니다.",
      );
    });

    it("취소하면 아무것도 지워지지 않는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("영아", "삭제"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "취소" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).toContain("영아");
      expect(screen.queryByText(/삭제되었습니다/)).toBeNull();
    });
  });
});

/* ---------------------------------------------------------------------------
 * 데이터 상태 미리보기 (?preview=) — §D8
 * ------------------------------------------------------------------------ */
describe("데이터 상태 미리보기 (?preview=)", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  const renderAt = (url: string) => {
    window.history.replaceState(null, "", url);
    return renderPage();
  };

  it("loading — 헤더 글자는 남기고 값만 스켈레톤이다", () => {
    renderAt("/stages?preview=loading");

    expect(screen.getByText("단계 명칭")).toBeVisible();
    expect(screen.queryByText("신생아")).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 값이 있어도 빈 상태를 보여준다", () => {
    renderAt("/stages?preview=empty");

    expect(screen.getByText(EMPTY_TITLE)).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });

  it("refreshing — 스켈레톤으로 되돌리지 않고 이전 값을 흐리게 둔다", () => {
    renderAt("/stages?preview=refreshing");

    expect(screen.getByText("신생아")).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);

    const body = document.body.querySelector<HTMLElement>(
      "[data-table-shell-body]",
    );
    expect(body?.className ?? "").toContain("opacity-50");
  });
});
