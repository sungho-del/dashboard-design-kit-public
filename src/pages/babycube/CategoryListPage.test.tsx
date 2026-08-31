import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CategoryListPage } from "./CategoryListPage";

/* -------------------------------------------------------------------------
 * 카테고리 관리 (S06) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 렌트/판매 트리 전환 · 순서 이동 ·
 * 하위 추가 · 이름변경 · 삭제 차단 규칙 3가지 · 아이콘 모달의 두 얼굴.
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 상위 카테고리의 등록 상품수가 **하위 합계와 일치**하는가
 *      (표에 나란히 보이는 숫자라 어긋나면 화면이 스스로 모순된다)
 *   2. 단계 배지가 상태 색(success·critical)을 쓰지 않는가
 *      (계층은 상태가 아니다 — 색으로 가르면 "대분류는 좋은 상태"로 읽힌다)
 *   3. 삭제가 막히는 두 이유를 **문장으로** 알려 주는가
 *   4. 순서를 옮길 때 **자손이 함께 따라가는가** (부모만 옮기면 트리가 끊긴다)
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

/** 이름 셀에는 가지 기호(`└`)가 함께 들어 있다 — 이름만 떼어 본다 */
function nameOf(row: HTMLElement): string {
  return (
    within(row).getAllByRole("cell")[CELL.name].textContent ?? ""
  ).replace("└", "");
}

function visibleNames(): string[] {
  return bodyRows().map(nameOf);
}

function rowOf(name: string): HTMLElement {
  const row = bodyRows().find((candidate) => nameOf(candidate) === name);
  if (!row) throw new Error(`행을 찾지 못했습니다: ${name}`);
  return row;
}

/** "128개" → 128 */
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
      expect(screen.getByText("목록 (총 19건)")).toBeVisible();
    });

    it("단계마다 들여쓰기가 다르고, 하위 행에는 가지 기호가 붙는다", () => {
      renderPage();

      const nameCellSpan = (name: string) =>
        within(rowOf(name)).getAllByRole("cell")[CELL.name].firstElementChild;

      expect(classList(nameCellSpan("카시트"))).toContain("pl-0");
      expect(classList(nameCellSpan("신생아 카시트"))).toContain("pl-4");
      expect(classList(nameCellSpan("바구니형"))).toContain("pl-8");

      // 대분류에는 가지가 없다 — 매달릴 부모가 없기 때문이다
      expect(
        within(rowOf("카시트")).getAllByRole("cell")[CELL.name].textContent,
      ).toBe("카시트");
      expect(
        within(rowOf("바구니형")).getAllByRole("cell")[CELL.name].textContent,
      ).toContain("└");
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

      expect(screen.getByText("목록 (총 12건)")).toBeVisible();
      expect(visibleNames().slice(0, 3)).toEqual([
        "카시트",
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

  describe("등록 상품수 정합 (의미 검증)", () => {
    it("상위 카테고리의 상품수는 하위 합계와 같다", () => {
      renderPage();

      expect(productCountOf("카시트")).toBe(
        productCountOf("신생아 카시트") + productCountOf("주니어 카시트"),
      );
      expect(productCountOf("신생아 카시트")).toBe(
        productCountOf("바구니형") + productCountOf("회전형"),
      );
      expect(productCountOf("유모차")).toBe(
        productCountOf("디럭스") + productCountOf("휴대용"),
      );
      expect(productCountOf("수면·안전")).toBe(
        productCountOf("아기침대") + productCountOf("놀이매트"),
      );
    });
  });

  /**
   * ⚠️ 순서 이동은 **블록째** 움직인다. 부모만 옮기고 자식을 두고 오면
   * 들여쓰기가 엉뚱한 부모를 가리키게 되어 트리가 통째로 거짓말을 한다.
   */
  describe("순서 이동", () => {
    it("첫 형제는 ▲가, 막내는 ▼가 잠긴다", () => {
      renderPage();

      expect(rowAction("카시트", "위로")).toBeDisabled();
      expect(rowAction("카시트", "아래로")).toBeEnabled();
      expect(rowAction("수유·이유", "아래로")).toBeDisabled();
      // 형제 안에서의 판정이다 — 첫 중분류도 ▲가 잠긴다
      expect(rowAction("신생아 카시트", "위로")).toBeDisabled();
      expect(rowAction("주니어 카시트", "위로")).toBeEnabled();
    });

    it("대분류를 올리면 하위가 통째로 따라 올라온다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("유모차", "위로"));

      expect(visibleNames().slice(0, 6)).toEqual([
        "유모차",
        "디럭스",
        "4륜",
        "휴대용",
        "기내반입",
        "카시트",
      ]);
    });

    it("형제끼리만 자리를 바꾼다 (다른 부모 밑으로 넘어가지 않는다)", async () => {
      const { user } = renderPage();

      await user.click(rowAction("신생아 카시트", "아래로"));

      expect(visibleNames().slice(0, 6)).toEqual([
        "카시트",
        "주니어 카시트",
        "부스터",
        "신생아 카시트",
        "바구니형",
        "회전형",
      ]);
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

    it("하위를 추가하면 부모 블록의 막내로 들어간다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("놀이매트", "하위 추가"));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("하위 카테고리 추가")).toBeVisible();
      await user.type(within(dialog).getByLabelText(/카테고리명/), "폴딩매트");
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("'놀이매트' 하위에 '폴딩매트' 추가되었습니다."),
      ).toBeVisible();
      // 부모(놀이매트) 블록의 끝 — 형 롤매트 뒤에 붙고, 다음 대분류를 넘지 않는다
      expect(visibleNames().slice(-6)).toEqual([
        "놀이매트",
        "롤매트",
        "폴딩매트",
        "수유·이유",
        "젖병소독기",
        "UV",
      ]);
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

    it("이름을 비우고 저장하면 오류를 띄우고 모달을 닫지 않는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("회전형", "이름변경"));
      const dialog = await screen.findByRole("dialog");

      await user.clear(within(dialog).getByLabelText(/카테고리명/));
      await user.click(within(dialog).getByRole("button", { name: "저장" }));

      expect(
        within(dialog).getByText("카테고리명을 입력해 주세요."),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    /** 원본은 **무엇이 무엇으로** 바뀌었는지를 이름째 알린다 */
    it("이름을 고쳐 저장하면 표가 바뀌고 결과를 이름째 알린다", async () => {
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
      expect(visibleNames()).toContain("360 회전형");
      expect(visibleNames()).not.toContain("회전형");
    });
  });

  describe("대분류 추가", () => {
    it("지금 보고 있는 트리의 마지막에 붙는다", async () => {
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
        await screen.findByText("'이동·외출' 렌트 대분류가 추가되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("목록 (총 20건)")).toBeVisible();
      expect(visibleNames().slice(-1)).toEqual(["이동·외출"]);
    });
  });

  describe("카테고리 삭제 규칙", () => {
    it("하위도 상품도 없는 빈 카테고리는 삭제되고 표에서 사라진다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("롤매트", "삭제"));
      const dialog = await screen.findByRole("dialog");

      expect(
        within(dialog).getByText(
          "하위 카테고리와 등록 상품이 없는 빈 카테고리만 삭제됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      const deleteButton = within(dialog).getByRole("button", { name: "삭제" });
      expect(deleteButton).toBeEnabled();
      await user.click(deleteButton);

      expect(
        await screen.findByText("'롤매트' 카테고리가 삭제되었습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(visibleNames()).not.toContain("롤매트");
      expect(screen.getByText("목록 (총 18건)")).toBeVisible();
    });

    it("하위 카테고리가 있으면 이유를 말하고 삭제를 잠근다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("수유·이유", "삭제"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "하위 카테고리가 있어 삭제할 수 없습니다.",
      );
      expect(
        within(dialog).getByRole("button", { name: "삭제" }),
      ).toBeDisabled();
    });

    /** 원본은 **몇 건이 걸려 있는지**까지 말한다 */
    it("등록 상품이 있으면 그 건수를 말하고 삭제를 잠근다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("부스터", "삭제"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "등록 상품 54건이 있어 삭제할 수 없습니다.",
      );
      expect(
        within(dialog).getByRole("button", { name: "삭제" }),
      ).toBeDisabled();
    });
  });

  describe("아이콘 관리 모달", () => {
    it("규격 안내 3줄은 원본 문구 그대로다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("카시트", "아이콘 관리"));

      const dialog = await screen.findByRole("dialog");
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

      await user.click(rowAction("수유·이유", "아이콘 관리"));
      dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("button", { name: "아이콘 등록" }),
      ).toBeVisible();
      expect(within(dialog).queryByRole("button", { name: "교체" })).toBeNull();
    });

    it("아이콘을 등록하면 그 행이 실제로 아이콘을 갖는다", async () => {
      const { user } = renderPage();

      await user.click(rowAction("수유·이유", "아이콘 관리"));
      let dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: "아이콘 등록" }),
      );

      expect(
        await screen.findByText("카테고리 아이콘을 등록했습니다."),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      // 다시 열면 이제 교체·삭제가 있다
      await user.click(rowAction("수유·이유", "아이콘 관리"));
      dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("button", { name: "교체" }),
      ).toBeVisible();
    });
  });
});
