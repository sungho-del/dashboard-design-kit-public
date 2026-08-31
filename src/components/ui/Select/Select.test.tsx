import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, type SelectOption } from "./Select";

/**
 * floating-ui 의 `autoUpdate`·`size` 는 ResizeObserver·IntersectionObserver 를 쓴다.
 * jsdom 에는 둘 다 없으므로 아무 것도 하지 않는 스텁을 심는다.
 * (`src/test/setup.ts` 는 전역 파일이라 건드리지 않는다)
 *
 * ⚠️ jsdom 에는 레이아웃이 없어 모든 요소의 크기가 0이다 —
 * floating-ui 가 계산한 좌표·패널 폭은 검증할 수 없다.
 * 이 파일은 **위치가 아니라 동작·접근성**만 검증한다.
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

const OPTIONS: SelectOption[] = [
  { value: "pending", label: "결제대기" },
  { value: "paid", label: "결제완료" },
  { value: "shipping", label: "배송중" },
  { value: "canceled", label: "취소/환불", disabled: true },
  { value: "done", label: "배송완료" },
];

function renderSelect(props: Partial<Parameters<typeof Select>[0]> = {}) {
  const onValueChange = vi.fn();
  const result = render(
    <>
      <button type="button">바깥 버튼</button>
      <Select
        label="주문 상태"
        placeholder="상태 선택"
        options={OPTIONS}
        onValueChange={onValueChange}
        {...props}
      />
    </>,
  );

  return { ...result, onValueChange };
}

function getTrigger() {
  return screen.getByRole("combobox");
}

describe("Select", () => {
  describe("트리거 / 접근성", () => {
    it("role='combobox' 와 닫힌 상태의 aria-expanded 를 노출한다", () => {
      renderSelect();

      const trigger = getTrigger();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("aria-haspopup", "listbox");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    /*
     * `label` prop 은 `<label for>` 로 트리거에 붙는다. 그 연결이 **접근가능 이름까지
     * 도달하는지**를 여기서 못박는다 — 끊기면 스크린리더 사용자에게 이 셀렉트는
     * "결제완료" 같은 **현재 값만** 읽히고 무엇을 고르는 자리인지 알 수 없게 된다.
     *
     * ⚠️ 찾을 때 role 은 **`combobox`** 다. `getByRole("button", { name })` 은 실패하는데,
     * 원인은 이름이 아니라 role 불일치다(floating-ui `useRole({ role: "select" })`).
     * 실제로 화면 생성 중 이 실패를 "컴포넌트의 이름 결함"으로 오진한 적이 있어 남긴다.
     */
    it("label 이 트리거의 접근가능 이름이 된다", () => {
      renderSelect();

      expect(
        screen.getByRole("combobox", { name: "주문 상태" }),
      ).toBeInTheDocument();
      // 선택된 값이 이름을 가로채지 않는다
      expect(
        screen.queryByRole("combobox", { name: "결제완료" }),
      ).not.toBeInTheDocument();
    });

    it("값이 없으면 placeholder 를, 있으면 선택된 라벨을 보여준다", () => {
      const { rerender } = renderSelect();
      expect(getTrigger()).toHaveTextContent("상태 선택");

      rerender(
        <Select
          label="주문 상태"
          placeholder="상태 선택"
          options={OPTIONS}
          value="shipping"
        />,
      );
      expect(getTrigger()).toHaveTextContent("배송중");
    });

    it("열리면 aria-controls 가 리스트박스를 가리킨다", async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(getTrigger());

      const listbox = await screen.findByRole("listbox");
      expect(getTrigger()).toHaveAttribute("aria-expanded", "true");
      expect(getTrigger()).toHaveAttribute("aria-controls", listbox.id);
    });

    it("선택된 옵션만 aria-selected 가 true 다", async () => {
      const user = userEvent.setup();
      renderSelect({ defaultValue: "paid" });

      await user.click(getTrigger());

      const listbox = await screen.findByRole("listbox");
      const options = within(listbox).getAllByRole("option");
      expect(
        options.map((option) => option.getAttribute("aria-selected")),
      ).toEqual(["false", "true", "false", "false", "false"]);
    });

    it("invalid 면 aria-invalid 를 노출한다", () => {
      renderSelect({ invalid: true });
      expect(getTrigger()).toHaveAttribute("aria-invalid", "true");
    });

    /**
     * ⚠️ 옵션은 `shrink-0` 이어야 한다 — 없으면 **글자가 위아래로 잘린다.**
     *
     * 목록은 세로 flex 인데 옵션이 `truncate`(= `overflow: hidden`)를 갖는다.
     * CSS 에서 flex 항목의 자동 최소 크기(`min-height: auto`)는 **`overflow` 가
     * `visible` 일 때만** 내용 크기를 지킨다. `hidden` 이면 0 으로 떨어져,
     * 옵션이 많아 목록이 최대 높이를 넘으면 스크롤 대신 **항목이 눌려** 글자가 잘렸다.
     *
     * jsdom 에는 레이아웃이 없어 눌림 자체는 재현되지 않는다 — 클래스로 못박는다.
     */
    it("옵션은 shrink-0 이다 — 목록이 넘칠 때 눌리지 않고 스크롤한다", async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(getTrigger());

      const listbox = await screen.findByRole("listbox");
      for (const option of within(listbox).getAllByRole("option")) {
        expect(option.className.split(/\s+/)).toContain("shrink-0");
      }
      // 눌림을 막았으니 넘치는 만큼은 목록이 스크롤해야 한다
      expect(listbox.className).toContain("overflow-y-auto");
    });
  });

  describe("열림 / 닫힘", () => {
    it("트리거를 클릭하면 열리고, 다시 클릭하면 닫힌다", async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(getTrigger());
      expect(await screen.findByRole("listbox")).toBeInTheDocument();

      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      );
    });

    it("Escape 로 닫히고 포커스는 트리거에 남는다", async () => {
      const user = userEvent.setup();
      renderSelect();

      getTrigger().focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("listbox");

      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      );
      expect(getTrigger()).toHaveFocus();
    });

    it("바깥을 클릭하면 닫힌다", async () => {
      const user = userEvent.setup();
      renderSelect();

      await user.click(getTrigger());
      await screen.findByRole("listbox");

      await user.click(screen.getByRole("button", { name: "바깥 버튼" }));

      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      );
    });

    it("disabled 면 클릭해도 열리지 않는다", async () => {
      const user = userEvent.setup();
      renderSelect({ disabled: true });

      expect(getTrigger()).toBeDisabled();
      await user.click(getTrigger());

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  describe("선택", () => {
    it("옵션을 클릭하면 값이 바뀌고 패널이 닫힌다 (비제어)", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect();

      await user.click(getTrigger());
      await user.click(await screen.findByRole("option", { name: "배송중" }));

      expect(onValueChange).toHaveBeenCalledWith("shipping");
      expect(getTrigger()).toHaveTextContent("배송중");
      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      );
    });

    it("제어형은 콜백만 부르고 값은 사용처가 정한다", async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      render(
        <Select
          label="주문 상태"
          placeholder="상태 선택"
          options={OPTIONS}
          value="pending"
          onValueChange={onValueChange}
        />,
      );

      await user.click(getTrigger());
      await user.click(await screen.findByRole("option", { name: "배송완료" }));

      expect(onValueChange).toHaveBeenCalledWith("done");
      // 부모가 value 를 갱신하지 않았으므로 표시는 그대로다
      expect(getTrigger()).toHaveTextContent("결제대기");
    });

    it("제어형 사용처가 값을 갱신하면 트리거 표시도 따라간다", async () => {
      const user = userEvent.setup();

      function ControlledSelect() {
        const [value, setValue] = useState("pending");
        return (
          <Select
            label="주문 상태"
            options={OPTIONS}
            value={value}
            onValueChange={setValue}
          />
        );
      }
      render(<ControlledSelect />);

      await user.click(getTrigger());
      await user.click(await screen.findByRole("option", { name: "배송중" }));

      expect(getTrigger()).toHaveTextContent("배송중");
    });

    it("비활성 옵션을 클릭해도 선택되지 않는다", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect();

      await user.click(getTrigger());
      await user.click(
        await screen.findByRole("option", { name: "취소/환불" }),
      );

      expect(onValueChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("키보드", () => {
    it("↓ 로 열고 이동한 뒤 Enter 로 선택한다 — 포커스는 트리거에 남는다", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect();

      getTrigger().focus();
      await user.keyboard("{ArrowDown}");

      const listbox = await screen.findByRole("listbox");
      expect(getTrigger()).toHaveFocus();

      // 열면 첫 활성 옵션(결제대기)을 aria-activedescendant 가 가리킨다
      await waitFor(() =>
        expect(getTrigger()).toHaveAttribute(
          "aria-activedescendant",
          within(listbox).getByRole("option", { name: "결제대기" }).id,
        ),
      );

      await user.keyboard("{ArrowDown}");
      await waitFor(() =>
        expect(getTrigger()).toHaveAttribute(
          "aria-activedescendant",
          within(listbox).getByRole("option", { name: "결제완료" }).id,
        ),
      );

      await user.keyboard("{Enter}");

      expect(onValueChange).toHaveBeenCalledWith("paid");
      await waitFor(() =>
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
      );
      expect(getTrigger()).toHaveFocus();
    });

    it("↓ 이동이 비활성 옵션을 건너뛴다", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect({ defaultValue: "shipping" });

      getTrigger().focus();
      await user.keyboard("{Enter}");
      await screen.findByRole("listbox");

      // 배송중 → (취소/환불 건너뜀) → 배송완료
      await user.keyboard("{ArrowDown}{Enter}");

      expect(onValueChange).toHaveBeenCalledWith("done");
    });

    it("End 로 마지막, Home 으로 첫 옵션까지 이동한다", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect();

      getTrigger().focus();
      await user.keyboard("{Enter}");
      const listbox = await screen.findByRole("listbox");

      await user.keyboard("{End}");
      await waitFor(() =>
        expect(getTrigger()).toHaveAttribute(
          "aria-activedescendant",
          within(listbox).getByRole("option", { name: "배송완료" }).id,
        ),
      );

      await user.keyboard("{Home}{Enter}");
      expect(onValueChange).toHaveBeenCalledWith("pending");
    });

    it("타이핑하면 해당 라벨의 옵션으로 이동한다", async () => {
      const user = userEvent.setup();
      const { onValueChange } = renderSelect();

      getTrigger().focus();
      await user.keyboard("{Enter}");
      const listbox = await screen.findByRole("listbox");

      await user.keyboard("배송중");
      await waitFor(() =>
        expect(getTrigger()).toHaveAttribute(
          "aria-activedescendant",
          within(listbox).getByRole("option", { name: "배송중" }).id,
        ),
      );

      await user.keyboard("{Enter}");
      expect(onValueChange).toHaveBeenCalledWith("shipping");
    });
  });
});
