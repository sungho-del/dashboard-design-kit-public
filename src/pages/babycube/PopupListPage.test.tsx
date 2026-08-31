import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { PopupListPage } from "./PopupListPage";

/**
 * S24 팝업 관리 — **동작** 테스트.
 *
 * 행 선택 · 선택 삭제 · **삭제 부분 실패** · 등록/수정 모달의 필수값 검증을 본다.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/popups` 에는 필터·검색·관리 열이 없다(`PopupListPage.tsx` 상단 주석).
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로 no-op 으로 채운다.
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
      <PopupListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/popups"
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

/** 보이는 팝업 제목 (2번째 컬럼 — 0번은 체크박스) */
function visibleTitles(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

function footerOf(dialog: HTMLElement): HTMLElement {
  return dialog.querySelector('[data-slot="footer"]') as HTMLElement;
}

describe("PopupListPage", () => {
  describe("목록·페이징", () => {
    it("1페이지에 PAGE_SIZE 만큼 보이고 총 건수를 표시한다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      // 원본 `ListHead` 와 같은 자리·같은 문구
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(1);
    });

    it("종료일이 없는 팝업의 노출 기간은 '상시'로 그린다", () => {
      renderPage();

      // 배지가 아니라 글자다 — 같은 행의 상태 Tag 와 색이 다투지 않도록
      expect(screen.getByText("2026.08.05 ~ 상시")).toBeVisible();
    });

    it("상태 컬럼이 노출 기간 앞에 온다 (원본 컬럼 순서)", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      // 원본 컬럼 5개가 전부다 — `관리` 열은 원본에 없다
      expect(headers.slice(1)).toEqual([
        "팝업 제목",
        "내용",
        "상태",
        "노출 기간",
        "등록일",
      ]);
    });
  });

  describe("원본에 없는 축 — 되살아나지 않는지", () => {
    it("상태 필터·검색·초기화가 툴바에 없다", () => {
      renderPage();

      // 검색 입력이 있었다면 모달이 닫힌 상태에서도 textbox 가 잡힌다
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      // 세그먼트 필터가 있었다면 radio 가 잡힌다 (모달 안 SegmentedControl 은 닫혀 있다)
      expect(screen.queryByRole("radio")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "초기화" }),
      ).not.toBeInTheDocument();
    });

    it("행 단위 '관리' 드롭다운이 없다 — 삭제는 선택 삭제 하나뿐이다", () => {
      renderPage();

      // GNB 메뉴에도 "…관리" 가 있으므로 표 안으로 범위를 좁힌다
      expect(
        within(screen.getByRole("table")).queryAllByRole("button"),
      ).toHaveLength(0);
      expect(
        screen.getByRole("button", { name: "선택 삭제" }),
      ).toBeInTheDocument();
    });
  });

  describe("행 선택·선택 삭제", () => {
    it("전체 선택은 현재 페이지의 행만 고른다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));

      expect(screen.getByText("4건 선택")).toBeVisible();
    });

    it("아무것도 고르지 않고 누르면 안내 토스트만 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const toast = await screen.findByText("선택된 팝업이 없습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("고른 팝업을 지우면 목록에서 사라진다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "배송 지연 안내 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(/사용자 화면에서도 즉시 내려갑니다/),
      ).toBeVisible();
      // 원본이 안내하는 대안 — 이 화면에는 [숨김] 상태가 실제로 있다
      expect(
        within(dialog).getByText(/잠시 내리려는 것이라면 \[숨김\]을 쓰세요\./),
      ).toBeVisible();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
      expect(visibleTitles()).not.toContain("배송 지연 안내");
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });

    it("2건 이상이면 제목과 토스트에 건수가 함께 붙는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "배송 지연 안내 선택" }),
      );
      await user.click(
        screen.getByRole("checkbox", { name: "8월 정기 점검 안내 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "팝업 삭제 (2건)" }),
      ).toBeVisible();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
      expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    });
  });

  describe("삭제 취소 · 부분 실패", () => {
    it("'취소'는 아무것도 지우지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "8월 정기 점검 안내 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "취소" }),
      );

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("삭제되지 않는 팝업은 모달을 닫지 않고 재시도 안내를 남긴다", async () => {
      const { user } = renderPage();

      // DELETE_BLOCKED_IDS 에 든 팝업 (PU-2026-0004)
      await user.click(
        screen.getByRole("checkbox", { name: "여름 세일 오픈 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      const toast = await screen.findByText("팝업을 삭제하지 못했습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      // 원본 문구 — 배너는 "목록을 다시 확인한 뒤", 팝업은 "문제를 확인한 뒤"다
      const alert = await within(await screen.findByRole("dialog")).findByRole(
        "alert",
      );
      expect(alert).toHaveTextContent("삭제 실패");
      expect(alert).toHaveTextContent("문제를 확인한 뒤 다시 시도해 주세요.");
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });
  });

  describe("등록·수정 모달", () => {
    it("제목·내용을 비우고 저장하면 두 에러가 함께 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "팝업 등록" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      expect(
        await within(dialog).findByText("팝업 제목을 입력해주세요."),
      ).toBeVisible();
      expect(within(dialog).getByText("내용을 입력해주세요.")).toBeVisible();
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("필수값을 채워도 시작일이 없으면 저장되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "팝업 등록" }));

      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByRole("textbox", { name: /팝업 제목/ }),
        "추석 배송 마감 안내",
      );
      await user.type(
        within(dialog).getByRole("textbox", { name: /내용/ }),
        "9/20 이후 주문은 연휴 뒤 발송됩니다.",
      );
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      const toast = await screen.findByText("노출 시작일을 선택해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("행을 클릭해 내용을 고치면 목록에 반영된다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "팝업 수정" }),
      ).toBeVisible();

      const contentBox = within(dialog).getByRole("textbox", { name: /내용/ });
      expect(contentBox).toHaveValue(
        "8/25(화) 02:00~04:00 서비스 점검이 있습니다.",
      );

      await user.clear(contentBox);
      await user.type(contentBox, "점검이 8/26으로 미뤄졌습니다.");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      expect(await screen.findByText("수정되었습니다.")).toBeVisible();
      expect(screen.getByText("점검이 8/26으로 미뤄졌습니다.")).toBeVisible();
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("상태를 숨김으로 바꿔 저장하면 표의 상태 셀이 따라 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]); // 8월 정기 점검 안내 (전시중)

      const dialog = await screen.findByRole("dialog");
      // 툴바에도 같은 이름의 radio 가 있다 — 모달 안으로 좁힌다
      await user.click(within(dialog).getByRole("radio", { name: "숨김" }));
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      expect(await screen.findByText("수정되었습니다.")).toBeVisible();

      // 상태 셀은 3번째 컬럼 (0 체크박스 · 1 제목 · 2 내용 · 3 상태)
      const statusCell = within(bodyRows()[0]).getAllByRole("cell")[3];
      expect(statusCell).toHaveTextContent("숨김");
    });
  });
});
