# 화면 목록

> 추출 기준 `{{SOURCE_COMMIT}}` · 대조 기준: 이 저장소 `develop` `d95ed6c` 의 `src/lib/screens.ts`(기본 화면 37장) + `src/app/**/page.tsx`
>
> 퍼블 경로는 **이 저장소의 App Router 경로와 같다.** 화면 코드는 `src/lib/screens.ts` 의 `code`.
> `npm run dev` 후 아래 경로를 그대로 열면 된다.

## A. 전달 — 목록·기본 화면 28

| 화면 코드  | 화면                | 경로                | 퍼블 파일 (`src/pages/babycube/`) |
| ---------- | ------------------- | ------------------- | --------------------------------- |
| BO-SYS-001 | 대시보드            | `/`                 | `DashboardPage`                   |
| BO-MEM-001 | 회원 관리           | `/members`          | `MemberListPage`                  |
| BO-SEL-001 | 셀러 관리           | `/sellers`          | `SellerListPage`                  |
| BO-SEL-003 | 입점 심사           | `/seller-review`    | `SellerReviewPage`                |
| BO-PRD-001 | 상품 관리           | `/products`         | `ProductListPage`                 |
| BO-PRD-006 | 카테고리 관리       | `/categories`       | `CategoryListPage`                |
| BO-PRD-007 | 성장단계 관리       | `/stages`           | `GrowthStageListPage`             |
| BO-ORD-001 | 주문 목록           | `/orders-all`       | `OrderListPage`                   |
| BO-RMA-001 | 취소 목록           | `/orders-cancel`    | `OrderCancelListPage`             |
| BO-RMA-003 | 반품 목록           | `/orders-return`    | `OrderReturnListPage`             |
| BO-RMA-005 | 교환 목록           | `/orders-exchange`  | `OrderExchangeListPage`           |
| BO-STL-002 | 셀러 정산           | `/settle-seller`    | `SellerSettlementPage`            |
| BO-STL-004 | 보증금 내역         | `/rent-deposit`     | `RentDepositListPage`             |
| (미확인)   | 안심케어 청구       | `/care-claims`      | `CareClaimListPage`               |
| BO-STL-008 | 정산 내역/명세서    | `/settle-statement` | `SettlementStatementPage`         |
| BO-STL-009 | 세금계산서·증빙     | `/settle-tax`       | `TaxInvoiceListPage`              |
| BO-MKT-001 | 쿠폰 관리           | `/promo`            | `CouponListPage`                  |
| BO-MKT-003 | 포인트 관리         | `/points`           | `PointListPage`                   |
| BO-CSC-002 | 공지사항            | `/notices`          | `NoticeListPage`                  |
| BO-CSC-003 | FAQ                 | `/faq-admin`        | `FaqListPage`                     |
| BO-CSC-005 | 리뷰 관리           | `/reviews-admin`    | `ReviewListPage`                  |
| BO-CSC-001 | 문의 관리           | `/support`          | `SupportListPage`                 |
| BO-MKT-006 | 배너(전시) 관리     | `/display`          | `BannerListPage`                  |
| BO-MKT-007 | 팝업 관리           | `/popups`           | `PopupListPage`                   |
| BO-SYS-003 | 운영 캘린더(공휴일) | `/ops-calendar`     | `HolidayListPage`                 |
| BO-SYS-004 | 약관 관리           | `/terms-admin`      | `TermsAdminPage`                  |
| BO-SYS-005 | 스크립트 관리       | `/scripts`          | `ScriptSettingsPage`              |
| BO-SYS-002 | 설정                | `/settings`         | `SettingsPage`                    |

## B. 전달 — 상세 3

| 화면 코드  | 화면           | 경로                  | 예시 주소                           | 퍼블 파일                |
| ---------- | -------------- | --------------------- | ----------------------------------- | ------------------------ |
| BO-MEM-002 | 회원 상세      | `/members/[id]`       | `/members/sujin.park%40example.com` | `MemberDetailPage`       |
| BO-SEL-002 | 셀러 상세      | `/sellers/[id]`       | `/sellers/S-1042`                   | `SellerDetailPage`       |
| BO-SEL-004 | 입점 심사 상세 | `/seller-review/[id]` | `/seller-review/A-2026-0141`        | `SellerReviewDetailPage` |

⚠️ 퍼블의 `[id]` 는 이 저장소의 `id` 와 **뜻이 다르다** — `INTEGRATION.md` 「식별자」 절.

목록에서 들어가는 길: 이름(셀러명) 링크 또는 `관리` 열의 `[상세]`. 행 전체 클릭은 원본에 없어 두지 않았다.

## C. 미전달 — 기본 화면 37장 중 퍼블 없음 9 (전부 상세류)

| 화면 코드  | 경로                 |
| ---------- | -------------------- |
| BO-ORD-002 | `/order-detail`      |
| (미확인)   | `/sale-order-detail` |
| (미확인)   | `/rent-order-detail` |
| (미확인)   | `/rma-cancel`        |
| (미확인)   | `/rma-return`        |
| (미확인)   | `/rma-exchange`      |
| (미확인)   | `/rent-rma-cancel`   |
| (미확인)   | `/rent-rma-return`   |
| BO-RNT-001 | `/rent-detail`       |

## D. 미전달 — 상세·등록 경로 중 퍼블 없음

`/care-claims/[id]` · `/display/[id]` · `/display/new` · `/faq-admin/[id]` · `/notices/[id]` · `/points/[id]` ·
`/popups/[id]` · `/popups/new` · `/products/[id]` · `/products/[id]/edit` · `/promo/[id]` · `/rent-deposit/[id]` ·
`/reviews-admin/[id]` · `/settle-seller/[id]` · `/settle-statement/[id]` · `/support/inquiries/[id]` ·
`/support/seller-asks/[id]` · C 절 9개 경로의 `/[id]` 형태

퍼블 화면 안에 위 경로로 가는 링크는 없다. 주소를 직접 치면 「화면 목록」으로 떨어진다.
