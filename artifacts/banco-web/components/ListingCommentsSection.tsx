"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  getGetListingCommentsQueryKey,
  useCreateListingComment,
  useGetListingComments,
  type Comment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { signInPath, isClerkConfigured } from "../lib/clerk-config";
import { listingUiCopy } from "../lib/listing-ui-copy";
import { useSearchLocale } from "../lib/use-search-locale";

const inputStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "var(--banco-card)",
  color: "var(--banco-fg)",
  padding: "0.55rem 0.65rem",
  fontSize: "0.95rem",
  minHeight: 72,
  resize: "vertical",
};

const btnStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 8,
  background: "var(--banco-primary)",
  color: "#fff",
  padding: "0.45rem 0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  fontSize: "0.85rem",
};

function CommentRow({
  comment,
  sellerBadge,
}: {
  comment: Comment;
  sellerBadge: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "0.9rem" }}>{comment.author_name}</strong>
        {comment.is_seller ? (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              padding: "0.15rem 0.4rem",
              borderRadius: 6,
              border: "1px solid rgba(232,0,45,0.25)",
              color: "var(--banco-primary)",
            }}
          >
            {sellerBadge}
          </span>
        ) : null}
      </div>
      <p style={{ margin: 0, color: "var(--banco-muted)", lineHeight: 1.6, fontSize: "0.9rem" }}>
        {comment.body}
      </p>
    </div>
  );
}

type ListingCommentsSectionProps = {
  listingId: string;
  sellerId: string;
};

export function ListingCommentsSection({ listingId, sellerId }: ListingCommentsSectionProps) {
  const locale = useSearchLocale();
  const copy = listingUiCopy(locale);
  const { userId, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const query = useGetListingComments(listingId, {
    query: {
      enabled: Boolean(listingId),
      queryKey: getGetListingCommentsQueryKey(listingId),
    },
  });
  const postComment = useCreateListingComment();

  const all: Comment[] = query.data?.data ?? [];
  const { topLevel, repliesByParent } = useMemo(() => {
    const top: Comment[] = [];
    const map: Record<string, Comment[]> = {};
    for (const c of all) {
      if (c.parent_id) {
        (map[c.parent_id] ??= []).push(c);
      } else {
        top.push(c);
      }
    }
    return { topLevel: top, repliesByParent: map };
  }, [all]);

  const invalidate = () =>
    void queryClient.invalidateQueries({
      queryKey: getGetListingCommentsQueryKey(listingId),
    });

  const submit = (body: string, parentId: string | null, clear: () => void) => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setError(null);
    postComment.mutate(
      { id: listingId, data: { body: trimmed, parent_id: parentId } },
      {
        onSuccess: () => {
          clear();
          setReplyTo(null);
          invalidate();
        },
        onError: (e) => {
          const code = (e as { code?: string })?.code;
          setError(code === "RATE_LIMITED" ? copy.commentsRateLimited : copy.commentsError);
        },
      },
    );
  };

  const isOwner = Boolean(userId && userId === sellerId);
  const clerkOn = isClerkConfigured();

  if (query.isLoading) {
    return (
      <section style={{ marginTop: "1.25rem", color: "var(--banco-muted)" }} aria-busy="true">
        {copy.commentsTitle}
      </section>
    );
  }
  if (query.isError) return null;

  return (
    <section style={{ marginTop: "1.25rem" }} aria-label={copy.commentsTitle}>
      <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem" }}>{copy.commentsTitle}</h2>

      {clerkOn && isSignedIn ? (
        <div style={{ marginBottom: "1rem" }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={copy.commentsPlaceholder}
            style={inputStyle}
          />
          <button
            type="button"
            style={{ ...btnStyle, marginTop: "0.5rem", opacity: postComment.isPending || !text.trim() ? 0.6 : 1 }}
            disabled={postComment.isPending || !text.trim()}
            onClick={() => submit(text, null, () => setText(""))}
          >
            {postComment.isPending && !replyTo ? copy.commentsSending : copy.commentsSend}
          </button>
        </div>
      ) : clerkOn ? (
        <p style={{ margin: "0 0 1rem" }}>
          <Link href={signInPath(locale)} style={{ color: "var(--banco-primary)", fontWeight: 600 }}>
            {copy.commentsSignIn}
          </Link>
        </p>
      ) : null}

      {error ? <p style={{ color: "var(--banco-primary)", fontSize: "0.85rem" }}>{error}</p> : null}

      {topLevel.length === 0 ? (
        <p style={{ margin: 0, color: "var(--banco-muted)" }}>{copy.commentsEmpty}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {topLevel.map((c) => {
            const replies = repliesByParent[c.id] ?? [];
            return (
              <div key={c.id} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <CommentRow comment={c} sellerBadge={copy.commentsSellerBadge} />
                {replies.length > 0 ? (
                  <div
                    style={{
                      marginInlineStart: "0.75rem",
                      paddingInlineStart: "0.75rem",
                      borderInlineStart: "2px solid var(--banco-border)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {replies.map((r) => (
                      <CommentRow key={r.id} comment={r} sellerBadge={copy.commentsSellerBadge} />
                    ))}
                  </div>
                ) : null}
                {clerkOn && isSignedIn && (isOwner || userId) ? (
                  replyTo === c.id ? (
                    <div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={copy.commentsReplyPlaceholder}
                        style={inputStyle}
                      />
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <button
                          type="button"
                          style={btnStyle}
                          disabled={postComment.isPending || !replyText.trim()}
                          onClick={() => submit(replyText, c.id, () => setReplyText(""))}
                        >
                          {copy.commentsSend}
                        </button>
                        <button
                          type="button"
                          style={{ ...btnStyle, background: "transparent", color: "var(--banco-muted)", border: "1px solid var(--banco-border)" }}
                          onClick={() => {
                            setReplyTo(null);
                            setReplyText("");
                          }}
                        >
                          {copy.commentsCancel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(c.id);
                        setReplyText("");
                      }}
                      style={{
                        border: "none",
                        background: "none",
                        color: "var(--banco-primary)",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        padding: 0,
                        width: "fit-content",
                      }}
                    >
                      {copy.commentsReply}
                    </button>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
