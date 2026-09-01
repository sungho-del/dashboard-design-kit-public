#!/usr/bin/env node
/**
 * 공개 저장소 동기화 — 현재 커밋 상태를 공개본에 반영한다.
 *
 * ## 왜 `git push` 하나로 안 되나
 *
 * 이 저장소의 **히스토리에는 공개하면 안 되는 것이 들어 있다.** 참고용으로 내려받았던
 * 서드파티 관리자 사본 384파일(상용 제품 JS · 유료 에디터 · 결제사 자산)이 지금은
 * 워킹 트리에서 지워졌지만 커밋 이력에는 그대로 살아 있다 — `git clone` 한 번이면 복원된다.
 *
 * 그래서 공개본은 **히스토리를 잇지 않는 별도 저장소**다. 원격을 하나 더 걸어 두면
 * 언젠가 실수로 `git push public master` 를 해서 그 이력을 통째로 공개하게 된다.
 * 이 스크립트는 **파일만 옮긴다** — 커밋 이력은 넘어가지 않는다.
 *
 * ## 하는 일
 *
 *   1. 워킹 트리가 깨끗한지 확인 (아니면 중단 — 커밋 먼저)
 *   2. 공개 저장소를 임시 폴더에 받아 최신으로 맞춘다
 *   3. **추적 중인 파일만** 그대로 복사한다 (지워진 파일도 반영)
 *   4. 나가면 안 되는 것이 섞였는지 다시 검사 (`_reference/` · `.env` …)
 *   5. 확인받고 커밋 · 푸시
 *
 * ## 사용법
 *
 *   npm run sync:public            무엇이 바뀌는지 보여주고 확인 후 푸시
 *   npm run sync:public -- --dry   보여주기만 하고 끝낸다
 *   npm run sync:public -- --yes   묻지 않고 푸시
 */
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import {
  copyFileSync,
  mkdirSync,
  readdirSync,
  rmSync,
  existsSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const PUBLIC_URL =
  "https://github.com/sungho-del/dashboard-design-kit-public.git";
const BRANCH = "main";

/** 공개본에 절대 들어가면 안 되는 것 — 이 저장소가 둘로 갈라진 이유다 */
const FORBIDDEN = [
  /(^|\/)_reference\//,
  /(^|\/)\.env($|\.)/,
  /\.pem$/,
  /\.p12$/,
  /(^|\/)id_rsa/,
];

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const WORK = join(tmpdir(), "dashboard-design-kit-public-sync");

const args = new Set(process.argv.slice(2));
const YES = args.has("--yes") || args.has("-y");
const DRY = args.has("--dry") || args.has("--dry-run");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const git = (args, cwd = ROOT) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

function fail(msg) {
  console.error(`\n${c.red("[중단]")} ${msg}\n`);
  process.exit(1);
}

/* ── 1. 워킹 트리 확인 ─────────────────────────────────────────────── */

console.log(`\n${c.bold("공개 저장소 동기화")}\n`);

if (git(["status", "--porcelain"])) {
  fail(
    "커밋하지 않은 변경이 있습니다. 공개본은 **커밋된 상태**만 반영합니다.\n" +
      "        먼저 커밋한 뒤 다시 실행하세요.",
  );
}

const head = git(["rev-parse", "--short", "HEAD"]);
const subject = git(["log", "-1", "--pretty=%s"]);
console.log(`  현재 커밋  ${c.cyan(head)} ${subject}`);
console.log(`  공개 저장소 ${c.dim(PUBLIC_URL)}\n`);

/* ── 2. 공개 저장소를 임시 폴더에 최신으로 ──────────────────────────── */

if (existsSync(join(WORK, ".git"))) {
  git(["fetch", "origin", BRANCH], WORK);
  git(["reset", "--hard", `origin/${BRANCH}`], WORK);
  git(["clean", "-fdx"], WORK);
} else {
  rmSync(WORK, { recursive: true, force: true });
  console.log(c.dim("  공개 저장소를 받는 중…"));
  git(["clone", "--branch", BRANCH, PUBLIC_URL, WORK], tmpdir());
}

/* ── 3. 추적 파일만 복사 ───────────────────────────────────────────── */

// 먼저 비운다 — 그래야 이쪽에서 **지운 파일**도 공개본에 반영된다
for (const entry of readdirSync(WORK)) {
  if (entry === ".git") continue;
  rmSync(join(WORK, entry), { recursive: true, force: true });
}

/*
 * ⚠️ `-z` 가 필수다. 그냥 `ls-files` 를 쓰면 git 이 **비ASCII 경로를 따옴표로 감싸고
 * 8진수로 이스케이프**한다 — 한글 파일명이 그대로 경로가 되어 복사가 터진다
 * (`docs/DESIGN_참고.md` 에서 실제로 터졌다). `-z` 는 NUL 로 끊고 이스케이프하지 않는다.
 */
const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
for (const rel of tracked) {
  const dest = join(WORK, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(ROOT, rel), dest);
}
console.log(`  파일 ${tracked.length}개 복사`);

/* ── 4. 나가면 안 되는 것이 섞였는지 ────────────────────────────────── */

const leaked = tracked.filter((f) => FORBIDDEN.some((re) => re.test(f)));
if (leaked.length) {
  fail(
    `공개하면 안 되는 파일이 추적되고 있습니다:\n        ${leaked.join("\n        ")}`,
  );
}

/* ── 5. 변경 확인 → 커밋 → 푸시 ─────────────────────────────────────── */

git(["add", "-A"], WORK);
const staged = git(["diff", "--cached", "--stat"], WORK);
if (!staged) {
  console.log(
    `\n${c.green("이미 최신입니다.")} 공개본이 현재 커밋과 같습니다.\n`,
  );
  process.exit(0);
}

console.log(`\n${c.cyan("공개본에 반영될 변경")}`);
console.log(
  staged
    .split("\n")
    .map((l) => `  ${l}`)
    .join("\n"),
);
console.log("");

if (DRY) {
  console.log(c.dim("--dry 라서 여기서 멈춥니다. 공개본은 그대로입니다.\n"));
  process.exit(0);
}

if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `${c.bold("공개 저장소에 올릴까요?")} (y/N) `,
  );
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("\n취소했습니다. 공개본은 그대로입니다.\n");
    process.exit(0);
  }
}

// 비공개 쪽 커밋 메시지를 그대로 쓰고, 어느 커밋에서 왔는지만 덧붙인다
const body = git(["log", "-1", "--pretty=%B"]);
git(
  ["commit", "-q", "-m", `${body}\n\n(비공개 저장소 ${head} 에서 동기화)`],
  WORK,
);
git(["push", "origin", BRANCH], WORK);

console.log(
  `\n${c.green("완료")} — 공개본이 ${c.cyan(head)} 상태로 올라갔습니다.`,
);
console.log(`  https://github.com/sungho-del/dashboard-design-kit-public\n`);
