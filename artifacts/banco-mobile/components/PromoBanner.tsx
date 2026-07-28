import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { AppText } from "@/components/AppText";
import { Category, CategoryIcon } from "@/components/CategoryTabs";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

// Marketing hero slogans. Each ties to a browseable category so the banner is a
// living entry point, not decoration. Copy lives here (paired with its icon &
// category) rather than i18n because it is presentation content, not UI chrome.
const SLOGANS: {
  en: { t: string; s: string };
  ar: { t: string; s: string };
  cat: Category;
}[] = [
  {
    en: { t: "Your dream home", s: "Verified real estate across Egypt & the Gulf" },
    ar: { t: "منزل أحلامك", s: "عقارات موثّقة في مصر والخليج" },
    cat: "real_estate",
  },
  {
    en: { t: "Your dream car", s: "From trusted dealers — cash or installments" },
    ar: { t: "عربية أحلامك", s: "من تجّار موثوقين — كاش أو تقسيط" },
    cat: "car",
  },
  {
    en: { t: "A factory for your ambition", s: "Machines, land & production lines" },
    ar: { t: "مصنع يدعم طموحك", s: "ماكينات وأراضي وخطوط إنتاج" },
    cat: "facilities",
  },
  {
    en: { t: "Save & buy from the source", s: "Skip the middleman, buy direct" },
    ar: { t: "وفّر واشترى من المنبع", s: "من غير وسطاء، اشترِ مباشرة" },
    cat: "materials",
  },
  {
    en: { t: "Import it yourself", s: "Global supply, delivered to your door" },
    ar: { t: "استورد بنفسك", s: "توريد عالمي يوصلك لباب بيتك" },
    cat: "materials",
  },
];

interface Props {
  onSelectCategory: (c: Category) => void;
  /** Override outer margins (the host screen controls layout/insets). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Red marketing hero banner with auto-rotating slogans. A single shared piece
 * of "ad" chrome so the same banner can live on Home without duplicating the
 * slogan copy or rotation logic across screens.
 */
export function PromoBanner({ onSelectCategory, style }: Props) {
  const colors = useColors();
  const { isRTL } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const textAlign = isRTL ? "right" : "left";

  const [slide, setSlide] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setSlide((i) => (i + 1) % SLOGANS.length),
      4200
    );
    return () => clearInterval(id);
  }, []);

  const slogan = SLOGANS[slide];
  const copy = isRTL ? slogan.ar : slogan.en;

  return (
    <Pressable onPress={() => onSelectCategory(slogan.cat)} style={[styles.wrap, style]}>
      <LinearGradient
        colors={[colors.primary, "#3A0A0D", "#0B0708"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <Image
          source={require("../assets/images/banco-glow.png")}
          style={[styles.bannerGlow, isRTL ? { left: -28 } : { right: -28 }]}
          contentFit="contain"
        />
        <Animated.View
          key={slide}
          entering={FadeIn.duration(500)}
          style={[
            styles.bannerContent,
            { alignItems: isRTL ? "flex-end" : "flex-start" },
          ]}
        >
          <View style={styles.bannerBadge}>
            <CategoryIcon category={slogan.cat} color="#FFFFFF" />
          </View>
          <AppText style={[styles.bannerTitle, { textAlign }]}>{copy.t}</AppText>
          <AppText style={[styles.bannerSub, { textAlign }]}>{copy.s}</AppText>
        </Animated.View>
        <View
          style={[
            styles.dots,
            { flexDirection: rowDir, [isRTL ? "right" : "left"]: 20 },
          ]}
        >
          {SLOGANS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === slide ? 16 : 6,
                  backgroundColor:
                    i === slide ? "#FFFFFF" : "rgba(255,255,255,0.45)",
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  banner: {
    height: 158,
    borderRadius: 22,
    overflow: "hidden",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  bannerGlow: {
    position: "absolute",
    top: -10,
    bottom: -10,
    width: 180,
    opacity: 0.9,
  },
  bannerContent: {
    gap: 6,
  },
  bannerBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bannerTitle: {
    fontSize: 23,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  bannerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    maxWidth: "78%",
  },
  dots: {
    position: "absolute",
    bottom: 14,
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
