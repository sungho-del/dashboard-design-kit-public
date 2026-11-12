import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import {
  SaleCancelPage,
  SaleExchangePage,
  SaleReturnPage,
  type SaleClaimPageProps,
} from "./SaleClaimPages";

/* -------------------------------------------------------------------------
 * 취소·반품·교환 관리 — 원본 v0.4 카드·버튼·송장 칸·클레임 게이트.
 * 숫자는 원본을 브라우저로 열어 읽은 값이다(캡처 `orig/09·11·13` — 취소 5/1/3 · 반품·교환 5/9/7).
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

function renderPage(Page: ComponentType<SaleClaimPageProps>) {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-return"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const cards = () => screen.getByRole("group", { name: "처리 상태별 건수" });
const cardLabels = () =>
  within(cards())
    .getAllByRole("button")
    .map((b) => b.textContent?.replace(/\s+/g, ""));
const bulkButtons = () =>
  within(screen.getByRole("group", { name: "상태 변경" }))
    .getAllByRole("button")
    .map((b) => b.textContent);
const bulk = (name: string) =>
  within(screen.getByRole("group", { name: "상태 변경" })).getByRole("button", {
    name,
  });
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
const rowOf = (no: string) => rows().find((r) => within(r).queryByText(no))!;
const headers = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((th) => th.textContent?.trim());

describe("SaleCancelPage — 취소 관리", () => {
  it("카드 3장 원본 건수 · 첫 행 · 단계마다 다음 한 곳만", async () => {
    const { user } = renderPage(SaleCancelPage);
    expect(cardLabels()).toEqual([
      "취소요청5건",
      "환불처리중1건",
      "취소완료3건",
    ]);
    expect(rows()[0]).toHaveTextContent("20260628200061");
    expect(rows()[0]).toHaveTextContent("76,000원");
    expect(bulkButtons()).toEqual(["환불 처리중"]);
    await user.click(
      within(cards()).getByRole("button", { name: /환불 처리중/ }),
    );
    expect(bulkButtons()).toEqual(["취소 완료"]);
    await user.click(
      within(cards()).getByRole("button", { name: /취소 완료/ }),
    );
    expect(
      screen.queryByRole("group", { name: "상태 변경" }),
    ).not.toBeInTheDocument();
  });

  it("[환불 처리중] 1건 → 「환불 처리」 창에 그 건의 환불 미리보기 → 원본 알림", async () => {
    const { user } = renderPage(SaleCancelPage);
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(bulk("환불 처리중"));
    const dialog = await screen.findByRole("dialog", { name: "환불 처리" });
    expect(within(dialog).getByText("환불 예정액")).toBeVisible();
    expect(within(dialog).getByText("결제금액 전액")).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "환불 처리 시작" }),
    );
    expect(
      await screen.findByText(
        "환불 처리중으로 변경되었습니다 — 확정된 내역으로 환불이 진행됩니다.",
      ),
    ).toBeVisible();
  });

  it("행 송장 칸은 읽기 전용 + [상세 처리] → 취소 상세(개발 요청 19번)", async () => {
    const { user, onNavSelect } = renderPage(SaleCancelPage);
    const row = rows()[0];
    expect(
      within(row).getByRole("combobox", { name: /택배사/ }),
    ).toBeDisabled();
    expect(
      within(row).getByRole("textbox", { name: /송장번호/ }),
    ).toBeDisabled();
    expect(within(row).queryByRole("button", { name: "송장등록" })).toBeNull();
    await user.click(within(row).getByRole("button", { name: "상세 처리" }));
    expect(onNavSelect.mock.calls[0][0]).toMatch(/^\/sale-cancel\//);
  });
});

describe("SaleReturnPage — 반품 관리", () => {
  it("카드 = 단계 버킷 접수·진행·완료(원본 건수) · 수거 송장 열 · 버킷마다 갈 곳", async () => {
    const { user } = renderPage(SaleReturnPage);
    expect(cardLabels()).toEqual(["접수5건", "진행9건", "완료7건"]);
    expect(rows()[0]).toHaveTextContent("20260627514785");
    expect(headers()).toContain("수거 택배사");
    expect(headers()).toContain("수거 송장번호");
    expect(bulkButtons()).toEqual(["반품 승인", "반품 거부"]);
    await user.click(within(cards()).getByRole("button", { name: /진행/ }));
    expect(bulkButtons()).toEqual([
      "반품 수거완료",
      "반품 검수",
      "환불 처리중",
      "반품 완료",
    ]);
    await user.click(within(cards()).getByRole("button", { name: /완료/ }));
    expect(
      screen.queryByRole("group", { name: "상태 변경" }),
    ).not.toBeInTheDocument();
  });

  it("[반품 거부] → 사유 필수 창 — 비면 막고, 적으면 원본 알림", async () => {
    const { user } = renderPage(SaleReturnPage);
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(bulk("반품 거부"));
    const dialog = await screen.findByRole("dialog", {
      name: "반품 거부 사유 입력",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "반품 거부 처리" }),
    );
    expect(await screen.findByText("사유를 입력해주세요.")).toBeVisible();
    await user.type(within(dialog).getByRole("textbox"), "사용 흔적 확인");
    await user.click(
      within(dialog).getByRole("button", { name: "반품 거부 처리" }),
    );
    expect(
      await screen.findByText(
        "'반품 거부' 처리되었습니다 — 입력한 사유가 고객 주문 내역에 노출됩니다.",
      ),
    ).toBeVisible();
  });

  it("[반품 승인] 2건 → 확인 창 → 「수거 절차를 진행해주세요」가 붙는다", async () => {
    const { user } = renderPage(SaleReturnPage);
    for (const row of rows().slice(0, 2))
      await user.click(within(row).getByRole("checkbox"));
    await user.click(bulk("반품 승인"));
    const dialog = await screen.findByRole("dialog", {
      name: "상태 변경 확인 (2건)",
    });
    await user.click(within(dialog).getByRole("button", { name: "확인" }));
    expect(
      await screen.findByText(
        "2건 '반품 승인' 처리되었습니다. 수거 절차를 진행해주세요.",
      ),
    ).toBeVisible();
  });

  it("[반품 완료] → 되돌릴 수 없음 고지 창(원본 `gateRefundDone`)", async () => {
    const { user } = renderPage(SaleReturnPage);
    await user.click(within(cards()).getByRole("button", { name: /진행/ }));
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(bulk("반품 완료"));
    const dialog = await screen.findByRole("dialog", {
      name: "반품 완료 처리",
    });
    expect(
      within(dialog).getByText("처리 후 되돌릴 수 없습니다."),
    ).toBeVisible();
  });

  it("수거 송장은 신청 상태만 고친다 · 방문 수령 건은 잠김(D-315) · [송장등록] → 수거중", async () => {
    const { user } = renderPage(SaleReturnPage);
    /* 방문 수령 · 반품 신청 */
    const pickup = rowOf("20260612923774");
    expect(
      within(pickup).getByRole("textbox", { name: /수거 송장번호/ }),
    ).toBeDisabled();

    const row = rowOf("20260627514785");
    await user.click(within(row).getByRole("button", { name: "송장등록" }));
    expect(
      await screen.findByText("수거 택배사와 수거 송장번호를 입력해주세요."),
    ).toBeVisible();
    await user.click(
      within(row).getByRole("combobox", { name: /수거 택배사/ }),
    );
    await user.click(screen.getByRole("option", { name: "롯데택배" }));
    await user.type(
      within(row).getByRole("textbox", { name: /수거 송장번호/ }),
      "606100000001",
    );
    await user.click(within(row).getByRole("button", { name: "송장등록" }));
    expect(
      await screen.findByText(
        "수거 송장 등록 완료 → '반품 수거중'로 진행했습니다.",
      ),
    ).toBeVisible();

    await user.click(within(cards()).getByRole("button", { name: /진행/ }));
    expect(
      within(rows()[0]).getByRole("button", { name: "송장등록" }),
    ).toBeDisabled();
  });

  it("주문번호 → 반품 상세", async () => {
    const { user, onNavSelect } = renderPage(SaleReturnPage);
    await user.click(screen.getByRole("button", { name: "20260627514785" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sale-return/20260627514785-1");
  });
});

describe("SaleExchangePage — 교환 관리", () => {
  it("카드 원본 건수 · 진행 버킷 버튼 · [교환 재배송] 은 송장 창(택배사 먼저)", async () => {
    const { user } = renderPage(SaleExchangePage);
    expect(cardLabels()).toEqual(["접수5건", "진행9건", "완료7건"]);
    expect(bulkButtons()).toEqual(["교환 승인", "교환 거부"]);
    await user.click(within(cards()).getByRole("button", { name: /진행/ }));
    expect(bulkButtons()).toEqual([
      "교환 수거완료",
      "교환 검수",
      "교환 재배송",
      "교환 완료",
    ]);
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(bulk("교환 재배송"));
    const dialog = await screen.findByRole("dialog", {
      name: "교환 재배송 송장 등록",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "재배송 처리" }),
    );
    expect(await screen.findByText("택배사를 선택해주세요.")).toBeVisible();
  });
});
