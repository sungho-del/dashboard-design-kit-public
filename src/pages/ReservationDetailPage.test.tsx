import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../components/ui";
import { ReservationDetailPage } from "./ReservationDetailPage";

/* -------------------------------------------------------------------------
 * 예약 상세 (S02) — 상세형
 *
 * 이 화면의 계약은 네 가지다.
 *   1. `InfoList` 가 `dl/dt/dd` **시맨틱**으로 읽힌다 (라벨:값 쌍이 짝을 이룬다)
 *   2. 수납 금액이 **하드코딩이 아니라 계산 결과**다
 *   3. `labelWidth` 를 준 항목은 `w-20` 대신 인라인 폭만 방출하고,
 *      **한 InfoList 블록 안에서 값이 통일**된다
 *   4. 목록의 미리보기 모달에는 들어가지 않는 두 블록(진료 항목 표 · 금액 내역)이 여기 있다
 *
 * `useToast()` 를 쓰므로 **`ToastProvider` 로 감싸야** 렌더된다.
 * ---------------------------------------------------------------------- */

/** 클래스 검사는 반드시 배열로 — 문자열 `toContain` 은 `w-2` 가 `w-20` 에 걸린다 */
const classList = (el: Element | null | undefined) =>
  (el?.className ?? "").split(/\s+/);

function renderPage() {
  const onNavSelect = vi.fn();
  const onNavOpenChange = vi.fn();

  render(
    <ToastProvider>
      <ReservationDetailPage
        navOpen
        onNavOpenChange={onNavOpenChange}
        activeNav="reservation-detail"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { onNavSelect, onNavOpenChange };
}

describe("ReservationDetailPage", () => {
  it("카드 5개를 기획서 sections 그대로 그린다", () => {
    renderPage();

    for (const title of [
      "예약 정보",
      "환자 정보",
      // 건수는 데이터에서 세어 붙인다 — 고정 문자열이 아니다
      "진료 항목 3건",
      "수납 내역",
      "담당의 정보",
    ]) {
      expect(
        screen.getByRole("heading", { name: title, level: 3 }),
      ).toBeInTheDocument();
    }
  });

  /**
   * InfoList 는 회색 박스이기 이전에 **정의 목록**이다.
   * `<div>` 로 흉내 내면 화면은 같아 보이지만 스크린리더에서 라벨과 값의 짝이 사라진다.
   */
  describe("InfoList 시맨틱", () => {
    it("라벨은 term, 값은 definition 으로 읽히고 개수가 짝을 이룬다", () => {
      renderPage();

      const terms = screen.getAllByRole("term");
      const definitions = screen.getAllByRole("definition");

      // InfoList 16 (예약 4 + 환자 6 + 수납 2 + 담당의 4)
      // + 금액 내역 3 (§30-5 는 InfoList 가 아니지만 dl/dt/dd 로 짠다) = 19
      expect(terms).toHaveLength(19);
      expect(definitions).toHaveLength(terms.length);
    });

    it("예약 정보의 라벨과 값이 같은 항목 안에서 짝을 이룬다", () => {
      renderPage();

      const pairs: [string, string][] = [
        ["예약번호", "RS-20260819-0033"],
        ["예약일시", "2026-08-19 10:30"],
        ["접수경로", "전화 접수"],
      ];

      for (const [label, value] of pairs) {
        const item = screen.getByText(label).parentElement;
        expect(
          within(item as HTMLElement).getByText(value),
        ).toBeInTheDocument();
      }
    });

    it("환자 정보 6항목과 담당의 정보 4항목이 값과 짝을 이룬다", () => {
      renderPage();

      const pairs: [string, string][] = [
        ["환자번호", "P-2019-0842"],
        ["이름", "최유나"],
        ["생년월일", "1994-03-11"],
        ["연락처", "010-3317-8064"],
        ["보호자 연락처", "010-3317-8065"],
        ["보험 유형", "건강보험"],
        ["담당의", "오세영"],
        ["진료과", "이비인후과"],
        ["진료실", "3진료실"],
        ["다음 예약", "2026-09-02 10:00"],
      ];

      for (const [label, value] of pairs) {
        const item = screen.getByText(label).parentElement;
        expect(
          within(item as HTMLElement).getByText(value),
        ).toBeInTheDocument();
      }
    });
  });

  /**
   * 목록의 미리보기 모달(4항목)에 들어가지 않는 블록.
   * 이 화면이 없으면 진료 항목 명세가 화면 어디에도 남지 않는다.
   */
  describe("진료 항목 표", () => {
    it("항목 3건을 구분·수량·금액과 함께 보여준다", () => {
      renderPage();

      const rows = screen.getAllByRole("row");
      const consult = rows.find((r) =>
        r.textContent?.includes("재진 진찰료"),
      ) as HTMLElement;
      const nebulizer = rows.find((r) =>
        r.textContent?.includes("네뷸라이저"),
      ) as HTMLElement;

      expect(within(consult).getByText("외래")).toBeInTheDocument();
      expect(within(consult).getByText("1회")).toBeInTheDocument();
      expect(within(consult).getByText("11,800원")).toBeInTheDocument();

      // 8,350 × 2 — 단가를 그대로 찍으면 이 검사가 깨진다
      expect(within(nebulizer).getByText("처치")).toBeInTheDocument();
      expect(within(nebulizer).getByText("2회")).toBeInTheDocument();
      expect(within(nebulizer).getByText("16,700원")).toBeInTheDocument();
    });
  });

  /**
   * 11,800 + 24,000 + 8,350×2 = 52,500 → +제증명 3,000 → −보험공제 21,000 = **34,500원**.
   * 총액이 화면에 박힌 문자열이면 항목이 바뀌어도 값이 따라가지 않는다.
   */
  describe("수납 금액", () => {
    it("진료 항목 합계는 단가×수량의 합이다", () => {
      renderPage();

      const row = screen.getByText("진료 항목 합계")
        .parentElement as HTMLElement;
      expect(within(row).getByText("52,500원")).toBeInTheDocument();
    });

    it("총 수납금액은 항목 합계 + 제증명 수수료 − 건강보험 공제다", () => {
      renderPage();

      expect(
        within(
          screen.getByText("제증명 수수료").parentElement as HTMLElement,
        ).getByText("3,000원"),
      ).toBeInTheDocument();
      // 차감 항목은 부호를 화면에 붙여 보여준다
      expect(
        within(
          screen.getByText("건강보험 공제").parentElement as HTMLElement,
        ).getByText("-21,000원"),
      ).toBeInTheDocument();

      const totalRow = screen.getByText("총 수납금액")
        .parentElement as HTMLElement;
      expect(within(totalRow).getByText("34,500원")).toBeInTheDocument();
    });
  });

  describe("뒤로가기", () => {
    it("PageHeader 의 뒤로가기가 예약 목록으로 되돌린다", async () => {
      const user = userEvent.setup();
      const { onNavSelect } = renderPage();

      await user.click(screen.getByRole("button", { name: "뒤로 가기" }));

      expect(onNavSelect).toHaveBeenCalledTimes(1);
      expect(onNavSelect).toHaveBeenCalledWith("reservation-list");
    });
  });

  describe("상단 액션", () => {
    it("진료확인서·다음 예약 잡기가 병원 문구의 토스트를 띄운다", async () => {
      const user = userEvent.setup();
      renderPage();

      await user.click(screen.getByRole("button", { name: "진료확인서" }));
      expect(await screen.findByText("진료확인서를 인쇄합니다")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "다음 예약 잡기" }));
      expect(await screen.findByText("다음 예약을 등록했습니다")).toBeVisible();
    });
  });

  /**
   * 진료완료는 **정상 종료**라 `default`(회색)다 — §3-1 배정 순서.
   * PageHeader 배지와 "예약 정보" 카드가 같은 값을 함께 쓴다.
   */
  describe("상태 배지", () => {
    it("진료완료 Tag 가 헤더와 카드 두 곳에 default 색으로 나온다", () => {
      renderPage();

      const tags = screen.getAllByText("진료완료");
      expect(tags).toHaveLength(2);
      for (const tag of tags) {
        expect(classList(tag)).toContain("text-text-sub");
        expect(classList(tag)).not.toContain("text-text-critical");
      }
    });
  });

  /**
   * `labelWidth` 는 기본 80px 에 라벨이 안 들어갈 때만 쓰는 탈출구다.
   * 인라인 폭과 `w-20` 이 **동시에** 나오면 `cn()` 이 병합을 하지 않아
   * 승자가 클래스 순서에 좌우된다 — 그래서 "없어야 한다"까지 검사한다.
   */
  describe("labelWidth", () => {
    it("환자 정보 블록의 dt 6개가 **모두** 96px 이고 w-20 을 방출하지 않는다", () => {
      renderPage();

      for (const label of [
        "환자번호",
        "이름",
        "생년월일",
        "연락처",
        "보호자 연락처",
        "보험 유형",
      ]) {
        const dt = screen.getByText(label);
        expect(dt.tagName).toBe("DT");
        // 한 블록 안에서 폭이 갈리면 값 시작선이 어긋난다
        expect(dt).toHaveStyle({ width: "96px" });
        expect(classList(dt)).not.toContain("w-20");
        expect(classList(dt)).toContain("shrink-0");
      }
    });

    it("나머지 세 블록은 기본 폭이라 w-20 클래스를 쓰고 인라인 폭이 없다", () => {
      renderPage();

      for (const label of [
        "예약번호",
        "예약일시",
        "수납수단",
        "수납일시",
        "담당의",
        "다음 예약",
      ]) {
        const dt = screen.getByText(label);
        expect(dt.tagName).toBe("DT");
        expect(classList(dt)).toContain("w-20");
        // 기본값(80)을 명시적으로 주면 여기서 걸린다
        expect(dt.getAttribute("style")).toBeNull();
      }
    });
  });
});
