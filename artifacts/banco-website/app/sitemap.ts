import type { MetadataRoute } from "next";
import { GOLDEN_HUB_QUERIES } from "@workspace/search-contract";
import { HUB_DEFINITIONS, localizeSearchHref } from "../lib/hub-config";
import { getSiteUrl } from "../lib/site-env";

function hubSearchPaths(): string[] {
  const paths: string[] = [];
  for (const hub of Object.values(HUB_DEFINITIONS)) {
    for (const link of hub.ar.links) {
      paths.push(link.href);
      paths.push(localizeSearchHref(link.href, "en"));
    }
    paths.push(hub.ar.searchHref);
    paths.push(localizeSearchHref(hub.ar.searchHref, "en"));
  }
  return paths;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();

  const staticHubs = [
    "/",
    "/cars",
    "/real-estate",
    "/industrial",
    "/search",
    "/directory",
    "/en",
    "/en/cars",
    "/en/real-estate",
    "/en/industrial",
    "/en/search",
    "/en/directory",
  ];
  const searchHubs = GOLDEN_HUB_QUERIES.map((entry) => `/search?${entry.query}`);
  const enSearchHubs = GOLDEN_HUB_QUERIES.map(
    (entry) => `/en/search?${entry.query}`,
  );

  const paths = [
    ...new Set([...staticHubs, ...searchHubs, ...enSearchHubs, ...hubSearchPaths()]),
  ];

  return paths.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path.includes("/search") ? "daily" : "weekly",
    priority: path === "/" || path === "/en" ? 1 : path.includes("/search") ? 0.9 : 0.8,
  }));
}
