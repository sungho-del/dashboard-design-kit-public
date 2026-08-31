import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { InfoItem, InfoList } from "./InfoList";
import { Tag } from "../Tag";

/**
 * InfoList 는 "원본 실측 수치를 그대로 들고 있는 껍데기" 라서,
 * 테스트가 지켜야 할 것은 두 가지다.
 *
 *  1. **실측 규격이 실제로 클래스로 방출되는가** — `.style_infoList`(padding 16 · gap 8 ·
 *     surface-sub · radius medium) / `.style_infoItem`(gap 10 · center) /
 *     `.style_infoLabel`(width 80 · shrink 0).
 *  2. **`<dl>`/`<dt>`/`<dd>` 시맨틱이 유지되는가** — 이게 무너지면 "라벨:값" 이라는
 *     의미가 사라지고 그냥 회색 박스가 된다.
 *
 * 클래스 검증은 반드시 `className.split(/\s+/)` **배열**에 대해 한다.
 * 문자열 `toContain("gap-2")` 는 `gap-2.5` 안에서도 참이 되어,
 * "8 이 아니라 10 이 나갔다" 같은 사고를 그대로 통과시킨다.
 * (이 프로젝트에서 실제로 두 번 났던 사고다)
 */
function classesOf(el: Element | null | undefined) {
  return (el?.className ?? "").split(/\s+/).filter(Boolean);
}

function rootClasses(ui: ReactElement) {
  const { container } = render(ui);
  return classesOf(container.firstElementChild);
}

describe("InfoList", () => {
  describe("실측 규격 — .style_infoList", () => {
    it("padding 16 · gap 8 · surface-sub · radius medium 을 방출한다", () => {
      const cls = rootClasses(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      expect(cls).toContain("flex");
      expect(cls).toContain("flex-col");
      expect(cls).toContain("p-4"); // padding 16
      expect(cls).toContain("gap-2"); // 항목 간 8
      expect(cls).toContain("bg-surface-sub");
      expect(cls).toContain("rounded-medium");
    });

    it("항목 간 gap 은 8 이지 10 이 아니다", () => {
      const cls = rootClasses(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      // 문자열 toContain 이었다면 "gap-2.5".includes("gap-2") 가 true 라
      // 8 자리에 10 이 들어가도 통과해 버린다. 배열이라야 구분된다
      expect(cls).toContain("gap-2");
      expect(cls).not.toContain("gap-2.5");
      // 리스트는 회색 박스다 — 흰 면(surface)이 나가면 원본과 달라진다
      expect(cls).not.toContain("bg-surface");
    });

    it("루트는 <dl> 이다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      expect(container.firstElementChild?.tagName).toBe("DL");
    });

    it("전달한 className 이 루트에 마지막으로 붙는다", () => {
      const { container } = render(
        <InfoList className="custom-class">
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      // cn() 은 병합하지 않으므로 오버라이드가 이기려면 항상 끝에 와야 한다
      expect(container.firstElementChild?.className).toMatch(/custom-class$/);
    });

    it("HTML 속성을 루트로 흘려보낸다", () => {
      const { container } = render(
        <InfoList aria-label="주문 정보" data-testid="info">
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      expect(container.firstElementChild).toHaveAttribute(
        "aria-label",
        "주문 정보",
      );
      expect(screen.getByTestId("info").tagName).toBe("DL");
    });
  });

  describe("실측 규격 — .style_infoItem", () => {
    it("라벨↔값 gap 10 · align-items:center 를 방출한다", () => {
      const cls = rootClasses(
        <InfoItem label="주문번호">20260814-0012</InfoItem>,
      );

      expect(cls).toContain("flex");
      expect(cls).toContain("items-center");
      expect(cls).toContain("gap-2.5"); // 10
    });

    it("항목의 gap 은 10 이지 8 이 아니다", () => {
      const cls = rootClasses(
        <InfoItem label="주문번호">20260814-0012</InfoItem>,
      );

      // 배열이라 "gap-2.5" 와 "gap-2" 가 서로 다른 원소로 구분된다.
      // 문자열 검사였다면 이 not.toContain 은 항상 실패했을 것이다
      expect(cls).toContain("gap-2.5");
      expect(cls).not.toContain("gap-2");
      // 세로 배치가 섞이면 라벨이 값 위로 올라간다
      expect(cls).not.toContain("flex-col");
    });

    it("전달한 className 이 항목 루트에 마지막으로 붙는다", () => {
      const { container } = render(
        <InfoItem label="주문번호" className="custom-class">
          20260814-0012
        </InfoItem>,
      );

      expect(container.firstElementChild?.className).toMatch(/custom-class$/);
    });
  });

  describe("시맨틱 — dl / dt / dd", () => {
    it("라벨은 <dt>, 값은 <dd> 로 그린다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      expect(container.querySelector("dt")).toHaveTextContent("주문번호");
      expect(container.querySelector("dd")).toHaveTextContent("20260814-0012");
    });

    it("term / definition 롤로도 찾을 수 있다", () => {
      render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      // 접근성 트리에서 "용어-정의" 쌍으로 노출되는지가 이 컴포넌트의 존재 이유다
      expect(screen.getByRole("term")).toHaveTextContent("주문번호");
      expect(screen.getByRole("definition")).toHaveTextContent("20260814-0012");
    });

    it("값에 요소를 넣어도 <dd> 안에 들어간다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문상태">
            <Tag tone="success" dot>
              배송완료
            </Tag>
          </InfoItem>
        </InfoList>,
      );

      const dd = container.querySelector("dd");
      expect(dd).toContainElement(screen.getByText("배송완료"));
    });

    it("여러 항목을 넣으면 dt/dd 가 개수대로 짝지어 렌더된다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
          <InfoItem label="주문일시">2026-08-14 11:02</InfoItem>
          <InfoItem label="결제수단">신용카드</InfoItem>
        </InfoList>,
      );

      expect(container.querySelectorAll("dt")).toHaveLength(3);
      expect(container.querySelectorAll("dd")).toHaveLength(3);
      expect(screen.getAllByRole("term")).toHaveLength(3);
      expect(screen.getAllByRole("definition")).toHaveLength(3);

      // 순서까지 보존되어야 라벨과 값이 어긋나지 않는다
      expect(
        Array.from(container.querySelectorAll("dt")).map(
          (el) => el.textContent,
        ),
      ).toEqual(["주문번호", "주문일시", "결제수단"]);
    });
  });

  describe("라벨 폭 — .style_infoLabel", () => {
    it("기본은 w-20(80) + shrink-0 이고 인라인 width 는 붙지 않는다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      const dt = container.querySelector("dt");
      const cls = classesOf(dt);

      expect(cls).toContain("w-20"); // 80
      expect(cls).toContain("shrink-0"); // 값이 길어도 라벨이 찌그러지지 않는다
      // 문자열 검사라면 "w-20".includes("w-2") 로 통과했을 자리
      expect(cls).not.toContain("w-2");
      expect(dt?.style.width).toBe("");
    });

    it("labelWidth 를 주면 인라인 width 로 바뀌고 w-20 은 방출되지 않는다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="수령인 연락처" labelWidth={120}>
            010-0000-0000
          </InfoItem>
        </InfoList>,
      );

      const dt = container.querySelector("dt");
      const cls = classesOf(dt);

      expect(dt?.style.width).toBe("120px");
      // cn() 은 병합하지 않는다 — w-20 이 함께 나가면 CSS 순서가 승자를 정해
      // labelWidth 가 무시될 수 있다. 그래서 배타 분기로 짜여 있고, 이 테스트가 그걸 잠근다
      expect(cls).not.toContain("w-20");
      // 폭만 바뀔 뿐 shrink-0 은 유지된다
      expect(cls).toContain("shrink-0");
    });

    it("labelWidth={0} 도 커스텀으로 취급한다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="" labelWidth={0}>
            값만 표시
          </InfoItem>
        </InfoList>,
      );

      const dt = container.querySelector("dt");

      // `labelWidth !== undefined` 가 아니라 truthy 검사였다면 0 이 기본값으로 새어
      // w-20(80) 이 그려진다
      expect(dt?.style.width).toBe("0px");
      expect(classesOf(dt)).not.toContain("w-20");
    });

    it("항목마다 라벨 폭을 따로 줄 수 있다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
          <InfoItem label="수령인 연락처" labelWidth={120}>
            010-0000-0000
          </InfoItem>
        </InfoList>,
      );

      const [first, second] = Array.from(container.querySelectorAll("dt"));

      expect(classesOf(first)).toContain("w-20");
      expect(first.style.width).toBe("");
      expect(classesOf(second)).not.toContain("w-20");
      expect(second.style.width).toBe("120px");
    });
  });

  describe("타이포·색", () => {
    it("라벨은 text-sub, 값은 text 로 위계를 만든다", () => {
      const { container } = render(
        <InfoList>
          <InfoItem label="주문번호">20260814-0012</InfoItem>
        </InfoList>,
      );

      const dtCls = classesOf(container.querySelector("dt"));
      const ddCls = classesOf(container.querySelector("dd"));

      expect(dtCls).toContain("label-medium");
      expect(dtCls).toContain("text-text-sub");
      expect(ddCls).toContain("label-medium");
      expect(ddCls).toContain("text-text");
      // 라벨과 값이 같은 색이면 "라벨:값" 위계가 사라진다
      expect(ddCls).not.toContain("text-text-sub");
      // 값은 줄바꿈되어야 하므로 최소폭을 풀어 둔다
      expect(ddCls).toContain("min-w-0");
    });
  });
});
