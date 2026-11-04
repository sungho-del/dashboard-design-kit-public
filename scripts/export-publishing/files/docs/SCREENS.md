# 화면 목록

> 추출 기준 `{{SOURCE_COMMIT}}` · 대조 기준: 이 저장소 `develop` `495c8f5` 의 `src/lib/screens.ts`(기본 화면 37장) + `src/app/**/page.tsx`
>
> 목록·기본 화면의 퍼블 경로는 **이 저장소의 App Router 경로와 같다.** 화면 코드는 `src/lib/screens.ts` 의 `code`.
> 상세·등록 화면은 경로 모양이 다른 곳이 있다 — B 절의 「이 저장소 경로」 열로 대응을 본다.
> `npm run dev` 후 아래 경로(B 절은 예시 주소)를 그대로 열면 된다. GNB 맨 아래 「화면 목록」(`/screens`)에도 전부 있다.

## A. 목록·기본 화면 28

| 화면 코드  | 화면             | 경로                | 퍼블 파일 (`src/pages/babycube/`) |
| ---------- | ---------------- | ------------------- | --------------------------------- |
| BO-SYS-001 | 대시보드         | `/`                 | `DashboardPage`                   |
| BO-MEM-001 | 회원 관리        | `/members`          | `MemberListPage`                  |
| BO-SEL-001 | 셀러 관리        | `/sellers`          | `SellerListPage`                  |
| BO-SEL-003 | 입점 심사        | `/seller-review`    | `SellerReviewPage`                |
| BO-PRD-001 | 상품 관리        | `/products`         | `ProductListPage`                 |
| BO-PRD-006 | 카테고리 관리    | `/categories`       | `CategoryListPage`                |
| BO-PRD-007 | 성장단계 관리    | `/stages`           | `GrowthStageListPage`             |
| BO-ORD-001 | 주문 목록        | `/orders-all`       | `OrderListPage`                   |
| BO-RMA-001 | 취소 목록        | `/orders-cancel`    | `OrderCancelListPage`             |
| BO-RMA-003 | 반품 목록        | `/orders-return`    | `OrderReturnListPage`             |
| BO-RMA-005 | 교환 목록        | `/orders-exchange`  | `OrderExchangeListPage`           |
| BO-STL-002 | 셀러 정산        | `/settle-seller`    | `SellerSettlementPage`            |
| BO-STL-004 | 보증금 내역      | `/rent-deposit`     | `RentDepositListPage`             |
| (미확인)   | 안심케어 승인    | `/care-claims`      | `CareClaimListPage`               |
| BO-STL-008 | 정산 내역/명세서 | `/settle-statement` | `SettlementStatementPage`         |
| BO-STL-009 | 세금계산서·증빙  | `/settle-tax`       | `TaxInvoiceListPage`              |
| BO-MKT-001 | 쿠폰관리         | `/promo`            | `CouponListPage`                  |
| BO-MKT-003 | 포인트 관리      | `/points`           | `PointListPage`                   |
| BO-CSC-002 | 공지사항 관리    | `/notices`          | `NoticeListPage`                  |
| BO-CSC-003 | FAQ 관리         | `/faq-admin`        | `FaqListPage`                     |
| BO-CSC-005 | 리뷰 관리        | `/reviews-admin`    | `ReviewListPage`                  |
| BO-CSC-001 | 문의 관리        | `/support`          | `SupportListPage`                 |
| BO-MKT-006 | 배너 관리        | `/display`          | `BannerListPage`                  |
| BO-MKT-007 | 팝업 관리        | `/popups`           | `PopupListPage`                   |
| BO-SYS-003 | 공휴일 관리      | `/ops-calendar`     | `HolidayListPage`                 |
| BO-SYS-004 | 약관 관리        | `/terms-admin`      | `TermsAdminPage`                  |
| BO-SYS-005 | 스크립트 관리    | `/scripts`          | `ScriptSettingsPage`              |
| BO-SYS-002 | 설정             | `/settings`         | `SettingsPage`                    |

## B. 상세·등록 화면 17

17화면이다 — 주문 상세 한 화면이 취소·반품·교환 모드를 함께 맡아 표는 20행이다.

| 화면               | 퍼블 경로                            | 예시 주소                                               | 이 저장소 경로                                                           | 퍼블 파일                       |
| ------------------ | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| 회원 상세          | `/members/{이메일}`                  | `/members/sujin.park%40example.com`                     | `/members/[id]`                                                          | `MemberDetailPage`              |
| 셀러 상세          | `/sellers/{셀러 코드}`               | `/sellers/S-1042`                                       | `/sellers/[id]`                                                          | `SellerDetailPage`              |
| 입점 심사 상세     | `/seller-review/{신청 번호}`         | `/seller-review/SR-318`                                 | `/seller-review/[id]`                                                    | `SellerReviewDetailPage`        |
| 상품 상세          | `/products/{상품코드}`               | `/products/BL240814`                                    | `/products/[id]` · `/products/[id]/edit` (퍼블은 상세·수정이 한 화면)    | `ProductDetailPage`             |
| 주문 상세          | `/orders-all/{처리단위}`             | `/orders-all/U-R01` (렌트) · `/orders-all/U-S01` (판매) | `/rent-order-detail/[id]` · `/sale-order-detail/[id]` (처리단위 상세)    | `OrderDetailPage`               |
| ↳ 취소 상세        | `/orders-cancel/{처리단위}`          | `/orders-cancel/U-R20` · `/orders-cancel/U-S11`         | `/rent-rma-cancel/[id]` · `/rma-cancel/[id]`                             | 〃 (경로가 모드를 정한다)       |
| ↳ 반품 상세        | `/orders-return/{처리단위}`          | `/orders-return/U-R25` · `/orders-return/U-S15`         | `/rent-rma-return/[id]` · `/rma-return/[id]`                             | 〃                              |
| ↳ 교환 상세        | `/orders-exchange/{처리단위}`        | `/orders-exchange/U-S21` (판매만)                       | `/rma-exchange/[id]`                                                     | 〃                              |
| 셀러 정산 상세     | `/settle-seller/{셀러 id}`           | `/settle-seller/S-231`                                  | `/settle-seller/[id]`                                                    | `SellerSettlementDetailPage`    |
| 보증금 상세        | `/rent-deposit/{처리단위}`           | `/rent-deposit/U-R30`                                   | `/rent-deposit/[id]`                                                     | `RentDepositDetailPage`         |
| 안심케어 청구 상세 | `/care-claims/{처리단위}`            | `/care-claims/U-R28`                                    | `/care-claims/[id]` (`/care-claim/[id]` 도 있음)                         | `CareClaimDetailPage`           |
| 정산 명세서 상세   | `/settle-statement/{명세서번호}`     | `/settle-statement/STM-2609-0231`                       | `/settle-statement/[id]`                                                 | `SettlementStatementDetailPage` |
| 쿠폰 상세          | `/promo/{쿠폰코드}`                  | `/promo/CP-2610-01`                                     | `/promo/[id]`                                                            | `CouponDetailPage`              |
| 포인트 현황 상세   | `/points/{이메일}`                   | `/points/chaewon.lim%40example.com`                     | `/points/[id]`                                                           | `PointDetailPage`               |
| 공지 등록/수정     | `/notices/new` · `/notices/{id}`     | `/notices/new` · `/notices/N-U31`                       | `/notices/[id]`                                                          | `NoticeFormPage`                |
| FAQ 등록/수정      | `/faq-admin/new` · `/faq-admin/{id}` | `/faq-admin/new` · `/faq-admin/F-01`                    | `/faq-admin/[id]`                                                        | `FaqFormPage`                   |
| 리뷰 상세          | `/reviews-admin/{리뷰 id}`           | `/reviews-admin/RV-30`                                  | `/reviews-admin/[id]`                                                    | `ReviewDetailPage`              |
| 문의 상세          | `/support/{문의 ID}`                 | `/support/Q-8841` (고객) · `/support/SQ-14` (셀러)      | `/support/inquiries/[id]` · `/support/seller-asks/[id]` (퍼블은 한 화면) | `SupportDetailPage`             |
| 배너 등록/수정     | `/display/new` · `/display/{id}`     | `/display/new` · `/display/BN-1`                        | `/display/new` · `/display/[id]`                                         | `DisplayFormPage`               |
| 팝업 등록/수정     | `/popups/new` · `/popups/{id}`       | `/popups/new` · `/popups/PU-1`                          | `/popups/new` · `/popups/[id]`                                           | `DisplayFormPage`               |

- ⚠️ 퍼블의 `{id}` 는 이 저장소의 `id` 와 **뜻이 다를 수 있다** — `INTEGRATION.md` 「식별자」 절.
- 주문 상세 하나가 주문·취소·반품·교환 네 모드를 맡는다. **처리단위(유닛) 상세다** — 이 저장소의 `/order-detail/[id]`(주문번호 = 결제 1건 상세)와는 다른 화면이다(C 절). 렌트/판매는 처리단위가 정한다. 이 저장소는 모드×유형마다 경로가 따로다.
- 목록에서 들어가는 길: 이름·번호 링크, `관리` 열의 `[상세]`, 또는 행 클릭(원본에 행 클릭이 있는 화면만).
- 없는 id 는 그 화면의 「찾을 수 없음」 + [목록으로] 가 뜬다.

## C. 퍼블 없음

| 화면 코드  | 경로                                                   | 메모                                                                    |
| ---------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| BO-ORD-002 | `/order-detail` · `/order-detail/[id]`                 | 결제(주문번호) 1건 상세. 퍼블 주문 상세는 처리단위 상세라 다른 화면이다 |
| BO-RNT-001 | `/rent-detail` · `/rent-detail/[id]`                   | 대여 상세. 주문 상세(렌트)와 별개 화면이다                              |
| —          | `/products/new`                                        | 상품 등록. 퍼블 상품 화면은 등록된 상품의 상세·수정만                   |
| —          | `/login` · `/password` · `/password-reset/**` · `/dev` | 로그인·권한은 전달 범위 밖                                              |

기본 화면 37장 기준으로는 A 절 28장 + 처리단위 상세 7장(`/rent-order-detail` · `/sale-order-detail` · `/rma-cancel|return|exchange` · `/rent-rma-cancel|return` — B 절 주문·취소·반품·교환 상세가 대응) = 35장이 전달됐고, `/order-detail` · `/rent-detail` 2장이 남는다.
