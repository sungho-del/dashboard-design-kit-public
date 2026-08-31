// .claude/hooks/notify.mjs
// Notification hook: Claude가 입력 대기 시 OS 알림
// macOS: osascript, Windows: 시스템 사운드, Linux: notify-send
//
// ⚠️ 이 훅은 **절대 블로킹되면 안 된다.**
// 이전 구현은 Windows 에서 `MessageBox.Show` 모달을 띄우고 `execSync` 로 기다렸다.
// 사용자가 확인을 누르기 전까지 프로세스가 끝나지 않아 **세션 전체가 멈췄다.**
// (`stdio: "ignore"` 는 출력만 버릴 뿐 프로세스 종료를 기다리는 것은 그대로다.)
//
// 그래서 지금은 두 가지를 지킨다:
//   1. 모달을 쓰지 않는다 — 사용자 입력을 요구하지 않는 알림만 쓴다
//   2. `spawn(detached).unref()` 로 띄우고 곧바로 종료한다 — 기다리지 않는다
//
// 끄고 싶으면 환경변수: CLAUDE_NOTIFY=0

import { spawn } from "child_process";
import { platform } from "os";

if (process.env.CLAUDE_NOTIFY === "0") process.exit(0);

const MESSAGE = "Claude Code 입력 대기 중";
const TITLE = "Claude Code";

/** 자식 프로세스를 부모와 분리해 띄운다 — 부모는 결과를 기다리지 않는다 */
function fireAndForget(command, args) {
  try {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    // 실패해도 훅이 작업을 막으면 안 되므로 조용히 무시한다
    child.on("error", () => {});
    child.unref();
  } catch {
    // 알림 실패는 무시 (훅이 작업을 차단하면 안 됨)
  }
}

switch (platform()) {
  case "darwin":
    fireAndForget("osascript", [
      "-e",
      `display notification "${MESSAGE}" with title "${TITLE}"`,
    ]);
    break;

  case "win32":
    /*
     * 모달(MessageBox) 대신 **시스템 사운드**만 낸다.
     * 토스트(Windows.UI.Notifications)는 PowerShell 에서 WinRT 로딩이 필요해
     * 환경에 따라 실패하고, BurntToast 같은 외부 모듈에 의존하게 된다.
     * 알림 훅 하나 때문에 기획자에게 모듈 설치를 요구할 수는 없다.
     */
    fireAndForget("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "[System.Media.SystemSounds]::Asterisk.Play(); Start-Sleep -Milliseconds 400",
    ]);
    break;

  default:
    fireAndForget("notify-send", [TITLE, MESSAGE]);
    break;
}

process.exit(0);
