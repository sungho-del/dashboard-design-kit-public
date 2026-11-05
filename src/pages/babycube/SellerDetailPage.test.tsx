import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { SellerDetailPage } from "./SellerDetailPage";

/* -------------------------------------------------------------------------
 * S03-D 셀러 상세 — 폼형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 정책**이다 —
 * 경로의 id 로 그 셀러를 찾는가 · 필수 값·수수료율 범위를 검증하는가 ·
 * **본사 계정은 상태·위생인증만 잠그고 수수료율은 0% 이상을 받는가** · [퇴점] 저장이 확인 창을 거치는가 ·
 * 서류 미리보기 · 등록 상품 표(원본 컬럼·배지·페이지) · 셀러를 오갈 때 고친 값이 따라가지 않는가 ·
 * 없는 셀러에게 돌아갈 길을 주는가.
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

function renderAt(sellerId: string, query = "") {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();
  const user = userEvent.setup();

  window.history.replaceState(
    null,
    "",
    `/sellers/${encodeURIComponent(sellerId)}${query}`,
  );

  render(
    <ToastProvider position="bottom">
      <SellerDetailPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="/sellers"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect, onNavOpenChange };
}

/** 섹션 카드 — 제목으로 찾아 그 안에서만 질의한다 */
const section = (title: string | RegExp) =>
  screen
    .getByRole("heading", { name: title })
    .closest("[data-variant]") as HTMLElement;

/** 페이지 헤더 — 이름과 **저장된** 상태 배지가 있다 */
const header = () =>
  screen
    .getByRole("heading", { name: "셀러 상세" })
    .closest("header") as HTMLElement;

const field = (name: string) => screen.getByRole("textbox", { name });
const saveButton = () => screen.getByRole("button", { name: "저장하기" });

/** 일반 셀러(상품 3개 · 남은 일 있음) · 본사 계정 · 남은 일 없는 셀러(상품 0 · 계좌 미등록) */
const NORMAL = "S-1042";
const HEADQUARTERS = "S-0001";
const QUIET = "S-1190";

describe("SellerDetailPage (S03-D 셀러 상세)", () => {
  describe("경로와 조회", () => {
    it("경로의 id 로 그 셀러를 찾아 보여준다", () => {
      renderAt(NORMAL);

      expect(field("셀러명")).toHaveValue("아기별상사");
      expect(field("연락처")).toHaveValue("010-3391-5502");
      expect(within(header()).getByText("아기별상사")).toBeVisible();
    });

    it("머리에 저장된 상태 배지를 단다 — 본사는 「본사」 배지도", () => {
      renderAt(HEADQUARTERS);

      expect(within(header()).getByText("본사")).toBeVisible();
      expect(within(header()).getByText("입점")).toBeVisible();
    });

    it("없는 셀러면 돌아갈 길을 준다", async () => {
      const { user, onNavSelect } = renderAt("S-9999");

      expect(screen.getByText("찾을 수 없는 셀러입니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "셀러 목록으로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
    });
  });

  describe("셀러 정보 — 원본 sec.sellers_basic", () => {
    /** 원본 `gInput(t, key, placeholder, max)` — 필수 · 자리표시자 · 글자 수 한도 */
    it("셀러명·대표자·연락처는 필수 입력칸이고 글자 수 한도가 원본 그대로다", () => {
      renderAt(NORMAL);

      expect(field("셀러명")).toHaveAttribute("maxlength", "40");
      expect(field("셀러명")).toHaveAttribute("placeholder", "셀러(상호)명");
      expect(field("대표자")).toHaveAttribute("maxlength", "20");
      expect(field("연락처")).toHaveAttribute("placeholder", "010-0000-0000");
      for (const name of ["셀러명", "대표자", "연락처"]) {
        expect(field(name)).toBeRequired();
      }
    });

    it("사업자 유형·상품 취급 유형·상태를 고를 수 있다", async () => {
      const { user } = renderAt(NORMAL);

      await user.click(screen.getByRole("radio", { name: "개인" }));
      await user.click(screen.getByRole("radio", { name: "렌트" }));
      await user.click(screen.getByRole("radio", { name: "퇴점 처리중" }));

      expect(screen.getByRole("radio", { name: "개인" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "렌트" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "퇴점 처리중" })).toBeChecked();
      /* 머리 배지는 **저장된** 상태 그대로다 */
      expect(within(header()).getByText("입점")).toBeVisible();
    });

    it("제출 서류를 파일명과 등록번호·신고번호로 낸다", () => {
      renderAt(NORMAL);
      const basic = section("셀러 정보");

      expect(within(basic).getByText("사업자등록증.pdf")).toBeVisible();
      expect(within(basic).getByText("등록번호 214-81-30912")).toBeVisible();
      expect(
        within(basic).getByText("신고번호 2025-서울성동-01142"),
      ).toBeVisible();
    });

    /** 원본 `docModalView` — 미리보기 창. 실제 파일이 아니라 예시임을 밝힌다 */
    it("[보기] 는 서류 미리보기 창을 열고, [다운로드] 는 알린다", async () => {
      const { user } = renderAt(NORMAL);

      await user.click(
        within(section("셀러 정보")).getAllByRole("button", {
          name: "보기",
        })[0],
      );

      const dialog = screen.getByRole("dialog", {
        name: "사업자등록증 — 아기별상사",
      });
      expect(within(dialog).getByText("214-81-30912")).toBeVisible();
      expect(within(dialog).getByText("국세청")).toBeVisible();
      expect(
        within(dialog).getByText("예시 미리보기 · 실제 서류 미연동"),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "다운로드" }),
      );
      expect(await screen.findByText("사업자등록증 다운로드")).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("운영 정보 — 원본 sec.sellers_oper", () => {
    it("수수료율을 입력칸으로 내고 안내 문구를 붙인다", () => {
      renderAt(NORMAL);
      const operation = section("운영 정보");

      expect(within(operation).getByRole("textbox")).toHaveValue("12");
      expect(
        within(operation).getByText(
          "셀러 정산(플랫폼 수수료) 계산의 기준 요율입니다.",
        ),
      ).toBeVisible();
    });

    /* 판정 Q8 · 디자인 §1 — 저장된 상태가 퇴점 처리중·퇴점이면 읽기 전용 + 안내 한 줄 */
    it.each([
      ["S-1155", "8%"],
      ["S-1204", "16%"],
    ])(
      "퇴점 처리중·퇴점 셀러(%s) 수수료율은 읽는 값과 안내 — 입력칸이 없다",
      (id, value) => {
        renderAt(id);
        const operation = section("운영 정보");

        expect(within(operation).queryByRole("textbox")).toBeNull();
        expect(within(operation).getByText(value)).toBeVisible();
        expect(
          within(operation).getByText(
            "퇴점 처리중·퇴점 셀러는 수수료율을 바꿀 수 없습니다",
          ),
        ).toBeVisible();
      },
    );

    it("입점 셀러에는 잠금 안내가 없다", () => {
      renderAt(NORMAL);
      expect(
        screen.queryByText(
          "퇴점 처리중·퇴점 셀러는 수수료율을 바꿀 수 없습니다",
        ),
      ).toBeNull();
    });

    it("입점일·등록 상품수·평점을 원본 표기로 함께 낸다", () => {
      renderAt(NORMAL);
      const operation = section("운영 정보");

      expect(within(operation).getByText("★ 4.8")).toBeVisible();
      expect(within(operation).getByText("3개")).toBeVisible();
    });
  });

  /**
   * ⚠️ 본사 계정 — **상태(입점)·위생인증(「인증 (본사 직영)」)만 잠근다**. 수수료율은 처음 0%, 수정 가능 · 본사 행만 0% 이상
   * (판정 Q20-1 · Q20-5 · 디자인 §3 #15 — 2026-10-15 「수수료율 0% 잠금」을 풀었다).
   */
  describe("본사 계정", () => {
    /** 부록 A C69 · 개발 §3-2-5 — 「퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)」 안내는 지웠다 */
    it("상태 대신 「본사」·「입점」 배지만 낸다(안내 문구 없음)", () => {
      renderAt(HEADQUARTERS);
      const basic = section("셀러 정보");
      /* 읽는 칸(`ReadField`) — 라벨 바로 뒤가 값이다 */
      const state = within(basic).getByText("상태").nextElementSibling;

      expect(state?.textContent).toBe("본사입점");
      expect(within(basic).queryByText(/관리 대상이 아닙니다/)).toBeNull();
      expect(screen.queryByRole("radio", { name: "퇴점" })).toBeNull();
    });

    it("수수료율은 처음 0 인 입력칸이고 「본사 고정」 글자가 없다", () => {
      renderAt(HEADQUARTERS);
      const operation = section("운영 정보");

      expect(within(operation).getByRole("textbox")).toHaveValue("0");
      expect(within(operation).queryByText("본사 고정")).toBeNull();
      expect(
        Array.from(operation.querySelectorAll("dl dt")).map(
          (dt) => dt.textContent,
        ),
      ).not.toContain("수수료율");
    });

    /** 판정 Q20-5 — 본사 행만 0% 이상. 칸 아래 안내·6~16% 경고는 띄우지 않는다(기획 확인 요청 3번) */
    it("0% 그대로 저장되고, 칸 아래 안내·경고가 없다", async () => {
      const { user } = renderAt(HEADQUARTERS);
      const operation = section("운영 정보");

      await user.type(field("대표자"), "님");
      await user.click(saveButton());

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
      expect(screen.queryByText(/셀러 수수료율은 0보다 크고/)).toBeNull();
      expect(
        within(operation).queryByText(
          "셀러 정산(플랫폼 수수료) 계산의 기준 요율입니다.",
        ),
      ).toBeNull();
      expect(within(operation).queryByText(/일반적인 범위/)).toBeNull();
    });

    it("본사 행도 100 을 넘으면 저장하지 않는다", async () => {
      const { user } = renderAt(HEADQUARTERS);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "140");
      await user.click(saveButton());

      expect(
        screen.getByText(
          "셀러 수수료율은 0보다 크고 100 이하, 소수 둘째 자리까지 입력해 주세요.",
        ),
      ).toBeVisible();
      expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
    });

    /** 판정 Q20-2 · 디자인 §3 #16 — 「인증」 고정(잠금), 표시 「인증 (본사 직영)」 */
    it("위생인증은 세그먼트 없이 「인증 (본사 직영)」 이다", () => {
      renderAt(HEADQUARTERS);
      const operation = section("운영 정보");

      expect(within(operation).queryByRole("radio")).toBeNull();
      expect(within(operation).getByText("인증 (본사 직영)")).toBeVisible();
    });

    it("나머지(셀러 정보·취급 유형)는 고치고 저장할 수 있다", async () => {
      const { user } = renderAt(HEADQUARTERS);

      await user.click(screen.getByRole("radio", { name: "판매" }));
      await user.type(field("대표자"), "님");
      await user.click(saveButton());

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });
  });

  describe("등록 상품 — 원본 sec.sellers_prod", () => {
    /** 열 합이 카드보다 넓어지면 페이지가 아니라 표 안에서 스크롤돼야 한다 */
    it("표는 가로 스크롤 상자 안에 있다", () => {
      renderAt(NORMAL);
      const table = within(section(/^등록 상품/)).getByRole("table");
      expect(table.parentElement?.className.split(/\s+/)).toContain(
        "overflow-x-auto",
      );
    });

    it("제목에 건수가 붙고 원본 9개 컬럼을 그 순서로 낸다", () => {
      renderAt(HEADQUARTERS);

      expect(
        screen.getByRole("heading", { name: "등록 상품 (4)" }),
      ).toBeVisible();

      const headers = within(section(/^등록 상품/))
        .getAllByRole("columnheader")
        .map((th) => th.textContent);

      expect(headers).toEqual([
        "No",
        "유형",
        "판매 상태",
        "상품코드",
        "상품명",
        "카테고리",
        "상품등록일",
        "최종수정일",
        "전시상태",
      ]);
    });

    /**
     * 원본은 이 표에서 **초까지** 낸다(`2026.05.10 09:14:22`) —
     * 목록 화면의 날짜 표기(`ymd`)와 다르다. 하루에 여러 번 고치는 자리라서다.
     */
    it("등록·수정 일시를 초까지 낸다", () => {
      renderAt(HEADQUARTERS);

      expect(
        within(section(/^등록 상품/)).getByText("2026.05.10 09:14:22"),
      ).toBeVisible();
    });

    /**
     * 판정 Q9 — 등록 상품수 = 임시저장을 뺀 전체(상품 목록과 같은 수). 「등록 상품수」 · 「등록 상품 (N)」 ·
     * 표의 행이 모두 상품 목록의 그 셀러 행이다(아기별상사 = AS730125 · AS902715 · AS563019).
     */
    it("등록 상품수 · 표 제목 건수 · 표 행이 상품 목록과 같다", () => {
      renderAt(NORMAL);

      expect(within(section("운영 정보")).getByText("3개")).toBeVisible();
      const products = section("등록 상품 (3)");
      const codes = within(products)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[3].textContent);
      expect(codes).toEqual(["AS730125", "AS902715", "AS563019"]);
    });

    /**
     * 원본 `pager("sellerProds")` — 10개씩, No 는 페이지 안 순번(`start + i + 1`).
     * 상품 목록에 10개 넘는 셀러가 없어(판정 Q9 — 같은 원천) 지금 샘플은 모두 한 쪽이다
     */
    it("No 는 페이지 안 순번이다", () => {
      renderAt("S-201");
      const nos = within(section("등록 상품 (5)"))
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[0].textContent);

      expect(nos).toEqual(["1", "2", "3", "4", "5"]);
    });

    /** 원본 `modeTags` — 유형 배지. 판매 상태는 상품 관리와 같은 어휘·색 */
    it("유형·판매 상태·전시상태를 배지로 낸다", () => {
      renderAt("S-231");
      const products = section("등록 상품 (4)");
      const row = within(products)
        .getByText("UV 젖병소독기 미니")
        .closest("tr") as HTMLElement;

      expect(within(row).getByText("판매")).toBeVisible();
      expect(within(row).getByText("전시중")).toBeVisible();

      const rejected = within(products).getByText("반려");
      expect(rejected.className.split(/\s+/)).toContain("text-text-critical");
    });

    /** 디자인 §3 #3 — 직영 상품 등록·수정의 진입점은 본사 행 등록 상품 머리(사이드바 메뉴 없음) */
    it("본사 행은 [+ 상품 등록] 으로 직영 등록, 상품코드로 직영 상품 상세에 간다", async () => {
      const { user, onNavSelect } = renderAt(HEADQUARTERS);
      const products = section(/^등록 상품/);

      await user.click(
        within(products).getByRole("button", { name: "상품 등록" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/products/new");

      await user.click(
        within(products).getByRole("button", { name: "PR270901" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/products/PR270901");
    });

    /** 입점 셀러 행을 이을지는 기획 확인 중(질문 16) — 글자로 둔다 */
    it("입점 셀러는 [+ 상품 등록] 이 없고 상품코드는 글자다", () => {
      renderAt(NORMAL);
      const products = section(/^등록 상품/);

      expect(
        within(products).queryByRole("button", { name: "상품 등록" }),
      ).toBeNull();
      expect(
        within(products).queryByRole("button", { name: "AS730125" }),
      ).toBeNull();
      expect(within(products).getByText("AS730125")).toBeVisible();
    });

    it("등록한 상품이 없으면 표 대신 빈 상태를 낸다", () => {
      renderAt("S-1204");

      expect(screen.getByText("등록된 상품이 없습니다")).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "등록 상품 (0)" }),
      ).toBeVisible();
    });
  });

  /** 디자인 §3 #6 · 개발 `BankAccountCard` — 운영 정보와 등록 상품 사이, 카드 전용 [계좌 저장] */
  describe("정산 정보 — 정산 계좌 카드", () => {
    const bank = () => section("정산 정보");

    it("운영 정보와 등록 상품 사이에 있다", () => {
      renderAt(NORMAL);
      const titles = screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent);
      const at = titles.indexOf("정산 정보");

      expect(titles[at - 1]).toBe("운영 정보");
      expect(titles[at + 1]).toMatch(/^등록 상품/);
    });

    it("본사 행은 안내 한 줄만 — 입력칸이 없다", () => {
      renderAt(HEADQUARTERS);

      expect(
        within(bank()).getByText("본사 행은 정산 계좌를 등록하지 않습니다."),
      ).toBeVisible();
      expect(within(bank()).queryByRole("textbox")).toBeNull();
      expect(
        within(bank()).queryByRole("button", { name: "계좌 저장" }),
      ).toBeNull();
    });

    it("등록된 셀러는 마스킹 계좌 한 줄과 통장사본을 보이고 [교체] 로 고른다", () => {
      renderAt(NORMAL);

      expect(
        within(bank()).getByText(
          "등록됨 국민은행 ***-***-**4417 ((주)아기별상사) · 2025.11.04 · 본사 관리자",
        ),
      ).toBeVisible();
      expect(within(bank()).getByText("통장사본_아기별상사.pdf")).toBeVisible();
      expect(
        within(bank()).getByRole("button", { name: "교체" }),
      ).toBeVisible();
      expect(within(bank()).getByText("PDF·JPG·PNG · 최대 10MB")).toBeVisible();
    });

    it("미등록 셀러는 지급이 막힌다는 상태와 [파일 선택] 을 보인다", () => {
      renderAt(QUIET);

      expect(
        within(bank()).getByText(
          "정산 계좌가 등록되지 않았습니다. 등록 전에는 [지급 처리]가 막힙니다.",
        ),
      ).toBeVisible();
      expect(
        within(bank()).getByText("등록된 통장사본이 없습니다."),
      ).toBeVisible();
      expect(
        within(bank()).getByRole("button", { name: "파일 선택" }),
      ).toBeVisible();
    });

    it("[계좌 저장] 은 은행명·예금주·계좌번호 규칙을 검사하고, 통과하면 칸을 비운다", async () => {
      const { user } = renderAt(QUIET);
      const save = () =>
        user.click(within(bank()).getByRole("button", { name: "계좌 저장" }));

      await save();
      expect(within(bank()).getByRole("alert")).toHaveTextContent(
        "은행명·예금주를 입력해 주세요.",
      );

      await user.type(field("은행명"), "하나은행");
      await user.type(field("예금주"), "정다인");
      /* 숫자·하이픈 밖의 글자는 지운다 — 숫자 5개면 막는다 */
      await user.type(field("계좌번호"), "12a-345");
      expect(field("계좌번호")).toHaveValue("12-345");
      await save();
      expect(within(bank()).getByRole("alert")).toHaveTextContent(
        "계좌번호는 숫자와 하이픈만 6~30자로 입력해 주세요.",
      );

      await user.type(field("계좌번호"), "678901");
      await save();
      expect(within(bank()).getByRole("status")).toHaveTextContent(
        "정산 계좌를 저장했습니다.",
      );
      expect(field("은행명")).toHaveValue("");
      expect(field("계좌번호")).toHaveValue("");
      /* 하단 [저장하기] 와는 별개다 */
      expect(saveButton()).toBeDisabled();
    });

    it("퇴점 셀러는 읽기만 — 입력칸·[계좌 저장] 이 없다", () => {
      renderAt("S-1204");

      expect(
        within(bank()).getByText(/^등록됨 광주은행 \*\*\*-\*\*\*-\*\*2093/),
      ).toBeVisible();
      expect(within(bank()).queryByRole("textbox")).toBeNull();
      expect(within(bank()).queryByRole("button", { name: "교체" })).toBeNull();
      expect(
        within(bank()).queryByRole("button", { name: "계좌 저장" }),
      ).toBeNull();
    });
  });

  describe("저장", () => {
    it("[목록] 은 목록 화면으로 돌아간다", async () => {
      const { user, onNavSelect } = renderAt(NORMAL);

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
    });

    it("고치기 전에는 저장이 잠겨 있다", () => {
      renderAt(NORMAL);

      expect(saveButton()).toBeDisabled();
    });

    it("수수료율을 고치면 저장할 수 있고, 저장하면 알린다", async () => {
      const { user } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "15");
      await user.click(saveButton());

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });

    /** 판정 Q20-5 — 0 초과 100 이하 · 소수 둘째 자리까지. 벗어나면 플랫폼 수수료가 잘못 계산된다 */
    it.each([["140"], ["0"], ["12.345"]])(
      "「%s」 는 저장하지 않고 이유를 낸다",
      async (value) => {
        const { user } = renderAt(NORMAL);
        const input = within(section("운영 정보")).getByRole("textbox");

        await user.clear(input);
        await user.type(input, value);
        await user.click(saveButton());

        expect(
          screen.getByText(
            "셀러 수수료율은 0보다 크고 100 이하, 소수 둘째 자리까지 입력해 주세요.",
          ),
        ).toBeVisible();
        expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
      },
    );

    /** 디자인 §3 #12 · D-217 — 6~16% 밖은 막지 않고 칸 아래 경고 한 줄 */
    it("6~16% 밖이면 칸 아래 경고를 보이지만 저장은 막지 않는다 · 입력칸은 숫자·점만", async () => {
      const { user } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");
      const warning =
        "일반적인 범위(6~16%)를 벗어난 요율이에요. 저장 전에 확인해 주세요.";

      expect(screen.queryByText(warning)).toBeNull();
      await user.clear(input);
      await user.type(input, "2a0");
      expect(input).toHaveValue("20");
      expect(screen.getByText(warning)).toBeVisible();

      await user.click(saveButton());
      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();

      await user.clear(input);
      await user.type(input, "16");
      expect(screen.queryByText(warning)).toBeNull();
    });

    it("필수 값을 비우면 저장하지 않고 이유를 낸다", async () => {
      const { user } = renderAt(NORMAL);

      await user.clear(field("셀러명"));
      expect(screen.queryByText("셀러명을 입력해 주세요.")).toBeNull();
      await user.click(saveButton());

      expect(screen.getByText("셀러명을 입력해 주세요.")).toBeVisible();
      expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
    });

    /** 원본 `nav(listScr)` — 회원 상세와 같이 [취소] 는 저장하지 않고 목록으로 간다 */
    it("[취소] 는 저장하지 않고 목록으로 간다", async () => {
      const { user, onNavSelect } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "9");
      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
      expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
    });

    it("하단 바는 화면 아래에 붙는다", () => {
      renderAt(NORMAL);

      const bar = saveButton().closest("[data-variant]") as HTMLElement;
      expect(bar.className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "bottom-6"]),
      );
    });

    /**
     * 주소만 바뀌어 다른 셀러로 가면 화면이 처음부터 시작한다 —
     * A 에서 고치던 값이 B 에 묻어가거나, A 로 돌아왔을 때 되살아나면 안 된다.
     */
    it("다른 셀러로 갔다 와도 고치던 값이 따라가거나 되살아나지 않는다", async () => {
      const { user } = renderAt(NORMAL);

      await user.clear(field("셀러명"));
      await user.type(field("셀러명"), "고친이름");
      expect(saveButton()).toBeEnabled();

      act(() => navigate("/sellers/S-1078"));
      expect(field("셀러명")).toHaveValue("베이비무브");
      expect(saveButton()).toBeDisabled();

      act(() => navigate(`/sellers/${NORMAL}`));
      expect(field("셀러명")).toHaveValue("아기별상사");
      expect(saveButton()).toBeDisabled();
    });
  });

  /**
   * 원본 `gateQuit` — [퇴점] 으로 바꿔 저장하면 남은 일을 세어 보여 준다.
   * 0건도 「없음」으로 남기고, 남은 건이 있어도 **막지 않고 경고만** 한다.
   */
  describe("퇴점 확인 창", () => {
    const toClosed = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole("radio", { name: "퇴점" }));
      await user.click(saveButton());
    };

    /** 디자인 §3 #11 · 개발 `ExitGate` — 다섯 줄 · 안내 둘 · 쿠폰은 경고 판정에서 뺀다 */
    it("진행 중 렌트·미정산 회차·미해결 클레임·판매 가능한 상품·유효 쿠폰을 세어 보이고, 남은 건이 있으면 경고한다", async () => {
      const { user } = renderAt(NORMAL);

      await toClosed(user);

      const dialog = screen.getByRole("dialog", {
        name: "퇴점 처리 확인 · 아기별상사",
      });
      const valueOf = (label: string) =>
        within(dialog).getByText(label).nextElementSibling?.textContent;
      expect(valueOf("진행 중 렌트")).toBe("3건");
      expect(valueOf("미정산 회차")).toBe("없음");
      expect(valueOf("미해결 클레임")).toBe("1건");
      /* 판매중 2 — 판매중지(AS563019)는 세지 않는다 */
      expect(valueOf("판매 가능한 상품")).toBe("2개");
      /* 쿠폰관리의 아기별상사 「사용」 쿠폰 1장(CP-2609-01) */
      expect(valueOf("유효 쿠폰")).toBe("1장");
      expect(
        within(dialog).getByText(
          "퇴점하면 로그인할 수 없고 판매 가능한 상품 2개는 판매중지·전시중지로 전환됩니다. 유효 쿠폰 1장은 사용중지로 전환되어 고객 쿠폰함·주문서에서 사라집니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText(
          "퇴점 처리 시 셀러에게 알림톡(퇴점 처리 완료)이 발송되고 입점사 어드민 세션이 종료됩니다.",
        ),
      ).toBeVisible();
      expect(
        within(dialog).getByText(/남아 있는 건은 퇴점 후에도/),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "퇴점 처리" }),
      );
      expect(
        await screen.findByText(
          "퇴점 처리했습니다. 상품 2개를 판매중지했습니다. 쿠폰 1장을 사용중지했습니다.",
        ),
      ).toBeVisible();
    });

    /* 맘스케어 — 남은 일·쿠폰 없음 · 판매중 1(MC447210) */
    it("판매 가능한 상품만 남아도 경고한다 — 쿠폰 문장은 쿠폰이 있을 때만", async () => {
      const { user } = renderAt("S-228");

      await toClosed(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getAllByText("없음")).toHaveLength(4);
      expect(
        within(dialog).getByText(
          "퇴점하면 로그인할 수 없고 판매 가능한 상품 1개는 판매중지·전시중지로 전환됩니다.",
        ),
      ).toBeVisible();
      expect(within(dialog).getByText(/남아 있는 건은/)).toBeVisible();
    });

    it("남은 일이 없으면 「없음」만 있고 경고는 없다", async () => {
      const { user } = renderAt("S-206");

      await toClosed(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getAllByText("없음")).toHaveLength(5);
      expect(within(dialog).queryByText(/남아 있는 건은/)).toBeNull();
      await user.click(
        within(dialog).getByRole("button", { name: "퇴점 처리" }),
      );
      expect(await screen.findByText("퇴점 처리했습니다.")).toBeVisible();
    });

    it("[취소] 하면 처리하지 않고 고른 값은 남는다", async () => {
      const { user } = renderAt(NORMAL);

      await toClosed(user);
      await user.click(
        within(screen.getByRole("dialog")).getByRole("button", {
          name: "취소",
        }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(screen.getByRole("radio", { name: "퇴점" })).toBeChecked();
      expect(screen.queryByText(/퇴점 처리했습니다/)).toBeNull();
    });

    it("퇴점 처리중으로 바꾸는 것은 확인 창 없이 저장한다", async () => {
      const { user } = renderAt(NORMAL);

      await user.click(screen.getByRole("radio", { name: "퇴점 처리중" }));
      await user.click(saveButton());

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 섹션 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt(NORMAL, "?preview=loading");

      expect(screen.getByRole("heading", { name: "셀러 정보" })).toBeVisible();
      expect(screen.queryByRole("textbox", { name: "연락처" })).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값을 흐리게 유지하고 스켈레톤으로 되돌리지 않는다", () => {
      renderAt(NORMAL, "?preview=refreshing");

      expect(field("연락처")).toHaveValue("010-3391-5502");
      expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    });
  });
});
