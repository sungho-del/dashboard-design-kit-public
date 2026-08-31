import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ProductListPage } from "./ProductListPage";

/* -------------------------------------------------------------------------
 * 상품 관리 (S05) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 필터(상태 대시·유형·전시·카테고리 3단 연쇄)·검색·
 * 빈 상태·페이징·행 선택·처분 자격·반려 사유 모달 2종·미리보기 모달.
 *
 * 여기에 더해 **의미 검증**이 넷 붙어 있다 — 타입·린트가 못 잡는 자리다.
 *   1. 상태별 건수가 표의 행 수와 **어긋나지 않는가** (상수로 박으면 조용히 거짓말한다)
 *   2. 상태 색이 의미와 맞는가 (반려=critical · 재심사요청=warning · 품절=중립)
 *   3. 파생 금액(렌트가·판매가)이 원가−할인과 어긋나지 않는가
 *   4. **처분 자격**이 상태와 맞는가 — 이미 반려된 상품에 '반려 처리'가 뜨면
 *      화면이 거짓말을 한다 (원본 `productDispositionActions`)
 * 구조 계약(컬럼 순서·좌우 고정 열의 클래스)도 함께 못박는다 — 배경 클래스를 두 번
 * 방출하면 `cn()` 이 병합하지 않아 순서가 승자를 정하고, 줄무늬가 조용히 끊긴다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Dropdown·Select·DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구한다.
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

/**
 * 표 컬럼 이름과 순서 — **원본 어드민 그대로**다.
 * 선택 열을 뺀 22열. 여기가 흔들리면 `CELL` 인덱스가 통째로 어긋난다.
 */
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

function cellText(code: string, index: number): string {
  return within(rowOf(code)).getAllByRole("cell")[index].textContent ?? "";
}

/**
 * 판매 상태 필터 = **상태별 건수 대시의 카드**다 (원본 `StatDash`).
 * 접근가능 이름은 `${라벨} ${건수}개` 이므로 건수까지 함께 못박힌다.
 */
function statusCard(name: string): HTMLElement {
  return within(
    screen.getByRole("group", { name: "판매 상태별 건수" }),
  ).getByRole("button", { name });
}

function modeFilter(name: string): HTMLElement {
  return within(screen.getByRole("radiogroup", { name: "유형" })).getByRole(
    "radio",
    { name },
  );
}

/** Select 트리거는 `role="combobox"` 다 (floating-ui `useRole({ role: "select" })`) */
function selectTrigger(label: string): HTMLElement {
  return screen.getByRole("combobox", { name: label });
}

/** 셀렉트를 열고 옵션을 고른다 */
async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectLabel: string,
  optionLabel: string,
) {
  await user.click(selectTrigger(selectLabel));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: optionLabel }));
}

/** 페이지 버튼의 접근가능 이름은 숫자뿐이라 페이지네이션 안에서 찾는다 */
async function gotoPage(
  user: ReturnType<typeof userEvent.setup>,
  page: number,
) {
  const nav = screen.getByRole("navigation", { name: "페이지네이션" });
  await user.click(within(nav).getByRole("button", { name: String(page) }));
}

function searchBox(): HTMLElement {
  return screen.getByPlaceholderText("검색어 입력");
}

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
      expect(screen.getByText(/입점사 상품 관리에 그대로 표시/)).toBeVisible();
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

    /**
     * 저장은 `2026-08-14 09:20`, 화면은 `2026.08.14 09:20` 이다.
     *
     * 한때 이 두 열이 저장 문자열을 **그대로** 흘려 이 화면만 하이픈이 보였다.
     * 원본 어드민도 같은 자리를 `slice(0, 16).replace(/-/g, ".")` 로 찍는다.
     */
    it("등록일·수정일은 점 표기다 — 저장 형식(하이픈)을 그대로 흘리지 않는다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      for (const index of [20, 21]) {
        const text = cells[index].textContent ?? "";
        expect(text).toMatch(/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
        expect(text).not.toContain("-");
      }
    });
  });

  /**
   * 원본이 이 자리에 두는 것은 `StatDash` — **판매 상태별 건수**이고 카드가 곧 필터다.
   * 한때 여기 있던 요약 카드 3장(전체 상품 `1,284개` · 증감 화살표 · 비교 기준 문구)은
   * **원본에 없는 발명**이었고, 표에 8행뿐인 화면에서 스스로 모순되는 숫자였다.
   */
  describe("판매 상태별 건수 대시", () => {
    it("상태 어휘 6칸(전체 + 5종)을 원본 순서대로 든다", () => {
      renderPage();

      const cards = within(
        screen.getByRole("group", { name: "판매 상태별 건수" }),
      ).getAllByRole("button");

      expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
        "전체 8개",
        "판매중 4개",
        "반려 1개",
        "재심사요청 1개",
        "판매중지 1개",
        "품절 1개",
      ]);
    });

    it("원본에 없는 증감·비교 기준 문구를 달지 않는다", () => {
      renderPage();

      const dash = screen.getByRole("group", { name: "판매 상태별 건수" });
      expect(dash.textContent).not.toMatch(/[+−-]\d/);
      expect(dash.querySelector(".lucide-trending-up")).toBeNull();
      expect(dash.querySelector(".lucide-trending-down")).toBeNull();
      expect(screen.queryByText(/대비/)).toBeNull();
    });

    it("카드를 누르면 그 상태로 걸리고, 고른 카드가 눌린 상태가 된다", async () => {
      const { user } = renderPage();

      expect(statusCard("전체 8개")).toHaveAttribute("aria-pressed", "true");

      await user.click(statusCard("반려 1개"));

      expect(visibleCodes()).toEqual(["R-1038"]);
      expect(statusCard("반려 1개")).toHaveAttribute("aria-pressed", "true");
      expect(statusCard("전체 8개")).toHaveAttribute("aria-pressed", "false");
    });

    /**
     * ⚠️ 이 화면의 첫 번째 의미 계약 — **건수가 표와 어긋나면 안 된다.**
     * 상수로 박아 두면 다른 필터를 걸었을 때 조용히 거짓말을 한다.
     */
    it("다른 필터를 걸면 건수도 함께 줄어 표의 행 수와 일치한다", async () => {
      const { user } = renderPage();

      await user.click(modeFilter("렌트"));

      // 렌트 4건 = 판매중 2 · 반려 1 · 재심사요청 1 · 판매중지 0 · 품절 0
      expect(statusCard("전체 4개")).toBeVisible();
      expect(statusCard("판매중 2개")).toBeVisible();
      expect(statusCard("품절 0개")).toBeVisible();

      await user.click(statusCard("판매중 2개"));
      expect(visibleCodes()).toEqual(["R-1042", "R-1019"]);
    });

    /** 상태 축의 입구는 대시 하나뿐이다 — 툴바에 세그먼트를 하나 더 두지 않는다 */
    it("툴바에는 상태 필터가 없다 (radiogroup 은 유형 하나뿐)", () => {
      renderPage();

      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(screen.getByRole("radiogroup")).toHaveAccessibleName("유형");
    });
  });

  describe("판매 상태 색 (의미 검증)", () => {
    it("반려는 critical · 재심사요청은 warning · 판매중은 success", () => {
      renderPage();

      const rejected = within(rowOf("R-1038")).getByText("반려");
      const rereview = within(rowOf("R-1031")).getByText("재심사요청");
      const onSale = within(rowOf("R-1042")).getByText("판매중");

      expect(classList(rejected)).toContain("text-text-critical");
      expect(classList(rereview)).toContain("text-text-warning");
      expect(classList(onSale)).toContain("text-text-success");
    });

    it("품절·판매중지처럼 정상적으로 멈춘 상태는 중립색이다", async () => {
      const { user } = renderPage();
      await gotoPage(user, 2);

      const soldout = within(rowOf("S-2198")).getByText("품절");
      const stopped = within(rowOf("S-2185")).getByText("판매중지");

      expect(classList(soldout)).toContain("text-text-sub");
      expect(classList(soldout)).not.toContain("text-text-critical");
      expect(classList(stopped)).toContain("text-text-sub");
    });

    /**
     * KC 인증·등록 이미지는 원본과 같은 `O`/`X` 다 —
     * `인증`/`미인증`, `등록`/`누락` 같은 라벨은 지어낸 어휘였다.
     * 색은 **`X` 쪽만** 준다(비대칭이 의도 · §3-1 "플래그").
     */
    it("KC·이미지 열은 O/X 로 찍히고 X 에만 경고색이 붙는다", async () => {
      const { user } = renderPage();

      expect(cellText("R-1031", CELL.kc)).toBe("X");
      expect(cellText("R-1031", CELL.image)).toBe("O");
      expect(cellText("R-1038", CELL.image)).toBe("X");
      expect(cellText("R-1042", CELL.kc)).toBe("O");

      const missing = within(rowOf("R-1031")).getByText("X");
      expect(classList(missing)).toContain("text-text-warning");

      // "O" 는 색을 입힌 요소가 아니라 맨 텍스트다
      await user.click(statusCard("전체 8개"));
      expect(within(rowOf("R-1042")).queryByText("X")).toBeNull();
    });

    /** 카테고리 열은 원본과 같이 **이름 하나**다 — 3단 경로를 이어 붙이지 않는다 */
    it("카테고리 열에는 소분류 이름만 찍힌다", () => {
      renderPage();

      expect(cellText("R-1042", CELL.category)).toBe("회전형");
      expect(cellText("S-2210", CELL.category)).toBe("UV");
      expect(cellText("R-1042", CELL.category)).not.toContain(">");
    });
  });

  describe("유형·상태 필터", () => {
    it("유형을 '렌트'로 좁히면 판매 상품이 사라진다", async () => {
      const { user } = renderPage();
      expect(visibleCodes()).toContain("S-2210");

      await user.click(modeFilter("렌트"));

      expect(visibleCodes()).toEqual(["R-1042", "R-1038", "R-1031", "R-1019"]);
    });

    it("판매 상태를 '반려'로 좁히면 반려 건만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusCard("반려 1개"));

      expect(visibleCodes()).toEqual(["R-1038"]);
      expect(screen.getByText("총 1건")).toBeVisible();
    });

    it("유형과 상태를 함께 걸면 교집합만 남는다", async () => {
      const { user } = renderPage();

      await user.click(modeFilter("판매"));
      await user.click(statusCard("판매중 2개"));

      expect(visibleCodes()).toEqual(["S-2210", "S-2170"]);
    });

    /**
     * 전시 상태는 판매 상태와 **다른 축**이다 — 판매중이어도 전시를 내려 둘 수 있다.
     * 표에 전시 상태 열이 있으므로 거를 수단도 있어야 한다(원본 `showStat` 칩).
     */
    it("전시 상태로 좁히면 내려가 있는 상품만 남는다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "전시 상태", "전시중지");

      expect(visibleCodes()).toEqual(["R-1038", "R-1031", "S-2185"]);
      expect(cellText("R-1038", CELL.display)).toBe("전시중지");
    });

    it("판매중이면서 전시를 내려 둔 건이 있어 두 축은 겹치지 않는다", async () => {
      const { user } = renderPage();

      await user.click(statusCard("판매중 4개"));
      await chooseOption(user, "전시 상태", "전시중");

      expect(visibleCodes()).toEqual(["R-1042", "S-2210", "R-1019", "S-2170"]);
    });
  });

  describe("카테고리 3단 연쇄", () => {
    it("대분류를 고르기 전에는 중·소분류를 열 수 없다", () => {
      renderPage();

      expect(selectTrigger("카테고리 중분류")).toBeDisabled();
      expect(selectTrigger("카테고리 소분류")).toBeDisabled();
    });

    it("대분류를 고르면 중분류가 열리고 그 하위만 선택지에 오른다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "카테고리 대분류", "카시트");

      expect(visibleCodes()).toEqual(["R-1042", "R-1019", "S-2170"]);

      const trigger = selectTrigger("카테고리 중분류");
      expect(trigger).toBeEnabled();
      await user.click(trigger);

      const listbox = await screen.findByRole("listbox");
      expect(
        within(listbox).getByRole("option", { name: "신생아 카시트" }),
      ).toBeVisible();
      // 유모차의 하위(디럭스)는 카시트를 고른 상태에서 나오면 안 된다
      expect(
        within(listbox).queryByRole("option", { name: "디럭스" }),
      ).toBeNull();
    });

    it("중분류까지 좁히면 그 아래 상품만 남는다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "카테고리 대분류", "카시트");
      await chooseOption(user, "카테고리 중분류", "신생아 카시트");

      expect(visibleCodes()).toEqual(["R-1042", "R-1019"]);
    });

    it("대분류를 바꾸면 중분류 선택이 풀린다 (남아 있으면 결과가 0건이 된다)", async () => {
      const { user } = renderPage();

      await chooseOption(user, "카테고리 대분류", "카시트");
      await chooseOption(user, "카테고리 중분류", "신생아 카시트");
      await chooseOption(user, "카테고리 대분류", "유모차");

      expect(selectTrigger("카테고리 중분류")).toHaveTextContent("중분류 전체");
      expect(visibleCodes()).toEqual(["R-1038", "S-2185"]);
    });
  });

  describe("검색·초기화·빈 상태", () => {
    it("셀러명으로 검색하면 그 셀러 상품만 남는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "맘스케어");

      expect(visibleCodes()).toEqual(["R-1038", "S-2185"]);
    });

    it("결과가 없으면 도메인 문구의 빈 상태가 뜨고, 초기화하면 되돌아온다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는상품코드");

      expect(screen.getByText("해당 조건의 상품이 없습니다")).toBeVisible();
      expect(
        screen.getByText(
          "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
        ),
      ).toBeVisible();
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(visibleCodes()).toEqual(["R-1042", "R-1038", "S-2210", "R-1031"]);
      expect(searchBox()).toHaveValue("");
    });

    it("초기화는 유형·상태·카테고리를 한 번에 되돌린다", async () => {
      const { user } = renderPage();

      await user.click(modeFilter("렌트"));
      await user.click(statusCard("판매중 2개"));
      await chooseOption(user, "카테고리 대분류", "카시트");
      expect(visibleCodes()).toEqual(["R-1042", "R-1019"]);

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(modeFilter("전체")).toBeChecked();
      expect(statusCard("전체 8개")).toHaveAttribute("aria-pressed", "true");
      expect(selectTrigger("카테고리 중분류")).toBeDisabled();
      expect(screen.getByText("총 8건")).toBeVisible();
    });

    /**
     * 검색은 **고른 대상 한 곳만** 훑는다(원본 `_searchfield`).
     * 세 필드를 동시에 훑으면 어디서 걸렸는지 결과만 보고는 알 수 없다.
     */
    it("검색 대상을 바꾸면 같은 낱말이라도 걸리는 행이 달라진다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "카시트");
      // 기본 대상은 셀러명이라 상품명에 '카시트'가 있어도 걸리지 않는다
      expect(bodyRows()).toHaveLength(0);

      await chooseOption(user, "검색 대상", "상품명");

      expect(visibleCodes()).toEqual(["R-1042", "R-1019", "S-2170"]);
    });
  });

  describe("페이지네이션", () => {
    it("8건을 4건씩 두 페이지로 나눈다", async () => {
      const { user } = renderPage();

      expect(visibleCodes()).toEqual(["R-1042", "R-1038", "S-2210", "R-1031"]);

      await gotoPage(user, 2);

      expect(visibleCodes()).toEqual(["S-2198", "S-2185", "R-1019", "S-2170"]);
    });
  });

  describe("행 선택과 일괄 처리", () => {
    it("헤더 체크박스로 현재 페이지를 한 번에 고르면 일괄 바가 뜬다", async () => {
      const { user } = renderPage();

      expect(screen.queryByText("4개 선택됨")).toBeNull();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );

      expect(screen.getByText("4개 선택됨")).toBeVisible();
    });

    it("행 체크박스를 눌러도 미리보기 모달은 열리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "회전형 카시트 스핀 360 선택" }),
      );

      expect(screen.getByText("1개 선택됨")).toBeVisible();
      expect(screen.queryByText("상품 미리보기")).toBeNull();
    });

    /** 반려 건(R-1038)만 승인으로 되살릴 수 있다 */
    it("승인 처리하면 결과와 도달 상태를 알리고 선택이 풀린다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: "디럭스 유모차 스톨라 프로 선택",
        }),
      );
      await user.click(screen.getByRole("button", { name: "승인 처리" }));

      expect(
        await screen.findByText(
          "1개 상품을 승인 처리했습니다 — 판매중으로 되돌렸습니다",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByText("1개 선택됨")).toBeNull());
    });
  });

  /**
   * ⚠️ 이 화면의 두 번째 의미 계약 — 원본 `productDispositionActions` 를 옮긴 것.
   * 상태가 곧 자격이다. 자격 없는 버튼이 뜨면 누를 수 있는 것처럼 보이고,
   * 눌러도 아무 일이 없거나 뜻 없는 조작이 일어난다.
   */
  describe("처분 자격 (의미 검증)", () => {
    it("판매중 상품에는 반려만, 승인은 뜨지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "회전형 카시트 스핀 360 선택" }),
      );

      expect(screen.getByRole("button", { name: "반려 처리" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "승인 처리" })).toBeNull();
    });

    it("이미 반려된 상품에는 승인만, 반려는 뜨지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: "디럭스 유모차 스톨라 프로 선택",
        }),
      );

      expect(screen.getByRole("button", { name: "승인 처리" })).toBeVisible();
      expect(screen.queryByRole("button", { name: "반려 처리" })).toBeNull();
    });

    it("재심사요청 건은 본사 판단 대기라 둘 다 뜬다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: "베드사이드 아기침대 슬립온 선택",
        }),
      );

      expect(screen.getByRole("button", { name: "승인 처리" })).toBeVisible();
      expect(screen.getByRole("button", { name: "반려 처리" })).toBeVisible();
    });

    it("자격이 섞이면 제외된 건수를 결과에 함께 알린다", async () => {
      const { user } = renderPage();

      // 1페이지 4건 = 판매중2 · 반려1 · 재심사요청1 → 승인 자격은 2건뿐이다
      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "승인 처리" }));

      expect(
        await screen.findByText(
          "2개 상품을 승인 처리했습니다 — 판매중으로 되돌렸습니다 · 2개 제외(승인 대상이 아닌 건)",
        ),
      ).toBeVisible();
    });
  });

  describe("반려 사유 입력 모달", () => {
    it("사유 없이 반려하면 오류를 띄우고 모달을 닫지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "회전형 카시트 스핀 360 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("상품 반려 사유 입력")).toBeVisible();
      // 안내 문구가 먼저 보인다
      expect(
        within(dialog).getByText(/입점사 상품 관리에 그대로 표시/),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "반려 사유를 입력해 주세요.",
      );
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("사유를 적어 반려하면 모달이 닫히고 건수를 알린다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "회전형 카시트 스핀 360 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
        "KC 인증서류 미제출",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        await screen.findByText(
          "1개 상품을 반려 처리했습니다 — 판매 상태를 «반려»로 내렸습니다",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    /**
     * 4건을 골랐어도 이미 반려된 R-1038 은 대상이 아니다.
     * 제목의 건수가 **실제로 처리될 수**여야 한다 — 선택 수를 그대로 쓰면
     * 모달이 4건이라 말하고 결과는 3건이 되어 화면이 스스로 모순된다.
     */
    it("여러 건을 한꺼번에 반려하면 제목의 건수가 **자격 있는 수**다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("상품 반려 사유 입력 (3건)"),
      ).toBeVisible();

      await user.type(
        within(dialog).getByRole("textbox", { name: "반려 사유" }),
        "등록 이미지 규격 미달",
      );
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        await screen.findByText(
          "3개 상품을 반려 처리했습니다 — 판매 상태를 «반려»로 내렸습니다 · 1개 제외(반려 대상이 아닌 건)",
        ),
      ).toBeVisible();
    });
  });

  describe("반려 사유 보기 모달", () => {
    it("반려 건의 사유와 처리 시각을 보여준다", async () => {
      const { user } = renderPage();

      await user.click(
        within(rowOf("R-1038")).getByRole("button", { name: "사유 보기" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText(/등록 이미지 규격 미달/)).toBeVisible();
      expect(within(dialog).getByText(/2026-08-19 10:15 처리/)).toBeVisible();
    });

    it("재심사요청 건에는 셀러가 이의를 제기했다는 꼬리말이 붙는다", async () => {
      const { user } = renderPage();

      await user.click(
        within(rowOf("R-1031")).getByRole("button", { name: "사유 보기" }),
      );

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(/셀러가 재심사를 요청한 건입니다/),
      ).toBeVisible();
    });

    it("정상 판매중인 행에는 사유 보기가 없다", () => {
      renderPage();

      expect(
        within(rowOf("R-1042")).queryByRole("button", { name: "사유 보기" }),
      ).toBeNull();
    });
  });

  describe("미리보기 모달", () => {
    it("행을 누르면 미리보기가 열리고 파생 가격이 표와 같다", async () => {
      const { user } = renderPage();

      await user.click(within(rowOf("R-1042")).getAllByRole("cell")[CELL.name]);

      const sheet = await screen.findByRole("dialog", {
        name: /상품 미리보기/,
      });
      expect(within(sheet).getByText("베이비루")).toBeVisible();
      // 39,000 − 4,000 = 35,000 · 표의 렌트가 셀과 같은 값이어야 한다
      expect(within(sheet).getByText("35,000원/월")).toBeVisible();
      expect(cellText("R-1042", CELL.rentPrice)).toBe("35,000원/월");
    });

    /** 푸터도 SelectionBar 와 같은 자격 규칙을 따라야 둘이 어긋나지 않는다 */
    it("푸터 버튼은 그 상품의 자격만 보여준다", async () => {
      const { user } = renderPage();

      await user.click(within(rowOf("R-1038")).getAllByRole("cell")[CELL.name]);

      const sheet = await screen.findByRole("dialog", {
        name: /상품 미리보기/,
      });
      expect(
        within(sheet).getByRole("button", { name: "승인 처리" }),
      ).toBeVisible();
      expect(
        within(sheet).queryByRole("button", { name: "반려 처리" }),
      ).toBeNull();
    });
  });

  describe("행 액션", () => {
    /** 원본의 관리 열도 `수정` 하나뿐이다 — 드롭다운도, 상품코드 복사도 없다 */
    it("관리 열에는 수정 버튼 하나만 있다", async () => {
      const { user } = renderPage();

      const manage = within(rowOf("R-1042")).getAllByRole("cell")[CELL.manage];
      const buttons = within(manage).getAllByRole("button");

      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveAccessibleName("회전형 카시트 스핀 360 수정");
      expect(buttons[0]).toHaveTextContent("수정");

      await user.click(buttons[0]);
      expect(await screen.findByText("상품 수정 화면을 엽니다")).toBeVisible();
    });
  });

  describe("렌트·판매는 열의 의미가 다르다", () => {
    it("렌트 건은 판매 열이, 판매 건은 렌트 열이 비어 있다", () => {
      renderPage();

      expect(cellText("R-1042", CELL.rentBase)).toBe("39,000원");
      expect(cellText("R-1042", CELL.deposit)).toBe("120,000원");
      expect(cellText("R-1042", CELL.salePrice)).toBe("—");

      expect(cellText("S-2210", CELL.rentBase)).toBe("—");
      expect(cellText("S-2210", CELL.deposit)).toBe("—");
      // 129,000 − 20,000 = 109,000
      expect(cellText("S-2210", CELL.salePrice)).toBe("109,000원");
    });
  });

  describe("좌우 고정 열 (구조 계약)", () => {
    /**
     * 오프셋은 **`<colgroup>` 폭의 누적합**이라는 파생 관계를 검사한다.
     *
     * 리터럴을 적어 두면 폭을 고칠 때 테스트가 조용히 낡는다 — 실제로 원본
     * `minWidth` 를 이식했을 때 `left-*` 가 옛 폭 기준으로 남아 고정 열이 겹쳤다.
     * `w-<n>` 과 `left-<n>` 이 같은 4px 스케일이므로 단위 그대로 더하면 된다.
     */
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

      // 앞 열들의 폭을 더한 값이 그 열의 left 다
      const offsets = units
        .slice(0, 5)
        .map(
          (_, index) =>
            "left-" + units.slice(0, index).reduce((a, b) => a + b, 0),
        );
      expect(offsets[0]).toBe("left-0");

      const cells = within(rowOf("R-1042")).getAllByRole("cell");
      offsets.forEach((offset, index) => {
        const classes = classList(cells[index]);
        expect(classes).toContain("sticky");
        expect(classes).toContain(offset);
      });
    });

    it("고정 본문 셀의 배경은 행에서 물려받는다 (`bg-inherit`)", () => {
      renderPage();

      const cells = within(rowOf("R-1042")).getAllByRole("cell");
      expect(classList(cells[CELL.name])).toContain("bg-inherit");
      expect(classList(cells[CELL.manage])).toContain("bg-inherit");
      expect(classList(cells[CELL.manage])).toContain("right-0");
    });

    /**
     * `TableTh` 는 이미 `bg-surface` 를 방출한다. 여기에 `bg-inherit` 을 더하면
     * 같은 속성을 두 곳에서 내보내게 되고, `cn()` 은 병합하지 않으므로
     * 승자가 스타일시트 순서로 정해진다 — 헤더가 비쳐 보일 수 있다.
     */
    it("고정 헤더 셀에는 배경 클래스를 덧붙이지 않는다", () => {
      renderPage();

      const headerCells = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      expect(classList(headerCells[CELL.name])).toContain("sticky");
      /* 오프셋 값 자체는 위 "누적합" 테스트가 본다 — 여기서 리터럴로 못박으면
         폭을 고칠 때마다 이 테스트까지 낡는다 */
      expect(classList(headerCells[CELL.name])).not.toContain("bg-inherit");
      expect(classList(headerCells[CELL.name])).toContain("bg-surface");
    });
  });

  describe("헤더 액션", () => {
    it("엑셀 다운로드를 누르면 결과를 알린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("엑셀 파일을 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
