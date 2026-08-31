import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { FaqListPage } from "./FaqListPage";
import { FAQS } from "./FaqListPage.data";

/**
 * S20 FAQ 관리 — **동작** 테스트.
 *
 * 원본 대조(`chunks/3sxnfshlohpx5.js` 모듈 61180) 후의 계약을 지킨다.
 * 이 화면의 값어치는 표가 아니라 **관리 동작**에 있다 —
 * 카테고리 추가·이름 변경·삭제(빈 것만) · FAQ 다중 선택 삭제 · 카테고리 전환.
 * 렌더 여부만 보면 이 모두가 죽어도 통과한다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <FaqListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/faq-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 질문 셀(3번째 열)의 링크 버튼 텍스트 */
function visibleQuestions(): string[] {
  return bodyRows().map(
    (row) =>
      within(within(row).getAllByRole("cell")[2]).getByRole("button")
        .textContent ?? "",
  );
}

/** 카테고리 칩(툴바) 고르기 */
async function pickCategory(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(
    within(screen.getByRole("radiogroup", { name: "카테고리" })).getByRole(
      "radio",
      { name },
    ),
  );
}

describe("FaqListPage", () => {
  describe("표 구성 — 원본 컬럼 3열 + 선택 열", () => {
    it("컬럼 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      // 첫 열은 전체 선택 체크박스라 이름이 비어 있다
      expect(headers.slice(1)).toEqual(["카테고리", "질문", "답변"]);
    });

    it("colgroup 의 열 개수가 컬럼 개수와 같다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup col");
      expect(cols).toHaveLength(4);
    });

    it("답변 셀은 말줄임 처리된다 (원본 `cell-ell`)", () => {
      renderPage();

      const answerCell = within(bodyRows()[0]).getAllByRole("cell")[3];
      expect(answerCell.querySelector("[data-table-ellipsis]")).not.toBeNull();
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("등록일 열이 없다 — 원본 컬럼은 3열이다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).not.toContain("등록일");
    });

    it("페이지네이션이 없다 — 원본 카드는 목록 헤더 + 표뿐이다", () => {
      renderPage();

      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
      // 전체 6건이 한 화면에 다 나온다
      expect(bodyRows()).toHaveLength(FAQS.length);
    });

    it("PageHeader 에 안내 문장을 달지 않는다", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "FAQ 관리" });
      expect(header.parentElement?.textContent).toBe("FAQ 관리");
    });
  });

  describe("카테고리 카드 — 태그마다 행 액션 2개 (원본 구조)", () => {
    it("카테고리 개수와 태그별 FAQ 건수를 보여준다", () => {
      renderPage();

      expect(screen.getByText("5개")).toBeVisible();
      // 배송 2건 · 대여·반납 2건 · 결제·환불 1건 · 안심케어 1건 · 회원 0건
      expect(
        screen.getByRole("button", { name: "배송 이름 변경" }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "회원 삭제" })).toBeVisible();
    });

    it("태그마다 이름 변경·삭제 버튼이 붙는다 — '전체'를 골라도 잠기지 않는다", () => {
      renderPage();

      /*
        예전 구조에서는 칩을 고른 뒤 카드 헤더의 버튼을 눌렀고, `전체` 를 고르면
        가리킬 대상이 없어 두 버튼이 잠겼다. 원본처럼 태그마다 달면 그 상태가 없다.
        (기본 선택은 `전체` 인 채로 확인한다)
      */
      ["배송", "대여·반납", "결제·환불", "안심케어", "회원"].forEach((name) => {
        expect(
          screen.getByRole("button", { name: `${name} 이름 변경` }),
        ).toBeEnabled();
        expect(
          screen.getByRole("button", { name: `${name} 삭제` }),
        ).toBeEnabled();
      });
    });

    it("이름 변경 모달은 원본 제목과 현재 이름을 들고 열린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "배송 이름 변경" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 카테고리 수정" }),
      ).toBeVisible();
      expect(within(modal).getByRole("textbox")).toHaveValue("배송");
    });

    it("이름을 바꾸면 태그와 표의 배지가 함께 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "배송 이름 변경" }));
      const input = within(await screen.findByRole("dialog")).getByRole(
        "textbox",
      );
      await user.clear(input);
      await user.type(input, "배송·수령");
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("카테고리가 수정되었습니다."),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "배송·수령 이름 변경" }),
      ).toBeVisible();
      // 표의 배지도 새 이름이어야 한다 — 두 곳이 갈리면 화면이 거짓말을 한다
      const categoryCell = within(bodyRows()[0]).getAllByRole("cell")[1];
      expect(categoryCell).toHaveTextContent("배송·수령");
    });

    it("빈 이름으로 저장하면 원본 문구로 막는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("카테고리명을 입력해주세요.")).toBeVisible();
      // 모달은 닫히지 않는다
      expect(screen.getByRole("dialog")).toBeVisible();
    });

    it("카테고리를 추가하면 태그와 필터 칩에 함께 나타난다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.type(
        within(await screen.findByRole("dialog")).getByRole("textbox"),
        "쿠폰",
      );
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("카테고리가 추가되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("6개")).toBeVisible();
      expect(
        within(screen.getByRole("radiogroup", { name: "카테고리" })).getByRole(
          "radio",
          { name: "쿠폰" },
        ),
      ).toBeVisible();
    });
  });

  describe("카테고리 삭제 — 빈 것만 지워진다", () => {
    it("FAQ가 남아 있으면 모달을 열지 않고 이유를 알린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "배송 삭제" }));

      expect(
        await screen.findByText(
          "'배송' 카테고리에 FAQ 2건이 있어 삭제할 수 없습니다. 먼저 다른 카테고리로 옮겨주세요.",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // 카테고리는 그대로 남는다
      expect(screen.getByText("5개")).toBeVisible();
    });

    it("빈 카테고리는 확인 모달을 거쳐 삭제된다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "회원 삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 카테고리 삭제" }),
      ).toBeVisible();
      // 원본 GateBody — 규칙 + 되돌릴 수 없다는 경고
      expect(within(modal).getByText("빈 카테고리만 삭제됩니다")).toBeVisible();
      expect(
        within(modal).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText("카테고리가 삭제되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("4개")).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "회원 삭제" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("카테고리 칩 — 목록 필터", () => {
    it("고른 카테고리의 FAQ만 남는다", async () => {
      const { user } = renderPage();

      await pickCategory(user, "대여·반납");

      expect(visibleQuestions()).toEqual([
        "대여 기간을 연장할 수 있나요?",
        "반납할 때 포장은 어떻게 하나요?",
      ]);
      expect(screen.getByText("총 2건")).toBeVisible();
    });

    it("FAQ가 없는 카테고리는 빈 상태가 된다", async () => {
      const { user } = renderPage();

      await pickCategory(user, "회원");

      expect(screen.getByText("등록된 FAQ가 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("카테고리를 바꾸면 선택이 비워진다 — 보이지 않는 행을 지우지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeChecked();

      await pickCategory(user, "대여·반납");

      expect(
        screen.getByRole("checkbox", { name: "전체 선택" }),
      ).not.toBeChecked();
      // 선택이 남아 있었다면 이 삭제가 보이지 않는 행까지 지운다
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));
      expect(await screen.findByText("선택된 FAQ가 없습니다.")).toBeVisible();
    });
  });

  describe("FAQ 선택 삭제", () => {
    it("선택 없이 누르면 원본 문구로 답한다 — 버튼을 잠그지 않는다", async () => {
      const { user } = renderPage();

      expect(screen.getByRole("button", { name: "선택 삭제" })).toBeEnabled();

      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      expect(await screen.findByText("선택된 FAQ가 없습니다.")).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("한 건을 지우면 제목에 건수를 붙이지 않는다 (원본 규칙)", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "배송은 얼마나 걸리나요? 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 삭제" }),
      ).toBeVisible();
      expect(
        within(modal).getByText("사용자 앱 고객센터에서도 즉시 사라집니다"),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
      expect(bodyRows()).toHaveLength(FAQS.length - 1);
    });

    it("여러 건이면 제목과 완료 문구에 건수가 붙는다", async () => {
      const { user } = renderPage();

      await pickCategory(user, "대여·반납");
      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 삭제 (2건)" }),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
      expect(screen.getByText("등록된 FAQ가 없습니다")).toBeVisible();
    });

    it("취소하면 아무것도 지워지지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));
      const modal = await screen.findByRole("dialog");
      await user.click(within(modal).getByRole("button", { name: "취소" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(bodyRows()).toHaveLength(FAQS.length);
    });
  });

  describe("FAQ 추가", () => {
    it("버튼 문구는 원본대로 'FAQ 추가'다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "FAQ 추가" }));

      expect(await screen.findByText("FAQ 추가 화면을 엽니다")).toBeVisible();
    });
  });

  describe("질문 → FAQ 미리보기", () => {
    it("질문을 누르면 답변 전문이 모달에 뜬다", async () => {
      const { user } = renderPage();

      const faq = FAQS[0];
      await user.click(screen.getByRole("button", { name: faq.question }));

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "FAQ 미리보기" }),
      ).toBeVisible();
      expect(within(sheet).getByRole("term")).toHaveTextContent("카테고리");
      expect(within(sheet).getByRole("definition")).toHaveTextContent("배송");
      expect(within(sheet).getByText(faq.answer)).toBeVisible();
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 질문 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[3]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
