import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderExchangeListPage } from "./OrderExchangeListPage";
import { EXCHANGES } from "./OrderExchangeListPage.data";
import { CLAIM_FLOW, ORDERS, STATUS_META } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S11 교환 목록 (BabyCube) — 목록형 · 기획 v0.4 대조
 *
 * 주문 목록 테스트를 본떴다. 렌더 여부가 아니라 **동작**을 본다: 유형 카드 없음 ·
 * 상태 선택지 = `CLAIM_FLOW.exchange` · 판매자 셀렉트 · 검색 7종(대소문자 무시) ·
 * 선택과 엑셀 대상 · 정렬 · 페이지 크기 · No 역순 · 주문번호 → 교환 상세 · URL 쿼리.
 *
 * **의미 검증**도 함께 못박는다 —
 *   1. 모집단이 주문 샘플의 교환 부분집합(판매만)인가 — 같은 처리단위(U-S12)
 *   2. 반려·거부·재반송이 critical 인가 (주문 목록과 같은 색)
 *   3. 판매 건은 이용 기간·렌트 금액 세 열이 모두 `—` 인가
 *   4. 좌측 고정 7열이 sticky 이고 오프셋이 폭의 누적합인가
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
  window.history.replaceState(null, "", "/orders-exchange");
});

type User = ReturnType<typeof userEvent.setup>;

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

/** @param search 링크를 그대로 흉내 낸다 (`"?flow=교환 신청"`) */
function renderPage(search = "") {
  if (search)
    window.history.replaceState(null, "", `/orders-exchange${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderExchangeListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/orders-exchange"
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

/** 검색조건은 펼친 채로 열린다 — 접혀 있을 때만 연다 */
const openFilters = async (user: User) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

async function optionsOf(user: User, selectLabel: string) {
  await openFilters(user);
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  const options = within(listbox)
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

/* 결제 최신순 1·2번째 (U-S21 · U-S12) */
const S21 = "20261012092005";
const S12 = "20261011213746";
/* 반려 · 거부 · 재반송 */
const S22 = "20261008174451";
const S28 = "20260927121212";
const S29 = "20260921183030";

describe("OrderExchangeListPage (BabyCube S11 교환 목록)", () => {
  describe("화면 골격 (v0.4)", () => {
    it("유형 카드가 없다 — 교환은 판매 전용이라 원본이 카드를 두지 않는다", () => {
      renderPage();

      expect(screen.queryByRole("group", { name: "유형별 건수" })).toBeNull();
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
    });

    it("첫 페이지는 10건이고 No 는 조회 결과의 역순 순번이다", () => {
      renderPage();

      expect(bodyRows()).toHaveLength(10);
      expect(column(CELL.no)).toEqual([
        "10",
        "9",
        "8",
        "7",
        "6",
        "5",
        "4",
        "3",
        "2",
        "1",
      ]);
      /* 기본 순서는 결제 최신순 */
      expect(column(CELL.orderNo).slice(0, 2)).toEqual([S21, S12]);
    });

    it("원본에 없는 도움말·행 클릭 미리보기·「전체 항목」이 없다", async () => {
      const { user } = renderPage();

      expect(screen.queryByRole("button", { name: /도움말/ })).toBeNull();

      await user.click(cellsOf(rowOf(S21))[CELL.productName]);
      expect(screen.queryByRole("dialog")).toBeNull();

      expect(await optionsOf(user, "검색 대상")).not.toContain("전체 항목");
      /* 「n / m 페이지」 글자도 없다 */
      expect(screen.queryByText(/\d+ \/ \d+ 페이지/)).toBeNull();
    });

    /** 원본 `orderRowDetail` → `rmaExchange` (도착은 App 테스트가 본다) */
    it("주문번호를 누르면 그 처리단위의 교환 상세 경로로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: S12 }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-exchange/U-S12");
    });

    /** 링크 글자만 눌려 「못 들어가는 곳인가」 헷갈리던 것 — 행 어디를 눌러도 간다(사용자 결정 2026-11-02) */
    it("행의 다른 칸을 눌러도 같은 상세로 간다 — 체크박스는 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      const row = rowOf(S12);

      await user.click(within(row).getByRole("checkbox"));
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(within(row).getAllByRole("cell")[1]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-exchange/U-S12");
    });
  });

  describe("검색조건 (펼침 + 요약)", () => {
    /* 사용자 결정 2026-10-19 — 원본은 접힘이지만 펼친 채로 연다 */
    it("펼친 채로 열리고, 접으면 걸린 조건이 없다고 요약한다", async () => {
      const { user } = renderPage();
      expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });

    it("상태 선택지는 원본 FLOW_STEPS['교환'] 과 값·순서까지 같다", async () => {
      const { user } = renderPage();

      expect(await optionsOf(user, "상태")).toEqual([
        "상태 전체",
        ...CLAIM_FLOW.exchange.map((status) => STATUS_META[status].label),
      ]);
      expect(CLAIM_FLOW.exchange).toHaveLength(10);
    });

    it("상태를 고르면 그 상태만 남고 요약에 걸린다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "상태", "교환 수거중");

      expect(column(CELL.status)).toEqual(["교환 수거중"]);
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
      expect(screen.getByText("상태 교환 수거중")).toBeVisible();
    });

    /** 라디오 + 셀러 지정을 셀렉트 하나로 합쳤다(사용자 결정) — 셀러명은 이 화면 모집단에서 */
    it("판매자 셀렉트 하나로 전체·본사·셀러 전체·개별 셀러를 고른다", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(screen.queryByRole("radiogroup")).toBeNull();
      expect(
        screen.getByRole("combobox", { name: "판매자" }),
      ).toHaveTextContent("판매자 전체");
      expect(await optionsOf(user, "판매자")).toEqual([
        "판매자 전체",
        "본사",
        "셀러 전체",
        "리틀베이비",
        "리틀스텝",
        "베베하우스",
        "베이비루",
        "아기별상사",
        "아이랑",
        "코지베이비",
      ]);

      await chooseOption(user, "판매자", "베베하우스");
      expect(column(CELL.seller)).toEqual(["베베하우스", "베베하우스"]);
      expect(screen.getByText("셀러 베베하우스")).toBeVisible();

      await chooseOption(user, "판매자", "본사");
      expect(column(CELL.orderNo)).toEqual(["20261005140247"]);

      await chooseOption(user, "판매자", "셀러 전체");
      expect(screen.getByText("목록 (총 9건)")).toBeVisible();
    });

    it("검색 대상 기본은 주문번호다 (원본 7종)", async () => {
      const { user } = renderPage();
      await openFilters(user);

      expect(
        screen.getByRole("combobox", { name: "검색 대상" }),
      ).toHaveTextContent("주문번호");
      await user.type(screen.getByPlaceholderText("검색어 입력"), "202610");

      expect(screen.getByText("목록 (총 7건)")).toBeVisible();
    });

    it("검색은 대소문자를 가리지 않는다 (원본 toLowerCase)", async () => {
      const { user } = renderPage();

      await search(user, "구매자 ID", "HAJUN.SEO");

      expect(column(CELL.orderNo)).toEqual([S12]);
    });

    it("결과가 없으면 빈 상태가 뜨고, 초기화가 조건을 모두 되돌린다", async () => {
      const { user } = renderPage();

      await search(user, "주문번호", "없는번호");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
      expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    });
  });

  describe("선택과 엑셀", () => {
    it("고른 행이 없으면 조회 결과 전체가 대상이다", async () => {
      const { user } = renderPage();

      await user.click(excel());

      expect(
        await screen.findByText("조회 결과 10건을 내려받았습니다"),
      ).toBeVisible();
    });

    it("고른 행이 있으면 그것만 대상이다 — 머리 체크박스는 보이는 페이지 단위", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
      );
      await user.click(
        screen.getByRole("checkbox", {
          name: `${S21} UV 젖병소독기 미니 선택`,
        }),
      );
      await user.click(excel());

      expect(
        await screen.findByText("선택한 9건을 내려받았습니다"),
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
          name: `${S21} UV 젖병소독기 미니 선택`,
        }),
      );
      await chooseOption(user, "상태", "교환 승인");
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
      expect(column(CELL.paidAt)[0]).toBe("2026.09.21 18:30");
      /* No 는 정렬해도 역순 순번이다 */
      expect(column(CELL.no)[0]).toBe("10");

      await user.click(sortButton("결제 일시"));
      expect(column(CELL.paidAt)[0]).toBe("2026.10.12 09:20");

      await user.click(sortButton("결제 일시"));
      expect(
        screen.getByRole("columnheader", { name: /결제 일시/ }),
      ).toHaveAttribute("aria-sort", "none");
      expect(column(CELL.orderNo)[0]).toBe(S21);
    });

    /* 판매 전용이라 값은 늘 `—` 지만 원본·주문 목록과 같은 표라 정렬 머리는 남긴다 */
    it("이용 기간 정렬 머리가 있고 오름차순으로 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(sortButton("이용 기간"));

      expect(
        screen.getByRole("columnheader", { name: /이용 기간/ }),
      ).toHaveAttribute("aria-sort", "ascending");
    });
  });

  describe("페이지", () => {
    it("페이지당 개수는 10/20/50/100 이고, 바꾸면 그 크기로 다시 센다", async () => {
      const { user } = renderPage();

      await chooseOption(user, "페이지당 개수", "20개씩 보기");

      expect(bodyRows()).toHaveLength(10);
      expect(column(CELL.no)[0]).toBe("10");
      expect(
        screen.getByRole("combobox", { name: "페이지당 개수" }),
      ).toHaveTextContent("20개씩 보기");
      expect(
        within(
          screen.getByRole("navigation", { name: "페이지네이션" }),
        ).queryByRole("button", { name: "2" }),
      ).toBeNull();
    });
  });

  describe("URL 쿼리를 초기 필터로 읽는다", () => {
    it("stat 은 읽지 않는다 — 유형 축이 없고, 옛 「stat=상태」도 무시한다", () => {
      renderPage("?stat=렌트");
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
      cleanup();

      renderPage("?stat=교환 신청");
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
    });

    it("flow 는 상태다 — ?flow=교환 신청", () => {
      renderPage("?flow=교환 신청");
      expect(column(CELL.orderNo)).toEqual([S12]);
    });

    it("겹치는 라벨은 이 화면 상태로 풀린다 — 재반송 = 교환 재반송, 환불 처리중은 없다", () => {
      renderPage("?flow=재반송");
      expect(column(CELL.orderNo)).toEqual([S29]);
      cleanup();

      renderPage("?flow=환불 처리중");
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
    });

    it("모르는 상태는 버린다", () => {
      renderPage("?flow=대여중");
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
    });

    it("owner 는 판매자, sellerName 은 셀러다 — 모르는 셀러면 셀러 전체", () => {
      renderPage("?owner=셀러&sellerName=베베하우스");
      expect(screen.getByText("목록 (총 2건)")).toBeVisible();
      cleanup();

      renderPage("?owner=셀러&sellerName=없는셀러");
      expect(screen.getByText("목록 (총 9건)")).toBeVisible();
    });

    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다", () => {
      renderPage("?owner=본사&sellerName=베베하우스");
      expect(column(CELL.seller)).toEqual(["본사"]);
    });

    it("q 는 주문번호 검색어다", () => {
      renderPage(`?q=${S12}`);
      expect(column(CELL.orderNo)).toEqual([S12]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다 (양끝 포함 · 형식이 틀리면 무시)", () => {
      renderPage("?paidAt_from=2026-10-08&paidAt_to=2026-10-11");
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
      cleanup();

      renderPage("?paidAt_from=2026-10-8");
      expect(screen.getByText("목록 (총 10건)")).toBeVisible();
    });
  });

  describe("의미 1. 모집단 = 주문 샘플의 교환 부분집합", () => {
    it("ORDERS 의 교환 건과 같은 처리단위·같은 순서다 (U-S12 포함)", () => {
      expect(EXCHANGES).toEqual(
        ORDERS.filter((order) => order.claim?.type === "exchange"),
      );
      expect(EXCHANGES.map((order) => order.id)).toContain("U-S12");
      expect(EXCHANGES.every((order) => order.type === "sale")).toBe(true);
    });

    it("교환 10단계가 각각 한 건씩 보인다", () => {
      renderPage();
      expect(new Set(column(CELL.status))).toEqual(
        new Set(CLAIM_FLOW.exchange.map((status) => STATUS_META[status].label)),
      );
    });
  });

  describe("의미 2. 상태 색이 뜻과 맞는다", () => {
    const toneOf = (orderNo: string, label: string) =>
      classList(within(rowOf(orderNo)).getByText(label));

    it("반려·거부·재반송은 critical — 비정상 종결이다", () => {
      renderPage();
      expect(toneOf(S22, "교환 반려")).toContain("text-text-critical");
      expect(toneOf(S28, "교환 거부")).toContain("text-text-critical");
      expect(toneOf(S29, "재반송")).toContain("text-text-critical");
    });

    it("교환 신청은 warning — 사람이 무언가를 해야 끝난다", () => {
      renderPage();
      expect(toneOf(S12, "교환 신청")).toContain("text-text-warning");
    });
  });

  describe("의미 3. 판매 건의 빈 칸", () => {
    /* 교환은 판매 전용이라 렌트(원/일) 행이 없다 — 원/일 표기는 주문 목록 테스트가 본다 */
    it("이용 기간과 렌트 금액 세 열이 모두 — 다 (원본 hasRent)", () => {
      renderPage();

      for (const index of [
        CELL.period,
        CELL.rentBase,
        CELL.rentDiscount,
        CELL.rentPrice,
      ]) {
        expect(new Set(column(index))).toEqual(new Set(["—"]));
      }
      expect(new Set(column(CELL.type))).toEqual(new Set(["판매"]));
    });

    it("상태 배지는 small · dot 이다 (주문 목록과 같은 자리 같은 값)", () => {
      renderPage();
      const badge = within(rowOf(S12)).getByText("교환 신청");
      expect(badge.querySelector("[data-tag-dot]")).not.toBeNull();
      expect(classList(badge)).toContain("label-xsmall");
    });
  });

  describe("의미 4. 좌측 고정 7열 (원본 frozenTable 7)", () => {
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
          cls
            .split(/\s+/)
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
    expect(screen.queryByRole("button", { name: S21 })).toBeNull();
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

    expect(screen.getByRole("button", { name: S21 })).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
