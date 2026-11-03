import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { FaqFormPage } from "./FaqFormPage";

/* -------------------------------------------------------------------------
 * FAQ 등록/수정 — 폼형 · 기획 v0.4 `DETAILS.faqDetail`
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 등록/수정 머리 · 기존 값 채움 · 신규 기본 카테고리 ·
 * 질문 필수(공백만 = 빈 값) · 답변은 필수 아님 · 저장/등록 알림 + 목록 이동 · [삭제]는 수정일 때만 +
 * 목록과 같은 확인 창 · [목록]·[취소] 이동 · 접기 · 찾을 수 없음(없는 id · 경로 두 조각).
 * ---------------------------------------------------------------------- */
function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <FaqFormPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/faq-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const questionInput = () => screen.getByRole("textbox", { name: /질문/ });
const answerInput = () => screen.getByRole("textbox", { name: /답변/ });

describe("FaqFormPage (FAQ 등록/수정)", () => {
  describe("수정 — /faq-admin/{id}", () => {
    it("머리 「FAQ 수정」 · 기존 카테고리·질문·답변이 채워진다", () => {
      renderAt("/faq-admin/F-09");

      expect(
        screen.getByRole("heading", { level: 1, name: "FAQ 수정" }),
      ).toBeVisible();
      expect(
        screen.getByRole("combobox", { name: /카테고리/ }),
      ).toHaveTextContent("배송");
      expect(questionInput()).toHaveValue("배송은 얼마나 걸리나요?");
      expect(answerInput()).toHaveValue(
        "결제 완료 후 평균 1~3영업일 내 출고되며, 지역·택배사 사정에 따라 달라질 수 있습니다.",
      );
    });

    it("구역 「FAQ 내용」 하나 · 질문 100자 제한 · 도움말", () => {
      renderAt("/faq-admin/F-09");

      expect(
        screen
          .getAllByRole("button", { name: / 접기$/ })
          .filter((button) => button.getAttribute("aria-label") !== "메뉴 접기")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual(["FAQ 내용 접기"]);
      expect(questionInput()).toHaveAttribute("maxLength", "100");
      expect(questionInput()).toHaveAttribute(
        "placeholder",
        "질문을 입력해 주세요",
      );
      expect(answerInput()).toHaveAttribute(
        "placeholder",
        "답변 내용을 입력해 주세요",
      );
      expect(screen.getByText("사용자 앱 고객센터 FAQ")).toBeVisible();
    });

    it("하단 바 — [목록] | [삭제] [취소] [저장] (공지 폼과 같은 순서)", () => {
      renderAt("/faq-admin/F-09");

      const bar = screen.getByRole("button", { name: "목록" }).parentElement
        ?.parentElement as HTMLElement;
      expect(
        within(bar)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["목록", "삭제", "취소", "저장"]);
    });

    it("저장 — 알림 「FAQ가 수정되었습니다.」 후 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.type(questionInput(), " (수정)");
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(await screen.findByText("FAQ가 수정되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin");
    });

    it("질문이 공백뿐이면 칸 아래 원본 문구로 막고 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.clear(questionInput());
      await user.type(questionInput(), "   ");
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("질문을 입력해주세요.")).toBeVisible();
      expect(questionInput()).toHaveFocus();
      expect(onNavSelect).not.toHaveBeenCalled();

      // 고치면 오류가 사라진다
      await user.type(questionInput(), "새 질문");
      expect(
        screen.queryByText("질문을 입력해주세요."),
      ).not.toBeInTheDocument();
    });

    it("구역을 접은 채 저장해도 펼쳐서 오류를 보인다", async () => {
      const { user } = renderAt("/faq-admin/F-09");

      await user.clear(questionInput());
      await user.click(screen.getByRole("button", { name: "FAQ 내용 접기" }));
      expect(screen.queryByRole("textbox", { name: /질문/ })).toBeNull();

      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("질문을 입력해주세요.")).toBeVisible();
      await waitFor(() => expect(questionInput()).toHaveFocus());
    });

    it("답변은 비워도 저장된다(원본 — 필수 아님)", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.clear(answerInput());
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(await screen.findByText("FAQ가 수정되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin");
    });

    it("[삭제] — 목록과 같은 확인 창 → 「삭제되었습니다.」 + 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.click(screen.getByRole("button", { name: "삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 삭제" }),
      ).toBeVisible();
      expect(
        within(modal).getByText("사용자 앱 고객센터에서도 즉시 사라집니다"),
      ).toBeVisible();
      expect(
        within(modal).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin");
    });

    it("삭제 창 [취소] — 이동하지 않는다", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.click(screen.getByRole("button", { name: "삭제" }));
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "취소",
        }),
      );

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("[목록]·[취소] 모두 목록으로 간다(원본)", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/F-09");

      await user.click(screen.getByRole("button", { name: "목록" }));
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(onNavSelect.mock.calls).toEqual([["/faq-admin"], ["/faq-admin"]]);
    });
  });

  describe("등록 — /faq-admin/new", () => {
    it("머리 「FAQ 등록」 · 빈 칸 · 카테고리 기본값은 첫 항목 「회원」", () => {
      renderAt("/faq-admin/new");

      expect(
        screen.getByRole("heading", { level: 1, name: "FAQ 등록" }),
      ).toBeVisible();
      expect(
        screen.getByRole("combobox", { name: /카테고리/ }),
      ).toHaveTextContent("회원");
      expect(questionInput()).toHaveValue("");
      expect(answerInput()).toHaveValue("");
    });

    it("[삭제] 없음 · [등록] 라벨", () => {
      renderAt("/faq-admin/new");

      expect(screen.queryByRole("button", { name: "삭제" })).toBeNull();
      expect(screen.getByRole("button", { name: "등록" })).toBeVisible();
    });

    it("질문 없이 [등록] — 막는다 / 질문만 넣고 [등록] — 알림 + 목록", async () => {
      const { user, onNavSelect } = renderAt("/faq-admin/new");

      await user.click(screen.getByRole("button", { name: "등록" }));
      expect(screen.getByText("질문을 입력해주세요.")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.type(questionInput(), "대여 기간을 연장할 수 있나요?");
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(await screen.findByText("FAQ가 등록되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin");
    });
  });

  describe("찾을 수 없음", () => {
    it.each(["/faq-admin/F-99", "/faq-admin/F-09/extra"])(
      "%s — 「찾을 수 없는 FAQ입니다」 + [FAQ 관리로]",
      async (path) => {
        const { user, onNavSelect } = renderAt(path);

        expect(screen.getByText("찾을 수 없는 FAQ입니다")).toBeVisible();
        expect(
          screen.getByText("해당 항목이 존재하지 않거나 삭제되었습니다."),
        ).toBeVisible();
        expect(screen.queryByRole("textbox")).toBeNull();

        await user.click(screen.getByRole("button", { name: "FAQ 관리로" }));
        expect(onNavSelect).toHaveBeenCalledWith("/faq-admin");
      },
    );
  });
});
