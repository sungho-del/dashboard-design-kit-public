import { render, screen } from "@testing-library/react";
import { Card, CardBody, CardFooter, CardHeader } from "./Card";

function classOf(container: HTMLElement): string {
  return (container.firstChild as HTMLElement).className;
}

describe("Card", () => {
  it("자식을 렌더링한다", () => {
    render(<Card>내용</Card>);
    expect(screen.getByText("내용")).toBeVisible();
  });

  describe("표면 (DESIGN.md §26)", () => {
    it("surface 배경 · radius medium(8) · padding 24를 적용한다", () => {
      const { container } = render(<Card>내용</Card>);
      const className = classOf(container);
      expect(className).toContain("bg-surface");
      expect(className).toContain("rounded-medium");
      expect(className).toContain("p-6");
    });

    it("기본 카드는 그림자 없이 보더로 경계를 낸다 (DESIGN_참고.md §5)", () => {
      const { container } = render(<Card>내용</Card>);
      const className = classOf(container);
      expect(className).not.toContain("shadow-card");
      expect(className).toContain("outline-1");
      expect(className).toContain("-outline-offset-1");
      expect(className).toContain("outline-border");
    });

    it("elevated일 때만 shadow-card를 쓰고 보더는 뺀다", () => {
      const { container } = render(<Card elevated>내용</Card>);
      const className = classOf(container);
      expect(className).toContain("shadow-card");
      expect(className).not.toContain("outline-border");
      expect(container.firstChild).toHaveAttribute("data-elevated", "true");
    });

    it("elevated가 아니면 data-elevated를 노출하지 않는다", () => {
      const { container } = render(<Card>내용</Card>);
      expect(container.firstChild).not.toHaveAttribute("data-elevated");
    });
  });

  it("헤더·바디·푸터를 세로로 16 간격으로 쌓는다", () => {
    const { container } = render(<Card>내용</Card>);
    const className = classOf(container);
    expect(className).toContain("flex-col");
    expect(className).toContain("gap-4");
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    const { container } = render(<Card className="custom-class">내용</Card>);
    expect(classOf(container)).toMatch(/custom-class$/);
  });
});

describe("CardHeader", () => {
  it("제목을 heading 역할로 노출한다", () => {
    render(<CardHeader title="오늘의 매출" />);
    expect(
      screen.getByRole("heading", { name: "오늘의 매출" }),
    ).toBeInTheDocument();
  });

  it("제목 타이포는 heading-medium-bold 프리셋이다", () => {
    render(<CardHeader title="오늘의 매출" />);
    expect(screen.getByRole("heading").className).toContain(
      "heading-medium-bold",
    );
  });

  it("좌우 정렬 · gap 8 레이아웃을 쓴다", () => {
    const { container } = render(<CardHeader title="오늘의 매출" />);
    const className = classOf(container);
    expect(className).toContain("items-center");
    expect(className).toContain("justify-between");
    expect(className).toContain("gap-2");
  });

  it("action을 우측 슬롯에 렌더링한다", () => {
    render(
      <CardHeader
        title="오늘의 매출"
        action={<button type="button">더보기</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "더보기" })).toBeVisible();
  });

  it("children을 주면 기본 제목 대신 그것을 쓴다", () => {
    render(
      <CardHeader title="무시됨">
        <h2>커스텀 제목</h2>
      </CardHeader>,
    );
    expect(screen.getByRole("heading", { name: "커스텀 제목" })).toBeVisible();
    expect(screen.queryByText("무시됨")).toBeNull();
  });

  it("action이 없으면 우측 슬롯을 만들지 않는다", () => {
    const { container } = render(<CardHeader title="오늘의 매출" />);
    expect((container.firstChild as HTMLElement).children).toHaveLength(1);
  });
});

describe("CardBody", () => {
  it("본문 블록을 세로 20 간격으로 쌓는다", () => {
    const { container } = render(<CardBody>내용</CardBody>);
    const className = classOf(container);
    expect(className).toContain("flex-col");
    expect(className).toContain("gap-5");
  });
});

describe("CardFooter", () => {
  it("액션을 우측 정렬하고 8 간격으로 벌린다", () => {
    const { container } = render(<CardFooter>버튼</CardFooter>);
    const className = classOf(container);
    expect(className).toContain("justify-end");
    expect(className).toContain("gap-2");
  });
});

describe("합성", () => {
  it("Card + Header/Body/Footer를 함께 조립할 수 있다", () => {
    render(
      <Card>
        <CardHeader title="주문 요약" />
        <CardBody>본문</CardBody>
        <CardFooter>
          <button type="button">전체 보기</button>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByRole("heading", { name: "주문 요약" })).toBeVisible();
    expect(screen.getByText("본문")).toBeVisible();
    expect(screen.getByRole("button", { name: "전체 보기" })).toBeVisible();
  });
});
