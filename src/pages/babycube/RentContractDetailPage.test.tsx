import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { RentContractDetailPage } from "./RentContractDetailPage";
import { findContract } from "./RentContractDetailPage.data";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 대여 상세 — 조회형 · develop `RentDetailScreen` + 부록 A
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 5단계 중 지금 단계 · 연체 표시 · 계약 ID 순번 ·
 * 연장 줄·연장 이력(연장 건만) · 검수 전후(회수 상태·검수 판정·보증금 상태·이미지) · 링크 도착 경로 ·
 * 이미지 확대 · 찾을 수 없음 · 번호 없이 오면 목록.
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
      <RentContractDetailPage
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

const calcLine = (key: string) => {
  const line = document.querySelector(`[data-calc] [data-line="${key}"]`);
  return {
    label: line?.querySelector("dt")?.textContent ?? "",
    value: line?.querySelector("dd")?.textContent ?? "",
  };
};

/** 5단계 — [글자, 상태] */
const steps = () =>
  within(screen.getByRole("list", { name: "진행 단계" }))
    .getAllByRole("listitem")
    .map((item) => [item.textContent, item.getAttribute("data-step")]);

/** 「보증금 상태: {배지}」 한 줄 */
const depositStatusLine = () =>
  screen.getByText(/^보증금 상태:/).textContent ?? "";

const unitOf = (id: string) => ORDERS.find((order) => order.id === id)!;

describe("RentContractDetailPage (대여 상세)", () => {
  describe("진행 상태", () => {
    it("대여중(U-R09): 배송중은 지난 단계 · 대여중이 지금 단계 · 나머지는 남은 단계", () => {
      renderAt("/rent-detail/U-R09");

      expect(steps()).toEqual([
        ["배송중", "done"],
        ["대여중", "current"],
        ["수거 신청", "todo"],
        ["검수중", "todo"],
        ["반납완료", "todo"],
      ]);
      expect(
        document.querySelector("li[aria-current='step']")?.textContent,
      ).toBe("대여중");
      expect(screen.queryByText(/연체 D\+/)).toBeNull();
    });

    it("연체중(U-R13): 「수거 신청」에 서고 「연체 D+8」 — 연체 안내 문장은 없다(부록 A C22)", () => {
      renderAt("/rent-detail/U-R13");

      expect(steps()[2]).toEqual(["수거 신청", "current"]);
      expect(screen.getByText("연체 D+8")).toBeVisible();
      expect(screen.queryByText(/연체료는 자동 산정하지/)).toBeNull();
      expect(valueOf("상태")).toBe("연체중");
    });

    it("반납완료(U-R30): 마지막 단계가 지금 단계", () => {
      renderAt("/rent-detail/U-R30");

      expect(steps().map(([, state]) => state)).toEqual([
        "done",
        "done",
        "done",
        "done",
        "current",
      ]);
    });

    it("대여중(연장)은 「대여중」 자리에 선다(develop 은 어느 단계에도 세우지 않는다 — 퍼블 표현)", () => {
      renderAt("/rent-detail/U-R12");
      expect(steps().find(([, state]) => state === "current")?.[0]).toBe(
        "대여중",
      );
    });
  });

  describe("계약 정보", () => {
    it("계약 ID = 주문번호-순번 — 한 결제의 두 렌트 건 중 둘째는 -2 · 연장이 없으면 연장 줄·연장 이력이 없다", () => {
      renderAt("/rent-detail/U-R22");
      const orderNo = unitOf("U-R22").orderNo;

      expect(valueOf("계약 ID")).toBe(`${orderNo}-2`);
      expect(valueOf("주문번호")).toBe(orderNo);
      expect(valueOf("상품")).toBe(unitOf("U-R22").productName);
      /* 판정 Q10 — 「자체/입점사」가 아니라 「본사/셀러」 */
      expect(valueOf("담당")).toMatch(/^(본사|셀러)/);
      expect(hasRow("연장")).toBe(false);
      expect(screen.queryByRole("heading", { name: "연장 이력" })).toBeNull();
    });

    it("주문번호 → 결제 상세 · 회원 → 회원 상세 · 셀러 → 셀러 상세 · [목록] → 주문 목록", async () => {
      const { user, onNavSelect } = renderAt("/rent-detail/U-R30");
      const unit = unitOf("U-R30");

      await user.click(screen.getByRole("button", { name: unit.orderNo }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        `/order-detail/${unit.orderNo}`,
      );
      await user.click(screen.getByRole("button", { name: "서하준" }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        `/members/${encodeURIComponent("hajun.seo@example.com")}`,
      );
      await user.click(screen.getByRole("button", { name: "아이랑" }));
      expect(onNavSelect.mock.lastCall?.[0]).toMatch(/^\/sellers\//);
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all");
    });
  });

  describe("연장 — U-R12 (회원 홍다인의 연장 결제 20261015418862 · 12,600원)", () => {
    it("대여기간 끝이 연장 후 종료일 · 「원 종료일 … 현재 … (연장 1회)」", () => {
      renderAt("/rent-detail/U-R12");

      expect(valueOf("대여기간")).toBe("2026.10.06 ~ 2026.11.11");
      expect(valueOf("연장")).toBe(
        "원 종료일 2026.11.04현재 2026.11.11 (연장 1회)",
      );
      expect(valueOf("상태")).toBe("대여중(연장)");
      /* 주문 목록의 이용 기간(주문 당시 값)은 바뀌지 않는다 */
      expect(unitOf("U-R12").period).toBe("2026-10-06 ~ 2026-11-04");
    });

    it("연장 이력 1행 7칸 · 주문번호 → 연장 결제의 결제 상세 — 연장 안내 문장은 없다(부록 A C23)", async () => {
      const { user, onNavSelect } = renderAt("/rent-detail/U-R12");
      expect(screen.getByRole("heading", { name: "연장 이력" })).toBeVisible();
      const table = screen.getByRole("table");

      expect(
        within(table)
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual([
        "회차",
        "신청일",
        "연장 전후",
        "추가 일수",
        "연장 금액",
        "주문번호",
        "취소",
      ]);
      const rows = within(table).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(1);
      expect(
        within(rows[0])
          .getAllByRole("cell")
          .map((cell) => cell.textContent),
      ).toEqual([
        "1회",
        "2026.10.15",
        "2026.11.042026.11.11",
        "7일",
        "12,600원",
        "20261015418862",
        "-",
      ]);
      expect(screen.queryByText(/연장·연장 취소는 고객이/)).toBeNull();

      await user.click(screen.getByRole("button", { name: "20261015418862" }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        "/order-detail/20261015418862",
      );
    });
  });

  describe("검수 전후", () => {
    it("검수 전(U-R09): 송장 있음 · 수거예약 · 검수 전 · 점유중 · 파손 이미지 없음", () => {
      renderAt("/rent-detail/U-R09");
      const unit = unitOf("U-R09");

      expect(valueOf("출고 송장")).toBe(`${unit.carrier} ${unit.trackingNo}`);
      expect(valueOf("회수 상태")).toBe("수거예약");
      expect(valueOf("검수 판정")).toBe("검수 전");
      expect(calcLine("deduction")).toEqual({
        label: "변상 차감",
        value: "0원",
      });
      expect(depositStatusLine()).toBe("보증금 상태:점유중");
      expect(screen.getByText("등록된 파손 이미지가 없습니다.")).toBeVisible();
    });

    it("방문 수령(U-R10)은 출고 송장 「미등록」", () => {
      renderAt("/rent-detail/U-R10");
      expect(valueOf("출고 송장")).toBe("미등록");
    });

    it("검수 뒤(U-R30): 회수 종료 + 도움말 · 파손(복원불가) · 변상 차감 −25,000원 · 반환 예정액 55,000원 · 환급완료(일부환급)", () => {
      renderAt("/rent-detail/U-R30");

      expect(valueOf("회수 상태")).toBe("회수 종료");
      expect(
        screen.getByRole("button", { name: "회수 종료 도움말" }),
      ).toBeVisible();
      expect(valueOf("검수 판정")).toBe("파손(복원불가)");
      expect(calcLine("deposit").value).toBe("80,000원");
      expect(calcLine("deduction").value).toBe("−25,000원");
      expect(calcLine("refund").value).toBe("55,000원");
      expect(depositStatusLine()).toBe("보증금 상태:환급완료(일부환급)");
      /* 부록 A C24 · C25 · C80 · C81 */
      expect(screen.queryByText(/매출 정산에서 제외/)).toBeNull();
      expect(
        screen.getByText("발송 전 이미지와 파손 이미지를 비교해 확인하세요."),
      ).toBeVisible();
      expect(screen.queryByText(/최대 10장/)).toBeNull();
    });

    it("검수완료(U-R17): 환급대기 · 「검수중」 자리에 선다", () => {
      renderAt("/rent-detail/U-R17");
      expect(depositStatusLine()).toBe("보증금 상태:환급대기");
      expect(steps().find(([, state]) => state === "current")?.[0]).toBe(
        "검수중",
      );
    });

    it("파손 이미지를 확대 창으로 열고 닫는다", async () => {
      const { user } = renderAt("/rent-detail/U-R30");

      await user.click(screen.getByRole("button", { name: "파손 1 확대" }));
      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getByRole("heading")).toHaveTextContent("파손 1");
      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });
  });

  describe("찾을 수 없음", () => {
    it("렌트 처리단위는 모두 열린다", () => {
      for (const order of ORDERS.filter((item) => item.type === "rent")) {
        expect(findContract(order.id)?.id).toBe(order.id);
      }
    });

    it.each([
      ["판매 건", "/rent-detail/U-S01"],
      ["없는 건", "/rent-detail/U-R99"],
      ["경로 두 조각", "/rent-detail/U-R12/x"],
    ])("%s — 예시 건을 그리지 않는다", async (_name, path) => {
      const { user, onNavSelect } = renderAt(path);

      expect(screen.getByText("찾을 수 없는 대여 건입니다")).toBeVisible();
      expect(hasRow("계약 ID")).toBe(false);
      await user.click(screen.getByRole("button", { name: "주문 목록으로" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all");
    });

    it("번호 없이 오면 주문 목록으로 보낸다(부록 A B10)", async () => {
      renderAt("/rent-detail/");
      await waitFor(() => expect(window.location.pathname).toBe("/orders-all"));
    });
  });
});
