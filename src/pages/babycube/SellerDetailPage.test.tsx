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
 * **본사 계정은 상태·수수료율만 잠그는가** · [퇴점] 저장이 확인 창을 거치는가 ·
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

/** 일반 셀러(상품 12개 · 남은 일 있음) · 본사 계정 · 남은 일 없는 셀러 */
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

    it("입점일·등록 상품수·평점을 원본 표기로 함께 낸다", () => {
      renderAt(NORMAL);
      const operation = section("운영 정보");

      expect(within(operation).getByText("★ 4.8")).toBeVisible();
      expect(within(operation).getByText("184개")).toBeVisible();
    });
  });

  /**
   * ⚠️ 본사 계정 — **상태(입점)와 수수료율(0%)만 잠근다** (2026-10-15 사용자 결정).
   * 원본은 상태만 고정하지만 안내 문구가 "수수료율 0% 확정"이라 수수료율도 잠근다.
   */
  describe("본사 계정", () => {
    it("상태 대신 「본사」·「입점」 배지와 안내 문구를 낸다", () => {
      renderAt(HEADQUARTERS);
      const basic = section("셀러 정보");

      expect(
        within(basic).getByText(
          "본사 행 — 퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("radio", { name: "퇴점" })).toBeNull();
    });

    it("수수료율은 입력칸 대신 0% 다", () => {
      renderAt(HEADQUARTERS);

      expect(within(section("운영 정보")).queryByRole("textbox")).toBeNull();
      expect(within(section("운영 정보")).getByText("0%")).toBeVisible();
    });

    it("나머지(셀러 정보·위생인증·취급 유형)는 고치고 저장할 수 있다", async () => {
      const { user } = renderAt(HEADQUARTERS);

      expect(screen.getByRole("radio", { name: "인증안됨" })).toBeEnabled();
      await user.click(screen.getByRole("radio", { name: "판매" }));
      await user.type(field("대표자"), "님");
      await user.click(saveButton());

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });
  });

  describe("등록 상품 — 원본 sec.sellers_prod", () => {
    it("제목에 건수가 붙고 원본 9개 컬럼을 그 순서로 낸다", () => {
      renderAt(HEADQUARTERS);

      expect(
        screen.getByRole("heading", { name: "등록 상품 (3)" }),
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

    /** 원본 `pager("sellerProds")` — 10개씩, No 는 페이지 안 순번(`start + i + 1`) */
    it("10개씩 나눠 보여주고 No 는 이어지는 순번이다", async () => {
      const { user } = renderAt(NORMAL);
      const products = section("등록 상품 (12)");
      const nos = () =>
        within(products)
          .getAllByRole("row")
          .slice(1)
          .map((row) => within(row).getAllByRole("cell")[0].textContent);

      expect(nos()).toHaveLength(10);
      expect(nos()[0]).toBe("1");

      await user.click(within(products).getByRole("button", { name: "2" }));
      expect(nos()).toEqual(["11", "12"]);
    });

    /** 원본 `modeTags` — 렌트·판매 둘 다면 배지 둘. 판매 상태는 상품 관리와 같은 어휘·색 */
    it("유형·판매 상태·전시상태를 배지로 낸다", () => {
      renderAt(NORMAL);
      const row = within(section("등록 상품 (12)"))
        .getByText("렌트 겸용 젖병 워머")
        .closest("tr") as HTMLElement;

      expect(within(row).getByText("렌트")).toBeVisible();
      expect(within(row).getByText("판매")).toBeVisible();
      expect(within(row).getByText("전시중")).toBeVisible();

      const rejected = within(section("등록 상품 (12)")).getByText("반려");
      expect(rejected.className.split(/\s+/)).toContain("text-text-critical");
    });

    it("등록한 상품이 없으면 표 대신 빈 상태를 낸다", () => {
      renderAt("S-1204");

      expect(screen.getByText("등록된 상품이 없습니다")).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "등록 상품 (0)" }),
      ).toBeVisible();
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

    /** 범위를 벗어난 값으로 저장하면 플랫폼 수수료가 잘못 계산된다 */
    it("0~100 을 벗어나면 저장하지 않고 이유를 낸다", async () => {
      const { user } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "140");
      await user.click(saveButton());

      expect(screen.getByText("0~100 사이로 입력해 주세요.")).toBeVisible();
      expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
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

    it("남은 렌트·정산·클레임·판매 중 상품을 세어 보이고, 남은 건이 있으면 경고한다", async () => {
      const { user } = renderAt(NORMAL);

      await toClosed(user);

      const dialog = screen.getByRole("dialog", {
        name: "셀러 퇴점 처리 · 아기별상사",
      });
      const valueOf = (label: string) =>
        within(dialog).getByText(label).nextElementSibling?.textContent;
      expect(valueOf("진행 중인 렌트")).toBe("3건");
      expect(valueOf("미지급 정산")).toBe("없음");
      expect(valueOf("진행 중인 클레임")).toBe("1건");
      /* 판매중 8 + 품절 1 — 반려·재심사요청·판매중지는 세지 않는다 */
      expect(valueOf("판매 중인 상품")).toBe("9개");
      expect(
        within(dialog).getByText(/남아 있는 건은 퇴점 후에도/),
      ).toBeVisible();

      await user.click(
        within(dialog).getByRole("button", { name: "퇴점 처리" }),
      );
      expect(
        await screen.findByText(
          "퇴점 처리되었습니다 — 등록 상품 9개가 판매중지로 전환되었습니다.",
        ),
      ).toBeVisible();
    });

    it("남은 일이 없으면 「없음」만 있고 경고는 없다", async () => {
      const { user } = renderAt(QUIET);

      await toClosed(user);

      const dialog = screen.getByRole("dialog");
      expect(within(dialog).getAllByText("없음")).toHaveLength(3);
      expect(within(dialog).queryByText(/남아 있는 건은/)).toBeNull();
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
      expect(screen.queryByText(/퇴점 처리되었습니다/)).toBeNull();
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
