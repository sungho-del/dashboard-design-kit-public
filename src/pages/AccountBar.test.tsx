import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountBar } from "./AccountBar";

describe("AccountBar (계정 묶음)", () => {
  it("「{이름} · {역할}」 한 문자열로 읽히고 title 도 전체다", () => {
    render(
      <AccountBar
        name="운영관리자"
        role="본사 운영관리자"
        onLogout={() => {}}
      />,
    );
    const text = screen.getByTitle("운영관리자 · 본사 운영관리자");
    expect(text).toHaveTextContent(/^운영관리자 · 본사 운영관리자$/);
    /* 넘치면 끝 말줄임 — 최대 320 */
    expect(text).toHaveClass("max-w-80", "truncate");
  });

  it("아바타는 장식이다 — 이름이 한 번만 읽힌다", () => {
    render(<AccountBar name="리틀베이비" role="대표" onLogout={() => {}} />);
    /* Avatar 는 이니셜일 때 role=img + 이름을 낸다 — 숨겨져 접근성 트리에 없어야 한다 */
    expect(screen.queryByRole("img")).toBeNull();
    /* 그래도 화면에는 이니셜이 있다 */
    expect(screen.getByText("리")).toBeInTheDocument();
  });

  it("눌리는 것은 [로그아웃] 하나고 누르면 콜백이 불린다", async () => {
    const onLogout = vi.fn();
    render(<AccountBar name="리틀베이비" role="대표" onLogout={onLogout} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });
});
