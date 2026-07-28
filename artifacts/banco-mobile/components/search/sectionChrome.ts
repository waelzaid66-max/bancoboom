/**
 * Per-section chrome contract — how a section renders ITS OWN axes.
 *
 * Owner, 2026‑07‑28: «السيرش ليه منطق — ممنوع الخلط بين الأقسام. كل قسم له طبيعة
 * خاصة في البحث والخانات والداتا». He was right, and the failure was
 * architectural rather than visual: the shared mini-app was DECIDING the shape of
 * every section's controls, so one judgement about cars silently became the rule
 * for real-estate, factories and materials — sections whose axes are not alike at
 * all. Cars segment by condition, origin and payment plan; real-estate by
 * sale-vs-rent and 16 property types; materials by commodity and origin.
 *
 * So the decision moves OUT of the shared component and into each section's own
 * screen. `SectionSearchApp` now executes a shape it is handed; it no longer
 * chooses one. Opening `app/section/car.tsx` tells you exactly how cars look
 * without reading a 2,000-line component, and changing cars cannot touch
 * materials by accident.
 *
 * Choosing between the two shapes — the rule, from measurement, not taste:
 *
 *   "chips"  the options are FEW and FLICKED. All of them fit on one row and the
 *            user toggles them constantly while browsing, so every extra tap is
 *            paid on the most-used control on the page. Origin (all / local /
 *            imported) is the clear case.
 *
 *   "pill"   the options are MANY or set ONCE. Spread as chips they run off the
 *            screen — measured: 16 property types ran 1206px inside a 375px
 *            window, hiding 850px of themselves with nothing on screen admitting
 *            it. Wrapping them instead produced four rows and 163px of chrome
 *            before the first result. A pill shows the CURRENT VALUE in ~110px
 *            and opens the full list on demand, which is what Stay already does
 *            for its rental terms.
 *
 * A section may legitimately want chips where another wants a pill for the same
 * kind of axis — that is the point of this file, not an inconsistency in it.
 */

/** How one axis renders inside a section's strip. */
export type AxisShape = "chips" | "pill";

export interface SectionChrome {
  /**
   * The offer axis — cars: all / for-sale / wanted. Real-estate uses its own
   * offer engines instead, so it does not set this.
   */
  listingMode?: AxisShape;
  /**
   * The engine axis — cars: new / used / imported / bank / islamic instalment.
   * Materials: production line / raw material / machine.
   */
  engines?: AxisShape;
  /** Real-estate property type (16 values). */
  propertyType?: AxisShape;
  /** Materials commodity (13 values). */
  material?: AxisShape;
  /** Origin: all / local / imported (3 values, flicked constantly). */
  origin?: AxisShape;
}

/**
 * Default when a section says nothing. Deliberately "chips" — the shape the app
 * shipped with — so a section that has not opted in keeps exactly the behaviour
 * it had, and no section changes by omission.
 */
export const DEFAULT_AXIS_SHAPE: AxisShape = "chips";

export function axisShape(
  chrome: SectionChrome | undefined,
  axis: keyof SectionChrome,
): AxisShape {
  return chrome?.[axis] ?? DEFAULT_AXIS_SHAPE;
}
