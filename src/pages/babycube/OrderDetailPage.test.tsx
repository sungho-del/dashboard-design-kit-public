import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { STAGES } from "./GrowthStageListPage.data";
import { OrderDetailPage } from "./OrderDetailPage";
import {
  claimFeeOf,
  historyOf,
  statementBlocksOf,
} from "./OrderDetailPage.data";
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

/**
 * 주문 명세 팝업을 열고 묶음·줄을 읽는다(`CalcBreakdown`).
 * 줄 이름은 `<dt>` 의 첫 글자 칸 — 보조 글자(`hints`)는 따로 읽는다. 값 없는 줄은 처리 문장(`messages`)이다.
 */
async function openStatement(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "주문 명세" }));
  const dialog = await screen.findByRole("dialog");
  const blocks = [...dialog.querySelectorAll("[data-block]")].map((block) => ({
    key: block.getAttribute("data-block"),
    lines: [...block.querySelectorAll("[data-line]")].map((line) => ({
      label: line.querySelector("dt > span")?.textContent ?? "",
      hint: line.querySelector("dt > span:nth-of-type(2)")?.textContent ?? null,
      value: line.querySelector("dd")?.textContent ?? null,
    })),
  }));
  const all = blocks.flatMap((block) => block.lines);
  const lines = Object.fromEntries(
    all.filter((line) => line.value !== null).map((l) => [l.label, l.value]),
  );
  const hints = Object.fromEntries(all.map((l) => [l.label, l.hint]));
  const messages = all.filter((l) => l.value === null).map((l) => l.label);
  /** 묶음 하나의 줄 이름 순서 */
  const labelsOf = (key: string) =>
    blocks.find((block) => block.key === key)?.lines.map((l) => l.label);
  return { dialog, blocks, lines, hints, messages, labelsOf };
}

/** 명세 문자열 금액 → 수 (`−12,000원` · `+3,000원` · `1,300원/일`) */
const amount = (text: string | null | undefined) =>
  Number((text ?? "").replace(/[^0-9]/g, ""));

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
      await user.click(screen.getByRole("button", { name: "주문 명세" }));
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

  /** 추가 기획 보드 01(네이버페이) · 02(추가 연락처 — 개발 d53c51d) */
  describe("결제수단 네이버페이 · 추가 연락처", () => {
    it("네이버페이 결제는 「네이버페이」, 카드 결제는 카드 그대로", () => {
      renderAt("/orders-all/U-R01");
      expect(valueOf("결제수단")).toBe("네이버페이");
      cleanup();
      renderAt("/orders-all/U-R02");
      expect(valueOf("결제수단")).toBe("신용카드");
    });

    it("같은 주문번호의 처리단위는 같은 결제수단이다", () => {
      const byNo = new Map<string, Set<string>>();
      for (const order of ORDERS) {
        byNo.set(
          order.orderNo,
          (byNo.get(order.orderNo) ?? new Set()).add(order.payMethod),
        );
      }
      expect([...byNo.values()].every((set) => set.size === 1)).toBe(true);
      expect(ORDERS.filter((o) => o.payMethod === "네이버페이")).toHaveLength(
        12,
      );
    });

    const addressLabels = () =>
      [
        ...screen
          .getAllByText("수령인")[0]
          .closest("dl")!
          .querySelectorAll("dt"),
      ].map((term) => term.textContent);

    it.each([
      ["U-R01", "010-9876-5432"],
      ["U-S01", "010-7123-4567"],
      ["U-S07", "-"],
    ])(
      "%s — 「수령인 연락처」 바로 아래 「추가 연락처」 %s (판매·렌트 모두)",
      (id, phone) => {
        renderAt(`/orders-all/${id}`);
        expect(addressLabels()).toEqual([
          "수령인",
          "수령인 연락처",
          "추가 연락처",
          "배송지",
          "배송 메모",
        ]);
        expect(valueOf("추가 연락처")).toBe(phone);
      },
    );
  });

  describe("주문 명세 팝업 (독립 예시로 계산 확인)", () => {
    it("렌트 — 단가 × 렌트일, 보증금은 「별도」 묶음이고 결제금액에 들지 않는다", async () => {
      const { user } = renderAt("/orders-all/U-R01");

      const { dialog, lines, hints, blocks, labelsOf } =
        await openStatement(user);

      expect(dialog).toHaveAccessibleName("주문 명세 · 20261018143205");
      /* BL240814 1,500 − 200 = 1,300원/일 × 14일 — 일 단가 할인은 단가에서 끝난다 */
      expect(labelsOf("product")).toEqual([
        "렌트 원가",
        "상품 할인",
        "렌트가",
        "렌트일",
        "소계",
      ]);
      expect(lines["렌트 원가"]).toBe("1,500원/일");
      expect(lines["상품 할인"]).toBe("\u2212200원/일");
      expect(lines["렌트가"]).toBe("1,300원/일");
      expect(lines["렌트일"]).toBe("14일");
      expect(lines["소계"]).toBe("18,200원");
      expect(lines["배송비"]).toBe("무료");
      expect(lines["회수 배송비"]).toBe("무료");
      expect(lines["결제금액"]).toBe("18,200원");
      expect(lines["보증금"]).toBe("120,000원");
      expect(hints["보증금"]).toContain("결제금액에 포함 안 됨");
      /* 묶음 순서 — 쿠폰·포인트가 없으면 「할인」 묶음은 없다 · 보증금은 결제금액 **아래** */
      expect(blocks.map((block) => block.key)).toEqual([
        "product",
        "extra",
        "pay",
        "deposit",
      ]);
      /* 차감은 기본 글자색 — 명세에 경고색이 없다 */
      expect(dialog.querySelector(".text-text-critical")).toBeNull();

      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    it("본문 주문정보의 결제금액은 팝업과 같은 값이다", async () => {
      const { user } = renderAt("/orders-all/U-R09");
      expect(valueOf("결제금액")).toMatch(/^35,000원/);
      const { lines } = await openStatement(user);
      expect(lines["결제금액"]).toBe("35,000원");
    });

    it("렌트 — 쿠폰은 빼고 안심케어는 더한다 · 0원 상품 할인은 부호 없이", async () => {
      const { user } = renderAt("/orders-all/U-R09");

      const { lines, hints, labelsOf } = await openStatement(user);

      /* BH731058 1,100원/일 × 30일 = 33,000 − 쿠폰 3,000 + 안심케어 5,000 */
      expect(lines["상품 할인"]).toBe("0원/일");
      expect(lines["소계"]).toBe("33,000원");
      expect(labelsOf("discount")).toEqual(["쿠폰 할인"]);
      expect(lines["쿠폰 할인"]).toBe("\u22123,000원");
      expect(lines["안심케어"]).toBe("+5,000원");
      expect(hints["안심케어"]).toBe("정산 미포함");
      expect(lines["결제금액"]).toBe("35,000원");
    });

    it("포인트 할인은 「할인」 묶음 · 보조 글자 「플랫폼 부담」", async () => {
      const { user } = renderAt("/orders-all/U-R11");
      const { lines, hints } = await openStatement(user);
      expect(lines["포인트 할인"]).toBe("\u22122,000원");
      expect(hints["포인트 할인"]).toBe("플랫폼 부담");
      expect(lines["결제금액"]).toBe("37,000원");
    });

    it("판매 — 판매가 × 수량 − 쿠폰 + 배송비 (원본은 0원으로 나왔다)", async () => {
      const { user } = renderAt("/orders-all/U-S07");

      const { lines, blocks } = await openStatement(user);

      /* GJ650283 99,000 − 10,000 = 89,000 × 2 = 178,000 − 5,000 + 3,000 */
      expect(lines["판매가"]).toBe("89,000원");
      expect(lines["수량"]).toBe("2개");
      expect(lines["소계"]).toBe("178,000원");
      expect(lines["배송비"]).toBe("+3,000원");
      expect(lines["결제금액"]).toBe("176,000원");
      expect(lines["보증금"]).toBeUndefined();
      expect(blocks.map((block) => block.key)).not.toContain("deposit");
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
      expect(valueOf("대여 시작일")).toBe("2026.10.14 09:00");
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
        const times = historyOf(order, "all").map((row) => row.at.getTime());
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

/* ---------------------------------------------------------------------------
 * 클레임 모드 — 취소·반품·교환 상세도 이 화면이다 (원본 `hqOrderDetailPage(u, {rma})`)
 *
 * 경로가 모드를 정하고, 그 클레임이 있는 처리단위만 연다. 원본 결함(신청 구분이 늘 1단계 이름 ·
 * 거부·재반송이 「반려」로 · 지연 상시 삽입 · 반려인데 환불 예정액 · 렌트 취소에 렌트료 환불 없음 ·
 * 판매 반품 배송비 이중 부담)을 다시 갖지 않는지 본다.
 * ------------------------------------------------------------------------ */
describe("클레임 모드", () => {
  it("취소 경로 — 제목·클레임 줄·상태 두 칸, [목록]은 취소 목록으로", async () => {
    const { user, onNavSelect } = renderAt("/orders-cancel/U-R23");

    expect(
      screen.getByRole("heading", { name: "취소 상세(렌트)" }),
    ).toBeVisible();
    expect(valueOf("신청 구분")).toBe("취소");
    expect(valueOf("신청일시")).toBe("2026.10.16 18:40");
    expect(valueOf("발송 여부")).toBe("발송 전");
    expect(valueOf("신청 사유")).toBe("이용 일정 변경");
    expect(valueOf("배송비 부담")).toBe("해당 없음 (발송 전 취소)");
    /* 상품주문상태 = 주문 자체의 단계, 취소상태 = 클레임 단계 */
    expect(valueOf("상품주문상태")).toBe("배송 준비");
    expect(valueOf("취소상태")).toBe("환불 처리중");

    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/orders-cancel");
  });

  it("주문 상세에는 클레임 줄이 없다 — 같은 처리단위라도 경로가 모드를 정한다", () => {
    renderAt("/orders-all/U-R23");

    expect(
      screen.getByRole("heading", { name: "주문 상세(렌트)" }),
    ).toBeVisible();
    expect(hasRow("신청 구분")).toBe(false);
    expect(hasRow("취소상태")).toBe(false);
    /* 이력은 지금 단계 한 줄만 — 머리 배지와 맞는다 */
    expect(historyLabels().slice(-2)).toEqual(["배송 준비", "환불 처리중"]);
  });

  it("처리 이력은 그 클레임이 실제로 거친 단계를 잇는다", () => {
    renderAt("/orders-cancel/U-R23");
    expect(historyLabels()).toEqual([
      "신규 주문",
      "배송 준비",
      "취소 요청",
      "환불 처리중",
    ]);
  });

  it("재반송은 거부 뒤에 온다 — 원본은 「반려」 한 줄로 찍고 수거·검수를 지웠다", () => {
    renderAt("/orders-return/U-S20");
    expect(historyLabels().slice(-7)).toEqual([
      "반품 신청",
      "반품 승인",
      "반품 수거중",
      "반품 수거완료",
      "반품 검수",
      "반품 거부",
      "재반송",
    ]);
    expect(historyLabels()).not.toContain("반품 반려");
  });

  it("모드와 맞지 않는 처리단위는 찾을 수 없다 — 취소 경로로 반품 건 · 클레임 없는 건", async () => {
    const { user, onNavSelect } = renderAt("/orders-cancel/U-R21");

    expect(screen.getByText("찾을 수 없는 취소 건입니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "취소 목록으로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/orders-cancel");
  });

  it("교환은 판매만 연다 — 렌트 처리단위는 교환 경로로 열리지 않는다", () => {
    renderAt("/orders-exchange/U-R01");
    expect(screen.getByText("찾을 수 없는 교환 건입니다")).toBeVisible();
  });

  describe("명세의 클레임 묶음 — 기준 → 차감 → 결과 (독립 예시)", () => {
    it("렌트 취소(무료 취소) — 환불과 보증금 반환이 각자 묶음이다(합친 총액 없음)", async () => {
      const { user } = renderAt("/orders-cancel/U-R23");
      const { lines, labelsOf, blocks } = await openStatement(user);

      /* 렌트가 1,200원/일 × 14일 = 16,800원 · 보증금 90,000원 */
      expect(labelsOf("refund")).toEqual(["결제금액", "환불 예정액"]);
      expect(labelsOf("depositRefund")).toEqual([
        "보증금",
        "보증금 반환 예정액",
      ]);
      expect(lines["결제금액"]).toBe("16,800원");
      expect(lines["환불 예정액"]).toBe("16,800원");
      expect(lines["보증금 반환 예정액"]).toBe("90,000원");
      /* 클레임 모드에서 결제금액은 결과가 아니다 — 주문 상세의 결과 묶음(pay)이 없다 */
      expect(blocks.map((block) => block.key)).not.toContain("pay");
      /* 본문 결과 줄 = 팝업과 같은 값 */
      expect(valueOf("환불 예정액")).toBe("16,800원");
      expect(valueOf("보증금 반환 예정액")).toBe("90,000원");
    });

    it("취소 완료면 「예정」이 아니라 「완료」다", async () => {
      const { user } = renderAt("/orders-cancel/U-R24");
      const { lines } = await openStatement(user);

      expect(lines["환불 완료"]).toBe("8,400원");
      expect(lines["보증금 반환 완료"]).toBe("90,000원");
      expect(lines["환불 예정액"]).toBeUndefined();
    });

    it("판매 반품 고객 귀책 — 결제금액에서 편도 배송비를 **한 번만** 뺀다 (별도 청구 줄 없음)", async () => {
      const { user } = renderAt("/orders-return/U-S18");
      const { lines, hints, labelsOf } = await openStatement(user);

      expect(labelsOf("refund")).toEqual([
        "결제금액",
        "반품 배송비",
        "환불 예정액",
      ]);
      expect(lines["결제금액"]).toBe("119,000원");
      expect(lines["반품 배송비"]).toBe("\u221212,000원");
      expect(hints["반품 배송비"]).toBe("편도 · 고객 귀책 · 환불액에서 차감");
      expect(lines["환불 예정액"]).toBe("107,000원");
      expect(
        Object.keys(hints).some((label) =>
          `${label}${hints[label] ?? ""}`.includes("청구"),
        ),
      ).toBe(false);
      expect(valueOf("배송비 부담")).toBe(
        "반품 배송비(편도) 12,000원 · 환불액에서 차감",
      );
    });

    it("렌트 반품 고객 귀책 — 보증금이 기준이고 거기서 뺀다", async () => {
      const { user } = renderAt("/orders-return/U-R26");
      const { lines, labelsOf } = await openStatement(user);

      expect(labelsOf("pay")).toEqual(["결제금액"]);
      expect(labelsOf("depositRefund")).toEqual([
        "보증금",
        "반품 배송비",
        "보증금 반환 예정액",
      ]);
      expect(lines["보증금 반환 예정액"]).toBe("142,000원");
      expect(amount(lines["보증금"]) - amount(lines["반품 배송비"])).toBe(
        142000,
      );
      expect(valueOf("귀책 판정")).toBe("고객 귀책");
    });

    /** 차감 줄은 보이기만 한다 — 반환액은 보증금 함수가 정한다. 보이는 줄로 다시 셈해도 같아야 한다 */
    it("렌트 반품은 모두 「보증금 − 반품 배송비 = 반환액」으로 읽힌다", () => {
      const rentReturns = ORDERS.filter(
        (order) => order.claim?.type === "return" && order.type === "rent",
      );
      expect(rentReturns.length).toBeGreaterThan(0);
      rentReturns.forEach((order) => {
        const block = statementBlocksOf(order, true).find(
          (item) => item.key === "depositRefund",
        );
        if (!block) return; // 반려·거부 — 돈이 움직이지 않는다
        const deposit = amount(block.lines[0].value);
        const result = amount(block.lines[block.lines.length - 1].value);
        expect(deposit - claimFeeOf(order)).toBe(result);
      });
    });

    it("렌트 반품 판매자 귀책 · 완료 — 보증금 전액 반환 완료, 배송비는 판매자 부담", async () => {
      const { user } = renderAt("/orders-return/U-R27");
      const { lines } = await openStatement(user);

      expect(lines["보증금 반환 완료"]).toBe("130,000원");
      expect(lines["반품 배송비"]).toBeUndefined();
      expect(valueOf("배송비 부담")).toBe("판매자 부담");
      expect(valueOf("보증금 상태")).toBe("전액환급");
    });

    it("거부·재반송은 돈이 움직이지 않는다 — 금액이 아니라 처리 문장 한 줄", async () => {
      const { user } = renderAt("/orders-return/U-S20");
      const { lines, messages } = await openStatement(user);

      expect(messages).toEqual(["환불 없음 — 원거래 유지"]);
      expect(lines["환불 예정액"]).toBeUndefined();
      expect(valueOf("처리 결과")).toBe("환불 없음 — 원거래 유지");
    });

    /** 디자인 §3 #9 · 부록 A B11 — 교환 배송비 1차 미징수: 청구 줄 없음 · 고객 귀책도 「판매자 부담」 */
    it("교환 — 교환 배송비 청구 줄 없이 환불 없이 재배송 · 배송비는 판매자 부담", async () => {
      const { user } = renderAt("/orders-exchange/U-S12");
      expect(valueOf("귀책 판정")).toBe("고객 귀책");
      expect(valueOf("배송비 부담")).toBe("판매자 부담");
      const { lines, messages } = await openStatement(user);

      expect(lines["교환 배송비"]).toBeUndefined();
      expect(messages).toEqual(["환불 없음 — 검수 후 재배송"]);
      expect(valueOf("처리 결과")).toBe("환불 없음 — 검수 후 재배송");
      expect(hasRow("환불 예정액")).toBe(false);
      expect(valueOf("발송 여부")).toBe("발송 후 · 한진택배 502610112137");
    });

    it("교환 거부는 「재배송」이라 말하지 않는다", async () => {
      const { user } = renderAt("/orders-exchange/U-S28");
      const { messages } = await openStatement(user);

      expect(messages).toEqual(["교환 불가 — 원거래 유지"]);
    });
  });

  it("클레임 6항목은 주문정보 카드 안 소제목 「{유형} 정보」 아래 — 주문 상세에는 없다", () => {
    renderAt("/orders-return/U-S18");
    expect(screen.getByRole("heading", { name: "반품 정보" })).toBeVisible();
    cleanup();
    renderAt("/orders-all/U-S18");
    expect(screen.queryByRole("heading", { name: "반품 정보" })).toBeNull();
  });

  it("같은 처리단위의 주문 상세 ↔ 클레임 상세 이동은 처음부터 다시 그린다", async () => {
    const { user } = renderAt("/orders-return/U-S18");
    await user.click(screen.getByRole("button", { name: "주문 명세" }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    act(() => navigate("/orders-all/U-S18"));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { name: "주문 상세(판매)" }),
    ).toBeVisible();
  });
});
