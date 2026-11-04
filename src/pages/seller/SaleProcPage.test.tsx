import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SaleProcPage } from "./SaleProcPage";
import { SALE_PROC_UNITS } from "./SaleProcPage.data";

/* -------------------------------------------------------------------------
 * 발주 관리 — **원본 v0.4 의 동작**을 본다(카드 · 열 구성 · 상태변경 버튼 · 게이트 · 알림 문구).
 * 숫자는 원본을 브라우저로 열어 읽은 값이다(신규 주문 9 · 배송 지연 3 · 배송 준비 10).
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

function renderPage() {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SaleProcPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/sale-proc"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const cards = () => screen.getByRole("group", { name: "처리 상태별 건수" });
const bulk = () => screen.getByRole("group", { name: "상태 변경" });
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
const headers = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((th) => th.textContent?.trim());
const pickRows = async (
  user: ReturnType<typeof userEvent.setup>,
  n: number,
) => {
  for (const row of rows().slice(0, n))
    await user.click(within(row).getByRole("checkbox"));
};

describe("SaleProcPage — 발주 관리", () => {
  it("상태 카드 3장 — 원본 순서·건수, 들어오면 신규 주문", () => {
    renderPage();
    const labels = within(cards())
      .getAllByRole("button")
      .map((b) => b.textContent?.replace(/\s+/g, ""));
    expect(labels).toEqual(["신규주문9건", "배송지연3건", "배송준비10건"]);
    expect(
      within(cards()).getByRole("button", { name: /신규 주문/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("heading", { name: "목록 (총 9건)" }),
    ).toBeVisible();
  });

  it("대상은 판매 처리단위의 신규 주문·배송 준비·배송 지연 22건(원본 SCREENS.saleProc)", () => {
    expect(SALE_PROC_UNITS).toHaveLength(22);
  });

  it("신규 주문 카드에는 택배사·송장번호 열이 없고, 배송 준비 카드에서 생긴다", async () => {
    const { user } = renderPage();
    expect(headers()).not.toContain("택배사");
    expect(headers()).toHaveLength(24);

    await user.click(
      within(cards()).getByRole("button", { name: /배송 준비/ }),
    );
    expect(headers()).toContain("택배사");
    expect(headers()).toContain("송장번호");
    expect(headers()).toHaveLength(26);
  });

  it.each([
    ["신규 주문", ["배송 준비", "배송 지연", "주문 취소"]],
    ["배송 준비", ["배송중", "배송 지연", "주문 취소"]],
    ["배송 지연", ["배송중", "배송 준비", "주문 취소"]],
  ])(
    "%s 카드의 상태변경 버튼은 갈 수 있는 곳만 — %j",
    async (card, buttons) => {
      const { user } = renderPage();
      await user.click(
        within(cards()).getByRole("button", { name: new RegExp(card) }),
      );
      expect(
        within(bulk())
          .getAllByRole("button")
          .map((b) => b.textContent),
      ).toEqual(buttons);
    },
  );

  it("아무것도 고르지 않고 누르면 「선택된 항목이 없습니다.」", async () => {
    const { user } = renderPage();
    await user.click(within(bulk()).getByRole("button", { name: "배송 준비" }));
    expect(await screen.findByText("선택된 항목이 없습니다.")).toBeVisible();
  });

  it("[주문 취소]는 2건 이상 고르면 잠긴다 — 1건이면 사유 창이 열린다", async () => {
    const { user } = renderPage();
    await pickRows(user, 2);
    expect(
      within(bulk()).getByRole("button", { name: "주문 취소" }),
    ).toBeDisabled();

    await user.click(within(rows()[1]).getByRole("checkbox"));
    await user.click(within(bulk()).getByRole("button", { name: "주문 취소" }));
    const dialog = await screen.findByRole("dialog", {
      name: "주문 취소 사유",
    });
    expect(within(dialog).getByText("고객 주문 내역에 노출")).toBeVisible();
  });

  it("[배송 준비] → 「상태 변경 확인」 현재 신규 주문 → 변경 후 배송 준비 → 확인하면 원본 알림", async () => {
    const { user } = renderPage();
    await pickRows(user, 1);
    await user.click(within(bulk()).getByRole("button", { name: "배송 준비" }));

    const dialog = await screen.findByRole("dialog", {
      name: "상태 변경 확인",
    });
    expect(within(dialog).getByText("현재")).toBeVisible();
    expect(within(dialog).getByText("신규 주문")).toBeVisible();
    expect(within(dialog).getByText("배송 준비")).toBeVisible();
    await user.click(within(dialog).getByRole("button", { name: "확인" }));

    expect(
      await screen.findByText("'배송 준비' 상태로 변경했습니다."),
    ).toBeVisible();
    /* 퍼블 범위 — 목록은 바뀌지 않는다 */
    expect(
      screen.getByRole("heading", { name: "목록 (총 9건)" }),
    ).toBeVisible();
  });

  it("[배송 지연] 사유 창 — 직접입력이 비면 알림, 적으면 사유가 알림에 실린다", async () => {
    const { user } = renderPage();
    await pickRows(user, 2);
    await user.click(within(bulk()).getByRole("button", { name: "배송 지연" }));

    const dialog = await screen.findByRole("dialog", {
      name: "배송 지연 사유 (2건)",
    });
    await user.click(within(dialog).getByRole("radio", { name: "직접입력" }));
    await user.click(
      within(dialog).getByRole("button", { name: "배송 지연 처리" }),
    );
    expect(await screen.findByText("지연 사유를 입력해주세요.")).toBeVisible();

    await user.type(
      within(dialog).getByRole("textbox", { name: "배송 지연 사유 직접입력" }),
      "협력사 입고 지연",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "배송 지연 처리" }),
    );
    expect(
      await screen.findByText(
        "2건을 배송 지연 처리했습니다. (사유: 협력사 입고 지연)",
      ),
    ).toBeVisible();
  });

  it("행 [송장등록] — 택배사 → 송장번호 순으로 막고, 둘 다 있으면 배송 관리로 넘긴다는 알림", async () => {
    const { user } = renderPage();
    await user.click(
      within(cards()).getByRole("button", { name: /배송 준비/ }),
    );
    const row = rows()[0];
    const submit = within(row).getByRole("button", { name: "송장등록" });

    await user.click(submit);
    expect(
      await screen.findByText("택배사를 먼저 선택해주세요."),
    ).toBeVisible();

    await user.click(within(row).getByRole("combobox", { name: /택배사/ }));
    await user.click(screen.getByRole("option", { name: "CJ대한통운" }));
    await user.click(submit);
    expect(await screen.findByText("송장번호를 입력해주세요.")).toBeVisible();

    await user.type(
      within(row).getByRole("textbox", { name: /송장번호/ }),
      "612877412203",
    );
    await user.click(submit);
    expect(
      await screen.findByText("송장 등록 완료 → [배송 관리]로 이동했습니다."),
    ).toBeVisible();
  });

  it("주문번호를 누르면 그 처리단위의 발주 관리 상세로 간다", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(screen.getByRole("button", { name: "20260623864962" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sale-proc/20260623864962-1");
  });

  it("결제금액은 원본 계산값 — 20260623864962 = 63,500원(저장값 45,000원이 아니다)", () => {
    renderPage();
    const row = rows().find((r) => within(r).queryByText("20260623864962"))!;
    expect(within(row).getByText("63,500원")).toBeVisible();
  });

  it("검색어로 좁히면 카드 건수도 같이 줄고, 엑셀은 조회 결과 건수를 알린다", async () => {
    const { user } = renderPage();
    await user.type(screen.getByRole("textbox", { name: "검색어" }), "서민준");
    expect(
      screen.getByRole("heading", { name: /목록 \(총 \d+건\)/ }).textContent,
    ).not.toBe("목록 (총 9건)");
    await user.click(screen.getByRole("button", { name: /엑셀 다운로드/ }));
    expect(
      await screen.findByText(/건을 엑셀\(CSV\)로 다운로드했습니다\.$/),
    ).toBeVisible();
  });
});
