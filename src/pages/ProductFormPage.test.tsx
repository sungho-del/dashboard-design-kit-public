import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { ProductFormPage } from "./ProductFormPage";

/* -------------------------------------------------------------------------
 * 상품 등록 화면 (§29)
 *
 * 이 페이지가 실제로 책임지는 것은 **연결과 분기**다 —
 * 라벨↔컨트롤 연결(FormField), 검증 메시지의 등장·소멸, 조건부 필드.
 * 그래서 테스트도 마크업이 아니라 그 세 가지에 집중한다.
 *
 * `useToast()` 를 쓰므로 **`ToastProvider` 로 감싸야** 렌더된다.
 * (Provider 밖에서 부르면 useToast 가 곧바로 throw 한다)
 *
 * Toast 본체는 `role="status"` 라 아래의 `getByRole("alert")` 와 겹치지 않는다 —
 * alert 는 FormField 의 에러 메시지 하나뿐이다.
 * ---------------------------------------------------------------------- */

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();

  render(
    <ToastProvider>
      <ProductFormPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="product-new"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { onNavSelect, onNavOpenChange };
}

describe("ProductFormPage", () => {
  it("카드 5개를 제목과 함께 그린다", () => {
    renderPage();

    for (const title of [
      "기본 정보",
      "판매 정보",
      "상세 설명",
      "배송",
      "노출 설정",
    ]) {
      expect(
        screen.getByRole("heading", { name: title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  /**
   * FormField 는 id 를 손으로 넘기지 않아도 라벨과 컨트롤을 이어 준다.
   * `required` 필드는 라벨 textContent 가 `"상품명 *"` 이라 **exact 매치가 실패한다** —
   * 접근성 이름(`*` 는 aria-hidden)과 라벨 텍스트가 다르다는 사실 자체가 §29-7 의 계약이다.
   */
  describe("FormField 자동 id 연결", () => {
    it("required 필드도 라벨로 찾히고, 접근성 이름에는 * 가 섞이지 않는다", () => {
      renderPage();

      const name = screen.getByLabelText(/^상품명/);
      expect(name).toBe(screen.getByRole("textbox", { name: "상품명" }));
      expect(name).toHaveAccessibleName("상품명");
      expect(name).toHaveAttribute("aria-required", "true");
    });

    it("required 가 아닌 필드는 라벨 텍스트 그대로 찾힌다", () => {
      renderPage();

      expect(screen.getByLabelText("상품 코드")).toHaveAccessibleName(
        "상품 코드",
      );
      expect(screen.getByLabelText("상품 설명")).toHaveAccessibleName(
        "상품 설명",
      );
      expect(screen.getByLabelText("검색 태그")).toHaveAccessibleName(
        "검색 태그",
      );
      expect(screen.getByLabelText("할인가")).toHaveAccessibleName("할인가");
    });

    it("Select 트리거(combobox)에도 라벨이 이어진다", () => {
      renderPage();

      expect(screen.getByLabelText(/^카테고리/)).toBe(
        screen.getByRole("combobox", { name: "카테고리" }),
      );
    });

    it("숫자 입력 3종도 각각 자기 라벨을 갖는다", () => {
      renderPage();

      expect(screen.getByRole("textbox", { name: "판매가" })).toBeVisible();
      expect(screen.getByRole("textbox", { name: "재고 수량" })).toBeVisible();
      expect(screen.getByRole("textbox", { name: "할인가" })).toBeVisible();
    });
  });

  /** §29-5 — 에러가 뜨면 그 자리의 도움말은 사라진다(둘을 동시에 띄우지 않는다) */
  describe("필수 검증", () => {
    it("상품명을 비운 채 등록하면 에러가 도움말을 대체한다", async () => {
      const user = userEvent.setup();
      renderPage();

      // 검증 전에는 도움말이 보인다
      expect(
        screen.getByText("검색 결과와 주문서에 그대로 노출됩니다"),
      ).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(screen.getByRole("alert")).toHaveTextContent(
        "상품명을 입력해 주세요",
      );
      // 같은 자리에 두 메시지가 겹치면 레이아웃이 밀리고 시선이 흩어진다
      expect(
        screen.queryByText("검색 결과와 주문서에 그대로 노출됩니다"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "상품명" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("상품명을 채워 넣으면 에러가 사라지고 도움말이 돌아온다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "등록" }));
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await user.type(
        screen.getByRole("textbox", { name: "상품명" }),
        "오버핏 코튼 셔츠",
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByText("검색 결과와 주문서에 그대로 노출됩니다"),
      ).toBeVisible();
    });

    it("할인가가 판매가 이상이면 에러를 띄운다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByRole("textbox", { name: "판매가" }), "10000");
      await user.type(screen.getByRole("textbox", { name: "할인가" }), "20000");

      // 천 단위 구분자가 붙어도 비교는 숫자로 이뤄져야 한다
      expect(screen.getByRole("textbox", { name: "판매가" })).toHaveValue(
        "10,000",
      );
      expect(
        screen.getByText("할인가는 판매가보다 낮아야 합니다"),
      ).toBeVisible();
      expect(screen.getByRole("textbox", { name: "할인가" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("할인가가 판매가보다 낮으면 에러가 없다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByRole("textbox", { name: "판매가" }), "20000");
      await user.type(screen.getByRole("textbox", { name: "할인가" }), "10000");

      expect(
        screen.queryByText("할인가는 판매가보다 낮아야 합니다"),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * `<label for>` 는 labelable 요소만 가리킨다. `RadioGroup`·`SegmentedControl` 의
   * 루트는 `<div role="radiogroup">` 이라 **`group` 을 빠뜨리면 이름이 아예 안 붙는다.**
   * 최근 고친 접근성 결함이라 회귀 방지가 이 테스트의 목적이다.
   */
  describe("group — 그룹 컨트롤 라벨 연결", () => {
    it("SegmentedControl(판매 상태)에 접근가능 이름이 붙는다", () => {
      renderPage();

      expect(
        screen.getByRole("radiogroup", { name: "판매 상태" }),
      ).toBeInTheDocument();
    });

    it("RadioGroup(배송비 유형)에 접근가능 이름이 붙는다", () => {
      renderPage();

      expect(
        screen.getByRole("radiogroup", { name: "배송비 유형" }),
      ).toBeInTheDocument();
    });
  });

  describe("배송비 조건부 표시", () => {
    it("기본값(무료배송)에서는 배송비 필드가 없다", () => {
      renderPage();

      expect(screen.getByRole("radio", { name: "무료배송" })).toBeChecked();
      expect(
        screen.queryByRole("textbox", { name: "배송비" }),
      ).not.toBeInTheDocument();
    });

    it("유료배송을 고르면 배송비 필드가 나타난다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("radio", { name: "유료배송" }));

      const fee = screen.getByRole("textbox", { name: "배송비" });
      expect(fee).toBeVisible();
      expect(fee).toHaveAttribute("aria-required", "true");
      // 유료배송에는 조건부 무료 전용 도움말이 붙지 않는다
      expect(fee).not.toHaveAccessibleDescription();
    });

    it("조건부 무료를 고르면 전용 도움말이 함께 붙는다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("radio", { name: "조건부 무료" }));

      expect(
        screen.getByRole("textbox", { name: "배송비" }),
      ).toHaveAccessibleDescription("설정한 금액 미만 주문에만 부과됩니다");
    });
  });
});
