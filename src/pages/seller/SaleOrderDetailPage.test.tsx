import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { pickupOf } from "./orderUnit.data";
import { SaleOrderDetailPage } from "./SaleOrderDetailPage";
import { UNITS } from "./seed/orders.data";

/* -------------------------------------------------------------------------
 * 발주 관리 상세 — **원본 v0.4 의 값·동작**을 본다(구역 · 상태 셀렉트 게이트 · 송장 등록 · 하단 바).
 * 값은 원본을 브라우저로 열어 읽은 것이다(캡처 `orig/06_saleOrderDetail` — 20260623864962-1).
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
afterAll(() => vi.unstubAllGlobals());

function renderAt(id: string) {
  navigate(`/sale-proc/${id}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SaleOrderDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-proc"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const DEFAULT_ID = "20260623864962-1";
/** 라벨 → 그 줄의 값 칸 */
const valueOf = (label: string) =>
  screen.getByText(label, { selector: "dt, span, div" }).parentElement!;
const bar = () => screen.getByRole("button", { name: "목록" }).parentElement!;

describe("SaleOrderDetailPage — 발주 관리 상세", () => {
  it("다섯 구역이 원본 순서로 선다", () => {
    renderAt(DEFAULT_ID);
    /* 구역 접기 버튼만 — GNB 「메뉴 접기」는 뺀다 */
    expect(
      screen
        .getAllByRole("button", { name: / 접기$/, expanded: true })
        .map((b) => b.getAttribute("aria-label")?.replace(/ 접기$/, ""))
        .filter((name) => name !== "메뉴"),
    ).toEqual([
      "주문정보",
      "상품정보",
      "배송정보",
      "배송지 정보",
      "주문 처리 이력",
    ]);
  });

  it("원본에서 읽은 값 그대로 — 주문·상품·배송·배송지", () => {
    renderAt(DEFAULT_ID);
    for (const text of [
      "2026.06.23 09:15",
      "신용카드",
      "user4962@babycube.kr",
      "베이비큐브 프리미엄 모유저장팩 세트",
      "QR270902",
      "피셔프라이스",
      "신생아·0~3개월",
      "범퍼가드",
      "전용 세척키트",
      "3,000원",
      "배송 전 연락 부탁드립니다",
    ])
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(valueOf("수량")).toHaveTextContent("1개");
    /* 택배사는 상품 등록 택배사가 미리 골라져 있다(원본 `udCourier`) */
    expect(screen.getByRole("combobox", { name: "택배사" })).toHaveTextContent(
      "롯데택배",
    );
  });

  it("배송정보 날짜는 도달한 단계까지만 — 신규 주문은 모두 「-」", () => {
    renderAt(DEFAULT_ID);
    for (const label of [
      "주문확인일",
      "배송처리일",
      "배송완료일",
      "구매확정일",
    ])
      expect(valueOf(label)).toHaveTextContent(/^.+-$/);
    expect(valueOf("지연 사유")).toHaveTextContent(/-$/);
  });

  it("배송지 정보에 「추가 연락처」 행(D-349·D-345) — 수령인 연락처 아래, 없으면 「-」", () => {
    renderAt(DEFAULT_ID);
    const labels = [
      "수령인",
      "수령인 연락처",
      "추가 연락처",
      "배송지",
      "배송 메모",
    ];
    const nodes = labels.map((l) =>
      screen.getByText(l, { selector: "dt, span, div" }),
    );
    for (let i = 1; i < nodes.length; i++)
      expect(
        nodes[i - 1].compareDocumentPosition(nodes[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    expect(valueOf("추가 연락처")).toHaveTextContent(/-$/);
  });

  it("결제금액 63,500원 + [주문 명세] — 원본 명세 줄과 결과", async () => {
    const { user } = renderAt(DEFAULT_ID);
    expect(valueOf("결제금액")).toHaveTextContent("63,500원");
    await user.click(screen.getByRole("button", { name: "주문 명세" }));
    const dialog = await screen.findByRole("dialog", {
      name: "주문 명세 · 20260623864962",
    });
    for (const text of [
      "판매 원가",
      "상품 할인",
      "판매가",
      "소계",
      "범퍼가드",
      "배송비",
    ])
      expect(within(dialog).getByText(text)).toBeVisible();
    expect(within(dialog).getByText("+3,000원")).toBeVisible();
    expect(within(dialog).getByText("63,500원")).toBeVisible();
  });

  it("처리 이력 — 신규 주문 한 줄(결제 일시)", () => {
    renderAt(DEFAULT_ID);
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("신규 주문2026.06.23 09:15");
  });

  it("상태 셀렉트 [배송 준비] → 「상태 변경 확인」 → 원본 알림 · 셀렉트는 지금 상태 그대로", async () => {
    const { user } = renderAt(DEFAULT_ID);
    const select = screen.getByRole("combobox", { name: "상품주문상태" });
    await user.click(select);
    await user.click(screen.getByRole("option", { name: "배송 준비" }));
    const dialog = await screen.findByRole("dialog", {
      name: "상태 변경 확인",
    });
    await user.click(within(dialog).getByRole("button", { name: "확인" }));
    expect(
      await screen.findByText("'배송 준비' 상태로 변경했습니다."),
    ).toBeVisible();
    expect(select).toHaveTextContent("신규 주문");
  });

  it("상태 셀렉트 [배송 지연] 은 확인 창 없이 바로 사유 창(원본)", async () => {
    const { user } = renderAt(DEFAULT_ID);
    await user.click(screen.getByRole("combobox", { name: "상품주문상태" }));
    await user.click(screen.getByRole("option", { name: "배송 지연" }));
    const dialog = await screen.findByRole("dialog", {
      name: "배송 지연 사유",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "배송 지연 처리" }),
    );
    expect(
      await screen.findByText("배송 지연 처리했습니다. (사유: 택배사 지연)"),
    ).toBeVisible();
  });

  it("하단 [주문 취소] → 셀러 사정 취소 창 → 원본 알림", async () => {
    const { user } = renderAt(DEFAULT_ID);
    await user.click(within(bar()).getByRole("button", { name: "주문 취소" }));
    const dialog = await screen.findByRole("dialog", {
      name: "주문 취소 사유",
    });
    expect(within(dialog).getByText("취소 수수료가 면제")).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "주문 취소 처리" }),
    );
    expect(
      await screen.findByText(
        /셀러 사정 취소로 기록되어 취소 수수료가 면제됩니다/,
      ),
    ).toBeVisible();
  });

  it("[송장등록 · 배송처리] — 송장번호가 비면 막고, 적으면 배송 관리로 넘긴다는 알림", async () => {
    const { user } = renderAt(DEFAULT_ID);
    const submit = screen.getByRole("button", { name: "송장등록 · 배송처리" });
    await user.click(submit);
    expect(await screen.findByText("송장번호를 입력해주세요.")).toBeVisible();
    await user.type(
      screen.getByRole("textbox", { name: "송장번호" }),
      "612877412203",
    );
    await user.click(submit);
    expect(
      await screen.findByText("송장 등록 완료 → [배송 관리]로 이동했습니다."),
    ).toBeVisible();
  });

  it("[배송지 변경] — 지금 배송지가 채워져 열리고, 비우면(공백만도) 잠기고, 적으면 원본 알림", async () => {
    const { user } = renderAt(DEFAULT_ID);
    await user.click(
      within(bar()).getByRole("button", { name: "배송지 변경" }),
    );
    const dialog = await screen.findByRole("dialog", { name: "배송지 변경" });
    const field = within(dialog).getByRole("textbox", {
      name: "변경할 배송지",
    });
    expect(field).toHaveValue("배송지 정보");
    const confirm = within(dialog).getByRole("button", { name: "변경" });
    await user.clear(field);
    await user.type(field, "   ");
    expect(confirm).toBeDisabled();
    await user.clear(field);
    await user.type(field, "서울 성동구 왕십리로 1");
    await user.click(confirm);
    expect(await screen.findByText("배송지를 변경했습니다.")).toBeVisible();
  });

  it("하단 바 — [목록]·[취소]는 목록으로, [변경 저장]은 처리단위 번호로 알림(원본)", async () => {
    const { user, onNavSelect } = renderAt(DEFAULT_ID);
    expect(
      within(bar().lastElementChild as HTMLElement)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["배송지 변경", "주문 취소", "취소", "변경 저장"]);
    await user.click(within(bar()).getByRole("button", { name: "변경 저장" }));
    expect(await screen.findByText("20260623864962-1 변경 저장")).toBeVisible();
    await user.click(within(bar()).getByRole("button", { name: "목록" }));
    await user.click(within(bar()).getByRole("button", { name: "취소" }));
    expect(onNavSelect.mock.calls).toEqual([["/sale-proc"], ["/sale-proc"]]);
  });

  it("출고 뒤(배송중) — 상태는 배지, 택배사·송장은 읽기만, 처리 버튼 없음", () => {
    renderAt("20260622541158-1");
    expect(
      screen.queryByRole("combobox", { name: "상품주문상태" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "택배사" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "송장등록 · 배송처리" }),
    ).not.toBeInTheDocument();
    expect(
      within(bar().lastElementChild as HTMLElement)
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["취소", "변경 저장"]);
    /* 배송중 = 2단계까지 도달 — 주문확인·배송처리일이 찍히고 배송완료일은 「-」 */
    expect(valueOf("배송처리일")).toHaveTextContent(/\d{4}\.\d{2}\.\d{2}/);
    expect(valueOf("배송완료일")).toHaveTextContent(/-$/);
  });

  it("구매확정 건은 구매확정일이 찍힌다", () => {
    renderAt("20260621138969-1");
    expect(valueOf("구매확정일")).toHaveTextContent(/\d{4}\.\d{2}\.\d{2}/);
  });

  it("방문 수령 건은 수령지를 보이고 택배 줄을 뺀다", () => {
    const unit = UNITS.find((u) => u.type === "판매" && pickupOf(u));
    expect(unit).toBeDefined();
    renderAt(unit!.id);
    expect(valueOf("배송 방법")).toHaveTextContent(/^배송 방법방문 수령 · /);
    expect(screen.queryByText("택배사")).not.toBeInTheDocument();
    expect(valueOf("배송비")).toHaveTextContent("무료");
  });

  it("판매가 아니거나 없는 처리단위는 「찾을 수 없음」 + 발주 관리로", async () => {
    const rent = UNITS.find((u) => u.type === "렌트")!;
    const { user, onNavSelect } = renderAt(rent.id);
    expect(screen.getByText("찾을 수 없는 주문입니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "발주 관리로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sale-proc");
  });
});
