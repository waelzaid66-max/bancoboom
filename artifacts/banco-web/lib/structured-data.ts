import type { ListingDetail } from "@workspace/api-client-react";
import { formatApiCategoryLabelAr } from "./category-labels";
import { getSiteUrl } from "./site-env";

export function websiteJsonLd() {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "BANCO",
        url: siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        name: "BANCO",
        url: siteUrl,
      },
    ],
  };
}

export function collectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
}) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: `${siteUrl}${input.path}`,
    isPartOf: {
      "@type": "WebSite",
      name: "BANCO",
      url: siteUrl,
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteUrl}${item.path}`,
    })),
  };
}

export function listingProductJsonLd(listing: ListingDetail) {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/listing/${listing.id}`;
  const categoryLabel = formatApiCategoryLabelAr(listing.category);
  const image = listing.media?.[0]?.url ?? null;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description:
      listing.description ??
      `${categoryLabel}${listing.location ? ` في ${listing.location}` : ""}`,
    ...(image ? { image } : {}),
    category: categoryLabel,
    url: canonical,
    ...(listing.location ? { areaServed: listing.location } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      url: canonical,
    },
  };
}
