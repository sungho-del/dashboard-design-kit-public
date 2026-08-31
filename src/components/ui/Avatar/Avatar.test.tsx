import { fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "./Avatar";

describe("Avatar", () => {
  describe("이니셜 fallback", () => {
    it("src가 없으면 이름의 첫 글자를 보여준다", () => {
      render(<Avatar name="김민수" />);
      expect(screen.getByText("김")).toBeInTheDocument();
      expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    });

    it("한글은 첫 글자를 그대로 쓴다", () => {
      render(<Avatar name="이서연" />);
      expect(screen.getByText("이")).toBeInTheDocument();
    });

    it("라틴 문자는 대문자로 정규화한다", () => {
      render(<Avatar name="alex kim" />);
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("앞뒤 공백은 무시하고 첫 글자를 뽑는다", () => {
      render(<Avatar name="  박지훈 " />);
      expect(screen.getByText("박")).toBeInTheDocument();
    });

    it("이미지 로드에 실패하면 이니셜로 폴백한다", () => {
      render(<Avatar name="김민수" src="https://example.invalid/a.png" />);

      // 처음에는 이미지를 시도한다
      const image = screen.getByRole("img", { name: "김민수" });
      expect(image.tagName).toBe("IMG");

      fireEvent.error(image);

      // 폴백 후에는 img 엘리먼트가 사라지고 이니셜이 남는다
      expect(screen.queryByAltText("김민수")).not.toBeInTheDocument();
      expect(screen.getByText("김")).toBeInTheDocument();
      expect(screen.getByRole("img", { name: "김민수" }).tagName).toBe("SPAN");
    });

    it("이니셜은 배경 대비를 위해 text-text를 쓴다", () => {
      render(<Avatar name="김민수" />);
      expect(screen.getByText("김").className).toContain("text-text");
    });
  });

  describe("이미지", () => {
    it("src가 있으면 이미지를 렌더링하고 alt에 name을 넣는다", () => {
      render(<Avatar name="김민수" src="/avatar.png" />);
      const image = screen.getByAltText("김민수");
      expect(image).toHaveAttribute("src", "/avatar.png");
    });

    it("이미지는 프레임을 채우도록 object-cover를 적용한다", () => {
      render(<Avatar name="김민수" src="/avatar.png" />);
      expect(screen.getByAltText("김민수").className).toContain("object-cover");
    });

    it("이미지가 있으면 이니셜을 렌더링하지 않는다", () => {
      render(<Avatar name="김민수" src="/avatar.png" />);
      expect(screen.queryByText("김")).not.toBeInTheDocument();
    });
  });

  describe("size", () => {
    it("기본 size는 medium(32px)이다", () => {
      const { container } = render(<Avatar name="김민수" />);
      expect((container.firstChild as HTMLElement).className).toContain(
        "size-8",
      );
    });

    it("small은 24px, large는 48px 유틸리티를 쓴다", () => {
      const { container, rerender } = render(
        <Avatar name="김민수" size="small" />,
      );
      expect((container.firstChild as HTMLElement).className).toContain(
        "size-6",
      );

      rerender(<Avatar name="김민수" size="large" />);
      expect((container.firstChild as HTMLElement).className).toContain(
        "size-12",
      );
    });

    it("size별로 이니셜 타이포 프리셋을 바꾼다", () => {
      const { rerender } = render(<Avatar name="김민수" size="small" />);
      expect(screen.getByText("김").className).toContain("label-xsmall");

      rerender(<Avatar name="김민수" size="medium" />);
      expect(screen.getByText("김").className).toContain("label-small-bold");

      rerender(<Avatar name="김민수" size="large" />);
      expect(screen.getByText("김").className).toContain("label-medium-bold");
    });
  });

  describe("스타일", () => {
    it("원형 프레임과 avatar 배경 토큰을 적용한다", () => {
      const { container } = render(<Avatar name="김민수" />);
      const className = (container.firstChild as HTMLElement).className;
      expect(className).toContain("rounded-full");
      expect(className).toContain("bg-surface-avatar");
    });

    it("1px avatar-deco 테두리를 안쪽 outline으로 그린다", () => {
      const { container } = render(<Avatar name="김민수" />);
      const className = (container.firstChild as HTMLElement).className;
      expect(className).toContain("outline-1");
      expect(className).toContain("-outline-offset-1");
      expect(className).toContain("outline-avatar-deco");
    });

    it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
      const { container } = render(
        <Avatar name="김민수" className="custom-class" />,
      );
      expect((container.firstChild as HTMLElement).className).toMatch(
        /custom-class$/,
      );
    });
  });

  describe("접근성", () => {
    it("이니셜 폴백일 때 래퍼가 img role과 전체 이름을 노출한다", () => {
      const { container } = render(<Avatar name="김민수" />);
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveAttribute("role", "img");
      expect(root).toHaveAccessibleName("김민수");
    });

    it("이니셜 글자 자체는 중복 낭독을 막기 위해 숨긴다", () => {
      render(<Avatar name="김민수" />);
      expect(screen.getByText("김")).toHaveAttribute("aria-hidden", "true");
    });

    it("이미지일 때는 img의 alt가 이름을 읽어주므로 래퍼에 role을 주지 않는다", () => {
      const { container } = render(<Avatar name="김민수" src="/avatar.png" />);
      const root = container.firstChild as HTMLElement;
      expect(root).not.toHaveAttribute("role");
      expect(root).not.toHaveAttribute("aria-label");
    });
  });
});
