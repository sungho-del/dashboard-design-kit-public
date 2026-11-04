/* 원본 파생값 정답 — 처리단위마다 원본 함수를 직접 불러 결과를 뽑는다 */
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const b = await chromium.launch({
  executablePath:
    process.env.LOCALAPPDATA +
    "/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe",
});
const page = await b.newPage();
await page.goto("http://127.0.0.1:5190/index.html?embed=1", {
  waitUntil: "networkidle",
});
const rows = await page.evaluate(() => {
  const txt = (html) => {
    const d = document.createElement("div");
    d.innerHTML = html;
    return d;
  };
  const tableRows = (html) =>
    [...txt(html).querySelectorAll("tr")]
      .map((tr) =>
        [...tr.querySelectorAll("td")].map((td) => td.innerText.trim()),
      )
      .filter((r) => r.length);
  const amtRows = (html) =>
    [...txt(html).querySelectorAll(".amt-row, .amt > div, tr")]
      .map((r) => r.innerText.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  return UNITS.map((u) => {
    const isSale = u.type !== "렌트";
    const ref = udProdRef(u);
    const box = txt(udPriceBox(u, null));
    return {
      id: u.id,
      refId: ref.id ?? null,
      consts: saleConsts(u).map((o) => [o.name, Number(o.add) || 0]),
      shipFee: udShipFee(u),
      collectFee: udCollectFee(u),
      coupon: udCoupon(u),
      point: udPoint(u),
      care: udCare(u),
      baseAmt: udBaseAmt(u),
      payTotal: isSale ? salePayTotal(u) : rentPayTotal(u),
      stageIdx: udStageIdx(u),
      orderStat: udOrderStat(u),
      t: [0, 1, 1.5, 2, 3, 4, 5, 6].map((k) => _udT(u, k)),
      courier: udCourier(u),
      history: tableRows(udHistory(u, null)),
      priceBox: [...box.querySelectorAll("*")]
        .filter((e) => e.children.length === 0 && e.innerText.trim())
        .map((e) => e.innerText.trim()),
    };
  });
});
writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(
  "units",
  rows.length,
  "예시",
  JSON.stringify(rows.find((r) => r.id === "20260623864962-1")).slice(0, 900),
);
await b.close();
