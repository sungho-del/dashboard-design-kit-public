import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { PopupListPage } from "./PopupListPage";
import { POPUPS, plainText, type Popup } from "./PopupListPage.data";

/* -------------------------------------------------------------------------
 * 팝업 관리 — 목록형 · 기획 v0.4 `SCREENS.popups` (배너와 같은 뼈대)
 *
 * 동작을 본다: 원본 열(노출 순서 없음) · 데이터 순서 + No · 내용 열은 HTML → 글자(원문 불변) ·
 * 도구줄 순서 · 행 → 상세 · 선택 삭제 = 알림, 목록 불변 · 숨김 fixture.
 * ---------------------------------------------------------------------- */
function renderAt(path = "/popups") {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <PopupListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/popups"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const bodyRows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
const cellsOf = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent?.trim());

describe("PopupListPage (팝업 관리)", () => {
  it("원본 열 · 1건 · 내용은 태그 없이 글자로(<br> 은 공백)", () => {
    renderAt();

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent?.trim()),
    ).toEqual(["", "No", "팝업 제목", "내용", "상태", "노출 기간", "등록일"]);
    expect(screen.getByText("목록 (총 1건)")).toBeVisible();
    expect(bodyRows().map(cellsOf)).toEqual([
      [
        "",
        "1",
        "첫 렌트 30% 쿠폰 안내",
        "신규 가입하고 첫 렌트 30% 할인 쿠폰을 받아보세요. 마이페이지 › 쿠폰함에서 확인할 수 있어요.",
        "게시",
        "2026.07.01 ~ 2026.08.31",
        "2026.07.01",
      ],
    ]);
    /* 원문은 그대로 — 표에서만 바꾼다 */
    expect(POPUPS[0].body).toContain("<b>첫 렌트 30% 할인 쿠폰</b>");
  });

  it("plainText — <br>·<br/> 는 공백, 태그 제거, 공백 정리", () => {
    expect(plainText("가<br>나<BR/>다 <b>라</b>  마")).toBe("가 나 다 라 마");
  });

  it("데이터 순서 그대로 No 1..N · 숨김은 회색(fixture)", () => {
    const hidden: Popup = {
      ...POPUPS[0],
      id: "PU-T",
      title: "숨긴 팝업",
      status: "hidden",
    };
    POPUPS.unshift(hidden);
    try {
      renderAt();
      expect(bodyRows().map((row) => cellsOf(row).slice(1, 3))).toEqual([
        ["1", "숨긴 팝업"],
        ["2", "첫 렌트 30% 쿠폰 안내"],
      ]);
      expect(within(bodyRows()[0]).getByText("숨김")).toHaveClass(
        "text-text-sub",
      );
      expect(within(bodyRows()[1]).getByText("게시")).toHaveClass(
        "text-text-success",
      );
    } finally {
      POPUPS.shift();
    }
  });

  it("도구줄 [팝업 등록][선택 삭제] · 페이지네이션·도움말 없음 · 등록 → /popups/new", async () => {
    const { user, onNavSelect } = renderAt();

    const register = screen.getByRole("button", { name: "팝업 등록" });
    const remove = screen.getByRole("button", { name: "선택 삭제" });
    expect(
      register.compareDocumentPosition(remove) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "도움말" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: /페이지/ })).toBeNull();

    await user.click(register);
    expect(onNavSelect).toHaveBeenCalledWith("/popups/new");
  });

  it("행을 누르면 상세로 — 체크박스는 아니다", async () => {
    const { user, onNavSelect } = renderAt();

    await user.click(within(bodyRows()[0]).getAllByRole("cell")[3]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/popups/PU-1");

    onNavSelect.mockClear();
    await user.click(
      screen.getByRole("checkbox", { name: "첫 렌트 30% 쿠폰 안내 선택" }),
    );
    expect(onNavSelect).not.toHaveBeenCalled();
  });

  it("선택 없이 [선택 삭제] — 「선택된 팝업이 없습니다.」", async () => {
    const { user } = renderAt();

    await user.click(screen.getByRole("button", { name: "선택 삭제" }));
    expect(await screen.findByText("선택된 팝업이 없습니다.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("1건 삭제 — 제목에 건수 없음 · 대상 이름 없음 → 「삭제되었습니다.」, 목록 그대로", async () => {
    const { user } = renderAt();

    await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));

    const modal = await screen.findByRole("dialog");
    expect(
      within(modal).getByRole("heading", { name: "팝업 삭제" }),
    ).toBeVisible();
    expect(within(modal).queryByText("첫 렌트 30% 쿠폰 안내")).toBeNull();
    await user.click(within(modal).getByRole("button", { name: "삭제" }));

    expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
    expect(bodyRows()).toHaveLength(1);
    expect(
      screen.getByRole("checkbox", { name: "전체 선택" }),
    ).not.toBeChecked();
  });

  it("?preview=empty — 빈 상태", () => {
    renderAt("/popups?preview=empty");
    expect(screen.getByText("등록된 팝업이 없습니다")).toBeVisible();
  });
});
