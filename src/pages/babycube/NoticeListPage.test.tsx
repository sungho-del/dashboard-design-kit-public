import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { NoticeListPage } from "./NoticeListPage";
import {
  EXCERPT_LENGTH,
  excerpt,
  noticeOrder,
  NOTICES,
} from "./NoticeListPage.data";

/**
 * S19 공지사항 관리 — **동작** 테스트 (기획 v0.4 `SCREENS.notices` 대조 후).
 *
 * 대상 탭 전환(주소 `?aud=`) · 원본 샘플 순서·건수(고객 3 · 셀러 5) · 셀 표기 ·
 * 행 클릭 → 공지 상세 · `+ 공지 작성` → 지금 탭의 신규 폼 · 페이지네이션 없음 · `?preview=`.
 */
function renderPage(search = "") {
  window.history.replaceState(null, "", `/notices${search}`);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <NoticeListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/notices"
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

/** 컬럼 순서: 고정 · 제목 · 게시 기간 · 상태 · 등록일 */
const cellOf = (row: HTMLElement, index: number) =>
  within(row).getAllByRole("cell")[index];

/** 제목 셀의 링크 버튼 글자(본문 발췌는 빼고) */
const titles = () =>
  bodyRows().map(
    (row) => within(cellOf(row, 1)).getByRole("button").textContent,
  );

const switchTo = (user: ReturnType<typeof userEvent.setup>, label: string) =>
  user.click(
    within(screen.getByRole("radiogroup", { name: "대상" })).getByRole(
      "radio",
      { name: label },
    ),
  );

describe("NoticeListPage", () => {
  it("표 5열 — 원본 순서(게시 기간이 상태보다 앞)", () => {
    renderPage();
    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["고정", "제목", "게시 기간", "상태", "등록일"]);
    expect(
      screen.getByRole("table").querySelectorAll("colgroup col"),
    ).toHaveLength(5);
  });

  describe("대상 전환 — 고객 3 · 셀러 5", () => {
    it("기본은 고객 공지 — 고정 먼저 → 최신순(시드 순서와 같다)", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "목록 (총 3건)" }),
      ).toBeVisible();
      expect(titles()).toEqual([
        "[안내] 여름 성수기 배송 일정 안내",
        "[공지] 보증금 환급 안내 문구 개정",
        "[이벤트] 첫 렌트 30% 쿠폰 오픈",
      ]);
    });

    it("셀러 공지로 바꾸면 5건 + 주소에 `?aud=seller` — 다시 고객이면 쿼리가 빠진다", async () => {
      const { user } = renderPage();
      await switchTo(user, "셀러 공지");

      expect(
        screen.getByRole("heading", { name: "목록 (총 5건)" }),
      ).toBeVisible();
      expect(titles()[0]).toBe(
        "[정산] 7월 정산 명세 확인 요청 발송 안내 (7/1)",
      );
      expect(titles()[4]).toBe("[시스템] 셀러 어드민 정기 점검 안내 (6/12)");
      expect(window.location.search).toBe("?aud=seller");

      await switchTo(user, "고객 공지");
      expect(window.location.search).toBe("");
      expect(bodyRows()).toHaveLength(3);
    });

    it("`?aud=seller` 로 들어오면 셀러 탭으로 열린다(상세에서 돌아온 경우)", () => {
      renderPage("?aud=seller");
      expect(screen.getByRole("radio", { name: "셀러 공지" })).toBeChecked();
      expect(bodyRows()).toHaveLength(5);
    });
  });

  /* 판정 Q13 · 디자인 §1 — 고정 먼저(최신순) → 일반(최신순), 세 앱 공통 */
  describe("정렬 — 고정 먼저(최신순) → 일반(최신순)", () => {
    it("배열 순서와 상관없이 고정 글을 위로, 묶음 안은 등록일 최신순", () => {
      const base = NOTICES[0];
      const row = (id: string, pinned: boolean, date: string) => ({
        ...base,
        id,
        pinned,
        date,
      });
      const sorted = [
        row("일반-07-05", false, "2026-07-05"),
        row("고정-06-01", true, "2026-06-01"),
        row("일반-07-10", false, "2026-07-10"),
        row("고정-06-20", true, "2026-06-20"),
      ].sort(noticeOrder);

      expect(sorted.map((notice) => notice.id)).toEqual([
        "고정-06-20",
        "고정-06-01",
        "일반-07-10",
        "일반-07-05",
      ]);
    });
  });

  describe("셀 표기 — 사례표", () => {
    it("고정 = 대상별 첫 글만 「고정」, 나머지 「-」", async () => {
      const { user } = renderPage();
      expect(bodyRows().map((row) => cellOf(row, 0).textContent)).toEqual([
        "고정",
        "-",
        "-",
      ]);
      await switchTo(user, "셀러 공지");
      expect(bodyRows().map((row) => cellOf(row, 0).textContent)).toEqual([
        "고정",
        "-",
        "-",
        "-",
        "-",
      ]);
    });

    it("게시 기간 — 종료 없으면 꼬리만 흐린 「상시」, 있으면 종료일", () => {
      renderPage();
      const [first, , third] = bodyRows();
      expect(cellOf(first, 2).textContent).toBe("2026.07.01 ~ 상시");
      expect(within(cellOf(first, 2)).getByText("상시")).toHaveClass(
        "text-text-minimal",
      );
      expect(cellOf(third, 2).textContent).toBe("2026.06.01 ~ 2026.08.31");
      expect(cellOf(first, 4).textContent).toBe("2026.07.01");
    });

    it("상태 = 저장값 — 기간이 지난 N-U29 도 「게시」 · 숨김은 셀러 N-S22 하나", async () => {
      const { user } = renderPage();
      expect(bodyRows().map((row) => cellOf(row, 3).textContent)).toEqual([
        "게시",
        "게시",
        "게시",
      ]);
      await switchTo(user, "셀러 공지");
      expect(bodyRows().map((row) => cellOf(row, 3).textContent)).toEqual([
        "게시",
        "게시",
        "게시",
        "게시",
        "숨김",
      ]);
    });

    it("제목 아래 본문 발췌 — 60자 넘으면 말줄임", () => {
      renderPage();
      expect(cellOf(bodyRows()[0], 1)).toHaveTextContent(
        "7~8월 성수기에는 도서산간 지역 배송이 1~2일 지연될 수 있습니다.",
      );
      const long = "가".repeat(EXCERPT_LENGTH + 5);
      expect(excerpt(long)).toBe(`${"가".repeat(EXCERPT_LENGTH)}…`);
      expect(excerpt("짧은 본문")).toBe("짧은 본문");
    });
  });

  describe("이동", () => {
    it("행 어디를 눌러도 공지 상세로 — 제목 링크도 같은 곳", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(cellOf(bodyRows()[1], 2));
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices/N-U30");

      await user.click(within(cellOf(bodyRows()[2], 1)).getByRole("button"));
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices/N-U29");
    });

    it("`+ 공지 작성` — 지금 탭의 대상으로 신규 폼", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(screen.getByRole("button", { name: "공지 작성" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices/new");

      await switchTo(user, "셀러 공지");
      await user.click(screen.getByRole("button", { name: "공지 작성" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices/new?aud=seller");
    });
  });

  it("원본에 없는 것 — 페이지네이션·미리보기 모달이 없다", async () => {
    const { user } = renderPage("?aud=seller");
    expect(
      screen.queryByRole("navigation", { name: "페이지네이션" }),
    ).toBeNull();
    await user.click(cellOf(bodyRows()[0], 2));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("데이터 상태 (?preview=)", () => {
    it("loading — 머리는 남기고 값은 스켈레톤", () => {
      renderPage("?preview=loading");
      expect(screen.getByRole("columnheader", { name: "제목" })).toBeVisible();
      expect(
        screen.queryByText("[안내] 여름 성수기 배송 일정 안내"),
      ).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("empty — 「등록된 고객 공지가 없습니다」", () => {
      renderPage("?preview=empty");
      expect(screen.getByText("등록된 고객 공지가 없습니다")).toBeVisible();
    });

    it("refreshing — 값을 흐리게 둔다", async () => {
      renderPage("?preview=refreshing");
      expect(
        screen.getByText("[안내] 여름 성수기 배송 일정 안내"),
      ).toBeVisible();
      await waitFor(() =>
        expect(
          document.body.querySelector("[data-table-shell-body]")?.className,
        ).toContain("opacity-50"),
      );
    });
  });
});
