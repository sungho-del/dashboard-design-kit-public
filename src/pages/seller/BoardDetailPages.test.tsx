import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentType } from "react";
import { ToastProvider } from "../../components/ui";
import { navigate } from "../../lib/router";
import {
  AskDetailPage,
  InqDetailPage,
  NoticeDetailPage,
  ReviewDetailPage,
} from "./BoardDetailPages";
import type { SellerNavProps } from "./SettleParts";

/* -------------------------------------------------------------------------
 * 게시판 상세 4화면 — 값·버튼은 원본 캡처 `orig/39·41·43·45`.
 * 퍼블 범위: 저장은 알림 + 이 화면 상태만(배지·버튼 이름). 1:1 은 목록으로.
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

const infoList = () =>
  screen.getAllByRole("definition").map((dd) => dd.textContent);
const lastButtons = (n: number) =>
  screen
    .getAllByRole("button")
    .slice(-n)
    .map((b) => b.textContent);

describe("공지 상세", () => {
  it("고정 공지 — 게시일 · 상단 고정 · 제목 · 내용 · 안내 · [목록]만", async () => {
    const { user, onNavSelect } = renderAt(
      NoticeDetailPage,
      "/seller-notice/N-S26",
    );
    expect(
      screen.getByRole("heading", { name: "공지 상세" }),
    ).toBeInTheDocument();
    expect(infoList()).toEqual(["2026.06.28", "상단 고정"]);
    expect(
      screen.getAllByText("[정산] 7월 정산 명세 확인 요청 발송 안내 (7/1)", {
        exact: false,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/확인 기한은 3일이며/)).toBeInTheDocument();
    expect(screen.getByText("본사가 발행")).toBeInTheDocument();
    expect(lastButtons(1)).toEqual(["목록"]);
    await user.click(screen.getByRole("button", { name: "목록" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-notice");
  });

  it("고정 아님 — 고정 「-」", () => {
    renderAt(NoticeDetailPage, "/seller-notice/N-S24");
    expect(infoList()).toEqual(["2026.06.20", "-"]);
  });

  it("없는 공지 — 찾을 수 없음 → 목록", async () => {
    const { user, onNavSelect } = renderAt(
      NoticeDetailPage,
      "/seller-notice/N-0",
    );
    expect(screen.getByText("찾을 수 없는 공지입니다")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "공지사항으로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-notice");
  });
});

describe("문의 상세", () => {
  it("주문 문의(Q-8842) — 원본 줄 순서 · 주문번호 · 공개", () => {
    renderAt(InqDetailPage, "/support/Q-8842");
    expect(infoList()).toEqual([
      "주문 문의",
      "접수",
      "정하늘",
      "2026.06.21",
      "디럭스 유모차 프리미엄",
      "20260621452502",
      "공개",
    ]);
    expect(
      screen.getByText(
        "주문한 지 3일인데 아직 배송 출발 안내가 없어요. 언제 출고되나요?",
      ),
    ).toBeInTheDocument();
    expect(lastButtons(2)).toEqual(["목록", "답변 등록"]);
  });

  it("상품 비밀글(Q-8840) — 주문번호 줄 없음 · 비밀글", () => {
    renderAt(InqDetailPage, "/support/Q-8840");
    expect(infoList()).toEqual([
      "상품 문의",
      "접수",
      "최민호",
      "2026.06.21",
      "하이체어 원목형",
      "비밀글 (작성자·판매자만 열람)",
    ]);
  });

  it("빈 답변은 막고, 등록하면 답변완료 · [답변 수정]", async () => {
    const { user } = renderAt(InqDetailPage, "/support/Q-8841");
    await user.click(screen.getByRole("button", { name: "답변 등록" }));
    expect(
      await screen.findByText("답변 내용을 입력해주세요."),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "답변" }),
      "레인커버 기본 포함입니다.",
    );
    await user.click(screen.getByRole("button", { name: "답변 등록" }));
    expect(
      await screen.findByText("답변이 등록되었습니다."),
    ).toBeInTheDocument();
    expect(infoList()[1]).toBe("답변완료");
    await user.click(screen.getByRole("button", { name: "답변 수정" }));
    expect(
      await screen.findByText("답변이 수정되었습니다."),
    ).toBeInTheDocument();
  });

  it("답변완료 건 — 등록된 답변이 채워져 있고 [답변 수정]", () => {
    renderAt(InqDetailPage, "/support/Q-8835");
    expect(screen.getByRole("textbox", { name: "답변" })).toHaveValue(
      "네, CR2032 배터리 교체형입니다.",
    );
    expect(lastButtons(1)).toEqual(["답변 수정"]);
  });

  it("없는 문의 — 찾을 수 없음", () => {
    renderAt(InqDetailPage, "/support/Q-8842/x");
    expect(screen.getByText("찾을 수 없는 문의입니다")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "문의 관리로" }),
    ).toBeInTheDocument();
  });
});

describe("리뷰 상세", () => {
  it("RV-31 — 원본 줄 · 별점 (5점) · [답글 등록]", () => {
    renderAt(ReviewDetailPage, "/seller-reviews/RV-31");
    expect(
      screen.getByRole("heading", { name: "리뷰 상세" }),
    ).toBeInTheDocument();
    const values = infoList();
    expect(values[0]).toBe("두아이맘");
    expect(values[1]).toBe("답글 대기");
    expect(values[2]).toContain("(5점)");
    expect(values.slice(3)).toEqual(["2026.06.25", "디럭스 유모차 프리미엄"]);
    expect(
      screen.getByRole("img", { name: "별점 5점 (5점 만점)" }),
    ).toBeInTheDocument();
    expect(lastButtons(2)).toEqual(["목록", "답글 등록"]);
  });

  it("빈 답글은 막고, 등록하면 답글 완료 · [답글 수정]", async () => {
    const { user } = renderAt(ReviewDetailPage, "/seller-reviews/RV-29");
    await user.click(screen.getByRole("button", { name: "답글 등록" }));
    expect(
      await screen.findByText("답글 내용을 입력해주세요."),
    ).toBeInTheDocument();
    await user.type(
      screen.getByRole("textbox", { name: "판매자 답글" }),
      "감사합니다.",
    );
    await user.click(screen.getByRole("button", { name: "답글 등록" }));
    expect(
      await screen.findByText("판매자 답글이 등록되었습니다."),
    ).toBeInTheDocument();
    expect(infoList()[1]).toBe("답글 완료");
    expect(lastButtons(1)).toEqual(["답글 수정"]);
  });

  it("답글 있는 리뷰(RV-30) — 답글이 채워져 있고 수정 알림", async () => {
    const { user } = renderAt(ReviewDetailPage, "/seller-reviews/RV-30");
    expect(screen.getByRole("textbox", { name: "판매자 답글" })).toHaveValue(
      "소중한 리뷰 감사합니다. 벨트는 사용 2~3일 후 자연스럽게 부드러워집니다.",
    );
    await user.click(screen.getByRole("button", { name: "답글 수정" }));
    expect(
      await screen.findByText("판매자 답글이 수정되었습니다."),
    ).toBeInTheDocument();
  });

  it("없는 리뷰 — 찾을 수 없음", () => {
    renderAt(ReviewDetailPage, "/seller-reviews/RV-1");
    expect(screen.getByText("찾을 수 없는 리뷰입니다")).toBeInTheDocument();
  });
});

describe("1:1 문의 상세", () => {
  it("답변완료(SQ-12) — 읽기 전용 · 본사 답변 · [목록]만", () => {
    renderAt(AskDetailPage, "/seller-ask/SQ-12");
    expect(
      screen.getByRole("heading", { name: "1:1 문의 상세 (등록/수정)" }),
    ).toBeInTheDocument();
    expect(infoList()).toEqual(["2026.07.02", "답변완료"]);
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen.getByText(
        "확인 결과 취소 차감 규칙(G-6) 정정 대상 건으로, 7월 명세에서 정정 반영됩니다.",
      ),
    ).toBeInTheDocument();
    expect(lastButtons(1)).toEqual(["목록"]);
  });

  it("접수(SQ-11) — 제목·내용 수정 가능 · 답변 대기 안내 · [수정] → 목록 + 알림", async () => {
    const { user, onNavSelect } = renderAt(AskDetailPage, "/seller-ask/SQ-11");
    const title = screen.getByRole("textbox", { name: "제목" });
    expect(title).toHaveValue("공항 픽업 등록 시 김해공항도 선택 가능한가요?");
    expect(title).toHaveAttribute("maxlength", "60");
    expect(
      screen.getByText(/아직 답변이 등록되지 않았습니다/),
    ).toBeInTheDocument();
    await user.clear(title);
    await user.click(screen.getByRole("button", { name: "수정" }));
    expect(await screen.findByText("제목을 입력해주세요.")).toBeInTheDocument();
    expect(onNavSelect).not.toHaveBeenCalled();
    await user.type(title, "김해공항 픽업 문의");
    await user.click(screen.getByRole("button", { name: "수정" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-ask");
    expect(
      await screen.findByText("문의가 수정되었습니다."),
    ).toBeInTheDocument();
  });

  it("작성(new) — 메타·본사 답변 없음 · 제목 필수(내용은 원본처럼 선택) · [문의 접수]", async () => {
    const { user, onNavSelect } = renderAt(AskDetailPage, "/seller-ask/new");
    expect(screen.getByText("문의 작성")).toBeInTheDocument();
    expect(screen.queryByRole("definition")).toBeNull();
    expect(screen.queryByText("본사 답변")).toBeNull();
    expect(screen.getByRole("textbox", { name: "내용" })).toHaveValue("");
    await user.type(screen.getByRole("textbox", { name: "내용" }), "본문");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(await screen.findByText("제목을 입력해주세요.")).toBeInTheDocument();
    expect(onNavSelect).not.toHaveBeenCalled();
    await user.type(screen.getByRole("textbox", { name: "제목" }), "제목");
    await user.click(screen.getByRole("button", { name: "문의 접수" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-ask");
    expect(
      await screen.findByText("문의가 접수되었습니다."),
    ).toBeInTheDocument();
  });

  it("없는 문의 — 찾을 수 없음 → 1:1 문의로", async () => {
    const { user, onNavSelect } = renderAt(AskDetailPage, "/seller-ask/SQ-1");
    expect(screen.getByText("찾을 수 없는 문의입니다")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "1:1 문의로" }));
    expect(onNavSelect).toHaveBeenCalledWith("/seller-ask");
    expect(within(document.body).queryByRole("textbox")).toBeNull();
  });
});
