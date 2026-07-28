import { useState } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/AppText";
import { useColors } from "@/hooks/useColors";

/**
 * A professional, Facebook-/WhatsApp-style emoji picker — a categorised grid with
 * a category tab strip, no native emoji-keyboard dependency and no third-party
 * package. Purely additive and self-contained: it renders a fixed-height panel
 * and calls onSelect(emoji) so the composer just appends to the draft. Themed via
 * the app's colour tokens and RTL-aware. The sets are curated to widely-supported
 * glyphs so they render consistently on Android + iOS.
 */

type Category = { key: string; tab: string; emojis: string[] };

const CATEGORIES: Category[] = [
  {
    key: "smileys",
    tab: "😀",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌",
      "😍", "🥰", "😘", "😗", "😋", "😛", "😜", "🤪", "🤗", "🤩",
      "🤔", "🤨", "😐", "😑", "😶", "🙄", "😏", "😴", "😪", "😵",
      "🥳", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲",
      "😳", "🥺", "😦", "😧", "😨", "😰", "😢", "😭", "😱", "😖",
      "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "🤬", "😈",
    ],
  },
  {
    key: "gestures",
    tab: "👍",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "👈",
      "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙",
      "💪", "🙏", "🤝", "👏", "🙌", "👐", "🤲", "🫶", "✍️", "💅",
    ],
  },
  {
    key: "hearts",
    tab: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥",
      "💯", "🔥", "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🥂", "🎁",
    ],
  },
  {
    key: "animals",
    tab: "🐶",
    emojis: [
      "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯",
      "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🦅", "🦉",
      "🐴", "🦄", "🐝", "🦋", "🐢", "🐍", "🐙", "🐠", "🐬", "🐳",
    ],
  },
  {
    key: "food",
    tab: "🍔",
    emojis: [
      "🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐",
      "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🥑", "🌽", "🥕",
      "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🍜", "🍣", "🍦",
      "🍩", "🍪", "🎂", "🍫", "🍬", "☕", "🍵", "🥤", "🍺", "🍷",
    ],
  },
  {
    key: "activities",
    tab: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸",
      "🥅", "🏒", "🏑", "🏏", "⛳", "🎯", "🎮", "🎲", "🎰", "🧩",
      "🎸", "🎹", "🎺", "🎻", "🥁", "🎤", "🎧", "🎬", "🏆", "🏅",
    ],
  },
  {
    key: "travel",
    tab: "🚗",
    emojis: [
      "🚗", "🚕", "🚙", "🚌", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻",
      "🚚", "🚛", "🏍️", "🛵", "🚲", "✈️", "🚀", "🚁", "⛵", "🚤",
      "🏠", "🏡", "🏢", "🏗️", "🏭", "🏬", "🗺️", "📍", "🧭", "⛽",
    ],
  },
  {
    key: "objects",
    tab: "💡",
    emojis: [
      "💰", "💵", "💳", "💎", "⚖️", "🔑", "🔒", "📱", "💻", "⌨️",
      "🖥️", "🖨️", "📷", "📹", "🔋", "💡", "🔦", "📚", "📝", "✏️",
      "📌", "📎", "✅", "❌", "❓", "❗", "⚠️", "🔔", "📢", "🕐",
    ],
  },
];

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const colors = useColors();
  const [active, setActive] = useState(0);

  const pick = (e: string) => {
    Haptics.selectionAsync();
    onSelect(e);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      testID="emoji-picker"
    >
      <ScrollView
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {CATEGORIES[active].emojis.map((e, i) => (
          <Pressable
            key={`${e}-${i}`}
            onPress={() => pick(e)}
            style={styles.cell}
            testID={`emoji-${e}`}
            hitSlop={2}
          >
            <AppText style={styles.emoji}>{e}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.tabs, { borderTopColor: colors.border }]}>
        {CATEGORIES.map((c, i) => {
          const on = i === active;
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                Haptics.selectionAsync();
                setActive(i);
              }}
              style={[styles.tab, on && { backgroundColor: colors.secondary, borderRadius: colors.radius }]}
              testID={`emoji-cat-${c.key}`}
            >
              <AppText style={[styles.tabEmoji, { opacity: on ? 1 : 0.55 }]}>{c.tab}</AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { height: 264, borderTopWidth: StyleSheet.hairlineWidth },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cell: {
    width: `${100 / 8}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 26 },
  tabs: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: "space-between",
  },
  tab: { flex: 1, alignItems: "center", paddingVertical: 6, marginHorizontal: 1 },
  tabEmoji: { fontSize: 20 },
});
