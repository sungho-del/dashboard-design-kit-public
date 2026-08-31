import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { TermsAdminPage } from "./TermsAdminPage";
import { ymd } from "./TermsAdminPage.data";

/**
 * S26 약관 관리 — **동작** 테스트.
 *
 * 이 화면은 좌(선택) · 우(편집) 두 카드가 **같은 축**을 공유한다. 그래서
 * "고른 문서와 편집기 내용이 어긋나지 않는가"가 가장 중요한 검증이다.
 * 그 밖에 저장 버튼 라벨(`등록`/`수정 저장`)과 토스트 문구, 빈 상태를 본다.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/terms-admin` 에는 문서 선택 Select 도, 되돌리기도, "편집 중" 배지도 없다.
 *
 * 빈 상태는 데이터가 0건일 때만 나오는데 이 화면에는 문서를 지우는 기능이 없다.
 * 그래서 **데이터 모듈만 갈아끼워** 그 분기를 확인한다(`state.override`).
 */
const state = vi.hoisted(() => ({ override: null as unknown }));

vi.mock("./TermsAdminPage.data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./TermsAdminPage.data")>();
  return {
    ...actual,
    get TERMS() {
      return state.override ?? actual.TERMS;
    },
  };
});

afterEach(() => {
  state.override = null;
});

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
      <TermsAdminPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/terms-admin"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 좌측 목록 — GNB 에도 `<ul>` 이 있어 이름으로 콕 집는다 */
function docList(): HTMLElement {
  return screen.getByRole("list", { name: "약관 문서 목록" });
}

function docItem(name: string): HTMLElement {
  return within(docList()).getByRole("button", { name: new RegExp(name) });
}

/** 본문 편집기 */
function editor(): HTMLElement {
  return screen.getByRole("textbox", { name: /약관 내용/ });
}

/**
 * 편집기의 현재 값.
 * `toHaveValue(expect.stringContaining(...))` 는 동작하지 않는다 —
 * jest-dom 이 값을 그대로 비교하지 비대칭 매처를 풀어주지 않기 때문이다.
 */
function editorValue(): string {
  return (editor() as HTMLTextAreaElement).value;
}

describe("TermsAdminPage", () => {
  describe("좌측 목록", () => {
    it("문서 5종과 개수를 보여준다", () => {
      renderPage();

      // 원본 헤더는 `약관 목록 N종` — "총"이 붙지 않는다
      expect(screen.getByText("5종")).toBeVisible();
      expect(within(docList()).getAllByRole("button")).toHaveLength(5);
      // `^` 로 첫 문서를 콕 집는다 — "렌트·반납 이용약관"·"전자금융거래 이용약관"도
      // "이용약관"을 품고 있어 앵커가 없으면 셋이 걸린다
      expect(docItem("^이용약관")).toBeVisible();
      expect(docItem("마케팅 정보 수신 동의")).toBeVisible();
    });

    it("첫 문서가 선택된 채로 시작한다", () => {
      renderPage();

      expect(docItem("^이용약관")).toHaveAttribute("aria-current", "true");
      expect(editorValue()).toContain("제1조(목적)");
    });

    it("필수 문서에만 배지가 붙고, 본문이 비면 '미작성'을 적는다", () => {
      renderPage();

      const blank = docItem("전자금융거래 이용약관");
      expect(within(blank).getByText("필수")).toBeVisible();
      expect(within(blank).getByText("미작성")).toBeVisible();

      // 선택 문서에는 좌측에서 배지를 붙이지 않는다 (원본 구조)
      const optional = docItem("마케팅 정보 수신 동의");
      expect(within(optional).queryByText("선택")).not.toBeInTheDocument();
      expect(within(optional).getByText("미작성")).toBeVisible();

      const written = docItem("렌트·반납 이용약관");
      expect(within(written).queryByText("미작성")).not.toBeInTheDocument();
    });
  });

  describe("우측 편집 카드 헤더", () => {
    it("고정 제목이 아니라 고른 문서의 이름과 최종 수정일을 든다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("heading", { name: /이용약관/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("최종 수정 2026-07-14")).toBeVisible();

      await user.click(docItem("렌트·반납 이용약관"));

      expect(screen.getByText("최종 수정 2026-08-01")).toBeVisible();
    });

    it("한 번도 저장한 적 없으면 최종 수정일 자리에 '미작성'이 온다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));

      // 좌측 항목과 우측 헤더 두 곳에 뜬다
      expect(screen.getAllByText("미작성").length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("원본에 없는 축 — 되살아나지 않는지", () => {
    it("문서 선택 Select 가 없다 — 같은 축의 컨트롤은 좌측 목록 하나뿐이다", () => {
      renderPage();

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    });

    it("'되돌리기' 버튼과 '편집 중' 배지가 없다", async () => {
      const { user } = renderPage();

      await user.type(editor(), " (검토 중)");

      expect(
        screen.queryByRole("button", { name: "되돌리기" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("편집 중")).not.toBeInTheDocument();
    });
  });

  describe("문서 전환", () => {
    it("좌측 항목을 누르면 편집기 내용이 그 문서로 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(docItem("렌트·반납 이용약관"));

      expect(docItem("렌트·반납 이용약관")).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(docItem("^이용약관")).not.toHaveAttribute("aria-current");
      expect(editorValue()).toContain("수거 신청");
    });

    it("미작성 문서를 고르면 편집기가 비고 placeholder 에 문서 이름이 들어간다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));

      expect(editor()).toHaveValue("");
      expect(editor()).toHaveAttribute(
        "placeholder",
        "전자금융거래 이용약관 내용을 입력하세요.",
      );
    });

    it("저장하지 않고 다른 문서로 옮기면 고친 내용은 남지 않는다", async () => {
      const { user } = renderPage();

      await user.type(editor(), " (검토 중)");
      await user.click(docItem("렌트·반납 이용약관"));
      await user.click(docItem("^이용약관"));

      expect(editorValue()).not.toContain("(검토 중)");
    });
  });

  describe("저장", () => {
    it("본문이 비어 있으면 저장되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));
      // 본문이 없는 문서라 버튼은 `등록` 이다
      await user.click(screen.getByRole("button", { name: "등록" }));

      const toast = await screen.findByText("약관 내용을 입력해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
      // 미작성 표시가 그대로 남아야 한다 — 저장이 새 나가면 여기서 걸린다
      expect(
        within(docItem("전자금융거래 이용약관")).getByText("미작성"),
      ).toBeVisible();
    });

    it("미작성 문서에 처음 쓰면 '등록', 토스트도 등록이다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));
      await user.type(
        editor(),
        "제1조(목적) 전자금융거래의 기본 사항을 정한다.",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(await screen.findByText("약관이 등록되었습니다.")).toBeVisible();

      const item = docItem("전자금융거래 이용약관");
      expect(within(item).queryByText("미작성")).not.toBeInTheDocument();
      expect(screen.getByText(`최종 수정 ${ymd()}`)).toBeVisible();
      // 본문이 생겼으니 버튼 라벨도 바뀐다
      expect(
        screen.getByRole("button", { name: "수정 저장" }),
      ).toBeInTheDocument();
    });

    it("본문이 있던 문서를 고치면 '수정 저장', 토스트도 수정이다", async () => {
      const { user } = renderPage();

      await user.type(editor(), " (개정)");
      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(await screen.findByText("약관이 수정되었습니다.")).toBeVisible();
      expect(editorValue()).toContain("(개정)");
    });

    it("저장한 내용은 다른 문서를 다녀와도 남아 있다", async () => {
      const { user } = renderPage();

      await user.click(docItem("마케팅 정보 수신 동의"));
      await user.type(editor(), "광고성 정보 수신에 동의합니다.");
      await user.click(screen.getByRole("button", { name: "등록" }));
      await screen.findByText("약관이 등록되었습니다.");

      await user.click(docItem("^이용약관"));
      await user.click(docItem("마케팅 정보 수신 동의"));

      expect(editor()).toHaveValue("광고성 정보 수신에 동의합니다.");
    });
  });

  describe("빈 상태", () => {
    it("문서가 하나도 없으면 편집 카드가 두 줄로 사유를 밝힌다", () => {
      state.override = [];
      renderPage();

      expect(screen.getByText("등록된 약관이 없습니다")).toBeVisible();
      expect(
        screen.getByText("약관 문서가 하나도 없어 편집할 대상이 없습니다."),
      ).toBeVisible();
      // 편집할 대상이 없으므로 편집기와 저장 버튼도 없어야 한다
      expect(
        screen.queryByRole("textbox", { name: /약관 내용/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /저장|등록/ }),
      ).not.toBeInTheDocument();
    });
  });
});
