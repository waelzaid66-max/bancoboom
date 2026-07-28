import type { ListingDetailStatus } from "@workspace/api-client-react";

const STATUS_AR: Record<ListingDetailStatus, string> = {
  active: "نشط",
  sold: "مباع",
  archived: "مؤرشف",
};

const STATUS_EN: Record<ListingDetailStatus, string> = {
  active: "Active",
  sold: "Sold",
  archived: "Archived",
};

export function formatListingStatusAr(status: ListingDetailStatus): string {
  return STATUS_AR[status] ?? status;
}

export function formatListingStatusEn(status: ListingDetailStatus): string {
  return STATUS_EN[status] ?? status;
}

export function formatListingStatus(
  status: ListingDetailStatus,
  locale: "ar" | "en",
): string {
  return locale === "en" ? formatListingStatusEn(status) : formatListingStatusAr(status);
}
