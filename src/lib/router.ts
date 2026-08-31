import { useCallback, useSyncExternalStore } from "react";

/**
 * 최소 라우터 — History API 위에 얹은 60줄짜리.
 *
 * ## 왜 react-router 를 넣지 않았나
 *
 * 이 저장소는 **가져다 쓰는 쪽에 라우터 선택을 강요하지 않는** 것을 원칙으로 삼아 왔다
 * (`App.tsx` 의 원래 주석). 그런데 화면마다 URL 이 필요해지면서 무언가는 있어야 했다.
 * 라이브러리를 들이는 대신, **지우고 갈아끼우기 쉬운 최소 구현**을 둔다 —
 * 실제 앱에 이식할 때 이 파일을 지우고 `useLocation`/`useNavigate` 로 바꾸면 끝이다.
 *
 * 지원하는 것: pathname 구독 · pushState 이동 · 뒤로/앞으로(popstate) · 쿼리스트링 읽기.
 * 지원하지 않는 것: 중첩 라우트 · 경로 파라미터(`/members/:id`) · 로더 · 전환 애니메이션.
 * 필요해지는 순간이 라우터를 들일 때다.
 */

/** `navigate()` 가 알리는 커스텀 이벤트 — popstate 는 pushState 로는 발생하지 않는다 */
const NAVIGATE_EVENT = "app:navigate";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

/**
 * 현재 경로 + 쿼리 (`/orders-all?stat=신규 주문`).
 *
 * `useSyncExternalStore` 를 쓰는 이유: `useState` + `useEffect` 로 구독하면
 * 첫 렌더와 구독 사이에 일어난 이동을 놓친다.
 */
export function useLocation(): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.pathname + window.location.search,
    /* 서버 스냅샷 — 이 앱은 SSR 을 하지 않지만 API 계약상 필요하다 */
    () => "/",
  );
}

/** 경로만 (쿼리 제외) */
export function usePathname(): string {
  const location = useLocation();
  return location.split("?")[0];
}

/** 현재 쿼리스트링을 읽는다. 없는 키는 `null` */
export function useSearchParams(): URLSearchParams {
  const location = useLocation();
  return new URLSearchParams(location.split("?")[1] ?? "");
}

/**
 * 경로 이동. 같은 곳으로의 이동은 히스토리를 더럽히지 않도록 무시한다.
 *
 * ⚠️ `pushState` 는 `popstate` 를 발생시키지 않는다 — 그래서 직접 이벤트를 쏜다.
 * 이걸 빠뜨리면 URL 만 바뀌고 화면이 그대로다.
 */
export function navigate(to: string) {
  if (to === window.location.pathname + window.location.search) return;
  window.history.pushState(null, "", to);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

/** 컴포넌트에서 쓰는 형태. 참조가 안정적이라 props 로 내려도 리렌더를 유발하지 않는다 */
export function useNavigate() {
  return useCallback((to: string) => navigate(to), []);
}
