type SearchEventName =
  | "search_apply"
  | "search_reset"
  | "search_autocomplete_select"
  | "search_pagination_next"
  | "search_pagination_reset"
  | "search_view_change"
  | "search_near_me_enable"
  | "search_near_me_disable"
  | "search_near_me_denied"
  | "search_facet_click";

type SearchEventPayload = Record<string, string | number | boolean | null | undefined>;

/**
 * Lightweight client-safe telemetry bridge.
 * For now it logs in development and emits a browser event so any future analytics
 * adapter can subscribe without touching search UI code.
 */
export function trackSearchEvent(name: SearchEventName, payload: SearchEventPayload) {
  if (typeof window === "undefined") return;

  const detail = {
    name,
    payload,
    ts: Date.now(),
  };

  window.dispatchEvent(new CustomEvent("banco:web:search-event", { detail }));

  if (process.env.NODE_ENV !== "production") {
    console.debug("[banco-web][search-event]", detail);
  }
}
