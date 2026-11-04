import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SellerApp } from "./SellerApp";
import { SELLER_SCREENS } from "./pages/seller/SellerScreenIndexPage.data";
import { NAV_COUNTS } from "./pages/sellerGnbSections";

/**
 * 셀러 앱 라우팅 — **등록된 화면이 전부 실제로 열리는가**(본사 `App.test.tsx` 와 같은 원칙).
 * 화면 목록(`SELLER_SCREENS`)을 단일 원천으로 삼는다. 셀러 전달본에 이 파일이 들어간다.
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

function renderAt(path: string) {
  window.history.pushState(null, "", path);
  return render(<SellerApp />);
}

afterEach(() => {
  window.history.pushState(null, "", "/");
});

const pageTitle = () =>
  screen.getAllByRole("heading", { level: 1 })[0].textContent?.trim();

/** 원본 `SCREEN_MAP` menu:true 순서 그대로 — 그룹 라벨 · 항목 라벨 */
const ORIGINAL_MENU: [string, string[]][] = [
  ["", ["대시보드"]],
  ["상품 관리", ["상품 관리", "상품 등록"]],
  [
    "판매 관리",
    [
      "주문 통합 관리",
      "발주 관리",
      "배송 관리",
      "취소 관리",
      "반품 관리",
      "교환 관리",
    ],
  ],
  [
    "렌트 관리",
    [
      "렌트 주문 통합 관리",
      "렌트 발주 관리",
      "배송 관리",
      "대여·연체 관리",
      "검수·반납 관리",
      "취소 관리",
      "반품 관리",
    ],
  ],
  [
    "정산 관리",
    ["매출 정산", "보증금 내역", "정산 내역/명세서", "세금계산서·증빙"],
  ],
  ["마케팅", ["쿠폰관리"]],
  ["게시판 관리", ["공지사항", "문의 관리", "리뷰 관리", "1:1 문의"]],
  ["시스템·운영 관리", ["스토어 정보 · 설정", "공휴일 관리"]],
];

describe("SellerApp (셀러 전달본)", () => {
  it.each(SELLER_SCREENS.map((s) => [s.navId, s.name] as const))(
    "%s 는 폴백이 아니라 그 화면으로 열린다 (%s)",
    (path) => {
      renderAt(path);
      expect(pageTitle()).not.toBe("화면 목록");
    },
  );

  it("없는 경로는 화면 목록으로 떨어진다", () => {
    renderAt("/이런-경로는-없다");
    expect(pageTitle()).toBe("화면 목록");
  });

  /* 본사 경로가 셀러 앱에 새지 않는다 — 같은 저장소에 두 앱이 있어서 생길 수 있는 사고 */
  it.each(["/members", "/orders-all", "/settle-seller", "/display"])(
    "본사 전용 경로 %s 는 셀러 앱에서 화면 목록으로 떨어진다",
    (path) => {
      renderAt(path);
      expect(pageTitle()).toBe("화면 목록");
    },
  );

  it("GNB 가 원본 메뉴(8그룹 27항목) 순서·라벨 그대로다 + 화면 목록", () => {
    renderAt("/");
    const labels = within(screen.getByRole("navigation"))
      .getAllByRole("button")
      /* 배지(「 처리 대기 N건」)는 라벨이 아니다 */
      .map((b) => b.textContent?.replace(/ 처리 대기 \d+건$/, "").trim())
      .filter((t): t is string => !!t);
    expect(labels).toEqual([
      ...ORIGINAL_MENU.flatMap(([, items]) => items),
      "화면 목록",
    ]);
  });

  it("GNB 그룹 라벨이 원본과 같다 (대시보드 그룹은 항목명과 같아 비운다)", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation");
    for (const [group] of ORIGINAL_MENU.filter(([g]) => g)) {
      expect(within(nav).getAllByText(group).length).toBeGreaterThan(0);
    }
  });

  /* 원본을 브라우저로 열어 읽은 값(NAV_BADGE · TODO.rentOverdue) — 같은 시드·같은 식이면 같아야 한다 */
  it("처리 대기 배지 수가 원본과 같다", () => {
    expect(NAV_COUNTS).toEqual({
      saleProc: 9,
      saleCancel: 5,
      saleReturn: 5,
      saleExchange: 5,
      rentList: 11,
      rentUse: 3,
      rentInspReturn: 4,
      rentCancel: 2,
      rentRma: 2,
      rentDeposit: 6,
    });
  });

  it("배지는 「처리 대기 N건」으로 읽힌다 — 판매·렌트의 같은 이름 메뉴도 배지로 갈린다", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation");
    expect(
      within(nav).getByRole("button", {
        name: /^발주 관리\s*처리 대기\s*9건$/,
      }),
    ).toBeVisible();
    expect(
      within(nav).getByRole("button", {
        name: /^취소 관리\s*처리 대기\s*5건$/,
      }),
    ).toBeVisible();
    expect(
      within(nav).getByRole("button", {
        name: /^취소 관리\s*처리 대기\s*2건$/,
      }),
    ).toBeVisible();
  });

  it("GNB 로 이동하면 주소창이 셀러 경로로 바뀐다", async () => {
    renderAt("/");
    const nav = screen.getByRole("navigation");
    await userEvent.click(
      within(nav).getByRole("button", { name: /^발주 관리/ }),
    );
    expect(window.location.pathname).toBe("/sale-proc");
    expect(pageTitle()).toBe("발주 관리");
  });
});
