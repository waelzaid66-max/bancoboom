import type { FeedItem } from "@workspace/api-client-react";

/** True when the listing is a furnished/daily rental open for short-stay booking. */
export function isBookableListing(
  item: { is_bookable?: boolean | null },
): boolean {
  return item.is_bookable === true;
}

export function filterBookableListings<T extends { is_bookable?: boolean | null }>(
  items: T[],
): T[] {
  return items.filter(isBookableListing);
}
