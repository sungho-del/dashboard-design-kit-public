import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { claimBlocksOf } from "./claim.data";
import { pointOf } from "./orderUnit.data";
import {
  RentCancelDetailPage,
  RentInspDetailPage,
  RentOrderDetailPage,
  RentRmaDetailPage,
  RentShipDetailPage,
  RentUseDetailPage,
  type RentDetailPageProps,
} from "./RentDetailPages";
import { UNITS } from "./seed/orders.data";

/* -------------------------------------------------------------------------
 * 렌트 상세 6종 — 원본 v0.4 값(캡처 `orig/17·19·21·23·25·27`) · 중간 구역 · 게이트 · 렌트 명세.
 * 기획 변경: 네이버페이(보드 01) · 추가 연락처(보드 02) · 수거 요청사항(보드 08) · 환급 경로 문구(보드 01) ·
 * 포인트 복구(D-312) · 이상없음/안심케어 반려 결함 수정(GPT 검토).
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
  /* jsdom 에는 미리보기 주소가 없다 */
  URL.createObjectURL = vi.fn(() => "blob:preview");
  URL.revokeObjectURL = vi.fn();
});
afterAll(() => vi.unstubAllGlobals());

function renderAt(Page: ComponentType<RentDetailPageProps>, path: string) {
  navigate(path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/rent-list"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

const valueOf = (label: string) =>
  screen.getByText(label, { selector: "dt, span, div" }).parentElement!;
const sectionTitles = () =>
  screen
    .getAllByRole("button", { name: / 접기$/ })
    .map((b) => b.getAttribute("aria-label")!.replace(/ 접기$/, ""))
    .filter((t) => t !== "메뉴");
const barButtons = () =>
  within(
    screen.getByRole("button", { name: "목록" }).parentElement!
      .lastElementChild as HTMLElement,
  )
    .getAllByRole("button")
    .map((b) => b.textContent);
const dialog = (name: string) => screen.getByRole("dialog", { name });
/** 구역 카드 — 접기 버튼에서 카드까지 */
const sectionOf = (title: string) =>
  screen
    .getByRole("button", { name: `${title} 접기` })
    .closest("[aria-busy]") as HTMLElement;

describe("RentOrderDetailPage — 렌트 발주 관리 상세", () => {
  const PATH = "/rent-list/20260624225758-1";

  it("구역 순서(출고 이미지가 상품정보 다음) · 하단 버튼 · 원본 값", () => {
    renderAt(RentOrderDetailPage, PATH);
    expect(sectionTitles()).toEqual([
      "주문정보",
      "상품정보",
      "출고 이미지",
      "배송정보",
      "배송지 정보",
      "주문 처리 이력",
    ]);
    expect(barButtons()).toEqual([
      "배송지 변경",
      "주문 취소",
      "취소",
      "변경 저장",
    ]);
    expect(valueOf("결제금액")).toHaveTextContent("3,824,000원");
    expect(valueOf("렌트일")).toHaveTextContent("30일 (기간 옵션)");
    expect(valueOf("장기 렌트 할인")).toHaveTextContent(
      "−384,000원 (30일 등록가 3,456,000원)",
    );
    expect(valueOf("구성품")).toHaveTextContent("전용 세척키트 +12,000원/일");
    expect(valueOf("회수 배송비")).toHaveTextContent("5,000원");
    expect(valueOf("대여 시작일")).toHaveTextContent("-");
    /* 보드 02 — 보강 시드 */
    expect(valueOf("추가 연락처")).toHaveTextContent("010-9876-5432");
  });

  it("주문 명세 — 렌트 원가(원/일) → 렌트일 → 소계 … 결제금액 + 별도 보증금", async () => {
    const { user } = renderAt(RentOrderDetailPage, PATH);
    await user.click(screen.getByRole("button", { name: "주문 명세" }));
    const box = dialog("주문 명세 · 20260624225758");
    expect(box).toHaveTextContent("렌트 원가140,000원/일");
    expect(box).toHaveTextContent("장기 렌트 할인");
    expect(box).toHaveTextContent("회수 배송비+5,000원");
    expect(box).toHaveTextContent("결제금액3,824,000원");
    expect(box).toHaveTextContent(
      /보증금결제금액에 포함 안 됨 · 반납 검수 후 환급6,000원/,
    );
  });

  it("송장등록 — 출고 이미지가 없으면 안내 창 · 이미지를 올리면 바로 배송중", async () => {
    const { user } = renderAt(RentOrderDetailPage, PATH);
    await user.click(screen.getByRole("combobox", { name: "택배사" }));
    await user.click(screen.getByRole("option", { name: "CJ대한통운" }));
    await user.type(screen.getByRole("textbox", { name: "송장번호" }), "123");
    await user.click(
      screen.getByRole("button", { name: "송장등록 · 배송처리" }),
    );
    expect(dialog("출고 이미지 등록 안내")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "출고 이미지 등록" }));

    fireEvent.change(screen.getByLabelText("출고 이미지 파일 선택"), {
      target: { files: [new File(["x"], "out.png", { type: "image/png" })] },
    });
    expect(screen.getByRole("img", { name: "출고 이미지 1" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "송장등록 · 배송처리" }),
    );
    expect(
      await screen.findByText("송장 등록 완료 → [배송 관리]로 이동했습니다."),
    ).toBeVisible();
  });
});

describe("RentShipDetailPage — 배송 관리 상세(렌트)", () => {
  it("결제수단 네이버페이(보드 01) · [배송 완료 처리 (대여 시작)] → 대여 시작 창", async () => {
    const { user } = renderAt(
      RentShipDetailPage,
      "/rent-dispatch/20260623452502-1",
    );
    expect(valueOf("결제수단")).toHaveTextContent("네이버페이");
    expect(barButtons()).toEqual([
      "배송 완료 처리 (대여 시작)",
      "배송 추적",
      "취소",
      "변경 저장",
    ]);
    expect(screen.getAllByRole("img", { name: /출고 이미지/ })).toHaveLength(3);
    await user.click(
      screen.getByRole("button", { name: "배송 완료 처리 (대여 시작)" }),
    );
    expect(dialog("배송 완료 (대여 시작) 처리")).toBeVisible();
  });

  it("배송중이 아니면 상태는 배지 · [대여·연체 관리로]", async () => {
    const { user, onNavSelect } = renderAt(
      RentShipDetailPage,
      "/rent-dispatch/20260623493905-1",
    );
    expect(
      screen.queryByRole("combobox", { name: "상품주문상태" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "대여·연체 관리로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/rent-use");
  });
});

describe("RentUseDetailPage — 대여·연체 관리 상세", () => {
  it("상태 배지 · 상품정보 보증금 · 대여 정보(원본 값) · 처리 버튼 없음", () => {
    renderAt(RentUseDetailPage, "/rent-use/20260623493905-1");
    expect(sectionTitles()).toEqual([
      "주문정보",
      "상품정보",
      "대여 정보",
      "배송정보",
      "배송지 정보",
      "주문 처리 이력",
    ]);
    expect(
      screen.queryByRole("combobox", { name: "상품주문상태" }),
    ).not.toBeInTheDocument();
    expect(valueOf("보증금")).toHaveTextContent("3,500원");
    expect(valueOf("보증금 상태")).toHaveTextContent("점유중");
    expect(valueOf("대여 시작")).toHaveTextContent("2026.06.24");
    expect(valueOf("반납 예정일")).toHaveTextContent("2026.09.24");
    expect(valueOf("구성품")).toHaveTextContent("방수커버 +5,000원/일");
    expect(barButtons()).toEqual(["취소", "변경 저장"]);
  });

  it("[수거 신청] — 송장 없음 · 이용 종료 전이면 막는다", async () => {
    const { user } = renderAt(RentUseDetailPage, "/rent-use/20260623493905-1");
    await user.click(screen.getByRole("button", { name: "수거 신청" }));
    expect(
      await screen.findByText("수거 택배사와 수거 송장번호를 입력해주세요."),
    ).toBeVisible();
    await user.click(screen.getByRole("combobox", { name: "수거 택배사" }));
    await user.click(screen.getByRole("option", { name: "한진택배" }));
    await user.type(
      screen.getByRole("textbox", { name: "수거 송장번호" }),
      "777",
    );
    await user.click(screen.getByRole("button", { name: "수거 신청" }));
    expect(
      await screen.findByText(/이용 종료 전에는 수거 신청할 수 없습니다/),
    ).toBeVisible();
  });

  it("연장 건 — 반납 예정일에 연장 전 예정일", () => {
    renderAt(RentUseDetailPage, "/rent-use/20260626112036-1");
    expect(valueOf("반납 예정일")).toHaveTextContent(
      "2026.08.15 (연장 전 2026.07.15)",
    );
  });
});

describe("RentInspDetailPage — 검수·반납 관리 상세", () => {
  const PATH = "/rent-insp-return/20260621138968-1";

  it("중간 구역 5개(안심케어 가입 건) · 판정 4택 · 정산 원본 값", () => {
    renderAt(RentInspDetailPage, PATH);
    expect(sectionTitles()).toEqual([
      "주문정보",
      "상품정보",
      "대여 정보",
      "검수 판정",
      "보증금 정산",
      "안심케어 청구",
      "상품 상태 이미지",
      "배송정보",
      "배송지 정보",
      "주문 처리 이력",
    ]);
    expect(
      within(screen.getByRole("group", { name: "검수 판정" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(4);
    expect(valueOf("검수 판정")).toHaveTextContent("검수 전");
    expect(sectionOf("보증금 정산")).toHaveTextContent("반환 예정액3,500원");
    expect(screen.getByRole("button", { name: "송장수정" })).toBeVisible();
  });

  it("분실 판정 → 보증금 전액 차감 · 차감 후 환급 창은 사유 필수(환급 경로 문구 보드 01)", async () => {
    const { user } = renderAt(RentInspDetailPage, PATH);
    await user.click(screen.getByRole("button", { name: /^분실/ }));
    expect(sectionOf("보증금 정산")).toHaveTextContent("반환 예정액0원");
    /* 입력칸도 같은 차감액(보증금 전액) */
    expect(screen.getByRole("textbox", { name: "차감액" })).toHaveValue("3500");
    await user.click(screen.getByRole("button", { name: "차감 후 환급 처리" }));
    const box = dialog("보증금 환급 실행");
    expect(box).toHaveTextContent(
      "환급은 결제 카드 결제 취소 경로로 실행됩니다.",
    );
    await user.click(
      within(box).getByRole("button", { name: "차감 후 환급 실행" }),
    );
    expect(await screen.findByText("차감 사유를 입력해주세요.")).toBeVisible();
    await user.type(within(box).getByRole("textbox"), "분실 — 회수 불가");
    await user.click(
      within(box).getByRole("button", { name: "차감 후 환급 실행" }),
    );
    expect(
      await screen.findByText(
        "보증금 차감 후 환급 처리 완료. 반납완료로 전환할 수 있습니다.",
      ),
    ).toBeVisible();
  });

  it("이상없음 — 차감 0 · 차감액 칸 없음(원본 「정상」 결함 수정) · [판정 초기화] 로 다시", async () => {
    const { user } = renderAt(RentInspDetailPage, PATH);
    await user.click(screen.getByRole("button", { name: /^이상없음/ }));
    expect(screen.queryByRole("textbox", { name: "차감액" })).toBeNull();
    expect(screen.getByRole("button", { name: "전액환급 처리" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "판정 초기화 · 다시 선택" }),
    );
    expect(screen.getByRole("group", { name: "검수 판정" })).toBeVisible();
  });

  it("파손(복원가능) · 가입 — 본사 부담(차감 잠김) · 복원비 청구", async () => {
    const { user } = renderAt(RentInspDetailPage, PATH);
    await user.click(
      screen.getByRole("button", { name: /^파손 \(복원가능\)/ }),
    );
    expect(screen.getByText("차감 — 안심케어 본사 부담")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "차감액" })).toBeNull();
    await user.type(screen.getByRole("textbox", { name: "복원 비용" }), "8000");
    await user.click(screen.getByRole("button", { name: "안심케어 청구" }));
    expect(
      await screen.findByText(/안심케어 청구 접수 \(복원비 8,000원\)/),
    ).toBeVisible();
  });

  it("검수완료 셀렉트 — 화면에서 판정한 뒤에는 확인 창으로 통과", async () => {
    const { user } = renderAt(
      RentInspDetailPage,
      "/rent-insp-return/20260601192577-1",
    );
    const select = () => screen.getByRole("combobox", { name: "상품주문상태" });
    await user.click(select());
    await user.click(screen.getByRole("option", { name: "검수완료" }));
    expect(
      await screen.findByText(/검수 판정 후 검수완료로 전환할 수 있습니다/),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^이상없음/ }));
    await user.click(select());
    await user.click(screen.getByRole("option", { name: "검수완료" }));
    expect(dialog("상태 변경 확인")).toBeVisible();
  });

  it("안심케어 반려 · 처리 완료 건 — 반려 사유 · 판정 잠금 · 처리 완료 문구", () => {
    renderAt(RentInspDetailPage, "/rent-insp-return/20260701770022-1");
    expect(screen.getByText(/복원비 5,100원 청구 반려됨/)).toBeVisible();
    expect(
      screen.getByText("반환 처리 완료 후에는 판정을 변경할 수 없습니다."),
    ).toBeVisible();
    expect(
      screen.getByText(/전액환급 처리 완료|차감 후 환급 처리 완료/),
    ).toBeVisible();
  });

  it("미가입 건 — 판정 3택 · 안심케어 구역 없음", () => {
    renderAt(RentInspDetailPage, "/rent-insp-return/20260403645454-1");
    expect(
      within(screen.getByRole("group", { name: "검수 판정" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(3);
    expect(sectionTitles()).not.toContain("안심케어 청구");
  });

  it("수거 요청사항(보드 08) — 손님이 적은 건에만", () => {
    renderAt(RentInspDetailPage, "/rent-insp-return/20260402640037-1");
    expect(valueOf("수거 요청사항")).toHaveTextContent(
      "6/27 숙소 체크아웃 후 수거 부탁드려요 · 반납 신청 2026.06.26",
    );
  });
});

describe("렌트 클레임 상세 — 취소 · 반품", () => {
  it("취소 상세(렌트) — 환불(결제금액 전액) + 보증금 반환 두 결과", () => {
    renderAt(RentCancelDetailPage, "/rent-cancel/20260614150033-1");
    expect(
      screen.getByRole("heading", { name: "취소 상세(렌트)" }),
    ).toBeVisible();
    expect(valueOf("환불 예정액")).toHaveTextContent("6,018,000원");
    expect(valueOf("보증금 반환 예정액")).toBeVisible();
  });

  it("반품 상세(렌트) — 고객 귀책 반품 배송비는 보증금에서 · 「교환으로 변경」 없음", async () => {
    const u = UNITS.find((x) => x.id === "20260618173369-1")!;
    const { user } = renderAt(RentRmaDetailPage, `/rent-rma/${u.id}`);
    expect(valueOf("배송비 부담")).toHaveTextContent("보증금에서 차감");
    expect(valueOf("보증금 반환 완료")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "주문 명세" }));
    expect(dialog(`주문 명세 · ${u.no}`)).toHaveTextContent(
      "편도 · 고객 귀책 · 보증금에서 차감",
    );
  });

  it("판매 경로의 처리단위는 렌트 상세에서 「찾을 수 없음」", () => {
    renderAt(RentCancelDetailPage, "/rent-cancel/20260628200061-1");
    expect(screen.getByText("찾을 수 없는 주문입니다")).toBeVisible();
  });

  it("D-312 — 포인트를 쓴 렌트 취소는 「포인트 복구」 · 판매 취소엔 없다", () => {
    const rentWithPoint = UNITS.find(
      (u) => u.type === "렌트" && pointOf(u) > 0,
    )!;
    const lines = claimBlocksOf({
      ...rentWithPoint,
      req: { type: "취소", reason: "단순변심", stat: "취소 요청" },
    }).flatMap((b) => b.lines);
    expect(lines.find((l) => l.key === "pointRestore")?.value).toBe(
      `${pointOf(rentWithPoint).toLocaleString("ko-KR")}P`,
    );
    const saleCancel = UNITS.filter(
      (u) => u.type === "판매" && u.req?.type === "취소",
    );
    for (const u of saleCancel)
      expect(
        claimBlocksOf(u)
          .flatMap((b) => b.lines)
          .some((l) => l.key === "pointRestore"),
      ).toBe(false);
  });
});
