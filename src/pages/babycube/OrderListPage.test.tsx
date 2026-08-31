import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { OrderListPage } from "./OrderListPage";

/* -------------------------------------------------------------------------
 * S08 주문 목록 (BabyCube) — 목록형
 *
 * 렌더 여부가 아니라 **동작**을 본다: 유형 대시(건수 카드가 곧 필터) ·
 * 유형에 따라 갈리는 상태 셀렉트 · 판매자 라디오가 셀러 셀렉트를 잠그는 것 ·
 * 검색조건 7종 · 빈 상태 · 페이지네이션 · 미리보기 모달.
 * 렌더만 검사하면 화면이 통째로 빠져도 통과한다.
 *
 * ## ⭐ URL 쿼리 계약을 여기서 지킨다
 * 대시보드가 `/orders-all?stat=렌트&flow=연체중` 으로 링크하는데, 받는 쪽이 없으면
 * **링크는 열리고 필터만 안 걸린다** — 화면은 멀쩡해 보여서 타입·린트로는 절대 안 잡힌다.
 * 그래서 쿼리별 초기 필터를 한 줄씩 검사한다(정합성 보정 두 가지 포함).
 *
 * ## 원본 대조 계약 (2026-08 정돈)
 * 원본 `/orders-all` 청크(`12f_fr6-1x-_t.js`)의 컬럼 배열 24개가 정본이다.
 * 지어낸 요약 카드·25번째 열·행 액션이 다시 기어들지 않도록 **없음**을 검사한다.
 *
 * 여기에 더해 **의미 검증** 셋이 붙어 있다 — 타입·린트가 못 잡는 자리다.
 *   1. 상태 색이 의미와 맞는가 (연체중=critical · 정상 종료=default · **검수완료=warning**)
 *   2. 좌측 고정 열이 실제로 sticky 인가 (24열 표에서 눈으로만 확인하면 놓친다)
 *   3. 렌트가가 원가−할인과 맞는가 (저장값이면 셋이 조용히 어긋난다)
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
  window.history.replaceState(null, "", "/orders-all");
});

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 부분 일치로 버그를 놓친다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

/**
 * @param search 이 화면을 여는 쿼리스트링 (`"?stat=렌트&flow=연체중"`).
 *   대시보드 타일이 만드는 링크를 그대로 흉내 낸다.
 */
function renderPage(search = "") {
  if (search) window.history.replaceState(null, "", `/orders-all${search}`);

  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <OrderListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/orders-all"
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

/** 남아 있는 건의 **주문번호**(2번째 열) — 몇 건인지가 아니라 어느 건이 남았는지를 본다 */
function visibleOrderIds(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[1].textContent ?? "",
  );
}

/** 판매자 라디오. 그룹으로 좁혀 찾는다 */
const groupRadio = (group: string, name: string) =>
  within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", {
    name,
  });

/**
 * 유형 대시 카드. **이름은 `aria-label` 로 직접 붙인 `"렌트 5건"` 형식이다**
 * (`OrderListPage.tsx` 의 `TypeDashCard`) — 건수가 이름에 들어가므로
 * 건수와 무관하게 집으려면 정규식이어야 한다.
 * 건수 자체를 볼 때는 `toHaveAccessibleName("렌트 5건")` 으로 확인한다.
 */
const typeCard = (label: string) =>
  screen.getByRole("button", { name: new RegExp(`^${label} \\d+건$`) });

/**
 * 페이지 버튼은 **숫자만** 렌더한다 (`Pagination.tsx` 가 `{item}` 을 그대로 출력).
 * "2 페이지" 같은 이름은 존재하지 않는다 — 페이지네이션 안으로 좁혀 숫자로 찾는다.
 */
const pageButton = (label: string) =>
  within(screen.getByRole("navigation", { name: "페이지네이션" })).getByRole(
    "button",
    { name: label },
  );

/** 셀렉트를 열고 옵션 하나를 고른다 */
async function pickOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(await screen.findByRole("listbox")).getByRole("option", {
      name: optionName,
    }),
  );
}

describe("OrderListPage (BabyCube S08 주문 목록)", () => {
  describe("화면 제목·기본 표시", () => {
    it("기획서의 화면 이름을 그대로 제목으로 쓴다", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { level: 1, name: "주문 목록" }),
      ).toBeVisible();
    });

    it("첫 페이지에 PAGE_SIZE(3)건만 그린다", () => {
      renderPage();
      expect(bodyRows()).toHaveLength(3);
    });

    it("총 건수는 필터 결과를 따라간다", () => {
      renderPage();
      expect(
        screen.getByRole("heading", { name: "목록 (총 7건)" }),
      ).toBeVisible();
    });

    /**
     * 저장은 `2026-08-18 14:32`, 화면은 `2026.08.18 14:32` 다 (원본 `ymdhm`).
     * 결제 일시는 **분까지** 낸다 — 같은 날 여러 건이 있으면 날짜만으로는 순서를 모른다.
     *
     * 한때 이 열이 저장 문자열을 그대로 흘려 주문 화면만 하이픈이 보였다.
     */
    it("결제 일시는 점 표기에 분까지다 — 저장 형식(하이픈)을 흘리지 않는다", () => {
      renderPage();

      const text =
        within(bodyRows()[0]).getAllByRole("cell")[6].textContent ?? "";
      expect(text).toMatch(/^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/);
      expect(text).not.toContain("-");
    });

    it("판매자 열은 본사면 '본사', 셀러면 셀러명을 직접 보여준다 (원본 y())", () => {
      renderPage();
      // 1행 = 셀러 건(아기별상사) · 2행 = 본사 건
      expect(within(bodyRows()[0]).getAllByRole("cell")[3]).toHaveTextContent(
        "아기별상사",
      );
      expect(within(bodyRows()[1]).getAllByRole("cell")[3]).toHaveTextContent(
        "본사",
      );
    });

    it("판매 건은 이용 기간·수거 정보가 —로 그려진다 (빈 칸과 구별)", async () => {
      const { user } = renderPage();
      await user.click(typeCard("판매"));

      const saleRow = bodyRows()[0];
      const cells = within(saleRow).getAllByRole("cell");
      // 5번째 열이 이용 기간, 11·12번째가 수거 택배사·수거 송장번호
      expect(cells[4]).toHaveTextContent("—");
      expect(cells[10]).toHaveTextContent("—");
      expect(cells[11]).toHaveTextContent("—");
    });
  });

  /* ── 원본 `chip.dash: !0` — 건수 카드가 곧 유형 필터다 ── */

  describe("유형 대시 (원본 StatDash)", () => {
    it("기본은 전체가 눌린 상태이고 카드마다 건수가 붙는다", () => {
      renderPage();
      expect(typeCard("전체")).toHaveAttribute("aria-pressed", "true");
      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "false");

      expect(typeCard("전체")).toHaveAccessibleName("전체 7건");
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 5건");
      expect(typeCard("판매")).toHaveAccessibleName("판매 2건");
    });

    it("렌트만 남긴다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("렌트"));

      expect(visibleOrderIds()).toEqual([
        "R-20260818-0184",
        "R-20260817-0031",
        "R-20260817-0028",
      ]);
      expect(
        screen.getByRole("heading", { name: "목록 (총 5건)" }),
      ).toBeVisible();
    });

    it("판매만 남긴다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("판매"));

      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "S-20260817-0019"]);
    });

    /*
      대시 숫자가 전체 데이터에서 세어지면 검색을 좁혀도 안 변해 **표와 모순된 숫자**가
      남는다. 카드는 유형을 뺀 나머지 조건까지 적용한 결과에서 세야 한다.
    */
    it("카드 건수는 다른 조건을 따라 줄고 전체 = 렌트 + 판매 다", async () => {
      const { user } = renderPage();
      await user.click(groupRadio("판매자", "본사"));

      expect(typeCard("전체")).toHaveAccessibleName("전체 2건");
      expect(typeCard("렌트")).toHaveAccessibleName("렌트 1건");
      expect(typeCard("판매")).toHaveAccessibleName("판매 1건");
    });

    it("고른 카드의 건수가 아래 '총 N건'과 같다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("렌트"));

      expect(
        screen.getByRole("heading", { name: "목록 (총 5건)" }),
      ).toBeVisible();
    });

    it("유형을 바꾸면 안내 문구도 바뀐다 (원본 statusTips)", async () => {
      const { user } = renderPage();
      await user.click(typeCard("렌트"));
      expect(
        screen.getByText(
          "대여 계약으로 나간 처리단위입니다. 이용 기간·보증금이 붙습니다.",
        ),
      ).toBeVisible();

      await user.click(typeCard("판매"));
      expect(
        screen.getByText(
          "판매(구매)로 나간 처리단위입니다. 이용 기간이 없어 관련 열은 빈 칸입니다.",
        ),
      ).toBeVisible();
    });

    /*
      한때 여기 "오늘 신규 주문 128건 +12건" 류의 카드 3장이 있었다.
      원본 어디에도 없는 숫자여서 걷어냈다 — 다시 기어들지 않게 못을 박는다.
    */
    it("증감(±) 표시가 없다 — 원본에 없는 숫자를 만들지 않는다", () => {
      renderPage();
      expect(screen.queryByText(/^[+-]\d+건$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
    });
  });

  describe("상태 셀렉트가 유형에 따라 갈린다", () => {
    it("판매를 고르면 렌트 전용 상태가 선택지에서 사라진다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: /상태/ }));
      expect(
        within(await screen.findByRole("listbox")).getByRole("option", {
          name: "대여중",
        }),
      ).toBeVisible();
      await user.keyboard("{Escape}");

      await user.click(typeCard("판매"));
      await user.click(screen.getByRole("combobox", { name: /상태/ }));
      const panel = await screen.findByRole("listbox");
      expect(
        within(panel).queryByRole("option", { name: "대여중" }),
      ).not.toBeInTheDocument();
      expect(
        within(panel).getByRole("option", { name: "구매확정" }),
      ).toBeVisible();
    });

    it("렌트 상태는 원본 청크의 11단계와 값·순서까지 같다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("렌트"));
      await user.click(screen.getByRole("combobox", { name: /상태/ }));

      const panel = await screen.findByRole("listbox");
      // "상태 전체" 를 뺀 11개가 원본 청크의 렌트 흐름과 같아야 한다
      expect(
        within(panel)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual([
        "상태 전체",
        "신규 주문",
        "배송 준비",
        "배송중",
        "배송 완료",
        "대여중",
        "대여중(연장)",
        "연체중",
        "수거 신청",
        "검수중",
        "검수완료",
        "반납완료",
      ]);
    });

    it("렌트 상태를 고른 뒤 판매로 옮기면 상태가 되돌아간다 (0건 화면 방지)", async () => {
      const { user } = renderPage();

      await pickOption(user, /상태/.source, "대여중");
      expect(visibleOrderIds()).toEqual(["R-20260817-0028"]);

      await user.click(typeCard("판매"));

      // 상태가 남아 있었다면 판매 × 대여중 = 0건이 되어 빈 상태가 떴을 것이다
      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        "상태 전체",
      );
      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "S-20260817-0019"]);
    });

    it("두 유형에 다 있는 상태는 유형을 바꿔도 유지된다", async () => {
      const { user } = renderPage();

      await pickOption(user, /상태/.source, "배송 준비");
      await user.click(typeCard("판매"));

      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        "배송 준비",
      );
      expect(visibleOrderIds()).toEqual(["S-20260818-0092"]);
    });
  });

  describe("판매자 라디오가 셀러 셀렉트를 연다·잠근다", () => {
    it("기본(전체)에서는 셀러 셀렉트가 잠겨 있다", () => {
      renderPage();
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeDisabled();
    });

    it("셀러를 고르면 열린다", async () => {
      const { user } = renderPage();
      await user.click(groupRadio("판매자", "셀러"));
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeEnabled();
    });

    it("본사를 고르면 본사 건만 남고 셀러 셀렉트는 다시 잠긴다", async () => {
      const { user } = renderPage();
      await user.click(groupRadio("판매자", "본사"));

      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "R-20260817-0028"]);
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeDisabled();
    });

    it("셀러를 지정한 뒤 본사로 옮기면 셀러 지정이 함께 풀린다", async () => {
      const { user } = renderPage();

      await user.click(groupRadio("판매자", "셀러"));
      await pickOption(user, /셀러/.source, "코코베베");
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);

      await user.click(groupRadio("판매자", "본사"));

      // 셀러 지정이 남아 있었다면 본사 × 코코베베 = 0건이 됐을 것이다
      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "R-20260817-0028"]);
    });
  });

  describe("검색조건 7종", () => {
    it("조건 없음은 여러 필드를 함께 훑는다", async () => {
      const { user } = renderPage();
      await user.type(screen.getByRole("textbox"), "코코베베");
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);
    });

    it("조건을 고르면 그 필드만 본다", async () => {
      const { user } = renderPage();

      await pickOption(user, "검색조건", "구매자명");
      await user.type(screen.getByRole("textbox"), "김지원");
      expect(visibleOrderIds()).toEqual(["R-20260818-0184"]);

      // 같은 검색어를 상품명 조건으로 바꾸면 걸리는 것이 없어야 한다
      await pickOption(user, "검색조건", "상품명");
      expect(bodyRows()).toHaveLength(0);
    });

    it("상품코드로 찾는다", async () => {
      const { user } = renderPage();
      await pickOption(user, "검색조건", "상품코드");
      await user.type(screen.getByRole("textbox"), "BC-ST-2210");
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);
    });

    /*
      원본 `tel` 은 "연락처" 열(= 구매자 연락처)을 가리킨다.
      이전에는 수령인 번호를 보고 있어, 표에 보이는 연락처로 검색하면 걸리지 않았다.
    */
    it("연락처는 **구매자** 연락처를 본다 (표의 '연락처' 열과 같은 값)", async () => {
      const { user } = renderPage();
      await pickOption(user, "검색조건", "연락처");
      await user.type(screen.getByRole("textbox"), "010-8820");
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);
    });

    it("수령인 번호로는 걸리지 않는다 (열 이름과 검색 대상이 어긋나지 않게)", async () => {
      const { user } = renderPage();
      await pickOption(user, "검색조건", "연락처");
      // 010-3310-7765 는 R-20260817-0031 의 **수령인** 번호다
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

      await user.click(typeCard("렌트"));
      await pickOption(user, /상태/.source, "대여중");
      await user.type(screen.getByRole("textbox"), "존재하지않는값");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(3);
      expect(typeCard("전체")).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("textbox")).toHaveValue("");
      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        "상태 전체",
      );
    });

    it("카드 헤더의 초기화도 같은 일을 한다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("판매"));
      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(typeCard("전체")).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("heading", { name: "목록 (총 7건)" }),
      ).toBeVisible();
    });
  });

  describe("페이지네이션", () => {
    it("2페이지에는 나머지 건이 온다", async () => {
      const { user } = renderPage();
      expect(visibleOrderIds()).toEqual([
        "R-20260818-0184",
        "S-20260818-0092",
        "R-20260817-0031",
      ]);

      await user.click(pageButton("2"));

      expect(visibleOrderIds()).toEqual([
        "R-20260817-0028",
        "S-20260817-0019",
        "R-20260816-0007",
      ]);
    });

    it("2페이지에서 필터를 좁히면 남은 범위로 당겨진다 (빈 표 방지)", async () => {
      const { user } = renderPage();
      await user.click(pageButton("2"));
      await user.click(typeCard("판매"));

      expect(bodyRows().length).toBeGreaterThan(0);
      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "S-20260817-0019"]);
    });
  });

  describe("미리보기 모달", () => {
    it("행을 누르면 미리보기가 열린다 (제목이 '상세'가 아니다)", async () => {
      const { user } = renderPage();
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "주문 미리보기",
      });
      expect(within(sheet).getByText("회전형 카시트 아이소픽스")).toBeVisible();
      expect(within(sheet).getByText("189,000원")).toBeVisible();
    });

    /*
      원본 주문 목록에는 행 액션이 없다 — 주문번호 → 상세 링크뿐이다.
      템플릿에서 딸려 온 `배송 처리` 버튼과 확인 모달을 걷어냈으므로 되돌아오지 않게 못을 박는다.
      모달에 남는 버튼은 헤더의 닫기 X 하나뿐이다.
    */
    it("모달에는 도메인 액션이 없다 — 원본에 행 액션이 없기 때문", async () => {
      const { user } = renderPage();
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "주문 미리보기",
      });
      expect(
        within(sheet).queryByRole("button", { name: "배송 처리" }),
      ).not.toBeInTheDocument();
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });

    it("닫기를 누르면 모달이 사라진다", async () => {
      const { user } = renderPage();
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "주문 미리보기",
      });
      await user.click(within(sheet).getByRole("button", { name: "닫기" }));

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: "주문 미리보기" }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("엑셀 다운로드", () => {
    /*
      원본은 표에 없는 열 셋(처리단위·결제금액·주문일시)을 엑셀에만 넣는다
      (`ORDER_EXPORT_EXTRA_COLUMNS`). 파일을 열어 봐야 아는 것보다 미리 알리는 편이 낫다.
      파일 이름은 원본 `exportName` + 건수(`주문목록_7건.csv`)를 따른다.
    */
    it("파일 이름과 파일에만 들어가는 열을 토스트로 알린다", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("button", { name: /엑셀 다운로드/ }));

      await waitFor(() => {
        expect(
          screen.getByText(
            "주문목록_7건.csv 를 내려받았습니다 (처리단위·결제금액·주문일시 포함)",
          ),
        ).toBeVisible();
      });
    });

    it("그 세 열은 실제로 표에 없다", () => {
      renderPage();
      const table = screen.getByRole("table");
      for (const label of ["처리단위", "결제금액", "주문일시"]) {
        expect(
          within(table).queryByRole("columnheader", { name: label }),
        ).not.toBeInTheDocument();
      }
    });
  });

  /* ── ⭐ URL 쿼리 → 초기 필터 (대시보드 링크가 실제로 걸리는지) ── */

  describe("URL 쿼리를 초기 필터로 읽는다", () => {
    it("stat 은 유형이다 — ?stat=렌트 이면 렌트만 남는다", () => {
      renderPage("?stat=렌트");

      expect(typeCard("렌트")).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("heading", { name: "목록 (총 5건)" }),
      ).toBeVisible();
    });

    it("flow 는 상태다", () => {
      renderPage("?stat=렌트&flow=연체중");

      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        "연체중",
      );
      expect(visibleOrderIds()).toEqual(["R-20260818-0184"]);
    });

    /*
      대시보드 흐름 타일이 실제로 만드는 링크 8개
      (`RENT_FUNNEL`·`SALE_FUNNEL` 의 단계 라벨)가 전부 결과를 낸다.
      상태 어휘가 어긋나면 링크는 열리는데 목록이 비어 **고장 난 것처럼** 보인다.
    */
    it.each([
      ["렌트", "신규 주문"],
      ["렌트", "대여중"],
      ["렌트", "검수중"],
      ["렌트", "반납완료"],
      ["판매", "신규 주문"],
      ["판매", "배송 준비"],
      ["판매", "배송 완료"],
      ["판매", "구매확정"],
    ])("대시보드 타일 링크 ?stat=%s&flow=%s 가 필터로 걸린다", (stat, flow) => {
      renderPage(`?stat=${stat}&flow=${flow}`);

      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        flow,
      );
    });

    it("owner 는 판매자, sellerName 은 셀러다", () => {
      renderPage("?owner=셀러&sellerName=코코베베");

      expect(groupRadio("판매자", "셀러")).toBeChecked();
      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeEnabled();
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);
    });

    it("q 는 검색어다", () => {
      renderPage("?q=코코베베");

      expect(screen.getByRole("textbox")).toHaveValue("코코베베");
      expect(visibleOrderIds()).toEqual(["R-20260817-0031"]);
    });

    it("paidAt_from·paidAt_to 는 결제일 구간이다", () => {
      renderPage("?paidAt_from=2026-08-18&paidAt_to=2026-08-18");

      expect(visibleOrderIds()).toEqual(["R-20260818-0184", "S-20260818-0092"]);
    });

    /* ── 정합성 보정 — 원본이 useEffect 로 하는 일 ── */

    it("판매에 없는 상태로 들어오면 상태를 버린다 (늘 0건인 화면 방지)", () => {
      renderPage("?stat=판매&flow=대여중");

      expect(screen.getByRole("combobox", { name: /상태/ })).toHaveTextContent(
        "상태 전체",
      );
      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "S-20260817-0019"]);
    });

    it("본사인데 셀러가 지정돼 들어오면 셀러 지정을 버린다 (손댈 수 없는 필터 방지)", () => {
      renderPage("?owner=본사&sellerName=코코베베");

      expect(screen.getByRole("combobox", { name: /셀러/ })).toBeDisabled();
      expect(visibleOrderIds()).toEqual(["S-20260818-0092", "R-20260817-0028"]);
    });

    it("모르는 값은 조용히 무시한다 — 남이 만든 링크로 화면이 비면 안 된다", () => {
      renderPage("?stat=구독&flow=없는상태&owner=외계인&sellerName=없는셀러");

      expect(typeCard("전체")).toHaveAttribute("aria-pressed", "true");
      expect(
        screen.getByRole("heading", { name: "목록 (총 7건)" }),
      ).toBeVisible();
    });
  });

  /* ── 의미 검증 — 타입·린트·렌더 테스트가 전부 통과시키는 자리 ── */

  describe("의미 1. 상태 색이 뜻과 맞는다", () => {
    it("연체중은 critical (보증금 차감으로 이어지는 자리)", () => {
      renderPage();
      expect(classList(within(bodyRows()[0]).getByText("연체중"))).toContain(
        "text-text-critical",
      );
    });

    it("정상 종료(구매확정)는 default — 더 볼 것이 없다", async () => {
      const { user } = renderPage();
      await user.click(pageButton("2"));

      const tag = screen.getByText("구매확정");
      expect(classList(tag)).toContain("text-text-sub");
      expect(classList(tag)).not.toContain("text-text-critical");
      expect(classList(tag)).not.toContain("text-text-success");
    });

    it("사람이 처리해야 끝나는 상태(신규 주문)는 warning", async () => {
      const { user } = renderPage();
      await user.click(pageButton("2"));
      expect(classList(screen.getByText("신규 주문"))).toContain(
        "text-text-warning",
      );
    });

    /*
      이름은 "완료"지만 흐름의 끝이 아니다 — 보증금 반환·차감을 사람이 처리해야
      반납완료로 간다. `default` 로 묻으면 그 대기 건이 목록에서 조용해진다.
    */
    it("검수완료는 이름과 달리 warning — 아직 사람이 할 일이 남았다", () => {
      renderPage("?stat=렌트&flow=검수완료");

      expect(classList(within(bodyRows()[0]).getByText("검수완료"))).toContain(
        "text-text-warning",
      );
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

    it("판매 건은 렌트 금액 세 열 중 원가·렌트가가 —다 (할인은 판매에도 있다)", async () => {
      const { user } = renderPage();
      await user.click(typeCard("판매"));

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[14]).toHaveTextContent("—");
      expect(cells[16]).toHaveTextContent("—");
    });

    /*
      원본 표는 24열이고 결제금액은 `ORDER_EXPORT_EXTRA_COLUMNS`(엑셀 전용)이다.
      우리가 판매 행 금액을 보이려고 25번째 열로 끼워 넣었던 것을 되돌렸으므로,
      판매 건 금액은 **미리보기 모달**에서 볼 수 있어야 한다.
    */
    it("표에서 뺀 결제금액은 미리보기 모달에서 본다", async () => {
      const { user } = renderPage();
      await user.click(typeCard("판매"));
      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog", {
        name: "주문 미리보기",
      });
      expect(within(sheet).getByText("42,000원")).toBeVisible();
    });
  });

  describe("의미 2. 좌측 고정 열 (원본 frozen 5열)", () => {
    it("표 컬럼은 원본 배열과 같은 24개다", () => {
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
  });
});
