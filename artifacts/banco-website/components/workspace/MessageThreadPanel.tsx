"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getGetMessagesQueryKey,
  getListConversationsQueryKey,
  useGetMessages,
  useMarkConversationRead,
  useSendMessage,
  type Message,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { localeFromPathname } from "../../lib/hub-config";
import { workspaceMessagesPath } from "../../lib/workspace-paths";
import { workspaceUiCopy } from "../../lib/workspace-ui-copy";

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "var(--banco-card)",
  color: "var(--banco-fg)",
  padding: "0.55rem 0.65rem",
  fontSize: "0.95rem",
  minHeight: 44,
  resize: "none",
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.55rem 0.9rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.9rem",
};

function MessageBubble({ message }: { message: Message }) {
  const mine = message.is_mine;
  return (
    <div
      style={{
        alignSelf: mine ? "flex-end" : "flex-start",
        maxWidth: "78%",
        padding: "0.55rem 0.75rem",
        borderRadius: 12,
        background: mine ? "var(--banco-primary)" : "var(--banco-card)",
        color: mine ? "#fff" : "var(--banco-fg)",
        border: mine ? "none" : "1px solid var(--banco-border)",
      }}
    >
      <p style={{ margin: 0, lineHeight: 1.55, fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>
        {message.body}
      </p>
      <p
        style={{
          margin: "0.35rem 0 0",
          fontSize: "0.72rem",
          opacity: 0.8,
          textAlign: mine ? "end" : "start",
        }}
      >
        {new Date(message.created_at).toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}

type MessageThreadPanelProps = {
  conversationId: string;
};

export function MessageThreadPanel({ conversationId }: MessageThreadPanelProps) {
  const pathname = usePathname() ?? "/workspace/messages";
  const locale = localeFromPathname(pathname);
  const copy = workspaceUiCopy(locale);
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastReadCountRef = useRef(0);

  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesQuery = useGetMessages(conversationId, {
    query: {
      queryKey: getGetMessagesQueryKey(conversationId),
      enabled: !!conversationId,
      refetchInterval: 4_000,
      refetchOnWindowFocus: true,
    },
  });

  const markRead = useMarkConversationRead();
  const sendMessage = useSendMessage();

  const messages = messagesQuery.data?.data ?? [];

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    if (messages.length === lastReadCountRef.current) return;
    lastReadCountRef.current = messages.length;
    markRead.mutate(
      { id: conversationId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
      },
    );
  }, [conversationId, messages.length, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    setSendError(null);
    sendMessage.mutate(
      { id: conversationId, data: { body } },
      {
        onSuccess: () => {
          setDraft("");
          void messagesQuery.refetch();
          void queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        },
        onError: () => setSendError(copy.messagesSendError),
      },
    );
  };

  if (messagesQuery.isLoading) {
    return (
      <div data-banco-journey="workspace-message-thread">
        <p style={{ color: "var(--banco-muted)" }}>{copy.loading}</p>
      </div>
    );
  }
  if (messagesQuery.isError) {
    return (
      <div data-banco-journey="workspace-message-thread">
        <p style={{ color: "var(--banco-primary)" }}>{copy.errorGeneric}</p>
        <button
          type="button"
          onClick={() => void messagesQuery.refetch()}
          style={{
            border: "1px solid var(--banco-border)",
            borderRadius: 8,
            background: "transparent",
            color: "var(--banco-fg)",
            padding: "0.35rem 0.75rem",
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          {copy.retry}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: "0.85rem", minHeight: 420 }}
      data-banco-journey="workspace-message-thread"
    >
      <Link
        href={workspaceMessagesPath(locale)}
        style={{ color: "var(--banco-primary)", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}
      >
        ← {copy.messagesBack}
      </Link>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          padding: "0.75rem",
          border: "1px solid var(--banco-border)",
          borderRadius: "var(--banco-radius)",
          background: "rgba(0,0,0,0.02)",
          maxHeight: 480,
          overflowY: "auto",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ margin: 0, color: "var(--banco-muted)", fontSize: "0.9rem" }}>{copy.messagesThreadEmpty}</p>
        ) : (
          messages.map((message) => <MessageBubble key={message.id} message={message} />)
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={copy.messagesPlaceholder}
          rows={2}
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button type="submit" disabled={sendMessage.isPending || !draft.trim()} style={btnStyle}>
          {sendMessage.isPending ? copy.messagesSending : copy.messagesSend}
        </button>
      </form>
      {sendError ? (
        <p style={{ margin: 0, color: "var(--banco-primary)", fontSize: "0.85rem" }}>{sendError}</p>
      ) : null}
    </div>
  );
}
