/**
 * Escape user-supplied segments for PostgreSQL LIKE with ESCAPE '\'.
 * Prevents `%` / `_` / `\` in path segments from widening matches (C-02).
 */
export function escapeLikeLiteral(segment: string): string {
  return segment.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
