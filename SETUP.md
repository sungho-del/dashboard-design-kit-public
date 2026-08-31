# 새 프로젝트 셋업 체크리스트

이 폴더는 새 프로젝트의 **시작 템플릿(하네스)** 이다.
새 프로젝트는 이 폴더를 통째로 복사해 시작하고, 기존 프로젝트에는 `bash install.sh <경로>`로 하네스만 이식한다.

> 핵심 흐름(요약): **GitHub 기획서 ZIP → `_plan/`에 압축 해제 → 대화에 `프로젝트 작업 진행 시작` 입력
> → 파이프라인이 **서비스 분석 → 화면 생성**을 체크포인트마다 물어보며 진행.**
> 파이프라인 규약: `docs/pipeline-architecture.md`

## 0. 전역 준비 (계정/머신당 1회 — 이미 되어 있으면 스킵)

### 0-A. 필수 — 이게 없으면 아무것도 안 돈다

> 예전엔 이 세 줄이 없어서, 폴더만 받은 사람은 첫 명령에서 막혔다.
> 기획자에게 넘길 때는 `START-HERE.md` 를 안내하면 된다 (같은 내용을 비전문가용으로 쓴 문서).

- [ ] **Node.js 18+** — <https://nodejs.org> LTS. 확인: `node -v`
- [ ] **Claude Code** — <https://claude.com/claude-code>. 확인: `claude --version`
- [ ] **의존성 설치** — 폴더에서 `npm install` (2~5분). `warn` 은 정상, `ERR!` 만 없으면 성공
- [ ] 부팅 확인 — `npm run build:tokens` → `npm run typecheck` → `npm run dev`

## 1. 프로젝트 스캐폴드 (package.json이 없을 때만)

대부분 템플릿 복사로 이미 구성돼 있다. 맨바닥에서 시작할 때만:

- [ ] Vite React-TS: `npm create vite@latest . -- --template react-ts`
- [ ] Tailwind v4: `npm i tailwindcss @tailwindcss/vite` + vite 플러그인 등록
- [ ] Storybook 8: `npx storybook@latest init` (+ `@storybook/addon-designs`)
- [ ] Vitest + Testing Library / 토큰: `npm i -D style-dictionary prettier`
- [ ] `package.json` scripts: `build:tokens`, `build`, `typecheck`, `format` (기존 package.json 참고)
- [ ] `src/main.tsx`에서 `src/index.css` → `src/styles/tokens.css` import 연결

## 2. 자동 흐름으로 시작 (권장)

1. [ ] GitHub 기획서 ZIP을 받아 **`_plan/`에 압축 해제** (index.html·*.js 등 그대로. 한 번에 하나)
2. [ ] Claude 대화에 **`프로젝트 작업 진행 시작`** 입력
3. [ ] 파이프라인이 자동 진행 — **각 체크포인트에서 검토·승인**:
   - Stage 1 서비스 분석 → `pipeline/01-service-brief.json/.md`
   - Stage 3 토큰 반영 → `tokens/primitive/*` 갱신 → `npm run build:tokens`

> 개별 실행도 가능: `/analyze-plan` · `/build-screens`.

## 2b. 수동 갱신 목록 (자동 흐름을 안 쓰거나, 값 직접 조정 시)

- [ ] `CLAUDE.md` 상단 — `[프로젝트명]`과 설명 치환
      Semantic(`tokens/semantic/*`)은 대개 그대로 두고 primitive만 교체. 구조: `docs/token-architecture.md`
- [ ] `npm run build:tokens` — `src/tokens/_generated.css` 재생성
- [ ] `docs/design-tokens.md` — 표준 Semantic 변수표를 실제 값과 일치
- [ ] `npm install` → `npm run build:tokens` → `npm run typecheck` 로 부팅 확인

## 3. 프로젝트 정보 (여기에 기록)

| 항목             | 값     |
| ---------------- | ------ |
| 프로젝트명       | (입력) |
| 기획서 출처(ZIP) | (입력) |
| 디자인 담당      | (입력) |

## 참고: 문서 지도

- `docs/pipeline-architecture.md` — 파이프라인 4단계 규약·트리거
- `docs/token-architecture.md` — 토큰 2층 구조(Primitive→Semantic)
- `docs/naming-conventions.md` — 네이밍 규칙 단일 원천(파일·코드·토큰·ID)
- `docs/PROGRESS.md` — 구축 진행 기록(결정 이유·남은 일)
- `docs/DESIGN_참고.md` — 디자인 판단(사용 맥락·조합·인터랙션·접근성)
- `docs/DESIGN.md` — 컴포넌트 상세 수치 사전 · `docs/design-core.md` — 상시 로드 핵심
- `pipeline/` — 단계 산출물 · `_plan/` — 기획서 입력
