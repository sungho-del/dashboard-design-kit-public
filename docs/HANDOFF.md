# HANDOFF — 현재 작업 상태 스냅샷

> **이 문서의 용도**: 세션이 바뀌어도 즉시 이어서 작업할 수 있게 하는 "지금 어디까지 왔나" 요약.
> 결정의 **역사**는 `docs/PROGRESS.md`, 규격은 `docs/DESIGN.md`, 상시 규칙은 `docs/design-core.md`.
> 최종 갱신: **2026-08-24** — BabyCube 실전 기획서로 Stage 1→5 전구간 가동 중 (§0 참조)

---

## 0-A. 2026-08-28 — 대시보드 레이어 신설 + 기획자용 폴더로 정리

**① 대시보드 디자인 시스템을 세웠다**

- `docs/DESIGN-dashboard.md` 신설(§D0~§D13) — `DESIGN.md` §0(셸)과 §28(차트 안쪽) 사이의 공백
- `tokens/semantic/dashboard.json` 19개 — 구조물·순서(ordinal)·극성(diverging)·약화·증감(delta)
- `src/styles/tokens.css` 에 수치 전용 `metric-large/medium/small`
- **컴포넌트 2종 승격**: `StatTile`(plain/card · tone · denseLabel · delta 구조화) · `StatGrid`
  → 이름만 5개로 갈라져 **10파일에 복붙**돼 있던 타일을 걷어냈다. 채택 **17화면**
- 실측으로 잡은 것: 증감 색이 틴트 배경에서 명암비 2.61/3.97 → `chart-delta-*`(6.28/5.32)로 교체 ·
  `compact` 가 라벨까지 줄여 10화면 라벨이 14→12 로 작아진 회귀 · 값/단위 미분리 4화면

**② 기획자용 폴더로 정리했다**

- 에이전트 11 → **4**(service-analyzer · screen-builder · design-qa · design-reviewer)
- 커맨드 13 → **5**(analyze-plan · build-screens · run-pipeline · build-tokens · design-audit)
  > ⚠️ **이 두 줄은 2026-08-28 시점의 수치다. 현재는 에이전트 7 · 커맨드 7** —
  > 새 부품을 만드는 경로(`ux-designer` → `component-builder`, `/new-component`)와
  > 시각 점검(`ui-inspector`, `/inspect`)이 그 뒤 복귀했다. 실물은 `.claude/agents/`·`.claude/commands/`
- 브랜드(2a·2b·3)·Figma(4) 자산과 `_reference`(53MB)를 별도 폴더로 옮겼다 → **2026-08-29 삭제 완료**
- 파이프라인이 **Stage 1 → 5 두 단계**임을 `README`·`START-HERE`·`pipeline-architecture`·
  `run-pipeline` 에 반영. `/run-pipeline` 이 없는 에이전트를 부르던 파손도 고쳤다
- `screen-builder`·`screen-templates.md` 가 **새 대시보드 레이어를 쓰도록** 갱신 —
  이게 없으면 기획자가 만든 화면이 옛 복붙 방식으로 되돌아간다
- 종착점을 **Vercel 배포 링크**로 정의(`START-HERE.md` §6)

> ⚠️ 이 세션 중 **다른 세션이 병렬로 커밋**해 `babycube/DashboardPage.tsx` 편집이 한 번 손실됐다.
> 긴 작업에서는 `git log --oneline -3` 으로 HEAD 를 주기적으로 확인할 것.

---

## 0. 지금 하고 있는 일 (2026-08-24) — ⚠️ 여기부터 읽을 것

아래 1~~5절은 **2026-08-19 시점의 스냅샷**이다. 그 뒤로 Phase 9~~13 이 진행됐다.

### 목표가 바뀌었다

이 저장소는 더 이상 "아임웹 클론"이 아니다. **기획자에게 폴더째 넘겨, 각자 서비스에 맞는
대시보드를 스스로 만들게 하는 생성 키트**다. 그래서 지금 하는 일은 전부 그 목표를 향한다.

### 진행 중 — BabyCube 실전 투입

실서비스 어드민 URL(유아용품 렌트·판매 멀티셀러 마켓플레이스)을 기획서로 넣어
**파이프라인 전구간을 처음으로 실증**하고 있다.

| 단계      | 상태                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Stage 1   | ✅ 완료 — 화면 **28** · 기능 21 · 플로우 7 · IA 9그룹. 스키마 검증 전부 통과   |
| Stage 2~4 | ⏭️ **의도적으로 건너뜀** — 아래 "절대 규칙" 참조                               |
| Stage 5   | ✅ 완료 — 배치 6개(A~F)로 **28화면 × 3파일 = 84파일**. `src/pages/babycube/`   |
| GNB 배선  | ✅ 완료 — **BabyCube 전용**으로 재구성(아래 참조) · 로고 에셋 적용             |
| App 배선  | ✅ 완료 — `App.tsx` 를 삼항 연쇄에서 **경로 조회 맵**으로 바꾸고 36화면 등록   |
| 라우팅    | ✅ **화면마다 URL** — 원본 route 그대로(`/`·`/members`·…). `src/lib/router.ts` |
| 대시보드  | ✅ **중요도 등급 4단계**로 재정돈 (아래 참조)                                  |
| 검증      | ✅ typecheck · lint · **테스트 1490건** · build 전부 통과                      |

**GNB 는 원본 기획서의 9그룹 28항목 그대로다.** 한때 1섹션 + 2뎁스로 접고 라벨도 5개
바꿨는데(운영 대시보드·전체 주문·서비스 설정·셀러 운영·상품 운영) **원본 구조가 아니게 되어**
되돌렸다. 이름 충돌은 이커머스·차트온이 같은 사이드바에 섞여서 생긴 문제였고, 그 둘은
`REFERENCE_GNB_SECTIONS` 로 옮겨 **보관만** 한다(Stage 5 가 읽을 실물 계약이라 지우지 않았다).
그 화면들은 여전히 살아 있고 **화면 목록(`/screens`)에서 연다.**

**라우팅** — `src/lib/router.ts` 는 History API 위의 60줄짜리 최소 구현이다. react-router 를
넣지 않은 것은 "가져다 쓰는 쪽에 라우터 선택을 강요하지 않는다"는 원칙 때문이다.
**GNB 항목 id 가 곧 경로**라 id↔경로 매핑표가 없다 — 따로 두면 한쪽만 고쳤을 때 조용히
어긋난다(실제로 `bc-orders` ↔ `bc-orders-all` 로 대시보드 링크가 통째로 죽은 적이 있다).
템플릿·차트온은 원본에 없는 화면이라 `/_template/`·`/_charton/` 으로 갈라 두었다.

**대시보드 중요도 등급** — 이 도메인은 **큰 숫자일수록 덜 중요하다.** 대여중 412 ·
반납완료 194 는 정상 상태고 가장 급한 연체중은 14 다. 등급 없이 나열하면 숫자 크기가
시선을 지배해 중요한 것을 정확히 가린다. 그래서 `FunnelStep.tier` 4등급
(`alert`/`waiting`/`progress`/`done`)이 **배치·크기·색을 한꺼번에** 정하고,
카드 헤더가 "처리 대기 128건"을 직접 든다(그전에는 그 숫자가 화면 어디에도 없었다).

> ⚠️ **등급 판정은 도메인 지식이라 `.data.ts` 가 든다.** `검수완료` 가 종료가 아니라
> `waiting` 인 것은 검수 뒤에 사람이 정산·보증금 반환을 처리해야 하기 때문이다.
> 라벨만 보고 "완료니까 done" 으로 넣으면 **오늘 할 일 26건이 화면에서 사라진다.**

**로고**: `src/assets/babycube-logo.svg`(워드마크 5:1) + `babycube-symbol.svg`(접힘용, 원본 우측
상단 그래픽만 잘라낸 것). TSX 에 인라인하지 않고 **에셋으로 import** 한다 — 브랜드 색
(`#062dee`·`#a0c1f7`)은 토큰이 아니라 로고 고유색이라, 인라인하면 하드코딩 hex 가 되어
토큰 규칙과 저장 훅에 걸린다. `.svg` 안에 두면 에셋의 일부로 남는다.

> 🚨 **절대 규칙 (사용자 지시)**: 원본 사이트의 **디자인은 절대 쓰지 않는다.**
> 가져오는 것은 도메인 내용뿐이다 — 화면 목록·컬럼명·상태 어휘·버튼 라벨·안내 문구.
> 색·레이아웃·컴포넌트·간격·타이포는 **100% 이 저장소의 Clay 시스템**이다.
> 원본의 렌트=초록/판매=파랑 색 체계와 `--brand`·`--warn`·`--danger` 는 **버렸다.**
> 그래서 브랜드 단계(2a·2b·3)를 돌리지 않는다 — 그 단계는 원본 팔레트를 토큰에 이식하는
> 단계라 지시와 정반대다. `pipeline-architecture.md` 가 "Stage 5 는 01 만 있으면 된다"고 보장한다.

> 🚨 **절대 규칙 (사용자 지시)**: **배포하지 않는다.** `npm publish`·`git push`·vercel·
> `gh release` 는 `.claude/settings.json` 의 `deny` 에 등록해 차단해 뒀다.

### 이번에 알게 된 것 — API 529 대응

작업 내내 `529 Overloaded` 로 서브에이전트가 반복 사망했다. 대응 패턴:

- **동시 6개 투입은 과부하를 키운다.** 2개씩 나눠 넣는 편이 총 진척이 낫다.
- **새로 띄우지 말고 `SendMessage` 로 이어붙여라.** 계획 컨텍스트가 보존되고 호출도 가볍다.
- **"화면 하나를 완전히 끝내고 다음으로"** 를 지시하면, 죽어도 **완성 단위로** 남는다.
  (반쯤 만든 파일이 여러 개 흩어지는 것이 최악이다.)

### Phase 13 완료분 — 기획자 온보딩 경로

폴더만 받은 기획자가 **첫 명령에서 막히던 문제**를 전부 제거했다.

| 파일                                 | 고친 것                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `START-HERE.md` (신규)               | 기획자용 유일 진입 문서. 설치→기획서 투입→실행→확인, 전문용어 없음        |
| `README.md`                          | 독자 분기 배너 · 파이프라인 표 **4→5단계**(Stage 5 가 표에 없었다)        |
| `SETUP.md` §0                        | Node.js·Claude Code·`npm install` 을 §0-A 필수로 신설(기존엔 Figma MCP만) |
| `_plan/README.md`                    | 입력 형태 6종으로 확대 · **검증됨/미검증 구분**                           |
| `.claude/hooks/notify.mjs`           | Windows `MessageBox` 모달 제거 → `spawn` detached. **세션 멈춤 원인**     |
| `.claude/settings.json`              | `allow` 20종(승인 폭주 차단) · `deny` 에 배포 계열 4종                    |
| `.gitignore`·`.prettierignore`       | `settings.local.json`(Figma 토큰 평문) 커밋 차단 · 기획서 원본 포맷 제외  |
| `.claude/agents/service-analyzer.md` | 번들 `grep` 추출 요령 · **종착 안내를 Stage 5/2a 2지선다로**              |

**`install.sh` 결함 4건** — 전부 실행으로 검증(exit 0):

1. 없는 `scripts/` 복사 → `set -e` 로 즉사
2. 에이전트 검사 5종 → **11종**(파이프라인 6종이 통째로 미검사였음)
3. **토큰 JSON 검증이 한 번도 안 돌고 있었다** — `tokens/*.json` 은 하위 폴더를 안 잡는데,
   매치 0 인데도 루프 밖에서 무조건 "유효"를 출력했다 → 재귀 검색으로 교체(8개 실검증)
4. **이식 시 `docs/` 13개 중 3개만 복사** — Stage 5 필수 `screen-templates.md` 와
   상시 규칙 `design-core.md` 가 빠져 **이식본에서는 화면 생성이 불가능**했다 → 전량 복사

### 다음에 할 일 — 공용 컴포넌트 건 (승인 대기)

아래는 **화면 생성 중 배치들이 부딪힌 실제 마찰**이다. 공용 컴포넌트를 건드리므로 승인 전이다.

1. **`Table` 에 좌측 고정 열(`frozenLeft`) 정식 지원** — 주문 22~27열·상품 23열 화면들이
   각자 `className` 으로 조립 중이다. `docs/DESIGN.md` §7 은 `overflow-auto` 래퍼만 말하고
   고정 열을 다루지 않는다. `left-N` 이 앞 열 폭의 누적합이라 `<colgroup>` 과 짝으로 관리해야
   하고, 헤더 셀에 `bg-inherit` 을 주면 `TableTh` 의 `bg-surface` 와 충돌한다(`cn()` 은 병합 안 함).
2. **`Select` 에 검색 입력이 없다** — 기획서의 "셀러 셀렉트(셀러명 검색)"를 못 지켜 목록 선택으로
   대체했다. 33종에 검색형 셀렉트가 없다.
3. **`Thumbnail` 이 33종에 없다** — 카테고리 아이콘을 `surface-sub` 박스로 대체했다.
4. **`Gnb` 섹션에 `role="group"` + `aria-labelledby` 부여** — 지금은 섹션 라벨이 평범한
   텍스트라 스크린리더 버튼 목록에 맥락이 안 붙는다. 그래서 라벨 유일성을 손으로 지키는 중이다.
5. **`Card` 를 클릭 대시로 쓰는 패턴이 반복된다** — 루트 `p-6` 때문에 안쪽 버튼이 패딩을 못 덮어
   여러 배치가 버튼을 직접 조립했다(`RentDepositListPage`·`ReviewListPage`). 컴포넌트화 후보.

이월 건: Phase 12(파이프라인 2b·3·4 문서 표류 복구) · 다크모드 · recharts 번들 분리(1.2MB).

### ⚠️ 오진 기록 — `Select` 접근성은 결함이 **아니다**

배치 D 가 "`Select` 의 `label` 이 접근가능 이름으로 안 잡힌다"고 보고했고 한때 결함으로 적혔지만,
**실제로 렌더해 확인한 결과 이름은 정상적으로 잡힌다**(`computeAccessibleName` → `"기간 기준"`).

진짜 원인은 **트리거의 role 이 `button` 이 아니라 `combobox`** 라는 것이다
(floating-ui `useRole({ role: "select" })`). `getByRole("button", { name })` 이 실패한 것은
이름이 아니라 **role 불일치** 때문이다. 배치 B 는 이걸 정확히 짚었는데 배치 D 가 잘못 결론냈다.

→ 잘못된 우회 코드 2건(`CareClaimListPage`·`TaxInvoiceListPage` 테스트)을 정상 쿼리로 되돌렸고,
`Select.test.tsx` 에 **"label 이 트리거의 접근가능 이름이 된다"** 테스트를 넣어 계약을 못박았다.
**교훈: 에이전트가 보고한 컴포넌트 결함은 옮기기 전에 직접 렌더해 확인할 것.**

### 알아둘 것

- `pipeline/01-service-brief.json` 은 이제 **BabyCube** 다. 이전 병원(차트온) 리허설본은
  `pipeline/01-service-brief.chart-on.json` 에 백업돼 있다. 병원 화면 4종(`src/pages/*`)은
  그대로 남아 있으나 **더 이상 대응하는 기획서가 없다.**
- 기획서 원본은 `_plan/babycube-admin/` (라우트 28 HTML + 청크 35, 1.9MB). `.gitignore` 대상.

---

## 1. 지금 위치 (2026-08-19 스냅샷)

**8단계 로드맵 전부 완료.** 컴포넌트 33종 + 페이지 4종이 모두 조립·검증됐다.

| Phase | 내용                                                       | 상태       |
| ----- | ---------------------------------------------------------- | ---------- |
| 0~2   | 환경 격리 · 토큰 · 문서                                    | ✅         |
| 3~5   | 기반/복합/폼 컴포넌트                                      | ✅         |
| 6     | 레이아웃 셸 (AppShell · Gnb · PageHeader · DataTableShell) | ✅         |
| 6.5   | 갭 메우기 (규격 대비 미구현 7건)                           | ✅         |
| **7** | **차트 (토큰 · Recharts 3.10.1 · `DESIGN.md` §28)**        | ✅         |
| **8** | **페이지 조립 4종**                                        | ✅ **4/4** |

**현재 검증 상태**: `typecheck` · `lint` · **715 테스트** · `build` · `build-storybook` **전부 통과**
(`@agent-design-qa` 8항목 PASS 8 / FAIL 0).
컴포넌트 **33종** 전부 4파일 규약 충족 · 배럴(`src/components/ui/index.ts`) 등록 완료.

**페이지 4종** — 전부 `src/pages/` 에 있고 같은 props 구조를 갖는다.
`App.tsx` 는 **47줄**(전역 Provider + 화면 분기)뿐이다.

| 화면      | 파일                  | 규격 근거                |
| --------- | --------------------- | ------------------------ |
| 주문 목록 | `OrderListPage.tsx`   | §7-1 (가장 강함)         |
| 상품 등록 | `ProductFormPage.tsx` | §29 (실측 12건)          |
| 주문 상세 | `OrderDetailPage.tsx` | §30 (실측 3건)           |
| 대시보드  | `DashboardPage.tsx`   | §28 (근거 0 → 신규 설계) |

---

## 2. ✅ 미결 2건 — 해소 완료 (2026-08-19 두 번째 세션)

두 건 모두 사용자 승인을 받아 처리했다. **미결 사항은 현재 없다.**

### ① 배포 CSS에 하드코딩 hex가 들어간다 → **A안 채택·적용**

Tailwind 자동 소스 탐지가 `.md`까지 읽어 **문서의 "나쁜 예시" 문장이 실제 CSS 규칙으로 컴파일**되고 있었다.
`src/styles/tokens.css`를 `@import "tailwindcss" source(none)` + `@source` 3줄로 바꿔 스캔 범위를 좁혔다.

```css
@import "tailwindcss" source(none);
@source "../"; /* src/ */
@source "../../index.html";
@source "../../.storybook";
```

**빌드 CSS 전후 대조 결과** (A안은 누락 시 클래스가 통째로 사라지므로 필수 검증이었다):

| 항목          | Before  | After   |
| ------------- | ------- | ------- |
| CSS 크기      | 63.8 kB | 58.0 kB |
| 클래스 셀렉터 | 653     | 581     |
| 신규 생성     | —       | **0개** |

제거된 72개 전부가 문서발임을 **클래스 경계 정확 매칭**(`(?<![\w-])X(?![\w-])`)으로 확인했다.
잔존 후보 6개(`blur`·`left-1`·`min-h-53`·`opacity-75`·`text-text-secondary-hover`·`underline`)는
전부 오탐이었다 — 실사용 형태는 variant·소수점이 붙은 **다른 클래스**이고 빌드 CSS에 그대로 살아 있다.

```
hover:opacity-75 · hover:text-text-secondary-hover · focus-visible:text-text-secondary-hover
min-h-53.5 · left-1/2 · after:left-1/2 · backdrop-blur-[2px]     ← 전부 생존 확인
```

`underline`만 생존하지 않는데, `Tabs.tsx:73`의 "§9 Tabs (underline)"은 **주석 산문**이지 클래스가 아니다
(Tabs 밑줄은 `transition-[left,width]` 슬라이딩 인디케이터로 그린다).

> ⚠️ **새 소스 디렉토리를 만들면 `tokens.css`의 `@source`에도 등록할 것.** 빠뜨리면 조용히 사라진다.

### ② `DatePicker`에 `Input`과 동일한 disabled 버그 → **수정 완료**

`triggerBaseClasses`에서 `bg-surface`·`outline-1 -outline-offset-1 outline-border`를 걷어내고
`triggerDisabledClasses` / `triggerEnabledClasses` **완전 배타 분기**로 전환했다(`Input`과 같은 형태).
`className.split(/\s+/)` + `not.toContain` 회귀 테스트 2개로 잠갔다.

- 텍스트·아이콘 색(`tone()` · `text-icon-disabled`)은 **원래 정상**이었다 — 배경·경계선만 순서에 지고 있었다.
- `cursor-not-allowed`만 유일하게 살아 있어 "커서는 바뀌는데 모양은 그대로"인 상태였다.

---

## 3. 승인된 방향 (Phase 7~8)

사용자가 "네가 권하는 방향대로 가자"로 승인한 3가지.

1. **순서**: Phase 6.5(갭) 먼저 → Phase 7(차트) → Phase 8(페이지) ✅ 6.5 완료
2. **차트 팔레트**: `--clay-color-palette-*` 5계열 채택
3. **통계형 그리드**: CSS Grid 사용 + `[확장]`으로 문서화 (Clay는 전부 flex column)

### Phase 7 — ✅ 전부 완료 (2026-08-19)

**7a. 토큰** `tokens/primitive/chart-palette.json`(40) + `tokens/semantic/chart.json`(10).
**7b. 컴포넌트** `src/components/ui/Chart/` — Recharts **3.10.1 설치 완료**.
**7c. 문서** `DESIGN.md` **§28 차트** 신설.

#### 확정 팔레트 — 순서 자체가 검증 대상이다

| #   | 계열      | series (선·막대) | 명암비 | fill (면)     |
| --- | --------- | ---------------- | ------ | ------------- |
| 1   | blue      | `600` #0090d4    | 3.5    | `100` #def3ff |
| 2   | mint      | `700` #009972    | 3.6    | `100` #ccf7eb |
| 3   | mango     | `800` #99650a    | 5.0    | `100` #fff2db |
| 4   | grape     | `500` #9a4bff    | 4.4    | `100` #ebdbff |
| 5   | raspberry | `500` #fe5868    | 3.1    | `100` #ffe6e8 |

- 사용법: `CHART_SERIES_COLORS[i]` **(배열 상수 — 문자열 조립 금지)** · `var(--color-chart-fill-N)`
- 격자선 `divide` · 축 텍스트 `text-sub` · 증감 `text-success`/`text-critical` **재사용**(새 토큰 없음)
- **인접 쌍만 판정하므로 배열 순서를 바꾸면 재검증해야 한다.**
- **`skyblue`·`slate` 는 차트에 쓸 수 없다**(어느 단계도 통과 못 함). skyblue 토큰은 삭제했다.
- **원본 대표 단계 500은 mint·mango 에서 못 쓴다**(명암비 1.8~1.9).

> ⚠️ **남은 약점: tritan(청황 색각이상) 분리도 4.0.** 주 판정(protan/deutan)은 통과하지만 낮다.
> 그래서 §28-4 의 보조 수단(범례 필수 · 직접 레이블 · 도넛 퍼센트 목록 · 증감 화살표)은
> **장식이 아니라 판독의 전제**다. 차트를 새로 만들 때 빠뜨리지 말 것.

#### 7a 에서 남겼던 확인 2건 → 해소

1. ~~`--color-chart-*`가 배포 CSS에 안 나온다~~ → **10개 전부 출력 확인.** 단
   **`var(--color-chart-series-${i})` 처럼 조립하면 Tailwind 스캔이 놓쳐 변수가 사라진다.**
   반드시 `CHART_SERIES_COLORS[i]` 배열 상수를 쓸 것.
2. ~~색 외의 구분 수단~~ → 범례 상시 노출 + 도넛 퍼센트 목록 + 증감 화살표로 해결.

### Phase 8 페이지 4종

| 순서 | 페이지             | 근거 세기                                      | 상태                               |
| ---- | ------------------ | ---------------------------------------------- | ---------------------------------- |
| 1    | 주문 목록 (목록형) | **완전 증명** — §7-1 셸 구조가 여기서 확정됐다 | ✅ `src/pages/OrderListPage.tsx`   |
| 2    | 상품 등록 (폼형)   | **증명** — 실측 12건 (`DESIGN.md` §29)         | ✅ `src/pages/ProductFormPage.tsx` |
| 3    | 주문 상세 (상세형) | **실측 3건** (`DESIGN.md` §30)                 | ✅ `src/pages/OrderDetailPage.tsx` |
| 4    | 대시보드 (통계형)  | **근거 없음 → 신규 설계**                      | ✅ `src/pages/DashboardPage.tsx`   |

> 순서를 바꿔 **4번(대시보드)을 먼저 만들었다.** 사용자가 화면을 요청했고, 차트 컴포넌트의 규격은
> 실제 사용처 없이 설계하면 추상적이 되기 때문이다(목록 화면에서 셸 구조가 확정된 것과 같은 방식).

---

## 4. 이번 세션에서 확립된 함정 (재발 방지 — 반드시 읽을 것)

### ① `cn()`은 클래스를 병합하지 않는다 → 상태 스타일이 조용히 죽는다

`src/lib/cn.ts`는 단순 join이다. 같은 CSS 속성을 두 곳에서 방출하면
**명시도가 같을 때 스타일시트 순서가 승자**가 된다.

실제 사고: `Input`이 base에서 `bg-surface`·`outline-1`을 무조건 내보내고
disabled에서 `bg-field-disabled outline-0`을 덧붙였다 → **비활성 인풋이 활성과 똑같이 렌더**됐다.

**대응 3원칙** ① 한 곳에서만 방출 ② 조건 분기로 상호배타 ③ variant 겹쳐 명시도 상승(`disabled:hover:*`)
**정상 구현 참고**: `Textarea.tsx`(배타 분기) · `Select.tsx`(3분기 ternary)

### ② 상태 스타일 테스트에 `toContain`을 쓰면 안 된다

- 런타임 className에는 **두 클래스가 모두** 들어 있으므로 `toContain("outline-1")`은 버그가 있어도 통과한다
- **부분 일치도 통과한다** — `toContain("text-text-secondary")`가 `text-text-secondary-hover`에도 걸려
  SelectionBar 색상 변경을 놓쳤다
- **올바른 방법**: `className.split(/\s+/)` 배열에 대해 `toContain` / **`not.toContain`** 으로
  "없어야 할 것이 없는지"를 검사

### ③ "CSS가 생성되지 않았다"고 결론 내리기 전에 Tailwind 실제 출력 형태를 확인할 것

Tailwind는 shadow 색을 감싸서 출력한다.

```
소스에서 찾은 것:  inset 0 1px 0 var(--color-border)
실제 CSS 출력:     inset 0 1px 0 var(--tw-shadow-color,var(--color-border))
```

이걸 몰라 "arbitrary inset shadow는 컴파일 안 된다"고 **오진**하고 구현을 바꾸고
그 틀린 근거를 `DESIGN.md`에 적었다가 되돌렸다. §24 PageHeader 하단선까지 깨진 줄 알았으나 멀쩡했다.

### ④ 슬롯에 가로 문맥 클래스를 넘기지 말 것

`Gnb`의 `header` 슬롯은 **세로 flex의 직접 자식**이라 `flex-1`이 세로로 작동해
사이트 선택기가 화면 절반을 먹고 메뉴가 아래로 밀렸다. 슬롯의 **부모 축**을 먼저 확인할 것.
(현재는 `Gnb`가 블록 래퍼로 감싸 방어한다)

### ⑤ `outline` + 음수 offset은 자손 배경에 덮인다

`outline-offset: -1px`는 박스 **안쪽 1px 띠**에 그린다. `DataTableShell`은 표 행의
zebra 배경이 full-bleed라 그 띠를 덮어 **표 구간만 세로선이 사라졌다.**
→ 경계선을 `::after` 오버레이(`after:z-3`)로 이관. `Card`는 자식에 배경이 없어 그대로 둔다.

### ⑥ Tailwind는 `.md` 문서도 소스로 읽는다

자동 소스 탐지에 확장자 제한이 없어 **문서에 적은 "금지 예시"가 실제 CSS로 컴파일된다.**
소스 위반 0건인데 산출물에만 하드코딩 색이 남고, 훅은 `.ts/.tsx`만 보므로 영영 안 잡힌다.
→ `tokens.css`에서 `source(none)` + `@source` 명시로 해결(§2-①). **새 소스 디렉토리는 여기 등록 필수.**

### ⑦ 클래스 사용 여부를 **부분 문자열**로 판정하면 안 된다

빌드 CSS diff를 검증하며 제거된 72개를 `Select-String -SimpleMatch`로 훑었더니
**19개가 "소스에서 사용 중"으로 잡혔다. 실제로는 6개, 그마저 전부 오탐이었다.**

```
ring            ← "string" 에 걸림 (52개 파일 전체 오탐)
rounded         ← "rounded-medium"
heading-medium  ← "heading-medium-bold"
left-1          ← "left-1/2"
opacity-75      ← "hover:opacity-75"   ← variant 붙은 별개 클래스
```

→ 반드시 **클래스 경계를 강제**할 것: `(?<![\w-])X(?![\w-])`.
그러고도 남는 후보는 "실사용 형태(variant·소수점 포함)가 빌드 CSS에 살아 있는가"로 한 번 더 걸러야 한다.
§4-② "상태 스타일 테스트에 `toContain`을 쓰지 말라"와 **같은 뿌리의 함정**이다.

### ⑧ jsdom 에서 Recharts 3 을 렌더하려면 **두 가지**가 필요하다

`ResponsiveContainer` 는 `width="100%"` 일 때 정적 크기 경로가 실패해 `SizeDetectorContainer` 로 떨어진다.

1. **`ResizeObserver` 전역** — 없으면 크기가 `{-1,-1}` 로 남아 컨테이너가 **`null` 을 반환**한다
   (차트가 통째로 사라진다). no-op 스텁이면 되고 콜백이 불릴 필요는 없다.
2. **`getBoundingClientRect()` 가 양수 반환** — 옵저버 콜백을 기다리지 않고 **동기적으로** 읽어
   초기 크기를 잡는다. jsdom 은 전부 0을 주므로 고정 rect 로 스텁해야 한다.

`offsetWidth`/`offsetHeight` 는 recharts 3 이 쓰지 않는다.

**검증하면 안 되는 것**: 경로 `d`·좌표 · **축 눈금 텍스트**(실제 텍스트 폭으로 겹침을 솎아내는데
jsdom 측정값이 0이라 축마다 마지막 하나만 살아남는다) · **막대 fill**(애니메이션 미완으로 내부 도형이 없다).

### ⑨ 접근성 지표는 하나만 맞추면 다른 하나가 깨진다

차트 팔레트를 고를 때 **명암비(배경 대비)만 보고 800 단계로 어둡게 내렸더니
색 분리도(계열 간)가 무너져 검증 FAIL** 이 났다. 두 지표는 **서로 반대 방향으로 당긴다** —
어둡게 할수록 명암비는 좋아지고 색 구분은 나빠진다.

> 눈으로 고르지 말고 **두 지표를 동시에 만족하는 조합을 탐색**할 것.
> 5계열 × 10단계 = 10만 조합에 순서 순열까지 얹어도 몇 초면 끝난다.

### ⑩ 자식이 무엇이냐에 따라 `FormField` 의 라벨 연결 방식이 달라진다

> ⚠️ 여기 원래 "`Switch`·`Checkbox`·`Radio` 는 루트가 `<label>` 이라 감싸면 **라벨이 중첩**된다"고
> 적었으나 **틀렸다.** `FormField` 는 라벨 블록과 컨트롤을 **별도 `<div>`** 에 렌더하므로 두 `<label>` 은
> 형제가 된다. 실측으로 `document.querySelectorAll("label label").length === 0` 확인.

진짜 문제는 **`<label for>` 가 labelable 요소만 가리킬 수 있다**는 것이다.

| 자식                                     | 처리                                                             |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `Input`·`Textarea`·`Select`·`DatePicker` | 기본값 — `<label for>` + id 주입                                 |
| **`RadioGroup`·`SegmentedControl`**      | **`group` 필수** — 루트가 `<div role="radiogroup">` 라           |
|                                          | `for` 가 성립하지 않아 **이름이 아예 안 붙는다**                 |
| `Switch`·`Checkbox`                      | 보통 **자체 `label` prop** 사용(라벨이 컨트롤 옆에 붙는 형태)    |
|                                          | `FormField(row)` 로 감싸도 되지만 그때는 자체 `label` 을 비울 것 |

> **이 결함은 화면에 드러나지 않는다** — 라벨이 멀쩡히 보인다.
> `getByRole("radiogroup", { name })` 이 못 찾는 것으로만 확인된다. 실제로 이번에 2건 놓쳤다.

### ⑪ `min-w-0` 은 그 요소 자신에만 듣는다

flex 병치에서 `min-w-0` 은 **그 아이템의 자동 최소 크기**(`min-width:auto`)를 없앨 뿐이다.
자식이 명시적 `min-width` 를 가지면 그 값이 실질 하한이 된다 —
`Input` 래퍼의 `min-w-60`(240) 때문에 **2칸 병치에는 488px 이상이 필요하다**(§29-4).
"`min-w-0` 을 줬으니 얼마든지 줄어든다"고 넘기지 말 것.

### ⑫ "근거 있음"이라고 적힌 항목도 원문을 다시 열어볼 것

요약이 문서로 옮겨질 때 **가장 눈에 띄는 한 줄만 살아남는다.**

- 문서: "`infoList`(라벨 **80px 고정**)만 근거 있음"
- 원문: 규격이 **셋**이었다 — 배경 `surface-sub` · padding 16 · gap 8 · radius 8 / 라벨↔값 gap **10** / 라벨 80

그 결과 구현이 실측과 어긋난 채로 남아 있었다(맞은 건 라벨 폭 하나뿐).
§29 의 "가로 라벨은 없다"가 거짓이었던 것과 **같은 종류의 손실**이다.
→ 새 화면을 만들 때는 **관련 클래스를 원문에서 다시 훑을 것.** 5분이면 된다.

---

## 5. Phase 6.5 산출물

| 항목                                 | 규격                                     | 결과                                             |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------------ |
| `Textarea`                           | §26 `[유추]` (§5 준용 + min-height 별도) | 신규                                             |
| `SelectionBar`                       | §25 실측                                 | 신규 (`.Button` · `.Divider` 합성)               |
| `InputGroup` · `InputAttachedButton` | §5-1 실측                                | 신규                                             |
| `Table dividers`                     | §7 세로 구분선                           | prop 추가                                        |
| `Tooltip closable`                   | §12 닫기 버튼                            | prop 추가 (role `tooltip`→`dialog`, hover→click) |
| `EmptyState size="search"`           | §16 (214 · gap 8 · icon 48)              | 프리셋 추가                                      |
| `PaginationSizeSelect`               | §8 (width 140 · 패널 292)                | 신규 + `Select panelMaxHeight`                   |

### 이 과정에서 정정한 것

- **§5-1 "40 × 56" 모호성** → 원본 `.sjcokig`로 **height 40 × width 56**, 필드 **우측** 부착 확정
- **타이포 프리셋** → 문서 7곳이 "25종"이었으나 원본 Clay·우리 구현 모두 **24종**, 이름까지 1:1 일치
- **§25 버튼 글자색** → 원본은 아이콘만 반전하고 글자색은 어두운 채로 둔다.
  **원본 버튼이 아이콘 전용**이라 그 색이 안 드러나기 때문. 텍스트 라벨을 쓰는 우리는
  라벨도 반전(`text-on` → `text-secondary-hover`). `[확장]`으로 §25에 명시

---

## 6. 파일 지도 (어디를 보면 되는가)

| 목적                             | 파일                                                       |
| -------------------------------- | ---------------------------------------------------------- |
| 상시 디자인 규칙 · 타이포 24종   | `docs/design-core.md`                                      |
| 컴포넌트 실측 규격 §0~§27        | `docs/DESIGN.md` ← **구현 전 반드시 해당 섹션 Read**       |
| 사용 맥락 · Don'ts               | `docs/DESIGN_참고.md`                                      |
| 결정·함정 이력                   | `docs/PROGRESS.md`                                         |
| 토큰 구조                        | `docs/token-architecture.md`                               |
| 원본 CSS (읽기 전용)             | `_reference/vhf535763542.imweb.me/`                        |
| ↳ 토큰 정본                      | `design-system/clay/vars.css` (637줄)                      |
| ↳ Clay 컴포넌트 번들             | `brand-admin/_astro/gnb.BZBi7U3h.css`                      |
| ↳ GNB (클래스명 가독)            | `brand-admin/_astro/container.BuDZObdr.css`                |
| ↳ 앱 레이어 (Table·설정카드·§25) | `brand-admin/_astro/client-provider.hjDLpAAS.css`          |
| ↳ **차트 팔레트 5계열**          | `js/web_components/io/index.js` (`--clay-color-palette-*`) |

### 원본 조사에서 확정된 사실 (Phase 7~8 전제)

- **Clay 토큰 정본에 차트 색이 0건.** Chart.js 1.0.2가 로드만 돼 있고 `new Chart(` 호출·`<canvas>` 0건
  → 이 저장본에 차트 시각 언어의 선례가 없다. **라이브러리 자유 선택, 팔레트는 신규 정의.**
- 별도 팔레트 `--clay-color-palette-*` **70토큰(7계열 × 10단계)** 발견.
  **slate 램프가 `vars.css`와 10/10 완전 일치**해 같은 Clay 혈통임이 증명된다.
  단 7번째 `imBlue = #1a6dff`는 **CLAUDE.md가 금지한 폐기 색**이므로 제외하고 5계열만 쓴다.
- 차트 주변 UI는 실측 근거 있음: 툴팁 padding 16 · 계열 키 10px 원형 · gap 8,
  범례 스와치 16×16 + margin-right 8. **단 radius는 참조값 2px이 아니라 Clay `rounded-medium`(8)을 쓸 것.**
- `_astro` CSS 7,835줄 전체에서 **`display:grid`가 단 1건**(달력 캡션). Clay는 전부 flex column.
- 폼: 라벨↔입력·입력↔도움말 gap **6**, 필드 간 **20(PC)/24(모바일)**, 카드 간 **24(PC)/8(모바일)**.
  **세로·가로 라벨이 둘 다 존재한다** — 상세는 `DESIGN.md` §29.
  > ⚠️ **여기 원래 "폼은 세로 라벨 단일 규격 · 가로 라벨은 Clay에 없으므로 도입 금지"라고 적혀 있었다. 사실 오류였다.**
  > `cardBodyItem_row`(가로)는 `_column`(세로)과 **동급 변형**이고, 심지어 `@media (max-width:991px)` 전용
  > 반응형 규칙까지 갖는다 — 그 파일의 **유일한 미디어쿼리**다. 2026-08-19 전수 재조사로 정정.
  > 필드 20 · 카드 24 도 **PC 한정값**이고 모바일은 각각 24 · 8 로 뒤집힌다는 조건이 빠져 있었다.
- 근거 없음 = 우리가 설계로 채울 영역: 필수(*) 표시 · 에러 메시지 위치·타이포 · 폼 2열 배치 ·
  라벨 타이포(렌더 HTML 부재로 CSS 판정 불가) · KPI 카드 그리드 · 상세 2컬럼

---

## 7. 이어서 할 일

**8단계 로드맵은 전부 끝났다.** 아래는 남은 선택지이지 필수 작업이 아니다.

### 미결 (사용자 판단 대기)

1. **번들 844kB (recharts)** — `React.lazy` 로 차트만 분리할지, 방치할지.
   이 저장소는 "그대로 가져다 쓰는" 것이 목적이라 **차트를 안 쓰는 프로젝트도 비용을 문다.**
2. **Storybook `design.url` 누락 4건** (`FormField`·`InfoList`·`IconButton`·`Spinner`)
   — 대응하는 Figma 프레임이 **없어서** 못 넣는 것이다. Figma 라이브러리를 만들면 그때 연결.
3. ~~**`won()` 중복 3곳** — `src/lib/format.ts` 로 추출할 만하다~~
   → **철회.** 템플릿화(Phase 11) 이후 `won` 은 각 `*.data.ts` 로 이동했고, 이제 **의도된 중복**이다.
   금액 단위는 도메인이다 — 물류는 kg, 교육은 시간, 정산은 원. 공용 파일로 빼면 서비스를 바꿀 때
   **뼈대를 고쳐야** 하고, 그건 "도메인은 `.data.ts` 에만"이라는 계약을 깨뜨린다. 3줄 중복이 계약을 지키는 값이다.

### 해볼 만한 다음 작업

- **다크 테마** — 구조는 이미 보존돼 있다. 사전 조사까지 해뒀다(2026-08-19, 착수는 보류).

  | 확인한 것          | 값                                                                                                           |
  | ------------------ | ------------------------------------------------------------------------------------------------------------ |
  | 원본 다크 semantic | `vars.css` 343~462줄 · **107개** (셀렉터 `:root[data-clay-theme="dark-only"]`)                               |
  | 우리 semantic      | 110개 — 대응 가능한 규모                                                                                     |
  | primitive          | **테마 무관 공통**(원본 1~220줄도 동일 구조) → 건드릴 필요 없음                                              |
  | 컴포넌트 33종      | **수정 불필요**(원칙상) — 전부 semantic 토큰만 쓴다. 게이트가 매번 확인해온 "하드코딩 0건"이 여기서 회수된다 |

  > ⚠️ **그림자가 복병이다.** `--shadow-*` 8종이 전부 `rgba(75, 81, 91, α)`(slate 계열 반투명)이라
  > **다크 배경에서는 사실상 보이지 않는다.** 원본 다크 블록에 그림자 대체값이 있는지 먼저 확인하고,
  > 없으면 경계선으로 대체할지 결정해야 한다. 토큰만 갈아끼우면 되는 작업이 아니다.
  >
  > ⚠️ **차트 팔레트는 전면 재검증**이 필요하다. 라이트에서도 skyblue 램프가 통째로 탈락하고
  > 10만 조합 탐색이 필요했는데, 다크는 배경이 반전돼 명암비를 처음부터 다시 계산해야 한다.
  > `dataviz` 검증기를 `--mode dark --surface <다크 표면>` 으로 재실행할 것.
  > area fill 의 `100` 단계는 다크 배경에서 과하게 밝을 가능성이 높다.

- **Figma 라이브러리 생성** — 파이프라인 Stage 4(`/design-figma`). 코드가 정본이므로 역방향 생성이 된다.
- **`qa-reporter`(제거됨)** 전체 QA 리포트 — 릴리즈 전 최종 점검.
- 원본 렌더 HTML 을 확보하면 **폼 라벨 타이포(§29-5)** 재검토 — 지금은 정황 근거에서 의도적으로 이탈해 있다.

### 폼을 새로 만들 때 (§29 요약)

- **간격을 페이지에서 지정하지 말 것.** 컨테이너가 이미 준다 —
  `AppShell` gap-6(카드 24) · `CardBody` gap-5(필드 20) · `FormField` gap-1.5(라벨↔입력 6)
- `FormField` 는 **`Input`·`Textarea`·`Select` 전용**. Switch·Checkbox·Radio 는 자체 label 사용(§4-⑩)
- **2열 grid 를 만들지 말 것** — 원본에 없다. `flex` + `flex-1 min-w-0` 병치를 쓰되 **최소 488px** 필요(§4-⑪)
- 모바일에서 필드 20→24, 카드 24→8 로 **뒤집힌다**(§29-1)

### 차트를 새로 만들 때 (§3·§28 요약)

- 색은 **`CHART_SERIES_COLORS[i]` 배열 상수**로. 문자열 조립 금지(변수가 배포 CSS에서 사라진다)
- **범례는 계열 2개 이상이면 필수** — tritan 분리도가 낮아 색만으로는 판독되지 않는다
- jsdom 테스트는 **`ResizeObserver` 스텁 + `getBoundingClientRect` 스텁 둘 다** 필요.
  좌표·축 눈금 텍스트·막대 fill 은 **검증하지 말 것**(§4-⑧)
