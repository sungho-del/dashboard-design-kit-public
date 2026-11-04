import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import type { SellerNavProps } from "./SettleParts";
import {
  SettleOwnDetailPage,
  SettleOwnPage,
  SettleStatementPage,
  SettleStmtDetailPage,
  SettleTaxPage,
} from "./SettlePages";

/* -------------------------------------------------------------------------
 * 정산 묶음 — 매출 정산 · 정산 명세서(+ 상세 2) · 세금계산서 · 보증금 내역(+ 상세).
 * 숫자는 원본 캡처 `orig/28~34`. 식 자체의 정답 대조는 `settle.data.test.ts`.
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

function renderAt(Page: ComponentType<SellerNavProps>, path = "/") {
  act(() => navigate(path));
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav={path}
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("매출 정산", () => {
  it("요약 4값과 명세 — 원본 캡처 숫자", () => {
    renderAt(SettleOwnPage, "/settle-own");
    const summary = screen.getByRole("region", { name: "정산 요약" });
    for (const v of ["1,895,000", "84,000", "1,979,000", "1,639,695"])
      expect(within(summary).getByText(v)).toBeInTheDocument();
    expect(
      within(summary).getByText("지급일 2026.07.10 · D-3"),
    ).toBeInTheDocument();
    expect(screen.getByText("−100,500원")).toBeInTheDocument();
    expect(screen.getByText("+5,400원")).toBeInTheDocument();
    expect(screen.getByText("21,400원")).toBeInTheDocument();
  });

  it("거래 내역 156건 중 반영 14건 · 첫 행은 원본 정렬 첫 건 · 각주", () => {
    renderAt(SettleOwnPage, "/settle-own");
    expect(screen.getByText("156건 중 반영 14건")).toBeInTheDocument();
    expect(screen.getByText("목록 (총 156건)")).toBeInTheDocument();
    const first = bodyRows()[0];
    expect(within(first).getByText("20260626793261")).toBeInTheDocument();
    expect(
      within(first).getByText("· 교환 불성립 · 거래 유지"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1,979,000원/, { selector: "strong" }),
    ).toBeInTheDocument();
  });

  it("행을 누르면 유형별 처리단위 상세 · [정산 명세서 상세] → 회차 상세", async () => {
    const { user, onNavSelect } = renderAt(SettleOwnPage, "/settle-own");
    await user.click(bodyRows()[0]);
    expect(onNavSelect).toHaveBeenCalledWith("/sale-proc/20260626793261-1");
    await user.click(screen.getByRole("button", { name: "정산 명세서 상세" }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-own/2026.06");
  });

  it("엑셀 — 고른 행이 있으면 그것만", async () => {
    const { user } = renderAt(SettleOwnPage, "/settle-own");
    await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
    expect(
      await screen.findByText("156건을 엑셀(CSV)로 다운로드했습니다."),
    ).toBeInTheDocument();
    await user.click(within(bodyRows()[1]).getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
    expect(
      await screen.findByText("1건을 엑셀(CSV)로 다운로드했습니다. (선택분)"),
    ).toBeInTheDocument();
  });
});

describe("정산 내역/명세서 · 세금계산서", () => {
  it("명세서 3행 — 확인요청 행만 [이의제기]·[확인]", () => {
    renderAt(SettleStatementPage, "/settle-statement");
    const rows = bodyRows();
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("−244,205원")).toBeInTheDocument();
    expect(
      within(rows[0]).getByRole("button", { name: "확인" }),
    ).toBeInTheDocument();
    expect(within(rows[1]).queryByRole("button", { name: "확인" })).toBeNull();
  });

  it("[확인] → 원본 확인 창 → 알림(상태는 그대로)", async () => {
    const { user } = renderAt(SettleStatementPage, "/settle-statement");
    await user.click(
      within(bodyRows()[0]).getByRole("button", { name: "확인" }),
    );
    const dialog = screen.getByRole("dialog", { name: "정산 명세 확인" });
    expect(
      within(dialog).getByText(
        /확인 후에는 이 회차에 이의를 제기할 수 없습니다/,
      ),
    ).toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: "이상없음 확인" }),
    );
    expect(
      await screen.findByText("이상없음 확인 완료. 본사에 전달되었습니다."),
    ).toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText("확인요청")).toBeInTheDocument();
  });

  it("[이의제기] — 사유가 비면 막고, 적으면 접수 알림", async () => {
    const { user } = renderAt(SettleStatementPage, "/settle-statement");
    await user.click(
      within(bodyRows()[0]).getByRole("button", { name: "이의제기" }),
    );
    const dialog = screen.getByRole("dialog", { name: "정산 이의제기" });
    await user.click(
      within(dialog).getByRole("button", { name: "이의제기 접수" }),
    );
    expect(
      await screen.findByText("이의제기 사유를 입력해주세요."),
    ).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox"), "수수료 요율 상이");
    await user.click(
      within(dialog).getByRole("button", { name: "이의제기 접수" }),
    );
    expect(
      await screen.findByText(
        "이의제기가 접수되었습니다. 본사 검토 후 수정 명세가 재발송됩니다.",
      ),
    ).toBeInTheDocument();
  });

  it("행 · [명세서] → 명세서 상세", async () => {
    const { user, onNavSelect } = renderAt(
      SettleStatementPage,
      "/settle-statement",
    );
    await user.click(
      within(bodyRows()[1]).getByRole("button", { name: "명세서" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/settle-statement/2026.05");
  });

  it("세금계산서 — 원본 숫자 · 수취완료만 [다운로드]", async () => {
    const { user } = renderAt(SettleTaxPage, "/settle-tax");
    const rows = bodyRows();
    expect(within(rows[0]).getByText("206,635원")).toBeInTheDocument();
    expect(within(rows[0]).getByText("정산 확정 시 발행")).toBeInTheDocument();
    await user.click(within(rows[1]).getByRole("button", { name: "다운로드" }));
    expect(
      await screen.findByText("2026.05 세금계산서 다운로드"),
    ).toBeInTheDocument();
  });
});

describe("명세서 상세", () => {
  it("이번 회차 — 지급 정보 · 확인요청 안내 · 명세 · 거래 내역(No) · 주 버튼 [확인]", () => {
    renderAt(SettleStmtDetailPage, "/settle-statement/2026.06");
    expect(
      screen.getByRole("heading", { name: "정산 명세서 상세" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("우리은행 1002-***-****** (리틀베이비)"),
    ).toBeInTheDocument();
    expect(screen.getByText(/정산 명세를/)).toBeInTheDocument();
    expect(screen.getByText("지급 예정액")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "No" }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    expect(buttons.slice(-5)).toEqual([
      "다운로드",
      "이의제기",
      "취소",
      "저장",
      "확인",
    ]);
  });

  it("지난 회차 — 합계 3줄 · 거래 내역 대신 안내 · 주 버튼 [저장]", async () => {
    const { user, onNavSelect } = renderAt(
      SettleOwnDetailPage,
      "/settle-own/2026.05",
    );
    expect(
      screen.getByRole("heading", { name: "매출 정산 상세" }),
    ).toBeInTheDocument();
    expect(screen.getByText("매출 합계")).toBeInTheDocument();
    expect(screen.getByText("−398,000원")).toBeInTheDocument();
    expect(
      screen.getByText(
        "지난달 거래 내역은 명세서 다운로드로 확인할 수 있습니다.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이의제기" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByText("STM-2605 저장")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/settle-own");
  });

  it("없는 회차 — 찾을 수 없음", () => {
    renderAt(SettleStmtDetailPage, "/settle-statement/2025.01");
    expect(screen.getByText("찾을 수 없는 명세서입니다")).toBeInTheDocument();
  });
});
