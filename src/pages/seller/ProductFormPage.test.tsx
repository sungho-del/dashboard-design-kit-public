import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import type { SellerNavProps } from "./SettleParts";
import { ProductDetailPage, ProductNewPage } from "./ProductFormPage";

/* -------------------------------------------------------------------------
 * 셀러 상품 폼 — 상품 상세 (수정) · 상품 등록 폼
 *
 * 렌더 여부가 아니라 **시드 매핑·정책·계산**을 본다 —
 * 시드 값이 칸에 그대로(원본 `openProductForm`) · 판매 상태 판정(잠금 → 초안 → 품절 → 세그먼트) ·
 * 하단 바(주 버튼 하나 · 재심사/임시저장 자격) · 저장 검사(Q-63 보증금 포함) · 유형 전환 · 주소록.
 *
 * 예시 상품: P-001 렌트·판매중(39,000원/일 · 기본 7일 · 수량 3 · 3번 슬롯 중지 · 기간 옵션 2 · 인증·고시 시드) ·
 * P-002 렌트(방문 수령 A1 · 공항 픽업 A3) · P-009 판매(보증금 없음) · P-061 판매·품절(재고 0) ·
 * P-300 렌트·반려 · P-303 렌트·재심사요청 · P-310 판매·임시저장 · P-311 렌트·임시저장(판매 분류) ·
 * P-100 본사 직영(이 화면에 없음)
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
afterAll(() => vi.unstubAllGlobals());

function renderAt(Page: ComponentType<SellerNavProps>, path: string) {
  act(() => navigate(path));
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav={path}
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const renderEdit = (id: string) =>
  renderAt(ProductDetailPage, `/products/${id}`);
const renderNew = () => renderAt(ProductNewPage, "/product-new");

/** 섹션 카드 — 제목(머리)으로 찾는다 */
const section = (title: RegExp | string) =>
  screen
    .getByRole("heading", { name: title })
    .closest("[data-variant]") as HTMLElement;

const header = () => screen.getByRole("banner");

/** 하단 고정 바 — [목록] 이 있는 카드 */
const bar = () =>
  screen
    .getByRole("button", { name: "목록" })
    .closest("[data-variant]") as HTMLElement;
const barButtons = () =>
  within(bar())
    .getAllByRole("button")
    .map((button) => button.textContent);
const primaries = () =>
  within(bar())
    .getAllByRole("button")
    .filter((button) =>
      button.className.split(/\s+/).includes("bg-action-primary"),
    )
    .map((button) => button.textContent);

const textbox = (name: RegExp | string) =>
  screen.getByRole("textbox", { name });

describe("상품 상세 (수정) — 시드 값이 칸에 그대로(원본 `openProductForm`)", () => {
  it("P-001 — 머리 · 가격 · 최종 렌트 금액 · 보증금", () => {
    renderEdit("P-001");

    expect(
      within(header()).getByText("스토케 트립트랩 하이체어 · P-001 · NZ269940"),
    ).toBeVisible();
    expect(within(header()).getByText("판매중")).toBeVisible();
    expect(within(header()).getByText("전시중")).toBeVisible();
    expect(textbox(/상품명/)).toHaveValue("스토케 트립트랩 하이체어");
    expect(screen.getByRole("combobox", { name: "대분류" })).toHaveTextContent(
      "보행기·점퍼루",
    );

    const price = section(/가격 · 렌트 기간/);
    expect(within(price).getByText("39,000원/일")).toBeVisible();
    const finalRow = within(price).getByText("최종 렌트 금액")
      .parentElement as HTMLElement;
    expect(within(finalRow).getByText("273,000원")).toBeVisible();
    expect(
      within(price).getByText("렌트가 39,000원/일 × 기본 렌트일 7일"),
    ).toBeVisible();
    expect(textbox("보증금")).toHaveValue("3,500");
  });

  it("기간 옵션은 시드 `presets` — 정가보다 싼 총액이면 할인율", () => {
    renderEdit("P-001");

    const first = screen.getByRole("group", { name: "기간 옵션 1" });
    expect(within(first).getByText("1개월")).toBeVisible();
    /* 39,000 × 30 = 1,170,000 · 총액 1,111,500 */
    expect(within(first).getByText("1,170,000원")).toBeVisible();
    expect(within(first).getByText("1,111,500원")).toBeVisible();
    expect(within(first).getByText("5% 할인")).toBeVisible();

    const second = screen.getByRole("group", { name: "기간 옵션 2" });
    expect(within(second).getByText("1개월 20일")).toBeVisible();
    expect(within(second).getByText("10% 할인")).toBeVisible();
  });

  it("렌트 수량 3 → 슬롯 P-001-01~03, 시드가 중지한 3번은 신규 예약 제외", () => {
    renderEdit("P-001");
    const slots = screen.getByRole("list", { name: "렌트 슬롯" });

    expect(
      within(slots)
        .getAllByRole("listitem")
        .map((item) => item.firstChild?.textContent),
    ).toEqual(["P-001-01", "P-001-02", "P-001-03"]);
    expect(
      within(
        screen.getByRole("radiogroup", { name: "P-001-03 상태" }),
      ).getByRole("radio", { name: "중지" }),
    ).toBeChecked();
    expect(within(slots).getAllByText("신규 예약 제외")).toHaveLength(1);
  });

  it("상품 주요정보 — 성장단계 · 인증 · 고시(「KC 인증 유무」 행은 걸러낸다) · 등록 주체 칸 없음", () => {
    renderEdit("P-001");

    expect(
      screen.getByRole("combobox", { name: /성장단계/ }),
    ).toHaveTextContent("영아 (4~12개월)");
    expect(
      screen.getByRole("combobox", { name: "인증 1 유형" }),
    ).toHaveTextContent("어린이제품 안전확인");
    expect(textbox("인증 1 인증번호")).toHaveValue("CB-B2026-1102");
    expect(textbox("품명 및 모델명 내용")).toHaveValue(
      "스토케 트립트랩 하이체어 TT-24",
    );
    expect(textbox("품질보증기준 내용")).toHaveValue("상품상세참조");
    expect(textbox("품질보증기준 내용")).toBeDisabled();
    expect(screen.queryByText("KC 인증 유무")).toBeNull();
    expect(screen.queryByRole("combobox", { name: /등록 주체/ })).toBeNull();
  });

  it("상세설명은 HTML 시드를 평문으로 · 옵션은 1축 「옵션」 으로 접고 옵션가·재고를 싣는다", () => {
    renderEdit("P-001");

    const detail = screen.getByRole("textbox", { name: "상세설명" });
    expect((detail as HTMLTextAreaElement).value).toContain(
      "스토케 트립트랩 하이체어\n\n소재 : 친환경 ABS",
    );
    expect((detail as HTMLTextAreaElement).value).not.toMatch(/<\/?[a-z]/);

    expect(textbox("옵션 1 옵션명")).toHaveValue("옵션");
    expect(textbox("옵션 1 옵션값")).toHaveValue("모빌");
    expect(textbox("모빌 옵션가")).toHaveValue("15,000");
    const row = textbox("모빌 옵션가").closest("tr") as HTMLElement;
    /* 시드 옵션 재고 0 → 품절(원본 캡처와 같다) */
    expect(within(row).getByText("품절")).toBeVisible();
    expect(textbox("검색 태그")).toHaveValue("하이체어, 이유식, 원목");
  });

  it("배송 — 택배사 · 배송비 · 무료 회수 배송비(잠김)", () => {
    renderEdit("P-001");

    expect(screen.getByRole("combobox", { name: "택배사" })).toHaveTextContent(
      "CJ대한통운",
    );
    expect(textbox("배송비")).toHaveValue("3,000");
    expect(textbox("회수 배송비")).toBeDisabled();
    expect(
      screen.getByRole("checkbox", { name: "회수 배송비 무료" }),
    ).toBeChecked();
  });

  it("방문 수령·공항 픽업을 쓰는 상품은 주소록에서 고른 주소가 붙어 열린다", () => {
    renderEdit("P-002");
    const ship = section(/^배송/);

    expect(within(ship).getByText("리틀베이비 출고지")).toBeVisible();
    expect(within(ship).getByText("공항 픽업존 (인천 T1)")).toBeVisible();
    expect(textbox("픽업 요금")).toHaveValue("5,000");
    expect(textbox("공항 반납 요금")).toHaveValue("7,000");
  });

  it.each([
    ["없는 상품 id", "P-999"],
    [
      "본사 직영 상품 — 셀러 목록에서 빠진 상품은 상세로도 열지 않는다",
      "P-100",
    ],
    ["경로 조각이 하나가 아닐 때", "아무거나/P-001"],
  ])("%s 이면 찾을 수 없다고 하고 목록으로 돌려보낸다", async (_, id) => {
    const { user, onNavSelect } = renderEdit(id);

    expect(screen.getByText("찾을 수 없는 상품입니다")).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "상품 관리 목록으로" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });
});

describe("노출 관리 — 판매 상태 (원본 `prodSaleStat` · 잠금 → 초안 → 품절 → 세그먼트)", () => {
  it("판매중 상품은 판매중/판매중지 · 전시중/전시중지 세그먼트", () => {
    renderEdit("P-001");
    const display = section(/노출 관리/);

    expect(
      within(
        within(display).getByRole("radiogroup", { name: "판매 상태" }),
      ).getByRole("radio", { name: "판매중" }),
    ).toBeChecked();
    expect(
      within(display).getByRole("radiogroup", { name: "전시 상태" }),
    ).toBeVisible();
  });

  /** 반려는 판매와 전시를 같이 내린다 — 전시만 열면 «반려인데 전시중» 이 생긴다 */
  it("반려 — 배지 · 안내 · 사유(경고색)·처리 시각 · 전시도 잠금 · [재심사 요청]이 주 버튼", async () => {
    const { user } = renderEdit("P-300");
    const display = section(/노출 관리/);

    expect(within(display).getByText("반려")).toBeVisible();
    expect(
      within(display).getByText(/하단 바의 \[재심사 요청\]을 눌러주세요/),
    ).toBeVisible();
    const reason = within(display).getByText(/KC 안전확인신고 인증서류 미첨부/);
    expect(reason.className.split(/\s+/)).toContain("text-text-warning");
    expect(within(display).getByText("(2026.06.12 10:24:11)")).toBeVisible();
    expect(
      within(display).queryByRole("radiogroup", { name: "판매 상태" }),
    ).toBeNull();
    expect(
      within(display).queryByRole("radiogroup", { name: "전시 상태" }),
    ).toBeNull();
    expect(
      within(display).getByText(
        "반려된 상품이라 전시 상태를 바꿀 수 없습니다.",
      ),
    ).toBeVisible();

    expect(barButtons()).toEqual(["목록", "취소", "수정 저장", "재심사 요청"]);
    expect(primaries()).toEqual(["재심사 요청"]);

    /* 퍼블은 저장하지 않는다 — 알림만, 머리 배지는 그대로 */
    await user.click(screen.getByRole("button", { name: "재심사 요청" }));
    expect(
      await screen.findByText("재심사를 요청했습니다. 본사 판단을 기다립니다."),
    ).toBeVisible();
    expect(within(header()).getByText("반려")).toBeVisible();
  });

  it("재심사요청 — 잠긴 채 기다리라는 안내 · [재심사 요청]은 또 내지 않는다", () => {
    renderEdit("P-303");
    const display = section(/노출 관리/);

    expect(within(display).getByText("재심사요청")).toBeVisible();
    expect(
      within(display).getByText(/재심사를 요청해 두었으니 본사 판단을 기다려/),
    ).toBeVisible();
    expect(barButtons()).toEqual(["목록", "취소", "수정 저장"]);
    expect(primaries()).toEqual(["수정 저장"]);
  });

  it("임시저장 초안 — 배지 + 안내(실제 버튼 [수정 저장]을 가리킨다) · [임시저장] 이 있다", async () => {
    const { user, onNavSelect } = renderEdit("P-310");
    const display = section(/노출 관리/);

    expect(within(display).getByText("임시저장")).toBeVisible();
    expect(
      within(display).getByText(/아래 \[수정 저장\]을 누르면 판매중으로/),
    ).toBeVisible();
    expect(
      within(display).queryByRole("radiogroup", { name: "판매 상태" }),
    ).toBeNull();
    expect(barButtons()).toEqual(["목록", "임시저장", "취소", "수정 저장"]);
    expect(primaries()).toEqual(["수정 저장"]);

    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(await screen.findByText("임시저장되었습니다.")).toBeVisible();
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });

  it("품절(판매 · 재고 0) — 배지 + 안내 · [판매중지] 를 누르면 세그먼트가 판매중지로", async () => {
    const { user } = renderEdit("P-061");
    const display = section(/노출 관리/);

    expect(within(display).getByText("품절")).toBeVisible();
    expect(
      within(display).getByText(/판매 재고가 0개라 품절입니다/),
    ).toBeVisible();

    await user.click(within(display).getByRole("button", { name: "판매중지" }));
    expect(
      within(
        within(display).getByRole("radiogroup", { name: "판매 상태" }),
      ).getByRole("radio", { name: "판매중지" }),
    ).toBeChecked();
  });

  /** 품절은 고르는 값이 아니라 재고에서 나온다 — 재고를 채우면 그 자리에서 판매중 */
  it("품절 상품에 재고를 채우면 판매중 세그먼트로 돌아온다", async () => {
    const { user } = renderEdit("P-061");

    await user.type(textbox("재고 수량"), "5");
    expect(
      within(
        within(section(/노출 관리/)).getByRole("radiogroup", {
          name: "판매 상태",
        }),
      ).getByRole("radio", { name: "판매중" }),
    ).toBeChecked();
  });
});

describe("상품 등록 폼 — 원본 `_pfDefaults`", () => {
  it("빈 칸 · 렌트 · 판매중/전시중 · [임시저장] + [저장하기]", () => {
    renderNew();

    expect(screen.getByRole("heading", { name: "상품 등록 폼" })).toBeVisible();
    expect(textbox(/상품명/)).toHaveValue("");
    expect(screen.getByRole("radio", { name: "렌트" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "대분류" })).toHaveTextContent(
      "대분류 선택",
    );
    expect(
      within(section(/가격 · 렌트 기간/)).getByText("0원/일"),
    ).toBeVisible();
    expect(barButtons()).toEqual(["목록", "임시저장", "취소", "저장하기"]);
    expect(primaries()).toEqual(["저장하기"]);
  });

  it("빈 채로 [저장하기] — 칸마다 오류(Q-63 보증금 포함) · 첫 오류로 이동 · 목록으로 가지 않는다", async () => {
    const { user, onNavSelect } = renderNew();

    await user.click(screen.getByRole("button", { name: "저장하기" }));

    for (const message of [
      "상품명을 입력해주세요.",
      "카테고리(대분류)를 선택해주세요.",
      "렌트료를 입력해주세요.",
      "보증금을 입력해 주세요.",
      "렌트 수량을 입력해주세요.",
      "성장단계를 선택해주세요.",
      "인증 정보를 1행 이상 선택해주세요(비대상 품목은 ‘해당없음’).",
    ])
      expect(screen.getByText(message)).toBeVisible();
    await waitFor(() => expect(textbox(/상품명/)).toHaveFocus());
    expect(onNavSelect).not.toHaveBeenCalled();
  });

  it("[임시저장]은 상품명만 받는다 — 없으면 알림, 있으면 새 id 로 알리고 목록으로", async () => {
    const { user, onNavSelect } = renderNew();

    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(
      await screen.findByText(
        "상품명을 입력해주세요 — 임시저장에도 이름은 필요합니다.",
      ),
    ).toBeVisible();
    expect(onNavSelect).not.toHaveBeenCalled();

    await user.type(textbox(/상품명/), "새 유모차");
    await user.click(screen.getByRole("button", { name: "임시저장" }));
    expect(
      await screen.findByText(
        "P-312 상품이 임시저장되었습니다. 등록을 마치면 판매가 시작됩니다.",
      ),
    ).toBeVisible();
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });

  it("렌트 슬롯은 id 가 생기기 전이라 `P-신규-NN` (원본 그대로)", async () => {
    const { user } = renderNew();

    await user.type(textbox("렌트 수량"), "2");
    expect(screen.getByText("P-신규-02")).toBeVisible();
  });
});

describe("저장 검사 — 원본 `pfValidate` + Q-63", () => {
  it("검사를 통과하면 알리고 목록으로 간다", async () => {
    const { user, onNavSelect } = renderEdit("P-001");

    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(
      await screen.findByText("상품 정보가 수정되었습니다."),
    ).toBeVisible();
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });

  it("Q-63 — 렌트 보증금 0원은 막고 그 칸으로 간다 · 섹션이 접혀 있으면 펼친다", async () => {
    const { user, onNavSelect } = renderEdit("P-001");

    await user.clear(textbox("보증금"));
    await user.type(textbox("보증금"), "0");
    await user.click(
      screen.getByRole("button", { name: "가격 · 렌트 기간 접기" }),
    );
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(await screen.findByText("보증금을 입력해 주세요.")).toBeVisible();
    await waitFor(() => expect(textbox("보증금")).toHaveFocus());
    expect(onNavSelect).not.toHaveBeenCalled();
  });

  it("판매 상품에는 보증금 검사가 없다(보증금 칸 자체가 없다)", async () => {
    const { user, onNavSelect } = renderEdit("P-009");

    expect(screen.queryByRole("textbox", { name: "보증금" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });

  it("공항 픽업을 켜면 주소가 필요하고, 공항 픽업 주소록에서 고르면 붙는다", async () => {
    const { user } = renderEdit("P-001");

    await user.click(
      screen.getByRole("checkbox", { name: /공항 픽업 추가 제공/ }),
    );
    await user.click(screen.getByRole("button", { name: "수정 저장" }));
    expect(screen.getByText("공항 픽업 주소를 선택해주세요.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "공항 픽업 주소록" }));
    const dialog = screen.getByRole("dialog", { name: "주소록" });
    await user.click(
      within(dialog).getByRole("button", {
        name: "공항 픽업존 (김포 국내선) 선택",
      }),
    );

    expect(
      await screen.findByText("공항 픽업 주소가 선택되었습니다."),
    ).toBeVisible();
    expect(
      within(section(/^배송/)).getByText("공항 픽업존 (김포 국내선)"),
    ).toBeVisible();
    expect(screen.queryByText("공항 픽업 주소를 선택해주세요.")).toBeNull();
  });
});

describe("유형 · 이동", () => {
  it("유형을 바꾸면 카테고리를 비우고, 가격·수량 섹션이 그 유형 것으로 바뀐다", async () => {
    const { user } = renderEdit("P-001");

    await user.click(screen.getByRole("radio", { name: "판매" }));

    expect(screen.getByRole("combobox", { name: "대분류" })).toHaveTextContent(
      "대분류 선택",
    );
    expect(screen.getByText("카테고리 (판매)")).toBeVisible();
    expect(screen.getByRole("heading", { name: /^가격/ })).toBeVisible();
    expect(screen.getByRole("heading", { name: /재고 수량/ })).toBeVisible();
  });

  /** 원본은 「대분류 선택」 으로 보이면서 다른 유형의 값이 남아 검사를 통과한다 */
  it("그 유형의 트리에 없는 카테고리(P-311 렌트 · 판매 분류)는 빈 대분류로 연다", () => {
    renderEdit("P-311");

    expect(screen.getByRole("combobox", { name: "대분류" })).toHaveTextContent(
      "대분류 선택",
    );
  });

  it.each(["목록", "취소"])("[%s] 은 확인 없이 목록으로 간다", async (name) => {
    const { user, onNavSelect } = renderEdit("P-001");

    await user.click(screen.getByRole("button", { name }));
    expect(onNavSelect).toHaveBeenCalledWith("/products");
  });

  /** 주소만 바뀌어 다른 상품으로 가면 처음부터 — A→B→A 로 돌아와도 고친 값이 되살아나지 않는다 */
  it("다른 상품으로 갔다 와도 고친 값이 따라가지 않는다", async () => {
    const { user } = renderEdit("P-001");

    await user.clear(textbox(/상품명/));
    await user.type(textbox(/상품명/), "고친 이름");

    act(() => navigate("/products/P-002"));
    expect(textbox(/상품명/)).toHaveValue("부가부 폭스3 디럭스 유모차");

    act(() => navigate("/products/P-001"));
    expect(textbox(/상품명/)).toHaveValue("스토케 트립트랩 하이체어");
  });
});
