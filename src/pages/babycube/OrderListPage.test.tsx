import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderListPage } from "./OrderListPage";
import {
  CLAIM_FLOW,
  DEMO_TODAY,
  ORDERS,
  type ClaimType,
} from "./OrderListPage.data";
import { MEMBERS } from "./MemberListPage.data";
import { PRODUCTS } from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * S08 주문 목록 (BabyCube) — 목록형 · 기획 v0.4 대조
 *
 * 렌더 여부가 아니라 **동작**을 본다: 유형 카드 2장(건수 = 필터) · 접힌 검색조건과 요약 ·
 * 유형에 따라 갈리는 상태 선택지 · 판매자/셀러 · 검색 7종 · 선택과 엑셀 대상 · 정렬 ·
 * 페이지 크기 · No 역순 · 주문번호 링크 · URL 쿼리(대시보드 링크).
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 상태 색이 뜻과 맞는가 (연체중·배송 지연=critical · 검수완료=warning · 구매확정=default)
 *   2. 좌측 고정 7열이 실제로 sticky 이고 오프셋이 폭의 누적합인가
 *   3. 판매 건은 렌트 금액 **세 열 모두** 비고, 렌트가 = 원가 − 할인인가
 *   4. 샘플이 상품·회원 샘플과 이어져 있는가
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
  window.history.replaceState(null, "", "/orders-all");
});

type User = ReturnType<typeof userEvent.setup>;

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

/** @param search 대시보드 타일이 만드는 링크를 그대로 흉내 낸다 (`"?stat=렌트&flow=연체중"`) */
function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/orders-all${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/orders-all"
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

/** 주문번호 + 상품명으로 행을 찾는다 — 같은 주문번호에 처리단위가 여럿일 수 있다 */
function rowOf(orderNo: string, productName?: string): HTMLElement {
  const row = bodyRows().find(
    (candidate) =>
      cellsOf(candidate)[CELL.orderNo].textContent === orderNo &&
      (productName === undefined ||
        cellsOf(candidate)[CELL.productName].textContent === productName),
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

/** 검색조건은 **접힌 채로 열린다** — 닫혀 있으면 안의 컨트롤이 DOM 에 없다 */
const openFilters = async (user: User) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

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

async function gotoPage(user: User, page: number) {
  const nav = screen.getByRole("navigation", { name: "페이지네이션" });
  await user.click(within(nav).getByRole("button", { name: String(page) }));
}

const sortButton = (label: string) =>
  screen
    .getByRole("columnheader", { name: new RegExp(label) })
    .querySelector("button")!;

const excel = () => screen.getByRole("button", { name: "엑셀 다운로드" });

/* 결제 최신순 렌트 1·2번째 (U-R01 · U-R02) */
const R01 = "20261018143205";
const R02 = "20261018091240";

describe("OrderListPage (BabyCube S08 주문 목록)", () => {
  describe("화면 골격 (v0.4)", () => {
    it("유형 카드는 렌트·판매 2장이고 렌트가 눌린 채 열린다 ([전체] 없음)", () => {
      renderPage();

      const cards = within(
        screen.getByRole("group", { name: "유형별 건수" }),
      ).getAllByRole("button");
      expect(cards.map((card) => card.textContent)).toEqual([
        expect.stringContaining("렌트"),
        expect.stringContaining("판매"),
      ]);
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 32건");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
      expect(typeCard("판매")).toHaveAccessibleName("판매 35건");
      expect(screen.getByText("목록 (총 32건)")).toBeVisible();
    });

    it("첫 페이지는 10건이고 No 는 조회 결과의 역순 순번이다", () => {
      renderPage();

      expect(bodyRows()).toHaveLength(10);
      expect(column(CELL.no)).toEqual([
        "32",
        "31",
        "30",
        "29",
        "28",
        "27",
        "26",
        "25",
        "24",
        "23",
      ]);
      /* 기본 순서는 결제 최신순 */
      expect(column(CELL.orderNo).slice(0, 2)).toEqual([R01, R02]);
    });

    it("결제 일시·이용 기간은 점 표기다 — 저장 형식(하이픈)을 흘리지 않는다", () => {
      renderPage();

      const cells = cellsOf(rowOf(R01));
      expect(cells[CELL.paidAt]).toHaveTextContent("2026.10.18 14:32");
      expect(cells[CELL.period]).toHaveTextContent("2026.10.22 ~ 2026.11.04");
    });

    it("원본에 없는 도움말·유형 안내·행 클릭 미리보기가 없다", async () => {
      const { user } = renderPage();

      expect(screen.queryByRole("button", { name: /도움말/ })).toBeNull();
      expect(screen.queryByText(/처리단위입니다/)).toBeNull();

      await user.click(cellsOf(rowOf(R01))[CELL.productName]);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    /** 원본 `orderRowDetail` — 주문번호가 **그 처리단위의** 상세로 간다(도착은 App 테스트가 본다) */
    it("주문번호를 누르면 그 처리단위의 상세 경로로 간다", async () => {
      const { user, onNavSelect } = renderPage("?q=20261017200511");

      /* 같은 주문번호의 렌트(U-R03)·판매(U-S03)는 서로 다른 상세로 간다 */
      await user.click(screen.getByRole("button", { name: "20261017200511" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-R03");

      await user.click(typeCard("판매"));
      await user.click(screen.getByRole("button", { name: "20261017200511" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-S03");
    });

    /** 링크 글자만 눌려 「못 들어가는 곳인가」 헷갈리던 것 — 행 어디를 눌러도 간다(사용자 결정 2026-11-02) */
    it("행의 다른 칸을 눌러도 같은 상세로 간다 — 체크박스는 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf(R01);

      await user.click(within(row).getByRole("checkbox"));
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(within(row).getAllByRole("cell")[1]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-R01");
    });
  });

  describe("유형 카드 = 유형 필터", () => {
    it("판매로 바꾸면 판매 건만 남고 상태 선택지가 판매 5단계로 갈린다", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      expect(screen.getByText("목록 (총 35건)")).toBeVisible();
      expect(new Set(column(CELL.type))).toEqual(new Set(["판매"]));

      await openFilters(user);
      await user.click(screen.getByRole("combobox", { name: "상태" }));
      const options = within(await screen.findByRole("listbox"))
        .getAllByRole("option")
        .map((option) => option.textContent);
      expect(options).toEqual([
        "상태 전체",
        "신규 주문",
        "배송 준비",
        "배송중",
        "배송 완료",
        "구매확정",
      ]);
    });

    it("렌트 상태는 원본 11단계와 값·순서까지 같다 (클레임·배송 지연은 선택지에 없다)", async () => {
      const { user } = renderPage();

      await openFilters(user);
      await user.click(screen.getByRole("combobox", { name: "상태" }));
      const options = within(await screen.findByRole("listbox"))
        .getAllByRole("option")
        .map((option) => option.textContent);
      expect(options).toEqual([
        "상태 전체",
        "신규 주문",
        "배송 준비",
        "배송중",
        "배송 완료",
        "대여중",
        "대여중(연장)",
        "연체중",
        "수거 신청",
        "검수중",
        "검수완료",
        "반납완료",
      ]);
    });

    it("카드 건수는 다른 조건을 따라 준다", async () => {
      const { user } = renderPage();

      await search(user, "구매자명", "박수진");

      expect(typeCard("렌트")).toHaveAccessibleName("렌트 2건");
      expect(typeCard("판매")).toHaveAccessibleName("판매 0건");
    });

    /** 다른 유형의 목록에서 고른 행·정렬·상태가 남으면 보이지 않는 행이 엑셀에 섞인다 */
    it("유형을 바꾸면 상태·정렬·선택·페이지가 함께 풀린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "신규 주문");
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
      expect(screen.getByText("목록 (총 32건)")).toBeVisible();
    });
  });

  describe("검색조건 (접힘 + 요약)", () => {
    /* 사용자 결정 2026-10-19 — 원본은 접힘이지만 펼친 채로 연다 */
    it("펼친 채로 열리고, 접으면 걸린 조건이 없다고 요약한다", async () => {
      const { user } = renderPage();
      expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("상태를 고르면 그 상태만 남고 요약에 걸린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "대여중");

      expect(new Set(column(CELL.status))).toEqual(new Set(["대여중"]));
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
      expect(screen.getByText("상태 대여중")).toBeVisible();
    });

    /** 원본의 판매자 라디오 + 셀러 지정을 셀렉트 하나로 합쳤다(사용자 결정) — 라디오가 없다 */
    it("판매자 셀렉트 하나로 전체·본사·셀러 전체·개별 셀러를 고른다", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(
        screen.getByRole("combobox", { name: "판매자" }),
      ).toHaveTextContent("판매자 전체");

      await chooseOption(user, "판매자", "리틀베이비");
      expect(new Set(column(CELL.seller))).toEqual(new Set(["리틀베이비"]));
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
      expect(screen.getByText("셀러 리틀베이비")).toBeVisible();

      await chooseOption(user, "판매자", "셀러 전체");
      /* 렌트 32 − 본사 렌트 1(U-R32) */
      expect(screen.getByText("목록 (총 31건)")).toBeVisible();
    });

    it("판매자 열은 본사면 '본사', 셀러면 셀러명이다 (원본 owner)", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));
      await chooseOption(user, "판매자", "본사");

      /* U-S10 · U-S24 · U-S34 + 클레임 건 U-S13(취소) · U-S15(반품) */
      expect(column(CELL.seller)).toEqual([
        "본사",
        "본사",
        "본사",
        "본사",
        "본사",
      ]);
      /* 본사 렌트는 U-R32 한 건(정산 사례) — 카드가 판매자 조건을 따라 센다 */
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 1건");
    });

    it("검색 대상 기본은 주문번호다 (원본 7종 · '전체' 대상 없음)", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(
        screen.getByRole("combobox", { name: "검색 대상" }),
      ).toHaveTextContent("주문번호");
      await user.type(screen.getByPlaceholderText("검색어 입력"), "20261018");

      expect(column(CELL.orderNo)).toEqual([R01, R02]);
    });

    it("검색은 대소문자를 가리지 않는다 (원본 toLowerCase)", async () => {
      const { user } = renderPage();

      await search(user, "구매자 ID", "SUJIN.PARK");

      expect(screen.getByText("목록 (총 2건)")).toBeVisible();
    });

    it("연락처는 **구매자** 연락처다 — 수령인 번호로는 걸리지 않는다", async () => {
      const { user } = renderPage();

      /* U-R07 의 수령인은 박서진(010-3310-7765), 구매자는 문지호(010-7742-1093) */
      await search(user, "연락처", "010-3310-7765");
      expect(bodyRows()).toHaveLength(0);

      await user.clear(screen.getByPlaceholderText("검색어 입력"));
      await user.type(screen.getByPlaceholderText("검색어 입력"), "010-7742");
      expect(column(CELL.orderNo)).toEqual(["20261016194018"]);
    });

    it("결과가 없으면 빈 상태가 뜨고, 초기화가 조건을 모두 되돌린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(screen.getByText("목록 (총 32건)")).toBeVisible();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });
  });

  describe("선택과 엑셀", () => {
    it("고른 행이 없으면 조회 결과 전체가 대상이다", async () => {
      const { user } = renderPage();

      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 32건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("고른 행이 있으면 그것만 대상이다 — 머리 체크박스는 보이는 페이지 단위", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(excel());

      expect(
        await screen.findByText("선택한 10건을 내려받았습니다"),
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
        screen.getByRole("checkbox", {
          name: `${R01} 회전형 카시트 스핀 360 선택`,
        }),
      );
      await chooseOption(user, "상태", "신규 주문");
      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 2건을 내려받았습니다"),
      ).toBeVisible();
    });

    /** 원본은 주문 1건 → 처리단위 N행이다. 행의 키가 주문번호면 둘이 함께 선택된다 */
    it("같은 주문번호의 두 처리단위는 따로 선택된다", async () => {
      const shared = "20261012131744";
      const { user } = renderPage(`?q=${shared}`);

      expect(
        bodyRows().filter(
          (row) => cellsOf(row)[CELL.orderNo].textContent === shared,
        ),
      ).toHaveLength(2);

      const first = screen.getByRole("checkbox", {
        name: `${shared} 베드사이드 침대 코모 선택`,
      });
      const second = screen.getByRole("checkbox", {
        name: `${shared} 롤매트 소프트 220 선택`,
      });
      await user.click(first);

      expect(first).toBeChecked();
      expect(second).not.toBeChecked();
    });
  });

  describe("정렬 (이용 기간 · 결제 일시)", () => {
    it("결제 일시를 누르면 오름 → 내림 → 해제 순으로 돈다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("결제 일시"));
      /* 가장 이른 결제 — 정산 사례 U-S30(판매)는 판매 탭이라 렌트에서는 U-R29 */
      expect(column(CELL.paidAt)[0]).toBe("2026.08.18 11:42");
      /* No 는 정렬해도 역순 순번이다 */
      expect(column(CELL.no)[0]).toBe("32");

      await user.click(sortButton("결제 일시"));
      expect(column(CELL.paidAt)[0]).toBe("2026.10.18 14:32");

      await user.click(sortButton("결제 일시"));
      expect(
        screen.getByRole("columnheader", { name: /결제 일시/ }),
      ).toHaveAttribute("aria-sort", "none");
    });

    it("이용 기간 정렬은 시작일 순이다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("이용 기간"));

      expect(column(CELL.period)[0]).toBe("2026.08.22 ~ 2026.09.11");
    });

    it("정렬을 바꾸면 1페이지로 돌아간다", async () => {
      const { user } = renderPage();

      await gotoPage(user, 2);
      await user.click(sortButton("결제 일시"));

      expect(column(CELL.no)[0]).toBe("32");
    });
  });

  describe("페이지", () => {
    it("2·3페이지가 이어서 세고, 페이지당 개수를 바꾸면 1페이지로 돌아간다", async () => {
      const { user } = renderPage();

      await gotoPage(user, 3);
      expect(column(CELL.no)).toEqual([
        "12",
        "11",
        "10",
        "9",
        "8",
        "7",
        "6",
        "5",
        "4",
        "3",
      ]);
      await gotoPage(user, 4);
      expect(column(CELL.no)).toEqual(["2", "1"]);

      await chooseOption(user, "페이지당 개수", "20개씩 보기");
      expect(bodyRows()).toHaveLength(20);
      expect(column(CELL.no)[0]).toBe("32");
    });

    it("판매도 11건이 넘어 두 페이지로 나뉜다", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      expect(
        within(
          screen.getByRole("navigation", { name: "페이지네이션" }),
        ).getByRole("button", { name: "2" }),
      ).toBeVisible();
    });
  });

  describe("URL 쿼리를 초기 필터로 읽는다 (대시보드 링크)", () => {
    it("쿼리가 없거나 모르는 유형이면 렌트다", () => {
      renderPage("?stat=전체");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
    });

    it("stat 은 유형이다 — ?stat=판매", () => {
      renderPage("?stat=판매");
      expect(typeCard("판매")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByText("목록 (총 35건)")).toBeVisible();
    });

    it("flow 는 상태다 — ?stat=렌트&flow=연체중", () => {
      renderPage("?stat=렌트&flow=연체중");
      expect(column(CELL.status)).toEqual(["연체중", "연체중"]);
    });

    it("판매에 없는 상태로 들어오면 상태를 버린다 (늘 0건인 화면 방지)", () => {
      renderPage("?stat=판매&flow=대여중");
      expect(screen.getByText("목록 (총 35건)")).toBeVisible();
    });

    it("owner 는 판매자, sellerName 은 셀러다", () => {
      renderPage("?owner=셀러&sellerName=리틀베이비");
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
    });

    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다", () => {
      renderPage("?stat=판매&owner=본사&sellerName=리틀베이비");
      expect(column(CELL.seller)).toEqual([
        "본사",
        "본사",
        "본사",
        "본사",
        "본사",
      ]);
    });

    it("q 는 주문번호 검색어다", () => {
      renderPage(`?q=${R01}`);
      expect(column(CELL.orderNo)).toEqual([R01]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다 (양끝 포함)", () => {
      renderPage("?paidAt_from=2026-10-16&paidAt_to=2026-10-17");
      expect(screen.getByText("목록 (총 7건)")).toBeVisible();
    });
  });

  describe("의미 1. 상태 색이 뜻과 맞는다", () => {
    const toneOf = (orderNo: string, label: string) =>
      classList(within(rowOf(orderNo)).getByText(label));

    it("연체중·배송 지연은 critical — 즉시 조치할 자리다", () => {
      renderPage("?stat=렌트&flow=연체중");
      expect(toneOf("20261001182750", "연체중")).toContain(
        "text-text-critical",
      );
    });

    it("배송 지연·취소 요청처럼 선택지에 없는 상태도 목록에는 보인다 (원본)", () => {
      renderPage();
      expect(toneOf("20261016152209", "배송 지연")).toContain(
        "text-text-critical",
      );
      expect(toneOf("20261017221014", "취소 요청")).toContain(
        "text-text-warning",
      );
    });

    /*
      클레임 건은 주문 목록에도 **클레임 상태로** 섞여 보인다(원본 flowStat). 재반송은 반려·거부와
      같은 비정상 종결이다 — 한때 「할 일이 남음」(warning)으로 칠했다.
    */
    it("클레임 상태도 목록에 보인다 — 재반송·거부는 critical, 환불 처리중은 success", () => {
      const check = (orderNo: string, label: string, tone: string) => {
        renderPage(`?stat=판매&q=${orderNo}`);
        expect(toneOf(orderNo, label)).toContain(tone);
        cleanup();
      };
      check("20260929111111", "재반송", "text-text-critical");
      check("20261002153044", "반품 거부", "text-text-critical");
      check("20261004100512", "환불 처리중", "text-text-success");
    });

    it("검수완료는 이름과 달리 warning — 보증금 처리가 남았다", () => {
      renderPage("?stat=렌트&flow=검수완료");
      expect(toneOf("20260922173349", "검수완료")).toContain(
        "text-text-warning",
      );
    });

    it("정상 종료(구매확정)는 default — 더 볼 것이 없다", () => {
      renderPage("?stat=판매&flow=구매확정");
      expect(toneOf("20261005144809", "구매확정")).not.toContain(
        "text-text-success",
      );
      expect(toneOf("20261005144809", "구매확정")).not.toContain(
        "text-text-warning",
      );
    });
  });

  describe("의미 2. 렌트 금액", () => {
    /** 원본 목록의 렌트 금액은 **원/일 단가**다 — 렌트일을 곱한 총액은 상세의 주문 명세가 보인다 */
    it("렌트가 = 원가 − 할인 (원/일 단가)", () => {
      renderPage();

      /* BL240814 1,500 − 200 = 1,300원/일 */
      const cells = cellsOf(rowOf(R01));
      /* 세 열 모두 원/일 단가 — 원가·할인만 「원」이면 이웃 열과 단위가 섞여 읽힌다 */
      expect(cells[CELL.rentBase]).toHaveTextContent(/^1,500원\/일$/);
      expect(cells[CELL.rentDiscount]).toHaveTextContent(/^200원\/일$/);
      expect(cells[CELL.rentPrice]).toHaveTextContent("1,300원/일");
    });

    it("판매 건은 렌트 금액 세 열과 이용 기간이 모두 비어 있다 (원본 hasRent)", async () => {
      const { user } = renderPage();

      await user.click(typeCard("판매"));

      const cells = cellsOf(bodyRows()[0]);
      expect(cells[CELL.period]).toHaveTextContent("—");
      expect(cells[CELL.rentBase]).toHaveTextContent("—");
      expect(cells[CELL.rentDiscount]).toHaveTextContent("—");
      expect(cells[CELL.rentPrice]).toHaveTextContent("—");
    });
  });

  describe("의미 3. 좌측 고정 7열 (원본 frozenTable 7)", () => {
    it("표 컬럼은 체크박스를 포함해 26개다", () => {
      renderPage();
      expect(screen.getAllByRole("columnheader")).toHaveLength(26);
      expect(
        screen.getByRole("table").querySelectorAll("colgroup > col"),
      ).toHaveLength(26);
    });

    it("앞 7열이 sticky 이고 오프셋이 폭의 누적합과 같다", () => {
      renderPage();

      const toPx = (cls: string, prefix: string) =>
        Number(
          classList(document.createElement("i"))
            .concat(cls.split(/\s+/))
            .find((name) => name.startsWith(prefix))
            ?.slice(prefix.length),
        ) * 4;
      const cols = [
        ...screen.getByRole("table").querySelectorAll("colgroup > col"),
      ].map((col) => toPx(col.className, "w-"));
      const heads = screen.getAllByRole("columnheader").slice(0, 7);

      let offset = 0;
      heads.forEach((head, index) => {
        expect(classList(head)).toContain("sticky");
        expect(toPx(head.className, "left-")).toBe(offset);
        offset += cols[index];
      });
      expect(offset).toBe(760);
      expect(classList(screen.getAllByRole("columnheader")[7])).not.toContain(
        "sticky",
      );
    });
  });

  describe("의미 4. 샘플이 다른 화면과 이어져 있다", () => {
    it("모든 주문의 상품은 상품 샘플에, 구매자는 회원 샘플에 있다", () => {
      ORDERS.forEach((order) => {
        const product = PRODUCTS.find((item) => item.id === order.productCode);
        expect(product?.name).toBe(order.productName);
        expect(product?.mode).toBe(order.type);
        expect(MEMBERS.some((member) => member.id === order.buyerId)).toBe(
          true,
        );
      });
    });

    it("배송 방법은 원본 3종뿐이다 (방문 설치 폐지)", () => {
      expect(new Set(ORDERS.map((order) => order.shipMethod))).toEqual(
        new Set(["택배", "방문 수령", "공항 픽업"]),
      );
    });

    it("행의 키(처리단위)는 유일하고 주문번호는 14자리다", () => {
      expect(new Set(ORDERS.map((order) => order.id)).size).toBe(ORDERS.length);
      ORDERS.forEach((order) => expect(order.orderNo).toMatch(/^\d{14}$/));
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
    expect(screen.queryByRole("button", { name: R01 })).toBeNull();
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

    expect(screen.getByRole("button", { name: R01 })).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});

/* ---------------------------------------------------------------------------
 * 클레임 샘플의 계약 — 취소·반품·교환 목록과 클레임 상세가 이 샘플을 그대로 쓴다.
 * 원본의 결함(발송 후 취소 · 0건 상태 · 판매 교환이 렌트 상품 · 지연 상시 삽입 ·
 * 거부가 반려로)을 샘플이 다시 갖지 않게 못을 박는다.
 * ------------------------------------------------------------------------ */
describe("클레임 샘플의 계약", () => {
  const claims = ORDERS.filter((order) => order.claim);
  const ofType = (type: ClaimType) =>
    claims.filter((order) => order.claim?.type === type);

  it("상태마다 최소 한 건 — 클레임 목록의 상태 선택지가 0건으로 끝나지 않는다", () => {
    for (const type of ["cancel", "return", "exchange"] as ClaimType[]) {
      for (const status of CLAIM_FLOW[type]) {
        expect(
          ofType(type).some((order) => order.status === status),
          status,
        ).toBe(true);
      }
    }
  });

  it("목록 배지는 클레임의 지금 단계, 지금 단계는 거친 단계의 마지막이다", () => {
    for (const order of claims) {
      const events = order.claim!.events;
      expect(order.status).toBe(order.claim!.status);
      expect(events[events.length - 1].status).toBe(order.claim!.status);
    }
  });

  it("교환은 판매 전용이다 (원본 FAQ · 렌트 교환 상세 없음)", () => {
    expect(ofType("exchange").every((order) => order.type === "sale")).toBe(
      true,
    );
  });

  it("취소는 모두 출고 전이다 — 송장이 없다 (발송 후 취소는 반품으로 전환)", () => {
    for (const order of ofType("cancel")) {
      expect(["new", "ready"]).toContain(order.baseStatus);
      expect(order.trackingNo).toBe("");
    }
  });

  it("반품·교환은 받은 뒤에만 생기고, 원래 배송 송장이 남는다", () => {
    for (const order of [...ofType("return"), ...ofType("exchange")]) {
      /* 구매확정 뒤 반품은 정산 환수 사례(U-S30) 하나 — 8월 확정·지급 뒤 9월 반품 완료 */
      expect(["delivered", "renting", "confirmed"]).toContain(order.baseStatus);
      expect(order.trackingNo).not.toBe("");
    }
    expect(
      claims
        .filter((order) => order.baseStatus === "confirmed")
        .map((order) => order.id),
    ).toEqual(["U-S30"]);
  });

  it("수거가 시작된 반품·교환은 판매 건도 수거 송장이 있다", () => {
    const picked = (order: (typeof claims)[number]) =>
      order.claim!.events.some((event) =>
        ["returnPicking", "exchangePicking"].includes(event.status),
      );
    for (const order of [...ofType("return"), ...ofType("exchange")]) {
      expect(order.pickupTrackingNo !== "").toBe(picked(order));
    }
    expect(
      ofType("exchange").some((order) => order.pickupTrackingNo !== ""),
    ).toBe(true);
  });

  it("반려는 수거 전, 거부는 검수 뒤, 재반송은 거부 뒤다 (원본은 모두 「반려」로 찍었다)", () => {
    const steps = (status: string) =>
      claims
        .find((order) => order.status === status)!
        .claim!.events.map((event) => event.status);
    expect(steps("returnRejected")).toEqual([
      "returnRequested",
      "returnRejected",
    ]);
    expect(steps("exchangeRefused").slice(-2)).toEqual([
      "exchangeInspecting",
      "exchangeRefused",
    ]);
    expect(steps("returnResend").slice(-3)).toEqual([
      "returnInspecting",
      "returnRefused",
      "returnResend",
    ]);
    /* 지연은 정상 단계가 아니다 — 어느 건에도 끼지 않는다 */
    expect(
      claims.some((order) =>
        order.claim!.events.some((event) => /delay/i.test(event.status)),
      ),
    ).toBe(false);
  });

  it("귀책은 사유에서 한 번 정한다 — 하자·배송 문제는 판매자, 그 밖은 고객", () => {
    const fault = (id: string) =>
      ORDERS.find((order) => order.id === id)!.claim!.fault;
    expect(fault("U-S17")).toBe("seller"); // 파손 배송
    expect(fault("U-S23")).toBe("seller"); // 오배송
    expect(fault("U-S16")).toBe("customer"); // 단순변심
  });

  it("클레임 시각은 시간순이고 시연 기준일을 넘지 않는다", () => {
    for (const order of claims) {
      const times = order.claim!.events.map((event) => event.at);
      expect([...times].sort()).toEqual(times);
      expect(times[times.length - 1] <= `${DEMO_TODAY} 23:59`).toBe(true);
      expect(times[0] > order.date).toBe(true);
    }
  });
});
