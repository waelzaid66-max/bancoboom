import * as Linking from "expo-linking";
import { Share } from "react-native";

/**
 * Resolve BANCO's public web base URL for a listing's shareable page (`/l/:id`,
 * served by the API server with real OG/Twitter/JSON-LD tags so the link
 * previews and is Google-indexable). Prefers an explicit EXPO_PUBLIC_PUBLIC_APP_URL,
 * else derives it from EXPO_PUBLIC_DOMAIN (the same host the app already talks to).
 * Returns null when neither is configured, so we can fall back to a deep link.
 */
function publicWebBase(): string | null {
  const explicit = process.env.EXPO_PUBLIC_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
  if (domain) return `https://${domain.replace(/\/+$/, "")}`;
  return null;
}

/**
 * Share a listing using the OS share sheet. We prefer a public web URL
 * (`<base>/l/<id>`) because it previews in messengers, opens for anyone (app or
 * not), and is indexable. We also include the app deep link
 * (`<scheme>://listing/<id>`) as a secondary line so people with the app can
 * jump straight in. When no public base is configured we share the deep link
 * alone. Cancellation / unavailable share sheets are swallowed — sharing is
 * best-effort.
 */
export async function shareListing(opts: {
  id: string;
  title?: string | null;
  price?: string | null;
}): Promise<void> {
  const deepLink = Linking.createURL(`/listing/${opts.id}`);
  const base = publicWebBase();
  const webUrl = base ? `${base}/l/${opts.id}` : null;
  const primaryUrl = webUrl ?? deepLink;

  // Build the message: title + price, then the primary (web) URL. When a web URL
  // exists, append the deep link on its own line so app users open in-app.
  const lines = [
    opts.title?.trim(),
    opts.price?.trim(),
    primaryUrl,
    webUrl ? deepLink : null,
  ].filter((l): l is string => !!l);

  try {
    await Share.share({
      message: lines.join("\n"),
      url: primaryUrl,
      title: opts.title?.trim() || undefined,
    });
  } catch {
    // Best-effort: user dismissed the sheet or sharing is unavailable.
  }
}
