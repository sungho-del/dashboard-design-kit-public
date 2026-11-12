import { useState, type FormEvent, type ReactNode } from "react";
import babycubeLogo from "../../assets/babycube-logo.svg";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  Input,
  Tag,
  TextButton,
} from "../../components/ui";
import { useSearchParams } from "../../lib/router";
import {
  AUTH_BRAND,
  AUTH_COPYRIGHT,
  AUTH_PATHS,
  AUTH_TEXT,
  PASSWORD_RE,
  type AuthAccount,
} from "./AuthPages.data";

/* -------------------------------------------------------------------------
 * 인증 화면 4종 — 로그인 `/login` · 비밀번호 변경 `/password` ·
 * 비밀번호 찾기 `/password-reset` · 비밀번호 재설정 `/password-reset/confirm?token=`
 *
 * ## 화면 유형: 템플릿 4종 밖 (셸 없는 가운데 창)
 * 메뉴(GNB)·페이지 머리 없이 **화면 가운데 창 하나**다(develop `AdminShell` 의 `AUTH_PAGES`).
 * 창 = 머리(로고 + 계정 칩 · 제목 · 안내) · 몸통(칸 · 오류) · 버튼 줄(주 버튼 꽉 차게 + 글자 버튼). 창 아래 저작권 줄.
 * 레퍼런스: 유아이볼 PC 관리자 로그인(리스닝마인드.AI · 핵클 · 잔디) — 로고가 폼보다 먼저 · 꽉 찬 버튼 · 폼 밖 신뢰 줄.
 * 화면 계약 props 4개는 받지만 `onNavSelect` 만 쓴다 — 로그인 전이라 메뉴가 없다.
 *
 * ## 갈아끼울 것 → `AuthPages.data.ts`
 * 머리 · 칸 라벨 · 안내 · 오류 · 버튼 문구, 이동 경로, 비밀번호 규칙.
 *
 * ## 그대로 두는 것
 *   - `AuthWindow` — 가운데 정렬 · 창 폭 · 로고 줄 · 오류 줄 자리 · 버튼 줄 · 저작권 줄
 *   - 앱 차이는 `account`(본사 / 입점사) 하나 — 칩 글자와 로그인 머리만 바뀐다. 입점사 앱이 네 화면 모두에 넘긴다
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
  /** 어느 어드민인가 — 로고 옆 칩 · 로그인 머리. 없으면 본사 */
  account?: AuthAccount;
}

interface AuthWindowProps {
  account: AuthAccount;
  title: string;
  /** 제목 아래 안내 한 줄 */
  description?: ReactNode;
  /** 오류 줄. 없으면 줄 자체를 그리지 않는다 */
  error?: string | null;
  /** 아래 버튼 줄 — 주 버튼(꽉 차게)이 위, 글자 버튼이 아래 */
  footer: ReactNode;
  onSubmit?: () => void;
  children: ReactNode;
}

/**
 * 로고 + 계정 칩 — GNB 로고 슬롯과 같은 꼴(워드마크 114 · 반전 칩 · `gnbSections.tsx`).
 * 인증 화면은 셸 밖이라 GNB 슬롯을 가져오지 않고 여기서 그린다(입점사 전달본엔 본사 GNB 파일이 없다)
 */
function BrandMark({ account }: { account: AuthAccount }) {
  return (
    <span className="flex items-center gap-2">
      <img
        src={babycubeLogo}
        alt="BabyCube"
        className="block w-(--size-gnb-logo) shrink-0"
      />
      <Tag
        tone="custom"
        size="small"
        style={{
          "--tag-bg-color": "var(--color-surface-inverse)",
          "--tag-color": "var(--color-text-inverse)",
        }}
      >
        {AUTH_BRAND[account].chip}
      </Tag>
    </span>
  );
}

/** 화면 가운데 창 하나 — 네 화면이 함께 쓰는 뼈대 */
function AuthWindow({
  account,
  title,
  description,
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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg px-4 py-10">
      {/* 창 폭은 Modal small 과 같은 상한 400 */}
      <form className="w-full max-w-100" onSubmit={submit} noValidate>
        <Card elevated>
          <CardHeader>
            <div className="flex flex-col gap-6">
              <BrandMark account={account} />
              <div className="flex flex-col gap-1">
                {/* 셸이 없어 이 머리가 화면의 유일한 제목이다 */}
                <h1 className="heading-xlarge-bold text-text">{title}</h1>
                {description ? (
                  <p className="body-medium text-text-sub">{description}</p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {children}
            {error ? (
              <p role="alert" className="body-small text-text-critical">
                {error}
              </p>
            ) : null}
          </CardBody>
          <div className="flex flex-col items-center gap-3">{footer}</div>
        </Card>
      </form>
      <p className="body-small text-text-sub">{AUTH_COPYRIGHT}</p>
    </main>
  );
}

/** 안내·규칙 줄 */
function Guide({ children }: { children: ReactNode }) {
  return <p className="body-medium text-text-sub">{children}</p>;
}

/* ── 로그인 ─────────────────────────────────────────────────────────── */

/**
 * 로그인 — 머리 · 안내 · 칩만 앱마다 다르다(`AUTH_BRAND`).
 * 입점사 어드민은 같은 네 화면을 그대로 쓴다(셀러 develop 문구가 본사와 같다 · 개발 요청 2026-11-12 1번)
 */
export function LoginPage({ onNavSelect, account = "본사" }: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthWindow
      account={account}
      title={AUTH_BRAND[account].loginTitle}
      description={AUTH_BRAND[account].loginGuide}
      /* 실패는 서버가 판정한다 — 퍼블에는 실패 경로가 없어 오류 줄이 뜨지 않는다 */
      error={null}
      onSubmit={() => onNavSelect(AUTH_PATHS.home)}
      footer={
        <>
          <Button
            type="submit"
            size="large"
            fullWidth
            disabled={!email || !password}
          >
            {AUTH_TEXT.login.submit}
          </Button>
          <TextButton
            tone="secondary"
            onClick={() => onNavSelect(AUTH_PATHS.passwordReset)}
          >
            {AUTH_TEXT.login.find}
          </TextButton>
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

export function PasswordChangePage({
  onNavSelect,
  account = "본사",
}: AuthPageProps) {
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
      account={account}
      title={AUTH_TEXT.change.title}
      error={error}
      onSubmit={submit}
      footer={
        <Button
          type="submit"
          size="large"
          fullWidth
          disabled={!current || !next || !confirm}
        >
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

export function PasswordResetRequestPage({
  onNavSelect,
  account = "본사",
}: AuthPageProps) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <AuthWindow
      account={account}
      title={AUTH_TEXT.request.title}
      onSubmit={() => setSent(true)}
      footer={
        <>
          {sent ? null : (
            <Button
              type="submit"
              size="large"
              fullWidth
              disabled={!email.trim()}
            >
              {AUTH_TEXT.request.submit}
            </Button>
          )}
          <TextButton
            tone="secondary"
            onClick={() => onNavSelect(AUTH_PATHS.login)}
          >
            {AUTH_TEXT.request.toLogin}
          </TextButton>
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

export function PasswordResetConfirmPage({
  onNavSelect,
  account = "본사",
}: AuthPageProps) {
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
        account={account}
        title={AUTH_TEXT.confirm.title}
        footer={
          <Button
            size="large"
            fullWidth
            onClick={() => onNavSelect(AUTH_PATHS.login)}
          >
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
        account={account}
        title={AUTH_TEXT.confirm.title}
        footer={
          <Button
            size="large"
            fullWidth
            onClick={() => onNavSelect(AUTH_PATHS.passwordReset)}
          >
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
      account={account}
      title={AUTH_TEXT.confirm.title}
      error={error}
      onSubmit={submit}
      footer={
        <Button
          type="submit"
          size="large"
          fullWidth
          disabled={!next || !confirm}
        >
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
