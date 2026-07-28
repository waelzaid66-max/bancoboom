"use client";

import { useEffect, useId, useRef, useState } from "react";

const triggerStyle: React.CSSProperties = {
  border: "1px solid var(--banco-border)",
  borderRadius: 8,
  background: "transparent",
  color: "var(--banco-fg)",
  padding: "0.35rem 0.65rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.35rem",
};

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 0.35rem)",
  insetInlineStart: 0,
  minWidth: 200,
  maxWidth: 280,
  padding: "0.35rem 0",
  border: "1px solid var(--banco-border)",
  borderRadius: 10,
  background: "var(--banco-card)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
  zIndex: 60,
};

const itemStyle: React.CSSProperties = {
  display: "block",
  padding: "0.45rem 0.85rem",
  color: "var(--banco-fg)",
  textDecoration: "none",
  fontSize: "0.875rem",
  fontWeight: 500,
};

type SiteNavDropdownProps = {
  label: string;
  items: { href: string; label: string; external?: boolean }[];
  alignEnd?: boolean;
};

export function SiteNavDropdown({ label, items, alignEnd }: SiteNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        style={triggerStyle}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <span aria-hidden style={{ fontSize: "0.7rem", opacity: 0.75 }}>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          role="menu"
          style={{
            ...panelStyle,
            ...(alignEnd ? { insetInlineStart: "auto", insetInlineEnd: 0 } : null),
          }}
        >
          {items.map((item) =>
            item.external !== false ? (
              <a
                key={item.href + item.label}
                role="menuitem"
                href={item.href}
                target="_blank"
                rel="noreferrer"
                style={itemStyle}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <a
                key={item.href + item.label}
                role="menuitem"
                href={item.href}
                style={itemStyle}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}
