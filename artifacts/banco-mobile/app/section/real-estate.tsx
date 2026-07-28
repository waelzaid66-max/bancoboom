import { SectionSearchApp } from "@/components/search/SectionSearchApp";

/**
 * Real estate — segments on sale-vs-rent first, then property type.
 *
 * Its offer axis stays CHIPS on purpose: تمليك / إيجار is the decision a browsing
 * user flips constantly, and it is short enough to fit. Charging a tap to open a
 * list for it would tax the most-used control on the page — the opposite of what
 * the pill is for. Cars ask for a pill on their own offer axis because theirs
 * sits beside a five-value engine axis; real-estate's does not, and that is why
 * these two sections legitimately differ.
 */
export default function RealEstateSectionScreen() {
  return (
    <SectionSearchApp
      category="real_estate"
      titleKey="home.categories.real_estate"
      subtitleKey="search.discover.section.realEstateSub"
      chrome={{ engines: "chips" }}
    />
  );
}
