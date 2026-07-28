"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ensureApiClientConfigured } from "../lib/api-client-config";
import { searchConfig } from "../lib/search-config";

/** API base URL + React Query — required for all `useGet*` hooks site-wide. */
export function ApiClientBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    ensureApiClientConfigured();
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: searchConfig.listings.staleTimeMs,
            retry: searchConfig.listings.retry,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
