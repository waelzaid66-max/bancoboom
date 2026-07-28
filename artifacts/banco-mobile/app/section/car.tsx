import { SectionSearchApp } from "@/components/search/SectionSearchApp";

/**
 * Cars — B‑OOM's movable-asset section.
 *
 * Its chrome is declared HERE, not inside the shared mini-app, so a judgement
 * about cars can never silently become the rule for real-estate or materials.
 *
 * Both axes are pills because both are long and set once, not flicked: the offer
 * axis is three values but sits beside the engine axis, and the engine axis
 * carries five (new · used · imported · bank instalment · islamic instalment).
 * Measured as chips they ran 999px inside a 375px window — 624px of the seller's
 * own segmentation off-screen with nothing admitting it was there — and wrapping
 * them produced four rows, 163px of chrome before the first car.
 */
export default function CarSectionScreen() {
  return (
    <SectionSearchApp
      category="car"
      titleKey="home.categories.car"
      subtitleKey="search.discover.section.carSub"
      chrome={{ listingMode: "pill", engines: "pill" }}
    />
  );
}
