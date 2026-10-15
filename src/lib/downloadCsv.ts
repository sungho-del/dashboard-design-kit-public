/**
 * 표를 CSV 파일로 내려받는다 — 목록 화면의 [엑셀 다운로드] 가 쓴다.
 *
 * - 맨 앞에 **BOM** 을 붙인다. 없으면 엑셀이 UTF-8 을 못 알아봐 한글이 깨진다
 * - 쉼표·따옴표·줄바꿈이 든 칸은 따옴표로 감싸고 안의 따옴표는 두 번 쓴다(RFC 4180)
 * - `=`·`+`·`-`·`@` 로 시작하는 글자 칸은 앞에 `'` 를 붙인다 — 회원이 적은 이름 같은 값이
 *   엑셀에서 **수식으로 실행되지 않게** 한다(CSV 수식 주입). 숫자 칸은 건드리지 않는다
 */
export type CsvCell = string | number;

const cell = (value: CsvCell) => {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const toCsv = (rows: CsvCell[][]) =>
  rows.map((row) => row.map(cell).join(",")).join("\r\n");

export function downloadCsv(filename: string, rows: CsvCell[][]) {
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${toCsv(rows)}`], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
