import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";
import { ORDERS } from "./OrderListPage.data";
import { PointListPage } from "./PointListPage";
import {
  POINT_LEDGER,
  POINT_SUMMARIES,
  ledgerBalanceOf,
} from "./PointListPage.data";

/* -------------------------------------------------------------------------
 * 포인트 관리 (목록) — 기획 v0.4 `SCREENS.points` · 조회 전용
 *
 * 렌더 여부가 아니라 **동작과 숫자**를 본다: 원장에서 나온 합계(사례표) · 원장 ↔ 주문 ↔ 회원 상세 정합 ·
 * 검색조건(펼침·요약·대소문자 무시·기간 빠른 선택) · 정렬 3단 · 페이지 · 빈 상태·초기화 ·
 * 행/회원명 → 상세 · 원본에 없는 엑셀·체크박스·미리보기가 없다 · `?preview=`.
 *
 * 사례표 (원장 25행 → 11명, 기본 순서 = 최근 업데이트 순 · 리뷰 지급은 확정 뒤 — 판정 Q12)
 * | 회원   | 보유  | 누적 지급 | 누적 차감 | 업데이트          |
 * | 임채원 | 1,200 | 1,200     | 0         | 2026.10.16 20:15  |
 * | 안지성 | 500   | 2,500     | 2,000     | 2026.10.15 17:30  | ← U-R11 사용 2,000
 * | 황보라 | 1,100 | 1,100     | 0         | 2026.10.15 09:40  |
 * | 노하린 | 600   | 3,600     | 3,000     | 2026.10.14 10:05  | ← U-S35 사용 3,000
 * | 홍다인 | 1,600 | 1,600     | 0         | 2026.10.06 14:00  |
 * | 오세린 | 0     | 500       | 500       | 2026.10.02 10:05  | ← 리뷰 회수
 * | 최유나 · 장시우 · 유가은 500 | (백도윤은 리뷰 지급 없음 — 문의 Q-8835) |
 * | 서하준 | 100   | 500       | 400       | 2026.09.23 10:30  | ← 관리자 회수 400
 * | 송예린 | 500   | 500       | 0         | 2026.09.18 16:00  |
 * ---------------------------------------------------------------------- */
type User = ReturnType<typeof userEvent.setup>;

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

function renderPage(search = "") {
  window.history.replaceState(null, "", `/points${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <PointListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/points"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

const CELL = { no: 0, name: 1, email: 2, balance: 3, granted: 4, deducted: 5 };
const column = (index: number) => bodyRows().map((row) => cellsOf(row)[index]);
const visibleNames = () => column(CELL.name);

const rowOf = (name: string) => {
  const row = bodyRows().find((item) => cellsOf(item)[CELL.name] === name);
  if (!row) throw new Error(`행을 찾지 못했습니다: ${name}`);
  return row;
};

const sortButton = (label: string) =>
  screen
    .getByRole("columnheader", { name: new RegExp(label) })
    .querySelector("button")!;

async function chooseOption(user: User, selectLabel: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

const searchBox = () =>
  screen.getByPlaceholderText("회원명·아이디(이메일) 검색");

const PAGE_ONE = [
  "임채원",
  "안지성",
  "황보라",
  "노하린",
  "홍다인",
  "오세린",
  "최유나",
  "장시우",
  "유가은",
  "서하준",
];

describe("표 (원본 7열 · 조회 전용)", () => {
  it("열 이름·순서가 원본 그대로고, 체크박스·엑셀이 없다", () => {
    renderPage();

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual([
      "No",
      "회원명",
      "아이디(이메일)",
      "보유 포인트",
      "누적 지급 포인트",
      "누적 차감 포인트",
      "업데이트 일시",
    ]);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
  });

  it("기본 순서는 최근 업데이트 순 · No 는 역순 순번 · 11명", () => {
    renderPage();

    expect(screen.getByText("목록 (총 11건)")).toBeVisible();
    expect(visibleNames()).toEqual(PAGE_ONE);
    expect(column(CELL.no)).toEqual([
      "11",
      "10",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ]);
  });

  it.each([
    // 회원, 보유, 누적 지급, 누적 차감, 업데이트
    ["임채원", "1,200P", "1,200P", "0P", "2026.10.16 20:15"],
    ["안지성", "500P", "2,500P", "2,000P", "2026.10.15 17:30"],
    ["오세린", "0P", "500P", "500P", "2026.10.02 10:05"],
    ["노하린", "600P", "3,600P", "3,000P", "2026.10.14 10:05"],
  ])("사례표 %s — 보유 %s · 지급 %s · 차감 %s", (name, ...expected) => {
    renderPage();

    expect(cellsOf(rowOf(name)).slice(3)).toEqual(expected);
  });

  it("보유만 굵다 (원본 `<b>`)", () => {
    renderPage();
    const cells = within(rowOf("임채원")).getAllByRole("cell");

    expect(within(cells[CELL.balance]).getByText("1,200P").className).toContain(
      "body-medium-bold",
    );
    expect(cells[CELL.granted].querySelector(".body-medium-bold")).toBeNull();
  });
});

describe("원장 정합 — 한 원천에서 목록·상세·회원 상세·주문이 같은 말을 한다", () => {
  it("보유 = 누적 지급 − 누적 차감 = 원장 합", () => {
    for (const row of POINT_SUMMARIES) {
      expect(row.balance).toBe(row.granted - row.deducted);
      expect(row.balance).toBe(ledgerBalanceOf(row.id));
    }
  });

  it("회원 상세 「포인트」 값 = 원장 합 (원장이 없는 회원은 0)", () => {
    for (const member of MEMBERS) {
      expect([member.name, member.points]).toEqual([
        member.name,
        ledgerBalanceOf(member.id),
      ]);
    }
  });

  it("원장 회원은 모두 회원 샘플(MEMBERS)에 있다", () => {
    const ids = new Set(MEMBERS.map((member) => member.id));
    for (const entry of POINT_LEDGER)
      expect(ids.has(entry.memberId)).toBe(true);
  });

  it("사용 행 = 주문의 포인트 할인 그대로 (U-R11 2,000 · U-S35 3,000)", () => {
    const uses = POINT_LEDGER.filter((entry) => entry.kind === "use");
    const pointOrders = ORDERS.filter((order) => order.point > 0);

    expect(pointOrders.map((order) => order.id).sort()).toEqual([
      "U-R11",
      "U-S35",
    ]);
    expect(
      uses.map(({ memberId, orderNo, amount, at }) => ({
        memberId,
        orderNo,
        amount,
        at,
      })),
    ).toEqual(
      pointOrders.map((order) => ({
        memberId: order.buyerId,
        orderNo: order.orderNo,
        amount: -order.point,
        at: order.date,
      })),
    );
  });

  it("연관 거래는 그 회원의 실제 주문이고, 처리일은 결제 뒤 · 시연 기준일(10-19) 전이다", () => {
    for (const entry of POINT_LEDGER) {
      expect(entry.at < "2026-10-19").toBe(true);
      if (!entry.orderNo) continue;
      const order = ORDERS.find(
        (item) =>
          item.orderNo === entry.orderNo && item.buyerId === entry.memberId,
      );
      expect(order, entry.id).toBeDefined();
      expect(entry.at >= order!.date.slice(0, 16)).toBe(true);
    }
  });

  /*
   * 판정 Q12 — 리뷰(후기 지급)는 판매 구매확정 · 렌트 반납완료 뒤. 처리단위가 아직 확정 전인 6행은
   * 처리단위를 바꿀지 행을 뺄지 정하지 않아 예외로 둔다(반영 단계 2b 보고)
   */
  it("리뷰 지급은 그 처리단위 확정 뒤다 — 확정 전 처리단위 6행만 예외", () => {
    const pending = new Set([
      "U-R09",
      "U-R22",
      "U-S07",
      "U-S08",
      "U-R10",
      "U-R17",
    ]);
    let checked = 0;
    for (const entry of POINT_LEDGER.filter((item) => item.kind === "earn")) {
      const units = ORDERS.filter(
        (order) =>
          order.orderNo === entry.orderNo && order.buyerId === entry.memberId,
      );
      if (units.every((order) => pending.has(order.id))) continue;
      for (const order of units) {
        expect(order.confirmedAt, entry.id).not.toBeNull();
        expect(entry.at > order.confirmedAt!, entry.id).toBe(true);
      }
      checked += 1;
    }
    expect(checked).toBe(12);
  });

  it("구분 4종이 다 있고, 지급은 리뷰 500·100P · 잔액이 음수로 내려가지 않는다", () => {
    expect(new Set(POINT_LEDGER.map((entry) => entry.kind))).toEqual(
      new Set(["earn", "use", "clawback", "manual"]),
    );
    for (const entry of POINT_LEDGER.filter((item) => item.kind === "earn")) {
      expect([500, 100]).toContain(entry.amount);
    }
    const running = new Map<string, number>();
    for (const entry of [...POINT_LEDGER].reverse()) {
      const next = (running.get(entry.memberId) ?? 0) + entry.amount;
      expect(next, entry.id).toBeGreaterThanOrEqual(0);
      running.set(entry.memberId, next);
    }
  });
});

describe("검색조건 (펼친 채로 · 즉시 적용)", () => {
  it("펼친 채로 열리고, 걸린 조건을 요약한다", async () => {
    const { user } = renderPage();

    expect(screen.getByRole("button", { name: /검색 닫기/ })).toBeVisible();
    expect(screen.getByText("조건 없음 (전체)")).toBeVisible();

    await user.type(searchBox(), "안지");

    expect(visibleNames()).toEqual(["안지성"]);
    expect(screen.getByText("회원명 «안지»")).toBeVisible();
  });

  it("검색 대상 기본은 회원명 — 이메일 글자는 걸리지 않는다", async () => {
    const { user } = renderPage();

    await user.type(searchBox(), "harin");

    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });

  it("아이디(이메일)로 바꾸면 대소문자 없이 찾는다 (원본 toLowerCase)", async () => {
    const { user } = renderPage();

    await chooseOption(user, "검색 대상", "아이디(이메일)");
    await user.type(searchBox(), "HARIN");

    expect(visibleNames()).toEqual(["노하린"]);
  });

  it("빈 상태의 [필터 초기화]와 바의 [초기화]가 전부 되돌린다", async () => {
    const { user } = renderPage();

    await user.type(searchBox(), "없는회원");
    expect(screen.queryByRole("table")).toBeNull();
    expect(
      screen.getByText(
        "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(bodyRows()).toHaveLength(10);
    expect(searchBox()).toHaveValue("");

    await chooseOption(user, "검색 대상", "아이디(이메일)");
    await user.type(searchBox(), "seo");
    expect(visibleNames()).toEqual(["서하준"]);
    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(bodyRows()).toHaveLength(10);
    expect(
      screen.getByRole("combobox", { name: "검색 대상" }),
    ).toHaveTextContent("회원명");
  });

  describe("업데이트 기간 빠른 선택", () => {
    beforeEach(() => {
      vi.useFakeTimers({ now: new Date(2026, 9, 19, 12), toFake: ["Date"] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("1주일(10.13~10.19) — 그 사이 업데이트된 네 명만", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "업데이트 기간" }));
      const panel = await screen.findByRole("dialog");
      await user.click(within(panel).getByRole("button", { name: "1주일" }));

      expect(visibleNames()).toEqual(["임채원", "안지성", "황보라", "노하린"]);
      expect(
        screen.getByText("업데이트 기간 2026.10.13~2026.10.19"),
      ).toBeVisible();
    });
  });
});

describe("정렬 (보유 · 누적 지급 · 누적 차감 · 업데이트 일시)", () => {
  it("보유 포인트 — 오름 → 내림 → 해제, No 는 정렬해도 위에서부터 큰 수", async () => {
    const { user } = renderPage();

    await user.click(sortButton("보유 포인트"));
    expect(column(CELL.balance).slice(0, 3)).toEqual(["0P", "100P", "500P"]);
    expect(visibleNames()[0]).toBe("오세린");
    expect(column(CELL.no)[0]).toBe("11");

    await user.click(sortButton("보유 포인트"));
    expect(visibleNames().slice(0, 3)).toEqual(["홍다인", "임채원", "황보라"]);

    await user.click(sortButton("보유 포인트"));
    expect(
      screen.getByRole("columnheader", { name: /보유 포인트/ }),
    ).toHaveAttribute("aria-sort", "none");
    expect(visibleNames()).toEqual(PAGE_ONE);
  });

  it("누적 차감 내림차순 — 노하린 3,000 · 안지성 2,000 · 오세린 500 · 서하준 400", async () => {
    const { user } = renderPage();

    await user.click(sortButton("누적 차감 포인트"));
    await user.click(sortButton("누적 차감 포인트"));

    expect(visibleNames().slice(0, 4)).toEqual([
      "노하린",
      "안지성",
      "오세린",
      "서하준",
    ]);
  });

  it("업데이트 일시 오름차순 — 가장 오래된 송예린이 맨 위, 정렬하면 1페이지로", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(sortButton("업데이트 일시"));

    expect(visibleNames()[0]).toBe("송예린");
    expect(
      screen.getByRole("button", { name: "1", current: "page" }),
    ).toBeInTheDocument();
  });
});

describe("페이지 (10 · 20 · 50 · 100)", () => {
  it("2페이지가 이어서 세고, 20개씩이면 한 페이지에 다 들어간다", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(visibleNames()).toEqual(["송예린"]);
    expect(column(CELL.no)).toEqual(["1"]);

    await chooseOption(user, "페이지당 개수", "20개씩 보기");
    expect(bodyRows()).toHaveLength(11);
    expect(column(CELL.no)[0]).toBe("11");
  });
});

describe("상세로 이동 — 행 어디를 눌러도 · 회원명 링크도", () => {
  it("행을 누르면 그 회원의 포인트 현황 상세로", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(within(rowOf("안지성")).getByText("2,500P"));

    expect(onNavSelect).toHaveBeenCalledWith(
      "/points/jisung.ahn%40example.com",
    );
  });

  it("회원명 링크도 같은 곳으로 — 한 번만 이동한다", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(screen.getByRole("button", { name: "노하린" }));

    expect(onNavSelect).toHaveBeenCalledTimes(1);
    expect(onNavSelect).toHaveBeenCalledWith("/points/harin.noh%40example.com");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  afterEach(() => window.history.replaceState(null, "", "/points"));

  it("loading — 머리 글자는 남기고 값만 스켈레톤이다", () => {
    renderPage("?preview=loading");

    expect(screen.getByRole("columnheader", { name: "회원명" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "임채원" })).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 값이 있어도 빈 상태를 보여준다", () => {
    renderPage("?preview=empty");

    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });

  it("refreshing — 이전 값을 흐리게 둔다", async () => {
    renderPage("?preview=refreshing");

    expect(screen.getByRole("button", { name: "임채원" })).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
