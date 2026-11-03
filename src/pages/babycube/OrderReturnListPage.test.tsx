import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderReturnListPage } from "./OrderReturnListPage";
import { CLAIM_FLOW, ORDERS, STATUS_META } from "./OrderListPage.data";
import { RETURNS } from "./OrderReturnListPage.data";

/* -------------------------------------------------------------------------
 * S10 반품 목록 (BabyCube) — 목록형 · 기획 v0.4 대조
 *
 * 원본은 반품 목록을 주문 목록과 **같은 함수**(`ordersRmaScreen` → `ordersFlatRow`)로 그린다.
 * 그래서 주문 목록 테스트와 같은 동작을 보고, 다른 셋을 따로 못박는다 —
 *   ① 모집단 = `ORDERS` 의 반품 부분집합 ② 상태 선택지 = `CLAIM_FLOW.return`(유형 무관)
 *   ③ 주문번호 → `/orders-return/{처리단위}`
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

/** jsdom 의 `location` 은 테스트 사이에 초기화되지 않는다 — 매번 되돌린다 */
beforeEach(() => {
  window.history.replaceState(null, "", "/orders-return");
});

type User = ReturnType<typeof userEvent.setup>;

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/orders-return${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderReturnListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/orders-return"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** 셀 인덱스 — 컬럼 순서가 바뀌면 여기부터 깨지도록 이름을 붙여 둔다 */
const CELL = {
  no: 1,
  status: 2,
  orderNo: 3,
  type: 4,
  seller: 5,
  period: 6,
  paidAt: 8,
  productName: 15,
  rentBase: 16,
  rentDiscount: 17,
  rentPrice: 18,
} as const;

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");

const column = (index: number) =>
  bodyRows().map((row) => cellsOf(row)[index].textContent ?? "");

function rowOf(orderNo: string): HTMLElement {
  const row = bodyRows().find(
    (candidate) => cellsOf(candidate)[CELL.orderNo].textContent === orderNo,
  );
  if (!row) throw new Error(`행을 찾지 못했습니다: ${orderNo}`);
  return row;
}

/** 유형 카드 — 접근가능 이름은 `${라벨} ${건수}건` 이다 */
const typeCard = (label: string) =>
  within(screen.getByRole("group", { name: "유형별 건수" })).getByRole(
    "button",
    { name: new RegExp(`^${label} \\d+건$`) },
  );

/** 검색조건은 기본 펼침이다 — 「검색 열기」가 있을 때만 누른다 */
const openFilters = async (user: User) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

async function optionsOf(user: User, selectLabel: string) {
  await openFilters(user);
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  return within(await screen.findByRole("listbox"))
    .getAllByRole("option")
    .map((option) => option.textContent);
}

async function chooseOption(user: User, selectLabel: string, option: string) {
  if (selectLabel !== "페이지당 개수") await openFilters(user);
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

async function search(user: User, field: string, keyword: string) {
  await chooseOption(user, "검색 대상", field);
  await user.type(screen.getByPlaceholderText("검색어 입력"), keyword);
}

const sortButton = (label: string) =>
  screen
    .getByRole("columnheader", { name: new RegExp(label) })
    .querySelector("button")!;

const excel = () => screen.getByRole("button", { name: "엑셀 다운로드" });

/* 반품 렌트 4건(결제 최신순) — U-R25 · U-R21 · U-R26 · U-R27 */
const R25 = "20261009110216";
const R21 = "20261006130527";
const R26 = "20261005094051";
const R27 = "20260928162209";
/* 반품 판매 — 반려 U-S16 · 환불 처리중 U-S18 · 거부 U-S19 · 재반송 U-S20 */
const S15 = "20261010182237";
const S16 = "20261008131520";
const S18 = "20261004100512";
const S19 = "20261002153044";
const S20 = "20260929111111";

describe("OrderReturnListPage (BabyCube S10 반품 목록)", () => {
  describe("화면 골격 (v0.4)", () => {
    it("유형 카드는 렌트·판매 2장이고 렌트가 눌린 채 열린다 ([전체] 없음)", () => {
      renderPage();

      const cards = within(
        screen.getByRole("group", { name: "유형별 건수" }),
      ).getAllByRole("button");
      expect(cards).toHaveLength(2);
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 4건");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
      expect(typeCard("판매")).toHaveAccessibleName("판매 8건");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("No 는 조회 결과의 역순 순번이고 기본 순서는 결제 최신순이다", () => {
      renderPage();

      expect(column(CELL.no)).toEqual(["4", "3", "2", "1"]);
      expect(column(CELL.orderNo)).toEqual([R25, R21, R26, R27]);
    });

    it("이용 기간·결제 일시는 점 표기다", () => {
      renderPage();

      const cells = cellsOf(rowOf(R21));
      expect(cells[CELL.paidAt]).toHaveTextContent("2026.10.06 13:05");
      expect(cells[CELL.period]).toHaveTextContent("2026.10.10 ~ 2026.10.23");
    });

    it("주문번호를 누르면 그 처리단위의 반품 상세 경로로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: R21 }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-return/U-R21");

      await user.click(typeCard("판매"));
      await user.click(screen.getByRole("button", { name: S20 }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-return/U-S20");
    });

    /** 링크 글자만 눌려 「못 들어가는 곳인가」 헷갈리던 것 — 행 어디를 눌러도 간다(사용자 결정 2026-11-02) */
    it("행의 다른 칸을 눌러도 같은 상세로 간다 — 체크박스는 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf(R21);

      await user.click(within(row).getByRole("checkbox"));
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(within(row).getAllByRole("cell")[1]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-return/U-R21");
    });

    it("원본에 없는 도움말·행 클릭 미리보기·검색 「전체 항목」이 없다", async () => {
      const { user } = renderPage();

      expect(screen.queryByRole("button", { name: /도움말/ })).toBeNull();
      expect(screen.queryByText(/상태 흐름/)).toBeNull();

      await user.click(cellsOf(rowOf(R21))[CELL.productName]);
      expect(screen.queryByRole("dialog")).toBeNull();

      expect(await optionsOf(user, "검색 대상")).toEqual([
        "주문번호",
        "셀러명",
        "상품코드",
        "상품명",
        "구매자명",
        "구매자 ID",
        "연락처",
      ]);
    });
  });

  describe("모집단 = 주문 샘플의 반품 부분집합", () => {
    it("ORDERS 에서 반품만 거른 것이고 주문 목록과 같은 처리단위다 (U-R21 포함)", () => {
      expect(RETURNS).toEqual(
        ORDERS.filter((order) => order.claim?.type === "return"),
      );
      expect(RETURNS).toHaveLength(12); // 10단계 각 1 + 정산 사례 U-S30(완료) · U-S33(반려)
      expect(RETURNS.map((order) => order.id)).toContain("U-R21");
      expect(RETURNS.filter((order) => order.type === "rent")).toHaveLength(4);
    });
  });

  describe("상태 선택지 (원본 FLOW_STEPS['반품'])", () => {
    it("CLAIM_FLOW.return 과 값·순서까지 같고, 판매로 바꿔도 같다", async () => {
      const expected = [
        "상태 전체",
        ...CLAIM_FLOW.return.map((status) => STATUS_META[status].label),
      ];
      const { user } = renderPage();

      expect(await optionsOf(user, "상태")).toEqual(expected);
      await user.keyboard("{Escape}");

      await user.click(typeCard("판매"));
      expect(await optionsOf(user, "상태")).toEqual(expected);
    });

    it("상태를 고르면 그 상태만 남고 요약에 걸린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "반품 수거중");

      expect(column(CELL.orderNo)).toEqual([R21]);
      expect(column(CELL.status)).toEqual(["반품 수거중"]);
      expect(screen.getByText("상태 반품 수거중")).toBeVisible();
    });

    it("유형을 바꾸면 상태·정렬·선택·페이지가 함께 풀린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "반품 신청");
      await user.click(sortButton("결제 일시"));
      await user.click(screen.getAllByRole("checkbox", { name: /선택$/ })[1]);

      await user.click(typeCard("판매"));
      await user.click(typeCard("렌트"));

      expect(screen.getByRole("combobox", { name: "상태" })).toHaveTextContent(
        "상태 전체",
      );
      expect(
        screen.getByRole("columnheader", { name: /결제 일시/ }),
      ).toHaveAttribute("aria-sort", "none");
      expect(
        screen
          .getAllByRole("checkbox", { name: /선택$/ })
          .filter((box) => (box as HTMLInputElement).checked),
      ).toHaveLength(0);
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });
  });

  describe("검색조건", () => {
    it("펼친 채로 열리고, 접으면 걸린 조건이 없다고 요약한다", async () => {
      const { user } = renderPage();
      expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("판매자 셀렉트 하나로 고른다 (라디오 없음) — 셀러명은 반품 모집단에서", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(await optionsOf(user, "판매자")).toEqual([
        "판매자 전체",
        "본사",
        "셀러 전체",
        "리틀베이비",
        "리틀스텝",
        "맘스케어",
        "베베하우스",
        "베이비루",
        "아기별상사",
        "아이랑",
      ]);
      await user.keyboard("{Escape}");

      await chooseOption(user, "판매자", "리틀베이비");
      expect(column(CELL.seller)).toEqual(["리틀베이비"]);
      expect(typeCard("판매")).toHaveAccessibleName("판매 1건");
      expect(screen.getByText("셀러 리틀베이비")).toBeVisible();
    });

    it("검색 대상 기본은 주문번호다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("combobox", { name: "검색 대상" }),
      ).toHaveTextContent("주문번호");
      await user.type(screen.getByPlaceholderText("검색어 입력"), "202610");

      expect(column(CELL.orderNo)).toEqual([R25, R21, R26]);
    });

    it("검색은 대소문자를 가리지 않고, 카드 건수도 따라 준다", async () => {
      const { user } = renderPage();

      await search(user, "구매자 ID", "MINJAE.KOO");

      expect(column(CELL.orderNo)).toEqual([R27]);
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 1건");
      expect(typeCard("판매")).toHaveAccessibleName("판매 1건");
    });

    it("결과가 없으면 빈 상태가 뜨고, 초기화가 조건을 모두 되돌린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });
  });

  describe("선택과 엑셀", () => {
    it("고른 행이 없으면 조회 결과 전체가 대상이다", async () => {
      const { user } = renderPage();

      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 4건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("고른 행이 있으면 그것만 대상이다 — 머리 체크박스는 보이는 페이지 단위", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(excel());

      expect(
        await screen.findByText("선택한 4건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("조회 결과가 없으면 내려받을 것이 없다고 알린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      await user.click(excel());

      expect(
        await screen.findByText("다운로드할 데이터가 없습니다"),
      ).toBeVisible();
    });

    it("조건을 바꾸면 선택이 풀린다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: `${R25} 아기침대 슬립 베이직 선택`,
        }),
      );
      await chooseOption(user, "상태", "반품 신청");
      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 1건을 내려받았습니다"),
      ).toBeVisible();
    });
  });

  describe("정렬 (이용 기간 · 결제 일시)", () => {
    it("결제 일시를 누르면 오름 → 내림 → 해제 순으로 돈다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("결제 일시"));
      expect(column(CELL.orderNo)).toEqual([R27, R26, R21, R25]);
      /* No 는 정렬해도 역순 순번이다 */
      expect(column(CELL.no)[0]).toBe("4");

      await user.click(sortButton("결제 일시"));
      expect(column(CELL.orderNo)).toEqual([R25, R21, R26, R27]);

      await user.click(sortButton("결제 일시"));
      expect(
        screen.getByRole("columnheader", { name: /결제 일시/ }),
      ).toHaveAttribute("aria-sort", "none");
    });

    it("이용 기간 정렬은 시작일 순이다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("이용 기간"));

      expect(column(CELL.period)[0]).toBe("2026.10.02 ~ 2026.10.22");
    });
  });

  describe("페이지", () => {
    it("페이지당 10/20/50/100 을 고를 수 있고 바꾸면 1페이지부터 센다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
      expect(
        within(await screen.findByRole("listbox"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
      await user.keyboard("{Escape}");

      await chooseOption(user, "페이지당 개수", "20개씩 보기");
      expect(column(CELL.no)).toEqual(["4", "3", "2", "1"]);
    });
  });

  describe("URL 쿼리를 초기 필터로 읽는다", () => {
    it("쿼리가 없거나 모르는 유형이면 렌트다", () => {
      renderPage("?stat=전체");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
    });

    it("stat 은 유형, flow 는 상태다 — ?stat=판매&flow=재반송", () => {
      renderPage("?stat=판매&flow=재반송");
      expect(typeCard("판매")).toHaveAttribute("aria-pressed", "true");
      expect(column(CELL.orderNo)).toEqual([S20]);
    });

    /* 「환불 처리중」은 취소에도, 「재반송」은 교환에도 있다 — 이 화면의 반품 상태로 풀려야 한다 */
    it("겹치는 라벨(환불 처리중)은 이 화면의 반품 상태로 풀린다", () => {
      renderPage("?stat=판매&flow=환불 처리중");
      expect(column(CELL.orderNo)).toEqual([S18]);
      expect(screen.getByRole("combobox", { name: "상태" })).toHaveTextContent(
        "환불 처리중",
      );
    });

    it("반품에 없는 상태는 버린다 — ?flow=대여중", () => {
      renderPage("?flow=대여중");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("owner 는 판매자, sellerName 은 셀러다 — 모르는 셀러면 셀러 전체", () => {
      renderPage("?owner=셀러&sellerName=리틀스텝");
      expect(column(CELL.orderNo)).toEqual([R27]);
      cleanup();

      renderPage("?owner=셀러&sellerName=없는셀러");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다 (본사 반품은 판매 U-S15 하나)", () => {
      renderPage("?owner=본사&sellerName=리틀스텝");
      expect(
        screen.getByRole("combobox", { name: "판매자" }),
      ).toHaveTextContent("본사");
      /* 렌트에는 본사 상품이 없다 */
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      cleanup();

      renderPage("?stat=판매&owner=본사&sellerName=리틀스텝");
      expect(column(CELL.orderNo)).toEqual([S15]);
      expect(column(CELL.seller)).toEqual(["본사"]);
    });

    it("q 는 주문번호 검색어다", () => {
      renderPage(`?q=${R26}`);
      expect(column(CELL.orderNo)).toEqual([R26]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다 — 형식이 틀리면 무시", () => {
      renderPage("?paidAt_from=2026-10-05&paidAt_to=2026-10-06");
      expect(column(CELL.orderNo)).toEqual([R21, R26]);
      cleanup();

      renderPage("?paidAt_from=2026/10/05");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });
  });

  describe("의미 — 상태 색 · 렌트 금액 · 고정 열", () => {
    it("반려·거부·재반송은 critical — 비정상 종결이다", () => {
      renderPage("?stat=판매");
      const toneOf = (orderNo: string, label: string) =>
        classList(within(rowOf(orderNo)).getByText(label));
      expect(toneOf(S16, "반품 반려")).toContain("text-text-critical");
      expect(toneOf(S19, "반품 거부")).toContain("text-text-critical");
      expect(toneOf(S20, "재반송")).toContain("text-text-critical");
    });

    it("렌트 금액은 원/일 단가 — 렌트가 = 원가 − 할인", () => {
      renderPage();

      /* U-R26 1,900 − 200 = 1,700원/일 */
      const cells = cellsOf(rowOf(R26));
      expect(cells[CELL.rentBase]).toHaveTextContent("1,900원");
      expect(cells[CELL.rentDiscount]).toHaveTextContent("200원");
      expect(cells[CELL.rentPrice]).toHaveTextContent("1,700원/일");
    });

    it("판매 건은 렌트 금액 세 열과 이용 기간이 모두 — 다 (원본 hasRent)", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      for (const row of bodyRows()) {
        const cells = cellsOf(row);
        for (const index of [
          CELL.period,
          CELL.rentBase,
          CELL.rentDiscount,
          CELL.rentPrice,
        ]) {
          expect(cells[index]).toHaveTextContent("—");
        }
      }
    });

    it("표는 26열, 앞 7열이 sticky 이고 오프셋이 폭의 누적합(760)이다", () => {
      renderPage();

      const toPx = (cls: string, prefix: string) =>
        Number(
          cls
            .split(/\s+/)
            .find((name) => name.startsWith(prefix))
            ?.slice(prefix.length),
        ) * 4;
      const cols = [
        ...screen.getByRole("table").querySelectorAll("colgroup > col"),
      ].map((col) => toPx(col.className, "w-"));
      const heads = screen.getAllByRole("columnheader");
      expect(heads).toHaveLength(26);
      expect(cols).toHaveLength(26);

      let offset = 0;
      heads.slice(0, 7).forEach((head, index) => {
        expect(classList(head)).toContain("sticky");
        expect(toPx(head.className, "left-")).toBe(offset);
        offset += cols[index];
      });
      expect(offset).toBe(760);
      expect(classList(heads[7])).not.toContain("sticky");
    });
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리 글자는 남기고 값만 스켈레톤이다", () => {
    renderPage("?preview=loading");

    expect(
      screen.getByRole("columnheader", { name: "주문번호" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: R25 })).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 값이 있어도 빈 상태를 보여준다", () => {
    renderPage("?preview=empty");

    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });

  it("refreshing — 스켈레톤으로 되돌리지 않고 이전 값을 흐리게 둔다", async () => {
    renderPage("?preview=refreshing");

    expect(screen.getByRole("button", { name: R25 })).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
