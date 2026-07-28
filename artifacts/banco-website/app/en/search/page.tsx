import type { Metadata } from "next";
import { parseSearchCriteriaFromUrl } from "@workspace/search-contract";
import { SearchPageBody } from "../../../components/SearchPageBody";
import { pageMetadata } from "../../../lib/page-metadata";
import { buildSearchMetadata } from "../../../lib/search-metadata";

type SearchPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const resolved = (await searchParams) ?? {};
  const criteria = parseSearchCriteriaFromUrl(resolved);
  const view = resolved.view === "map" ? ("map" as const) : undefined;
  const limit =
    typeof resolved.limit === "string" ? Number(resolved.limit) : undefined;
  const cursor =
    typeof resolved.cursor === "string" ? resolved.cursor : undefined;
  const { title, description, path } = buildSearchMetadata(
    criteria,
    { view, limit, cursor },
    "en",
  );
  return pageMetadata({ title, description, path, locale: "en" });
}

export default async function EnglishSearchPage({ searchParams }: SearchPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <SearchPageBody searchParams={resolvedSearchParams} locale="en" />;
}
