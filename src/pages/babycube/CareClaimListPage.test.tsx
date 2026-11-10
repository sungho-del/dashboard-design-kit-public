import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CareClaimListPage } from "./CareClaimListPage";
import {
  CLAIM_ROWS,
  OVERDUE_COUNT,
  REVIEW_COPY,
  isReviewOverdue,
  reviewDdayOf,
  reviewDdayText,
  sumAmount,
} from "./CareClaimListPage.data";
import { SETTLEMENT_SUMMARY, SELLER_SETTLEMENTS } from "./settlement.data";

/* -------------------------------------------------------------------------
 * S14 안심케어 승인 — 목록형 (+ 행 선택 · 일괄 심사)
 *
 * ## 무엇을 검증하는가
 * 상태 3카드(전체 없음 · 기본 청구 접수) · 접수 건만 선택 · No · 복원비/청구일 정렬 ·
 * 검색조건(기본 펼침) · 페이지 크기 · 승인 창(합계)/반려 창(사유 trim 필수 · 다시 열면 초기화) ·
 * 처리는 토스트만 · 행 클릭 → 상세(체크박스는 이동 안 함) · `?preview=` ·
 * **사례표 숫자**(접수 U-R18 9,000 · 승인 U-R28 12,000 · U-R29 18,000 · 반려 U-R19 15,000 —
 * 승인 합 30,000 = 셀러 정산 보전 합).
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 본다 — 엑셀 · [전체] 카드 · 단건 심사 버튼
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

function renderPage(url = "/care-claims") {
  window.history.replaceState(null, "", url);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <CareClaimListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/care-claims"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

afterEach(() => window.history.replaceState(null, "", "/"));

/* 사례표 `settle-cases.md` — 처리단위 · 주문번호 */
const RECEIVED_NO = "20260918112008"; // U-R18 베이비루 9,000 접수
const APPROVED_A = "20260820151024"; // U-R28 베베하우스 12,000 승인
const APPROVED_B = "20260818114237"; // U-R29 코지베이비 18,000 승인
const REJECTED_NO = "20260915084755"; // U-R19 리틀베이비 15,000 반려

const statusBox = (name: string) => screen.getByRole("button", { name });

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 열: 0 선택 · 1 No · 2 주문번호 · 3 셀러 · 4 상품 · 5 검수 판정 · 6 복원비 · 7 청구일 · 8 심사 기한 · [9 D-day|승인일|반려일] · 상태 */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");
const column = (index: number) =>
  bodyRows().map((row) => cellsOf(row)[index].textContent);
const rowOf = (orderNo: string) =>
  screen.getByRole("button", { name: orderNo }).closest("tr") as HTMLElement;

const bar = () => screen.getByRole("group", { name: "선택한 청구 일괄 심사" });
const queryBar = () =>
  screen.queryByRole("group", { name: "선택한 청구 일괄 심사" });
const rowCheckbox = (orderNo: string) =>
  screen.getByRole("checkbox", { name: `${orderNo} 선택` });
const sortButton = (name: string) =>
  within(screen.getByRole("columnheader", { name })).getByRole("button");

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionLabel: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", {
      name: optionLabel,
    }),
  );
}

describe("CareClaimListPage (S14 안심케어 승인)", () => {
  describe("샘플 — 주문 처리단위에서 뽑는다 (사례표)", () => {
    it("렌트·청구 있는 처리단위 4건 — 접수 1 · 승인 2 · 반려 1", () => {
      expect(
        CLAIM_ROWS.map((row) => [row.id, row.seller, row.amount, row.status]),
      ).toEqual([
        ["U-R18", "베이비루", 9000, "received"],
        ["U-R19", "리틀베이비", 15000, "rejected"],
        ["U-R28", "베베하우스", 12000, "approved"],
        ["U-R29", "코지베이비", 18000, "approved"],
      ]);
      /* 청구할 수 있는 판정은 「파손(복원가능)」 하나다(약관) */
      expect(CLAIM_ROWS.every((row) => row.inspection === "repairable")).toBe(
        true,
      );
    });

    it("승인 복원비 합 30,000원 = 2026.09 회차 셀러 정산의 보전 합 (베베하우스 12,000 · 코지베이비 18,000)", () => {
      const approved = CLAIM_ROWS.filter((row) => row.status === "approved");
      expect(sumAmount(approved)).toBe(30000);
      expect(SETTLEMENT_SUMMARY.care).toBe(30000);
      expect(
        SELLER_SETTLEMENTS.filter((row) => row.care > 0).map((row) => [
          row.name,
          row.care,
        ]),
      ).toEqual(
        expect.arrayContaining([
          ["베베하우스", 12000],
          ["코지베이비", 18000],
        ]),
      );
    });
  });

  describe("상태 대시 — 3장 · 전체 없음 · 기본 청구 접수", () => {
    it("청구 접수·승인·반려만 있고 [전체] 는 없다", () => {
      renderPage();
      expect(statusBox("청구 접수 1건")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(statusBox("승인 2건")).toBeVisible();
      expect(statusBox("반려 1건")).toBeVisible();
      expect(screen.queryByRole("button", { name: /^전체/ })).toBeNull();
    });

    it("카드가 곧 상태 필터다 — 승인일 열은 승인에서만, 반려일 열은 반려에서만", async () => {
      const { user } = renderPage();
      expect(column(2)).toEqual([RECEIVED_NO]);
      expect(screen.queryByRole("columnheader", { name: "승인일" })).toBeNull();

      await user.click(statusBox("승인 2건"));
      expect(column(2)).toEqual([APPROVED_A, APPROVED_B]);
      /* 8 은 심사 기한 — 승인일은 그 다음 칸이다 */
      expect(column(9)).toEqual(["2026.09.21", "2026.09.18"]);

      await user.click(statusBox("반려 1건"));
      expect(column(2)).toEqual([REJECTED_NO]);
      expect(
        screen.getByRole("columnheader", { name: "반려일" }),
      ).toBeInTheDocument();
      expect(column(9)).toEqual(["2026.10.16"]);
    });

    it("반려 카드 툴팁은 상품 문장이 아니라 안심케어 반려 안내다 (부록 A C48)", async () => {
      const { user } = renderPage();
      await user.hover(statusBox("반려 1건"));
      expect(
        await screen.findByText("셀러가 보증금 차감 여부를 다시 판단합니다."),
      ).toBeVisible();
      expect(screen.queryByText(/판매를 내린 상태/)).toBeNull();
    });

    it("청구 접수 카드 툴팁은 「접수일 기준 3번째 영업일까지 승인 또는 반려합니다.」 (부록 A C46)", async () => {
      const { user } = renderPage();
      await user.hover(statusBox("청구 접수 1건"));
      expect(
        await screen.findByText(
          "접수일 기준 3번째 영업일까지 승인 또는 반려합니다.",
        ),
      ).toBeVisible();
      expect(screen.queryByText(/은행 영업일/)).toBeNull();
    });

    it("승인 카드 툴팁은 「복원비가 다음 달 정산에 더해집니다.」 (부록 A C47)", async () => {
      const { user } = renderPage();
      await user.hover(statusBox("승인 2건"));
      expect(
        await screen.findByText("복원비가 다음 달 정산에 더해집니다."),
      ).toBeVisible();
      expect(screen.queryByText(/더 진행할 단계가 없습니다/)).toBeNull();
    });

    it("상태 카드와 검색조건 사이 안내 한 줄은 없다 (부록 A C45 삭제)", () => {
      renderPage();
      expect(
        screen.queryByText(/승인한 복원비만 익월 정산에 보전됩니다/),
      ).toBeNull();
      expect(screen.queryByText(/보전 대상이 아닙니다/)).toBeNull();
    });
  });

  describe("목록", () => {
    it("열 순서 · 셀 표기 (사례표 U-R18)", () => {
      renderPage();
      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((th) => th.textContent),
      ).toEqual([
        "",
        "No",
        "주문번호",
        "셀러",
        "상품",
        "검수 판정",
        "복원비",
        "청구일",
        "심사 기한",
        "D-day",
        "상태",
      ]);
      expect(cellsOf(rowOf(RECEIVED_NO)).map((td) => td.textContent)).toEqual([
        "",
        "1",
        RECEIVED_NO,
        "베이비루",
        "아기침대 슬립 베이직",
        "파손(복원가능)",
        "9,000원",
        "2026.10.10",
        /* 10-10(토) 접수 → 3번째 영업일 10-14 · 시연 기준일 10-19 → D+5 + 「기한 경과」 */
        "2026.10.14",
        "D+5기한 경과",
        "청구 접수",
      ]);
    });

    /** 추가 작업 요청 B13 — 「심사 기한」은 모든 탭, 「D-day」는 청구 접수 탭만 */
    it("승인·반려 탭에는 「심사 기한」 열만 있고 「D-day」 열과 「기한 경과」 배지는 없다", async () => {
      const { user } = renderPage();
      const headers = () =>
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((th) => th.textContent);
      const table = () => within(screen.getByRole("table"));

      expect(table().getByText("기한 경과")).toBeVisible();

      await user.click(statusBox("승인 2건"));
      expect(headers().slice(7)).toEqual([
        "청구일",
        "심사 기한",
        "승인일",
        "상태",
      ]);
      expect(column(8)).toEqual(["2026.09.23", "2026.09.21"]);
      expect(table().queryByText("기한 경과")).toBeNull();

      await user.click(statusBox("반려 1건"));
      expect(headers().slice(7)).toEqual([
        "청구일",
        "심사 기한",
        "반려일",
        "상태",
      ]);
      expect(column(8)).toEqual(["2026.10.19"]);
    });

    it("기한이 지난 접수 건이 있으면 목록 위에 안내 한 줄 — 탭을 바꿔도 같은 건수다", async () => {
      const { user } = renderPage();
      const notice =
        "심사 기한이 지난 청구 1건이 있습니다 — 먼저 처리해 주세요.";

      expect(OVERDUE_COUNT).toBe(1);
      expect(screen.getByRole("status")).toHaveTextContent(notice);

      await user.click(statusBox("승인 2건"));
      expect(screen.getByText(notice)).toBeVisible();
    });

    it("D-day 표기 — 남으면 D-n · 당일 D-day · 지나면 D+n, 끝난 청구에는 D-day 가 없다", () => {
      expect(reviewDdayText(3)).toBe("D-3");
      expect(reviewDdayText(0)).toBe("D-day");
      expect(reviewDdayText(-5)).toBe("D+5");

      const byId = (id: string) => CLAIM_ROWS.find((row) => row.id === id)!;
      expect(reviewDdayOf(byId("U-R18"))).toBe(-5);
      expect(isReviewOverdue(byId("U-R18"))).toBe(true);
      /* 승인·반려 건은 기한 날짜만 — 기한이 지났어도 경과로 세지 않는다 */
      expect(reviewDdayOf(byId("U-R28"))).toBeNull();
      expect(isReviewOverdue(byId("U-R28"))).toBe(false);
      /* 기한이 남은 접수 건(예시에는 없다) — 기한만 뒤로 옮긴 사본으로 본다 */
      const later = { ...byId("U-R18"), reviewDueOn: "2026-10-21" };
      expect(reviewDdayOf(later)).toBe(2);
      expect(isReviewOverdue(later)).toBe(false);
    });

    it("「목록 (총 N건)」 · 엑셀 없음 · 단건 심사 버튼 없음", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "목록 (총 1건)" }),
      ).toBeVisible();
      expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
      expect(
        within(rowOf(RECEIVED_NO))
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual([RECEIVED_NO]);
    });

    it("No 는 조회 결과의 역순 순번이다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));
      expect(column(1)).toEqual(["2", "1"]);
    });

    it("페이지당 개수는 10·20·50·100 이다", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    });
  });

  describe("정렬 — 복원비 · 청구일 (원본 sortHead)", () => {
    it("복원비 오름 → 내림 → 해제", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));

      await user.click(sortButton("복원비"));
      expect(column(6)).toEqual(["12,000원", "18,000원"]);
      await user.click(sortButton("복원비"));
      expect(column(6)).toEqual(["18,000원", "12,000원"]);
      await user.click(sortButton("복원비"));
      expect(column(2)).toEqual([APPROVED_A, APPROVED_B]);
    });

    it("청구일 오름차순 — 정렬해도 No 는 위에서부터 역순", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));
      await user.click(sortButton("청구일"));
      expect(column(7)).toEqual(["2026.09.16", "2026.09.18"]);
      expect(column(1)).toEqual(["2", "1"]);
    });

    it("상태 카드를 바꾸면 정렬과 선택이 풀린다 (원본 subnav)", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      await user.click(sortButton("복원비"));

      await user.click(statusBox("승인 2건"));
      expect(
        screen.getByRole("columnheader", { name: "복원비" }),
      ).toHaveAttribute("aria-sort", "none");
      expect(queryBar()).toBeNull();
    });

    it("승인일·반려일은 정렬하지 않는다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));
      expect(
        within(
          screen.getByRole("columnheader", { name: "승인일" }),
        ).queryByRole("button"),
      ).toBeNull();
    });
  });

  describe("검색조건 — 기본 펼침 · 입력 즉시 적용", () => {
    it("펼친 채로 열리고, 접으면 요약이 조건을 말한다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "검색 조건", "셀러명");
      await user.type(screen.getByPlaceholderText("검색어 입력"), "베베하우스");
      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.getByText("셀러명 «베베하우스»")).toBeVisible();
    });

    it("검색어가 카드 건수에도 걸린다 — 상태를 뺀 나머지 조건으로 센다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "검색 조건", "셀러명");
      await user.type(screen.getByPlaceholderText("검색어 입력"), "베베하우스");

      expect(statusBox("청구 접수 0건")).toBeVisible();
      expect(statusBox("승인 1건")).toBeVisible();
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });

    it("주문번호·상품명으로도 찾는다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));
      await user.type(screen.getByPlaceholderText("검색어 입력"), "0818");
      expect(column(2)).toEqual([APPROVED_B]);

      await chooseOption(user, "검색 조건", "상품명");
      await user.clear(screen.getByPlaceholderText("검색어 입력"));
      await user.type(screen.getByPlaceholderText("검색어 입력"), "코모");
      expect(column(2)).toEqual([APPROVED_A]);
    });

    it("기간 기준을 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "기간 기준", "반려일");
      expect(screen.getByText("반려일 시작")).toBeVisible();
    });

    it("초기화하면 청구 접수로 돌아간다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("반려 1건"));
      await user.type(screen.getByPlaceholderText("검색어 입력"), "없는건");
      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(statusBox("청구 접수 1건")).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(column(2)).toEqual([RECEIVED_NO]);
    });
  });

  describe("선택 — 청구 접수 건만", () => {
    it("종결 건은 고를 수 없고 전체 선택도 잠긴다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("승인 2건"));
      expect(rowCheckbox(APPROVED_A)).toBeDisabled();
      expect(
        screen.getByRole("checkbox", { name: "전체 선택" }),
      ).toBeDisabled();
    });

    it("고르면 일괄 바가 뜨고, 체크박스를 눌러도 상세로 가지 않는다", async () => {
      const { user, onNavSelect } = renderPage();
      expect(queryBar()).toBeNull();

      await user.click(rowCheckbox(RECEIVED_NO));
      expect(within(bar()).getByText("1건 선택됨")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();
    });
  });

  describe("일괄 승인 — 원본 gateApprove(care)", () => {
    it("원본 문구 · 심사 대상 복원비 합계 · 처리하면 토스트만", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      await user.click(
        within(bar()).getByRole("button", { name: /승인 처리/ }),
      );

      const dialog = screen.getByRole("dialog", { name: "안심케어 승인" });
      expect(
        within(dialog).getByText(
          "복원비 9,000원이 다음 달 정산에 더해지고, 보증금은 차감 없이 종결됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText("승인 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "승인 처리" }),
      );
      expect(
        await screen.findByText(
          "승인 처리되었습니다. 다음 달 정산에 더해집니다.",
        ),
      ).toBeVisible();
      /* 퍼블 범위 — 상태·건수는 그대로, 선택만 풀린다 */
      expect(statusBox("청구 접수 1건")).toBeVisible();
      expect(within(rowOf(RECEIVED_NO)).getByText("청구 접수")).toBeVisible();
      expect(queryBar()).toBeNull();
    });

    it("취소하면 아무 일도 없다", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      await user.click(
        within(bar()).getByRole("button", { name: /승인 처리/ }),
      );
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "취소",
        }),
      );
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(rowCheckbox(RECEIVED_NO)).toBeChecked();
    });

    it("여러 건이면 제목·알림에 건수가 붙는다 (문구 계약)", () => {
      expect(REVIEW_COPY.approveTitle(2)).toBe("안심케어 승인 (2건)");
      expect(REVIEW_COPY.approved(2)).toBe(
        "2건 승인 처리되었습니다. 다음 달 정산에 더해집니다.",
      );
      expect(REVIEW_COPY.rejectTitle(2)).toBe("안심케어 반려 사유 입력 (2건)");
      expect(REVIEW_COPY.rejected(2)).toBe("2건을 반려 처리했습니다.");
      expect(REVIEW_COPY.approveBody(30000)).toContain("복원비 30,000원이");
    });
  });

  describe("일괄 반려 — 원본 carereject", () => {
    const openReject = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(
        within(bar()).getByRole("button", { name: /반려 처리/ }),
      );
      return screen.getByRole("dialog", { name: "안심케어 반려 사유 입력" });
    };

    it("사유가 비거나 공백뿐이면 처리하지 않고 입력칸 아래에 이유를 낸다", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      const dialog = await openReject(user);

      expect(
        within(dialog).getByPlaceholderText("예: 복원 견적서 미첨부"),
      ).toBeVisible();
      expect(
        within(dialog).getByText(
          "반려하면 셀러가 보증금 차감 여부를 다시 판단합니다. 반려 사유는 셀러에게 보입니다.",
        ),
      ).toBeVisible();

      await user.type(within(dialog).getByRole("textbox"), "   ");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(
        within(dialog).getByText("반려 사유를 입력해주세요."),
      ).toBeVisible();
      expect(screen.queryByText("반려 처리되었습니다.")).toBeNull();
    });

    it("닫았다 다시 열면 적던 사유가 남지 않는다", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      let dialog = await openReject(user);
      await user.type(within(dialog).getByRole("textbox"), "견적서 없음");
      await user.click(within(dialog).getByRole("button", { name: "취소" }));

      dialog = await openReject(user);
      expect(within(dialog).getByRole("textbox")).toHaveValue("");
    });

    it("사유를 적으면 토스트만 — 행은 그대로", async () => {
      const { user } = renderPage();
      await user.click(rowCheckbox(RECEIVED_NO));
      const dialog = await openReject(user);
      await user.type(within(dialog).getByRole("textbox"), "견적서 미첨부");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(await screen.findByText("반려 처리되었습니다.")).toBeVisible();
      expect(statusBox("반려 1건")).toBeVisible();
      expect(queryBar()).toBeNull();
    });
  });

  describe("상세 진입", () => {
    it("주문번호를 누르면 처리단위 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(screen.getByRole("button", { name: RECEIVED_NO }));
      expect(onNavSelect).toHaveBeenCalledWith("/care-claims/U-R18");
    });

    it("행의 다른 칸을 눌러도 같은 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(statusBox("반려 1건"));
      await user.click(cellsOf(rowOf(REJECTED_NO))[4]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/care-claims/U-R19");
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 본문만 스켈레톤", () => {
      renderPage("/care-claims?preview=loading");
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
      expect(screen.queryByText("해당 조건의 항목이 없습니다")).toBeNull();
    });

    it("empty — 빈 상태 · 카드 0건", () => {
      renderPage("/care-claims?preview=empty");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(statusBox("청구 접수 0건")).toBeVisible();
    });

    it("refreshing — 표는 남고 바쁨 표시가 붙는다", () => {
      renderPage("/care-claims?preview=refreshing");
      expect(column(2)).toEqual([RECEIVED_NO]);
      expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });
});
