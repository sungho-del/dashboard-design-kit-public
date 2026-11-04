/* 셀러 원본(v0.4) 화면별 캡처 + 글자 구조 추출 — 원본 SCREEN_MAP 순서 그대로 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const OUT = process.argv[2];
const b = await chromium.launch({
  executablePath:
    process.env.LOCALAPPDATA +
    "/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});
const page = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
await page.goto("http://127.0.0.1:5190/index.html?embed=1", {
  waitUntil: "networkidle",
});
await page.addStyleTag({
  content: `.main{overflow:visible!important;height:auto!important;max-height:none!important}.layout{height:auto!important;min-height:100vh}.admin-stage,.pcwrap{height:auto!important;overflow:visible!important}`,
});
const entries = await page.evaluate(() =>
  SCREEN_MAP.flatMap((g, gi) =>
    g[1].map((s, si) => ({
      group: g[0],
      gi,
      si,
      label: s.label,
      id: s.id || "",
      menu: !!s.menu,
      det: s.det ? s.det[0] : "",
      run: !!s.run,
    })),
  ),
);
const index = [];
for (const e of entries) {
  const res = await page
    .evaluate(({ gi, si }) => {
      try {
        closeModal && closeModal();
      } catch {}
      window.__k = null;
      const s = SCREEN_MAP[gi][1][si];
      if (s.run) s.run();
      else if (s.det) {
        const k = s.det[1]();
        openDetail(s.det[0], k);
        window.__k = k;
      } else nav(s.id);
      return { key: window.__k ?? null };
    }, e)
    .catch((err) => ({ err: String(err) }));
  await page.waitForTimeout(250);
  const data = await page.evaluate(() => {
    const root = document.getElementById("screenRoot");
    const t = (sel) =>
      [...root.querySelectorAll(sel)]
        .map((x) => x.innerText.replace(/\s+/g, " ").trim())
        .filter(Boolean);
    return {
      h1: document.querySelector(".topbar h1")?.innerText.trim(),
      headings: t("h2,h3,h4,.card-h,.nv-sec-h,.sec-title,.ttl"),
      th: t("th"),
      buttons: t("button"),
      labels: t("label,.nv-row>.lb,.kv>.k,dt"),
      text: root.innerText.replace(/\n{3,}/g, "\n\n").trim(),
      modal:
        document
          .querySelector(".modal.show,.modal-wrap.show,.mdl.show")
          ?.innerText.trim() ?? null,
    };
  });
  const name = `${String(index.length).padStart(2, "0")}_${e.id || e.det || e.label.replace(/\s/g, "")}`;
  writeFileSync(
    `${OUT}/${name}.json`,
    JSON.stringify({ ...e, ...res, ...data }, null, 1),
  );
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  index.push({
    name,
    group: e.group,
    label: e.label,
    id: e.id,
    det: e.det,
    key: res.key,
    h1: data.h1,
    err: res.err,
  });
  console.log(
    name,
    "|",
    e.group,
    "|",
    e.label,
    "|",
    data.h1,
    res.key ? "key=" + res.key : "",
    res.err ? "ERR " + res.err : "",
  );
}
writeFileSync(`${OUT}/index.json`, JSON.stringify(index, null, 1));
console.log("pageerrors", errs.length, errs.slice(0, 3));
await b.close();
