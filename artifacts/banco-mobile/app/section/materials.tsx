import { SectionSearchApp } from "@/components/search/SectionSearchApp";

/**
 * Raw materials & production lines — the Alibaba-style supply section.
 *
 * Offer axis is a pill so the strip has room for what actually matters here: the
 * commodity (13 values) and the origin. Origin stays chips — all / local /
 * imported is three values and is flipped constantly while sourcing.
 */
export default function MaterialsSectionScreen() {
  return (
    <SectionSearchApp
      category="materials"
      titleKey="home.categories.materials"
      subtitleKey="search.discover.section.materialsSub"
      chrome={{ listingMode: "pill", engines: "chips" }}
    />
  );
}
