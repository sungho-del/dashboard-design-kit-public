import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Plus } from "lucide-react";
import { Button } from "../Button";
import { Card, CardBody, CardHeader } from "../Card";
import { PageHeader } from "../PageHeader";
import { Tabs } from "../Tabs";
/* 계정 묶음은 UI 부품이 아니라 페이지 계층의 공용 조립이다 — 스토리는 실제 조립을 그대로 보여 준다 */
import { AccountBar } from "../../../pages/AccountBar";
import { AppShell, AppShellProvider } from "./AppShell";

/**
 * 사이드바 자리 플레이스홀더.
 * GNB(DESIGN.md §23)는 별도 컴포넌트로 만들어지는 중이라, 셸 스토리에서는
 * 확장 폭(224 = `w-56`)과 `h-dvh`만 흉내 내는 빈 면을 넣는다.
 */
function SidebarPlaceholder() {
  return (
    <div className="flex h-dvh w-56 shrink-0 flex-col gap-2 bg-surface p-4 shadow-[inset_-1px_0_0_0_var(--color-border)]">
      <div className="h-8 rounded-medium bg-surface-sub" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-8 rounded-small bg-surface-sub" />
      ))}
    </div>
  );
}

const meta = {
  title: "Components/AppShell",
  component: AppShell,
  tags: ["autodocs"],
  args: {
    sidebar: <SidebarPlaceholder />,
  },
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: [
          "앱 전체의 골격입니다. 사이드바(고정폭) + 콘텐츠(`flex: 1`)의 가로 배치입니다. (DESIGN.md §0)",
          "",
          "```",
          "┌────────────┬──────────────────────────────────────┐",
          "│  GNB       │  계정 줄      h 48 · gutter 40 (선택) │",
          "│  224 / 60  ├──────────────────────────────────────┤",
          "│  100dvh    │  PageHeader   min-h 72 · gutter 40   │",
          "│            ├──────────────────────────────────────┤",
          "│            │  콘텐츠 (flex:1)                      │",
          "└────────────┴──────────────────────────────────────┘",
          "```",
          "",
          "### 사용 규칙",
          "",
          "- 사이드바는 `sidebar` 슬롯으로 받습니다. 셸은 GNB를 직접 import하지 않습니다.",
          "- 넘기는 사이드바 노드가 자기 폭·`height: 100dvh`·`flex-shrink: 0`을 스스로 책임집니다.",
          "- 본문 좌우 gutter는 40, 세로는 24이며 섹션 사이 간격은 24입니다.",
          "- **본문 최대폭은 기본이 제한 없음(100%)** 입니다. 레거시의 1100px은 기본값이 아니며, 필요한 페이지에서만 `maxWidth`로 지정합니다.",
          "- 콘텐츠 컬럼에 `min-w-0`이 걸려 있어 넓은 테이블이 있어도 셸 전체가 가로로 밀리지 않습니다.",
          "- **계정 줄(`topBar`)은 화면에서 넘기지 않습니다.** 앱 진입점의 `AppShellProvider` 가 한 번 넣고 모든 셸이 받습니다. 화면이 쓰는 값은 그 화면만 끄는 `null` 뿐입니다.",
          "- 계정 줄에는 계정만 놓습니다. 제목·검색·알림을 얹으면 PageHeader 와 역할이 겹칩니다.",
        ].join("\n"),
      },
    },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

function DemoContent() {
  return (
    <>
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index}>
          <CardHeader title={`섹션 ${index + 1}`} />
          <CardBody>
            <p className="body-medium text-text-sub">
              본문은 좌우 gutter 40 · 세로 24 안쪽에 놓이고, 섹션 사이는 24로
              벌어집니다.
            </p>
          </CardBody>
        </Card>
      ))}
    </>
  );
}

/** 기본 — 사이드바 + PageHeader + 본문 */
export const Default: Story = {
  args: {
    header: (
      <PageHeader
        title="주문 관리"
        actions={
          <Button>
            <Plus size={16} strokeWidth={1.2} aria-hidden />
            주문 등록
          </Button>
        }
      />
    ),
    children: <DemoContent />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 헤더는 셸의 콘텐츠 컬럼 안, 본문보다 위에 놓인다
    const heading = canvas.getByRole("heading", {
      level: 1,
      name: "주문 관리",
    });
    await expect(heading).toBeVisible();

    const body = canvasElement.querySelector('[data-slot="body"]');
    await expect(body).toBeInTheDocument();
    await expect(body).not.toContainElement(heading);
  },
};

/** 탭이 있는 헤더와 조합 */
export const WithTabs: Story = {
  args: {
    header: (
      <PageHeader
        title="상품"
        tabs={
          <Tabs
            items={[
              { value: "list", label: "목록" },
              { value: "category", label: "카테고리" },
              { value: "stock", label: "재고" },
            ]}
            defaultValue="list"
          />
        }
      />
    ),
    children: <DemoContent />,
  },
};

/** 본문 폭 제한 — 기본은 제한 없음이고, 필요한 페이지에서만 지정합니다 */
export const WithMaxWidth: Story = {
  args: {
    maxWidth: "1100px",
    header: <PageHeader title="설정" />,
    children: <DemoContent />,
  },
};

/** 헤더 없이 본문만 — 셸은 헤더가 없어도 성립합니다 */
export const WithoutHeader: Story = {
  args: {
    children: <DemoContent />,
  },
};

/** 계정 줄 — 콘텐츠 열 맨 위(PageHeader 위)의 48 줄. 눌리는 것은 [로그아웃] 하나입니다 */
export const WithTopBar: Story = {
  args: {
    topBar: (
      <AccountBar name="운영관리자" role="본사 운영관리자" onLogout={fn()} />
    ),
    header: <PageHeader title="주문 관리" />,
    children: <DemoContent />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = canvas.getByRole("region", { name: "로그인 계정" });

    // 줄은 콘텐츠 열의 첫 자식 — 헤더보다 앞이다
    const content = canvasElement.querySelector('[data-slot="content"]');
    await expect(content?.firstElementChild).toBe(bar);

    // 아바타는 장식이라 이름이 한 번만 읽힌다
    await expect(within(bar).queryByRole("img")).toBeNull();
    await expect(
      within(bar).getByTitle("운영관리자 · 본사 운영관리자"),
    ).toBeVisible();
  },
};

const onProviderLogout = fn();

/** Provider 로 넣은 경우 — 실제 앱의 꼴입니다. 화면은 `topBar` 를 넘기지 않습니다 */
export const WithProvider: Story = {
  args: {
    header: <PageHeader title="정산 내역" />,
    children: <DemoContent />,
  },
  decorators: [
    (StoryFn) => (
      <AppShellProvider
        topBar={
          <AccountBar
            name="리틀베이비"
            role="대표"
            onLogout={onProviderLogout}
          />
        }
      >
        <StoryFn />
      </AppShellProvider>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    onProviderLogout.mockClear();

    await userEvent.click(canvas.getByRole("button", { name: "로그아웃" }));
    await expect(onProviderLogout).toHaveBeenCalledTimes(1);
  },
};

/** 긴 이름 — 글자 묶음은 320 에서 끝 말줄임되고 버튼은 줄어들지 않습니다 */
export const LongAccount: Story = {
  args: {
    topBar: (
      <AccountBar
        name="베이비큐브 수도권 통합 물류센터 운영관리자"
        role="본사 운영관리자 · 정산 담당 · 고객센터 총괄 · 입점 심사"
        onLogout={fn()}
      />
    ),
    header: <PageHeader title="주문 관리" />,
    children: <DemoContent />,
  },
};
