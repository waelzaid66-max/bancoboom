"use client";

import {
  useGetListing,
  useToggleSaveListing,
  getGetListingQueryKey,
  getGetSavedListingsQueryKey,
} from "@workspace/api-client-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { isClerkConfigured } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const btnStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.5rem 0.85rem",
  fontWeight: 600,
  cursor: "pointer",
  fontSize: "0.9rem",
};

type ListingSaveButtonProps = {
  listingId: string;
  initialSaved?: boolean;
};

export function ListingSaveButton({
  listingId,
  initialSaved = false,
}: ListingSaveButtonProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const { data, isLoading } = useGetListing(listingId, {
    query: { enabled: isClerkConfigured(), queryKey: getGetListingQueryKey(listingId) },
  });
  const toggle = useToggleSaveListing();

  if (!isClerkConfigured()) return null;

  const saved = data?.data?.is_saved ?? initialSaved;
  const pending = toggle.isPending || isLoading;

  const refreshSaveState = () => {
    void queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(listingId) });
    void queryClient.invalidateQueries({ queryKey: getGetSavedListingsQueryKey() });
  };

  const onToggle = () => {
    setSaveError(null);
    toggle.mutate(
      { data: { listing_id: listingId } },
      {
        onSuccess: () => {
          refreshSaveState();
        },
        onError: () => setSaveError(copy.savedError),
      },
    );
  };

  return (
    <div data-banco-journey="save">
      <SignedIn>
        <button
          type="button"
          style={btnStyle}
          disabled={pending}
          onClick={onToggle}
          aria-pressed={saved}
        >
          {saved ? copy.savedRemove : copy.savedAdd}
        </button>
        {saveError ? (
          <p style={{ margin: "0.4rem 0 0", color: "var(--banco-primary)", fontSize: "0.85rem" }}>
            {saveError}
          </p>
        ) : null}
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" style={btnStyle}>
            {copy.savedAdd}
          </button>
        </SignInButton>
      </SignedOut>
    </div>
  );
}
