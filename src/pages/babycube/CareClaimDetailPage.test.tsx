import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { CareClaimDetailPage, EvidenceRow } from "./CareClaimDetailPage";
import { COPY, evidenceOf } from "./CareClaimDetailPage.data";

/* -------------------------------------------------------------------------
 * S14-D 안심케어 청구 상세 — `/care-claims/{처리단위}`
 *
 * ## 무엇을 검증하는가
 * 구역 2개(청구 근거 · 청구 심사)의 **사례표 값**(U-R28 승인 12,000 · U-R19 반려 15,000 · U-R18 접수 9,000 ·
 * 보증금은 보증금 내역과 같은 값 · 차감 0) · 상태별 꼬리(승인일·정산 반영 / 반려 사유 / 접수 안내) ·
 * 증빙 이미지 2종(자리 표시 · [확대] · 미등록 문구) · **접수 건만 [승인][반려]** · 같은 창(합계 · 사유 trim 필수) ·
 * 처리는 토스트만 · [목록] 이동 · 찾을 수 없음 · 처리단위가 바뀌면 본문을 새로 그림 · `?preview=`.
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

function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <CareClaimDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/care-claims"
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

const hasRow = (label: string) =>
  screen.queryAllByText(label).some((element) => element.tagName === "DT");

/** 하단 바 — [목록] 이 든 카드의 버튼들 */
const bottomButtons = () => {
  const card = screen
    .getByRole("button", { name: "목록" })
    .closest("[data-variant]");
  return Array.from(card?.querySelectorAll("button") ?? []).map(
    (button) => button.textContent,
  );
};

describe("CareClaimDetailPage (S14-D 안심케어 청구 상세)", () => {
  describe("승인 건 — U-R28 (베베하우스 12,000원)", () => {
    it("머리 · 청구 근거 7줄 — 보증금은 보증금 내역과 같은 값, 차감 0", () => {
      renderAt("/care-claims/U-R28");

      expect(
        screen.getByRole("heading", { name: "안심케어 청구 상세" }),
      ).toBeVisible();
      expect(
        screen.getByText(
          "20260820151024 · U-R28 · 베드사이드 침대 코모 · 베베하우스",
        ),
      ).toBeVisible();

      expect(valueOf("주문번호")).toBe("20260820151024");
      expect(valueOf("셀러")).toBe("베베하우스");
      expect(valueOf("상품")).toBe("베드사이드 침대 코모");
      expect(valueOf("이용 기간")).toBe("2026.08.24 ~ 2026.09.13");
      expect(valueOf("검수 판정")).toBe("파손(복원가능)");
      expect(valueOf("보증금")).toBe("80,000원");
      expect(valueOf("보증금 차감")).toBe(`0원${COPY.deductionHelp}`);
    });

    it("청구 심사 — 복원비 · 청구일 · 승인일 · 정산 반영(+12,000원), 하단은 [목록]만", () => {
      renderAt("/care-claims/U-R28");

      expect(valueOf("청구 상태")).toBe("승인");
      expect(valueOf("청구 복원비")).toBe(`12,000원${COPY.amountHelp}`);
      expect(valueOf("청구일")).toBe("2026.09.18");
      expect(valueOf("승인일")).toBe("2026.09.21");
      expect(valueOf("정산 반영")).toBe("익월 정산 보전(+12,000원)");
      expect(hasRow("반려 사유")).toBe(false);
      expect(screen.queryByText(COPY.pendingNote)).toBeNull();

      expect(bottomButtons()).toEqual(["목록"]);
    });

    it("「청구 근거」에 필수 표시가 없다 (원본 결함)", () => {
      renderAt("/care-claims/U-R28");
      const heading = screen.getByRole("heading", { name: "청구 근거" });
      expect(heading.textContent).toBe("청구 근거");
    });
  });

  describe("반려 건 — U-R19 (리틀베이비 15,000원)", () => {
    it("반려 사유 (반려일) + 안내 · 승인일·정산 반영 없음 · [목록]만", () => {
      renderAt("/care-claims/U-R19");

      expect(valueOf("청구 복원비")).toBe(`15,000원${COPY.amountHelp}`);
      expect(valueOf("반려 사유")).toBe(
        "복원 견적서 미첨부 — 수리 업체 견적서를 첨부해 다시 청구해 주세요. (2026.10.16)",
      );
      expect(screen.getByText(COPY.rejectedNote)).toBeVisible();
      expect(hasRow("승인일")).toBe(false);
      expect(hasRow("정산 반영")).toBe(false);
      /* 원본대로 보증금은 이미 전액환급 — 기획 확인 필요 */
      expect(valueOf("보증금")).toBe("150,000원");
      expect(bottomButtons()).toEqual(["목록"]);
    });
  });

  describe("접수 건 — U-R18 (베이비루 9,000원)", () => {
    it("접수 안내 한 줄 · 하단 [목록] [승인] [반려]", () => {
      renderAt("/care-claims/U-R18");

      expect(valueOf("청구 상태")).toBe("청구 접수");
      expect(valueOf("보증금")).toBe("70,000원");
      expect(screen.getByText(COPY.pendingNote)).toBeVisible();
      expect(hasRow("승인일")).toBe(false);
      expect(hasRow("반려 사유")).toBe(false);
      expect(bottomButtons()).toEqual(["목록", "승인", "반려"]);
    });

    it("[승인] — 목록과 같은 창(1건 · 9,000원), 처리하면 토스트만", async () => {
      const { user } = renderAt("/care-claims/U-R18");

      await user.click(screen.getByRole("button", { name: "승인" }));
      const dialog = screen.getByRole("dialog", { name: "안심케어 승인" });
      expect(
        within(dialog).getByText(/승인하면 복원비 9,000원이 익월 정산에 보전/),
      ).toBeVisible();
      await user.click(
        within(dialog).getByRole("button", { name: "승인 처리" }),
      );

      expect(
        await screen.findByText("승인 처리되었습니다. 익월 정산에 보전됩니다."),
      ).toBeVisible();
      expect(valueOf("청구 상태")).toBe("청구 접수");
    });

    it("[반려] — 사유 trim 필수 · 다시 열면 비어 있음 · 처리하면 토스트만", async () => {
      const { user } = renderAt("/care-claims/U-R18");

      await user.click(screen.getByRole("button", { name: "반려" }));
      let dialog = screen.getByRole("dialog", {
        name: "안심케어 반려 사유 입력",
      });
      await user.type(within(dialog).getByRole("textbox"), "  ");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(
        within(dialog).getByText("반려 사유를 입력해주세요."),
      ).toBeVisible();

      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await user.click(screen.getByRole("button", { name: "반려" }));
      dialog = screen.getByRole("dialog", { name: "안심케어 반려 사유 입력" });
      expect(within(dialog).getByRole("textbox")).toHaveValue("");

      await user.type(within(dialog).getByRole("textbox"), "견적서 미첨부");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(await screen.findByText("반려 처리되었습니다.")).toBeVisible();
      expect(valueOf("청구 상태")).toBe("청구 접수");
    });
  });

  describe("증빙 이미지 — 발송 전 · 파손 (원본 시드 규칙 · 자리 표시)", () => {
    it("썸네일 장수는 원본 규칙 — U-R28 발송 전 3 · 파손 1", () => {
      renderAt("/care-claims/U-R28");
      expect(
        within(
          screen.getByRole("list", { name: "발송 전 이미지" }),
        ).getAllByRole("listitem"),
      ).toHaveLength(3);
      expect(
        within(screen.getByRole("list", { name: "파손 이미지" })).getAllByRole(
          "listitem",
        ),
      ).toHaveLength(1);
      expect(screen.getByText(COPY.shipHelp)).toBeVisible();
      expect(screen.getByText(COPY.returnHelp)).toBeVisible();
      expect(screen.getByText(COPY.evidenceNote)).toBeVisible();
      /* 본사는 조회만 — 등록·교체·삭제가 없다 */
      expect(
        screen.queryByRole("button", { name: /교체|삭제|등록/ }),
      ).toBeNull();
    });

    it("[확대] 는 닫기가 있는 창으로 연다", async () => {
      const { user } = renderAt("/care-claims/U-R28");
      await user.click(screen.getByRole("button", { name: "파손 1 확대" }));
      const dialog = screen.getByRole("dialog", { name: "파손 1" });
      await user.click(within(dialog).getByRole("button", { name: "닫기" }));
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("미등록이면 빈 상자가 아니라 문장으로 말한다", () => {
      render(
        <>
          <EvidenceRow
            label={COPY.shipLabel}
            prefix="발송 전"
            count={0}
            empty={COPY.shipEmpty}
            help={COPY.shipHelp}
            onZoom={vi.fn()}
          />
          <EvidenceRow
            label={COPY.returnLabel}
            prefix="파손"
            count={0}
            empty={COPY.returnEmpty}
            help={COPY.returnHelp}
            onZoom={vi.fn()}
          />
        </>,
      );
      expect(screen.getByText(COPY.shipEmpty)).toBeVisible();
      expect(screen.getByText(COPY.returnEmpty)).toBeVisible();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("장수 규칙 — 발송 전 단계·이상없음이면 0장일 수 있다", () => {
      expect(
        evidenceOf({ id: "U-R01", baseStatus: "new", inspection: null }),
      ).toEqual({ ship: 0, return: 0 });
      expect(
        evidenceOf({ id: "U-R03", baseStatus: "new", inspection: "ok" }),
      ).toEqual({ ship: 1, return: 0 });
      expect(
        evidenceOf({
          id: "U-R18",
          baseStatus: "returned",
          inspection: "repairable",
        }),
      ).toEqual({ ship: 3, return: 2 });
    });
  });

  describe("이동 · 찾을 수 없음", () => {
    it("[목록] 은 안심케어 승인 목록으로 간다", async () => {
      const { user, onNavSelect } = renderAt("/care-claims/U-R28");
      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/care-claims");
    });

    it.each(["/care-claims/U-X99", "/care-claims/U-R01", "/care-claims/U-R09"])(
      "청구가 없는 처리단위(%s)는 「찾을 수 없는 청구입니다」 + 목록으로",
      async (path) => {
        const { user, onNavSelect } = renderAt(path);
        expect(screen.getByText("찾을 수 없는 청구입니다")).toBeVisible();
        await user.click(
          screen.getByRole("button", { name: "안심케어 승인 목록으로" }),
        );
        expect(onNavSelect).toHaveBeenCalledWith("/care-claims");
      },
    );

    it("처리단위가 바뀌면 열린 창이 남지 않는다 (본문 key)", async () => {
      const { user } = renderAt("/care-claims/U-R18");
      await user.click(screen.getByRole("button", { name: "반려" }));
      expect(screen.getByRole("dialog")).toBeVisible();

      act(() => navigate("/care-claims/U-R28"));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(valueOf("청구 복원비")).toBe(`12,000원${COPY.amountHelp}`);
    });
  });

  describe("데이터 상태 미리보기 (?preview=)", () => {
    it("loading — 구역은 남고 본문만 스켈레톤", () => {
      renderAt("/care-claims/U-R28?preview=loading");
      expect(screen.getByRole("heading", { name: "청구 심사" })).toBeVisible();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
      expect(hasRow("청구 복원비")).toBe(false);
    });

    it("refreshing — 값은 남고 바쁨 표시가 붙는다", () => {
      renderAt("/care-claims/U-R28?preview=refreshing");
      expect(valueOf("청구일")).toBe("2026.09.18");
      expect(document.body.querySelector('[aria-busy="true"]')).not.toBeNull();
    });
  });
});
