import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import {
  SellerAskPage,
  SellerNoticePage,
  SellerReviewsPage,
  SupportPage,
} from "./BoardPages";
import type { SellerNavProps } from "./SettleParts";

/* -------------------------------------------------------------------------
 * 게시판 관리 4목록 — 건수·열·행은 원본 캡처 `orig/38·40·42·44`
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

const bodyRows = () => screen.getAllByRole("row").slice(1);
const heads = () =>
  screen.getAllByRole("columnheader").map((th) => th.textContent);

describe("공지사항", () => {
  it("4건 · 원본 열 · 고정 배지는 첫 건만", () => {
    renderAt(SellerNoticePage, "/seller-notice");
    expect(screen.getByText("목록 (총 4건)")).toBeInTheDocument();
    expect(heads().slice(1)).toEqual(["고정", "제목", "내용", "게시일"]);
    const rows = bodyRows();
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("고정")).toBeInTheDocument();
    expect(within(rows[1]).getByText("-")).toBeInTheDocument();
    expect(within(rows[3]).getByText("2026.06.15")).toBeInTheDocument();
  });

  it("행을 누르면 공지 상세", async () => {
    const { user, onNavSelect } = renderAt(SellerNoticePage, "/seller-notice");
    await user.click(bodyRows()[0]);
    expect(onNavSelect).toHaveBeenCalledWith("/seller-notice/N-S26");
    await user.click(
      screen.getByRole("button", {
        name: "[운영] 여름 성수기 배송 지연 대비 출고 가이드",
      }),
    );
    expect(onNavSelect).toHaveBeenLastCalledWith("/seller-notice/N-S25");
  });

  it("엑셀 — 전체, 고르면 선택분 · 체크박스는 이동하지 않는다", async () => {
    const { user, onNavSelect } = renderAt(SellerNoticePage, "/seller-notice");
    await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
    expect(
      await screen.findByText("4건을 엑셀(CSV)로 다운로드했습니다."),
    ).toBeInTheDocument();
    await user.click(within(bodyRows()[1]).getByRole("checkbox"));
    await user.click(within(bodyRows()[2]).getByRole("checkbox"));
    expect(onNavSelect).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
    expect(
      await screen.findByText("2건을 엑셀(CSV)로 다운로드했습니다. (선택분)"),
    ).toBeInTheDocument();
  });
});

describe("문의 관리", () => {
  it("6건 · 원본 열 · 주문 문의만 주문번호 · 비밀글 표시", () => {
    renderAt(SupportPage, "/support");
    expect(screen.getByText("목록 (총 6건)")).toBeInTheDocument();
    expect(heads().slice(1)).toEqual([
      "유형",
      "회원",
      "상품/주문번호",
      "내용",
      "접수일",
      "상태",
    ]);
    const rows = bodyRows();
    expect(within(rows[0]).getByText("주문 문의")).toBeInTheDocument();
    expect(
      within(rows[0]).getByText("주문번호 20260621452502"),
    ).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/주문번호/)).toBeNull();
    expect(within(rows[2]).getByRole("img", { name: "비밀글" })).toBeVisible();
    expect(within(rows[1]).queryByRole("img", { name: "비밀글" })).toBeNull();
    expect(
      rows.map(
        (row) => within(row).getAllByText(/^(접수|답변완료)$/)[0].textContent,
      ),
    ).toEqual(["접수", "접수", "접수", "답변완료", "답변완료", "답변완료"]);
  });

  it("유형 칩이 행을 거른다 — 주문 2 · 상품 4 · 전체 6", async () => {
    const { user } = renderAt(SupportPage, "/support");
    await user.click(screen.getByRole("radio", { name: "주문 문의" }));
    expect(screen.getByText("목록 (총 2건)")).toBeInTheDocument();
    expect(
      bodyRows().map((row) => within(row).getByText(/문의$/).textContent),
    ).toEqual(["주문 문의", "주문 문의"]);
    await user.click(screen.getByRole("radio", { name: "상품 문의" }));
    expect(screen.getByText("목록 (총 4건)")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "전체" }));
    expect(bodyRows()).toHaveLength(6);
  });

  it("내용을 누르면 문의 상세 · 유형을 바꾸면 선택이 풀린다", async () => {
    const { user, onNavSelect } = renderAt(SupportPage, "/support");
    await user.click(screen.getByRole("button", { name: /벨트 부분 세척은/ }));
    expect(onNavSelect).toHaveBeenCalledWith("/support/Q-8840");
    await user.click(within(bodyRows()[0]).getByRole("checkbox"));
    await user.click(screen.getByRole("radio", { name: "주문 문의" }));
    await user.click(screen.getByRole("button", { name: "엑셀 다운로드" }));
    expect(
      await screen.findByText("2건을 엑셀(CSV)로 다운로드했습니다."),
    ).toBeInTheDocument();
  });
});

describe("리뷰 관리", () => {
  it("3건 · 별점 · 답글 유무 배지", () => {
    renderAt(SellerReviewsPage, "/seller-reviews");
    expect(screen.getByText("목록 (총 3건)")).toBeInTheDocument();
    expect(heads().slice(1)).toEqual([
      "작성자",
      "상품",
      "별점",
      "내용",
      "작성일",
      "답글",
    ]);
    const rows = bodyRows();
    expect(
      within(rows[1]).getByRole("img", { name: "별점 4점 (5점 만점)" }),
    ).toBeInTheDocument();
    expect(
      rows.map((row) => within(row).getByText(/^답글 /).textContent),
    ).toEqual(["답글 대기", "답글 완료", "답글 대기"]);
  });

  it("행을 누르면 리뷰 상세", async () => {
    const { user, onNavSelect } = renderAt(
      SellerReviewsPage,
      "/seller-reviews",
    );
    await user.click(bodyRows()[1]);
    expect(onNavSelect).toHaveBeenCalledWith("/seller-reviews/RV-30");
  });
});

describe("1:1 문의", () => {
  it("2건 · 원본 열 · 상태", () => {
    renderAt(SellerAskPage, "/seller-ask");
    expect(screen.getByText("목록 (총 2건)")).toBeInTheDocument();
    expect(heads().slice(1)).toEqual(["제목", "내용", "접수일", "상태"]);
    const rows = bodyRows();
    expect(within(rows[0]).getByText("답변완료")).toBeInTheDocument();
    expect(within(rows[1]).getByText("접수")).toBeInTheDocument();
  });

  it("[문의 작성] → 작성 화면 · 행 → 문의 상세", async () => {
    const { user, onNavSelect } = renderAt(SellerAskPage, "/seller-ask");
    await user.click(screen.getByRole("button", { name: "문의 작성" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-ask/new");
    await user.click(bodyRows()[0]);
    expect(onNavSelect).toHaveBeenLastCalledWith("/seller-ask/SQ-12");
  });
});
