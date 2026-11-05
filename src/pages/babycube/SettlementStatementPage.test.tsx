import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SettlementStatementPage } from "./SettlementStatementPage";

/* -------------------------------------------------------------------------
 * 정산 내역/명세서 (목록) — 기획 v0.4 `SCREENS.settleStatement` · 조회 전용
 *
 * 렌더 여부가 아니라 **동작과 숫자**를 본다: 검색조건(펼침·요약·셀렉트·대소문자 무시) · 빈 상태·초기화 ·
 * 행/번호/[명세서] → 상세 · 원본에 없는 엑셀·체크박스·미리보기가 없다 · `?preview=`.
 * 금액 기대값은 사례표(scratchpad `settle-cases.md`)의 원 단위 손계산이다.
 * ---------------------------------------------------------------------- */
type User = ReturnType<typeof userEvent.setup>;

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

function renderPage(search = "") {
  window.history.replaceState(null, "", `/settle-statement${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SettlementStatementPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/settle-statement"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent ?? "");

const visibleNos = () => bodyRows().map((row) => cellsOf(row)[0]);

const rowOf = (no: string) => {
  const row = bodyRows().find((item) => cellsOf(item)[0] === no);
  if (!row) throw new Error(`행을 찾지 못했습니다: ${no}`);
  return row;
};

async function chooseOption(user: User, selectLabel: string, option: string) {
  await user.click(screen.getByRole("combobox", { name: selectLabel }));
  const listbox = await screen.findByRole("listbox");
  await user.click(within(listbox).getByRole("option", { name: option }));
}

const ALL_NOS = [
  "STM-2609-0001",
  "STM-2609-0226",
  "STM-2609-0227",
  "STM-2609-0230",
  "STM-2609-0228",
  "STM-2609-0201",
  "STM-2609-0231",
  "STM-2609-1042",
  "STM-2609-0229",
];

describe("표 (원본 8열 + 가산 열 · 본사 1 + 셀러 정산 행)", () => {
  it("열 이름·순서가 원본 그대로고, 체크박스·No·엑셀이 없다", () => {
    renderPage();

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual([
      "명세서번호",
      "정산 대상",
      "정산월",
      "매출",
      "차감(수수료·PG·취소)",
      "가산(보전·셀러 귀속)",
      "지급액",
      "상태",
      "명세서",
    ]);
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
  });

  it("본사 먼저, 이어 셀러 정산 행 순서 — 회차 하나(2026.09)", () => {
    renderPage();

    expect(visibleNos()).toEqual(ALL_NOS);
    expect(screen.getByText("목록 (총 9건)")).toBeVisible();
    expect(new Set(bodyRows().map((row) => cellsOf(row)[2]))).toEqual(
      new Set(["2026.09"]),
    );
  });

  it("금액 4열만 오른쪽(머리글 포함) · [명세서] 열은 오른쪽 고정 · 버튼이 그 안에 있다", () => {
    renderPage();

    const heads = within(screen.getByRole("table")).getAllByRole(
      "columnheader",
    );
    const right = heads
      .filter((th) => th.className.includes("text-right"))
      .map((th) => th.textContent);
    expect(right).toEqual([
      "매출",
      "차감(수수료·PG·취소)",
      "가산(보전·셀러 귀속)",
      "지급액",
    ]);
    expect(heads[8].className.split(" ")).toContain("sticky");

    const last = rowOf("STM-2609-0226").querySelectorAll("td")[8];
    expect(last.className.split(" ")).toContain("sticky");
    expect(
      within(last).getByRole("button", { name: "베이비루 명세서" }),
    ).toBeVisible();
    expect(rowOf("STM-2609-0226").querySelectorAll("td")[4].className).toMatch(
      /text-right/,
    );
    expect(rowOf("STM-2609-0226").querySelectorAll("td")[5].className).toMatch(
      /text-right/,
    );
  });

  it.each([
    // 번호, 정산 대상, 매출, 차감(수수료+PG+환수), 가산(보전+셀러 귀속), 지급액, 상태
    [
      "STM-2609-0001",
      "자체본사",
      "171,600원",
      "-",
      "-",
      "171,600원",
      "지급완료",
    ],
    [
      "STM-2609-0226",
      "입점사베이비루",
      "109,000원",
      "−16,350원",
      "-",
      "92,650원",
      "지급완료",
    ],
    [
      "STM-2609-0227",
      "입점사리틀스텝",
      "0원",
      "−77,400원",
      "-",
      "0원",
      "이의제기",
    ],
    [
      "STM-2609-0201",
      "입점사리틀베이비",
      "84,000원",
      "−10,920원",
      "-",
      "73,080원",
      "지급대기",
    ],
    [
      "STM-2609-0231",
      "입점사코지베이비",
      "37,800원",
      "−6,237원",
      "+18,000원",
      "49,563원",
      "확인요청",
    ],
    [
      "STM-2609-0229",
      "입점사베베하우스",
      "23,100원",
      "−2,957원",
      "+12,000원",
      "32,143원",
      "확인완료",
    ],
    [
      "STM-2609-0228",
      "입점사맘스케어",
      "14,000원",
      "−1,750원",
      "-",
      "12,250원",
      "보류",
    ],
  ])(
    "%s — 사례표 금액",
    (no, target, revenue, deduction, addition, payout, status) => {
      renderPage();

      const cells = cellsOf(rowOf(no));
      expect(cells.slice(1, 8)).toEqual([
        target,
        "2026.09",
        revenue,
        deduction,
        addition,
        payout,
        status,
      ]);
    },
  );

  /** 판정 Q3 — 매출 − 차감 + 가산 = 지급액(0원 하한 행 리틀스텝은 기획 확인 요청 20번) */
  it("0원 하한 행 밖에서는 매출 − 차감 + 가산 = 지급액이다", () => {
    renderPage();
    const amount = (text: string) =>
      text === "-" ? 0 : Number(text.replace(/[^0-9]/g, ""));

    for (const no of ALL_NOS.filter((no) => no !== "STM-2609-0227")) {
      const [, , , revenue, deduction, addition, payout] = cellsOf(rowOf(no));
      expect(amount(revenue) - amount(deduction) + amount(addition)).toBe(
        amount(payout),
      );
    }
  });
});

describe("검색조건 (FilterBar 기본 펼침 · 셀렉트)", () => {
  it("펼친 채로 열리고, 접으면 요약이 조건 없음이다", async () => {
    const { user } = renderPage();
    expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
    expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
    expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
  });

  it("정산 대상 — 자체는 본사 1건, 입점사는 8건", async () => {
    const { user } = renderPage();

    await chooseOption(user, "정산 대상", "자체");
    expect(visibleNos()).toEqual(["STM-2609-0001"]);

    await chooseOption(user, "정산 대상", "입점사");
    expect(visibleNos()).toEqual(ALL_NOS.slice(1));
  });

  it("상태 — 지급완료는 본사·베이비루·아기별상사, 요약에 걸린다", async () => {
    const { user } = renderPage();

    await chooseOption(user, "상태", "지급완료");
    expect(visibleNos()).toEqual([
      "STM-2609-0001",
      "STM-2609-0226",
      "STM-2609-1042",
    ]);

    await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
    expect(screen.getByText("상태 지급완료")).toBeVisible();
  });

  it("검색 — 기본은 명세서번호, 대소문자 무시", async () => {
    const { user } = renderPage();

    await user.type(
      screen.getByPlaceholderText("검색어 입력"),
      "stm-2609-0231",
    );
    expect(visibleNos()).toEqual(["STM-2609-0231"]);
  });

  it("검색 대상을 정산 대상으로 바꾸면 이름으로 찾는다 — 명세서번호로는 이름이 안 찾힌다", async () => {
    const { user } = renderPage();

    await user.type(screen.getByPlaceholderText("검색어 입력"), "리틀");
    expect(bodyRows()).toHaveLength(0);

    await chooseOption(user, "검색 대상", "정산 대상");
    expect(visibleNos()).toEqual(["STM-2609-0227", "STM-2609-0201"]);
  });

  it("빈 상태 — 원본 문구, [필터 초기화]로 전체가 돌아온다", async () => {
    const { user } = renderPage();

    await chooseOption(user, "정산 대상", "자체");
    await chooseOption(user, "상태", "보류");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    expect(
      screen.getByText(
        "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
      ),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "필터 초기화" }));
    expect(visibleNos()).toEqual(ALL_NOS);
  });
});

describe("페이지", () => {
  it("페이지당 10/20/50/100, 기본 10 — 9건은 한 페이지", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
    const listbox = await screen.findByRole("listbox");
    expect(
      within(listbox)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    expect(bodyRows()).toHaveLength(9);
    expect(screen.queryByRole("button", { name: "2" })).toBeNull();
  });
});

describe("상세로 가는 길 (번호 · [명세서] · 행)", () => {
  it("행 어디를 눌러도 그 명세서 상세로", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(within(rowOf("STM-2609-0231")).getByText("2026.09"));
    expect(onNavSelect).toHaveBeenCalledWith("/settle-statement/STM-2609-0231");
  });

  it("명세서번호 링크·[명세서] 버튼도 같은 곳 — 행 클릭과 겹쳐 두 번 가지 않는다", async () => {
    const { user, onNavSelect } = renderPage();

    await user.click(screen.getByRole("button", { name: "STM-2609-0001" }));
    expect(onNavSelect).toHaveBeenCalledTimes(1);
    expect(onNavSelect).toHaveBeenLastCalledWith(
      "/settle-statement/STM-2609-0001",
    );

    await user.click(screen.getByRole("button", { name: "리틀스텝 명세서" }));
    expect(onNavSelect).toHaveBeenCalledTimes(2);
    expect(onNavSelect).toHaveBeenLastCalledWith(
      "/settle-statement/STM-2609-0227",
    );
    // 걷어낸 미리보기 모달이 되살아나지 않았다
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  it("loading — 머리는 남기고 값만 스켈레톤", () => {
    renderPage("?preview=loading");

    expect(
      screen.getByRole("columnheader", { name: "명세서번호" }),
    ).toBeVisible();
    expect(screen.queryByText("STM-2609-0001")).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });

  it("empty — 값이 있어도 빈 상태", () => {
    renderPage("?preview=empty");
    expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
  });

  it("refreshing — 값을 흐리게 둔다", async () => {
    renderPage("?preview=refreshing");

    expect(screen.getByText("STM-2609-0001")).toBeVisible();
    await waitFor(() =>
      expect(
        document.body.querySelector("[data-table-shell-body]")?.className,
      ).toContain("opacity-50"),
    );
  });
});
