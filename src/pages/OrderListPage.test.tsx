import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { OrderListPage } from "./OrderListPage";
import { TEMPLATE_ROUTES } from "./routes";

/**
 * `App.test.tsx` 는 이 화면을 **경유지로만** 훑는다 — 제목·컬럼 헤더가 있는지,
 * 행을 눌러 상세 페이지까지 갈 수 있는지 정도다. 그래서 이 화면의 상호작용
 * (필터 · 검색 · 빈 상태 · 드롭다운 · 주문취소 모달 · 페이지네이션)은
 * **통째로 빠져도 통과하는** 상태였다. 이 파일이 그 구멍을 메운다.
 *
 * 따라서 여기서는 클래스가 아니라 **무엇이 보이고 무엇이 사라지는가**를 본다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * Dropdown·DatePicker 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로
 * no-op 으로 채운다. **좌표는 검증하지 않는다** — 모든 요소의 크기가 0 이라 무의미하다.
 */
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
 * `useToast()` 를 쓰므로 `ToastProvider` 없이는 렌더 자체가 실패한다.
 * 네비게이션 콜백은 mock 으로 두고 **호출 인자까지** 검증한다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <OrderListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="order-list"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/**
 * 헤더 행을 뺀 데이터 행.
 * 빈 상태에서는 `DataTableShell` 이 표를 통째로 걷어내므로 빈 배열이 된다.
 */
function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/**
 * 남아 있는 주문의 "주문자" 셀만 뽑는다 — 개수뿐 아니라 **어떤 주문이**
 * 남았는지까지 한 번에 비교하기 위함이다(3번째 컬럼).
 */
function visibleCustomers(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[2].textContent ?? "",
  );
}

/** 검색 입력은 이 화면의 유일한 textbox 다 (DatePicker 트리거는 button) */
function searchBox(): HTMLElement {
  return screen.getByRole("textbox");
}

/** 행의 "관리" 아이콘 버튼 — label 은 `${주문번호} 관리` 로 붙는다 */
function manageButton(orderId: string): HTMLElement {
  return screen.getByRole("button", { name: `${orderId} 관리` });
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

describe("OrderListPage", () => {
  describe("통계 요약 카드", () => {
    it("STATS 3장을 라벨·값과 함께 보여준다", () => {
      renderPage();

      // 카드가 한 장이라도 빠지면 여기서 걸린다
      expect(screen.getByText("오늘 주문")).toBeVisible();
      expect(screen.getByText(statText("42건"))).toBeVisible();

      expect(screen.getByText("오늘 매출")).toBeVisible();
      expect(screen.getByText(statText("3,840,000원"))).toBeVisible();

      expect(screen.getByText("신규 회원")).toBeVisible();
      expect(screen.getByText(statText("17명"))).toBeVisible();
    });
  });

  describe("상태 대시 = 필터 (StatGrid)", () => {
    it("기본은 전체 — 첫 페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      // 샘플 5건 / PAGE_SIZE 3 → 1페이지 3건, 2페이지 2건
      expect(bodyRows()).toHaveLength(3);
      expect(screen.getByText("총 5건")).toBeVisible();
      expect(screen.getByRole("button", { name: /^전체 / })).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });

    it("결제완료를 고르면 결제완료 주문만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^결제완료 / }));

      // ORDERS 의 paid 는 2건 — 김성호 · 최다은
      expect(bodyRows()).toHaveLength(2);
      expect(visibleCustomers()).toEqual(["김성호", "최다은"]);
      // 푸터의 건수 표시도 필터를 따라와야 한다
      expect(screen.getByText("총 2건")).toBeVisible();
    });

    it("입금대기를 고르면 1건만 남는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^입금대기 / }));

      expect(visibleCustomers()).toEqual(["박준영"]);
    });
  });

  describe("검색", () => {
    it("상품명 일부로 검색하면 해당 주문만 남는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "허브");

      expect(bodyRows()).toHaveLength(1);
      expect(screen.getByText("USB-C 허브 7in1")).toBeVisible();
      expect(visibleCustomers()).toEqual(["박준영"]);
    });

    it("주문번호로도 검색된다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "20260817-0019");

      expect(visibleCustomers()).toEqual(["정우진"]);
    });

    it("주문자 이름으로도 검색된다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "이서연");

      expect(visibleCustomers()).toEqual(["이서연"]);
    });
  });

  describe("빈 상태", () => {
    it("매칭이 없으면 EmptyState 를 띄우고 표와 페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      // 사라지는 것을 검증하려면 먼저 있었다는 사실을 고정해야 한다
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: "페이지네이션" }),
      ).toBeInTheDocument();

      await user.type(searchBox(), "없는상품");

      expect(screen.getByText("조건에 맞는 주문이 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      // DataTableShell 의 계약 — isEmpty 면 푸터(페이지네이션)도 함께 감춘다
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("빈 상태에서도 툴바는 남는다 — 조건을 되돌릴 수단이 필요하다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는상품");

      expect(screen.getByRole("button", { name: /^전체 / })).toBeVisible();
      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
      expect(searchBox()).toHaveValue("없는상품");
    });
  });

  describe("초기화", () => {
    it("필터·검색을 건 뒤 초기화를 누르면 전체가 돌아온다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: /^결제완료 / }));
      await user.type(searchBox(), "김성호");
      expect(bodyRows()).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(bodyRows()).toHaveLength(3); // 1페이지 기준 (전체 5건)
      expect(screen.getByText("총 5건")).toBeVisible();
      // 화면만 되돌아오고 컨트롤이 남아 있으면 다음 조작에서 어긋난다
      expect(screen.getByRole("button", { name: /^전체 / })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      expect(searchBox()).toHaveValue("");
    });

    it("빈 상태의 '필터 초기화' 버튼으로도 전체가 돌아온다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는상품");
      await user.click(screen.getByRole("button", { name: "필터 초기화" }));

      expect(bodyRows()).toHaveLength(3); // 1페이지 기준 (전체 5건)
      expect(screen.getByText("총 5건")).toBeVisible();
      expect(searchBox()).toHaveValue("");
    });
  });

  describe("페이지네이션", () => {
    it("총 건수를 표시하고 페이지를 옮길 수 있다", async () => {
      const { user } = renderPage();

      expect(screen.getByText("총 5건")).toBeVisible();
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
      await user.click(screen.getByRole("button", { name: /^결제완료 / }));

      // 3페이지를 보던 중 결과가 2건으로 줄면 빈 화면을 보게 된다
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

      await user.click(manageButton("20260818-0001"));

      const menu = await screen.findByRole("menu");
      expect(
        within(menu)
          .getAllByRole("menuitem")
          .map((item) => item.textContent),
      ).toEqual(["상세 보기", "번호 복사", "주문 취소"]);
    });

    it("드롭다운은 행 클릭을 막는다 — 미리보기 모달이 열리지 않는다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260818-0001"));

      // 메뉴는 열리되(=클릭 자체는 먹혔다)
      expect(await screen.findByRole("menu")).toBeInTheDocument();
      // 행의 onClick 까지 타면 미리보기 모달이 함께 열린다.
      // 소스의 stopPropagation 이 빠지면 여기서 걸린다
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("'상세 보기'로도 미리보기 모달이 열린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260817-0031"));
      await user.click(
        await screen.findByRole("menuitem", { name: "상세 보기" }),
      );

      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByText("USB-C 허브 7in1")).toBeVisible();
    });

    it("'번호 복사'는 토스트로 알린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260818-0002"));
      await user.click(
        await screen.findByRole("menuitem", { name: "번호 복사" }),
      );

      expect(await screen.findByText("주문번호를 복사했습니다")).toBeVisible();
      // 선택 후에는 메뉴가 닫힌다
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });
  });

  describe("주문 취소 모달", () => {
    it("'주문 취소'를 고르면 확인 모달이 열린다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260818-0001"));
      await user.click(
        await screen.findByRole("menuitem", { name: "주문 취소" }),
      );

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "주문을 취소할까요?" }),
      ).toBeVisible();
      // 어떤 주문을 취소하는지가 모달 안에 남아 있어야 한다
      expect(
        within(modal).getByText("20260818-0001 · 무선 이어폰 Pro"),
      ).toBeVisible();
    });

    it("'닫기'를 누르면 아무것도 취소하지 않고 닫힌다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260818-0001"));
      await user.click(
        await screen.findByRole("menuitem", { name: "주문 취소" }),
      );

      // 헤더의 X 버튼도 이름이 "닫기"라 푸터 버튼을 콕 집어 누른다
      const modal = await screen.findByRole("dialog");
      const footer = modal.querySelector('[data-slot="footer"]');
      expect(footer).not.toBeNull();
      await user.click(
        within(footer as HTMLElement).getByRole("button", { name: "닫기" }),
      );

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      // 닫기가 취소를 실행해 버리면 최악이다 — 토스트가 뜨지 않았음을 못박는다
      expect(screen.queryByText("주문을 취소했습니다")).not.toBeInTheDocument();
    });

    it("'주문 취소'를 확정하면 critical 토스트를 띄우고 닫는다", async () => {
      const { user } = renderPage();

      await user.click(manageButton("20260818-0001"));
      await user.click(
        await screen.findByRole("menuitem", { name: "주문 취소" }),
      );

      const modal = await screen.findByRole("dialog");
      const footer = modal.querySelector('[data-slot="footer"]') as HTMLElement;
      await user.click(
        within(footer).getByRole("button", { name: "주문 취소" }),
      );

      const toast = await screen.findByText("주문을 취소했습니다");
      expect(toast).toHaveAttribute("data-tone", "critical");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("행 클릭 → 미리보기 모달", () => {
    it("행을 클릭하면 그 주문의 정보가 미리보기 모달에 뜬다", async () => {
      const { user } = renderPage();

      await user.click(bodyRows()[0]);

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "주문 미리보기" }),
      ).toBeVisible();
      // 헤더 설명은 주문번호
      expect(within(sheet).getByText("20260818-0001")).toBeVisible();

      // InfoList 는 dl/dt/dd 시맨틱이라 라벨이 term 으로 읽힌다
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["상품", "주문자", "결제금액", "주문일시"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual(["무선 이어폰 Pro", "김성호", "189,000원", "2026-08-18 14:32"]);
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

      // 같은 페이지의 다른 행 (5번째 주문은 2페이지로 넘어갔다)
      await user.click(bodyRows()[2]);

      const sheet = await screen.findByRole("dialog");
      expect(within(sheet).getByText("USB-C 허브 7in1")).toBeVisible();
      expect(within(sheet).getByText("68,000원")).toBeVisible();
    });

    it("'전체 상세 보기'는 주문 상세로 이동시키고 미리보기 모달을 닫는다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(bodyRows()[0]);
      await user.click(
        await screen.findByRole("button", { name: "전체 상세 보기" }),
      );

      expect(onNavSelect).toHaveBeenCalledTimes(1);
      expect(onNavSelect).toHaveBeenCalledWith(TEMPLATE_ROUTES.orderDetail);
      // 닫지 않고 이동하면 상세 페이지 위에 모달이 남는다
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    });

    it("'배송 처리'는 이동 없이 토스트만 띄운다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(bodyRows()[0]);
      await user.click(
        await screen.findByRole("button", { name: "배송 처리" }),
      );

      expect(await screen.findByText("배송 처리했습니다")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();
    });
  });
});
