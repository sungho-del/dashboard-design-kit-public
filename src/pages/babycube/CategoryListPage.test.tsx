import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CategoryListPage } from "./CategoryListPage";
import { productCountsOf, type Category } from "./CategoryListPage.data";
import { PRODUCTS } from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * 카테고리 관리 (S06) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 렌트/판매 트리 전환 · ▲▼ 잠금 ·
 * 이름 입력 검증(빈 이름·중복·그대로) · 삭제 차단 규칙 · 아이콘 모달의 두 얼굴.
 *
 * ⚠️ **편집은 알림만 띄운다**(퍼블 범위) — 확정해도 표가 바뀌지 않는 것까지 본다.
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 등록 상품수가 **상품 목록 샘플과 같은가** (하위 포함 합계 · 본사 직영 포함)
 *   2. 단계 배지가 상태 색(success·critical)을 쓰지 않는가
 *      (계층은 상태가 아니다 — 색으로 가르면 "대분류는 좋은 상태"로 읽힌다)
 *   3. 삭제가 막히는 두 이유를 **창 없이 문장으로** 알려 주는가 (원본 UI-325)
 *
 * 그리고 **원본에 없는 것이 다시 자라지 않는지**도 본다 —
 * 단계 필터 · 검색 · 초기화는 이 화면에 없다.
 *
 * jsdom 에는 `ResizeObserver`/`IntersectionObserver` 가 없다 — 부유 요소가 요구한다.
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
      <CategoryListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/categories"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 셀 인덱스 — 컬럼 순서가 바뀌면 여기부터 깨지도록 이름을 붙여 둔다 */
const CELL = {
  level: 0,
  icon: 1,
  name: 2,
  productCount: 3,
  manage: 4,
} as const;

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 이름 셀에는 가지 기호(`└ `)가 함께 들어 있다 — 이름만 떼어 본다 */
function nameOf(row: HTMLElement): string {
  return (
    within(row).getAllByRole("cell")[CELL.name].textContent ?? ""
  ).replace(/^└ /, "");
}

function visibleNames(): string[] {
  return bodyRows().map(nameOf);
}

function rowOf(name: string): HTMLElement {
  const row = bodyRows().find((candidate) => nameOf(candidate) === name);
  if (!row) throw new Error(`행을 찾지 못했습니다: ${name}`);
  return row;
}

/** "6개" → 6 */
function productCountOf(name: string): number {
  const text =
    within(rowOf(name)).getAllByRole("cell")[CELL.productCount].textContent ??
    "";
  return Number(text.replace(/[^0-9]/g, ""));
}

/** 행 액션은 모두 `${카테고리명} ${동작}` 이라는 접근가능 이름을 갖는다 */
function rowAction(categoryName: string, action: string): HTMLElement {
  return screen.getByRole("button", { name: `${categoryName} ${action}` });
}

function domainTab(name: string): HTMLElement {
  return within(screen.getByRole("radiogroup", { name: "유형" })).getByRole(
    "radio",
    { name },
  );
}

describe("CategoryListPage", () => {
  describe("트리 표시", () => {
    it("대·중·소가 부모 바로 아래 순서대로 늘어선다", () => {
      renderPage();

      expect(visibleNames().slice(0, 6)).toEqual([
        "카시트",
        "신생아 카시트",
        "바구니형",
        "회전형",
        "주니어 카시트",
        "부스터",
      ]);
      expect(screen.getByText("목록 (총 23건)")).toBeVisible();
    });

    /** 원본 `RENT_CATTREE`·`SALE_CATTREE` — 대분류 이름·순서·개수는 원본 그대로다 */
    it("대분류는 원본 시드 그대로다 (렌트 8 · 판매 7)", async () => {
      const { user } = renderPage();

      const majors = () =>
        bodyRows()
          .filter(
            (row) =>
              within(row).getAllByRole("cell")[CELL.level].textContent ===
              "대분류",
          )
          .map(nameOf);

      expect(majors()).toEqual([
        "카시트",
        "아기침대",
        "유모차",
        "바운서·스윙",
        "장난감",
        "보행기·점퍼루",
        "유축기",
        "육아가전",
      ]);

      await user.click(domainTab("판매"));
      expect(majors()).toEqual([
        "외출·이동",
        "수면·침실",
        "놀이·발달",
        "수유가전·소독",
        "기저귀·물티슈",
        "분유·이유식",
        "목욕·위생",
      ]);
    });

    it("단계마다 들여쓰기가 다르고, 하위 행에만 가지 기호가 붙는다", () => {
      renderPage();

      const nameCell = (name: string) =>
        within(rowOf(name)).getAllByRole("cell")[CELL.name];

      expect(classList(nameCell("카시트").firstElementChild)).toContain("pl-0");
      expect(classList(nameCell("신생아 카시트").firstElementChild)).toContain(
        "pl-4",
      );
      expect(classList(nameCell("바구니형").firstElementChild)).toContain(
        "pl-8",
      );

      // 대분류에는 가지가 없다 — 매달릴 부모가 없기 때문이다
      expect(nameCell("카시트").textContent).toBe("카시트");
      expect(nameCell("바구니형").textContent).toBe("└ 바구니형");
      // 가지 기호는 눈으로만 읽는다 — 계층은 단계 배지가 말한다
      expect(within(nameCell("바구니형")).getByText("└")).toHaveAttribute(
        "aria-hidden",
      );
    });

    /**
     * ⚠️ 계층은 상태가 아니다. 원본은 단계마다 색을 갈랐지만(파랑/회색/금색),
     * 상태색을 계층에 쓰면 "대분류는 좋은 상태"로 읽힌다.
     */
    it("단계 배지는 상태 색(success·critical)을 쓰지 않는다", () => {
      renderPage();

      const badge = (name: string) =>
        within(rowOf(name)).getAllByRole("cell")[CELL.level].firstElementChild;

      ["카시트", "신생아 카시트", "바구니형"].forEach((name) => {
        const classes = classList(badge(name));
        expect(classes).toContain("text-text-sub");
        expect(classes).not.toContain("text-text-success");
        expect(classes).not.toContain("text-text-critical");
        expect(classes).not.toContain("text-text-warning");
      });
    });
  });

  /**
   * 원본에는 조회 필터가 하나도 없다. 특히 **단계 필터는 트리를 깨뜨린다** —
   * "소분류만" 을 고르면 부모 없는 자식이 나열되어 들여쓰기가 가리킬 곳을 잃는다.
   */
  describe("원본에 없는 것 (되살아나지 않는지)", () => {
    it("단계 필터·검색·초기화가 없다", () => {
      renderPage();

      // radiogroup 은 렌트/판매 전환 하나뿐이다
      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(screen.getByRole("radiogroup")).toHaveAccessibleName("유형");

      expect(screen.queryByRole("textbox")).toBeNull();
      expect(screen.queryByRole("button", { name: "초기화" })).toBeNull();
      expect(screen.queryByRole("button", { name: "필터 초기화" })).toBeNull();
    });

    it("PageHeader 에 도움말 툴팁을 달지 않는다", () => {
      renderPage();

      expect(screen.queryByRole("button", { name: "도움말" })).toBeNull();
    });
  });

  /** 트리가 렌트용·판매용 둘이라는 것이 이 화면의 첫 사실이다 */
  describe("렌트 / 판매 트리 전환", () => {
    it("판매로 바꾸면 다른 트리가 뜨고 추가 버튼 문구도 따라간다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("button", { name: "렌트 대분류 추가" }),
      ).toBeVisible();

      await user.click(domainTab("판매"));

      expect(screen.getByText("목록 (총 15건)")).toBeVisible();
      expect(visibleNames().slice(0, 3)).toEqual([
        "외출·이동",
        "주니어 카시트",
        "부스터",
      ]);
      // 렌트에만 있는 가지는 판매 트리에 없다
      expect(visibleNames()).not.toContain("신생아 카시트");
      expect(
        screen.getByRole("button", { name: "판매 대분류 추가" }),
      ).toBeVisible();
    });
  });

  describe("등록 상품수 (하위 포함 합계 · 상품 샘플에서 계산)", () => {
    it("계산 규칙: 자기에게 걸린 수 + 모든 자손의 수", () => {
      const tree: Category[] = [
        {
          id: "a",
          domain: "rent",
          level: "major",
          name: "A",
          parentId: null,
          icon: null,
        },
        {
          id: "b",
          domain: "rent",
          level: "middle",
          name: "B",
          parentId: "a",
          icon: null,
        },
        {
          id: "c",
          domain: "rent",
          level: "minor",
          name: "C",
          parentId: "b",
          icon: null,
        },
        {
          id: "d",
          domain: "rent",
          level: "major",
          name: "D",
          parentId: null,
          icon: null,
        },
      ];
      const counts = productCountsOf(tree, [
        { category: "c" },
        { category: "c" },
        { category: "b" },
        { category: "없는-코드" },
      ]);

      expect(counts.get("c")).toBe(2);
      expect(counts.get("b")).toBe(3);
      expect(counts.get("a")).toBe(3);
      expect(counts.get("d")).toBe(0);
    });

    it("상품 목록 샘플과 같은 숫자를 보여 준다", () => {
      renderPage();

      expect(productCountOf("롤매트")).toBe(2);
      expect(productCountOf("바구니형")).toBe(3);
      expect(productCountOf("신생아 카시트")).toBe(5);
      expect(productCountOf("카시트")).toBe(6);
      expect(productCountOf("바운서·스윙")).toBe(0);
    });

    /** 상품의 카테고리 코드가 트리에 없으면 합계에서 조용히 빠진다 — 그걸 잡는다 */
    it("유형별 대분류 합계가 그 유형의 상품 수(본사 직영 포함)와 같다", async () => {
      const { user } = renderPage();

      const majorSum = () =>
        bodyRows()
          .filter(
            (row) =>
              within(row).getAllByRole("cell")[CELL.level].textContent ===
              "대분류",
          )
          .reduce((sum, row) => sum + productCountOf(nameOf(row)), 0);

      expect(majorSum()).toBe(
        PRODUCTS.filter((product) => product.mode === "rent").length,
      );
      await user.click(domainTab("판매"));
      expect(majorSum()).toBe(
        PRODUCTS.filter((product) => product.mode === "sale").length,
      );
    });
  });

  /**
   * 편집은 **알림만** 띄운다(퍼블 범위) — 확정해도 표는 그대로다.
   * 원본은 즉시 반영하지만 처리 결과로 데이터를 바꾸는 것은 개발 영역이다.
   */
  describe("순서 이동", () => {
    it("첫 형제는 ▲가, 막내는 ▼가 잠긴다", () => {
      renderPage();

      expect(rowAction("카시트", "위로")).toBeDisabled();
      expect(rowAction("카시트", "아래로")).toBeEnabled();
      expect(rowAction("육아가전", "아래로")).toBeDisabled();
      // 형제 안에서의 판정이다 — 첫 중분류도 ▲가 잠긴다
      expect(rowAction("신생아 카시트", "위로")).toBeDisabled();
      expect(rowAction("주니어 카시트", "위로")).toBeEnabled();
      // 외동은 둘 다 잠긴다
      expect(rowAction("롤매트", "위로")).toBeDisabled();
      expect(rowAction("롤매트", "아래로")).toBeDisabled();
    });

    it("옮기면 알림만 띄우고 표 순서는 그대로다", async () => {
      const { user } = renderPage();
      const before = visibleNames();

      await user.click(rowAction("유모차", "위로"));

      expect(
        await screen.findByText("카테고리 순서가 변경되었습니다."),
      ).toBeVisible();
      expect(visibleNames()).toEqual(before);
    });
  });

  describe("하위 카테고리 추가", () => {
    it("소분류에는 하위를 더 만들 수 없다 (3단계가 마지막)", () => {
      renderPage();

      expect(
        screen.queryByRole("button", { name: "바구니형 하위 추가" }),
      ).toBeNull();
      expect(rowAction("신생아 카시트", "하위 추가")).toBeVisible();
    });

    it("저장하면 알림만 띄우고 표는 그대로다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("놀이매트", "하위 추가"));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("하위 카테고리 추가")).toBeVisible();
      // 판매 트리에 있는 이름이어도 렌트 트리에서는 중복이 아니다
      await user.type(within(dialog).getByLabelText(/카테고리명/), "폴딩매트");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("'놀이매트' 하위에 '폴딩매트' 추가되었습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).not.toContain("폴딩매트");
      expect(screen.getByText("목록 (총 23건)")).toBeVisible();
    });
  });

  describe("카테고리명 변경", () => {
    it("기존 이름이 채워진 채로 열린다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("카테고리명 변경")).toBeVisible();
      expect(within(dialog).getByLabelText(/카테고리명/)).toHaveValue("회전형");
    });

    it("이름을 비우거나 공백만 넣으면 오류를 띄우고 모달을 닫지 않는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));
      const dialog = await screen.findByRole("dialog");

      await user.clear(within(dialog).getByLabelText(/카테고리명/));
      await user.type(within(dialog).getByLabelText(/카테고리명/), "   ");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "카테고리명을 입력해 주세요.",
      );
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    /** 원본은 **무엇이 무엇으로** 바뀌었는지를 이름째 알린다 */
    it("이름을 고쳐 저장하면 결과를 이름째 알리고 표는 그대로다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));
      const dialog = await screen.findByRole("dialog");

      await user.clear(within(dialog).getByLabelText(/카테고리명/));
      await user.type(
        within(dialog).getByLabelText(/카테고리명/),
        "360 회전형",
      );
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText(
          "'회전형' → '360 회전형'(으)로 변경되었습니다.",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).toContain("회전형");
      expect(visibleNames()).not.toContain("360 회전형");
    });

    it("이름을 그대로 두고 저장하면 알림 없이 닫힌다 (원본 `v===name`)", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(screen.queryByText(/변경되었습니다/)).toBeNull();
    });
  });

  /** 원본 `catExists` — 지금 보는 트리 전체(단계 무관)에서 같은 이름을 막는다 */
  describe("이름 중복 검사", () => {
    it("다른 단계에 있는 같은 이름도 막는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "렌트 대분류 추가" }),
      );
      const dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText(/카테고리명/), "부스터");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "이미 존재하는 카테고리명입니다.",
      );
      expect(screen.queryByText(/대분류가 추가되었습니다/)).toBeNull();
    });

    it("이름변경은 다른 카테고리의 이름과만 겹치면 막는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));
      const dialog = await screen.findByRole("dialog");
      await user.clear(within(dialog).getByLabelText(/카테고리명/));
      await user.type(within(dialog).getByLabelText(/카테고리명/), "바구니형");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "이미 존재하는 카테고리명입니다.",
      );
    });
  });

  describe("대분류 추가", () => {
    it("저장하면 원본 문구로 알리고 표는 그대로다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "렌트 대분류 추가" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("렌트 대분류 추가")).toBeVisible();
      expect(within(dialog).getByLabelText(/카테고리명/)).toHaveValue("");

      await user.type(within(dialog).getByLabelText(/카테고리명/), "이동·외출");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("'이동·외출' 대분류가 추가되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("목록 (총 23건)")).toBeVisible();
      expect(visibleNames()).not.toContain("이동·외출");
    });

    it("다시 열면 지난 입력과 오류가 남아 있지 않다", async () => {
      const { user } = renderPage();
      const open = () =>
        user.click(screen.getByRole("button", { name: "렌트 대분류 추가" }));

      await open();
      let dialog = await screen.findByRole("dialog");
      await user.type(within(dialog).getByLabelText(/카테고리명/), "카시트");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));
      expect(within(dialog).getByRole("alert")).toBeVisible();
      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      await open();
      dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByLabelText(/카테고리명/)).toHaveValue("");
      expect(within(dialog).queryByRole("alert")).toBeNull();
    });
  });

  /** 원본 UI-325 — 막히면 **창 없이** 이유만 알리고, 빈 카테고리만 확인 창으로 간다 */
  describe("카테고리 삭제 규칙", () => {
    it("하위도 상품도 없는 빈 카테고리는 확인 창을 거쳐 알림만 띄운다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("바운서·스윙", "삭제"));
      const dialog = await screen.findByRole("dialog");

      expect(
        within(dialog).getByText(
          "하위 카테고리와 등록 상품이 없는 빈 카테고리만 삭제됩니다.",
        ),
      ).toBeVisible();
      expect(
        classList(within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다.")),
      ).toContain("body-medium-bold");

      await user.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText("'바운서·스윙' 카테고리가 삭제되었습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).toContain("바운서·스윙");
    });

    it("하위 카테고리가 있으면 창을 열지 않고 이유를 알린다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("장난감", "삭제"));

      expect(
        await screen.findByText("하위 카테고리가 있어 삭제할 수 없습니다."),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    /** 원본은 **몇 건이 걸려 있는지**까지 말한다 — 그 수는 표의 상품수와 같다 */
    it("등록 상품이 있으면 창을 열지 않고 그 건수를 알린다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("롤매트", "삭제"));

      expect(
        await screen.findByText("등록 상품 2건이 있어 삭제할 수 없습니다."),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("아이콘 관리 모달", () => {
    it("제목에 카테고리 이름이 붙고, 규격 안내 3줄은 원본 문구 그대로다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("카시트", "아이콘 관리"));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAccessibleName("카테고리 아이콘 · 카시트");
      expect(
        within(dialog).getByText(
          "이미지 크기 : 최대 1000 X 1000px, 최소 300 X 300px 이상",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText(
          "이미지 형식 : jpg,png 형식의 이미지만 등록 가능합니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("이미지 용량 : 1MB 이하 (최대 5MB)"),
      ).toBeVisible();
    });

    /** 원본 시드는 렌트 카시트·유모차 둘만 아이콘이 있다 — 두 얼굴을 함께 보이려는 것 */
    it("아이콘이 있으면 교체·삭제를, 없으면 등록만 준다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("카시트", "아이콘 관리"));
      let dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("button", { name: "교체" }),
      ).toBeVisible();
      expect(
        within(dialog).getByRole("button", { name: "삭제" }),
      ).toBeVisible();
      expect(
        within(dialog).queryByRole("button", { name: "아이콘 등록" }),
      ).toBeNull();

      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      await user.click(rowAction("아기침대", "아이콘 관리"));
      dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("button", { name: "아이콘 등록" }),
      ).toBeVisible();
      expect(within(dialog).queryByRole("button", { name: "교체" })).toBeNull();
    });

    it("등록하면 알림만 띄우고 창은 열린 채 그대로다 (원본도 닫지 않는다)", async () => {
      const { user } = renderPage();

      await user.click(rowAction("아기침대", "아이콘 관리"));
      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "아이콘 등록" }),
      );

      expect(
        await screen.findByText("카테고리 아이콘을 등록했습니다."),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(
        within(dialog).getByRole("button", { name: "아이콘 등록" }),
      ).toBeVisible();
    });

    it("삭제해도 알림만 띄우고 아이콘은 그대로다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("유모차", "아이콘 관리"));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText("카테고리 아이콘을 삭제했습니다."),
      ).toBeVisible();
      expect(
        within(dialog).getByRole("button", { name: "교체" }),
      ).toBeVisible();
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
    renderAt("/categories?preview=loading");

    expect(screen.getByText("카테고리")).toBeVisible();
    expect(screen.queryByText("카시트")).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 트리가 있어도 빈 상태를 보여준다", () => {
    renderAt("/categories?preview=empty");

    expect(screen.queryByText("카시트")).toBeNull();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });

  it("refreshing — 스켈레톤으로 되돌리지 않고 이전 값을 흐리게 둔다", () => {
    renderAt("/categories?preview=refreshing");

    expect(screen.getByText("카시트")).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);

    const body = document.body.querySelector<HTMLElement>(
      "[data-table-shell-body]",
    );
    expect(body?.className ?? "").toContain("opacity-50");
  });
});
