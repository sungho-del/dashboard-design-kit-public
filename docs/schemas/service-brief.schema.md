# service-brief.schema.md — Stage 1 산출물 스키마

> `pipeline/01-service-brief.json`의 계약. Stage 2(브랜딩)·Stage 4(Figma)가 이 구조를 그대로 읽는다.
> 필수 필드가 비면 파이프라인이 진행되지 않는다 — 모르는 값은 지어내지 말고 `null` + `meta.gaps` 기록.

## 구조

```jsonc
{
  "meta": {
    // ── 필수
    "source": "https://… 또는 파일경로",
    "analyzedAt": "2026-07-15T09:00:00Z",
    "coverage": "full | partial", // 기획서를 어디까지 읽었는가
    "gaps": [
      // 못 읽었거나 기획서에 없던 정보
      {
        "area": "결제 플로우",
        "reason": "프로토타입에 미포함",
        "askUser": true,
      },
    ],
  },

  "service": {
    // ── 필수
    "name": "서비스명 (기획서 표기 그대로)",
    "domain": "산업군 — 예: 유아용품 렌트·판매 커머스",
    "concept": "한 문단 컨셉 요약",
    "problem": "해결하려는 사용자 문제",
    "valueProp": "핵심 가치 제안 한 문장",
  },

  "target": {
    // ── 필수
    "primary": {
      "who": "주 타깃",
      "context": "이용 상황",
      "needs": ["핵심 니즈"],
    },
    "secondary": [{ "who": "...", "context": "...", "needs": [] }], // 없으면 []
  },

  "features": [
    // ── 필수, 1개 이상
    {
      "id": "F01",
      "name": "기능명",
      "description": "무엇을 하는 기능인지",
      "priority": "core | secondary | nice-to-have",
      "screens": ["S01", "S03"], // keyScreens 참조
    },
  ],

  "ia": [
    // ── 필수. 정보 구조 트리 (GNB/Dock 탭 구조 반영)
    {
      "id": "N1",
      "name": "홈",
      "type": "tab | page | modal | sheet",
      "screens": ["S01"],
      "children": [/* 재귀 */],
    },
  ],

  "userFlows": [
    // ── 필수, 핵심 플로우 1개 이상
    {
      "id": "UF1",
      "name": "대여 신청 플로우",
      "steps": ["홈 진입", "상품 탐색", "..."],
      "screens": ["S01", "S02"],
    },
  ],

  "keyScreens": [
    // ── 필수. Stage 4 화면 설계의 직접 입력
    {
      "id": "S01",
      "name": "홈",
      "purpose": "이 화면의 역할",
      "sections": ["GNB", "메인 배너", "카테고리", "추천 상품", "Dock Bar"],
      "components": ["Button", "Card", "Tab"], // DESIGN.md 컴포넌트 어휘 사용
      "states": ["default", "empty", "loading"], // 파악된 상태만
    },
  ],

  "brandInputs": {
    // ── 필수. DESIGN_참고.md §10-A 5문항 — Stage 2의 직접 입력
    "industry": "커머스·헬스케어·SaaS·교육·라이프스타일·대여 등",
    "impression": ["신뢰·안심", "친근·다정"],
    "userActions": ["대여", "예약"],
    "uiTone": "미니멀 | 감성적 | 대중적·친근 | 프리미엄 | 테크니컬",
    "colorRoles": { "tag": true, "chart": false }, // bg·surface·text·border·brand·CTA·status 외 추가 필요 여부
  },
}
```

## 검증 규칙 (Stage 1 에이전트 5단계에서 실행)

1. JSON 파싱 가능해야 한다 (`node -e "JSON.parse(...)"`)
2. 필수 최상위 키 7개 존재: meta, service, target, features, ia, userFlows, keyScreens, brandInputs
3. `features[].screens`·`userFlows[].screens`·`ia[].screens`의 ID는 전부 `keyScreens[].id`에 존재해야 한다
4. `coverage: "partial"`이면 `gaps`가 비어 있으면 안 된다
5. `brandInputs`에 null이 있으면 해당 항목이 `gaps`에 있어야 한다
