import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { STAGES } from "./GrowthStageListPage.data";
import { OrderDetailPage } from "./OrderDetailPage";
import { historyOf } from "./OrderDetailPage.data";
import { ORDERS } from "./OrderListPage.data";
import { draftOf } from "./ProductDetailPage.data";
import { PRODUCTS } from "./ProductListPage.data";

/* -------------------------------------------------------------------------
 * 주문 상세 (BO-ORD-002) — 조회형 · 기획 v0.4 `hqOrderDetailPage`
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 렌트/판매 분기 · 주문 명세 계산(독립 예시) ·
 * 처리 이력(선택적 사건이 없는 건에 생기지 않는가) · 방문 수령 분기 · 보증금 상태 ·
 * 찾을 수 없음 · 처리단위가 바뀌면 처음부터.
 *
 * **의미 검증** — 처리 이력의 시각이 결제 → 출고 → 수령 → 대여 시작 → 회수 순서를 지키고
 * 오늘(2026-10-19)을 넘지 않는가(원본은 시각이 거꾸로 갔다).
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <OrderDetailPage
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

/** 처리 이력 표의 상태 열 */
function historyLabels(): string[] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
}

/** 주문 명세 팝업을 열고 `라벨 → 값` 을 읽는다 */
async function openStatement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "상세보기" }));
  const dialog = await screen.findByRole("dialog");
  const lines = Object.fromEntries(
    [...dialog.querySelectorAll("dt")].map((term) => [
      term.textContent,
      term.nextElementSibling?.textContent,
    ]),
  );
  return { dialog, lines };
}

const RENT_FLOW_FULL = [
  "신규 주문",
  "배송 준비",
  "배송중",
  "배송 완료",
  "대여중",
  "수거 신청",
  "검수중",
  "검수완료",
  "반납완료",
];

describe("OrderDetailPage", () => {
  describe("머리·골격", () => {
    it("렌트 처리단위 — 제목·식별 정보·상태 배지, 하단은 [목록]뿐이다", async () => {
      const { user, onNavSelect } = renderAt("/orders-all/U-R01");

      expect(
        screen.getByRole("heading", { name: "주문 상세(렌트)" }),
      ).toBeVisible();
      expect(
        screen.getByText(
          "20261018143205 · U-R01 · 회전형 카시트 스핀 360 · 베이비루",
        ),
      ).toBeVisible();
      [
        "주문정보",
        "상품정보",
        "배송정보",
        "배송지 정보",
        "주문 처리 이력",
      ].forEach((title) => expect(screen.getByText(title)).toBeVisible());
      /* 조회 전용 — 저장·처리 버튼이 없다 */
      expect(
        screen.queryByRole("button", { name: /^(저장|수정 저장|취소)$/ }),
      ).toBeNull();

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/orders-all");
    });

    it("판매 처리단위는 제목이 갈리고 렌트 전용 줄이 없다", () => {
      renderAt("/orders-all/U-S07");

      expect(
        screen.getByRole("heading", { name: "주문 상세(판매)" }),
      ).toBeVisible();
      expect(valueOf("수량")).toBe("2개");
      expect(hasRow("렌트일")).toBe(false);
      expect(hasRow("보증금 (고정액)")).toBe(false);
      expect(hasRow("회수 배송비")).toBe(false);
      expect(hasRow("구매확정일")).toBe(true);
    });

    it("없는 처리단위·경로 조각이 둘 이상이면 찾을 수 없음이다", async () => {
      const { user, onNavSelect } = renderAt("/orders-all/U-X99");

      expect(screen.getByText("찾을 수 없는 주문입니다")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "주문 목록으로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/orders-all");
    });

    it("경로 뒤에 조각이 더 붙으면 열지 않는다", () => {
      renderAt("/orders-all/x/U-R01");
      expect(screen.getByText("찾을 수 없는 주문입니다")).toBeVisible();
    });

    it("구역은 접을 수 있다", async () => {
      const { user } = renderAt("/orders-all/U-R01");

      await user.click(screen.getByRole("button", { name: "주문정보 접기" }));

      expect(hasRow("결제수단")).toBe(false);
      expect(
        screen.getByRole("button", { name: "주문정보 펼치기" }),
      ).toHaveAttribute("aria-expanded", "false");
    });

    /** 처리단위가 바뀌면 열린 명세·접힘이 다음 주문에 묻어가지 않는다(`key`) */
    it("다른 처리단위로 가면 처음부터 다시 그린다", async () => {
      const { user } = renderAt("/orders-all/U-R01");
      await user.click(screen.getByRole("button", { name: "배송정보 접기" }));
      await user.click(screen.getByRole("button", { name: "상세보기" }));
      expect(await screen.findByRole("dialog")).toBeVisible();

      act(() => navigate("/orders-all/U-R02"));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(
        screen.getByRole("button", { name: "배송정보 접기" }),
      ).toBeVisible();
      expect(valueOf("주문번호")).toBe("20261018091240");
    });
  });

  describe("주문정보·상품정보", () => {
    it("결제·구매자 정보는 주문 목록·회원 샘플과 같다", () => {
      renderAt("/orders-all/U-R01");

      expect(valueOf("주문번호")).toBe("20261018143205");
      expect(valueOf("결제일시")).toBe("2026.10.18 14:32");
      expect(valueOf("구매자명")).toBe("박수진");
      expect(valueOf("구매자 ID")).toBe("sujin.park@example.com");
      expect(valueOf("연락처")).toBe("010-2841-7702");
    });

    it("성장단계는 상품 상세의 처음 값과 같고, 브랜드는 샘플에 없어 '-' 다", () => {
      renderAt("/orders-all/U-R01");

      const product = PRODUCTS.find((item) => item.id === "BL240814")!;
      const stage = STAGES.find((item) => item.id === draftOf(product).stage)!;
      expect(valueOf("성장단계")).toContain(stage.name);
      expect(valueOf("브랜드")).toBe("-");
      expect(valueOf("상품주문상태")).toBe("신규 주문");
    });

    it("보증금 상태 — 대여 전후 점유중 · 검수완료 환급대기 · 반납완료 전액환급", () => {
      renderAt("/orders-all/U-R01");
      expect(valueOf("보증금 (고정액)")).toBe("120,000원");
      expect(valueOf("보증금 상태")).toBe("점유중");
    });

    it.each([
      ["U-R17", "환급대기"],
      ["U-R18", "전액환급"],
    ])("%s 의 보증금 상태는 %s", (id, label) => {
      renderAt(`/orders-all/${id}`);
      expect(valueOf("보증금 상태")).toBe(label);
    });
  });

  describe("주문 명세 팝업 (독립 예시로 계산 확인)", () => {
    it("렌트 — 단가 × 렌트일, 보증금은 따로 보이고 결제금액에 들지 않는다", async () => {
      const { user } = renderAt("/orders-all/U-R01");

      const { dialog, lines } = await openStatement(user);

      expect(dialog).toHaveAccessibleName("주문 명세 · 20261018143205");
      /* BL240814 1,500 − 200 = 1,300원/일 × 14일 */
      expect(lines["렌트 원가"]).toBe("1,500원/일");
      expect(lines["할인 금액"]).toBe("- 200원/일");
      expect(lines["렌트가"]).toBe("1,300원/일");
      expect(lines["렌트일"]).toBe("14일");
      expect(lines["소계"]).toBe("18,200원");
      expect(lines["배송비"]).toBe("무료");
      expect(lines["회수 배송비"]).toBe("무료");
      expect(lines["보증금"]).toBe("120,000원");
      expect(lines["결제금액"]).toBe("18,200원");

      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("렌트 — 쿠폰은 빼고 안심케어는 더한다", async () => {
      const { user } = renderAt("/orders-all/U-R09");

      const { lines } = await openStatement(user);

      /* BH731058 1,100원/일 × 30일 = 33,000 − 쿠폰 3,000 + 안심케어 5,000 */
      expect(lines["소계"]).toBe("33,000원");
      expect(lines["쿠폰 할인"]).toBe("- 3,000원");
      expect(lines["안심케어 · (정산 미포함)"]).toBe("+ 5,000원");
      expect(lines["결제금액"]).toBe("35,000원");
    });

    it("판매 — 판매가 × 수량 − 쿠폰 + 배송비 (원본은 0원으로 나왔다)", async () => {
      const { user } = renderAt("/orders-all/U-S07");

      const { lines } = await openStatement(user);

      /* GJ650283 99,000 − 10,000 = 89,000 × 2 = 178,000 − 5,000 + 3,000 */
      expect(lines["판매가"]).toBe("89,000원");
      expect(lines["수량"]).toBe("2개");
      expect(lines["소계"]).toBe("178,000원");
      expect(lines["배송비"]).toBe("+ 3,000원");
      expect(lines["결제금액"]).toBe("176,000원");
      expect(lines["보증금"]).toBeUndefined();
    });
  });

  describe("배송정보", () => {
    it("택배 신규 주문은 송장 미등록이고 도달하지 않은 날짜는 '-' 다", () => {
      renderAt("/orders-all/U-R01");

      expect(valueOf("배송 방법")).toBe("택배");
      expect(valueOf("택배사")).toBe("-");
      expect(valueOf("송장번호")).toBe("미등록");
      expect(valueOf("주문확인일")).toBe("-");
      expect(valueOf("대여 시작일")).toBe("-");
    });

    it("방문 수령은 장소를 보이고 택배 줄을 뺀다 (원본은 택배 줄이 찍혔다)", () => {
      renderAt("/orders-all/U-R10");

      expect(valueOf("배송 방법")).toMatch(/^방문 수령 · 본사 물류센터 출고지/);
      expect(hasRow("택배사")).toBe(false);
      expect(hasRow("송장번호")).toBe(false);
      expect(valueOf("반납 요금")).toBe("무료");
      /* 대여 시작일 = 이용 기간 시작일 */
      expect(valueOf("대여 시작일")).toBe("2026.10.14 09:00:00");
    });

    it("배송 지연 건은 지연 사유가 채워진다", () => {
      renderAt("/orders-all/U-R05");
      expect(valueOf("지연 사유")).toBe(
        "택배사 집화 지연 — 지연 안내 후 우선 발송 예정",
      );
    });
  });

  describe("주문 처리 이력", () => {
    it("반납완료 — 정상 흐름 9단계, 연장·연체를 거치지 않았다", () => {
      renderAt("/orders-all/U-R18");
      expect(historyLabels()).toEqual(RENT_FLOW_FULL);
    });

    it.each([
      ["U-R13", [...RENT_FLOW_FULL.slice(0, 5), "연체중"]],
      ["U-R12", [...RENT_FLOW_FULL.slice(0, 5), "대여중(연장)"]],
      ["U-R05", ["신규 주문", "배송 준비", "배송 지연"]],
      ["U-R20", ["신규 주문", "배송 준비", "취소 요청"]],
      ["U-R21", [...RENT_FLOW_FULL.slice(0, 5), "반품 수거중"]],
      ["U-S12", ["신규 주문", "배송 준비", "배송중", "배송 완료", "교환 신청"]],
      ["U-R01", ["신규 주문"]],
    ])("%s 의 이력", (id, labels) => {
      renderAt(`/orders-all/${id}`);
      expect(historyLabels()).toEqual(labels);
    });

    it("머리 배지와 이력의 마지막 줄이 같다 (클레임 건 포함)", () => {
      ORDERS.forEach((order) => {
        const rows = historyOf(order);
        expect(rows[rows.length - 1].status).toBe(order.status);
      });
    });

    /** 원본은 배송 준비가 신규 주문보다 이르거나 56일 렌트가 이틀 만에 반납되기도 했다 */
    it("모든 처리단위의 이력 시각이 순서를 지키고 오늘을 넘지 않는다", () => {
      const today = new Date("2026-10-19T23:59:59");
      ORDERS.forEach((order) => {
        const times = historyOf(order).map((row) => row.at.getTime());
        times.forEach((time, index) => {
          expect(time).toBeLessThanOrEqual(today.getTime());
          if (index > 0) expect(time).toBeGreaterThan(times[index - 1]);
        });
        const renting = historyOf(order).find(
          (row) => row.status === "renting",
        );
        if (renting) {
          expect(renting.at.toDateString()).toBe(
            new Date(`${order.period.slice(0, 10)}T00:00:00`).toDateString(),
          );
        }
      });
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 구역 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt("/orders-all/U-R01?preview=loading");

      expect(screen.getByText("주문정보")).toBeVisible();
      expect(hasRow("주문번호")).toBe(false);
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });
  });
});
