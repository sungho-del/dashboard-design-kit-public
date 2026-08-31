import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "../Button";
import { Dropdown } from "./Dropdown";

/**
 * floating-ui 의 `autoUpdate` 는 ResizeObserver·IntersectionObserver 를 쓴다.
 * jsdom 에는 둘 다 없으므로 아무 것도 하지 않는 스텁을 심는다.
 *
 * ⚠️ jsdom 에는 레이아웃이 없어 모든 요소의 크기가 0이다 —
 * floating-ui 가 계산한 실제 좌표(top/left)는 검증할 수 없다.
 * 따라서 이 파일은 **위치가 아니라 동작·접근성**만 검증한다.
 */
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.ResizeObserver = ObserverStub as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver =
  ObserverStub as unknown as typeof IntersectionObserver;

/** 테이블 행 더보기 메뉴 — 이 컴포넌트의 대표 사용처 */
function renderDropdown(
  props: Partial<Parameters<typeof Dropdown>[0]> = {},
  onSelect = vi.fn(),
) {
  const result = render(
    <>
      <button type="button">바깥 버튼</button>

      <Dropdown {...props}>
        <Dropdown.Trigger>
          <Button>더보기</Button>
        </Dropdown.Trigger>
        <Dropdown.Menu>
          <Dropdown.Item onSelect={() => onSelect("edit")}>수정</Dropdown.Item>
          <Dropdown.Item onSelect={() => onSelect("copy")}>복제</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item tone="critical" onSelect={() => onSelect("delete")}>
            삭제
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    </>,
  );

  return { ...result, onSelect };
}

/** 키보드로 열어 첫 아이템에 포커스가 들어간 상태까지 진행한다 */
async function openWithKeyboard(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole("button", { name: "더보기" }).focus();
  await user.keyboard("{Enter}");

  await screen.findByRole("menu");
  await waitFor(() =>
    expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus(),
  );
}

describe("Dropdown", () => {
  describe("열림 / 닫힘", () => {
    it("기본은 닫힘 — 메뉴를 렌더하지 않는다", () => {
      renderDropdown();
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("트리거를 클릭하면 메뉴가 열린다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      await user.click(screen.getByRole("button", { name: "더보기" }));

      expect(await screen.findByRole("menu")).toBeInTheDocument();
    });

    it("메뉴는 포털로 document.body에 렌더된다", async () => {
      const user = userEvent.setup();
      const { container } = renderDropdown();

      await user.click(screen.getByRole("button", { name: "더보기" }));

      const menu = await screen.findByRole("menu");
      expect(container).not.toContainElement(menu);
      expect(document.body).toContainElement(menu);
    });

    it("열린 상태에서 트리거를 다시 클릭하면 닫힌다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      const trigger = screen.getByRole("button", { name: "더보기" });
      await user.click(trigger);
      await screen.findByRole("menu");

      await user.click(trigger);
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("defaultOpen이면 처음부터 열려 있다", async () => {
      renderDropdown({ defaultOpen: true });
      expect(await screen.findByRole("menu")).toBeInTheDocument();
    });

    it("제어형 — open prop을 따르고 onOpenChange로 요청만 올린다", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      renderDropdown({ open: false, onOpenChange });

      await user.click(screen.getByRole("button", { name: "더보기" }));

      expect(onOpenChange).toHaveBeenCalledWith(true);
      // 부모가 open을 바꾸지 않았으므로 열리지 않는다
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("닫기 트리거", () => {
    it("Escape를 누르면 닫힌다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      await user.click(screen.getByRole("button", { name: "더보기" }));
      await screen.findByRole("menu");

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("바깥을 클릭하면 닫힌다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      await user.click(screen.getByRole("button", { name: "더보기" }));
      await screen.findByRole("menu");

      await user.click(screen.getByRole("button", { name: "바깥 버튼" }));

      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("메뉴 안을 클릭해도 닫히지 않는다", async () => {
      const user = userEvent.setup();
      renderDropdown({ closeOnSelect: false });

      await user.click(screen.getByRole("button", { name: "더보기" }));
      const menu = await screen.findByRole("menu");

      await user.click(menu);

      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("접근성 속성", () => {
    it("트리거에 aria-haspopup=menu가 붙는다", () => {
      renderDropdown();
      expect(screen.getByRole("button", { name: "더보기" })).toHaveAttribute(
        "aria-haspopup",
        "menu",
      );
    });

    it("aria-expanded가 닫힘 false → 열림 true로 바뀐다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      const trigger = screen.getByRole("button", { name: "더보기" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");

      await user.click(trigger);
      await screen.findByRole("menu");

      expect(trigger).toHaveAttribute("aria-expanded", "true");
    });

    it("패널은 role=menu · 아이템은 role=menuitem이다", async () => {
      renderDropdown({ defaultOpen: true });

      await screen.findByRole("menu");
      expect(screen.getAllByRole("menuitem")).toHaveLength(3);
    });

    it("구분선은 role=separator로 노출된다", async () => {
      renderDropdown({ defaultOpen: true });

      await screen.findByRole("menu");
      expect(screen.getByRole("separator")).toBeInTheDocument();
    });

    it("aria-disabled 아이템은 클릭해도 onSelect를 부르지 않는다", async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>더보기</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item disabled onSelect={onSelect}>
              복제
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      const item = await screen.findByRole("menuitem", { name: "복제" });
      expect(item).toHaveAttribute("aria-disabled", "true");

      await user.click(item);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("menuitemradio로 쓰면 selected가 aria-checked로 노출된다", async () => {
      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>정렬</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item role="menuitemradio" selected>
              최신순
            </Dropdown.Item>
            <Dropdown.Item role="menuitemradio">오래된순</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      const items = await screen.findAllByRole("menuitemradio");
      expect(items[0]).toHaveAttribute("aria-checked", "true");
      expect(items[1]).toHaveAttribute("aria-checked", "false");
    });

    it("role=menuitem이면 aria-checked를 붙이지 않는다", async () => {
      renderDropdown({ defaultOpen: true });

      const item = await screen.findByRole("menuitem", { name: "수정" });
      expect(item).not.toHaveAttribute("aria-checked");
    });
  });

  describe("키보드 조작", () => {
    it("Enter로 열면 첫 아이템에 포커스가 들어간다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      await openWithKeyboard(user);
    });

    it("ArrowDown으로 열어도 첫 아이템에 포커스가 들어간다", async () => {
      const user = userEvent.setup();
      renderDropdown();

      screen.getByRole("button", { name: "더보기" }).focus();
      await user.keyboard("{ArrowDown}");

      await screen.findByRole("menu");
      await waitFor(() =>
        expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus(),
      );
    });

    it("↑↓로 아이템 사이를 이동한다", async () => {
      const user = userEvent.setup();
      renderDropdown();
      await openWithKeyboard(user);

      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: "복제" })).toHaveFocus();

      await user.keyboard("{ArrowDown}");
      expect(screen.getByRole("menuitem", { name: "삭제" })).toHaveFocus();

      await user.keyboard("{ArrowUp}");
      expect(screen.getByRole("menuitem", { name: "복제" })).toHaveFocus();
    });

    it("Home / End로 처음·마지막 아이템으로 점프한다", async () => {
      const user = userEvent.setup();
      renderDropdown();
      await openWithKeyboard(user);

      await user.keyboard("{End}");
      expect(screen.getByRole("menuitem", { name: "삭제" })).toHaveFocus();

      await user.keyboard("{Home}");
      expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus();
    });

    it("Enter로 아이템을 선택하면 onSelect 호출 후 닫힌다", async () => {
      const user = userEvent.setup();
      const { onSelect } = renderDropdown();
      await openWithKeyboard(user);

      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      expect(onSelect).toHaveBeenCalledWith("copy");
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("Space로도 아이템을 선택할 수 있다", async () => {
      const user = userEvent.setup();
      const { onSelect } = renderDropdown();
      await openWithKeyboard(user);

      await user.keyboard(" ");

      expect(onSelect).toHaveBeenCalledWith("edit");
    });

    it("활성 아이템만 tabIndex 0을 갖는다 (roving focus)", async () => {
      const user = userEvent.setup();
      renderDropdown();
      await openWithKeyboard(user);

      expect(screen.getByRole("menuitem", { name: "수정" })).toHaveAttribute(
        "tabindex",
        "0",
      );
      expect(screen.getByRole("menuitem", { name: "복제" })).toHaveAttribute(
        "tabindex",
        "-1",
      );
    });
  });

  describe("선택 / 닫힘 정책", () => {
    it("클릭 선택 시 기본으로 닫힌다", async () => {
      const user = userEvent.setup();
      const { onSelect } = renderDropdown();

      await user.click(screen.getByRole("button", { name: "더보기" }));
      await user.click(await screen.findByRole("menuitem", { name: "수정" }));

      expect(onSelect).toHaveBeenCalledWith("edit");
      await waitFor(() =>
        expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
      );
    });

    it("closeOnSelect=false면 선택해도 열려 있다", async () => {
      const user = userEvent.setup();
      const { onSelect } = renderDropdown({ closeOnSelect: false });

      await user.click(screen.getByRole("button", { name: "더보기" }));
      await user.click(await screen.findByRole("menuitem", { name: "수정" }));

      expect(onSelect).toHaveBeenCalledWith("edit");
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  describe("스타일", () => {
    it("패널은 surface · radius medium · shadow-popover · z-sidesheet", async () => {
      renderDropdown({ defaultOpen: true });

      const className = (await screen.findByRole("menu")).className;
      expect(className).toContain("bg-surface");
      expect(className).toContain("rounded-medium");
      expect(className).toContain("shadow-popover");
      expect(className).toContain("z-(--z-sidesheet)");
      expect(className).toContain("p-1.5");
      expect(className).toContain("gap-2");
    });

    it("size에 따라 min-w-70(280) / w-32(128)로 갈린다", async () => {
      const { unmount } = renderDropdown({ defaultOpen: true });
      expect((await screen.findByRole("menu")).className).toContain("min-w-70");
      unmount();

      renderDropdown({ defaultOpen: true, size: "compact" });
      expect((await screen.findByRole("menu")).className).toContain("w-32");
    });

    it("아이템은 padding 8/12 · gap 4 · label-medium이다", async () => {
      renderDropdown({ defaultOpen: true });

      const className = (await screen.findByRole("menuitem", { name: "수정" }))
        .className;
      expect(className).toContain("px-3");
      expect(className).toContain("py-2");
      expect(className).toContain("gap-1");
      expect(className).toContain("label-medium");
      expect(className).toContain("rounded-medium");
      expect(className).toContain("hover:bg-action-secondary-hover");
    });

    it("critical 톤은 text-critical을 쓴다", async () => {
      renderDropdown({ defaultOpen: true });

      const className = (await screen.findByRole("menuitem", { name: "삭제" }))
        .className;
      expect(className).toContain("text-text-critical");
    });

    it("selected 아이템은 action-primary-tonal 배경을 쓴다", async () => {
      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>정렬</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item selected>최신순</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      const className = (
        await screen.findByRole("menuitem", { name: "최신순" })
      ).className;
      expect(className).toContain("bg-action-primary-tonal");
      expect(className).not.toContain("bg-transparent");
    });

    it("disabled 아이템은 text-disabled · cursor-not-allowed", async () => {
      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>더보기</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item disabled>복제</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      const className = (await screen.findByRole("menuitem", { name: "복제" }))
        .className;
      expect(className).toContain("text-text-disabled");
      expect(className).toContain("cursor-not-allowed");
      expect(className).not.toContain("text-text-secondary");
    });

    it("전달한 className이 마지막에 붙어 패널을 오버라이드한다", async () => {
      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>더보기</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu className="custom-class">
            <Dropdown.Item>수정</Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      expect((await screen.findByRole("menu")).className).toMatch(
        /custom-class$/,
      );
    });
  });

  describe("아이콘 슬롯", () => {
    it("leftIcon / rightIcon을 각각의 슬롯에 렌더한다", async () => {
      render(
        <Dropdown defaultOpen>
          <Dropdown.Trigger>
            <Button>더보기</Button>
          </Dropdown.Trigger>
          <Dropdown.Menu>
            <Dropdown.Item
              leftIcon={<span data-testid="left" />}
              rightIcon={<span data-testid="right" />}
            >
              수정
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>,
      );

      const item = await screen.findByRole("menuitem", { name: "수정" });
      expect(
        item.querySelector('[data-slot="left-icon"] [data-testid="left"]'),
      ).toBeInTheDocument();
      expect(
        item.querySelector('[data-slot="right-icon"] [data-testid="right"]'),
      ).toBeInTheDocument();
    });
  });

  describe("포커스 복원", () => {
    it("닫히면 트리거로 포커스가 돌아온다", async () => {
      const user = userEvent.setup();

      function Harness() {
        const [open, setOpen] = useState(false);
        return (
          <Dropdown open={open} onOpenChange={setOpen}>
            <Dropdown.Trigger>
              <Button>더보기</Button>
            </Dropdown.Trigger>
            <Dropdown.Menu>
              <Dropdown.Item>수정</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        );
      }

      render(<Harness />);

      const trigger = screen.getByRole("button", { name: "더보기" });
      trigger.focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("menu");

      await user.keyboard("{Escape}");

      await waitFor(() => expect(trigger).toHaveFocus());
    });
  });
});
