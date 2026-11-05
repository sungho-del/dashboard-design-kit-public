import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { SupportListPage } from "./SupportListPage";
import {
  CUSTOMER_INQUIRIES,
  SELLER_ASKS,
  filterSummary,
} from "./SupportListPage.data";
import { MEMBERS } from "./MemberListPage.data";
import { SELLERS } from "./SellerListPage.data";
import { DEMO_TODAY, ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * S22 문의 관리 — 목록형 (탭 2개)
 *
 * ## 무엇을 검증하는가
 * 탭(본문 맨 위 · `?tab=seller`) · 고객 탭 상태 2카드(전체 없음 · 기본 미답변 · 툴팁) · No ·
 * 검색조건(기본 펼침 · 대소문자 무시 · 유형 · 기간 기준 · 요약 · 초기화) · 페이지 크기 ·
 * 행 클릭 → 상세 · 셀러 탭 요약·표 · `?preview=` · **샘플 정합**(회원 = MEMBERS · 셀러 = SELLERS ·
 * 주문 시각 뒤 · 시연 기준일 전 · 원본 분포 미답변 4/답변완료 2 · 셀러 2/3).
 *
 * ## 원본에 없는 것이 되살아나지 않는지도 본다 — [전체] 카드 · 미리보기 모달 · 엑셀 · 체크박스
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

function renderPage(url = "/support") {
  window.history.replaceState(null, "", url);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <SupportListPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/support"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const statusBox = (name: string) => screen.getByRole("button", { name });

function bodyRows(): HTMLElement[] {
  const table = screen.queryByRole("table");
  if (!table) return [];
  return within(table).getAllByRole("row").slice(1);
}

/** 고객 열: 0 No · 1 회원명 · 2 유형 · 3 제목 · 4 내용 · 5 접수일 · 6 답변일 · 7 상태 */
const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell");
const column = (index: number) =>
  bodyRows().map((row) => cellsOf(row)[index].textContent);

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  selectName: string,
  optionLabel: string,
) {
  await user.click(screen.getByRole("combobox", { name: selectName }));
  await user.click(
    within(screen.getByRole("listbox")).getByRole("option", {
      name: optionLabel,
    }),
  );
}

const keywordBox = () => screen.getByPlaceholderText("검색어 입력");

describe("SupportListPage (S22 문의 관리)", () => {
  describe("샘플 — 원본 문구 그대로 · 사람은 공통 데이터", () => {
    it("고객 6건 = 미답변 4 · 답변완료 2 / 셀러 3건 = 미답변 2 · 답변완료 1 (원본 분포)", () => {
      const count = (rows: { status: string }[], status: string) =>
        rows.filter((row) => row.status === status).length;
      expect(CUSTOMER_INQUIRIES.map((row) => row.id)).toEqual([
        "Q-8841",
        "Q-8840",
        "Q-8838",
        "Q-8835",
        "Q-8831",
        "Q-8828",
      ]);
      expect(count(CUSTOMER_INQUIRIES, "pending")).toBe(4);
      expect(count(CUSTOMER_INQUIRIES, "done")).toBe(2);
      expect(SELLER_ASKS.map((row) => row.id)).toEqual([
        "SQ-14",
        "SQ-13",
        "SQ-12",
      ]);
      expect(count(SELLER_ASKS, "pending")).toBe(2);
    });

    it("회원은 MEMBERS 에 있다 — 연결표 (노하린 · 구민재(휴면) · 박수진 · 백도윤 · 신우진(정지) · 윤서아)", () => {
      const rows = CUSTOMER_INQUIRIES.map((row) => {
        const member = MEMBERS.find((item) => item.id === row.memberId);
        return [row.id, member?.name, member?.status];
      });
      expect(rows).toEqual([
        ["Q-8841", "노하린", "active"],
        ["Q-8840", "구민재", "dormant"],
        ["Q-8838", "박수진", "active"],
        ["Q-8835", "백도윤", "active"],
        ["Q-8831", "신우진", "suspended"],
        ["Q-8828", "윤서아", "dormant"],
      ]);
      /* 답변 「마케팅 수신 해지 처리」 ↔ 회원 상세 마케팅 수신 미동의 */
      expect(
        MEMBERS.find((item) => item.id === "seoa.yoon@example.com")
          ?.marketingOptIn,
      ).toBe(false);
    });

    it("셀러 3곳은 셀러 마스터에 있다", () => {
      const names = SELLERS.map((seller) => seller.name);
      for (const ask of SELLER_ASKS) expect(names).toContain(ask.seller);
    });

    it("주문과 맞물린다 — Q-8841 은 U-S35(노하린 · 포인트 3,000) 뒤, Q-8835 는 U-R18 반납완료 일주일 뒤", () => {
      const order = (unit: string) => {
        const found = ORDERS.find((item) => item.id === unit);
        if (!found) throw new Error(unit);
        return found;
      };
      const q8841 = CUSTOMER_INQUIRIES[0];
      const us35 = order("U-S35");
      expect(us35.buyerId).toBe(q8841.memberId);
      expect(us35.point).toBe(3000);
      expect(q8841.date > us35.date).toBe(true);

      const q8835 = CUSTOMER_INQUIRIES.find((row) => row.id === "Q-8835")!;
      const ur18 = order("U-R18");
      expect(ur18.buyerId).toBe(q8835.memberId);
      expect(ur18.baseStatus).toBe("returned");
      /* 이용 기간 끝 + 4일 = 반납완료(10-09) → 문의는 일주일 넘게 뒤 */
      const end = ur18.period.split("~")[1].trim();
      const returned = new Date(`${end}T00:00:00`);
      returned.setDate(returned.getDate() + 4);
      const asked = new Date(q8835.date.replace(" ", "T"));
      expect(asked.getTime() - returned.getTime()).toBeGreaterThan(
        7 * 24 * 60 * 60 * 1000,
      );
    });

    it("답변일은 접수일 이후 · 모든 시각은 시연 기준일 이전 · 미답변은 답변이 비어 있다", () => {
      for (const row of CUSTOMER_INQUIRIES) {
        expect(row.date <= `${DEMO_TODAY} 23:59`).toBe(true);
        if (row.status === "done") {
          expect(row.answeredAt! >= row.date).toBe(true);
          expect(row.answeredAt! <= `${DEMO_TODAY} 23:59`).toBe(true);
          expect(row.answer).not.toBe("");
        } else {
          expect(row.answeredAt).toBeNull();
          expect(row.answer).toBe("");
        }
      }
      for (const ask of SELLER_ASKS)
        expect(ask.date <= `${DEMO_TODAY} 23:59`).toBe(true);
    });
  });

  describe("탭 — 본문 맨 위", () => {
    it("기본은 고객 문의 · 상태 카드보다 위에 있다", () => {
      renderPage();
      const tabs = screen.getByRole("radiogroup", { name: "문의 대상" });
      expect(
        within(tabs).getByRole("radio", { name: "고객 문의" }),
      ).toBeChecked();
      expect(
        tabs.compareDocumentPosition(statusBox("미답변 4건")) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("`?tab=seller` 면 셀러 탭으로 연다", () => {
      renderPage("/support?tab=seller");
      expect(screen.getByRole("radio", { name: "셀러 문의" })).toBeChecked();
      expect(screen.getByText("미답변 셀러 문의")).toBeVisible();
    });

    it("탭을 바꾸면 고객 탭 조건이 풀린다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("답변완료 2건"));
      await user.click(screen.getByRole("radio", { name: "셀러 문의" }));
      await user.click(screen.getByRole("radio", { name: "고객 문의" }));
      expect(statusBox("미답변 4건")).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("고객 문의 — 상태 카드", () => {
    it("미답변·답변완료 2장뿐 · [전체] 없음 · 기본 미답변 → 목록 (총 4건)", () => {
      renderPage();
      expect(statusBox("미답변 4건")).toHaveAttribute("aria-pressed", "true");
      expect(statusBox("답변완료 2건")).toBeVisible();
      expect(screen.queryByRole("button", { name: /^전체/ })).toBeNull();
      expect(
        screen.getByRole("heading", { name: "목록 (총 4건)" }),
      ).toBeVisible();
      expect(column(3)).toEqual([
        "적립금이 사용 내역과 다르게 차감됐어요",
        "휴대폰 번호 변경이 안 됩니다",
        "리뷰 적립금이 지급되지 않았어요",
        "앱 로그인 시 오류 코드가 떠요",
      ]);
    });

    it("카드가 곧 상태 필터 — 답변완료 2건, 답변일이 찍힌다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("답변완료 2건"));
      expect(column(1)).toEqual(["박수진", "윤서아"]);
      expect(column(6)).toEqual(["2026.10.18", "2026.10.16"]);
    });

    it("상태 카드 툴팁은 원본 두 문장", async () => {
      const { user } = renderPage();
      await user.hover(statusBox("미답변 4건"));
      expect(
        await screen.findByText(
          "접수됐으나 아직 답변하지 않은 문의입니다. 답변을 등록하면 [답변완료]가 됩니다.",
        ),
      ).toBeInTheDocument();
    });

    it("답변완료 카드 툴팁은 한 문장 (부록 A C79)", async () => {
      const { user } = renderPage();
      await user.hover(statusBox("답변완료 2건"));
      expect(
        await screen.findByText("답변이 등록되어 종결된 문의입니다."),
      ).toBeInTheDocument();
      expect(screen.queryByText(/더 진행할 단계가 없습니다/)).toBeNull();
    });
  });

  describe("고객 문의 — 표", () => {
    it("열 순서(No 포함 8열) · 셀 표기 · 미답변 답변일 `-`", () => {
      renderPage();
      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((head) => head.textContent),
      ).toEqual([
        "No",
        "회원명",
        "유형",
        "제목",
        "내용",
        "접수일",
        "답변일",
        "상태",
      ]);
      expect(cellsOf(bodyRows()[0]).map((cell) => cell.textContent)).toEqual([
        "4",
        "노하린",
        "포인트",
        "적립금이 사용 내역과 다르게 차감됐어요",
        "구매 시 3,000원을 사용했는데 적립금 내역에는 5,000원이 빠져 있습니다. 확인 부탁드려요.",
        "2026.10.18",
        "-",
        "미답변",
      ]);
    });

    it("No 는 조회 결과의 역순 순번", () => {
      renderPage();
      expect(column(0)).toEqual(["4", "3", "2", "1"]);
    });

    it("엑셀·체크박스·정렬 없음 · 미리보기 모달 없음", async () => {
      const { user } = renderPage();
      expect(screen.queryByRole("button", { name: /엑셀/ })).toBeNull();
      expect(screen.queryByRole("checkbox")).toBeNull();
      expect(
        within(screen.getByRole("table")).queryAllByRole("button", {
          name: /정렬/,
        }),
      ).toHaveLength(0);
      await user.click(
        screen.getByRole("button", { name: "휴대폰 번호 변경이 안 됩니다" }),
      );
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("페이지당 개수는 10·20·50·100", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("combobox", { name: "페이지당 개수" }));
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["10개씩 보기", "20개씩 보기", "50개씩 보기", "100개씩 보기"]);
    });
  });

  describe("검색조건 — 기본 펼침 · 입력 즉시 적용", () => {
    it("펼친 채로 열리고, 접으면 요약이 조건을 말한다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "문의 유형", "포인트");
      await user.type(keywordBox(), "노하린");
      await user.click(screen.getByRole("button", { name: /검색 닫기/ }));
      expect(screen.getByText("포인트 · 회원명 «노하린»")).toBeVisible();
    });

    it("요약 — 조건이 없으면 「조건 없음 (전체)」", () => {
      expect(
        filterSummary({
          dateLabel: "접수일",
          fieldLabel: "회원명",
          keyword: " ",
        }),
      ).toBe("조건 없음 (전체)");
    });

    it("검색어가 카드 건수에도 걸린다 — 상태를 뺀 나머지 조건으로 센다", async () => {
      const { user } = renderPage();
      await user.type(keywordBox(), "윤서아");
      expect(statusBox("미답변 0건")).toBeVisible();
      expect(statusBox("답변완료 1건")).toBeVisible();
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
    });

    it("제목+내용 검색은 대소문자를 가리지 않는다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "검색 조건", "제목+내용");
      await user.type(keywordBox(), "e-402");
      expect(column(1)).toEqual(["신우진"]);
    });

    it("유형 셀렉트 · 검색 조건 「유형」", async () => {
      const { user } = renderPage();
      await chooseOption(user, "문의 유형", "회원정보");
      expect(column(1)).toEqual(["구민재"]);

      await chooseOption(user, "문의 유형", "유형 전체");
      await chooseOption(user, "검색 조건", "유형");
      await user.type(keywordBox(), "플랫폼");
      expect(column(1)).toEqual(["신우진"]);
    });

    it("기간 기준을 바꾸면 날짜 입력이 그 축을 밝힌다", async () => {
      const { user } = renderPage();
      await chooseOption(user, "기간 기준", "답변일");
      expect(screen.getByText("답변일 시작")).toBeVisible();
    });

    it("초기화하면 미답변으로 돌아간다", async () => {
      const { user } = renderPage();
      await user.click(statusBox("답변완료 2건"));
      await user.type(keywordBox(), "없는회원");
      await user.click(screen.getByRole("button", { name: "필터를 초기화" }));
      expect(statusBox("미답변 4건")).toHaveAttribute("aria-pressed", "true");
      expect(keywordBox()).toHaveValue("");
      expect(bodyRows()).toHaveLength(4);
    });
  });

  describe("상세 진입", () => {
    it("제목을 누르면 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(
        screen.getByRole("button", {
          name: "적립금이 사용 내역과 다르게 차감됐어요",
        }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/support/Q-8841");
    });

    it("행의 다른 칸을 눌러도 같은 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(statusBox("답변완료 2건"));
      await user.click(cellsOf(bodyRows()[1])[4]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/support/Q-8828");
    });
  });

  describe("셀러 문의 탭", () => {
    it("요약 2칸(미답변 2 · 전체 3) — 누를 수 없다", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("radio", { name: "셀러 문의" }));
      expect(screen.getByText("미답변 셀러 문의").closest("button")).toBeNull();
      expect(screen.getByText("2")).toBeVisible();
      expect(screen.getByText("3")).toBeVisible();
    });

    it("표 5열 · 원본 순서 · 목록 머리·페이저·검색조건 없음", async () => {
      const { user } = renderPage();
      await user.click(screen.getByRole("radio", { name: "셀러 문의" }));
      expect(
        within(screen.getByRole("table"))
          .getAllByRole("columnheader")
          .map((head) => head.textContent),
      ).toEqual(["셀러", "제목", "내용", "접수일", "상태"]);
      expect(column(0)).toEqual(["베이비노리터", "리틀베이비", "포근하우스"]);
      expect(column(3)).toEqual(["2026.10.19", "2026.10.18", "2026.10.16"]);
      expect(screen.queryByRole("heading", { name: /목록/ })).toBeNull();
      expect(screen.queryByPlaceholderText("검색어 입력")).toBeNull();
      expect(
        screen.queryByRole("combobox", { name: "페이지당 개수" }),
      ).toBeNull();
    });

    it("행을 누르면 셀러 문의 상세로 간다", async () => {
      const { user, onNavSelect } = renderPage();
      await user.click(screen.getByRole("radio", { name: "셀러 문의" }));
      await user.click(cellsOf(bodyRows()[2])[2]);
      expect(onNavSelect).toHaveBeenLastCalledWith("/support/SQ-12");
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 본문만 스켈레톤", () => {
      renderPage("/support?preview=loading");
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
      expect(screen.queryByText("해당 조건의 항목이 없습니다")).toBeNull();
    });

    it("empty — 빈 상태 · 카드 0건", () => {
      renderPage("/support?preview=empty");
      expect(screen.getByText("해당 조건의 항목이 없습니다")).toBeVisible();
      expect(statusBox("미답변 0건")).toBeVisible();
    });

    it("refreshing — 표는 남고 바쁨 표시가 붙는다", () => {
      renderPage("/support?preview=refreshing");
      expect(bodyRows()).toHaveLength(4);
      expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });
});
