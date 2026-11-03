import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { TermsAdminPage } from "./TermsAdminPage";

/**
 * S26 약관 관리 — **동작** 테스트.
 *
 * 이 화면은 좌(선택) · 우(편집) 두 카드가 **같은 축**을 공유한다. 그래서
 * "고른 문서와 편집기 내용이 어긋나지 않는가"가 가장 중요한 검증이다.
 * 그 밖에 저장 버튼 라벨(`등록`/`수정 저장`)과 토스트 문구, 빈 상태를 본다.
 * ⚠️ 저장은 **알림만** — 저장본·미작성·최종 수정일이 바뀌지 않는지 본다.
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

/** 원본 12종 순서 */
const ORIGINAL_NAMES = [
  "서비스 이용약관",
  "개인정보 처리방침",
  "전자금융거래 이용약관",
  "통신판매중개 이용약관",
  "입점 판매자 이용약관",
  "렌탈(대여) 이용약관",
  "청약철회·취소·반품·교환 규정",
  "개인정보 제3자 제공 동의",
  "안전·위생·KC 인증 고지",
  "안심케어 이용약관",
  "마케팅 정보 수신 동의",
  "청소년 보호정책",
];

describe("TermsAdminPage", () => {
  describe("좌측 목록", () => {
    it("원본 12종을 원본 순서로 보여주고 건수는 제목 옆이다", () => {
      renderPage();

      // 원본 헤더는 `약관 목록 N종` — "총"이 붙지 않는다
      const count = screen.getByText("12종");
      expect(count).toBeVisible();
      expect(count.previousElementSibling).toHaveTextContent("약관 목록");

      const names = within(docList())
        .getAllByRole("button")
        .map((item) => item.firstElementChild?.textContent);
      expect(names).toEqual(ORIGINAL_NAMES);
    });

    it("첫 문서가 선택된 채로 시작하고, 선택 항목만 굵다", () => {
      renderPage();

      const first = docItem("서비스 이용약관");
      expect(first).toHaveAttribute("aria-current", "true");
      expect(first.firstElementChild).toHaveClass("label-medium-bold");
      expect(docItem("개인정보 처리방침").firstElementChild).toHaveClass(
        "label-medium",
      );
      expect(editorValue()).toContain("제1조 (목적)");
    });

    it("필수 8 · 미작성 4 — 미작성은 경고색, 선택 문서엔 배지가 없다", () => {
      renderPage();

      expect(within(docList()).getAllByText("필수")).toHaveLength(8);
      const blanks = within(docList()).getAllByText("미작성");
      expect(blanks).toHaveLength(4);
      blanks.forEach((blank) => expect(blank).toHaveClass("text-text-warning"));

      const blank = docItem("전자금융거래 이용약관");
      expect(within(blank).getByText("필수")).toBeVisible();
      expect(within(blank).getByText("미작성")).toBeVisible();

      const optional = docItem("마케팅 정보 수신 동의");
      expect(within(optional).queryByText("선택")).not.toBeInTheDocument();
      expect(within(optional).queryByText("필수")).not.toBeInTheDocument();

      const written = docItem("렌탈\\(대여\\) 이용약관");
      expect(within(written).queryByText("미작성")).not.toBeInTheDocument();
    });
  });

  describe("우측 편집 카드 헤더", () => {
    it("고른 문서의 이름과 최종 수정일(점 표기)을 든다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("heading", { name: /서비스 이용약관/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("최종 수정 2026.06.20")).toBeVisible();

      await user.click(docItem("렌탈\\(대여\\) 이용약관"));

      expect(screen.getByText("최종 수정 2026.06.22")).toBeVisible();
    });

    it("한 번도 저장한 적 없으면 최종 수정일 자리에 경고색 '미작성'이 온다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));

      const blanks = screen.getAllByText("미작성");
      const header = blanks.find((blank) => !docList().contains(blank));
      expect(header).toHaveClass("text-text-warning");
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

      await user.click(docItem("렌탈\\(대여\\) 이용약관"));

      expect(docItem("렌탈\\(대여\\) 이용약관")).toHaveAttribute(
        "aria-current",
        "true",
      );
      expect(docItem("서비스 이용약관")).not.toHaveAttribute("aria-current");
      // 원본 연체 정책 — 회사가 자동 산정하지 않는다
      expect(editorValue()).toContain("연체료는 회사가 자동 산정하지 않으며");
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
      await user.click(docItem("렌탈\\(대여\\) 이용약관"));
      await user.click(docItem("서비스 이용약관"));

      expect(editorValue()).not.toContain("(검토 중)");
    });
  });

  describe("저장 — 알림만", () => {
    it("본문이 비어 있으면 저장되지 않는다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));
      // 본문이 없는 문서라 버튼은 `등록` 이다
      await user.click(screen.getByRole("button", { name: "등록" }));

      const toast = await screen.findByText("약관 내용을 입력해주세요.");
      expect(toast).toHaveAttribute("data-tone", "critical");
    });

    it("미작성 문서에 쓰고 '등록' — 등록 알림만 뜨고 미작성·버튼 라벨은 그대로다", async () => {
      const { user } = renderPage();

      await user.click(docItem("전자금융거래 이용약관"));
      await user.type(editor(), "제1조 (목적) 전자금융거래의 기본 사항.");
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(await screen.findByText("약관이 등록되었습니다.")).toBeVisible();
      expect(
        within(docItem("전자금융거래 이용약관")).getByText("미작성"),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "등록" })).toBeInTheDocument();
      // 초안은 이 문서에 머무는 동안 남는다
      expect(editorValue()).toContain("전자금융거래의 기본 사항");
    });

    it("본문이 있던 문서를 고치면 '수정 저장' — 수정 알림 · 최종 수정일 불변", async () => {
      const { user } = renderPage();

      await user.type(editor(), " (개정)");
      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(await screen.findByText("약관이 수정되었습니다.")).toBeVisible();
      expect(screen.getByText("최종 수정 2026.06.20")).toBeVisible();
    });

    it("저장 후 다른 문서를 다녀오면 저장본(원본)으로 돌아온다", async () => {
      const { user } = renderPage();

      await user.click(docItem("마케팅 정보 수신 동의"));
      await user.type(editor(), "광고성 정보 수신에 동의합니다.");
      await user.click(screen.getByRole("button", { name: "등록" }));
      await screen.findByText("약관이 등록되었습니다.");

      await user.click(docItem("서비스 이용약관"));
      await user.click(docItem("마케팅 정보 수신 동의"));

      expect(editor()).toHaveValue("");
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
