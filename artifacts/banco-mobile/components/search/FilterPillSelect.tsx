/**
 * FilterPillSelect — a FilterPill plus the small modal list it opens.
 *
 * Extracted from Stay's rental-term control, which pairs exactly this trigger
 * with exactly this list and was the only place in the app that did it. Its
 * modal metrics are carried over unchanged (backdrop rgba(0,0,0,.55), sheet
 * maxWidth 400 / radius 16, rows 20/14 with a hairline divider and a check on
 * the active row).
 *
 * Why a pill instead of a chip row — measured, not preferred:
 * the cars strip held 999px of chips inside a 375px window, so 624px of the
 * user's own segmentation sat off the right edge. Wrapping made all of it
 * visible but produced four rows, 163px — a fifth of the screen — of chips
 * before the first car, with two adjacent "All" chips from two different axes
 * reading as one confusing wall. Stay had already answered this: it does not
 * spread its rental terms, it collapses them into "All types ⌄". Two pills
 * replace nine chips, show the CURRENT VALUE, and give the screen back to the
 * inventory — which is what the section is for.
 *
 * The cost is one tap to change a value. That is the right trade for an axis
 * the user sets occasionally; it would be the wrong trade for one they toggle
 * constantly, which is why the section's own type strips stay as chips.
 */
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Feather } from "@/components/icons";
import { FilterPill } from "@/components/search/FilterPill";
import { useColors } from "@/hooks/useColors";
import { useI18n } from "@/context/LanguageContext";

export type PillOption = {
  value: string;
  label: string;
};

export function FilterPillSelect({
  icon,
  title,
  options,
  selected,
  /** Label shown when nothing narrows the axis (e.g. "All"). */
  allLabel,
  /** The value that means "no narrowing"; selecting it clears the axis. */
  allValue,
  onSelect,
  accentColor,
  testID,
}: {
  icon?: React.ComponentProps<typeof FilterPill>["icon"];
  /** Heading of the modal — the axis name, since the pill itself shows the value. */
  title: string;
  options: PillOption[];
  selected: string;
  allLabel: string;
  allValue: string;
  onSelect: (value: string) => void;
  accentColor?: string;
  testID?: string;
}) {
  const [open, setOpen] = useState(false);
  const colors = useColors();
  const { isRTL } = useI18n();
  const rowDir = isRTL ? "row-reverse" : "row";
  const accent = accentColor ?? colors.primary;

  const isAll = selected === allValue;
  const current = options.find((o) => o.value === selected);
  // The pill reads the VALUE, not the axis name — that is the whole point.
  const label = isAll ? allLabel : (current?.label ?? allLabel);

  const choose = (value: string) => {
    onSelect(value);
    setOpen(false);
  };

  const rows: PillOption[] = [{ value: allValue, label: allLabel }, ...options];

  return (
    <>
      <FilterPill
        icon={icon}
        label={label}
        active={!isAll}
        accentColor={accent}
        onPress={() => setOpen(true)}
        testID={testID}
        accessibilityLabel={`${title}: ${label}`}
      />

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <AppText
              style={[
                styles.title,
                { color: colors.foreground, borderBottomColor: colors.border },
              ]}
            >
              {title}
            </AppText>
            {rows.map((o) => {
              const active = o.value === selected;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => choose(o.value)}
                  style={[
                    styles.row,
                    { flexDirection: rowDir, borderBottomColor: colors.border },
                    active ? { backgroundColor: `${accent}1A` } : null,
                  ]}
                  testID={testID ? `${testID}-opt-${o.value}` : undefined}
                >
                  <AppText style={[styles.rowText, { color: colors.foreground }]}>
                    {o.label}
                  </AppText>
                  {active ? <Feather name="check" size={15} color={accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Stay's picker metrics, carried over unchanged.
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  title: {
    fontSize: 15,
    fontFamily: "Cairo_700Bold",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
});
