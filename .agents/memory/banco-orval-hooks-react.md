---
name: BANCO orval react-query hook conventions
description: How generated @workspace/api-client-react hooks return data and when queryKey is mandatory
---

Conventions for consuming the orval-generated React hooks in any BANCO web/mobile artifact
(@workspace/api-client-react, react-query v5).

## Hooks return the FULL envelope, not the payload
Query/mutation hooks resolve to the API envelope `{ data, error, meta }`, NOT the inner
resource. Always unwrap one level: `const x = hook().data?.data`. Scaffolded pages that read
fields directly off `hook().data` are a recurring bug class — they compile but render
undefined/blank. Same for list endpoints: `resp?.data ?? []`.

## queryKey is REQUIRED whenever you pass query options
The generated option type is plain `UseQueryOptions<...>`, and in react-query v5 that makes
`queryKey` a required field. Calling a hook with NO options is fine (the hook injects the key
internally), but the moment you pass ANY `query` option (e.g. `enabled`, `refetchInterval`)
you must also pass `queryKey`, or typecheck fails with "Property 'queryKey' is missing".
Use the generated helper: `useGetX(id, { query: { queryKey: getGetXQueryKey(id), enabled } })`.

## Mutation call shape
`.mutate({ id, data: {...} }, { onSuccess, onError })`. Invalidate related lists with the
`getGet<Name>QueryKey()` helpers via `useQueryClient().invalidateQueries`.

**Why:** these cost multiple typecheck/iteration cycles on the admin-os build; the envelope
unwrap and the queryKey-required rule are not obvious from the call site.
