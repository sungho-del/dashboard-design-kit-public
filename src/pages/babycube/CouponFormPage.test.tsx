import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { CouponFormPage } from "./CouponFormPage";
import {
  countCodes,
  draftOf,
  methodLockMessage,
  needsReplaceConfirm,
  validateHqCoupon,
} from "./CouponFormPage.data";

/* -------------------------------------------------------------------------
 * 본사 쿠폰 등록 · 수정 — 추가 기획 보드 06·07 · 개발 70a3e88 · 69ab2f3 · 495c8f5 · 3a2df9e
 *
 * 렌더 여부가 아니라 **동작**을 본다: 신규 처음 값 · 발급 방식마다 사용 기간 칸 · 칸 아래 검사 문구(개발 그대로) ·
 * 가입 쿠폰 교체 확인(다른 가입 쿠폰이 사용 중일 때만 · 취소 = 저장 안 함) · 발급 방식 잠금 2종 ·
 * 번호 파일(새 쿠폰 안내 · 저장 안내 · 올리기 → 알림 + 번호 수) · 수정 값 채움 · 저장 알림·이동 · 찾을 수 없음.
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <CouponFormPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/promo"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const radio = (name: string) => screen.getByRole("radio", { name });
const textbox = (name: RegExp | string) =>
  screen.getByRole("textbox", { name });
const save = (label = "쿠폰 등록") =>
  screen.getByRole("button", { name: label });

/** 쿠폰명 · 할인율만 채운 신규 폼 */
async function fillBasics(user: ReturnType<typeof userEvent.setup>) {
  await user.type(textbox(/쿠폰명/), "본사 테스트 쿠폰");
  await user.type(textbox(/할인율/), "10");
}

describe("CouponFormPage (본사 쿠폰 등록·수정)", () => {
  describe("신규 — /promo/new", () => {
    it("제목 「쿠폰 등록」 · 셀러 폼 4구역 · 처음 값 = 다운로드·정률·전체·중복 가능·사용", () => {
      renderAt("/promo/new");

      expect(
        screen.getByRole("heading", { level: 1, name: "쿠폰 등록" }),
      ).toBeVisible();
      expect(
        screen
          .getAllByRole("button", { name: / 접기$/ })
          .filter((button) => button.getAttribute("aria-label") !== "메뉴 접기")
          .map((button) => button.getAttribute("aria-label")),
      ).toEqual([
        "기본 정보 접기",
        "할인 내용 접기",
        "사용 기간 접기",
        "상태 접기",
      ]);
      expect(radio("다운로드")).toBeChecked();
      expect(radio("정률 (%)")).toBeChecked();
      expect(radio("전체")).toBeChecked();
      expect(radio("가능")).toBeChecked();
      expect(radio("사용")).toBeChecked();
      /* 새 쿠폰은 발급 방식을 잠그지 않는다 */
      expect(radio("가입 시 자동")).toBeEnabled();
      expect(
        screen.getByText("등록 시 오늘 날짜로", { exact: false }),
      ).toBeVisible();
    });

    it("발급 방식은 쿠폰명 아래, 중복 사용은 적용 대상 아래", () => {
      renderAt("/promo/new");

      const groups = screen
        .getAllByRole("radiogroup")
        .map((group) => group.getAttribute("aria-labelledby"))
        .map((id) => document.getElementById(id!)?.textContent);
      expect(groups).toEqual([
        "발급 방식 *",
        "할인 유형 *",
        "적용 대상 *",
        "중복 사용 *",
        "상태 *",
      ]);
    });

    it("하단 바 — [목록] … [취소] [쿠폰 등록], 주 버튼은 맨 오른쪽 하나", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");

      const bar = save().closest(".sticky") as HTMLElement;
      expect(
        within(bar)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["목록", "취소", "쿠폰 등록"]);
      expect(save().className).toContain("bg-action-primary");
      await user.click(screen.getByRole("button", { name: "취소" }));
      expect(onNavSelect).toHaveBeenCalledWith("/promo");
    });
  });

  describe("사용 기간 — 발급 방식이 칸을 정한다(고르는 버튼 없음)", () => {
    it("다운로드 → 시작일·종료일 + 「종료일이 지나면 더는 받을 수 없습니다.」", () => {
      renderAt("/promo/new");

      expect(screen.getByText("시작일")).toBeVisible();
      expect(screen.getByText("종료일")).toBeVisible();
      expect(
        screen.getByText("종료일이 지나면 더는 받을 수 없습니다."),
      ).toBeVisible();
      expect(screen.queryByRole("textbox", { name: /발급 후/ })).toBeNull();
    });

    it("가입 시 자동 → 「발급 후 [일수 입력] 일」 한 칸, 날짜 칸 없음", async () => {
      const { user } = renderAt("/promo/new");

      await user.click(radio("가입 시 자동"));

      const days = textbox(/발급 후/);
      expect(days).toHaveAttribute("placeholder", "일수 입력");
      expect(days).toHaveAccessibleDescription(/일/);
      expect(screen.queryByText("시작일")).toBeNull();
      expect(screen.queryByText("종료일")).toBeNull();
    });

    it("쿠폰 번호 → 다운로드와 같은 시작일·종료일 + 새 쿠폰은 「먼저 등록한 뒤」 안내", async () => {
      const { user } = renderAt("/promo/new");

      await user.click(radio("쿠폰 번호"));

      expect(screen.getByText("시작일")).toBeVisible();
      expect(
        screen.getByText("쿠폰을 먼저 등록한 뒤 번호 파일을 올려 주세요"),
      ).toBeVisible();
      expect(screen.queryByRole("button", { name: "파일 올리기" })).toBeNull();
    });
  });

  describe("검사 — 칸 아래 · 문구는 개발 `toHqMutation` 그대로", () => {
    it("빈 폼 → 쿠폰명 · 할인율, 저장·이동하지 않는다", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");

      await user.click(save());

      expect(screen.getByText("쿠폰명을 입력하세요.")).toBeVisible();
      expect(screen.getByText("할인율을 입력하세요.")).toBeVisible();
      expect(textbox(/쿠폰명/)).toHaveAttribute("aria-invalid", "true");
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("정액이면 「할인 금액을 입력하세요.」", async () => {
      const { user } = renderAt("/promo/new");

      await user.click(radio("정액 (원)"));
      await user.click(save());
      expect(screen.getByText("할인 금액을 입력하세요.")).toBeVisible();
    });

    it("할인율 150 · 최대 할인액 0 · 가입 시 자동 일수 비움", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");

      await user.type(textbox(/쿠폰명/), "가입 쿠폰");
      await user.type(textbox(/할인율/), "150");
      await user.type(textbox(/최대 할인액/), "0");
      await user.click(radio("가입 시 자동"));
      await user.click(save());

      expect(
        screen.getByText("할인율은 1~100 사이로 입력하세요."),
      ).toBeVisible();
      expect(
        screen.getByText("최대 할인액은 1원 이상 입력하거나 비워 주세요."),
      ).toBeVisible();
      expect(screen.getByText("발급 후 사용 일수를 입력하세요.")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("칸을 고치면 그 칸의 오류만 사라진다", async () => {
      const { user } = renderAt("/promo/new");

      await user.click(save());
      await user.type(textbox(/쿠폰명/), "a");
      expect(screen.queryByText("쿠폰명을 입력하세요.")).toBeNull();
      expect(screen.getByText("할인율을 입력하세요.")).toBeVisible();
    });

    it("종료일 < 시작일은 종료일 오류 — 가입 시 자동은 날짜를 보지 않는다", () => {
      const base = {
        ...draftOf(),
        name: "a",
        dcVal: "10",
        start: "2026-12-01",
        end: "2026-11-01",
      };
      expect(validateHqCoupon(base)).toEqual({
        end: "종료일은 시작일보다 빠를 수 없습니다.",
      });
      expect(
        validateHqCoupon({ ...base, issueMethod: "가입자동", validDays: "30" }),
      ).toEqual({});
    });
  });

  describe("가입 쿠폰 교체 확인 (개발 69ab2f3)", () => {
    it("다른 가입 쿠폰이 사용 중이면 확인 창 — 취소하면 저장하지 않는다", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");
      await fillBasics(user);
      await user.click(radio("가입 시 자동"));
      await user.type(textbox(/발급 후/), "30");

      await user.click(save());
      const dialog = await screen.findByRole("dialog");
      expect(
        within(dialog).getByText("기존 쿠폰을 사용중지로 바꿀까요?"),
      ).toBeVisible();
      expect(
        within(dialog).getByText(
          "새 가입 회원부터 새 쿠폰이 나가요. 이미 받은 회원은 만료일까지 쓸 수 있어요.",
        ),
      ).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(onNavSelect).not.toHaveBeenCalled();
      expect(screen.queryByText("쿠폰이 등록되었습니다.")).toBeNull();
    });

    it("확인하면 등록 알림 + 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");
      await fillBasics(user);
      await user.click(radio("가입 시 자동"));
      await user.type(textbox(/발급 후/), "30");

      await user.click(save());
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "확인" }));

      expect(await screen.findByText("쿠폰이 등록되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/promo");
    });

    it("사용중지로 등록하거나 다운로드면 묻지 않고 등록한다", async () => {
      const { user, onNavSelect } = renderAt("/promo/new");
      await fillBasics(user);

      await user.click(save());
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(onNavSelect).toHaveBeenCalledWith("/promo");

      const signupStopped = {
        ...draftOf(),
        issueMethod: "가입자동" as const,
        stat: "사용중지" as const,
      };
      expect(needsReplaceConfirm(signupStopped)).toBe(false);
    });

    it("사용 중인 가입 쿠폰 자신을 고쳐 저장하면 묻지 않는다 — 다운로드 쿠폰을 가입으로 바꾸면 묻는다", async () => {
      const { user, onNavSelect } = renderAt("/promo/CP-2610-02");
      await user.click(save("저장하기"));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(await screen.findByText("저장되었습니다.")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();

      expect(
        needsReplaceConfirm(
          { ...draftOf(), issueMethod: "가입자동", validDays: "30" },
          "CP-2610-03",
        ),
      ).toBe(true);
    });
  });

  describe("발급 방식 잠금 (개발 70a3e88 · 3a2df9e)", () => {
    it.each([
      ["CP-2610-02", "이미 발급된 쿠폰은 발급 방식을 바꿀 수 없어요."],
      ["CP-2610-04", "번호 파일을 올린 쿠폰은 발급 방식을 바꿀 수 없어요."],
    ])("%s — 세 버튼이 잠기고 「%s」", (id, message) => {
      renderAt(`/promo/${id}`);

      for (const name of ["가입 시 자동", "다운로드", "쿠폰 번호"]) {
        expect(radio(name)).toBeDisabled();
      }
      expect(screen.getByText(message)).toBeVisible();
    });

    it("발급 0장 · 번호 없음(CP-2610-03)은 바꿀 수 있다", () => {
      renderAt("/promo/CP-2610-03");
      expect(radio("가입 시 자동")).toBeEnabled();
      expect(screen.queryByText(/발급 방식을 바꿀 수 없어요/)).toBeNull();
    });

    it("잠금 판정 — 발급이 번호보다 앞선다, 둘 다 없으면 잠그지 않는다", () => {
      expect(methodLockMessage(0, 0)).toBeNull();
      expect(methodLockMessage(2, 4)).toBe(
        "이미 발급된 쿠폰은 발급 방식을 바꿀 수 없어요.",
      );
      expect(methodLockMessage(0, 4)).toBe(
        "번호 파일을 올린 쿠폰은 발급 방식을 바꿀 수 없어요.",
      );
    });
  });

  describe("번호 파일 — 쿠폰 번호 (개발 495c8f5)", () => {
    it("저장된 쿠폰 번호 쿠폰은 [파일 올리기](txt) + 「번호 N개 · 사용 M개」", () => {
      renderAt("/promo/CP-2610-04");

      const group = screen.getByRole("group", { name: "번호 파일" });
      expect(
        within(group).getByRole("button", { name: "파일 올리기" }),
      ).toBeVisible();
      expect(within(group).getByText("번호 500개 · 사용 0개")).toBeVisible();
      expect(screen.getByLabelText("번호 파일 선택")).toHaveAttribute(
        "accept",
        ".txt,text/plain",
      );
    });

    it("올리면 줄을 세어 개발 문구로 알리고 번호 수가 는다", async () => {
      const { user } = renderAt("/promo/CP-2610-04");

      const file = new File(["A1\r\nB2\n\nA1\nC3\n"], "codes.txt", {
        type: "text/plain",
      });
      await user.upload(screen.getByLabelText("번호 파일 선택"), file);

      expect(
        await screen.findByText("번호 3개 추가 · 중복 1 · 형식 오류 0"),
      ).toBeVisible();
      expect(screen.getByText("번호 503개 · 사용 0개")).toBeVisible();
    });

    it("다른 방식으로 저장된 쿠폰을 [쿠폰 번호]로 바꾼 채면 「저장한 뒤」 안내", async () => {
      const { user } = renderAt("/promo/CP-2610-03");

      await user.click(radio("쿠폰 번호"));
      expect(
        screen.getByText(
          "발급 방식을 쿠폰 번호로 저장한 뒤 번호 파일을 올려 주세요",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("button", { name: "파일 올리기" })).toBeNull();
    });

    it("줄 세기 — 빈 줄 제외 · 같은 파일 안 중복", () => {
      expect(countCodes("1234-5678\r\n\n  \n1234-5678\nX")).toEqual({
        added: 2,
        duplicated: 1,
        invalid: 0,
      });
    });
  });

  describe("수정 — /promo/{본사 쿠폰코드}", () => {
    it("다운로드 쿠폰 CP-2610-03 — 등록 값이 채워지고 발행일·쿠폰코드는 읽기만", () => {
      renderAt("/promo/CP-2610-03");

      expect(
        screen.getByRole("heading", { level: 1, name: "쿠폰 상세 (수정)" }),
      ).toBeVisible();
      expect(
        screen.getByText("CP-2610-03 · 본사 · 겨울맞이 렌트 5,000원 할인"),
      ).toBeVisible();
      expect(textbox(/쿠폰명/)).toHaveValue("겨울맞이 렌트 5,000원 할인");
      expect(radio("다운로드")).toBeChecked();
      expect(radio("정액 (원)")).toBeChecked();
      expect(textbox(/할인 금액/)).toHaveValue("5,000");
      expect(textbox(/사용 조건/)).toHaveValue("50,000");
      expect(radio("렌트")).toBeChecked();
      expect(radio("불가")).toBeChecked();
      expect(screen.getByText("2026.11.01")).toBeVisible();
      expect(screen.getByText("2026.11.30")).toBeVisible();
      expect(screen.getByText("2026.10.15")).toBeVisible();
      expect(screen.getByText("CP-2610-03", { selector: "dd" })).toBeVisible();
      expect(save("저장하기")).toBeVisible();
    });

    it("가입 쿠폰 CP-2610-02 — 발급 후 30일 · 정률 20% · 최대 20,000원", () => {
      renderAt("/promo/CP-2610-02");

      expect(radio("가입 시 자동")).toBeChecked();
      expect(textbox(/발급 후/)).toHaveValue("30");
      expect(textbox(/할인율/)).toHaveValue("20");
      expect(textbox(/최대 할인액/)).toHaveValue("20,000");
      expect(radio("전체")).toBeChecked();
      expect(radio("가능")).toBeChecked();
    });

    it("셀러 쿠폰·없는 코드는 이 폼에서 찾을 수 없음", async () => {
      const { user, onNavSelect } = renderAt("/promo/CP-2608-01");

      expect(screen.getByText("찾을 수 없는 쿠폰입니다")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "쿠폰관리로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/promo");
    });
  });
});
