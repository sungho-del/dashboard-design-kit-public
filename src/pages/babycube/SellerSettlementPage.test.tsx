import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerSettlementPage } from "./SellerSettlementPage";
import {
  credit,
  deduct,
  NO_AMOUNT,
  num,
  payoutOf,
  ROUND_SUMMARY,
  SETTLEMENTS,
  won,
} from "./SellerSettlementPage.data";

/**
 * S12 셀러 정산 — **동작** 검증.
 *
 * 렌더 여부만 보면 표가 통째로 빠져도 통과한다. 그래서 여기서는
 * 요약 4값(원본 순서·파생값) · 상태 칩 필터 · 셀러명 검색 · 빈 상태 · 페이지네이션 ·
 * **지급액 계산(여섯 조각의 가감)** · 부호 표기 규칙 · 좌측 2열 고정을 확인한다.
 *
 * ## ⚠️ "되살아나지 않는지"도 함께 본다
 * 이 화면은 원본 대조로 **증감(±%)·비교 기준 문구·행 액션 4종·확인 모달·헤더 배지**를
 * 걷어냈다. 다음 세션이 같은 것을 또 만들지 않도록 없음을 못박는 테스트를 남긴다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * `SegmentedControl` 의 인디케이터가 크기 관측에 기대므로 no-op 으로 채운다.
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
      <SellerSettlementPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/settle-seller"
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

/** 남아 있는 회차의 "셀러" 셀(2번째 컬럼) — 몇 건인지뿐 아니라 **무엇이** 남았는지 본다 */
function visibleSellers(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 */
function searchBox(): HTMLElement {
  return screen.getByRole("textbox");
}

/** 화면에 나온 순서대로인지 — 텍스트 인덱스가 아니라 DOM 위치로 본다 */
function inDocumentOrder(...texts: string[]): boolean {
  const nodes = texts.map((text) => screen.getByText(text));
  return nodes.every((node, index) => {
    if (index === 0) return true;
    const previous = nodes[index - 1];
    return Boolean(
      previous.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
}

describe("SellerSettlementPage", () => {
  describe("처리 대상 정산 요약 (원본 `note` 슬롯)", () => {
    it("요약이 어느 회차의 것인지 제목으로 못박는다 — 표는 여러 회차가 섞여 있다", () => {
      renderPage();

      expect(
        screen.getByRole("heading", { name: "2026년 7월 정산 요약" }),
      ).toBeVisible();
      // 지급일은 요약의 부제다. 없으면 "언제 나가는 돈인가"가 화면에서 사라진다
      expect(screen.getByText("지급일 2026.08.10")).toBeVisible();
    });

    it("원본 4값을 원본 순서대로 보여준다 (거래액 → 수수료 수익 → 정산 대상 → 지급 예정 총액)", () => {
      renderPage();

      expect(
        inDocumentOrder(
          "입점사 거래액(정가)",
          "본사 수수료 수익",
          "정산 대상",
          "지급 예정 총액",
        ),
      ).toBe(true);

      // 단위도 원본 그대로 — 셋은 원, 정산 대상만 개사다
      expect(screen.getByText("개사")).toBeVisible();
    });

    it("요약 금액은 저술값이 아니라 표의 현재 회차 합이다", () => {
      renderPage();

      // 손으로 적으면 "수수료 수익 = 거래액의 10%"인데 표의 행은 전부 12% 인 화면이 나온다
      expect(screen.getByText(num(ROUND_SUMMARY.listAmount))).toBeVisible();
      expect(screen.getByText(num(ROUND_SUMMARY.platformFee))).toBeVisible();
      expect(screen.getByText(num(payoutOf(ROUND_SUMMARY)))).toBeVisible();

      // 정산 대상 개수는 표의 현재 회차 행 수와 같아야 한다
      expect(screen.getByText(String(ROUND_SUMMARY.sellerCount))).toBeVisible();
      expect(ROUND_SUMMARY.sellerCount).toBe(5);

      // 표의 모든 현재 회차 행이 같은 수수료율이면 요약도 같은 율이어야 한다
      expect(ROUND_SUMMARY.platformFee / ROUND_SUMMARY.listAmount).toBeCloseTo(
        SETTLEMENTS[0].platformFee / SETTLEMENTS[0].listAmount,
        6,
      );
    });

    it("⚠️ 증감(±%)·비교 기준 문구를 되살리지 않는다 — 원본 타일은 라벨·값·단위뿐이다", () => {
      renderPage();

      // 이전 회차 전체 데이터가 없어 **계산할 수 없는** 저술값이었다
      expect(screen.queryByText(/전월 회차 대비/)).not.toBeInTheDocument();
      expect(screen.queryByText(/13\.5%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/^[+-]\d+\.\d%$/)).not.toBeInTheDocument();
    });

    it("⚠️ '정산 대상' 은 헤더 배지가 아니라 요약의 세 번째 항목이다", () => {
      renderPage();

      expect(screen.queryByText(/정산 대상 \d+개사/)).not.toBeInTheDocument();
      // 도움말 툴팁도 원본에 없다
      expect(
        screen.queryByRole("button", { name: "정산 흐름 도움말" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("지급액 계산 (파생값)", () => {
    it("지급액 = 거래액 − 셀러쿠폰 − 수수료 − PG수수료 − 취소·반품 차감 + 안심케어", () => {
      // 안심케어만 부호가 반대다. 뺄셈으로 처리하면 여기서 걸린다
      expect(payoutOf(SETTLEMENTS[0])).toBe(225_993_000);
      expect(payoutOf(SETTLEMENTS[2])).toBe(77_215_000);
      expect(payoutOf(SETTLEMENTS[3])).toBe(50_613_000);
    });

    it("⛔ 다른 화면과 맞물린 금액 — 6월 회차 지급액은 S15 명세서와 같은 돈이다", () => {
      const june = SETTLEMENTS.find((row) => row.id === "2026-06-SEL0142")!;

      // S15 `ST-202606-0002` 의 지급액과 같아야 한다. 한쪽만 고치면 두 화면이 어긋난다
      expect(payoutOf(june)).toBe(206_268_000);
      // S16 `TX-202607-0001` 의 공급가액과 같아야 한다
      expect(SETTLEMENTS[0].platformFee).toBe(34_152_000);
    });

    it("표의 지급액 칸이 계산 결과와 일치한다", () => {
      renderPage();

      // 1페이지 첫 행 = 베베마켓 2026년 7월
      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[8]).toHaveTextContent("225,993,000원");
      expect(cells[8].textContent).toBe(won(payoutOf(SETTLEMENTS[0])));
    });
  });

  describe("금액 부호 표기 (데이터가 정한다)", () => {
    it("차감 항목은 -, 안심케어 보전은 + 로 나간다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[3]).toHaveTextContent("-6,820,000원"); // 셀러쿠폰
      expect(cells[4]).toHaveTextContent("-34,152,000원"); // 수수료
      expect(cells[5]).toHaveTextContent("-6,395,000원"); // PG수수료
      expect(cells[6]).toHaveTextContent("-12,480,000원"); // 취소·반품 차감
      expect(cells[7]).toHaveTextContent("+1,240,000원"); // 안심케어
    });

    it("금액이 없는 칸은 0원이 아니라 '-' 다 (원본 표기)", () => {
      // 맘스케어는 안심케어 보전이 없다.
      // `+0원` 은 읽는 사람을 멈추게 하고, `0원` 은 "0을 정산했다"로 읽힌다
      expect(credit(0)).toBe(NO_AMOUNT);
      expect(deduct(0)).toBe(NO_AMOUNT);

      renderPage();
      const cells = within(bodyRows()[2]).getAllByRole("cell");
      expect(cells[7].textContent).toBe(NO_AMOUNT);
      expect(cells[7].textContent).not.toContain("원");
    });
  });

  describe("표 (원본 11열 · 좌측 2열 고정)", () => {
    it("컬럼 이름과 순서가 원본 그대로다", () => {
      renderPage();

      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual([
        "정산 회차",
        "셀러",
        "거래액(정가)",
        "셀러쿠폰",
        "수수료",
        "PG수수료",
        "취소·반품 차감",
        "안심케어",
        "지급액",
        "상태",
        "처리",
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

      const BADGE_COLUMNS = [9];
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

    it("원본 `frozen` 두 열이 실제로 고정된다", () => {
      renderPage();

      // 문자열 부분 일치는 `left-0` 과 `left-0.5` 를 못 가른다 — 클래스 배열로 본다
      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[0].className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "left-0"]),
      );
      expect(cells[1].className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "left-25"]),
      );
      // 세 번째 열부터는 함께 스크롤한다
      expect(cells[2].className.split(/\s+/)).not.toContain("sticky");
    });
  });

  describe("상태 칩 필터", () => {
    it("기본은 전체 — 1페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
      expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });

    it("이의제기를 고르면 그 회차만 남고 원본 상태 설명이 함께 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "이의제기" }));

      expect(visibleSellers()).toEqual(["리틀스텝"]);
      expect(screen.getByText("목록 (총 1건)")).toBeVisible();
      // 원본 `statusTips` 문구 — 마우스를 올려야 보이는 툴팁 대신 상시 노출이다
      expect(
        screen.getByText(/본사가 검토해 \[수정 명세 재발송\]/),
      ).toBeVisible();
    });

    it("전체일 때는 상태 설명을 띄우지 않는다 — 고를 상태가 없다", () => {
      renderPage();

      expect(
        screen.queryByText(/셀러가 명세에 이의를 제기했습니다/),
      ).not.toBeInTheDocument();
    });

    it("지급완료를 고르면 종결된 회차만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "지급완료" }));

      expect(visibleSellers()).toEqual(["베베마켓"]);
      expect(within(bodyRows()[0]).getAllByRole("cell")[0]).toHaveTextContent(
        "2026년 6월",
      );
    });
  });

  describe("셀러명 검색", () => {
    it("셀러명으로 좁히면 그 셀러의 회차만 남는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "베베마켓");

      // 7월(확인완료) · 6월(지급완료) 두 회차가 남는다
      expect(visibleSellers()).toEqual(["베베마켓", "베베마켓"]);
      expect(screen.getByText("목록 (총 2건)")).toBeVisible();
    });

    it("정산 회차 id 로도 검색된다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "2026-06");

      expect(visibleSellers()).toEqual(["베베마켓"]);
    });

    it("상태 칩과 검색은 함께 걸린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "지급완료" }));
      await user.type(searchBox(), "리틀스텝");

      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });
  });

  describe("빈 상태·초기화", () => {
    it("매칭이 없으면 원본 문구로 비우고 표와 페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      expect(screen.getByRole("table")).toBeInTheDocument();

      await user.type(searchBox(), "없는셀러");

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

      await user.click(screen.getByRole("radio", { name: "보류" }));
      await user.type(searchBox(), "없는셀러");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
      expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();
      expect(searchBox()).toHaveValue("");
    });

    it("필터를 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(screen.getByRole("radio", { name: "전체" }));

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("처리 컬럼 — 원본은 상세 링크 하나다", () => {
    it("행마다 '상세' 하나뿐이다 (상태별 액션 버튼을 되살리지 않는다)", () => {
      renderPage();

      expect(screen.getAllByRole("button", { name: "상세" })).toHaveLength(4);

      // 걷어낸 4종. 특히 '확인요청 발송' 은 원본이 "익월 1일 자동 발송"이라고 못박은 일이다
      for (const label of [
        "확인요청 발송",
        "지급 처리",
        "수정 명세 재발송",
        "협의 결론 기록",
      ]) {
        expect(
          screen.queryByRole("button", { name: label }),
        ).not.toBeInTheDocument();
      }
      expect(screen.queryByText("셀러 응답 대기")).not.toBeInTheDocument();
    });

    it("'상세'는 확인 모달이 아니라 미리보기를 연다", async () => {
      const { user } = renderPage();

      await user.click(screen.getAllByRole("button", { name: "상세" })[0]);

      // 행 클릭까지 함께 타면 모달이 둘 열린다 — stopPropagation 을 여기서 본다
      expect(screen.getAllByRole("dialog")).toHaveLength(1);
      expect(
        within(await screen.findByRole("dialog")).getByRole("heading", {
          name: "정산 미리보기",
        }),
      ).toBeVisible();
    });
  });

  describe("행 클릭 → 정산 미리보기", () => {
    it("행을 열면 그 회차의 요약 4항목과 상태 설명이 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "정산 미리보기" }),
      ).toBeVisible();
      expect(within(sheet).getByText("2026년 7월 · 베베마켓")).toBeVisible();

      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["거래액", "지급액", "상태", "회차 마감"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "284,600,000원",
        "225,993,000원",
        "확인완료",
        "2026-07-31 23:59",
      ]);
      // 상태 설명이 모달에 함께 나와야 다음 단계를 알 수 있다
      expect(
        within(sheet).getByText(/지급일\(매월 10일\)에 지급합니다/),
      ).toBeVisible();
    });

    it("푸터는 '명세서 보기' 하나 — 실재하는 S15 화면으로 잇는다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(bodyRows()[0]);
      const dialog = await screen.findByRole("dialog");
      const footer = dialog.querySelector(
        '[data-slot="footer"]',
      ) as HTMLElement;

      expect(within(footer).getAllByRole("button")).toHaveLength(1);
      await user.click(
        within(footer).getByRole("button", { name: "명세서 보기" }),
      );

      expect(onNavSelect).toHaveBeenCalledWith("/settle-statement");
    });
  });

  describe("엑셀 다운로드 (원본 `toolsLeft`)", () => {
    it("지금 조회된 건수로 파일명을 만든다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "지급완료" }));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("셀러정산_1건.csv 를 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
