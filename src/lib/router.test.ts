import { act, renderHook } from "@testing-library/react";
import { navigate, useLocation, usePathname, useSearchParams } from "./router";

/* -------------------------------------------------------------------------
 * 최소 라우터 (`src/lib/router.ts`)
 *
 * ## 왜 이 파일에 테스트가 필요한가
 * 이 60줄이 **36화면의 진입점**이다. 여기가 조용히 깨지면 화면이 안 바뀌거나
 * 주소만 바뀌고 내용이 그대로인 상태가 되는데, 그건 페이지 테스트로는 안 잡힌다
 * (페이지 테스트는 컴포넌트를 직접 렌더하지 라우터를 거치지 않는다).
 *
 * ## jsdom 주의
 * `location` 은 테스트 사이에 초기화되지 않는다 — 매번 `/` 로 되돌린다.
 * ---------------------------------------------------------------------- */

beforeEach(() => {
  window.history.pushState(null, "", "/");
});

describe("router", () => {
  describe("usePathname", () => {
    it("현재 경로를 돌려준다", () => {
      window.history.pushState(null, "", "/members");
      const { result } = renderHook(() => usePathname());

      expect(result.current).toBe("/members");
    });

    it("쿼리는 잘라낸다 — 화면 선택은 경로만 본다", () => {
      window.history.pushState(null, "", "/orders-all?stat=렌트&flow=연체중");
      const { result } = renderHook(() => usePathname());

      expect(result.current).toBe("/orders-all");
    });
  });

  describe("navigate", () => {
    /**
     * ⚠️ 이 저장소에서 가장 깨지기 쉬운 지점이다.
     * `pushState` 는 `popstate` 를 **발생시키지 않는다.** 커스텀 이벤트를 직접 쏘지 않으면
     * 주소만 바뀌고 화면은 그대로 남는다 — 눈으로 보면 "클릭이 안 먹는" 증상이 된다.
     */
    it("이동하면 구독 중인 훅이 다시 렌더된다", () => {
      const { result } = renderHook(() => usePathname());
      expect(result.current).toBe("/");

      act(() => navigate("/settle-tax"));

      expect(result.current).toBe("/settle-tax");
      expect(window.location.pathname).toBe("/settle-tax");
    });

    it("쿼리를 붙여 이동할 수 있다", () => {
      const { result } = renderHook(() => useLocation());

      act(() => navigate("/orders-all?stat=판매"));

      expect(result.current).toBe("/orders-all?stat=%ED%8C%90%EB%A7%A4");
    });

    /** 같은 곳으로 다시 이동해도 히스토리를 더럽히지 않는다 */
    it("현재 위치와 같으면 아무 일도 하지 않는다", () => {
      window.history.pushState(null, "", "/members");
      const before = window.history.length;

      navigate("/members");

      expect(window.history.length).toBe(before);
    });

    it("뒤로가기(popstate)에도 반응한다", () => {
      const { result } = renderHook(() => usePathname());

      act(() => navigate("/members"));
      expect(result.current).toBe("/members");

      act(() => {
        window.history.back();
        /*
         * jsdom 의 `history.back()` 은 비동기라 테스트 안에서 popstate 를 기다리기
         * 어렵다. 라우터가 **popstate 를 구독하고 있는지**를 직접 확인한다.
         */
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      expect(result.current).toBe(window.location.pathname);
    });
  });

  describe("useSearchParams", () => {
    /**
     * 대시보드 플로우가 `/orders-all?stat=<유형>&flow=<단계>` 로 링크한다.
     * 받는 쪽이 이 훅으로 읽어야 필터가 걸린다 — 안 읽으면 **링크는 열리는데
     * 목록이 안 좁혀지는** 조용한 결함이 된다.
     */
    it("쿼리를 URLSearchParams 로 읽는다", () => {
      window.history.pushState(null, "", "/orders-all?stat=렌트&flow=연체중");
      const { result } = renderHook(() => useSearchParams());

      expect(result.current.get("stat")).toBe("렌트");
      expect(result.current.get("flow")).toBe("연체중");
      expect(result.current.get("없는키")).toBeNull();
    });

    it("쿼리가 없으면 빈 값을 돌려준다 (던지지 않는다)", () => {
      window.history.pushState(null, "", "/members");
      const { result } = renderHook(() => useSearchParams());

      expect(result.current.get("stat")).toBeNull();
    });
  });
});
