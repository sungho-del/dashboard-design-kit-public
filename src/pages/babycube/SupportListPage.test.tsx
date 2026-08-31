import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SupportListPage } from "./SupportListPage";
import { CUSTOMER_INQUIRIES, SELLER_ASKS } from "./SupportListPage.data";

/**
 * S22 문의 관리 — **동작** 테스트.
 *
 * 원본 대조(`chunks/1au6ppob25_5m.js` 모듈 45533) 후 이 화면의 핵심 계약은
 * **탭마다 몸통이 통째로 다르다**는 것이다 — 컬럼도, 필터도, 요약도 다르다.
 * 렌더 여부만 보면 두 탭이 같은 표를 돌려써도 통과하므로 여기서는
 * (1) 탭이 실제로 다른 표를 그리는가 (2) 조건이 실제로 목록을 좁히는가
 * (3) 한때 있던 세그먼트·증감·답변 등록이 되살아나지 않았는가를 본다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker·Select·Tooltip 이 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로
 * no-op 으로 채운다.
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

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <SupportListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/support"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

function headers(): (string | null)[] {
  return within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .map((cell) => cell.textContent);
}

function cellText(row: HTMLElement, index: number): string {
  return within(row).getAllByRole("cell")[index].textContent ?? "";
}

/** 상태 대시 버튼. 접근가능 이름은 "미답변 3건" 처럼 라벨+건수 한 문자열이다 */
function dashButton(label: string): HTMLElement {
  return within(screen.getByRole("group", { name: "문의 상태" })).getByRole(
    "button",
    { name: new RegExp(`^${label} `) },
  );
}

async function goToSellerTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "셀러 문의" }));
}

async function pick(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("SupportListPage", () => {
  describe("탭 — 몸통이 통째로 다르다 (원본 구조)", () => {
    it("고객 문의로 시작한다 (원본 기본 탭)", () => {
      renderPage();

      expect(screen.getByRole("tab", { name: "고객 문의" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
    });

    it("고객 탭 컬럼은 원본 7열이다", () => {
      renderPage();

      expect(headers()).toEqual([
        "회원명",
        "유형",
        "제목",
        "내용",
        "접수일",
        "답변일",
        "상태",
      ]);
    });

    it("셀러 탭 컬럼은 원본 5열이다 — 유형과 답변일이 없다", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);

      expect(headers()).toEqual(["셀러", "제목", "내용", "접수일", "상태"]);
      expect(headers()).not.toContain("유형");
      expect(headers()).not.toContain("답변일");
    });

    it("셀러 탭에는 필터도 페이지네이션도 없다 (원본은 size 100 으로 한 번에 받는다)", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
      // 5건이 한 화면에 다 나온다
      expect(bodyRows()).toHaveLength(SELLER_ASKS.length);
    });

    it("셀러 탭에는 상태 대시가 없고, 고객 탭에는 셀러 요약이 없다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("group", { name: "문의 상태" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("미답변 셀러 문의")).not.toBeInTheDocument();

      await goToSellerTab(user);

      expect(
        screen.queryByRole("group", { name: "문의 상태" }),
      ).not.toBeInTheDocument();
      expect(screen.getByText("미답변 셀러 문의")).toBeVisible();
    });
  });

  describe("고객 탭 — 상태 대시가 유일한 상태 컨트롤", () => {
    it("상태별 건수를 보여준다", () => {
      renderPage();

      expect(dashButton("전체")).toHaveAccessibleName("전체 6건");
      expect(dashButton("미답변")).toHaveAccessibleName("미답변 3건");
      expect(dashButton("답변완료")).toHaveAccessibleName("답변완료 3건");
    });

    it("누르면 그 상태로 좁혀진다", async () => {
      const { user } = renderPage();

      await user.click(dashButton("미답변"));

      expect(dashButton("미답변")).toHaveAttribute("aria-pressed", "true");
      expect(bodyRows()).toHaveLength(3);
      expect(screen.getByText("총 3건")).toBeVisible();
      bodyRows().forEach((row) => expect(cellText(row, 6)).toBe("미답변"));
    });

    it("상태로 좁혀도 대시 건수는 흔들리지 않는다 — 비교할 것을 잃지 않는다", async () => {
      const { user } = renderPage();

      await user.click(dashButton("미답변"));

      expect(dashButton("답변완료")).toHaveAccessibleName("답변완료 3건");
      expect(dashButton("전체")).toHaveAccessibleName("전체 6건");
    });

    it("다른 조건을 걸면 대시 건수가 함께 줄어든다 — 대시는 나머지 조건 위에서 센다", async () => {
      const { user } = renderPage();

      await pick(user, "문의 유형", "포인트");

      expect(dashButton("전체")).toHaveAccessibleName("전체 2건");
      expect(dashButton("미답변")).toHaveAccessibleName("미답변 1건");
      expect(dashButton("답변완료")).toHaveAccessibleName("답변완료 1건");
    });
  });

  describe("고객 탭 — 검색 조건 스코프", () => {
    it("기본 조건은 회원명이다 (원본 fieldOpts 의 첫 항목)", () => {
      renderPage();

      expect(
        screen.getByRole("combobox", { name: "검색 조건" }),
      ).toHaveTextContent("회원명");
    });

    it("회원명 스코프에서는 제목이 매칭되지 않는다", async () => {
      const { user } = renderPage();

      await user.type(
        screen.getByRole("textbox", { name: "검색어" }),
        "포인트",
      );

      // 회원명에 "포인트"가 없다 → 스코프가 실제로 좁혀졌다는 증거
      expect(screen.getByText("해당 조건의 문의가 없습니다")).toBeVisible();
    });

    it("제목+내용으로 바꾸면 본문에서도 찾는다", async () => {
      const { user } = renderPage();

      await pick(user, "검색 조건", "제목+내용");
      await user.type(
        screen.getByRole("textbox", { name: "검색어" }),
        "포인트",
      );

      expect(bodyRows()).toHaveLength(2);
    });

    it("유형 스코프에서는 유형 이름으로 찾는다", async () => {
      const { user } = renderPage();

      await pick(user, "검색 조건", "유형");
      await user.type(
        screen.getByRole("textbox", { name: "검색어" }),
        "플랫폼 오류",
      );

      expect(bodyRows()).toHaveLength(2);
    });
  });

  describe("고객 탭 — 유형·기간 기준", () => {
    it("유형 셀렉트는 원본 3종 + '유형 전체'다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "문의 유형" }));

      const options = (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      );
      expect(options).toEqual([
        "유형 전체",
        "회원정보",
        "포인트",
        "플랫폼 오류",
      ]);
    });

    it("기간 기준은 접수일·답변일 두 가지다 (원본 date.fields)", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "기간 기준" }));

      const options = (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      );
      expect(options).toEqual(["접수일", "답변일"]);
    });

    it("초기화는 유형과 검색어를 한꺼번에 되돌린다", async () => {
      const { user } = renderPage();

      await pick(user, "문의 유형", "포인트");
      expect(screen.getByText("총 2건")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(screen.getByText("총 6건")).toBeVisible();
      expect(
        screen.getByRole("combobox", { name: "문의 유형" }),
      ).toHaveTextContent("유형 전체");
    });
  });

  describe("날짜·값 없음 표기", () => {
    it("접수일·답변일은 날짜만, 점 구분자로 낸다", () => {
      renderPage();

      // 최신순 4번째 = 박하늘(08-22 접수 / 08-22 답변)
      const row = bodyRows()[3];
      expect(cellText(row, 4)).toBe("2026.08.22");
      expect(cellText(row, 5)).toBe("2026.08.22");
      expect(cellText(row, 4)).not.toContain("10:20");
    });

    it("답변이 없으면 '-' 다 — 상태 열이 이미 미답변을 말한다", () => {
      renderPage();

      const row = bodyRows()[0]; // 미답변
      expect(cellText(row, 5)).toBe("-");
      expect(cellText(row, 6)).toBe("미답변");
    });
  });

  describe("셀러 요약", () => {
    it("미답변과 전체 건수를 목록에서 세어 보여준다", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);

      const pending = SELLER_ASKS.filter(
        (ask) => ask.status === "pending",
      ).length;
      expect(screen.getByText("미답변 셀러 문의")).toBeVisible();
      expect(screen.getByText(String(pending))).toBeVisible();
      expect(screen.getByText("전체 셀러 문의")).toBeVisible();
      expect(screen.getByText(String(SELLER_ASKS.length))).toBeVisible();
    });

    it("미답변 수치만 주의색으로 낸다 (원본도 그 값에만 --warn 을 준다)", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);

      const pending = SELLER_ASKS.filter(
        (ask) => ask.status === "pending",
      ).length;
      const pendingValue = screen.getByText(String(pending));
      const totalValue = screen.getByText(String(SELLER_ASKS.length));

      expect(pendingValue.className.split(/\s+/)).toContain(
        "text-text-warning",
      );
      expect(totalValue.className.split(/\s+/)).not.toContain(
        "text-text-warning",
      );
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("상태 세그먼트가 없다 — 상태 축의 컨트롤은 대시 하나뿐이다", () => {
      renderPage();

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    });

    it("셀러 요약에 증감·비교 기준이 없다 — 지어낸 수치였다", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);

      expect(screen.queryByText("어제 대비")).not.toBeInTheDocument();
      expect(screen.queryByText("지난주 대비")).not.toBeInTheDocument();
      expect(screen.queryByText(/^[+-]\d+건$/)).not.toBeInTheDocument();
    });

    it("엑셀 다운로드가 없다 — 이 화면은 공용 목록 셸을 쓰지 않는다", () => {
      renderPage();

      expect(
        screen.queryByRole("button", { name: "엑셀 다운로드" }),
      ).not.toBeInTheDocument();
    });

    it("답변 등록이 없다 — 원본 목록에 조치가 하나도 없다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "포인트가 적립되지 않았어요" }),
      );
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: "답변 등록" }),
      ).not.toBeInTheDocument();
      // 남는 버튼은 모달을 닫는 것뿐이다
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
    });

    it("PageHeader 에 안내 문장을 달지 않는다", () => {
      renderPage();

      expect(
        screen.queryByText(/탭으로 나눠 응대 상태를 관리합니다/),
      ).not.toBeInTheDocument();
    });
  });

  describe("페이지네이션 (고객 탭)", () => {
    it("6건을 4건씩 나눠 2페이지로 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(4);
      expect(
        screen.getByText(`총 ${CUSTOMER_INQUIRIES.length}건`),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(bodyRows()).toHaveLength(2);
    });

    it("조건을 바꾸면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.click(dashButton("미답변"));

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });

  describe("제목 → 문의 미리보기", () => {
    it("고객 문의는 유형·답변일까지 보여준다", async () => {
      const { user } = renderPage();

      await user.click(
        screen.getByRole("button", { name: "휴대폰 번호를 바꾸고 싶어요" }),
      );

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["회원명", "유형", "접수일", "답변일", "상태"]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual(["박하늘", "회원정보", "2026.08.22", "2026.08.22", "답변완료"]);
    });

    it("셀러 문의에는 유형·답변일 항목이 아예 없다 — 원본 컬럼에 없는 값이다", async () => {
      const { user } = renderPage();

      await goToSellerTab(user);
      await user.click(
        screen.getByRole("button", { name: "정산 금액이 다릅니다" }),
      );

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual(["셀러", "접수일", "상태"]);
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 제목 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[3]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
