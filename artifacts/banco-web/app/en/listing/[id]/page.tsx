import { ListingPageShell } from "../../../../components/ListingPageShell";
import {
  fetchListingPageData,
  listingBreadcrumbItems,
  loadListingPageData,
} from "../../../../lib/listing-page-data";
import { listingPageMetadata } from "../../../../lib/page-metadata";

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params;
  const data = await fetchListingPageData(id);
  if (!data) return { title: "Listing not found" };
  const { listing } = data;
  const hero = listing.media?.[0]?.url;
  const description =
    listing.description ?? `${listing.price_display} · ${listing.location}`;
  return listingPageMetadata({
    title: listing.title,
    description,
    listingId: listing.id,
    imageUrl: hero,
    locale: "en",
  });
}

export default async function EnglishListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const { listing, similarItems } = await loadListingPageData(id);
  const breadcrumbItems = listingBreadcrumbItems(listing.id, listing.title, "en");

  return (
    <ListingPageShell
      listing={listing}
      similarItems={similarItems}
      breadcrumbItems={breadcrumbItems}
    />
  );
}
