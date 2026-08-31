import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CouponListPage } from "./CouponListPage";

/**
 * S17 쿠폰 관리 — **동작** 테스트.
 *
 * 원본 대조(`chunks/2kq5rs018or94.js` 모듈 32262) 후의 계약을 지킨다.
 * 이 화면에서 좁히는 수단은 **상태 대시 하나뿐**이다 — 원본이 공용 목록 셸에
 * `filter: {}`(빈 객체)를 넘기기 때문이다. 그래서 이 파일의 절반은
 * "무엇이 **없어야** 하는가"를 본다: 한때 있던 필터 박스가 되살아나면 여기서 걸린다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <CouponListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/promo"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 헤더 행을 뺀 데이터 행 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 행의 N번째 셀 텍스트. 컬럼 순서: 셀러명·쿠폰명·내용·조건·기간·발행일·상태 */
function cellText(row: HTMLElement, index: number): string {
  return within(row).getAllByRole("cell")[index].textContent ?? "";
}

/** 남아 있는 쿠폰의 "쿠폰명" 셀(2번째 열) — 개수뿐 아니라 **무엇이** 남았는지까지 본다 */
function visibleNames(): string[] {
  return bodyRows().map((row) => cellText(row, 1));
}

/** 상태 대시 버튼. 접근가능 이름은 "발행완료 5건" 처럼 라벨+건수 한 문자열이다 */
function dashButton(label: string): HTMLElement {
  return within(screen.getByRole("group", { name: "쿠폰 상태" })).getByRole(
    "button",
    { name: new RegExp(`^${label} `) },
  );
}

describe("CouponListPage", () => {
  describe("표 구성 — 원본 컬럼 7열", () => {
    it("컬럼 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).toEqual([
        "셀러명",
        "쿠폰명",
        "내용",
        "조건",
        "기간",
        "발행일",
        "상태",
      ]);
    });

    it("colgroup 의 열 개수가 컬럼 개수와 같다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup col");
      expect(cols).toHaveLength(7);
    });

    it("발행일 열은 날짜만, 점 구분자로 낸다 (원본 `ymd`)", () => {
      renderPage();

      expect(cellText(bodyRows()[0], 5)).toBe("2026.08.24");
      expect(cellText(bodyRows()[0], 5)).not.toContain("15:10");
    });

    it("본사 발행 쿠폰은 셀러명 자리에 '본사'가 들어간다 — 배지로 칠하지 않는다", () => {
      renderPage();

      const sellerCell = within(bodyRows()[0]).getAllByRole("cell")[0];

      expect(sellerCell.textContent).toBe("본사");
      // 본사↔셀러는 대등한 분류라 Tag(배지)를 쓰지 않는다 (§3-1 분류 배지)
      expect(sellerCell.querySelector("[class*='tag']")).toBeNull();
    });
  });

  describe("상태 열 — 기간에서 파생된다", () => {
    it("시작 전은 발행대기, 사용 기간 중은 발행완료", () => {
      renderPage();

      // 09-01 시작 (기준일 08-24)
      expect(cellText(bodyRows()[0], 6)).toBe("발행대기");
      // 08-01 ~ 08-31
      expect(cellText(bodyRows()[1], 6)).toBe("발행완료");
    });

    it("종료일이 지나면 만료다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));

      // 2페이지 마지막 = 06-15 ~ 06-30 쿠폰
      const rows = bodyRows();
      expect(cellText(rows[3], 1)).toBe("여름 특가 1만원 쿠폰");
      expect(cellText(rows[3], 6)).toBe("만료");
    });

    it("정지는 기간이 남아 있어도 정지다 — 날짜로 알 수 없는 유일한 상태라 우선한다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));

      const rows = bodyRows();
      expect(cellText(rows[0], 1)).toBe("베베팜 단독 2만원 쿠폰");
      // 기간은 09-14 까지 남아 있는데도
      expect(cellText(rows[0], 4)).toBe("2026.08.15 ~ 2026.09.14");
      expect(cellText(rows[0], 6)).toBe("정지");
    });
  });

  describe("상태 대시 — 이 화면의 유일한 필터 (원본 StatDash)", () => {
    it("원본 상태 어휘 4개를 생애주기 순으로 둔다", () => {
      renderPage();

      const labels = within(screen.getByRole("group", { name: "쿠폰 상태" }))
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label"));

      expect(labels).toEqual([
        "발행대기 1건",
        "발행완료 5건",
        "만료 1건",
        "정지 1건",
      ]);
    });

    it("누르면 그 상태로 좁혀지고 aria-pressed 가 켜진다", async () => {
      const { user } = renderPage();

      expect(dashButton("만료")).toHaveAttribute("aria-pressed", "false");

      await user.click(dashButton("만료"));

      expect(dashButton("만료")).toHaveAttribute("aria-pressed", "true");
      expect(visibleNames()).toEqual(["여름 특가 1만원 쿠폰"]);
      expect(screen.getByText("총 1건")).toBeVisible();
    });

    it("좁혀도 대시 건수는 흔들리지 않는다 — 대시는 전체를 말한다", async () => {
      const { user } = renderPage();

      await user.click(dashButton("만료"));

      // 만료로 좁혔어도 나머지 카드가 0 이 되지 않는다
      expect(dashButton("발행완료")).toHaveAccessibleName("발행완료 5건");
      expect(dashButton("정지")).toHaveAccessibleName("정지 1건");
    });

    it("다시 누르면 해제된다 — 이 화면에는 '전체' 대시도 초기화 버튼도 없다", async () => {
      const { user } = renderPage();

      await user.click(dashButton("정지"));
      expect(screen.getByText("총 1건")).toBeVisible();

      await user.click(dashButton("정지"));

      expect(screen.getByText("총 8건")).toBeVisible();
      expect(dashButton("정지")).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("검색조건 박스가 없다 — 원본은 `filter: {}` 라 조건 축이 하나도 없다", () => {
      renderPage();

      expect(screen.queryByText("검색조건")).not.toBeInTheDocument();
      expect(screen.queryByText("조건 없음 (전체)")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "검색 닫기" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "검색 열기" }),
      ).not.toBeInTheDocument();
    });

    it("검색어·발행 주체·할인 유형 컨트롤이 없다", () => {
      renderPage();

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("툴바에 엑셀 다운로드 말고 다른 버튼이 없다 — 원본 `toolsLeft` 는 그것 하나다", () => {
      renderPage();

      expect(
        screen.queryByRole("button", { name: "쿠폰 등록" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "초기화" }),
      ).not.toBeInTheDocument();
    });

    it("PageHeader 에 안내 문장을 달지 않는다 — 원본 어드민에 페이지 설명문이 없다", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "쿠폰 관리" });
      expect(header.parentElement?.textContent).toBe("쿠폰 관리");
    });
  });

  describe("값 없음의 표기", () => {
    it("'조건 없음'·'기한 없음'을 빈칸이 아니라 문구로 적고 농도를 낮춘다", () => {
      renderPage();

      const noCondition = screen.getAllByText("조건 없음")[0];
      const noDeadline = screen.getAllByText("기한 없음")[0];

      // 문자열 부분 일치는 `text-text-minimal` 과 `text-text` 를 구별하지 못한다
      expect(noCondition.className.split(/\s+/)).toContain("text-text-minimal");
      expect(noDeadline.className.split(/\s+/)).toContain("text-text-minimal");
    });

    it("시작일이 없는 쿠폰은 '상시'로 적는다 — 원본 기간 열의 세 번째 분기", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));

      const always = screen.getByText("상시");
      expect(always.className.split(/\s+/)).toContain("text-text-minimal");
    });

    it("실제 조건이 있는 쿠폰은 농도를 낮추지 않는다", () => {
      renderPage();

      const realCondition = screen.getByText("50,000원 이상 구매");

      expect(realCondition.className.split(/\s+/)).toContain("text-text");
      expect(realCondition.className.split(/\s+/)).not.toContain(
        "text-text-minimal",
      );
    });

    it("최대 할인 한도는 부가 정보라 농도를 낮춘다", () => {
      renderPage();

      const cap = screen.getByText("(최대 20,000원)");
      expect(cap.className.split(/\s+/)).toContain("text-text-minimal");
      // 본문(할인율)까지 흐려지면 안 된다
      expect(cellText(bodyRows()[1], 2)).toBe("10% 할인 (최대 20,000원)");
    });
  });

  describe("페이지네이션", () => {
    it("8건을 4건씩 나눠 2페이지로 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("총 8건")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(bodyRows()).toHaveLength(4);
      expect(visibleNames()[0]).toBe("베베팜 단독 2만원 쿠폰");
      expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("상태를 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(dashButton("발행완료"));

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByText("총 5건")).toBeVisible();
    });
  });

  describe("쿠폰명 → 미리보기 모달", () => {
    it("쿠폰명을 누르면 그 쿠폰의 조건이 모달에 뜬다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "첫 대여 3천원 할인" }),
      );

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "쿠폰 미리보기" }),
      ).toBeVisible();
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["셀러명", "내용", "조건", "기간", "발행일"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "아이몽컴퍼니",
        "3,000원 할인",
        "조건 없음",
        "2026.08.20 ~ 기한 없음",
        "2026.08.20",
      ]);
      expect(within(sheet).getByText("발행완료")).toBeVisible();
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 쿠폰명 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[3]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("모달에 행 액션 버튼을 두지 않는다 — 원본 쿠폰 목록에는 행 액션이 없다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "첫 대여 3천원 할인" }),
      );
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: "쿠폰 코드 복사" }),
      ).not.toBeInTheDocument();
      // 남는 버튼은 모달을 닫는 것뿐이다
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });
  });

  describe("엑셀 다운로드", () => {
    it("지금 조회된 건수를 밝혀 토스트로 알린다", async () => {
      const { user } = renderPage();

      await user.click(dashButton("발행완료"));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("조회 결과 5건을 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
