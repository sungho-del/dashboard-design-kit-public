import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ScriptSettingsPage } from "./ScriptSettingsPage";
import { SAVED_SCRIPTS, SCRIPT_FIELDS } from "./ScriptSettingsPage.data";

/**
 * S27 스크립트 관리 — **동작** 테스트.
 *
 * 렌더만 보면 세 필드가 서로 뒤바뀌어도 통과한다. 여기서는
 * **필드가 각자 독립적인가** · 각 자리의 안내(출력 위치 · 도움말 · placeholder)가
 * 제 짝에 붙어 있는가 · 저장이 토스트를 띄우는가를 본다.
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `/scripts` 에는 카드 제목도, `저장 전` 배지도, 하단 바 좌측 문구도,
 * 변경 없을 때의 버튼 잠금도 없다(`ScriptSettingsPage.tsx` 상단 주석).
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
      <ScriptSettingsPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/scripts"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

const headerBox = () => screen.getByRole("textbox", { name: "헤더 스크립트" });
const bodyBox = () => screen.getByRole("textbox", { name: "바디 스크립트" });
const footerBox = () => screen.getByRole("textbox", { name: "푸터 스크립트" });
const saveButton = () => screen.getByRole("button", { name: "변경 사항 저장" });

describe("ScriptSettingsPage", () => {
  describe("필드 구성", () => {
    it("삽입 위치 3곳을 위치 안내와 함께 보여준다", () => {
      renderPage();

      expect(screen.getByText("</head> 직전에 출력")).toBeVisible();
      expect(screen.getByText("<body> 직후에 출력")).toBeVisible();
      expect(screen.getByText("</body> 직전에 출력")).toBeVisible();
    });

    it("각 필드가 무엇을 넣는 자리인지 도움말로 알려준다", () => {
      renderPage();

      expect(
        screen.getByText(/구글 애즈 전환 태그, GA4, 메타 픽셀/),
      ).toBeVisible();
      expect(screen.getByText(/GTM의 noscript 태그처럼/)).toBeVisible();
      // ⚠️ 푸터의 도움말은 "채팅 위젯…"이 아니다 — 그건 placeholder 다
      expect(screen.getByText(/페이지 렌더링이 끝난 뒤/)).toBeVisible();
    });

    it("placeholder 는 실제로 붙여 넣을 코드 모양을 그대로 보여준다", () => {
      renderPage();

      // "예) …" 로 줄이면 어느 형태가 들어가는지 알 수 없다 (원본 대조)
      expect(headerBox()).toHaveAttribute(
        "placeholder",
        SCRIPT_FIELDS.header.placeholder,
      );
      expect(headerBox()).toHaveAttribute(
        "placeholder",
        expect.stringContaining("<!-- Google tag (gtag.js) -->"),
      );
      expect(bodyBox()).toHaveAttribute(
        "placeholder",
        expect.stringContaining("<noscript>"),
      );
      expect(footerBox()).toHaveAttribute(
        "placeholder",
        "채팅 위젯, 지연 로딩 스크립트 등",
      );
    });

    it("저장돼 있던 값이 채워진 채로 열린다", () => {
      renderPage();

      expect(headerBox()).toHaveValue(SAVED_SCRIPTS.header);
      // 바디는 비어 있는 것이 정상이다 — "아무 코드도 넣지 않기로 한 상태"
      expect(bodyBox()).toHaveValue("");
      expect(footerBox()).toHaveValue(SAVED_SCRIPTS.footer);
    });

    it("한 필드에 입력해도 다른 필드는 그대로다", async () => {
      const { user } = renderPage();

      await user.type(bodyBox(), "<noscript>gtm</noscript>");

      expect(bodyBox()).toHaveValue("<noscript>gtm</noscript>");
      expect(headerBox()).toHaveValue(SAVED_SCRIPTS.header);
      expect(footerBox()).toHaveValue(SAVED_SCRIPTS.footer);
    });
  });

  describe("원본에 없는 축 — 되살아나지 않는지", () => {
    it("카드 제목도 '저장 전' 배지도 하단 바 문구도 없다", () => {
      renderPage();

      expect(screen.queryByText("스크립트 삽입")).not.toBeInTheDocument();
      expect(screen.queryByText("저장 전")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/저장하지 않은 변경|모든 변경이 저장/),
      ).not.toBeInTheDocument();
    });

    it("변경이 없어도 저장 버튼은 잠기지 않는다", () => {
      renderPage();

      expect(saveButton()).toBeEnabled();
    });
  });

  describe("저장", () => {
    it("저장하면 토스트를 띄우고 입력은 그대로 남는다", async () => {
      const { user } = renderPage();

      await user.type(bodyBox(), "<noscript>gtm</noscript>");
      await user.click(saveButton());

      expect(await screen.findByText("저장되었습니다.")).toBeVisible();
      expect(bodyBox()).toHaveValue("<noscript>gtm</noscript>");
      // 저장 뒤에도 계속 고칠 수 있어야 한다
      expect(saveButton()).toBeEnabled();
    });
  });
});
