#!/usr/bin/env node
/**
 * 퍼블리싱 전달본 추출 — BabyCube 본사 어드민 화면만 **독립 Vite 프로젝트**로 뽑는다.
 *
 * ## 무엇을 만드나
 *
 * 받는 저장소(`babycube-admin-hq`)의 `publishing/` 에 들어갈 폴더 하나.
 * 사용자 화면(`babycube-user` PR #1)을 전달한 것과 같은 형태다:
 * React 19 + TS + Vite + Tailwind v4, 예시 데이터로 동작, API 미연동.
 *
 *   들어간다 → BabyCube 화면(`src/pages/babycube`) · UI 컴포넌트(stories 제외) · 토큰 · lib · 폰트
 *   빠진다   → 템플릿·차트온·클래스온 데모 · Storybook · `.claude`·`pipeline`·`docs` 등 생성 도구
 *
 * ## 규칙 (README 에도 적힌다)
 *
 *   - `publishing/` 은 **읽기 전용 기준본**이다. 수정은 이 저장소에서 하고 다시 추출한다
 *   - **빈 폴더에만** 추출한다. 덮어쓰지 않는다 — 다시 낼 때는 받는 저장소에서
 *     직전 전달 이후 `publishing/` 이 바뀌었는지 먼저 확인한 뒤 지우고 추출한다
 *     (`git log <직전 전달 커밋>.. -- publishing/`). 바뀌었으면 멈추고 이 저장소에 반영할지 판단
 *
 * ## 왜 `git archive` 인가
 *
 * 디스크가 아니라 **커밋된 바이트**를 꺼낸다. 그래서 워킹 트리가 깨끗해야 하고,
 * 추출 기준 커밋(`{{SOURCE_COMMIT}}`)이 곧 전달 버전이다.
 *
 * ## 사용법
 *
 *   npm run export:publishing -- <출력 폴더>
 *   예) npm run export:publishing -- ../babycube-admin-hq/publishing
 *
 * 전달용으로 바꾸는 파일은 아래 `TRANSFORMS` 에 있다. 각 치환은 **반드시 한 번 이상 맞아야**
 * 하고, 안 맞으면 멈춘다 — 원본이 바뀌어 치환이 조용히 빗나가면 데모가 섞여 나간다.
 * 전달본에만 있는 파일(README·문서·App 테스트)은 `scripts/export-publishing/` 에 있다.
 */
import { execFileSync, execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXTRA = join(ROOT, "scripts", "export-publishing");

const git = (args, opts = {}) =>
  execFileSync("git", args, { cwd: ROOT, encoding: "utf8", ...opts });

function fail(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

/* ── 0. 입력 확인 ─────────────────────────────────────────────── */

const outArg = process.argv[2];
if (!outArg)
  fail("출력 폴더를 지정하세요: npm run export:publishing -- <폴더>");
const OUT = resolve(process.cwd(), outArg);

if (OUT === ROOT || OUT.startsWith(ROOT + "\\") || OUT.startsWith(ROOT + "/"))
  fail(
    `출력 폴더가 이 저장소 안에 있습니다: ${OUT}\n  Tailwind·TS·테스트가 그 사본까지 읽게 됩니다. 저장소 밖을 지정하세요.`,
  );

if (existsSync(OUT) && readdirSync(OUT).length > 0)
  fail(
    `출력 폴더가 비어 있지 않습니다: ${OUT}\n` +
      "  덮어쓰지 않습니다. 받는 저장소에서 `git log <직전 전달 커밋>.. -- publishing/` 로\n" +
      "  그사이 수정이 없는지 확인한 뒤 폴더를 지우고 다시 실행하세요.",
  );

if (git(["status", "--porcelain"]).trim())
  fail(
    "워킹 트리가 깨끗하지 않습니다. 커밋된 상태만 추출합니다 — 먼저 커밋하세요.",
  );

const commit = git(["rev-parse", "--short", "HEAD"]).trim();

/* ── 1. 커밋된 파일 추출 ──────────────────────────────────────── */

const INCLUDE = [
  "index.html",
  "package.json",
  "tsconfig.json",
  "tsconfig.app.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "eslint.config.js",
  "style-dictionary.config.mjs",
  "vercel.json",
  "LICENSE",
  "tokens",
  "public/fonts",
  "src/main.tsx",
  "src/index.css",
  "src/vite-env.d.ts",
  "src/App.tsx",
  "src/assets",
  "src/components/ui",
  "src/lib",
  "src/shadcn",
  "src/styles",
  "src/test",
  "src/tokens",
  "src/pages/babycube",
  "src/pages/gnbSections.tsx",
  "src/pages/routes.ts",
  "src/pages/ScreenIndexPage.tsx",
  "src/pages/ScreenIndexPage.data.ts",
];

mkdirSync(OUT, { recursive: true });
const tar = execFileSync(
  "git",
  [
    "archive",
    "--format=tar",
    "HEAD",
    "--",
    ...INCLUDE,
    ":(exclude)*.stories.tsx",
  ],
  { cwd: ROOT, maxBuffer: 1 << 30 },
);
/* -C 대신 cwd — GNU tar 는 `C:…` 의 콜론을 원격 호스트로 읽는다 */
execFileSync("tar", ["-x"], { cwd: OUT, input: tar });

/* ── 2. 전달용 치환 ───────────────────────────────────────────── */

/** [찾을 것, 바꿀 것] — 문자열이면 정확히 일치, 정규식이면 g 플래그로 전부 */
const TRANSFORMS = {
  "index.html": [
    ['lang="en"', 'lang="ko"'],
    [/\s*<link rel="icon"[^>]*vite\.svg"[^>]*\/>/g, ""],
    [
      "<title>대시보드 디자인 키트</title>",
      "<title>베이비큐브 본사 어드민 — 퍼블리싱</title>",
    ],
  ],
  "eslint.config.js": [
    ['import storybook from "eslint-plugin-storybook";\n', ""],
    ['  ...storybook.configs["flat/recommended"],\n', ""],
    [/\{ ignores: \[[^\]]*\] \}/g, '{ ignores: ["dist"] }'],
  ],
  /* 전달본에 없는 문서(CLAUDE.md)를 근거로 가리키는 주석은 README §3 으로 돌린다 */
  "src/styles/tokens.css": [
    [/^@source "\.\.\/\.\.\/\.storybook";.*\n/gm, ""],
    ['CLAUDE.md "토큰 사용"', "README §3"],
  ],
  "src/pages/babycube/DashboardPage.tsx": [
    ["(CLAUDE.md · Clay 아이콘 규격)", "(Clay 아이콘 규격 · README §3)"],
  ],
  "src/App.tsx": [
    [
      /^import \{[^}]*\} from "\.\/pages\/(ClinicStatusPage|DashboardPage|OrderDetailPage|OrderListPage|PatientFormPage|ProductFormPage|ReservationDetailPage|ReservationListPage|routes|classon\/\w+)";\n/gm,
      "",
    ],
    [/^\/\* 클래스온 — .*\*\/\n/gm, ""],
    [/\n\n  \/\* ── 손으로 만든 템플릿 4종[\s\S]*?(?=\n\};)/g, ""],
  ],
  "src/pages/gnbSections.tsx": [
    ["  GraduationCap,\n", ""],
    [
      / {2}\/\*\n {3}\* 클래스온 — [\s\S]*?\n {2}\},\n(?= {2}\/\*\n {3}\* 저장소 색인)/g,
      "",
    ],
  ],
  "src/pages/ScreenIndexPage.data.ts": [
    [
      "export const SCREENS: ScreenEntry[] = [",
      "const ALL_SCREENS: ScreenEntry[] = [",
    ],
    [
      /^\];$/gm,
      "];\n\n/** 전달본은 BabyCube 화면만 보여준다 (export-publishing 이 넣은 줄) */\n" +
        'export const SCREENS = ALL_SCREENS.filter((s) => s.origin === "babycube");',
    ],
  ],
  "src/pages/ScreenIndexPage.tsx": [
    ['title: "생성물 · BabyCube"', 'title: "BabyCube 본사 어드민"'],
    [
      /"실서비스 어드민을 기획서로 넣어 만든 28종[^"]*"/g,
      '"퍼블리싱 기준본 — 예시 데이터로 동작하며 API 는 연결돼 있지 않다. 색·레이아웃·간격·타이포는 전부 Clay 디자인 토큰이다."',
    ],
  ],
};

for (const [file, edits] of Object.entries(TRANSFORMS)) {
  const path = join(OUT, file);
  let text = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  for (const [find, replace] of edits) {
    const hit =
      typeof find === "string" ? text.includes(find) : find.test(text);
    if (typeof find !== "string") find.lastIndex = 0;
    if (!hit)
      fail(`${file}: 치환 대상이 없습니다 — 원본이 바뀌었나요?\n  ${find}`);
    text =
      typeof find === "string"
        ? text.replace(find, replace)
        : text.replace(find, replace);
  }
  writeFileSync(path, text);
}

/* package.json — Storybook·키트 전용 스크립트를 걷어낸다 */
const pkgPath = join(OUT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = "babycube-admin-hq-publishing";
for (const s of [
  "storybook",
  "build-storybook",
  "check:consistency",
  "reset:project",
  "sync:public",
  "export:publishing",
])
  delete pkg.scripts[s];
for (const d of Object.keys(pkg.devDependencies))
  if (/storybook/.test(d)) delete pkg.devDependencies[d];
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

/* ── 3. 전달본 전용 파일 (README·문서·App 테스트) ───────────────── */

cpSync(join(EXTRA, "files"), OUT, { recursive: true });
for (const rel of ["README.md", "docs/SCREENS.md", "docs/INTEGRATION.md"]) {
  const p = join(OUT, rel);
  if (existsSync(p))
    writeFileSync(
      p,
      readFileSync(p, "utf8").replaceAll("{{SOURCE_COMMIT}}", commit),
    );
}

/* ── 4. 전달본 전용 lockfile ──────────────────────────────────── */
/* 원본 lockfile 에는 Storybook 이 들어 있어 그대로 쓰면 `npm ci` 가 어긋난다 */

console.log("lockfile 생성 중 (npm install --package-lock-only) …");
/* 문자열 명령 — Windows 의 npm 은 .cmd 라 셸을 거쳐야 하고, 인자 배열 + shell 은 Node 가 경고한다 */
execSync(
  "npm install --package-lock-only --ignore-scripts --no-audit --no-fund",
  {
    cwd: OUT,
    stdio: "inherit",
  },
);

console.log(`
✔ 추출 완료 — 기준 커밋 ${commit}
  ${OUT}

다음:
  cd "${OUT}"
  npm ci && npm run typecheck && npm run lint && npm test -- --run && npm run build
`);
