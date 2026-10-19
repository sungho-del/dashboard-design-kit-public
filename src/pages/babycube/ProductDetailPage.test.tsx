import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { ProductDetailPage } from "./ProductDetailPage";

/* -------------------------------------------------------------------------
 * 상품 상세 (BO-PRD-002) — 폼형 · 1단계
 *
 * 렌더 여부가 아니라 **정책·계산**을 본다 —
 * 판매 상태는 처분으로만 · 처분 건은 전시 잠금 · 상태별 처분 버튼 · 반려 사유 강제 ·
 * 원/일 × 기본 렌트일 · 할인(정액·정률) · 기간 옵션 총액·상한 · 슬롯 정리 ·
 * 유형 전환 시 카테고리 비움 · 저장 검사(접힌 섹션 펼침·첫 오류 이동) · 상품 전환 시 초기화.
 *
 * 예시 상품: BL240814 렌트·판매중(1,500 − 200 원/일 · 기본 30일 · 수량 4 · 2번 슬롯 중지) ·
 * MC240812 렌트·반려 · LS240809 렌트·재심사요청 · AR271948 판매·중고 · KB781520 판매·품절 ·
 * HQ240806 본사 직영(이 화면에 없음)
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
  const onNavSelect = vi.fn();
  const user = userEvent.setup();

  window.history.replaceState(null, "", `/products/${path}`);

  render(
    <ToastProvider position="bottom">
      <ProductDetailPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/products"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );

  return { user, onNavSelect };
}

/** 섹션 카드 — 제목(머리)으로 찾는다 */
const section = (title: RegExp | string) =>
  screen
    .getByRole("heading", { name: title })
    .closest("[data-variant]") as HTMLElement;

const header = () =>
  screen
    .getByRole("heading", { name: "상품 상세 (수정)" })
    .closest("header") as HTMLElement;

/** 하단 고정 바 — [목록] 이 있는 카드 */
const bar = () =>
  screen
    .getByRole("button", { name: "목록" })
    .closest("[data-variant]") as HTMLElement;

const barButtons = () =>
  within(bar())
    .getAllByRole("button")
    .map((button) => button.textContent);

const textbox = (name: RegExp | string) =>
  screen.getByRole("textbox", { name });

describe("ProductDetailPage (상품 상세 · 1단계)", () => {
  describe("경로와 조회", () => {
    it("상품코드로 상품을 찾아 머리에 상품명·코드·셀러와 저장된 상태를 낸다", () => {
      renderAt("BL240814");

      expect(
        within(header()).getByText(
          "회전형 카시트 스핀 360 · BL240814 · 베이비루",
        ),
      ).toBeVisible();
      expect(within(header()).getByText("판매중")).toBeVisible();
      expect(within(header()).getByText("전시중")).toBeVisible();
    });

    it.each([
      ["없는 상품코드", "ZZ000000"],
      [
        "본사 직영 상품 — 목록에서 빠진 상품은 상세로도 열지 않는다",
        "HQ240806",
      ],
      ["경로 조각이 하나가 아닐 때", "아무거나/BL240814"],
    ])("%s 이면 찾을 수 없다고 하고 목록으로 돌려보낸다", async (_, path) => {
      const { user, onNavSelect } = renderAt(path);

      expect(screen.getByText("찾을 수 없는 상품입니다")).toBeVisible();
      await user.click(
        screen.getByRole("button", { name: "상품 관리 목록으로" }),
      );
      expect(onNavSelect).toHaveBeenCalledWith("/products");
    });
  });

  describe("섹션 구성 — 렌트·판매가 서로 대체된다", () => {
    it("렌트는 「가격 · 렌트 기간」 과 렌트 수량, 판매는 「가격」 과 재고 수량", () => {
      renderAt("BL240814");
      expect(
        screen.getByRole("heading", { name: /가격 · 렌트 기간/ }),
      ).toBeVisible();
      expect(screen.getByRole("heading", { name: /렌트 수량/ })).toBeVisible();
      expect(screen.queryByRole("heading", { name: /재고 수량/ })).toBeNull();
    });

    it("판매 상품은 재고 수량이 있고, 품절 상품은 재고 0 으로 열린다", () => {
      renderAt("KB781520");

      expect(screen.getByRole("heading", { name: /^가격/ })).toBeVisible();
      expect(screen.queryByRole("heading", { name: /렌트 수량/ })).toBeNull();
      expect(textbox("재고 수량")).toHaveValue("0");
    });

    it("섹션은 펼친 채로 시작하고 접을 수 있다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(screen.getByRole("button", { name: "상품명 접기" }));

      expect(screen.queryByRole("textbox", { name: "상품명" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "상품명 펼치기" }),
      ).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("가격 계산 (원본 `pfDiscAbs` · 원/일)", () => {
    it("렌트가 = 원가 − 할인, 최종 렌트 금액 = 렌트가 × 기본 렌트일", async () => {
      const { user } = renderAt("BL240814");
      const price = section(/가격 · 렌트 기간/);

      expect(within(price).getByText("1,300원/일")).toBeVisible();
      expect(within(price).getByText("(200원 할인)")).toBeVisible();
      /* 기간 옵션의 정가(취소선)에도 같은 금액이 있어 「최종 렌트 금액」 줄 안에서 찾는다 */
      const finalRow = () =>
        within(price).getByText("최종 렌트 금액").parentElement as HTMLElement;
      expect(within(finalRow()).getByText("39,000원")).toBeVisible();
      expect(
        within(price).getByText("렌트가 1,300원/일 × 기본 렌트일 30일"),
      ).toBeVisible();

      await user.clear(textbox("기본 렌트일"));
      await user.type(textbox("기본 렌트일"), "10");
      expect(within(finalRow()).getByText("13,000원")).toBeVisible();

      await user.clear(textbox("기본 렌트일"));
      expect(
        within(price).getByText("위 기본 렌트일을 입력하면 계산됩니다."),
      ).toBeVisible();
    });

    it("정률 할인은 원가의 % 를 반올림한 원 단위다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(
        screen.getByRole("combobox", { name: "렌트 할인 단위" }),
      );
      await user.click(
        within(await screen.findByRole("listbox")).getByRole("option", {
          name: "%",
        }),
      );
      await user.clear(textbox("렌트 할인 값"));
      await user.type(textbox("렌트 할인 값"), "10");

      /* 1,500 × 10% = 150 */
      expect(
        within(section(/가격 · 렌트 기간/)).getByText("1,350원/일"),
      ).toBeVisible();
    });

    it("판매가 = 판매 원가 − 판매 할인", () => {
      renderAt("KB820417");

      /* 69,000 − 5,000 */
      expect(within(section(/^가격/)).getByText("64,000원")).toBeVisible();
    });
  });

  describe("기간 옵션 (총액 · 최대 5개)", () => {
    it("정가(렌트가 × 일수)보다 싼 총액이면 할인율을 함께 낸다", () => {
      renderAt("BL240814");
      const first = screen.getByRole("group", { name: "기간 옵션 1" });

      expect(within(first).getByText("1개월")).toBeVisible();
      /* 정가 1,300 × 30 = 39,000 · 총액 35,100 */
      expect(within(first).getByText("39,000원")).toBeVisible();
      expect(within(first).getByText("35,100원")).toBeVisible();
      expect(within(first).getByText("10% 할인")).toBeVisible();
    });

    /** 원본은 6번째에 경고 창을 띄우려 하지만 그려지지 않는다 — 잠그고 이유를 곁에 적는다 */
    it("5개가 차면 [추가] 가 잠기고 이유가 늘 보인다 · 지우면 다시 열린다", async () => {
      const { user } = renderAt("BL240814");
      const add = () => screen.getByRole("button", { name: "기간 옵션 추가" });

      await user.click(add());
      await user.click(add());
      await user.click(add());

      expect(
        screen.getAllByRole("group", { name: /^기간 옵션 \d$/ }),
      ).toHaveLength(5);
      expect(add()).toBeDisabled();
      expect(
        screen.getByText(/기간 옵션은 최대 5개까지 등록할 수 있습니다/),
      ).toBeVisible();

      await user.click(
        screen.getByRole("button", { name: "기간 옵션 5 삭제" }),
      );
      expect(add()).toBeEnabled();
    });
  });

  describe("렌트 수량 — 슬롯", () => {
    it("수량만큼 `{상품코드}-{순번}` 슬롯이 나오고, 중지한 슬롯은 신규 예약에서 빠진다", () => {
      renderAt("BL240814");
      const slots = screen.getByRole("list", { name: "렌트 슬롯" });

      expect(within(slots).getAllByRole("listitem")).toHaveLength(4);
      expect(within(slots).getByText("BL240814-02")).toBeVisible();
      expect(within(slots).getByText("신규 예약 제외")).toBeVisible();
    });

    it("수량을 줄이면 범위 밖 중지 슬롯이 정리되고, 다시 늘려도 되살아나지 않는다", async () => {
      const { user } = renderAt("BL240814");

      await user.clear(textbox("렌트 수량"));
      await user.type(textbox("렌트 수량"), "1");
      expect(
        within(screen.getByRole("list", { name: "렌트 슬롯" })).getAllByRole(
          "listitem",
        ),
      ).toHaveLength(1);

      await user.clear(textbox("렌트 수량"));
      await user.type(textbox("렌트 수량"), "3");
      expect(screen.queryByText("신규 예약 제외")).toBeNull();
    });
  });

  describe("유형", () => {
    it("유형을 바꾸면 카테고리를 비우고, 가격·수량 섹션이 그 유형 것으로 바뀐다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(screen.getByRole("radio", { name: "판매" }));

      expect(
        screen.getByRole("combobox", { name: "대분류" }),
      ).toHaveTextContent("대분류 선택");
      expect(screen.getByText("카테고리 (판매)")).toBeVisible();
      expect(screen.getByRole("heading", { name: /^가격/ })).toBeVisible();
      expect(screen.getByRole("heading", { name: /재고 수량/ })).toBeVisible();
      expect(
        screen.getByRole("radiogroup", { name: "상품 상태" }),
      ).toBeVisible();
    });

    it("중고 판매 상품은 최초 구매일·등급을 받고, 새상품으로 바꾸면 사라진다", async () => {
      const { user } = renderAt("AR271948");

      expect(screen.getByText("최초 구매일")).toBeVisible();
      expect(screen.getByRole("radio", { name: "A급" })).toBeChecked();

      await user.click(screen.getByRole("radio", { name: "새상품" }));
      expect(screen.queryByText("최초 구매일")).toBeNull();
    });
  });

  describe("노출 관리 — 판매 상태는 처분으로만", () => {
    it("판매중 상품은 판매 상태를 고칠 수 없고 전시 상태는 고칠 수 있다", () => {
      renderAt("BL240814");
      const display = section(/노출 관리/);

      expect(
        within(display).getByText(
          /아래 하단 바의 \[반려 처리\]로 사유를 남겨 주세요/,
        ),
      ).toBeVisible();
      expect(
        within(display).getByRole("radiogroup", { name: "전시 상태" }),
      ).toBeVisible();
    });

    /** 반려는 판매와 전시를 같이 내린다 — 전시만 열면 «반려인데 전시중» 이 생긴다 */
    it("반려 건은 사유(경고색)·처리 시각을 내고 전시 상태를 잠근다", () => {
      renderAt("MC240812");
      const display = section(/노출 관리/);

      const reason = within(display).getByText(/등록 이미지 규격 미달/);
      expect(reason.className.split(/\s+/)).toContain("text-text-warning");
      expect(within(display).getByText("(2026.08.19 10:15:32)")).toBeVisible();
      expect(
        within(display).queryByRole("radiogroup", { name: "전시 상태" }),
      ).toBeNull();
      expect(
        within(display).getByText(/\[승인 처리\]로 처분을 풀면/),
      ).toBeVisible();
      /* 안내는 이 상태에 실제로 있는 버튼을 가리킨다 */
      expect(
        within(display).getByText(/처분을 풀려면 아래 하단 바의 \[승인 처리\]/),
      ).toBeVisible();
    });
  });

  describe("하단 바 — 상태가 처분 버튼을 정한다", () => {
    it.each([
      ["BL240814", ["목록", "반려 처리", "수정 저장", "취소"]],
      ["MC240812", ["목록", "승인 처리", "수정 저장", "취소"]],
      ["LS240809", ["목록", "승인 처리", "반려 처리", "수정 저장", "취소"]],
    ])("%s → %j", (code, buttons) => {
      renderAt(code);

      expect(barButtons()).toEqual(buttons);
      expect(bar().className.split(/\s+/)).toEqual(
        expect.arrayContaining(["sticky", "bottom-6"]),
      );
    });

    /** 퍼블은 저장하지 않는다 — 알림만, 머리 배지는 그대로다 */
    it("승인은 확인 창 없이 알리고, 상태는 바뀌지 않는다", async () => {
      const { user } = renderAt("MC240812");

      await user.click(screen.getByRole("button", { name: "승인 처리" }));

      expect(
        await screen.findByText(
          "1건 승인 처리되었습니다. 판매중으로 되돌렸습니다.",
        ),
      ).toBeVisible();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(within(header()).getByText("반려")).toBeVisible();
    });

    it("반려는 목록과 같은 창 — 사유가 비면 막고, 적으면 알린다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(screen.getByRole("button", { name: "반려 처리" }));
      const dialog = screen.getByRole("dialog", {
        name: "상품 반려 사유 입력",
      });

      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "반려 사유를 입력해주세요.",
      );

      await user.type(within(dialog).getByRole("textbox"), "KC 서류 미제출");
      await user.click(
        within(dialog).getByRole("button", { name: "반려 처리" }),
      );

      expect(
        await screen.findByText(
          "1건 반려 처리되었습니다. 상태를 «반려»로 내렸습니다.",
        ),
      ).toBeVisible();
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(within(header()).getByText("판매중")).toBeVisible();
    });

    it.each(["목록", "취소"])(
      "[%s] 은 확인 없이 목록으로 간다",
      async (name) => {
        const { user, onNavSelect } = renderAt("BL240814");

        await user.click(screen.getByRole("button", { name }));
        expect(onNavSelect).toHaveBeenCalledWith("/products");
      },
    );
  });

  describe("[수정 저장] — 원본 `pfValidate`", () => {
    it("검사를 통과하면 알리고 목록으로 간다", async () => {
      const { user, onNavSelect } = renderAt("BL240814");

      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(
        await screen.findByText("상품 정보가 수정되었습니다."),
      ).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/products");
    });

    it("오류가 접힌 섹션에 있으면 펼치고 첫 오류 칸으로 옮겨 간다", async () => {
      const { user, onNavSelect } = renderAt("BL240814");

      await user.clear(textbox(/상품명/));
      await user.click(screen.getByRole("button", { name: "상품명 접기" }));
      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(await screen.findByText("상품명을 입력해주세요.")).toBeVisible();
      await waitFor(() => expect(textbox(/상품명/)).toHaveFocus());
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("렌트 수량 0 · 기간 옵션 반쪽 입력 · 태그 11개는 막는다", async () => {
      const { user } = renderAt("BL240814");

      await user.clear(textbox("렌트 수량"));
      await user.clear(textbox("기간 옵션 1 장기 렌트 할인가"));
      await user.type(textbox("검색 태그"), ", a, b, c, d, e, f, g, h");
      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(screen.getByText("렌트 수량을 입력해주세요.")).toBeVisible();
      expect(
        screen.getByText(
          "기간 옵션은 일수와 장기 렌트 할인가를 함께 입력해주세요.",
        ),
      ).toBeVisible();
      expect(
        screen.getByText("검색 태그는 최대 10개까지 입력할 수 있습니다."),
      ).toBeVisible();
    });

    /** 원본도 재고를 검사하지 않는다 — 재고 0 은 품절이라는 정상 상태다 */
    it("판매 상품의 재고 0 은 저장을 막지 않는다", async () => {
      const { user, onNavSelect } = renderAt("KB781520");

      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(onNavSelect).toHaveBeenCalledWith("/products");
    });
  });

  /** 주소만 바뀌어 다른 상품으로 가면 처음부터 — A→B→A 로 돌아와도 고친 값이 되살아나지 않는다 */
  it("다른 상품으로 갔다 와도 고친 값·열린 창이 따라가지 않는다", async () => {
    const { user } = renderAt("BL240814");

    await user.clear(textbox(/상품명/));
    await user.type(textbox(/상품명/), "고친 이름");
    await user.click(screen.getByRole("button", { name: "반려 처리" }));

    act(() => navigate("/products/BL240811"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(textbox(/상품명/)).toHaveValue("젖병소독기 UV 라이트");

    act(() => navigate("/products/BL240814"));
    expect(textbox(/상품명/)).toHaveValue("회전형 카시트 스핀 360");
  });
});
