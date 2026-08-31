import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ReviewListPage } from "./ReviewListPage";
import { REVIEWS } from "./ReviewListPage.data";

/**
 * S21 리뷰 관리 — **동작** 테스트.
 *
 * 원본 대조(`chunks/1gh8hvu-ixb27.js` 모듈 17716·26766) 후 이 화면은
 * **툴바가 없는 순수 조회 목록**이 되었다. 그래서 이 파일의 상당수는
 * "무엇이 **없어야** 하는가"를 본다 — 한때 있던 대시·증감·검색·답글 등록이
 * 되살아나면 여기서 걸린다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <ReviewListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/reviews-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 행의 N번째 셀 텍스트. 컬럼 순서: 작성자·셀러·상품·별점·내용·작성일·상태 */
function cellText(row: HTMLElement, index: number): string {
  return within(row).getAllByRole("cell")[index].textContent ?? "";
}

describe("ReviewListPage", () => {
  describe("표 구성 — 원본 컬럼 7열", () => {
    it("컬럼 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).toEqual([
        "작성자",
        "셀러",
        "상품",
        "별점",
        "내용",
        "작성일",
        "상태",
      ]);
    });

    it("colgroup 의 열 개수가 컬럼 개수와 같다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup col");
      expect(cols).toHaveLength(7);
    });

    it("작성일은 날짜만, 점 구분자로 낸다 (원본 `ymd`)", () => {
      renderPage();

      expect(cellText(bodyRows()[0], 5)).toBe("2026.08.24");
      expect(cellText(bodyRows()[0], 5)).not.toContain("09:12");
    });

    it("내용 셀은 말줄임 처리된다 (원본 `cell-ell`)", () => {
      renderPage();

      const contentCell = within(bodyRows()[0]).getAllByRole("cell")[4];
      expect(contentCell.querySelector("[data-table-ellipsis]")).not.toBeNull();
    });

    /**
     * 이 화면에는 **자릿수를 비교하는 수치 열이 없다** — 별점은 별 그림이고
     * 나머지는 전부 글자다. 그래서 우측 정렬은 한 열도 없어야 한다.
     *
     * 상태만 가운데다(`DESIGN.md` §7-2) — 배지만 들어가는 열이라 왼쪽 모서리에
     * 정보가 없다. 이 규칙은 이 테스트보다 나중에 정해졌다.
     */
    it("우측 정렬 열이 없다 · 배지만 든 상태 열만 가운데다", () => {
      renderPage();

      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      for (const header of headers) {
        expect(header.className.split(/\s+/)).not.toContain("text-right");
      }

      // 작성자·셀러·상품·별점·내용·작성일 = 좌측, 상태(6) = 가운데
      headers.forEach((header, index) => {
        const centered = header.className.split(/\s+/).includes("text-center");
        expect(centered).toBe(index === 6);
      });
    });
  });

  describe("별점", () => {
    it("별 5개를 그리고 점수는 접근가능 이름으로 준다", () => {
      renderPage();

      // 첫 행 = 5점
      const rating = within(bodyRows()[0]).getByRole("img");
      expect(rating).toHaveAccessibleName("별점 5점 (5점 만점)");
      expect(rating.querySelectorAll("svg")).toHaveLength(5);
    });

    it("채운 별의 개수가 점수와 같다", () => {
      renderPage();

      // 2번째 행 = 2점 (이준서)
      const rating = within(bodyRows()[1]).getByRole("img");
      expect(rating).toHaveAccessibleName("별점 2점 (5점 만점)");

      const filled = [...rating.querySelectorAll("svg")].filter((star) =>
        star.getAttribute("class")?.split(/\s+/).includes("fill-current"),
      );
      expect(filled).toHaveLength(2);
    });
  });

  describe("숨김 리뷰 — 목록에서 사라지지 않고 표시가 달라진다 (원본 규칙)", () => {
    it("내용 앞에 '(숨김)' 이 붙는다", async () => {
      const { user } = renderPage();

      const hidden = REVIEWS.find((review) => review.hidden);
      expect(hidden).toBeDefined();

      // 08-17 21:14 → 최신순 8번째라 2페이지 마지막 행
      await user.click(screen.getByRole("button", { name: "2" }));

      const row = bodyRows()[3];
      expect(cellText(row, 0)).toBe(hidden!.author);
      expect(cellText(row, 4)).toBe(`(숨김) ${hidden!.content}`.trim());
    });

    it("숨김 리뷰도 목록에서 빠지지 않는다", () => {
      renderPage();

      expect(screen.getByText(`총 ${REVIEWS.length}건`)).toBeVisible();
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("툴바가 통째로 없다 — 검색·초기화·엑셀 다운로드가 모두 없다", () => {
      renderPage();

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "엑셀 다운로드" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "초기화" }),
      ).not.toBeInTheDocument();
    });

    it("상태 요약 대시와 증감 수치가 없다 — 지어낸 값이었다", () => {
      renderPage();

      expect(
        screen.queryByRole("region", { name: "답글 상태 요약" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("어제 대비")).not.toBeInTheDocument();
      expect(screen.queryByText(/^\+\d+건$/)).not.toBeInTheDocument();
      // 상태로 좁히는 토글 버튼도 없다
      expect(
        screen.queryByRole("button", { pressed: false }),
      ).not.toBeInTheDocument();
    });

    it("답글 등록이 없다 — 원본 목록에 조치가 하나도 없다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", {
          name: "설치가 쉬워서 좋았어요. 아이도 편해합니다.",
        }),
      );
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: "답글 등록" }),
      ).not.toBeInTheDocument();
      // 남는 버튼은 모달을 닫는 것뿐이다
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });

    it("낮은 별점 강조 문구가 없다 — 원본에 없는 운영 규칙이었다", () => {
      renderPage();

      expect(
        screen.queryByText(/답글을 먼저 달아 주세요/),
      ).not.toBeInTheDocument();
    });

    it("PageHeader 에 안내 문장을 달지 않는다", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "리뷰 관리" });
      expect(header.parentElement?.textContent).toBe("리뷰 관리");
    });
  });

  describe("정렬·페이지네이션", () => {
    it("작성일 최신순으로 줄 세운다 (원본 `createdAt desc`)", () => {
      renderPage();

      const dates = bodyRows().map((row) => cellText(row, 5));
      expect(dates).toEqual([
        "2026.08.24",
        "2026.08.23",
        "2026.08.22",
        "2026.08.21",
      ]);
    });

    it("9건을 4건씩 나눠 3페이지로 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);

      await user.click(screen.getByRole("button", { name: "3" }));

      expect(bodyRows()).toHaveLength(1);
      expect(cellText(bodyRows()[0], 0)).toBe("서다온");
    });
  });

  describe("내용 → 리뷰 미리보기", () => {
    it("내용을 누르면 본문 전문이 모달에 뜬다", async () => {
      const { user } = renderPage();

      const review = REVIEWS[1]; // 이준서 · 2점
      await user.click(screen.getByRole("button", { name: review.content }));

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "리뷰 미리보기" }),
      ).toBeVisible();
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["작성자", "셀러", "별점", "작성일", "상태"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "이준서",
        "베이비루션",
        "별점 2점 (5점 만점)",
        "2026.08.23",
        "답글 대기",
      ]);
      expect(within(sheet).getByText(review.content)).toBeVisible();
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 내용 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[2]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
