import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { FaqListPage } from "./FaqListPage";
import { CATEGORIES, FAQS } from "./FaqListPage.data";

/**
 * S20 FAQ 관리 — **동작** 테스트 (기획 v0.4 `SCREENS.faqAdmin` 대조).
 *
 * 이 화면의 값어치는 표가 아니라 **관리 동작**에 있다 —
 * 카테고리 추가·이름 변경(중복 차단)·삭제(빈 것만) · FAQ 다중 선택 삭제 · 카테고리 전환 ·
 * 행/질문 → 상세 · [FAQ 추가] → 등록 폼. 렌더 여부만 보면 이 모두가 죽어도 통과한다.
 */
function renderPage(path = "/faq-admin") {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <FaqListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/faq-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect };
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

/** 카테고리 태그 한 개의 글자(이름 + 건수) */
function categoryTagText(name: string): string {
  return (
    screen.getByRole("button", { name: `${name} 이름 변경` }).parentElement
      ?.textContent ?? ""
  );
}

describe("FaqListPage", () => {
  describe("샘플 — 원본 시드 7개 카테고리 · 18건", () => {
    it("카테고리 7개가 원본 순서로, 건수는 FAQ 에서 센다", () => {
      renderPage();

      expect(screen.getByText("7개")).toBeVisible();
      expect(
        CATEGORIES.map((category) => categoryTagText(category.name)),
      ).toEqual([
        "회원2",
        "상품1",
        "주문/결제5",
        "배송5",
        "취소/교환/반품2",
        "서비스1",
        "기타2",
      ]);
    });

    it("목록 (총 18건) · 원본 순서 · 페이지 없이 한 화면", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "목록 (총 18건)" }),
      ).toBeVisible();
      expect(bodyRows()).toHaveLength(18);
      expect(visibleQuestions()[0]).toBe("회원가입은 어떻게 하나요?");
      expect(visibleQuestions()[17]).toBe("고객센터 운영시간이 어떻게 되나요?");
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    /** 반영 결과 답(2026-11-10) 2번 — F-07 은 기획 문안 · 「1P는 1원…」 문장은 남는다 */
    it("포인트 FAQ 는 기획 문안이고 전화번호 FAQ 는 그대로다", () => {
      renderPage();

      expect(
        screen.getByText(
          "포인트는 렌트와 구매 결제 모두에 사용할 수 있으며, 한 주문에서 상품 금액(할인 적용 후)까지 100P 단위로 사용할 수 있습니다. 보증금 · 배송비와 렌트 연장 결제에는 사용할 수 없습니다. 1P는 1원이고 100원 단위로 사용합니다.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/구매 소계만|렌트 결제에는/)).toBeNull();
      expect(screen.getByText(/\(02-6406-1110\)/)).toBeInTheDocument();
    });

    it("결제 수단 답변은 보드 01(네이버페이) 바뀐 뒤 문안 — 카카오페이·토스페이가 없다", () => {
      renderPage();

      expect(
        screen.getByText(
          "신용·체크카드와 네이버페이로 결제할 수 있으며, 결제 대행은 토스페이먼츠가 수행합니다. 무통장 입금은 지원하지 않습니다.",
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/카카오페이|토스페이를/)).toBeNull();
    });
  });

  describe("표 구성 — 원본 3열 + 선택 열", () => {
    it("컬럼 이름과 순서가 원본과 같다 · No·등록일 없음", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers.slice(1)).toEqual(["카테고리", "질문", "답변"]);
      expect(
        screen.getByRole("table").querySelectorAll("colgroup col"),
      ).toHaveLength(4);
    });

    it("카테고리는 배지 · 답변은 말줄임", () => {
      renderPage();

      const cells = within(bodyRows()[4]).getAllByRole("cell");
      expect(cells[1]).toHaveTextContent("주문/결제");
      expect(cells[3].querySelector("[data-table-ellipsis]")).not.toBeNull();
    });

    it("PageHeader 에 안내 문장을 달지 않는다 · 엑셀 없음", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "FAQ 관리" });
      expect(header.parentElement?.textContent).toBe("FAQ 관리");
      expect(
        screen.queryByRole("button", { name: /엑셀/ }),
      ).not.toBeInTheDocument();
    });
  });

  describe("상세로 가기 — 행 클릭 · 질문 링크 · [FAQ 추가]", () => {
    it("행 어디를 눌러도 그 FAQ 의 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(within(bodyRows()[8]).getAllByRole("cell")[3]);

      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin/F-09");
      // 미리보기 모달은 걷어냈다
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("질문 글자도 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "배송은 얼마나 걸리나요?" }),
      );

      expect(onNavSelect).toHaveBeenLastCalledWith("/faq-admin/F-09");
    });

    it("체크박스 클릭은 이동이 아니다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "배송은 얼마나 걸리나요? 선택" }),
      );

      expect(onNavSelect).not.toHaveBeenCalled();
      expect(
        screen.getByRole("checkbox", { name: "배송은 얼마나 걸리나요? 선택" }),
      ).toBeChecked();
    });

    it("[FAQ 추가] 는 등록 폼으로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "FAQ 추가" }));

      expect(onNavSelect).toHaveBeenCalledWith("/faq-admin/new");
    });
  });

  describe("카테고리 카드 — 태그마다 행 액션 2개", () => {
    it("태그마다 이름 변경·삭제 버튼이 붙는다 — '전체'를 골라도 잠기지 않는다", () => {
      renderPage();

      CATEGORIES.forEach(({ name }) => {
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
      expect(within(modal).getByRole("textbox")).toHaveAttribute(
        "placeholder",
        "카테고리명 (예: 배송)",
      );
    });

    it("이름을 바꾸면 태그·칩·표의 배지가 함께 바뀐다", async () => {
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
      expect(categoryTagText("배송·수령")).toBe("배송·수령5");
      expect(within(bodyRows()[8]).getAllByRole("cell")[1]).toHaveTextContent(
        "배송·수령",
      );
      await pickCategory(user, "배송·수령");
      expect(bodyRows()).toHaveLength(5);
    });

    it("빈 이름으로 저장하면 칸 아래 원본 문구로 막는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.type(
        within(screen.getByRole("dialog")).getByRole("textbox"),
        "   ",
      );
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("카테고리명을 입력해주세요.")).toBeVisible();
      expect(screen.getByRole("dialog")).toBeVisible();
      expect(screen.getByText("7개")).toBeVisible();
    });

    it("이미 있는 이름이면 막는다(원본 3482) — 자기 이름 그대로 저장은 통과", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.type(
        within(screen.getByRole("dialog")).getByRole("textbox"),
        " 배송 ",
      );
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("이미 있는 카테고리입니다.")).toBeVisible();
      expect(screen.getByText("7개")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "취소" }));

      // 다른 카테고리 이름으로 바꾸는 것도 막힌다
      await user.click(screen.getByRole("button", { name: "회원 이름 변경" }));
      const input = within(await screen.findByRole("dialog")).getByRole(
        "textbox",
      );
      await user.clear(input);
      await user.type(input, "기타");
      await user.click(screen.getByRole("button", { name: "저장" }));
      expect(screen.getByText("이미 있는 카테고리입니다.")).toBeVisible();

      // 자기 이름 그대로는 통과
      await user.clear(input);
      await user.type(input, "회원");
      await user.click(screen.getByRole("button", { name: "저장" }));
      expect(
        await screen.findByText("카테고리가 수정되었습니다."),
      ).toBeVisible();
    });

    it("추가하면 태그와 칩에 나타나고, 빈 카테고리라 칩을 고르면 빈 상태다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.type(
        within(await screen.findByRole("dialog")).getByRole("textbox"),
        "이벤트",
      );
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(
        await screen.findByText("카테고리가 추가되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("8개")).toBeVisible();
      expect(categoryTagText("이벤트")).toBe("이벤트0");

      await pickCategory(user, "이벤트");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "목록 (총 0건)" }),
      ).toBeVisible();
    });
  });

  describe("카테고리 삭제 — 빈 것만 지워진다", () => {
    it("FAQ가 남아 있으면 모달을 열지 않고 이유를 알린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "주문/결제 삭제" }));

      expect(
        await screen.findByText(
          "'주문/결제' 카테고리에 FAQ 5건이 있어 삭제할 수 없습니다. 먼저 다른 카테고리로 옮겨주세요.",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("7개")).toBeVisible();
    });

    it("추가한 빈 카테고리는 확인 모달(대상 이름 없음)을 거쳐 삭제된다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "카테고리 추가" }));
      await user.type(
        within(await screen.findByRole("dialog")).getByRole("textbox"),
        "이벤트",
      );
      await user.click(screen.getByRole("button", { name: "저장" }));
      await pickCategory(user, "이벤트");

      await user.click(screen.getByRole("button", { name: "이벤트 삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 카테고리 삭제" }),
      ).toBeVisible();
      // 원본 UI-323 — 대상 이름을 적지 않는다
      expect(within(modal).queryByText("이벤트")).not.toBeInTheDocument();
      expect(within(modal).getByText("빈 카테고리만 삭제됩니다")).toBeVisible();
      expect(
        within(modal).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(
        await screen.findByText("카테고리가 삭제되었습니다."),
      ).toBeVisible();
      expect(screen.getByText("7개")).toBeVisible();
      // 보고 있던 카테고리를 지우면 「전체」로 돌아간다
      expect(
        screen.getByRole("heading", { name: "목록 (총 18건)" }),
      ).toBeVisible();
    });
  });

  describe("카테고리 칩 — 목록 필터", () => {
    it("고른 카테고리의 FAQ만 남는다", async () => {
      const { user } = renderPage();

      await pickCategory(user, "취소/교환/반품");

      expect(visibleQuestions()).toEqual([
        "주문 취소는 언제까지 가능한가요?",
        "교환·반품은 어떻게 신청하나요?",
      ]);
      expect(
        screen.getByRole("heading", { name: "목록 (총 2건)" }),
      ).toBeVisible();
    });

    it("카테고리를 바꾸면 선택이 비워진다 — 보이지 않는 행을 지우지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeChecked();

      await pickCategory(user, "회원");

      expect(
        screen.getByRole("checkbox", { name: "전체 선택" }),
      ).not.toBeChecked();
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

    it("한 건을 지우면 제목에 건수를 붙이지 않고, 태그 건수도 준다", async () => {
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
      expect(categoryTagText("배송")).toBe("배송4");
    });

    it("여러 건이면 제목과 완료 문구에 건수가 붙는다", async () => {
      const { user } = renderPage();

      await pickCategory(user, "기타");
      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 삭제 (2건)" }),
      ).toBeVisible();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));

      expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      // 빈 카테고리가 되었으니 이제 삭제 확인 창이 열린다
      await user.click(screen.getByRole("button", { name: "기타 삭제" }));
      expect(
        await screen.findByRole("heading", { name: "FAQ 카테고리 삭제" }),
      ).toBeVisible();
    });

    it("취소하면 아무것도 지워지지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));
      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "FAQ 삭제 (18건)" }),
      ).toBeVisible();
      await user.click(within(modal).getByRole("button", { name: "취소" }));

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(bodyRows()).toHaveLength(FAQS.length);
    });
  });

  describe("?preview= 데이터 상태", () => {
    it("loading — 본문은 뼈대, 건수는 그대로", () => {
      renderPage("/faq-admin?preview=loading");

      expect(
        screen.queryByRole("button", { name: FAQS[0].question }),
      ).toBeNull();
      expect(bodyRows()).toHaveLength(5);
    });

    it("empty — 원본 공용 빈 문구", () => {
      renderPage("/faq-admin?preview=empty");

      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(
        screen.getByText(
          "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
        ),
      ).toBeVisible();
    });
  });
});
