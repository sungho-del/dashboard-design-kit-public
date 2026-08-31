---
name: stage5-rehearsal
description: Stage 5 리허설 경과 — 차트온(병원) 3회 + 클래스온(LMS) 1회. 템플릿 4종이 실제로 못 대는 자리와 문서·실물 불일치 목록
metadata:
  type: project
---

Stage 5(screen-builder)를 **리허설**로 돌린 기록이다. 목적은 결과물이 아니라
**템플릿 4종과 스키마의 빈 곳을 드러내는 것**이다 → [[feedback_report-failures]].

## 1~3차 (2026-08-19) — 차트온 · 병·의원 예약 관리

산출물 `ReservationListPage` · `ReservationDetailPage` · `ClinicStatusPage` · `PatientFormPage`.
수확: **`up`(방향)/`good`(감정) 분리** + `goodDirection`(계획서 전용) · **`caption`(비교 기준)을
뼈대에서 데이터로 내림** · 목록형 시트 제목은 "○○ 미리보기" · `canceled` tone 을 `critical` 로.

## 4차 (2026-08-28) — 클래스온 · 온라인 강의 플랫폼 (2화면)

산출물 `src/pages/classon/OpsDashboardPage`(통계형) · `StudentListPage`(목록형).
선행으로 `ProgressBar` 가 구현된 뒤였다(컴포넌트 36종). 전 게이트 통과(77파일 1744건).

### 이번에 드러난 마찰 — 다음 실행에서 또 만난다

1. **템플릿 4종에 `StatGrid`·`SelectionBar`·`SideSheet`·`ProgressBar` 사용 예가 하나도 없다.**
   문서(`screen-templates.md` §3-1 · `DESIGN-dashboard.md` §D4)에 규격은 있지만 실물 계약이
   없어, 실제 판단 근거는 **`src/pages/babycube/` 의 화면들**(`MemberListPage` 가 `StatGrid` 의
   정본, `ProductListPage` 가 `Checkbox`+`SelectionBar` 의 정본)에서 가져왔다.
   → 템플릿만 읽고 시작하면 손으로 조립하게 된다. **babycube 화면을 2차 참조로 반드시 열 것.**
2. **문서와 실물이 어긋난 자리**: §3-1 은 목록형의 미리보기를 `SideSheet` 라고 적지만
   `OrderListPage.tsx` 실물은 **`Modal`** 이다(babycube 도 전부 Modal). SideSheet 를 쓴 페이지는
   이번 생성물이 저장소 최초다. 실물이 사실이므로 둘 다 정당하다 — 기획서가 "우측 패널"을
   명시하면 SideSheet, 아니면 Modal.
3. **계획서 스키마에 자리가 없는 것 둘** — 통계형의 **가로 막대 목록**(진도율·완주율)과
   **차트 카드의 기간 세그먼트**. `domain` 에 담을 키가 없어 `progressList`·`periods` 를
   임의로 넣고 notes 에 사유를 남겼다. 같은 것이 또 필요하면 스키마에 승격할 것.
4. **`navId` 는 이제 kebab-case 가 아니라 URL 경로다**(`/members`, `/_charton/*`).
   스키마 문서는 kebab-case 라고 적혀 있지만 `App.tsx`·`gnbSections.tsx` 실물이 경로를 쓴다.
   기획서 경로가 기존 것과 부딪히면(클래스온의 `/`) **`/_서비스명/` 접두사**를 붙인다.
5. **GNB 관행과 지시가 충돌할 수 있다.** 이 저장소는 "BabyCube 이외의 생성물은 GNB 가 아니라
   `/screens` 색인으로 들어간다"가 관행이다(템플릿 4종·차트온 4종이 GNB 에 없는 이유 —
   여러 서비스 메뉴가 한 사이드바에 섞여 이름이 충돌한 이력). 지시가 "GNB 에 넣어라"면
   **서비스 이름을 그룹 라벨로 단 별도 섹션**을 맨 아래(저장소 색인 위)에 덧붙이고
   `gnbNote` 에 관행과의 충돌을 적는다.
6. **화면을 추가하면 `ScreenIndexPage` 에도 등록한다.** 새 출처면 `ScreenOrigin` 유니온 ·
   `ORIGIN_META` · `.tsx` 의 origin 순회 배열 **세 곳**을 함께 고친다. 테스트는 데이터 기반이라
   자동으로 따라오지만 `App.test.tsx` 는 묶음별 개수를 **하드코딩**하고 있으니
   기존 세 묶음(4·4·28)의 수를 건드리지 말 것.

### 유형별 계약이 기획서와 충돌했을 때 (이번 판단)

**목록형의 `stats` 3장을 비웠다.** 기획서 S02 의 상단은 상태 건수 대시이고 수강생 지표의
증감·비교 기준이 기획서 어디에도 없었다 — 3장을 채우려면 ±수치와 "지난주 대비"를 지어내야 한다.
**계약(A-7)보다 "근거 없는 증감은 만들지 않는다"가 우선한다**([[feedback_no-invented-values]]).
계획서 `validation.results` 에 rule 7 을 `pass: false` 로 남기고 사유를 적었다.
같은 판단이 babycube 화면들에서도 이미 내려져 있다(요약 카드를 걷어낸 이력).

**How to apply:** 리허설이면 실패 목록이 산출물이다. 발견한 결함을 임의로 고치지 말고 보고한다.
