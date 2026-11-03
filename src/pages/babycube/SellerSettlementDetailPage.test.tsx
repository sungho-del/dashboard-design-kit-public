import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerSettlementDetailPage } from "./SellerSettlementDetailPage";

/* -------------------------------------------------------------------------
 * 셀러 정산 상세 (BO-STL-003) — 기획 v0.4 `DETAILS.settlement`
 *
 * 경로로 직접 렌더한다(`/settle-seller/{셀러 id}`). 기대 금액은 사례표(`settle-cases.md`) 손계산 값.
 * 명세(요율 N% · 0원 하한 · 미회수) · 정산 정보(이의 사유는 이의제기일 때만 · 재발송 이력) ·
 * 거래 내역(반영 건수 = 「정산 반영 거래 건수」 · 정렬 · 주문 상세 이동) · 상태별 업무 버튼과 모달 ·
 * [명세서] 알림 · [목록]·[확인]·[취소] 이동 · 찾을 수 없음.
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
      <SellerSettlementDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/settle-seller"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** `<dt>` 라벨(앞부분) 옆의 값 — 명세 줄·정산 정보 둘 다 */
function valueOf(labelStart: string): string {
  const term = screen
    .getAllByRole("term")
    .find((element) => element.textContent?.startsWith(labelStart));
  if (!term) throw new Error(`줄이 없습니다: ${labelStart}`);
  return term.nextElementSibling?.textContent ?? "";
}
const hasRow = (labelStart: string) =>
  screen
    .queryAllByRole("term")
    .some((element) => element.textContent?.startsWith(labelStart));

const txTable = () =>
  screen
    .getAllByRole("table")
    .find((table) => within(table).queryByText("정산 반영"))!;
const txRows = () => within(txTable()).getAllByRole("row").slice(1);
const txNotes = () =>
  txRows().map((row) => within(row).getAllByRole("cell")[6].textContent);

describe("셀러 정산 상세 — 찾을 수 없음", () => {
  it.each([
    "/settle-seller/S-9999",
    /* 본사는 셀러 정산 대상이 아니다(본사 명세는 정산 명세서 화면) */
    "/settle-seller/S-0001",
    "/settle-seller/S-229/extra",
  ])("%s → 찾을 수 없음 + [셀러 정산으로]", async (path) => {
    const { user, onNavSelect } = renderAt(path);
    expect(screen.getByText("찾을 수 없는 셀러 정산입니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "셀러 정산으로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/settle-seller");
  });
});

describe("셀러 정산 상세 — 베베하우스(확인완료 · 안심케어 보전)", () => {
  it("머리 — 제목 · 셀러·회차 · 상태 배지", () => {
    renderAt("/settle-seller/S-229");
    expect(
      screen.getByRole("heading", { name: "셀러 정산 상세" }),
    ).toBeVisible();
    expect(screen.getByText("베베하우스 · 2026.09")).toBeVisible();
  });

  it("정산 명세 — 셀러 요율 라벨 · 지급 예정액 · 0 인 줄은 없다", () => {
    renderAt("/settle-seller/S-229");
    expect(valueOf("확정 거래액 (할인 후)")).toBe("23,100원");
    expect(hasRow("셀러 쿠폰")).toBe(false);
    expect(valueOf("정산 매출")).toBe("23,100원");
    expect(valueOf("판매 수수료 (요율 9.8% · 본사 수익)")).toBe("- 2,264원");
    expect(valueOf("PG 수수료")).toBe("- 693원");
    expect(hasRow("취소·반품 차감")).toBe(false);
    expect(valueOf("안심케어 보전")).toBe("+ 12,000원");
    expect(valueOf("지급 예정액")).toBe("32,143원");
    expect(hasRow("미회수 잔액")).toBe(false);
  });

  it("정산 정보 — 셀러 링크 · 반영 건수 · 정산월 · 지급일 · 계좌 · 상태", async () => {
    const { user, onNavSelect } = renderAt("/settle-seller/S-229");
    expect(valueOf("정산 반영 거래 건수")).toBe("1건");
    expect(valueOf("정산월")).toBe("2026.09");
    expect(valueOf("지급일")).toBe("2026.10.10");
    expect(valueOf("지급 계좌")).toBe("국민은행 45**-**-****** (베베하우스)");
    expect(valueOf("정산 상태")).toBe("확인완료");
    expect(hasRow("셀러 이의 사유")).toBe(false);
    expect(hasRow("수정 명세 재발송")).toBe(false);
    await user.click(screen.getByRole("button", { name: "베베하우스" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sellers/S-229");
  });

  it("거래 내역 — 반영 행 수 = 정산 반영 거래 건수 · 반영이 맨 위 · 행 클릭 → 주문 상세", async () => {
    const { user, onNavSelect } = renderAt("/settle-seller/S-229");
    expect(screen.getByText("2026년 09월 거래 내역")).toBeVisible();
    const notes = txNotes();
    expect(notes[0]).toBe("반영");
    expect(notes.filter((note) => note?.startsWith("반영"))).toHaveLength(1);
    /* 반영 → 그 밖 제외 순 */
    expect(notes.slice(1).every((note) => note?.startsWith("제외"))).toBe(true);
    expect(screen.getByText(/1건 · 23,100원/)).toBeVisible();

    const first = txRows()[0];
    expect(within(first).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(first).getAllByRole("cell")[4]).toHaveTextContent("23,100원");
    await user.click(within(first).getAllByRole("cell")[3]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-R28");
  });

  it("하단 바 — [목록]·[확인]·[취소] 는 목록으로 · [명세서] 는 알림", async () => {
    const { user, onNavSelect } = renderAt("/settle-seller/S-229");
    for (const name of ["목록", "확인", "취소"]) {
      onNavSelect.mockClear();
      await user.click(screen.getByRole("button", { name }));
      expect(onNavSelect).toHaveBeenCalledWith("/settle-seller");
    }
    await user.click(screen.getByRole("button", { name: "명세서" }));
    expect(await screen.findByText("베베하우스 명세서 다운로드")).toBeVisible();
  });

  it("[지급완료] — 목록과 같은 지급 실행 창 → 알림만, 상태 그대로", async () => {
    const { user } = renderAt("/settle-seller/S-229");
    await user.click(screen.getByRole("button", { name: "지급완료" }));
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("정산 지급 실행 · 베베하우스"),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "지급완료 처리" }),
    );
    expect(
      await screen.findByText("베베하우스 지급 완료 → 세금계산서 발행"),
    ).toBeVisible();
    expect(valueOf("정산 상태")).toBe("확인완료");
  });
});

describe("셀러 정산 상세 — 리틀스텝(이의제기 · 환수로 지급 0원)", () => {
  it("명세 — 매출 0 · 환수 · 지급 예정액 0원 하한 · 미회수 잔액과 각주", () => {
    renderAt("/settle-seller/S-227");
    expect(valueOf("정산 매출")).toBe("0원");
    expect(valueOf("판매 수수료 (요율 11%")).toBe("- 0원");
    expect(valueOf("취소·반품 차감")).toBe("- 77,400원");
    expect(valueOf("지급 예정액")).toBe("0원");
    expect(valueOf("미회수 잔액")).toBe("77,400원");
    expect(
      screen.getByText(/환수액이 이번 회차 확정 매출을 넘어 77,400원을/),
    ).toBeVisible();
  });

  it("정산 정보 — 반영 0건 · 이의 사유(시각)", () => {
    renderAt("/settle-seller/S-227");
    expect(valueOf("정산 반영 거래 건수")).toBe("0건");
    expect(valueOf("셀러 이의 사유")).toContain("U-S30 반품 건 환수(77,400원)");
    expect(valueOf("셀러 이의 사유")).toContain("(2026.10.02 16:40)");
  });

  it("거래 내역 — 반영 없음 · 환수 행이 맨 위", () => {
    renderAt("/settle-seller/S-227");
    const notes = txNotes();
    expect(notes[0]).toBe("제외 · 반품 환수");
    expect(notes.some((note) => note?.startsWith("반영"))).toBe(false);
  });

  it("[수정 명세 재발송] — 검토 내용 필수 → 알림, 상태 그대로", async () => {
    const { user } = renderAt("/settle-seller/S-227");
    expect(screen.queryByRole("button", { name: "지급완료" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "수정 명세 재발송" }));
    const dialog = screen.getByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "수정 명세 재발송" }),
    );
    expect(
      within(dialog).getByText("검토 결과·수정 내용을 입력해주세요."),
    ).toBeVisible();
    await user.type(
      within(dialog).getByRole("textbox", { name: /검토 결과·수정 내용/ }),
      "환수 근거 첨부",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "수정 명세 재발송" }),
    );
    expect(await screen.findByText(/수정 명세를 재발송했습니다/)).toBeVisible();
    expect(valueOf("정산 상태")).toBe("이의제기");
  });
});

describe("셀러 정산 상세 — 상태별", () => {
  it("코지베이비(확인요청) — 업무 버튼 없음 · 재발송 이력은 보이고 이의 사유는 안 보인다", () => {
    renderAt("/settle-seller/S-231");
    expect(screen.queryByRole("button", { name: "지급완료" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "수정 명세 재발송" }),
    ).toBeNull();
    expect(hasRow("셀러 이의 사유")).toBe(false);
    expect(valueOf("수정 명세 재발송")).toContain(
      "U-R29 안심케어 승인 복원비 18,000원 보전 반영해 재발송",
    );
    expect(valueOf("수정 명세 재발송")).toContain("(2026.10.17 15:00)");
    expect(valueOf("지급 예정액")).toBe("49,563원");
  });

  it("아기별상사(지급완료) — 쿠폰·포인트 참고 줄 · 업무 버튼 없음", () => {
    renderAt("/settle-seller/S-1042");
    expect(valueOf("셀러 쿠폰")).toBe("- 10,000원");
    expect(valueOf("포인트 사용분")).toBe("3,000원");
    expect(valueOf("지급 예정액")).toBe("161,500원");
    expect(screen.queryByRole("button", { name: "지급완료" })).toBeNull();
  });

  it("맘스케어(보류) — [지급완료] 는 결론 요지 입력 창", async () => {
    const { user } = renderAt("/settle-seller/S-228");
    await user.click(screen.getByRole("button", { name: "지급완료" }));
    expect(
      within(screen.getByRole("dialog")).getByText(
        "보류 종결 — 협의 결론 기록 · 맘스케어",
      ),
    ).toBeVisible();
  });
});
