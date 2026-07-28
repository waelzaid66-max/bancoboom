import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t("notFound.title") }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppText style={[styles.title, { color: colors.foreground }]}>
          {t("notFound.body")}
        </AppText>

        <Link href="/" style={styles.link}>
          <AppText style={[styles.linkText, { color: colors.primary }]}>
            {t("notFound.home")}
          </AppText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
