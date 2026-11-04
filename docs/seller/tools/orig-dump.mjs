/* 원본 시드 덤프 — 첫 로드 직후 vs 48화면 순회 뒤 비교 (렌더가 시드를 바꾸는지) */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const OUT = process.argv[2];
const SEEDS = [
  "STORE",
  "STORE_INFO",
  "RENT_CATTREE",
  "SALE_CATTREE",
  "STAGES",
  "PRODUCTS",
  "PAYORDERS",
  "UNITS",
  "COUPONS",
  "SELLER_NOTICES",
  "SL_INQUIRIES",
  "SL_REVIEWS",
  "SELLER_ASKS",
  "HQ_OPS_CAL",
  "SL_OPS_CAL",
  "ADDR_BOOK",
  "SET",
];
const VOCAB = [
  "SHIP_WAYS",
  "FLOW_STEPS",
  "FLOW_ALL",
  "ORDER_CATS",
  "CUST_STATUS",
  "SALE_RMA_SCREENS",
  "RENT_RMA_SCREENS",
  "RMA_MAIN",
  "RMA_EXC",
  "RMA_STATS",
  "RMA_BUCKET",
  "RMA_DONE",
  "RMA_FIRST",
  "RMA_EXTRA",
  "RMA_LEGACY",
  "SELLER_CANCEL_PRESETS",
  "DELAY_PRESETS",
  "TODO",
  "NAV_BADGE",
  "STAT_TIP",
  "DASH_UNIT",
  "PERIODS",
  "SALE_STAT_LIST",
  "SALE_STAT_DISP",
  "ORDER_DONE",
  "EXPORT_SPEC",
  "RENT_STAT_LIST",
  "RENT_STAT_DISP",
  "RENT_STAT_USE",
  "RENT_STAT_INSP",
  "DEP_BADGE",
  "DEP_LABEL",
  "STMT_OV",
  "STMT_OBJ",
  "SETTLE_TIP",
  "SETTLE_TX_HEAD",
  "GRADE_DESC",
  "UD_COURIERS",
  "PROD_SEL_STATES",
  "PF_UNITS",
  "PF_MONTHS",
  "GOSI_ROWS",
  "CERT_TYPES",
  "CR",
  "COL_NUM",
  "COL_LEFT",
  "FB_TODAY",
];
const b = await chromium.launch({
  executablePath:
    process.env.LOCALAPPDATA +
    "/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://127.0.0.1:5190/index.html?embed=1", {
  waitUntil: "networkidle",
});
const dump = (names) =>
  page.evaluate(
    (names) =>
      Object.fromEntries(
        names.map((n) => {
          try {
            return [n, JSON.parse(JSON.stringify(eval(n)))];
          } catch (e) {
            return [n, "ERR " + e.message];
          }
        }),
      ),
    names,
  );
const first = await dump(SEEDS);
const vocab = await dump(VOCAB);
await page.evaluate(() =>
  SCREEN_MAP.forEach((g) =>
    g[1].forEach((s) => {
      try {
        closeModal && closeModal();
      } catch {}
      try {
        if (s.run) s.run();
        else if (s.det) openDetail(s.det[0], s.det[1]());
        else nav(s.id);
      } catch (e) {}
    }),
  ),
);
const after = await dump(SEEDS);
const changed = SEEDS.filter(
  (n) => JSON.stringify(first[n]) !== JSON.stringify(after[n]),
);
writeFileSync(`${OUT}/seeds.json`, JSON.stringify(first, null, 1));
writeFileSync(`${OUT}/vocab.json`, JSON.stringify(vocab, null, 1));
console.log(
  "seeds:",
  SEEDS.map(
    (n) =>
      `${n}=${Array.isArray(first[n]) ? first[n].length : typeof first[n]}`,
  ).join(" "),
);
console.log(
  "vocab errors:",
  Object.entries(vocab)
    .filter(([, v]) => typeof v === "string" && v.startsWith("ERR"))
    .map(([k, v]) => k + ":" + v)
    .join(" | ") || "없음",
);
console.log("렌더 뒤 바뀐 시드:", changed.join(",") || "없음");
for (const n of changed) {
  const a = first[n],
    c = after[n];
  if (Array.isArray(a)) {
    const diffIdx = a
      .map((x, i) => (JSON.stringify(x) !== JSON.stringify(c[i]) ? i : -1))
      .filter((i) => i >= 0);
    console.log(
      n,
      "다른 행",
      diffIdx.length,
      "예:",
      JSON.stringify(a[diffIdx[0]]).slice(0, 200),
      "→",
      JSON.stringify(c[diffIdx[0]]).slice(0, 200),
    );
  } else
    console.log(
      n,
      JSON.stringify(a).slice(0, 200),
      "→",
      JSON.stringify(c).slice(0, 200),
    );
}
await b.close();
