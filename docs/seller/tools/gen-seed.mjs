/* 원본 시드 덤프(seeds.json) → src/pages/seller/seed/*.data.ts — 타입은 값 모양에서 추론한다 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , SEEDS, OUTDIR, COMMIT] = process.argv;
const seeds = JSON.parse(readFileSync(SEEDS, "utf8"));

/** 여러 값의 TS 타입 — 객체는 키를 합치고(빠진 키는 선택), 배열은 원소를 합친다 */
function infer(values, ind = "  ") {
  const kinds = new Set(
    values.map((v) =>
      v === null ? "null" : Array.isArray(v) ? "array" : typeof v,
    ),
  );
  const parts = [];
  for (const k of kinds) {
    if (k === "string" || k === "number" || k === "boolean" || k === "null")
      parts.push(k);
    else if (k === "array") {
      const els = values.filter(Array.isArray).flat();
      parts.push(els.length ? `${wrap(infer(els, ind))}[]` : "never[]");
    } else if (k === "object")
      parts.push(
        objType(
          values.filter((v) => v && typeof v === "object" && !Array.isArray(v)),
          ind,
        ),
      );
  }
  return parts.join(" | ");
}
const wrap = (t) => (/[|{]/.test(t) && !/^\{[\s\S]*\}$/.test(t) ? `(${t})` : t);
const keyOf = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k));
function objType(objs, ind) {
  const keys = [];
  for (const o of objs)
    for (const k of Object.keys(o)) if (!keys.includes(k)) keys.push(k);
  const lines = keys.map((k) => {
    const has = objs.filter((o) => k in o);
    const opt = has.length < objs.length ? "?" : "";
    return `${ind}${keyOf(k)}${opt}: ${infer(
      has.map((o) => o[k]),
      ind + "  ",
    )};`;
  });
  return `{\n${lines.join("\n")}\n${ind.slice(2)}}`;
}

const FILES = {
  "store.data.ts": {
    title: "스토어 · 설정 · 분류 · 쿠폰 · 공휴일",
    items: [
      ["STORE", "SellerStore"],
      ["STORE_INFO", "StoreInfo"],
      ["ADDR_BOOK", "AddressBookEntry"],
      ["SET", "CsSettings"],
      ["RENT_CATTREE", "CategoryNode"],
      ["SALE_CATTREE", "CategoryNode"],
      ["STAGES", "GrowthStage"],
      ["COUPONS", "SellerCoupon"],
      ["HQ_OPS_CAL", "OpsDay"],
      ["SL_OPS_CAL", "OpsDay"],
    ],
  },
  "products.data.ts": { title: "상품", items: [["PRODUCTS", "SellerProduct"]] },
  "orders.data.ts": {
    title: "결제(주문번호) · 처리단위",
    items: [
      ["PAYORDERS", "PayOrder"],
      ["UNITS", "OrderUnit"],
    ],
  },
  "board.data.ts": {
    title: "게시판 — 본사 공지 · 고객 문의 · 리뷰 · 1:1 문의",
    items: [
      ["SELLER_NOTICES", "SellerNotice"],
      ["SL_INQUIRIES", "SellerInquiry"],
      ["SL_REVIEWS", "SellerReview"],
      ["SELLER_ASKS", "SellerAsk"],
    ],
  },
};

mkdirSync(OUTDIR, { recursive: true });
for (const [file, { title, items }] of Object.entries(FILES)) {
  const declared = new Set();
  let out = `/* =========================================================================
 * 셀러 원본 시드 — ${title}
 *
 * ⚠️ **자동 생성 · 손으로 고치지 않는다.** 원본 = 기획 저장소 \`rentmall-planning\`
 * \`apps/admin-seller/index.html\` v0.4 (커밋 \`${COMMIT}\`) 를 브라우저로 연 직후의 배열을 그대로 뽑았다
 * (원본 런타임 보강까지 끝난 값 · 화면을 돌아도 바뀌지 않음을 확인). 타입은 값 모양에서 추론했다.
 *
 * 화면은 이 값을 **읽기만** 한다 — 업무 버튼은 확인 창 + 알림만이라 목록·저장본이 바뀌지 않는다.
 * 화면에 보이는 파생값(상태 흐름·배지 수·정산 금액)은 각 화면의 \`.data.ts\` 가 이 시드에서 계산한다.
 * 원본이 바뀌면 덤프부터 다시 뽑는다(\`docs/HANDOFF.md\` 셀러 절).
 * ====================================================================== */
`;
  for (const [name, type] of items) {
    const v = seeds[name];
    if (!declared.has(type)) {
      const t = Array.isArray(v) ? infer(v) : infer([v]);
      out += `\nexport ${t.startsWith("{") ? `interface ${type} ${t}` : `type ${type} = ${t};`}\n`;
      declared.add(type);
    }
    out += `\nexport const ${name}: ${type}${Array.isArray(v) ? "[]" : ""} = ${JSON.stringify(v)};\n`;
  }
  writeFileSync(join(OUTDIR, file), out);
  console.log(file, Buffer.byteLength(out));
}
