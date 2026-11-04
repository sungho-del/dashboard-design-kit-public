import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CouponListPage } from "./CouponListPage";
import { COUPONS, couponStatus, type Coupon } from "./CouponListPage.data";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 쿠폰관리 (목록) — 기획 v0.4 `SCREENS.promo` · 조회 전용
 *
 * 렌더 여부가 아니라 **구성·숫자·동작**을 본다: 원본 8열(No + 7) · 원장 순서 · 셀 표기 ·
 * 본사 쿠폰 [본사] 배지 · 「발급 후 N일」 · [+ 쿠폰 등록](보드 06 · 개발 70a3e88) · 직영 매장 「베이비크루저」 ·
 * 상태 3종 파생(중지 > 만료, 기준일 2026-10-19) · 10건 페이지 + 크기 변경 · No 이어 세기 ·
 * 쿠폰명/행 → `/promo/{쿠폰코드}` · 원본에 없는 대시·검색·엑셀·체크박스·모달이 없다 ·
 * 보충 쿠폰이 주문의 쿠폰액과 맞물린다 · `?preview=`.
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

function renderPage(search = "") {
  window.history.replaceState(null, "", `/promo${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <CouponListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/promo"
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

const visibleNames = () => bodyRows().map((row) => cellsOf(row)[2]);

const rowOf = (name: string) => {
  const row = bodyRows().find((item) => cellsOf(item)[2] === name);
  if (!row) throw new Error(`행을 찾지 못했습니다: ${name}`);
  return row;
};

const coupon = (id: string) => COUPONS.find((item) => item.id === id)!;

describe("표 (원본 No + 7열 · 표 하나뿐)", () => {
  it("제목은 「쿠폰관리」, 열 이름·순서가 원본 그대로", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "쿠폰관리" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual([
      "No",
      "셀러명",
      "쿠폰명",
      "내용",
      "조건",
      "기간",
      "발행일",
      "상태",
    ]);
    expect(screen.getByText("목록 (총 21건)")).toBeVisible();
  });

  it("원본에 없는 대시·검색조건·엑셀·체크박스·정렬이 없다", () => {
    renderPage();

    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /검색/ })).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByText("발행대기")).toBeNull();
    expect(screen.queryByRole("button", { name: /정렬/ })).toBeNull();
  });

  it("원장 순서 그대로 — 본사 쿠폰 3건 · 보충 2건이 맨 위, CP-24xx 5건이 맨 아래(발행일 순 아님)", () => {
    expect(COUPONS.map((item) => item.id)).toEqual([
      "CP-2610-02",
      "CP-2610-03",
      "CP-2610-04",
      "CP-2610-01",
      "CP-2609-01",
      "CP-2608-01",
      "CP-2608-02",
      "CP-2608-03",
      "CP-2608-04",
      "CP-2607-01",
      "CP-2606-03",
      "CP-2606-04",
      "CP-2606-05",
      "CP-2605-03",
      "CP-2605-04",
      "CP-2604-02",
      "CP-2406-01",
      "CP-2406-02",
      "CP-2405-01",
      "CP-2405-02",
      "CP-2404-01",
    ]);
  });

  it.each([
    // 쿠폰명, No, 셀러명, 내용, 조건, 기간, 발행일, 상태
    [
      "가입 축하 쿠폰",
      "1",
      "본사",
      "20% 할인 최대 20,000원",
      "조건 없음",
      "발급 후 30일",
      "2026.10.05",
      "사용",
    ],
    [
      "겨울맞이 렌트 5,000원 할인",
      "2",
      "본사",
      "5,000원 할인",
      "50,000원 이상 구매",
      "2026.11.01 ~ 2026.11.30",
      "2026.10.15",
      "사용",
    ],
    [
      "카카오톡 채널 친구 추가 10,000원",
      "3",
      "본사",
      "10,000원 할인",
      "조건 없음",
      "2026.10.20 ~ 2026.12.31",
      "2026.10.17",
      "사용",
    ],
    [
      "렌트 3,000원 할인",
      "4",
      "베베하우스",
      "3,000원 할인",
      "조건 없음",
      "2026.10.01 ~ 2026.12.31",
      "2026.10.01",
      "사용",
    ],
    [
      "가을맞이 1만원 할인",
      "5",
      "아기별상사",
      "10,000원 할인",
      "100,000원 이상 구매",
      "2026.09.01 ~ 2026.10.31",
      "2026.09.01",
      "사용",
    ],
    [
      "리틀베이비 여름맞이 5,000원",
      "6",
      "리틀베이비",
      "5,000원 할인",
      "30,000원 이상 구매",
      "2026.08.01 ~ 2026.10.31",
      "2026.08.01",
      "사용",
    ],
    [
      "리틀베이비 상시 5% 할인",
      "8",
      "리틀베이비",
      "5% 할인",
      "조건 없음",
      "2026.08.01 ~ 기한 없음",
      "2026.08.01",
      "사용",
    ],
    [
      "리틀베이비 재구매 10% 할인",
      "9",
      "리틀베이비",
      "10% 할인 최대 10,000원",
      "조건 없음",
      "2026.08.02 ~ 2026.09.30",
      "2026.08.02",
      "사용중지",
    ],
    [
      "주말 완구 5%",
      "10",
      "장난감아저씨",
      "5% 할인",
      "조건 없음",
      "2026.07.01 ~ 2026.07.20",
      "2026.07.01",
      "만료",
    ],
  ])("%s — 셀 표기", (name, ...expected) => {
    renderPage();

    const cells = cellsOf(rowOf(name));
    expect([cells[0], cells[1], ...cells.slice(3)]).toEqual(expected);
  });

  it("2·3페이지 행도 원본 표기 — 한도+최소금액 둘 다 · 직영 매장 쿠폰은 「베이비크루저」", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "2" }));

    expect(cellsOf(rowOf("수면용품 7,000원 할인"))).toEqual([
      "13",
      "포근하우스",
      "수면용품 7,000원 할인",
      "7,000원 할인",
      "50,000원 이상 구매",
      "2026.06.04 ~ 2026.09.04",
      "2026.06.04",
      "만료",
    ]);
    expect(cellsOf(rowOf("첫 렌트 30% 할인")).slice(3, 6)).toEqual([
      "30% 할인 최대 20,000원",
      "50,000원 이상 구매",
      "2026.06.01 ~ 2026.12.31",
    ]);

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(cellsOf(rowOf("봄맞이 유모차 기획전 15%"))).toEqual([
      "21",
      "베이비크루저",
      "봄맞이 유모차 기획전 15%",
      "15% 할인 최대 50,000원",
      "조건 없음",
      "2026.04.01 ~ 2026.04.30",
      "2026.04.01",
      "사용중지",
    ]);
  });
});

describe("본사 쿠폰 (보드 06·07 · 개발 70a3e88)", () => {
  const sellerCell = (name: string) =>
    within(rowOf(name)).getAllByRole("cell")[1];

  it("본사가 등록한 쿠폰은 셀러명 칸에 글자 없이 [본사] 배지만", () => {
    renderPage();

    for (const name of [
      "가입 축하 쿠폰",
      "겨울맞이 렌트 5,000원 할인",
      "카카오톡 채널 친구 추가 10,000원",
    ]) {
      const cell = sellerCell(name);
      const badge = within(cell).getByText("본사");
      expect(badge.className).toContain("rounded-full");
      expect(cell.textContent).toBe("본사");
    }
    /* 셀러 쿠폰은 글자 그대로 — 배지가 없다 */
    expect(
      sellerCell("렌트 3,000원 할인").querySelector(".rounded-full"),
    ).toBeNull();
  });

  it("직영 매장 쿠폰(CP-2404-01)은 셀러 쿠폰 — 「베이비크루저」, 배지 없음", () => {
    const direct = coupon("CP-2404-01");
    expect(direct.seller).toBe("베이비크루저");
    expect(direct.hq).toBeNull();
    expect(COUPONS.filter((item) => item.hq).map((item) => item.id)).toEqual([
      "CP-2610-02",
      "CP-2610-03",
      "CP-2610-04",
    ]);
  });

  it("가입 쿠폰 샘플 = 도메인모델 #11 (정률 20% · 최대 20,000원 · 발급 후 30일 · 중복 가능 · 전체 · 사용)", () => {
    const signup = coupon("CP-2610-02");
    expect(signup).toMatchObject({
      discountType: "rate",
      discountValue: 20,
      discountMax: 20000,
      startsOn: null,
      endsOn: null,
      stored: "사용",
      hq: {
        issueMethod: "가입자동",
        validDays: 30,
        target: "전체",
        stackable: true,
      },
    });
  });

  it("[+ 쿠폰 등록] 은 「목록 (총 N건)」 줄의 주 버튼 — 등록 폼으로 간다", async () => {
    const { user, onNavSelect } = renderPage();

    const add = screen.getByRole("button", { name: "쿠폰 등록" });
    expect(add.className).toContain("bg-action-primary");
    await user.click(add);
    expect(onNavSelect).toHaveBeenCalledWith("/promo/new");
  });

  it("본사 쿠폰 행도 같은 상세 경로로 간다(상세가 수정 폼을 그린다)", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(screen.getByRole("button", { name: "가입 축하 쿠폰" }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/promo/CP-2610-02");
  });
});

describe("상태 — 저장값 사용/사용중지 + 파생 만료 (기준일 2026-10-19)", () => {
  const ids = (status: string) =>
    COUPONS.filter((item) => couponStatus(item) === status).map(
      (item) => item.id,
    );

  it("사용 10 · 만료 8 · 사용중지 3", () => {
    expect(ids("active")).toEqual([
      "CP-2610-02",
      "CP-2610-03",
      "CP-2610-04",
      "CP-2610-01",
      "CP-2609-01",
      "CP-2608-01",
      "CP-2608-02",
      "CP-2608-03",
      "CP-2406-01",
      "CP-2405-01",
    ]);
    expect(ids("expired")).toEqual([
      "CP-2607-01",
      "CP-2606-03",
      "CP-2606-04",
      "CP-2606-05",
      "CP-2605-03",
      "CP-2605-04",
      "CP-2604-02",
      "CP-2406-02",
    ]);
    expect(ids("suspended")).toEqual([
      "CP-2608-04",
      "CP-2405-02",
      "CP-2404-01",
    ]);
  });

  it("중지가 만료보다 앞선다 — 기한이 지난 사용중지는 사용중지", () => {
    // CP-2405-02 종료 2026-08-15 < 기준일
    expect(coupon("CP-2405-02").endsOn! < "2026-10-19").toBe(true);
    expect(couponStatus(coupon("CP-2405-02"))).toBe("suspended");
  });

  it("종료일 당일은 아직 사용 · 다음 날부터 만료 · 기한 없음은 만료되지 않는다", () => {
    const base = coupon("CP-2608-01");
    expect(couponStatus(base, "2026-10-31")).toBe("active");
    expect(couponStatus(base, "2026-11-01")).toBe("expired");
    expect(couponStatus(coupon("CP-2608-03"), "2099-01-01")).toBe("active");
  });

  it("시작일이 기준일보다 뒤여도 「사용」 — 발행대기 분기가 없다", () => {
    const future: Coupon = {
      ...coupon("CP-2610-01"),
      startsOn: "2026-12-01",
    };
    expect(couponStatus(future)).toBe("active");
  });
});

describe("보충 쿠폰 ↔ 주문 쿠폰액 (주문·정산 숫자 그대로)", () => {
  it.each([
    ["U-R09", "CP-2610-01", 3000],
    ["U-S35", "CP-2609-01", 10000],
    ["U-S07", "CP-2608-01", 5000],
    ["U-S31", "CP-2608-01", 5000],
  ])(
    "%s 는 %s(같은 셀러 · 그 날짜에 유효 · 조건 충족)",
    (orderId, couponId, amount) => {
      const order = ORDERS.find((item) => item.id === orderId)!;
      const target = coupon(couponId);
      const paidOn = order.orderedAt.slice(0, 10);

      expect(order.coupon).toBe(amount);
      expect(target.discountType).toBe("amount");
      expect(target.discountValue).toBe(amount);
      expect(target.seller).toBe(order.seller);
      expect(target.issuedOn <= paidOn).toBe(true);
      expect(target.startsOn! <= paidOn).toBe(true);
      expect(paidOn <= target.endsOn!).toBe(true);
      expect(target.stored).toBe("사용");
    },
  );
});

describe("페이지 (10/20/50/100 · 기본 10)", () => {
  it("21건 = 1페이지 10건 + 2페이지 10건 + 3페이지 1건, No 는 이어진다", async () => {
    const { user } = renderPage();

    expect(bodyRows()).toHaveLength(10);
    expect(bodyRows().map((row) => cellsOf(row)[0])).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 1)),
    );

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(bodyRows().map((row) => cellsOf(row)[0])).toEqual(
      Array.from({ length: 10 }, (_, i) => String(i + 11)),
    );
    expect(visibleNames()[0]).toBe("리틀베이비 웰컴 15%");

    await user.click(screen.getByRole("button", { name: "3" }));
    expect(bodyRows().map((row) => cellsOf(row)[0])).toEqual(["21"]);
  });

  it("50개씩 보기로 바꾸면 한 페이지에 21건, 페이지 버튼이 사라진다", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("button", { name: "2" }));

    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    await user.click(
      within(listbox).getByRole("option", { name: "50개씩 보기" }),
    );

    expect(bodyRows()).toHaveLength(21);
    expect(cellsOf(bodyRows()[0])[0]).toBe("1");
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
  });
});

describe("상세로 가는 길 (쿠폰명 · 행)", () => {
  it("행 어디를 눌러도 그 쿠폰 상세로", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(within(rowOf("주말 완구 5%")).getByText("장난감아저씨"));
    expect(onNavSelect).toHaveBeenCalledWith("/promo/CP-2607-01");
  });

  it("쿠폰명 링크도 같은 곳 — 행 클릭과 겹쳐 두 번 가지 않고, 미리보기 모달이 없다", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(
      screen.getByRole("button", { name: "리틀베이비 여름맞이 5,000원" }),
    );
    expect(onNavSelect).toHaveBeenCalledTimes(1);
    expect(onNavSelect).toHaveBeenLastCalledWith("/promo/CP-2608-01");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리는 남기고 값만 스켈레톤", () => {
    renderPage("?preview=loading");

    expect(screen.getByRole("columnheader", { name: "쿠폰명" })).toBeVisible();
    expect(screen.queryByText("주말 완구 5%")).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 원본 공용 빈 상태 문구", () => {
    renderPage("?preview=empty");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    expect(screen.queryByRole("button", { name: "필터 초기화" })).toBeNull();
  });

  it("refreshing — 값을 흐리게 둔다", async () => {
    renderPage("?preview=refreshing");

    expect(screen.getByText("주말 완구 5%")).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
