/**
 * Build the next `users.company_details` payload for a business profile update.
 *
 * Compliance (F-SEC-07): never drop previously stored KYC document URLs when
 * the client re-saves business fields without re-sending `documents`.
 * New non-empty `documents` replace the prior list; empty/omitted keeps prior.
 */

/**
 * FI-only regulatory identity fields. Same preservation rule as `documents`:
 * a later profile re-save that omits them must not silently erase a bank's
 * licence evidence.
 */
export const FI_DETAIL_KEYS = [
  "fi_license_number",
  "fi_license_type",
  "fi_regulator",
  "fi_registry_number",
] as const;

export type FiDetailKey = (typeof FI_DETAIL_KEYS)[number];

export type BusinessProfileInput = {
  activity_type: string;
  business_name: string;
  trade_name?: string;
  owner_name?: string;
  city: string;
  documents?: string[];
} & Partial<Record<FiDetailKey, string>>;

export type CompanyDetailsRecord = {
  activity_type: string;
  business_name: string;
  trade_name?: string;
  owner_name?: string;
  city: string;
  documents?: string[];
} & Partial<Record<FiDetailKey, string>>;

function asDocList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((d): d is string => typeof d === "string" && d.length > 0);
}

export function mergeBusinessCompanyDetails(
  existing: unknown,
  business: BusinessProfileInput,
): CompanyDetailsRecord {
  const prev =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  const prevDocs = asDocList(prev.documents);
  const incoming = business.documents;
  const nextDocs =
    incoming && incoming.length > 0 ? asDocList(incoming) : prevDocs;

  const next: CompanyDetailsRecord = {
    activity_type: business.activity_type,
    business_name: business.business_name,
    city: business.city,
  };
  if (business.trade_name) next.trade_name = business.trade_name;
  if (business.owner_name) next.owner_name = business.owner_name;
  if (nextDocs.length > 0) next.documents = nextDocs;

  // Carry FI licence evidence forward when the client re-saves without it
  // (same rationale as `documents`): a bank editing its city must not drop the
  // licence the admin verified it on.
  for (const key of FI_DETAIL_KEYS) {
    const incomingValue = business[key];
    if (typeof incomingValue === "string" && incomingValue.length > 0) {
      next[key] = incomingValue;
      continue;
    }
    const prevValue = prev[key];
    if (typeof prevValue === "string" && prevValue.length > 0) {
      next[key] = prevValue;
    }
  }
  return next;
}
