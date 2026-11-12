import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import {
  LoginPage,
  PasswordChangePage,
  PasswordResetConfirmPage,
  PasswordResetRequestPage,
} from "./AuthPages";
import { AUTH_TEXT, AUTH_COPYRIGHT } from "./AuthPages.data";

/* -------------------------------------------------------------------------
 * 인증 화면 4종 — 동작을 본다: 버튼 활성 조건 · 오류 문구와 순서 · 상태 전환 · 이동 경로.
 * 문구는 develop 글자 그대로라 테스트도 글자로 못박는다.
 * ---------------------------------------------------------------------- */

interface NavProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

function renderAt(Page: ComponentType<NavProps>, path: string) {
  window.history.pushState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <Page
      navOpen
      onNavOpenChange={vi.fn()}
      activeNav={path}
      onNavSelect={onNavSelect}
    />,
  );
  return { user, onNavSelect };
}

afterEach(() => {
  window.history.pushState(null, "", "/");
});

const button = (name: string) => screen.getByRole("button", { name });
const field = (label: string) => screen.getByLabelText(label);

describe("인증 화면 공통", () => {
  it("메뉴(GNB)를 그리지 않고 머리가 화면 제목이다 · 로고 + 「본사」 칩 · 저작권 줄", () => {
    renderAt(LoginPage, "/login");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "본사 어드민 로그인",
    );
    expect(screen.getByRole("img", { name: "BabyCube" })).toBeInTheDocument();
    expect(screen.getByText("본사")).toBeInTheDocument();
    expect(screen.getByText(AUTH_COPYRIGHT)).toBeInTheDocument();
  });

  it("입점사 — 네 화면 모두 칩 「입점사」 · 로그인 머리 「입점사 어드민 로그인」", () => {
    render(
      <LoginPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/login"
        onNavSelect={vi.fn()}
        account="입점사"
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "입점사 어드민 로그인",
    );
    expect(screen.getByText("입점사 계정으로 로그인해 주세요.")).toBeVisible();
    expect(screen.getByText("입점사")).toBeInTheDocument();
  });
});

describe("로그인", () => {
  it("두 칸을 다 채워야 [로그인] 이 켜지고, 누르면 `/` 로 간다", async () => {
    const { user, onNavSelect } = renderAt(LoginPage, "/login");
    expect(button("로그인")).toBeDisabled();

    await user.type(field("아이디(이메일)"), "admin@babycube.kr");
    expect(button("로그인")).toBeDisabled();

    await user.type(field("비밀번호"), "pw");
    expect(button("로그인")).toBeEnabled();

    await user.click(button("로그인"));
    expect(onNavSelect).toHaveBeenCalledWith("/");
    /* 퍼블에는 실패 경로가 없다 — 오류 줄이 뜨지 않는다 */
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("[비밀번호 찾기] 는 `/password-reset` 로 간다", async () => {
    const { user, onNavSelect } = renderAt(LoginPage, "/login");
    await user.click(button("비밀번호 찾기"));
    expect(onNavSelect).toHaveBeenCalledWith("/password-reset");
  });
});

describe("비밀번호 변경", () => {
  it("규칙 줄이 있고 버튼은 [변경] 하나다 (취소·로그아웃 없음)", () => {
    renderAt(PasswordChangePage, "/password");
    expect(screen.getByText(AUTH_TEXT.rule)).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("세 칸을 다 채워야 [변경] 이 켜진다", async () => {
    const { user } = renderAt(PasswordChangePage, "/password");
    await user.type(field("현재 비밀번호"), "old");
    await user.type(field("새 비밀번호"), "new");
    expect(button("변경")).toBeDisabled();
    await user.type(field("새 비밀번호 확인"), "new");
    expect(button("변경")).toBeEnabled();
  });

  it("새 비밀번호와 확인이 다르면 오류를 내고 이동하지 않는다 → 맞추면 `/` 로", async () => {
    const { user, onNavSelect } = renderAt(PasswordChangePage, "/password");
    await user.type(field("현재 비밀번호"), "old");
    await user.type(field("새 비밀번호"), "new1");
    await user.type(field("새 비밀번호 확인"), "new2");
    await user.click(button("변경"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "새 비밀번호와 확인 값이 일치하지 않습니다.",
    );
    expect(onNavSelect).not.toHaveBeenCalled();

    await user.clear(field("새 비밀번호 확인"));
    await user.type(field("새 비밀번호 확인"), "new1");
    await user.click(button("변경"));
    /* 규칙 판정은 서버 몫 — 화면은 확인 일치만 본다 */
    expect(onNavSelect).toHaveBeenCalledWith("/");
  });
});

describe("비밀번호 찾기", () => {
  it("메일을 보내면 문구가 바뀌고 칸과 [재설정 메일 보내기] 가 사라진다", async () => {
    const { user } = renderAt(PasswordResetRequestPage, "/password-reset");
    expect(screen.getByText(AUTH_TEXT.request.guide)).toBeInTheDocument();
    expect(button("재설정 메일 보내기")).toBeDisabled();

    /* 공백만으로는 켜지지 않는다 */
    await user.type(field("아이디(이메일)"), "  ");
    expect(button("재설정 메일 보내기")).toBeDisabled();

    await user.type(field("아이디(이메일)"), "admin@babycube.kr");
    await user.click(button("재설정 메일 보내기"));

    expect(
      screen.getByText(
        "입력하신 이메일이 등록된 계정이면 재설정 안내를 보냈어요. 30분 안에 메일의 링크를 열어 주세요.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(AUTH_TEXT.request.guide)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("아이디(이메일)")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "재설정 메일 보내기" }),
    ).not.toBeInTheDocument();
    expect(button("로그인으로")).toBeInTheDocument();
  });

  it("[로그인으로] 는 `/login` 으로 간다", async () => {
    const { user, onNavSelect } = renderAt(
      PasswordResetRequestPage,
      "/password-reset",
    );
    await user.click(button("로그인으로"));
    expect(onNavSelect).toHaveBeenCalledWith("/login");
  });
});

describe("비밀번호 재설정", () => {
  it("토큰이 없으면 링크 무효 — 칸이 없고 [다시 요청하기] 가 `/password-reset` 로 간다", async () => {
    const { user, onNavSelect } = renderAt(
      PasswordResetConfirmPage,
      "/password-reset/confirm",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "링크가 만료됐거나 이미 사용됐어요. 비밀번호 찾기를 다시 요청해 주세요.",
    );
    expect(screen.queryByLabelText("새 비밀번호")).not.toBeInTheDocument();

    await user.click(button("다시 요청하기"));
    expect(onNavSelect).toHaveBeenCalledWith("/password-reset");
  });

  it("검사 순서는 확인 불일치 → 규칙 → 완료, 완료에서 [로그인하기] 는 `/login`", async () => {
    const { user, onNavSelect } = renderAt(
      PasswordResetConfirmPage,
      "/password-reset/confirm?token=sample",
    );
    expect(screen.getByText(AUTH_TEXT.rule)).toBeInTheDocument();
    expect(button("비밀번호 변경")).toBeDisabled();

    /* 둘 다 틀렸을 때(규칙도 불통과 + 불일치) 불일치가 먼저 나온다 */
    await user.type(field("새 비밀번호"), "short");
    await user.type(field("새 비밀번호 확인"), "other");
    await user.click(button("비밀번호 변경"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "새 비밀번호와 확인 값이 일치하지 않습니다.",
    );

    /* 일치하지만 규칙 불통과(특수문자 없음) */
    await user.clear(field("새 비밀번호"));
    await user.clear(field("새 비밀번호 확인"));
    await user.type(field("새 비밀번호"), "abcd1234");
    await user.type(field("새 비밀번호 확인"), "abcd1234");
    await user.click(button("비밀번호 변경"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "비밀번호는 영문·숫자·특수문자를 조합해 8~16자로 입력해 주세요.",
    );

    /* 통과 → 완료 상태 */
    await user.clear(field("새 비밀번호"));
    await user.clear(field("새 비밀번호 확인"));
    await user.type(field("새 비밀번호"), "abcd1234!");
    await user.type(field("새 비밀번호 확인"), "abcd1234!");
    await user.click(button("비밀번호 변경"));

    expect(
      screen.getByText("비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("새 비밀번호")).not.toBeInTheDocument();
    expect(onNavSelect).not.toHaveBeenCalled();

    await user.click(button("로그인하기"));
    expect(onNavSelect).toHaveBeenCalledWith("/login");
  });

  it("17자는 규칙 불통과다 (8~16자)", async () => {
    const { user } = renderAt(
      PasswordResetConfirmPage,
      "/password-reset/confirm?token=sample",
    );
    await user.type(field("새 비밀번호"), "abcdefgh1234567!!");
    await user.type(field("새 비밀번호 확인"), "abcdefgh1234567!!");
    await user.click(button("비밀번호 변경"));
    expect(screen.getByRole("alert")).toHaveTextContent(AUTH_TEXT.ruleError);
  });
});
