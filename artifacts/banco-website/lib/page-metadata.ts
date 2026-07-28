import type { Metadata } from "next";
import { buildCanonicalUrl, buildHreflangAlternates, PRIMARY_LOCALE } from "./site-i18n";

export function pageMetadata(input: {
  title: string;
  description: string;
  path: string;
  locale?: "ar" | "en";
}): Metadata {
  const canonical = buildCanonicalUrl(input.path);
  const locale = input.locale ?? (input.path.startsWith("/en") ? "en" : "ar");
  const ogLocale = locale === "en" ? "en_US" : PRIMARY_LOCALE.replace("-", "_");
  const alternateLocale =
    locale === "en" ? [PRIMARY_LOCALE.replace("-", "_")] : ["en_US"];

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: buildHreflangAlternates(input.path),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      locale: ogLocale,
      alternateLocale,
      type: "website",
      siteName: "BANCO",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export function listingPageMetadata(input: {
  title: string;
  description: string;
  listingId: string;
  imageUrl?: string | null;
  locale?: "ar" | "en";
}): Metadata {
  const locale = input.locale ?? "ar";
  const path =
    locale === "en" ? `/en/listing/${input.listingId}` : `/listing/${input.listingId}`;
  const canonical = buildCanonicalUrl(path);
  const ogImage = input.imageUrl
    ? [{ url: input.imageUrl, alt: input.title }]
    : undefined;
  const ogLocale = locale === "en" ? "en_US" : PRIMARY_LOCALE.replace("-", "_");

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical,
      languages: buildHreflangAlternates(path),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      type: "website",
      url: canonical,
      locale: ogLocale,
      siteName: "BANCO",
      ...(ogImage ? { images: ogImage } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: input.title,
      description: input.description,
      ...(ogImage ? { images: [input.imageUrl!] } : {}),
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
