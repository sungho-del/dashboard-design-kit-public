import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { SettlementStatementDetailPage } from "./SettlementStatementDetailPage";

/* -------------------------------------------------------------------------
 * 정산 명세서 상세 (BO-STL-008) — 기획 v0.4 `hqStmtPage` · 조회 전용
 *
 * 렌더 여부가 아니라 **숫자와 동작**을 본다: 지급 정보(본사 = 지급 대상 아님) · 정산 명세 줄과 금액
 * (사례표 `settle-cases.md` 손계산 — 쿠폰·환수·미회수·보전·포인트 조건부 줄) · 거래 내역(정렬·문구·
 * 페이지·각주·주문 상세 이동) · 하단 바(원본 5버튼 · 본사는 [셀러 정산에서 처리] 없음) · 찾을 수 없음 ·
 * 명세서가 바뀌면 처음부터.
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
      <SettlementStatementDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/settle-statement"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const at = (no: string) => renderAt(`/settle-statement/${no}`);

/** InfoList 한 줄 — `<dt>` 라벨 옆의 값 */
function valueOf(label: string): string {
  const term = screen
    .getAllByText(label)
    .find((element) => element.tagName === "DT");
  if (!term) throw new Error(`라벨을 찾지 못했습니다: ${label}`);
  return term.nextElementSibling?.textContent ?? "";
}

/** 산출 내역 — `[이름, 보조 글자, 값]` 순서 그대로 (공용 부품 `SettlementCalc`) */
function calcLines(): [string, string, string][] {
  const box = document.body.querySelector("[data-settlement-calc]")!;
  return [...box.querySelectorAll("dt")].map((dt) => {
    const [label, hint] = [...dt.querySelectorAll(":scope > span")].map(
      (span) => span.textContent ?? "",
    );
    return [label, hint ?? "", dt.nextElementSibling?.textContent ?? ""];
  });
}

/** 줄이 든 묶음 이름 — 지급액·미회수는 묶음 밖(`null`) */
const groupOf = (key: string) =>
  document.body
    .querySelector(`[data-settlement-calc] [data-line="${key}"]`)!
    .closest("dl")!
    .getAttribute("aria-label");

function txRows(): string[][] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent ?? ""),
    );
}

describe("찾을 수 없음", () => {
  it.each([
    "/settle-statement/STM-0000-0000",
    "/settle-statement/STM-2609-0226/x",
  ])("%s → 안내 + [정산 내역/명세서로]", async (path) => {
    const { user, onNavSelect } = renderAt(path);

    expect(screen.getByText("찾을 수 없는 명세서입니다")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "정산 내역/명세서로" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/settle-statement");
  });
});

describe("셀러 명세 — 코지베이비 (확인요청 · 안심케어 보전)", () => {
  it("머리: 제목 · 번호·대상·회차만(금액은 아래 구역이 말한다) · 상태 배지", () => {
    at("STM-2609-0231");

    expect(
      screen.getByRole("heading", { name: "정산 명세서 상세" }),
    ).toBeVisible();
    expect(
      screen.getByText("STM-2609-0231 · 코지베이비 · 2026년 9월"),
    ).toBeVisible();
  });

  it("카드 순서 — 정산 명세 → 지급 정보 → 거래 내역 → 정산 정책(셀러 정산 상세와 같다)", () => {
    at("STM-2609-0231");

    const titles = screen
      .getAllByRole("button", { name: / 접기$/ })
      .map((button) => button.getAttribute("aria-label"))
      .filter((label) => label !== "메뉴 접기");
    expect(titles).toEqual([
      "정산 명세 접기",
      "지급 정보 접기",
      "2026년 9월 거래 내역 접기",
      "정산 정책 접기",
    ]);
  });

  it("안내 — 계산 기준은 명세 아래 상자, 정책 카드는 목록 2줄", () => {
    at("STM-2609-0231");

    const calc = document.body.querySelector("[data-settlement-calc]")!;
    const calcNotes = [...calc.querySelectorAll("li")].map(
      (li) => li.textContent,
    );
    expect(calcNotes).toHaveLength(2);
    /* 확인 요청 답(2026-11-06) 1번 · 26번 — 「셀러 지급액」 · 「PG 수수료」 괄호 없음 */
    expect(calcNotes[0]).toMatch(
      /^셀러 지급액 = 확정 매출 − 판매 수수료\(셀러별 요율\) − PG 수수료 − 취소·반품 차감/,
    );
    expect(calcNotes[0]).not.toMatch(/요율 미정/);
    /* 판정 Q4 · 부록 A A7 — 세금계산서는 지급과 분리(정산 확정 시 동시 발행이 아니다) */
    expect(calcNotes[0]).toMatch(
      /귀속됩니다\. 세금계산서는 매월 10일에 발행됩니다\(연동 준비 중\)\.$/,
    );
    /* 부록 A B8 — 「분리 관리됩니다.」로 끝 · 「미정의」 절 없음 · 앞 절은 문장으로 닫는다 */
    expect(calcNotes[1]).toBe(
      "보증금·연체료·배상은 보증금 내역에서 분리 관리됩니다.",
    );
    expect(
      screen.getByText("지급 전 발견 오류는 본사가 직권 정정").closest("li")
        ?.textContent,
    ).toBe("지급 전 발견 오류는 본사가 직권 정정합니다.");
    expect(screen.queryByText(/미정의|1회 지급 완결/)).toBeNull();
    expect(screen.getByText("매출 확정 기준").closest("li")).not.toBeNull();
  });

  it("지급 정보 6줄 + 확인요청 안내 + 조회 전용 안내", () => {
    at("STM-2609-0231");

    expect(valueOf("정산 대상")).toBe("코지베이비");
    expect(valueOf("정산월")).toBe("2026년 9월");
    expect(valueOf("지급일")).toBe("2026.10.12");
    expect(valueOf("지급 계좌")).toBe("국민은행 45**-**-****** (코지베이비)");
    expect(valueOf("정산 반영 거래 건수")).toBe("1건");
    expect(valueOf("상태")).toBe("확인요청");
    expect(screen.getByText(/확인·이의제기 기간\(3일\)/)).toBeVisible();
    expect(screen.getByText(/상태 변경·확인요청·지급 처리는/)).toBeVisible();
  });

  it("정산 명세 — 쿠폰·환수 줄 없이 보전이 더해진다", () => {
    at("STM-2609-0231");

    expect(calcLines()).toEqual([
      ["확정 거래액", "판매가", "37,800원"],
      ["정산 매출", "수수료 부과 기준", "37,800원"],
      ["판매 수수료", "요율 13.5%", "−5,103원"],
      ["PG 수수료", "", "−1,134원"],
      ["안심케어 보전", "본사 복원비", "+18,000원"],
      ["지급액", "", "49,563원"],
    ]);
    expect(groupOf("care")).toBe("가산");
  });

  it("하단 바 — 원본 5버튼, [셀러 정산에서 처리]는 그 셀러의 정산 상세로", async () => {
    const { user, onNavSelect } = at("STM-2609-0231");

    /* 순서 — 보조 → 주([확인]) 맨 오른쪽 */
    const bar = screen.getByRole("button", { name: "다운로드" }).parentElement!;
    expect(
      within(bar)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["다운로드", "셀러 정산에서 처리", "취소", "확인"]);

    await user.click(
      screen.getByRole("button", { name: "셀러 정산에서 처리" }),
    );
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-seller/S-231");

    for (const name of ["목록", "확인", "취소"]) {
      await user.click(screen.getByRole("button", { name }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/settle-statement");
    }

    await user.click(screen.getAllByRole("button", { name: "셀러 정산" })[0]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-seller");
  });

  it("[다운로드]는 알림만", async () => {
    const { user } = at("STM-2609-0231");

    await user.click(screen.getByRole("button", { name: "다운로드" }));
    expect(await screen.findByText("코지베이비 명세서 다운로드")).toBeVisible();
  });
});

describe("셀러 명세 — 리틀스텝 (이의제기 · 환수로 미회수)", () => {
  it("환수 줄 · 0원 수수료 · 지급액 0원 하한 · 미회수 경고 줄(굵은 각주 없음) · 이의제기 안내", () => {
    at("STM-2609-0227");

    expect(calcLines()).toEqual([
      ["확정 거래액", "판매가", "0원"],
      ["정산 매출", "수수료 부과 기준", "0원"],
      ["판매 수수료", "요율 11%", "0원"],
      ["PG 수수료", "", "0원"],
      ["취소·반품 환수", "전월 확정분", "−77,400원"],
      ["지급액", "", "0원"],
      ["미회수", "별도 청구", "77,400원"],
    ]);
    expect(
      screen.queryByText(/환수액이 이번 회차 확정 매출을 넘어/),
    ).toBeNull();
    expect(screen.getByText(/이의를 제기/)).toBeVisible();
  });

  it("거래 내역 — 환수 건이 맨 위, 각주는 반영 0건 · 제외 9건, 주문번호 → 주문 상세", async () => {
    const { user, onNavSelect } = at("STM-2609-0227");

    const rows = txRows();
    expect(rows).toHaveLength(9);
    expect(rows[0]).toEqual([
      "1",
      "20260805132741",
      "판매",
      "부스터 주니어 카시트 그로우",
      "90,000원",
      "반품 완료",
      /* 그 건의 환수액(clawback) — 「금액」 칸은 원거래 금액 그대로 */
      "제외 · 반품 환수 −77,400원",
    ]);
    /* 제외만 되는 건에는 환수를 붙이지 않는다 */
    expect(rows.filter((row) => row[6].includes("환수"))).toHaveLength(1);
    expect(screen.getByText("0건 · 0원")).toBeVisible();
    expect(screen.getByText("9건")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "20260805132741" }));
    expect(onNavSelect).toHaveBeenCalledWith("/orders-all/U-S30");

    /* 행 어디를 눌러도 같은 곳(보조 클릭 영역) */
    onNavSelect.mockClear();
    const second = within(screen.getByRole("table")).getAllByRole("row")[2];
    await user.click(within(second).getAllByRole("cell")[3]);
    expect(onNavSelect).toHaveBeenCalledTimes(1);
    expect(onNavSelect.mock.calls[0][0]).toMatch(/^\/orders-all\//);
  });
});

describe("셀러 명세 — 아기별상사 (쿠폰 · 포인트 참고)", () => {
  it("셀러 쿠폰을 빼고, 포인트는 지급액 아래 참고 줄로만", () => {
    at("STM-2609-1042");

    expect(calcLines()).toEqual([
      ["확정 거래액", "판매가", "200,000원"],
      ["셀러 쿠폰", "셀러 부담", "−10,000원"],
      ["정산 매출", "수수료 부과 기준", "190,000원"],
      ["판매 수수료", "요율 12%", "−22,800원"],
      ["PG 수수료", "", "−5,700원"],
      ["지급액", "", "161,500원"],
      ["포인트 사용분 본사 부담", "정산 영향 없음", "3,000원"],
    ]);
    expect(groupOf("coupon")).toBe("매출");
    expect(groupOf("point")).toBe("참고");
    expect(groupOf("total")).toBeNull();
  });
});

describe("본사 명세 — 지급 대상 아님", () => {
  it("지급 정보가 지급 대상이 아님을 말하고, [셀러 정산에서 처리]가 없다", () => {
    at("STM-2609-0000");

    expect(valueOf("정산 대상")).toBe("본사");
    expect(valueOf("지급 계좌")).toBe("본사 · 내부 이전");
    expect(valueOf("정산 반영 거래 건수")).toBe("2건");
    /* 확인 요청 답(2026-11-06) 25번 — 「지급 대상 아님」 보조 글자·직영 안내 문장 없음(「본사」 배지 · 내부 이전만) */
    expect(screen.queryByText(/지급 대상 아님/)).toBeNull();
    expect(screen.queryByText(/본사 직영 매출의 명세입니다/)).toBeNull();
    const calc = document.body.querySelector("[data-settlement-calc]")!;
    expect(calc.querySelectorAll("li")).toHaveLength(2);
    expect(calc.querySelector("li")?.textContent).toMatch(/^셀러 지급액 = /);
    expect(screen.queryByText(/조회 전용/)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "셀러 정산에서 처리" }),
    ).toBeNull();
  });

  it("정산 명세 — 「매출」 묶음(판매·렌트·합계) · 직영 차감 0원 · 지급액(보조 글자 없음)", () => {
    at("STM-2609-0000");

    expect(calcLines()).toEqual([
      ["판매 매출", "", "159,000원"],
      ["렌트 매출", "", "12,600원"],
      ["매출 합계", "", "171,600원"],
      ["수수료", "", "0원"],
      ["지급액", "", "171,600원"],
    ]);
    expect(groupOf("sum")).toBe("매출");
    expect(groupOf("fee")).toBe("차감");
  });

  it("거래 내역 — 반영 2건이 위, 다른 달 확정·취소·반품·교환은 제외", () => {
    at("STM-2609-0000");

    expect(txRows().map((row) => row[6])).toEqual([
      "반영",
      "반영",
      "제외 · 취소",
      "제외 · 반품",
      "제외 · 미확정",
      "제외 · 2026.10 확정",
    ]);
    expect(screen.getByText("2건 · 171,600원")).toBeVisible();
    expect(screen.getByText("4건")).toBeVisible();
  });
});

describe("거래 내역 페이지 · 접기 · 명세서가 바뀌면 처음부터", () => {
  it("리틀베이비 11건 — 2페이지에 11번째, 페이지당 20이면 한 페이지", async () => {
    const { user } = at("STM-2609-0201");

    expect(txRows()).toHaveLength(10);
    await user.click(screen.getByRole("button", { name: "2" }));
    expect(txRows().map((row) => row[0])).toEqual(["11"]);

    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    await user.click(
      within(await screen.findByRole("listbox")).getByRole("option", {
        name: "20개씩 보기",
      }),
    );
    expect(txRows()).toHaveLength(11);
  });

  it("구역을 접으면 내용이 사라지고, 다른 명세서로 가면 다시 펼쳐진다", async () => {
    const { user } = at("STM-2609-0226");

    await user.click(screen.getByRole("button", { name: "지급 정보 접기" }));
    expect(screen.queryByText("지급 계좌")).toBeNull();

    act(() => navigate("/settle-statement/STM-2609-0230"));
    expect(valueOf("정산 대상")).toBe("아이랑");
    expect(valueOf("지급 계좌")).toContain("아이랑");
  });
});
