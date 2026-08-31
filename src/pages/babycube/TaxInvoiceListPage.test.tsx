import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { TaxInvoiceListPage } from "./TaxInvoiceListPage";
import {
  NO_ACTION,
  TAX_INVOICES,
  totalOf,
  vatOf,
  won,
} from "./TaxInvoiceListPage.data";

/**
 * S16 세금계산서·증빙 — **동작** 검증.
 *
 * 발행상태 필터 · 검색 조건 2종 · 빈 상태 · 페이지네이션 ·
 * **세액·합계 계산** · 작성일 표기 · 표 정렬 · 미리보기를 확인한다.
 *
 * ## ⚠️ 이 화면은 **읽기 전용**이다 — 없는 것을 못박는 테스트가 많다
 * 원본이 `total`·`filter`·`table` 셋만 넘기는 얇은 화면이라
 * **엑셀 다운로드 · 행 액션 · 발행 모달 · 정산월 셀렉트**가 전부 없다.
 * 다른 목록 화면을 베끼다 보면 다시 붙기 쉬워서 하나씩 확인한다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
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

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <TaxInvoiceListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/settle-tax"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 통째로 걷혀 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 계산서번호(1번째 컬럼) */
function visibleNos(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 */
function searchBox(): HTMLElement {
  return screen.getByRole("textbox");
}

/** 셀렉트를 열고 옵션 하나를 고른다 */
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string | RegExp,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(await screen.findByRole("listbox")).getByRole("option", {
      name: optionName,
    }),
  );
}

describe("TaxInvoiceListPage (BabyCube S16 세금계산서·증빙)", () => {
  describe("표 (원본 9열)", () => {
    it("컬럼 이름과 순서가 원본 그대로다 — 상태가 처리보다 앞이다", () => {
      renderPage();

      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual([
        "계산서번호",
        "공급자",
        "공급받는자",
        "작성일",
        "공급가액(수수료)",
        "세액(VAT)",
        "합계",
        "상태",
        "처리",
      ]);
    });

    /**
     * 표 전체가 **한 기준선**에 선다 — 수치도 좌측이다.
     * 배지만 들어가는 열만 가운데다(`DESIGN.md` §7-2): 배지는 글자가 아니라 객체라
     * 왼쪽 모서리에 정보가 없다.
     */
    it("우측 정렬 열이 없다 · 배지만 든 열만 가운데다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );

      for (const el of [...cells, ...headers]) {
        expect(el.className.split(/\s+/)).not.toContain("text-right");
      }

      const BADGE_COLUMNS = [7];
      headers.forEach((header, index) => {
        const want = BADGE_COLUMNS.includes(index);
        expect(header.className.split(/\s+/).includes("text-center")).toBe(
          want,
        );
        expect(
          cells[index].className.split(/\s+/).includes("text-center"),
        ).toBe(want);
      });
    });

    it("작성일은 원본 `ymd` 처럼 날짜만 낸다", () => {
      renderPage();

      expect(within(bodyRows()[0]).getAllByRole("cell")[3].textContent).toBe(
        "2026.08.10",
      );
    });
  });

  describe("⚠️ 읽기 전용 — 원본에 없는 것이 되살아나지 않는다", () => {
    it("처리 열은 항상 '-' 다 (발행 버튼도 계산서 보기도 없다)", () => {
      renderPage();

      for (const row of bodyRows()) {
        const cells = within(row).getAllByRole("cell");
        expect(cells[8].textContent).toBe(NO_ACTION);
        expect(within(cells[8]).queryByRole("button")).toBeNull();
      }
      expect(screen.queryByRole("button", { name: "발행" })).toBeNull();
      expect(screen.queryByRole("button", { name: "계산서 보기" })).toBeNull();
    });

    it("엑셀 다운로드가 없다 — 이 화면만 `toolsLeft` 가 없다", () => {
      renderPage();

      expect(
        screen.queryByRole("button", { name: "엑셀 다운로드" }),
      ).toBeNull();
    });

    it("정산월 셀렉트와 도움말 툴팁이 없다", () => {
      renderPage();

      expect(screen.queryByRole("combobox", { name: /정산월/ })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "세금계산서 도움말" }),
      ).toBeNull();
      // 원본 필터는 발행상태 + 검색 조건 둘뿐이다
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
    });
  });

  describe("금액 (파생값 · S12 와의 계약)", () => {
    it("세액 = 공급가액 × 10% · 합계 = 공급가액 + 세액", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[4]).toHaveTextContent("34,152,000원");
      expect(cells[5].textContent).toBe(won(vatOf(TAX_INVOICES[0])));
      expect(cells[6].textContent).toBe(won(totalOf(TAX_INVOICES[0])));

      expect(vatOf(TAX_INVOICES[0])).toBe(3_415_200);
      expect(totalOf(TAX_INVOICES[0])).toBe(37_567_200);
    });

    it("⛔ 공급가액은 S12 셀러 정산의 수수료와 같은 돈이다", () => {
      const july = TAX_INVOICES.find((row) => row.id === "TX-202607-0001")!;
      const june = TAX_INVOICES.find((row) => row.id === "TX-202606-0001")!;

      // S12 `2026-07-SEL0142` · `2026-06-SEL0142` 의 수수료
      expect(july.supply).toBe(34_152_000);
      expect(june.supply).toBe(35_424_000);
    });

    it("⛔ 발행상태는 S12 회차의 지급 여부를 따라간다", () => {
      // 지급완료(6월) 회차만 발행완료다 — S12 가 "지급 시 세금계산서가 함께 발행된다"고 말한다
      for (const row of TAX_INVOICES) {
        const isJune = row.id.startsWith("TX-202606");
        expect(row.status).toBe(isJune ? "issued" : "pending");
      }
    });
  });

  describe("발행상태 필터", () => {
    it("발행완료만 고르면 종결된 계산서만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "발행완료" }));

      expect(visibleNos()).toEqual(["TX-202606-0001", "TX-202606-0007"]);
      expect(screen.getByText("목록 (총 2건)")).toBeVisible();
    });

    it("발행대기를 고르면 아직 나가지 않은 계산서만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "발행대기" }));

      expect(bodyRows()).toHaveLength(5);
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });
  });

  describe("검색 (조건 2종)", () => {
    it("기본 조건은 계산서번호다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "202606");

      expect(visibleNos()).toEqual(["TX-202606-0001", "TX-202606-0007"]);
    });

    it("조건을 공급받는자로 바꾸면 셀러명으로 찾는다", async () => {
      const { user } = renderPage();

      await pickOption(user, /검색조건/, "공급받는자");
      await user.type(searchBox(), "베베마켓");

      expect(visibleNos()).toEqual(["TX-202607-0001", "TX-202606-0001"]);
    });

    it("조건이 계산서번호일 때 셀러명으로는 찾히지 않는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "베베마켓");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });
  });

  describe("빈 상태·초기화·페이지", () => {
    it("매칭이 없으면 원본 문구로 비우고 표와 페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는번호");

      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(
        screen.getByText(
          "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("'필터 초기화'로 전체가 돌아온다 — 컨트롤도 함께 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "발행완료" }));
      await user.type(searchBox(), "없는번호");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(
        screen.getByText(`목록 (총 ${TAX_INVOICES.length}건)`),
      ).toBeVisible();
      expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();
      expect(searchBox()).toHaveValue("");
    });

    it("2페이지로 넘어가면 나머지가 보인다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(5);
      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe("행 클릭 → 계산서 미리보기", () => {
    it("금액 4항목과 상태 설명이 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "계산서 미리보기" }),
      ).toBeVisible();
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["공급받는자", "작성일", "공급가액(수수료)", "합계"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual(["베베마켓", "2026.08.10", "34,152,000원", "37,567,200원"]);
      expect(
        within(sheet).getByText(/아직 국세청에 전송되지 않은 상태/),
      ).toBeVisible();
    });

    it("모달에도 액션이 없다 — 푸터를 그리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);
      const sheet = await screen.findByRole("dialog");

      expect(sheet.querySelector('[data-slot="footer"]')).toBeNull();
    });
  });
});
