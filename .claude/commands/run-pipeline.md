기획서 → 대시보드 화면을 **체크포인트 방식**으로 만듭니다.
트리거 문구: **"프로젝트 작업 진행 시작"** (이 문구 입력 시 이 커맨드를 실행).

## 입력

- 인자($ARGUMENTS)에 경로/URL이 있으면 그것을, 없으면 `_plan/` 폴더를 기획서 입력으로 사용.
- `_plan/`이 비어 있고 인자도 없으면: "기획서를 `_plan/`에 넣거나 URL을 알려주세요"라고 안내 후 정지.

## 실행 절차 (2단계 — 각 체크포인트에서 정지·승인 대기)

규약 전문: `docs/pipeline-architecture.md`

1. **Stage 1 · 서비스 분석** — `@agent-service-analyzer`에 `_plan/`(또는 인자) 전달
   → `pipeline/01-service-brief.json/.md` 생성 → **▣ 체크포인트 1 보고 후 정지**
   - 보고에는 **화면 목록이 실제 기획과 맞는지**를 사용자가 확인할 수 있게 화면 이름을 전부 나열한다.
     여기가 틀리면 뒤가 전부 틀린다.

2. (승인 시) **Stage 5 · 화면 생성** — `@agent-screen-builder`
   → `pipeline/05-screen-plan.json/.md` (어느 화면을 어느 템플릿으로) → **▣ 체크포인트 5 보고 후 정지**
   → (승인 시) `src/pages/*.tsx` + `*.data.ts` + `*.test.tsx` 생성 · GNB 배선 · 라우트 등록

3. 생성 후 **반드시 검증**: `npm run typecheck` · `npm run lint` · `npm test -- --run` · `npm run build`
   → 결과를 사용자에게 그대로 보고한다. 실패를 숨기지 않는다.

## 종착점 안내

화면이 다 나오면 사용자에게 두 가지를 알린다.

- **보기**: `npm run dev` → 첫 화면이 화면 목록이다
- **공유**: `npm run build` → `vercel deploy` → 나온 주소를 팀에 전달 (`START-HERE.md` §6)

## 규칙

- **한 번에 한 Stage.** 체크포인트마다 요약 + 판단이 필요한 지점을 보고하고 승인을 기다린다.
- **Stage 5 는 Stage 1 만 있으면 돈다.** 브랜드·Figma 단계는 이 폴더에 없다(삭제됨).
  색을 바꿔 달라는 요청이 오면 그 사실을 먼저 알리고, `tokens/primitive/color.json` 수정 +
  `npm run build:tokens` 경로를 안내한다.
- 상류 산출물이 수정되면 하류는 재검토 대상임을 보고에 명시.
- 기획서에 없는 화면은 만들지 않는다. 추측한 것은 `gaps`에 남긴다.
- Stage 5 가 "**신규 컴포넌트 필요**"를 보고하면: 사용자 승인 → `/new-component` 팀
  (`ux-designer` 설계 → `component-builder` 구현)이 부품을 만든다 → 완성 후 Stage 5 를 이어간다. 화면 생성기가 부품까지 만들게 두지 않는다.

$ARGUMENTS
