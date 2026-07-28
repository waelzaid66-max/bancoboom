import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href: string;
  ariaLabel: string;
  /** Compact mark for the sticky header; large for hero. */
  size?: "header" | "hero";
  priority?: boolean;
};

/**
 * Official BANCO wordmark — asset under `public/banco-logo.png` only
 * (copied into this artifact; no cross-surface imports).
 */
export function BrandMark({
  href,
  ariaLabel,
  size = "header",
  priority = false,
}: BrandMarkProps) {
  const width = size === "header" ? 120 : 280;
  const height = size === "header" ? 30 : 70;
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        alignItems: "center",
        textDecoration: "none",
        lineHeight: 0,
      }}
    >
      <Image
        src="/banco-logo.png"
        alt="BANCO"
        width={width}
        height={height}
        priority={priority}
        style={{
          width: size === "header" ? "min(36vw, 128px)" : "min(78vw, 300px)",
          height: "auto",
          objectFit: "contain",
        }}
      />
    </Link>
  );
}
