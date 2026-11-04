import type { GnbSection } from "../../components/ui";
import { useSearchParams } from "../../lib/router";

/* =========================================================================
 * 직영 계정 미리보기 — 판정 회신 12차 D-337(Q-62) · Q-69 (`docs/seller/plan-changes.md` ②)
 *
 * 본사가 직영으로 운영하는 스토어 계정은 사이드바에서 상품·정산(보증금 내역 제외)·공지·1:1 문의를
 * 숨기고, 스토어 정보·설정의 변경 요청 통로를 뺀다. 원본 프로토타입에는 없는 화면 변화라
 * **주소 `?account=direct` 로만** 미리 본다 — 셀러 앱이 이동할 때 이 표식을 이어 붙여 화면을 옮겨도 유지된다.
 * 계정 구분·권한은 개발 영역(로그인 계정의 직영 여부로 정한다).
 * ====================================================================== */

export const DIRECT_PARAM = "account";
export const DIRECT_VALUE = "direct";

/** 직영 계정에서 숨기는 메뉴(D-337) — 정산 그룹엔 보증금 내역만 남는다 */
export const DIRECT_HIDDEN = [
  "/products",
  "/product-new",
  "/settle-own",
  "/settle-statement",
  "/settle-tax",
  "/seller-notice",
  "/seller-ask",
];

export const useDirectAccount = () =>
  useSearchParams().get(DIRECT_PARAM) === DIRECT_VALUE;

export const directSections = (sections: GnbSection[]): GnbSection[] =>
  sections
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !DIRECT_HIDDEN.includes(i.id)),
    }))
    .filter((g) => g.items.length > 0);

/** 이동할 때 미리보기 표식을 잇는다 */
export function withDirect(path: string) {
  if (new URLSearchParams(path.split("?")[1] ?? "").has(DIRECT_PARAM))
    return path;
  return `${path}${path.includes("?") ? "&" : "?"}${DIRECT_PARAM}=${DIRECT_VALUE}`;
}
