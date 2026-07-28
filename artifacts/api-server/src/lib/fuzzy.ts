/**
 * Lightweight fuzzy-matching utilities used by the normalization pipeline.
 * No external dependencies — implements normalization, Levenshtein distance,
 * a similarity ratio and a best-match selector over a set of candidates.
 */

/** Lowercase, strip diacritics/symbols, collapse whitespace. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining marks
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, " ") // keep latin, digits, arabic
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse to an alphanumeric slug (a-z0-9 only). */
export function slugify(value: string): string {
  return normalizeText(value).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Classic Levenshtein edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[b.length];
}

/** Similarity ratio in [0,1] derived from edit distance over normalized text. */
export function similarityRatio(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

export interface MatchCandidate<T> {
  item: T;
  /** The strings that should be compared against the query (aliases + canonical). */
  keys: string[];
}

export interface MatchResult<T> {
  item: T;
  score: number;
}

/**
 * Returns the best-matching candidate for `query` whose score is >= threshold.
 * Substring containment counts as a strong (0.95) match so messy free text
 * like "BMW X5 2023 M-Sport" still resolves to the "X5" model.
 */
export function bestMatch<T>(
  query: string,
  candidates: MatchCandidate<T>[],
  threshold = 0.72
): MatchResult<T> | null {
  const nq = normalizeText(query);
  if (!nq) return null;

  let best: MatchResult<T> | null = null;

  for (const candidate of candidates) {
    for (const rawKey of candidate.keys) {
      const key = normalizeText(rawKey);
      if (!key) continue;

      let score: number;
      if (nq === key) {
        score = 1;
      } else if (containsWord(nq, key) || containsWord(key, nq)) {
        // Whole-token containment — strong but below exact.
        score = 0.95;
      } else {
        score = similarityRatio(nq, key);
      }

      if (!best || score > best.score) {
        best = { item: candidate.item, score };
      }
    }
  }

  if (best && best.score >= threshold) return best;
  return null;
}

/** True when `needle` appears in `haystack` as a whole space-delimited token run. */
function containsWord(haystack: string, needle: string): boolean {
  if (needle.length < 2) return false;
  const padded = ` ${haystack} `;
  return padded.includes(` ${needle} `);
}
