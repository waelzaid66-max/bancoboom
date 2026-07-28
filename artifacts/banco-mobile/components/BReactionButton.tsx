import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Ionicons } from "@/components/icons";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";

/**
 * The identity "B" (lightning bolt) cropped from the OFFICIAL transparent
 * B-OOM wordmark — the exact logo pixels, never redrawn, never simplified.
 * B = Banco; OOM = Owners Opportunity Market. The glyph itself is a static,
 * crisp asset (deliberately NOT animated — zero UI/scroll lag).
 */
const LOGO = require("@/assets/images/boom-logo.png");
const LOGO_RATIO = 2045 / 769; // full wordmark width / height
const B_START = 0.05; // where the B begins (fraction of wordmark width)
const B_END = 0.3; // where the B ends (including the bolt tail)

export function BGlyph({
  height = 24,
  tintColor,
}: {
  height?: number;
  /**
   * Optional single-colour tint. Used ONLY by the reaction button to signal
   * state (white = idle, red = saved). Left undefined everywhere else (e.g. the
   * tab bar) so the original multi-tone logo pixels render untouched.
   */
  tintColor?: string;
}) {
  const imgW = height * LOGO_RATIO;
  const width = imgW * (B_END - B_START);
  return (
    <View style={{ width, height, overflow: "hidden" }}>
      <Image
        source={LOGO}
        tintColor={tintColor}
        style={{
          position: "absolute",
          left: -imgW * B_START,
          top: 0,
          width: imgW,
          height,
        }}
        contentFit="contain"
      />
    </View>
  );
}

export type BReaction = "like" | "interested" | "angry";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const CHIP_SIZE = 34;
const CHIP_GAP = 8;
const AUTO_CLOSE_MS = 3500;

/**
 * B-OOM reaction button — the identity "B" replaces the like/heart.
 *
 *  - TAP: the primary action (save/like) — same contract as the old heart.
 *  - LONG-PRESS: the B stays anchored and three reactions spring out of it
 *    (اعجبني / مهتم / اغضبني) — Facebook/Instagram flow, premium metallic
 *    red/dark styling, GPU-only transforms (opacity/translate/scale via
 *    Reanimated springs) so no frames drop and the B itself never animates.
 *
 * Chips expand horizontally INSIDE the card bounds (no overlay/portal), so
 * nothing can clip or cover the navigation.
 */
export function BReactionButton({
  saved,
  likeIcon,
  onLike,
  onInterested,
  onAngry,
  height = 24,
  testID,
}: {
  saved: boolean;
  /** Section-aware glyph for the "like" chip (car / key / factory / heart). */
  likeIcon: IoniconName;
  onLike: () => void;
  onInterested: () => void;
  onAngry: () => void;
  height?: number;
  testID?: string;
}) {
  const colors = useColors();
  const { isRTL } = useI18n();
  // StayCard parks this control on the physical left in RTL — fan chips inward
  // (positive X) so the menu stays on-card instead of clipping off-screen.
  const fanSign = isRTL ? 1 : -1;
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const close = useCallback(() => {
    clearTimer();
    progress.value = withTiming(0, { duration: 130 });
    setOpen(false);
  }, [progress]);

  const openMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOpen(true);
    progress.value = withSpring(1, { damping: 14, stiffness: 190, mass: 0.6 });
    clearTimer();
    closeTimer.current = setTimeout(close, AUTO_CLOSE_MS);
  }, [close, progress]);

  useEffect(() => clearTimer, []);

  const chips: {
    key: BReaction;
    icon: IoniconName;
    color: string;
    onPress: () => void;
  }[] = [
    { key: "like", icon: likeIcon, color: colors.primary, onPress: onLike },
    // Metallic silver — the deliberate "I'm interested" signal.
    { key: "interested", icon: "star", color: "#C9CCD1", onPress: onInterested },
    // Dark metal red — the deliberate "not for me" signal.
    { key: "angry", icon: "thumbs-down", color: "#B3122F", onPress: onAngry },
  ];

  // One spring drives all chips (single GPU timeline). Direction follows layout:
  // LTR → fan left (over card); RTL → fan right (over card when B is left-edge).
  // Three explicit hook calls (fixed order — React Compiler friendly).
  const chipStyle0 = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: fanSign * 1 * (CHIP_SIZE + CHIP_GAP) * progress.value },
      { scale: 0.4 + 0.6 * progress.value },
    ],
  }));
  const chipStyle1 = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: fanSign * 2 * (CHIP_SIZE + CHIP_GAP) * progress.value },
      { scale: 0.4 + 0.6 * progress.value },
    ],
  }));
  const chipStyle2 = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: fanSign * 3 * (CHIP_SIZE + CHIP_GAP) * progress.value },
      { scale: 0.4 + 0.6 * progress.value },
    ],
  }));
  const chipStyles = [chipStyle0, chipStyle1, chipStyle2];

  const pick = (chip: (typeof chips)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    chip.onPress();
    close();
  };

  return (
    <View style={styles.wrap}>
      {chips.map((chip, i) => (
        <Animated.View
          key={chip.key}
          pointerEvents={open ? "auto" : "none"}
          style={[
            styles.chipHolder,
            isRTL ? styles.chipHolderStart : styles.chipHolderEnd,
            chipStyles[i],
          ]}
        >

          <Pressable
            onPress={() => pick(chip)}
            style={[
              styles.chip,
              { backgroundColor: "rgba(12,12,12,0.92)", borderColor: chip.color },
            ]}
            testID={`${testID ?? "breact"}-${chip.key}`}
          >
            <Ionicons name={chip.icon} size={17} color={chip.color} />
          </Pressable>
        </Animated.View>
      ))}

      <Pressable
        onPress={() => (open ? close() : onLike())}
        onLongPress={openMenu}
        delayLongPress={320}
        hitSlop={8}
        style={styles.bBtn}
        testID={testID}
      >
        {/* The B IS the state: red (primary) when saved, white when idle — the
            same fill/idle contract as every other action icon on the card. */}
        <BGlyph height={height} tintColor={saved ? colors.primary : "#FFFFFF"} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  bBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  chipHolder: {
    position: "absolute",
  },
  chipHolderEnd: {
    right: 0,
  },
  chipHolderStart: {
    left: 0,
  },
  chip: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
