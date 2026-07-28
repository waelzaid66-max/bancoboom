import type { SiteLocale } from "./hub-config";
import { workspacePath } from "./clerk-config";

export function workspaceSubpath(locale: SiteLocale, segment: string): string {
  const base = workspacePath(locale);
  const path = segment.startsWith("/") ? segment : `/${segment}`;
  return `${base}${path}`;
}

export function workspaceMessagesPath(locale: SiteLocale, conversationId?: string): string {
  return conversationId
    ? workspaceSubpath(locale, `messages/${conversationId}`)
    : workspaceSubpath(locale, "messages");
}
