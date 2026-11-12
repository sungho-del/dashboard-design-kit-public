/* -------------------------------------------------------------------------
 * 인증 화면 4종의 **도메인 층** — 로그인 · 비밀번호 변경 · 비밀번호 찾기 · 비밀번호 재설정.
 *
 * ## 문구는 개발 저장소(`babycube-admin-hq` develop) 글자 그대로다
 * `src/app/(legacy)/login` · `password` · `password-reset` · `password-reset/confirm`.
 * 다른 곳은 하나 — 로그인 머리 「BabyCube 본사 어드민」→「베이비큐브 본사 어드민」(판정 Q17).
 * 문구를 보태지 말 것(대조표 `docs/추가작업요청_대조표_2026-11-10.md` 2절 A3).
 *
 * ## 서비스가 바뀌면 갈아끼울 것
 *   - `AUTH_TEXT` — 머리 · 칸 라벨 · 안내 · 오류 · 버튼
 *   - `AUTH_PATHS` — 화면 사이 이동 경로
 *   - `PASSWORD_RE` — 비밀번호 규칙(서버 규칙과 같아야 한다)
 * ---------------------------------------------------------------------- */

/** 화면 사이 이동 경로 — `App.tsx` 의 `ROUTES` 키와 같다 */
export const AUTH_PATHS = {
  home: "/",
  login: "/login",
  passwordReset: "/password-reset",
} as const;

/** 서버와 같은 규칙 — 영문·숫자·특수문자 조합 8~16자 (develop `PASSWORD_RE`) */
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,16}$/;

export const AUTH_TEXT = {
  /** 칸 라벨 */
  email: "아이디(이메일)",
  password: "비밀번호",
  currentPassword: "현재 비밀번호",
  newPassword: "새 비밀번호",
  confirmPassword: "새 비밀번호 확인",

  /** 규칙 줄 — 비밀번호 변경 · 재설정 입력 상태 */
  rule: "영문·숫자·특수문자를 조합해 8~16자로 입력해 주세요.",
  /** 화면이 직접 내는 오류 2개. 그 밖의 오류는 서버 문구다(퍼블에는 없다) */
  mismatch: "새 비밀번호와 확인 값이 일치하지 않습니다.",
  ruleError: "비밀번호는 영문·숫자·특수문자를 조합해 8~16자로 입력해 주세요.",

  login: {
    title: "베이비큐브 본사 어드민",
    /** 입점사 어드민 — 셀러 develop 「BabyCube 입점사 어드민」의 한글 표기(판정 Q17) */
    sellerTitle: "베이비큐브 입점사 어드민",
    find: "비밀번호 찾기",
    submit: "로그인",
  },
  change: {
    title: "비밀번호 변경",
    submit: "변경",
  },
  request: {
    title: "비밀번호 찾기",
    guide:
      "아이디(이메일)를 입력하면 비밀번호 재설정 링크를 메일로 보내 드립니다.",
    sent: "입력하신 이메일이 등록된 계정이면 재설정 안내를 보냈어요. 30분 안에 메일의 링크를 열어 주세요.",
    toLogin: "로그인으로",
    submit: "재설정 메일 보내기",
  },
  confirm: {
    title: "비밀번호 재설정",
    invalid:
      "링크가 만료됐거나 이미 사용됐어요. 비밀번호 찾기를 다시 요청해 주세요.",
    retry: "다시 요청하기",
    submit: "비밀번호 변경",
    done: "비밀번호를 변경했어요. 새 비밀번호로 로그인해 주세요.",
    toLogin: "로그인하기",
  },
} as const;
