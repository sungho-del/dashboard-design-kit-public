import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { RentDepositListPage } from "./RentDepositListPage";
import {
  deduct,
  deductedTotal,
  DEPOSITS,
  holdingTotal,
  NO_AMOUNT,
  num,
  pendingRefundTotal,
  refundOf,
  returnedTotal,
  won,
} from "./RentDepositListPage.data";

/**
 * S13 보증금 내역 — **동작** 검증.
 *
 * 금액 요약 4값(원본 문구·파생값) · 보증금 상태 칩 · 출처 칩 · 검색 조건 2종 ·
 * 기간(상태 변경일) · 빈 상태 · 페이지네이션 · **반환 예정액 계산** ·
 * 셀 라벨이 칩보다 길어지는 규칙 · 주문번호 고정열을 확인한다.
 *
 * ## ⚠️ "되살아나지 않는지"도 함께 본다
 * 원본 대조로 **상태 요약 대시 5장 · 증감(±%) · 도움말 툴팁 · 주문번호 복사 버튼**을
 * 걷어냈고, 반대로 **안심케어 표식 · 출처 칩 · 구분 열 위치**를 되살렸다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Select·DatePicker·SegmentedControl 이 쓰는 관측기를 no-op 으로 채운다.
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
      <RentDepositListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/rent-deposit"
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

/** 남아 있는 건의 주문번호(1번째 컬럼) — 몇 건인지뿐 아니라 **무엇이** 남았는지 본다 */
function visibleOrderNos(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 (DatePicker 는 combobox) */
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

describe("RentDepositListPage (BabyCube S13 보증금 내역)", () => {
  describe("금액 요약 (원본 `note` 슬롯 · 4값)", () => {
    it("원본 문구와 순서를 그대로 쓴다 — 괄호 설명까지 원본이다", () => {
      renderPage();

      expect(screen.getByText("점유중 보증금 총액")).toBeVisible();
      // 괄호가 이 값이 무엇을 세는지를 말한다. 떼면 "환급 대기액"이 예정인지 실행인지 흐려진다
      expect(screen.getByText("환급 대기액 (판정됨·실행 전)")).toBeVisible();
      expect(screen.getByText("반환 완료액")).toBeVisible();
      expect(
        screen.getByText("차감 수익 (연체료+손상 · 상한=보증금)"),
      ).toBeVisible();
    });

    it("네 값이 보증금 풀을 나눠 갖는다 — 손으로 적은 값이 하나도 없다", () => {
      renderPage();

      expect(screen.getByText(num(holdingTotal))).toBeVisible();
      expect(screen.getByText(num(pendingRefundTotal))).toBeVisible();
      expect(screen.getByText(num(returnedTotal))).toBeVisible();
      expect(screen.getByText(num(deductedTotal))).toBeVisible();

      // 들고 있다 + 나갈 예정(환급+차감) + 나갔다 + 본사가 가졌다 = 받아 둔 보증금 전부
      const pendingDeduction = DEPOSITS.filter(
        (row) => row.depositStatus === "pendingRefund",
      ).reduce((acc, row) => acc + row.deduction, 0);
      const deposits = DEPOSITS.reduce((acc, row) => acc + row.deposit, 0);
      expect(
        holdingTotal +
          pendingRefundTotal +
          pendingDeduction +
          returnedTotal +
          deductedTotal,
      ).toBe(deposits);
    });

    it("⚠️ 증감(±%)·도움말 툴팁을 되살리지 않는다 — 원본 타일은 라벨·값뿐이다", () => {
      renderPage();

      expect(screen.queryByText(/전월 말 대비/)).not.toBeInTheDocument();
      expect(screen.queryByText(/지난주 대비/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "보증금 흐름 도움말" }),
      ).not.toBeInTheDocument();
    });

    it("⚠️ 상태 요약 대시(건수 카드)를 되살리지 않는다 — 원본이 이 화면에서만 꺼 둔다", () => {
      renderPage();

      // 원본 `showStatusDashboard: !1`. 상태 축의 컨트롤은 칩 하나뿐이어야 한다
      expect(
        screen.queryByRole("region", { name: "보증금 상태 요약" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /점유중/ })).toBeNull();
    });
  });

  describe("표 (원본 11열 · 주문번호 고정)", () => {
    it("컬럼 이름과 순서가 원본 그대로다 — 구분은 회원 다음 세 번째다", () => {
      renderPage();

      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual([
        "주문번호",
        "회원",
        "구분",
        "셀러명",
        "상품",
        "보증금액",
        "차감",
        "반환 예정액",
        "주문 상태",
        "보증금 상태",
        "상태 변경일",
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

      const BADGE_COLUMNS = [2, 8, 9];
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

    it("원본 `frozen` 열(주문번호)이 실제로 고정된다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[0].className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "left-0"]),
      );
      expect(cells[1].className.split(/\s+/)).not.toContain("sticky");
    });

    it("자체 재고는 셀러명 칸이 '본사'가 된다 (데이터에 박지 않는다)", () => {
      renderPage();

      // 2번째 행 = 이서준(자체). `seller` 는 빈 문자열이고 화면이 "본사"를 채운다
      const cells = within(bodyRows()[1]).getAllByRole("cell");
      expect(cells[2]).toHaveTextContent("본사"); // 구분
      expect(cells[3]).toHaveTextContent("본사"); // 셀러명
      expect(DEPOSITS[1].seller).toBe("");
    });

    it("상품 이름 옆 안심케어 표식 — 열이 아니라 표식이다", () => {
      renderPage();

      // S14 안심케어 승인에 청구가 있는 건에만 붙는다. 1페이지에는 두 건이 보인다
      const marks = screen.getAllByText("안심케어");
      expect(marks).toHaveLength(2);

      // 열로 세지 않는다 — 헤더에 "안심케어"가 있으면 안 된다
      expect(
        within(screen.getByRole("table")).queryByRole("columnheader", {
          name: /안심케어/,
        }),
      ).not.toBeInTheDocument();
    });

    it("상태 변경일은 원본 `ymd` 처럼 날짜만 낸다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[10].textContent).toBe("2026.08.01");
    });
  });

  describe("금액 (파생값 · 부호 표기)", () => {
    it("반환 예정액 = 보증금액 − 차감", () => {
      renderPage();

      // 4번째 행 = 최유나 90,000 − 18,000
      const cells = within(bodyRows()[3]).getAllByRole("cell");
      expect(cells[5]).toHaveTextContent("90,000원");
      expect(cells[6]).toHaveTextContent("-18,000원");
      expect(cells[7].textContent).toBe(won(refundOf(DEPOSITS[3])));
      expect(refundOf(DEPOSITS[3])).toBe(72_000);
    });

    it("차감이 없으면 0원이 아니라 '-' 다 (원본 표기)", () => {
      expect(deduct(0)).toBe(NO_AMOUNT);

      renderPage();
      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[6].textContent).toBe(NO_AMOUNT);
      expect(cells[6].textContent).not.toContain("원");
    });

    it("차감 상한은 보증금액이다 — 반환 예정액이 음수가 되지 않는다", () => {
      for (const row of DEPOSITS) {
        expect(row.deduction).toBeLessThanOrEqual(row.deposit);
        expect(refundOf(row)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("보증금 상태 칩", () => {
    it("기본은 전체 — 1페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(5);
      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
      // "전체"는 상태 칩과 출처 칩 양쪽에 있다 — 첫째가 상태다
      expect(screen.getAllByRole("radio", { name: "전체" })[0]).toBeChecked();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(3);
    });

    it("전액차감을 고르면 그 건만 남고 셀 라벨은 길어진다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "전액차감" }));

      expect(visibleOrderNos()).toEqual(["R2026-0410-0912"]);
      // 칩은 짧게, 셀은 원본처럼 길게 — "전액차감"만 있으면 예정으로 읽힌다
      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[9]).toHaveTextContent("환급완료(전액차감)");
    });

    it("환급대기를 고르면 판정만 끝난 건이 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "환급대기" }));

      expect(visibleOrderNos()).toEqual(["R2026-0612-0503", "R2026-0620-0455"]);
    });
  });

  describe("출처 칩 (원본 `chips: owner`)", () => {
    it("자체만 고르면 본사 재고 건만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "자체" }));

      expect(visibleOrderNos()).toEqual(["R2026-0728-0117", "R2026-0620-0455"]);
    });

    it("상태 칩과 출처 칩은 함께 걸린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "환급대기" }));
      await user.click(screen.getByRole("radio", { name: "입점사" }));

      expect(visibleOrderNos()).toEqual(["R2026-0612-0503"]);
    });
  });

  describe("검색 (조건 2종)", () => {
    it("기본 조건은 주문번호다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "0042");

      expect(visibleOrderNos()).toEqual(["R2026-0731-0042"]);
    });

    it("조건을 회원명으로 바꾸면 회원명으로 찾는다", async () => {
      const { user } = renderPage();

      await pickOption(user, /검색조건/, "회원명");
      await user.type(searchBox(), "최유나");

      expect(visibleOrderNos()).toEqual(["R2026-0612-0503"]);
    });

    it("조건이 주문번호일 때 회원명으로는 찾히지 않는다 — 한 칸에 뭉뚱그리지 않았다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "최유나");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });
  });

  describe("빈 상태·초기화", () => {
    it("매칭이 없으면 원본 문구로 비우고 표와 페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      expect(screen.getByRole("table")).toBeInTheDocument();

      await user.type(searchBox(), "없는주문");

      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(
        screen.getByText(
          "조건을 변경하거나 필터를 초기화한 뒤 다시 조회해 주세요.",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("'필터 초기화'로 전체가 돌아온다 — 컨트롤도 함께 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "전액차감" }));
      await user.click(screen.getByRole("radio", { name: "자체" }));
      await user.type(searchBox(), "없는주문");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(5);
      expect(screen.getByText("목록 (총 8건)")).toBeVisible();
      expect(screen.getAllByRole("radio", { name: "전체" })[0]).toBeChecked();
      expect(searchBox()).toHaveValue("");
    });

    it("필터를 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(screen.getByRole("radio", { name: "점유중" }));

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("행 클릭 → 보증금 미리보기", () => {
    it("행을 열면 금액 4항목이 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[3]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "보증금 미리보기" }),
      ).toBeVisible();
      expect(within(sheet).getByText("R2026-0612-0503 · 최유나")).toBeVisible();

      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["상품", "보증금액", "차감", "반환 예정액"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "하이체어 우드 · 그레이",
        "90,000원",
        "-18,000원",
        "72,000원",
      ]);
    });

    it("⚠️ 모달에 '주문번호 복사'를 되살리지 않는다 — 원본에 없다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: "주문번호 복사" }),
      ).not.toBeInTheDocument();
      expect(sheet.querySelector('[data-slot="footer"]')).toBeNull();
    });
  });

  describe("엑셀 다운로드 (원본 `toolsLeft`)", () => {
    it("지금 조회된 건수로 파일명을 만든다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "환급대기" }));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("보증금내역_2건.csv 를 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
