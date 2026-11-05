import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { RentDepositListPage } from "./RentDepositListPage";
import { ALL_DEPOSITS, DEPOSITS } from "./RentDepositListPage.data";
import { depositStatusOf } from "./OrderDetailPage.data";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S13 보증금 내역 (BabyCube) — 목록형 · 기획 v0.4 `SCREENS.rentDeposit` 대조
 *
 * 렌더 여부가 아니라 **동작**과 **사례표 숫자**를 본다:
 * 목록 범위(반납 이후 3단계) · 요약 4값(보증금 있는 렌트 전체 — 원본 그대로) · 셀 표기 ·
 * 상태/출처/검색 필터와 요약줄 · 빈 상태와 초기화 · 선택과 엑셀 3문구 · 행 클릭 → 상세 ·
 * 체크박스는 이동하지 않음 · 페이지 크기 · `?preview=`.
 * 기대 숫자는 사례표(scratchpad `settle-cases.md`)와 손계산 — 함수를 다시 불러 비교하지 않는다.
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

beforeEach(() => {
  window.history.replaceState(null, "", "/rent-deposit");
});

type User = ReturnType<typeof userEvent.setup>;

function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/rent-deposit${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <RentDepositListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/rent-deposit"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** 셀 인덱스 — 컬럼 순서가 바뀌면 여기부터 깨지도록 이름을 붙여 둔다 */
const CELL = {
  orderNo: 1,
  member: 2,
  source: 3,
  seller: 4,
  product: 5,
  deposit: 6,
  deduction: 7,
  refund: 8,
  orderStatus: 9,
  depositStatus: 10,
  changedAt: 11,
} as const;

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");
const column = (index: number) =>
  bodyRows().map((row) => cellsOf(row)[index].textContent ?? "");

/** 처리단위 → 주문번호 (표에는 주문번호만 보인다) */
const orderNoOf = (id: string) => ORDERS.find((o) => o.id === id)!.orderNo;

function rowOf(id: string): HTMLElement {
  const order = ORDERS.find((o) => o.id === id)!;
  const row = bodyRows().find(
    (candidate) =>
      cellsOf(candidate)[CELL.orderNo].textContent === order.orderNo &&
      (cellsOf(candidate)[CELL.product].textContent ?? "").startsWith(
        order.productName,
      ),
  );
  if (!row) throw new Error(`행을 찾지 못했습니다: ${id}`);
  return row;
}

const cell = (id: string, index: number) =>
  cellsOf(rowOf(id))[index].textContent;

async function chooseOption(user: User, selectLabel: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

async function search(user: User, field: string, keyword: string) {
  await chooseOption(user, "검색 대상", field);
  await user.type(screen.getByPlaceholderText("검색어 입력"), keyword);
}

const excel = () => screen.getByRole("button", { name: "엑셀 다운로드" });

/** 목록 범위 9건 — 반납 이후 3단계(검수중 1 · 검수완료 1 · 반납완료 7) */
const IN_SCOPE = [
  "U-R16",
  "U-R17",
  "U-R18",
  "U-R19",
  "U-R28",
  "U-R29",
  "U-R30",
  "U-R31",
  "U-R32",
];

describe("RentDepositListPage (BabyCube S13 보증금 내역)", () => {
  describe("목록 범위 — 원본 그대로 반납 이후 3단계", () => {
    it("검수중·검수완료·반납완료 렌트 9건만 보인다", () => {
      renderPage();

      expect(screen.getByText("목록 (총 9건)")).toBeVisible();
      expect(new Set(column(CELL.orderNo))).toEqual(
        new Set(IN_SCOPE.map(orderNoOf)),
      );
      expect(new Set(column(CELL.orderStatus))).toEqual(
        new Set(["검수중", "검수완료", "반납완료"]),
      );
    });

    it("대여중·연체중·클레임 건은 보증금이 있어도 목록에 없다", () => {
      renderPage();
      const shown = column(CELL.orderNo);
      /* 연체중 U-R13 · 대여중 U-R09 · 취소 완료 U-R24 · 반품 완료 U-R27 */
      for (const id of ["U-R13", "U-R09", "U-R24", "U-R27"]) {
        expect(shown).not.toContain(orderNoOf(id));
      }
    });
  });

  describe("요약 4값 — 보증금 있는 렌트 전체(원본 그대로, 필터와 무관)", () => {
    const tiles = () =>
      Array.from(
        screen.getByRole("region", { name: "보증금 요약" }).children,
      ).map((tile) => tile.textContent ?? "");

    it("점유중 1,870,000 · 환급 대기 160,000 · 반환 완료 785,000 · 차감 수익 65,000", () => {
      renderPage();
      const [hold, pending, returned, deducted] = tiles();

      /* 점유중 21건의 보증금 합 — 목록에 보이는 점유중은 U-R16 80,000원 하나뿐(기획 확인 필요) */
      expect(hold).toContain("점유중 보증금 총액");
      expect(hold).toContain("1,870,000");
      /* 환급대기 U-R17 70,000 + 취소 환불 처리중 U-R23 90,000 */
      /* 부록 A C14 · C15 — 라벨 괄호 설명(caption) 없이 라벨·값만 */
      expect(pending).toBe("환급 대기액160,000원");
      /* 종결: R18 70,000 · R19 150,000 · R28 80,000 · R29 160,000 · R30 55,000 · R31 0 · R32 50,000
         + 목록 밖 R24 90,000 · R27 130,000 */
      expect(returned).toContain("785,000");
      /* 차감: R30 25,000 + R31 40,000 */
      expect(deducted).toBe("차감 수익65,000원");
    });

    it("검색으로 목록을 좁혀도 요약은 그대로다", async () => {
      const { user } = renderPage();
      const before = tiles();

      await search(user, "회원명", "황보라");

      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
      expect(tiles()).toEqual(before);
    });
  });

  describe("셀 표기 — 사례표 숫자", () => {
    it("일부환급 U-R30: 보증금 80,000 · 차감 - 25,000 · 반환 55,000", () => {
      renderPage();

      expect(cell("U-R30", CELL.deposit)).toBe("80,000원");
      expect(cell("U-R30", CELL.deduction)).toBe("−25,000원");
      expect(cell("U-R30", CELL.refund)).toBe("55,000원");
      expect(cell("U-R30", CELL.depositStatus)).toBe("환급완료(일부환급)");
      expect(cell("U-R30", CELL.changedAt)).toBe("2026.09.19");
    });

    it("전액차감 U-R31: 차감 = 보증금 40,000 · 반환 0원", () => {
      renderPage();

      expect(cell("U-R31", CELL.deduction)).toBe("−40,000원");
      expect(cell("U-R31", CELL.refund)).toBe("0원");
      expect(cell("U-R31", CELL.depositStatus)).toBe("환급완료(전액차감)");
    });

    it("본사 렌트 U-R32: 구분·셀러명 모두 본사", () => {
      renderPage();

      expect(cell("U-R32", CELL.source)).toBe("본사");
      expect(cell("U-R32", CELL.seller)).toBe("본사");
      expect(cell("U-R30", CELL.source)).toBe("셀러");
      expect(cell("U-R30", CELL.seller)).toBe("아이랑");
    });

    it("점유중 U-R16 은 상태 변경일이 `-` · 차감 없으면 `-`", () => {
      renderPage();

      expect(cell("U-R16", CELL.depositStatus)).toBe("점유중");
      expect(cell("U-R16", CELL.changedAt)).toBe("-");
      expect(cell("U-R16", CELL.deduction)).toBe("-");
      expect(cell("U-R17", CELL.depositStatus)).toBe("환급대기");
    });

    it("안심케어 가입 건(U-R18·U-R19·U-R28·U-R29)만 상품 옆 표식이 있다", () => {
      renderPage();
      const marked = IN_SCOPE.filter((id) =>
        (cell(id, CELL.product) ?? "").endsWith("안심케어"),
      );

      expect(marked.sort()).toEqual(["U-R18", "U-R19", "U-R28", "U-R29"]);
    });

    it("주문 상세의 보증금 상태와 같은 처리단위에서 같은 값이다", () => {
      for (const row of ALL_DEPOSITS) {
        expect(row.status).toBe(depositStatusOf(row.order));
      }
      expect(DEPOSITS).toHaveLength(9);
    });

    it("No 열·정렬 머리가 없다(원본 그대로) — 열은 체크박스 포함 12개", () => {
      renderPage();

      expect(screen.getAllByRole("columnheader")).toHaveLength(12);
      expect(screen.queryByRole("columnheader", { name: "No" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: /정렬/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("검색조건 — 기본 펼침 · 원본 순서", () => {
    it("펼친 채로 열리고 조건이 없으면 요약이 「조건 없음 (전체)」", () => {
      renderPage();

      expect(
        screen.getByRole("combobox", { name: "보증금 상태" }),
      ).toBeVisible();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("보증금 상태 전액환급 → 5건, 요약줄에 걸린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "보증금 상태", "전액환급");

      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
      expect(new Set(column(CELL.depositStatus))).toEqual(
        new Set(["환급완료(전액환급)"]),
      );
      expect(screen.getByText("보증금 상태 전액환급")).toBeVisible();
    });

    /* 화면 글자는 「본사 / 셀러」(판정 Q10) — 값 hq·seller 는 그대로 */
    it("출처 본사 → 본사 렌트 1건, 셀러 → 8건", async () => {
      const { user } = renderPage();

      await chooseOption(user, "출처", "본사");
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
      expect(column(CELL.orderNo)).toEqual([orderNoOf("U-R32")]);

      await chooseOption(user, "출처", "셀러");
      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
    });

    it("회원명 검색 — 같은 회원의 목록 밖 렌트(U-R09·U-R22)는 걸리지 않는다", async () => {
      const { user } = renderPage();

      await search(user, "회원명", "임채원");

      expect(column(CELL.orderNo)).toEqual([orderNoOf("U-R28")]);
      expect(screen.getByText("회원명 «임채원»")).toBeVisible();
    });

    it("주문번호 부분 검색", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "202608");

      /* 8월 결제 — U-R28 · U-R29 · U-R30 · U-R31 */
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("결과가 없으면 빈 상태 — [필터 초기화]로 9건이 돌아온다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");

      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(
        screen.getByText(
          "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
        ),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(screen.getByText("목록 (총 9건)")).toBeVisible();
    });
  });

  describe("선택과 엑셀 — 알림만", () => {
    it("고른 행이 없으면 조회 결과 전체", async () => {
      const { user } = renderPage();

      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 9건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("고른 행이 있으면 그것만", async () => {
      const { user } = renderPage();

      await user.click(within(rowOf("U-R30")).getByRole("checkbox"));
      await user.click(within(rowOf("U-R31")).getByRole("checkbox"));
      await user.click(excel());

      expect(
        await screen.findByText("선택한 2건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("조건을 바꾸면 선택이 풀린다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await chooseOption(user, "출처", "본사");
      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 1건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("0건이면 내려받을 것이 없다고 알린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      await user.click(excel());

      expect(
        await screen.findByText("다운로드할 데이터가 없습니다"),
      ).toBeVisible();
    });
  });

  describe("상세 이동", () => {
    it("행 어디를 눌러도 그 처리단위의 상세로 — 체크박스는 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf("U-R30");

      await user.click(within(row).getByRole("checkbox"));
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(cellsOf(row)[CELL.member]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/rent-deposit/U-R30");
    });

    it("주문번호 글자도 상세로 간다(원본 `idLink`)", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        screen.getByRole("button", { name: orderNoOf("U-R31") }),
      );

      expect(onNavSelect).toHaveBeenLastCalledWith("/rent-deposit/U-R31");
    });
  });

  it("페이지 크기 10/20/50/100 — 기본 10", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    const listbox = await screen.findByRole("listbox");

    expect(
      within(listbox)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리는 남기고 값만 스켈레톤", () => {
    renderPage("?preview=loading");

    expect(
      screen.getByRole("columnheader", { name: "주문번호" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: orderNoOf("U-R30") }),
    ).toBeNull();
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

    expect(
      screen.getByRole("button", { name: orderNoOf("U-R30") }),
    ).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
