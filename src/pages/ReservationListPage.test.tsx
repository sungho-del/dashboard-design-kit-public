import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { ReservationListPage } from "./ReservationListPage";
import { CHARTON_ROUTES } from "./routes";

/* -------------------------------------------------------------------------
 * 예약 목록 (S01) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 필터·검색·빈 상태·드롭다운·취소 모달·
 * 페이지네이션·미리보기 모달. 렌더만 검사하면 화면이 통째로 빠져도 통과한다.
 *
 * 여기에 더해 이 화면에는 **의미 검증**이 두 개 붙어 있다 —
 *   1. 증감 지표의 색이 `good` 을 따르는가 (`up` 을 복사하면 '확정 대기 -3건'이 빨강이 된다)
 *   2. 상태 색이 의미와 맞는가 (비정상 종료인 노쇼·취소가 critical 인가)
 * 둘 다 타입·린트가 못 잡는 자리라 테스트로 못박는다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Dropdown·DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로 no-op 으로 채운다.
 * ---------------------------------------------------------------------- */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ObserverStub);
  vi.stubGlobal("IntersectionObserver", ObserverStub);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <ReservationListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="reservation-list"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 헤더 행을 뺀 데이터 행. 빈 상태에서는 표가 통째로 사라지므로 빈 배열이 된다 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 남아 있는 예약의 "환자" 셀(2번째 컬럼) — 개수뿐 아니라 **어떤 건이** 남았는지까지 본다 */
function visiblePatients(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 (DatePicker 트리거는 button) */
function searchBox(): HTMLElement {
  return screen.getByRole("textbox");
}

/** 행의 "관리" 아이콘 버튼 — label 은 `${예약번호} 관리` 로 붙는다 */
function manageButton(reservationId: string): HTMLElement {
  return screen.getByRole("button", { name: `${reservationId} 관리` });
}

/**
 * 값과 단위가 **갈라져 렌더되는 지표 수치**를 한 덩어리로 찾는다.
 *
 * `StatTile` 은 규격(§D3-3)대로 값(`<strong>`)과 단위(`<span>`)를 별개 요소로 낸다 —
 * 단위를 값에 붙여 쓰면 단위까지 30px 이 되어 자릿수가 안 읽히기 때문이다.
 * 그래서 `getByText("42건")` 은 매칭되지 않는다. 두 조각을 감싼 바깥 `<span>` 의
 * 결합 텍스트로 찾아, **값과 단위가 나란히 있는지**까지 함께 검증한다.
 */
const statText = (text: string) => (_: string, el: Element | null) =>
  el?.tagName === "SPAN" && el.textContent?.replace(/\s+/g, "") === text;

describe("ReservationListPage", () => {
  describe("요약 지표 카드", () => {
    it("STATS 3장을 라벨·값과 함께 보여준다", () => {
      renderPage();

      expect(screen.getByText("오늘 예약")).toBeVisible();
      expect(screen.getByText(statText("38건"))).toBeVisible();

      expect(screen.getByText("확정 대기")).toBeVisible();
      expect(screen.getByText(statText("7건"))).toBeVisible();

      expect(screen.getByText("예약 확정률")).toBeVisible();
      expect(screen.getByText(statText("82%"))).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 의미 계약.
     * 화살표는 `up`(방향), 색은 `good`(좋고 나쁨)이 정한다.
     * '확정 대기 -3건' 은 **내려갔지만 좋은** 지표라 ↓ 화살표에 초록이어야 한다 —
     * `good: up` 으로 복사하면 여기가 빨강이 되고 화면이 거짓말을 한다.
     */
    it("'확정 대기 -3건' 은 ↓ 화살표에 success 색으로 나간다", () => {
      renderPage();

      const tag = screen.getByText("-3건");
      expect(tag.querySelector(".lucide-trending-down")).not.toBeNull();
      expect(tag.querySelector(".lucide-trending-up")).toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-up)",
      );
      expect(tag.style.getPropertyValue("--tag-color")).not.toBe(
        "var(--color-chart-delta-down)",
      );
    });

    it("'예약 확정률 -2%p' 는 ↓ 화살표에 critical 색으로 나간다", () => {
      renderPage();

      const tag = screen.getByText("-2%p");
      expect(tag.querySelector(".lucide-trending-down")).not.toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-down)",
      );
    });

    it("'오늘 예약 +6건' 은 ↑ 화살표에 success 색으로 나간다", () => {
      renderPage();

      const tag = screen.getByText("+6건");
      expect(tag.querySelector(".lucide-trending-up")).not.toBeNull();
      expect(tag.style.getPropertyValue("--tag-color")).toBe(
        "var(--color-chart-delta-up)",
      );
    });
  });

  describe("필터 (SegmentedControl)", () => {
    it("기본은 전체 — 첫 페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      // 샘플 6건 / PAGE_SIZE 3 → 1페이지 3건, 2페이지 3건
      expect(bodyRows()).toHaveLength(3);
      expect(screen.getByText("총 6건")).toBeVisible();
      expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(visiblePatients()).toEqual(["박시우", "정예린", "강민재"]);
    });

    it("미확정을 고르면 미확정 예약만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "미확정" }));

      expect(visiblePatients()).toEqual(["김도윤"]);
      expect(screen.getByText("총 1건")).toBeVisible();
    });

    it("확정을 고르면 2건이 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "확정" }));

      expect(visiblePatients()).toEqual(["이하늘", "강민재"]);
    });

    it("노쇼를 고르면 1건이 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "노쇼" }));

      expect(visiblePatients()).toEqual(["박시우"]);
    });

    /** '취소'는 세그먼트에 없다 — 전체에서만 보인다(색으로 구별된다) */
    it("취소 세그먼트는 없지만 취소 건은 전체 목록에 남아 있다", async () => {
      const { user } = renderPage();

      expect(
        screen.queryByRole("radio", { name: "취소" }),
      ).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(visiblePatients()).toContain("정예린");
    });
  });

  /**
   * §3-1 '상태 색 배정' — 비정상 종료(노쇼·취소)는 critical, 정상 종료(진료완료)는 default.
   * 취소를 회색으로 묻으면 목록에서 문제 건이 보이지 않는다.
   */
  describe("상태 색", () => {
    it("미확정 warning · 확정 success · 진료완료 default · 노쇼/취소 critical", async () => {
      const { user } = renderPage();

      // 같은 글자가 툴바 세그먼트에도 있으므로 표 안으로 좁혀서 Tag 만 본다
      const page1 = within(screen.getByRole("table"));
      expect(classList(page1.getByText("미확정"))).toContain(
        "text-text-warning",
      );
      expect(classList(page1.getByText("확정"))).toContain("text-text-success");
      expect(classList(page1.getByText("진료완료"))).toContain("text-text-sub");

      await user.click(screen.getByRole("button", { name: "2" }));

      const page2 = within(screen.getByRole("table"));
      expect(classList(page2.getByText("노쇼"))).toContain(
        "text-text-critical",
      );
      expect(classList(page2.getByText("취소"))).toContain(
        "text-text-critical",
      );
    });
  });

  describe("검색", () => {
    it("환자명으로 검색하면 해당 예약만 남는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "최유나");

      expect(bodyRows()).toHaveLength(1);
      expect(visiblePatients()).toEqual(["최유나"]);
    });

    it("예약번호로도 검색된다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "RS-20260818-0119");

      expect(visiblePatients()).toEqual(["정예린"]);
    });

    it("담당의 이름으로도 검색된다 — 같은 의사의 예약이 함께 묶인다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "박서준");

      expect(visiblePatients()).toEqual(["김도윤", "정예린"]);
    });
  });

  describe("빈 상태", () => {
    it("매칭이 없으면 EmptyState 를 띄우고 표와 페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: "페이지네이션" }),
      ).toBeInTheDocument();

      await user.type(searchBox(), "없는환자");

      // 병원의 말이어야 한다 — "조건에 맞는 주문이 없습니다"가 남으면 여기서 걸린다
      expect(screen.getByText("조건에 맞는 예약이 없습니다")).toBeVisible();
      expect(
        screen.getByText("필터를 바꾸거나 기간을 다시 선택해 보세요."),
      ).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("빈 상태에서도 툴바는 남는다 — 조건을 되돌릴 수단이 필요하다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는환자");

      expect(screen.getByRole("radio", { name: "전체" })).toBeVisible();
      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
      expect(searchBox()).toHaveValue("없는환자");
    });
  });

  describe("초기화", () => {
    it("필터·검색을 건 뒤 초기화를 누르면 전체가 돌아온다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("radio", { name: "확정" }));
      await user.type(searchBox(), "이하늘");
      expect(bodyRows()).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(bodyRows()).toHaveLength(3);
      expect(screen.getByText("총 6건")).toBeVisible();
      expect(screen.getByRole("radio", { name: "전체" })).toBeChecked();
      expect(searchBox()).toHaveValue("");
    });

    it("빈 상태의 '필터 초기화' 버튼으로도 전체가 돌아온다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는환자");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(3);
      expect(screen.getByText("총 6건")).toBeVisible();
    });
  });

  describe("페이지네이션", () => {
    it("총 건수를 표시하고 페이지를 옮길 수 있다", async () => {
      const { user } = renderPage();

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    it("필터를 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(screen.getByRole("radio", { name: "확정" }));

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByText("총 2건")).toBeVisible();
    });
  });

  describe("행 액션 드롭다운", () => {
    it("관리 버튼을 열면 3항목이 순서대로 나온다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));

      const menu = await screen.findByRole("menu");
      expect(
        within(menu)
          .getAllByRole("menuitem")
          .map((item) => item.textContent),
      ).toEqual(["상세 보기", "확정 처리", "예약 취소"]);
    });

    it("드롭다운은 행 클릭을 막는다 — 미리보기 모달이 열리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));

      expect(await screen.findByRole("menu")).toBeInTheDocument();
      // stopPropagation 이 빠지면 행의 onClick 까지 타서 모달이 함께 열린다
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("'상세 보기'로도 미리보기 모달이 열린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0033"));
      await user.click(
        await screen.findByRole("menuitem", { name: "상세 보기" }),
      );

      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByText("이비인후과")).toBeVisible();
    });

    it("'확정 처리'는 환자 이름을 담은 토스트로 알린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));
      await user.click(
        await screen.findByRole("menuitem", { name: "확정 처리" }),
      );

      expect(
        await screen.findByText("김도윤 님의 예약을 확정했습니다"),
      ).toBeVisible();
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });
  });

  describe("예약 취소 모달", () => {
    it("'예약 취소'를 고르면 확인 모달이 열린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));
      await user.click(
        await screen.findByRole("menuitem", { name: "예약 취소" }),
      );

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "예약을 취소할까요?" }),
      ).toBeVisible();
      // 어떤 예약을 취소하는지가 모달 안에 남아 있어야 한다
      expect(
        within(modal).getByText("RS-20260819-0041 · 김도윤"),
      ).toBeVisible();
      // 본문은 병원의 말이어야 한다 — 환불 안내가 남아 있으면 안 된다
      expect(
        within(modal).getByText(/취소 안내 문자가 발송되고/),
      ).toBeVisible();
    });

    it("'닫기'를 누르면 아무것도 취소하지 않고 닫힌다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));
      await user.click(
        await screen.findByRole("menuitem", { name: "예약 취소" }),
      );

      const modal = await screen.findByRole("dialog");
      const footer = modal.querySelector('[data-slot="footer"]');
      expect(footer).not.toBeNull();
      await user.click(
        within(footer as HTMLElement).getByRole("button", { name: "닫기" }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("예약을 취소했습니다")).not.toBeInTheDocument();
    });

    it("'예약 취소'를 확정하면 critical 토스트를 띄우고 닫는다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("RS-20260819-0041"));
      await user.click(
        await screen.findByRole("menuitem", { name: "예약 취소" }),
      );

      const modal = await screen.findByRole("dialog");
      const footer = modal.querySelector('[data-slot="footer"]') as HTMLElement;
      await user.click(
        within(footer).getByRole("button", { name: "예약 취소" }),
      );

      const toast = await screen.findByText("예약을 취소했습니다");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("행 클릭 → 미리보기 모달", () => {
    it("행을 클릭하면 그 예약의 4항목이 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "예약 미리보기" }),
      ).toBeVisible();
      expect(within(sheet).getByText("RS-20260819-0041")).toBeVisible();

      // InfoList 는 dl/dt/dd 시맨틱이라 라벨이 term 으로 읽힌다
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["환자", "연락처", "진료과", "예약일시"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual(["김도윤", "010-2841-7712", "내과", "2026-08-19 15:00"]);
    });

    it("다른 행을 열면 그 행의 정보로 바뀐다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "닫기",
        }),
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );

      await user.click(bodyRows()[2]);

      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByText("최유나")).toBeVisible();
      expect(within(sheet).getByText("010-3317-8064")).toBeVisible();
    });

    it("'전체 상세 보기'는 reservation-detail 로 이동시키고 모달을 닫는다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(bodyRows()[0]);
      await user.click(
        await screen.findByRole("button", { name: "전체 상세 보기" }),
      );

      expect(onNavSelect).toHaveBeenCalledTimes(1);
      expect(onNavSelect).toHaveBeenCalledWith(
        CHARTON_ROUTES.reservationDetail,
      );
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("'확정 처리'는 이동 없이 토스트만 띄운다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(bodyRows()[0]);
      await user.click(
        within(await screen.findByRole("dialog")).getByRole("button", {
          name: "확정 처리",
        }),
      );

      expect(await screen.findByText("예약을 확정했습니다")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();
    });
  });

  describe("상단 액션", () => {
    it("'예약 등록'은 토스트로 끝난다 — 예약 생성 화면이 기획서에 없다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "예약 등록" }));

      expect(await screen.findByText("예약을 등록했습니다")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("'내보내기'는 병원 문구의 토스트를 띄운다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "내보내기" }));

      expect(
        await screen.findByText("예약 목록을 엑셀로 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
