"use client";

import { useEffect } from "react";
import {
  initSearchAnalyticsAdapter,
  resolveSearchAnalyticsAdapter,
} from "../lib/analytics-adapter";
import { searchConfig } from "../lib/search-config";

/**
 * One-time bootstrap for search analytics event bridge.
 * Keeps analytics wiring decoupled from search UI components.
 */
export function SearchAnalyticsBootstrap() {
  useEffect(() => {
    initSearchAnalyticsAdapter({
      adapter: resolveSearchAnalyticsAdapter(searchConfig.analyticsMode),
    });
  }, []);

  return null;
}
