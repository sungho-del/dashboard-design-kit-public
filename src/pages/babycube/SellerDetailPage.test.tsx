import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SellerDetailPage } from "./SellerDetailPage";

/* -------------------------------------------------------------------------
 * S03-D 셀러 상세 — 폼형
 *
 * ## 무엇을 검증하는가
 * 렌더 여부가 아니라 **동작과 정책**이다 —
 * 경로의 id 로 그 셀러를 찾는가 · **본사 계정을 못 고치게 막는가** ·
 * 수수료율 범위를 검증하는가 · 저장/취소가 무엇을 되돌리는가 ·
 * 등록 상품 표가 원본 컬럼을 그대로 내는가 · 없는 셀러에게 돌아갈 길을 주는가.
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

/** 일반 셀러 · 본사 계정 */
const NORMAL = "S-1042";
const HEADQUARTERS = "S-0001";

describe("SellerDetailPage (S03-D 셀러 상세)", () => {
  describe("경로와 조회", () => {
    it("경로의 id 로 그 셀러를 찾아 보여준다", () => {
      renderAt(NORMAL);
      const basic = section("셀러 정보");

      expect(within(basic).getByText("아기별상사")).toBeVisible();
      expect(within(basic).getByText("010-3391-5502")).toBeVisible();
    });

    it("없는 셀러면 돌아갈 길을 준다", async () => {
      const { user, onNavSelect } = renderAt("S-9999");

      expect(screen.getByText("찾을 수 없는 셀러입니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "셀러 목록으로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
    });
  });

  describe("셀러 정보 — 원본 sec.sellers_basic", () => {
    it("제출 서류를 파일명·번호와 함께 낸다", () => {
      renderAt(NORMAL);
      const basic = section("셀러 정보");

      expect(within(basic).getByText("사업자등록증.pdf")).toBeVisible();
      expect(within(basic).getByText("214-81-30912")).toBeVisible();
      expect(within(basic).getByText("통신판매업 신고증.pdf")).toBeVisible();
    });

    it("[보기] 를 누르면 그 파일을 연다고 알린다", async () => {
      const { user } = renderAt(NORMAL);

      await user.click(
        within(section("셀러 정보")).getAllByRole("button", {
          name: "보기",
        })[0],
      );

      expect(
        await screen.findByText("사업자등록증.pdf 을(를) 새 창에서 엽니다"),
      ).toBeVisible();
    });

    /* 읽는 값은 형태로 밝힌다 — 비활성 입력칸은 "고칠 수 있을 것 같은데 안 되는 것"이다 */
    it("읽기 전용 값에는 입력칸을 만들지 않는다", () => {
      renderAt(NORMAL);

      expect(within(section("셀러 정보")).queryByRole("textbox")).toBeNull();
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

    it("입점일·등록 상품수·평점을 함께 낸다", () => {
      renderAt(NORMAL);
      const operation = section("운영 정보");

      expect(within(operation).getByText("4.82")).toBeVisible();
      expect(within(operation).getByText("184개")).toBeVisible();
    });

    /**
     * ⚠️ 이 화면의 가장 중요한 계약 — **본사 계정은 고칠 수 없다.**
     * 자기 자신에게 수수료를 매기지 않으므로 입력칸을 열어 두면 안 된다.
     */
    it("본사 계정은 수수료율 입력칸 대신 0% 와 안내 문구를 낸다", () => {
      renderAt(HEADQUARTERS);

      expect(within(section("운영 정보")).queryByRole("textbox")).toBeNull();
      expect(within(section("운영 정보")).getByText("0%")).toBeVisible();
      expect(
        screen.getByText(
          "본사 행 — 퇴점·심사 관리 대상이 아닙니다 (수수료율 0% 확정)",
        ),
      ).toBeVisible();
    });

    it("본사 계정은 위생인증·취급 유형도 잠겨 있다", () => {
      renderAt(HEADQUARTERS);

      expect(screen.getByRole("radio", { name: "인증" })).toBeDisabled();
      expect(screen.getByRole("radio", { name: "렌트" })).toBeDisabled();
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

    it("등록한 상품이 없으면 표 대신 빈 상태를 낸다", () => {
      renderAt("S-1204");

      expect(screen.getByText("등록된 상품이 없습니다")).toBeVisible();
      expect(
        screen.getByRole("heading", { name: "등록 상품 (0)" }),
      ).toBeVisible();
    });
  });

  describe("하단 액션 바", () => {
    it("[목록] 은 목록 화면으로 돌아간다", async () => {
      const { user, onNavSelect } = renderAt(NORMAL);

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/sellers");
    });

    it("고치기 전에는 저장·취소가 잠겨 있다", () => {
      renderAt(NORMAL);

      expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    });

    it("수수료율을 고치면 저장할 수 있고, 저장하면 알린다", async () => {
      const { user } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "15");
      await user.click(screen.getByRole("button", { name: "저장하기" }));

      expect(await screen.findByText("변경 내용을 저장했습니다")).toBeVisible();
    });

    /** 범위를 벗어난 값으로 저장하면 플랫폼 수수료가 잘못 계산된다 */
    it("0~100 을 벗어나면 저장하지 않고 이유를 낸다", async () => {
      const { user } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "140");
      await user.click(screen.getByRole("button", { name: "저장하기" }));

      expect(screen.getByText("0~100 사이로 입력해 주세요.")).toBeVisible();
      expect(screen.queryByText("변경 내용을 저장했습니다")).toBeNull();
    });

    it("[취소] 는 고친 값을 되돌리고 화면에 머문다", async () => {
      const { user, onNavSelect } = renderAt(NORMAL);
      const input = within(section("운영 정보")).getByRole("textbox");

      await user.clear(input);
      await user.type(input, "9");
      expect(input).toHaveValue("9");

      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(input).toHaveValue("12");
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    /** 본사 계정은 고칠 것이 없으므로 저장도 열리지 않는다 */
    it("본사 계정은 저장이 잠긴 채로 남는다", async () => {
      const { user } = renderAt(HEADQUARTERS);

      await user.click(screen.getByRole("radio", { name: "판매" }));

      expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 섹션 제목은 남기고 값만 스켈레톤이다", () => {
      renderAt(NORMAL, "?preview=loading");

      expect(screen.getByRole("heading", { name: "셀러 정보" })).toBeVisible();
      expect(screen.queryByText("010-3391-5502")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });

    it("refreshing — 값을 흐리게 유지하고 스켈레톤으로 되돌리지 않는다", () => {
      renderAt(NORMAL, "?preview=refreshing");

      expect(screen.getByText("010-3391-5502")).toBeVisible();
      expect(document.body.querySelectorAll("[data-skeleton]")).toHaveLength(0);
    });
  });
});
