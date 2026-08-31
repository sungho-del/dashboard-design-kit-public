import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SettlementStatementPage } from "./SettlementStatementPage";
import {
  deduct,
  NO_AMOUNT,
  payoutOf,
  STATEMENTS,
  won,
} from "./SettlementStatementPage.data";

/**
 * S15 정산 내역/명세서 — **동작** 검증.
 *
 * 두 축 필터(정산 대상 · 상태) · 검색 조건 2종 · 빈 상태 · 페이지네이션 ·
 * **지급액 = 매출 − 차감** · 정산월 표기 · 표 정렬을 확인한다.
 *
 * ## ⛔ 다른 화면과 맞물린 금액
 * `ST-202606-0002` 의 지급액은 S12 `2026-06-SEL0142` 와 **같은 돈**이다.
 * 여기만 고치면 두 화면이 서로 다른 금액을 말하므로 테스트로 못박는다.
 *
 * ## ⚠️ "되살아나지 않는지"도 함께 본다
 * 원본 대조로 **도움말 툴팁 · 명세서 다운로드 토스트**를 걷어냈고,
 * **상태 필터 · 검색 조건 선택 · 정산 대상 배지 · 정산월 표기**를 되살렸다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Select·SegmentedControl 이 쓰는 관측기를 no-op 으로 채운다.
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
      <SettlementStatementPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/settle-statement"
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

/** 남아 있는 명세서번호(1번째 컬럼) */
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

describe("SettlementStatementPage (BabyCube S15 정산 내역/명세서)", () => {
  describe("표 (원본 8열)", () => {
    it("컬럼 이름과 순서가 원본 그대로다", () => {
      renderPage();

      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual([
        "명세서번호",
        "정산 대상",
        "정산월",
        "매출",
        "차감(수수료·PG·취소)",
        "지급액",
        "상태",
        "명세서",
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

      const BADGE_COLUMNS = [6];
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

    it("정산 대상은 배지 + 이름을 한 칸에 넣는다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("자체");
      expect(cells[1]).toHaveTextContent("본사 직영");
    });

    it("정산월은 원본 표기 `2026.07` 이다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[2].textContent).toBe("2026.07");
    });
  });

  describe("금액 (파생값 · 화면 간 계약)", () => {
    it("지급액 = 매출 − 차감", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[3]).toHaveTextContent("412,850,000원");
      expect(cells[4]).toHaveTextContent("-61,927,000원");
      expect(cells[5].textContent).toBe(won(payoutOf(STATEMENTS[0])));
    });

    it("⛔ 베베마켓 6월 명세서의 지급액은 S12 와 같은 돈이다", () => {
      const june = STATEMENTS.find((row) => row.id === "ST-202606-0002")!;

      // S12 `2026-06-SEL0142` 의 지급액과 같아야 한다.
      // 여섯 조각 → 두 조각으로 접는 규칙이 어긋나면 여기서 걸린다
      expect(payoutOf(june)).toBe(206_268_000);
      expect(june.revenue).toBe(262_400_000 - 6_290_000);
      expect(june.deduction).toBe(
        35_424_000 + 5_898_000 + 10_140_000 - 1_620_000,
      );
    });

    it("⛔ 아이누리 7월 명세서도 S12 와 같은 돈이다", () => {
      const row = STATEMENTS.find((item) => item.id === "ST-202607-0021")!;
      expect(payoutOf(row)).toBe(50_613_000);
    });

    it("차감이 없으면 0원이 아니라 '-' 다 (원본 표기)", () => {
      expect(deduct(0)).toBe(NO_AMOUNT);
    });
  });

  describe("두 축 필터 (원본 `chips`: 정산 대상 · 상태)", () => {
    it("정산 대상으로 장부를 가른다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "자체" }));

      expect(visibleNos()).toEqual(["ST-202607-0001", "ST-202608-0003"]);
    });

    it("상태 필터가 있어 '아직 안 끝난 명세'만 볼 수 있다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "이의제기" }));

      expect(visibleNos()).toEqual(["ST-202607-0033"]);
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
    });

    it("두 축은 함께 걸린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "입점사" }));
      await user.click(screen.getByRole("radio", { name: "지급완료" }));

      expect(visibleNos()).toEqual(["ST-202606-0002", "ST-202606-0018"]);
    });
  });

  describe("검색 (조건 2종)", () => {
    it("기본 조건은 명세서번호다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "202606");

      expect(visibleNos()).toEqual(["ST-202606-0002", "ST-202606-0018"]);
    });

    it("조건을 정산 대상으로 바꾸면 이름으로 찾는다", async () => {
      const { user } = renderPage();

      await pickOption(user, /검색조건/, "정산 대상");
      await user.type(searchBox(), "코코베이비");

      expect(visibleNos()).toEqual(["ST-202607-0014"]);
    });

    it("조건이 명세서번호일 때 이름으로는 찾히지 않는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "코코베이비");

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

      await user.click(screen.getByRole("radio", { name: "자체" }));
      await user.type(searchBox(), "없는번호");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(
        screen.getByText(`목록 (총 ${STATEMENTS.length}건)`),
      ).toBeVisible();
      expect(screen.getAllByRole("radio", { name: "전체" })[0]).toBeChecked();
      expect(searchBox()).toHaveValue("");
    });

    it("2페이지로 넘어가면 나머지가 보인다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(5);
      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe("명세서 열 → 미리보기", () => {
    it("'명세서'는 파일을 내려받지 않는다 — 원본은 화면으로 가는 링크다", async () => {
      const { user } = renderPage();

      await user.click(screen.getAllByRole("button", { name: "명세서" })[0]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "명세서 미리보기" }),
      ).toBeVisible();
      // 걷어낸 토스트가 되살아나지 않았는지 본다
      expect(
        screen.queryByText(/명세서를 내려받았습니다/),
      ).not.toBeInTheDocument();
      // 모달 푸터의 다운로드 버튼도 없다
      expect(sheet.querySelector('[data-slot="footer"]')).toBeNull();
    });

    it("행을 열면 명세서 4항목이 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[2]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["정산 대상", "정산월", "지급액", "확정 일시"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "입점사 · 베베마켓",
        "2026.06",
        "206,268,000원",
        "2026-07-10 10:00",
      ]);
    });
  });

  describe("엑셀 다운로드 (원본 `toolsLeft`)", () => {
    it("지금 조회된 건수로 파일명을 만든다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "자체" }));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("정산내역명세서_2건.csv 를 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
