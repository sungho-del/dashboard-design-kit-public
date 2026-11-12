import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import { SELLER_GNB_SECTIONS } from "../sellerGnbSections";
import { DIRECT_HIDDEN, directSections, withDirect } from "./sellerAccount";
import type { SellerNavProps } from "./SettleParts";
import { OpsCalendarPage, StorePage } from "./SystemPages";

/* -------------------------------------------------------------------------
 * 스토어 정보 · 설정 · 공휴일 관리 — 원본 캡처 `orig/46_store` · `47_opsCalendar`(2026년 10건).
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

function renderPage(Page: ComponentType<SellerNavProps>) {
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <Page
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}
const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("스토어 정보 · 설정", () => {
  it("판매자 정보는 읽기 · 고객 센터 정보만 입력 · [저장] 알림", async () => {
    const { user } = renderPage(StorePage);
    expect(screen.getByText("201-81-45123")).toBeInTheDocument();
    expect(screen.getByText("우리은행 1002-***-******")).toBeInTheDocument();
    expect(screen.getByText("본사 관리 · 읽기 전용")).toBeInTheDocument();
    const phone = screen.getByRole("textbox", { name: /상담 전화 번호/ });
    expect(phone).toHaveValue("02-1234-5678");
    await user.clear(phone);
    await user.type(phone, "02-555-0000");
    expect(phone).toHaveValue("02-555-0000");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(
      await screen.findByText("설정이 저장되었습니다."),
    ).toBeInTheDocument();
  });

  it("[1:1 문의로 정보 변경 요청] → 1:1 문의", async () => {
    const { user, onNavSelect } = renderPage(StorePage);
    await user.click(
      screen.getByRole("button", { name: "1:1 문의로 정보 변경 요청" }),
    );
    expect(onNavSelect).toHaveBeenCalledWith("/seller-ask");
  });
});

describe("공휴일 관리", () => {
  it("2026년 10건 — 본사 8 + 자사 2, 원본 순서 · 본사분은 체크박스·[수정] 잠금", () => {
    renderPage(OpsCalendarPage);
    expect(screen.getByText("목록 (총 10건)")).toBeInTheDocument();
    const rows = bodyRows();
    expect(within(rows[0]).getByText("물류센터 정기 점검")).toBeInTheDocument();
    expect(
      within(rows[2]).getByText("2026.08.03 ~ 2026.08.07"),
    ).toBeInTheDocument();
    expect(within(rows[0]).getByRole("checkbox")).toBeDisabled();
    expect(
      within(rows[0]).getByRole("button", { name: /수정/ }),
    ).toBeDisabled();
    expect(within(rows[2]).getByRole("checkbox")).toBeEnabled();
    expect(within(rows[2]).getByRole("button", { name: /수정/ })).toBeEnabled();
  });

  it("[선택 삭제] — 고른 것이 없으면 막고, 고르면 확인 창 → 알림", async () => {
    const { user } = renderPage(OpsCalendarPage);
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));
    expect(
      await screen.findByText("선택된 공휴일이 없습니다."),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("checkbox", { name: "자사 등록분 전체 선택" }),
    );
    await user.click(screen.getByRole("button", { name: "선택 삭제" }));
    const dialog = screen.getByRole("dialog", { name: "공휴일 삭제 (2건)" });
    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    expect(await screen.findByText("2건 삭제되었습니다.")).toBeInTheDocument();
  });

  it("등록 창 — 시작일 · 내용 검사(원본 문구)", async () => {
    const { user } = renderPage(OpsCalendarPage);
    await user.click(screen.getByRole("button", { name: "공휴일 등록" }));
    const dialog = screen.getByRole("dialog", { name: "공휴일 등록 · 자사" });
    await user.click(within(dialog).getByRole("button", { name: "등록" }));
    expect(
      await screen.findByText("시작일을 선택해주세요."),
    ).toBeInTheDocument();
  });

  it("자사분 [수정] — 저장값으로 열린다", async () => {
    const { user } = renderPage(OpsCalendarPage);
    await user.click(
      screen.getByRole("button", { name: "하계 휴무 (출고·수거 중단) 수정" }),
    );
    const dialog = screen.getByRole("dialog", { name: "공휴일 수정 · 자사" });
    expect(
      within(dialog).getByDisplayValue("하계 휴무 (출고·수거 중단)"),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "저장" }));
    expect(await screen.findByText("수정되었습니다.")).toBeInTheDocument();
  });
});

describe("직영 계정 미리보기 (D-337 · Q-69 · ?account=direct)", () => {
  afterEach(() => act(() => navigate("/")));

  it("사이드바에서 7개 메뉴를 뺀다 — 정산 그룹엔 보증금 내역만", () => {
    const ids = directSections(SELLER_GNB_SECTIONS).flatMap((g) =>
      g.items.map((i) => i.id),
    );
    for (const id of DIRECT_HIDDEN) expect(ids).not.toContain(id);
    const settle = directSections(SELLER_GNB_SECTIONS).find(
      (g) => g.id === "g-settle",
    );
    expect(settle?.items.map((i) => i.id)).toEqual(["/rent-deposit"]);
  });

  it("이동할 때 표식을 잇는다", () => {
    expect(withDirect("/rent-use")).toBe("/rent-use?account=direct");
    expect(withDirect("/rent-use?preview=empty")).toBe(
      "/rent-use?preview=empty&account=direct",
    );
    expect(withDirect("/x?account=direct")).toBe("/x?account=direct");
  });

  it("스토어 — 안내가 바뀌고 [1:1 문의로 정보 변경 요청]이 빠진다", () => {
    act(() => navigate("/store?account=direct"));
    renderPage(StorePage);
    /* develop 문구(개발 요청 42번) — 굵은 낱말로 갈라져 문단으로 본다 */
    expect(
      screen.getByText(/본사가 관리/, { selector: "b, strong" }).closest("p"),
    ).toHaveTextContent(
      "스토어 정보(상호·대표자·사업자등록번호·정산 계좌·연락처·소개)는 본사가 관리합니다. 본사 어드민 [셀러 관리]에서 수정합니다.",
    );
    expect(
      screen.getByText(/플랫폼 공통/, { selector: "b, strong" }).closest("p"),
    ).toHaveTextContent(
      "본문 수정이 필요하면 본사 어드민 [약관 관리]에서 수정합니다.",
    );
    expect(
      screen.queryByRole("button", { name: "1:1 문의로 정보 변경 요청" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "상품 관리" })).toBeNull();
  });
});
