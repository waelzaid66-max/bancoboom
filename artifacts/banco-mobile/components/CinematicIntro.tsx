import { BancoLogo } from "@/components/BancoLogo";
import React, { useEffect } from "react";
import { Dimensions, Platform, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const STROKE = "#E8002D";
const GLOW = "#FF1744";

// Generous dash lengths so the full stroke is covered during the draw-on.
const LEN = 1400;

// Abstract line-art mapping to the three real categories:
//  - skyline  -> real_estate
//  - car      -> car
//  - crane    -> industrial
const SKYLINE =
  "M16 196 L16 116 L50 116 L50 148 L84 148 L84 80 L118 80 L118 130 L150 130 L150 60 L184 60 L184 196";
const CRANE =
  "M212 44 L212 196 M212 44 L300 44 M212 60 L292 44 M300 44 L300 64 M236 44 L236 58";
const CAR =
  "M196 188 C204 188 208 178 220 176 L240 174 C248 162 262 158 276 158 C292 158 302 166 308 176 L320 178";
const HORIZON = "M8 196 L332 196";

type Props = { onDone: () => void };

export function CinematicIntro({ onDone }: Props) {
  const { width, height } = Dimensions.get("window");

  const horizon = useSharedValue(0);
  const skyline = useSharedValue(0);
  const crane = useSharedValue(0);
  const car = useSharedValue(0);
  const glow = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const container = useSharedValue(1);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);

    horizon.value = withTiming(1, { duration: 420, easing: ease });
    skyline.value = withDelay(80, withTiming(1, { duration: 760, easing: ease }));
    crane.value = withDelay(240, withTiming(1, { duration: 720, easing: ease }));
    car.value = withDelay(360, withTiming(1, { duration: 740, easing: ease }));

    glow.value = withDelay(
      200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.35, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );

    logoOpacity.value = withDelay(560, withTiming(1, { duration: 520, easing: ease }));
    logoScale.value = withDelay(
      560,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) }),
    );

    container.value = withDelay(
      1200,
      withTiming(0, { duration: 360, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );

    // Safety net: the reanimated completion callback above is unreliable on web
    // (JS-based animation). Guarantee the splash always dismisses so the app is
    // never stuck on the black intro screen. Kept just past the scripted
    // dismiss (~1.56s) so it only fires if the animation callback never runs.
    const fallback = setTimeout(() => onDone(), 1700);
    return () => clearTimeout(fallback);
  }, []);

  const containerStyle = useAnimatedStyle(() => ({ opacity: container.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const horizonProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - horizon.value),
  }));
  const skylineProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - skyline.value),
  }));
  const craneProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - crane.value),
  }));
  const carProps = useAnimatedProps(() => ({
    strokeDashoffset: LEN * (1 - car.value),
  }));
  const wheelProps = useAnimatedProps(() => ({
    opacity: car.value < 0.7 ? 0 : (car.value - 0.7) / 0.3,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.12 + glow.value * 0.22 }));

  const svgW = Math.min(width * 0.82, 360);
  const svgH = (svgW * 220) / 340;

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, containerStyle]}
      pointerEvents="none"
    >
      <View style={styles.art}>
        {/* Soft radial-ish glow behind the art */}
        <Animated.View
          style={[
            styles.glowBlob,
            { width: svgW * 1.1, height: svgW * 1.1, borderRadius: svgW },
            glowStyle,
          ]}
        />
        <Svg width={svgW} height={svgH} viewBox="0 0 340 220">
          {/* Glow pass: thick, low-opacity strokes underneath */}
          <AnimatedPath
            d={HORIZON}
            stroke={GLOW}
            strokeWidth={6}
            strokeOpacity={0.18}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={horizonProps}
          />
          <AnimatedPath
            d={SKYLINE}
            stroke={GLOW}
            strokeWidth={6}
            strokeOpacity={0.18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={skylineProps}
          />
          <AnimatedPath
            d={CRANE}
            stroke={GLOW}
            strokeWidth={6}
            strokeOpacity={0.18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={craneProps}
          />
          <AnimatedPath
            d={CAR}
            stroke={GLOW}
            strokeWidth={6}
            strokeOpacity={0.18}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={carProps}
          />

          {/* Crisp pass */}
          <AnimatedPath
            d={HORIZON}
            stroke={STROKE}
            strokeWidth={1.5}
            strokeOpacity={0.55}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={horizonProps}
          />
          <AnimatedPath
            d={SKYLINE}
            stroke={STROKE}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={skylineProps}
          />
          <AnimatedPath
            d={CRANE}
            stroke={STROKE}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={craneProps}
          />
          <AnimatedPath
            d={CAR}
            stroke={STROKE}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={LEN}
            animatedProps={carProps}
          />
          <AnimatedCircle
            cx={228}
            cy={190}
            r={7}
            stroke={STROKE}
            strokeWidth={2}
            fill="none"
            animatedProps={wheelProps}
          />
          <AnimatedCircle
            cx={296}
            cy={190}
            r={7}
            stroke={STROKE}
            strokeWidth={2}
            fill="none"
            animatedProps={wheelProps}
          />
        </Svg>
      </View>

      <Animated.View style={[styles.logoWrap, logoStyle]}>
        <BancoLogo height={40} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    ...(Platform.OS === "web" ? { position: "fixed" as "absolute" } : null),
  },
  art: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  glowBlob: {
    position: "absolute",
    backgroundColor: GLOW,
    opacity: 0.15,
  },
  logoWrap: {
    position: "absolute",
    bottom: "34%",
    alignItems: "center",
    justifyContent: "center",
  },
});
