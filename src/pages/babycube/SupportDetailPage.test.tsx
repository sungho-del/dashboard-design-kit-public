import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SupportDetailPage } from "./SupportDetailPage";

/* -------------------------------------------------------------------------
 * S22-D 문의 상세 — `/support/{문의 ID}` (고객 `Q-…` · 셀러 `SQ-…`)
 *
 * ## 무엇을 검증하는가
 * 머리(제목 · 요약 · 상태 배지) · 문의 정보 줄(고객: 유형·상태·회원명·접수일·답변일 / 셀러: 셀러·상태·접수일) ·
 * 미답변 「답변일 -」 · 등록된 답변으로 채움 · 빈 답변(trim) 검증 · **알림만**(상태·버튼 그대로) ·
 * [목록] 복귀(고객 `/support` · 셀러 `/support?tab=seller`) · 찾을 수 없음 · 문의가 바뀌면 본문 새로 그림.
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SupportDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/support"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** InfoList 의 라벨 목록과 한 줄 값 */
const labels = () =>
  Array.from(document.querySelectorAll("dt")).map((term) => term.textContent);
function valueOf(label: string): string {
  const term = Array.from(document.querySelectorAll("dt")).find(
    (element) => element.textContent === label,
  );
  if (!term) throw new Error(`라벨을 찾지 못했습니다: ${label}`);
  return term.nextElementSibling?.textContent ?? "";
}

const answerBox = () => screen.getByRole("textbox", { name: /답변/ });

describe("SupportDetailPage (S22-D 문의 상세)", () => {
  describe("고객 문의 — 미답변 Q-8841 (노하린 · 포인트)", () => {
    it("머리 · 문의 정보 줄 · 미답변 답변일 `-`", () => {
      renderAt("/support/Q-8841");
      expect(
        screen.getByRole("heading", { level: 1, name: "고객 문의 상세" }),
      ).toBeVisible();
      expect(screen.getByText("Q-8841 · 노하린 · 포인트")).toBeVisible();
      expect(labels()).toEqual([
        "유형",
        "상태",
        "회원명",
        "접수일",
        "답변일",
        "제목",
        "내용",
      ]);
      expect(valueOf("유형")).toBe("포인트");
      expect(valueOf("상태")).toBe("미답변");
      expect(valueOf("회원명")).toBe("노하린");
      expect(valueOf("접수일")).toBe("2026.10.18");
      expect(valueOf("답변일")).toBe("-");
      expect(valueOf("제목")).toBe("적립금이 사용 내역과 다르게 차감됐어요");
      expect(answerBox()).toHaveValue("");
      expect(answerBox()).toHaveAttribute(
        "placeholder",
        "답변 내용을 입력해 주세요",
      );
    });

    it("빈 답변·공백뿐이면 막고 입력칸 아래에 이유 — 알림 없음", async () => {
      const { user } = renderAt("/support/Q-8841");
      await user.click(screen.getByRole("button", { name: "답변 등록" }));
      expect(screen.getByText("답변 내용을 입력해주세요.")).toBeVisible();

      await user.type(answerBox(), "   ");
      await user.click(screen.getByRole("button", { name: "답변 등록" }));
      expect(screen.getByText("답변 내용을 입력해주세요.")).toBeVisible();
      expect(screen.queryByText("답변이 등록되었습니다.")).toBeNull();
    });

    it("답변을 적으면 알림만 — 상태·버튼·답변일은 그대로", async () => {
      const { user } = renderAt("/support/Q-8841");
      await user.type(answerBox(), "확인 후 차액 2,000원을 돌려드렸습니다.");
      await user.click(screen.getByRole("button", { name: "답변 등록" }));
      expect(await screen.findByText("답변이 등록되었습니다.")).toBeVisible();
      expect(screen.queryByText("답변 내용을 입력해주세요.")).toBeNull();
      expect(valueOf("상태")).toBe("미답변");
      expect(valueOf("답변일")).toBe("-");
      expect(screen.getByRole("button", { name: "답변 등록" })).toBeVisible();
    });

    it("제목·내용은 메타 정보 밖의 읽기 블록 — 내용은 줄바꿈 보존 · 말줄임 없음", () => {
      renderAt("/support/Q-8841");
      const metaList = screen.getByText("유형").closest("dl");
      const body = screen.getByText(
        "구매 시 3,000원을 사용했는데 적립금 내역에는 5,000원이 빠져 있습니다. 확인 부탁드려요.",
      );
      expect(body.tagName).toBe("DD");
      expect(body.closest("dl")).not.toBe(metaList);
      expect(body.className).toContain("whitespace-pre-wrap");
      expect(body.className).not.toMatch(/line-clamp|truncate/);
    });

    it("[목록] → 문의 관리 고객 탭", async () => {
      const { user, onNavSelect } = renderAt("/support/Q-8841");
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/support");
    });

    it("하단 바는 원본 그대로 [목록] + [답변 등록] 둘뿐", () => {
      renderAt("/support/Q-8841");
      const bar = screen
        .getByRole("button", { name: "목록" })
        .closest("[data-variant]") as HTMLElement;
      expect(
        within(bar)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["목록", "답변 등록"]);
    });
  });

  describe("고객 문의 — 답변완료 Q-8828 (윤서아)", () => {
    it("답변일이 찍히고 등록된 답변으로 채워 둔다 · 버튼은 [답변 수정]", () => {
      renderAt("/support/Q-8828");
      expect(valueOf("상태")).toBe("답변완료");
      expect(valueOf("접수일")).toBe("2026.10.15");
      expect(valueOf("답변일")).toBe("2026.10.16");
      expect(answerBox()).toHaveValue(
        "안녕하세요 고객님, 마이 › 내 정보 › 마케팅 수신 동의에서 문자·앱 알림을 각각 해지하실 수 있습니다. 요청하신 대로 10/16 자로 두 항목 모두 해지 처리해 드렸습니다.",
      );
      expect(screen.getByRole("button", { name: "답변 수정" })).toBeVisible();
    });

    it("답변을 지우면 막고, 고쳐 저장하면 「수정」 알림", async () => {
      const { user } = renderAt("/support/Q-8828");
      await user.clear(answerBox());
      await user.click(screen.getByRole("button", { name: "답변 수정" }));
      expect(screen.getByText("답변 내용을 입력해주세요.")).toBeVisible();

      await user.type(answerBox(), "해지 처리했습니다.");
      await user.click(screen.getByRole("button", { name: "답변 수정" }));
      expect(await screen.findByText("답변이 수정되었습니다.")).toBeVisible();
      expect(valueOf("답변일")).toBe("2026.10.16");
    });
  });

  describe("셀러 문의", () => {
    it("SQ-14 — 셀러·상태·접수일 (유형·회원명·답변일 줄 없음)", () => {
      renderAt("/support/SQ-14");
      expect(
        screen.getByRole("heading", { level: 1, name: "셀러 문의 상세" }),
      ).toBeVisible();
      expect(screen.getByText("SQ-14 · 베이비노리터")).toBeVisible();
      expect(labels()).toEqual(["셀러", "상태", "접수일", "제목", "내용"]);
      expect(valueOf("접수일")).toBe("2026.10.19");
      expect(screen.getByRole("button", { name: "답변 등록" })).toBeVisible();
    });

    it("SQ-12 답변완료 — 답변으로 채움 · [답변 수정]", () => {
      renderAt("/support/SQ-12");
      expect(answerBox()).toHaveValue(
        "확인 결과 취소 차감 규칙 정정 대상 건으로, 10월 명세에서 정정 반영됩니다.",
      );
      expect(screen.getByRole("button", { name: "답변 수정" })).toBeVisible();
    });

    it("[목록] → 셀러 문의 탭", async () => {
      const { user, onNavSelect } = renderAt("/support/SQ-13");
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/support?tab=seller");
    });
  });

  describe("찾을 수 없음", () => {
    it("없는 고객 문의 — 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/support/Q-0000");
      expect(screen.getByText("찾을 수 없는 문의입니다")).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "문의 관리 목록으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/support");
    });

    it("없는 셀러 문의 — 셀러 탭으로", async () => {
      const { user, onNavSelect } = renderAt("/support/SQ-99");
      expect(
        screen.getByRole("heading", { level: 1, name: "셀러 문의 상세" }),
      ).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "문의 관리 목록으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/support?tab=seller");
    });
  });

  it("?preview=loading — 본문만 스켈레톤", () => {
    renderAt("/support/Q-8841?preview=loading");
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
