import { SectionSearchApp } from "@/components/search/SectionSearchApp";

/**
 * Factories & land — industrial assets.
 *
 * Offer axis is a pill (it sits beside the industrial sub-type chips, and three
 * more chips there would push the strip into a second row before any result).
 * The industrial sub-types stay chips: there are few and they are the primary
 * way a buyer narrows this section.
 */
export default function FactoriesSectionScreen() {
  return (
    <SectionSearchApp
      category="facilities"
      titleKey="home.categories.facilities"
      subtitleKey="search.discover.section.factoriesSub"
      chrome={{ listingMode: "pill", engines: "chips" }}
    />
  );
}
