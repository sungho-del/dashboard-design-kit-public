import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import {
  NOTICE_TOP,
  RENT_FLOW,
  SALE_FLOW,
  salesDaily,
} from "./SellerDashboardPage.data";
import { SellerDashboardPage } from "./SellerDashboardPage";
import { flowFoldOf } from "./SellerDashboardPage.data";
import {
  CS_GOLDEN,
  DAILY_GOLDEN,
  FLOW_GOLDEN,
  NOTICE_GOLDEN,
} from "./sellerDashboard.golden";

/* -------------------------------------------------------------------------
 * 셀러 대시보드 — 원본에서 뽑은 정답(`sellerDashboard.golden.ts`) · 캡처 `orig/00_dashboard`.
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
afterAll(() => vi.unstubAllGlobals());

function renderPage() {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SellerDashboardPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

describe("셀러 대시보드 — 원본 정답 대조", () => {
  it("최근 90일 일별 건수·금액이 원본 salesDaily 와 같다", () => {
    expect(salesDaily(90).map((d) => [d.label, d.count, d.amount])).toEqual(
      DAILY_GOLDEN,
    );
  });

  it("흐름 8단계 · 공지 3건 순서가 원본과 같다", () => {
    expect({
      sale: SALE_FLOW.map((s) => s.count),
      rent: RENT_FLOW.map((s) => s.count),
    }).toEqual(FLOW_GOLDEN);
    expect(NOTICE_TOP.map((n) => n.id)).toEqual(NOTICE_GOLDEN);
  });
});

describe("셀러 대시보드 화면", () => {
  it("지표 9개 — 원본 캡처 숫자 · 응대 큐는 원본 식", () => {
    renderPage();
    const metrics = screen.getByRole("region", { name: "핵심 지표" });
    for (const label of [
      "판매중 38개 목록 열기",
      "판매중지 6개 목록 열기",
      "품절 6개 목록 열기",
      `미답변 문의 ${CS_GOLDEN[0]}건 목록 열기`,
      `답글 미작성 리뷰 ${CS_GOLDEN[1]}건 목록 열기`,
      `1:1 문의 답변 대기 ${CS_GOLDEN[2]}건 목록 열기`,
      "확정 거래액 (판매가) 1,979,000원 목록 열기",
      "차감 (수수료·PG) 244,205원 목록 열기",
      "지급 예정액 1,639,695원 목록 열기",
    ])
      expect(
        within(metrics).getByRole("button", { name: label }),
      ).toBeInTheDocument();
  });

  /* 기획 답 2026-11-06 §2 #9 — 본사와 같게 렌트 먼저 */
  it("흐름 카드는 렌트 관리 → 판매 관리 순서다", () => {
    renderPage();
    const rent = screen.getByRole("heading", { name: "렌트 관리" });
    const sale = screen.getByRole("heading", { name: "판매 관리" });
    expect(
      rent.compareDocumentPosition(sale) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("지표·흐름·공지를 누르면 그 목록·상세로 간다", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(screen.getByRole("button", { name: /^지급 예정액/ }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-own");
    await user.click(
      screen.getByRole("button", { name: "렌트 관리 검수중 7건 목록 열기" }),
    );
    expect(onNavSelect).toHaveBeenLastCalledWith("/rent-insp-return");
    await user.click(
      screen.getByRole("button", { name: /7월 정산 명세 확인 요청/ }),
    );
    expect(onNavSelect).toHaveBeenLastCalledWith(
      `/seller-notice/${NOTICE_GOLDEN[0]}`,
    );
    await user.click(screen.getByRole("button", { name: "전체보기" }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/seller-notice");
  });
});

describe("흐름 카드 숫자 넘침 — 개발 요청 2026-11-12 44번", () => {
  it("세 자리부터 좁은 폭 2×2 접기 · 네 자리면 숫자 한 단계 작게 · 다섯 자리면 더 넓은 폭까지 접기", () => {
    expect(flowFoldOf([3, 12, 99])).toEqual({
      wide3: false,
      wide4: false,
      wide5: false,
    });
    expect(flowFoldOf([3, 120])).toEqual({
      wide3: true,
      wide4: false,
      wide5: false,
    });
    expect(flowFoldOf([1200])).toEqual({
      wide3: true,
      wide4: true,
      wide5: false,
    });
    expect(flowFoldOf([12000])).toEqual({
      wide3: true,
      wide4: true,
      wide5: true,
    });
  });

  it("흐름 목록은 컨테이너 안에 있다(폭 기준 접기)", () => {
    render(
      <ToastProvider position="bottom">
        <SellerDashboardPage
          navOpen
          onNavOpenChange={vi.fn()}
          activeNav="/"
          onNavSelect={vi.fn()}
        />
      </ToastProvider>,
    );
    const lists = screen.getAllByRole("list");
    expect(
      lists.some((l) => l.parentElement?.classList.contains("@container")),
    ).toBe(true);
  });
});
