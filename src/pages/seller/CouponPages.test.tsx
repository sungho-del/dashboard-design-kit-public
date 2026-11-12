import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { CouponFormPage, CouponListPage } from "./CouponPages";
import type { SellerNavProps } from "./SettleParts";

/* -------------------------------------------------------------------------
 * 쿠폰관리 · 쿠폰 등록/수정 — 원본 캡처 `orig/35_promo`(5행) · `36_쿠폰등록` · `37_couponForm`.
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

function renderAt(Page: ComponentType<SellerNavProps>, path: string) {
  act(() => navigate(path));
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/promo"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}
const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("쿠폰관리 목록", () => {
  it("5행 — 원본 캡처의 내용·조건·기간·상태 표기", () => {
    renderAt(CouponListPage, "/promo");
    expect(screen.getByText("목록 (총 5건)")).toBeInTheDocument();
    const rows = bodyRows();
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText("5,000원 할인")).toBeInTheDocument();
    expect(within(rows[0]).getByText("30,000원 이상 구매")).toBeInTheDocument();
    expect(within(rows[1]).getByText("기한 없음")).toBeInTheDocument();
    expect(within(rows[2]).getByText("(최대 10,000원)")).toBeInTheDocument();
    expect(within(rows[2]).getByText("사용중지")).toBeInTheDocument();
    expect(within(rows[4]).getByText("사용")).toBeInTheDocument();
  });

  it("[쿠폰 등록] → 등록 폼 · 행 → 수정 폼", async () => {
    const { user, onNavSelect } = renderAt(CouponListPage, "/promo");
    await user.click(screen.getByRole("button", { name: "쿠폰 등록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/promo/new");
    await user.click(bodyRows()[3]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/promo/CP-2606-03");
  });
});

describe("쿠폰 등록/수정", () => {
  it("신규 — 비우고 등록하면 원본 문구가 칸 아래 · 채우면 등록 알림 후 목록", async () => {
    const { user, onNavSelect } = renderAt(CouponFormPage, "/promo/new");
    expect(
      screen.getByRole("heading", { name: "쿠폰 등록" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/등록 시 오늘 날짜로/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "쿠폰 등록" }));
    expect(screen.getByText("쿠폰명을 입력하세요.")).toBeInTheDocument();
    expect(screen.getByText("할인율을 입력하세요.")).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: /쿠폰명/ }),
      "가을 10%",
    );
    await user.type(screen.getByRole("textbox", { name: /할인율/ }), "10");
    await user.click(screen.getByRole("button", { name: "쿠폰 등록" }));
    expect(
      await screen.findByText("쿠폰이 등록되었습니다."),
    ).toBeInTheDocument();
    expect(onNavSelect).toHaveBeenCalledWith("/promo");
  });

  it("정액으로 바꾸면 최대 할인액 칸이 사라지고 라벨이 「할인 금액」", async () => {
    const { user } = renderAt(CouponFormPage, "/promo/new");
    expect(
      screen.getByRole("textbox", { name: /최대 할인액/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "정액 (원)" }));
    expect(screen.queryByRole("textbox", { name: /최대 할인액/ })).toBeNull();
    expect(
      screen.getByRole("textbox", { name: /할인 금액/ }),
    ).toBeInTheDocument();
  });

  it("수정 — 저장값으로 열리고 [저장하기]는 제자리 알림", async () => {
    const { user, onNavSelect } = renderAt(CouponFormPage, "/promo/CP-2608-01");
    expect(
      screen.getByRole("heading", { name: "쿠폰 상세 (수정)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("리틀베이비 여름맞이 5,000원"),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("5,000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30,000")).toBeInTheDocument();
    expect(screen.getByText("17/40")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "저장하기" }));
    expect(await screen.findByText("저장되었습니다.")).toBeInTheDocument();
    expect(onNavSelect).not.toHaveBeenCalled();
  });

  it("적용 대상(전체·렌트·판매) — 정책 P-MKT-001 · 보드 06 · 기본 전체", async () => {
    const { user } = renderAt(CouponFormPage, "/promo/new");
    expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "렌트" }));
    expect(screen.getByRole("radio", { name: "렌트" })).toBeChecked();
    expect(screen.getByText(/\[렌트 전용\]/)).toBeInTheDocument();
  });

  it("[시작일|종료일 지우기] — 값이 있을 때만 · 누르면 날짜가 비고 버튼이 사라진다(개발 요청 12번)", async () => {
    const { user } = renderAt(CouponFormPage, "/promo/CP-2608-01");
    const start = screen.getByRole("button", { name: "시작일 지우기" });
    expect(start).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "종료일 지우기" }));
    expect(screen.queryByRole("button", { name: "종료일 지우기" })).toBeNull();
    expect(screen.getByRole("button", { name: "종료일" })).toHaveTextContent(
      "날짜 선택",
    );
    await user.click(start);
    expect(screen.queryByRole("button", { name: "시작일 지우기" })).toBeNull();
  });

  it("신규 쿠폰은 날짜가 비어 [지우기]가 없다", () => {
    renderAt(CouponFormPage, "/promo/new");
    expect(screen.queryAllByRole("button", { name: /지우기/ })).toHaveLength(0);
  });

  it("없는 쿠폰 — 찾을 수 없음", () => {
    renderAt(CouponFormPage, "/promo/CP-0000-00");
    expect(screen.getByText("찾을 수 없는 쿠폰입니다")).toBeInTheDocument();
  });
});
