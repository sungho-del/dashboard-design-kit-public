/**
 * check-consistency.mjs — 같은 자리에 다른 값이 쓰였는지 찾는다.
 *
 * ## 왜 규칙을 나열하지 않는가
 *
 * "헤더 버튼은 medium" 같은 규칙을 미리 적어 두는 방식은 **실제로 난 사고를 못 막았다.**
 * 그 규칙이 문서 어디에도 없었기 때문이다 — 14개 화면이 **암묵적으로** 그렇게 하고
 * 있었을 뿐이다. 규칙을 다 적으려면 이미 다 알고 있어야 한다.
 *
 * 그래서 이 스크립트는 **불일치 자체를 찾는다.** 한 슬롯에서 값의 빈도를 세고,
 * 소수파를 의심 대상으로 올린다. 규칙을 몰라도 잡힌다.
 *
 * ## 실행
 *   node scripts/check-consistency.mjs            전체 검사
 *   node scripts/check-consistency.mjs --verbose  통과 항목까지 출력
 *
 * exit 1 = 의심 항목 있음
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/pages";

/* 소수파가 전체의 이 비율 미만이면 의심. 20% */
const MINORITY_RATIO = 0.2;

/**
 * 검사할 슬롯.
 *
 * `near` 는 "이 문자열이 나온 뒤 N줄 안" 이라는 뜻이다. JSX 를 정규식으로 완전히
 * 파싱할 수는 없으므로 **근접성으로 슬롯을 근사한다** — 오탐이 나면 `lines` 를 줄인다.
 */
const SLOTS = [
  {
    id: "PageHeader actions 안의 Button size",
    near: "actions={",
    lines: 10,
    pick: /<Button[^>]*?\ssize="([a-z]+)"/g,
    /* size 를 아예 안 주는 것이 다수라면, 준 쪽이 소수파다 */
    countMissingAs: "(기본값)",
    missingProbe: /<Button[\s>]/,
  },
  {
    id: "카드 행 grid 거터",
    near: null,
    pick: /className="grid grid-cols-\d+ (gap-\d+)"/g,
  },
  {
    id: "Modal size",
    near: null,
    pick: /<Modal[^>]*?\ssize="([a-z]+)"/g,
  },
  {
    id: "EmptyState size",
    near: null,
    pick: /<EmptyState[^>]*?\ssize="([a-z]+)"/g,
  },
  {
    id: "StatGrid columns",
    near: null,
    pick: /columns=\{(\d+)\}/g,
    /* 항목 수에 맞추는 값이라 다양한 것이 정상 — 참고로만 출력한다 */
    infoOnly: true,
  },
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return name.endsWith(".tsx") && !name.endsWith(".test.tsx") ? [p] : [];
  });
}

const files = walk(ROOT);
const verbose = process.argv.includes("--verbose");
let suspicious = 0;

for (const slot of SLOTS) {
  /** value -> [{file, line}] */
  const hits = new Map();

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const lines = text.split("\n");

    /* near 가 있으면 그 지점 뒤 N줄만 본다 */
    const regions = [];
    if (slot.near) {
      lines.forEach((l, i) => {
        if (l.includes(slot.near))
          regions.push(lines.slice(i, i + slot.lines).join("\n"));
      });
    } else {
      regions.push(text);
    }

    for (const region of regions) {
      const found = [...region.matchAll(slot.pick)];
      if (found.length === 0 && slot.missingProbe?.test(region)) {
        const key = slot.countMissingAs;
        if (!hits.has(key)) hits.set(key, []);
        hits.get(key).push({ file: file.replace(/\\/g, "/"), justified: true });
        continue;
      }
      for (const m of found) {
        const key = m[1];
        if (!hits.has(key)) hits.set(key, []);
        /*
          매치 지점 **앞 6줄**에 주석이 있으면 "근거가 적힌 예외"로 본다.
          이 검사의 목적은 **말없이 갈라진 값**을 찾는 것이지, 소수파를 없애는 것이 아니다.
          지적 → 근거 남김 → 조용해짐 이 한 번으로 끝나야 사람이 같은 말을 반복하지 않는다.
        */
        const before = region
          .slice(0, m.index)
          .split("\n")
          .slice(-6)
          .join("\n");
        hits.get(key).push({
          file: file.replace(/\\/g, "/"),
          justified: before.includes("/*") || before.includes("*/"),
        });
      }
    }
  }

  const total = [...hits.values()].reduce((n, a) => n + a.length, 0);
  if (total === 0) continue;

  const sorted = [...hits.entries()].sort((a, b) => b[1].length - a[1].length);
  /* 소수파이면서 **근거 주석이 없는** 것만 의심한다 */
  const minority = sorted.filter(
    ([, arr]) =>
      arr.length / total < MINORITY_RATIO && arr.some((h) => !h.justified),
  );

  if (slot.infoOnly) {
    if (verbose) {
      console.log(`\nℹ️  ${slot.id} (참고)`);
      sorted.forEach(([v, a]) => console.log(`     ${v} — ${a.length}곳`));
    }
    continue;
  }

  if (minority.length === 0) {
    if (verbose) {
      console.log(`\n✅ ${slot.id}`);
      sorted.forEach(([v, a]) => console.log(`     ${v} — ${a.length}곳`));
    }
    continue;
  }

  suspicious += minority.length;
  console.log(`\n⚠️  ${slot.id}`);
  sorted.forEach(([v, a]) => {
    const bare = a.filter((h) => !h.justified);
    const few = a.length / total < MINORITY_RATIO;
    const mark = few && bare.length ? "  ← 의심" : "";
    const note = few && !bare.length ? "  (근거 있음 — 통과)" : "";
    console.log(`     ${v} — ${a.length}곳${mark}${note}`);
    if (mark)
      [...new Set(bare.map((h) => h.file))].forEach((f) =>
        console.log(`         ${f}`),
      );
  });
}

console.log("");
if (suspicious === 0) {
  console.log("✅ 슬롯별 값이 일관됩니다.");
  process.exit(0);
}
console.log(
  `⚠️  의심 ${suspicious}건. 소수파가 **정당한 예외**라면 그 이유가 코드 주석에 있어야 하고,\n` +
    "   없다면 옮기거나 만들면서 그 자리의 관행을 확인하지 않은 것이다.",
);
process.exit(1);
