import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { RentDepositDetailPage, RentDepositPage } from "./RentDepositPages";
import type { SellerNavProps } from "./SettleParts";

/* -------------------------------------------------------------------------
 * 보증금 내역 · 보증금 상세 — 숫자는 원본 캡처 `orig/30·31`. 식의 정답 대조는 `settle.data.test.ts`.
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
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(screen.getByRole("option", { name: option }));
}

describe("보증금 내역", () => {
  it("요약 4값 · 18건 · 첫 행 원본과 같다", () => {
    renderAt(RentDepositPage, "/rent-deposit");
    const summary = screen.getByRole("region", { name: "보증금 요약" });
    for (const v of ["458,600", "27,500", "20,500", "5,000"])
      expect(within(summary).getByText(v)).toBeInTheDocument();
    expect(screen.getByText("목록 (총 18건)")).toBeInTheDocument();
    const first = bodyRows()[0];
    expect(within(first).getByText("20260618360509")).toBeInTheDocument();
    expect(within(first).getByText("환급완료(전액환급)")).toBeInTheDocument();
  });

  it("보증금 상태 · 안심케어 · 검색으로 거른다(요약은 그대로)", async () => {
    const { user } = renderAt(RentDepositPage, "/rent-deposit");
    await pick(user, "보증금 상태", "전액차감");
    expect(screen.getByText("목록 (총 1건)")).toBeInTheDocument();
    expect(within(bodyRows()[0]).getByText("−5,000원")).toBeInTheDocument();
    expect(screen.getByText("보증금 상태 전액차감")).toBeInTheDocument();
    await pick(user, "보증금 상태", "보증금 상태 전체");
    await pick(user, "안심케어", "가입");
    const careCount = Number(
      screen.getByText(/^목록 \(총 \d+건\)$/).textContent?.match(/\d+/)?.[0],
    );
    expect(careCount).toBeGreaterThan(0);
    expect(careCount).toBeLessThan(18);
    expect(
      within(screen.getByRole("region", { name: "보증금 요약" })).getByText(
        "458,600",
      ),
    ).toBeInTheDocument();
  });

  it("행을 누르면 보증금 상세", async () => {
    const { user, onNavSelect } = renderAt(RentDepositPage, "/rent-deposit");
    await user.click(bodyRows()[0]);
    expect(onNavSelect).toHaveBeenCalledWith("/rent-deposit/20260618360509-1");
  });
});

describe("보증금 상세", () => {
  it("환급 완료 건 — 원본 캡처 항목 · 계산 · 처리 상태", () => {
    renderAt(RentDepositDetailPage, "/rent-deposit/20260618360509-1");
    expect(
      screen.getByRole("heading", { name: "보증금 내역 상세" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026.04.18 ~ 2026.05.18")).toBeInTheDocument();
    expect(screen.getByText("등록 3장")).toBeInTheDocument();
    expect(screen.getByText("반환 예정액")).toBeInTheDocument();
    expect(screen.getByText(/보증금 반환 실행됨/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "검수·반납 상세에서 처리" }),
    ).toBeNull();
  });

  it("환급 대기 건 — [검수·반납 상세에서 처리] 로 간다", async () => {
    const { user, onNavSelect } = renderAt(
      RentDepositDetailPage,
      "/rent-deposit/20260610176468-1",
    );
    await user.click(
      screen.getByRole("button", { name: "검수·반납 상세에서 처리" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith(
      "/rent-insp-return/20260610176468-1",
    );
  });

  it("판매 건·없는 건 — 찾을 수 없음", () => {
    renderAt(RentDepositDetailPage, "/rent-deposit/20260626793261-1");
    expect(screen.getByText("찾을 수 없는 보증금입니다")).toBeInTheDocument();
  });
});
