# 기존 데이터 계약과의 대응

> 추출 기준 `{{SOURCE_COMMIT}}` · 대조 기준: 이 저장소 `develop` `a2b6c86`(로컬 클론 시점)
>
> **정본은 이 저장소의 `src/data/*` 와 API 다.** 퍼블의 `.data.ts` 는 화면을 그리기 위한 예시(원본 기획 v0.4 시드)이고,
> 그 타입에 서버를 맞추지 않는다. 이 문서는 「퍼블 화면의 이 부분은 기존 앱의 어디서 오는가」를 화면 단위로 적는다.
> 필드 단위 대조는 하지 않았다 — 적용이 판정되면(README §1) 화면별로 맞춘다.

## 1. 먼저 알아둘 것 — 모든 목록 화면 공통

|                       | 퍼블                                                               | 기존 앱                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 필터·검색·정렬·페이지 | 시드 배열을 **브라우저에서** 거른다(`matchesFilters` 류)           | `makeListApi`(`src/data/admin-list.ts`)가 **서버에서** — `ListQuery`(`stat`·`q`·`searchField`·`sortKey`·`sortDir`·`page`·`size`·`dateField`·`dateFrom`·`dateTo`·`chips`) |
| 상태 카드 숫자        | 시드에서 센다(상태 축을 뺀 조건 기준)                              | 서버가 센다                                                                                                                                                              |
| 기간 빠른 선택        | `SELLER_PERIOD_PRESETS`(기준일 2026-06-29 · `processList.data.ts`) | `dateFrom`·`dateTo` 로 넘긴다                                                                                                                                            |
| 로딩·빈 결과·새로고침 | `src/lib/dataStatus.ts`(`?preview=` 로 미리보기)                   | 기존 앱의 pending·empty·error·retry                                                                                                                                      |
| 저장·상태 변경·엑셀   | 확인 창 + 알림만                                                   | `src/lib/api.ts` · `src/lib/export.ts`                                                                                                                                   |

**옮기는 방법**: 퍼블 화면의 필터 상태(상태 카드·검색어·기간·셀렉트)를 `ListQuery` 로 바꿔 넘기고, 행 렌더링은 퍼블 마크업을 쓴다.
퍼블의 클라이언트 필터 함수는 버린다. 퍼블 `.data.ts` 는 **동기**다 — 데이터 로딩은 기존 앱 방식을 쓰고, 퍼블에서는 렌더링·상호작용만 가져간다.

## 2. 식별자 — 이식 전에 반드시 확인

| 화면                        | 퍼블 경로의 id                                              | 할 일                                                              |
| --------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ |
| 처리단위 상세(판매·렌트 11) | **처리단위** `{주문번호}-{순번}` (`20260624225758-1`)       | 서버 처리단위 키와 같은지 확인. 한 주문번호에 여러 처리단위가 있다 |
| 주문 상세(통합)             | 주문번호 (`20260705880011`)                                 | `/order-details/[orderNo]` 와 같다                                 |
| 상품                        | 상품 id (`P-001`) — 화면에 보이는 것은 상품코드(`NZ269940`) | 경로는 id, 표시는 코드                                             |
| 정산 명세 · 매출 정산 상세  | **정산월** (`2026.06`) — 명세서번호는 `STM-2606`            | 이 저장소 `[id]` 가 무엇인지(회차·명세서번호) 정할 것              |
| 보증금 상세                 | 처리단위                                                    | 위와 같다                                                          |
| 쿠폰                        | 쿠폰코드 (`CP-2608-01`) · 등록은 `new`                      | `/promo/[id]` 의 등록 진입을 어떻게 받을지 정할 것                 |
| 공지·문의·리뷰·1:1 문의     | `N-S26` · `Q-8842` · `RV-31` · `SQ-11` · 1:1 등록 `new`     | 형식 확인                                                          |

## 3. 화면별 대응

| 퍼블 화면 (`src/pages/seller/`)                                               | 이 저장소 `src/data/*`                                                                                         | 메모                                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 대시보드 `SellerDashboardPage`                                                | `dashboard.ts`                                                                                                 | 숫자는 각 화면 식에서 모은다(상품 `saleStatOf` · 정산 `settle.data` `SUMMARY` · 응대 큐)         |
| 상품 관리 `ProductsPage`                                                      | `products.ts`                                                                                                  | 표에서 고친 가격은 체크한 행만 [수정 저장] — 일괄 저장 API 대응 필요                             |
| 상품 상세·등록 `ProductFormPage`                                              | `product-form.ts`                                                                                              | 11구역 · 임시저장 · 재심사 요청 · 이미지·편집기는 자리만(업로드는 개발)                          |
| 주문 통합 관리 `SaleOrdersPage`·`RentOrdersPage`(`OrdersOverview`)            | `sale-orders.ts` `saleOrdersApi` · `rent-orders.ts` `rentOrdersApi`                                            | 조회 전용 · 처리상태 파생 `flowStatOf`                                                           |
| 주문 상세(통합) `OrderDetailsPage`                                            | `seller-order-detail.ts`                                                                                       |                                                                                                  |
| 발주·배송·취소·반품·교환(판매) `SaleProcPage`·`ShippingPage`·`SaleClaimPages` | `sale-proc.ts` · `shipping.ts` · `sale-cancel.ts` · `sale-returns.ts` · `sale-exchange.ts`                     | 공용 틀 `ProcessList` · 전이 `gate.data` `routeGate`                                             |
| 렌트 발주·배송·대여·연체·검수·반납·취소·반품 `RentProcessPages`               | `rent-list.ts` · `rent-dispatch.ts` · `rent-use.ts` · `rent-insp-return.ts` · `rent-cancel.ts` · `rent-rma.ts` | 같은 틀 · 수거 송장 칸 · 안심케어 검색                                                           |
| 처리단위 상세 `UnitDetail`(+`RentSections`)                                   | `seller-order-detail.ts` · `delivery-detail.ts` · `claim-detail.ts`                                            | 주문 명세 `statementBlocksOf` · 클레임 결과 `claimBlocksOf` · 검수 판정·보증금 정산은 화면 state |
| 매출 정산 · 명세서 · 세금계산서 `SettlePages`                                 | `settle-own.ts` `settleTxApi` · `settle-statement.ts` · `settle-tax.ts` · `settlement-detail.ts`               | 금액은 `settle.data.ts` 한 곳(원본 `settleMyData` 식) — 서버 값으로 바꿀 자리                    |
| 보증금 내역·상세 `RentDepositPages`                                           | `rent-deposit.ts` `rentDepositApi`                                                                             | 조회 전용 원장 — 환급 실행은 검수·반납 상세                                                      |
| 쿠폰관리·등록/수정 `CouponPages`                                              | `coupons.ts` `couponsApi`                                                                                      |                                                                                                  |
| 공지·문의·리뷰·1:1 `BoardPages`·`BoardDetailPages`                            | `seller-notice.ts` · `support.ts` · `seller-reviews.ts` · `seller-asks.ts`                                     | 답변·답글·문의 등록은 알림만                                                                     |
| 스토어 정보·설정 · 공휴일 `SystemPages`                                       | `store.ts` · `ops-calendar.ts`                                                                                 | 판매자 정보는 읽기 전용 · 본사 공휴일은 잠금                                                     |
| GNB 할 일 배지 `sellerGnbSections.tsx` `NAV_COUNTS`                           | (서버 카운트)                                                                                                  | 원본 식으로 시드에서 센다                                                                        |
| 직영 계정 미리보기 `sellerAccount.ts`                                         | 로그인 세션(`src/lib/session.tsx`)                                                                             | 퍼블은 `?account=direct` 로만 — 실제로는 계정의 직영 여부로 정한다                               |
