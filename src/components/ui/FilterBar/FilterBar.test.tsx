import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";
import { Input } from "../Input";

/* -------------------------------------------------------------------------
 * FilterBar
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **계약**이다 — 닫히면 내용이 **DOM 에서 빠지는가**(포커스 안전) ·
 * 토글이 `aria-expanded`/`aria-controls` 로 상태를 전달하는가 · 요약을 늘 내는가 ·
 * `onReset` 이 없으면 버튼도 없는가.
 * ---------------------------------------------------------------------- */

function Controlled({
  initialOpen = false,
  onReset,
}: {
  initialOpen?: boolean;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <FilterBar
      open={open}
      onOpenChange={setOpen}
      summary="조건 없음 (전체)"
      onReset={onReset}
    >
      <Input placeholder="검색어 입력" />
    </FilterBar>
  );
}

describe("FilterBar", () => {
  it("접힌 채로도 지금 걸린 조건을 말한다", () => {
    render(<Controlled />);

    expect(screen.getByText("검색조건")).toBeVisible();
    expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
  });

  /**
   * ⚠️ 가장 중요한 계약 — `hidden` 으로 숨기면 안의 입력칸이 **탭 순서에 남아**
   * 보이지 않는 곳으로 포커스가 사라진다. 그래서 닫히면 DOM 에서 뺀다.
   */
  it("닫혀 있으면 조건 컨트롤이 DOM 에 없다", () => {
    render(<Controlled />);

    expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
  });

  it("열면 조건 컨트롤이 나오고, 닫으면 다시 사라진다", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.click(screen.getByRole("button", { name: /검색 열기/ }));
    expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
    expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
  });

  it("토글이 펼침 상태와 대상을 보조기술에 전달한다", async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    const toggle = screen.getByRole("button", { name: /검색 열기/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    const opened = screen.getByRole("button", { name: /검색 닫기/ });
    expect(opened).toHaveAttribute("aria-expanded", "true");

    /* aria-controls 가 가리키는 것이 실제로 펼쳐진 영역이어야 한다 */
    const panelId = opened.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    expect(panel).toContainElement(screen.getByPlaceholderText("검색어 입력"));
  });

  it("onReset 을 주면 [초기화] 가 그것을 부른다", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<Controlled onReset={onReset} />);

    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  /** 되돌릴 것이 없는 화면에서 아무 일도 안 하는 버튼을 두지 않는다 */
  it("onReset 이 없으면 [초기화] 버튼도 없다", () => {
    render(<Controlled />);

    expect(screen.queryByRole("button", { name: "초기화" })).toBeNull();
  });

  it("라벨을 바꿀 수 있다", () => {
    render(
      <FilterBar
        open={false}
        onOpenChange={() => {}}
        summary="조건 없음 (전체)"
        label="조회 조건"
      />,
    );

    expect(screen.getByText("조회 조건")).toBeVisible();
  });
});
