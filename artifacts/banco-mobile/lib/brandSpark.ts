import { makeMutable } from "react-native-reanimated";

/**
 * Brand-spark signal — deliberately OUTSIDE React.
 *
 * The header B-OOM mark answers a real user action (a B-reaction on a card, a
 * booking) with one short pop. Routing that through React state (a context
 * counter, a store) would re-render every consumer on every tap — in a feed of
 * hundreds of cards that is a guaranteed jank source, and the animation is not
 * worth a single wasted render anywhere in the tree.
 *
 * So the signal is a module-level Reanimated shared value:
 *   • `pulseSpark()` writes a number — it does NOT re-render anything.
 *   • The header watches it on the UI thread via `useAnimatedReaction`.
 *   • Nothing else in the app is coupled to it; a screen that never imports
 *     this file is completely unaffected.
 *
 * Fire-and-forget by design: if the header is not mounted (any screen other
 * than the feed) the write is simply never observed. No listeners to clean up,
 * no leaks, no ordering requirements.
 */
export const brandSpark = makeMutable(0);

/** Ask the header mark to pop once. Safe to call from anywhere, any thread. */
export function pulseSpark(): void {
  brandSpark.value = brandSpark.value + 1;
}
