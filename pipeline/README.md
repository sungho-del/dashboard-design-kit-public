# pipeline/ — 파이프라인 산출물

기획서 → 대시보드 화면 파이프라인의 단계별 산출물이 쌓이는 폴더. **지금은 비어 있다** — 처음 실행하면 채워진다. 규약: `docs/pipeline-architecture.md`.

| 파일                            | 생성 주체                         | 내용                                                                                            |
| ------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------- |
| `01-service-brief.json` / `.md` | Stage 1 `@agent-service-analyzer` | 서비스 분석 — 화면 목록·기능·IA (스키마: `docs/schemas/service-brief.schema.md`)                |
| `05-screen-plan.json` / `.md`   | Stage 5 `@agent-screen-builder`   | **화면 생성 계획** — 어느 화면을 어느 템플릿으로 (스키마: `docs/schemas/screen-plan.schema.md`) |

- **Stage 5도 마찬가지** — 계획서만 여기 남고 실제 화면 코드는 `src/pages/`에 생성된다.
  Stage 5는 **01만 있으면 실행된다.**
- JSON은 기계 계약(다음 Stage의 입력), MD는 체크포인트 검토용 요약이다. **항상 한 쌍으로 생성.**
- 산출물을 수동 수정했다면 MD 상단에 수정 내역을 남길 것 (하류 Stage가 신뢰 판단).
