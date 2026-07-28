import { Feather, MaterialCommunityIcons } from "@/components/icons";
import { GetFeedCategory } from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import React, { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

/**
 * Browse-category taxonomy now lives in @workspace/taxonomy (single source of
 * truth, shared with the data layer and the other surfaces). Imported for local
 * use in this component AND re-exported so every existing `@/components/CategoryTabs`
 * import (facets.ts, searchParams.ts, screens) keeps working unchanged.
 */
import {
  type Category,
  type IndustrialSubtype,
  type IndustrialType,
  CATEGORY_KEYS,
} from "@workspace/taxonomy/categories";
export * from "@workspace/taxonomy/categories";

/** Light illustrative glyph per browse category, used in tabs & search chips. */
const CATEGORY_ICON: Record<
  Category,
  { lib: "feather" | "mci"; name: string }
> = {
  all: { lib: "feather", name: "grid" },
  car: { lib: "mci", name: "car" },
  real_estate: { lib: "feather", name: "home" },
  facilities: { lib: "mci", name: "factory" },
  materials: { lib: "mci", name: "cog" },
};

export function CategoryIcon({
  category,
  size = 14,
  color,
}: {
  category: Category;
  size?: number;
  color: string;
}) {
  const def = CATEGORY_ICON[category];
  if (!def) return null;
  return def.lib === "mci" ? (
    <MaterialCommunityIcons name={def.name as never} size={size} color={color} />
  ) : (
    <Feather name={def.name as never} size={size} color={color} />
  );
}

interface CategoryTabsProps {
  selected: Category;
  onChange: (cat: Category) => void;
  /**
   * Optional pre-filtered set of categories to show (data-presence gating). The
   * selected category is always kept visible even if absent, so the active tab
   * never vanishes mid-browse. Defaults to all categories.
   */
  visible?: Category[];
}

export function CategoryTabs({ selected, onChange, visible }: CategoryTabsProps) {
  const colors = useColors();
  const { t } = useI18n();
  const scrollRef = useRef<ScrollView>(null);

  // Primary browse bar is fixed "furniture": the category order stays physically
  // stable across languages (no RTL reversal). Labels still render in Arabic.
  const categories = visible
    ? CATEGORY_KEYS.filter((c) => visible.includes(c.key) || c.key === selected)
    : CATEGORY_KEYS;

  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {categories.map((cat) => {
          const isActive = selected === cat.key;
          return (
            <Pressable
              key={cat.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(cat.key);
              }}
              style={[
                styles.pill,
                {
                  backgroundColor: isActive ? colors.primary : colors.secondary,
                  borderRadius: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                },
              ]}
              testID={`category-tab-${cat.key}`}
            >
              <CategoryIcon
                category={cat.key}
                color={
                  isActive ? colors.primaryForeground : colors.mutedForeground
                }
              />
              <AppText
                style={[
                  styles.label,
                  {
                    color: isActive
                      ? colors.primaryForeground
                      : colors.mutedForeground,
                    fontFamily: isActive
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  },
                ]}
              >
                {t(cat.i18nKey)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface PillItem {
  key: string;
  i18nKey: string;
}

/**
 * Shared horizontal "pill" chip row. Backs both the industrial sub-type bar and
 * the per-section engine bar (cars / real-estate filters) so every section's
 * filter row shares one visual + RTL implementation.
 */
function PillChips({
  items,
  selectedKey,
  onChange,
  testIdPrefix,
}: {
  items: PillItem[];
  selectedKey: string;
  onChange: (key: string) => void;
  testIdPrefix: string;
}) {
  const colors = useColors();
  const { t, isRTL } = useI18n();
  const ordered = isRTL ? [...items].reverse() : items;

  return (
    <View
      style={[
        styles.subWrapper,
        {
          borderBottomColor: colors.border,
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.container, isRTL && styles.containerRTL]}
      >
        {ordered.map((it) => {
          const isActive = selectedKey === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(it.key);
              }}
              style={[
                styles.subPill,
                {
                  backgroundColor: isActive
                    ? colors.primary + "1A"
                    : "transparent",
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
              testID={`${testIdPrefix}-${it.key}`}
            >
              <AppText
                style={[
                  styles.subLabel,
                  {
                    color: isActive ? colors.primary : colors.mutedForeground,
                    fontFamily: isActive
                      ? "Inter_600SemiBold"
                      : "Inter_400Regular",
                  },
                ]}
              >
                {t(it.i18nKey)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface IndustrialSubChipsProps {
  /** The group's concrete sub-types; an "all" chip is prepended automatically. */
  types: IndustrialSubtype[];
  selected: IndustrialType;
  onChange: (type: IndustrialType) => void;
}

export function IndustrialSubChips({
  types,
  selected,
  onChange,
}: IndustrialSubChipsProps) {
  const items: PillItem[] = [
    { key: "all", i18nKey: "home.industrialTypes.all" },
    ...types.map((ty) => ({ key: ty, i18nKey: `home.industrialTypes.${ty}` })),
  ];
  return (
    <PillChips
      items={items}
      selectedKey={selected}
      onChange={(key) => onChange(key as IndustrialType)}
      testIdPrefix="industrial-type"
    />
  );
}

interface EngineChipsProps {
  /** Engine defs for the active section (each {key,i18nKey}); extra fields ignored. */
  engines: PillItem[];
  selected: string;
  onChange: (key: string) => void;
}

/**
 * Per-section filter bar for cars / real-estate. Each chip maps to a real
 * backend filter param (see constants/engines.ts); selecting one re-queries the
 * feed/search with that param, so results are always real — never fabricated.
 */
export function EngineChips({ engines, selected, onChange }: EngineChipsProps) {
  return (
    <PillChips
      items={engines}
      selectedKey={selected}
      onChange={onChange}
      testIdPrefix="engine"
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  subWrapper: {
    borderBottomWidth: 1,
  },
  subPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  subLabel: {
    fontSize: 12.5,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  containerRTL: {
    flexDirection: "row-reverse",
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  label: {
    fontSize: 13,
  },
});
