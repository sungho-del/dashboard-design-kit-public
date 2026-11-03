import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { BannerListPage } from "./BannerListPage";
import { BANNERS, type Banner } from "./BannerListPage.data";

/* -------------------------------------------------------------------------
 * 배너 관리 — 목록형 · 기획 v0.4 `SCREENS.display`
 *
 * 동작을 본다: 원본 열 · 노출 순서 오름차순 + No · 시드 배열 불변 · 도구줄 버튼 순서 ·
 * 행/제목 → 상세 · 체크박스는 행 클릭 아님 · 선택 삭제 = 확인 창 → 알림, **목록 불변** ·
 * 게시/숨김 의미표(숨김은 fixture) · 데이터 상태.
 * ---------------------------------------------------------------------- */
function renderAt(path = "/display") {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <BannerListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/display"
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

describe("BannerListPage (배너 관리)", () => {
  it("원본 열 · 3건 · 노출 순서 순 · 기간 「상시」 · 점 표기", () => {
    renderAt();

    expect(
      within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent?.trim()),
    ).toEqual([
      "",
      "No",
      "배너 제목",
      "노출 순서",
      "상태",
      "노출 기간",
      "등록일",
    ]);
    expect(screen.getByText("목록 (총 3건)")).toBeVisible();
    expect(bodyRows().map(cellsOf)).toEqual([
      [
        "",
        "1",
        "성장 단계에 맞춰 필요한 것만 딱",
        "1",
        "게시",
        "2026.07.01 ~ 상시",
        "2026.07.01",
      ],
      [
        "",
        "2",
        "필요한 건 바로 구매로 빠르게",
        "2",
        "게시",
        "2026.07.01 ~ 상시",
        "2026.07.01",
      ],
      [
        "",
        "3",
        "여름 물놀이 용품 기획전",
        "3",
        "게시",
        "2026.07.10 ~ 2026.08.20",
        "2026.07.10",
      ],
    ]);
  });

  it("노출 순서가 뒤섞여도 순서대로 그리고 No 는 1..N — 시드 배열은 정렬하지 않는다", () => {
    const original = BANNERS.map((banner) => banner.order);
    BANNERS[0].order = 9;
    try {
      renderAt();
      expect(bodyRows().map((row) => cellsOf(row).slice(1, 4))).toEqual([
        ["1", "필요한 건 바로 구매로 빠르게", "2"],
        ["2", "여름 물놀이 용품 기획전", "3"],
        ["3", "성장 단계에 맞춰 필요한 것만 딱", "9"],
      ]);
      expect(BANNERS[0].title).toBe("성장 단계에 맞춰 필요한 것만 딱");
    } finally {
      BANNERS.forEach((banner, index) => (banner.order = original[index]));
    }
  });

  it("게시 = success · 숨김 = default (숨김은 fixture)", () => {
    const hidden: Banner = {
      ...BANNERS[2],
      id: "BN-T",
      title: "숨긴 배너",
      order: 4,
      status: "hidden",
    };
    BANNERS.push(hidden);
    try {
      renderAt();
      const [first, , , last] = bodyRows();
      expect(within(first).getByText("게시")).toHaveClass("text-text-success");
      expect(within(last).getByText("숨김")).toHaveClass("text-text-sub");
    } finally {
      BANNERS.pop();
    }
  });

  it("도구줄 — [배너 등록][선택 삭제] 순서(원본) · 머리에는 버튼·도움말 없음", async () => {
    const { user, onNavSelect } = renderAt();

    const register = screen.getByRole("button", { name: "배너 등록" });
    const remove = screen.getByRole("button", { name: "선택 삭제" });
    expect(
      register.compareDocumentPosition(remove) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "도움말" })).toBeNull();
    expect(screen.queryByRole("navigation", { name: /페이지/ })).toBeNull();

    await user.click(register);
    expect(onNavSelect).toHaveBeenCalledWith("/display/new");
  });

  it("행 어디를 눌러도 · 제목 링크도 상세로 — 체크박스는 아니다", async () => {
    const { user, onNavSelect } = renderAt();

    await user.click(within(bodyRows()[1]).getAllByRole("cell")[5]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/display/BN-2");

    await user.click(
      screen.getByRole("button", { name: "여름 물놀이 용품 기획전" }),
    );
    expect(onNavSelect).toHaveBeenLastCalledWith("/display/BN-3");

    onNavSelect.mockClear();
    await user.click(
      screen.getByRole("checkbox", { name: "여름 물놀이 용품 기획전 선택" }),
    );
    expect(onNavSelect).not.toHaveBeenCalled();
  });

  it("선택 없이 [선택 삭제] — 「선택된 배너가 없습니다.」 · 창 없음", async () => {
    const { user } = renderAt();

    await user.click(screen.getByRole("button", { name: "선택 삭제" }));
    expect(await screen.findByText("선택된 배너가 없습니다.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("2건 선택 삭제 — 제목에 건수 · 원본 문구 → 「2건 삭제되었습니다.」, 목록은 그대로 · 선택 비움", async () => {
    const { user } = renderAt();

    await user.click(
      screen.getByRole("checkbox", {
        name: "성장 단계에 맞춰 필요한 것만 딱 선택",
      }),
    );
    await user.click(
      screen.getByRole("checkbox", { name: "여름 물놀이 용품 기획전 선택" }),
    );
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));

    const modal = await screen.findByRole("dialog");
    expect(
      within(modal).getByRole("heading", { name: "배너 삭제 (2건)" }),
    ).toBeVisible();
    expect(
      within(modal).getByText("삭제 후에는 되돌릴 수 없습니다."),
    ).toBeVisible();
    expect(modal).toHaveTextContent("잠시 내리려는 것이라면 [숨김]을 쓰세요.");

    await user.click(within(modal).getByRole("button", { name: "삭제" }));

    expect(await screen.findByText("2건 삭제되었습니다.")).toBeVisible();
    expect(bodyRows()).toHaveLength(3);
    expect(
      screen.getByRole("checkbox", { name: "전체 선택" }),
    ).not.toBeChecked();
  });

  it("삭제 창 [취소] — 알림 없음 · 선택 유지", async () => {
    const { user } = renderAt();

    await user.click(screen.getByRole("checkbox", { name: "전체 선택" }));
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));
    const modal = await screen.findByRole("dialog");
    expect(
      within(modal).getByRole("heading", { name: "배너 삭제 (3건)" }),
    ).toBeVisible();
    await user.click(within(modal).getByRole("button", { name: "취소" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText(/삭제되었습니다/)).toBeNull();
    expect(screen.getByRole("checkbox", { name: "전체 선택" })).toBeChecked();
  });

  it("?preview=empty — 빈 상태 · 도구줄 버튼은 남는다", () => {
    renderAt("/display?preview=empty");

    expect(screen.getByText("등록된 배너가 없습니다")).toBeVisible();
    expect(screen.getByText("목록 (총 0건)")).toBeVisible();
    expect(screen.getByRole("button", { name: "배너 등록" })).toBeVisible();
  });
});
