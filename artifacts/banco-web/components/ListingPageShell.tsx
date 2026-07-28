import type { FeedItem, ListingDetail } from "@workspace/api-client-react";
import { JsonLd } from "./JsonLd";
import { ListingDetailView } from "./ListingDetailView";
import { listingProductJsonLd, breadcrumbJsonLd } from "../lib/structured-data";

type ListingPageShellProps = {
  listing: ListingDetail;
  similarItems: FeedItem[];
  breadcrumbItems: { name: string; path: string }[];
};

export function ListingPageShell({
  listing,
  similarItems,
  breadcrumbItems,
}: ListingPageShellProps) {
  return (
    <main
      style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem" }}
      data-banco-journey="listing"
    >
      <JsonLd data={listingProductJsonLd(listing)} />
      <JsonLd data={breadcrumbJsonLd(breadcrumbItems)} />
      <ListingDetailView listing={listing} similarItems={similarItems} />
    </main>
  );
}
