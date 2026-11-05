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
    expect(screen.getByText("베베하우스 · 2026년 9월")).toBeVisible();
  });

  it("정산 명세 — 셀러 요율 보조 글자 · 지급 예정액 · 0 인 줄(과 빈 묶음)은 없다", () => {
    renderAt("/settle-seller/S-229");
    expect(valueOf("확정 거래액판매가")).toBe("23,100원");
    expect(hasRow("셀러 쿠폰")).toBe(false);
    expect(valueOf("정산 매출")).toBe("23,100원");
    expect(valueOf("판매 수수료요율 9.8%")).toBe("−2,264원");
    expect(valueOf("PG 수수료")).toBe("−693원");
    expect(hasRow("취소·반품 환수")).toBe(false);
    expect(valueOf("안심케어 보전")).toBe("+12,000원");
    expect(valueOf("지급 예정액")).toBe("32,143원");
    expect(hasRow("미회수")).toBe(false);
    /* 포인트 0 → 「참고」 묶음 자체가 없다 · 안내 상자는 있다 */
    const calc = document.body.querySelector("[data-settlement-calc]")!;
    expect(
      [...calc.querySelectorAll("dl[aria-label]")].map((dl) =>
        dl.getAttribute("aria-label"),
      ),
    ).toEqual(["매출", "차감", "가산"]);
    expect(
      screen.getByText(/보증금·연체료·배상액은 매출 정산과/),
    ).toBeVisible();
  });

  it("정산 정보 — 셀러 링크 · 반영 건수 · 정산월 · 지급일 · 계좌 · 상태", async () => {
    const { user, onNavSelect } = renderAt("/settle-seller/S-229");
    expect(valueOf("정산 반영 거래 건수")).toBe("1건");
    expect(valueOf("정산월")).toBe("2026년 9월");
    expect(valueOf("지급일")).toBe("2026.10.12");
    expect(valueOf("지급 계좌")).toBe("국민은행 45**-**-****** (베베하우스)");
    expect(valueOf("정산 상태")).toBe("확인완료");
    expect(hasRow("셀러 이의 사유")).toBe(false);
    expect(hasRow("수정 명세 재발송")).toBe(false);
    await user.click(screen.getByRole("button", { name: "베베하우스" }));
    expect(onNavSelect).toHaveBeenCalledWith("/sellers/S-229");
  });

  it("거래 내역 — 반영 행 수 = 정산 반영 거래 건수 · 반영이 맨 위 · 행 클릭 → 주문 상세", async () => {
    const { user, onNavSelect } = renderAt("/settle-seller/S-229");
    expect(screen.getByText("2026년 9월 거래 내역")).toBeVisible();
    const notes = txNotes();
    /* 승인 보전이 붙은 반영 건 — 보전 금액은 그 건의 `care` 값, 기본 글자색 */
    expect(notes[0]).toBe("반영 · 보전 +12,000원");
    expect(notes.filter((note) => note?.startsWith("반영"))).toHaveLength(1);
    const firstNote = within(txRows()[0]).getAllByRole("cell")[6];
    expect(firstNote.querySelector(".text-text-sub")).toBeNull();
    /* 제외만 되는 건은 흐리게 · 환수·보전 금액을 붙이지 않는다 */
    const excluded = within(txRows()[1]).getAllByRole("cell")[6];
    expect(excluded.querySelector(".text-text-sub")?.textContent).toBe(
      excluded.textContent,
    );
    expect(
      notes.slice(1).some((note) => /환수|보전|[−+]\d/.test(note ?? "")),
    ).toBe(false);
    /* 반영 → 그 밖 제외 순 */
    expect(notes.slice(1).every((note) => note?.startsWith("제외"))).toBe(true);
    expect(screen.getByText(/1건 · 23,100원/)).toBeVisible();

    const first = txRows()[0];
    expect(within(first).getAllByRole("cell")[0]).toHaveTextContent("1");
    expect(within(first).getAllByRole("cell")[4]).toHaveTextContent("23,100원");
    await user.click(within(first).getAllByRole("cell")[3]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-R28");
  });

  it("하단 바 — 업무 버튼이 맨 오른쪽 주 버튼 하나 · [확인]은 보조 · 순서 [명세서][취소][확인][지급완료]", () => {
    renderAt("/settle-seller/S-229");
    const bar = screen.getByRole("button", { name: "명세서" }).parentElement!;
    const buttons = within(bar).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "명세서",
      "취소",
      "확인",
      "지급완료",
    ]);
    const primaries = buttons.filter((button) =>
      button.className.split(" ").includes("bg-action-primary"),
    );
    expect(primaries.map((button) => button.textContent)).toEqual(["지급완료"]);
  });

  it("하단 바 — 업무 버튼이 없으면 [확인]이 맨 오른쪽 주 버튼(베이비루 지급완료)", () => {
    renderAt("/settle-seller/S-226");
    const bar = screen.getByRole("button", { name: "명세서" }).parentElement!;
    const buttons = within(bar).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "명세서",
      "취소",
      "확인",
    ]);
    expect(buttons[2].className.split(" ")).toContain("bg-action-primary");
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
    expect(await screen.findByText("베베하우스 지급 완료")).toBeVisible();
    expect(valueOf("정산 상태")).toBe("확인완료");
  });
});

describe("셀러 정산 상세 — 리틀스텝(이의제기 · 환수로 지급 0원)", () => {
  it("명세 — 매출 0 · 수수료 `0원`(부호 없음) · 환수 · 지급 예정액 0원 하한 · 미회수 경고 줄 하나", () => {
    renderAt("/settle-seller/S-227");
    expect(valueOf("정산 매출")).toBe("0원");
    expect(valueOf("판매 수수료요율 11%")).toBe("0원");
    expect(valueOf("PG 수수료")).toBe("0원");
    expect(valueOf("취소·반품 환수")).toBe("−77,400원");
    expect(valueOf("지급 예정액")).toBe("0원");
    expect(valueOf("미회수별도 청구")).toBe("77,400원");
    expect(screen.getByRole("button", { name: "미회수 도움말" })).toBeVisible();
    /* 굵은 각주 문단은 없앴다 — 경고 줄 하나로 */
    expect(
      screen.queryByText(/환수액이 이번 회차 확정 매출을 넘어/),
    ).toBeNull();
  });

  it("셀러 이의 사유 — 명세 카드 맨 위 경고 상자 하나(사유 · 시각) · 정산 정보에는 없다", () => {
    renderAt("/settle-seller/S-227");
    expect(valueOf("정산 반영 거래 건수")).toBe("0건");
    const note = screen.getByRole("note", { name: "셀러 이의 사유" });
    expect(note).toHaveTextContent("U-S30 반품 건 환수(77,400원)");
    expect(note).toHaveTextContent("2026.10.02 16:40");
    expect(hasRow("셀러 이의 사유")).toBe(false);
    /* 명세보다 앞 */
    const calc = document.body.querySelector("[data-settlement-calc]")!;
    expect(
      note.compareDocumentPosition(calc) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByText(/U-S30 반품 건 환수/)).toHaveLength(1);
  });

  it("거래 내역 — 반영 없음 · 환수 행이 맨 위", () => {
    renderAt("/settle-seller/S-227");
    const notes = txNotes();
    /* 환수 건 — 그 건의 환수액(`clawback`)을 붙이고 흐리지 않는다 · 「금액」 칸은 원거래 금액 그대로 */
    expect(notes[0]).toBe("제외 · 반품 환수 −77,400원");
    const first = within(txRows()[0]).getAllByRole("cell");
    expect(first[6].querySelector(".text-text-sub")).toBeNull();
    expect(first[4]).toHaveTextContent("90,000원");
    expect(notes.filter((note) => note?.includes("환수"))).toHaveLength(1);
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
    expect(screen.queryByRole("note", { name: "셀러 이의 사유" })).toBeNull();
    expect(valueOf("수정 명세 재발송")).toContain(
      "U-R29 안심케어 승인 복원비 18,000원 보전 반영해 재발송",
    );
    expect(valueOf("수정 명세 재발송")).toContain("(2026.10.17 15:00)");
    expect(valueOf("지급 예정액")).toBe("49,563원");
  });

  it("아기별상사(지급완료) — 쿠폰·포인트 참고 줄 · 업무 버튼 없음", () => {
    renderAt("/settle-seller/S-1042");
    expect(valueOf("셀러 쿠폰")).toBe("−10,000원");
    expect(valueOf("포인트 사용분")).toBe("3,000원");
    expect(valueOf("지급 예정액")).toBe("161,500원");
    /* 포인트는 계산 밖 — 지급 예정액 **아래** 「참고」 묶음 */
    const keys = [
      ...document.body.querySelectorAll("[data-settlement-calc] [data-line]"),
    ].map((line) => line.getAttribute("data-line"));
    expect(keys.indexOf("point")).toBeGreaterThan(keys.indexOf("total"));
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
