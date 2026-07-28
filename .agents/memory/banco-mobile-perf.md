---
name: BANCO mobile perf patterns
description: FlatList and memoization patterns that prevent scroll lag in banco-mobile
---

## FlatList — always set these props
Without these, RN renders the entire list upfront (default windowSize=21 = 21 viewport heights worth of content):
```tsx
windowSize={5}
maxToRenderPerBatch={6-10}
initialNumToRender={6-10}
removeClippedSubviews
```

Applied to: saved.tsx, messages.tsx, notifications.tsx, mine.tsx, listing/[id].tsx (horizontal similar).

## Sort in render — move to useMemo
```tsx
// WRONG — re-sorts on every render
data={[...items].sort((a, b) => b.savedAt - a.savedAt)}

// RIGHT
const sortedItems = useMemo(
  () => [...items].sort((a, b) => b.savedAt - a.savedAt),
  [items]
);
data={sortedItems}
```

## Handlers passed as props — wrap in useCallback
Any function passed to a TextInput's `onChangeText`, a FlatList's `renderItem`, or a child component's prop should be wrapped in `useCallback` with correct deps. Without it, the child re-renders on every keystroke/state change.

Critical: search.tsx handlers (`handleQueryChange`, `commitQueryNow`, `clearQuery`, `selectCategory`, `handleSuggestionTap`) each trigger re-renders on every keystroke otherwise.

## Image caching — always set
```tsx
<Image cachePolicy="memory-disk" ... />
```
Default is memory-only. `memory-disk` persists across app restarts. Apply to all feed card images (SmartAssetCard) and conversation thumbnails.

## CORRECTION (Jul 2026): profile.tsx menuItems useMemo CRASHED the screen
The menuItems useMemo was added INSIDE the `if (user)` branch of ProfileScreen → conditional hook → "Rendered more hooks than during the previous render" crash the moment a signed-in user opened Profile (blocked account creation flow end-to-end on device). Reverted to a plain array. Rule: ProfileScreen has huge conditional early-return branches — NEVER add hooks below line ~600; memoize only at the very top or in child components.
