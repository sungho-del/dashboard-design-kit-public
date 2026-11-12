import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { GateHost } from "./OrderGates";
import { RENT_USE } from "./RentProcessPages.data";
import {
  RentCancelPage,
  RentDispatchPage,
  RentInspReturnPage,
  RentListPage,
  RentRmaPage,
  RentUsePage,
  type RentProcessPageProps,
} from "./RentProcessPages";

/* -------------------------------------------------------------------------
 * 렌트 처리 목록 6장 — 원본 v0.4 카드·열·버튼·게이트.
 * 숫자·열은 원본을 브라우저로 열어 읽은 값이다(캡처 `orig/16·18·20·22·24·26`).
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

function renderPage(Page: ComponentType<RentProcessPageProps>) {
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

const cards = () => screen.getByRole("group", { name: "처리 상태별 건수" });
const cardLabels = () =>
  within(cards())
    .getAllByRole("button")
    .map((b) => b.textContent?.replace(/\s+/g, ""));
const pickCard = (user: ReturnType<typeof userEvent.setup>, name: RegExp) =>
  user.click(within(cards()).getByRole("button", { name }));
const bulkButtons = () =>
  within(screen.getByRole("group", { name: "상태 변경" }))
    .getAllByRole("button")
    .map((b) => b.textContent);
const bulk = (name: string) =>
  within(screen.getByRole("group", { name: "상태 변경" })).getByRole("button", {
    name,
  });
const rows = () =>
  within(screen.getByRole("table")).getAllByRole("row").slice(1);
const rowOf = (no: string) => rows().find((r) => within(r).queryByText(no))!;
const pick = (user: ReturnType<typeof userEvent.setup>, no: string) =>
  user.click(within(rowOf(no)).getByRole("checkbox"));
const headers = () =>
  within(screen.getByRole("table"))
    .getAllByRole("columnheader")
    .slice(1)
    .map((th) => th.textContent?.trim());

/** 원본 캡처 머리(↕ · ? 뗌) — 렌트 금액 3열 · 상품 수량 없음 */
const TAIL = [
  "상품코드",
  "상품명",
  "렌트 원가",
  "할인 금액",
  "렌트가",
  "옵션",
  "옵션 수량",
  "옵션 총액 (정액 1회)",
  "구매자명",
  "구매자 ID",
  "연락처",
  "수령인",
  "수령인 연락처",
  "배송지",
  "배송 메모",
];

describe("RentListPage — 렌트 발주 관리", () => {
  it("카드 원본 건수(신규 11 · 지연 4 · 준비 11) · 신규 주문엔 송장 열 없음 · 원본 열 순서", async () => {
    const { user } = renderPage(RentListPage);
    expect(cardLabels()).toEqual([
      "신규주문11건",
      "배송지연4건",
      "배송준비11건",
    ]);
    expect(headers()).toEqual([
      "No",
      "상태",
      "주문번호",
      "이용 기간",
      "결제금액",
      "결제수단",
      "결제 일시",
      "배송 방법",
      ...TAIL,
    ]);
    await pickCard(user, /배송 준비/);
    expect(headers()).toContain("송장번호");
  });

  it("목록 위 「초과 상태 — 신규 예약 차단 중」 줄 · 자체 수령 준비 행은 [준비 완료] → 상세(개발 요청 27번)", async () => {
    const { user, onNavSelect } = renderPage(RentListPage);
    const notice = screen.getByRole("region", { name: "수량 초과 상품" });
    expect(notice).toHaveTextContent("초과 상태 — 신규 예약 차단 중");
    expect(notice).toHaveTextContent(
      "스토케 트립트랩 하이체어(예약 3건 > 활성 2개) — 기존 예약은 보호되며 신규 예약만 차단됩니다(수량 풀 ㉡).",
    );
    await pickCard(user, /배송 준비/);
    const pickup = rows().find((r) => within(r).queryByText("방문 수령"))!;
    expect(
      within(pickup).getByRole("textbox", { name: /송장번호/ }),
    ).toBeDisabled();
    await user.click(within(pickup).getByRole("button", { name: "준비 완료" }));
    expect(onNavSelect.mock.calls[0][0]).toMatch(/^\/rent-list\//);
  });

  it("첫 행 — 결제금액(명세 식) · 렌트 단가 원/일 · 시작 3일 안이면 ⚠ 경고", () => {
    renderPage(RentListPage);
    const first = rows()[0];
    expect(first).toHaveTextContent("20260624225758");
    expect(first).toHaveTextContent("3,824,000원");
    expect(first).toHaveTextContent("140,000원/일");
    expect(first).toHaveTextContent("128,000원/일");
    /* 2026.06.27 시작 — 기준일 06-29 에서 이미 지났다(3일 안) */
    expect(within(first).getByText("2026.06.27 ~ 2026.09.27")).toHaveClass(
      "text-text-critical",
    );
  });

  it("안심케어 검색 — 가입만 남기면 카드·목록이 같이 줄고 요약에 적힌다", async () => {
    const { user } = renderPage(RentListPage);
    await user.click(screen.getByRole("combobox", { name: "안심케어" }));
    await user.click(screen.getByRole("option", { name: "가입" }));
    expect(screen.getAllByText("안심케어 가입").length).toBeGreaterThan(0);
    expect(rows().every((r) => within(r).queryByText("안심케어"))).toBe(true);
  });

  it("배송 준비 — 목록은 이미지 장수를 몰라 안내 창을 늘 연다(첫 줄 develop 문구 · 개발 요청 28번) · [배송 준비로 변경] 은 원래 전이 알림", async () => {
    const { user } = renderPage(RentListPage);
    await pick(user, "20260624225758");
    await user.click(bulk("배송 준비"));
    expect(
      screen.getByRole("dialog", { name: "출고 이미지 등록 안내" }),
    ).toHaveTextContent("출고 이미지 등록 여부를 확인해주세요.");
    await user.click(screen.getByRole("button", { name: "배송 준비로 변경" }));
    expect(
      await screen.findByText("'배송 준비' 상태로 변경했습니다."),
    ).toBeVisible();
  });

  it("여러 건이면 「고른 N건의 출고 이미지 등록 여부를 확인해주세요.」(개발 요청 28번)", async () => {
    const { user } = renderPage(RentListPage);
    await user.click(within(rows()[0]).getByRole("checkbox"));
    await user.click(within(rows()[1]).getByRole("checkbox"));
    await user.click(bulk("배송 준비"));
    expect(
      screen.getByRole("dialog", { name: "출고 이미지 등록 안내" }),
    ).toHaveTextContent("고른 2건의 출고 이미지 등록 여부를 확인해주세요.");
  });

  it("출고 이미지 안내 [출고 이미지 등록] — 1건이면 그 상세의 출고 이미지 자리로", async () => {
    const { user, onNavSelect } = renderPage(RentListPage);
    await pick(user, "20260624225758");
    await user.click(bulk("배송 준비"));
    await user.click(screen.getByRole("button", { name: "출고 이미지 등록" }));
    expect(onNavSelect).toHaveBeenCalledWith(
      "/rent-list/20260624225758-1?section=shipimg",
    );
  });

  it("행 [송장등록] — 송장을 다 적어도 출고 이미지가 없으면 안내 창이 먼저(배송중으로 변경)", async () => {
    const { user } = renderPage(RentListPage);
    await pickCard(user, /배송 준비/);
    const row = rowOf("20260624119787");
    await user.click(within(row).getByRole("combobox", { name: /택배사/ }));
    await user.click(screen.getByRole("option", { name: "CJ대한통운" }));
    await user.type(
      within(row).getByRole("textbox", { name: /송장번호/ }),
      "123456",
    );
    await user.click(within(row).getByRole("button", { name: "송장등록" }));
    await user.click(screen.getByRole("button", { name: "배송중으로 변경" }));
    expect(
      await screen.findByText("송장 등록 완료 → [배송 관리]로 이동했습니다."),
    ).toBeVisible();
  });

  it("주문 취소 — 셀러 직권 취소 사유 창(판매와 같은 창)", async () => {
    const { user } = renderPage(RentListPage);
    await pick(user, "20260624225758");
    await user.click(bulk("주문 취소"));
    expect(
      screen.getByRole("dialog", { name: "주문 취소 사유" }),
    ).toBeVisible();
  });
});

describe("RentDispatchPage — 배송 관리(렌트)", () => {
  it("카드 한 장(배송중 16) · 상태 머리 도움말 · 출고 송장 수정", () => {
    renderPage(RentDispatchPage);
    expect(cardLabels()).toEqual(["배송중16건"]);
    expect(screen.getByLabelText("상태 도움말")).toBeInTheDocument();
    expect(
      within(rows()[0]).getByRole("button", { name: "송장수정" }),
    ).toBeVisible();
  });

  it("[배송 완료 (대여 시작)] — 대여 시작 기산 고지 창 → 완료 알림", async () => {
    const { user } = renderPage(RentDispatchPage);
    await pick(user, "20260623452502");
    await user.click(bulk("배송 완료 (대여 시작)"));
    const dialog = screen.getByRole("dialog", {
      name: "배송 완료 (대여 시작) 처리",
    });
    expect(dialog).toHaveTextContent("대여 시작일");
    await user.click(
      within(dialog).getByRole("button", { name: "배송 완료 처리" }),
    );
    expect(
      await screen.findByText(
        "배송 완료 (대여 시작) → [대여·연체 관리]로 이동했습니다.",
      ),
    ).toBeVisible();
  });

  it("결제수단 — 결제가 네이버페이면 「네이버페이」(기획 보드 01)", () => {
    renderPage(RentDispatchPage);
    expect(rowOf("20260623452502")).toHaveTextContent("네이버페이");
  });
});

describe("RentUsePage — 대여·연체 관리", () => {
  it("자체 수령 행 — 수거 칸 「직접 반납」 + [반납 확인](이용 종료 전엔 잠김 · 개발 요청 30번)", () => {
    renderPage(RentUsePage);
    const row = rowOf("20260507560696");
    expect(row).toHaveTextContent("직접 반납");
    expect(
      within(row).getByRole("button", { name: "반납 확인" }),
    ).toBeDisabled();
    expect(
      within(row).queryByRole("textbox", { name: /수거 송장번호/ }),
    ).toBeNull();
  });

  it("[반납 확인] 창 — develop 문구 · 확인하면 검수중으로", async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const u = RENT_USE.units.find((x) => x.shipWay === "방문 수령")!;
    render(
      <ToastProvider position="bottom">
        <GateHost
          gate={{ kind: "returnConfirm", ids: [u.id] }}
          units={[u]}
          onClose={vi.fn()}
          onDone={onDone}
        />
      </ToastProvider>,
    );
    const dialog = screen.getByRole("dialog", { name: "반납 확인" });
    expect(dialog).toHaveTextContent(
      "반납 물품을 실제로 받았습니까? 확인하면 즉시 검수중으로 이동합니다.",
    );
    await user.click(within(dialog).getByRole("button", { name: "반납 확인" }));
    expect(onDone).toHaveBeenCalledWith("반납 확인 — 검수중으로 이동했습니다.");
  });

  it("카드 원본 건수 · 상태 버튼 없이 [수거 신청]만 · 대여 시작일 + 수거 열 · 출고 송장 잠김", () => {
    renderPage(RentUsePage);
    expect(cardLabels()).toEqual([
      "대여중10건",
      "연체중3건",
      "대여중(연장)3건",
    ]);
    expect(
      screen.queryByRole("group", { name: "상태 변경" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수거 신청" })).toBeVisible();
    expect(headers().slice(0, 13)).toEqual([
      "No",
      "상태",
      "주문번호",
      "이용 기간",
      "결제금액",
      "대여 시작일",
      "수거 택배사",
      "수거 송장번호",
      "결제수단",
      "결제 일시",
      "배송 방법",
      "택배사",
      "송장번호",
    ]);
    const row = rows()[0];
    expect(
      within(row).getByRole("textbox", { name: /\d 송장번호/ }),
    ).toBeDisabled();
    expect(within(row).getByText("2026.06.24")).toBeVisible();
  });

  it("이용 기간 — 종료 3일 안 「수거 준비」 · 지남 「수거 지연」", async () => {
    const { user } = renderPage(RentUsePage);
    expect(
      within(rowOf("20260502530041")).getByText("수거 준비"),
    ).toBeVisible();
    await pickCard(user, /연체중/);
    expect(within(rows()[0]).getByText("수거 지연")).toBeVisible();
  });

  it("[수거 신청] — 선택 없음 · 송장 없음 · 종료 전 · 통과 알림", async () => {
    const { user } = renderPage(RentUsePage);
    const request = screen.getByRole("button", { name: "수거 신청" });
    await user.click(request);
    expect(await screen.findByText("선택된 항목이 없습니다.")).toBeVisible();

    await pick(user, "20260623493905");
    await user.click(request);
    expect(
      await screen.findByText("수거 택배사와 수거 송장번호를 입력해주세요."),
    ).toBeVisible();

    const row = rowOf("20260623493905");
    await user.click(
      within(row).getByRole("combobox", { name: /수거 택배사/ }),
    );
    await user.click(screen.getByRole("option", { name: "한진택배" }));
    await user.type(
      within(row).getByRole("textbox", { name: /수거 송장번호/ }),
      "777",
    );
    await user.click(request);
    expect(
      await screen.findByText(/이용 종료 전에는 수거 신청할 수 없습니다/),
    ).toBeVisible();
  });

  it("연체중 건은 종료일이 지나 행 [송장등록] 으로 수거 신청된다", async () => {
    const { user } = renderPage(RentUsePage);
    await pickCard(user, /연체중/);
    const row = rows()[0];
    await user.click(
      within(row).getByRole("combobox", { name: /수거 택배사/ }),
    );
    await user.click(screen.getByRole("option", { name: "우체국" }));
    await user.type(
      within(row).getByRole("textbox", { name: /수거 송장번호/ }),
      "555",
    );
    await user.click(within(row).getByRole("button", { name: "송장등록" }));
    expect(
      await screen.findByText(/수거 송장 등록 완료 → \[검수·반납 관리\]/),
    ).toBeVisible();
  });
});

describe("RentInspReturnPage — 검수·반납 관리", () => {
  it("카드 원본 건수 · 수거 신청 버튼 둘 · 수거 송장은 수거 신청 건만 [송장수정]", async () => {
    const { user } = renderPage(RentInspReturnPage);
    expect(cardLabels()).toEqual([
      "수거신청4건",
      "검수중7건",
      "검수완료5건",
      "반납완료6건",
    ]);
    expect(bulkButtons()).toEqual(["검수중", "연체중 (회수 실패)"]);
    expect(
      within(rows()[0]).getByRole("button", { name: "송장수정" }),
    ).toBeVisible();
    await pickCard(user, /검수중/);
    expect(
      within(rows()[0]).queryByRole("button", { name: "송장수정" }),
    ).not.toBeInTheDocument();
  });

  it("연체중 (회수 실패) — 수거 신청 건이면 창 없이 완료 알림", async () => {
    const { user } = renderPage(RentInspReturnPage);
    await pick(user, "20260621138968");
    await user.click(bulk("연체중 (회수 실패)"));
    expect(
      await screen.findByText(
        "연체 처리되었습니다 — [대여·연체 관리]로 이동했습니다.",
      ),
    ).toBeVisible();
  });

  it("검수완료 — 미판정뿐이면 막는다", async () => {
    const { user } = renderPage(RentInspReturnPage);
    await pickCard(user, /검수중/);
    await pick(user, "20260601192577");
    await user.click(bulk("검수완료"));
    expect(
      await screen.findByText(/검수 판정 후 검수완료로 전환할 수 있습니다/),
    ).toBeVisible();
  });

  it("반납완료 — 보증금 처리 안 된 건은 막고, 매출 확정 고지 창은 처리된 건만", async () => {
    const { user } = renderPage(RentInspReturnPage);
    await pickCard(user, /검수완료/);
    await pick(user, "20260610176468");
    await user.click(bulk("반납완료"));
    expect(
      await screen.findByText(/보증금 반환·청구 처리 완료 후 반납완료로/),
    ).toBeVisible();
  });
});

describe("RentCancelPage · RentRmaPage — 렌트 클레임", () => {
  it("취소 카드 원본 건수(2 · 2 · 3) · 출고 송장 읽기(버튼 없음)", () => {
    renderPage(RentCancelPage);
    expect(cardLabels()).toEqual([
      "취소요청2건",
      "환불처리중2건",
      "취소완료3건",
    ]);
    expect(bulkButtons()).toEqual(["환불 처리중"]);
    const row = rows()[0];
    expect(
      within(row).getByRole("textbox", { name: /송장번호/ }),
    ).toBeDisabled();
    expect(
      within(row).queryByRole("button", { name: "송장등록" }),
    ).not.toBeInTheDocument();
  });

  it("반품 버킷(2 · 3 · 2) · 「교환으로 변경」 없음 · 접수 [반품 승인] [반품 거부]", async () => {
    const { user } = renderPage(RentRmaPage);
    expect(cardLabels()).toEqual(["접수2건", "진행3건", "완료2건"]);
    expect(bulkButtons()).toEqual(["반품 승인", "반품 거부"]);
    await pickCard(user, /진행/);
    expect(bulkButtons()).toEqual([
      "반품 수거완료",
      "반품 검수",
      "환불 처리중",
      "반품 완료",
    ]);
    expect(screen.queryByText("교환으로 변경")).not.toBeInTheDocument();
  });

  it("렌트 반품 [환불 처리중] — 명세는 보증금 반환(반품 배송비 보증금에서 차감 없음 · 판매자 귀책)", async () => {
    const { user } = renderPage(RentRmaPage);
    await pickCard(user, /진행/);
    await pick(user, "20260620338890");
    await user.click(bulk("환불 처리중"));
    const dialog = screen.getByRole("dialog", { name: "환불 처리" });
    expect(dialog).toHaveTextContent("보증금 반환 예정액");
    expect(dialog).not.toHaveTextContent("반품 배송비");
  });
});
