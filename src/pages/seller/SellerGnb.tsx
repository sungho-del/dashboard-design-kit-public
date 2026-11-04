import { Gnb, type GnbProps } from "../../components/ui";
import {
  SELLER_GNB_LOGO_SLOTS,
  SELLER_GNB_SECTIONS,
} from "../sellerGnbSections";
import { directSections, useDirectAccount } from "./sellerAccount";

/** 셀러 GNB — 메뉴·로고 한 벌. 직영 계정 미리보기(`?account=direct`)면 숨김 메뉴를 뺀다(`sellerAccount.ts`) */
export function SellerGnb(
  props: Omit<GnbProps, "sections" | "logo" | "collapsedLogo">,
) {
  const direct = useDirectAccount();
  return (
    <Gnb
      {...props}
      sections={
        direct ? directSections(SELLER_GNB_SECTIONS) : SELLER_GNB_SECTIONS
      }
      logo={SELLER_GNB_LOGO_SLOTS.logo}
      collapsedLogo={SELLER_GNB_LOGO_SLOTS.collapsed}
    />
  );
}
