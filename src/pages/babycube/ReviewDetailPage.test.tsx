import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ReviewDetailPage } from "./ReviewDetailPage";

/* -------------------------------------------------------------------------
 * 리뷰 상세 — 기획 v0.4 `DETAILS.reviewDetail`
 *
 * 내용과 동작을 본다: 머리 · 구역 2개 · 리뷰 정보 값(원본 줄 순서) · 답글 없음 문구 · 노출/숨김 두 갈래 ·
 * 빈·공백 사유 오류(입력칸 아래 · 토스트 없음) · 통과하면 알림만(배지·버튼 그대로) · 60자 ·
 * 복원 알림 · [목록] 이동 · 찾을 수 없음.
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <ReviewDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/reviews-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const HIDE_TOAST =
  "리뷰가 숨김 처리되었습니다(포인트 자동 회수 없음 — 악용 건은 포인트 관리에서 수동 처리).";

describe("리뷰 정보 (노출 중 RV-30)", () => {
  it("머리 — 제목 「리뷰 상세」 · id·작성자·상품 · 노출 배지", () => {
    renderAt("/reviews-admin/RV-30");

    expect(
      screen.getByRole("heading", { level: 1, name: "리뷰 상세" }),
    ).toBeVisible();
    expect(
      screen.getByText("RV-30 · 서하준 · 바구니형 카시트 코지"),
    ).toBeVisible();
  });

  it("구역 2개 — 원본 이름·순서", () => {
    renderAt("/reviews-admin/RV-30");

    expect(
      screen
        .getAllByRole("button", { name: / 접기$/ })
        .filter((button) => button.getAttribute("aria-label") !== "메뉴 접기")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual(["리뷰 정보 접기", "노출 관리 접기"]);
  });

  it("값 — 작성자·상태·별점·작성일·셀러·상품 (원본 줄 순서) · 주문번호 · 내용 전문 · 답글 없음은 흐린 문구", () => {
    renderAt("/reviews-admin/RV-30");

    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      ["작성자", "상태", "별점", "작성일", "셀러", "상품", "주문번호"],
    );
    expect(
      screen.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual([
      "서하준",
      "노출",
      "(4점)",
      "2026.09.20",
      "아이랑",
      "바구니형 카시트 코지",
      "20260829190512",
    ]);
    expect(
      screen.getByRole("img", { name: "별점 4점 (5점 만점)" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "상태가 새것 같아요. 벨트가 살짝 빡빡한 것 빼면 만족합니다.",
      ),
    ).toBeVisible();
    expect(screen.getByText("답글 없음").className).toContain(
      "text-text-minimal",
    );
    expect(screen.queryByText("-")).toBeNull();
    /* 부록 A C78 — 판매자 답글 도움말 삭제 */
    expect(screen.queryByText(/본사는 내용만 확인합니다/)).toBeNull();
  });

  it("구역을 접으면 값이 사라진다", async () => {
    const { user } = renderAt("/reviews-admin/RV-30");

    await user.click(screen.getByRole("button", { name: "리뷰 정보 접기" }));
    expect(screen.queryByText("아이랑")).toBeNull();
    expect(
      screen.getByRole("button", { name: "리뷰 정보 펼치기" }),
    ).toBeVisible();
  });
});

describe("노출 관리 — 노출 중이면 [숨김 처리]", () => {
  it("사유 입력칸(필수 · 60자) + 자동 회수 없음 도움말, 버튼은 [숨김 처리]만", () => {
    renderAt("/reviews-admin/RV-31");

    const input = screen.getByRole("textbox", { name: /숨김 사유/ });
    expect(input).toHaveAttribute("maxLength", "60");
    expect(input).toHaveAttribute("placeholder", "숨김 사유 1줄 (필수)");
    expect(input).toBeRequired();
    expect(screen.getByText(/자동 회수되지 않습니다/)).toBeVisible();
    expect(screen.getByRole("button", { name: "숨김 처리" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
  });

  it("빈 사유·공백 사유는 입력칸 아래 오류로 멈춘다 — 알림 없음", async () => {
    const { user } = renderAt("/reviews-admin/RV-31");

    await user.click(screen.getByRole("button", { name: "숨김 처리" }));
    expect(screen.getByText("숨김 사유를 입력해주세요.")).toBeVisible();
    expect(screen.queryByText(HIDE_TOAST)).toBeNull();

    await user.type(screen.getByRole("textbox", { name: /숨김 사유/ }), "   ");
    await user.click(screen.getByRole("button", { name: "숨김 처리" }));
    expect(screen.getByText("숨김 사유를 입력해주세요.")).toBeVisible();
    expect(screen.queryByText(HIDE_TOAST)).toBeNull();
  });

  it("사유가 있으면 알림만 — 배지·입력칸·버튼은 그대로", async () => {
    const { user } = renderAt("/reviews-admin/RV-31");

    await user.type(
      screen.getByRole("textbox", { name: /숨김 사유/ }),
      "광고성 내용",
    );
    await user.click(screen.getByRole("button", { name: "숨김 처리" }));

    expect(await screen.findByText(HIDE_TOAST)).toBeVisible();
    expect(screen.queryByText("숨김 사유를 입력해주세요.")).toBeNull();
    expect(screen.getAllByText("노출").length).toBeGreaterThan(0);
    expect(screen.queryByText("숨김")).toBeNull();
    expect(screen.getByRole("button", { name: "숨김 처리" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "복원" })).toBeNull();
  });

  it("60자를 넘겨 칠 수 없다", async () => {
    const { user } = renderAt("/reviews-admin/RV-31");

    const input = screen.getByRole("textbox", { name: /숨김 사유/ });
    await user.type(input, "가".repeat(70));
    expect(input).toHaveValue("가".repeat(60));
  });
});

describe("노출 관리 — 숨김 중이면 [복원] (RV-28)", () => {
  it("숨김 사유는 읽기 상자 · 복원 도움말 · 버튼은 [복원]만 · 내용은 원본 자리표시", () => {
    renderAt("/reviews-admin/RV-28");

    expect(
      screen.getByText("욕설·비방 포함 — 커뮤니티 가이드 위반"),
    ).toBeVisible();
    expect(
      screen.getByText(
        "복원하면 사용자 앱 상품 상세에 리뷰가 다시 노출되고 숨김 사유는 삭제됩니다.",
      ),
    ).toBeVisible();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("button", { name: "복원" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "숨김 처리" })).toBeNull();
    expect(screen.getByText("(욕설·비방 내용)")).toBeVisible();
    expect(
      screen.getAllByRole("definition").map((value) => value.textContent),
    ).toEqual([
      "노하린",
      "숨김",
      "(1점)",
      "2026.09.20",
      "아기별상사",
      "기내반입 유모차 포켓",
      "20260910114856",
    ]);
  });

  it("[복원] — 확인 없이 알림만, 화면은 그대로", async () => {
    const { user } = renderAt("/reviews-admin/RV-28");

    await user.click(screen.getByRole("button", { name: "복원" }));
    expect(await screen.findByText("리뷰가 복원되었습니다.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "복원" })).toBeVisible();
    expect(
      screen.getByText("욕설·비방 포함 — 커뮤니티 가이드 위반"),
    ).toBeVisible();
  });
});

describe("이동", () => {
  it("[목록] → 리뷰 관리", async () => {
    const { user, onNavSelect } = renderAt("/reviews-admin/RV-27");

    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/reviews-admin");
  });

  /* 판정 Q12 · 디자인 §1 — 주문 상품(처리단위) 1건당 리뷰 1개 · 주문번호는 그 처리단위의 주문 상세로 */
  it("주문번호 → 그 리뷰를 쓴 처리단위의 주문 상세", async () => {
    const { user, onNavSelect } = renderAt("/reviews-admin/RV-27");

    await user.click(screen.getByRole("button", { name: "20260820151024" }));
    expect(onNavSelect).toHaveBeenCalledWith("/orders-all/U-R28");
  });

  it("없는 리뷰 — 찾을 수 없음 + [리뷰 목록으로]", async () => {
    const { user, onNavSelect } = renderAt("/reviews-admin/RV-99");

    const empty = screen.getByText("찾을 수 없는 리뷰입니다").closest("div")!;
    expect(empty).toBeVisible();
    expect(
      screen.getByText("해당 항목이 존재하지 않거나 삭제되었습니다."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "숨김 처리" })).toBeNull();
    await user.click(
      within(document.body).getByRole("button", { name: "리뷰 목록으로" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/reviews-admin");
  });

  it("경로가 두 조각이면 찾을 수 없음", () => {
    renderAt("/reviews-admin/RV-30/extra");
    expect(screen.getByText("찾을 수 없는 리뷰입니다")).toBeVisible();
  });
});
