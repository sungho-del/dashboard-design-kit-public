import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderCancelListPage } from "./OrderCancelListPage";
import { CANCEL_ORDERS } from "./OrderCancelListPage.data";
import { CLAIM_FLOW, ORDERS, STATUS_META } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S09 취소 목록 (BabyCube) — 목록형 · 기획 v0.4 대조
 *
 * 원본은 이 화면을 **주문 목록과 같은 함수**(`ordersRmaScreen` → `ordersFlatRow` …)로 그린다.
 * 그래서 주문 목록 테스트와 같은 동작을 보고, 다른 셋을 못박는다 —
 *   ① 모집단 = `ORDERS` 의 취소 클레임 부분집합
 *   ② 상태 선택지 = `CLAIM_FLOW.cancel` (원본 `FLOW_STEPS['취소']`)
 *   ③ 주문번호 링크 = `/orders-cancel/{처리단위}`
 * 원본에 없어 걷어낸 것(도움말·미리보기 모달·「전체 항목」·[전체] 카드)이 없는지도 본다.
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
  window.history.replaceState(null, "", "/orders-cancel");
});

type User = ReturnType<typeof userEvent.setup>;

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

/** @param search 이 화면을 여는 쿼리스트링 (`"?stat=판매&flow=취소 요청"`) */
function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/orders-cancel${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderCancelListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/orders-cancel"
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

/** 검색조건은 기본 펼침이다 — 닫혀 있을 때만 연다 */
const openFilters = async (user: User) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

async function listOptions(user: User, selectLabel: string) {
  await openFilters(user);
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const options = within(await screen.findByRole("listbox"))
    .getAllByRole("option")
    .map((option) => option.textContent);
  await user.keyboard("{Escape}");
  return options;
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

/* 취소 모집단 — 결제 최신순. 렌트 U-R20·U-R23·U-R24 · 판매 U-S11·U-S13·U-S14 */
const R20 = "20261017221014";
const R23 = "20261016101230";
const R24 = "20261013150541";
const S11 = "20261017081433";
const S13 = "20261016124418";

describe("OrderCancelListPage (BabyCube S09 취소 목록)", () => {
  describe("모집단 = 주문 샘플의 취소 클레임", () => {
    it("ORDERS 중 claim.type 이 cancel 인 처리단위 그대로다 (자체 샘플 없음)", () => {
      expect(CANCEL_ORDERS).toEqual(
        ORDERS.filter((order) => order.claim?.type === "cancel"),
      );
      expect(CANCEL_ORDERS.map((order) => order.id).sort()).toEqual([
        "U-R20",
        "U-R23",
        "U-R24",
        "U-S11",
        "U-S13",
        "U-S14",
      ]);
      /* 같은 객체 — 주문 목록과 값이 어긋날 수 없다 */
      CANCEL_ORDERS.forEach((order) => expect(ORDERS).toContain(order));
    });
  });

  describe("화면 골격 (v0.4)", () => {
    it("제목은 원본 메뉴 이름 그대로다", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "취소 목록" }),
      ).toBeVisible();
    });

    it("유형 카드는 렌트·판매 2장이고 렌트가 눌린 채 열린다 ([전체] 없음)", () => {
      renderPage();

      const cards = within(
        screen.getByRole("group", { name: "유형별 건수" }),
      ).getAllByRole("button");
      expect(cards).toHaveLength(2);
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 3건");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
      expect(typeCard("판매")).toHaveAccessibleName("판매 3건");
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    });

    /** 디자인 §3 #8 · 개발 1657c2d — 열을 늘리지 않고 상태 칸에 보조 배지 */
    it("셀러 미준비 자동취소 건만 상태 아래에 「셀러 미준비 자동취소」 배지가 붙는다", async () => {
      const { user } = renderPage();

      expect(screen.queryByText("셀러 미준비 자동취소")).toBeNull();
      await user.click(typeCard("판매"));

      const tagged = bodyRows().filter((row) =>
        within(cellsOf(row)[CELL.status]).queryByText("셀러 미준비 자동취소"),
      );
      expect(tagged).toHaveLength(1);
      expect(
        within(cellsOf(tagged[0])[CELL.status]).getByText("취소 완료"),
      ).toBeVisible();
      expect(screen.getAllByText("셀러 미준비 자동취소")).toHaveLength(1);
    });

    it("첫 페이지는 결제 최신순이고 No 는 조회 결과의 역순 순번이다", () => {
      renderPage();

      expect(bodyRows()).toHaveLength(3);
      expect(column(CELL.no)).toEqual(["3", "2", "1"]);
      expect(column(CELL.orderNo)).toEqual([R20, R23, R24]);
    });

    it("결제 일시·이용 기간은 점 표기다", () => {
      renderPage();

      const cells = cellsOf(rowOf(R20));
      expect(cells[CELL.paidAt]).toHaveTextContent("2026.10.17 22:10");
      expect(cells[CELL.period]).toHaveTextContent("2026.10.21 ~ 2026.11.03");
    });

    it("원본에 없는 도움말·행 클릭 미리보기가 없다", async () => {
      const { user } = renderPage();

      expect(screen.queryByRole("button", { name: /도움말/ })).toBeNull();
      await user.click(cellsOf(rowOf(R20))[CELL.productName]);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("주문번호를 누르면 그 처리단위의 취소 상세 경로로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: R20 }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-cancel/U-R20");

      await user.click(typeCard("판매"));
      await user.click(screen.getByRole("button", { name: S11 }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-cancel/U-S11");
    });

    /** 링크 글자만 눌려 「못 들어가는 곳인가」 헷갈리던 것 — 행 어디를 눌러도 간다(사용자 결정 2026-11-02) */
    it("행의 다른 칸을 눌러도 같은 상세로 간다 — 체크박스는 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf(R20);

      await user.click(within(row).getByRole("checkbox"));
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(within(row).getAllByRole("cell")[1]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-cancel/U-R20");
    });
  });

  describe("유형 카드 = 유형 필터", () => {
    it("판매로 바꾸면 판매 건만 남는다", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      expect(new Set(column(CELL.type))).toEqual(new Set(["판매"]));
      expect(column(CELL.orderNo)[0]).toBe(S11);
    });

    it("카드 건수는 다른 조건을 따라 준다", async () => {
      const { user } = renderPage();

      await search(user, "구매자명", "마준서");

      expect(typeCard("렌트")).toHaveAccessibleName("렌트 1건");
      expect(typeCard("판매")).toHaveAccessibleName("판매 0건");
    });

    it("유형을 바꾸면 상태·정렬·선택·페이지가 함께 풀린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "취소 요청");
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
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    });
  });

  describe("검색조건 (펼침 + 요약)", () => {
    it("펼친 채로 열리고, 접으면 걸린 조건이 없다고 요약한다", async () => {
      const { user } = renderPage();
      expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("상태 선택지는 원본 FLOW_STEPS['취소'] 와 값·순서까지 같다", async () => {
      const { user } = renderPage();

      const options = await listOptions(user, "상태");
      expect(options).toEqual([
        "상태 전체",
        ...CLAIM_FLOW.cancel.map((status) => STATUS_META[status].label),
      ]);
      expect(options).toEqual([
        "상태 전체",
        "취소 요청",
        "환불 처리중",
        "취소 완료",
      ]);
    });

    it("상태를 고르면 그 상태만 남고 요약에 걸린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "취소 완료");

      expect(column(CELL.orderNo)).toEqual([R24]);
      expect(column(CELL.status)).toEqual(["취소 완료"]);
      expect(screen.getByText("상태 취소 완료")).toBeVisible();
    });

    it("판매자 셀렉트 하나 — 셀러명은 이 화면 모집단에서 뽑는다 (라디오 없음)", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(await listOptions(user, "판매자")).toEqual([
        "판매자 전체",
        "본사",
        "셀러 전체",
        "리틀스텝",
        "맘스케어",
        "아기별상사",
        "코지베이비",
      ]);

      await chooseOption(user, "판매자", "코지베이비");
      expect(column(CELL.seller)).toEqual(["코지베이비"]);
      expect(typeCard("판매")).toHaveAccessibleName("판매 1건");
      expect(screen.getByText("셀러 코지베이비")).toBeVisible();

      /* 본사 취소 건은 판매 U-S13 하나 — 렌트에는 본사 상품이 없다 */
      await chooseOption(user, "판매자", "본사");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      await user.click(typeCard("판매"));
      expect(column(CELL.orderNo)).toEqual([S13]);
      expect(column(CELL.seller)).toEqual(["본사"]);
    });

    it("검색 대상은 원본 7종, 기본 주문번호다 ('전체 항목' 없음)", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("combobox", { name: "검색 대상" }),
      ).toHaveTextContent("주문번호");
      expect(await listOptions(user, "검색 대상")).toEqual([
        "주문번호",
        "셀러명",
        "상품코드",
        "상품명",
        "구매자명",
        "구매자 ID",
        "연락처",
      ]);

      await user.type(screen.getByPlaceholderText("검색어 입력"), "20261016");
      expect(column(CELL.orderNo)).toEqual([R23]);
    });

    it("검색은 대소문자를 가리지 않는다 (원본 toLowerCase)", async () => {
      const { user } = renderPage();

      await search(user, "구매자 ID", "JUNSEO.MA");

      expect(column(CELL.orderNo)).toEqual([R20]);
    });

    it("결과가 없으면 빈 상태가 뜨고, 초기화가 조건을 모두 되돌린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });
  });

  describe("선택과 엑셀", () => {
    it("고른 행이 없으면 조회 결과 전체가 대상이다", async () => {
      const { user } = renderPage();

      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 3건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("고른 행이 있으면 그것만 대상이다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: `${R20} 롤매트 소프트 220 선택`,
        }),
      );
      await user.click(excel());

      expect(
        await screen.findByText("선택한 1건을 내려받았습니다"),
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

    it("조건을 바꾸면 선택이 풀린다 — 결과 밖의 행이 엑셀에 섞이지 않게", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await chooseOption(user, "상태", "취소 완료");
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
      expect(column(CELL.orderNo)).toEqual([R24, R23, R20]);
      /* No 는 정렬해도 역순 순번이다 */
      expect(column(CELL.no)[0]).toBe("3");

      await user.click(sortButton("결제 일시"));
      expect(column(CELL.orderNo)).toEqual([R20, R23, R24]);

      await user.click(sortButton("결제 일시"));
      expect(
        screen.getByRole("columnheader", { name: /결제 일시/ }),
      ).toHaveAttribute("aria-sort", "none");
    });

    it("이용 기간 정렬은 시작일 순이다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("이용 기간"));

      expect(column(CELL.period)[0]).toBe("2026.10.17 ~ 2026.10.23");
    });
  });

  describe("페이지", () => {
    it("페이지당 개수는 10/20/50/100 이고 바꿀 수 있다", async () => {
      const { user } = renderPage();

      expect(await listOptions(user, "페이지당 개수")).toEqual([
        "10개씩 보기",
        "20개씩 보기",
        "50개씩 보기",
        "100개씩 보기",
      ]);
      await chooseOption(user, "페이지당 개수", "20개씩 보기");
      expect(
        screen.getByRole("combobox", { name: "페이지당 개수" }),
      ).toHaveTextContent("20개씩 보기");
      expect(bodyRows()).toHaveLength(3);
      /* 원본에 없는 「n / m 페이지」 문구가 없다 */
      expect(screen.queryByText(/\d+ \/ \d+ 페이지/)).toBeNull();
    });
  });

  describe("URL 쿼리를 초기 필터로 읽는다", () => {
    it("쿼리가 없거나 모르는 유형이면 렌트다", () => {
      renderPage("?stat=전체");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
    });

    it("stat 은 유형이다 — ?stat=판매", () => {
      renderPage("?stat=판매");
      expect(typeCard("판매")).toHaveAttribute("aria-pressed", "true");
      expect(column(CELL.orderNo)[0]).toBe(S11);
    });

    it("flow 는 상태다 — ?flow=취소 완료", () => {
      renderPage("?flow=취소 완료");
      expect(column(CELL.orderNo)).toEqual([R24]);
    });

    /* 「환불 처리중」은 반품에도 있다 — 이 화면의 선택지 안에서만 풀어야 취소 키가 된다 */
    it("겹치는 라벨 「환불 처리중」은 취소 상태로 풀린다", () => {
      renderPage("?stat=판매&flow=환불 처리중");
      expect(column(CELL.orderNo)).toEqual([S13]);
      expect(screen.getByRole("combobox", { name: "상태" })).toHaveTextContent(
        "환불 처리중",
      );
    });

    it("이 화면에 없는 상태(재반송·대여중)는 버린다", () => {
      for (const flow of ["재반송", "대여중"]) {
        renderPage(`?flow=${flow}`);
        expect(screen.getByText("목록 (총 3건)")).toBeVisible();
        cleanup();
      }
    });

    it("owner 는 판매자, sellerName 은 셀러다", () => {
      renderPage("?owner=셀러&sellerName=코지베이비");
      expect(column(CELL.orderNo)).toEqual([R24]);
    });

    it("모집단에 없는 셀러명이면 셀러 전체로 떨어진다", () => {
      renderPage("?owner=셀러&sellerName=리틀베이비");
      expect(
        screen.getByRole("combobox", { name: "판매자" }),
      ).toHaveTextContent("셀러 전체");
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    });

    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다", () => {
      renderPage("?owner=본사&sellerName=코지베이비");
      expect(
        screen.getByRole("combobox", { name: "판매자" }),
      ).toHaveTextContent("본사");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });

    it("q 는 주문번호 검색어다", () => {
      renderPage(`?q=${R23}`);
      expect(column(CELL.orderNo)).toEqual([R23]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다 (양끝 포함, 형식이 틀리면 무시)", () => {
      renderPage("?paidAt_from=2026-10-16&paidAt_to=2026-10-17");
      expect(column(CELL.orderNo)).toEqual([R20, R23]);
      cleanup();

      renderPage("?paidAt_from=2026/10/16&paidAt_to=2026-10-17");
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    });
  });

  describe("셀의 의미", () => {
    const toneOf = (orderNo: string, label: string) =>
      classList(within(rowOf(orderNo)).getByText(label));

    it("상태 배지 — 취소 요청 warning · 환불 처리중 success · 취소 완료 default", () => {
      renderPage();
      expect(toneOf(R20, "취소 요청")).toContain("text-text-warning");
      expect(toneOf(R23, "환불 처리중")).toContain("text-text-success");
      expect(toneOf(R24, "취소 완료")).not.toContain("text-text-warning");
      expect(toneOf(R24, "취소 완료")).not.toContain("text-text-success");
    });

    it("렌트 금액은 원/일 단가다 — 렌트가 = 원가 − 할인", () => {
      renderPage();

      /* KB119374 1,300 − 100 = 1,200원/일 */
      const cells = cellsOf(rowOf(R24));
      expect(cells[CELL.rentBase]).toHaveTextContent("1,300원");
      expect(cells[CELL.rentDiscount]).toHaveTextContent("100원");
      expect(cells[CELL.rentPrice]).toHaveTextContent("1,200원/일");
    });

    it("판매 건은 렌트 금액 세 열과 이용 기간이 모두 비어 있다 (원본 hasRent)", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      for (const row of bodyRows()) {
        const cells = cellsOf(row);
        expect(cells[CELL.period]).toHaveTextContent("—");
        expect(cells[CELL.rentBase]).toHaveTextContent("—");
        expect(cells[CELL.rentDiscount]).toHaveTextContent("—");
        expect(cells[CELL.rentPrice]).toHaveTextContent("—");
      }
    });

    it("표 컬럼은 26개이고 앞 7열이 sticky, 오프셋이 폭의 누적합(772)이다", () => {
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
      expect(offset).toBe(772);
      expect(classList(heads[7])).not.toContain("sticky");
    });
  });
});

/* ---------------------------------------------------------------------------
 * 데이터 상태 미리보기 (?preview=) — §D8
 * ------------------------------------------------------------------------ */
describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리 글자는 남기고 값만 스켈레톤이다", () => {
    renderPage("?preview=loading");

    expect(
      screen.getByRole("columnheader", { name: "주문번호" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: R20 })).toBeNull();
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

    expect(screen.getByRole("button", { name: R20 })).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
