export type SearchEventDetail = {
  name: string;
  payload: Record<string, string | number | boolean | null | undefined>;
  ts: number;
};

export type SearchAnalyticsAdapter = (event: SearchEventDetail) => void;

/**
 * Default adapter: no external network side effects.
 * Replace this function body later with your analytics provider SDK call.
 */
export const defaultSearchAnalyticsAdapter: SearchAnalyticsAdapter = (event) => {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[banco-web][analytics-adapter]", event);
  }
};

export const noopSearchAnalyticsAdapter: SearchAnalyticsAdapter = () => {};

export function resolveSearchAnalyticsAdapter(mode: string | undefined): SearchAnalyticsAdapter {
  switch (mode) {
    case "off":
      return noopSearchAnalyticsAdapter;
    case "debug":
    default:
      return defaultSearchAnalyticsAdapter;
  }
}

type InitOptions = {
  adapter?: SearchAnalyticsAdapter;
};

let isInitialized = false;

export function initSearchAnalyticsAdapter(options: InitOptions = {}) {
  if (typeof window === "undefined" || isInitialized) return;

  const adapter = options.adapter ?? defaultSearchAnalyticsAdapter;

  const listener = (rawEvent: Event) => {
    const customEvent = rawEvent as CustomEvent<SearchEventDetail>;
    if (!customEvent.detail || typeof customEvent.detail !== "object") return;
    adapter(customEvent.detail);
  };

  window.addEventListener("banco:web:search-event", listener);
  isInitialized = true;
}
