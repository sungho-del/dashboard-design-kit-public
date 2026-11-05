import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { ProductDetailPage } from "./ProductDetailPage";

/* -------------------------------------------------------------------------
 * 상품 상세 (BO-PRD-002) — 폼형 · 1단계
 *
 * 렌더 여부가 아니라 **정책·계산**을 본다 —
 * 입점 상품 판매 상태는 처분으로만 · 처분 건은 전시 잠금 · 상태별 처분 버튼 · 반려 사유 강제 ·
 * 입점 상품 금액·유형 잠금 · 원/일 × 기본 렌트일 · 할인(정액·정률) · 기간 옵션 총액·상한 · 슬롯 정리 ·
 * 유형 전환 시 카테고리 비움 · 저장 검사(접힌 섹션 펼침·첫 오류 이동) · 상품 전환 시 초기화 ·
 * 직영 상품 등록·수정(판매 상태 세그먼트 · 처분 없음 · 저장 뒤 그 자리 · 돌아가는 곳).
 *
 * 예시 상품: BL240814 렌트·판매중(1,500 − 200 원/일 · 기본 30일 · 수량 4 · 2번 슬롯 중지) ·
 * MC240812 렌트·반려 · LS240809 렌트·재심사요청 · AR271948 판매·중고 · KB781520 판매·품절 ·
 * 본사 직영 PR270901 렌트·판매중(900원/일 · 할인 없음 · 기간 옵션 없음 · 배송비 무료) · HQ240806 판매·품절
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

  /** 디자인 §3 #1 · 판정 Q20-3·4 · 부록 A B2 — 값은 보이되 고칠 수 없다(개발 `priceLocked`) */
  describe("입점 상품 금액 칸 잠금", () => {
    const LOCK_HELP =
      "입점 상품의 금액은 입점사가 정합니다. 고칠 곳은 하단 바의 [반려 처리]로 알려 주세요.";

    it("안내는 머리 상품 정보 줄 아래 한 번만 — 섹션마다 되풀이하지 않는다", () => {
      renderAt("BL240814");

      expect(within(header()).getByText(LOCK_HELP)).toBeVisible();
      expect(screen.getAllByText(LOCK_HELP)).toHaveLength(1);
    });

    it("렌트 금액 칸은 값을 보인 채 잠기고, 렌트 수량은 열려 있다", async () => {
      const { user } = renderAt("BL240814");

      expect(textbox("렌트 원가")).toHaveValue("1,500");
      for (const name of [
        "렌트 원가",
        "렌트 할인 값",
        "기본 렌트일",
        "보증금",
        "기간 옵션 1 일수",
        "기간 옵션 1 장기 렌트 할인가",
      ])
        expect(textbox(name)).toBeDisabled();
      expect(
        screen.getByRole("combobox", { name: "렌트 할인 단위" }),
      ).toBeDisabled();
      for (const group of ["렌트 할인", "기간 옵션"])
        for (const radio of within(
          screen.getByRole("radiogroup", { name: group }),
        ).getAllByRole("radio"))
          expect(radio).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "기간 옵션 추가" }),
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "기간 옵션 1 삭제" }),
      ).toBeDisabled();

      expect(textbox("렌트 수량")).toBeEnabled();
      await user.clear(textbox("렌트 수량"));
      await user.type(textbox("렌트 수량"), "2");
      expect(textbox("렌트 수량")).toHaveValue("2");
    });

    it("배송·옵션의 금액은 잠기고, 택배사·수령 방법·옵션명·재고는 열려 있다", () => {
      renderAt("BL240814");

      for (const name of [
        "배송비",
        "회수 배송비",
        "반품배송비 (편도)",
        "교환배송비 (왕복)",
        "기본 구성 옵션가",
        "일괄 옵션가",
      ])
        expect(textbox(name)).toBeDisabled();

      expect(screen.getByRole("combobox", { name: "택배사" })).toBeEnabled();
      expect(
        screen.getByRole("checkbox", { name: /방문 수령 추가 제공/ }),
      ).toBeEnabled();
      expect(
        screen.getByRole("checkbox", { name: /공항 픽업 추가 제공/ }),
      ).toBeEnabled();
      expect(textbox("옵션 1 옵션명")).toBeEnabled();
      expect(textbox("기본 구성 재고수량")).toBeEnabled();
      expect(textbox("일괄 재고수량")).toBeEnabled();
    });

    it("판매 상품은 판매 원가·판매 할인이 잠기고 재고 수량은 열려 있다", () => {
      renderAt("KB820417");

      expect(textbox("판매 원가")).toBeDisabled();
      expect(textbox("판매 할인 값")).toBeDisabled();
      expect(textbox("재고 수량")).toBeEnabled();
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
    it("렌트가 = 원가 − 할인, 최종 렌트 금액 = 렌트가 × 기본 렌트일", () => {
      renderAt("BL240814");
      const price = section(/가격 · 렌트 기간/);

      expect(within(price).getByText("1,300원/일")).toBeVisible();
      /* 할인은 렌트가 곁의 보조 글자(괄호 없이) — 할인 입력칸 설명에도 같은 글자가 있어 렌트가 줄 안에서 찾는다 */
      const rateRow = within(price).getByText("1,300원/일")
        .parentElement as HTMLElement;
      expect(within(rateRow).getByText("200원 할인")).toBeVisible();
      /* 기간 옵션의 정가(취소선)에도 같은 금액이 있어 「최종 렌트 금액」 줄 안에서 찾는다 */
      const finalRow = () =>
        within(price).getByText("최종 렌트 금액").parentElement as HTMLElement;
      expect(within(finalRow()).getByText("39,000원")).toBeVisible();
      expect(
        within(price).getByText("렌트가 1,300원/일 × 기본 렌트일 30일"),
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
    /** 디자인 §3 #2 · 부록 A C1 — 잠금 표시만, 안내 문장은 없다 */
    it("입점 상품은 유형을 바꿀 수 없다 — 안내 없이 잠긴 세그먼트만", async () => {
      const { user } = renderAt("BL240814");

      expect(screen.getByRole("radio", { name: "렌트" })).toBeDisabled();
      expect(screen.getByRole("radio", { name: "판매" })).toBeDisabled();
      await user.click(screen.getByRole("radio", { name: "판매" }));
      expect(screen.getByText("카테고리 (렌트)")).toBeVisible();
      expect(screen.queryByText(/유형을 바꾸지 않습니다/)).toBeNull();
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
      ["BL240814", ["목록", "반려 처리", "취소", "수정 저장"]],
      ["MC240812", ["목록", "승인 처리", "취소", "수정 저장"]],
      ["LS240809", ["목록", "승인 처리", "반려 처리", "취소", "수정 저장"]],
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

    it("렌트 수량 0 · 태그 11개는 막는다", async () => {
      const { user } = renderAt("BL240814");

      await user.clear(textbox("렌트 수량"));
      await user.type(textbox("검색 태그"), ", a, b, c, d, e, f, g, h");
      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(screen.getByText("렌트 수량을 입력해주세요.")).toBeVisible();
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

  describe("상품이미지 — 보기·확대만 (등록·교체·삭제는 알림)", () => {
    /** 목록 「등록 이미지」 O/△/X 와 맞아야 한다 */
    it("이미지 O 상품은 대표 + 추가 2장, X 상품은 대표 자리가 비어 있다", () => {
      renderAt("BL240814");
      const images = section(/상품이미지/);
      expect(within(images).getByText("(2/9)")).toBeVisible();
      expect(
        within(images).getByRole("button", { name: "대표이미지 확대" }),
      ).toBeVisible();
    });

    it("이미지 X 상품은 대표이미지를 등록하라는 빈 자리다", () => {
      renderAt("MC240812");
      const images = section(/상품이미지/);

      expect(
        within(images).getByRole("button", { name: "대표이미지 등록" }),
      ).toBeVisible();
      expect(within(images).getByText("(0/9)")).toBeVisible();
    });

    it("확대하면 창이 열리고, 교체는 개발 연동 안내를 띄운다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(
        screen.getByRole("button", { name: "추가이미지 2 확대" }),
      );
      const dialog = screen.getByRole("dialog", { name: "추가이미지 2" });
      await user.click(within(dialog).getByRole("button", { name: "닫기" }));

      await user.click(
        within(section(/상품이미지/)).getAllByRole("button", {
          name: "교체",
        })[0],
      );
      expect(
        await screen.findByText(
          "이미지 등록·교체·삭제는 개발 연동 시 제공됩니다.",
        ),
      ).toBeVisible();
    });
  });

  describe("상세설명", () => {
    /** 원본 시드는 HTML 이다 — 평문 칸에 태그 글자가 보이면 안 된다 */
    it("평문으로 열리고 태그 글자가 섞이지 않는다", () => {
      renderAt("BL240814");
      const detail = screen.getByRole("textbox", { name: "상세설명" });

      expect((detail as HTMLTextAreaElement).value).toContain(
        "회전형 카시트 스핀 360 — 안전하고",
      );
      expect((detail as HTMLTextAreaElement).value).not.toMatch(/<\/?[a-z]/);
    });
  });

  describe("상품 주요정보", () => {
    /** 디자인 §3 #13 · 판정 ⑭ — 등록 주체는 표시만(입점 = 셀러명 · 직영 = 「본사」) */
    it.each([
      ["입점 상품", "BL240814", "베이비루"],
      ["직영 상품", "PR270901", "본사"],
      ["직영 신규", "new", "본사"],
    ])("%s 의 등록 주체는 고칠 수 없는 읽는 값 「%s」", (_, path, owner) => {
      renderAt(path);

      expect(screen.queryByRole("combobox", { name: /등록 주체/ })).toBeNull();
      expect(
        screen.getByText("등록 주체").nextElementSibling,
      ).toHaveTextContent(owner);
    });

    it("성장단계·인증은 열려 있다", () => {
      renderAt("BL240814");

      expect(screen.getByRole("combobox", { name: /성장단계/ })).toBeEnabled();
      expect(textbox("인증 1 인증번호")).toHaveValue("CB-B2026-0814");
    });

    /** 목록 KC X 상품 — 인증이 비어 있어 저장이 막히고 그 칸으로 간다 */
    it("인증이 하나도 없으면 저장을 막고 인증 칸으로 간다", async () => {
      const { user, onNavSelect } = renderAt("LS240809");

      await user.click(screen.getByRole("button", { name: "수정 저장" }));

      expect(
        screen.getByText(
          "인증 정보를 1행 이상 선택해주세요(비대상 품목은 ‘해당없음’).",
        ),
      ).toBeVisible();
      await waitFor(() =>
        expect(
          screen.getByRole("combobox", { name: "인증 1 유형" }),
        ).toHaveFocus(),
      );
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    /** 목록 KC △(보완 필요) 상품 — 유형은 있는데 번호가 비어 있다 */
    it("인증번호가 빈 인증은 저장을 막고, 「해당없음」 으로 바꾸면 번호 칸이 잠긴다", async () => {
      const { user } = renderAt("AS730125");

      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(
        screen.getByText("선택한 인증의 인증번호를 입력해주세요."),
      ).toBeVisible();

      await user.click(screen.getByRole("combobox", { name: "인증 1 유형" }));
      await user.click(
        within(await screen.findByRole("listbox")).getByRole("option", {
          name: "해당없음",
        }),
      );
      expect(textbox("인증 1 인증번호")).toBeDisabled();
      expect(
        screen.queryByText("선택한 인증의 인증번호를 입력해주세요."),
      ).toBeNull();
    });

    it("상품상세참조를 켜면 내용이 채워지고 잠기며, 전체 적용은 모든 줄에 건다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(
        screen.getByRole("checkbox", { name: "색상 상품상세참조" }),
      );
      expect(textbox("색상 내용")).toHaveValue("상품상세참조");
      expect(textbox("색상 내용")).toBeDisabled();

      await user.click(
        screen.getByRole("button", { name: "전체 상품상세참조" }),
      );
      expect(textbox("제조국 내용")).toHaveValue("상품상세참조");
      expect(
        await screen.findByText("전체 항목에 상품상세참조가 적용되었습니다."),
      ).toBeVisible();
    });

    it("기본 세트는 지울 수 없고, 직접 추가한 줄만 지운다", async () => {
      const { user } = renderAt("BL240814");
      const info = section(/상품 주요정보/);

      expect(
        within(info).queryByRole("button", { name: "색상 삭제" }),
      ).toBeNull();

      await user.click(within(info).getByRole("button", { name: "항목 추가" }));
      await user.type(textbox("추가 항목 12 항목명"), "구성품");
      await user.click(
        within(info).getByRole("button", { name: "구성품 삭제" }),
      );
      expect(
        screen.queryByRole("textbox", { name: "추가 항목 12 항목명" }),
      ).toBeNull();
    });
  });

  describe("배송", () => {
    it("입점 상품은 「무료」 체크도 금액과 함께 잠긴다", () => {
      renderAt("BL240814");

      expect(screen.getByRole("textbox", { name: "배송비" })).toBeDisabled();
      expect(
        screen.getByRole("checkbox", { name: "배송비 무료" }),
      ).toBeDisabled();
    });

    it("회수·반납 요금은 렌트에만 있다", async () => {
      const { user } = renderAt("BL240811");

      expect(screen.queryByRole("textbox", { name: "회수 배송비" })).toBeNull();
      await user.click(
        screen.getByRole("checkbox", { name: /방문 수령 추가 제공/ }),
      );
      expect(screen.getByRole("textbox", { name: "픽업 요금" })).toBeVisible();
      expect(screen.queryByRole("textbox", { name: "반납 요금" })).toBeNull();
    });

    it("방문 수령을 켜면 주소가 필요하고, 주소록에서 고르면 그 주소가 붙는다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(
        screen.getByRole("checkbox", { name: /방문 수령 추가 제공/ }),
      );
      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(screen.getByText("방문 수령 주소를 선택해주세요.")).toBeVisible();

      await user.click(screen.getByRole("button", { name: "판매자 주소록" }));
      const dialog = screen.getByRole("dialog", { name: "주소록" });
      await user.click(
        within(dialog).getByRole("button", {
          name: "본사 반품·교환 센터 선택",
        }),
      );

      expect(
        await screen.findByText("방문 수령 주소가 선택되었습니다."),
      ).toBeVisible();
      expect(
        within(section(/^배송/)).getByText("본사 반품·교환 센터"),
      ).toBeVisible();
      expect(screen.queryByText("방문 수령 주소를 선택해주세요.")).toBeNull();
    });

    it("공항 픽업을 켜면 공항이 필요하고, 요금 이름이 방문 수령과 갈린다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(
        screen.getByRole("checkbox", { name: /공항 픽업 추가 제공/ }),
      );
      expect(
        screen.getByRole("textbox", { name: "공항 픽업 요금" }),
      ).toBeVisible();
      expect(
        screen.getByRole("textbox", { name: "공항 반납 요금" }),
      ).toBeVisible();

      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(screen.getByText("공항 픽업 주소를 선택해주세요.")).toBeVisible();
    });
  });

  describe("옵션 — 조합 목록", () => {
    const rows = () =>
      within(section(/^옵션/))
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[1].textContent);

    it("값을 더해 다시 적용하면 조합이 늘고, 이미 친 옵션가는 되살아난다", async () => {
      const { user } = renderAt("BL240814");

      await user.clear(textbox("옵션 1 옵션값"));
      await user.type(
        textbox("옵션 1 옵션값"),
        "기본 구성,추가 커버 세트,휴대 파우치",
      );
      await user.click(
        screen.getByRole("button", { name: "옵션목록으로 적용" }),
      );

      expect(rows()).toEqual(["기본 구성", "추가 커버 세트", "휴대 파우치"]);
      expect(textbox("추가 커버 세트 옵션가")).toHaveValue("9,000");
      expect(
        await screen.findByText("3개 옵션 조합을 목록에 적용했습니다."),
      ).toBeVisible();
    });

    it("축을 둘로 늘리면 두 축의 모든 조합이 생긴다", async () => {
      const { user } = renderAt("BL240814");

      await user.click(screen.getByRole("button", { name: "옵션명 추가" }));
      await user.type(textbox("옵션 2 옵션명"), "색상");
      await user.type(textbox("옵션 2 옵션값"), "그레이,베이지");
      await user.click(
        screen.getByRole("button", { name: "옵션목록으로 적용" }),
      );

      expect(within(section(/^옵션/)).getByText("(총 4개)")).toBeVisible();
      expect(
        screen.getByRole("checkbox", { name: "추가 커버 세트 / 베이지 선택" }),
      ).toBeVisible();
    });

    it("정렬·선택 일괄수정·선택삭제", async () => {
      const { user } = renderAt("BL240814");

      await user.click(screen.getByRole("combobox", { name: /정렬 순서/ }));
      await user.click(
        within(await screen.findByRole("listbox")).getByRole("option", {
          name: "높은 가격순",
        }),
      );
      expect(rows()).toEqual(["추가 커버 세트", "기본 구성"]);

      await user.click(
        screen.getByRole("checkbox", { name: "기본 구성 선택" }),
      );
      await user.type(textbox("일괄 재고수량"), "7");
      await user.click(
        screen.getByRole("button", { name: "선택목록 일괄수정" }),
      );
      expect(textbox("기본 구성 재고수량")).toHaveValue("7");
      expect(textbox("추가 커버 세트 재고수량")).toHaveValue("1");

      await user.click(screen.getByRole("button", { name: "선택삭제" }));
      expect(rows()).toEqual(["추가 커버 세트"]);
    });

    it("재고가 0 이면 판매상태가 품절이다(고치는 칸이 아니다)", async () => {
      const { user } = renderAt("BL240814");

      await user.clear(textbox("기본 구성 재고수량"));
      await user.type(textbox("기본 구성 재고수량"), "0");

      const row = textbox("기본 구성 재고수량").closest("tr") as HTMLElement;
      expect(within(row).getByText("품절")).toBeVisible();
    });

    it("옵션 없이 연 상품은 [설정안함] 이고 목록이 없다", () => {
      renderAt("BL240811");

      expect(
        screen.getByRole("radio", { name: "설정안함", checked: true }),
      ).toBeTruthy();
      expect(screen.queryByText(/옵션목록/)).toBeNull();
    });
  });

  /** 디자인 §3 #3 — 개발 `ProductFormScreen` 공용 폼의 직영 갈래 */
  describe("직영 상품 등록 (`/products/new`)", () => {
    const renderNew = () => {
      const result = renderAt("new");
      return result;
    };

    it("머리는 「상품 등록」 + 직영 안내, 처음 값은 렌트·판매중·전시중이고 처분 버튼이 없다", () => {
      renderNew();

      const head = screen
        .getByRole("heading", { name: "상품 등록" })
        .closest("header") as HTMLElement;
      expect(
        within(head).getByText(
          "본사 직영 상품입니다. 등록하면 심사 없이 바로 판매·전시 상태가 적용됩니다.",
        ),
      ).toBeVisible();
      expect(textbox(/상품명/)).toHaveValue("");
      expect(screen.getByRole("radio", { name: "렌트" })).toBeChecked();
      expect(screen.getByRole("radio", { name: "렌트" })).toBeEnabled();
      expect(textbox("렌트 원가")).toBeEnabled();
      expect(
        within(screen.getByRole("radiogroup", { name: "판매 상태" })).getByRole(
          "radio",
          { name: "판매중" },
        ),
      ).toBeChecked();
      expect(
        within(screen.getByRole("radiogroup", { name: "전시 상태" })).getByRole(
          "radio",
          { name: "전시중" },
        ),
      ).toBeChecked();
      expect(barButtons()).toEqual(["목록", "취소", "등록"]);
    });

    it("빈 폼을 등록하면 개발 문구로 막고 첫 오류(상품명)로 간다", async () => {
      const { user, onNavSelect } = renderNew();

      await user.click(screen.getByRole("button", { name: "등록" }));

      for (const message of [
        "상품명을 입력해주세요.",
        "카테고리(대분류)를 선택해주세요.",
        "렌트 원가를 입력해주세요.",
        "기본 렌트일을 입력해주세요.",
        "보증금을 입력해 주세요.",
        "렌트 수량을 입력해주세요.",
        "대표이미지를 등록해주세요.",
        "성장단계를 선택해주세요.",
        "인증 정보를 1행 이상 선택해주세요(비대상 품목은 ‘해당없음’).",
      ])
        expect(screen.getByText(message)).toBeVisible();
      await waitFor(() => expect(textbox(/상품명/)).toHaveFocus());
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("판매 중고로 바꾸면 재고·최초 구매일·등급을 막는다", async () => {
      const { user } = renderNew();

      await user.click(screen.getByRole("radio", { name: "판매" }));
      await user.click(screen.getByRole("radio", { name: "중고 상품" }));
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(screen.getByText("판매 원가를 입력해주세요.")).toBeVisible();
      expect(
        screen.getByText("재고 수량을 입력해주세요(0개는 품절로 등록됩니다)."),
      ).toBeVisible();
      expect(screen.getByText("최초 구매일을 입력해주세요.")).toBeVisible();
      expect(screen.getByText("중고 상품 등급을 선택해주세요.")).toBeVisible();
    });

    it("[취소] 는 들어온 곳으로 뒤로 간다", async () => {
      const back = vi
        .spyOn(window.history, "back")
        .mockImplementation(() => {});
      const { user, onNavSelect } = renderNew();

      await user.click(screen.getByRole("button", { name: "취소" }));

      expect(back).toHaveBeenCalled();
      expect(onNavSelect).not.toHaveBeenCalled();
      back.mockRestore();
    });
  });

  describe("직영 상품 수정 — 금액·유형·판매 상태가 열리고 처분이 없다", () => {
    it("머리는 상품명·코드 + 「본사 직영 상품 · 셀러명 (셀러코드)」, 금액 잠금 안내 없음 · 하단 바에 처분 버튼이 없다", () => {
      renderAt("PR270901");

      expect(
        within(header()).getByText(
          "본사 기획 사계절 아기 침낭 세트 · PR270901",
        ),
      ).toBeVisible();
      expect(
        within(header()).getByText("본사 직영 상품 · 베이비큐브 (S-0001)"),
      ).toBeVisible();
      expect(
        screen.queryByText(/입점 상품의 금액은 입점사가 정합니다/),
      ).toBeNull();
      expect(barButtons()).toEqual(["목록", "취소", "수정 저장"]);
    });

    it("기본 렌트일을 고치면 최종 렌트 금액이 다시 계산된다", async () => {
      const { user } = renderAt("PR270901");
      const price = section(/가격 · 렌트 기간/);
      const finalRow = () =>
        within(price).getByText("최종 렌트 금액").parentElement as HTMLElement;

      await user.clear(textbox("기본 렌트일"));
      await user.type(textbox("기본 렌트일"), "10");
      expect(within(finalRow()).getByText("9,000원")).toBeVisible();

      await user.clear(textbox("기본 렌트일"));
      expect(
        within(price).getByText("위 기본 렌트일을 입력하면 계산됩니다."),
      ).toBeVisible();
    });

    it("정률 할인은 원가의 % 를 반올림한 원 단위다", async () => {
      const { user } = renderAt("PR270901");

      await user.click(
        within(screen.getByRole("radiogroup", { name: "렌트 할인" })).getByRole(
          "radio",
          { name: "설정함" },
        ),
      );
      await user.click(
        screen.getByRole("combobox", { name: "렌트 할인 단위" }),
      );
      await user.click(
        within(await screen.findByRole("listbox")).getByRole("option", {
          name: "%",
        }),
      );
      await user.type(textbox("렌트 할인 값"), "10");

      /* 900 × 10% = 90 */
      expect(
        within(section(/가격 · 렌트 기간/)).getByText("810원/일"),
      ).toBeVisible();
    });

    /** 원본은 6번째에 경고 창을 띄우려 하지만 그려지지 않는다 — 잠그고 이유를 곁에 적는다 */
    it("기간 옵션은 5개가 차면 [추가] 가 잠기고 이유가 늘 보인다 · 지우면 다시 열린다", async () => {
      const { user } = renderAt("PR270901");
      const add = () => screen.getByRole("button", { name: "기간 옵션 추가" });

      await user.click(
        within(screen.getByRole("radiogroup", { name: "기간 옵션" })).getByRole(
          "radio",
          { name: "설정함" },
        ),
      );
      for (let i = 0; i < 4; i++) await user.click(add());

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

    it("기간 옵션 반쪽 입력 · 같은 일수 두 줄은 막는다", async () => {
      const { user } = renderAt("PR270901");

      await user.click(
        within(screen.getByRole("radiogroup", { name: "기간 옵션" })).getByRole(
          "radio",
          { name: "설정함" },
        ),
      );
      await user.type(textbox("기간 옵션 1 일수"), "30");
      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(
        screen.getByText(
          "기간 옵션은 일수와 장기 렌트 할인가를 함께 입력해주세요.",
        ),
      ).toBeVisible();

      await user.type(textbox("기간 옵션 1 장기 렌트 할인가"), "20000");
      await user.click(screen.getByRole("button", { name: "기간 옵션 추가" }));
      await user.type(textbox("기간 옵션 2 일수"), "30");
      await user.type(textbox("기간 옵션 2 장기 렌트 할인가"), "18000");
      expect(
        screen.getByText("기간 옵션의 일수는 중복해서 등록할 수 없습니다."),
      ).toBeVisible();
    });

    it("유형을 바꾸면 카테고리를 비우고, 가격·수량 섹션이 그 유형 것으로 바뀐다", async () => {
      const { user } = renderAt("PR270901");

      await user.click(screen.getByRole("radio", { name: "판매" }));

      expect(
        screen.getByRole("combobox", { name: "대분류" }),
      ).toHaveTextContent("대분류 선택");
      expect(screen.getByText("카테고리 (판매)")).toBeVisible();
      expect(screen.getByRole("heading", { name: /^가격/ })).toBeVisible();
      expect(screen.getByRole("heading", { name: /재고 수량/ })).toBeVisible();
    });

    it("배송비 「무료」 면 금액 칸이 잠기고, 풀면 다시 적을 수 있다", async () => {
      const { user } = renderAt("PR270901");
      const fee = () => screen.getByRole("textbox", { name: "배송비" });

      expect(fee()).toBeDisabled();
      await user.click(screen.getByRole("checkbox", { name: "배송비 무료" }));
      expect(fee()).toBeEnabled();
    });

    /** Q-63 · 개발 26c59cb — 렌트 보증금이 비었거나 1 미만이면 막는다 */
    it.each([[""], ["0"]])(
      "렌트 보증금 「%s」 는 칸 아래 「보증금을 입력해 주세요.」 로 막는다",
      async (value) => {
        const { user, onNavSelect } = renderAt("PR270901");

        await user.clear(textbox(/보증금/));
        if (value) await user.type(textbox(/보증금/), value);
        await user.click(screen.getByRole("button", { name: "수정 저장" }));

        expect(screen.getByText("보증금을 입력해 주세요.")).toBeVisible();
        await waitFor(() => expect(textbox(/보증금/)).toHaveFocus());
        expect(onNavSelect).not.toHaveBeenCalled();
      },
    );

    it("옵션을 켜면 축 입력과 [옵션목록으로 적용] 을 거쳐야 저장된다", async () => {
      const { user } = renderAt("PR270901");
      const save = () =>
        user.click(screen.getByRole("button", { name: "수정 저장" }));

      await user.click(
        within(screen.getByRole("radiogroup", { name: "옵션 설정" })).getByRole(
          "radio",
          { name: "설정함" },
        ),
      );
      await save();
      expect(
        screen.getByText("옵션명과 중복 없는 옵션값을 축마다 입력해주세요."),
      ).toBeVisible();

      await user.type(textbox("옵션 1 옵션명"), "색상");
      await user.type(textbox("옵션 1 옵션값"), "그레이,베이지");
      expect(
        screen.getByText(
          "옵션입력을 옵션목록으로 적용해 모든 조합을 만들어주세요.",
        ),
      ).toBeVisible();

      await user.click(
        screen.getByRole("button", { name: "옵션목록으로 적용" }),
      );
      expect(
        screen.queryByText(
          "옵션입력을 옵션목록으로 적용해 모든 조합을 만들어주세요.",
        ),
      ).toBeNull();
    });

    it("[수정 저장] 은 알림만 띄우고 그 자리에 남는다 · [목록] 은 본사 행 셀러 상세로", async () => {
      const { user, onNavSelect } = renderAt("PR270901");

      await user.click(screen.getByRole("button", { name: "수정 저장" }));
      expect(await screen.findByText("수정 저장했습니다.")).toBeVisible();
      expect(onNavSelect).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "목록" }));
      expect(onNavSelect).toHaveBeenCalledWith("/sellers/S-0001");
    });

    it("판매 재고 0 이면 판매 상태가 품절 배지 · 재고를 채우면 [판매중][판매중지] 를 고른다", async () => {
      const { user } = renderAt("HQ240806");
      const display = () => section(/노출 관리/);

      expect(within(display()).getByText("품절")).toBeVisible();
      expect(
        within(display()).queryByRole("radiogroup", { name: "판매 상태" }),
      ).toBeNull();

      await user.clear(textbox("재고 수량"));
      await user.type(textbox("재고 수량"), "5");
      const status = within(display()).getByRole("radiogroup", {
        name: "판매 상태",
      });
      expect(
        within(status).getByRole("radio", { name: "판매중" }),
      ).toBeChecked();
      await user.click(within(status).getByRole("radio", { name: "판매중지" }));
      expect(
        within(status).getByRole("radio", { name: "판매중지" }),
      ).toBeChecked();
      /* 직영은 처분 대상이 아니라 전시 상태가 늘 열려 있다 */
      expect(
        within(display()).getByRole("radiogroup", { name: "전시 상태" }),
      ).toBeVisible();
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
