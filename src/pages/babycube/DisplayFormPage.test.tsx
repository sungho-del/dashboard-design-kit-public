import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../../components/ui";
import { BANNERS, type Banner } from "./BannerListPage.data";
import { DisplayFormPage } from "./DisplayFormPage";
import { orderOptions, targetOf } from "./DisplayFormPage.data";
import { POPUPS } from "./PopupListPage.data";

/* -------------------------------------------------------------------------
 * 배너/팝업 등록·수정 — 폼형 · 기획 v0.4 `dispDetail`(배너·팝업 공유)
 *
 * 동작을 본다: 경로 → 종류·모드 · 기존 값 · 배너만 이미지·노출 순서 / 팝업만 내용(HTML 원문) ·
 * 필수 오류(원본 문구 · 칸 아래 · 접힌 구역 펼침) · 신규 배너는 이미지 오류에서 멈춤 ·
 * 날짜 두 칸 독립(종료만 허용 · 역순만 막음) · 저장/삭제 = 알림 + 목록(시드 불변) ·
 * 종류·대상이 바뀌면 초안 초기화 · 찾을 수 없음.
 * ---------------------------------------------------------------------- */
function renderAt(path: string) {
  window.history.replaceState(null, "", path);
  const onNavSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ToastProvider position="bottom">
      <DisplayFormPage
        navOpen
        onNavOpenChange={vi.fn()}
        activeNav="/display"
        onNavSelect={onNavSelect}
      />
    </ToastProvider>,
  );
  return { user, onNavSelect };
}

/** 주소만 바꿔 같은 화면이 다른 대상을 그리게 한다(라우터는 popstate 를 듣는다) */
const goTo = (path: string) =>
  act(() => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

const titleInput = () => screen.getByRole("textbox", { name: /제목/ });
const heading = () => screen.getByRole("heading", { level: 1 });
const barButtons = () =>
  within(
    screen.getByRole("button", { name: "목록" }).parentElement
      ?.parentElement as HTMLElement,
  )
    .getAllByRole("button")
    .map((button) => button.textContent);

/** 시드에 잠시 넣는 fixture — 끝나면 뺀다(원본 시드 3건은 건드리지 않는다) */
function withBanner(extra: Banner, run: () => Promise<void>) {
  return async () => {
    BANNERS.push(extra);
    try {
      await run();
    } finally {
      BANNERS.splice(BANNERS.indexOf(extra), 1);
    }
  };
}
const fixture = (patch: Partial<Banner>): Banner => ({
  id: "BN-T",
  title: "테스트 배너",
  pcImage: true,
  mobileImage: true,
  startAt: "",
  endAt: "",
  order: 4,
  status: "hidden",
  date: "2026-07-01",
  ...patch,
});

describe("DisplayFormPage (배너/팝업 등록·수정)", () => {
  describe("경로 해석", () => {
    it("종류 + new | 실제 id 만 대상, 나머지는 찾을 수 없음", () => {
      expect(targetOf("/display/new")).toEqual({
        kind: "banner",
        mode: "new",
      });
      expect(targetOf("/popups/PU-1")).toMatchObject({
        kind: "popup",
        mode: "edit",
      });
      expect(targetOf("/display/PU-1")).toBeUndefined(); // 다른 종류의 id
      expect(targetOf("/popups/BN-1")).toBeUndefined();
      expect(targetOf("/display/BN-1/x")).toBeUndefined(); // 조각 둘
      expect(targetOf("/display/")).toBeUndefined();
    });

    it("노출 순서 선택지는 시드 수에서 — 수정 1..N · 신규 1..N+1", () => {
      expect(orderOptions(false).map((o) => o.value)).toEqual(["1", "2", "3"]);
      expect(orderOptions(true).map((o) => o.value)).toEqual([
        "1",
        "2",
        "3",
        "4",
      ]);
    });

    it.each(["/display/BN-9", "/popups/BN-1", "/display/BN-1/x"])(
      "%s → 「찾을 수 없는 …입니다」 + 목록으로",
      async (path) => {
        const { user, onNavSelect } = renderAt(path);
        const list = path.startsWith("/popups") ? "/popups" : "/display";
        const word = list === "/popups" ? "팝업" : "배너";

        expect(screen.getByText(`찾을 수 없는 ${word}입니다`)).toBeVisible();
        await user.click(
          screen.getByRole("button", { name: `${word} 관리로` }),
        );
        expect(onNavSelect).toHaveBeenCalledWith(list);
      },
    );
  });

  describe("배너 수정 — /display/BN-3", () => {
    it("머리 · 기존 값 · 이미지 2칸(자리 표시) · 노출 순서 1..3 · 날짜 두 칸", async () => {
      const { user } = renderAt("/display/BN-3");

      expect(heading()).toHaveTextContent("배너 수정");
      expect(titleInput()).toHaveValue("여름 물놀이 용품 기획전");
      expect(titleInput()).toHaveAttribute("maxLength", "60");
      expect(screen.getByText("PC (1080 × 480)")).toBeVisible();
      expect(screen.getByText("모바일 (720 × 320)")).toBeVisible();
      expect(
        screen.getByRole("button", { name: "PC 이미지 확대" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "노출 시작일" }),
      ).toHaveTextContent("2026.07.10");
      expect(
        screen.getByRole("button", { name: "노출 종료일" }),
      ).toHaveTextContent("2026.08.20");
      expect(screen.getByRole("radio", { name: "게시" })).toBeChecked();
      expect(screen.queryByRole("textbox", { name: /내용/ })).toBeNull();

      const order = screen.getByRole("combobox", { name: /노출 순서/ });
      expect(order).toHaveTextContent("3");
      await user.click(order);
      expect(
        screen.getAllByRole("option").map((option) => option.textContent),
      ).toEqual(["1", "2", "3"]);
    });

    it("하단 바 — [목록] | [삭제] [취소] [저장]", () => {
      renderAt("/display/BN-3");
      expect(barButtons()).toEqual(["목록", "삭제", "취소", "저장"]);
    });

    it("저장 — 「저장되었습니다.」 + 목록, 시드는 그대로", async () => {
      const { user, onNavSelect } = renderAt("/display/BN-3");

      await user.type(titleInput(), " (수정)");
      await user.click(screen.getByRole("radio", { name: "숨김" }));
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(await screen.findByText("저장되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/display");
      expect(BANNERS[2]).toMatchObject({
        title: "여름 물놀이 용품 기획전",
        status: "posted",
      });
    });

    it("빈 제목은 칸 아래 원본 문구 · 접힌 구역도 펼치고 포커스", async () => {
      const { user, onNavSelect } = renderAt("/display/BN-3");

      await user.clear(titleInput());
      await user.click(screen.getByRole("button", { name: "배너 정보 접기" }));
      expect(screen.queryByRole("textbox", { name: /제목/ })).toBeNull();
      await user.click(screen.getByRole("button", { name: "저장" }));

      expect(screen.getByText("배너 제목을 입력해주세요.")).toBeVisible();
      await waitFor(() => expect(titleInput()).toHaveFocus());
      expect(onNavSelect).not.toHaveBeenCalled();
    });

    it("이미지 교체·삭제는 알림만 — 자리는 그대로", async () => {
      const { user } = renderAt("/display/BN-3");

      await user.click(screen.getAllByRole("button", { name: "삭제" })[0]);
      expect(
        await screen.findByText(
          "이미지 등록·교체·삭제는 개발 연동 시 제공됩니다.",
        ),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "PC 이미지 확대" }),
      ).toBeVisible();
    });

    it("[삭제] — 목록과 같은 확인 창(대상 이름 없음) → 「삭제되었습니다.」 + 목록", async () => {
      const { user, onNavSelect } = renderAt("/display/BN-3");

      const bar = screen.getByRole("button", { name: "목록" }).parentElement
        ?.parentElement as HTMLElement;
      await user.click(within(bar).getByRole("button", { name: "삭제" }));

      const modal = await screen.findByRole("dialog");
      expect(
        within(modal).getByRole("heading", { name: "배너 삭제" }),
      ).toBeVisible();
      expect(
        within(modal).getByText("사용자 화면에서도 즉시 내려갑니다"),
      ).toBeVisible();
      expect(within(modal).queryByText("여름 물놀이 용품 기획전")).toBeNull();

      await user.click(within(modal).getByRole("button", { name: "삭제" }));
      expect(await screen.findByText("삭제되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/display");
      expect(BANNERS).toHaveLength(3);
    });

    /* 판정 Q14 — 시작일 필수 · 비우면 「시작일을 입력해 주세요」 */
    it(
      "시작일이 비면 막는다 — 종료일만 있어도",
      withBanner(fixture({ endAt: "2026-08-20" }), async () => {
        const { user, onNavSelect } = renderAt("/display/BN-T");
        await user.click(screen.getByRole("button", { name: "저장" }));
        expect(screen.getByText("시작일을 입력해 주세요")).toBeVisible();
        expect(
          screen.getByRole("button", { name: /노출 시작일/ }),
        ).toHaveAttribute("aria-invalid", "true");
        expect(onNavSelect).not.toHaveBeenCalled();
      }),
    );

    it(
      "종료일은 선택 — 시작일만 있으면 저장된다",
      withBanner(fixture({ startAt: "2026-08-01" }), async () => {
        const { user, onNavSelect } = renderAt("/display/BN-T");
        await user.click(screen.getByRole("button", { name: "저장" }));
        expect(await screen.findByText("저장되었습니다.")).toBeVisible();
        expect(onNavSelect).toHaveBeenCalledWith("/display");
      }),
    );

    it(
      "종료일이 시작일보다 빠르면 막는다(둘 다 있을 때만)",
      withBanner(
        fixture({ startAt: "2026-08-20", endAt: "2026-08-01" }),
        async () => {
          const { user, onNavSelect } = renderAt("/display/BN-T");
          await user.click(screen.getByRole("button", { name: "저장" }));
          expect(
            screen.getByText("종료일은 시작일보다 빠를 수 없습니다."),
          ).toBeVisible();
          expect(onNavSelect).not.toHaveBeenCalled();
        },
      ),
    );

    it(
      "숨김 저장값은 세그먼트에 그대로 뜬다(fixture)",
      withBanner(fixture({}), async () => {
        renderAt("/display/BN-T");
        expect(screen.getByRole("radio", { name: "숨김" })).toBeChecked();
      }),
    );
  });

  describe("배너 등록 — /display/new", () => {
    it("빈 칸 · 이미지 [+] · 노출 순서 기본 4(맨 뒤) · 게시 · [삭제] 없음 · [등록]", () => {
      renderAt("/display/new");

      expect(heading()).toHaveTextContent("배너 등록");
      expect(titleInput()).toHaveValue("");
      expect(
        screen.getByRole("button", { name: "PC 이미지 등록" }),
      ).toBeVisible();
      expect(
        screen.getByRole("button", { name: "모바일 이미지 등록" }),
      ).toBeVisible();
      expect(
        screen.getByRole("combobox", { name: /노출 순서/ }),
      ).toHaveTextContent("4");
      expect(screen.getByRole("radio", { name: "게시" })).toBeChecked();
      expect(barButtons()).toEqual(["목록", "취소", "등록"]);
    });

    /* 판정 Q14 — 새 등록 때 시작일은 오늘(시연 기준일 10-19)로 미리 채움 · 종료일은 비어 있다 */
    it.each(["/display/new", "/popups/new"])(
      "%s — 시작일은 오늘로 미리 차 있고 종료일은 비어 있다",
      (path) => {
        renderAt(path);

        expect(
          screen.getByRole("button", { name: /노출 시작일/ }),
        ).toHaveTextContent("2026.10.19");
        expect(
          screen.getByRole("button", { name: /노출 종료일/ }),
        ).toHaveTextContent("종료일");
      },
    );

    it("이미지 [+] 는 알림만 — 등록은 이미지 필수 오류에서 멈춘다(퍼블 범위)", async () => {
      const { user, onNavSelect } = renderAt("/display/new");

      await user.click(screen.getByRole("button", { name: "PC 이미지 등록" }));
      expect(
        await screen.findByText(
          "이미지 등록·교체·삭제는 개발 연동 시 제공됩니다.",
        ),
      ).toBeVisible();

      await user.type(titleInput(), "새 배너");
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(screen.getByText("PC 이미지를 등록해주세요.")).toBeVisible();
      expect(screen.queryByText("배너 제목을 입력해주세요.")).toBeNull();
      expect(onNavSelect).not.toHaveBeenCalled();
    });
  });

  describe("팝업 — /popups/PU-1 · /popups/new", () => {
    it("수정: 내용은 HTML 원문 그대로 · 이미지·노출 순서 없음", () => {
      renderAt("/popups/PU-1");

      expect(heading()).toHaveTextContent("팝업 수정");
      expect(titleInput()).toHaveValue("신규 가입 20% 쿠폰 안내");
      expect(screen.getByRole("textbox", { name: /내용/ })).toHaveValue(
        POPUPS[0].body,
      );
      expect(
        screen.getByText("줄바꿈은 <br>, 굵게는 <b>…</b>로 쓸 수 있습니다."),
      ).toBeVisible();
      expect(screen.queryByText("PC (1080 × 480)")).toBeNull();
      expect(screen.queryByRole("combobox", { name: /노출 순서/ })).toBeNull();
    });

    it("등록: 제목·내용 비우면 둘 다 원본 문구 · 채우면 「등록되었습니다.」 + 목록", async () => {
      const { user, onNavSelect } = renderAt("/popups/new");

      expect(heading()).toHaveTextContent("팝업 등록");
      await user.click(screen.getByRole("button", { name: "등록" }));
      expect(screen.getByText("팝업 제목을 입력해주세요.")).toBeVisible();
      expect(screen.getByText("팝업 내용을 입력해주세요.")).toBeVisible();

      await user.type(titleInput(), "점검 안내");
      await user.type(
        screen.getByRole("textbox", { name: /내용/ }),
        "점검이 있습니다.",
      );
      await user.click(screen.getByRole("button", { name: "등록" }));

      expect(await screen.findByText("등록되었습니다.")).toBeVisible();
      expect(onNavSelect).toHaveBeenCalledWith("/popups");
      expect(POPUPS).toHaveLength(1);
    });
  });

  it("종류·대상이 바뀌면 초안이 처음부터 — 고치던 값이 묻어가지 않는다", async () => {
    const { user } = renderAt("/display/BN-1");

    await user.clear(titleInput());
    await user.type(titleInput(), "고치던 제목");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.queryByText("배너 제목을 입력해주세요.")).toBeNull();

    goTo("/display/BN-2");
    expect(titleInput()).toHaveValue("필요한 건 바로 구매로 빠르게");

    await user.clear(titleInput());
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("배너 제목을 입력해주세요.")).toBeVisible();

    goTo("/popups/PU-1");
    expect(heading()).toHaveTextContent("팝업 수정");
    expect(titleInput()).toHaveValue("신규 가입 20% 쿠폰 안내");
    expect(screen.queryByText(/제목을 입력해주세요/)).toBeNull();
  });
});
