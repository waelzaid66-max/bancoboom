import { notFound } from "next/navigation";

import { ListingPageShell } from "../../../components/ListingPageShell";
import {
  listingBreadcrumbItems,
  loadListingPageData,
} from "../../../lib/listing-page-data";
import { listingPageMetadata } from "../../../lib/page-metadata";

type ListingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params;
  try {
    const { listing } = await loadListingPageData(id);
    const hero = listing.media?.[0]?.url;
    const description =
      listing.description ?? `${listing.price_display} · ${listing.location}`;
    return listingPageMetadata({
      title: listing.title,
      description,
      listingId: listing.id,
      imageUrl: hero,
      locale: "ar",
    });
  } catch {
    return { title: "إعلان" };
  }
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;

  let data;
  try {
    data = await loadListingPageData(id);
  } catch {
    notFound();
  }

  const { listing, similarItems } = data;
  const breadcrumbItems = listingBreadcrumbItems(listing.id, listing.title, "ar");

  return (
    <ListingPageShell
      listing={listing}
      similarItems={similarItems}
      breadcrumbItems={breadcrumbItems}
    />
  );
}
