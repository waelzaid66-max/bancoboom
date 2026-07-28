/**
 * OCI/Docker image reference helpers (path segments must not start/end with `-` or `.`).
 * @see https://github.com/distribution/distribution/blob/main/reference/reference.go
 */

const SEGMENT_RE = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

/**
 * @param {string} segment - single path component (repo name, image name, not full URL)
 * @returns {{ ok: boolean; reason?: string }}
 */
export function validateImagePathSegment(segment) {
  const s = String(segment ?? "").trim();
  if (!s) {
    return { ok: false, reason: "empty segment" };
  }
  if (s !== s.toLowerCase()) {
    return { ok: false, reason: "must be lowercase (use substitutions, not GitHub repo casing)" };
  }
  if (s.startsWith("-") || s.startsWith(".") || s.endsWith("-") || s.endsWith(".")) {
    return { ok: false, reason: "must not start or end with `-` or `.`" };
  }
  if (!SEGMENT_RE.test(s)) {
    return { ok: false, reason: "invalid characters for OCI path segment" };
  }
  return { ok: true };
}

/**
 * Detect Cloud Run "source deploy" auto image paths that embed the GitHub repo name.
 * Example (invalid): .../cloud-run-source-deploy/-banco-ca-oom-/banco-oom:sha
 *
 * @param {string} ref
 * @returns {{ forbidden: boolean; hint?: string }}
 */
export function detectCloudRunSourceDeployAntiPattern(ref) {
  const r = String(ref ?? "");
  if (!r.includes("cloud-run-source-deploy")) {
    return { forbidden: false };
  }
  const match = r.match(/cloud-run-source-deploy\/([^/]+)\//);
  if (!match) {
    return {
      forbidden: true,
      hint: "Use cloudbuild.yaml with _AR_REPO=banco (or your AR repo), not Console source deploy.",
    };
  }
  const repoSegment = match[1];
  const v = validateImagePathSegment(repoSegment);
  if (!v.ok) {
    return {
      forbidden: true,
      hint: `Segment "${repoSegment}" is invalid (${v.reason}). Connect trigger to repo bancooom or fix GitHub repo name; use YAML substitutions _AR_REPO/_IMAGE_NAME.`,
    };
  }
  return { forbidden: true, hint: "Prefer Artifact Registry repo from cloudbuild substitutions, not cloud-run-source-deploy." };
}

/**
 * @param {string} fullRef - e.g. me-central1-docker.pkg.dev/proj/banco/api:tag
 */
export function validateFullImageReference(fullRef) {
  const ref = String(fullRef ?? "").trim();
  if (!ref) {
    return { ok: false, reason: "empty reference" };
  }
  const anti = detectCloudRunSourceDeployAntiPattern(ref);
  if (anti.forbidden) {
    return { ok: false, reason: anti.hint ?? "cloud-run-source-deploy anti-pattern" };
  }
  const withoutTag = ref.split("@")[0].split(":")[0];
  const pathPart = withoutTag.includes("/") ? withoutTag.split("/").slice(1).join("/") : withoutTag;
  const segments = pathPart.split("/").filter(Boolean);
  for (const seg of segments) {
    const v = validateImagePathSegment(seg);
    if (!v.ok) {
      return { ok: false, reason: `path segment "${seg}": ${v.reason}` };
    }
  }
  return { ok: true };
}
