/**
 * Location taxonomy — now sourced from the shared @workspace/taxonomy package so
 * the mobile app, dealer-os and the api-server seed all share ONE definition and
 * can never drift. This file is kept as a thin re-export so every existing
 * `@/constants/locations` import keeps working unchanged.
 *
 * Edit the data in `lib/taxonomy/src/locations.ts`, not here.
 */
export * from "@workspace/taxonomy/locations";
