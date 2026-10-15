# 기존 데이터 계약과의 대응

> 추출 기준 `{{SOURCE_COMMIT}}` · 대조 기준: 이 저장소 `develop` `d95ed6c`
>
> **정본은 이 저장소의 `src/data/*` 와 API 다.** 퍼블의 `.data.ts` 는 화면을 그리기 위한 예시이고,
> 그 타입에 서버를 맞추지 않는다. 이 문서는 「퍼블 화면의 이 부분은 기존 앱의 어디서 오는가」를 화면 단위로 적는다.
> 필드 단위 대조는 하지 않았다 — 적용이 판정되면(README §1) 화면별로 맞춘다.

## 1. 먼저 알아둘 것 — 모든 목록 화면 공통

|                       | 퍼블                                                               | 기존 앱                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 필터·검색·정렬·페이지 | 예시 배열을 **브라우저에서** 거른다 (`X.data.ts` 의 필터 함수)     | `makeListApi`(`src/data/admin-list.ts`)가 **서버에서** — `ListQuery`(`stat`·`q`·`searchField`·`sortKey`·`sortDir`·`page`·`size`·`dateField`·`dateFrom`·`dateTo`·`chips`) |
| 상태 카드 숫자        | 예시 배열에서 센다                                                 | 상태 축을 뺀 **전체 집합** 기준, 서버가 센다                                                                                                                             |
| 검색조건 요약 문구    | `filterSummary` — 검색조건 접기(`FilterBar`)를 쓰는 회원·상품 화면 | — (화면 표현이라 그대로 옮기면 된다)                                                                                                                                     |
| 기간 빠른 선택        | `src/lib/periodPresets.ts` (오늘·1주일·1개월…)                     | `dateFrom`·`dateTo` 로 넘긴다                                                                                                                                            |
| 로딩·빈 결과·새로고침 | `src/lib/dataStatus.ts` (`?preview=` 로 미리보기)                  | 기존 앱의 pending·empty·error·retry 상태에 각각 대응                                                                                                                     |
| 저장·승인·상태 변경   | 토스트만 띄운다                                                    | `apiWrite` / `apiPost` (`src/lib/api.ts`)                                                                                                                                |

**옮기는 방법**: 퍼블 화면의 필터 상태(선택한 상태 카드·검색어·기간·칩)를 `ListQuery` 로 바꿔 넘기고,
행 렌더링은 퍼블의 마크업을 쓴다. 퍼블의 클라이언트 필터 함수는 버린다.

퍼블 `.data.ts` 는 지금 **동기**다(예시 배열을 바로 반환). 기존 앱은 비동기다 —
`.data.ts` 만 `async` 로 바꾸면 화면 쪽 계약이 맞지 않는다. 데이터 로딩은 기존 앱의 방식을 쓰고,
퍼블에서는 렌더링·상호작용만 가져간다.

## 2. 식별자 — 이식 전에 반드시 확인

| 화면                              | 퍼블 `id`                                                              | 기존 앱                                                                 | 할 일                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 회원 (`/members/[id]`)            | **이메일** (`sujin.park@example.com`, URL 에서는 `encodeURIComponent`) | `id`(내부 조인 키) · `memberNo`(표시·검색용 회원번호) · `email` 을 구분 | 경로에는 기존 앱의 `id` 를 쓴다. 퍼블에서 「아이디(이메일)」로 표시하는 칸은 `email`   |
| 셀러 (`/sellers/[id]`)            | **셀러 코드** (`S-1042`)                                               | `id`(내부) · `code`(표시용 코드)                                        | 경로는 `id`, 화면에 보이는 코드는 `code`                                               |
| 입점 심사 (`/seller-review/[id]`) | 신청 번호 (`A-2026-0141`)                                              | `SellerApplication.id`                                                  | 형식이 같은지 서버 값으로 확인                                                         |
| 목록의 `No` 열                    | 레코드에 붙은 번호 (`no` 필드 — 정렬·필터와 무관)                      | 해당 필드 없음 (확인 필요)                                              | 행 순번으로 그리면 정렬 시 번호가 바뀐다 — 서버에 순번 필드가 없으면 열 자체를 정할 것 |

## 3. 화면별 대응

| 화면             | 퍼블 데이터 (`src/pages/babycube/`)             | 기존 앱 데이터 (`src/data/`)                                | API                                               | 메모                                                                                                                               |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 대시보드 `/`     | `DashboardPage.data.ts`                         | `dashboard`                                                 | `/api/admin/dashboard`                            | 차트 계열 합계는 퍼블에만 있는 숫자 (README §5)                                                                                    |
| 회원 관리        | `MemberListPage.data.ts`                        | `members`                                                   | `/api/admin/members`                              | 일괄 [휴면으로 변경][정지로 변경] · 휴면 자격 `canSleep`                                                                           |
| 회원 상세        | `MemberDetailPage.data.ts` (+ 목록 레코드 공유) | `members` (`MemberDetail`·`MemberChild`·`MemberOrder`)      | `/api/admin/members`                              | 이용 횟수: 기존 앱은 `rentCount`·`buyCount` 를 받는다. 퍼블은 결제 내역에서 **취소 건 제외**하고 센다 — 어느 쪽이 정본인지 정할 것 |
| 셀러 관리        | `SellerListPage.data.ts`                        | `sellers`                                                   | `/api/admin/sellers`                              | 셀 안 수수료율 수정 · 본사 계정 행은 수정 불가                                                                                     |
| 셀러 상세        | `SellerDetailPage.data.ts`                      | `sellers` (`SellerDetail`·`SellerDocument`·`SellerProduct`) | `/api/admin/sellers`                              |                                                                                                                                    |
| 입점 심사        | `SellerReviewPage.data.ts`                      | `seller-applications`                                       | `/api/admin/seller-applications`                  |                                                                                                                                    |
| 입점 심사 상세   | `SellerReviewDetailPage.data.ts`                | `seller-applications`                                       | `/api/admin/seller-applications`                  | 승인: 수수료율 필수 · 반려: 사유 필수 · 승인요청 건만                                                                              |
| 상품 관리        | `ProductListPage.data.ts`                       | `products` · `categories` · `product-detail`                | `/api/admin/products`                             | 상태 카드 [전체] 없음 → 일괄 처리 대상 상태가 하나로 정해진다                                                                      |
| 카테고리 관리    | `CategoryListPage.data.ts`                      | `categories`                                                | (모듈 내 확인)                                    |                                                                                                                                    |
| 성장단계 관리    | `GrowthStageListPage.data.ts`                   | `growth-stages`                                             | `/api/admin/growth-stages`                        |                                                                                                                                    |
| 주문 목록        | `OrderListPage.data.ts`                         | `orders` · `sellers`                                        | `/api/admin/orders`                               |                                                                                                                                    |
| 취소 목록        | `OrderCancelListPage.data.ts`                   | `orders-cancel` · `sellers`                                 | `/api/admin/orders-cancel`                        |                                                                                                                                    |
| 반품 목록        | `OrderReturnListPage.data.ts`                   | `claim-returns` · `sellers`                                 | `/api/admin/claim-returns`                        |                                                                                                                                    |
| 교환 목록        | `OrderExchangeListPage.data.ts`                 | `claim-exchanges` · `sellers`                               | `/api/admin/claim-exchanges`                      |                                                                                                                                    |
| 셀러 정산        | `SellerSettlementPage.data.ts`                  | `settlements` · `settle-statements`                         | `/api/admin/settlements`                          |                                                                                                                                    |
| 보증금 내역      | `RentDepositListPage.data.ts`                   | `deposits`                                                  | `/api/admin/deposits`                             |                                                                                                                                    |
| 안심케어 승인    | `CareClaimListPage.data.ts`                     | `care-claims`                                               | `/api/admin/care-claims`                          |                                                                                                                                    |
| 정산 내역/명세서 | `SettlementStatementPage.data.ts`               | `settle-statements`                                         | `/api/admin/settle-statements`                    |                                                                                                                                    |
| 세금계산서·증빙  | `TaxInvoiceListPage.data.ts`                    | `tax-invoices`                                              | `/api/admin/tax-invoices`                         |                                                                                                                                    |
| 쿠폰관리         | `CouponListPage.data.ts`                        | `coupons`                                                   | `/api/admin/coupons`                              |                                                                                                                                    |
| 포인트 관리      | `PointListPage.data.ts`                         | `points`                                                    | `/api/admin/points`                               |                                                                                                                                    |
| 공지사항 관리    | `NoticeListPage.data.ts`                        | `notices`                                                   | `/api/admin/notices`                              |                                                                                                                                    |
| FAQ 관리         | `FaqListPage.data.ts`                           | `faqs`                                                      | (모듈 내 확인)                                    |                                                                                                                                    |
| 리뷰 관리        | `ReviewListPage.data.ts`                        | `reviews`                                                   | `/api/admin/reviews`                              |                                                                                                                                    |
| 문의 관리        | `SupportListPage.data.ts`                       | `inquiries`                                                 | `/api/admin/inquiries` · `/api/admin/seller-asks` | 고객 문의·셀러 문의 두 갈래                                                                                                        |
| 배너 관리        | `BannerListPage.data.ts`                        | `banners`                                                   | `/api/admin/banners`                              | 이미지 업로드는 기존 앱 `apiUpload`                                                                                                |
| 팝업 관리        | `PopupListPage.data.ts`                         | `popups`                                                    | `/api/admin/popups`                               |                                                                                                                                    |
| 공휴일 관리      | `HolidayListPage.data.ts`                       | `ops-calendar`                                              | `/api/admin/ops-calendar`                         | 종료일을 비우면 하루 등록                                                                                                          |
| 약관 관리        | `TermsAdminPage.data.ts`                        | `terms`                                                     | `/api/admin/terms`                                |                                                                                                                                    |
| 스크립트 관리    | `ScriptSettingsPage.data.ts`                    | `scripts`                                                   | (모듈 내 확인)                                    |                                                                                                                                    |
| 설정             | `SettingsPage.data.ts`                          | `settings`                                                  | `/api/admin/settings`                             |                                                                                                                                    |

「(모듈 내 확인)」 — 그 데이터 모듈 파일에서 `/api/admin/` 경로 문자열을 찾지 못했다. 다른 모듈의 함수를 쓰거나 아직 정적 데이터일 수 있다.

## 4. 퍼블에서 가져갈 것 / 두고 갈 것

| 가져간다                                                 | 두고 간다                                           |
| -------------------------------------------------------- | --------------------------------------------------- |
| 마크업·레이아웃·토큰 클래스                              | 예시 데이터 배열                                    |
| 상호작용 (검색조건 접기·정렬 3단·모달·일괄 처리 흐름·탭) | 클라이언트 필터·카운트 함수                         |
| 상태 가드의 **표현** (잠긴 항목 + 이유 문장)             | 가드 판정을 화면 혼자 하는 것 — 서버 판정과 맞출 것 |
| 문구·라벨 (`.data.ts` 의 라벨 상수)                      | `src/lib/router.ts` (Next 라우터로 대체)            |
| 동작 테스트의 시나리오                                   | 예시 데이터에 묶인 단언                             |

CSS 를 기존 앱에 들일 때: `src/styles/tokens.css` 는 Tailwind 진입·`html/body` 기본값·`:root` 변수를 함께 갖고 있다.
기존 앱의 전역 CSS·토큰과 이름이 겹칠 수 있으니 대표 화면 하나로 먼저 확인할 것. 경로 별칭 `@/` 도 기존 앱에서는 그 앱의 `src/` 를 가리킨다.
