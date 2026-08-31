기획서를 분석해 pipeline/01-service-brief.json을 생성합니다 (파이프라인 Stage 1).

## 절차

1. `@agent-service-analyzer`에 위임 (필수 — 기획서 fetch 응답이 크므로 서브에이전트에서 처리)
2. 인자($ARGUMENTS)의 URL 또는 파일 경로를 그대로 전달
3. 완료 후 체크포인트 1 보고를 사용자에게 전달하고 승인 대기

규약: docs/pipeline-architecture.md · 스키마: docs/schemas/service-brief.schema.md

$ARGUMENTS
