import { Avatar, Button } from "../components/ui";

/* =========================================================================
 * 계정 묶음 — 계정 줄(`AppShell` 의 `topBar`) 안에 놓는 내용
 *
 * 로그인한 계정이 누구인지(이름 · 역할) 보여 주고 로그아웃시킨다.
 * 줄의 틀(높이 48 · 좌우 40 · 아래 선)은 `AppShell` 이 그리고, 여기는 내용만 조립한다.
 *
 * ## 왜 UI 부품이 아니라 페이지 계층인가
 *
 * `Avatar` + 글자 + `Button` 의 조립이라 새 부품이 필요 없다. 본사·셀러가 같은 조립을 값만 바꿔 쓴다.
 * 화면 파일에 두지 않는 이유는 로고와 같다 — `App → 화면 → App` 순환이 되고,
 * 넣는 곳은 진입점(`App.tsx` · `SellerApp.tsx`)의 `AppShellProvider` 하나다.
 *
 * ## 개발이 갈아끼울 것 — 세 가지뿐
 *
 * `name` · `role`(지금은 `gnbSections.tsx` · `sellerGnbSections.tsx` 의 예시 값) · `onLogout`.
 *
 * ## 그대로 두는 것
 *
 * - 눌리는 것은 [로그아웃] 하나다. 아바타·이름은 갈 곳이 없어 버튼이 아니다(hover·포인터 없음)
 * - 아바타는 **장식**이다 — `Avatar` 는 이니셜일 때 스스로 `img` + 이름을 내므로 숨기지 않으면
 *   「운영관리자, 운영관리자 · 본사 운영관리자」로 이름이 두 번 읽힌다
 * - 글자 묶음은 최대 320 · 끝 말줄임. 읽히는 문자열과 `title` 은 전체다. 버튼은 줄어들지 않는다
 * - 확인 창 · disabled · loading 없음 — 퍼블에서는 누르면 바로 떠난다
 * ========================================================================= */

export interface AccountBarProps {
  /** 이름 (셀러는 스토어명) */
  name: string;
  /** 역할 — 여럿이면 「 · 」로 이은 한 줄로 받는다 */
  role: string;
  /** [로그아웃]을 눌렀을 때 */
  onLogout: () => void;
}

export function AccountBar({ name, role, onLogout }: AccountBarProps) {
  const full = `${name} · ${role}`;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex min-w-0 items-center gap-2">
        <Avatar name={name} size="small" aria-hidden />
        {/*
          보이는 글자는 이름(굵게)과 역할로 나뉘지만 **읽히는 문자열은 하나**다 —
          `aria-label` 이 아니라 같은 요소 안의 글자라 말줄임돼도 전체가 읽힌다.
        */}
        <span
          className="max-w-80 truncate label-medium text-text-sub"
          title={full}
        >
          <span className="label-medium-bold text-text">{name}</span>
          {` · ${role}`}
        </span>
      </span>
      <Button
        variant="secondary"
        size="small"
        className="shrink-0"
        onClick={onLogout}
      >
        로그아웃
      </Button>
    </div>
  );
}
