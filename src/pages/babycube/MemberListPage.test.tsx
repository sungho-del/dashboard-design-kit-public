import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { downloadCsv } from "../../lib/downloadCsv";
import { MemberListPage } from "./MemberListPage";
import { resetMembers } from "./MemberListPage.data";

/* jsdom 에는 `URL.createObjectURL` 이 없다 — 파일 생성은 `downloadCsv.test` 가 본다.
   여기서는 **무엇을 넘겼는지**(파일명·행)만 검증한다 */
vi.mock("../../lib/downloadCsv", () => ({ downloadCsv: vi.fn() }));

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

/* 일괄 변경이 데모 저장소의 상태를 실제로 바꾼다 — 테스트마다 처음으로 되돌린다 */
afterEach(() => {
  resetMembers();
  vi.mocked(downloadCsv).mockClear();
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

/**
 * 헤더 이름으로 그 열의 위치를 찾는다.
 *
 * ⚠️ **셀 인덱스를 숫자로 박지 않는다.** 원본 기능(체크박스 열)이 앞에 하나 들어오자
 * 인덱스를 박아 둔 단언이 한꺼번에 8건 깨졌고, 그중 둘은 **자녀를 정렬해 놓고 가입일을
 * 비교하고 있었다**(우연히 통과하고 있었다). 이름으로 찾으면 열이 늘어도 따라온다.
 */
function columnIndex(name: string): number {
  const headers = within(screen.getByRole("table")).getAllByRole(
    "columnheader",
  );
  const index = headers.findIndex((th) => th.textContent?.trim() === name);
  if (index < 0) throw new Error(`표에 «${name}» 열이 없습니다`);
  return index;
}

/** 한 행에서 이름으로 지정한 열의 글자 */
function cellText(row: HTMLElement, column: string): string {
  return (
    within(row).getAllByRole("cell")[columnIndex(column)].textContent ?? ""
  );
}

/** 남아 있는 회원의 "이름" 셀만 뽑는다 — 몇 건인지뿐 아니라 **누가** 남았는지까지 본다 */
function visibleNames(): string[] {
  return bodyRows().map((row) => cellText(row, "이름"));
}

/** 이름으로 그 회원의 행을 찾는다 */
function rowOf(name: string): HTMLElement {
  const cell = screen.getAllByText(name)[0];
  return cell.closest("tr") as HTMLElement;
}

/**
 * 검색조건을 펼친다.
 *
 * ⚠️ 이 화면의 조건 영역(`FilterBar`)은 **접힌 채로 열린다**(원본). 닫혀 있는 동안은
 * 안의 컨트롤이 **DOM 에 아예 없으므로**(포커스가 보이지 않는 곳으로 가지 않게 한 계약)
 * 기간·검색을 건드리는 테스트는 반드시 먼저 이것을 부른다.
 */
const openFilters = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggle = screen.queryByRole("button", { name: /검색 열기/ });
  if (toggle) await user.click(toggle);
};

/**
 * 기간 트리거. **값이 들어가면 라벨이 날짜로 바뀌므로** 문구로 찾지 않는다 —
 * 펼친 조건 영역의 첫 버튼이 그것이다.
 */
const openPeriodPanel = async (user: ReturnType<typeof userEvent.setup>) => {
  await openFilters(user);
  const panelId = screen
    .getByRole("button", { name: /검색 닫기/ })
    .getAttribute("aria-controls") as string;
  const trigger = document
    .getElementById(panelId)!
    .querySelectorAll("button")[0] as HTMLElement;
  await user.click(trigger);
  return screen.getByRole("dialog");
};

/** 검색 조건 셀렉트는 이 화면의 유일한 combobox 다 */
async function chooseSearchField(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await openFilters(user);
  await user.click(screen.getByRole("combobox", { name: "검색 조건" }));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", { name: label }),
  );
}

/**
 * 검색어 입력. 펼친 조건 영역 안에 있으므로 **먼저 펼친다.**
 * (DatePicker 트리거는 button 이라 textbox 는 이것 하나뿐이다)
 */
const searchBox = async (user: ReturnType<typeof userEvent.setup>) => {
  await openFilters(user);
  return screen.getByRole("textbox");
};

/**
 * 상태 대시 상자. 접근가능 이름을 `aria-label` 로 못 박아 두었으므로
 * **건수까지 정확히 맞춘다** — 건수가 틀어지면 여기서 걸린다.
 */
const statusBox = (name: string) => screen.getByRole("button", { name });

/**
 * 다른 상태의 회원을 보려면 **그 상태 카드를 눌러야 한다** —
 * 원본 정책상 목록은 항상 한 상태만 보여주고, 기본은 [정상] 이다.
 */
const showStatus = async (
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) => user.click(statusBox(name));

describe("MemberListPage (S02 회원 관리)", () => {
  /**
   * 원본 목록 셸의 순서는 `상태 대시 → 검색조건 바 → [총 건수·엑셀 | 표 | 페이지네이션]` 이다.
   */
  describe("상태 대시 — 원본 StatDash", () => {
    /*
     * ⚠️ 원본에는 **[전체] 카드가 없다** — `members.dash` 주석이
     * "목록은 항상 한 상태만 보여준다"로 못 박는다. 되살리려는 변경을 이 블록이 막는다.
     */
    it("상태 4종만 카드로 세운다 — 전체 카드는 없다", () => {
      renderPage();

      expect(statusBox("정상 20명")).toBeVisible();
      expect(statusBox("정지 3명")).toBeVisible();
      expect(statusBox("휴면 4명")).toBeVisible();
      expect(statusBox("탈퇴 3명")).toBeVisible();
      expect(screen.queryByRole("button", { name: /^전체 / })).toBeNull();
    });

    it("화면은 [정상] 이 선택된 채로 열린다 (원본 기본값)", () => {
      renderPage();

      expect(statusBox("정상 20명")).toHaveAttribute("aria-pressed", "true");
      expect(visibleNames()).toEqual([
        "박수진",
        "김도현",
        "최유나",
        "송예린",
        "류태호",
        "오세린",
        "문지호",
        "배하은",
        "임채원",
        "황보라",
      ]);
    });

    it("대시 상자가 곧 상태 필터다 — 누르면 목록이 그 상태로 좁혀진다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("정상 20명"));

      /* 정상 20건 — PAGE_SIZE 10 이라 1페이지엔 10건 */
      expect(visibleNames()).toEqual([
        "박수진",
        "김도현",
        "최유나",
        "송예린",
        "류태호",
        "오세린",
        "문지호",
        "배하은",
        "임채원",
        "황보라",
      ]);
      expect(screen.getByText("목록 (총 20건)")).toBeVisible();
      expect(statusBox("정상 20명")).toHaveAttribute("aria-pressed", "true");
      expect(statusBox("휴면 4명")).toHaveAttribute("aria-pressed", "false");
    });

    it("휴면을 고르면 휴면 회원만 남는다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("휴면 4명"));

      expect(visibleNames()).toEqual(["이하늘", "구민재", "고은찬", "윤서아"]);
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

      await user.click(statusBox("정상 20명"));

      const picked = statusBox("정상 20명").className.split(/\s+/);
      const other = statusBox("휴면 4명").className.split(/\s+/);

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

      await user.click(statusBox("정상 20명"));

      expect(statusBox("정지 3명")).toBeVisible();
      expect(statusBox("탈퇴 3명")).toBeVisible();
    });

    it("검색으로 좁히면 상태별 건수도 함께 줄어든다", async () => {
      const { user } = renderPage();

      await chooseSearchField(user, "아이디(이메일)");
      await user.type(await searchBox(user), "haneul");

      /* 기본 상태([정상])에는 아무도 안 남지만 **카드 건수는 상태를 뺀 조건**으로 센다 */
      expect(statusBox("휴면 1명")).toBeVisible();
      expect(statusBox("정상 0명")).toBeVisible();
      expect(statusBox("탈퇴 0명")).toBeVisible();
    });

    /** 원본은 상태 카드에 `statusTips` 를 툴팁으로 단다. "전체"에는 없다 */
    it("상태 상자에 hover 하면 원본의 상태 안내 문구가 뜬다", async () => {
      const { user } = renderPage();

      await user.hover(statusBox("정지 3명"));

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
    it("기본 상태([정상]) 20건을 PAGE_SIZE(10) 만큼 나눠 보여준다", async () => {
      const { user } = renderPage();

      expect(bodyRows()).toHaveLength(10);
      expect(screen.getByText("목록 (총 20건)")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "2" }));
      expect(bodyRows()).toHaveLength(10);
    });

    /**
     * 원본 `all.length - start - i` — No 는 **조회 결과의 역순 순번**이다.
     * 레코드 번호로 두면 필터를 걸었을 때 8, 7, 4, 3 처럼 번호가 건너뛴다.
     */
    it("No 는 조회 결과의 역순 순번이다 — 페이지를 넘겨도 이어지고, 필터를 바꾸면 다시 센다", async () => {
      const { user } = renderPage();
      const numbers = () => bodyRows().map((row) => cellText(row, "No"));

      expect(numbers()).toEqual([
        "20",
        "19",
        "18",
        "17",
        "16",
        "15",
        "14",
        "13",
        "12",
        "11",
      ]);
      await user.click(screen.getByRole("button", { name: "2" }));
      expect(numbers()[0]).toBe("10");
      expect(numbers()[numbers().length - 1]).toBe("1");

      await showStatus(user, "휴면 4명");
      expect(numbers()).toEqual(["4", "3", "2", "1"]);
    });

    /** 원본 컬럼 정의(`MEMBER_COLUMNS`)의 이름과 **순서**가 정본이다 */
    it("표 컬럼은 원본 순서 그대로다", () => {
      renderPage();

      const headers = within(screen.getByRole("table"))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        /* 체크박스 열은 글자가 없다 — 이름은 `aria-label` 이 든다 */
        "",
        "No",
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
      /*
       * 이 값은 **상세의 결제 내역에서 센다**(`usageText` → `countPayments`).
       * 목록에 숫자를 따로 적어 두면 상세 표와 어긋난다.
       * 박수진의 결제 5건 = 렌트 3 · 판매 1 · **취소 1**(취소는 세지 않는다).
       */
      it("둘 다 있으면 렌트와 구매를 함께 낸다", () => {
        renderPage();

        expect(
          within(rowOf("박수진")).getByText("렌트 3 · 구매 1"),
        ).toBeVisible();
      });

      it("한쪽이 0 이면 그쪽은 아예 적지 않는다", async () => {
        const { user } = renderPage();

        // 김도현은 렌트 0 — "렌트 0"이 보이면 없는 이용을 있는 것처럼 훑게 된다
        expect(within(rowOf("김도현")).getByText("구매 3")).toBeVisible();
        expect(
          within(rowOf("김도현")).queryByText(/렌트/),
        ).not.toBeInTheDocument();

        /* 이하늘은 휴면이라 기본 화면에 없다 — 그 상태로 옮겨 본다 */
        await showStatus(user, "휴면 4명");
        expect(within(rowOf("이하늘")).getByText("렌트 2")).toBeVisible();
        expect(
          within(rowOf("이하늘")).queryByText(/구매/),
        ).not.toBeInTheDocument();
      });

      it("이용한 적이 없으면 '-' 다", async () => {
        const { user } = renderPage();

        /* 한지우는 탈퇴 회원이다 */
        await showStatus(user, "탈퇴 3명");
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

      await user.type(await searchBox(user), "수진");

      expect(visibleNames()).toEqual(["박수진"]);
    });

    it("조건을 연락처로 바꾸면 같은 검색어의 결과가 달라진다", async () => {
      const { user } = renderPage();
      /* 정민서는 정지 상태라 기본 화면에 없다 */
      await showStatus(user, "정지 3명");

      // 이름 조건에서 연락처 조각을 넣으면 아무것도 안 나온다
      await user.type(await searchBox(user), "010-8814");
      expect(bodyRows()).toHaveLength(0);
      expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();

      // 조건만 바꾸면 같은 검색어로 찾힌다
      await chooseSearchField(user, "연락처");
      expect(visibleNames()).toEqual(["정민서"]);
    });

    it("아이디(이메일) 조건으로도 찾을 수 있다", async () => {
      const { user } = renderPage();

      await showStatus(user, "휴면 4명");
      await chooseSearchField(user, "아이디(이메일)");
      await user.type(await searchBox(user), "haneul");

      expect(visibleNames()).toEqual(["이하늘"]);
    });
  });

  /**
   * 원본은 툴바 좌측(`toolsLeft`)에 엑셀 다운로드 하나만 두고 `회원관리_N건.csv` 로 저장한다 —
   * **내보내기 대상은 화면 전체가 아니라 현재 조회 결과**다.
   */
  describe("엑셀 다운로드", () => {
    /** 넘긴 [파일명, 행] — 행의 첫 줄은 머리글이다 */
    const exported = () => vi.mocked(downloadCsv).mock.calls[0];

    it("지금 조건으로 조회된 결과 전체를 파일로 만든다 — 1페이지만이 아니다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      /* 화면 전체가 아니라 **지금 조건**([정상] 20건)이고, 페이지(10)로 자르지 않는다 */
      const [filename, rows] = exported();
      expect(filename).toBe("회원관리_20건.csv");
      expect(rows[0]).toEqual([
        "No",
        "이름",
        "아이디(이메일)",
        "연락처",
        "가입일",
        "자녀",
        "상태",
        "이용",
      ]);
      expect(rows).toHaveLength(21);
      expect(rows[1]).toEqual([
        20,
        "박수진",
        "sujin.park@example.com",
        "010-2841-7702",
        "2026.08.12",
        "2명",
        "정상",
        "렌트 3 · 구매 1",
      ]);
      expect(screen.getByText("조회 결과 20건을 내려받았습니다")).toBeVisible();
    });

    it("필터를 걸면 내려받는 건수도 함께 줄어든다", async () => {
      const { user } = renderPage();

      await user.click(statusBox("휴면 4명"));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      expect(exported()[0]).toBe("회원관리_4건.csv");
      expect(screen.getByText("조회 결과 4건을 내려받았습니다")).toBeVisible();
    });

    it("고른 행이 있으면 그 행만 내려받는다 — 이용이 없는 '-' 는 빈 칸이다", async () => {
      const { user } = renderPage();

      await user.click(screen.getByRole("checkbox", { name: "배하은 선택" }));
      await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));

      const [filename, rows] = exported();
      expect(filename).toBe("회원관리_1건.csv");
      expect(rows).toHaveLength(2);
      /* No 는 화면과 같은 순번이다([정상] 20명 중 8번째 → 13) */
      expect(rows[1][0]).toBe(13);
      expect(rows[1][rows[1].length - 1]).toBe("");
      expect(screen.getByText("선택한 1건을 내려받았습니다")).toBeVisible();
    });
  });

  describe("빈 상태", () => {
    it("빈 상태에서 '필터를 초기화'를 누르면 상태·검색어·검색 조건이 함께 되돌아간다", async () => {
      const { user } = renderPage();

      await showStatus(user, "휴면 4명");
      await chooseSearchField(user, "연락처");
      await user.type(await searchBox(user), "없는번호");
      expect(bodyRows()).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));

      /* 상태도 기본값([정상] 20건)으로 돌아온다 — 1페이지는 10행 */
      expect(bodyRows()).toHaveLength(10);
      expect(screen.getByText("목록 (총 20건)")).toBeVisible();
      expect(statusBox("정상 20명")).toHaveAttribute("aria-pressed", "true");
      expect(await searchBox(user)).toHaveValue("");
      // 검색 조건도 첫 항목으로 되돌아간다 — 한쪽만 되돌리면 다시 비어 보인다
      expect(
        screen.getByRole("combobox", { name: "검색 조건" }),
      ).toHaveTextContent("이름");
    });
  });

  /**
   * ⚠️ 상태 색은 "지금 사람의 주의를 요하는가"를 뜻한다.
   * 정지는 운영자가 막아 둔 비정상 상태라 critical, 탈퇴는 정상 종료라 default 다.
   * 탈퇴를 critical 로 칠하면 목록이 문제 건으로 가득 차 보인다.
   */
  describe("상태 색", () => {
    it("정지는 critical, 휴면은 warning 으로 나간다", async () => {
      const { user } = renderPage();

      await showStatus(user, "정지 3명");
      const suspended = within(rowOf("정민서")).getByText("정지");
      expect(classList(suspended)).toContain("text-text-critical");

      await showStatus(user, "휴면 4명");
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

      await showStatus(user, "탈퇴 3명");

      const withdrawn = within(rowOf("한지우")).getByText("탈퇴");
      expect(classList(withdrawn)).not.toContain("text-text-critical");
      expect(classList(withdrawn)).not.toContain("text-text-warning");
    });
  });

  /**
   * 원본: "이름 또는 [상세] 클릭 → 회원 상세로 이동".
   * 상세 화면(`/members/{id}`)이 생겨 **미리보기 모달을 걷어냈다**(2026-09-21).
   */
  describe("상세 진입", () => {
    it("[상세] 를 누르면 그 회원의 상세 경로로 이동한다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(
        within(rowOf("박수진")).getByRole("button", { name: "상세" }),
      );

      /* id 가 이메일이라 인코딩해서 넘긴다 — 상세 화면이 디코딩해 읽는다 */
      expect(onNavSelect).toHaveBeenCalledWith(
        "/members/sujin.park%40example.com",
      );
    });

    it("이름을 눌러도 같은 곳으로 간다", async () => {
      const { user, onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "김도현" }));

      expect(onNavSelect).toHaveBeenCalledWith(
        "/members/dohyun.kim%40example.com",
      );
    });

    /*
     * ⚠️ 원본에 없어서 걷어낸 것 — 되살리지 말 것.
     * 원본 회원 목록에는 행 드롭다운도, 이용 정지/해제 액션도 없다.
     * 상태 변경은 회원 상세 화면의 일이다.
     */
    it("행 컨트롤은 이름과 [상세] 둘뿐이다", () => {
      renderPage();

      const controls = within(rowOf("박수진"))
        .getAllByRole("button")
        .map((button) => button.textContent);
      expect(controls).toEqual(["박수진", "상세"]);

      expect(
        screen.queryByRole("button", { name: "이용 정지" }),
      ).not.toBeInTheDocument();
      /* 미리보기 모달도 더 이상 없다 */
      expect(
        screen.queryByRole("dialog", { name: "회원 미리보기" }),
      ).not.toBeInTheDocument();
    });
  });
});

/* -------------------------------------------------------------------------
 * 정렬 — 원본 어드민의 `sortable` 열 (이름 · 가입일 · 자녀)
 * ---------------------------------------------------------------------- */

describe("정렬", () => {
  /**
   * 정확한 이름으로 찾는다. 정렬 헤더는 안에 버튼이 있어도 접근가능 이름은
   * 글자 그대로다("아이디(이메일)" 처럼 괄호가 있어 정규식은 쓰지 않는다).
   */
  const header = (name: string) => screen.getByRole("columnheader", { name });
  const sortButton = (name: string) => within(header(name)).getByRole("button");

  /*
   * ⚠️ 원본 표 헤더에서 ↕ 가 붙은 것은 **가입일·자녀 둘뿐**이다.
   * 한때 이름까지 정렬되게 만들어 뒀는데 원본(v0.4) 대조로 바로잡았다(2026-09-21).
   */
  it("원본이 ↕ 를 붙인 두 열만 누를 수 있다", () => {
    renderPage();

    for (const name of ["가입일", "자녀"]) {
      expect(header(name)).toHaveAttribute("aria-sort", "none");
      expect(within(header(name)).getByRole("button")).toBeInTheDocument();
    }
    for (const name of [
      "No",
      "이름",
      "아이디(이메일)",
      "연락처",
      "상태",
      "이용",
      "관리",
    ]) {
      expect(header(name)).not.toHaveAttribute("aria-sort");
      expect(within(header(name)).queryByRole("button")).toBeNull();
    }
  });

  it("자녀 수는 숫자로 비교한다", async () => {
    const { user } = renderPage();

    await user.click(sortButton("자녀"));

    const kids = bodyRows().map((row) =>
      Number(cellText(row, "자녀").replace(/\D/g, "")),
    );
    expect(kids).toEqual([...kids].sort((a, b) => a - b));
    expect(header("자녀")).toHaveAttribute("aria-sort", "ascending");
  });

  /** 오름 → 내림 → 해제 3단. 해제가 있어야 원래 순서로 돌아갈 수 있다 */
  it("같은 헤더를 세 번 누르면 원래 순서로 돌아온다", async () => {
    const { user } = renderPage();
    const original = visibleNames();

    await user.click(sortButton("가입일"));
    expect(header("가입일")).toHaveAttribute("aria-sort", "ascending");
    const asc = visibleNames();

    await user.click(sortButton("가입일"));
    expect(header("가입일")).toHaveAttribute("aria-sort", "descending");
    expect(visibleNames()).not.toEqual(asc);

    await user.click(sortButton("가입일"));
    expect(header("가입일")).toHaveAttribute("aria-sort", "none");
    expect(visibleNames()).toEqual(original);
  });

  it("다른 열을 누르면 이전 열의 정렬은 풀린다 — 한 번에 한 열이다", async () => {
    const { user } = renderPage();

    await user.click(sortButton("가입일"));
    await user.click(sortButton("자녀"));

    expect(header("가입일")).toHaveAttribute("aria-sort", "none");
    expect(header("자녀")).toHaveAttribute("aria-sort", "ascending");
  });

  /*
   * 페이지 안에서만 정렬하면 2페이지의 첫 값이 1페이지의 마지막보다 앞설 수 있다.
   * 전체를 정렬한 뒤 잘라야 한다.
   */
  it("정렬은 페이지를 나누기 전에 적용된다", async () => {
    const { user } = renderPage();

    await user.click(sortButton("자녀"));
    const firstPage = bodyRows().map((row) => cellText(row, "자녀"));

    await user.click(screen.getByRole("button", { name: "2" }));
    const secondPage = bodyRows().map((row) => cellText(row, "자녀"));

    const kids = (text: string) => Number(text.replace(/\D/g, ""));
    expect(kids(secondPage[0])).toBeGreaterThanOrEqual(
      kids(firstPage[firstPage.length - 1]),
    );
  });

  it("정렬을 바꾸면 1페이지로 돌아간다 — 보던 페이지의 내용이 통째로 바뀐다", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: "2" }));
    /* 이름은 정렬 열이 아니다 — 원본이 ↕ 를 붙인 가입일로 바꾼다 */
    await user.click(sortButton("가입일"));

    expect(
      screen.getByRole("button", { name: "1", current: "page" }),
    ).toBeInTheDocument();
  });
});

/* -------------------------------------------------------------------------
 * 기간 빠른 선택 · 데이터 상태
 * ---------------------------------------------------------------------- */

describe("기간 빠른 선택", () => {
  it("원본 어휘 7종을 달력 안에 낸다", async () => {
    const { user } = renderPage();

    const panel = await openPeriodPanel(user);

    expect(
      within(panel)
        .getAllByRole("button")
        .map((b) => b.textContent)
        .filter((text) =>
          ["오늘", "1주일", "1개월", "3개월", "6개월", "1년", "전체"].includes(
            text ?? "",
          ),
        ),
    ).toEqual(["오늘", "1주일", "1개월", "3개월", "6개월", "1년", "전체"]);
  });

  /** 샘플 가입일은 2026-07~08 이라 "오늘"(실행 시점)로 좁히면 아무도 남지 않는다 */
  it("빠른 선택이 실제로 목록을 좁힌다", async () => {
    const { user } = renderPage();
    expect(visibleNames().length).toBeGreaterThan(0);

    const panel = await openPeriodPanel(user);
    await user.click(within(panel).getByRole("button", { name: "오늘" }));

    expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();
  });

  it("'전체'는 기간을 해제한다", async () => {
    const { user } = renderPage();

    let panel = await openPeriodPanel(user);
    await user.click(within(panel).getByRole("button", { name: "오늘" }));
    expect(visibleNames()).toHaveLength(0);

    panel = await openPeriodPanel(user);
    await user.click(within(panel).getByRole("button", { name: "전체" }));
    expect(visibleNames().length).toBeGreaterThan(0);
  });
});

describe("데이터 상태 미리보기 (?preview=)", () => {
  const renderAt = (url: string) => {
    window.history.replaceState(null, "", url);
    return renderPage();
  };

  afterEach(() => window.history.replaceState(null, "", "/members"));

  it("loading — 툴바와 헤더는 남기고 본문만 스켈레톤이다", () => {
    renderAt("/members?preview=loading");

    // 조건을 되돌릴 수단은 로딩 중에도 살아 있어야 한다
    expect(screen.getByRole("button", { name: "엑셀 다운로드" })).toBeVisible();
    expect(
      screen.getByRole("columnheader", { name: "이름" }),
    ).toBeInTheDocument();

    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
    // 로딩이 끝나기 전에 "없음"을 그리지 않는다 (§D8-2)
    expect(screen.queryByText("해당 조건의 회원이 없습니다")).toBeNull();
    expect(visibleNames()).not.toContain("박수진");
  });

  /* -----------------------------------------------------------------------
   * 일괄 상태 변경 — 원본 목록 툴바 `[휴면으로 변경] [정지로 변경]`
   * -------------------------------------------------------------------- */

  it("empty — 조건은 그대로 둔 채 빈 상태를 보여준다", () => {
    renderAt("/members?preview=empty");

    expect(screen.getByText("해당 조건의 회원이 없습니다")).toBeVisible();
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
  });

  it("refreshing — 스켈레톤으로 되돌리지 않고 이전 값을 흐리게 둔다", () => {
    const { container } = { container: document.body };
    renderAt("/members?preview=refreshing");

    expect(visibleNames().length).toBeGreaterThan(0);
    expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);

    const body = container.querySelector<HTMLElement>(
      "[data-table-shell-body]",
    );
    expect(classList(body)).toContain("opacity-50");
  });
});

describe("체크 후 일괄 상태 변경", () => {
  const check = async (
    user: ReturnType<typeof userEvent.setup>,
    name: string,
  ) => user.click(screen.getByRole("checkbox", { name: `${name} 선택` }));

  it("고르기 전에는 일괄 처리 바가 없다", () => {
    renderPage();
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
  });

  it("고르면 지금 상태에서 갈 수 있는 곳만 낸다", async () => {
    const { user } = renderPage();
    await check(user, "김도현");

    expect(screen.getByText("1명 선택됨")).toBeVisible();
    /* [정상] 탭이므로 정상으로 갈 일이 없다 */
    expect(screen.queryByRole("button", { name: "정상으로 변경" })).toBeNull();
    expect(screen.getByRole("button", { name: "휴면으로 변경" })).toBeVisible();
    expect(screen.getByRole("button", { name: "정지로 변경" })).toBeVisible();
  });

  /**
   * ⚠️ 이 화면의 가장 중요한 계약 — **목록이 상세의 가드를 우회하면 안 된다.**
   * 상세는 진행 중 렌트가 있으면 휴면을 막는다. 목록에서 여럿을 한꺼번에 재울 때
   * 그 가드가 빠지면 같은 정책이 화면마다 다르게 적용된다.
   */
  /** 사유 모달에 적고 처리한다 */
  const giveReason = async (
    user: ReturnType<typeof userEvent.setup>,
    reason: string,
    confirm: string,
  ) => {
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByRole("textbox"), reason);
    await user.click(within(dialog).getByRole("button", { name: confirm }));
  };

  it("진행 중 렌트가 있는 회원은 휴면에서 빠지고, 몇 명이 빠졌는지 알린다", async () => {
    const { user } = renderPage();

    await check(user, "박수진"); // 진행 중 렌트 1건
    await check(user, "김도현"); // 0건
    await user.click(screen.getByRole("button", { name: "휴면으로 변경" }));

    /* 사유는 **처리될 사람 수**로 받는다 — 빠진 박수진은 세지 않는다 */
    expect(
      screen.getByRole("dialog", { name: "회원 휴면 사유 입력" }),
    ).toBeVisible();
    await giveReason(user, "고객 요청", "휴면 처리");

    expect(
      await screen.findByText(
        "1명을 «휴면»으로 바꿨습니다 · 1명 제외(진행 중 렌트가 있는 회원)",
      ),
    ).toBeVisible();
  });

  /**
   * 원본 C-3 ⓐ — 휴면·정지는 **사유를 받아야** 처리된다. 상세 저장도 같은 모달이다.
   * 휴면은 자동 전환이 원칙이라 수동 전환이 예외임을 문면으로 알린다.
   */
  it("휴면·정지는 사유 모달을 거친다 — 빈 사유는 막고, 문면이 상태마다 다르다", async () => {
    const { user } = renderPage();

    await check(user, "김도현");
    await user.click(screen.getByRole("button", { name: "휴면으로 변경" }));
    let dialog = screen.getByRole("dialog", { name: "회원 휴면 사유 입력" });
    expect(
      within(dialog).getByText(/12개월 미접속 시 자동 전환이 원칙/),
    ).toBeVisible();

    /* 비운 채 누르면 필드 옆에서 막는다 — 아무것도 바뀌지 않는다 */
    await user.click(within(dialog).getByRole("button", { name: "휴면 처리" }));
    expect(within(dialog).getByText("휴면 사유를 입력해주세요.")).toBeVisible();
    expect(statusBox("휴면 4명")).toBeVisible();

    /* 공백만 적어도 빈 사유다 */
    await user.type(within(dialog).getByRole("textbox"), "   ");
    await user.click(within(dialog).getByRole("button", { name: "휴면 처리" }));
    expect(statusBox("휴면 4명")).toBeVisible();

    /* 취소하면 아무것도 바뀌지 않고 선택도 남는다 */
    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("1명 선택됨")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "정지로 변경" }));
    dialog = screen.getByRole("dialog", { name: "회원 정지 사유 입력" });
    /* 앞에서 적다 만 글자가 남지 않는다 */
    expect(within(dialog).getByRole("textbox")).toHaveValue("");
    expect(within(dialog).getByText(/회원 상세에 기록/)).toBeVisible();
  });

  it("2명 이상이면 제목에 인원이 붙는다", async () => {
    const { user } = renderPage();

    await check(user, "박수진");
    await check(user, "김도현");
    await user.click(screen.getByRole("button", { name: "정지로 변경" }));

    expect(
      screen.getByRole("dialog", { name: "회원 정지 사유 입력 (2명)" }),
    ).toBeVisible();
  });

  it("사유를 적고 처리하면 상태가 실제로 바뀌고, 그 상태 카드로 옮겨 결과를 보여준다", async () => {
    const { user } = renderPage();

    await check(user, "박수진");
    await check(user, "김도현");
    await user.click(screen.getByRole("button", { name: "정지로 변경" }));
    await giveReason(user, "분쟁 다발", "정지 처리");

    /* 정지에는 렌트 가드가 걸리지 않는다 — 막는 것은 휴면뿐이다 */
    expect(
      await screen.findByText("2명을 «정지»으로 바꿨습니다"),
    ).toBeVisible();
    expect(statusBox("정지 5명")).toHaveAttribute("aria-pressed", "true");
    expect(statusBox("정상 18명")).toBeVisible();
    expect(visibleNames()).toContain("박수진");
    expect(visibleNames()).toContain("김도현");
    /* 같은 대상을 두 번 처리하지 않게 선택이 풀린다 */
    expect(screen.queryByText(/명 선택됨/)).toBeNull();
  });

  it("[정상] 으로 되돌리는 것은 사유를 받지 않고 제자리에서 바로 바뀐다", async () => {
    const { user } = renderPage();

    await showStatus(user, "정지 3명");
    await check(user, "정민서");
    await user.click(screen.getByRole("button", { name: "정상으로 변경" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      await screen.findByText("1명을 «정상»으로 바꿨습니다"),
    ).toBeVisible();
    expect(statusBox("정지 2명")).toHaveAttribute("aria-pressed", "true");
    expect(visibleNames()).not.toContain("정민서");
  });

  /** 원본 정책: 탈퇴 회원은 상태를 바꿀 수 없다 — 바를 띄울 이유가 없다 */
  it("탈퇴 회원만 고르면 일괄 처리 바가 열리지 않는다", async () => {
    const { user } = renderPage();

    await user.click(statusBox("탈퇴 3명"));
    await check(user, "한지우");

    expect(screen.queryByText(/명 선택됨/)).toBeNull();
  });

  it("머리글 체크박스는 이 페이지의 행만 고른다", async () => {
    const { user } = renderPage();

    await user.click(
      screen.getByRole("checkbox", { name: "이 페이지 전체 선택" }),
    );

    expect(screen.getByText(`${bodyRows().length}명 선택됨`)).toBeVisible();
  });
});

/* ---------------------------------------------------------------------------
 * 검색조건 접기 — 원본 `filter` 영역
 * ------------------------------------------------------------------------ */
describe("검색조건 접기", () => {
  it("접힌 채로 열린다 — 목록 화면이 먼저 보여야 하는 것은 결과다", () => {
    renderPage();

    expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
    expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
  });

  it("펼치면 기간·조건·검색어가 나온다", async () => {
    const { user } = renderPage();

    await user.click(screen.getByRole("button", { name: /검색 열기/ }));

    expect(screen.getByPlaceholderText("검색어 입력")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "검색 조건" })).toBeVisible();
  });

  /** 접어 둔 채로도 무엇이 걸렸는지 알아야 한다 — 그게 접을 수 있는 이유다 */
  it("검색어를 넣으면 접힌 줄의 요약이 그것을 말한다", async () => {
    const { user } = renderPage();

    await user.type(await searchBox(user), "수진");
    await user.click(screen.getByRole("button", { name: /검색 닫기/ }));

    expect(screen.getByText("이름 «수진»")).toBeVisible();
    expect(screen.queryByText("조건 없음 (전체)")).toBeNull();
  });

  it("조건을 바꾸면 요약의 이름도 따라 바뀐다", async () => {
    const { user } = renderPage();

    await chooseSearchField(user, "연락처");
    await user.type(await searchBox(user), "010");

    expect(screen.getByText("연락처 «010»")).toBeVisible();
  });

  it("[초기화] 는 요약을 «조건 없음» 으로 되돌린다", async () => {
    const { user } = renderPage();

    await user.type(await searchBox(user), "수진");
    expect(screen.getByText("이름 «수진»")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "초기화" }));
    expect(screen.getByText("조건 없음 (전체)")).toBeVisible();
  });
});
