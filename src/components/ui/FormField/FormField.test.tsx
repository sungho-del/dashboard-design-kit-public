import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { FormField } from "./FormField";
import { DatePicker } from "../DatePicker";
import { Input } from "../Input";
import { Select } from "../Select";
import { Textarea } from "../Textarea";
import { TextButton } from "../TextButton";

/**
 * FormField 는 "라벨·설명·에러를 컨트롤에 **어떻게 잇는가**" 가 전부인 컴포넌트라
 * 테스트도 연결(id·aria)과 **비연결**(접근성 이름에 설명이 섞이지 않는가)에 집중한다.
 *
 * 클래스 검증은 반드시 `className.split(/\s+/)` 배열에 대해 검사한다 —
 * 문자열 `toContain` 은 `gap-1.5` 안에서 `gap-1` 을 찾아내는 식으로 부분 일치를
 * 통과시켜, "없어야 할 클래스가 없다" 를 검사할 수 없다.
 */
function rootClasses(ui: ReactElement) {
  const { container } = render(ui);
  return (container.firstElementChild?.className ?? "").split(/\s+/);
}

describe("FormField", () => {
  it("라벨을 렌더링한다", () => {
    const { container } = render(
      <FormField label="상품명">
        <Input />
      </FormField>,
    );

    expect(container.querySelector("label")).toHaveTextContent("상품명");
  });

  describe("id 연결", () => {
    it("id 를 주지 않아도 라벨로 컨트롤을 찾을 수 있다", () => {
      render(
        <FormField label="상품명">
          <Input />
        </FormField>,
      );

      // 자동 생성한 id 가 자식에 주입되고 <label for> 가 그것을 가리킨다
      expect(screen.getByLabelText("상품명")).toBe(screen.getByRole("textbox"));
    });

    it("자식이 이미 가진 id 는 자동 id 로 덮어쓰지 않는다", () => {
      render(
        <FormField label="상품명">
          <Input id="custom" />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom");
    });

    it("htmlFor 를 주면 라벨과 자식 id 가 같은 값으로 맞물린다", () => {
      render(
        <FormField label="상품명" htmlFor="product-name">
          <Input />
        </FormField>,
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("id", "product-name");
      expect(screen.getByLabelText("상품명")).toBe(input);
    });

    it("자식이 이미 가진 aria-describedby 는 유지된다", () => {
      render(
        <FormField label="상품명" description="고객에게 노출됩니다">
          <Input aria-describedby="outside" />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-describedby",
        "outside",
      );
    });

    it("메시지가 없으면 aria-describedby 를 아예 붙이지 않는다", () => {
      render(
        <FormField label="상품명">
          <Input />
        </FormField>,
      );

      // 가리킬 대상이 없는 describedby 는 스크린리더에서 침묵으로 이어진다
      expect(screen.getByRole("textbox")).not.toHaveAttribute(
        "aria-describedby",
      );
    });
  });

  /**
   * §29-7 의 핵심 금지 — `<label>` 안에 설명을 넣으면 접근성 이름이 오염된다.
   * 실제로 그렇게 만들었다가 스크린리더가 라벨과 도움말을 한 덩어리로 읽은 전례가 있어,
   * "이름은 라벨 텍스트뿐" 을 구조·계산 양쪽에서 못박는다.
   */
  describe("§29-7 접근성 이름 오염 방지", () => {
    it("labelDescription·description 이 접근성 이름에 섞이지 않는다", () => {
      render(
        <FormField
          label="상품명"
          labelDescription="고객에게 그대로 노출됩니다"
          description="최대 100자까지 입력할 수 있습니다"
        >
          <Input />
        </FormField>,
      );

      const input = screen.getByRole("textbox");

      // 이름은 라벨 텍스트뿐
      expect(input).toHaveAccessibleName("상품명");
      expect(input).not.toHaveAccessibleName(/노출됩니다/);
      expect(input).not.toHaveAccessibleName(/100자/);

      // 두 설명 모두 aria-describedby 로만 전달된다 (이름이 아니라 설명으로)
      expect(input).toHaveAccessibleDescription(
        "고객에게 그대로 노출됩니다 최대 100자까지 입력할 수 있습니다",
      );
    });

    it("labelDescription 은 보이되 <label> 바깥에 있다", () => {
      const { container } = render(
        <FormField label="상품명" labelDescription="고객에게 그대로 노출됩니다">
          <Input />
        </FormField>,
      );

      const labelDescription = screen.getByText("고객에게 그대로 노출됩니다");
      expect(labelDescription).toBeVisible();

      const labelEl = container.querySelector("label");
      expect(labelEl).not.toContainElement(labelDescription);
      // 라벨의 텍스트는 label prop 하나뿐이어야 한다
      expect(labelEl?.textContent).toBe("상품명");
    });
  });

  describe("§29-5 에러는 도움말을 대체한다", () => {
    it("error 와 description 을 함께 줘도 error 만 남는다", () => {
      render(
        <FormField
          label="상품명"
          description="고객에게 노출됩니다"
          error="상품명을 입력해 주세요"
        >
          <Input />
        </FormField>,
      );

      expect(screen.getByText("상품명을 입력해 주세요")).toBeVisible();
      // 두 메시지를 동시에 띄우면 레이아웃이 밀리고 시선이 흩어진다
      expect(screen.queryByText("고객에게 노출됩니다")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
        "상품명을 입력해 주세요",
      );
    });

    it("에러 메시지는 하나만 그려진다", () => {
      render(
        <FormField
          label="상품명"
          description="고객에게 노출됩니다"
          error="상품명을 입력해 주세요"
        >
          <Input />
        </FormField>,
      );

      expect(screen.getAllByRole("alert")).toHaveLength(1);
    });

    it("description 만 있으면 alert 로 알리지 않는다", () => {
      render(
        <FormField label="상품명" description="고객에게 노출됩니다">
          <Input />
        </FormField>,
      );

      // 도움말은 살아있는 영역이 아니다 — 포커스 시 describedby 로만 읽힌다
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
        "고객에게 노출됩니다",
      );
    });
  });

  describe("error 상태 주입", () => {
    it("자식에 aria-invalid 와 invalid 스타일이 함께 주입된다", () => {
      const { container } = render(
        <FormField label="상품명" error="상품명을 입력해 주세요">
          <Input />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-invalid",
        "true",
      );

      // aria 만 붙고 `invalid` prop 이 빠지면 화면은 멀쩡해 보인다.
      // Input 이 invalid 일 때만 내는 배경으로 prop 주입까지 확인한다
      const field = container.querySelector("[data-invalid]");
      const cls = (field?.className ?? "").split(/\s+/);
      expect(cls).toContain("bg-surface-critical-secondary");
      expect(cls).not.toContain("bg-surface");
    });

    it("error 가 없으면 aria-invalid 를 붙이지 않는다", () => {
      const { container } = render(
        <FormField label="상품명" description="고객에게 노출됩니다">
          <Input />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
      expect(container.querySelector("[data-invalid]")).toBeNull();
    });
  });

  describe("required", () => {
    it("* 는 보이되 접근성 이름에는 섞이지 않는다", () => {
      const { container } = render(
        <FormField label="상품명" required>
          <Input />
        </FormField>,
      );

      const star = container.querySelector("label > span[aria-hidden]");
      expect(star?.textContent?.trim()).toBe("*");

      // 시각 기호가 이름에 섞이면 "상품명 별표" 처럼 읽힌다
      expect(screen.getByRole("textbox")).toHaveAccessibleName("상품명");
    });

    it("필수 여부는 컨트롤의 aria-required 가 전달한다", () => {
      render(
        <FormField label="상품명" required>
          <Input />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).toHaveAttribute(
        "aria-required",
        "true",
      );
    });

    it("required 가 아니면 aria-required 도 * 도 없다", () => {
      const { container } = render(
        <FormField label="상품명">
          <Input />
        </FormField>,
      );

      expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-required");
      expect(container.querySelector("label > span[aria-hidden]")).toBeNull();
    });
  });

  describe("§29-3 orientation", () => {
    it("row 는 실측 gap(24/12) 과 991px 이하 줄바꿈을 방출한다", () => {
      const cls = rootClasses(
        <FormField label="사용 여부" orientation="row">
          <Input />
        </FormField>,
      );

      expect(cls).toContain("items-center");
      expect(cls).toContain("gap-x-3");
      expect(cls).toContain("gap-y-6");
      expect(cls).toContain("max-desktop:flex-wrap");
      // 세로 배치용 클래스가 함께 나오면 gap 이 두 번 방출돼 승자가 순서에 좌우된다
      expect(cls).not.toContain("flex-col");
      expect(cls).not.toContain("gap-1.5");
    });

    it("column(기본) 은 row 전용 클래스를 방출하지 않는다", () => {
      const cls = rootClasses(
        <FormField label="상품명">
          <Input />
        </FormField>,
      );

      expect(cls).toContain("flex-col");
      expect(cls).toContain("gap-1.5");
      expect(cls).not.toContain("items-center");
      expect(cls).not.toContain("gap-x-3");
      expect(cls).not.toContain("gap-y-6");
      expect(cls).not.toContain("max-desktop:flex-wrap");
    });

    it("row 에서도 라벨·에러 연결은 그대로 유지된다", () => {
      render(
        <FormField
          label="사용 여부"
          orientation="row"
          error="값을 선택해 주세요"
        >
          <Input />
        </FormField>,
      );

      const input = screen.getByRole("textbox");
      expect(screen.getByLabelText("사용 여부")).toBe(input);
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("값을 선택해 주세요");
    });
  });

  describe("labelAction", () => {
    it("액션이 있으면 라벨 행을 양끝 정렬한다", () => {
      const { container } = render(
        <FormField
          label="상품명"
          labelAction={<TextButton size="small">초기화</TextButton>}
        >
          <Input />
        </FormField>,
      );

      expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();

      const labelRow = container.querySelector("label")?.parentElement;
      expect((labelRow?.className ?? "").split(/\s+/)).toContain(
        "justify-between",
      );
    });

    it("액션이 없으면 justify-between 을 방출하지 않는다", () => {
      const { container } = render(
        <FormField label="상품명">
          <Input />
        </FormField>,
      );

      const labelRow = container.querySelector("label")?.parentElement;
      expect((labelRow?.className ?? "").split(/\s+/)).not.toContain(
        "justify-between",
      );
    });
  });

  describe("단일 요소가 아닌 children", () => {
    it("여러 요소를 넘겨도 크래시 없이 렌더된다", () => {
      render(
        <FormField label="판매 기간">
          <Input aria-label="시작일" />
          <Input aria-label="종료일" />
        </FormField>,
      );

      // 주입 대상을 특정할 수 없으므로 id·aria 주입은 건너뛰고 그대로 렌더한다
      expect(screen.getAllByRole("textbox")).toHaveLength(2);
      expect(screen.getByLabelText("시작일")).not.toHaveAttribute(
        "aria-describedby",
      );
    });

    it("문자열 children 도 그대로 렌더된다", () => {
      render(<FormField label="처리 상태">준비중</FormField>);

      expect(screen.getByText("준비중")).toBeVisible();
    });

    it("여러 요소 + error 조합에서도 메시지는 정상 렌더된다", () => {
      render(
        <FormField label="판매 기간" error="기간을 다시 확인해 주세요">
          <Input aria-label="시작일" />
          <Input aria-label="종료일" />
        </FormField>,
      );

      expect(screen.getByRole("alert")).toHaveTextContent(
        "기간을 다시 확인해 주세요",
      );
    });
  });

  describe("다른 컨트롤과의 조합", () => {
    it("Select 트리거에도 라벨·에러가 연결된다", () => {
      render(
        <FormField label="주문 상태" error="상태를 선택해 주세요">
          <Select
            options={[
              { value: "paid", label: "결제완료" },
              { value: "ready", label: "배송준비" },
            ]}
          />
        </FormField>,
      );

      const trigger = screen.getByRole("combobox");
      expect(screen.getByLabelText("주문 상태")).toBe(trigger);
      expect(trigger).toHaveAttribute("aria-invalid", "true");
      expect(trigger).toHaveAccessibleDescription("상태를 선택해 주세요");
    });

    it("Textarea 가 이미 가진 글자수 설명과 도움말이 함께 전달된다", () => {
      render(
        <FormField
          label="상세 설명"
          description="상품 상세 페이지에 노출됩니다"
        >
          <Textarea maxLength={200} />
        </FormField>,
      );

      const textarea = screen.getByRole("textbox");
      const describedby = (
        textarea.getAttribute("aria-describedby") ?? ""
      ).split(/\s+/);

      // 한쪽이 다른 쪽을 덮어쓰면 카운터나 도움말 중 하나가 통째로 사라진다
      expect(describedby).toHaveLength(2);
      expect(textarea).toHaveAccessibleDescription(
        /상품 상세 페이지에 노출됩니다/,
      );
      expect(textarea).toHaveAccessibleDescription(/0\/200/);
    });
  });

  it("전달한 className 이 루트에 마지막으로 붙는다", () => {
    const { container } = render(
      <FormField label="상품명" className="custom-class">
        <Input />
      </FormField>,
    );

    expect(container.firstElementChild?.className).toMatch(/custom-class$/);
  });

  describe("group — labelable 하지 않은 그룹 컨트롤", () => {
    /*
     * `<label for>` 는 input·textarea·select·button 같은 **labelable 요소만** 가리킨다.
     * RadioGroup·SegmentedControl 의 루트는 `<div role="radiogroup">` 이라 `for` 가
     * 성립하지 않아 **이름이 아예 안 붙는 상태**가 된다. `group` 이 그걸 막는다.
     */
    function Group(props: { id?: string; "aria-labelledby"?: string }) {
      return (
        <div role="radiogroup" {...props}>
          <span>옵션</span>
        </div>
      );
    }

    it("group 이면 라벨이 aria-labelledby 로 이어져 접근가능 이름이 생긴다", () => {
      render(
        <FormField label="배송비 유형" group>
          <Group />
        </FormField>,
      );

      // 이름이 실제로 계산되는지가 핵심 — 연결이 끊기면 이 질의가 실패한다
      expect(
        screen.getByRole("radiogroup", { name: "배송비 유형" }),
      ).toBeInTheDocument();
    });

    it("group 이 아니면 <div> 그룹에는 이름이 붙지 않는다 (회귀 방지)", () => {
      render(
        <FormField label="배송비 유형">
          <Group />
        </FormField>,
      );

      // group 을 빠뜨리면 이름이 없다 — 이 사실을 테스트로 고정해 둔다
      expect(
        screen.queryByRole("radiogroup", { name: "배송비 유형" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("radiogroup")).not.toHaveAttribute(
        "aria-labelledby",
      );
    });

    it("group 이면 라벨을 <label> 로 그리지 않는다", () => {
      const { container } = render(
        <FormField label="배송비 유형" group>
          <Group />
        </FormField>,
      );

      expect(container.querySelector("label")).toBeNull();
      expect(screen.getByText("배송비 유형").tagName).toBe("SPAN");
    });

    it("group 이어도 required · 도움말 연결은 그대로 동작한다", () => {
      render(
        <FormField
          label="배송비 유형"
          group
          required
          description="필수 항목입니다"
        >
          <Group />
        </FormField>,
      );

      const g = screen.getByRole("radiogroup", { name: "배송비 유형" });
      expect(g).toHaveAttribute("aria-required", "true");
      expect(g).toHaveAccessibleDescription("필수 항목입니다");
    });
  });

  describe("labelDescription 도 설명으로 전달된다", () => {
    it("labelDescription 이 aria-describedby 에 포함된다", () => {
      render(
        <FormField
          label="상품 코드"
          labelDescription="미입력 시 자동 생성됩니다"
        >
          <Input />
        </FormField>,
      );

      const input = screen.getByRole("textbox");
      // 화면에 보이는데 스크린리더에 전달되지 않으면 그 정보는 없는 것과 같다
      expect(input).toHaveAccessibleDescription("미입력 시 자동 생성됩니다");
      // 이름은 여전히 라벨뿐이어야 한다 — 설명이 이름으로 새면 안 된다
      expect(input).toHaveAccessibleName("상품 코드");
    });

    it("labelDescription 과 도움말이 둘 다 있으면 설명 2개가 합쳐진다", () => {
      render(
        <FormField
          label="상품 코드"
          labelDescription="미입력 시 자동 생성됩니다"
          description="영문·숫자만 사용할 수 있습니다"
        >
          <Input />
        </FormField>,
      );

      const ids = (
        screen.getByRole("textbox").getAttribute("aria-describedby") ?? ""
      ).split(/\s+/);
      expect(ids).toHaveLength(2);
      expect(screen.getByRole("textbox")).toHaveAccessibleDescription(
        "미입력 시 자동 생성됩니다 영문·숫자만 사용할 수 있습니다",
      );
    });
  });

  describe("커스텀 트리거를 쓰는 컨트롤(DatePicker)과도 이어진다", () => {
    /*
     * `FormField` 는 자식을 `cloneElement` 해 aria 를 주입하지만, **자식이 그걸 받아
     * 실제 요소에 실어 보내지 않으면 연결이 끊긴다.** `DatePicker` 는 네이티브 input 이
     * 아니라 `<button>` 트리거를 그리므로 props 를 명시적으로 전달해야 한다.
     *
     * 실제로 그러지 않고 있었다 — 에러 문구가 **화면에는 보이는데 스크린리더에는
     * 전달되지 않는** 상태였다. 병원 폼(생년월일 필수)을 생성하다 드러났다.
     * 같은 구조의 컨트롤을 추가할 때 이 테스트가 계약을 지킨다.
     */
    const trigger = () => screen.getByRole("button", { expanded: false });

    it("도움말이 트리거에 연결된다", () => {
      render(
        <FormField label="판매 기간" description="비워두면 무기한 판매합니다">
          <DatePicker mode="range" />
        </FormField>,
      );

      expect(trigger()).toHaveAccessibleDescription(
        "비워두면 무기한 판매합니다",
      );
    });

    it("error 면 aria-invalid 와 시각 표현이 함께 켜진다", () => {
      render(
        <FormField label="생년월일" error="생년월일을 선택해 주세요">
          <DatePicker />
        </FormField>,
      );

      const el = trigger();
      expect(el).toHaveAttribute("aria-invalid", "true");
      expect(el).toHaveAccessibleDescription("생년월일을 선택해 주세요");

      // 시각 표현도 함께 — aria 만 붙고 색이 그대로면 눈으로는 오류를 알 수 없다
      const cls = el.className.split(/\s+/);
      expect(cls).toContain("bg-surface-critical-secondary");
      expect(cls).not.toContain("bg-surface");
    });

    it("required 면 aria-required 가 붙고 이름은 라벨뿐이다", () => {
      render(
        <FormField label="생년월일" required>
          <DatePicker />
        </FormField>,
      );

      const el = trigger();
      expect(el).toHaveAttribute("aria-required", "true");
      // `*` 는 aria-hidden 이라 이름에 섞이지 않는다
      expect(el).toHaveAccessibleName("생년월일");
    });

    it("에러가 없으면 aria-invalid 를 붙이지 않는다", () => {
      render(
        <FormField label="판매 기간">
          <DatePicker />
        </FormField>,
      );

      const el = trigger();
      expect(el).not.toHaveAttribute("aria-invalid");
      expect(el.className.split(/\s+/)).toContain("bg-surface");
    });
  });
});
