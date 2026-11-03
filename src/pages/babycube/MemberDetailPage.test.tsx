import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { MemberDetailPage } from "./MemberDetailPage";

/* -------------------------------------------------------------------------
 * S02-D 회원 상세 — 폼형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 정책**이다 —
 * 경로의 id 로 그 회원을 찾는가 · **진행 중 렌트가 있으면 휴면을 막는가** ·
 * 탈퇴 회원의 상태를 못 바꾸는가 · 저장/취소가 무엇을 되돌리는가 ·
 * 자녀 개월 수를 **계산**하는가 · 없는 회원에게 돌아갈 길을 주는가.
 *
 * 경로는 화면이 직접 읽으므로(라우터가 props 로 주지 않는다) 테스트도
 * `history.replaceState` 로 주소를 세팅한 뒤 렌더한다.
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

afterEach(() => window.history.replaceState(null, "", "/"));

/** 페이지 헤더 — 이름과 **저장된** 상태 태그가 있다 */
const header = () =>
  screen
    .getByRole("heading", { name: "회원 상세" })
    .closest("header") as HTMLElement;

/** 목록에서 넘어올 때와 같은 방식으로 주소를 만든다 — 이메일이라 인코딩된다 */
function renderAt(memberId: string, query = "") {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  window.history.replaceState(
    null,
    "",
    `/members/${encodeURIComponent(memberId)}${query}`,
  );

  render(
    <ToastProvider position="bottom">
      <MemberDetailPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/members"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 섹션 카드 — 제목으로 찾아 그 안에서만 질의한다 */
const section = (title: string) =>
  screen
    .getByRole("heading", { name: title })
    .closest("[data-variant]") as HTMLElement;

const stateButton = (label: string) =>
  screen.getByRole("radio", { name: label });

describe("MemberDetailPage (S02-D 회원 상세)", () => {
  describe("경로와 조회", () => {
    /*
     * 이름은 **두 곳에** 나온다 — 헤더(누구의 상세인지)와 기본 정보(값).
     * 그래서 `getByText` 로 뭉뚱그리지 않고 자리별로 확인한다.
     */
    it("경로의 id 로 그 회원을 찾아 보여준다", () => {
      renderAt("sujin.park@example.com");
      const basic = section("기본 정보");

      expect(screen.getAllByText("박수진").length).toBeGreaterThan(0);
      expect(within(basic).getByText("박수진")).toBeVisible();
      expect(within(basic).getByText("sujin.park@example.com")).toBeVisible();
      expect(within(basic).getByText("010-2841-7702")).toBeVisible();
    });

    /** 주소를 손으로 고쳤거나 지워진 회원 — 빈 목록이 아니라 잘못된 주소다 */
    it("없는 회원이면 돌아갈 길을 준다", async () => {
      const { user, onNavSelect } = renderAt("nobody@example.com");

      expect(screen.getByText("찾을 수 없는 회원입니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "회원 목록으로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/members");
    });
  });

  describe("기본 정보 — 원본 sec.members_basic", () => {
    it("원본이 정한 6개 값을 낸다", () => {
      renderAt("dohyun.kim@example.com");
      const basic = section("기본 정보");

      expect(within(basic).getByText("김도현")).toBeVisible();
      expect(within(basic).getByText("dohyun.kim@example.com")).toBeVisible();
      expect(within(basic).getByText("010-5520-3318")).toBeVisible();
      expect(within(basic).getByText("남")).toBeVisible();
      expect(within(basic).getByText("1988.12.02")).toBeVisible();
      expect(
        within(basic).getByText("경기 성남시 분당구 판교로 174"),
      ).toBeVisible();
    });

    /*
     * 원본은 값을 **비활성 입력칸**에 담지만, 그러면 "고칠 수 있을 것 같은데 안 되는 것"
     * 으로 읽힌다. 이 화면에서 실제로 고치는 값은 상태 하나뿐이다.
     */
    it("읽기 전용 값에는 입력칸을 만들지 않는다", () => {
      renderAt("dohyun.kim@example.com");

      expect(within(section("기본 정보")).queryByRole("textbox")).toBeNull();
    });

    /*
     * `아이디(이메일)` 은 실측 83px 라 기본 80 에서 두 줄로 쪼개졌었다.
     * §30-3 대로 **블록 전체가 같은 폭**을 가져가야 값 시작선이 한 줄로 선다 —
     * 한 항목에만 주면 정렬이 어긋나므로 "모두 같은가"를 잠근다.
     */
    it("라벨 폭은 블록 전체가 같이 넓힌다 — 기본 80 에 안 들어가는 라벨이 있다", () => {
      renderAt("dohyun.kim@example.com");

      const labels = [...section("기본 정보").querySelectorAll("dt")];
      expect(labels.length).toBe(6);
      for (const label of labels) {
        expect(label.style.width).toBe("96px");
        expect(label.className).not.toContain("w-20");
      }
    });
  });

  describe("계정 상태 — 원본 sec.members_acct", () => {
    it("정상·휴면·정지 셋 중 하나를 고른다 (탈퇴는 선택지가 아니다)", () => {
      renderAt("dohyun.kim@example.com");

      expect(stateButton("정상")).toBeChecked();
      expect(stateButton("휴면")).toBeInTheDocument();
      expect(stateButton("정지")).toBeInTheDocument();
      expect(screen.queryByRole("radio", { name: "탈퇴" })).toBeNull();
    });

    it("가입일·최근 접속일·포인트·마케팅 수신을 함께 낸다", () => {
      renderAt("dohyun.kim@example.com");
      const account = section("계정 상태");

      expect(within(account).getByText("2026.08.10")).toBeVisible();
      expect(within(account).getByText("2026.09.12")).toBeVisible();
      /* 포인트 = 포인트 원장 합 — 김도현은 원장이 없어 0(단위는 원본대로 「원」) */
      expect(within(account).getByText("0원")).toBeVisible();
      expect(within(account).getByText("동의")).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 계약 — 원본 가드 문구를 **UI 로** 강제한다.
     * 빌려 간 물건이 남아 있는데 계정을 재우면 반납 안내가 닿지 않는다.
     */
    it("진행 중인 렌트가 있으면 휴면을 고를 수 없고, 이유를 문장으로 낸다", () => {
      renderAt("sujin.park@example.com");

      expect(stateButton("휴면")).toBeDisabled();
      expect(
        screen.getByText(
          "진행 중인 렌트 1건이 있어 휴면으로 전환할 수 없습니다 — 반납이 끝나면 전환할 수 있습니다.",
        ),
      ).toBeVisible();

      /* 잠긴 것은 휴면뿐이다 — 정지 처리까지 막으면 운영이 멈춘다 */
      expect(stateButton("정지")).toBeEnabled();
    });

    it("진행 중인 렌트가 없으면 휴면을 고를 수 있다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      expect(stateButton("휴면")).toBeEnabled();
      expect(screen.queryByText(/휴면으로 전환할 수 없습니다/)).toBeNull();

      await user.click(stateButton("휴면"));
      expect(stateButton("휴면")).toBeChecked();
    });

    /** 원본 정책: "탈퇴 회원은 상태 변경 드롭다운 없이 배지로만 표시" */
    it("탈퇴 회원은 상태를 바꿀 수 없다 — 배지로만 보여준다", () => {
      renderAt("jiwoo.han@example.com");

      expect(screen.queryByRole("radio")).toBeNull();
      expect(within(section("계정 상태")).getByText("탈퇴")).toBeVisible();
    });
  });

  describe("자녀 정보 — 원본 sec.members_child", () => {
    it("자녀 수와 표를 함께 낸다", () => {
      renderAt("minseo.jung@example.com");
      const child = section("자녀 정보");

      expect(within(child).getByText("3명")).toBeVisible();
      expect(within(child).getAllByRole("row")).toHaveLength(4); // 헤더 + 3

      /*
       * 성별 표기는 원본이 "남아 / 여아"다. 같은 글자가 여러 행에 나오므로
       * **행 안에서** 본다 — 화면 전체에서 찾으면 다른 아이의 값과 구별되지 않는다.
       */
      const daon = within(child).getByText("다온").closest("tr") as HTMLElement;
      expect(within(daon).getByText("남아")).toBeVisible();
      expect(within(child).getAllByText("여아")).toHaveLength(2);
    });

    /*
     * 개월 수는 **저장하지 않고 계산한다** — 데이터에 적어 두면 하루만 지나도 틀린다.
     * 값 자체가 아니라 "계산해서 함께 낸다"는 계약을 고정한다.
     */
    it("생년월일과 개월 수를 한 칸에 함께 낸다", () => {
      renderAt("dohyun.kim@example.com");

      const cell = within(section("자녀 정보")).getByText(
        /2023\.06\.14 · \d+개월/,
      );
      expect(cell).toBeVisible();
    });
  });

  /* -----------------------------------------------------------------------
   * 결제 내역 — 원본 `sec.members_hist`
   *
   * ⚠️ 원본 **주석**은 이 섹션을 "이용 이력"이라 부르지만 **화면**의 제목은
   * `결제 내역 (N)` 이고 컬럼도 다르다. 화면이 정본이다.
   * -------------------------------------------------------------------- */
  describe("결제 내역 — 원본 sec.members_hist", () => {
    const paymentSection = () =>
      screen
        .getByRole("heading", { name: /^결제 내역/ })
        .closest("[data-variant]") as HTMLElement;

    it("제목에 전체 건수가 붙는다", () => {
      renderAt("sujin.park@example.com");

      expect(
        screen.getByRole("heading", { name: "결제 내역 (5)" }),
      ).toBeVisible();
    });

    it("원본이 정한 7개 컬럼을 그 순서로 낸다", () => {
      renderAt("sujin.park@example.com");

      const headers = within(paymentSection())
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "No",
        "주문번호",
        "결제 일시",
        "구분",
        "상품명",
        "결제금액",
        "상태",
      ]);
    });

    it("결제 일시는 시각까지 낸다 — 같은 날 여러 건을 결제할 수 있다", () => {
      renderAt("sujin.park@example.com");

      expect(
        within(paymentSection()).getByText("2026.06.29 13:15"),
      ).toBeVisible();
    });

    it("금액과 상태를 함께 낸다 (취소는 중립색이다)", () => {
      renderAt("sujin.park@example.com");
      const section = paymentSection();

      /* 같은 상품을 두 번 빌려 금액이 두 줄에 나온다 — 행 안에서 본다 */
      expect(within(section).getAllByText("135,000원")).toHaveLength(2);
      expect(within(section).getByText("84,000원")).toBeVisible();
      expect(within(section).getAllByText("결제완료").length).toBe(4);
      expect(within(section).getByText("결제취소")).toBeVisible();
    });

    /** 탭은 **목록만** 거른다 — 제목의 건수는 거르기 전 전체 건수다 */
    it("[렌트] 탭은 렌트 건만 남기고, 제목의 건수는 그대로다", async () => {
      const { user } = renderAt("sujin.park@example.com");

      await user.click(screen.getByRole("radio", { name: "렌트" }));

      const rows = within(paymentSection()).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(3);
      expect(
        screen.getByRole("heading", { name: "결제 내역 (5)" }),
      ).toBeVisible();
    });

    it("[판매] 탭으로 바꾸면 판매 건만 남는다", async () => {
      const { user } = renderAt("sujin.park@example.com");

      await user.click(screen.getByRole("radio", { name: "판매" }));

      const rows = within(paymentSection()).getAllByRole("row").slice(1);
      expect(rows).toHaveLength(2);
      expect(within(paymentSection()).getByText("결제취소")).toBeVisible();
    });

    /** 결제가 없는 것과 "그 구분이 없는" 것은 다르다 */
    it("탭으로 걸러 0건이면 표는 남기고 안내만 낸다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      await user.click(screen.getByRole("radio", { name: "렌트" }));

      expect(screen.getByText("이 구분의 결제 내역이 없습니다.")).toBeVisible();
      expect(screen.queryByText("결제 내역이 없습니다")).toBeNull();
    });

    /** 원본 `view.length - i` — 탭으로 거르면 다시 센다 */
    it("No 는 지금 보이는 목록의 역순 순번이다", async () => {
      const { user } = renderAt("sujin.park@example.com");
      const numbers = () =>
        within(paymentSection())
          .getAllByRole("row")
          .slice(1)
          .map((row) => within(row).getAllByRole("cell")[0].textContent);

      expect(numbers()).toEqual(["5", "4", "3", "2", "1"]);
      await user.click(screen.getByRole("radio", { name: "판매" }));
      expect(numbers()).toEqual(["2", "1"]);
    });

    /**
     * 원본 `modeOf`·`prodOf` — 한 주문에 렌트와 판매가 섞이면 구분이 **둘**이고
     * [렌트]·[판매] 탭 양쪽에 나온다. 상품이 여럿이면 `첫 상품 외 N건` 이다.
     */
    it("렌트·판매가 섞인 주문은 구분 태그가 둘이고 양쪽 탭에 나온다", async () => {
      const { user } = renderAt("yuna.choi@example.com");
      const mixedRow = () =>
        within(paymentSection())
          .getByText("20260731662240")
          .closest("tr") as HTMLElement;

      expect(within(mixedRow()).getByText("렌트")).toBeVisible();
      expect(within(mixedRow()).getByText("판매")).toBeVisible();
      expect(
        within(mixedRow()).getByText("잘레토 전동 바운서 4세대 외 1건"),
      ).toBeVisible();

      await user.click(screen.getByRole("radio", { name: "렌트" }));
      expect(mixedRow()).toBeVisible();
      await user.click(screen.getByRole("radio", { name: "판매" }));
      expect(mixedRow()).toBeVisible();
    });

    it("결제한 적이 없으면 표 대신 빈 상태를 낸다", () => {
      renderAt("jiwoo.han@example.com");

      expect(screen.getByText("결제 내역이 없습니다")).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "결제 내역 (0)" }),
      ).toBeVisible();
      /* 고를 것이 없으므로 탭도 내지 않는다 */
      expect(screen.queryByRole("radio", { name: "렌트" })).toBeNull();
    });
  });

  describe("하단 액션 바", () => {
    it("[목록] 은 목록 화면으로 돌아간다", async () => {
      const { user, onNavSelect } = renderAt("dohyun.kim@example.com");

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/members");
    });

    /** 고친 것이 없으면 저장할 것도 없다 — 누를 수 있게 두면 "저장됐나?"가 된다 */
    it("고치기 전에는 저장이 잠겨 있다", () => {
      renderAt("dohyun.kim@example.com");

      expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    });

    /** 원본 `nv-bar` 처럼 화면 아래에 붙는다 — 섹션이 길어도 끝까지 내리지 않고 저장한다 */
    it("하단 바는 화면 아래에 붙는다", () => {
      renderAt("dohyun.kim@example.com");

      const bar = screen
        .getByRole("button", { name: "저장하기" })
        .closest("[data-variant]") as HTMLElement;
      expect(bar.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "bottom-6"]),
      );
    });

    it("[정상] 으로 되돌리는 저장은 사유를 받지 않는다", async () => {
      const { user } = renderAt("minseo.jung@example.com");

      await user.click(stateButton("정상"));
      await user.click(screen.getByRole("button", { name: "저장하기" }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });

    /**
     * 원본 C-3 ⓐ — 상세 저장도 목록 일괄과 **같은 사유 게이트**를 지난다.
     * 한때 상세만 무사유로 통과해, 같은 정지 처분이 통로에 따라 기록이 갈렸다.
     */
    /* 퍼블은 저장하지 않는다(토스트만) — 저장 뒤 사유 줄의 모습은 아래 「기록된 사유」가 예시 회원으로 본다 */
    it("정지로 저장하면 사유를 받는다 — 빈 사유는 막는다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      await user.click(stateButton("정지"));
      await user.click(screen.getByRole("button", { name: "저장하기" }));

      const dialog = screen.getByRole("dialog", {
        name: "회원 정지 사유 입력",
      });
      /* 빈 사유는 막는다 — 저장되지 않는다 */
      await user.click(
        within(dialog).getByRole("button", { name: "정지 처리" }),
      );
      expect(
        within(dialog).getByText("정지 사유를 입력해주세요."),
      ).toBeVisible();
      expect(within(header()).getByText("정상")).toBeVisible();

      await user.type(within(dialog).getByRole("textbox"), "이용약관 위반");
      await user.click(
        within(dialog).getByRole("button", { name: "정지 처리" }),
      );

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("사유 모달을 취소하면 저장하지 않고, 고른 값은 화면에 남는다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      await user.click(stateButton("휴면"));
      await user.click(screen.getByRole("button", { name: "저장하기" }));
      const dialog = screen.getByRole("dialog", {
        name: "회원 휴면 사유 입력",
      });
      await user.click(within(dialog).getByRole("button", { name: "취소" }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(within(header()).getByText("정상")).toBeVisible();
      expect(stateButton("휴면")).toBeChecked();
    });

    /** 원본 `nav(listScr)` — [취소] 는 저장하지 않고 목록으로 간다 */
    it("[취소] 는 저장하지 않고 목록으로 간다", async () => {
      const { user, onNavSelect } = renderAt("dohyun.kim@example.com");

      await user.click(stateButton("정지"));
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(onNavSelect).toHaveBeenCalledWith("/members");
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    /**
     * 주소만 바뀌어 다른 회원으로 가면 고치던 값을 버린다 —
     * A 에서 고치다 B 를 보고 A 로 돌아왔을 때 A 의 고친 값이 되살아나면 안 된다.
     */
    it("다른 회원으로 갔다 와도 고치던 값이 되살아나지 않는다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      await user.click(stateButton("정지"));
      act(() => navigate("/members/sujin.park%40example.com"));
      expect(stateButton("정상")).toBeChecked();

      act(() => navigate("/members/dohyun.kim%40example.com"));
      expect(stateButton("정상")).toBeChecked();
      expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    });
  });

  describe("기록된 사유", () => {
    it("수동으로 정지된 회원은 사유와 처리 일시를 보여준다", () => {
      renderAt("minseo.jung@example.com");
      const account = section("계정 상태");

      expect(within(account).getByText("정지 사유")).toBeVisible();
      expect(
        within(account).getByText(/반납 지연 반복 · 분쟁 3건 접수/),
      ).toBeVisible();
      expect(within(account).getByText("· 2026.08.30 15:20")).toBeVisible();
    });

    /** 정지 회원에서 가장 먼저 읽을 값 — 상태 선택 바로 아래 첫 줄(가입일 앞) */
    it("사유는 계정 상태 정보의 첫 줄이다", () => {
      renderAt("minseo.jung@example.com");
      const labels = Array.from(
        section("계정 상태").querySelectorAll("dt"),
      ).map((dt) => dt.textContent);

      expect(labels.slice(0, 2)).toEqual(["정지 사유", "가입일"]);
    });

    /** 저장된 사유다 — 고르는 중인 상태와 짝짓지 않는다 */
    it("다른 상태를 골라도 저장된 사유 줄은 그대로다", async () => {
      const { user } = renderAt("minseo.jung@example.com");

      await user.click(screen.getByRole("radio", { name: "정상" }));
      expect(within(section("계정 상태")).getByText("정지 사유")).toBeVisible();
    });

    it("화면의 라벨 폭은 하나다 — 카드끼리 값 시작선이 맞는다", () => {
      renderAt("minseo.jung@example.com");
      const widths = new Set(
        Array.from(document.querySelectorAll("dl dt")).map(
          (dt) => (dt as HTMLElement).style.width,
        ),
      );
      expect(widths).toEqual(new Set(["96px"]));
    });

    /** 12개월 미접속 **자동** 휴면에는 사유가 없다 — 빈 줄을 만들지 않는다 */
    it("사유가 없는 휴면(자동 전환)에는 사유 줄이 없다", () => {
      renderAt("haneul.lee@example.com");

      expect(screen.queryByText("휴면 사유")).toBeNull();
    });
  });

  describe("섹션 접기", () => {
    it("제목 옆 버튼으로 내용을 접었다 편다", async () => {
      const { user } = renderAt("dohyun.kim@example.com");

      expect(screen.getByText("010-5520-3318")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "기본 정보 접기" }));
      expect(screen.queryByText("010-5520-3318")).toBeNull();

      await user.click(
        screen.getByRole("button", { name: "기본 정보 펼치기" }),
      );
      expect(screen.getByText("010-5520-3318")).toBeVisible();
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 섹션 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt("dohyun.kim@example.com", "?preview=loading");

      expect(screen.getByRole("heading", { name: "기본 정보" })).toBeVisible();
      expect(screen.queryByText("010-5520-3318")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값을 흐리게 유지하고 스켈레톤으로 되돌리지 않는다", () => {
      renderAt("dohyun.kim@example.com", "?preview=refreshing");

      expect(screen.getByText("010-5520-3318")).toBeVisible();
      expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    });
  });
});
