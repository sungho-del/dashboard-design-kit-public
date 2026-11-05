import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { NoticeFormPage } from "./NoticeFormPage";

/* -------------------------------------------------------------------------
 * 공지 등록/수정 — 기획 v0.4 `DETAILS.noticeForm`
 *
 * 신규·수정 갈림(노출 여부·공지 ID 는 수정만) · 저장된 값 채움 · 머리 · 제목·시작일 필수 검사 ·
 * 새 등록 시작일 = 오늘(시연 기준일 2026-10-19) ·
 * 알림 + 보던 탭 목록으로 · [목록]·[취소] · 찾을 수 없음 · 노출 여부는 초안(머리 배지는 저장값).
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
      <NoticeFormPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/notices"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const valueOf = (label: string) =>
  screen.queryAllByText(label).find((element) => element.tagName === "DT")
    ?.nextElementSibling?.textContent;

const titleInput = () => screen.getByRole("textbox", { name: /제목/ });

/** 게시 기간 트리거 — 「시작일 → 종료일」 두 칸을 한 버튼으로 연다 */
const periodTrigger = () => screen.getByRole("button", { name: /게시 기간/ });

describe("NoticeFormPage (공지 등록/수정)", () => {
  describe("수정 — /notices/{id}", () => {
    it("머리 = 제목 · 대상 · ID · 저장된 상태 배지", () => {
      renderAt("/notices/N-S22");
      expect(
        screen.getByRole("heading", { level: 1, name: "공지 수정" }),
      ).toBeVisible();
      expect(screen.getByText("셀러 공지 · N-S22")).toBeVisible();
      const header = screen.getByRole("banner");
      expect(within(header).getByText("숨김")).toBeVisible();
    });

    it("저장된 값으로 채운다 — 제목·본문·대상·ID·노출 여부·고정", () => {
      renderAt("/notices/N-U31");
      expect(titleInput()).toHaveValue("[안내] 여름 성수기 배송 일정 안내");
      expect(screen.getByRole("textbox", { name: "본문" })).toHaveValue(
        "7~8월 성수기에는 도서산간 지역 배송이 1~2일 지연될 수 있습니다.",
      );
      expect(valueOf("공지 대상")).toBe("고객 공지");
      expect(valueOf("공지 ID")).toBe("N-U31");
      expect(screen.getByRole("radio", { name: "게시" })).toBeChecked();
      expect(
        screen.getByRole("checkbox", { name: "목록 상단에 고정(핀)" }),
      ).toBeChecked();
      expect(screen.getByRole("button", { name: "저장" })).toBeVisible();
    });

    it("구역 2개 — 공지 내용 · 게시 설정 (접기)", async () => {
      const { user } = renderAt("/notices/N-U30");
      await user.click(screen.getByRole("button", { name: "공지 내용 접기" }));
      expect(screen.queryByRole("textbox", { name: /제목/ })).toBeNull();
      expect(
        screen.getByRole("button", { name: "게시 설정 접기" }),
      ).toBeVisible();
    });

    it("노출 여부는 초안 — 숨김을 골라도 머리 배지는 저장값 「게시」", async () => {
      const { user } = renderAt("/notices/N-U30");
      await user.click(screen.getByRole("radio", { name: "숨김" }));
      expect(screen.getByRole("radio", { name: "숨김" })).toBeChecked();
      expect(
        within(screen.getByRole("banner")).getByText("게시"),
      ).toBeVisible();
    });

    it("[저장] — 알림 「공지가 수정되었습니다.」 + 보던 탭 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/notices/N-S25");
      await user.click(screen.getByRole("button", { name: "저장" }));
      expect(await screen.findByText("공지가 수정되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices?aud=seller");
    });

    it("제목을 비우면 입력칸 아래 오류 — 저장·이동하지 않는다(공백만도)", async () => {
      const { user, onNavSelect } = renderAt("/notices/N-U31");
      await user.clear(titleInput());
      await user.type(titleInput(), "   ");
      await user.click(screen.getByRole("button", { name: "저장" }));
      expect(screen.getByText("제목을 입력해주세요.")).toBeVisible();
      expect(titleInput()).toHaveAttribute("aria-invalid", "true");
      expect(onNavSelect).not.toHaveBeenCalled();
      expect(screen.queryByText("공지가 수정되었습니다.")).toBeNull();
    });

    it("[목록]·[취소] — 확인 없이 그 공지의 대상 탭 목록으로", async () => {
      const { user, onNavSelect } = renderAt("/notices/N-U29");
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices");
      await user.click(screen.getByRole("button", { name: "취소" }));
      expect(onNavSelect).toHaveBeenCalledTimes(2);
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices");
    });

    it("하단 오른쪽 버튼 순서 [취소][저장]", () => {
      renderAt("/notices/N-U31");
      const names = screen
        .getAllByRole("button")
        .map((button) => button.textContent)
        .filter((name) => name === "취소" || name === "저장");
      expect(names).toEqual(["취소", "저장"]);
    });
  });

  describe("신규 — /notices/new", () => {
    it("셀러 탭에서 열면 셀러 공지 작성 · 노출 여부·공지 ID 없음 · [등록]", () => {
      renderAt("/notices/new?aud=seller");
      expect(
        screen.getByRole("heading", { level: 1, name: "공지 등록" }),
      ).toBeVisible();
      expect(screen.getByText("셀러 공지 작성")).toBeVisible();
      expect(screen.getByText("종료일을 비우면 상시 게시됩니다")).toBeVisible();
      expect(valueOf("공지 대상")).toBe("셀러 공지");
      expect(valueOf("공지 ID")).toBeUndefined();
      expect(screen.queryByRole("radio", { name: "게시" })).toBeNull();
      expect(titleInput()).toHaveValue("");
      expect(
        screen.getByRole("checkbox", { name: "목록 상단에 고정(핀)" }),
      ).not.toBeChecked();
      expect(screen.getByRole("button", { name: "등록" })).toBeVisible();
    });

    it("대상 쿼리가 없으면 고객 공지", () => {
      renderAt("/notices/new");
      expect(screen.getByText("고객 공지 작성")).toBeVisible();
    });

    /** 판정 ⑬ — 시작일은 오늘로 미리 차 있어 제목만 넣으면 등록된다(본문·종료일은 비어도 된다) */
    it("시작일은 오늘로 미리 차 있고 종료일은 비어 있다 — 제목만 넣으면 등록된다", async () => {
      const { user, onNavSelect } = renderAt("/notices/new?aud=seller");
      const period = periodTrigger();
      expect(period).toHaveTextContent("2026.10.19");
      expect(period).toHaveTextContent("종료일");

      await user.click(screen.getByRole("button", { name: "등록" }));
      expect(screen.getByText("제목을 입력해주세요.")).toBeVisible();
      expect(screen.queryByText("시작일을 입력해 주세요")).toBeNull();
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.type(titleInput(), "새 공지");
      expect(screen.queryByText("제목을 입력해주세요.")).toBeNull();
      await user.click(screen.getByRole("button", { name: "등록" }));
      expect(await screen.findByText("공지가 등록되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenLastCalledWith("/notices?aud=seller");
    });

    /** 판정 ⑬ · Q14 — 시작일을 비우면 「시작일을 입력해 주세요」로 막는다 */
    it("시작일을 비우면 칸 아래 오류 — 등록·이동하지 않는다", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date(2026, 9, 19));
      try {
        const { user, onNavSelect } = renderAt("/notices/new");
        await user.type(titleInput(), "새 공지");
        /* 미리 찬 시작일을 두 번 눌러 범위를 비운다(react-day-picker 범위 선택 해제) */
        await user.click(periodTrigger());
        const day = await screen.findByRole("button", {
          name: /2026년 10월 19일/,
        });
        await user.click(day);
        await user.click(
          screen.getByRole("button", { name: /2026년 10월 19일/ }),
        );
        await user.keyboard("{Escape}");
        expect(periodTrigger()).toHaveTextContent("시작일");

        await user.click(screen.getByRole("button", { name: "등록" }));
        expect(screen.getByText("시작일을 입력해 주세요")).toBeVisible();
        expect(periodTrigger()).toHaveAttribute("aria-invalid", "true");
        expect(onNavSelect).not.toHaveBeenCalled();
        expect(screen.queryByText("공지가 등록되었습니다.")).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  it("공지가 바뀌면 처음부터 — 고치던 제목·오류가 다음 공지에 묻어가지 않는다", async () => {
    const { user } = renderAt("/notices/N-U31");
    await user.clear(titleInput());
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("제목을 입력해주세요.")).toBeVisible();

    act(() => navigate("/notices/N-U30"));
    expect(titleInput()).toHaveValue("[공지] 보증금 환급 안내 문구 개정");
    expect(screen.queryByText("제목을 입력해주세요.")).toBeNull();
  });

  describe("찾을 수 없음", () => {
    it.each(["/notices/N-U99", "/notices/N-U31/extra"])(
      "%s — 안내 + 「공지사항 관리로」",
      async (path) => {
        const { user, onNavSelect } = renderAt(path);
        expect(screen.getByText("찾을 수 없는 공지입니다")).toBeVisible();
        expect(screen.queryByRole("textbox")).toBeNull();
        await user.click(
          screen.getByRole("button", { name: "공지사항 관리로" }),
        );
        expect(onNavSelect).toHaveBeenLastCalledWith("/notices");
      },
    );
  });

  it("?preview=loading — 입력칸 대신 스켈레톤", () => {
    renderAt("/notices/N-U31?preview=loading");
    expect(screen.queryByRole("textbox", { name: /제목/ })).toBeNull();
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });
});
