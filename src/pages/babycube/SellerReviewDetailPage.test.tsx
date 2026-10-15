import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerReviewDetailPage } from "./SellerReviewDetailPage";

/* -------------------------------------------------------------------------
 * S04-D 입점 심사 상세 — 폼형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **정책**이다 —
 * **승인요청만 심사할 수 있는가** · **수수료율 없이 승인을 막는가** ·
 * **반려 사유를 강제하는가** · 신청 정보(셀러가 낸 것)를 못 고치게 두는가.
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

/** 승인요청(요율 제안 있음) · 승인요청(요율 없음) · 이미 승인됨 */
const REQUESTED = "A-2026-0141";
const NO_RATE = "A-2026-0139";
const APPROVED = "A-2026-0128";

describe("SellerReviewDetailPage (S04-D 입점 심사 상세)", () => {
  describe("경로와 조회", () => {
    it("경로의 id 로 그 신청을 찾아 보여준다", () => {
      renderAt(REQUESTED);

      expect(
        within(section("신청 정보 (입점 전)")).getByText("포근한잠"),
      ).toBeVisible();
      expect(
        within(section("신청 정보 (입점 전)")).getByText("윤서아"),
      ).toBeVisible();
    });

    it("없는 신청이면 돌아갈 길을 준다", async () => {
      const { user, onNavSelect } = renderAt("A-9999-9999");

      expect(screen.getByText("찾을 수 없는 신청입니다")).toBeVisible();

      await user.click(
        screen.getByRole("button", { name: "입점 심사 목록으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/seller-review");
    });
  });

  describe("신청 정보 — 셀러가 낸 것이라 고칠 수 없다", () => {
    it("서류를 파일명·번호와 함께 내고 [보기] 로 연다", async () => {
      const { user } = renderAt(REQUESTED);
      const apply = section("신청 정보 (입점 전)");

      expect(within(apply).getByText("사업자등록증.pdf")).toBeVisible();

      await user.click(
        within(apply).getAllByRole("button", { name: "보기" })[0],
      );
      expect(
        await screen.findByText("사업자등록증.pdf 을(를) 새 창에서 엽니다"),
      ).toBeVisible();
    });

    /*
     * 위는 셀러가 낸 것, 아래는 본사가 정하는 것이다. 신청 정보에 입력칸을 두면
     * 운영자가 신청서를 고칠 수 있다고 착각한다.
     */
    it("신청 정보에는 입력칸이 없다", () => {
      renderAt(REQUESTED);

      expect(
        within(section("신청 정보 (입점 전)")).queryByRole("textbox"),
      ).toBeNull();
    });
  });

  describe("심사 결과 — 본사가 정하는 것", () => {
    it("신청서의 요율로 시작하고 안내 문구를 붙인다", () => {
      renderAt(REQUESTED);
      const result = section("심사 결과 (입점 승인 후)");

      expect(within(result).getByRole("textbox")).toHaveValue("12");
      expect(
        within(result).getByText(
          "신청 접수 시 0%로 시작하며, 최고관리자가 심사 시 직접 입력합니다.",
        ),
      ).toBeVisible();
    });

    /** `0` 은 "제안하지 않았다"는 뜻이라 빈 칸으로 열어 입력을 요구한다 */
    it("요율을 제안하지 않은 신청은 빈 칸으로 열린다", () => {
      renderAt(NO_RATE);

      expect(
        within(section("심사 결과 (입점 승인 후)")).getByRole("textbox"),
      ).toHaveValue("");
    });

    it("위생인증 안내를 함께 낸다", () => {
      renderAt(REQUESTED);

      expect(
        screen.getByText(
          "위생인증은 입점 승인 후 관리하는 항목입니다. 기본값은 '인증안됨'이며 승인 셀러에 한해 부여합니다.",
        ),
      ).toBeVisible();
    });
  });

  describe("심사 판정 — 원본 sellerReview.actions", () => {
    it("승인요청 건에는 [승인]·[반려] 가 있다", () => {
      renderAt(REQUESTED);

      expect(screen.getByRole("button", { name: "승인" })).toBeVisible();
      expect(screen.getByRole("button", { name: "반려" })).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 계약 — **이미 판정이 끝난 건은 다시 판정하지 않는다.**
     * 목록 화면의 `REVIEWABLE_STATUS` 와 같은 기준이다.
     */
    it("이미 승인된 건에는 판정 버튼이 없고 값도 읽기 전용이다", () => {
      renderAt(APPROVED);

      expect(screen.queryByRole("button", { name: "승인" })).toBeNull();
      expect(screen.queryByRole("button", { name: "반려" })).toBeNull();
      expect(
        within(section("심사 결과 (입점 승인 후)")).queryByRole("textbox"),
      ).toBeNull();
      expect(screen.getByRole("radio", { name: "인증" })).toBeDisabled();
    });

    it("승인하면 셀러명과 확정 요율을 함께 알린다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "승인" }));

      expect(
        await screen.findByText("포근한잠 을(를) 승인했습니다 — 수수료율 12%"),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본이 "심사 시 직접 입력"이라고 적은 값이다 — 접수 기본값 0% 그대로
     * 승인하면 플랫폼 수수료가 영영 0 인 셀러가 생긴다.
     */
    it("요율 없이 승인하려 하면 막고 이유를 낸다", async () => {
      const { user } = renderAt(NO_RATE);

      await user.click(screen.getByRole("button", { name: "승인" }));

      expect(screen.getByText("수수료율을 입력해 주세요.")).toBeVisible();
      expect(screen.queryByText(/승인했습니다/)).toBeNull();
      // 에러가 문구로만 뜨고 입력칸에는 안 닿던 결함 — 단위 `%` 를 span 으로 감싸 생겼다
      expect(screen.getByRole("textbox", { name: "수수료율" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("0% 로는 승인할 수 없다", async () => {
      const { user } = renderAt(NO_RATE);
      const input = within(section("심사 결과 (입점 승인 후)")).getByRole(
        "textbox",
      );

      await user.type(input, "0");
      await user.click(screen.getByRole("button", { name: "승인" }));

      expect(
        screen.getByText("0보다 크고 100 이하로 입력해 주세요."),
      ).toBeVisible();
      expect(screen.queryByText(/승인했습니다/)).toBeNull();
    });
  });

  describe("반려", () => {
    /** 사유 없이 반려되면 셀러가 무엇을 고쳐야 할지 알 수 없어 재신청이 성립하지 않는다 */
    it("사유를 비우면 반려되지 않는다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "반려" }));
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      expect(screen.getByText("반려 사유를 입력해 주세요.")).toBeVisible();
      expect(screen.queryByText(/신청을 반려했습니다/)).toBeNull();
    });

    it("사유를 적으면 반려하고 알린다", async () => {
      const { user } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "반려" }));
      await user.type(
        screen.getByRole("textbox", { name: "반려 사유" }),
        "사업자등록증 사본이 불명확합니다",
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      expect(
        await screen.findByText("포근한잠 의 신청을 반려했습니다"),
      ).toBeVisible();
    });
  });

  describe("하단 액션 바", () => {
    it("[목록] 은 목록 화면으로 돌아간다", async () => {
      const { user, onNavSelect } = renderAt(REQUESTED);

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/seller-review");
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 섹션 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt(REQUESTED, "?preview=loading");

      expect(
        screen.getByRole("heading", { name: "신청 정보 (입점 전)" }),
      ).toBeVisible();
      expect(screen.queryByText("윤서아")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값을 흐리게 유지하고 스켈레톤으로 되돌리지 않는다", () => {
      renderAt(REQUESTED, "?preview=refreshing");

      expect(screen.getByText("윤서아")).toBeVisible();
      expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    });
  });
});
