import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ProductListPage } from "./ProductListPage";

/* -------------------------------------------------------------------------
 * 상품 관리 (S05) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 상태 대시·유형·전시·유형별 카테고리 3단·검색·
 * 빈 상태·페이징·행 선택(조건을 바꾸면 풀림)·처분 자격·반려 사유 모달 2종·엑셀 대상.
 *
 * 여기에 더해 **의미 검증**이 붙어 있다 — 타입·린트가 못 잡는 자리다.
 *   1. 상태별 건수가 표의 행 수와 **어긋나지 않는가** (상수로 박으면 조용히 거짓말한다)
 *   2. **본사 직영 상품이 섞이지 않는가** (원본 `SCREENS.products` 의 `base`)
 *   3. 상태 색이 의미와 맞는가 (반려=critical · 재심사요청=warning · 품절=중립)
 *   4. 파생 금액(렌트가·판매가)이 원가−할인과 어긋나지 않는가
 *   5. **처분 자격**이 상태와 맞는가 (원본 `productDispositionActions`)
 *   6. 퍼블 범위 — 승인·반려는 알림만, **행의 상태·건수는 바뀌지 않는다**
 * 구조 계약(컬럼 순서·좌우 고정 열의 클래스)도 함께 못박는다.
 *
 * 샘플(입점 상품 30건): 판매중 17 · 반려 2 · 재심사요청 2 · 판매중지 7 · 품절 2 (+ 본사 직영 1 — 화면에 없음)
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Select·DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구한다.
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
      <ProductListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/products"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

type User = ReturnType<typeof userEvent.setup>;

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 통째로 사라지므로 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 상품의 **상품코드**(4번째 셀) — 몇 건인지가 아니라 어느 건이 남았는지를 본다 */
function visibleCodes(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[3].textContent ?? "",
  );
}

/** 상품코드로 행을 찾는다 */
function rowOf(code: string): HTMLElement {
  const row = bodyRows().find(
    (candidate) =>
      (within(candidate).getAllByRole("cell")[3].textContent ?? "") === code,
  );
  if (!row) throw new Error(`행을 찾지 못했습니다: ${code}`);
  return row;
}

/** 셀 인덱스 — 컬럼 순서가 바뀌면 여기부터 깨지도록 이름을 붙여 둔다 */
const CELL = {
  select: 0,
  mode: 1,
  seller: 2,
  code: 3,
  name: 4,
  rentBase: 5,
  rentDiscount: 6,
  rentPrice: 7,
  deposit: 8,
  saleBase: 9,
  saleDiscount: 10,
  salePrice: 11,
  category: 15,
  kc: 16,
  image: 17,
  status: 18,
  display: 19,
  createdAt: 20,
  updatedAt: 21,
  manage: 22,
} as const;

/** 표 컬럼 이름과 순서 — **원본 어드민 그대로**다. 선택 열을 뺀 22열 */
const COLUMN_LABELS = [
  "유형",
  "셀러",
  "상품코드",
  "상품명",
  "렌트 원가",
  "할인 금액",
  "렌트가",
  "보증금",
  "판매 원가",
  "판매 할인",
  "판매가",
  "배송비",
  "반품배송비",
  "교환배송비",
  "카테고리",
  "KC 인증",
  "등록 이미지",
  "판매 상태",
  "전시 상태",
  "상품등록일",
  "최종수정일",
  "관리",
];

/** [판매중] 기본 순서 — 1페이지 10건 · 2페이지 7건 */
const ON_SALE_PAGE_1 = [
  "BL240814",
  "BL240811",
  "AR240729",
  "LS240724",
  "GJ811204",
  "KB820417",
  "AS730125",
  "BH612093",
  "LB905531",
  "MC447210",
];
const ON_SALE_PAGE_2 = [
  "KB338806",
  "AR271948",
  "BL560372",
  "LS184620",
  "AS902715",
  "BH731058",
  "GJ650283",
];

function cellText(code: string, index: number): string {
  return within(rowOf(code)).getAllByRole("cell")[index].textContent ?? "";
}

/** 상태 카드 — 접근가능 이름은 `${라벨} ${건수}개` 라 건수까지 함께 못박힌다 */
function statusCard(name: string): HTMLElement {
  return within(
    screen.getByRole("group", { name: "판매 상태별 건수" }),
  ).getByRole("button", { name });
}

/** 상태 카드를 라벨로 고른다. 건수는 필터에 따라 달라지므로 라벨 앞부분만 맞춘다 */
const pickStatus = async (user: User, label: string) =>
  user.click(
    within(screen.getByRole("group", { name: "판매 상태별 건수" })).getByRole(
      "button",
      { name: new RegExp(`^${label} `) },
    ),
  );

/** 유형 라디오. 조건 영역 안에 있으므로 **먼저 펼쳐 둔 상태에서** 부른다 */
function modeFilter(name: string): HTMLElement {
  return within(screen.getByRole("radiogroup", { name: "유형" })).getByRole(
    "radio",
    { name },
  );
}

/**
 * 검색조건을 펼친다. 조건 영역(`FilterBar`)은 **접힌 채로 열리고**, 닫혀 있는 동안은
 * 안의 컨트롤이 DOM 에 아예 없다.
 */
const openFilters = async (user: User) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

/** Select 트리거는 `role="combobox"` 다 */
function selectTrigger(label: string): HTMLElement {
  return screen.getByRole("combobox", { name: label });
}

/** 셀렉트를 열고 옵션을 고른다 */
async function chooseOption(
  user: User,
  selectLabel: string,
  optionLabel: string,
) {
  /* 페이지당 개수 셀렉트는 조건 영역 밖(페이지네이션)에 있다 */
  if (selectLabel !== "페이지당 개수") await openFilters(user);
  await user.click(selectTrigger(selectLabel));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: optionLabel }));
}

/** 페이지 버튼의 접근가능 이름은 숫자뿐이라 페이지네이션 안에서 찾는다 */
async function gotoPage(user: User, page: number) {
  const nav = screen.getByRole("navigation", { name: "페이지네이션" });
  await user.click(within(nav).getByRole("button", { name: String(page) }));
}

/** 검색어 입력. 조건 영역 안에 있으므로 **먼저 펼친다** */
async function searchBox(user: User): Promise<HTMLElement> {
  await openFilters(user);
  return screen.getByPlaceholderText("검색어 입력");
}

const checkboxOf = (productName: string) =>
  screen.getByRole("checkbox", { name: productName + " 선택" });

describe("ProductListPage", () => {
  /**
   * 원본 어드민의 `note` 는 화면에 **상시 노출**되는 배너다. 도움말 툴팁으로 접으면
   * 마지막 줄(연대책임)을 읽지 않은 채 미인증 상품이 노출될 수 있다.
   */
  describe("상시 안내 배너", () => {
    it("운영 원칙·절차·연대책임 세 줄이 화면에 그대로 떠 있다", () => {
      renderPage();

      expect(
        screen.getByText(
          "입점사가 등록한 상품은 승인 절차 없이 즉시 판매됩니다",
        ),
      ).toBeVisible();
      expect(screen.getByText(/사유는 입점사에 그대로 표시되고/)).toBeVisible();
      expect(
        screen.getByText("미인증 상품이 노출되면 연대책임이 발생합니다."),
      ).toBeVisible();
    });

    it("연대책임 줄만 warning 색을 쓴다 (세 줄을 다 칠하면 초점이 사라진다)", () => {
      renderPage();

      const warning = screen.getByText(
        "미인증 상품이 노출되면 연대책임이 발생합니다.",
      );
      const title = screen.getByText(
        "입점사가 등록한 상품은 승인 절차 없이 즉시 판매됩니다",
      );

      expect(classList(warning)).toContain("text-text-warning");
      expect(classList(title)).not.toContain("text-text-warning");
    });
  });

  describe("표 컬럼 (원본 구조 계약)", () => {
    it("22열의 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      // 0번은 선택 체크박스 열이라 이름이 없다
      expect(headers).toHaveLength(COLUMN_LABELS.length + 1);
      expect(headers.slice(1).map((th) => th.textContent)).toEqual(
        COLUMN_LABELS,
      );
    });

    it("`<col>` 개수가 컬럼 수와 일치한다 (table-fixed 라 어긋나면 폭이 밀린다)", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup > col");
      expect(cols).toHaveLength(COLUMN_LABELS.length + 1);
    });

    /** 원본처럼 **초까지**, 저장 형식(하이픈)이 아니라 점 표기 */
    it("등록일·수정일은 초까지 점 표기로 찍힌다", () => {
      renderPage();

      expect(cellText("BL240814", CELL.createdAt)).toBe("2026.08.14 09:20:13");
      expect(cellText("BL240814", CELL.updatedAt)).toBe("2026.08.18 11:02:47");
    });

    /** 원본 상품코드 형식 — 영문 2 + 숫자 6 */
    it("상품코드는 영문 2자 + 숫자 6자다", () => {
      renderPage();

      for (const code of visibleCodes())
        expect(code).toMatch(/^[A-Z]{2}\d{6}$/);
    });
  });

  describe("목록 머리", () => {
    it("「목록 (총 N건)」 이 조회 결과 건수를 말한다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("heading", { name: "목록 (총 17건)" }),
      ).toBeVisible();

      await pickStatus(user, "반려");
      expect(
        screen.getByRole("heading", { name: "목록 (총 2건)" }),
      ).toBeVisible();
    });

    it("엑셀은 고른 행이 없으면 조회 결과 전체, 있으면 고른 것만 알린다", async () => {
      const { user } = renderPage();
      const excel = () => screen.getByRole("button", { name: "엑셀 다운로드" });

      await user.click(excel());
      expect(
        await screen.findByText("조회 결과 17건을 내려받았습니다"),
      ).toBeVisible();

      await user.click(checkboxOf("회전형 카시트 스핀 360"));
      await user.click(checkboxOf("젖병소독기 UV 라이트"));
      await user.click(excel());
      expect(
        await screen.findByText("선택한 2건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("조회 결과가 없으면 내려받을 것이 없다고 알린다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "없는셀러");
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("다운로드할 데이터가 없습니다"),
      ).toBeVisible();
    });
  });

  /** 원본 `SCREENS.products` — `base` 에서 본사 직영(`src:'본사'`)을 뺀다 */
  describe("본사 직영 상품 제외", () => {
    it("본사 상품은 건수에도 표에도 없다", async () => {
      const { user } = renderPage();

      /* 데이터에는 본사 직영 품절 상품이 1건 있다 — 세면 3개가 된다 */
      expect(statusCard("품절 2개")).toBeVisible();

      await pickStatus(user, "품절");
      expect(visibleCodes()).toEqual(["KB781520", "GJ994106"]);

      await user.type(await searchBox(user), "본사");
      expect(bodyRows()).toHaveLength(0);
    });
  });

  describe("판매 상태별 건수 대시", () => {
    /** 원본 `products.dash`: "상태 1개당 카드 1장 · **[전체] 카드 없음**" */
    it("상태 어휘 5칸을 원본 순서대로 든다 ([전체] 카드는 없다)", () => {
      renderPage();

      const cards = within(
        screen.getByRole("group", { name: "판매 상태별 건수" }),
      ).getAllByRole("button");

      expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
        "판매중 17개",
        "반려 2개",
        "재심사요청 2개",
        "판매중지 7개",
        "품절 2개",
      ]);
    });

    it("원본에 없는 증감·비교 기준 문구를 달지 않는다", () => {
      renderPage();

      const dash = screen.getByRole("group", { name: "판매 상태별 건수" });
      expect(dash.textContent).not.toMatch(/[+−-]\d/);
      expect(screen.queryByText(/대비/)).toBeNull();
    });

    it("카드를 누르면 그 상태로 걸리고, 고른 카드가 눌린 상태가 된다", async () => {
      const { user } = renderPage();

      /* 원본 `products.dash`: "기본 : 화면 진입 시 [판매중] 선택" */
      expect(statusCard("판매중 17개")).toHaveAttribute("aria-pressed", "true");

      await user.click(statusCard("반려 2개"));

      expect(visibleCodes()).toEqual(["MC240812", "KB119374"]);
      expect(statusCard("반려 2개")).toHaveAttribute("aria-pressed", "true");
      expect(statusCard("판매중 17개")).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    /** ⚠️ 첫 번째 의미 계약 — **건수가 표와 어긋나면 안 된다** */
    it("다른 필터를 걸면 건수도 함께 줄어 표의 행 수와 일치한다", async () => {
      const { user } = renderPage();

      await openFilters(user);
      await user.click(modeFilter("렌트"));

      // 렌트 16건 = 판매중 10 · 반려 2 · 재심사요청 1 · 판매중지 4 · 품절 0 (품절은 판매 상품에만)
      expect(statusCard("판매중 10개")).toBeVisible();
      expect(statusCard("재심사요청 1개")).toBeVisible();
      expect(statusCard("판매중지 4개")).toBeVisible();
      expect(statusCard("품절 0개")).toBeVisible();
      expect(bodyRows()).toHaveLength(10);
    });

    it("조건 영역에는 상태 필터가 없다 (radiogroup 은 유형 하나뿐)", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(screen.getByRole("radiogroup")).toHaveAccessibleName("유형");
    });

    /** 다른 상태의 목록에서 고른 행·정렬이 남으면 보이지 않는 행이 처리 대상에 섞인다 */
    it("카드를 바꾸면 정렬·선택·페이지가 함께 풀린다", async () => {
      const { user } = renderPage();

      await user.click(
        screen
          .getByRole("columnheader", { name: /상품등록일/ })
          .querySelector("button")!,
      );
      await gotoPage(user, 2);
      /* 등록일 오름차순이면 가장 최근 7건이 2페이지에 온다 */
      await user.click(checkboxOf("휴대용 유모차 에어 라이트"));
      expect(screen.getByText("1개 선택됨")).toBeVisible();

      await pickStatus(user, "판매중지");
      await pickStatus(user, "판매중");

      expect(screen.queryByText("1개 선택됨")).toBeNull();
      expect(
        screen.getByRole("columnheader", { name: /상품등록일/ }),
      ).toHaveAttribute("aria-sort", "none");
      expect(visibleCodes()).toEqual(ON_SALE_PAGE_1);
    });
  });

  describe("판매 상태 색 (의미 검증)", () => {
    it("반려는 critical · 재심사요청은 warning · 판매중은 success", async () => {
      const { user } = renderPage();

      expect(
        classList(within(rowOf("BL240814")).getByText("판매중")),
      ).toContain("text-text-success");

      await pickStatus(user, "반려");
      expect(classList(within(rowOf("MC240812")).getByText("반려"))).toContain(
        "text-text-critical",
      );

      await pickStatus(user, "재심사요청");
      expect(
        classList(within(rowOf("LS240809")).getByText("재심사요청")),
      ).toContain("text-text-warning");
    });

    it("품절·판매중지처럼 정상적으로 멈춘 상태는 중립색이다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "품절");
      const soldout = within(rowOf("KB781520")).getByText("품절");
      expect(classList(soldout)).toContain("text-text-sub");
      expect(classList(soldout)).not.toContain("text-text-critical");

      await pickStatus(user, "판매중지");
      expect(
        classList(within(rowOf("MC240803")).getByText("판매중지")),
      ).toContain("text-text-sub");
    });

    /** O 제출 · △ 보완 필요 · X 미제출 — 색은 **X 에만** (△ 를 미제출로 칠하지 않는다) */
    it("KC·이미지 열은 O/△/X 로 찍히고 X 에만 경고색이 붙는다", async () => {
      const { user } = renderPage();

      expect(cellText("BL240814", CELL.kc)).toBe("O");
      expect(cellText("AS730125", CELL.kc)).toBe("△");
      expect(within(rowOf("AS730125")).getByText("△").tagName).toBe("TD");
      expect(cellText("MC447210", CELL.image)).toBe("X");
      expect(classList(within(rowOf("MC447210")).getByText("X"))).toContain(
        "text-text-warning",
      );

      await pickStatus(user, "재심사요청");
      expect(cellText("LS240809", CELL.kc)).toBe("X");
    });

    it("카테고리 열에는 소분류 이름만 찍힌다", () => {
      renderPage();

      expect(cellText("BL240814", CELL.category)).toBe("회전형");
      expect(cellText("BL240811", CELL.category)).toBe("UV");
    });
  });

  describe("유형·전시 필터", () => {
    it("유형을 '판매'로 좁히면 렌트 상품이 사라진다", async () => {
      const { user } = renderPage();

      await openFilters(user);
      await user.click(modeFilter("판매"));

      expect(visibleCodes()).toEqual([
        "BL240811",
        "LS240724",
        "KB820417",
        "BH612093",
        "AR271948",
        "AS902715",
        "GJ650283",
      ]);
    });

    /** 전시 상태는 판매 상태와 **다른 축**이다 — 판매중이어도 전시를 내려 둘 수 있다 */
    it("판매중이면서 전시를 내려 둔 상품만 걸러 볼 수 있다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "전시 상태", "전시중지");

      expect(visibleCodes()).toEqual(["KB338806"]);
      expect(cellText("KB338806", CELL.display)).toBe("전시중지");
    });
  });

  describe("카테고리 — 유형별 트리", () => {
    /** 원본 `catSelectHint` — 렌트·판매 트리가 따로라 유형을 모르면 고를 트리가 없다 */
    it("유형을 고르기 전에는 카테고리가 잠기고 안내가 붙는다", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(selectTrigger("카테고리 대분류")).toBeDisabled();
      expect(selectTrigger("카테고리 중분류")).toBeDisabled();
      expect(selectTrigger("카테고리 대분류")).toHaveTextContent(
        "유형 먼저 선택",
      );

      await user.click(modeFilter("렌트"));
      expect(selectTrigger("카테고리 대분류")).toBeEnabled();
      expect(selectTrigger("카테고리 대분류")).toHaveTextContent(
        "카테고리 전체",
      );
    });

    it("대분류 → 중분류로 좁히면 그 아래 상품만 남고, 하위 선택지는 그 대분류의 것뿐이다", async () => {
      const { user } = renderPage();
      await openFilters(user);
      await user.click(modeFilter("렌트"));

      await chooseOption(user, "카테고리 대분류", "카시트");
      expect(visibleCodes()).toEqual([
        "BL240814",
        "AR240729",
        "AS730125",
        "LB905531",
        "LS184620",
      ]);

      await user.click(selectTrigger("카테고리 중분류"));
      const listbox = await screen.findByRole("listbox");
      expect(
        within(listbox).queryByRole("option", { name: "디럭스" }),
      ).toBeNull();
      await user.click(
        within(listbox).getByRole("option", { name: "신생아 카시트" }),
      );

      expect(visibleCodes()).toEqual([
        "BL240814",
        "AR240729",
        "AS730125",
        "LS184620",
      ]);
    });

    it("대분류를 바꾸면 중분류 선택이 풀린다 (남아 있으면 결과가 0건이 된다)", async () => {
      const { user } = renderPage();
      await openFilters(user);
      await user.click(modeFilter("렌트"));

      await chooseOption(user, "카테고리 대분류", "카시트");
      await chooseOption(user, "카테고리 중분류", "신생아 카시트");
      await chooseOption(user, "카테고리 대분류", "수유·이유");

      expect(selectTrigger("카테고리 중분류")).toHaveTextContent("중분류 전체");
      expect(visibleCodes()).toEqual(["BL560372"]);
    });

    /** 원본 `setRadio` — 유형을 바꾸면 트리가 바뀌므로 카테고리를 비운다 */
    it("유형을 바꾸면 카테고리가 비워지고 그 유형의 트리로 바뀐다", async () => {
      const { user } = renderPage();
      await openFilters(user);
      await user.click(modeFilter("렌트"));
      await chooseOption(user, "카테고리 대분류", "카시트");

      await user.click(modeFilter("판매"));

      expect(selectTrigger("카테고리 대분류")).toHaveTextContent(
        "카테고리 전체",
      );
      await chooseOption(user, "카테고리 대분류", "카시트");
      /* 판매 트리의 카시트 — 렌트 카시트 상품은 걸리지 않는다 */
      expect(visibleCodes()).toEqual(["LS240724", "AR271948"]);
    });
  });

  describe("검색·초기화·빈 상태", () => {
    it("셀러명으로 검색하면 그 셀러 상품만 남는다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "베이비루");
      expect(visibleCodes()).toEqual(["BL240814", "BL240811", "BL560372"]);
    });

    it("결과가 없으면 빈 상태가 뜨고, 초기화하면 되돌아온다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "없는상품코드");

      expect(screen.getByText("해당 조건의 상품이 없습니다")).toBeVisible();
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(visibleCodes()).toEqual(ON_SALE_PAGE_1);
      expect(await searchBox(user)).toHaveValue("");
    });

    it("초기화는 유형·상태·카테고리를 한 번에 되돌린다", async () => {
      const { user } = renderPage();

      await openFilters(user);
      await user.click(modeFilter("렌트"));
      await pickStatus(user, "반려");
      await chooseOption(user, "카테고리 대분류", "유모차");
      expect(visibleCodes()).toEqual(["MC240812", "KB119374"]);

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(modeFilter("전체")).toBeChecked();
      expect(statusCard("판매중 17개")).toHaveAttribute("aria-pressed", "true");
      expect(selectTrigger("카테고리 대분류")).toBeDisabled();
    });

    /** 검색은 **고른 대상 한 곳만** 훑는다(원본 `_searchfield`) */
    it("검색 대상을 바꾸면 같은 낱말이라도 걸리는 행이 달라진다", async () => {
      const { user } = renderPage();

      await user.type(await searchBox(user), "카시트");
      // 기본 대상은 셀러명이라 상품명에 '카시트'가 있어도 걸리지 않는다
      expect(bodyRows()).toHaveLength(0);

      await chooseOption(user, "검색 대상", "상품명");

      expect(visibleCodes()).toEqual([
        "BL240814",
        "AR240729",
        "LS240724",
        "AS730125",
        "LB905531",
        "LS184620",
      ]);
    });

    it("검색조건 요약은 원본처럼 「항목명 값」으로 적는다", async () => {
      const { user } = renderPage();

      await openFilters(user);
      await user.click(modeFilter("렌트"));
      await chooseOption(user, "전시 상태", "전시중");
      await chooseOption(user, "카테고리 대분류", "카시트");
      /* 요약은 접힌 머리에 뜬다 */
      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));

      expect(
        screen.getByText("전시 상태 전시중 · 유형 렌트 · 카시트"),
      ).toBeVisible();
    });

    /** 결과 밖으로 나간 선택이 남으면 보이지 않는 상품이 다음 처리 대상에 섞인다 */
    it("조건을 바꾸면 고른 행이 풀린다", async () => {
      const { user } = renderPage();

      await user.click(checkboxOf("회전형 카시트 스핀 360"));
      expect(screen.getByText("1개 선택됨")).toBeVisible();

      await user.type(await searchBox(user), "베이비루");

      expect(screen.queryByText("1개 선택됨")).toBeNull();
      expect(checkboxOf("회전형 카시트 스핀 360")).not.toBeChecked();
    });
  });

  describe("페이지네이션", () => {
    it("기본은 10개씩이고, 나머지는 2페이지에 있다", async () => {
      const { user } = renderPage();

      expect(visibleCodes()).toEqual(ON_SALE_PAGE_1);

      await gotoPage(user, 2);
      expect(visibleCodes()).toEqual(ON_SALE_PAGE_2);
    });

    it("페이지당 개수를 늘리면 한 페이지에 모두 보인다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "페이지당 개수", "20개씩 보기");

      expect(visibleCodes()).toEqual([...ON_SALE_PAGE_1, ...ON_SALE_PAGE_2]);
    });
  });

  describe("행 선택과 일괄 처리", () => {
    it("헤더 체크박스로 현재 페이지를 한 번에 고르면 일괄 바가 뜬다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );

      expect(screen.getByText("10개 선택됨")).toBeVisible();
    });

    /** 퍼블은 저장하지 않는다 — 알림을 띄우고 선택만 푼다. 건수·행은 그대로다 */
    it("승인 처리하면 원본 문구로 알리고 선택이 풀린다 (행은 그대로)", async () => {
      const { user } = renderPage();

      await pickStatus(user, "반려");
      await user.click(checkboxOf("디럭스 유모차 스톨라 프로"));
      await user.click(screen.getByRole("button", { name: "승인 처리" }));

      expect(
        await screen.findByText(
          "1건 승인 처리되었습니다. 판매중으로 되돌렸습니다.",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByText("1개 선택됨")).toBeNull());
      expect(statusCard("반려 2개")).toBeVisible();
      expect(visibleCodes()).toEqual(["MC240812", "KB119374"]);
    });

    /** 원본에 없던 우회 통로 — 행 클릭 미리보기(안에 승인/반려)를 걷어냈다 */
    it("행을 눌러도 창이 열리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        within(rowOf("BL240814")).getAllByRole("cell")[CELL.rentBase],
      );

      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  /** ⚠️ 원본 `productDispositionActions` — 상태가 곧 자격이다 */
  describe("처분 자격 (의미 검증)", () => {
    it("판매중 상품에는 반려만, 승인은 뜨지 않는다", async () => {
      const { user } = renderPage();

      await user.click(checkboxOf("회전형 카시트 스핀 360"));

      expect(screen.getByRole("button", { name: "반려 처리" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "승인 처리" })).toBeNull();
    });

    it("이미 반려된 상품에는 승인만, 반려는 뜨지 않는다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "반려");
      await user.click(checkboxOf("디럭스 유모차 스톨라 프로"));

      expect(screen.getByRole("button", { name: "승인 처리" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "반려 처리" })).toBeNull();
    });

    it("재심사요청 건은 본사 판단 대기라 둘 다 뜬다 — [승인][반려] 순서", async () => {
      const { user } = renderPage();

      await pickStatus(user, "재심사요청");
      await user.click(checkboxOf("베드사이드 아기침대 슬립온"));

      const approve = screen.getByRole("button", { name: "승인 처리" });
      const reject = screen.getByRole("button", { name: "반려 처리" });
      expect(
        approve.compareDocumentPosition(reject) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    /** 판매중지는 셀러 자율이라 본사가 풀어 판매중으로 되돌리는 통로가 없다 */
    it("판매중지 상품에는 승인이 뜨지 않는다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "판매중지");
      await user.click(checkboxOf("기내반입 휴대용 유모차 라이트"));

      expect(screen.queryByRole("button", { name: "승인 처리" })).toBeNull();
      expect(screen.getByRole("button", { name: "반려 처리" })).toBeVisible();
    });
  });

  describe("반려 사유 입력 모달", () => {
    const openRejectFor = async (user: User, productName: string) => {
      await user.click(checkboxOf(productName));
      await user.click(screen.getByRole("button", { name: "반려 처리" }));
      return screen.findByRole("dialog");
    };

    it("원본 제목·안내를 내고, 대상 줄(상품명)은 두지 않는다", async () => {
      const { user } = renderPage();

      const dialog = await openRejectFor(user, "회전형 카시트 스핀 360");

      expect(dialog).toHaveAccessibleName("상품 반려 사유 입력");
      expect(
        within(dialog).getByText(/상품 상세에서 \[재심사 요청\]을 넣습니다/),
      ).toBeVisible();
      expect(within(dialog).queryByText("회전형 카시트 스핀 360")).toBeNull();
      expect(
        within(dialog).getByRole("button", { name: "취소" }),
      ).toBeVisible();
    });

    it("사유가 비었거나 공백뿐이면 오류를 띄우고 모달을 닫지 않는다", async () => {
      const { user } = renderPage();

      const dialog = await openRejectFor(user, "회전형 카시트 스핀 360");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "반려 사유를 입력해주세요.",
      );

      await user.type(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
        "   ",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(within(dialog).getByRole("alert")).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("취소했다 다시 열면 적던 사유와 오류가 지워져 있다", async () => {
      const { user } = renderPage();

      let dialog = await openRejectFor(user, "회전형 카시트 스핀 360");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      await user.type(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
        "적다 만 사유",
      );
      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      await user.click(screen.getByRole("button", { name: "반려 처리" }));
      dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
      ).toHaveValue("");
      expect(within(dialog).queryByRole("alert")).toBeNull();
    });

    it("여러 건을 반려하면 제목이 건수를 품고, 알림 뒤에도 행은 그대로다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      const dialog = await screen.findByRole("dialog");
      expect(dialog).toHaveAccessibleName("상품 반려 사유 입력 (10건)");

      await user.type(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
        "등록 이미지 규격 미달",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        await screen.findByText(
          "10건 반려 처리되었습니다. 상태를 «반려»로 내렸습니다.",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(statusCard("판매중 17개")).toBeVisible();
      expect(screen.queryByText("10개 선택됨")).toBeNull();
    });
  });

  describe("반려 사유 보기 모달", () => {
    it("상태·상품·사유·처리 시각(초까지)을 보여주고 [확인] 으로 닫는다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "반려");
      await user.click(
        within(rowOf("MC240812")).getByRole("button", { name: "사유 보기" }),
      );

      const dialog = await screen.findByRole("dialog", { name: "반려 사유" });
      expect(
        within(dialog).getByText("디럭스 유모차 스톨라 프로"),
      ).toBeVisible();
      expect(within(dialog).getByText(/등록 이미지 규격 미달/)).toBeVisible();
      expect(
        within(dialog).getByText("2026.08.19 10:15:32 처리"),
      ).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "확인" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("사유가 없는 반려 건은 없다고 말한다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "반려");
      await user.click(
        within(rowOf("KB119374")).getByRole("button", { name: "사유 보기" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("등록된 반려 사유가 없습니다."),
      ).toBeVisible();
    });

    it("재심사요청 건에는 셀러가 이의를 제기했다는 꼬리말이 붙는다", async () => {
      const { user } = renderPage();

      await pickStatus(user, "재심사요청");
      await user.click(
        within(rowOf("LS240809")).getByRole("button", { name: "사유 보기" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(
          "2026.08.16 11:40:52 처리 · 셀러가 재심사를 요청한 건입니다.",
        ),
      ).toBeVisible();
    });

    it("정상 판매중인 행에는 사유 보기가 없다", () => {
      renderPage();

      expect(
        within(rowOf("BL240814")).queryByRole("button", { name: "사유 보기" }),
      ).toBeNull();
    });
  });

  describe("행 액션", () => {
    /** 원본: 상품명과 [수정]은 같은 상품 상세로 간다 — 그 화면이 생기기 전까지 알림 */
    it("상품명 링크는 상세가 준비 중이라고 알린다", async () => {
      const { user } = renderPage();

      await user.click(
        within(rowOf("BL240814")).getByRole("button", {
          name: "회전형 카시트 스핀 360",
        }),
      );

      expect(
        await screen.findByText("상품 상세 화면은 준비 중입니다"),
      ).toBeVisible();
    });

    it("관리 열에는 수정 버튼 하나만 있고, 같은 안내를 띄운다", async () => {
      const { user } = renderPage();

      const manage = within(rowOf("BL240814")).getAllByRole("cell")[
        CELL.manage
      ];
      const buttons = within(manage).getAllByRole("button");

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAccessibleName("회전형 카시트 스핀 360 수정");

      await user.click(buttons[0]);
      expect(
        await screen.findByText("상품 상세 화면은 준비 중입니다"),
      ).toBeVisible();
    });
  });

  describe("렌트·판매는 열의 의미가 다르다", () => {
    it("렌트 건은 판매 열이, 판매 건은 렌트 열이 비어 있고 파생가는 원가−할인이다", () => {
      renderPage();

      expect(cellText("BL240814", CELL.rentBase)).toBe("39,000원");
      expect(cellText("BL240814", CELL.deposit)).toBe("120,000원");
      // 39,000 − 4,000 = 35,000
      expect(cellText("BL240814", CELL.rentPrice)).toBe("35,000원/월");
      expect(cellText("BL240814", CELL.salePrice)).toBe("—");

      expect(cellText("BL240811", CELL.rentBase)).toBe("—");
      expect(cellText("BL240811", CELL.deposit)).toBe("—");
      // 129,000 − 20,000 = 109,000
      expect(cellText("BL240811", CELL.salePrice)).toBe("109,000원");
    });
  });

  describe("좌우 고정 열 (구조 계약)", () => {
    /** 오프셋은 **`<colgroup>` 폭의 누적합**이라는 파생 관계를 검사한다 */
    it("좌측 5열의 오프셋은 colgroup 폭의 누적합이다", () => {
      renderPage();

      const cols = [
        ...screen.getByRole("table").querySelectorAll("colgroup > col"),
      ];
      const units = cols.map((col) => {
        const found = /(?:^|\s)w-(\d+)(?:\s|$)/.exec(col.className);
        expect(found).not.toBeNull();
        return Number(found![1]);
      });

      const offsets = units
        .slice(0, 5)
        .map(
          (_, index) =>
            "left-" + units.slice(0, index).reduce((a, b) => a + b, 0),
        );
      expect(offsets[0]).toBe("left-0");

      const cells = within(rowOf("BL240814")).getAllByRole("cell");
      offsets.forEach((offset, index) => {
        const classes = classList(cells[index]);
        expect(classes).toContain("sticky");
        expect(classes).toContain(offset);
      });
    });

    it("고정 본문 셀의 배경은 행에서 물려받는다 (`bg-inherit`)", () => {
      renderPage();

      const cells = within(rowOf("BL240814")).getAllByRole("cell");
      expect(classList(cells[CELL.name])).toContain("bg-inherit");
      expect(classList(cells[CELL.manage])).toContain("bg-inherit");
      expect(classList(cells[CELL.manage])).toContain("right-0");
    });

    it("고정 헤더 셀에는 배경 클래스를 덧붙이지 않는다", () => {
      renderPage();

      const headerCells = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      expect(classList(headerCells[CELL.name])).toContain("sticky");
      expect(classList(headerCells[CELL.name])).not.toContain("bg-inherit");
      expect(classList(headerCells[CELL.name])).toContain("bg-surface");
    });
  });
});
