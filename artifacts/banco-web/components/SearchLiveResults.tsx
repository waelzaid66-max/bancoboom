"use client";

import { useMemo } from "react";
import {
  useSearchListings,
  type FeedItem,
  type SearchListingsParams,
} from "@workspace/api-client-react";
import { SearchResultsSection } from "./SearchResultsSection";
import { SearchStatePanel } from "./SearchStatePanel";
import { SearchPaginationControls } from "./SearchPaginationControls";
import { searchUiCopy } from "../lib/search-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

type SearchLiveResultsProps = {
  enabled: boolean;
  criteria: SearchListingsParams;
  fallbackItems: FeedItem[];
};

function SearchLiveResultsPreview({ fallbackItems }: { fallbackItems: FeedItem[] }) {
  const locale = useSearchLocale();
  const copy = searchUiCopy(locale);

  return (
    <>
      <p
        style={{
          margin: "1rem 0 0",
          color: "var(--banco-muted)",
          fontSize: "0.85rem",
          lineHeight: 1.6,
        }}
      >
        {copy.previewNote}
      </p>
      <SearchResultsSection items={fallbackItems} linkable={false} />
      <SearchPaginationControls liveEnabled={false} hasLiveNextCursor={false} />
    </>
  );
}

function SearchLiveResultsLive({
  criteria,
}: {
  criteria: SearchListingsParams;
  fallbackItems: FeedItem[];
}) {
  const query = useSearchListings(criteria);

  const liveItems = query.data?.data ?? [];
  const nextCursor =
    query.data?.meta && typeof query.data.meta === "object" && "next_cursor" in query.data.meta
      ? (query.data.meta as { next_cursor?: string | null }).next_cursor
      : null;

  if (query.isLoading) {
    return <SearchStatePanel state="loading" />;
  }

  if (query.isError) {
    return <SearchStatePanel state="error" />;
  }

  if (liveItems.length === 0) {
    return <SearchStatePanel state="empty" />;
  }

  return (
    <>
      <SearchResultsSection items={liveItems} />
      <SearchPaginationControls
        liveEnabled
        hasLiveNextCursor={Boolean(nextCursor)}
        nextCursor={nextCursor}
      />
    </>
  );
}

export function SearchLiveResults(props: SearchLiveResultsProps) {
  const normalizedCriteria = useMemo(() => props.criteria, [props.criteria]);

  if (!props.enabled) {
    return <SearchLiveResultsPreview fallbackItems={props.fallbackItems} />;
  }

  return (
    <SearchLiveResultsLive
      criteria={normalizedCriteria}
      fallbackItems={props.fallbackItems}
    />
  );
}
