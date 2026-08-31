import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderExchangeListPage } from "./OrderExchangeListPage";

/* -------------------------------------------------------------------------
 * S11 교환 목록 (BabyCube) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 상태 셀렉트 10종 · 판매자 라디오가 셀러
 * 셀렉트를 잠그는 것 · 검색조건 7종 · 빈 상태 · 페이지네이션 · 미리보기 모달.
 *
 * ## ⚠️ 이 화면만 다른 두 가지 (원본이 그렇다)
 * 1. **유형(렌트/판매) 필터가 없다** — 형제 셋에는 유형 대시가 있다.
 *    유형 **열**은 있으므로 "열은 있는데 필터는 없다"를 명시적으로 검사한다.
 * 2. **`stat` 파라미터가 유형이 아니라 상태다** — 형제 셋에서 상태는 `flow` 다.
 *    이 차이를 놓치면 링크가 필터 없이 열린다.
 *
 * ## 원본 대조 계약 (2026-08 정돈)
 * 원본 `/orders-exchange` 청크(`3giil3sr7d2kg.js`)의 컬럼 배열 24개가 정본이고
 * **주문 목록의 배열과 같다**. 상태 어휘는 `stat` 셀렉트의 열 값이 정본이다.
 *
 * ## ⚠️ 의미 검증의 핵심 — **종료 상태를 한 톤으로 묶지 않는다**
 * `교환 완료`(정상 종료)와 `교환 반려`·`교환 거부`(비정상 종료)는 둘 다 "끝난 건"이지만
 * 뜻이 정반대다. 같은 색이면 목록에서 문제 건이 사라진다 — 타입·린트가 못 잡는 자리다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Select·DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로 no-op 으로 채운다.
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

/**
 * ⚠️ jsdom 의 `location` 은 테스트 사이에 초기화되지 않는다.
 * 쿼리 테스트가 남긴 `?stat=…` 이 다음 테스트의 초기 필터가 되어 버리므로 매번 되돌린다.
 */
beforeEach(() => {
  window.history.replaceState(null, "", "/orders-exchange");
});

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

/** @param search 이 화면을 여는 쿼리스트링 (`"?stat=교환 검수"`) */
function renderPage(search = "") {
  if (search)
    window.history.replaceState(null, "", `/orders-exchange${search}`);

  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <OrderExchangeListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/orders-exchange"
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

/** 남아 있는 건의 **주문번호**(2번째 열) */
function visibleIds(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 판매자 라디오. 그룹으로 좁혀 찾는다 */
const groupRadio = (group: string, name: string) =>
  within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", {
    name,
  });

/** 페이지 버튼은 **숫자만** 렌더한다 — 페이지네이션 안으로 좁혀 숫자로 찾는다 */
const pageButton = (label: string) =>
  within(screen.getByRole("navigation", { name: "페이지네이션" })).getByRole(
    "button",
    { name: label },
  );

/** 셀렉트를 열고 옵션 하나를 고른다 */
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string | RegExp,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(await screen.findByRole("listbox")).getByRole("option", {
      name: optionName,
    }),
  );
}

describe("OrderExchangeListPage (BabyCube S11 교환 목록)", () => {
  describe("화면 제목·기본 표시", () => {
    it("원본 메뉴 이름을 그대로 제목으로 쓴다", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "교환 목록" }),
      ).toBeVisible();
    });

    it("첫 페이지에 PAGE_SIZE(4)건만 그린다", () => {
      renderPage();
      expect(bodyRows()).toHaveLength(4);
    });

    it("총 건수는 필터 결과를 따라간다", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "목록 (총 10건)" }),
      ).toBeVisible();
    });

    it("판매자 열은 본사면 '본사', 셀러면 셀러명을 직접 보여준다", () => {
      renderPage();
      expect(within(bodyRows()[0]).getAllByRole("cell")[3]).toHaveTextContent(
        "아기별상사",
      );
      expect(within(bodyRows()[1]).getAllByRole("cell")[3]).toHaveTextContent(
        "본사",
      );
    });

    it("판매 건은 이용 기간이 —로 그려진다 (빈 칸과 구별)", () => {
      renderPage();
      // 2행이 판매 건(S-20260817-0355)
      const cells = within(bodyRows()[1]).getAllByRole("cell");
      expect(cells[4]).toHaveTextContent("—");
    });
  });

  /* ── ⚠️ 이 화면만 다른 곳: 유형 축이 없다 ── */

  describe("유형 필터가 없다 (원본 교환 목록에 chip 자체가 없다)", () => {
    it("유형 대시 카드가 없다", () => {
      renderPage();
      expect(
        screen.queryByRole("button", { name: /^렌트 \d+건$/ }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /^전체 \d+건$/ }),
      ).not.toBeInTheDocument();
    });

    it("유형 라디오·세그먼트도 없다 — 라디오 그룹은 판매자 하나뿐이다", () => {
      renderPage();
      expect(screen.getAllByRole("radiogroup")).toHaveLength(1);
      expect(screen.getByRole("radiogroup", { name: "판매자" })).toBeVisible();
    });

    it("그래도 유형 **열**은 있다 — 필터만 없는 것이다", () => {
      renderPage();
      expect(
        within(screen.getByRole("table")).getByRole("columnheader", {
          name: "유형",
        }),
      ).toBeVisible();
      expect(within(bodyRows()[0]).getByText("렌트")).toBeVisible();
    });
  });

  /* ── 원본 대조: 표가 정본과 같은가 ── */

  describe("표 컬럼 (원본 24열 · frozen 5열)", () => {
    it("컬럼 이름·순서가 원본 배열과 같다", () => {
      renderPage();
      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );

      expect(headers.map((th) => th.textContent)).toEqual([
        "상태",
        "주문번호",
        "유형",
        "판매자",
        "이용 기간",
        "결제수단",
        "결제 일시",
        "배송 방법",
        "택배사",
        "송장번호",
        "수거 택배사",
        "수거 송장번호",
        "상품코드",
        "상품명",
        "렌트 원가",
        "할인 금액",
        "렌트가",
        "구매자명",
        "구매자 ID",
        "연락처",
        "수령인",
        "수령인 연락처",
        "배송지",
        "배송 메모",
      ]);
    });

    /*
      우리 표에는 한때 원본에 없는 13열이 있었다. 이름을 하나씩 짚어 두어야
      "설명이 붙은 그럴듯한 열"이 다시 들어오는 것을 막을 수 있다.
    */
    it("원본에 없던 열은 하나도 남아 있지 않다", () => {
      renderPage();
      const table = screen.getByRole("table");
      for (const label of [
        "검수 판정",
        "교환 신청 일시",
        "교환 사유",
        "재배송 택배사",
        "재배송 송장번호",
        "재배송 일시",
        "교환 상품코드",
        "교환 상품명",
        "추가 결제금액",
        "결제금액",
        "셀러",
        "처리단위",
        "주문일시",
      ]) {
        expect(
          within(table).queryByRole("columnheader", { name: label }),
        ).not.toBeInTheDocument();
      }
    });

    /**
     * 오프셋은 **`<colgroup>` 폭의 누적합**이라는 파생 관계를 검사한다.
     *
     * 리터럴을 적어 두면 폭을 고칠 때 테스트가 조용히 낡는다 — 제목이
     * "폭과 짝을 이룬다" 인데 정작 폭을 보지 않게 된다.
     * `w-<n>` 과 `left-<n>` 이 같은 4px 스케일이라 단위 그대로 더하면 된다.
     */
    it("앞 5열이 sticky 이고 오프셋이 폭의 누적합과 같다", () => {
      renderPage();

      const table = screen.getByRole("table");
      const units = [...table.querySelectorAll("colgroup > col")].map((col) => {
        const found = /(?:^|\s)w-(\d+)(?:\s|$)/.exec(col.className);
        expect(found).not.toBeNull();
        return Number(found![1]);
      });

      const headers = within(table).getAllByRole("columnheader");
      for (let index = 0; index < 5; index++) {
        const offset =
          "left-" + units.slice(0, index).reduce((sum, unit) => sum + unit, 0);
        expect(classList(headers[index])).toEqual(
          expect.arrayContaining(["sticky", offset]),
        );
      }
      // 6번째부터는 함께 스크롤된다
      expect(classList(headers[5])).not.toContain("sticky");
    });

    it("본문 고정 셀은 배경을 행에서 물려받는다 (zebra·hover를 따라가려면 상속뿐)", () => {
      renderPage();
      const cells = within(bodyRows()[0]).getAllByRole("cell");

      expect(classList(cells[0])).toEqual(
        expect.arrayContaining(["sticky", "bg-inherit"]),
      );
      expect(classList(cells[4])).toContain("bg-inherit");
      expect(classList(cells[5])).not.toContain("bg-inherit");
    });

    it("고정 구간의 끝에만 경계선을 그린다", () => {
      renderPage();
      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );

      expect(classList(headers[4])).toContain("after:bg-divide");
      expect(classList(headers[3])).not.toContain("after:bg-divide");
    });

    it("증감(±) 표시가 없다 — 원본에 없는 숫자를 만들지 않는다", () => {
      renderPage();
      expect(screen.queryByText(/^[+-]\d+건$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
    });
  });

  /* ── 원본 대조: 상태 어휘 ── */

  describe("상태 어휘는 원본 stat 셀렉트의 열 값뿐이다", () => {
    it("선택지가 값·순서까지 원본과 같다", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("combobox", { name: /^상태/ }));

      expect(
        within(await screen.findByRole("listbox"))
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual([
        "상태 전체",
        "교환 신청",
        "교환 승인",
        "교환 반려",
        "교환 수거중",
        "교환 수거완료",
        "교환 검수",
        "교환 재배송",
        "교환 완료",
        "교환 거부",
        "재반송",
      ]);
    });

    it("상태로 좁힌다", async () => {
      const { user } = renderPage();
      await pickOption(user, /^상태/, "교환 검수");

      expect(visibleIds()).toEqual(["R-20260814-0245"]);
    });
  });

  describe("판매자 라디오가 셀러 셀렉트를 연다·잠근다", () => {
    it("기본(전체)에서는 셀러 셀렉트가 잠겨 있다", () => {
      renderPage();
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeDisabled();
    });

    it("셀러를 지정한 뒤 본사로 옮기면 셀러 지정이 함께 풀린다", async () => {
      const { user } = renderPage();

      await user.click(groupRadio("판매자", "셀러"));
      await pickOption(user, /셀러/, "맘스케어");
      expect(visibleIds()).toEqual(["S-20260813-0210"]);

      await user.click(groupRadio("판매자", "본사"));

      // 셀러 지정이 남아 있었다면 본사 × 맘스케어 = 0건이 됐을 것이다
      expect(visibleIds()).toEqual([
        "S-20260817-0355",
        "R-20260815-0288",
        "R-20260810-0108",
      ]);
    });
  });

  describe("검색조건 7종", () => {
    it("조건 없음은 여러 필드를 함께 훑는다", async () => {
      const { user } = renderPage();
      await user.type(screen.getByRole("textbox"), "맘스케어");
      expect(visibleIds()).toEqual(["S-20260813-0210"]);
    });

    it("조건을 고르면 그 필드만 본다", async () => {
      const { user } = renderPage();

      await pickOption(user, "검색조건", "구매자명");
      await user.type(screen.getByRole("textbox"), "윤가람");
      expect(visibleIds()).toEqual(["R-20260812-0177"]);

      await pickOption(user, "검색조건", "상품명");
      expect(bodyRows()).toHaveLength(0);
    });

    /*
      원본 `tel` 은 "연락처" 열(= 구매자 연락처)을 가리킨다.
      수령인 번호를 보게 두면 표에 보이는 연락처로 검색해도 걸리지 않는다.
    */
    it("연락처는 **구매자** 연락처를 본다 (표의 '연락처' 열과 같은 값)", async () => {
      const { user } = renderPage();
      await pickOption(user, "검색조건", "연락처");
      await user.type(screen.getByRole("textbox"), "010-8820");
      expect(visibleIds()).toEqual(["R-20260816-0301"]);
    });

    it("수령인 번호로는 걸리지 않는다 (열 이름과 검색 대상이 어긋나지 않게)", async () => {
      const { user } = renderPage();
      await pickOption(user, "검색조건", "연락처");
      // 010-3310-7765 는 R-20260816-0301 의 **수령인** 번호다
      await user.type(screen.getByRole("textbox"), "010-3310");
      expect(bodyRows()).toHaveLength(0);
    });
  });

  describe("빈 상태와 초기화", () => {
    it("결과가 없으면 도메인 문구의 빈 상태가 뜬다", async () => {
      const { user } = renderPage();
      await user.type(screen.getByRole("textbox"), "존재하지않는값");

      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("빈 상태의 초기화 버튼이 조건을 모두 되돌린다", async () => {
      const { user } = renderPage();

      await pickOption(user, /^상태/, "교환 검수");
      await user.type(screen.getByRole("textbox"), "존재하지않는값");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByRole("textbox")).toHaveValue("");
      expect(screen.getByRole("combobox", { name: /^상태/ })).toHaveTextContent(
        "상태 전체",
      );
    });

    it("카드 헤더의 초기화도 같은 일을 한다", async () => {
      const { user } = renderPage();
      await pickOption(user, /^상태/, "교환 검수");
      expect(bodyRows()).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(
        screen.getByRole("heading", { name: "목록 (총 10건)" }),
      ).toBeVisible();
    });
  });

  describe("페이지네이션", () => {
    it("3페이지에는 나머지 건이 온다", async () => {
      const { user } = renderPage();
      await user.click(pageButton("3"));

      expect(visibleIds()).toEqual(["R-20260810-0108", "S-20260809-0064"]);
    });

    it("2페이지에서 필터를 좁히면 남은 범위로 당겨진다 (빈 표 방지)", async () => {
      const { user } = renderPage();
      await user.click(pageButton("2"));
      await pickOption(user, /^상태/, "교환 신청");

      expect(bodyRows().length).toBeGreaterThan(0);
      expect(visibleIds()).toEqual(["R-20260818-0402"]);
    });
  });

  describe("미리보기 모달", () => {
    it("행을 누르면 미리보기가 열린다 (제목이 '상세'가 아니다)", async () => {
      const { user } = renderPage();
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "교환 미리보기",
      });
      expect(within(sheet).getByText("회전형 카시트 아이소픽스")).toBeVisible();
      expect(within(sheet).getByText("189,000원")).toBeVisible();
    });

    /* 원본 교환 목록에는 행 액션이 없다 — 주문번호 → 상세 링크뿐이다 */
    it("모달에는 도메인 액션이 없다 — 원본에 행 액션이 없기 때문", async () => {
      const { user } = renderPage();
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "교환 미리보기",
      });
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });
  });

  describe("엑셀 다운로드", () => {
    it("파일 이름과 파일에만 들어가는 열을 토스트로 알린다", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("button", { name: /엑셀 다운로드/ }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "교환목록_10건.csv 를 내려받았습니다 (처리단위·결제금액·주문일시 포함)",
          ),
        ).toBeVisible();
      });
    });
  });

  /* ── ⭐ URL 쿼리 → 초기 필터 ── */

  describe("URL 쿼리를 초기 필터로 읽는다", () => {
    /*
      ⚠️ 형제 화면 셋에서 `stat` 은 유형(렌트/판매)이지만 **교환에서는 상태**다.
      원본이 `selects: [{ key: "stat", label: "상태", … }]` 로 정의한다.
    */
    it("stat 은 **상태**다 — 형제 화면과 뜻이 다르다", () => {
      renderPage("?stat=교환 거부");

      expect(screen.getByRole("combobox", { name: /^상태/ })).toHaveTextContent(
        "교환 거부",
      );
      expect(visibleIds()).toEqual(["R-20260812-0177"]);
    });

    it("flow 는 읽지 않는다 — 원본 chipKeys 에 flow 가 없다", () => {
      renderPage("?flow=교환 거부");

      expect(screen.getByRole("combobox", { name: /^상태/ })).toHaveTextContent(
        "상태 전체",
      );
      expect(
        screen.getByRole("heading", { name: "목록 (총 10건)" }),
      ).toBeVisible();
    });

    it("owner 는 판매자, sellerName 은 셀러다", () => {
      renderPage("?owner=셀러&sellerName=맘스케어");

      expect(groupRadio("판매자", "셀러")).toBeChecked();
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeEnabled();
      expect(visibleIds()).toEqual(["S-20260813-0210"]);
    });

    it("q 는 검색어다", () => {
      renderPage("?q=맘스케어");

      expect(screen.getByRole("textbox")).toHaveValue("맘스케어");
      expect(visibleIds()).toEqual(["S-20260813-0210"]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다", () => {
      renderPage("?paidAt_from=2026-08-17&paidAt_to=2026-08-18");

      expect(visibleIds()).toEqual(["R-20260818-0402", "S-20260817-0355"]);
    });

    /* 원본이 useEffect 로 하는 정합성 보정 */
    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다 (손댈 수 없는 필터 방지)", () => {
      renderPage("?owner=본사&sellerName=맘스케어");

      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeDisabled();
      expect(visibleIds()).toEqual([
        "S-20260817-0355",
        "R-20260815-0288",
        "R-20260810-0108",
      ]);
    });

    it("모르는 값은 조용히 무시한다 — 남이 만든 링크로 화면이 비면 안 된다", () => {
      renderPage("?stat=렌트&owner=외계인");

      expect(screen.getByRole("combobox", { name: /^상태/ })).toHaveTextContent(
        "상태 전체",
      );
      expect(
        screen.getByRole("heading", { name: "목록 (총 10건)" }),
      ).toBeVisible();
    });
  });

  /* ── 의미 검증 — 타입·린트·렌더 테스트가 전부 통과시키는 자리 ── */

  describe("의미 1. 종료 상태를 한 톤으로 묶지 않는다", () => {
    it("정상 종료(교환 완료)는 default", () => {
      renderPage("?stat=교환 완료");
      const tag = within(bodyRows()[0]).getByText("교환 완료");

      expect(classList(tag)).toContain("text-text-sub");
      expect(classList(tag)).not.toContain("text-text-critical");
    });

    it("비정상 종료(교환 거부)는 critical", () => {
      renderPage("?stat=교환 거부");
      expect(classList(within(bodyRows()[0]).getByText("교환 거부"))).toContain(
        "text-text-critical",
      );
    });

    it("비정상 종료(교환 반려)도 critical — 거절 시점만 다르고 결과는 같다", () => {
      renderPage("?stat=교환 반려");
      expect(classList(within(bodyRows()[0]).getByText("교환 반려"))).toContain(
        "text-text-critical",
      );
    });
  });

  describe("의미 2. 진행 상태의 색이 뜻과 맞는다", () => {
    it("교환 신청은 warning — 사람이 승인·반려를 판단해야 끝난다", () => {
      renderPage("?stat=교환 신청");
      expect(classList(within(bodyRows()[0]).getByText("교환 신청"))).toContain(
        "text-text-warning",
      );
    });

    /*
      이름은 "완료"지만 흐름의 끝이 아니다 — 물건이 도착했으니 사람이 검수를 시작해야
      다음으로 간다. `default` 로 묻으면 검수 대기 건이 화면에서 조용해진다.
    */
    it("교환 수거완료는 이름과 달리 warning — 검수가 남았다", () => {
      renderPage("?stat=교환 수거완료");
      expect(
        classList(within(bodyRows()[0]).getByText("교환 수거완료")),
      ).toContain("text-text-warning");
    });

    /*
      우리 어휘에서 success 는 **돈이 도는 진행 상태**를 맡는다(반품의 환불 처리중).
      교환에는 환불 단계가 없어 해당 상태가 없다 — 색 분포를 맞추려고
      `교환 재배송` 을 초록으로 올리지 않는다.
    */
    it("교환 재배송은 default — 택배사가 옮기는 조용한 중간 단계다", () => {
      renderPage("?stat=교환 재배송");
      const tag = within(bodyRows()[0]).getByText("교환 재배송");

      expect(classList(tag)).toContain("text-text-sub");
      expect(classList(tag)).not.toContain("text-text-success");
    });

    it("유형은 분류라 상태색을 쓰지 않는다", () => {
      renderPage();
      const typeTag = within(bodyRows()[0]).getByText("렌트");
      expect(classList(typeTag)).toContain("text-text-sub");
      expect(classList(typeTag)).not.toContain("text-text-success");
    });
  });

  describe("의미 3. 렌트가는 저장값이 아니라 원가−할인이다", () => {
    it("표의 세 금액이 서로 맞는다", () => {
      renderPage();
      const cells = within(bodyRows()[0]).getAllByRole("cell");

      // 14 렌트 원가 · 15 할인 금액 · 16 렌트가
      expect(cells[14]).toHaveTextContent("240,000원");
      expect(cells[15]).toHaveTextContent("51,000원");
      expect(cells[16]).toHaveTextContent("189,000원");
    });

    it("판매 건은 원가·렌트가가 —다 (할인은 판매에도 있다)", () => {
      renderPage();
      // 2행이 판매 건(S-20260817-0355)
      const cells = within(bodyRows()[1]).getAllByRole("cell");
      expect(cells[14]).toHaveTextContent("—");
      expect(cells[16]).toHaveTextContent("—");
    });
  });
});
