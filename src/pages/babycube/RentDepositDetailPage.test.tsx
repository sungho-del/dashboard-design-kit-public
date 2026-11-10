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

    /** 확인 요청 답(2026-11-06) 29번 — 「복원가능 손상 본사 부담」 보조 글자는 뺐다 */
    it("차감이 없으면 계산 상자는 `0원`(목록 칸의 `-` 와 다르다 — 원본) · 안심케어 본사 부담 건에도 보조 글자가 없다", () => {
      renderAt("/rent-deposit/U-R28");

      expect(calcLine("deduction").value).toBe("0원");
      expect(calcLine("deduction").dt).toBe("차감");
      expect(screen.queryByText(/복원가능 손상 본사 부담/)).toBeNull();
      expect(calcLine("refund").value).toBe("80,000원");
    });

    it("묶음 순서 (보증금 · 차감) → 결과 · 차감은 경고색이 아니다 · 정책 안내 상자 없음", () => {
      renderAt("/rent-deposit/U-R30");

      const blocks = [...document.querySelectorAll("[data-calc] [data-block]")];
      expect(blocks.map((b) => b.getAttribute("data-block"))).toEqual([
        "base",
        "refund",
      ]);
      expect(calcLine("deduction").dd.className).not.toMatch(/critical/);
      expect(calcLine("deduction").dt).toBe("차감");
      /* 부록 A C17 — 정책 문단(배상액·연체료·안심케어·매출 정산 분리)은 지웠다 */
      expect(document.querySelectorAll("[data-calc] li")).toHaveLength(0);
      expect(document.querySelector("[data-calc]")!.children).toHaveLength(1);
    });
  });

  /** 개발 §3-2-8 — develop d46e752 와 같은 조건(마지막 환급 시도 실패 · 코드 `EXCEED_MAX_REFUND_DUE`)일 때만 */
  describe("환급 실패 안내 — 반환 예정액 아래", () => {
    const NOTE =
      "결제 취소 기간이 지났어요. 고객에게 연락해 계좌로 환불해 주세요.";
    const withFailure = (code: string | null, run: () => void) => {
      const order = ORDERS.find((o) => o.id === "U-R30")!;
      order.depositRefundFailureCode = code;
      try {
        run();
      } finally {
        order.depositRefundFailureCode = null;
      }
    };

    it("결제사 기간 경과 실패 건은 계산 상자 바로 아래 한 줄", () => {
      withFailure("EXCEED_MAX_REFUND_DUE", () => {
        renderAt("/rent-deposit/U-R30");
        const note = screen.getByText(NOTE);
        const calc = document.querySelector("[data-calc]")!;
        expect([...calc.children]).toEqual([calc.firstElementChild, note]);
        expect(note.className).toMatch(/text-text-warning/);
      });
    });

    it("다른 실패 코드 · 실패 없음(예시 전부)에는 없다", () => {
      withFailure("CARD_EXPIRED", () => {
        renderAt("/rent-deposit/U-R30");
        expect(screen.queryByText(NOTE)).toBeNull();
      });
      expect(ORDERS.every((o) => o.depositRefundFailureCode === null)).toBe(
        true,
      );
    });
  });

  describe("보증금 정보", () => {
    it("안심케어 가입 + 복원가능 파손 U-R28 — 가입 안내 · 셀러 담당", () => {
      renderAt("/rent-deposit/U-R28");

      /* 부록 A C16 — 가입 칩만(보조 문장 없음) */
      expect(valueOf("안심케어")).toBe("가입");
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
      /* 부록 A B14 — 연체중에 덧붙던 「연체료는 자동 산정하지 않으며 …」 문장은 지웠다 */
      expect(
        screen.getByText("대여 중 — 반납·검수 후 셀러가 환급을 처리합니다."),
      ).toBeVisible();
      expect(screen.queryByText(/연체료는/)).toBeNull();
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

  /** 부록 A C18 ~ C21 — 구역 제목 「처리 상태」 · 상태별 바꿈 문구(✓ 기호는 넣지 않는다 — 퍼블이 정함) */
  describe("처리 상태 — 상태별 문장(원본 3갈래)", () => {
    const procText = () =>
      screen
        .getByRole("heading", { name: "처리 상태" })
        .closest("[data-variant]")
        ?.querySelector("p")?.textContent;

    it("점유중", () => {
      renderAt("/rent-deposit/U-R16");
      expect(procText()).toBe(
        "대여 중 — 반납·검수 후 셀러가 환급을 처리합니다.",
      );
    });

    it("환급대기 U-R17", () => {
      renderAt("/rent-deposit/U-R17");
      expect(procText()).toBe(
        "검수 완료 — 셀러의 환급 처리를 기다리는 중입니다.",
      );
    });

    it("종결 U-R30 — 완료 날짜가 붙는다", () => {
      renderAt("/rent-deposit/U-R30");
      expect(procText()).toBe("환급 완료 · 2026.09.19");
      expect(
        screen.getByRole("button", { name: "처리 상태 접기" }),
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
