import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { MemberListPage } from "./MemberListPage";

/* -------------------------------------------------------------------------
 * S02 회원 관리 — 목록형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 의미**다 — 상태 대시가 곧 상태 필터라는 것 ·
 * **상태별 건수** · **검색 조건 전환** · 빈 상태와 복구 · 미리보기 모달 ·
 * **이용 내역의 렌트/구매 분리** · 상태 색이 의미와 맞는지.
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 함께 본다
 * 증감(±%) 요약 카드 · 행 드롭다운 · 이용 정지 모달은 **원본 어드민에 없어서 걷어냈다.**
 * 지우기만 하면 다음 사람이 "있으면 좋겠다"고 되살리므로, 없다는 것을 검사로 못 박는다.
 *
 * jsdom 에는 레이아웃도 `ResizeObserver`/`IntersectionObserver` 도 없다.
 * DatePicker·Select·Tooltip 이 쓰는 floating-ui `autoUpdate` 가 둘을 요구하므로
 * no-op 으로 채운다. **좌표는 검증하지 않는다** — 모든 요소의 크기가 0 이라 무의미하다.
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

/**
 * `useToast()` 를 쓰므로 `ToastProvider` 없이는 렌더 자체가 실패한다.
 * 네비게이션 콜백은 mock 으로 둔다.
 */
function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  render(
    <ToastProvider position="bottom">
      <MemberListPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/members"
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

/** 남아 있는 회원의 "이름" 셀만 뽑는다 — 몇 건인지뿐 아니라 **누가** 남았는지까지 본다 */
function visibleNames(): string[] {
  return bodyRows().map(
    (row) => within(row).getAllByRole("cell")[0].textContent ?? "",
  );
}

/** 이름으로 그 회원의 행을 찾는다 */
function rowOf(name: string): HTMLElement {
  const cell = screen.getAllByText(name)[0];
  return cell.closest("tr") as HTMLElement;
}

/** 검색 조건 셀렉트는 이 화면의 유일한 combobox 다 */
async function chooseSearchField(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(screen.getByRole("combobox"));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", { name: label }),
  );
}

/** 검색어 입력은 이 화면의 유일한 textbox 다 (DatePicker 트리거는 button) */
const searchBox = () => screen.getByRole("textbox");

/**
 * 상태 대시 상자. 접근가능 이름을 `aria-label` 로 못 박아 두었으므로
 * **건수까지 정확히 맞춘다** — 건수가 틀어지면 여기서 걸린다.
 */
const statusBox = (name: string) => screen.getByRole("button", { name });

describe("MemberListPage (S02 회원 관리)", () => {
  /**
   * 원본 목록 셸의 순서는 `상태 대시 → 검색조건 바 → [총 건수·엑셀 | 표 | 페이지네이션]` 이다.
   */
  describe("상태 대시 — 원본 StatDash", () => {
    it("전체와 상태 4종의 건수를 클릭 없이 보여준다", () => {
      renderPage();

      expect(statusBox("전체 6명")).toBeVisible();
      expect(statusBox("정상 3명")).toBeVisible();
      expect(statusBox("정지 1명")).toBeVisible();
      expect(statusBox("휴면 1명")).toBeVisible();
      expect(statusBox("탈퇴 1명")).toBeVisible();
    });

    it("대시 상자가 곧 상태 필터다 — 누르면 목록이 그 상태로 좁혀진다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("정상 3명"));

      expect(visibleNames()).toEqual(["박수진", "김도현", "최유나"]);
      expect(screen.getByText("총 3건")).toBeVisible();
      expect(statusBox("정상 3명")).toHaveAttribute("aria-pressed", "true");
      expect(statusBox("전체 6명")).toHaveAttribute("aria-pressed", "false");
    });

    it("휴면을 고르면 휴면 회원만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("휴면 1명"));

      expect(visibleNames()).toEqual(["이하늘"]);
    });

    /**
     * 선택은 **테두리**로, hover는 **면**으로 — 두 신호가 서로 다른 축을 써야 겹치지 않는다.
     *
     * `action-primary-tonal` 로 면을 칠하면 안 된다: `rgba(113,118,128,0.1)` 이라
     * 흰 카드 위에서 `#f1f1f2` 가 되는데, 기본 `surface-sub`(`#f8f9fb`) 와는 2.4% 차이인 반면
     * hover `surface-slate-secondary`(`#e2e5e9`) 보다는 **밝다.** 마우스만 올린 카드가
     * 골라 둔 카드보다 진해져 선택 신호가 hover 에 진다. (`design-core.md` 필수 규칙 3)
     */
    it("고른 카드는 배경이 아니라 테두리로 표시한다 — hover 와 신호가 겹치지 않게", async () => {
      const { user } = renderPage();

      await user.click(statusBox("정상 3명"));

      const picked = statusBox("정상 3명").className.split(/\s+/);
      const other = statusBox("휴면 1명").className.split(/\s+/);

      /* 고른 카드: 테두리만 바뀐다 */
      expect(picked).toContain("outline-action-primary");
      expect(picked).not.toContain("bg-action-primary-tonal");

      /* 배경은 고르기 전과 같다 — 면은 hover 전용 축이다 */
      expect(picked).toContain("bg-surface-sub");
      expect(other).toContain("bg-surface-sub");

      /* hover 는 안 고른 카드에만 걸린다 (고른 카드가 hover 로 흐려지지 않게) */
      expect(other).toContain("hover:bg-surface-slate-secondary");
      expect(picked).not.toContain("hover:bg-surface-slate-secondary");
    });

    /**
     * ⚠️ 건수는 **상태를 뺀 나머지 조건**에서 센다.
     * 상태로 이미 좁힌 결과에서 세면 하나를 고르는 순간 나머지가 전부 0 이 되어
     * 대시가 비교할 것을 잃는다.
     */
    it("상태를 골라도 다른 상태의 건수는 그대로 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("정상 3명"));

      expect(statusBox("정지 1명")).toBeVisible();
      expect(statusBox("탈퇴 1명")).toBeVisible();
    });

    it("검색으로 좁히면 상태별 건수도 함께 줄어든다", async () => {
      const { user } = renderPage();

      await chooseSearchField(user, "아이디(이메일)");
      await user.type(searchBox(), "haneul");

      // 이하늘 1명만 남았으니 전체 1 · 휴면 1 · 나머지 0
      expect(statusBox("전체 1명")).toBeVisible();
      expect(statusBox("휴면 1명")).toBeVisible();
      expect(statusBox("정상 0명")).toBeVisible();
    });

    /** 원본은 상태 카드에 `statusTips` 를 툴팁으로 단다. "전체"에는 없다 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox("정지 1명"));

      expect(
        await screen.findByText(
          "관리자가 이용을 정지한 회원입니다. 정지를 풀면 [정상]으로 돌아갑니다.",
        ),
      ).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 상단 카드는 상태별 **건수**뿐이고 증감(±%)도 비교 기준 문구도 없다.
     */
    it("증감 지표·비교 기준 문구를 두지 않는다", () => {
      renderPage();

      expect(screen.queryByText("전체 회원")).not.toBeInTheDocument();
      expect(screen.queryByText(/대비$/)).not.toBeInTheDocument();
      expect(document.querySelector(".lucide-trending-up")).toBeNull();
      expect(document.querySelector(".lucide-trending-down")).toBeNull();
    });
  });

  describe("목록과 페이징", () => {
    it("기본은 전체 — 첫 페이지에 PAGE_SIZE 만큼 보인다", async () => {
      const { user } = renderPage();

      // 샘플 6건 / PAGE_SIZE 4 → 1페이지 4건, 2페이지 2건
      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("총 6건")).toBeVisible();
      expect(statusBox("전체 6명")).toHaveAttribute("aria-pressed", "true");

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(2);
    });

    /** 원본 컬럼 정의(`MEMBER_COLUMNS`)의 이름과 **순서**가 정본이다 */
    it("표 컬럼은 원본 순서 그대로다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "이름",
        "아이디(이메일)",
        "연락처",
        "가입일",
        "자녀",
        "상태",
        "이용",
        "관리",
      ]);

      /*
        `<colgroup>` 의 `<col>` 개수가 컬럼 수와 어긋나면 **폭 배분이 통째로 한 칸씩 밀린다** —
        렌더도 되고 타입도 통과하므로 눈으로 보기 전에는 드러나지 않는다.
      */
      expect(screen.getByRole("table").querySelectorAll("col").length).toBe(
        headers.length,
      );
    });

    /** 원본 `ymd` 는 `2026.08.12` 처럼 **날짜만** 낸다 — 표에 시각을 내지 않는다 */
    it("가입일은 날짜만 점 표기로 낸다", () => {
      renderPage();

      expect(within(rowOf("박수진")).getByText("2026.08.12")).toBeVisible();
      expect(
        within(rowOf("박수진")).queryByText(/14:32/),
      ).not.toBeInTheDocument();
    });

    it("자녀 수에 단위를 붙이고, 수치도 좌측에 낸다", () => {
      renderPage();

      const kids = within(rowOf("박수진")).getByText("2명");
      /*
        원본은 이 열에 `align: right` 를 주지만, 이 저장소는 **표 전체를 한 기준선**에
        세운다(`DESIGN.md` §7-2). 우측 정렬은 어느 열에도 쓰지 않는다.
      */
      expect(classList(kids.closest("td"))).not.toContain("text-right");
      expect(classList(kids.closest("td"))).not.toContain("text-center");
    });

    /**
     * 원본 어드민이 `렌트 3 · 구매 2` 로 나눠 적는 컬럼이다.
     * 합계 하나로 접으면 **빌려 쓰는 사람 / 사서 쓰는 사람**이라는 이 서비스의
     * 핵심 구분이 표에서 사라진다. 0 인 쪽은 아예 적지 않는다.
     */
    describe("이용 컬럼 — 렌트/구매를 나눠 적는다", () => {
      it("둘 다 있으면 렌트와 구매를 함께 낸다", () => {
        renderPage();

        expect(
          within(rowOf("박수진")).getByText("렌트 9 · 구매 5"),
        ).toBeVisible();
      });

      it("한쪽이 0 이면 그쪽은 아예 적지 않는다", () => {
        renderPage();

        // 김도현은 렌트 0 — "렌트 0"이 보이면 없는 이용을 있는 것처럼 훑게 된다
        expect(within(rowOf("김도현")).getByText("구매 6")).toBeVisible();
        expect(
          within(rowOf("김도현")).queryByText(/렌트/),
        ).not.toBeInTheDocument();

        expect(within(rowOf("이하늘")).getByText("렌트 3")).toBeVisible();
        expect(
          within(rowOf("이하늘")).queryByText(/구매/),
        ).not.toBeInTheDocument();
      });

      it("이용한 적이 없으면 '-' 다", async () => {
        const { user } = renderPage();

        // 한지우는 6번째라 2페이지에 있다
        await user.click(screen.getByRole("button", { name: "2" }));
        expect(within(rowOf("한지우")).getByText("-")).toBeVisible();
      });
    });
  });

  /**
   * 이 화면이 템플릿과 갈리는 지점 — 검색이 "조건 선택 + 검색어" 2단이다.
   * 같은 검색어라도 조건이 다르면 결과가 달라져야 한다.
   */
  describe("검색 조건 전환", () => {
    it("기본 조건은 이름이라 이름으로 찾힌다", async () => {
      const { user } = renderPage();

      await user.type(searchBox(), "수진");

      expect(visibleNames()).toEqual(["박수진"]);
    });

    it("조건을 연락처로 바꾸면 같은 검색어의 결과가 달라진다", async () => {
      const { user } = renderPage();

      // 이름 조건에서 연락처 조각을 넣으면 아무것도 안 나온다
      await user.type(searchBox(), "010-8814");
      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();

      // 조건만 바꾸면 같은 검색어로 찾힌다
      await chooseSearchField(user, "연락처");
      expect(visibleNames()).toEqual(["정민서"]);
    });

    it("아이디(이메일) 조건으로도 찾을 수 있다", async () => {
      const { user } = renderPage();

      await chooseSearchField(user, "아이디(이메일)");
      await user.type(searchBox(), "haneul");

      expect(visibleNames()).toEqual(["이하늘"]);
    });
  });

  /**
   * 원본은 툴바 좌측(`toolsLeft`)에 엑셀 다운로드 하나만 두고 `회원관리_N건.csv` 로 저장한다 —
   * **내보내기 대상은 화면 전체가 아니라 현재 조회 결과**다.
   */
  describe("엑셀 다운로드", () => {
    it("지금 조건으로 조회된 건수를 밝힌다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
      expect(screen.getByText("조회 결과 6건을 내려받았습니다")).toBeVisible();
    });

    it("필터를 걸면 내려받는 건수도 함께 줄어든다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("정상 3명"));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(screen.getByText("조회 결과 3건을 내려받았습니다")).toBeVisible();
    });
  });

  describe("빈 상태", () => {
    it("빈 상태에서 '필터를 초기화'를 누르면 상태·검색어·검색 조건이 함께 되돌아간다", async () => {
      const { user } = renderPage();

      await chooseSearchField(user, "연락처");
      await user.type(searchBox(), "없는번호");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      expect(bodyRows()).toHaveLength(4);
      expect(screen.getByText("총 6건")).toBeVisible();
      expect(searchBox()).toHaveValue("");
      // 검색 조건도 첫 항목으로 되돌아간다 — 한쪽만 되돌리면 다시 비어 보인다
      expect(screen.getByRole("combobox")).toHaveTextContent("이름");
    });
  });

  /**
   * ⚠️ 상태 색은 "지금 사람의 주의를 요하는가"를 뜻한다.
   * 정지는 운영자가 막아 둔 비정상 상태라 critical, 탈퇴는 정상 종료라 default 다.
   * 탈퇴를 critical 로 칠하면 목록이 문제 건으로 가득 차 보인다.
   */
  describe("상태 색", () => {
    it("정지는 critical, 휴면은 warning 으로 나간다", () => {
      renderPage();

      const suspended = within(rowOf("정민서")).getByText("정지");
      expect(classList(suspended)).toContain("text-text-critical");

      const dormant = within(rowOf("이하늘")).getByText("휴면");
      expect(classList(dormant)).toContain("text-text-warning");
      expect(classList(dormant)).not.toContain("text-text-critical");
    });

    it("정상은 success 로 나간다", () => {
      renderPage();

      const active = within(rowOf("박수진")).getByText("정상");
      expect(classList(active)).toContain("text-text-success");
    });

    it("탈퇴는 default — 정상 종료라 주의를 끌지 않는다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "2" }));

      const withdrawn = within(rowOf("한지우")).getByText("탈퇴");
      expect(classList(withdrawn)).not.toContain("text-text-critical");
      expect(classList(withdrawn)).not.toContain("text-text-warning");
    });
  });

  /**
   * 원본 `관리` 컬럼은 `상세` 버튼 하나고, `이름` 은 `/members/{id}` 링크다.
   * 그 상세 화면이 아직 없어 두 진입점 모두 미리보기 모달로 받는다.
   */
  describe("상세 진입과 미리보기 모달", () => {
    it("'상세' 를 누르면 미리보기가 열리고 상태 설명을 함께 낸다", async () => {
      const { user } = renderPage();

      await user.click(
        within(rowOf("이하늘")).getByRole("button", { name: "상세" }),
      );

      // Modal 도 role="dialog" 다 — 이름으로 잡아 표와 섞이지 않게 한다
      const sheet = screen.getByRole("dialog", { name: "회원 미리보기" });
      expect(within(sheet).getByText("haneul.lee@example.com")).toBeVisible();
      // 되돌림 가능 여부가 조치 판단의 근거라 설명을 함께 보여준다
      expect(
        within(sheet).getByText(
          "장기 미접속으로 휴면 처리된 회원입니다. 로그인하면 [정상]으로 돌아갑니다.",
        ),
      ).toBeVisible();
    });

    it("이름을 눌러도 같은 미리보기가 열린다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "정민서" }));

      const sheet = screen.getByRole("dialog", { name: "회원 미리보기" });
      expect(within(sheet).getByText("010-8814-2260")).toBeVisible();
    });

    /**
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 회원 목록에는 행 드롭다운도, 이용 정지/해제 액션도 없다.
     * 정지·해제는 목록이 아니라 회원 상세 화면의 일이다.
     */
    it("행 액션·정지 확인 모달을 두지 않는다", async () => {
      const { user } = renderPage();

      // 한 행이 갖는 컨트롤은 원본과 같이 **이름 링크 + 상세 버튼** 둘뿐이다
      const controls = within(rowOf("박수진"))
        .getAllByRole("button")
        .map((button) => button.textContent);
      expect(controls).toEqual(["박수진", "상세"]);

      expect(
        screen.queryByRole("button", { name: "이용 정지" }),
      ).not.toBeInTheDocument();

      await user.click(
        within(rowOf("박수진")).getByRole("button", { name: "상세" }),
      );
      const sheet = screen.getByRole("dialog", { name: "회원 미리보기" });
      expect(
        within(sheet).queryByRole("button", { name: /정지/ }),
      ).not.toBeInTheDocument();
    });
  });
});
