import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { NoticeListPage } from "./NoticeListPage";
import { EXCERPT_LENGTH, NOTICES, excerpt } from "./NoticeListPage.data";

/**
 * S19 공지사항 관리 — **동작** 테스트.
 *
 * 원본 대조(`chunks/3ev97mnz8g4z1.js` 모듈 31590) 후의 계약을 지킨다.
 * 이 화면이 좁히는 축은 **대상 칩 하나뿐**이고, 정렬은 등록일 최신순 하나뿐이다.
 * 그래서 여기서는 (1) 대상 전환이 실제로 목록을 바꾸는가 (2) 제목 셀의 두 줄 구조가
 * 살아 있는가 (3) 한때 있던 상태 필터·고정 토글이 되살아나지 않았는가를 본다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <NoticeListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/notices"
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

/** 제목 셀의 **링크 버튼** 텍스트. 같은 셀에 본문 발췌가 함께 있어 셀 전체를 읽으면 안 된다 */
function visibleTitles(): string[] {
  return bodyRows()
    .map(
      (row) =>
        within(within(row).getAllByRole("cell")[1]).getAllByRole(
          "button",
        )[0] as HTMLElement,
    )
    .map((button) => button.textContent ?? "");
}

/** 행의 N번째 셀 텍스트. 컬럼 순서: 고정·제목·게시 기간·상태·등록일 */
function cellText(row: HTMLElement, index: number): string {
  return within(row).getAllByRole("cell")[index].textContent ?? "";
}

async function switchTo(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(
    within(screen.getByRole("radiogroup", { name: "대상" })).getByRole(
      "radio",
      {
        name: label,
      },
    ),
  );
}

describe("NoticeListPage", () => {
  describe("표 구성 — 원본 컬럼 5열", () => {
    it("컬럼 이름과 순서가 원본과 같다 — 게시 기간이 상태보다 앞이다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).toEqual(["고정", "제목", "게시 기간", "상태", "등록일"]);
    });

    it("colgroup 의 열 개수가 컬럼 개수와 같다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup col");
      expect(cols).toHaveLength(5);
    });

    it("등록일은 날짜만, 점 구분자로 낸다 (원본 `ymd`)", () => {
      renderPage();

      // 첫 행 = 고객 공지 중 최신(2026-08-23 16:20)
      expect(cellText(bodyRows()[0], 4)).toBe("2026.08.23");
      expect(cellText(bodyRows()[0], 4)).not.toContain("16:20");
    });

    it("게시 기간도 점 구분자이고, 종료일이 없으면 꼬리만 '상시'가 된다", () => {
      renderPage();

      // 09-01 ~ 09-30 (기한 있음)
      expect(cellText(bodyRows()[0], 2)).toBe("2026.09.01 ~ 2026.09.30");

      // 08-10 ~ 상시 — 시작일은 실제 값이라 살아 있어야 한다
      const openEnded = bodyRows()[2];
      expect(cellText(openEnded, 2)).toBe("2026.08.10 ~ 상시");
      const tail = within(openEnded).getByText("상시");
      expect(tail.className.split(/\s+/)).toContain("text-text-minimal");
    });
  });

  describe("제목 셀은 두 줄이다 — 링크 + 본문 발췌 (원본 구조)", () => {
    it("제목 아래에 본문 발췌가 함께 나온다", () => {
      renderPage();

      const notice = NOTICES.find((item) => item.id === "N-2026-041");
      expect(notice).toBeDefined();

      const titleCell = within(bodyRows()[1]).getAllByRole("cell")[1];
      expect(within(titleCell).getByRole("button")).toHaveTextContent(
        notice!.title,
      );
      expect(titleCell.textContent).toContain(excerpt(notice!.body));
    });

    it("긴 본문은 60자에서 잘리고 말줄임표가 붙는다", () => {
      const long = NOTICES.find((item) => item.body.length > EXCERPT_LENGTH);
      expect(long).toBeDefined();

      renderPage();

      // 전문이 그대로 들어가면 안 된다 — 잘렸다는 증거
      expect(screen.queryByText(long!.body)).not.toBeInTheDocument();
      expect(excerpt(long!.body)).toHaveLength(EXCERPT_LENGTH + 1);
      expect(screen.getByText(excerpt(long!.body))).toBeVisible();
    });
  });

  describe("대상 칩 — 이 화면의 유일한 조건", () => {
    it("고객 공지로 시작한다 (원본 기본값 `aud=고객`)", () => {
      renderPage();

      expect(
        within(screen.getByRole("radiogroup", { name: "대상" })).getByRole(
          "radio",
          { name: "고객 공지" },
        ),
      ).toBeChecked();
      expect(screen.getByText("총 4건")).toBeVisible();
    });

    it("셀러 공지로 바꾸면 목록이 통째로 갈린다", async () => {
      const { user } = renderPage();

      await switchTo(user, "셀러 공지");

      expect(visibleTitles()).toEqual([
        "셀러 등급 개편 사전 안내",
        "정산 지급일 변경 안내 (9월부터)",
        "상품 등록 이미지 가이드 개정",
      ]);
      expect(screen.getByText("총 4건")).toBeVisible();
    });

    it("'전체' 칩은 없다 — 공지는 한쪽을 보고 쓰는 글이다", () => {
      renderPage();

      const chips = within(screen.getByRole("radiogroup", { name: "대상" }))
        .getAllByRole("radio")
        .map((chip) => chip.textContent);

      expect(chips).toEqual(["고객 공지", "셀러 공지"]);
    });

    it("대상을 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await switchTo(user, "셀러 공지");

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("정렬 — 등록일 최신순 하나뿐 (원본 `createdAt desc`)", () => {
    it("고정 공지를 위로 올리지 않는다", () => {
      renderPage();

      // 고정된 N-2026-041(08-20)보다 더 최신인 N-2026-045(08-23)가 위에 온다
      expect(visibleTitles()).toEqual([
        "9월 신규 브랜드 입점 예고",
        "추석 연휴 배송·회수 일정 안내",
        "안심케어 서비스 이용약관 개정 안내",
      ]);
      // 고정 배지는 2번째 행에 있다
      expect(cellText(bodyRows()[1], 0)).toBe("고정");
      expect(cellText(bodyRows()[0], 0)).toBe("-");
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("상태 필터가 없다 — 원본 조건은 대상 칩 하나뿐이다", () => {
      renderPage();

      const groups = screen.getAllByRole("radiogroup");
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveAccessibleName("대상");
      expect(
        screen.queryByRole("button", { name: "초기화" }),
      ).not.toBeInTheDocument();
    });

    it("고정 토글이 없다 — 원본 `isPinned` 는 읽기 전용 배지다", async () => {
      const { user } = renderPage();

      // 목록에도, 모달에도 고정을 바꾸는 버튼이 없다
      expect(
        screen.queryByRole("button", { name: /고정/ }),
      ).not.toBeInTheDocument();

      await user.click(
        screen.getByRole("button", { name: "추석 연휴 배송·회수 일정 안내" }),
      );
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: /상단 고정/ }),
      ).not.toBeInTheDocument();
      // 남는 버튼은 모달을 닫는 것뿐이다
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });

    it("PageHeader 에 안내 문장을 달지 않는다", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "공지사항 관리" });
      expect(header.parentElement?.textContent).toBe("공지사항 관리");
    });
  });

  describe("공지 작성", () => {
    it("버튼 문구는 원본대로 '공지 작성'이고, 지금 대상을 알린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "공지 작성" }));

      expect(
        await screen.findByText("고객 공지 작성 화면을 엽니다"),
      ).toBeVisible();
    });

    it("대상을 바꾸면 알림 문구도 함께 바뀐다", async () => {
      const { user } = renderPage();

      await switchTo(user, "셀러 공지");
      await user.click(screen.getByRole("button", { name: "공지 작성" }));

      expect(
        await screen.findByText("셀러 공지 작성 화면을 엽니다"),
      ).toBeVisible();
    });
  });

  describe("페이지네이션", () => {
    it("대상별 4건을 3건씩 나눠 2페이지로 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(3);

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(visibleTitles()).toEqual(["여름 휴가철 고객센터 운영 시간 변경"]);
    });
  });

  describe("제목 → 공지 미리보기", () => {
    it("제목을 누르면 본문 전문이 모달에 뜬다", async () => {
      const { user } = renderPage();

      const notice = NOTICES.find((item) => item.id === "N-2026-041");
      await user.click(screen.getByRole("button", { name: notice!.title }));

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "공지 미리보기" }),
      ).toBeVisible();
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["게시 기간", "상태", "등록일", "고정"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual(["2026.08.20 ~ 2026.09.30", "게시중", "2026.08.20", "고정"]);
      // 표에서 잘린 본문이 여기서는 전문으로 보인다
      expect(within(sheet).getByText(notice!.body)).toBeVisible();
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 제목 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[2]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
