기획서의 화면 목록(01)을 실제 React 화면 코드로 생성합니다 (파이프라인 Stage 5).

## 절차

1. `@agent-screen-builder`에 위임 (필수 — 템플릿 4종과 DESIGN 규격을 함께 읽어야 해서 컨텍스트가 크다)
2. 인자($ARGUMENTS)가 있으면 그대로 전달 (특정 화면만 만들 때: 화면 id 또는 이름)
3. **계획서(`pipeline/05-screen-plan.json`)를 먼저 받아 사용자 승인을 얻은 뒤** 생성 진행
4. 생성 후 `@agent-design-qa` 게이트 실행

## 전제

- `pipeline/01-service-brief.json` 이 있어야 한다 (없으면 `/analyze-plan` 먼저)
- 색은 이 저장소의 기존 토큰(Clay 계열)을 그대로 쓴다. 브랜드 단계는 이 폴더에 없다.
- **지표·차트가 있는 화면이면 `docs/DESIGN-dashboard.md` 를 먼저 읽는다** —
  건수 대시는 `StatGrid`, KPI 카드는 `StatTile variant="card"` 다(직접 조립 금지).

규약: docs/pipeline-architecture.md · 카탈로그: docs/screen-templates.md · 스키마: docs/schemas/screen-plan.schema.md

$ARGUMENTS
