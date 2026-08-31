/* -------------------------------------------------------------------------
 * S27 스크립트 관리 — **도메인 층** (BabyCube 본사 운영 어드민)
 *
 * 짝이 되는 뼈대: `ScriptSettingsPage.tsx` (레이아웃·검증·저장 흐름)
 * 원본 템플릿: `src/pages/ProductFormPage.data.ts` (폼형)
 *
 * ## ⚠️ 폼형이라 "데이터만 갈아끼우기"가 안 된다
 * `screen-templates.md` §3-4 — **필드 목록 자체가 도메인이라 뼈대의 JSX 에 남는다.**
 * 이 파일이 드는 것은 **문구**뿐이다(라벨 · 출력 위치 · 도움말 · placeholder · 초기값).
 * 세 필드가 전부 Textarea 라 배열로 말아 `map` 을 돌리고 싶어지지만,
 * 그렇게 하면 "종류 → 컴포넌트" 디스패처(폼 DSL)의 첫 걸음이 된다.
 * 필드는 뼈대에 셋 다 손으로 적혀 있고, 이 파일은 그 셋이 읽을 문구만 준다.
 *
 * ## 뼈대가 이 파일에 기대하는 계약
 * - `SCRIPT_FIELDS` 의 키 3개(`header`·`body`·`footer`)가 뼈대의 `useState` 3개와 짝이다
 * - `SAVED_SCRIPTS` 는 **서버에 저장돼 있던 값**이자 뼈대의 초기값이다.
 *   빈 문자열도 유효한 저장값이다(스크립트를 넣지 않기로 한 상태)
 * ---------------------------------------------------------------------- */

export interface ScriptFieldCopy {
  /** `FormField` 의 라벨 */
  label: string;
  /** 라벨 아래 — 이 코드가 실제로 출력되는 위치 */
  position: string;
  /** 입력 아래 도움말 — 무엇을 넣는 자리인지 */
  help: string;
  placeholder: string;
}

/**
 * 삽입 위치 3곳의 문구. **원본 어드민(`/scripts`)의 문장을 그대로 옮긴 것**이다.
 *
 * ⚠️ `placeholder` 는 "예) …" 로 줄이지 말 것. 원본은 **실제로 붙여 넣을 코드 모양**을
 * 그대로 보여 준다 — 어느 자리에 어떤 형태가 들어가는지가 placeholder 의 일이다.
 * ⚠️ `help` 와 `placeholder` 를 한 문장으로 합치지 말 것. 원본에서 둘은 다른 자리다
 * (푸터의 "채팅 위젯, 지연 로딩 스크립트 등" 은 도움말이 아니라 placeholder 다).
 */
export const SCRIPT_FIELDS: Record<
  "header" | "body" | "footer",
  ScriptFieldCopy
> = {
  header: {
    label: "헤더 스크립트",
    position: "</head> 직전에 출력",
    help: "구글 애즈 전환 태그, GA4, 메타 픽셀 기본 코드는 보통 여기에 넣습니다.",
    placeholder:
      '<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>',
  },
  body: {
    label: "바디 스크립트",
    position: "<body> 직후에 출력",
    help: "GTM의 noscript 태그처럼 body 시작 부분에 넣어야 하는 코드용입니다.",
    placeholder:
      '<!-- Google Tag Manager (noscript) -->\n<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX" ...></iframe></noscript>',
  },
  footer: {
    label: "푸터 스크립트",
    position: "</body> 직전에 출력",
    help: "페이지 렌더링이 끝난 뒤 실행해도 되는 코드는 여기에 넣으면 로딩 속도에 유리합니다.",
    placeholder: "채팅 위젯, 지연 로딩 스크립트 등",
  },
};

/**
 * 서버에 저장돼 있던 값 = 뼈대의 초기값.
 * 바디는 비어 있는데, 그것도 "아무 코드도 넣지 않기로 한 상태"라는 유효한 값이다.
 */
export const SAVED_SCRIPTS = {
  header:
    '<script async src="https://www.googletagmanager.com/gtag/js"></script>',
  body: "",
  footer: '<script defer src="/assets/chat-widget.js"></script>',
};
