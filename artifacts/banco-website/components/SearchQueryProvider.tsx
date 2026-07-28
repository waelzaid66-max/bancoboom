"use client";

import type { ReactNode } from "react";

/** Legacy wrapper — QueryClient lives in ApiClientBootstrap at layout level. */
export function SearchQueryProvider({ children }: { children: ReactNode }) {
  return children;
}
