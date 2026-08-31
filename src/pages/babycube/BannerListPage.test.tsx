import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { BannerListPage } from "./BannerListPage";

/**
 * S23 배너 관리 — **동작** 테스트.
 *
 * 렌더 여부만 보면 목록이 통째로 빠져도 통과한다. 여기서는 이 화면이
 * 실제로 하는 일을 본다 — 행 선택 · 선택 삭제 · **삭제 부분 실패** ·
 * 등록/수정 모달의 검증과 저장.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/display` 에는 필터·검색·관리 열이 없다(`BannerListPage.tsx` 상단 주석).
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
      <BannerListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/display"
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

/** 보이는 배너 제목 (2번째 컬럼 — 0번은 체크박스) */
function visibleTitles(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 모달 푸터 — 헤더 X 와 이름이 겹치는 버튼을 콕 집기 위해 */
function footerOf(dialog: HTMLElement): HTMLElement {
  return dialog.querySelector('[data-slot="footer"]') as HTMLElement;
}

describe("BannerListPage", () => {
  describe("목록·페이징", () => {
    it("1페이지에 PAGE_SIZE 만큼 보이고 총 건수를 표시한다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      // 원본 `ListHead` 와 같은 자리·같은 문구
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });

    it("표는 원본 컬럼 5개 + 선택 체크박스로만 이뤄진다", () => {
      renderPage();

      const header = within(screen.getByRole("table")).getAllByRole("row")[0];
      // 0번은 전체 선택 체크박스 셀 — 텍스트가 없다
      expect(
        within(header)
          .getAllByRole("columnheader")
          .map((cell) => cell.textContent),
      ).toEqual(["", "배너 제목", "노출 순서", "상태", "노출 기간", "등록일"]);
    });

    it("종료일이 없는 배너의 노출 기간은 '상시'로 그린다", () => {
      renderPage();

      // BN-2026-0005 는 endAt 이 빈 문자열이다
      expect(screen.getByText("2026.08.10 ~ 상시")).toBeVisible();
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

  describe("행 선택", () => {
    it("행을 고르면 선택 건수가 함께 표시된다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "여름 정기 세일 안내 선택" }),
      );

      expect(screen.getByText("1건 선택")).toBeVisible();
    });

    it("전체 선택은 현재 페이지의 행만 고른다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));

      // 6건 중 1페이지에 보이는 4건만 — 보이지 않는 행이 조용히 선택되면 위험하다
      expect(screen.getByText("4건 선택")).toBeVisible();
    });

    it("체크박스 클릭은 행 클릭(수정 모달)을 열지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "여름 정기 세일 안내 선택" }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("선택 삭제", () => {
    it("아무것도 고르지 않고 누르면 안내 토스트만 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const toast = await screen.findByText("선택된 배너가 없습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("고른 배너를 지우면 목록에서 사라진다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "여름 정기 세일 안내 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText(/사용자 홈에서도 즉시 내려갑니다/),
      ).toBeVisible();
      // 위험 안내는 "즉시 내려간다"와 분리해 따로 세운다 (원본 대조)
      expect(
        within(dialog).getByText("삭제 후에는 되돌릴 수 없습니다."),
      ).toBeVisible();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
      expect(visibleTitles()).not.toContain("여름 정기 세일 안내");
      expect(screen.getByText("목록 (총 5건)")).toBeVisible();
    });

    it("2건 이상이면 제목과 토스트에 건수가 함께 붙는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", { name: "여름 정기 세일 안내 선택" }),
      );
      await user.click(
        screen.getByRole("checkbox", { name: "신생아 렌트 첫 달 무료 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      // 1건이면 `배너 삭제`, 2건 이상이면 `배너 삭제 (N건)` — 원본 규칙
      expect(
        within(dialog).getByRole("heading", { name: "배너 삭제 (2건)" }),
      ).toBeVisible();

      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
      expect(screen.getByText("목록 (총 4건)")).toBeVisible();
    });
  });

  describe("삭제 취소 · 부분 실패", () => {
    it("1건만 고르면 모달 제목에 건수가 붙지 않고 그 배너 제목이 남는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: "성장단계별 추천 상품 모음 선택",
        }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "배너 삭제" }),
      ).toBeVisible();
      expect(
        within(dialog).getByText("성장단계별 추천 상품 모음"),
      ).toBeVisible();
    });

    it("'취소'는 아무것도 지우지 않는다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("checkbox", {
          name: "성장단계별 추천 상품 모음 선택",
        }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "취소" }),
      );

      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
    });

    it("삭제되지 않는 배너는 모달을 닫지 않고 재시도 안내를 남긴다", async () => {
      const { user } = renderPage();

      // DELETE_BLOCKED_IDS 에 든 배너 (BN-2026-0003)
      await user.click(
        screen.getByRole("checkbox", { name: "안심케어 가입 안내 선택" }),
      );
      await user.click(screen.getByRole("button", { name: "선택 삭제" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "삭제" }),
      );

      const toast = await screen.findByText("배너를 삭제하지 못했습니다.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      // 모달이 열린 채로 실패 이유 + 다음 행동을 남긴다 (원본: `삭제 실패 — …`)
      const alert = await within(await screen.findByRole("dialog")).findByRole(
        "alert",
      );
      expect(alert).toHaveTextContent("삭제 실패");
      expect(alert).toHaveTextContent("배너를 삭제하지 못했습니다.");
      expect(alert).toHaveTextContent("목록을 다시 확인한 뒤 재시도해 주세요.");
      // 행은 그대로 남아 있어야 한다
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
    });
  });

  describe("등록 모달", () => {
    it("제목 없이 저장하면 에러가 뜨고 등록되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "배너 등록" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      expect(
        await within(dialog).findByText("배너 제목을 입력해주세요."),
      ).toBeVisible();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("시작일을 고르지 않으면 저장되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "배너 등록" }));

      const dialog = await screen.findByRole("dialog");
      await user.type(
        within(dialog).getByRole("textbox", { name: /배너 제목/ }),
        "가을 렌트 프로모션",
      );
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      const toast = await screen.findByText("노출 시작일을 선택해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
    });
  });

  describe("수정 모달", () => {
    it("행을 클릭하면 그 배너 값이 채워진 수정 모달이 열린다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByRole("heading", { name: "배너 수정" }),
      ).toBeVisible();
      expect(
        within(dialog).getByRole("textbox", { name: /배너 제목/ }),
      ).toHaveValue("여름 정기 세일 안내");
    });

    it("제목을 고쳐 저장하면 목록에 반영된다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const dialog = await screen.findByRole("dialog");
      const titleInput = within(dialog).getByRole("textbox", {
        name: /배너 제목/,
      });
      await user.clear(titleInput);
      await user.type(titleInput, "여름 정기 세일 (연장)");
      await user.click(
        within(footerOf(dialog)).getByRole("button", { name: "저장" }),
      );

      expect(await screen.findByText("수정되었습니다.")).toBeVisible();
      expect(visibleTitles()).toContain("여름 정기 세일 (연장)");
      // 건수는 그대로 — 수정이 등록으로 새 나가면 여기서 걸린다
      expect(screen.getByText("목록 (총 6건)")).toBeVisible();
    });
  });
});
