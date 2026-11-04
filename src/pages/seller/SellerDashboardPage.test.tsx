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
      "확정 거래액 (정가) 1,979,000원 목록 열기",
      "차감 (수수료·PG) 244,205원 목록 열기",
      "지급 예정액 1,639,695원 목록 열기",
    ])
      expect(
        within(metrics).getByRole("button", { name: label }),
      ).toBeInTheDocument();
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
