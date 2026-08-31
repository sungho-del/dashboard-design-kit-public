import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableTd,
  TableTh,
} from "./Table";

/** 테스트마다 반복되는 최소 골격 */
function renderTable(
  options: {
    zebra?: boolean;
    dividers?: boolean;
    clickable?: boolean;
    sticky?: boolean;
    onRowClick?: () => void;
  } = {},
) {
  const { zebra, dividers, clickable, sticky, onRowClick } = options;
  return render(
    <Table zebra={zebra} dividers={dividers} data-testid="table">
      <TableHead sticky={sticky} data-testid="thead">
        <TableRow data-testid="head-row">
          <TableTh>주문번호</TableTh>
          <TableTh align="right">금액</TableTh>
        </TableRow>
      </TableHead>
      <TableBody data-testid="tbody">
        <TableRow
          data-testid="row-1"
          clickable={clickable}
          onClick={onRowClick}
        >
          <TableTd>20250814-0001</TableTd>
          <TableTd align="right">39,000원</TableTd>
        </TableRow>
        <TableRow data-testid="row-2">
          <TableTd>20250814-0002</TableTd>
          <TableTd align="right">78,000원</TableTd>
        </TableRow>
      </TableBody>
    </Table>,
  );
}

describe("Table", () => {
  it("시맨틱 table 구조를 유지한다", () => {
    renderTable();
    const table = screen.getByTestId("table");
    expect(table.tagName).toBe("TABLE");
    expect(screen.getByTestId("thead").tagName).toBe("THEAD");
    expect(screen.getByTestId("tbody").tagName).toBe("TBODY");
    expect(screen.getByTestId("row-1").tagName).toBe("TR");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("헤더 셀은 scope=col이 기본이라 columnheader로 노출된다", () => {
    renderTable();
    expect(
      screen.getByRole("columnheader", { name: "주문번호" }),
    ).toBeInTheDocument();
    expect(screen.getByText("주문번호").getAttribute("scope")).toBe("col");
  });

  /**
   * ⚠️ `w-max` 여야 한다. `w-auto` 면 표가 **shrink-to-fit** 으로 계산돼
   * `min(내용이 원하는 폭, 쓸 수 있는 폭)` 이 되고, **컨테이너보다 넓어질 수 없다.**
   * 그러면 `<col>` 에 아무리 넓게 선언해도 열이 비율대로 눌리기만 하고
   * 넘치는 것이 없어 래퍼의 `overflow-auto` 가 **스크롤바를 만들지 않는다.**
   * 실제로 24열짜리 주문 표가 잘린 채 가로 스크롤이 불가능했다.
   */
  it("table은 w-max min-w-full · border-collapse · table-fixed다", () => {
    renderTable();
    const className = screen.getByTestId("table").className.split(/\s+/);
    expect(className).toContain("w-max");
    expect(className).not.toContain("w-auto");
    expect(className).toContain("min-w-full");
    expect(className).toContain("border-collapse");
    expect(className).toContain("table-fixed");
  });

  it("전달한 className이 마지막에 붙어 오버라이드된다", () => {
    render(<Table className="custom-class" data-testid="table" />);
    expect(screen.getByTestId("table").className).toMatch(/custom-class$/);
  });

  describe("TableHead", () => {
    it("기본은 surface 배경 + 하단 divide 경계선이다", () => {
      renderTable();
      const className = screen.getByTestId("thead").className;
      expect(className).toContain("bg-surface");
      expect(className).toContain("border-b");
      expect(className).toContain("border-divide");
      expect(className).not.toContain("sticky");
    });

    it("sticky면 top-0 z-2 + ::after 1px으로 바뀌고 border-b는 쓰지 않는다", () => {
      renderTable({ sticky: true });
      const className = screen.getByTestId("thead").className;
      expect(className).toContain("sticky");
      expect(className).toContain("top-0");
      expect(className).toContain("z-2");
      expect(className).toContain("after:h-px");
      expect(className).toContain("after:bg-divide");
      // 같은 속성을 두 번 방출하지 않는다
      expect(className).not.toContain("border-b");
    });

    it("헤더 행은 zebra 대상이 아니다", () => {
      renderTable();
      const className = screen.getByTestId("head-row").className;
      expect(className).not.toContain("odd:bg-surface");
    });
  });

  describe("TableRow", () => {
    it("행 높이는 48(--size-table-row) 고정이다", () => {
      renderTable();
      expect(screen.getByTestId("row-1").className).toContain(
        "h-(--size-table-row)",
      );
    });

    it("기본 zebra는 홀수 surface · 짝수 surface-sub다", () => {
      renderTable();
      const className = screen.getByTestId("row-1").className;
      expect(className).toContain("odd:bg-surface");
      expect(className).toContain("even:bg-surface-sub");
    });

    it("마지막 행이 홀수일 때를 위한 하단 경계선 보정을 포함한다", () => {
      renderTable();
      expect(screen.getByTestId("row-1").className).toContain(
        "last:odd:border-b",
      );
    });

    it("zebra=false면 줄무늬 대신 td 하단 구분선을 쓴다", () => {
      renderTable({ zebra: false });
      const className = screen.getByTestId("row-1").className;
      expect(className).not.toContain("odd:bg-surface");
      expect(className).toContain("[&>td]:border-b");
      expect(className).toContain("[&>td]:border-divide");
    });

    it("행 단위로 zebra를 덮어쓸 수 있다", () => {
      render(
        <Table zebra>
          <TableBody>
            <TableRow data-testid="row" zebra={false}>
              <TableTd>셀</TableTd>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("row").className).not.toContain(
        "odd:bg-surface",
      );
    });

    it("clickable이면 pointer 커서와 0.2s 배경 전환을 준다", () => {
      renderTable({ clickable: true });
      const className = screen.getByTestId("row-1").className;
      expect(className).toContain("cursor-pointer");
      expect(className).toContain("transition-[background-color]");
      expect(className).toContain("duration-200");
    });

    it("clickable hover는 zebra를 이기도록 odd/even에 겹쳐 방출한다", () => {
      renderTable({ clickable: true });
      const className = screen.getByTestId("row-1").className;
      expect(className).toContain("odd:hover:bg-surface-sub");
      expect(className).toContain("even:hover:bg-surface-sub");
    });

    it("clickable이 아니면 hover 배경을 주지 않는다", () => {
      renderTable();
      expect(screen.getByTestId("row-1").className).not.toContain("hover:");
    });

    it("clickable 행의 클릭 핸들러가 호출된다", async () => {
      const onRowClick = vi.fn();
      renderTable({ clickable: true, onRowClick });
      await userEvent.click(screen.getByText("20250814-0001"));
      expect(onRowClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("TableTh / TableTd", () => {
    it("셀 padding은 좌우 12 · 상하 8 이고 첫/마지막 셀만 좌우 24다", () => {
      renderTable();
      const className = screen.getByText("20250814-0001").className;
      expect(className).toContain("px-3");
      expect(className).toContain("first:pl-6");
      expect(className).toContain("last:pr-6");
    });

    it("th는 body-small-bold, td는 body-medium 프리셋을 쓴다", () => {
      renderTable();
      expect(screen.getByText("주문번호").className).toContain(
        "body-small-bold",
      );
      expect(screen.getByText("20250814-0001").className).toContain(
        "body-medium",
      );
    });

    it("정렬 기본값은 좌측이다", () => {
      renderTable();
      expect(screen.getByText("주문번호").className).toContain("text-left");
      expect(screen.getByText("20250814-0001").className).toContain(
        "text-left",
      );
    });

    it("숫자 컬럼은 align=right로 우측 정렬한다", () => {
      renderTable();
      const className = screen.getByText("39,000원").className;
      expect(className).toContain("text-right");
      // text-align은 한 곳에서만 방출한다
      expect(className).not.toContain("text-left");
    });

    it("ellipsis면 내부 span에 line-clamp-2를 건다", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableTd data-testid="cell" ellipsis>
                아주 긴 상품명
              </TableTd>
            </TableRow>
          </TableBody>
        </Table>,
      );
      const cell = screen.getByTestId("cell");
      const inner = cell.querySelector("[data-table-ellipsis]");
      expect(inner).not.toBeNull();
      expect(inner?.className).toContain("line-clamp-2");
      // 셀 자체에는 걸지 않는다 (표 레이아웃 보호)
      expect(cell.className).not.toContain("line-clamp-2");
    });

    it("ellipsis가 아니면 자식을 그대로 렌더링한다", () => {
      renderTable();
      expect(
        screen
          .getByText("20250814-0001")
          .querySelector("[data-table-ellipsis]"),
      ).toBeNull();
    });
  });

  describe("세로 구분선 (DESIGN.md §7)", () => {
    it("기본은 세로 구분선을 그리지 않는다", () => {
      renderTable();
      expect(screen.getByText("주문번호").className).not.toContain("border-r");
      expect(screen.getByText("20250814-0001").className).not.toContain(
        "border-r",
      );
    });

    it("dividers면 th·td 모두 border-right 1px divide를 받는다", () => {
      renderTable({ dividers: true });

      for (const el of [
        screen.getByText("주문번호"),
        screen.getByText("20250814-0001"),
      ]) {
        expect(el.className).toContain("border-r");
        expect(el.className).toContain("border-r-divide");
      }
    });

    it("마지막 컬럼은 명시도가 더 높은 last:border-r-0으로 지운다", () => {
      renderTable({ dividers: true });
      expect(screen.getByText("39,000원").className).toContain(
        "last:border-r-0",
      );
    });

    it("sticky 헤더 셀은 border 대신 ::after로 그린다", () => {
      renderTable({ dividers: true, sticky: true });
      const className = screen.getByText("주문번호").className;

      expect(className).toContain("after:w-px");
      expect(className).toContain("after:bg-divide");
      expect(className).toContain("last:after:hidden");
      // border-collapse에서 sticky border는 사라지므로 두 방식을 겹치지 않는다
      expect(className).not.toContain("border-r");
    });

    it("sticky여도 본문 셀은 그대로 border-right를 쓴다", () => {
      renderTable({ dividers: true, sticky: true });
      const className = screen.getByText("20250814-0001").className;

      expect(className).toContain("border-r");
      expect(className).not.toContain("after:w-px");
    });

    it("셀 단위로 divider를 덮어쓸 수 있다", () => {
      render(
        <Table dividers>
          <TableBody>
            <TableRow>
              <TableTd data-testid="off" divider={false}>
                끔
              </TableTd>
              <TableTd>기본</TableTd>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("off").className).not.toContain("border-r");
      expect(screen.getByText("기본").className).toContain("border-r");
    });

    it("Table이 dividers=false여도 셀 단위로 켤 수 있다", () => {
      render(
        <Table>
          <TableBody>
            <TableRow>
              <TableTd data-testid="on" divider>
                켬
              </TableTd>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByTestId("on").className).toContain("border-r-divide");
    });

    it("noBackground(zebra=false)와 조합해도 둘 다 유지된다", () => {
      renderTable({ zebra: false, dividers: true });

      expect(screen.getByTestId("row-1").className).toContain(
        "[&>td]:border-b",
      );
      // 가로선은 행이, 세로선은 셀이 그린다 — 같은 속성을 두 곳에서 내지 않는다
      expect(screen.getByText("20250814-0001").className).toContain(
        "border-r-divide",
      );
      expect(screen.getByText("20250814-0001").className).not.toContain(
        "border-b",
      );
    });

    it("zebra와 조합해도 줄무늬가 유지된다", () => {
      renderTable({ dividers: true });
      expect(screen.getByTestId("row-1").className).toContain("odd:bg-surface");
    });
  });

  describe("합성 표기", () => {
    it("Table.Row 등은 named export와 동일한 컴포넌트다", () => {
      expect(Table.Head).toBe(TableHead);
      expect(Table.Body).toBe(TableBody);
      expect(Table.Row).toBe(TableRow);
      expect(Table.Th).toBe(TableTh);
      expect(Table.Td).toBe(TableTd);
    });
  });
});
