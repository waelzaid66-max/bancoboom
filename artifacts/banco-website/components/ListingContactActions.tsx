"use client";

import type { ListingDetail } from "@workspace/api-client-react";
import {
  ContactLeadBodyActionType,
  useContactLead,
  useCreateConversation,
  useGetListing,
  getGetListingQueryKey,
} from "@workspace/api-client-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAppListingDeepLink } from "../lib/site-env";
import { isClerkConfigured, signInPath } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { workspaceMessagesPath } from "../lib/workspace-paths";
import { useSearchLocale } from "../lib/use-search-locale";

const rowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.6rem",
  marginTop: "0.75rem",
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.55rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
  textDecoration: "none",
  display: "inline-block",
};

const secondaryStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "transparent",
  color: "var(--banco-fg)",
};

type ListingContactActionsProps = {
  listing: ListingDetail;
};

export function ListingContactActions({ listing }: ListingContactActionsProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const router = useRouter();
  const queryClient = useQueryClient();
  const appLink = getAppListingDeepLink(listing.id);
  const showWhatsApp = listing.whatsapp_enabled === true;
  const clerkOn = isClerkConfigured();

  const { data: authedListing, refetch: refetchListing } = useGetListing(listing.id, {
    query: { enabled: clerkOn, queryKey: getGetListingQueryKey(listing.id) },
  });
  const contactToken = authedListing?.data?.contact_token ?? listing.contact_token ?? null;
  const contactLead = useContactLead();
  const createConversation = useCreateConversation();
  const [phoneReveal, setPhoneReveal] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [openingChat, setOpeningChat] = useState(false);

  /** contact_token is single-use — refresh listing after each lead so the next action works. */
  const refreshContactToken = () => {
    void queryClient.invalidateQueries({ queryKey: getGetListingQueryKey(listing.id) });
    void refetchListing();
  };

  const runContact = (action: ContactLeadBodyActionType) => {
    if (!contactToken) {
      setContactError(copy.contactWebHint);
      void refetchListing();
      return;
    }
    setContactError(null);
    contactLead.mutate(
      {
        data: {
          listing_id: listing.id,
          action_type: action,
          contact_token: contactToken,
        },
      },
      {
        onSuccess: (res) => {
          refreshContactToken();
          const phone = res.data?.phone;
          if (phone) {
            setPhoneReveal(phone);
            if (action === ContactLeadBodyActionType.call) {
              window.location.href = `tel:${phone}`;
            } else if (action === ContactLeadBodyActionType.whatsapp) {
              window.open(`https://wa.me/${phone.replace(/\D/g, "")}`, "_blank", "noopener,noreferrer");
            }
          }
        },
        onError: () => {
          setContactError(copy.contactError);
          refreshContactToken();
        },
      },
    );
  };

  const openInAppChat = () => {
    if (openingChat) return;
    setContactError(null);
    setOpeningChat(true);

    if (contactToken) {
      contactLead.mutate(
        {
          data: {
            listing_id: listing.id,
            action_type: ContactLeadBodyActionType.chat,
            contact_token: contactToken,
          },
        },
        {
          onSettled: () => {
            refreshContactToken();
          },
        },
      );
    }

    createConversation.mutate(
      { data: { listing_id: listing.id } },
      {
        onSuccess: (res) => {
          const conversationId = res.data?.id;
          if (conversationId) {
            router.push(workspaceMessagesPath(locale, conversationId));
          } else {
            setContactError(copy.contactError);
          }
        },
        onError: () => setContactError(copy.contactError),
        onSettled: () => setOpeningChat(false),
      },
    );
  };

  return (
    <section
      style={{ marginTop: "1.25rem" }}
      aria-label={copy.contactTitle}
      data-banco-journey="contact"
    >
      <p
        style={{
          margin: "0 0 0.35rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--banco-muted)",
        }}
      >
        {copy.contactTitle}
      </p>

      {clerkOn ? (
        <>
          <SignedIn>
            <p style={{ margin: "0 0 0.5rem", color: "var(--banco-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              {copy.contactWebHint}
            </p>
            <div style={rowStyle}>
              <button
                type="button"
                style={buttonStyle}
                disabled={contactLead.isPending}
                onClick={() => runContact(ContactLeadBodyActionType.call)}
              >
                {copy.contactCall}
              </button>
              {showWhatsApp ? (
                <button
                  type="button"
                  style={secondaryStyle}
                  disabled={contactLead.isPending}
                  onClick={() => runContact(ContactLeadBodyActionType.whatsapp)}
                >
                  {copy.contactWhatsApp}
                </button>
              ) : null}
              <button
                type="button"
                style={secondaryStyle}
                disabled={openingChat || createConversation.isPending}
                onClick={openInAppChat}
              >
                {copy.contactChat}
              </button>
            </div>
            {phoneReveal ? (
              <p style={{ margin: "0.5rem 0 0", color: "var(--banco-fg)", fontSize: "0.9rem" }}>
                {phoneReveal}
              </p>
            ) : null}
            {contactError ? (
              <p style={{ margin: "0.5rem 0 0", color: "var(--banco-primary)", fontSize: "0.85rem" }}>
                {contactError}
              </p>
            ) : null}
          </SignedIn>
          <SignedOut>
            <p style={{ margin: "0 0 0.5rem", color: "var(--banco-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
              {copy.contactAppHint}
            </p>
            <div style={rowStyle}>
              <Link href={signInPath(locale)} style={buttonStyle}>
                {copy.contactSignIn}
              </Link>
              <a href={appLink} style={secondaryStyle}>
                {copy.openInApp}
              </a>
            </div>
          </SignedOut>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 0.5rem", color: "var(--banco-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>
            {copy.contactAppHint}
          </p>
          <div style={rowStyle}>
            <a href={appLink} style={buttonStyle}>
              {copy.contactCall}
            </a>
            {showWhatsApp ? (
              <a href={appLink} style={secondaryStyle}>
                {copy.contactWhatsApp}
              </a>
            ) : null}
            <a href={appLink} style={secondaryStyle}>
              {copy.contactChat}
            </a>
          </div>
        </>
      )}
    </section>
  );
}
