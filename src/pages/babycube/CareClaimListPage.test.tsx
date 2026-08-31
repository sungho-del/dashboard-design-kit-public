import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CareClaimListPage } from "./CareClaimListPage";
import {
  CLAIMS,
  reviewableOf,
  sumRestoreFee,
  won,
} from "./CareClaimListPage.data";

/**
 * S14 안심케어 승인 — **동작** 검증.
 *
 * 상태 대시(건수 카드) · **기본 상태가 청구 접수인 것** · 조건부 열(승인일·반려일) ·
 * 기간 기준 3축 · 검색 조건 3종 · 행 선택 · 일괄 심사 두 갈래와 **검증 문구** ·
 * 모달 합계(고른 것이 아니라 심사 대상의 합) · 반려 사유 필수를 확인한다.
 *
 * ## ⚠️ "되살아나지 않는지"도 함께 본다
 * 원본 대조로 **도움말 툴팁 · 선택 바 · 툴바의 `심사` 버튼 · 체크박스 잠금**을 걷어냈고,
 * **반려 결과 문구**를 정반대에서 원본으로 되돌렸다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Select·DatePicker·Dropdown 이 쓰는 floating-ui `autoUpdate` 가 둘을 요구한다.
 */
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

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <CareClaimListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/care-claims"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 통째로 걷혀 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 청구의 주문번호(2번째 컬럼 — 1번째는 체크박스) */
function visibleOrderNos(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

function columnNames(): string[] {
  return within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((cell) => cell.textContent ?? "");
}

/** 검색 입력은 이 화면의 유일한 textbox 다 (반려 모달을 열기 전까지) */
function searchBox(): HTMLElement {
  return screen.getByRole("textbox");
}

/** 셀렉트를 열고 옵션 하나를 고른다 */
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string | RegExp,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(await screen.findByRole("listbox")).getByRole("option", {
      name: optionName,
    }),
  );
}

/** 일괄 심사 메뉴에서 항목 하나를 고른다 (원본 `toolsRight` 셀렉트에 해당) */
async function pickReview(
  user: ReturnType<typeof userEvent.setup>,
  itemName: string,
) {
  await user.click(screen.getByRole("button", { name: "일괄 심사" }));
  await user.click(
    within(await screen.findByRole("menu")).getByRole("menuitem", {
      name: itemName,
    }),
  );
}

describe("CareClaimListPage (BabyCube S14 안심케어 승인)", () => {
  describe("첫 화면 (원본 `defaultStat`)", () => {
    it("전체가 아니라 '청구 접수'로 열린다 — 일감을 보러 오는 화면이다", () => {
      renderPage();

      expect(
        screen.getByRole("button", { name: /^청구 접수/ }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(visibleOrderNos()).toEqual(
        CLAIMS.filter((row) => row.status === "received").map((row) => row.id),
      );
    });

    it("심사 안내 한 줄이 원본 문구 그대로다", () => {
      renderPage();

      expect(
        screen.getByText(
          "승인한 복원비만 익월 정산에 보전됩니다 — 접수·반려 건은 보전 대상이 아닙니다.",
        ),
      ).toBeVisible();
    });

    it("선택한 상태의 설명(원본 statusTips)이 상시 노출된다", () => {
      renderPage();

      expect(
        screen.getByText(/입점사가 복원비를 청구해 본사 판단을 기다리는/),
      ).toBeVisible();
    });

    it("⚠️ 도움말 툴팁을 되살리지 않는다 — 원본에 없다", () => {
      renderPage();

      expect(
        screen.queryByRole("button", { name: "안심케어 심사 도움말" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("상태 대시 (원본 `chip.dash: !0`)", () => {
    it("카드가 곧 필터다 — 누르면 그 상태만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^반려/ }));

      expect(visibleOrderNos()).toEqual(["R2026-0402-0620"]);
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
    });

    it("건수는 검색까지 통과한 행에서 센다 — 표와 모순되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^전체/ }));
      expect(
        screen.getByRole("button", { name: `전체 ${CLAIMS.length}건` }),
      ).toBeVisible();

      await pickOption(user, /검색조건/, "셀러명");
      await user.type(searchBox(), "맘스케어");

      // 맘스케어는 청구 접수 2건뿐이다 — 전체 카드도 2건이 돼야 한다
      expect(screen.getByRole("button", { name: "전체 2건" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: "청구 접수 2건" }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "승인 0건" })).toBeVisible();
    });
  });

  describe("조건부 열 (원본이 상태에 따라 밀어 넣는 두 열)", () => {
    it("청구 접수에서는 승인일·반려일 열이 없다", () => {
      renderPage();

      expect(columnNames()).toEqual([
        "",
        "주문번호",
        "셀러",
        "상품",
        "검수 판정",
        "복원비",
        "청구일",
        "상태",
      ]);
    });

    /**
     * 표 전체가 **한 기준선**에 선다 — 수치도 좌측이다.
     * 배지만 들어가는 열만 가운데다(`DESIGN.md` §7-2): 배지는 글자가 아니라 객체라
     * 왼쪽 모서리에 정보가 없다.
     */
    it("우측 정렬 열이 없다 · 배지만 든 열만 가운데다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );

      for (const el of [...cells, ...headers]) {
        expect(el.className.split(/\s+/)).not.toContain("text-right");
      }

      const BADGE_COLUMNS = [4, 7];
      headers.forEach((header, index) => {
        const want = BADGE_COLUMNS.includes(index);
        expect(header.className.split(/\s+/).includes("text-center")).toBe(
          want,
        );
        expect(
          cells[index].className.split(/\s+/).includes("text-center"),
        ).toBe(want);
      });
    });

    it("승인을 고르면 승인일 열만 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^승인/ }));

      expect(columnNames()).toContain("승인일");
      expect(columnNames()).not.toContain("반려일");
      // 원본 `ymd` — 날짜만 낸다
      expect(within(bodyRows()[0]).getAllByRole("cell")[7]).toHaveTextContent(
        "2026.08.03",
      );
    });

    it("반려를 고르면 반려일 열만 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^반려/ }));

      expect(columnNames()).toContain("반려일");
      expect(columnNames()).not.toContain("승인일");
    });
  });

  describe("기간 기준 3축 (원본 `date.fields`)", () => {
    it("청구일·승인일·반려일 셋 중에서 고른다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: /기간 기준/ }));
      expect(
        within(await screen.findByRole("listbox"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual(["청구일", "승인일", "반려일"]);
    });

    it("기준만 바꾸고 기간을 비워 두면 아무것도 걸리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^전체/ }));
      await pickOption(user, /기간 기준/, "승인일");

      expect(
        screen.getByRole("combobox", { name: /기간 기준/ }),
      ).toHaveTextContent("승인일");
      expect(screen.getByText(`목록 (총 ${CLAIMS.length}건)`)).toBeVisible();
    });
  });

  describe("검색 (조건 3종)", () => {
    it("기본 조건은 주문번호다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "0288");

      expect(visibleOrderNos()).toEqual(["R2026-0705-0288"]);
    });

    it("조건을 상품명으로 바꾸면 상품명으로 찾는다", async () => {
      const { user } = renderPage();

      await pickOption(user, /검색조건/, "상품명");
      await user.type(searchBox(), "바운서");

      expect(visibleOrderNos()).toEqual(["R2026-0705-0288"]);
    });

    it("조건이 주문번호일 때 셀러명으로는 찾히지 않는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "맘스케어");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });
  });

  describe("일괄 심사 — 막는 순서가 원본과 같다", () => {
    it("아무것도 고르지 않으면 원본 문구로 막는다", async () => {
      const { user } = renderPage();

      await pickReview(user, "승인 처리");

      expect(await screen.findByText("선택된 항목이 없습니다.")).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("심사할 수 없는 건만 골랐으면 이유를 말한다 (체크박스를 잠그지 않는다)", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^승인/ }));
      // 승인된 건은 다시 심사할 수 없다. 원본은 고를 수는 있게 둔다
      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0429-0188 선택" }),
      );
      await pickReview(user, "승인 처리");

      expect(
        await screen.findByText("청구 접수 상태인 건만 심사할 수 있습니다."),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("승인 모달", () => {
    it("건수·합계는 고른 것이 아니라 **심사 대상**의 것이다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^전체/ }));
      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0612-0503 선택" }),
      );
      // 심사할 수 없는 건을 하나 더 섞는다 — 합계에 들어가면 안 된다
      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0429-0188 선택" }),
      );
      await pickReview(user, "승인 처리");

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "안심케어 승인 (2건)" }),
      ).toBeVisible();

      const targets = reviewableOf([
        "R2026-0705-0288",
        "R2026-0612-0503",
        "R2026-0429-0188",
      ]);
      expect(targets).toHaveLength(2);
      expect(
        within(dialog).getByText(
          `승인하면 복원비 ${won(sumRestoreFee(targets))}이 익월 정산에 보전되고, 해당 건의 보증금은 차감 없이 종결됩니다.`,
        ),
      ).toBeVisible();
      expect(sumRestoreFee(targets)).toBe(82_000);
    });

    it("한 건이면 제목에 건수를 붙이지 않는다 (원본 규칙)", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "승인 처리");

      expect(
        within(await screen.findByRole("dialog")).getByRole("heading", {
          name: "안심케어 승인",
        }),
      ).toBeVisible();
    });

    it("되돌릴 수 없다는 경고가 함께 뜬다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "승인 처리");

      expect(
        within(await screen.findByRole("dialog")).getByText(
          "승인 후에는 이 화면에서 되돌릴 수 없습니다.",
        ),
      ).toBeVisible();
    });

    it("확정하면 원본 토스트를 띄우고 선택을 푼다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "승인 처리");
      await user.click(screen.getByRole("button", { name: "승인 처리" }));

      expect(
        await screen.findByText("승인 처리되었습니다. 익월 정산에 보전됩니다."),
      ).toBeVisible();
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      ).not.toBeChecked();
    });

    it("'취소'는 아무것도 진행시키지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "승인 처리");
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(
        screen.queryByText("승인 처리되었습니다. 익월 정산에 보전됩니다."),
      ).not.toBeInTheDocument();
    });
  });

  describe("반려 모달", () => {
    it("⚠️ 반려 결과 문구가 원본이다 — '차감 없이 종결'은 승인의 결과다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "반려 처리");

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(
          "반려하면 본사 보전 대상에서 빠지고, 해당 건은 보증금 차감 판단으로 되돌아갑니다(입점사 검수·반납 상세에 사유가 표시됩니다).",
        ),
      ).toBeVisible();
      expect(
        within(dialog).queryByText(/차감 없이 종결/),
      ).not.toBeInTheDocument();
    });

    it("사유가 비어 있으면 넘어가지 않는다 — 사유는 입점사에게 그대로 보인다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "반려 처리");
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      expect(
        await screen.findByText("반려 사유를 입력해주세요."),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("사유를 넣으면 반려 토스트를 띄우고 닫는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await pickReview(user, "반려 처리");

      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByRole("textbox"),
        "복원 견적서 미첨부",
      );
      await user.click(screen.getByRole("button", { name: "반려 처리" }));

      expect(await screen.findByText("반려 처리되었습니다.")).toBeVisible();
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });
  });

  describe("선택 유지 규칙", () => {
    it("조건을 바꾸면 선택이 풀린다 — 안 보이는 건이 합계에 들어가면 안 된다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );
      await user.click(screen.getByRole("button", { name: /^전체/ }));

      await pickReview(user, "승인 처리");
      expect(await screen.findByText("선택된 항목이 없습니다.")).toBeVisible();
    });

    it("⚠️ 선택 바를 되살리지 않는다 — 원본에는 메뉴 하나뿐이다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "R2026-0705-0288 선택" }),
      );

      expect(screen.queryByText("1건 선택됨")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "심사" })).toBeNull();
    });
  });

  describe("엑셀 다운로드 (원본 `toolsLeft`)", () => {
    it("지금 조회된 건수로 파일명을 만든다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("안심케어승인_4건.csv 를 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
