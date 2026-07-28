import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleProp, ImageStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const LOGO = require("../assets/images/banco-logo.png");
const ASPECT = 833 / 209;

/**
 * BANCO wordmark. Morphs in two ways via Reanimated shared values (the same
 * node is re-styled — never remounted):
 *  - `enter`: a one-off reveal on mount (fade + lift).
 *  - `compact`: condenses (scale/fade down) when the feed is scrolled so the
 *    header reads as a tighter bar; expands back when scrolling up.
 */
export function BancoLogo({
  height = 24,
  compact = false,
  style,
}: {
  height?: number;
  compact?: boolean;
  style?: StyleProp<ImageStyle>;
}) {
  const enter = useSharedValue(0);
  const condense = useSharedValue(compact ? 1 : 0);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 420 });
  }, [enter]);

  useEffect(() => {
    condense.value = withTiming(compact ? 1 : 0, { duration: 240 });
  }, [compact, condense]);

  const animatedStyle = useAnimatedStyle(() => ({
    // Opacity must NOT be gated by the mount animation: on Android the entrance
    // `withTiming` can fail to paint the first frame and leave the wordmark
    // stuck at opacity 0 (the "logo disappeared" bug). Drive opacity only from
    // `condense` (always >= 0.9) so the logo is guaranteed visible; keep the
    // entrance as a lift + scale only.
    opacity: 1 - condense.value * 0.1,
    transform: [
      { translateY: (1 - enter.value) * 4 },
      { scale: (0.96 + enter.value * 0.04) * (1 - condense.value * 0.16) },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Image
        source={LOGO}
        style={[{ height, width: height * ASPECT }, style]}
        contentFit="contain"
        transition={0}
      />
    </Animated.View>
  );
}
