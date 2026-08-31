#!/usr/bin/env node
/**
 * 새 프로젝트 시작 — 데모 화면을 걷어내고 템플릿만 남긴다.
 *
 * ## 왜 필요한가
 *
 * 이 저장소에는 실증용으로 만든 화면 34개(BabyCube 28 · 차트온 4 · 클래스온 2)가
 * 들어 있다. 참고용으로는 좋지만, 자기 프로젝트를 시작하는 사람에게는 방해가 된다:
 *
 *   - GNB(`gnbSections.tsx`)가 BabyCube 메뉴 28항목으로 채워져 있고,
 *     **모든 화면이 그 메뉴를 공유한다** — 내 화면을 만들어도 사이드바는 남의 것이다
 *   - 루트 경로 `/` 를 BabyCube 대시보드가 점유해, 새 화면은 접두사 신세가 된다
 *   - `DashboardPage` · `OrderListPage` 같은 흔한 이름을 이미 선점하고 있다
 *
 * 그래서 **한 번 실행해서 깨끗한 출발점**을 만든다. 걷어낸 화면이 다시 보고 싶으면
 * 공개 저장소에서 언제든 볼 수 있다 — 로컬에 이고 다닐 이유가 없다.
 *
 * ## 무엇이 남는가
 *
 *   남는다 → 템플릿 4종 · UI 컴포넌트 37종 · 토큰 · 문서 · 에이전트 · 커맨드
 *   사라진다 → 데모 화면 34종 · BabyCube 메뉴/로고 · 이전 파이프라인 산출물
 *
 * ## 사용법
 *
 *   npm run reset:project            확인 프롬프트 후 실행
 *   npm run reset:project -- --yes   묻지 않고 실행
 *   npm run reset:project -- --dry   무엇이 바뀌는지만 보여주고 끝낸다
 *   npm run reset:project -- --force 이미 리셋된 폴더에서도 강행 (아래 경고 참조)
 *
 * ## ⚠️ 두 번 돌리면 안 된다
 *
 * 이 스크립트는 `App.tsx` · `routes.ts` · `gnbSections.tsx` 를 **템플릿으로 덮는다.**
 * 화면을 다 만든 뒤에 다시 돌리면 당신이 추가한 경로와 메뉴가 통째로 사라진다.
 * 그래서 지울 데모가 남아 있지 않으면 **먼저 멈춘다** — 정말 되돌리려면 `--force`.
 */
import { createInterface } from "node:readline/promises";
import { existsSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TPL = join(ROOT, "scripts", "reset-project");

const args = new Set(process.argv.slice(2));
const YES = args.has("--yes") || args.has("-y");
const DRY = args.has("--dry") || args.has("--dry-run");
const FORCE = args.has("--force");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

/** 통째로 지울 디렉터리 — 다른 서비스 도메인의 생성물 */
const REMOVE_DIRS = ["src/pages/babycube", "src/pages/classon"];

/**
 * 지울 파일. 차트온 4종은 `src/pages/` 루트에 템플릿과 섞여 있어 폴더째 지울 수 없다.
 * 화면 하나가 3파일(.tsx / .data.ts / .test.tsx)이므로 접두사로 훑는다.
 */
const REMOVE_PAGE_PREFIXES = [
  "ClinicStatusPage",
  "ReservationListPage",
  "ReservationDetailPage",
  "PatientFormPage",
];

/** BabyCube 전용 에셋 — 새 GNB 는 이미지를 쓰지 않는다 */
const REMOVE_FILES = [
  "src/assets/babycube-logo.svg",
  "src/assets/babycube-symbol.svg",
];

/** 이전 서비스의 파이프라인 산출물. `README.md` 는 사용법이라 남긴다 */
const PIPELINE_KEEP = new Set(["README.md"]);

/** 템플릿 → 갈아끼울 자리 */
const REPLACE = [
  ["App.tsx.tpl", "src/App.tsx"],
  ["routes.ts.tpl", "src/pages/routes.ts"],
  ["App.test.tsx.tpl", "src/App.test.tsx"],
  ["gnbSections.tsx.tpl", "src/pages/gnbSections.tsx"],
  ["ScreenIndexPage.data.ts.tpl", "src/pages/ScreenIndexPage.data.ts"],
  ["ScreenIndexPage.test.tsx.tpl", "src/pages/ScreenIndexPage.test.tsx"],
];

/* ── 계획 세우기 (지우기 전에 전부 모아서 보여준다) ───────────────────── */

const plan = { dirs: [], files: [], replace: [], pipeline: [] };

for (const d of REMOVE_DIRS) {
  const abs = join(ROOT, d);
  if (!existsSync(abs)) continue;
  const count = countFiles(abs);
  plan.dirs.push({ path: d, count });
}

const pagesDir = join(ROOT, "src", "pages");
if (existsSync(pagesDir)) {
  for (const name of readdirSync(pagesDir)) {
    if (REMOVE_PAGE_PREFIXES.some((p) => name.startsWith(p))) {
      plan.files.push(`src/pages/${name}`);
    }
  }
}

for (const f of REMOVE_FILES) {
  if (existsSync(join(ROOT, f))) plan.files.push(f);
}

const pipelineDir = join(ROOT, "pipeline");
if (existsSync(pipelineDir)) {
  for (const name of readdirSync(pipelineDir)) {
    if (!PIPELINE_KEEP.has(name)) plan.pipeline.push(`pipeline/${name}`);
  }
}

for (const [tpl, target] of REPLACE) {
  const src = join(TPL, tpl);
  if (!existsSync(src)) {
    console.error(c.red(`[중단] 템플릿이 없습니다: ${relative(ROOT, src)}`));
    process.exit(1);
  }
  plan.replace.push(target);
}

const totalRemoved =
  plan.dirs.reduce((n, d) => n + d.count, 0) +
  plan.files.length +
  plan.pipeline.length;

/* ── 보고 ──────────────────────────────────────────────────────────── */

console.log(`\n${c.bold("새 프로젝트 시작 — 데모 화면을 걷어냅니다")}\n`);

/*
 * ⚠️ 지울 데모가 하나도 없다 = **이미 리셋된 폴더다.**
 *
 * 그대로 진행하면 `App.tsx` · `routes.ts` · `gnbSections.tsx` 를 템플릿으로 덮어,
 * 그동안 추가한 경로와 메뉴가 통째로 사라진다. 그래서 먼저 멈춘다.
 *
 * (예전 판정은 `plan.replace.length === 0` 도 함께 봤는데, 템플릿 파일은 항상 있으므로
 *  그 조건이 참이 되는 일이 없어 **이 분기가 한 번도 실행되지 않았다.**)
 */
if (totalRemoved === 0 && !FORCE) {
  console.log(
    c.green("이미 리셋된 폴더입니다 — 걷어낼 데모 화면이 없습니다.\n"),
  );
  console.log(
    `${c.red("여기서 멈춥니다.")} 계속하면 아래가 ${c.bold("템플릿 상태로 되돌아갑니다")}:`,
  );
  for (const t of plan.replace) console.log(`  ${t}`);
  console.log(
    `\n  ${c.dim("화면을 이미 만들었다면 추가한 경로와 메뉴가 사라집니다.")}`,
  );
  console.log(
    `  ${c.dim("그래도 되돌리려면:")} ${c.cyan("npm run reset:project -- --force")}\n`,
  );
  process.exit(0);
}

if (plan.dirs.length || plan.files.length) {
  console.log(c.red("지웁니다 — 다른 서비스 도메인의 생성물"));
  for (const d of plan.dirs) {
    console.log(`  ${d.path}/ ${c.dim(`(${d.count}파일)`)}`);
  }
  for (const f of plan.files) console.log(`  ${f}`);
  console.log("");
}

if (plan.pipeline.length) {
  console.log(c.red("지웁니다 — 이전 기획서의 파이프라인 산출물"));
  for (const f of plan.pipeline) console.log(`  ${f}`);
  console.log("");
}

console.log(c.cyan("갈아끼웁니다 — 템플릿 4종만 남긴 깨끗한 버전으로"));
for (const t of plan.replace) console.log(`  ${t}`);
console.log("");

console.log(c.green("그대로 남습니다"));
console.log(
  `  ${c.dim("템플릿 4종 · UI 컴포넌트 37종 · tokens/ · docs/ · .claude/ (에이전트·커맨드)")}\n`,
);

console.log(
  c.dim(
    "걷어낸 화면은 공개 저장소에서 언제든 다시 볼 수 있습니다:\n" +
      "  https://github.com/sungho-del/dashboard-design-kit-public\n",
  ),
);

if (DRY) {
  console.log(
    c.dim("--dry 라서 여기서 멈춥니다. 아무것도 바꾸지 않았습니다.\n"),
  );
  process.exit(0);
}

/* ── 확인 ──────────────────────────────────────────────────────────── */

if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `${c.bold("정말 진행할까요?")} 되돌리려면 git 으로 복구해야 합니다. (y/N) `,
  );
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("\n취소했습니다. 아무것도 바꾸지 않았습니다.\n");
    process.exit(0);
  }
}

/* ── 실행 ──────────────────────────────────────────────────────────── */

for (const d of plan.dirs)
  rmSync(join(ROOT, d.path), { recursive: true, force: true });
for (const f of [...plan.files, ...plan.pipeline])
  rmSync(join(ROOT, f), { force: true });
for (const [tpl, target] of REPLACE)
  copyFileSync(join(TPL, tpl), join(ROOT, target));

console.log(
  `\n${c.green("완료")} — ${totalRemoved}개 파일을 지우고 ${plan.replace.length}개를 갈아끼웠습니다.\n`,
);
console.log(c.bold("다음으로 할 일"));
console.log(
  `  1. ${c.cyan("npm test -- --run")}   ${c.dim("깨진 데 없는지 확인 (여기서 통과해야 합니다)")}`,
);
console.log(
  `  2. ${c.cyan("npm run dev")}         ${c.dim("첫 화면이 대시보드 템플릿입니다")}`,
);
console.log(
  `  3. 기획서나 프로토타입 주소를 준비해 ${c.cyan("프로젝트 작업 진행 시작")} 이라고 입력\n`,
);
console.log(
  c.dim(
    "이 스크립트는 한 번만 쓰면 됩니다. 지워도 됩니다: scripts/reset-project.mjs · scripts/reset-project/\n",
  ),
);

/** 디렉터리 안의 파일 수를 센다 (하위 폴더 포함) */
function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return n;
}
