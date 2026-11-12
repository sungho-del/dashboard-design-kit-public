import { useState, type FormEvent, type ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  FormField,
  Input,
} from "../../components/ui";
import { useSearchParams } from "../../lib/router";
import { AUTH_PATHS, AUTH_TEXT, PASSWORD_RE } from "./AuthPages.data";

/* -------------------------------------------------------------------------
 * 인증 화면 4종 — 로그인 `/login` · 비밀번호 변경 `/password` ·
 * 비밀번호 찾기 `/password-reset` · 비밀번호 재설정 `/password-reset/confirm?token=`
 *
 * ## 화면 유형: 템플릿 4종 밖 (셸 없는 가운데 창)
 * 메뉴(GNB)·페이지 머리 없이 **화면 가운데 창 하나**다(develop `AdminShell` 의 `AUTH_PAGES`).
 * 창 = 머리(`CardHeader`) · 몸통(`CardBody`) · 아래 버튼 줄(`CardFooter`).
 * 화면 계약 props 4개는 받지만 `onNavSelect` 만 쓴다 — 로그인 전이라 메뉴가 없다.
 *
 * ## 갈아끼울 것 → `AuthPages.data.ts`
 * 머리 · 칸 라벨 · 안내 · 오류 · 버튼 문구, 이동 경로, 비밀번호 규칙.
 *
 * ## 그대로 두는 것
 *   - `AuthWindow` — 가운데 정렬 · 창 폭 · 오류 줄 자리 · 버튼 줄
 *   - 간격은 `Card` gap-4 · `CardBody` gap-5 · `FormField` gap-1.5 가 준다(직접 지정하지 않는다)
 *
 * ## 퍼블 범위
 * 실제 인증·메일 발송은 없다. 화면이 직접 판정하는 것(빈 칸 · 확인 불일치 · 규칙 · 토큰 유무)만
 * 그리고, **서버가 주는 오류는 그리지 않는다** — 오류 줄 자리(`AuthWindow` 의 `error`)만 있다.
 * 개발이 붙일 것: 처리 중 버튼 잠금(`busy`) · 서버 오류 문구 · 로그인 뒤 `?ret=` 복귀 ·
 * 재설정 400(링크 무효) → 링크 무효 상태.
 * ---------------------------------------------------------------------- */

/** 모든 화면이 받는 계약. 인증 화면은 셸을 그리지 않아 `onNavSelect` 만 쓴다 */
interface AuthPageProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  activeNav: string;
  onNavSelect: (path: string) => void;
}

interface AuthWindowProps {
  title: string;
  /** 오류 줄. 없으면 줄 자체를 그리지 않는다 */
  error?: string | null;
  /** 아래 버튼 줄 */
  footer: ReactNode;
  onSubmit?: () => void;
  children: ReactNode;
}

/** 화면 가운데 창 하나 — 네 화면이 함께 쓰는 뼈대 */
function AuthWindow({
  title,
  error,
  footer,
  onSubmit,
  children,
}: AuthWindowProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg">
      {/* 창 폭은 Modal small 과 같은 상한 400 */}
      <form className="w-full max-w-100" onSubmit={submit} noValidate>
        <Card>
          <CardHeader>
            {/* 셸이 없어 이 머리가 화면의 유일한 제목이다 */}
            <h1 className="heading-medium-bold text-text">{title}</h1>
          </CardHeader>
          <CardBody>
            {children}
            {error ? (
              <p role="alert" className="body-small text-text-critical">
                {error}
              </p>
            ) : null}
          </CardBody>
          <CardFooter>{footer}</CardFooter>
        </Card>
      </form>
    </main>
  );
}

/** 안내·규칙 줄 */
function Guide({ children }: { children: ReactNode }) {
  return <p className="body-medium text-text-sub">{children}</p>;
}

/* ── 로그인 ─────────────────────────────────────────────────────────── */

/**
 * 로그인 — 머리 글자만 앱마다 다르다(본사 「베이비큐브 본사 어드민」 · 입점사 「베이비큐브 입점사 어드민」).
 * 입점사 어드민은 같은 네 화면을 그대로 쓴다(셀러 develop 문구가 본사와 같다 · 개발 요청 2026-11-12 1번)
 */
export function LoginPage({
  onNavSelect,
  title = AUTH_TEXT.login.title,
}: AuthPageProps & { title?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthWindow
      title={title}
      /* 실패는 서버가 판정한다 — 퍼블에는 실패 경로가 없어 오류 줄이 뜨지 않는다 */
      error={null}
      onSubmit={() => onNavSelect(AUTH_PATHS.home)}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onNavSelect(AUTH_PATHS.passwordReset)}
          >
            {AUTH_TEXT.login.find}
          </Button>
          <Button type="submit" disabled={!email || !password}>
            {AUTH_TEXT.login.submit}
          </Button>
        </>
      }
    >
      <FormField label={AUTH_TEXT.email}>
        <Input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>
      <FormField label={AUTH_TEXT.password}>
        <Input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </FormField>
    </AuthWindow>
  );
}

/* ── 비밀번호 변경 (강제 변경 때만 오는 화면 — 취소·로그아웃 없음) ──── */

export function PasswordChangePage({ onNavSelect }: AuthPageProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  /* 화면은 확인 일치만 본다 — 규칙 판정은 서버 몫이다(develop 과 같다) */
  const submit = () => {
    if (next !== confirm) {
      setError(AUTH_TEXT.mismatch);
      return;
    }
    setError(null);
    onNavSelect(AUTH_PATHS.home);
  };

  return (
    <AuthWindow
      title={AUTH_TEXT.change.title}
      error={error}
      onSubmit={submit}
      footer={
        <Button type="submit" disabled={!current || !next || !confirm}>
          {AUTH_TEXT.change.submit}
        </Button>
      }
    >
      <Guide>{AUTH_TEXT.rule}</Guide>
      <FormField label={AUTH_TEXT.currentPassword}>
        <Input
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
        />
      </FormField>
      <FormField label={AUTH_TEXT.newPassword}>
        <Input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
      </FormField>
      <FormField label={AUTH_TEXT.confirmPassword}>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </FormField>
    </AuthWindow>
  );
}

/* ── 비밀번호 찾기 (재설정 메일 요청) ───────────────────────────────── */

export function PasswordResetRequestPage({ onNavSelect }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthWindow
      title={AUTH_TEXT.request.title}
      onSubmit={() => setSent(true)}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => onNavSelect(AUTH_PATHS.login)}
          >
            {AUTH_TEXT.request.toLogin}
          </Button>
          {sent ? null : (
            <Button type="submit" disabled={!email.trim()}>
              {AUTH_TEXT.request.submit}
            </Button>
          )}
        </>
      }
    >
      {sent ? (
        /* 계정이 있든 없든 같은 문구다(계정 열거 방지) */
        <Guide>{AUTH_TEXT.request.sent}</Guide>
      ) : (
        <>
          <Guide>{AUTH_TEXT.request.guide}</Guide>
          <FormField label={AUTH_TEXT.email}>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormField>
        </>
      )}
    </AuthWindow>
  );
}

/* ── 비밀번호 재설정 (메일 링크 `?token=`) — 링크 무효 / 입력 / 완료 ── */

export function PasswordResetConfirmPage({ onNavSelect }: AuthPageProps) {
  const token = useSearchParams().get("token") ?? "";
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  /* 검사 순서: 확인 불일치 → 규칙. 통과하면 완료 상태 */
  const submit = () => {
    if (next !== confirm) {
      setError(AUTH_TEXT.mismatch);
      return;
    }
    if (!PASSWORD_RE.test(next)) {
      setError(AUTH_TEXT.ruleError);
      return;
    }
    setError(null);
    setDone(true);
  };

  if (done) {
    return (
      <AuthWindow
        title={AUTH_TEXT.confirm.title}
        footer={
          <Button onClick={() => onNavSelect(AUTH_PATHS.login)}>
            {AUTH_TEXT.confirm.toLogin}
          </Button>
        }
      >
        <Guide>{AUTH_TEXT.confirm.done}</Guide>
      </AuthWindow>
    );
  }

  /* 토큰 없이 들어오면 링크 무효. 만료·사용된 링크는 서버가 알려 준다(퍼블에는 없다) */
  if (token === "") {
    return (
      <AuthWindow
        title={AUTH_TEXT.confirm.title}
        footer={
          <Button onClick={() => onNavSelect(AUTH_PATHS.passwordReset)}>
            {AUTH_TEXT.confirm.retry}
          </Button>
        }
      >
        <p role="alert" className="body-medium text-text-sub">
          {AUTH_TEXT.confirm.invalid}
        </p>
      </AuthWindow>
    );
  }

  return (
    <AuthWindow
      title={AUTH_TEXT.confirm.title}
      error={error}
      onSubmit={submit}
      footer={
        <Button type="submit" disabled={!next || !confirm}>
          {AUTH_TEXT.confirm.submit}
        </Button>
      }
    >
      <Guide>{AUTH_TEXT.rule}</Guide>
      <FormField label={AUTH_TEXT.newPassword}>
        <Input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
        />
      </FormField>
      <FormField label={AUTH_TEXT.confirmPassword}>
        <Input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
        />
      </FormField>
    </AuthWindow>
  );
}
