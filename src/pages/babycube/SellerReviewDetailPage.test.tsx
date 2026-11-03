import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { SellerReviewDetailPage } from "./SellerReviewDetailPage";

/* -------------------------------------------------------------------------
 * S04-D 입점 심사 상세 — 폼형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **정책**이다 —
 * **승인요청만 심사할 수 있는가** · **수수료율 없이 승인을 막는가** ·
 * **반려 사유를 강제하는가**(목록과 같은 창) · 승인은 확인 창을 거치는가 ·
 * 처리된 건의 승인일/반려 사유 표시 · 서류 미리보기 · 신청이 바뀌면 처음부터 시작하는가 ·
 * 신청 정보(셀러가 낸 것)를 못 고치게 두는가.
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

afterEach(() => window.history.replaceState(null, "", "/"));

function renderAt(applicationId: string, query = "") {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  window.history.replaceState(
    null,
    "",
    `/seller-review/${encodeURIComponent(applicationId)}${query}`,
  );

  render(
    <ToastProvider position="bottom">
      <SellerReviewDetailPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/seller-review"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

const section = (title: string) =>
  screen
    .getByRole("heading", { name: title })
    .closest("[data-variant]") as HTMLElement;

/** 페이지 헤더 — 이름과 **저장된** 심사 상태 배지가 있다 */
const header = () =>
  screen
    .getByRole("heading", { name: "입점 심사 상세" })
    .closest("header") as HTMLElement;

const APPLY = "신청 정보 (입점 전)";
const RESULT = "심사 결과 (입점 승인 후)";

/** 승인요청 · 승인됨 · 반려됨 (v0.4 `SELLER_REVIEW` 샘플) */
const REQUESTED = "SR-318";
const OTHER_REQUESTED = "SR-317";
const APPROVED = "SR-316";
const REJECTED = "SR-315";

const commissionBox = () =>
  within(section(RESULT)).getByRole("textbox", { name: /수수료율/ });

describe("SellerReviewDetailPage (S04-D 입점 심사 상세)", () => {
  describe("경로와 조회", () => {
    it("경로의 id 로 그 신청을 찾아 보여준다", () => {
      renderAt(REQUESTED);

      expect(within(section(APPLY)).getByText("코지베이비")).toBeVisible();
      expect(within(section(APPLY)).getByText("문지호")).toBeVisible();
      expect(within(header()).getByText("코지베이비")).toBeVisible();
      expect(within(header()).getByText("승인요청")).toBeVisible();
    });

    it("없는 신청이면 돌아갈 길을 준다", async () => {
      const { user, onNavSelect } = renderAt("SR-999");

      expect(screen.getByText("찾을 수 없는 신청입니다")).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "입점 심사 목록으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/seller-review");
    });
  });

  describe("신청 정보 — 셀러가 낸 것", () => {
    /** 저장 통로가 없어(원본 `noSave`) 입력칸으로 열지 않는다 */
    it("신청 정보에는 입력칸이 없다", () => {
      renderAt(REQUESTED);

      expect(within(section(APPLY)).queryByRole("textbox")).toBeNull();
    });

    it("사업자 유형·취급 유형·신청일(초까지)을 원본 표기로 낸다", () => {
      renderAt(REQUESTED);
      const apply = section(APPLY);

      expect(within(apply).getByText("법인")).toBeVisible();
      expect(within(apply).getByText("렌트+판매")).toBeVisible();
      expect(within(apply).getByText("2026.06.20 14:32:08")).toBeVisible();
    });

    it("서류를 등록번호·신고번호와 함께 내고, [보기] 는 미리보기 창을 연다", async () => {
      const { user } = renderAt(REQUESTED);
      const apply = section(APPLY);

      expect(within(apply).getByText("등록번호 318-81-10021")).toBeVisible();
      expect(
        within(apply).getByText("신고번호 2026-서울강남-10021"),
      ).toBeVisible();

      await user.click(
        within(apply).getAllByRole("button", { name: "보기" })[1],
      );

      const dialog = screen.getByRole("dialog", {
        name: "통신판매업신고증 — 코지베이비",
      });
      expect(within(dialog).getByText("관할 시·군·구청")).toBeVisible();
      expect(
        within(dialog).getByText("예시 미리보기 · 실제 서류 미연동"),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "다운로드" }),
      );
      expect(
        await screen.findByText("통신판매업신고증 다운로드"),
      ).toBeVisible();
    });
  });

  describe("심사 결과 — 본사가 정하는 것", () => {
    /** 신청 단계의 0% 는 "아직 정하지 않음" — 빈 칸으로 열리고, 원본처럼 필수 표시가 붙는다 */
    it("수수료율은 필수이고 빈 칸으로 열리며 원본 안내를 붙인다", () => {
      renderAt(REQUESTED);

      expect(commissionBox()).toHaveValue("");
      expect(commissionBox()).toBeRequired();
      expect(
        within(section(RESULT)).getByText(
          "신청 접수 시 0%로 시작하며, 최고관리자가 심사 시 직접 입력합니다.",
        ),
      ).toBeVisible();
    });

    it("위생인증은 기본 인증안됨이고 안내 문구를 붙인다", () => {
      renderAt(REQUESTED);

      expect(screen.getByRole("radio", { name: "인증안됨" })).toBeChecked();
      expect(
        screen.getByText(/위생인증은 입점 승인 후 관리하는 항목입니다/),
      ).toBeVisible();
    });

    /** 원본: 승인 건은 「승인일」 줄만 — 해당 없는 반려일을 '-' 로 세우지 않는다 */
    it("승인된 건은 값을 읽기만 하고 승인일만 낸다", () => {
      renderAt(APPROVED);
      const result = section(RESULT);

      expect(within(result).queryByRole("textbox")).toBeNull();
      expect(within(result).getByText("12%")).toBeVisible();
      expect(within(result).getByText("2026.06.14")).toBeVisible();
      expect(within(result).queryByText("반려 사유")).toBeNull();
      expect(within(result).getByText("인증")).toBeVisible();
    });

    /** 원본: 반려 건은 「반려 사유」 줄에 경고색 사유 + 반려일 — 심사 상태 바로 아래 줄 */
    it("반려된 건은 반려 사유와 반려일을 심사 상태 바로 아래에 낸다", () => {
      renderAt(REJECTED);
      const result = section(RESULT);

      const reason = within(result).getByText("KC 미인증 품목 포함");
      expect(reason.className.split(/\s+/)).toContain("text-text-warning");
      expect(within(result).getByText("· 2026.06.11")).toBeVisible();
      expect(within(result).queryByText("승인일")).toBeNull();

      const labels = Array.from(result.querySelectorAll("dt")).map(
        (dt) => dt.textContent,
      );
      expect(labels.slice(0, 3)).toEqual([
        "심사 상태",
        "반려 사유",
        "수수료율",
      ]);
    });

    it("두 카드의 라벨 폭이 같다 — 값 시작선이 맞는다", () => {
      renderAt(REJECTED);
      const widths = new Set(
        Array.from(document.querySelectorAll("dt")).map(
          (dt) => (dt as HTMLElement).style.width,
        ),
      );
      expect(widths.size).toBe(1);
    });
  });

  describe("하단 바와 판정", () => {
    it("승인요청 건에는 [승인]·[반려] 가 이 순서로 있다", () => {
      renderAt(REQUESTED);

      const bar = screen
        .getByRole("button", { name: "목록" })
        .closest("[data-variant]") as HTMLElement;
      expect(
        within(bar)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["목록", "승인", "반려"]);
      expect(bar.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "bottom-6"]),
      );
    });

    it("처리된 건에는 [목록] 만 남는다", () => {
      renderAt(APPROVED);

      expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
      expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
    });

    it("수수료율 없이 승인하려 하면 막고 이유를 낸다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "승인" }));

      expect(screen.getByText("수수료율을 입력해 주세요.")).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("0% 로는 승인할 수 없다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.type(commissionBox(), "0");
      await user.click(screen.getByRole("button", { name: "승인" }));

      expect(
        screen.getByText("0보다 크고 100 이하로 입력해 주세요."),
      ).toBeVisible();
    });

    /** 원본 `gateApprove` — 되돌릴 수 없는 처리라 확인 창을 거친다 */
    it("수수료율이 맞으면 확인 창을 거쳐 승인하고 알린다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.type(commissionBox(), "12");
      await user.click(screen.getByRole("button", { name: "승인" }));

      const dialog = screen.getByRole("dialog", { name: "입점 심사 승인" });
      expect(
        within(dialog).getByText("승인 후에는 이 화면에서 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "승인 처리" }),
      );

      expect(await screen.findByText("승인 처리되었습니다.")).toBeVisible();
      /* 퍼블은 저장하지 않는다 — 머리 배지는 그대로다 */
      expect(within(header()).getByText("승인요청")).toBeVisible();
    });

    it("확인 창을 취소하면 승인하지 않는다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.type(commissionBox(), "12");
      await user.click(screen.getByRole("button", { name: "승인" }));
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "취소",
        }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.queryByText("승인 처리되었습니다.")).toBeNull();
    });

    /** 반려는 목록 일괄과 **같은 창**이다 */
    it("사유를 비우면 반려되지 않고, 적으면 반려하고 알린다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "반려" }));
      const dialog = screen.getByRole("dialog", {
        name: "입점 반려 사유 입력",
      });

      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(
        within(dialog).getByText("반려 사유를 입력해주세요."),
      ).toBeVisible();

      await user.type(within(dialog).getByRole("textbox"), "서류 미비");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(await screen.findByText("반려 처리되었습니다.")).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("[목록] 은 목록 화면으로 돌아간다", async () => {
      const { user, onNavSelect } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/seller-review");
    });
  });

  /** 주소만 바뀌어 다른 신청으로 가면 화면이 처음부터 시작한다 — A→B→A 로 돌아와도 되살아나지 않는다 */
  it("다른 신청으로 갔다 와도 적던 수수료율·열린 창이 따라가지 않는다", async () => {
    const { user } = renderAt(REQUESTED);

    await user.type(commissionBox(), "12");
    await user.click(screen.getByRole("button", { name: "반려" }));

    act(() => navigate(`/seller-review/${OTHER_REQUESTED}`));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(commissionBox()).toHaveValue("");

    act(() => navigate(`/seller-review/${REQUESTED}`));
    expect(commissionBox()).toHaveValue("");
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 섹션 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt(REQUESTED, "?preview=loading");

      expect(screen.getByRole("heading", { name: APPLY })).toBeVisible();
      expect(within(section(APPLY)).queryByText("문지호")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값을 흐리게 유지하고 스켈레톤으로 되돌리지 않는다", () => {
      renderAt(REQUESTED, "?preview=refreshing");

      expect(within(section(APPLY)).getByText("문지호")).toBeVisible();
      expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    });
  });
});
