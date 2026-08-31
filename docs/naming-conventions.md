# naming-conventions.md — 네이밍 규칙 (단일 원천 SSOT)

> 이 프로젝트의 **모든 네이밍 규칙**은 여기서 조회한다. 다른 문서(§7 등)는 핵심만 두고 이 파일을 참조한다.
> 값·사용 맥락이 아니라 "**무엇을 어떻게 이름 붙이는가**"만 다룬다.

## 1. 파일 · 디렉토리

| 대상               | 규칙                                                     | 예                                                                   |
| ------------------ | -------------------------------------------------------- | -------------------------------------------------------------------- |
| UI 컴포넌트 폴더   | `src/components/ui/<PascalCase>/`                        | `src/components/ui/Button/`                                          |
| 컴포넌트 파일 세트 | 1 컴포넌트 = 4파일                                       | `Button.tsx` · `Button.stories.tsx` · `Button.test.tsx` · `index.ts` |
| 토큰 원본          | `tokens/primitive/*.json` · `tokens/semantic/*.json`     | `tokens/primitive/color.json`                                        |
| 파이프라인 산출물  | `pipeline/0N-<이름>.json`/`.md`                          | `pipeline/02a-brand-strategy.json`                                   |
| 문서               | `docs/<kebab-case>.md` (대문자 사전은 예외: `DESIGN.md`) | `docs/token-architecture.md`                                         |

## 2. 코드 (React / TypeScript)

- **컴포넌트**: PascalCase. **Named export만** — `export function Button() {}` (default export 금지).
- **Props 인터페이스**: `<Component>Props` — `interface ButtonProps {}`.
- **variant prop 값**: 소문자 kebab/단어 — `variant="primary"`, `size="md"`.

## 3. 디자인 토큰

- **변환 규칙**: 토큰 경로 `/` → CSS `-`, **kebab-case 소문자 유지**.
  `color/primary` → `--color-primary` · `color/fg-muted` → `--color-fg-muted` · `radius/md` → `--radius-md`
- **계층별 이름**:
  - Primitive = **스케일/hue 명** — `--color-gray-1000`, `--color-blue-500`, `--radii-8`, `--space-8`
  - Semantic = **역할 명** — `--color-primary`, `--color-fg-muted`, `--radius-md`, `--spacing-sm`
- 컴포넌트/화면은 **Semantic만** 사용(Primitive 직접 사용 금지 — token-architecture.md §2-1).
- 모드는 `light` / `dark` 두 개만.

## 5. 파이프라인 산출물 내부 ID

| 종류        | 접두                                | 예                  |
| ----------- | ----------------------------------- | ------------------- |
| 기능        | `F` + 2자리                         | `F01`               |
| 화면        | `S` + 2자리 (또는 기획서 원본 코드) | `S01`, `FO-HOM-001` |
| IA 노드     | `N` + 번호                          | `N1`, `N1-2`        |
| 유저 플로우 | `UF` + 번호                         | `UF1`               |

## 6. 브랜드/서비스 네이밍 (제품 이름 짓기)

> 위 1~5는 "기술 네이밍(조회용)". 이건 **제품 이름을 짓는 절차**로, `brand-strategist`(Stage 2a)가 담당한다.

- 후보마다 `rationale`(의미·연상)과 `risks`(발음·중복·부정 연상·상표) 함께 제시.
- `recommended`는 자신 있을 때만. 아니면 `null` + `meta.gaps`에 사유 (상표·도메인 리스크가 커 **사람 확정 필수**).
- `tagline` 후보 병기. 상세 계약: `docs/schemas/brand-strategy.schema.md`의 `naming`.

## 참조하는 곳

- 코드/컴포넌트 규칙의 상시 로드본: `CLAUDE.md` "컴포넌트 규칙"
- 토큰 구조: `docs/token-architecture.md` · `docs/design-tokens.md`
