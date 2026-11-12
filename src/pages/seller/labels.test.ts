import { describe, expect, it } from "vitest";

/* 개발 요청 2026-11-12 46번 — `X.labels.ts` 를 가져다 써도 예시 데이터(`seed/`)가 번들에 딸려 오지 않아야 한다.
 * 라벨 파일에서 값 import 를 따라가(타입 import 는 지워지므로 건너뛴다) `seed/` 에 닿으면 실패한다.
 * 셀러 폴더 밖(components · lib · babycube)은 셀러 시드를 불러오지 않으므로 따라가지 않는다. */

const SRC = import.meta.glob<string>(["./*.ts", "./*.tsx", "./seed/*.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});
const IMPORT = /import\s+(type\s+)?([^;]*?)\s+from\s+"([^"]+)"/g;

function valueImports(src: string): string[] {
  const out: string[] = [];
  for (const [, typeKw, clause, from] of src.matchAll(IMPORT)) {
    if (typeKw || !from.startsWith("./")) continue;
    const named = clause.match(/\{([^}]*)\}/)?.[1];
    const onlyTypes =
      named !== undefined &&
      !clause
        .replace(/\{[^}]*\}/, "")
        .replace(/,/g, "")
        .trim() &&
      named
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .every((s) => s.startsWith("type "));
    if (!onlyTypes) out.push(from);
  }
  return out;
}

function resolve(spec: string) {
  const hit = [".ts", ".tsx"].map((ext) => spec + ext).find((k) => k in SRC);
  if (!hit) throw new Error(`${spec} 를 찾지 못함`);
  return hit;
}

function reachesSeed(entry: string) {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const f = stack.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    if (f.startsWith("./seed/")) return f;
    for (const spec of valueImports(SRC[f])) stack.push(resolve(spec));
  }
  return null;
}

const LABELS = Object.keys(SRC).filter((f) => f.endsWith(".labels.ts"));

describe("셀러 라벨 파일 — 예시 데이터와 분리(46번)", () => {
  it("라벨 파일이 있다", () => {
    expect(LABELS.length).toBeGreaterThan(10);
  });

  it.each(LABELS)("%s 는 값 import 를 따라가도 seed/ 에 닿지 않는다", (f) => {
    expect(reachesSeed(f)).toBeNull();
  });

  it("검사기가 시드 import 를 실제로 잡는다", () => {
    expect(reachesSeed("./SaleOrdersPage.data.ts")).not.toBeNull();
  });
});
