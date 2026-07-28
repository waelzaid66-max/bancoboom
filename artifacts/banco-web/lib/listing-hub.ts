import type { ListingDetailCategory } from "@workspace/api-client-react";
import type { SiteLocale } from "./hub-config";
import { LISTING_HUB_LABELS } from "./listing-ui-copy";

export function hubForListingCategory(
  category: ListingDetailCategory,
  locale: SiteLocale = "ar",
) {
  return LISTING_HUB_LABELS[locale][category];
}
