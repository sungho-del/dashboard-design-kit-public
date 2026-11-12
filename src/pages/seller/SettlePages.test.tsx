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
import { canObjectOf, objectedNoteOf, requestNoteOf } from "./settle.data";

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
    /* 부록 A A9-1(개발 §3-2-1 — 입점사 매출 정산도 같이) */
    expect(
      within(summary).getByText("확정 거래액 (판매가)"),
    ).toBeInTheDocument();
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

  /* 기획 답 2026-11-06 §2 #7 — 차감 다음 열 · 없으면 「-」 */
  it("가산(보전·셀러 귀속) 열 — 차감 다음 · 이번 회차 +5,400원 · 지난 회차 「-」", () => {
    renderAt(SettleStatementPage, "/settle-statement");
    const heads = screen
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    const at = heads.indexOf("가산(보전·셀러 귀속)");
    expect(at).toBe(heads.indexOf("차감(수수료·PG)") + 1);
    expect(heads[at + 1]).toBe("지급액");
    const cellOf = (row: HTMLElement) =>
      within(row).getAllByRole("cell")[at].textContent;
    expect(bodyRows().map(cellOf)).toEqual(["+5,400원", "-", "-"]);
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

  it("세금계산서 — 원본 숫자 · 수취완료는 [다운로드] 비활성 + 「연동 준비 중」(개발 요청 40번) · 그 밖은 「매월 10일 발행」(판정 Q4)", () => {
    renderAt(SettleTaxPage, "/settle-tax");
    const rows = bodyRows();
    expect(within(rows[0]).getByText("206,635원")).toBeInTheDocument();
    expect(within(rows[0]).getByText("매월 10일 발행")).toBeInTheDocument();
    expect(
      within(rows[1]).getByRole("button", { name: "다운로드" }),
    ).toBeDisabled();
    expect(within(rows[1]).getByText("연동 준비 중")).toBeInTheDocument();
    /* 공급자는 기획 답(11-10 3번) 예시 그대로 */
    expect(within(rows[1]).getByText("주식회사 렌티크")).toBeInTheDocument();
  });
});

describe("명세서 상세", () => {
  it("이번 회차 — 지급 정보 · 확인요청 안내 · 명세 · 거래 내역(No) · 주 버튼 [확인]", () => {
    renderAt(SettleStmtDetailPage, "/settle-statement/2026.06");
    expect(
      screen.getByRole("heading", { name: "정산 명세서 상세" }),
    ).toBeInTheDocument();
    /* 계좌번호는 서버에 없어 develop 문구(개발 요청 39번) */
    expect(
      screen.getByText("우리은행 등록 계좌 (리틀베이비) · 검증 완료"),
    ).toBeInTheDocument();
    expect(screen.getByText(/정산 명세를/)).toBeInTheDocument();
    expect(screen.getByText("지급 예정액")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "No" }),
    ).toBeInTheDocument();
    const buttons = screen.getAllByRole("button").map((b) => b.textContent);
    /* [저장]·[취소]는 없다 — 저장할 것이 없다(개발 요청 38번) */
    expect(buttons.slice(-3)).toEqual(["다운로드", "이의제기", "확인"]);
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
  });

  it("지난 회차 — 전체 명세(합계 줄 「지급액」) · 거래 내역 표 자리 · 지급완료일 · 이의제기 사유 · 수정 명세 재발송(개발 요청 36·37번)", async () => {
    const { user, onNavSelect } = renderAt(
      SettleOwnDetailPage,
      "/settle-own/2026.05",
    );
    expect(
      screen.getByRole("heading", { name: "매출 정산 상세" }),
    ).toBeInTheDocument();
    /* 이번 회차와 같은 명세 꼴 — 판매 수수료 10% · PG 3% · 나머지 차감 */
    expect(screen.getByText("판매 수수료")).toBeInTheDocument();
    expect(screen.getByText("지급액")).toBeInTheDocument();
    expect(screen.getByText("2,443,000원")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "2026년 05월 거래 내역" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "지난달 거래 내역은 명세서 다운로드로 확인할 수 있습니다.",
      ),
    ).toBeNull();
    /* 지난 회차도 거래 표가 그려지고, 정산 반영 · 각주는 그 회차(05월) 기준이다 */
    expect(
      screen.getByRole("columnheader", { name: "정산 반영" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("반영").length).toBeGreaterThan(0);
    expect(screen.getByText(/3건 · 279,000원/)).toBeInTheDocument();
    expect(screen.getByText("2026년 05월 확정분")).toBeInTheDocument();
    expect(screen.getByText("지급완료일")).toBeInTheDocument();
    expect(
      screen.getByText("취소·반품 차감 금액이 주문 내역과 다릅니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("수정 명세 재발송")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이의제기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "저장" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/settle-own");
  });

  it("확인요청 안내 꼬리 · 이의제기 접수 안내 — 이미 제기한 회차 / 이의제기 상태(개발 요청 36번)", () => {
    const base = { stat: "확인요청" as const };
    expect(requestNoteOf(base)).toContain(
      "(확인·이의제기 기간 **3일** · 회차당 1회).",
    );
    expect(
      requestNoteOf({ ...base, objection: { reason: "x", at: "y" } }),
    ).toContain(
      "회차당 1회 — **이미 제기한 회차**라 재제기는 할 수 없습니다).",
    );
    expect(
      objectedNoteOf({ stat: "이의제기", objection: { reason: "x", at: "y" } }),
    ).toBe(
      "**이의제기 접수됨** — 본사가 명세를 검토 중입니다. 수정 명세가 재발송되면 다시 확인해 주세요.",
    );
    expect(canObjectOf({ ...base, objection: { reason: "x", at: "y" } })).toBe(
      false,
    );
  });

  it("매출 정산 — 정산 회차가 없으면 빈 화면(`?preview=empty` · 개발 요청 35번)", () => {
    renderAt(SettleOwnPage, "/settle-own?preview=empty");
    expect(screen.getByText("아직 정산 회차가 없습니다.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "첫 매출이 확정되면 그 달의 정산 회차가 열리고 이 화면에 명세가 표시됩니다.",
      ),
    ).toBeInTheDocument();
  });

  it("정산 정책 — 보증금 문장은 「분리 관리됩니다」 · 「미정의」 절 없음", () => {
    renderAt(SettleStmtDetailPage, "/settle-statement/2026.06");
    const policy = screen.getByText(/매출 확정 기준/).closest("p");
    expect(policy?.textContent).toContain(
      "보증금·연체료·배상은 보증금 내역에서 분리 관리됩니다. 지급 전 발견 오류는 본사가 직권 정정합니다.",
    );
    expect(policy?.textContent).not.toMatch(/미정의|이 명세에 포함되지/);
    /* develop 셀러 귀속 줄(개발 요청 38번) */
    expect(policy?.textContent).toContain(
      "+ 셀러 귀속 위약금·픽업 요금·배송비(수수료 비대상)이며",
    );
    /* 기획 답 2026-11-06 §4 #26 */
    expect(policy?.textContent).toContain("− PG 수수료 − 취소·반품 차감");
    expect(policy?.textContent).not.toContain("요율 미정");
  });

  it("없는 회차 — 찾을 수 없음", () => {
    renderAt(SettleStmtDetailPage, "/settle-statement/2025.01");
    expect(screen.getByText("찾을 수 없는 명세서입니다")).toBeInTheDocument();
  });
});
