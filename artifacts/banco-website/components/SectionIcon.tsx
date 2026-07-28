import type { SectionIconVariant } from "../lib/section-icons";

const ICON_PATH: Record<
  SectionIconVariant,
  { d: string; fill?: boolean }
> = {
  all: {
    d: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    fill: true,
  },
  search: {
    d: "M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z",
    fill: true,
  },
  car: {
    d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m14 0H7m14 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0M7 17a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0",
  },
  real_estate: {
    d: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  },
  cars: {
    d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2m14 0H7m14 0a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0M7 17a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0",
  },
  facilities: {
    d: "M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-5-7 5zM12 22V8M2 8h20M7 13h.01M7 17h.01M12 13h.01M12 17h.01M17 13h.01M17 17h.01",
  },
  materials: {
    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  },
  industrial: {
    d: "M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-5-7 5zM12 22V8M2 8h20M7 13h.01M7 17h.01M12 13h.01M12 17h.01M17 13h.01M17 17h.01",
  },
};

type SectionIconProps = {
  variant: SectionIconVariant;
  size?: number;
  color?: string;
  /** Accessible label — required when icon stands alone without visible text. */
  label?: string;
};

export function SectionIcon({
  variant,
  size = 20,
  color = "currentColor",
  label,
}: SectionIconProps) {
  const glyph = ICON_PATH[variant];
  const strokeWidth = glyph.fill ? 0 : 1.75;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        d={glyph.d}
        fill={glyph.fill ? color : "none"}
        stroke={glyph.fill ? "none" : color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type { SectionIconVariant };
