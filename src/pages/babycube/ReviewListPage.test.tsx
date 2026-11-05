import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { MEMBERS } from "./MemberListPage.data";
import { DEMO_TODAY, ORDERS } from "./OrderListPage.data";
import { POINT_LEDGER } from "./PointListPage.data";
import { ReviewListPage } from "./ReviewListPage";
import { REVIEWS } from "./ReviewListPage.data";

/* -------------------------------------------------------------------------
 * 리뷰 관리 — 목록형 · 기획 v0.4 `SCREENS.reviewsAdmin`
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 원본 7열 · 사례표(작성자·셀러·상품·작성일·상태) ·
 * 노출/숨김 · `숨김` 접두어(흐림) · 작성일 최신순 · 페이지 크기 · 행/내용 클릭 → 상세 ·
 * 원본에 없는 것(대시·검색·엑셀·체크박스·No·미리보기 모달·답글 상태) · 원장과 맞물림 · `?preview=`.
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
  window.history.replaceState(null, "", `/reviews-admin${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <ReviewListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/reviews-admin"
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

/** 컬럼 순서: 작성자·셀러·상품·별점·내용·작성일·상태 */
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

describe("표 (원본 7열 · 표 하나뿐)", () => {
  it("제목 「리뷰 관리」, 목록 머리 「목록 (총 4건)」, 열 이름·순서가 원본 그대로", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: "리뷰 관리" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "목록 (총 4건)" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["작성자", "셀러", "상품", "별점", "내용", "작성일", "상태"]);
    expect(
      screen.getByRole("table").querySelectorAll("colgroup col"),
    ).toHaveLength(7);
  });

  it("사례표 — 작성일 최신순, 작성자 = 회원 실명, 셀러·상품 = 그 주문, 숨김 리뷰도 남는다", () => {
    renderPage();

    expect(
      bodyRows().map((row) => {
        const cells = cellsOf(row);
        return [cells[0], cells[1], cells[2], cells[4], cells[5], cells[6]];
      }),
    ).toEqual([
      [
        "노하린",
        "리틀베이비",
        "디럭스 유모차 클래식",
        "성장단계 추천으로 골랐는데 우리 아이한테 딱 맞아요.",
        "2026.10.14",
        "노출",
      ],
      [
        "노하린",
        "아기별상사",
        "기내반입 유모차 포켓",
        "숨김 (욕설·비방 내용)",
        "2026.09.20",
        "숨김",
      ],
      [
        "서하준",
        "아이랑",
        "바구니형 카시트 코지",
        "상태가 새것 같아요. 벨트가 살짝 빡빡한 것 빼면 만족합니다.",
        "2026.09.20",
        "노출",
      ],
      [
        "임채원",
        "베베하우스",
        "베드사이드 침대 코모",
        "조립 기사님이 친절했고 위생 상태 최고예요.",
        "2026.09.18",
        "노출",
      ],
    ]);
  });

  it("별점 — 별 5개 중 채운 별 개수 = 점수, 점수는 접근가능 이름으로", () => {
    renderPage();

    const ratings = bodyRows().map((row) => within(row).getByRole("img"));
    expect(ratings.map((rating) => rating.getAttribute("aria-label"))).toEqual([
      "별점 5점 (5점 만점)",
      "별점 1점 (5점 만점)",
      "별점 4점 (5점 만점)",
      "별점 5점 (5점 만점)",
    ]);
    const filled = (rating: HTMLElement) =>
      [...rating.querySelectorAll("svg")].filter((star) =>
        star.getAttribute("class")?.split(/\s+/).includes("fill-current"),
      ).length;
    expect(ratings.map(filled)).toEqual([5, 1, 4, 5]);
    expect(ratings[2].querySelectorAll("svg")).toHaveLength(5);
  });

  it("내용 셀은 한 줄 말줄임 · 열은 상태만 가운데", () => {
    renderPage();

    const cell = within(bodyRows()[0]).getAllByRole("cell")[4];
    /* 버튼은 줄바꿈을 안 하므로 안쪽 span 이 한 줄로 자른다(열 폭을 밀어내지 않게) */
    expect(cell.querySelector(".truncate")).not.toBeNull();
    within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .forEach((header, index) => {
        expect(header.className.split(/\s+/).includes("text-center")).toBe(
          index === 6,
        );
      });
  });

  it("원본에 없는 대시·검색·엑셀·체크박스·No·답글 상태가 없다", () => {
    renderPage();

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "초기화" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "No" })).toBeNull();
    expect(screen.queryByText(/답글 대기|답글 완료/)).toBeNull();
  });
});

describe("페이지 (원본 기본 10 · 10/20/50/100)", () => {
  it("4건 = 1페이지, 크기 선택지 4종", async () => {
    const { user } = renderPage();

    expect(bodyRows()).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("10"),
        expect.stringContaining("20"),
        expect.stringContaining("50"),
        expect.stringContaining("100"),
      ]),
    );
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });
});

describe("상세로 가는 길 (내용 · 행)", () => {
  it("행 어디를 눌러도 그 리뷰 상세로", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(within(bodyRows()[2]).getByText("아이랑"));
    expect(onNavSelect).toHaveBeenCalledWith("/reviews-admin/RV-30");
  });

  it("내용 링크도 같은 곳 — 한 번만 가고, 미리보기 모달이 없다", async () => {
    const { user, onNavSelect } = renderPage();

    const hiddenLink = screen.getByRole("button", {
      name: "숨김 (욕설·비방 내용)",
    });
    /* 접두어는 흐리게 — 상태 열에 이미 「숨김」 배지가 있다 */
    expect(within(hiddenLink).getByText("숨김").className).toContain(
      "text-text-minimal",
    );
    await user.click(hiddenLink);
    expect(onNavSelect).toHaveBeenCalledTimes(1);
    expect(onNavSelect).toHaveBeenLastCalledWith("/reviews-admin/RV-28");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("공통 데이터와 맞물림", () => {
  it("작성자 = 그 주문의 구매자 회원 · 작성일 = 원장의 그 주문 리뷰 지급 시각 · 결제 뒤 · 기준일 전", () => {
    for (const review of REVIEWS) {
      const order = ORDERS.find((item) => item.id === review.unit)!;
      const member = MEMBERS.find((item) => item.id === order.buyerId)!;
      const paid = POINT_LEDGER.filter(
        (entry) =>
          entry.kind === "earn" &&
          entry.orderNo === order.orderNo &&
          entry.memberId === member.id,
      );
      expect(review.author).toBe(member.name);
      expect([review.seller, review.product]).toEqual([
        order.seller,
        order.productName,
      ]);
      expect(paid.map((entry) => entry.at)).toEqual([review.date]);
      expect(review.date > order.date).toBe(true);
      expect(review.date.slice(0, 10) <= DEMO_TODAY).toBe(true);
    }
  });

  /* 판정 Q12 · 디자인 §1 — 판매 = 구매확정 후, 렌트 = 반납완료 후(처리단위의 매출 확정 시각) */
  it("작성일은 그 처리단위의 구매확정·반납완료 뒤다", () => {
    for (const review of REVIEWS) {
      const order = ORDERS.find((item) => item.id === review.unit)!;
      expect(order.confirmedAt, review.id).not.toBeNull();
      expect(review.date > order.confirmedAt!, review.id).toBe(true);
    }
  });

  it("처리단위 4개 = U-R19 · U-R30 · U-S35 · U-R28, 노출 3 · 숨김 1", () => {
    expect(REVIEWS.map((review) => [review.id, review.unit])).toEqual([
      ["RV-31", "U-R19"],
      ["RV-30", "U-R30"],
      ["RV-28", "U-S35"],
      ["RV-27", "U-R28"],
    ]);
    expect(REVIEWS.filter((review) => review.hidden)).toHaveLength(1);
  });

  it("숨김 리뷰는 원장 「리뷰 삭제로 회수」와 잇지 않는다 — 숨김은 삭제가 아니다", () => {
    const clawbackOrders = POINT_LEDGER.filter(
      (entry) => entry.kind === "clawback",
    ).map((entry) => entry.orderNo);
    for (const review of REVIEWS) {
      const order = ORDERS.find((item) => item.id === review.unit)!;
      expect(clawbackOrders).not.toContain(order.orderNo);
    }
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리는 남기고 값만 스켈레톤", () => {
    renderPage("?preview=loading");

    expect(screen.getByRole("columnheader", { name: "작성자" })).toBeVisible();
    expect(screen.queryByText("서하준")).toBeNull();
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

    expect(screen.getByText("서하준")).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
