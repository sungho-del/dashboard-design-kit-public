import { act, fireEvent, render, screen } from "@testing-library/react";
import { Toast, type ToastSize } from "./Toast";
import { ToastProvider } from "./ToastProvider";
import { useToast, type ToastInput } from "./useToast";

/**
 * 진입 애니메이션이 requestAnimationFrame으로 한 프레임 늦게 도는 구조라
 * rAF까지 가짜 타이머로 잡아 둔다. 그래야 상태 전환이 act 안에서 정리되고
 * 테스트 종료 후 뒤늦게 setState가 불리는 일이 없다.
 */
const FAKE_TIMER_APIS = [
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "Date",
  "requestAnimationFrame",
  "cancelAnimationFrame",
] as const;

beforeEach(() => {
  vi.useFakeTimers({ toFake: [...FAKE_TIMER_APIS] });
});

afterEach(() => {
  vi.useRealTimers();
});

/** Provider 안에서 useToast를 호출하는 테스트용 트리거 */
function Trigger({ label, input }: { label: string; input: ToastInput }) {
  const { toast } = useToast();
  return <button onClick={() => toast(input)}>{label}</button>;
}

/** 진입 애니메이션 프레임을 흘려보낸다 */
function flushEnterFrame() {
  act(() => {
    vi.advanceTimersByTime(20);
  });
}

describe("Toast", () => {
  it("메시지를 렌더링한다", () => {
    render(<Toast message="저장되었습니다" />);
    expect(screen.getByText("저장되었습니다")).toBeInTheDocument();
  });

  it('role="status"로 노출된다', () => {
    render(<Toast message="저장되었습니다" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  describe("tone", () => {
    it("default는 surface-toast 배경과 polite 라이브 리전을 쓴다", () => {
      render(<Toast message="저장되었습니다" />);

      const toast = screen.getByRole("status");
      expect(toast).toHaveAttribute("aria-live", "polite");
      expect(toast.className).toContain("bg-surface-toast");
      expect(toast.className).not.toContain("bg-surface-toast-critical");
    });

    it("critical은 surface-toast-critical 배경과 assertive 라이브 리전을 쓴다", () => {
      render(<Toast message="삭제에 실패했습니다" tone="critical" />);

      const toast = screen.getByRole("status");
      expect(toast).toHaveAttribute("aria-live", "assertive");
      expect(toast.className).toContain("bg-surface-toast-critical");
    });
  });

  describe("size", () => {
    /**
     * ⚠️ 클래스는 **배열로** 검사한다. 문자열 `toContain` 은 부분 일치라
     * `min-h-(--size-control-large)` 가 `h-(--size-control-large)` 검사를
     * 그대로 통과시킨다 — 실제로 `h-` 를 `min-h-` 로 바꿨는데 테스트가 초록불이었다.
     */
    const sizeCases: Array<[ToastSize, string, string, string]> = [
      ["large", "min-h-(--size-control-large)", "px-5", "body-large"],
      ["medium", "min-h-(--size-control-medium)", "px-4", "body-medium"],
      ["small", "min-h-(--size-control-small)", "px-3", "body-small"],
    ];

    it.each(sizeCases)(
      "%s는 높이·패딩·타이포 프리셋이 함께 바뀐다",
      (size, height, padding, typography) => {
        render(<Toast message="크기 확인" size={size} />);

        const classes = screen.getByRole("status").className.split(/\s+/);
        expect(classes).toContain(height);
        expect(classes).toContain(padding);
        expect(classes).toContain(typography);
      },
    );

    /**
     * 높이는 **바닥값**이어야 한다. 고정 높이면 두 줄짜리 문구가 `rounded-full` 캡과
     * 물리고, 세 줄이면 알약 밖으로 삐져나온다(`overflow` 를 걸지 않았다).
     * 실제로 `"요청한 배너가 모두 삭제되지 않았습니다. …"` 같은 문구가 두 줄이 된다.
     */
    it("높이는 고정이 아니라 바닥값이다 — 긴 문구가 알약을 넘지 않게", () => {
      render(<Toast message="긴 문구도 담긴다" />);

      const classes = screen.getByRole("status").className.split(/\s+/);
      expect(classes).toContain("min-h-(--size-control-medium)");
      expect(classes).not.toContain("h-(--size-control-medium)");
      // 두 줄일 때 글자가 위아래 끝에 붙지 않도록 세로 패딩도 함께 준다
      expect(classes).toContain("py-2.5");
    });
  });

  it("본체 공통 스펙(min/max width · radius full · shadow · blur)을 갖는다", () => {
    render(<Toast message="저장되었습니다" />);

    const className = screen.getByRole("status").className;
    expect(className).toContain("min-w-45");
    expect(className).toContain("max-w-120");
    expect(className).toContain("rounded-full");
    expect(className).toContain("shadow-toast");
    expect(className).toContain("backdrop-blur-[2px]");
    expect(className).toContain("text-text-on");
  });

  describe("애니메이션", () => {
    it("마운트 직후에는 숨은 상태로 시작해 다음 프레임에 나타난다", () => {
      render(<Toast message="저장되었습니다" />);

      const toast = screen.getByRole("status");
      expect(toast.className).toContain("opacity-0");

      flushEnterFrame();
      expect(toast.className).toContain("opacity-100");
      expect(toast.className).toContain("translate-y-0");
    });

    it("top은 -16px에서 내려오고 bottom은 +16px에서 올라온다", () => {
      const { unmount } = render(<Toast message="위" position="top" />);
      expect(screen.getByRole("status").className).toContain("-translate-y-4");
      unmount();

      render(<Toast message="아래" position="bottom" />);
      const className = screen.getByRole("status").className;
      expect(className).toContain("translate-y-4");
      expect(className).not.toContain("-translate-y-4");
    });

    it("open이 false면 다시 숨은 상태로 돌아간다", () => {
      const { rerender } = render(<Toast message="저장되었습니다" />);
      flushEnterFrame();
      expect(screen.getByRole("status").className).toContain("opacity-100");

      rerender(<Toast message="저장되었습니다" open={false} />);
      expect(screen.getByRole("status").className).toContain("opacity-0");
    });
  });

  it("전달한 className이 마지막에 붙어 오버라이드한다", () => {
    render(<Toast message="저장되었습니다" className="custom-class" />);
    expect(screen.getByRole("status").className).toMatch(/custom-class$/);
  });
});

describe("ToastProvider · useToast", () => {
  it("toast()를 호출하면 body 포털에 토스트가 나타난다", () => {
    render(
      <ToastProvider>
        <Trigger label="알림" input="저장되었습니다" />
      </ToastProvider>,
    );

    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "알림" }));

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("저장되었습니다");
    // 포털이므로 컨테이너가 트리거 버튼 옆이 아니라 body 직속에 붙는다
    expect(toast.parentElement?.parentElement).toBe(document.body);
  });

  it("옵션 객체로 tone·size를 지정할 수 있다", () => {
    render(
      <ToastProvider>
        <Trigger
          label="알림"
          input={{
            message: "삭제에 실패했습니다",
            tone: "critical",
            size: "large",
          }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "알림" }));

    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("data-tone", "critical");
    expect(toast).toHaveAttribute("aria-live", "assertive");
    expect(toast.className).toContain("body-large");
  });

  it("기본 3초 뒤 퇴장 애니메이션을 거쳐 사라진다", () => {
    render(
      <ToastProvider>
        <Trigger label="알림" input="저장되었습니다" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "알림" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    // 3초 시점: 퇴장 시작. 아직 DOM에는 남아 있고 open만 꺼진다
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).not.toHaveAttribute("data-open");

    // 0.3s 애니메이션이 끝나면 제거된다
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("duration 옵션으로 노출 시간을 늘릴 수 있다", () => {
    render(
      <ToastProvider>
        <Trigger
          label="알림"
          input={{ message: "5초 동안 보입니다", duration: 5000 }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "알림" }));

    act(() => {
      vi.advanceTimersByTime(3300);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("duration이 0이면 자동으로 사라지지 않는다", () => {
    render(
      <ToastProvider>
        <Trigger
          label="알림"
          input={{ message: "직접 닫아야 합니다", duration: 0 }}
        />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "알림" }));

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("여러 개를 띄우면 세로로 쌓인다", () => {
    render(
      <ToastProvider>
        <Trigger label="첫 번째" input="첫 번째 알림" />
        <Trigger label="두 번째" input="두 번째 알림" />
        <Trigger label="세 번째" input="세 번째 알림" />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "첫 번째" }));
    fireEvent.click(screen.getByRole("button", { name: "두 번째" }));
    fireEvent.click(screen.getByRole("button", { name: "세 번째" }));

    const toasts = screen.getAllByRole("status");
    expect(toasts).toHaveLength(3);
    expect(toasts.map((toast) => toast.textContent)).toEqual([
      "첫 번째 알림",
      "두 번째 알림",
      "세 번째 알림",
    ]);
  });

  describe("컨테이너", () => {
    it("z-toast · pointer-events-none · 상하 패딩 32를 갖는다", () => {
      render(
        <ToastProvider>
          <Trigger label="알림" input="저장되었습니다" />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "알림" }));

      const container = screen.getByRole("status").parentElement;
      expect(container?.className).toContain("z-(--z-toast)");
      expect(container?.className).toContain("pointer-events-none");
      expect(container?.className).toContain("py-8");
      expect(container?.className).toContain("fixed");
    });

    it("position에 따라 붙는 변과 쌓이는 방향이 바뀐다", () => {
      const { unmount } = render(
        <ToastProvider position="bottom">
          <Trigger label="알림" input="저장되었습니다" />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "알림" }));

      const bottomContainer = screen.getByRole("status").parentElement;
      expect(bottomContainer?.className).toContain("bottom-0");
      expect(bottomContainer?.className).toContain("flex-col");
      // 하단 토스트는 아래에서 위로 올라온다
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-position",
        "bottom",
      );
      unmount();

      render(
        <ToastProvider position="top">
          <Trigger label="알림" input="저장되었습니다" />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "알림" }));

      const topContainer = screen.getByRole("status").parentElement;
      expect(topContainer?.className).toContain("top-0");
      expect(topContainer?.className).toContain("flex-col-reverse");
    });

    it("띄운 토스트가 없으면 컨테이너 자체를 렌더하지 않는다", () => {
      render(
        <ToastProvider>
          <Trigger label="알림" input="저장되었습니다" />
        </ToastProvider>,
      );
      expect(document.body.querySelector("[data-position]")).toBeNull();
    });
  });

  it("Provider 밖에서 useToast를 쓰면 에러를 던진다", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      render(<Trigger label="알림" input="저장되었습니다" />),
    ).toThrowError(/ToastProvider/);

    consoleError.mockRestore();
  });
});
