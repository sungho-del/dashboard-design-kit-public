import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { ORDERS } from "./OrderListPage.data";
import { PointDetailPage } from "./PointDetailPage";

/* -------------------------------------------------------------------------
 * 포인트 현황 상세 — 기획 v0.4 `pointDetail` + 조정 팝업 `ptAdjModal`
 *
 * 렌더 여부가 아니라 **숫자와 동작**을 본다: 요약 3칸 · 지급 기간 · 이력의 잔여(러닝 잔액 — 마지막 행 = 보유,
 * 같은 분 동률은 원장 위치) · 메모 줄 · 원장 0행 회원 · 찾을 수 없음 · [목록] ·
 * 조정 팝업(사유 목록 전환 · [확인] 비활성 규칙 · 보유 초과 차감 오류는 입력칸 아래 · 확인은 알림만 · 다시 열면 초기화).
 * ---------------------------------------------------------------------- */
type User = ReturnType<typeof userEvent.setup>;

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
      <PointDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/points"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const pathOf = (memberId: string) => `/points/${encodeURIComponent(memberId)}`;

/** InfoList 의 한 줄 — `<dt>` 라벨 옆의 값 */
function valueOf(label: string): string {
  const term = screen
    .getAllByText(label)
    .find((element) => element.tagName === "DT");
  if (!term) throw new Error(`라벨을 찾지 못했습니다: ${label}`);
  return term.nextElementSibling?.textContent ?? "";
}

/** 요약 3칸의 글자 — 라벨·값·단위가 한 줄로 */
const tileTexts = () =>
  [...screen.getByLabelText("포인트 요약").children].map(
    (tile) => tile.textContent ?? "",
  );

function historyRows(): string[][] {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("row")
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent ?? ""),
    );
}

const H = {
  at: 0,
  amount: 1,
  kind: 2,
  content: 3,
  order: 4,
  remaining: 5,
  by: 6,
};
const orderNoOf = (id: string) => ORDERS.find((o) => o.id === id)!.orderNo;

/** 하단 바의 [포인트 조정] — 카드 머리에도 같은 이름이 하나 더 있다 */
const openAdjust = async (user: User, which: "header" | "bar" = "bar") => {
  const buttons = screen.getAllByRole("button", { name: "포인트 조정" });
  expect(buttons).toHaveLength(2);
  await user.click(which === "header" ? buttons[0] : buttons[1]);
  return screen.findByRole("dialog");
};

const amountBox = (dialog: HTMLElement) =>
  within(dialog).getByRole("textbox", { name: /포인트/ });
const memoBox = (dialog: HTMLElement) =>
  within(dialog).getByRole("textbox", { name: /메모/ });
const confirmButton = (dialog: HTMLElement) =>
  within(dialog).getByRole("button", { name: "확인" });

describe("PointDetailPage (포인트 현황 상세)", () => {
  describe("머리 · 회원 정보", () => {
    it("제목 「포인트 현황 상세」 + 회원명 · 아이디 · 연락처", () => {
      renderAt(pathOf("jisung.ahn@example.com"));

      expect(
        screen.getByRole("heading", { name: "포인트 현황 상세" }),
      ).toBeVisible();
      expect(screen.getByText("안지성 · jisung.ahn@example.com")).toBeVisible();
      expect(valueOf("회원명")).toBe("안지성");
      expect(valueOf("아이디(이메일)")).toBe("jisung.ahn@example.com");
      expect(valueOf("연락처")).toBe("010-3364-9182");
    });
  });

  describe("포인트 현황 — 사례표 숫자", () => {
    it("안지성: 계산 순서 총 지급 +2,500 → 총 사용(차감) −2,000 → 보유 500 · 경고색 없음 · 지급 기간", () => {
      renderAt(pathOf("jisung.ahn@example.com"));

      expect(valueOf("지급 기간")).toBe("2026.10.01 ~ 2026.10.08");
      expect(tileTexts()).toEqual([
        "총 지급 포인트+2,500P",
        "총 사용(차감) 포인트−2,000P",
        "보유 중인 포인트500P",
      ]);
      /* 정상 사용은 경고가 아니다 — 요약 어디에도 경고색이 없다 */
      expect(
        screen
          .getByLabelText("포인트 요약")
          .querySelector(".text-text-warning"),
      ).toBeNull();
    });

    it("이력은 최신순 · 잔여는 그 행까지의 잔액 · 맨 위 잔여 = 보유", () => {
      renderAt(pathOf("jisung.ahn@example.com"));

      expect(screen.getByText("포인트 이력 (3)")).toBeVisible();
      expect(historyRows()).toEqual([
        [
          "2026.10.08 16:44",
          "−2,000P",
          "사용",
          "렌트 결제 사용",
          orderNoOf("U-R11"),
          "500P",
          "시스템 자동",
        ],
        [
          "2026.10.07 17:30",
          "+500P",
          "지급",
          "포토 후기 작성",
          orderNoOf("U-S09"),
          "2,500P",
          "시스템 자동",
        ],
        [
          "2026.10.01 10:00",
          "+2,000P",
          "수동조정",
          "프로모션 지급가을맞이 이벤트 지급",
          "-",
          "2,000P",
          "본사 관리자",
        ],
      ]);
    });

    it("같은 분(分)의 두 행은 원장 위치로 — 임채원 U-R22(일반) 먼저, U-R09(포토) 나중", () => {
      renderAt(pathOf("chaewon.lim@example.com"));
      const rows = historyRows();

      expect(rows[0][H.at]).toBe(rows[1][H.at]);
      expect(
        rows.slice(0, 2).map((row) => [row[H.content], row[H.remaining]]),
      ).toEqual([
        ["포토 후기 작성", "1,200P"],
        ["일반 후기 작성", "700P"],
      ]);
      expect(rows.map((row) => row[H.remaining])).toEqual([
        "1,200P",
        "700P",
        "600P",
        "500P",
      ]);
      expect(valueOf("지급 기간")).toBe("2026.08.27 ~ 2026.10.16");
    });

    it("노하린: 사용 3,000 은 주문 U-S35 · 보유 600", () => {
      renderAt(pathOf("harin.noh@example.com"));
      const use = historyRows().find((row) => row[H.kind] === "사용")!;

      expect(use[H.amount]).toBe("−3,000P");
      expect(use[H.order]).toBe(orderNoOf("U-S35"));
      expect(use[H.remaining]).toBe("0P");
      expect(historyRows()[0][H.remaining]).toBe("600P");
      expect(tileTexts()[2]).toBe("보유 중인 포인트600P");
    });

    it("오세린: 리뷰 회수 「시스템 자동」(원본) — 보유 0P", () => {
      renderAt(pathOf("serin.oh@example.com"));
      const [clawback] = historyRows();

      expect(clawback.slice(1)).toEqual([
        "−500P",
        "회수",
        "리뷰 삭제로 회수",
        orderNoOf("U-S32"),
        "0P",
        "시스템 자동",
      ]);
    });

    it("구분 배지는 무채색 · 차감도 기본 글자색(부호로 구분)", () => {
      renderAt(pathOf("hajun.seo@example.com"));
      const table = screen.getByRole("table");

      expect(within(table).getByText("수동조정").className).not.toMatch(
        /warning|critical|success/,
      );
      expect(within(table).getByText("−400P").className).not.toContain(
        "text-text-warning",
      );
      expect(within(table).getByText("+500P").className).not.toContain(
        "text-text-warning",
      );
      expect(
        within(table).getByText(
          "일반 후기 오지급 정정 (포토 500P → 일반 100P)",
        ),
      ).toBeVisible();
    });

    it("원장이 없는 회원 — 보유 0P · 지급 기간 - · 빈 이력", () => {
      renderAt(pathOf("sujin.park@example.com"));

      expect(valueOf("지급 기간")).toBe("-");
      /* 0 은 부호 없이 */
      expect(tileTexts()).toEqual([
        "총 지급 포인트0P",
        "총 사용(차감) 포인트0P",
        "보유 중인 포인트0P",
      ]);
      expect(screen.getByText("포인트 이력 (0)")).toBeVisible();
      expect(screen.getByText("포인트 이력이 없습니다")).toBeVisible();
      expect(screen.queryByRole("table")).toBeNull();
    });
  });

  describe("이동 · 찾을 수 없음 · 접기", () => {
    it("[목록] → 포인트 관리", async () => {
      const { user, onNavSelect } = renderAt(pathOf("jisung.ahn@example.com"));

      await user.click(screen.getByRole("button", { name: "목록" }));

      expect(onNavSelect).toHaveBeenCalledWith("/points");
    });

    it.each([
      ["없는 회원", pathOf("nobody@example.com")],
      ["경로 두 조각", "/points/jisung.ahn%40example.com/extra"],
    ])("%s → 찾을 수 없음 + 「포인트 관리로」", async (_, path) => {
      const { user, onNavSelect } = renderAt(path);

      expect(screen.getByText("찾을 수 없는 회원입니다")).toBeVisible();
      await user.click(screen.getByRole("button", { name: "포인트 관리로" }));
      expect(onNavSelect).toHaveBeenCalledWith("/points");
    });

    it("구역을 접으면 그 구역 내용만 사라진다", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));

      await user.click(
        screen.getByRole("button", { name: "포인트 이력 (3) 접기" }),
      );

      expect(screen.queryByRole("table")).toBeNull();
      expect(valueOf("지급 기간")).toBe("2026.10.01 ~ 2026.10.08");
    });

    it("?preview=loading — 값 대신 스켈레톤", () => {
      renderAt(`${pathOf("jisung.ahn@example.com")}?preview=loading`);

      expect(screen.queryByRole("table")).toBeNull();
      expect(
        document.body.querySelectorAll("[data-skeleton]").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("포인트 조정 팝업 — 확인은 알림만", () => {
    it("기본은 지급 · 관리자 지급 조정 — 차감으로 바꾸면 사유 목록과 기본값이 바뀐다", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));
      const dialog = await openAdjust(user, "header");

      expect(
        within(dialog).getByText(/저장 후에는 수정할 수 없습니다/),
      ).toBeVisible();
      expect(
        within(dialog).getByRole("radio", { name: "＋ 지급" }),
      ).toBeChecked();
      const reason = within(dialog).getByRole("combobox", {
        name: /처리 사유/,
      });
      expect(reason).toHaveTextContent("관리자 지급 조정");

      await user.click(within(dialog).getByRole("radio", { name: "－ 차감" }));
      expect(reason).toHaveTextContent("관리자 회수");

      await user.click(reason);
      const listbox = await screen.findByRole("listbox");
      expect(
        within(listbox)
          .getAllByRole("option")
          .map((option) => option.textContent),
      ).toEqual([
        "콘텐츠 구매",
        "포인트 사용",
        "포인트 충전 취소",
        "관리자 회수",
        "포인트 사용 취소",
      ]);
    });

    it("[확인]은 포인트 > 0 · 메모(공백 제외)가 있을 때만 — 숫자만 받고 쉼표로 보인다", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));
      const dialog = await openAdjust(user);

      expect(confirmButton(dialog)).toBeDisabled();
      await user.type(amountBox(dialog), "1a500");
      expect(amountBox(dialog)).toHaveValue("1,500");
      expect(confirmButton(dialog)).toBeDisabled();

      await user.type(memoBox(dialog), "   ");
      expect(confirmButton(dialog)).toBeDisabled();
      await user.type(memoBox(dialog), "CS 보상");
      expect(confirmButton(dialog)).toBeEnabled();

      await user.clear(amountBox(dialog));
      await user.type(amountBox(dialog), "0");
      expect(confirmButton(dialog)).toBeDisabled();
      expect(within(dialog).getByText("8/500")).toBeVisible();
    });

    it("지급 확인 → 「포인트를 지급했습니다.」 · 원장·숫자는 그대로", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));
      const dialog = await openAdjust(user);

      await user.type(amountBox(dialog), "1000");
      await user.type(memoBox(dialog), "이벤트 보상");
      await user.click(confirmButton(dialog));

      expect(await screen.findByText("포인트를 지급했습니다.")).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(tileTexts()[2]).toBe("보유 중인 포인트500P");
      expect(screen.getByText("포인트 이력 (3)")).toBeVisible();
    });

    it("보유(500)를 넘는 차감은 입력칸 아래 오류 — 고치면 사라지고 확인하면 알림", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));
      const dialog = await openAdjust(user);

      await user.click(within(dialog).getByRole("radio", { name: "－ 차감" }));
      await user.type(amountBox(dialog), "600");
      await user.type(memoBox(dialog), "오지급 정정");
      await user.click(confirmButton(dialog));

      expect(
        within(dialog).getByText("보유 포인트를 초과해 차감할 수 없습니다."),
      ).toBeVisible();
      expect(amountBox(dialog)).toHaveAttribute("aria-invalid", "true");
      expect(screen.queryByText("포인트를 차감했습니다.")).toBeNull();

      await user.clear(amountBox(dialog));
      await user.type(amountBox(dialog), "500");
      expect(
        within(dialog).queryByText("보유 포인트를 초과해 차감할 수 없습니다."),
      ).toBeNull();
      await user.click(confirmButton(dialog));

      expect(await screen.findByText("포인트를 차감했습니다.")).toBeVisible();
    });

    it("취소하고 다시 열면 처음부터 (지급 · 기본 사유 · 빈 칸)", async () => {
      const { user } = renderAt(pathOf("jisung.ahn@example.com"));
      let dialog = await openAdjust(user);

      await user.click(within(dialog).getByRole("radio", { name: "－ 차감" }));
      await user.type(amountBox(dialog), "900");
      await user.type(memoBox(dialog), "메모");
      await user.click(confirmButton(dialog));
      await user.click(within(dialog).getByRole("button", { name: "취소" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

      dialog = await openAdjust(user);
      expect(
        within(dialog).getByRole("radio", { name: "＋ 지급" }),
      ).toBeChecked();
      expect(
        within(dialog).getByRole("combobox", { name: /처리 사유/ }),
      ).toHaveTextContent("관리자 지급 조정");
      expect(amountBox(dialog)).toHaveValue("");
      expect(memoBox(dialog)).toHaveValue("");
      expect(
        within(dialog).queryByText("보유 포인트를 초과해 차감할 수 없습니다."),
      ).toBeNull();
    });
  });
});
