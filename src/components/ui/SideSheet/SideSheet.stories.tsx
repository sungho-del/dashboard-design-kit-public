import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  expect,
  fn,
  screen,
  userEvent,
  waitFor,
  within,
} from "@storybook/test";
import { Button } from "../Button";
import { Divider } from "../Divider";
import { Tag } from "../Tag";
import { SideSheet } from "./SideSheet";

/**
 * 사이드시트도 제어형이라 트리거 + useState 를 갖는 데모 래퍼로 감싼다.
 */
interface SideSheetDemoProps {
  triggerLabel?: string;
  title: string;
  description?: string;
  divided?: boolean;
  showClose?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

function SideSheetDemo({
  triggerLabel = "사이드시트 열기",
  title,
  description,
  divided,
  showClose,
  children,
  footer,
}: SideSheetDemoProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>{triggerLabel}</Button>

      <SideSheet open={open} onClose={close}>
        <SideSheet.Header
          title={title}
          description={description}
          divided={divided}
          showClose={showClose}
        />
        <SideSheet.Body>{children}</SideSheet.Body>
        <SideSheet.Footer>
          {footer ?? (
            <Button size="large" fullWidth onClick={close}>
              확인
            </Button>
          )}
        </SideSheet.Footer>
      </SideSheet>
    </>
  );
}

/** 라벨 / 값 한 줄. 사이드시트의 상세 정보 표시 기본형 */
function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-text-sub body-medium">{label}</span>
      <span className="min-w-0 text-right text-text body-medium">
        {children}
      </span>
    </div>
  );
}

/**
 * 실제 맥락 — 주문 목록에서 행을 눌러 여는 **미리보기**.
 *
 * 제목을 `"주문 상세"` 로 하지 않는 이유: 목록형과 함께 **상세 화면**을 두는 서비스에서
 * 같은 이름의 화면이 둘이 된다. 사이드시트는 요약을 보여주고 전체는 상세 페이지로 넘긴다
 * (`docs/screen-templates.md` §3-1).
 */
function OrderDetailDemo() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>주문 미리보기</Button>

      <SideSheet open={open} onClose={close}>
        <SideSheet.Header
          title="주문 미리보기"
          description="주문번호 20260814-0042"
          divided
        />

        <SideSheet.Body>
          <div className="flex flex-col gap-4 pb-6">
            <div className="flex items-center gap-2">
              <Tag tone="success">결제완료</Tag>
              <Tag tone="warning">배송준비중</Tag>
            </div>

            <div className="flex flex-col">
              <DetailRow label="주문자">홍길동</DetailRow>
              <DetailRow label="연락처">010-1234-5678</DetailRow>
              <DetailRow label="결제수단">신용카드</DetailRow>
              <DetailRow label="결제금액">89,000원</DetailRow>
            </div>

            <Divider />

            <div className="flex flex-col gap-2">
              <h3 className="text-text heading-medium-bold">배송지</h3>
              <p className="text-text-sub body-medium">
                서울시 강남구 테헤란로 1, 3층 (06232)
              </p>
            </div>

            <Divider />

            <div className="flex flex-col gap-2">
              <h3 className="text-text heading-medium-bold">주문 상품</h3>
              <DetailRow label="오버핏 코튼 셔츠 / M">1개</DetailRow>
              <DetailRow label="와이드 데님 팬츠 / 28">1개</DetailRow>
            </div>
          </div>
        </SideSheet.Body>

        <SideSheet.Footer>
          <Button size="large" fullWidth onClick={close}>
            송장번호 입력
          </Button>
          <Button variant="secondary" size="large" fullWidth onClick={close}>
            닫기
          </Button>
        </SideSheet.Footer>
      </SideSheet>
    </>
  );
}

const meta = {
  title: "Components/SideSheet",
  component: SideSheet,
  tags: ["autodocs"],
  args: { open: false, onClose: fn() },
  argTypes: {
    children: { control: false },
    labelledBy: { control: false },
    describedBy: { control: false },
  },
  // addon-designs: 실제 Figma 프레임 URL 로 교체하면 스토리 옆에 디자인이 표시된다
  // parameters: {
  //   design: {
  //     type: 'figma',
  //     url: 'https://www.figma.com/design/<file-key>/<name>?node-id=<node-id>',
  //   },
  // },
} satisfies Meta<typeof SideSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 우측 하단에 여백 12를 두고 붙는 폭 380 패널 */
export const Default: Story = {
  render: () => (
    <SideSheetDemo title="필터">
      <p className="text-text body-medium">우측에서 밀려 들어온다.</p>
    </SideSheetDemo>
  ),
};

/** 헤더 하단 구분선 — 바디가 스크롤되는 화면에서 켠다 */
export const DividedHeader: Story = {
  render: () => (
    <SideSheetDemo title="알림 설정" divided>
      <p className="text-text body-medium">
        헤더 아래 1px `divide` 선이 생긴다.
      </p>
    </SideSheetDemo>
  ),
};

/** 제목 아래 보조 설명 — 타이틀 영역은 세로 gap 12 */
export const WithDescription: Story = {
  render: () => (
    <SideSheetDemo
      title="회원 상세"
      description="가입일 2026-01-12 · 최근 접속 3일 전"
      divided
    >
      <p className="text-text body-medium">본문 영역.</p>
    </SideSheetDemo>
  ),
};

/** 긴 콘텐츠 — 바디만 스크롤되고 헤더·푸터는 고정된다 */
export const ScrollableBody: Story = {
  render: () => (
    <SideSheetDemo title="활동 로그" divided triggerLabel="로그 보기">
      <div className="flex flex-col gap-3 pb-6">
        {Array.from({ length: 24 }, (_, index) => (
          <p key={index} className="text-text-sub body-medium">
            2026-08-{String(index + 1).padStart(2, "0")} · 주문 상태가
            변경되었습니다.
          </p>
        ))}
      </div>
    </SideSheetDemo>
  ),
};

/** 푸터에 버튼 2개 — 세로 flex · gap 20 이라 위아래로 쌓인다 */
export const StackedFooter: Story = {
  render: () => (
    <SideSheetDemo
      title="쿠폰 발급"
      footer={
        <>
          <Button size="large" fullWidth>
            발급하기
          </Button>
          <Button variant="secondary" size="large" fullWidth>
            취소
          </Button>
        </>
      }
    >
      <p className="text-text body-medium">발급 대상 회원 12명</p>
    </SideSheetDemo>
  ),
};

/** **실제 맥락 — 주문 미리보기.** 테이블 행을 눌러 여는 대시보드의 대표 패턴 */
export const OrderDetail: Story = {
  render: () => <OrderDetailDemo />,
};

/**
 * 동작 검증 — 열고 Escape 로 닫는다.
 * Portal 로 `document.body` 에 렌더되므로 canvas 가 아닌 `screen` 으로 찾는다.
 * 닫힘은 슬라이드 아웃(200ms) 후 언마운트라 `waitFor` 로 기다린다.
 */
export const OpenAndClose: Story = {
  render: () => (
    <SideSheetDemo title="필터" divided>
      <p className="text-text body-medium">우측에서 밀려 들어온다.</p>
    </SideSheetDemo>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      canvas.getByRole("button", { name: "사이드시트 열기" }),
    );

    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAccessibleName("필터");

    await userEvent.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  },
};
