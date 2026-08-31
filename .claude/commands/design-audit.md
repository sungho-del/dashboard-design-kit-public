src/components/ui/ 전체(37종 + 이후 추가분)의 디자인 토큰 준수를 감사합니다.

## 절차

1. `@agent-design-reviewer` 에 위임한다. 검사 범위:
   - hex·rgb·hsl 하드코딩 (주석 속 설명은 예외)
   - primitive 토큰 직접 사용 (`bg-slate-900` 류 — semantic 만 허용)
   - Tailwind 기본 클래스 (`text-sm` `bg-gray-*` 류)
   - 임의값 (`p-[15px]` — `colgroup` 의 `w-[N%]` 만 예외)
   - 타이포가 프리셋(24종 + `metric-*` 3종) 안에 있는지
   - 경계선이 `outline` + 음수 offset 인지 (`border` 금지)
2. 위반은 파일:줄 + 대체 토큰과 함께 보고한다.
3. 인자($ARGUMENTS)에 컴포넌트 이름이 있으면 그것만 감사한다.

$ARGUMENTS
