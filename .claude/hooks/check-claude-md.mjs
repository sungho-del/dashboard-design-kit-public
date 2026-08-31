// .claude/hooks/check-claude-md.mjs
// SessionStart hook: 세션 시작 때마다 CLAUDE.md 비대 여부를 자동 감지.
// - 루트 CLAUDE.md + .claude/CLAUDE.md 를 "합산"으로 판단 (둘 다 매 세션 로드됨)
// - 임계 초과 / @import 자동 로드 발견 시에만 Claude에 정리 제안을 넛지
// - 건강하면 아무것도 출력하지 않음 (조용함)
// 실제 정리는 Claude가 4단계 승인 규칙에 따라 "제안 → 승인 → 적용" 한다.
// Node.js 기반이라 Windows/macOS/Linux 모두 동작.

import { readFileSync } from "fs";
import { join } from "path";

// ── 임계값 (필요하면 여기만 조정) ──
const PER_FILE = 200; // 파일 하나가 이 줄 수를 넘으면 신호
const COMBINED = 300; // 두 파일 합산이 이 줄 수를 넘으면 신호

// stdin(SessionStart 페이로드)은 쓰지 않지만, 파이프가 막히지 않게 비운다.
try {
  readFileSync(0, "utf8");
} catch {
  /* stdin 없음 — 무시 */
}

const root = process.cwd();
const TARGETS = [
  { label: "루트 CLAUDE.md", path: join(root, "CLAUDE.md") },
  { label: ".claude/CLAUDE.md", path: join(root, ".claude", "CLAUDE.md") },
];

// Claude Code 파일 import 문법(@경로/파일)만 잡고, @agent-... 류는 제외.
// 슬래시가 포함된 @참조 또는 @import 만 매칭한다.
// Claude Code 메모리 import 지시문만 잡는다: 줄 맨 앞에서 시작하는 @경로 이면서
// .md 파일을 가리키는 것. 스코프 npm 패키지명(@storybook/react 등)이나 본문 중
// 백틱 예시는 매칭하지 않는다.
const IMPORT_RE = /^\s*@[\w.~/-]+\.md\b/m;

const found = [];
let combined = 0;

for (const t of TARGETS) {
  let content;
  try {
    content = readFileSync(t.path, "utf8");
  } catch {
    continue; // 파일이 없으면 건너뜀 (템플릿 초기 상태 등)
  }
  const lines = content.split(/\r?\n/).length;
  combined += lines;
  const over = lines > PER_FILE;
  const imp = IMPORT_RE.test(content);
  found.push({ ...t, lines, over, imp });
}

if (found.length === 0) process.exit(0);

const reasons = [];
for (const f of found) {
  if (f.over)
    reasons.push(`${f.label} ${f.lines}줄 (파일 임계 ${PER_FILE} 초과)`);
  if (f.imp) reasons.push(`${f.label} 에서 @import 자동 로드 발견`);
}
if (combined > COMBINED) {
  reasons.push(`합산 ${combined}줄 (합산 임계 ${COMBINED} 초과)`);
}

// 신호가 없으면 조용히 종료
if (reasons.length === 0) process.exit(0);

const sizes = found.map((f) => `${f.label} ${f.lines}줄`).join(" · ");
const msg =
  `📄 CLAUDE.md 자동 점검 — 정리 검토 권장\n` +
  `현재: ${sizes} (합산 ${combined}줄)\n` +
  `사유: ${reasons.join(" / ")}\n\n` +
  `이 프로젝트 관례에 맞춰 정리가 필요할 수 있습니다. 원칙: ` +
  `상세 내용은 기존 docs/ 문서로 옮기고 CLAUDE.md에는 포인터만 남길 것 · ` +
  `두 CLAUDE.md의 분업 유지(루트=프로젝트 컨텍스트, .claude=작업 프로세스) · ` +
  `@import 자동 로드 금지.\n` +
  `⚠️ 바로 고치지 말 것: 먼저 정리 계획을 제안하고 사용자 승인을 받은 뒤 적용한다 ` +
  `(.claude/CLAUDE.md 4단계 승인 규칙).\n` +
  `사용자가 이번 세션에 다른 작업을 요청했다면 그 작업을 먼저 처리하고, 적절한 시점에 정리를 ` +
  `"제안"만 하라. 사용자가 미루면 반복해서 강요하지 말 것.`;

const output = {
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: msg,
  },
};
process.stdout.write(JSON.stringify(output));
process.exit(0);
