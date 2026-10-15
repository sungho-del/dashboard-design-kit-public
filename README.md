0-1. 이 폴더는 **베이비큐브 본사 어드민 전용**이다(2026-10-15 전환). 다른 서비스를 새로 시작하려면 키트 원본 —
공개 저장소 <https://github.com/sungho-del/dashboard-design-kit-public> 또는 이 폴더의 태그 `backup/2026-10-15-before-babycube` — 에서 시작한다

1. 기획서를 **`_plan/`에 넣거나**, URL이면 대화에 주소를 준다 — 받는 형태: `_plan/README.md`
2. Claude 대화에 **`프로젝트 작업 진행 시작`** 입력
3. 파이프라인이 단계별로 진행 — **각 체크포인트에서 검토·승인**
4. `npm run dev` → 첫 화면이 **화면 목록**이다 (만들어진 화면 전부가 카드로 나열됨)

## 파이프라인 (2단계)

| 단계              | 담당               | 산출물                                              |
| ----------------- | ------------------ | --------------------------------------------------- |
| 1 · 서비스 분석   | `service-analyzer` | `pipeline/01-service-brief.*` (화면 목록·기능·IA)   |
| **5 · 화면 생성** | `screen-builder`   | **`src/pages/*` 실제 React 화면** (템플릿 4종 변형) |

> 번호가 1 다음 5 인 이유 — 원래 브랜드(2a·2b·3)와 Figma(4) 단계가 있었으나 **삭제했다**.
> 실제로 돌리면 문서 표류로 빌드가 깨지는 상태였고, **대시보드 제작 경로는
> 애초에 그 단계를 거치지 않는다** — `01` 만 있으면 Stage 5 가 돈다.
> 색·타이포·간격은 이 저장소의 기존 토큰(Clay 계열)을 그대로 쓴다.

```
기획서 → 화면 목록 → React 화면 코드 → npm run build → vercel deploy → 공유 링크
```

개별 실행: `/analyze-plan` · **`/build-screens`** · `/run-pipeline` · `/build-tokens` · `/design-audit`

## 기술 스택

React 19 + TypeScript 5 · Tailwind v4 · Style Dictionary(토큰) · Storybook 8 · Vitest.
토큰은 2층 구조(`tokens/primitive` → `tokens/semantic`) → `src/tokens/_generated.css` 자동 생성.

## 문서 지도

- `docs/pipeline-architecture.md` — 파이프라인 규약·트리거
- `docs/token-architecture.md` — 토큰 2층 구조(Primitive→Semantic)
- `docs/naming-conventions.md` — 네이밍 규칙 단일 원천(파일·코드·토큰·Figma·ID·브랜드명)
- `docs/PROGRESS.md` — 구축 진행 기록(결정 이유·남은 일)
- `docs/DESIGN_참고.md` — 디자인 판단 가이드(사용 맥락·조합·§10 팔레트 프로토콜·인터랙션·접근성·엘리베이션·모션)
- `docs/DESIGN.md` — 컴포넌트 상세 수치 사전 · `docs/design-core.md` — 상시 로드 핵심
- `docs/DESIGN-dashboard.md` — **대시보드 레이어**(지표 타일·타일 그리드·수치 표현·차트 색 역할 4종·데이터 상태). `DESIGN.md` §0 과 §28 사이를 메운다
- `docs/schemas/` — 각 단계 산출물 계약
- `docs/screen-templates.md` — Stage 5 화면 템플릿 4종 카탈로그(유형 판정·계약·상태색 규칙)
- `START-HERE.md` — **기획자용 진입 문서** (설치→실행→확인, 전문용어 없음)
- `SETUP.md` — 새 프로젝트 셋업 체크리스트 (§0 전역 준비 포함)

## 라이선스

**사내 전용**입니다 — 메타몬스터 구성원이 참고·재사용하라고 공개해 둔 것이지
오픈소스가 아니다. 조건은 [`LICENSE`](./LICENSE).

번들된 Pretendard 폰트는 SIL OFL 1.1 이라 **전문을 함께 둔다**
(`public/fonts/OFL.txt`). 폰트를 다른 프로젝트로 옮길 때 같이 옮길 것.

## 주요 명령어

- `npm run build:tokens` — 토큰 빌드 (tokens/*.json → CSS)
- `npm run dev` / `npm run storybook` / `npm test` / `npm run typecheck` / `npm run build`
