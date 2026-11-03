import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerSettlementPage } from "./SellerSettlementPage";

/* -------------------------------------------------------------------------
 * 셀러 정산 (BO-STL-002) — 기획 v0.4 `SCREENS.settleSeller`
 *
 * 렌더 여부가 아니라 **숫자와 동작**을 본다. 기대 금액은 사례표(scratchpad `settle-cases.md`)의
 * 손계산 값이다 — 계산 함수를 다시 불러 비교하지 않는다.
 * 요약+산출 내역 한 카드(필터와 무관 · 묶음 순서 · 경고색은 미회수뿐 · 참고 줄은 지급액 아래) ·
 * 셀별 표기(0 이면 `-` / 수수료·PG 는 `0원` · 차감 `−`) · 상태별 버튼 ·
 * 확인 모달 3종(검증·초기화·알림 · 상태는 안 바뀜) · 안심케어 금액 설정 · 필터 · 빈 상태 ·
 * 행 클릭 → 상세 · 원본에 없는 것(엑셀·회차 열·미리보기)이 되살아나지 않는가.
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

type User = ReturnType<typeof userEvent.setup>;

function renderPage(search = "") {
  window.history.replaceState(null, "", `/settle-seller${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SellerSettlementPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/settle-seller"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** 산출 내역의 한 줄 — `<dt>` 라벨(앞부분) 옆의 값 */
function lineValue(labelStart: string): string {
  const term = screen
    .getAllByRole("term")
    .find((element) => element.textContent?.startsWith(labelStart));
  if (!term) throw new Error(`명세 줄이 없습니다: ${labelStart}`);
  return term.nextElementSibling?.textContent ?? "";
}

/** 표 본문 행 — 첫 칸이 셀러명 */
const bodyRows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
const rowOf = (seller: string) =>
  screen.getByRole("button", { name: seller }).closest("tr")!;
const cellsOf = (seller: string) =>
  within(rowOf(seller))
    .getAllByRole("cell")
    .map((cell) => cell.textContent);

async function chooseStatus(user: User, option: string) {
  await user.click(screen.getByRole("combobox", { name: "상태" }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

const calc = () =>
  document.body.querySelector("[data-settlement-calc]") as HTMLElement;

describe("셀러 정산 — 요약 · 산출 내역 (한 카드)", () => {
  it("요약 제목·부제와 4값 — 전체 셀러 합(사례표)", () => {
    renderPage();
    expect(screen.getByText("2026년 9월 정산")).toBeVisible();
    expect(screen.getByText("지급일 2026.10.10")).toBeVisible();
    /* 타일 묶음 — 같은 라벨(「지급 예정 총액」)이 합산 명세에도 있다 */
    const summaryCard = screen
      .getByText("입점사 거래액(할인 후)")
      .closest(".grid") as HTMLElement;
    for (const [label, value] of [
      ["입점사 거래액(할인 후)", "489,700"],
      ["본사 수수료 수익", "54,321"],
      ["정산 대상", "8"],
      ["지급 예정 총액", "436,138"],
    ]) {
      const tile = within(summaryCard)
        .getByText(label)
        .closest("div")!.parentElement!;
      expect(tile).toHaveTextContent(value);
    }
  });

  it("전 입점사 합산 — 줄 금액·부호, 미회수는 지급과 상계하지 않는다", () => {
    renderPage();
    expect(screen.getByText("산출 내역")).toBeVisible();
    expect(screen.getByText("전 입점사 합산")).toBeVisible();
    expect(lineValue("입점사 확정 거래액")).toBe("489,700원");
    expect(lineValue("셀러 쿠폰")).toBe("−15,000원");
    expect(lineValue("정산 매출")).toBe("474,700원");
    expect(lineValue("판매 수수료셀러별 요율")).toBe("−54,321원");
    expect(lineValue("PG 수수료")).toBe("−14,241원");
    expect(lineValue("취소·반품 환수")).toBe("−77,400원");
    expect(lineValue("안심케어 보전")).toBe("+30,000원");
    expect(lineValue("포인트 사용분")).toBe("3,000원");
    /* 지급 합 436,138 ≠ net 합 358,738 — 리틀스텝 미회수를 다른 셀러 지급과 상계하지 않는다 */
    expect(lineValue("지급 예정 총액")).toBe("436,138원");
    /* 미회수는 경고 줄 하나 — 어느 셀러인지까지. 굵은 각주 문단은 없다 */
    expect(lineValue("미회수리틀스텝 · 별도 청구")).toBe("77,400원");
    expect(
      screen.queryByText(/환수액이 이번 회차 확정 매출을 넘어/),
    ).toBeNull();
    /* 각주는 산출 내역 아래 안내 상자 하나 */
    expect(
      within(calc()).getByText(/보증금·연체료·배상액은 매출 정산과/),
    ).toBeVisible();
    expect(
      within(calc()).getByText(/지급완료 시 수수료 세금계산서가/),
    ).toBeVisible();
  });

  it("구조 — 매출 → 차감 → 가산 → 지급액 → 미회수 → 참고 순서", () => {
    renderPage();
    const keys = [...calc().querySelectorAll("[data-line]")].map((line) =>
      line.getAttribute("data-line"),
    );
    expect(keys).toEqual([
      "list",
      "coupon",
      "gmv",
      "fee",
      "pg",
      "cancel",
      "care",
      "total",
      "unpaid",
      "point",
    ]);
    const groups = [...calc().querySelectorAll("dl[aria-label]")].map((dl) =>
      dl.getAttribute("aria-label"),
    );
    expect(groups).toEqual(["매출", "차감", "가산", "참고"]);
    const groupOf = (key: string) =>
      calc()
        .querySelector(`[data-line="${key}"]`)!
        .closest("dl")!
        .getAttribute("aria-label");
    expect(groupOf("gmv")).toBe("매출");
    expect(groupOf("cancel")).toBe("차감");
    expect(groupOf("care")).toBe("가산");
    expect(groupOf("point")).toBe("참고");
  });

  it("경고색은 미회수 줄에만 — 차감은 기본 글자색에 `−`", () => {
    renderPage();
    const critical = [...calc().querySelectorAll(".text-text-critical")];
    expect(critical.length).toBeGreaterThan(0);
    for (const element of critical)
      expect(element.closest("[data-line]")?.getAttribute("data-line")).toBe(
        "unpaid",
      );
    const fee = calc().querySelector('[data-line="fee"] dd')!;
    expect(fee).toHaveClass("text-text");
    expect(fee.textContent?.startsWith("−")).toBe(true);
  });

  it("도움말 ⓘ 는 환수 · 보전 · 미회수 3곳만(원본 SETTLE_TIP 문구)", () => {
    renderPage();
    const tips = within(calc())
      .getAllByRole("button", { name: /도움말$/ })
      .map((button) => button.getAttribute("aria-label"));
    expect(tips).toEqual([
      "취소·반품 환수 도움말",
      "안심케어 보전 도움말",
      "미회수 도움말",
    ]);
  });

  it("요약·합산은 필터와 무관하다", async () => {
    const { user } = renderPage();
    await user.type(screen.getByPlaceholderText("셀러명 검색"), "없는셀러");
    expect(lineValue("지급 예정 총액")).toBe("436,138원");
    expect(screen.getByText("정산 대상 입점사 (총 0개사)")).toBeVisible();
  });
});

describe("셀러 정산 — 정산 설정(안심케어 금액)", () => {
  it("맨 아래 「정산 설정」 카드 — 표보다 뒤에 있다", () => {
    renderPage();
    const settings = screen.getByRole("heading", { name: "정산 설정" });
    expect(
      screen.getByRole("table").compareDocumentPosition(settings) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("초기값은 가입 요금 5,000 · 바꿔 확정하면 알림, 같은 값이면 알림 없음", async () => {
    const { user } = renderPage();
    const input = screen.getByRole("textbox", { name: "안심케어 가입 금액" });
    expect(input).toHaveValue("5,000");

    await user.click(input);
    await user.tab();
    expect(screen.queryByText(/안심케어 금액을/)).toBeNull();

    await user.clear(input);
    await user.type(input, "7000원{Enter}");
    expect(
      await screen.findByText("안심케어 금액을 7,000원으로 설정했습니다."),
    ).toBeVisible();
    expect(input).toHaveValue("7,000");
    /* 설정값은 정산 금액을 바꾸지 않는다(원본도 어디서도 읽지 않는다) */
    expect(lineValue("지급 예정 총액")).toBe("436,138원");
  });
});

describe("셀러 정산 — 표", () => {
  it("10열 · 체크박스·No·엑셀·회차 열 없음 · 8개사", () => {
    renderPage();
    const heads = within(screen.getByRole("table"))
      .getAllByRole("columnheader")
      .map((th) => th.textContent);
    expect(heads).toEqual([
      "셀러",
      "거래액(할인 후)",
      "셀러쿠폰",
      "수수료",
      "PG수수료",
      "취소·반품 차감",
      "안심케어",
      "지급액",
      "상태",
      "처리",
    ]);
    expect(bodyRows()).toHaveLength(8);
    /* 목록 머리 하나 — 카드 밖 소제목과 「목록 (총 N건)」 중복을 합쳤다 */
    expect(screen.getByText("정산 대상 입점사 (총 8개사)")).toBeVisible();
    expect(screen.queryByText(/^목록 \(총/)).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
  });

  it("셀 표기 — 쿠폰·환수·보전 0 은 `-`, 수수료·PG 는 0 이면 `0원`(부호 없음), 지급액 0원 하한", () => {
    renderPage();
    expect(cellsOf("리틀스텝").slice(1, 9)).toEqual([
      "0원",
      "-",
      "0원",
      "0원",
      "−77,400원",
      "-",
      "0원",
      "이의제기",
    ]);
    expect(cellsOf("코지베이비").slice(1, 9)).toEqual([
      "37,800원",
      "-",
      "−5,103원",
      "−1,134원",
      "-",
      "+18,000원",
      "49,563원",
      "확인요청",
    ]);
    expect(cellsOf("아기별상사").slice(1, 9)).toEqual([
      "200,000원",
      "−10,000원",
      "−22,800원",
      "−5,700원",
      "-",
      "-",
      "161,500원",
      "지급완료",
    ]);
    /* 금액 열은 머리글까지 오른쪽 정렬 */
    const heads = within(screen.getByRole("table")).getAllByRole(
      "columnheader",
    );
    for (const index of [1, 2, 3, 4, 5, 6, 7])
      expect(heads[index]).toHaveClass("text-right");
    expect(within(rowOf("아기별상사")).getAllByRole("cell")[7]).toHaveClass(
      "text-right",
    );
    /* 9.8% × 23,100 = 2,263.8 → 반올림 */
    expect(cellsOf("베베하우스")[3]).toBe("−2,264원");
  });

  it("처리 열 — 확인완료·보류 [지급완료] · 이의제기 [수정 명세 재발송] · 그 밖은 없음([상세]는 행 클릭과 겹쳐 뺐다)", () => {
    renderPage();
    const actions = (seller: string) =>
      within(rowOf(seller))
        .getAllByRole("button")
        .map((button) => button.textContent)
        .slice(1);
    expect(actions("아이랑")).toEqual(["지급완료"]);
    expect(actions("베베하우스")).toEqual(["지급완료"]);
    expect(actions("맘스케어")).toEqual(["지급완료"]);
    expect(actions("리틀스텝")).toEqual(["수정 명세 재발송"]);
    for (const seller of ["베이비루", "리틀베이비", "코지베이비", "아기별상사"])
      expect(actions(seller)).toEqual([]);
  });

  it("행 클릭·셀러명 → 상세 경로 / 업무 버튼은 이동하지 않는다", async () => {
    const { user, onNavSelect } = renderPage();
    await user.click(within(rowOf("코지베이비")).getByText("49,563원"));
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-seller/S-231");
    await user.click(screen.getByRole("button", { name: "리틀베이비" }));
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-seller/S-201");
    await user.click(within(rowOf("맘스케어")).getByText("12,250원"));
    expect(onNavSelect).toHaveBeenLastCalledWith("/settle-seller/S-228");

    onNavSelect.mockClear();
    await user.click(
      within(rowOf("아이랑")).getByRole("button", { name: "지급완료" }),
    );
    expect(onNavSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});

describe("셀러 정산 — 확인 모달 3종 (알림만 · 상태 그대로)", () => {
  it("확인완료 [지급완료] — 지급 명세 미리보기 → 처리하면 알림, 행 상태는 그대로", async () => {
    const { user } = renderPage();
    await user.click(
      within(rowOf("베베하우스")).getByRole("button", { name: "지급완료" }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("정산 지급 실행 · 베베하우스"),
    ).toBeVisible();
    const value = (label: string) =>
      within(dialog)
        .getAllByRole("term")
        .find((term) => term.textContent === label)?.nextElementSibling
        ?.textContent;
    expect(value("정산 매출")).toBe("23,100원");
    expect(value("판매 수수료요율 9.8%")).toBe("−2,264원");
    expect(value("PG 수수료")).toBe("−693원");
    expect(value("안심케어 보전")).toBe("+12,000원");
    expect(value("지급 예정액")).toBe("32,143원");
    expect(within(dialog).queryByText("환수액")).toBeNull();
    expect(
      within(dialog).getByText(/세금계산서가 동시 발행됩니다/),
    ).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "지급완료 처리" }),
    );
    expect(
      await screen.findByText("베베하우스 지급 완료 → 세금계산서 발행"),
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(cellsOf("베베하우스")[8]).toBe("확인완료");
  });

  it("보류 [지급완료] — 결론 요지 필수(공백만이면 오류) · 다시 열면 비어 있다", async () => {
    const { user } = renderPage();
    const open = () =>
      user.click(
        within(rowOf("맘스케어")).getByRole("button", { name: "지급완료" }),
      );
    await open();
    let dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("보류 종결 — 협의 결론 기록 · 맘스케어"),
    ).toBeVisible();
    const field = within(dialog).getByRole("textbox", {
      name: /외부 협의 결론 요지/,
    });
    await user.type(field, "   ");
    await user.click(within(dialog).getByRole("button", { name: "지급 처리" }));
    expect(
      within(dialog).getByText("외부 협의 결론 요지를 입력해주세요."),
    ).toBeVisible();

    await user.type(field, "메모");
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    await open();
    dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("textbox", { name: /외부 협의 결론 요지/ }),
    ).toHaveValue("");
    expect(
      within(dialog).queryByText("외부 협의 결론 요지를 입력해주세요."),
    ).toBeNull();

    await user.type(
      within(dialog).getByRole("textbox", { name: /외부 협의 결론 요지/ }),
      "10/14 유선 협의 — 원 명세대로 지급",
    );
    await user.click(within(dialog).getByRole("button", { name: "지급 처리" }));
    expect(
      await screen.findByText("맘스케어 지급 완료 → 세금계산서 발행"),
    ).toBeVisible();
    expect(cellsOf("맘스케어")[8]).toBe("보류");
  });

  it("이의제기 [수정 명세 재발송] — 이의 사유를 보이고, 검토 내용 필수", async () => {
    const { user } = renderPage();
    await user.click(
      within(rowOf("리틀스텝")).getByRole("button", {
        name: "수정 명세 재발송",
      }),
    );
    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("수정 명세 재발송 · 리틀스텝"),
    ).toBeVisible();
    expect(
      within(dialog).getByText(/U-S30 반품 건 환수\(77,400원\)/),
    ).toBeVisible();
    expect(within(dialog).getByText("(2026.10.02 16:40)")).toBeVisible();

    await user.click(
      within(dialog).getByRole("button", { name: "수정 명세 재발송" }),
    );
    expect(
      within(dialog).getByText("검토 결과·수정 내용을 입력해주세요."),
    ).toBeVisible();

    await user.type(
      within(dialog).getByRole("textbox", { name: /검토 결과·수정 내용/ }),
      "환수 근거(8월 지급 77,400원) 첨부",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "수정 명세 재발송" }),
    );
    expect(
      await screen.findByText(/수정 명세를 재발송했습니다 — 셀러 재확인을/),
    ).toBeVisible();
    expect(cellsOf("리틀스텝")[8]).toBe("이의제기");
  });
});

describe("셀러 정산 — 검색조건 · 빈 상태 · 페이지 · preview", () => {
  it("검색조건은 펼친 채로 열린다 · 상태 셀렉트(전체 + 6)", async () => {
    const { user } = renderPage();
    await user.click(screen.getByRole("combobox", { name: "상태" }));
    const options = within(await screen.findByRole("listbox"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([
      "전체",
      "지급대기",
      "확인요청",
      "확인완료",
      "지급완료",
      "이의제기",
      "보류",
    ]);
  });

  it("상태로 거르면 표·건수·요약 줄이 따라온다", async () => {
    const { user } = renderPage();
    await chooseStatus(user, "확인완료");
    expect(
      bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(expect.arrayContaining(["아이랑", "베베하우스"]));
    expect(bodyRows()).toHaveLength(2);
    expect(screen.getByText("정산 대상 입점사 (총 2개사)")).toBeVisible();
    expect(screen.getByText("상태 확인완료")).toBeVisible();
  });

  it("셀러명 검색(앞뒤 공백 무시) · 결과 없으면 빈 상태 → [필터 초기화]", async () => {
    const { user } = renderPage();
    const input = screen.getByPlaceholderText("셀러명 검색");
    await user.type(input, " 베이비 ");
    expect(
      bodyRows()
        .map((row) => within(row).getAllByRole("cell")[0].textContent)
        .sort(),
    ).toEqual(["베이비루", "리틀베이비", "코지베이비"].sort());

    await user.clear(input);
    await user.type(input, "없는셀러");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(bodyRows()).toHaveLength(8);
    expect(input).toHaveValue("");
  });

  it("페이지당 개수 10/20/50/100 · 기본 10", async () => {
    const { user } = renderPage();
    const sizeSelect = screen.getByRole("combobox", { name: "페이지당 개수" });
    expect(sizeSelect).toHaveTextContent("10");
    await user.click(sizeSelect);
    const options = within(await screen.findByRole("listbox"))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options.map((text) => text?.replace(/\D/g, ""))).toEqual([
      "10",
      "20",
      "50",
      "100",
    ]);
  });

  it("?preview=empty 는 빈 상태", () => {
    renderPage("?preview=empty");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });
});
