/* =========================================================================
 * 화면의 데이터 상태 — `docs/DESIGN-dashboard.md` §D8
 *
 * 대시보드·목록 화면이 **카드(또는 표) 단위로** 로딩·갱신·빈 상태를 갖는다.
 * 두 화면이 같은 네 값을 쓰게 되면서 뼈대마다 복붙되던 것을 여기로 모았다 —
 * 이 저장소가 `StatTile` 승격 때 겪은 그 복붙이다(같은 주석까지 다섯 벌이었다).
 *
 * ⚠️ **도메인이 아니다.** 어느 화면이든 뜻이 같으므로 `.data.ts` 가 아니라 `lib` 에 둔다.
 * ====================================================================== */

/**
 * | 값            | 뜻                                                          |
 * | ------------- | ----------------------------------------------------------- |
 * | `ready`       | 평소                                                         |
 * | `loading`     | 첫 도착 대기 — 스켈레톤. **로딩 중에 "없음"을 그리지 않는다** |
 * | `empty`       | 조건에 맞는 것이 없음. 에러와 다르다(§D8-2)                  |
 * | `refreshing`  | 갱신 중 — 스켈레톤으로 되돌리지 않고 이전 값을 흐리게 둔다   |
 */
export type DataStatus = "ready" | "loading" | "empty" | "refreshing";

/**
 * `?preview=` 값 → 상태. 모르는 값은 `ready` 다 — 주소 오타로 화면이 비지 않는다.
 *
 * 실 API 를 붙이면 호출부가 이 자리를 fetch 상태로 바꾼다. 미리보기 파라미터는
 * **기획자가 상태를 눈으로 확인하는 통로**다(실데이터 없이 로딩·빈 화면을 볼 방법이 없다).
 */
export const asStatus = (value: string | null): DataStatus =>
  value === "loading" || value === "empty" || value === "refreshing"
    ? value
    : "ready";

/**
 * 갱신 중 흐림. **스켈레톤으로 되돌리지 않는다**(§D8-1) — 레이아웃이 튀지 않고
 * 방금 본 값과 비교할 수 있다. 헤더·툴바는 흐리지 않는다(조작은 계속된다).
 */
export const dimWhile = (status: DataStatus) =>
  status === "refreshing" ? "opacity-50 transition-opacity" : undefined;

/** 로딩·갱신 중인가 — `aria-busy` 에 그대로 넣는다 */
export const isBusy = (status: DataStatus) =>
  status === "loading" || status === "refreshing";
