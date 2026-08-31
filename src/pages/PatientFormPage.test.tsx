import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { PatientFormPage } from "./PatientFormPage";

/* -------------------------------------------------------------------------
 * 환자 등록 (S04) — 폼형 (§29)
 *
 * 이 페이지가 실제로 책임지는 것은 **연결과 분기**다 —
 * 라벨↔컨트롤 연결(FormField), 검증 메시지의 등장·소멸, 조건부 필드, 제출 게이트.
 * 그래서 테스트도 마크업이 아니라 그 네 가지에 집중한다.
 *
 * `useToast()` 를 쓰므로 **`ToastProvider` 로 감싸야** 렌더된다.
 * (Provider 밖에서 부르면 useToast 가 곧바로 throw 한다)
 *
 * DatePicker 를 열려면 floating-ui 가 쓰는 `ResizeObserver`/`IntersectionObserver` 가
 * 필요하다 — jsdom 에 없으므로 no-op 으로 채운다. **좌표는 검증하지 않는다.**
 * ---------------------------------------------------------------------- */
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
    <ToastProvider>
      <PatientFormPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="patient-new"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 생년월일 달력을 열어 **선택 가능한 첫 날짜**를 고른다 (오늘 기준 달이라 날짜명을 못 박지 않는다) */
async function pickBirthDate(user: ReturnType<typeof userEvent.setup>) {
  // 트리거는 FormField 의 `<label for>` 로 이름이 붙는다 (placeholder 가 아니라 라벨)
  await user.click(screen.getByRole("button", { name: "생년월일" }));
  const panel = await screen.findByRole("dialog");
  const day = within(panel)
    .getAllByRole("button", { name: /\d+년 \d+월 \d+일/ })
    .find((button) => !(button as HTMLButtonElement).disabled) as HTMLElement;
  await user.click(day);
}

/** 필수 항목을 모두 채운다. 보험은 '비급여'라 증번호 필드가 붙지 않는다 */
async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "환자명" }), "최유나");
  await pickBirthDate(user);
  await user.click(screen.getByRole("radio", { name: "여" }));
  await user.type(
    screen.getByRole("textbox", { name: "휴대전화" }),
    "01033178064",
  );
  await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
  await user.click(await screen.findByRole("option", { name: "비급여" }));
}

describe("PatientFormPage", () => {
  it("카드 5개를 기획서 sections 그대로 그린다", () => {
    renderPage();

    for (const title of [
      "기본 정보",
      "연락처",
      "보험 정보",
      "진료 동의",
      "메모",
    ]) {
      expect(
        screen.getByRole("heading", { name: title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  /**
   * FormField 는 id 를 손으로 넘기지 않아도 라벨과 컨트롤을 이어 준다.
   * `required` 필드는 라벨 textContent 가 `"환자명 *"` 이라 **exact 매치가 실패한다** —
   * 접근성 이름(`*` 는 aria-hidden)과 라벨 텍스트가 다르다는 사실 자체가 §29-7 의 계약이다.
   */
  describe("FormField 자동 id 연결", () => {
    it("required 필드도 라벨로 찾히고, 접근성 이름에는 * 가 섞이지 않는다", () => {
      renderPage();

      const name = screen.getByLabelText(/^환자명/);
      expect(name).toBe(screen.getByRole("textbox", { name: "환자명" }));
      expect(name).toHaveAccessibleName("환자명");
      expect(name).toHaveAttribute("aria-required", "true");
    });

    it("required 가 아닌 필드는 라벨 텍스트 그대로 찾힌다", () => {
      renderPage();

      for (const label of [
        "환자번호",
        "보호자 연락처",
        "주소",
        "특이사항",
        "내부 메모",
      ]) {
        expect(screen.getByLabelText(label)).toHaveAccessibleName(label);
      }
    });

    it("Select 트리거(combobox)에도 라벨이 이어진다", () => {
      renderPage();

      expect(screen.getByLabelText(/^보험 유형/)).toBe(
        screen.getByRole("combobox", { name: "보험 유형" }),
      );
    });
  });

  /**
   * `<label for>` 는 labelable 요소만 가리킨다. `RadioGroup`·`SegmentedControl` 의
   * 루트는 `<div role="radiogroup">` 이라 **`group` 을 빠뜨리면 이름이 아예 안 붙는다.**
   */
  describe("group — 그룹 컨트롤 라벨 연결", () => {
    it("SegmentedControl(환자 구분)에 접근가능 이름이 붙는다", () => {
      renderPage();

      expect(
        screen.getByRole("radiogroup", { name: "환자 구분" }),
      ).toBeInTheDocument();
      // 초기값 'new' 가 PATIENT_TYPES 안에 있어야 활성 항목이 생긴다
      expect(screen.getByRole("radio", { name: "신규" })).toBeChecked();
    });

    it("RadioGroup(성별)에 접근가능 이름이 붙는다", () => {
      renderPage();

      expect(
        screen.getByRole("radiogroup", { name: "성별" }),
      ).toBeInTheDocument();
    });
  });

  /**
   * §3-4 규칙 6 — `Switch`·`Checkbox` 는 `FormField` 로 감싸지 않고 자체 label 을 쓴다.
   * 감싸면 라벨이 둘이 되거나 세로 라벨과 옆 라벨이 겹친다.
   */
  describe("Switch·Checkbox 는 자체 label 을 쓴다", () => {
    it("Switch 가 자기 라벨과 설명을 갖는다", () => {
      renderPage();

      const sms = screen.getByRole("switch", { name: "예약 안내 문자 수신" });
      expect(sms).toBeChecked();
      expect(sms).toHaveAccessibleDescription(
        "예약 확정·전날 리마인드 문자를 보냅니다",
      );
    });

    it("동의 Checkbox 3개가 각자 라벨과 설명을 갖고 모두 꺼진 채로 시작한다", () => {
      renderPage();

      for (const label of [
        "개인정보 수집·이용 동의 (필수)",
        "민감정보(진료기록) 처리 동의 (필수)",
        "진료 목적 외 활용 동의 (선택)",
      ]) {
        expect(screen.getByRole("checkbox", { name: label })).not.toBeChecked();
      }
      expect(
        screen.getByRole("checkbox", { name: "진료 목적 외 활용 동의 (선택)" }),
      ).toHaveAccessibleDescription("동의하지 않아도 진료를 받을 수 있습니다");
    });
  });

  /** §29-5 — 에러가 뜨면 그 자리의 도움말은 사라진다(둘을 동시에 띄우지 않는다) */
  describe("필수 검증", () => {
    it("환자명을 비운 채 blur 하면 에러가 도움말을 대체한다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByText("신분증에 적힌 이름과 동일하게 입력합니다"),
      ).toBeVisible();

      await user.click(screen.getByRole("textbox", { name: "환자명" }));
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent(
        "환자명을 입력해 주세요",
      );
      // 같은 자리에 두 메시지가 겹치면 레이아웃이 밀리고 시선이 흩어진다
      expect(
        screen.queryByText("신분증에 적힌 이름과 동일하게 입력합니다"),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: "환자명" })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
    });

    it("환자명을 채워 넣으면 에러가 사라지고 도움말이 돌아온다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("textbox", { name: "환자명" }));
      await user.tab();
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);

      await user.type(
        screen.getByRole("textbox", { name: "환자명" }),
        "최유나",
      );

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(
        screen.getByText("신분증에 적힌 이름과 동일하게 입력합니다"),
      ).toBeVisible();
    });

    it("등록을 누르면 blur 가 없는 컨트롤(생년월일·성별)에도 에러가 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "등록" }));

      const alerts = screen.getAllByRole("alert").map((a) => a.textContent);
      expect(alerts).toContain("생년월일을 선택해 주세요");
      expect(alerts).toContain("성별을 선택해 주세요");
      expect(alerts).toContain("환자명을 입력해 주세요");
    });
  });

  describe("휴대전화 표시 포맷", () => {
    it("숫자만 입력해도 하이픈이 붙는다", async () => {
      const { user } = renderPage();

      await user.type(
        screen.getByRole("textbox", { name: "휴대전화" }),
        "01033178064",
      );

      expect(screen.getByRole("textbox", { name: "휴대전화" })).toHaveValue(
        "010-3317-8064",
      );
    });

    it("문자를 섞어도 숫자만 남기고 11자리를 넘기지 않는다", async () => {
      const { user } = renderPage();

      await user.type(
        screen.getByRole("textbox", { name: "보호자 연락처" }),
        "010abc33178065999",
      );

      expect(
        screen.getByRole("textbox", { name: "보호자 연락처" }),
      ).toHaveValue("010-3317-8065");
    });

    it("자릿수가 모자라면 blur 에서 에러가 뜬다", async () => {
      const { user } = renderPage();

      await user.type(
        screen.getByRole("textbox", { name: "휴대전화" }),
        "0103",
      );
      await user.tab();

      expect(
        screen.getByText("휴대전화 번호를 자릿수에 맞게 입력해 주세요"),
      ).toBeVisible();
    });
  });

  /** 비급여 환자는 보험 증번호가 존재하지 않는다 — 필드를 통째로 붙였다 뗀다 */
  describe("증번호 조건부 표시", () => {
    it("보험 유형을 고르기 전에는 증번호 필드가 없다", () => {
      renderPage();

      expect(
        screen.queryByRole("textbox", { name: "증번호" }),
      ).not.toBeInTheDocument();
    });

    it("건강보험을 고르면 증번호가 필수 필드로 나타난다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
      await user.click(await screen.findByRole("option", { name: "건강보험" }));

      const no = screen.getByRole("textbox", { name: "증번호" });
      expect(no).toBeVisible();
      expect(no).toHaveAttribute("aria-required", "true");
      // 건강보험에는 의료급여 전용 도움말이 붙지 않는다
      expect(no).not.toHaveAccessibleDescription();
    });

    it("의료급여를 고르면 종별 안내 도움말이 함께 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
      await user.click(await screen.findByRole("option", { name: "의료급여" }));

      expect(
        screen.getByRole("textbox", { name: "증번호" }),
      ).toHaveAccessibleDescription("의료급여는 종별(1종·2종)을 함께 적습니다");
    });

    it("비급여를 고르면 증번호 필드가 사라진다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
      await user.click(await screen.findByRole("option", { name: "건강보험" }));
      expect(screen.getByRole("textbox", { name: "증번호" })).toBeVisible();

      await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
      await user.click(await screen.findByRole("option", { name: "비급여" }));

      expect(
        screen.queryByRole("textbox", { name: "증번호" }),
      ).not.toBeInTheDocument();
    });

    it("건강보험인데 증번호가 비어 있으면 등록 시 에러가 붙는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "보험 유형" }));
      await user.click(await screen.findByRole("option", { name: "건강보험" }));
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(
        screen.getByText("선택한 보험 유형에는 증번호가 필요합니다"),
      ).toBeVisible();
    });
  });

  /**
   * 제출 게이트는 두 단계다 — 필수 항목이 먼저, 그다음 동의.
   * 동의는 체크박스 옆에 빨간 글씨를 상주시키지 않고 버튼을 누르는 순간에만 본다.
   */
  describe("등록 제출 게이트", () => {
    it("필수 항목이 비어 있으면 critical 토스트로 막는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "등록" }));

      const toast = await screen.findByText(
        "입력하지 않은 필수 항목이 있습니다",
      );
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByText("환자를 등록했습니다")).not.toBeInTheDocument();
    });

    it("필수 항목을 다 채워도 필수 동의가 없으면 막힌다", async () => {
      const { user } = renderPage();

      await fillRequired(user);
      await user.click(screen.getByRole("button", { name: "등록" }));

      const toast = await screen.findByText(
        "필수 동의 두 건에 모두 동의해야 등록할 수 있습니다",
      );
      expect(toast).toHaveAttribute("data-tone", "critical");
    });

    it("필수 동의 한 건만 체크해도 여전히 막힌다", async () => {
      const { user } = renderPage();

      await fillRequired(user);
      await user.click(
        screen.getByRole("checkbox", {
          name: "개인정보 수집·이용 동의 (필수)",
        }),
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(
        await screen.findByText(
          "필수 동의 두 건에 모두 동의해야 등록할 수 있습니다",
        ),
      ).toBeVisible();
    });

    it("필수 항목과 필수 동의 두 건이 모두 채워지면 등록된다", async () => {
      const { user } = renderPage();

      await fillRequired(user);
      await user.click(
        screen.getByRole("checkbox", {
          name: "개인정보 수집·이용 동의 (필수)",
        }),
      );
      await user.click(
        screen.getByRole("checkbox", {
          name: "민감정보(진료기록) 처리 동의 (필수)",
        }),
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(await screen.findByText("환자를 등록했습니다")).toBeVisible();
      // 선택 동의는 체크하지 않아도 등록을 막지 않는다
      expect(
        screen.getByRole("checkbox", { name: "진료 목적 외 활용 동의 (선택)" }),
      ).not.toBeChecked();
    });
  });

  describe("상단 액션", () => {
    it("임시저장은 검증 없이 토스트만 띄운다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "임시저장" }));

      expect(await screen.findByText("임시저장했습니다")).toBeVisible();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("뒤로가기는 예약 목록으로 되돌린다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "뒤로 가기" }));

      expect(onNavSelect).toHaveBeenCalledWith("reservation-list");
    });
  });
});
