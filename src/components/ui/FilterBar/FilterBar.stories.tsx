import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { FilterBar } from "./FilterBar";
import { Input } from "../Input";
import { Select } from "../Select";

/* -------------------------------------------------------------------------
 * FilterBar — 목록 화면의 "검색조건" 바
 * ---------------------------------------------------------------------- */

const meta = {
  title: "UI/FilterBar",
  component: FilterBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    design: {
      type: "figma",
      url: "https://www.figma.com/design/clay/BabyCube-Admin?node-id=filter-bar",
    },
    docs: {
      description: {
        component: [
          "목록 화면의 조건 영역입니다. **기본은 접힘**이고, 접힌 줄이 지금 걸린 조건을 요약합니다.",
          "",
          "- **조건을 모르는 껍데기입니다.** 안에 무엇이 들어가는지·언제 적용되는지·요약 문구를 어떻게 만드는지는 화면이 정합니다.",
          "- **`summary` 는 비우지 않습니다.** 조건이 없을 때도 `조건 없음 (전체)` 처럼 적습니다 — 비워 두면 '조건이 없는 것'과 '요약을 못 만든 것'이 구별되지 않습니다.",
          "- **닫히면 내용이 DOM 에서 빠집니다.** `hidden` 으로 숨기면 입력칸이 탭 순서에 남아 보이지 않는 곳으로 포커스가 갑니다.",
        ].join("\n"),
      },
    },
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

const FIELDS = [
  { value: "name", label: "이름" },
  { value: "phone", label: "연락처" },
];

/** 상태를 쥔 껍데기 — 스토리마다 되풀이하지 않는다 */
function Demo({
  initialOpen = false,
  summary = "조건 없음 (전체)",
  onReset,
}: {
  initialOpen?: boolean;
  summary?: string;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [field, setField] = useState(FIELDS[0].value);
  const [keyword, setKeyword] = useState("");

  return (
    <FilterBar
      open={open}
      onOpenChange={setOpen}
      summary={summary}
      onReset={onReset ?? (() => setKeyword(""))}
    >
      <Select
        aria-label="검색 조건"
        options={FIELDS}
        value={field}
        onValueChange={setField}
      />
      <Input
        placeholder="검색어 입력"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
      />
    </FilterBar>
  );
}

/** 기본 — 접힌 채로 열린다 */
export const Default: Story = {
  args: { open: false, onOpenChange: () => {}, summary: "조건 없음 (전체)" },
  render: () => <Demo />,
};

/** 펼친 상태 — 조건 컨트롤이 나온다 */
export const Open: Story = {
  args: { open: true, onOpenChange: () => {}, summary: "조건 없음 (전체)" },
  render: () => <Demo initialOpen />,
};

/** 조건이 걸린 상태 — 접혀 있어도 무엇이 걸렸는지 읽힌다 */
export const WithSummary: Story = {
  args: {
    open: false,
    onOpenChange: () => {},
    summary: "가입일 2026.08.01~2026.08.31 · 이름 «김»",
  },
  render: () => <Demo summary="가입일 2026.08.01~2026.08.31 · 이름 «김»" />,
};

/** 초기화 버튼이 없는 경우 — 되돌릴 것이 없는 화면 */
export const WithoutReset: Story = {
  args: { open: false, onOpenChange: () => {}, summary: "조건 없음 (전체)" },
  render: () => {
    function NoReset() {
      const [open, setOpen] = useState(false);
      return (
        <FilterBar
          open={open}
          onOpenChange={setOpen}
          summary="조건 없음 (전체)"
        >
          <Input placeholder="검색어 입력" />
        </FilterBar>
      );
    }
    return <NoReset />;
  },
};

/**
 * 열고 닫는 동작과 **포커스 안전**을 함께 확인한다 —
 * 닫으면 안의 입력칸이 DOM 에서 빠져야 한다.
 */
export const Toggling: Story = {
  args: { open: false, onOpenChange: () => {}, summary: "조건 없음 (전체)" },
  render: () => <Demo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const toggle = canvas.getByRole("button", { name: /검색 열기/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByPlaceholderText("검색어 입력")).toBeNull();

    await userEvent.click(toggle);
    await expect(canvas.getByPlaceholderText("검색어 입력")).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: /검색 닫기/ }),
    ).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(canvas.getByRole("button", { name: /검색 닫기/ }));
    await expect(canvas.queryByPlaceholderText("검색어 입력")).toBeNull();
  },
};
