import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { CouponDetailPage } from "./CouponDetailPage";

/* -------------------------------------------------------------------------
 * 쿠폰 상세 — 조회형 · 기획 v0.4 `couponForm`
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 4구역 이름·순서 · 할인 표기(정률 한도 / 정액) ·
 * 조건·기간이 목록과 같은 표기 · 만료 쿠폰에만 보조문 · 사용중지는 기한이 지나도 사용중지 ·
 * 접기 · 찾을 수 없음(없는 코드 · 경로 두 조각) · [목록]만 · 쿠폰이 바뀌면 처음부터 · `?preview=`.
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
      <CouponDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/promo"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** InfoList 의 한 줄 — `<dt>` 라벨 옆의 값 */
function valueOf(label: string): string {
  const term = screen
    .getAllByText(label)
    .find((element) => element.tagName === "DT");
  if (!term) throw new Error(`라벨을 찾지 못했습니다: ${label}`);
  return term.nextElementSibling?.textContent ?? "";
}

const EXPIRED_NOTE = "사용 기간이 지나 만료로 표시됩니다";

describe("CouponDetailPage (쿠폰 상세)", () => {
  it("머리 — 제목 「쿠폰 상세」 · 쿠폰코드·셀러·쿠폰명 · 상태 배지", () => {
    renderAt("/promo/CP-2608-01");

    expect(
      screen.getByRole("heading", { level: 1, name: "쿠폰 상세" }),
    ).toBeVisible();
    expect(
      screen.getByText("CP-2608-01 · 리틀베이비 · 리틀베이비 여름맞이 5,000원"),
    ).toBeVisible();
  });

  it("구역 4개 — 원본 이름·순서", () => {
    renderAt("/promo/CP-2608-01");

    expect(
      screen
        .getAllByRole("button", { name: / 접기$/ })
        .filter((button) => button.getAttribute("aria-label") !== "메뉴 접기")
        .map((button) => button.getAttribute("aria-label")),
    ).toEqual([
      "기본 정보 접기",
      "할인 내용 접기",
      "사용 기간 접기",
      "상태 접기",
    ]);
  });

  it("정액 쿠폰 CP-2608-01 — 9줄 값", () => {
    renderAt("/promo/CP-2608-01");

    expect(valueOf("셀러명")).toBe("리틀베이비");
    expect(valueOf("쿠폰명")).toBe("리틀베이비 여름맞이 5,000원");
    expect(valueOf("쿠폰코드")).toBe("CP-2608-01");
    expect(valueOf("할인 유형")).toBe("정액 (원)");
    expect(valueOf("할인 내용")).toBe("정액 5,000원");
    expect(valueOf("사용 조건")).toBe("30,000원 이상 구매");
    expect(valueOf("사용 기간")).toBe("2026.08.01 ~ 2026.10.31");
    expect(valueOf("상태")).toBe("사용");
    expect(valueOf("발행일")).toBe("2026.08.01");
  });

  it("정률 + 한도 CP-2406-01 — 값은 굵게, 한도는 괄호", () => {
    renderAt("/promo/CP-2406-01");

    expect(valueOf("할인 유형")).toBe("정률 (%)");
    expect(valueOf("할인 내용")).toBe("정률 30% (최대 20,000원)");
    expect(screen.getByText("30%").className).toContain("body-medium-bold");
    expect(valueOf("사용 조건")).toBe("50,000원 이상 구매");
    expect(valueOf("사용 기간")).toBe("2026.06.01 ~ 2026.12.31");
  });

  it("조건 없음 · 기한 없음 CP-2608-03", () => {
    renderAt("/promo/CP-2608-03");

    expect(valueOf("할인 내용")).toBe("정률 5%");
    expect(valueOf("사용 조건")).toBe("조건 없음");
    expect(valueOf("사용 기간")).toBe("2026.08.01 ~ 기한 없음");
    expect(valueOf("상태")).toBe("사용");
  });

  it("만료 CP-2606-03 — 만료 배지 + 보조문 (「(저장값: …)」 없음 · 부록 A B18)", () => {
    renderAt("/promo/CP-2606-03");

    expect(valueOf("상태")).toBe(`만료${EXPIRED_NOTE}`);
  });

  it("사용중지는 기한이 지나도 사용중지 — 보조문 없음 (CP-2405-02 종료 08.15)", () => {
    renderAt("/promo/CP-2405-02");

    expect(valueOf("상태")).toBe("사용중지");
    expect(screen.queryByText(EXPIRED_NOTE)).toBeNull();
  });

  it("직영 매장 쿠폰 CP-2404-01 — 셀러 쿠폰이라 조회 화면 · 셀러명 「베이비크루저」(보드 06)", () => {
    renderAt("/promo/CP-2404-01");

    expect(
      screen.getByRole("heading", { level: 1, name: "쿠폰 상세" }),
    ).toBeVisible();
    expect(valueOf("셀러명")).toBe("베이비크루저");
    expect(valueOf("할인 내용")).toBe("정률 15% (최대 50,000원)");
  });

  it("본사가 등록한 쿠폰은 같은 경로에서 수정 폼을 그린다(보드 06 · 개발 70a3e88)", () => {
    renderAt("/promo/CP-2610-02");

    expect(
      screen.getByRole("heading", { level: 1, name: "쿠폰 상세 (수정)" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: /쿠폰명/ })).toHaveValue(
      "가입 축하 쿠폰",
    );
    expect(screen.getByRole("button", { name: "저장하기" })).toBeVisible();
  });

  it("구역 접기 — 접으면 그 구역 값만 사라진다", async () => {
    const { user } = renderAt("/promo/CP-2608-01");

    await user.click(screen.getByRole("button", { name: "할인 내용 접기" }));
    expect(screen.queryByText("할인 유형")).toBeNull();
    expect(valueOf("쿠폰코드")).toBe("CP-2608-01");
    expect(
      screen.getByRole("button", { name: "할인 내용 펼치기" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("하단 바는 [목록] 하나 — 쿠폰관리로 간다(저장·취소·확인 없음)", async () => {
    const { user, onNavSelect } = renderAt("/promo/CP-2608-01");

    expect(screen.queryByRole("button", { name: "확인" })).toBeNull();
    expect(screen.queryByRole("button", { name: "취소" })).toBeNull();
    expect(screen.queryByRole("button", { name: /저장/ })).toBeNull();

    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/promo");
  });

  describe("찾을 수 없음", () => {
    it.each(["/promo/CP-9999-99", "/promo/CP-2608-01/extra"])(
      "%s — 문구 + [쿠폰관리로] → /promo",
      async (path) => {
        const { user, onNavSelect } = renderAt(path);

        expect(screen.getByText("찾을 수 없는 쿠폰입니다")).toBeVisible();
        expect(
          screen.getByText("해당 항목이 존재하지 않거나 삭제되었습니다."),
        ).toBeVisible();
        expect(screen.queryByText("기본 정보")).toBeNull();

        await user.click(screen.getByRole("button", { name: "쿠폰관리로" }));
        expect(onNavSelect).toHaveBeenCalledWith("/promo");
      },
    );
  });

  it("다른 쿠폰으로 가면 처음부터 — 접힘이 묻어가지 않는다", async () => {
    const { user } = renderAt("/promo/CP-2608-01");
    await user.click(screen.getByRole("button", { name: "상태 접기" }));
    expect(screen.queryByText("발행일")).toBeNull();

    act(() => navigate("/promo/CP-2606-03"));

    expect(valueOf("쿠폰코드")).toBe("CP-2606-03");
    expect(valueOf("발행일")).toBe("2026.06.01");
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 구역 제목은 남기고 값만 스켈레톤", () => {
      renderAt("/promo/CP-2608-01?preview=loading");

      expect(screen.getByText("기본 정보")).toBeVisible();
      expect(screen.queryByText("쿠폰코드")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값은 보이고 구역이 바쁨 표시", () => {
      renderAt("/promo/CP-2608-01?preview=refreshing");

      expect(valueOf("쿠폰코드")).toBe("CP-2608-01");
      const busy = document.body.querySelectorAll('[aria-busy="true"]');
      expect(busy.length).toBe(4);
      expect(
        within(busy[0] as HTMLElement).getByText("기본 정보"),
      ).toBeVisible();
    });
  });
});
