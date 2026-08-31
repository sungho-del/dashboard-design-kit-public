import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { OrderDetailPage } from "./OrderDetailPage";
import { TEMPLATE_ROUTES } from "./routes";

/* -------------------------------------------------------------------------
 * 주문 상세 화면 (§30)
 *
 * 이 화면의 계약은 세 가지다.
 *   1. `InfoList` 가 `dl/dt/dd` **시맨틱**으로 읽힌다 (라벨:값 쌍이 짝을 이룬다)
 *   2. 금액이 **하드코딩이 아니라 계산 결과**다
 *   3. `labelWidth` 를 준 항목은 `w-20` 대신 인라인 폭만 방출한다
 *      (`cn()` 은 클래스를 병합하지 않으므로 둘 다 나오면 순서가 승자를 정한다)
 *
 * `useToast()` 를 쓰므로 **`ToastProvider` 로 감싸야** 렌더된다.
 * ---------------------------------------------------------------------- */

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 `w-2` 가 `w-20` 에 걸린다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();

  render(
    <ToastProvider>
      <OrderDetailPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="order-detail"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { onNavSelect, onNavOpenChange };
}

describe("OrderDetailPage", () => {
  it("카드 5개를 제목과 함께 그린다", () => {
    renderPage();

    for (const title of [
      "주문 정보",
      // 건수는 데이터에서 세어 붙인다 — 고정 문자열이 아니다
      "주문 상품 2건",
      "결제 정보",
      "배송 정보",
      "주문자 정보",
    ]) {
      expect(
        screen.getByRole("heading", { name: title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  /**
   * InfoList 는 회색 박스이기 이전에 **정의 목록**이다.
   * `<div>` 로 흉내 내면 화면은 같아 보이지만 스크린리더에서 라벨과 값의 짝이 사라진다.
   */
  describe("InfoList 시맨틱", () => {
    it("라벨은 term, 값은 definition 으로 읽히고 개수가 짝을 이룬다", () => {
      renderPage();

      const terms = screen.getAllByRole("term");
      const definitions = screen.getAllByRole("definition");

      expect(terms.length).toBeGreaterThan(0);
      expect(definitions).toHaveLength(terms.length);
    });

    it("주문 정보의 라벨과 값이 같은 항목 안에서 짝을 이룬다", () => {
      renderPage();

      const pairs: [string, string][] = [
        ["주문번호", "ORD-2026-0142"],
        ["주문일시", "2026-08-19 14:22"],
        ["주문경로", "PC 웹"],
      ];

      for (const [label, value] of pairs) {
        const item = screen.getByText(label).parentElement;
        expect(
          within(item as HTMLElement).getByText(value),
        ).toBeInTheDocument();
      }
    });
  });

  /**
   * 42,000×1 + 38,000×2 = 118,000 → +배송비 3,000 → −할인 5,000 = **116,000원**.
   * 총액이 화면에 박힌 문자열이면 항목이 바뀌어도 값이 따라가지 않는다.
   */
  describe("금액 합계", () => {
    it("상품 금액은 단가×수량의 합이다", () => {
      renderPage();

      const row = screen.getByText("상품 금액").parentElement as HTMLElement;
      expect(within(row).getByText("118,000원")).toBeInTheDocument();
    });

    it("각 상품 행의 금액도 단가×수량으로 계산된다", () => {
      renderPage();

      const rows = screen.getAllByRole("row");
      const shirt = rows.find((r) =>
        r.textContent?.includes("오버핏 코튼 셔츠"),
      ) as HTMLElement;
      const pants = rows.find((r) =>
        r.textContent?.includes("린넨 와이드 팬츠"),
      ) as HTMLElement;

      expect(within(shirt).getByText("42,000원")).toBeInTheDocument();
      // 38,000 × 2 — 단가를 그대로 찍으면 이 검사가 깨진다
      expect(within(pants).getByText("76,000원")).toBeInTheDocument();
    });

    it("총 결제금액은 상품 금액 + 배송비 − 할인이다", () => {
      renderPage();

      expect(
        within(
          screen.getByText("배송비").parentElement as HTMLElement,
        ).getByText("3,000원"),
      ).toBeInTheDocument();
      expect(
        within(screen.getByText("할인").parentElement as HTMLElement).getByText(
          "-5,000원",
        ),
      ).toBeInTheDocument();

      const totalRow = screen.getByText("총 결제금액")
        .parentElement as HTMLElement;
      expect(within(totalRow).getByText("116,000원")).toBeInTheDocument();
    });
  });

  describe("뒤로가기", () => {
    it("PageHeader 의 뒤로가기가 주문 목록으로 되돌린다", async () => {
      const user = userEvent.setup();
      const { onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "뒤로 가기" }));

      expect(onNavSelect).toHaveBeenCalledTimes(1);
      expect(onNavSelect).toHaveBeenCalledWith(TEMPLATE_ROUTES.orders);
    });
  });

  /**
   * `labelWidth` 는 기본 80px 에 라벨이 안 들어갈 때만 쓰는 탈출구다.
   * 인라인 폭과 `w-20` 이 **동시에** 나오면 `cn()` 이 병합을 하지 않아
   * 승자가 클래스 순서에 좌우된다 — 그래서 "없어야 한다"까지 검사한다.
   */
  describe("labelWidth", () => {
    it("labelWidth 를 준 dt 는 인라인 폭만 갖고 w-20 은 방출하지 않는다", () => {
      renderPage();

      for (const label of ["배송 메시지", "송장번호"]) {
        const dt = screen.getByText(label);
        expect(dt.tagName).toBe("DT");
        expect(dt).toHaveStyle({ width: "96px" });
        expect(classList(dt)).not.toContain("w-20");
        expect(classList(dt)).toContain("shrink-0");
      }
    });

    it("기본 폭 항목은 반대로 w-20 클래스를 쓰고 인라인 폭이 없다", () => {
      renderPage();

      const dt = screen.getByText("주문번호");
      expect(dt.tagName).toBe("DT");
      expect(classList(dt)).toContain("w-20");
      expect(dt.getAttribute("style")).toBeNull();
    });
  });
});
