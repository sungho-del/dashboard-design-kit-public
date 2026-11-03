import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SettingsPage } from "./SettingsPage";
import { FIELD_COPY, SAVED_SETTINGS } from "./SettingsPage.data";
import { SELLERS } from "./SellerListPage.data";

/**
 * 설정 — **동작** 테스트.
 *
 * 보는 것은 넷이다.
 *   1) **섹션 순서** — 원본은 `판매자 / 푸터정보` 가 먼저다
 *   2) 섹션 접기/펼치기와 **접었다 펴도 값이 남는가**
 *   3) 필수 표시가 실제로 `aria-required` 까지 가는가 (라벨의 `*` 는 aria-hidden 이다)
 *   4) 저장이 하단 바 하나에서 토스트를 띄우는가
 *
 * ⚠️ `원본에 없는 축` 묶음은 **걷어낸 것이 되살아나지 않는지** 보는 회귀 테스트다.
 * 원본 `SCREENS.settings` 에는 클라이언트 필수값 검증이 없다 — 그래서 필드 에러도,
 * "빠진 항목이 든 섹션 자동 펼침"도, 하단 바의 dirty 문구·버튼 잠금도 없다.
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
      <SettingsPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/settings"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 구획 머리 오른쪽 접기 버튼 — 이름이 「{제목} 접기|펼치기」 */
const sectionToggle = (title: string) =>
  screen.getByRole("button", { name: new RegExp(`^${title} (접기|펼치기)$`) });
/** 섹션 안내 문구는 `<b>` 로 끊겨 있어 문단 전체를 이어 붙여 본다 */
const guideText = () =>
  Array.from(document.querySelectorAll("p"))
    .map((node) => node.textContent)
    .join("\n");
const field = (label: string) => screen.getByRole("textbox", { name: label });
const saveButton = () => screen.getByRole("button", { name: "저장" });

describe("SettingsPage", () => {
  describe("섹션", () => {
    it("판매자 섹션이 먼저 온다 (원본 순서)", () => {
      renderPage();

      const titles = screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);

      expect(titles).toEqual(["판매자 / 푸터정보", "고객 센터 정보"]);
    });

    it("두 섹션이 펼쳐진 채로 시작하고 각각의 안내 문구를 보여준다", () => {
      renderPage();

      expect(sectionToggle("고객 센터 정보")).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(sectionToggle("판매자 / 푸터정보")).toHaveAttribute(
        "aria-expanded",
        "true",
      );

      /*
        원본 문장 그대로 — `사용자 앱` 이라는 주어가 빠지면 맥락이 사라진다.
        노출 위치만 `<b>` 로 끊겨 있어 요소 하나로는 잡히지 않는다 → 문단 전체를 본다.
      */
      expect(guideText()).toContain(
        "사용자 앱 고객센터·주문 문의 안내에 노출됩니다.",
      );
      expect(guideText()).toContain(
        "사용자 앱 푸터의 사업자 정보로 노출됩니다.",
      );
    });

    it("필드 순서도 원본을 따른다", () => {
      renderPage();

      // 판매자 섹션이 먼저이므로 앞의 6개가 그 섹션 필드다
      expect(
        screen
          .getAllByRole("textbox")
          .map((input) => input.getAttribute("placeholder")),
      ).toEqual([
        FIELD_COPY.company.placeholder,
        FIELD_COPY.bizNumber.placeholder,
        FIELD_COPY.ceo.placeholder,
        FIELD_COPY.phone.placeholder,
        FIELD_COPY.roadAddress.placeholder,
        FIELD_COPY.detailAddress.placeholder,
        FIELD_COPY.centerPhone.placeholder,
        FIELD_COPY.workHours.placeholder,
        FIELD_COPY.lunchHours.placeholder,
      ]);
    });

    it("접으면 그 섹션의 필드가 사라지고 다른 섹션은 그대로다", async () => {
      const { user } = renderPage();

      await user.click(sectionToggle("고객 센터 정보"));

      expect(sectionToggle("고객 센터 정보")).toHaveAttribute(
        "aria-expanded",
        "false",
      );
      expect(
        screen.queryByRole("textbox", { name: "상담 전화 번호" }),
      ).not.toBeInTheDocument();
      // 다른 섹션까지 접히면 안 된다
      expect(field("회사명")).toBeVisible();
    });

    it("접었다 펴도 입력값이 남는다", async () => {
      const { user } = renderPage();

      await user.clear(field("업무 시간"));
      await user.type(field("업무 시간"), "평일 09:00 ~ 18:00");

      await user.click(sectionToggle("고객 센터 정보"));
      await user.click(sectionToggle("고객 센터 정보"));

      expect(field("업무 시간")).toHaveValue("평일 09:00 ~ 18:00");
    });

    it("접기 버튼 이름이 상태를 따라간다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("button", { name: "고객 센터 정보 접기" }),
      ).toBeVisible();
      await user.click(sectionToggle("고객 센터 정보"));
      expect(
        screen.getByRole("button", { name: "고객 센터 정보 펼치기" }),
      ).toBeVisible();
    });
  });

  describe("필드", () => {
    it("필수 항목만 aria-required 를 갖는다", () => {
      renderPage();

      // 라벨의 `*` 는 aria-hidden 이라 의미는 aria-required 가 전달한다
      expect(field("상담 전화 번호")).toHaveAttribute("aria-required", "true");
      expect(field("회사명")).toHaveAttribute("aria-required", "true");
      expect(field("사업자 등록 번호")).toHaveAttribute(
        "aria-required",
        "true",
      );
      // ⚠️ 업무 시간은 원본에서 **필수**다 — 선택으로 내리지 말 것
      expect(field("업무 시간")).toHaveAttribute("aria-required", "true");

      expect(field("점심 시간")).not.toHaveAttribute("aria-required");
      expect(field("상세 주소 · 우편번호")).not.toHaveAttribute(
        "aria-required",
      );
    });

    it("원본 저장값으로 열린다 — 대표자·주소·시간 접두어", () => {
      renderPage();

      expect(field("대표자명")).toHaveValue("BabyCube");
      expect(field("주소")).toHaveValue("서울특별시 강남구 테헤란로 501");
      expect(field("상세 주소 · 우편번호")).toHaveValue("12층 (06168)");
      expect(field("업무 시간")).toHaveValue(
        "운영시간. 평일 10:00 ~ 17:00 (주말·공휴일 휴무)",
      );
      expect(field("점심 시간")).toHaveValue("점심시간. 평일 13:00 ~ 14:00");
    });

    it("대표자·전화가 셀러 목록 본사 행과 같다", () => {
      const hq = SELLERS.find((seller) => seller.isHeadquarters);
      expect(hq?.ceo).toBe(SAVED_SETTINGS.ceo);
      expect(hq?.phone).toBe(SAVED_SETTINGS.phone);
    });

    it("사업자 등록 번호는 숫자 전용 키보드를 강제하지 않는다 (하이픈 포함 값)", () => {
      renderPage();

      expect(field("사업자 등록 번호")).not.toHaveAttribute("inputmode");
      expect(field("전화 번호")).toHaveAttribute("inputmode", "tel");
    });

    it("입력 폭 상한이 원본 px 그대로다", () => {
      renderPage();

      // 폭 클래스는 Input 래퍼에 붙는다 — 입력칸의 부모
      const widthOf = (label: string) => field(label).parentElement;
      expect(widthOf("회사명")).toHaveClass("max-w-70"); // 280
      expect(widthOf("사업자 등록 번호")).toHaveClass("max-w-60"); // 240
      expect(widthOf("대표자명")).toHaveClass("max-w-60");
      expect(widthOf("전화 번호")).toHaveClass("max-w-60");
      expect(widthOf("주소")).toHaveClass("max-w-105"); // 420
      expect(widthOf("상세 주소 · 우편번호")).toHaveClass("max-w-105");
      expect(widthOf("상담 전화 번호")).toHaveClass("max-w-60");
      expect(widthOf("업무 시간")).toHaveClass("max-w-130"); // 520
      expect(widthOf("점심 시간")).toHaveClass("max-w-130");
    });

    it("글자 수 제한이 원본 값 그대로 걸려 있다", () => {
      renderPage();

      expect(field("회사명")).toHaveAttribute("maxlength", "40");
      expect(field("사업자 등록 번호")).toHaveAttribute("maxlength", "20");
      expect(field("주소")).toHaveAttribute("maxlength", "80");
    });
  });

  describe("원본에 없는 축 — 되살아나지 않는지", () => {
    it("필수를 비우고 저장해도 막지 않는다 — 판정은 서버 몫이다", async () => {
      const { user } = renderPage();

      await user.clear(field("회사명"));
      await user.click(saveButton());

      expect(await screen.findByText("설정이 저장되었습니다.")).toBeVisible();
      // 지어낸 검증 문구가 화면에 없어야 한다
      expect(screen.queryByText(/입력해주세요/)).not.toBeInTheDocument();
      expect(field("회사명")).not.toHaveAttribute("aria-invalid");
      // `설정을 저장하지 못했습니다.` 는 서버 오류 문구다 — 검증에 쓰지 않는다
      expect(
        screen.queryByText("설정을 저장하지 못했습니다."),
      ).not.toBeInTheDocument();
    });

    it("하단 바에 dirty 문구·'저장 전' 배지가 없고 버튼이 잠기지 않는다", () => {
      renderPage();

      expect(saveButton()).toBeEnabled();
      expect(screen.queryByText("저장 전")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/저장하지 않은 변경|모든 변경이 저장/),
      ).not.toBeInTheDocument();
    });
  });

  describe("저장", () => {
    it("[저장]은 머리가 아니라 하단 바에 하나뿐이다 — 두 구획을 한 번에", () => {
      renderPage();

      expect(
        within(screen.getByRole("banner")).queryByRole("button", {
          name: "저장",
        }),
      ).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "저장" })).toHaveLength(1);
      // 마지막 입력칸보다 뒤(화면 아래)에 온다
      expect(
        field("점심 시간").compareDocumentPosition(saveButton()) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        screen.queryByRole("button", { name: /^(목록|취소)$/ }),
      ).not.toBeInTheDocument();
    });

    it("고친 값을 저장하면 토스트가 뜨고 입력은 그대로 남는다", async () => {
      const { user } = renderPage();

      await user.clear(field("상담 전화 번호"));
      await user.type(field("상담 전화 번호"), "02-1588-9999");
      await user.click(saveButton());

      expect(await screen.findByText("설정이 저장되었습니다.")).toBeVisible();
      expect(field("상담 전화 번호")).toHaveValue("02-1588-9999");
      expect(saveButton()).toBeEnabled();
    });
  });
});
