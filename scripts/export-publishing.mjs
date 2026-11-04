#!/usr/bin/env node
/**
 * 퍼블리싱 전달본 추출 — BabyCube 어드민 **한 앱**의 화면만 **독립 Vite 프로젝트**로 뽑는다.
 *
 * ## 무엇을 만드나
 *
 * 받는 저장소의 `publishing/` 에 들어갈 폴더 하나. 앱은 `--app` 으로 고른다:
 *
 *   --app hq     (기본) 본사 어드민  → `babycube-admin-hq`
 *   --app seller        입점사 어드민 → `babycube-admin-seller`
 *
 * 두 앱은 이 저장소에서 공용 부품(`components/ui`·`lib`·토큰)을 한 벌로 쓰고, 화면·GNB·진입점만 따로 있다.
 * **전달본에는 그 앱 것만** 들어간다 — 반대편 앱의 화면·GNB 는 빠지고 `main.tsx` 는 그 앱 하나만 연다.
 * 사용자 화면(`babycube-user` PR #1)을 전달한 것과 같은 형태다:
 * React 19 + TS + Vite + Tailwind v4, 예시 데이터로 동작, API 미연동.
 *
 *   들어간다 → BabyCube 화면(`src/pages/babycube`) · UI 컴포넌트(stories 제외) · 토큰 · lib · 폰트
 *   빠진다   → 템플릿 4종(화면 생성기 원본) · Storybook · `.claude`·`pipeline`·`docs` 등 생성 도구
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
 *   npm run export:publishing -- <출력 폴더> [--app hq|seller]
 *   예) npm run export:publishing -- ../babycube-admin-hq/publishing
 *       npm run export:publishing -- ../babycube-admin-seller/publishing --app seller
 *
 * 전달용으로 바꾸는 파일은 아래 `TRANSFORMS` 에 있다. 각 치환은 **반드시 한 번 이상 맞아야**
 * 하고, 안 맞으면 멈춘다 — 원본이 바뀌어 치환이 조용히 빗나가면 데모가 섞여 나간다.
 * 전달본에만 있는 파일(README·문서)은 `scripts/export-publishing/files`(본사) ·
 * `files-seller`(셀러) 에 있다.
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

const args = process.argv.slice(2);
const appIdx = args.indexOf("--app");
const APP = appIdx >= 0 ? args[appIdx + 1] : "hq";
if (!["hq", "seller"].includes(APP))
  fail(`--app 은 hq 또는 seller 입니다: ${APP}`);
const outArg = args.find(
  (a, i) => !a.startsWith("--") && (appIdx < 0 || i !== appIdx + 1),
);
if (!outArg)
  fail(
    "출력 폴더를 지정하세요: npm run export:publishing -- <폴더> [--app hq|seller]",
  );
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

/** 두 앱이 같이 쓰는 것 */
const COMMON = [
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
  "src/assets",
  "src/components/ui",
  "src/lib",
  "src/shadcn",
  "src/styles",
  "src/test",
  "src/tokens",
];

/** 앱마다 다른 것 — 진입 App · 화면 · GNB · 화면 목록 */
const APP_FILES = {
  hq: [
    "src/App.tsx",
    "src/App.test.tsx",
    "src/pages/babycube",
    "src/pages/gnbSections.tsx",
    "src/pages/ScreenIndexPage.tsx",
    "src/pages/ScreenIndexPage.data.ts",
    "src/pages/ScreenIndexPage.test.tsx",
  ],
  seller: [
    "src/SellerApp.tsx",
    "src/SellerApp.test.tsx",
    "src/pages/seller",
    "src/pages/sellerGnbSections.tsx",
  ],
};

const INCLUDE = [...COMMON, ...APP_FILES[APP]];

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
const APP_TITLE = { hq: "본사 어드민", seller: "입점사 어드민" }[APP];

const TRANSFORMS = {
  "index.html": [
    [/\s*<link rel="icon"[^>]*vite\.svg"[^>]*\/>/g, ""],
    [
      "<title>베이비큐브 대시보드</title>",
      `<title>베이비큐브 ${APP_TITLE} — 퍼블리싱</title>`,
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
};

/* 본사 앱 전용 치환 — 템플릿 4종은 화면 생성기의 원본이라 이 저장소에만 둔다 */
const HQ_TRANSFORMS = {
  "src/App.tsx": [
    [
      /^import \{[^}]*\} from "\.\/pages\/(DashboardPage|OrderDetailPage|OrderListPage|ProductFormPage|routes)";\n/gm,
      "",
    ],
    [/\n\n {2}\/\*\n {3}\* ── 템플릿 4종[\s\S]*?(?=\n\};)/g, ""],
  ],
  "src/pages/ScreenIndexPage.tsx": [
    [
      /"유아용품 렌트·판매 멀티셀러 마켓플레이스의 본사 운영 어드민[^"]*"/g,
      '"퍼블리싱 기준본 — 예시 데이터로 동작하며 API 는 연결돼 있지 않다. 색·레이아웃·간격·타이포는 전부 Clay 디자인 토큰이다."',
    ],
  ],
};

for (const [file, edits] of Object.entries({
  ...TRANSFORMS,
  ...(APP === "hq" ? HQ_TRANSFORMS : {}),
})) {
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

/*
  main.tsx — 이 저장소의 것은 실행 모드로 두 앱 중 하나를 고른다. 전달본은 **그 앱 하나만** 연다
  (반대편 App 은 추출되지 않았으므로 import 가 남으면 빌드가 깨진다). 본사 전달본은 앱 분리 이전과 같은 글자다.
*/
const ROOT_COMPONENT = {
  hq: ["App", "./App"],
  seller: ["SellerApp", "./SellerApp"],
}[APP];
writeFileSync(
  join(OUT, "src/main.tsx"),
  `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ${ROOT_COMPONENT[0]} } from "${ROOT_COMPONENT[1]}";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <${ROOT_COMPONENT[0]} />
  </StrictMode>,
);
`,
);

/* package.json — Storybook·키트 전용 스크립트를 걷어낸다 */
const pkgPath = join(OUT, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.name = `babycube-admin-${APP}-publishing`;
for (const s of [
  "dev:seller",
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

const EXTRA_FILES = join(EXTRA, APP === "hq" ? "files" : "files-seller");
if (existsSync(EXTRA_FILES)) cpSync(EXTRA_FILES, OUT, { recursive: true });
else console.warn(`⚠ 전달 문서가 아직 없습니다: ${EXTRA_FILES}`);
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
✔ 추출 완료 (${APP_TITLE}) — 기준 커밋 ${commit}
  ${OUT}

다음:
  cd "${OUT}"
  npm ci && npm run typecheck && npm run lint && npm test -- --run && npm run build
`);
