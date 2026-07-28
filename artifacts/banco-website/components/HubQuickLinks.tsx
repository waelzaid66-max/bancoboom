import type { SectionIconVariant } from "../lib/section-icons";
import { SectionIcon } from "./SectionIcon";

const gridStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem",
  marginTop: "0.75rem",
};

type HubQuickLink = {
  href: string;
  label: string;
  icon?: SectionIconVariant;
};

type HubQuickLinksProps = {
  links: HubQuickLink[];
  /** Section accent — matches mobile section chrome per hub company. */
  accentColor?: string;
};

export function HubQuickLinks({ links, accentColor }: HubQuickLinksProps) {
  const accent = accentColor ?? "var(--banco-primary)";

  return (
    <div style={gridStyle}>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          style={{
            border: `1px solid ${accent}44`,
            borderRadius: 999,
            padding: "0.4rem 0.85rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            color: "var(--banco-fg)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: `${accent}18`,
          }}
        >
          {link.icon ? (
            <SectionIcon variant={link.icon} size={16} color={accent} />
          ) : null}
          {link.label}
        </a>
      ))}
    </div>
  );
}
