import type { ComponentProps } from "react";
import type { Ionicons } from "@/components/icons";

export function socialIconName(
  platform: string,
): ComponentProps<typeof Ionicons>["name"] {
  switch (platform.toLowerCase()) {
    case "instagram":
      return "logo-instagram";
    case "linkedin":
      return "logo-linkedin";
    case "whatsapp":
      return "logo-whatsapp";
    case "website":
    case "web":
      return "globe-outline";
    default:
      return "link-outline";
  }
}

// Structural param: accepts both the /me SocialLink (enum platform) and the
// listing-detail seller link (open string platform) — the logic only needs the
// two fields and copes with any platform value.
export function socialOpenUrl(link: { platform: string; value: string }): string {
  const value = link.value?.trim() ?? "";
  if (!value) return "";
  if (link.platform === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : "";
  }
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
