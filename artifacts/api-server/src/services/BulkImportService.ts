import { db } from "@workspace/db";
import { listings, listingAttributes, interactions, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { parse } from "csv-parse/sync";
import { normalizeListing } from "./NormalizationService";

interface BatchError {
  batch_index: number;
  rows_in_batch: number;
  message: string;
}

interface ImportResult {
  success_count: number;
  failed_count: number;
  errors: BatchError[];
}

function mapCsvRow(row: Record<string, string>, rowIndex: number): {
  valid: boolean;
  error?: string;
  data?: {
    title: string;
    category: "car" | "real_estate" | "industrial";
    base_price_cash: string;
    location: string;
    specs: Record<string, unknown>;
  };
} {
  const title = row.title || row.Title || row.name || row.Name;
  const price = row.price || row.Price || row.base_price_cash || row.base_price;
  const location = row.location || row.Location || row.city || row.City;
  const category = (row.category || row.Category || row.type || row.Type || "").toLowerCase();

  if (!title) return { valid: false, error: `Row ${rowIndex}: missing title` };
  if (!price || isNaN(Number(price))) return { valid: false, error: `Row ${rowIndex}: missing or invalid price` };
  if (!location) return { valid: false, error: `Row ${rowIndex}: missing location` };

  const validCategories = ["car", "real_estate", "industrial"];
  const mappedCategory =
    validCategories.find((c) => c === category || category.includes(c.replace("_", ""))) ?? "car";

  const excludedKeys = new Set([
    "title", "Title", "price", "Price", "base_price_cash", "base_price",
    "location", "Location", "city", "City", "category", "Category",
    "type", "Type", "name", "Name",
  ]);
  const specs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!excludedKeys.has(key) && value) {
      const numVal = Number(value);
      specs[key] = isNaN(numVal) ? value : numVal;
    }
  }

  if (mappedCategory === "car") {
    if (!specs.mileage) specs.mileage = 0;
    if (!specs.condition) specs.condition = "used";
  } else if (mappedCategory === "real_estate") {
    if (!specs.area) specs.area = 0;
    if (!specs.rooms) specs.rooms = 0;
  } else if (mappedCategory === "industrial") {
    if (!specs.capacity) specs.capacity = "N/A";
  }

  return {
    valid: true,
    data: {
      title,
      category: mappedCategory as "car" | "real_estate" | "industrial",
      base_price_cash: String(Number(price)),
      location,
      specs,
    },
  };
}

export async function bulkImportListings(
  csvInput: string | Buffer,
  dbUserId: string
): Promise<ImportResult> {
  const result: ImportResult = { success_count: 0, failed_count: 0, errors: [] };

  let rows: Record<string, string>[];
  try {
    const input = typeof csvInput === "string" ? csvInput : csvInput.toString("utf-8");
    rows = parse(input, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    throw new Error("Invalid CSV format");
  }

  const [seller] = await db
    .select({ isVerified: users.isVerified })
    .from(users)
    .where(eq(users.id, dbUserId))
    .limit(1);
  const sellerVerified = !!seller?.isVerified;

  const BATCH_SIZE = 100;

  for (let batchIndex = 0; batchIndex < Math.ceil(rows.length / BATCH_SIZE); batchIndex++) {
    const start = batchIndex * BATCH_SIZE;
    const batch = rows.slice(start, start + BATCH_SIZE);

    // Pre-validate all rows in batch — skip entire batch if any row is invalid
    const validationErrors: string[] = [];
    const parsedRows: Array<NonNullable<ReturnType<typeof mapCsvRow>["data"]>> = [];

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = start + j + 2; // 1-indexed, +1 for header
      const parsed = mapCsvRow(batch[j], rowIndex);
      if (!parsed.valid || !parsed.data) {
        validationErrors.push(parsed.error ?? `Row ${rowIndex}: invalid`);
      } else {
        parsedRows.push(parsed.data);
      }
    }

    if (validationErrors.length > 0) {
      result.failed_count += batch.length;
      result.errors.push({
        batch_index: batchIndex,
        rows_in_batch: batch.length,
        message: validationErrors.join("; "),
      });
      continue;
    }

    // Wrap entire batch in a single transaction — all-or-nothing per batch
    try {
      // Normalize each row (lenient: unmatched values warn instead of failing
      // the batch; media is not required for bulk import).
      const normalizedRows = await Promise.all(
        parsedRows.map((data) =>
          normalizeListing(
            {
              title: data.title,
              category: data.category,
              base_price_cash: Number(data.base_price_cash),
              location: data.location,
              specs: data.specs,
              media: [],
            },
            { sellerId: dbUserId, sellerVerified, requireMedia: false, lenient: true }
          )
        )
      );

      await db.transaction(async (tx) => {
        for (let i = 0; i < parsedRows.length; i++) {
          const data = parsedRows[i];
          const normalized = normalizedRows[i];
          const [listing] = await tx
            .insert(listings)
            .values({
              userId: dbUserId,
              title: normalized.title,
              category: data.category,
              basePriceCash: data.base_price_cash,
              location: data.location,
              locationId: normalized.locationId,
              status: "active",
              trustScore: normalized.trustScore,
              isDuplicate: normalized.isDuplicate,
              duplicateOfId: normalized.duplicateOfId,
            })
            .returning({ id: listings.id });

          await tx.insert(listingAttributes).values({
            listingId: listing.id,
            specs: normalized.specs,
            brandId: normalized.taxonomy.brandId,
            modelId: normalized.taxonomy.modelId,
            variantId: normalized.taxonomy.variantId,
            fuelType: normalized.taxonomy.fuelType,
            condition: normalized.taxonomy.condition,
            bodyType: normalized.taxonomy.bodyType,
            transmission: normalized.taxonomy.transmission,
            propertyType: normalized.taxonomy.propertyType,
            finishingType: normalized.taxonomy.finishingType,
            ownershipType: normalized.taxonomy.ownershipType,
            industrialType: normalized.taxonomy.industrialType,
            industry: normalized.taxonomy.industry,
            propertyTypeId: normalized.taxonomy.propertyTypeId,
            finishingTypeId: normalized.taxonomy.finishingTypeId,
            ownershipTypeId: normalized.taxonomy.ownershipTypeId,
            industrialTypeId: normalized.taxonomy.industrialTypeId,
            industryId: normalized.taxonomy.industryId,
          } as typeof listingAttributes.$inferInsert);

          await tx.insert(interactions).values({
            listingId: listing.id,
            views: 0,
            clicks: 0,
          });
        }
      });
      result.success_count += parsedRows.length;
    } catch (err) {
      result.failed_count += batch.length;
      result.errors.push({
        batch_index: batchIndex,
        rows_in_batch: batch.length,
        message: err instanceof Error ? err.message : "Database batch insert failed",
      });
    }
  }

  return result;
}
