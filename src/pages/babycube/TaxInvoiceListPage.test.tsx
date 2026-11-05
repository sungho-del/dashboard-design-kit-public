import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { TaxInvoiceListPage } from "./TaxInvoiceListPage";
import { SETTLEMENT_SUMMARY } from "./settlement.data";

/**
 * 세금계산서·증빙 — **동작**과 **사례표 숫자**(scratchpad `settle-cases.md`)를 본다.
 *
 * 발행상태 필터 · 검색(대소문자 무시) · 요약 · 빈 상태 · 처리 버튼 토스트(상태 그대로) ·
 * 행 클릭 없음 · 원본에 없는 것(체크박스·No·정렬·엑셀·미리보기) · 페이지 크기 · `?preview=`.
 *
 * jsdom 에는 `ResizeObserver`/`IntersectionObserver` 가 없다.
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

beforeEach(() => {
  window.history.replaceState(null, "", "/settle-tax");
});

type User = ReturnType<typeof userEvent.setup>;

function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/settle-tax${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <TaxInvoiceListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/settle-tax"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 걷혀 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

const nos = () => bodyRows().map((row) => cells(row)[0]);

const rowOf = (no: string) => {
  const row = bodyRows().find((item) => cells(item)[0] === no);
  if (!row) throw new Error(`행 없음: ${no}`);
  return row;
};

async function chooseOption(user: User, selectLabel: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

/** 사례표 「세금계산서」 — 셀러 정산 행 순서 그대로 */
const CASES = [
  ["TX-2609-0226", "베이비루", "13,080원", "1,308원", "14,388원", "발행완료"],
  ["TX-2609-0230", "아이랑", "1,344원", "134원", "1,478원", "미발행"],
  ["TX-2609-0228", "맘스케어", "1,330원", "133원", "1,463원", "미발행"],
  ["TX-2609-0201", "리틀베이비", "8,400원", "840원", "9,240원", "미발행"],
  ["TX-2609-0231", "코지베이비", "5,103원", "510원", "5,613원", "미발행"],
  ["TX-2609-1042", "아기별상사", "22,800원", "2,280원", "25,080원", "발행완료"],
  ["TX-2609-0229", "베베하우스", "2,264원", "226원", "2,490원", "미발행"],
];

describe("표 — 사례표 숫자", () => {
  it("수수료가 있는 셀러 7곳만 — 본사·리틀스텝(수수료 0원)은 없다", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "목록 (총 7건)" }),
    ).toBeVisible();
    expect(nos()).toEqual(CASES.map((item) => item[0]));
    expect(screen.queryByRole("cell", { name: "리틀스텝" })).toBeNull();
    expect(screen.queryByRole("cell", { name: "본사" })).toBeNull();
  });

  it("공급가액 = 판매 수수료 · 세액 = round(×10%) · 합계 · 상태 = 지급완료면 발행완료", () => {
    renderPage();

    bodyRows().forEach((row, index) => {
      const [no, buyer, supply, vat, total, status] = CASES[index];
      expect(cells(row)).toEqual([
        no,
        "BabyCube(본사)",
        buyer,
        "2026.10.12", // 작성일 = 회차 지급일
        supply,
        vat,
        total,
        status,
        status === "발행완료" ? "다운로드" : "발행",
      ]);
    });
  });

  it("공급가액 합 54,321원 = 셀러 정산 수수료 합", () => {
    renderPage();

    const supplySum = bodyRows()
      .map((row) => Number(cells(row)[4].replace(/\D/g, "")))
      .reduce((a, b) => a + b, 0);
    expect(supplySum).toBe(54_321);
    expect(SETTLEMENT_SUMMARY.fee).toBe(54_321);
  });
});

describe("검색조건", () => {
  it("기본 펼침 — 처음부터 발행상태·검색 대상이 보이고 요약은 조건 없음", () => {
    renderPage();

    expect(screen.getByRole("combobox", { name: "발행상태" })).toBeVisible();
    expect(screen.getByRole("combobox", { name: "검색 대상" })).toBeVisible();
    expect(screen.getByText("조건 없음 (전체)")).toBeInTheDocument();
  });

  it("발행상태로 거르고 요약에 나온다", async () => {
    const { user } = renderPage();

    await chooseOption(user, "발행상태", "발행완료");
    expect(nos()).toEqual(["TX-2609-0226", "TX-2609-1042"]);
    expect(screen.getByText("발행상태 발행완료")).toBeInTheDocument();

    await chooseOption(user, "발행상태", "미발행");
    expect(nos()).toHaveLength(5);
    expect(
      screen.getByRole("heading", { name: "목록 (총 5건)" }),
    ).toBeVisible();
  });

  it("계산서번호 검색은 대소문자를 가리지 않는다", async () => {
    const { user } = renderPage();

    await user.type(screen.getByRole("textbox"), "tx-2609-10");
    expect(nos()).toEqual(["TX-2609-1042"]);
    expect(screen.getByText("계산서번호 «tx-2609-10»")).toBeInTheDocument();
  });

  it("공급받는자로 바꿔 찾는다", async () => {
    const { user } = renderPage();

    await chooseOption(user, "검색 대상", "공급받는자");
    await user.type(screen.getByRole("textbox"), "리틀");
    expect(nos()).toEqual(["TX-2609-0201"]);
  });

  it("결과가 없으면 빈 상태 — [필터 초기화]로 7건이 돌아온다", async () => {
    const { user } = renderPage();

    await chooseOption(user, "발행상태", "발행완료");
    await user.type(screen.getByRole("textbox"), "코지");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    expect(bodyRows()).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(nos()).toHaveLength(7);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

describe("처리 열 — 토스트만, 상태는 그대로", () => {
  it("미발행 [발행] → 「{번호} 세금계산서 발행」 · 여전히 미발행", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "TX-2609-0201 발행" }));

    expect(
      await screen.findByText("TX-2609-0201 세금계산서 발행"),
    ).toBeInTheDocument();
    expect(cells(rowOf("TX-2609-0201"))[7]).toBe("미발행");
    expect(nos()).toHaveLength(7);
  });

  it("발행완료 [다운로드] → 「{번호} 다운로드」", async () => {
    const { user } = renderPage();

    await user.click(
      screen.getByRole("button", { name: "TX-2609-1042 다운로드" }),
    );

    expect(
      await screen.findByText("TX-2609-1042 다운로드"),
    ).toBeInTheDocument();
    expect(cells(rowOf("TX-2609-1042"))[7]).toBe("발행완료");
  });

  it("발행완료 행에는 [발행]이, 미발행 행에는 [다운로드]가 없다", () => {
    renderPage();

    expect(
      within(rowOf("TX-2609-0226")).queryByRole("button", { name: /발행$/ }),
    ).toBeNull();
    expect(
      within(rowOf("TX-2609-0230")).queryByRole("button", {
        name: /다운로드/,
      }),
    ).toBeNull();
  });

  it("처리 열은 오른쪽 고정 — 머리글·본문 셀이 sticky 이고 버튼이 그 안에 있다(1280 에서도 보이게)", () => {
    renderPage();

    const heads = within(screen.getByRole("table")).getAllByRole(
      "columnheader",
    );
    expect(heads[8]).toHaveTextContent("처리");
    expect(heads[8].className.split(" ")).toContain("sticky");
    const action = rowOf("TX-2609-0230").querySelectorAll("td")[8];
    expect(action.className.split(" ")).toContain("sticky");
    expect(
      within(action).getByRole("button", { name: "TX-2609-0230 발행" }),
    ).toBeVisible();
  });
});

describe("원본에 없는 것", () => {
  it("행을 눌러도 이동·미리보기가 없다(상세 없음)", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(within(rowOf("TX-2609-0226")).getByText("베이비루"));

    expect(onNavSelect).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("체크박스·No·정렬·엑셀이 없다", () => {
    renderPage();

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "No" })).toBeNull();
    expect(
      screen
        .getAllByRole("columnheader")
        .filter((th) => th.hasAttribute("aria-sort")),
    ).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
  });
});

describe("페이지", () => {
  it("기본 10개씩 — 7건이라 한 페이지", () => {
    renderPage();

    expect(
      screen.getByRole("combobox", { name: "페이지당 개수" }),
    ).toHaveTextContent("10");
    expect(
      within(
        screen.getByRole("navigation", { name: "페이지네이션" }),
      ).queryByRole("button", { name: "2" }),
    ).toBeNull();
  });

  it("행이 많으면 나뉘고, 크기를 바꾸면 1페이지로 돌아간다 (25건 fixture)", async () => {
    vi.resetModules();
    vi.doMock("./settlement.data", async (importOriginal) => {
      const actual = await importOriginal<typeof import("./settlement.data")>();
      const base = actual.TAX_INVOICES[0];
      return {
        ...actual,
        TAX_INVOICES: Array.from({ length: 25 }, (_, i) => ({
          ...base,
          no: `TX-FIX-${String(i + 1).padStart(3, "0")}`,
        })),
      };
    });
    const ui = await import("../../components/ui");
    const { TaxInvoiceListPage: Page } = await import("./TaxInvoiceListPage");
    const user = userEvent.setup();
    render(
      <ui.ToastProvider position="bottom">
        <Page
          navOpen
          onNavOpenChange={vi.fn()}
          activeNav="/settle-tax"
          onNavSelect={vi.fn()}
        />
      </ui.ToastProvider>,
    );

    expect(nos()).toHaveLength(10);
    await user.click(
      within(
        screen.getByRole("navigation", { name: "페이지네이션" }),
      ).getByRole("button", { name: "3" }),
    );
    expect(nos()).toEqual(
      Array.from({ length: 5 }, (_, i) => `TX-FIX-0${21 + i}`),
    );

    await chooseOption(user, "페이지당 개수", "50개씩 보기");
    expect(nos()).toHaveLength(25);
    expect(nos()[0]).toBe("TX-FIX-001");

    vi.doUnmock("./settlement.data");
    vi.resetModules();
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리는 남기고 값만 스켈레톤", () => {
    renderPage("?preview=loading");

    expect(
      screen.getByRole("columnheader", { name: "계산서번호" }),
    ).toBeVisible();
    expect(screen.queryByText("TX-2609-0226")).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 값이 있어도 빈 상태", () => {
    renderPage("?preview=empty");

    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });

  it("refreshing — 이전 값을 흐리게 둔다", async () => {
    renderPage("?preview=refreshing");

    expect(screen.getByText("TX-2609-0226")).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
