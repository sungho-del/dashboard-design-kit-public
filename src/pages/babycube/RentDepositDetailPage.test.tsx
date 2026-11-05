import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { RentDepositDetailPage } from "./RentDepositDetailPage";
import { ORDERS } from "./OrderListPage.data";

/* -------------------------------------------------------------------------
 * 보증금 상세 — 조회형 · 기획 v0.4 `rentDepositDetail`
 *
 * 렌더 여부가 아니라 **내용과 동작**을 본다: 사례표 숫자(정산 계산 3묶음 · 부호 −) · 상태별 처리 문장 ·
 * 검수 판정 · 안심케어 · 연체 경과 · 링크 이동 · 하단 [목록]·[취소]·[확인] 모두 목록 ·
 * 찾을 수 없음(판매 건·없는 건·경로 두 조각) · 처리단위가 바뀌면 처음부터.
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <RentDepositDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/rent-deposit"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** InfoList 의 한 줄 — `<dt>` 라벨 옆의 값 */
function valueOf(label: string): string {
  const term = screen
    .getAllByText(label)
    .find((element) => element.tagName === "DT");
  if (!term) throw new Error(`라벨을 찾지 못했습니다: ${label}`);
  return term.nextElementSibling?.textContent ?? "";
}

/** 정산 계산(공용 `CalcBreakdown`) 한 줄의 값 · 보조 글자 */
const calcLine = (key: string) => {
  const line = document.querySelector(`[data-calc] [data-line="${key}"]`);
  if (!line) throw new Error(`계산 줄을 찾지 못했습니다: ${key}`);
  return {
    value: line.querySelector("dd")?.textContent ?? "",
    dt: line.querySelector("dt")?.textContent ?? "",
    dd: line.querySelector("dd") as HTMLElement,
  };
};

const hasRow = (label: string) =>
  screen.queryAllByText(label).some((element) => element.tagName === "DT");

const orderNoOf = (id: string) => ORDERS.find((o) => o.id === id)!.orderNo;

describe("RentDepositDetailPage (보증금 상세)", () => {
  describe("정산 계산 — 사례표 숫자", () => {
    it("일부환급 U-R30: 보증금 80,000 · 차감 −25,000 · 반환 예정액 55,000", () => {
      renderAt("/rent-deposit/U-R30");

      expect(calcLine("deposit").value).toBe("80,000원");
      expect(calcLine("deduction").value).toBe("−25,000원");
      expect(calcLine("refund").value).toBe("55,000원");
      expect(valueOf("보증금 상태")).toBe("환급완료(일부환급)");
      expect(valueOf("검수 판정")).toBe("파손(복원불가)");
      expect(valueOf("상태 변경일")).toBe("2026.09.19");
    });

    it("전액차감 U-R31: 반환 예정액 0원 · 분실", () => {
      renderAt("/rent-deposit/U-R31");

      expect(calcLine("deduction").value).toBe("−40,000원");
      expect(calcLine("refund").value).toBe("0원");
      expect(valueOf("검수 판정")).toBe("분실");
    });

    it("차감이 없으면 계산 상자는 `0원`(목록 칸의 `-` 와 다르다 — 원본) · 안심케어 본사 부담 보조 글자", () => {
      renderAt("/rent-deposit/U-R28");

      expect(calcLine("deduction").value).toBe("0원");
      expect(calcLine("deduction").dt).toBe("차감복원가능 손상 본사 부담");
      expect(calcLine("refund").value).toBe("80,000원");
    });

    it("묶음 순서 (보증금 · 차감) → 결과 · 차감은 경고색이 아니다 · 정책은 안내 상자 4줄", () => {
      renderAt("/rent-deposit/U-R30");

      const blocks = [...document.querySelectorAll("[data-calc] [data-block]")];
      expect(blocks.map((b) => b.getAttribute("data-block"))).toEqual([
        "base",
        "refund",
      ]);
      expect(calcLine("deduction").dd.className).not.toMatch(/critical/);
      expect(calcLine("deduction").dt).toBe("차감");
      const notes = document.querySelectorAll("[data-calc] li");
      expect(notes).toHaveLength(4);
      expect(notes[3].textContent).toBe(
        "보증금은 매출 정산과 분리 처리됩니다.",
      );
    });
  });

  describe("보증금 정보", () => {
    it("안심케어 가입 + 복원가능 파손 U-R28 — 가입 안내 · 셀러 담당", () => {
      renderAt("/rent-deposit/U-R28");

      expect(valueOf("안심케어")).toBe("가입복원가능 손상 본사 부담");
      expect(valueOf("검수 판정")).toBe("파손(복원가능)");
      expect(valueOf("담당")).toBe("셀러베베하우스");
      expect(valueOf("주문 상태")).toBe("반납완료");
      expect(valueOf("이용 기간")).toBe("2026.08.24 ~ 2026.09.13");
    });

    it("본사 렌트 U-R32 — 담당 본사(셀러 링크 없음) · 미가입", () => {
      renderAt("/rent-deposit/U-R32");

      expect(valueOf("담당")).toBe("본사");
      expect(valueOf("안심케어")).toBe("미가입");
    });

    it("점유중 U-R16 — 검수 전 · 상태 변경일 `-` · 연체 경과 줄 없음", () => {
      renderAt("/rent-deposit/U-R16");

      expect(valueOf("검수 판정")).toBe("검수 전");
      expect(valueOf("보증금 상태")).toBe("점유중");
      expect(valueOf("상태 변경일")).toBe("-");
      expect(hasRow("연체 경과")).toBe(false);
    });

    it("연체중 U-R14(목록 밖이지만 렌트라 열린다) — D+6 (반납 예정일 2026.10.13)", () => {
      renderAt("/rent-deposit/U-R14");

      expect(valueOf("연체 경과")).toBe("D+6 (반납 예정일 2026.10.13)");
      expect(
        screen.getByText(/연체료는 자동 산정하지 않으며 셀러가/),
      ).toBeVisible();
    });

    it("머리 — 제목 · 주문번호·처리단위 부제 · 보증금 상태 배지", () => {
      renderAt("/rent-deposit/U-R30");

      expect(
        screen.getByRole("heading", { name: "보증금 상세" }),
      ).toBeVisible();
      expect(
        screen.getByText(
          `${orderNoOf("U-R30")} · U-R30 · 렌트 · 바구니형 카시트 코지 · 서하준 · 보증금 80,000원`,
        ),
      ).toBeVisible();
    });
  });

  describe("처리 상태 — 상태별 문장(원본 3갈래)", () => {
    it("점유중", () => {
      renderAt("/rent-deposit/U-R16");
      expect(screen.getByText(/^대여 진행중\(점유\)/)).toBeVisible();
    });

    it("환급대기 U-R17", () => {
      renderAt("/rent-deposit/U-R17");
      expect(
        screen.getByText(/^검수 판정 완료 · 환급 실행 대기/),
      ).toBeVisible();
    });

    it("종결 U-R30 — 완료 날짜가 붙는다", () => {
      renderAt("/rent-deposit/U-R30");
      expect(
        screen.getByText(/^환급 처리 완료 · 2026\.09\.19 — /),
      ).toBeVisible();
    });
  });

  describe("이동", () => {
    it("주문번호 → 그 처리단위의 주문 상세 · 회원 → 회원 상세 · 셀러 → 셀러 상세", async () => {
      const { user, onNavSelect } = renderAt("/rent-deposit/U-R30");

      await user.click(
        screen.getByRole("button", { name: orderNoOf("U-R30") }),
      );
      expect(onNavSelect).toHaveBeenLastCalledWith("/orders-all/U-R30");

      await user.click(screen.getByRole("button", { name: "서하준" }));
      expect(onNavSelect).toHaveBeenLastCalledWith(
        `/members/${encodeURIComponent("hajun.seo@example.com")}`,
      );

      await user.click(screen.getByRole("button", { name: "아이랑" }));
      expect(onNavSelect).toHaveBeenLastCalledWith("/sellers/S-230");
    });

    it("하단 [목록]·[취소]·[확인] 모두 보증금 내역으로(원본 그대로)", async () => {
      const { user, onNavSelect } = renderAt("/rent-deposit/U-R30");

      for (const name of ["목록", "취소", "확인"]) {
        onNavSelect.mockClear();
        await user.click(screen.getByRole("button", { name }));
        expect(onNavSelect).toHaveBeenCalledWith("/rent-deposit");
      }
    });

    it("처리단위가 바뀌면 처음부터 — 접은 구역이 다음 건에 묻어가지 않는다", async () => {
      const { user } = renderAt("/rent-deposit/U-R30");

      await user.click(screen.getByRole("button", { name: "정산 계산 접기" }));
      expect(hasRow("반환 예정액")).toBe(false);

      act(() => navigate("/rent-deposit/U-R31"));

      expect(calcLine("refund").value).toBe("0원");
    });
  });

  describe("찾을 수 없음", () => {
    it.each([
      ["없는 처리단위", "/rent-deposit/U-R99"],
      ["판매 건(보증금 없음)", "/rent-deposit/U-S01"],
      ["경로 두 조각", "/rent-deposit/U-R30/extra"],
    ])("%s → 안내 + [보증금 내역으로]", async (_, path) => {
      const { user, onNavSelect } = renderAt(path);
      const empty = screen.getByText("찾을 수 없는 보증금 내역입니다");

      expect(empty).toBeVisible();
      await user.click(
        within(document.body).getByRole("button", { name: "보증금 내역으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/rent-deposit");
    });
  });

  it("?preview=loading — 구역 제목은 남기고 값만 스켈레톤", () => {
    renderAt("/rent-deposit/U-R30?preview=loading");

    expect(screen.getByText("정산 계산")).toBeVisible();
    expect(hasRow("반환 예정액")).toBe(false);
    expect(
      document.body.querySelectorAll("[data-skeleton]").length,
    ).toBeGreaterThan(0);
  });
});
