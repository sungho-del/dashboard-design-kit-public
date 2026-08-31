import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { PointListPage } from "./PointListPage";
import { POINT_ACCOUNTS, balanceOf, point } from "./PointListPage.data";

/**
 * S18 포인트 관리 — **동작** 테스트.
 *
 * 이 화면에서 조용히 틀리기 쉬운 것은 두 가지다.
 * 1. 검색 조건 스코프가 **실제로 목록을 좁히는가**
 * 2. 한 행의 세 숫자(보유·지급·차감)가 **서로 모순되지 않는가**
 * 렌더 여부만 보면 둘 다 통과해 버린다.
 *
 * 원본 대조(`chunks/0mbh3uyfg-osc.js` 모듈 7642) 후에는 "무엇이 **없어야** 하는가"도 본다 —
 * 한때 있던 회원 등급 축이 통째로 발명이었다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker·Select 가 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로 no-op 으로 채운다.
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
      <PointListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/points"
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

/** 남아 있는 회원명(1번째 열) */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent ?? "",
  );
}

function searchBox(): HTMLElement {
  return screen.getByRole("textbox", { name: "검색어" });
}

/** 검색 조건 셀렉트에서 한 항목을 고른다 */
async function pickSearchField(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  await user.click(screen.getByRole("combobox", { name: "검색 조건" }));
  await user.click(await screen.findByRole("option", { name }));
}

describe("PointListPage", () => {
  describe("표 구성 — 원본 컬럼 6열", () => {
    it("컬럼 이름과 순서가 원본과 같다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).toEqual([
        "회원명",
        "아이디(이메일)",
        "보유 포인트",
        "누적 지급 포인트",
        "누적 차감 포인트",
        "업데이트 일시",
      ]);
    });

    it("colgroup 의 열 개수가 컬럼 개수와 같다", () => {
      renderPage();

      const cols = screen.getByRole("table").querySelectorAll("colgroup col");
      expect(cols).toHaveLength(6);
    });

    /**
     * 원본은 포인트 세 열에 `align: right` 를 주지만, 이 저장소는 **표 전체를 한
     * 기준선**에 세운다(`DESIGN.md` §7-2). 이 화면에는 배지 열도 없어 전부 좌측이다.
     */
    it("포인트 세 열도 좌측이다 — 우측 정렬은 어느 열에도 없다", () => {
      renderPage();

      const headers = within(screen.getByRole("table")).getAllByRole(
        "columnheader",
      );
      const cells = within(bodyRows()[0]).getAllByRole("cell");

      for (const el of [...headers, ...cells]) {
        expect(el.className.split(/\s+/)).not.toContain("text-right");
        expect(el.className.split(/\s+/)).not.toContain("text-center");
      }
    });

    it("업데이트 일시는 분까지, 점 구분자로 낸다 (원본 포맷터)", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[5].textContent).toBe("2026.08.24 10:12");
    });

    it("보유 포인트만 굵게 낸다 — 원본도 이 열만 `<b>` 다", () => {
      renderPage();

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      const balance = within(cells[2]).getByText("22,400P");

      expect(balance.className.split(/\s+/)).toContain("body-medium-bold");
      // 누적 지급 열에는 굵은 요소가 없다
      expect(cells[3].querySelector("strong")).toBeNull();
    });
  });

  describe("⚠️ 원본에 없어서 걷어낸 것 — 되살아나면 여기서 걸린다", () => {
    it("회원 등급 열이 없다 — 원본 컬럼은 6열이다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent);

      expect(headers).not.toContain("등급");
    });

    it("등급 세그먼트 필터가 없다 — 원본 필터는 기간·검색 두 축뿐이다", () => {
      renderPage();

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      ["브론즈", "실버", "골드", "VIP"].forEach((label) => {
        expect(screen.queryByText(label)).not.toBeInTheDocument();
      });
    });

    it("검색 조건에 '전체'가 없다 — 원본 fieldOpts 는 두 항목뿐이다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("combobox", { name: "검색 조건" }));

      const options = (await screen.findAllByRole("option")).map(
        (option) => option.textContent,
      );
      expect(options).toEqual(["회원명", "아이디(이메일)"]);
    });

    it("PageHeader 에 안내 문장을 달지 않는다", () => {
      renderPage();

      const header = screen.getByRole("heading", { name: "포인트 관리" });
      expect(header.parentElement?.textContent).toBe("포인트 관리");
    });
  });

  describe("검색 조건 스코프", () => {
    it("기본 조건은 회원명이다 — 원본도 fieldOpts 의 첫 항목을 기본으로 쓴다", () => {
      renderPage();

      expect(
        screen.getByRole("combobox", { name: "검색 조건" }),
      ).toHaveTextContent("회원명");
      expect(bodyRows()).toHaveLength(4); // 전체 6건 / PAGE_SIZE 4
      expect(screen.getByText("총 6건")).toBeVisible();
    });

    it("회원명 스코프에서는 이메일이 매칭되지 않는다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "bora");

      // 스코프가 실제로 좁혀졌다는 증거 — 안 좁혀지면 김보라가 남는다
      expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();
    });

    it("아이디(이메일)로 바꾸면 이메일로 검색된다", async () => {
      const { user } = renderPage();

      await pickSearchField(user, "아이디(이메일)");
      await user.type(searchBox(), "bora");

      expect(visibleNames()).toEqual(["김보라"]);
    });

    it("아이디(이메일) 스코프에서 한글 이름은 매칭되지 않는다", async () => {
      const { user } = renderPage();

      await pickSearchField(user, "아이디(이메일)");
      await user.type(searchBox(), "박하늘");

      expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();
    });
  });

  /*
   * ⚠️ 업데이트 기간(DatePicker) 필터는 여기서 검증하지 못한다 —
   * 달력을 열어 두 날짜를 고르는 조작이 jsdom 에서 안정적으로 재현되지 않는다.
   * 같은 이유로 `MemberListPage.test.tsx` 도 기간을 다루지 않는다.
   * 렌더 여부만 확인하는 테스트는 두지 않았다(있으나 마나 한 통과를 만든다).
   */

  describe("숫자 정합 — 보유 = 누적 지급 − 누적 차감", () => {
    it("표에 찍힌 세 숫자가 서로 어긋나지 않는다", () => {
      renderPage();

      // 첫 페이지 4행을 원본 데이터와 하나씩 맞춰 본다
      bodyRows().forEach((row, index) => {
        const account = POINT_ACCOUNTS[index];
        const cells = within(row).getAllByRole("cell");

        expect(cells[2]).toHaveTextContent(point(balanceOf(account)));
        expect(cells[3]).toHaveTextContent(point(account.granted));
        expect(cells[4]).toHaveTextContent(point(account.used));
        // 계산 결과가 아니라 **눈에 보이는 문자열**로 다시 확인한다
        expect(account.granted - account.used).toBe(balanceOf(account));
      });
    });

    it("전액 사용한 회원은 보유 0P 로 표시된다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "최시우");

      const cells = within(bodyRows()[0]).getAllByRole("cell");
      expect(cells[2]).toHaveTextContent("0P");
      expect(cells[3]).toHaveTextContent("6,000P");
      expect(cells[4]).toHaveTextContent("6,000P");
    });

    it("천 단위 구분자는 쉼표다", () => {
      renderPage();

      expect(screen.getByText("22,400P")).toBeVisible();
      expect(screen.getByText("156,000P")).toBeVisible();
    });
  });

  describe("빈 상태와 초기화", () => {
    it("매칭이 없으면 EmptyState 를 띄우고 표·페이지네이션을 걷어낸다", async () => {
      const { user } = renderPage();

      expect(
        screen.getByRole("navigation", { name: "페이지네이션" }),
      ).toBeInTheDocument();

      await user.type(searchBox(), "없는회원");

      expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: "페이지네이션" }),
      ).not.toBeInTheDocument();
    });

    it("빈 상태에서도 툴바는 남는다 — 조건을 되돌릴 수단이 필요하다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는회원");

      expect(searchBox()).toBeVisible();
      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
    });

    it("초기화는 검색 조건과 검색어를 한꺼번에 되돌린다", async () => {
      const { user } = renderPage();

      await pickSearchField(user, "아이디(이메일)");
      await user.type(searchBox(), "bora");
      expect(screen.getByText("총 1건")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "초기화" }));

      expect(screen.getByText("총 6건")).toBeVisible();
      expect(searchBox()).toHaveValue("");
      // 검색 조건 셀렉트도 함께 돌아와야 다음 검색이 어긋나지 않는다
      expect(
        screen.getByRole("combobox", { name: "검색 조건" }),
      ).toHaveTextContent("회원명");
    });

    it("빈 상태의 '필터를 초기화' 버튼으로도 전체가 돌아온다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "없는회원");
      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("총 6건")).toBeVisible();
    });
  });

  describe("페이지네이션", () => {
    it("6건을 4건씩 나눠 2페이지로 보여준다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));

      expect(bodyRows()).toHaveLength(2);
      expect(visibleNames()).toEqual(["정다인", "한서윤"]);
    });

    it("검색어를 넣으면 1페이지로 되돌아간다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));
      await user.type(searchBox(), "이준서");

      expect(screen.getByRole("button", { name: "1" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(visibleNames()).toEqual(["이준서"]);
    });
  });

  describe("회원명 → 포인트 미리보기", () => {
    it("회원명을 누르면 그 회원의 포인트가 모달에 뜬다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "박하늘" }));

      const sheet = await screen.findByRole("dialog");
      expect(
        within(sheet).getByRole("heading", { name: "포인트 미리보기" }),
      ).toBeVisible();
      expect(
        within(sheet)
          .getAllByRole("term")
          .map((term) => term.textContent),
      ).toEqual([
        "아이디",
        "보유 포인트",
        "누적 지급 포인트",
        "누적 차감 포인트",
        "업데이트 일시",
      ]);
      expect(
        within(sheet)
          .getAllByRole("definition")
          .map((value) => value.textContent),
      ).toEqual([
        "haneul.park@example.com",
        "58,000P",
        "156,000P",
        "98,000P",
        "2026.08.22 09:05",
      ]);
    });

    it("라벨 폭을 다섯 행에 똑같이 준다 — 한 행만 넓히면 라벨 열이 어긋난다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "박하늘" }));
      const sheet = await screen.findByRole("dialog");

      const widths = within(sheet)
        .getAllByRole("term")
        .map((term) => term.style.width);
      expect(new Set(widths)).toEqual(new Set(["112px"]));
    });

    it("행 전체는 눌리지 않는다 — 원본에서 링크는 회원명 하나다", async () => {
      const { user } = renderPage();

      await user.click(within(bodyRows()[0]).getAllByRole("cell")[3]);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("모달에 행 액션 버튼을 두지 않는다 — 지급·차감은 상세 화면의 일이다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "김보라" }));
      const sheet = await screen.findByRole("dialog");

      expect(
        within(sheet).queryByRole("button", { name: "회원 상세 보기" }),
      ).not.toBeInTheDocument();
      // 남는 버튼은 모달을 닫는 것뿐이다
      expect(within(sheet).getAllByRole("button")).toHaveLength(1);
      expect(onNavSelect).not.toHaveBeenCalled();
    });
  });

  describe("엑셀 다운로드", () => {
    it("지금 조회된 건수를 밝혀 토스트로 알린다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "김보라");
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(
        await screen.findByText("조회 결과 1건을 내려받았습니다"),
      ).toBeVisible();
    });
  });
});
