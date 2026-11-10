import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderPaymentDetailPage } from "./OrderPaymentDetailPage";
import { findPayment, hasPayment } from "./OrderPaymentDetailPage.data";
import { orderApprovedOf, payTotalOf } from "./OrderDetailPage.data";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 결제 상세 — 조회형 · develop `OrderDetailScreen` + 부록 A
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 결제 요약이 처리단위 합·주문 명세 승인액과 같은가 ·
 * 연장 결제 주문에만 「렌트 연장」 줄 · 링크 도착 경로 · 부분 취소·반품 · 결제취소 · 찾을 수 없음 · 번호 없이 오면 목록.
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
      <OrderPaymentDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/orders-all"
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

const hasRow = (label: string) =>
  screen.queryAllByText(label).some((element) => element.tagName === "DT");

const calcValue = (key: string) =>
  document.querySelector(`[data-calc] [data-line="${key}"] dd`)?.textContent ??
  "";

const won = (value: number) => value.toLocaleString("ko-KR") + "원";

/** 렌트 두 건이 한 결제인 주문 — U-R09 · U-R22 */
const MULTI = "20261012131744";
/** 렌트 연장 결제 — 회원 홍다인 · U-R12 의 7일 연장분 */
const EXTENSION = "20261015418862";
const unitOf = (id: string) => ORDERS.find((order) => order.id === id)!;

describe("OrderPaymentDetailPage (결제 상세)", () => {
  describe("결제 요약 — 처리단위에서 계산한다", () => {
    it("모든 주문번호: 판매 합계 + 렌탈료 합계 + 보증금 = 결제 합계 = 주문 명세의 주문 전체 승인액", () => {
      const orderNos = [...new Set(ORDERS.map((order) => order.orderNo))];
      for (const orderNo of orderNos) {
        const payment = findPayment(orderNo)!;
        const units = ORDERS.filter((order) => order.orderNo === orderNo);
        expect(payment.saleSum + payment.rentSum + payment.depositSum).toBe(
          payment.payAmount,
        );
        expect(payment.payAmount).toBe(orderApprovedOf(units[0]));
        expect(payment.unitCount).toBe(units.length);
      }
    });

    it("렌트 두 건 한 결제: 렌탈료 합계는 두 처리단위 결제금액의 합 · 보증금도 둘의 합", () => {
      renderAt(`/order-detail/${MULTI}`);
      const [a, b] = [unitOf("U-R09"), unitOf("U-R22")];

      expect(calcValue("sale")).toBe("0원");
      expect(calcValue("rent")).toBe(won(payTotalOf(a) + payTotalOf(b)));
      expect(calcValue("deposit")).toBe(
        won((a.deposit ?? 0) + (b.deposit ?? 0)),
      );
      expect(calcValue("pay")).toBe(won(orderApprovedOf(a)));
      /* 부록 A C27 — 「보증금(별도 점유)」가 아니다 */
      expect(
        document.querySelector('[data-line="deposit"] dt')?.textContent,
      ).toBe("보증금");
    });
  });

  describe("주문 정보", () => {
    it("주문번호·회원·결제일시·결제수단·부분 취소·반품(없음)·결제상태 — 일반 결제에는 「렌트 연장」 줄이 없다", () => {
      renderAt(`/order-detail/${MULTI}`);
      const unit = unitOf("U-R09");

      expect(valueOf("주문번호")).toBe(MULTI);
      expect(valueOf("회원")).toBe(unit.buyerName);
      expect(valueOf("결제일시")).toBe("2026.10.12 13:17");
      expect(valueOf("결제수단")).toBe(unit.payMethod);
      expect(valueOf("부분 취소·반품")).toBe("없음");
      expect(valueOf("결제상태")).toBe("결제완료");
      expect(hasRow("렌트 연장")).toBe(false);
      /* 부록 A C26 · C28 — 안내 문단·「안내」 구획이 없다 */
      expect(screen.queryByText(/결제상태는/)).toBeNull();
      expect(screen.queryByRole("heading", { name: "안내" })).toBeNull();
    });

    it("취소 진행 건(U-R20)은 부분 취소·반품 배지 · 결제는 아직 결제완료", () => {
      renderAt(`/order-detail/${unitOf("U-R20").orderNo}`);

      expect(valueOf("부분 취소·반품")).toBe(
        "상품 1건 중 1건 취소·반품 진행/완료",
      );
      expect(valueOf("결제상태")).toBe("결제완료");
    });

    it("처리단위가 모두 취소 완료(U-R24)면 결제취소", () => {
      renderAt(`/order-detail/${unitOf("U-R24").orderNo}`);

      expect(valueOf("결제상태")).toBe("결제취소");
    });
  });

  describe("렌트 연장 결제 주문", () => {
    it("「렌트 연장 결제 1회 — 원 주문 {주문번호} · 대여 건 U-R12」 · 금액은 회원 결제 내역과 같은 12,600원", () => {
      renderAt(`/order-detail/${EXTENSION}`);
      const origin = unitOf("U-R12");

      expect(valueOf("렌트 연장")).toBe(
        `렌트 연장 결제 1회 — 원 주문 ${origin.orderNo} · 대여 건 U-R12`,
      );
      expect(valueOf("회원")).toBe("홍다인");
      expect(valueOf("결제일시")).toBe("2026.10.15 20:41");
      expect(valueOf("부분 취소·반품")).toBe("없음");
      expect(calcValue("rent")).toBe("12,600원");
      expect(calcValue("deposit")).toBe("0원");
      expect(calcValue("pay")).toBe("12,600원");
    });

    it("원 주문 → 그 결제 상세 · 대여 건 → 대여 상세 · 회원 → 회원 상세 · [목록] → 주문 목록", async () => {
      const { user, onNavSelect } = renderAt(`/order-detail/${EXTENSION}`);
      const origin = unitOf("U-R12");

      await user.click(screen.getByRole("button", { name: origin.orderNo }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        `/order-detail/${origin.orderNo}`,
      );
      await user.click(screen.getByRole("button", { name: "U-R12" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/rent-detail/U-R12");
      await user.click(screen.getByRole("button", { name: "홍다인" }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        `/members/${encodeURIComponent("dain.hong@example.com")}`,
      );
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all");
    });
  });

  describe("접기", () => {
    it("결제 요약을 접으면 금액 상자가 사라진다", async () => {
      const { user } = renderAt(`/order-detail/${MULTI}`);

      await user.click(screen.getByRole("button", { name: "결제 요약 접기" }));
      expect(document.querySelector("[data-calc]")).toBeNull();
      expect(
        screen.getByRole("button", { name: "결제 요약 펼치기" }),
      ).toBeVisible();
    });
  });

  describe("찾을 수 없음", () => {
    it.each([
      ["없는 주문번호", "/order-detail/20260629330571"],
      ["경로 두 조각", `/order-detail/${MULTI}/x`],
    ])("%s — 예시 건을 그리지 않는다", async (_name, path) => {
      const { user, onNavSelect } = renderAt(path);

      expect(screen.getByText("찾을 수 없는 결제입니다")).toBeVisible();
      expect(hasRow("주문번호")).toBe(false);
      await user.click(screen.getByRole("button", { name: "주문 목록으로" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all");
    });

    it("번호 없이 오면 주문 목록으로 보낸다(부록 A B10)", async () => {
      renderAt("/order-detail/");

      await waitFor(() => expect(window.location.pathname).toBe("/orders-all"));
      expect(screen.queryByText("찾을 수 없는 결제입니다")).toBeNull();
    });

    it("회원 결제 내역이 링크를 걸 번호 — 주문 예시·연장 결제만", () => {
      expect(hasPayment(MULTI)).toBe(true);
      expect(hasPayment(EXTENSION)).toBe(true);
      expect(hasPayment("20260629330571")).toBe(false);
    });
  });
});
