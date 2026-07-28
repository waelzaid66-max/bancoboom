"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getListConversationsQueryKey,
  useDeleteConversation,
  useListConversations,
  type ConversationSummary,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { localeFromPathname } from "../../lib/hub-config";
import { relativeTime } from "../../lib/messages-time";
import { workspaceMessagesPath } from "../../lib/workspace-paths";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: "0.5rem",
  border: "1px solid var(--banco-border)",
  borderRadius: "var(--banco-radius)",
  background: "var(--banco-card)",
  overflow: "hidden",
};

function ConversationRow({
  conversation,
  href,
  locale,
  copy,
  onDelete,
}: {
  conversation: ConversationSummary;
  href: string;
  locale: ReturnType<typeof localeFromPathname>;
  copy: ReturnType<typeof workspaceUiCopy>;
  onDelete: (id: string) => void;
}) {
  const unread = conversation.unread > 0;
  const when = relativeTime(conversation.last_message_at, locale);

  return (
    <div style={rowStyle}>
      <Link
        href={href}
        style={{
          flex: 1,
          padding: "0.85rem 1rem",
          textDecoration: "none",
          color: "var(--banco-fg)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <strong style={{ fontSize: "0.95rem", fontWeight: unread ? 700 : 600 }}>
            {conversation.counterparty_name}
          </strong>
          <span style={{ fontSize: "0.78rem", color: "var(--banco-muted)" }}>{when}</span>
        </div>
        {conversation.listing_title ? (
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.82rem", color: "var(--banco-muted)" }}>
            {conversation.listing_title}
          </p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.35rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.88rem",
              color: unread ? "var(--banco-fg)" : "var(--banco-muted)",
              fontWeight: unread ? 600 : 400,
              lineHeight: 1.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {conversation.last_message_text || copy.messagesNoMessages}
          </p>
          {unread ? (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.15rem 0.45rem",
                borderRadius: 999,
                background: "rgba(232,0,45,0.12)",
                color: "var(--banco-primary)",
                flexShrink: 0,
              }}
            >
              {conversation.unread}
            </span>
          ) : null}
        </div>
      </Link>
      <button
        type="button"
        title={copy.messagesDelete}
        onClick={() => onDelete(conversation.id)}
        style={{
          border: "none",
          borderInlineStart: "1px solid var(--banco-border)",
          background: "transparent",
          color: "var(--banco-muted)",
          padding: "0 0.75rem",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
      >
        ×
      </button>
    </div>
  );
}

export function MessagesInboxPanel() {
  const pathname = usePathname() ?? "/workspace/messages";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const queryClient = useQueryClient();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const query = useListConversations({
    query: {
      queryKey: getListConversationsQueryKey(),
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
    },
  });

  const deleteMut = useDeleteConversation();

  const handleDelete = (id: string) => {
    setDeleteError(null);
    setConfirmId(id);
  };

  const confirmDelete = () => {
    if (!confirmId) return;
    setDeleteError(null);
    deleteMut.mutate(
      { id: confirmId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setConfirmId(null);
        },
        onError: () => setDeleteError(copy.errorGeneric),
      },
    );
  };

  const totalUnread = (query.data?.data ?? []).reduce((sum, c) => sum + (c.unread ?? 0), 0);

  if (query.isLoading) {
    return (
      <div data-banco-journey="workspace-messages">
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div
        style={{ textAlign: "center", padding: "1.5rem 0" }}
        data-banco-journey="workspace-messages"
      >
        <p style={{ fontWeight: 600, margin: "0 0 0.35rem" }}>{copy.messagesErrorTitle}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          style={{
            border: "none",
            borderRadius: 8,
            background: "var(--banco-primary)",
            color: "#fff",
            padding: "0.5rem 0.9rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  const items = query.data?.data ?? [];
  if (items.length === 0) {
    return (
      <div data-banco-journey="workspace-messages">
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{copy.messagesTitle}</h2>
        <p style={{ color: "var(--banco-muted)", lineHeight: 1.7, marginTop: "0.75rem" }}>{copy.messagesEmpty}</p>
        <p style={{ color: "var(--banco-muted)", fontSize: "0.88rem", lineHeight: 1.6 }}>{copy.messagesEmptyHint}</p>
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}
      data-banco-journey="workspace-messages"
    >
      {deleteError ? (
        <p style={{ color: "var(--banco-primary)", margin: 0 }}>{deleteError}</p>
      ) : null}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>{copy.messagesTitle}</h2>
        {totalUnread > 0 ? (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.15rem 0.5rem",
              borderRadius: 999,
              background: "var(--banco-primary)",
              color: "#fff",
            }}
          >
            {totalUnread}
          </span>
        ) : null}
      </div>
      {items.map((conversation) => (
        <ConversationRow
          key={conversation.id}
          conversation={conversation}
          href={workspaceMessagesPath(locale, conversation.id)}
          locale={locale}
          copy={copy}
          onDelete={handleDelete}
        />
      ))}

      {confirmId ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.45)",
            padding: "1rem",
          }}
          onClick={() => setConfirmId(null)}
        >
          <div
            style={{
              maxWidth: 360,
              width: "100%",
              background: "var(--banco-card)",
              borderRadius: "var(--banco-radius)",
              padding: "1.25rem",
              border: "1px solid var(--banco-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>{copy.messagesDeleteTitle}</p>
            <p style={{ margin: "0 0 1rem", color: "var(--banco-muted)", fontSize: "0.9rem", lineHeight: 1.6 }}>
              {copy.messagesDeleteBody}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                style={{
                  border: "1px solid var(--banco-border)",
                  borderRadius: 8,
                  background: "transparent",
                  padding: "0.45rem 0.85rem",
                  cursor: "pointer",
                }}
              >
                {copy.messagesCancel}
              </button>
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={confirmDelete}
                style={{
                  border: "none",
                  borderRadius: 8,
                  background: "var(--banco-primary)",
                  color: "#fff",
                  padding: "0.45rem 0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {copy.messagesDelete}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
