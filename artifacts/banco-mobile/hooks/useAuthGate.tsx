import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/AppText";
import { Feather } from "@/components/icons";
import { useI18n } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface AuthGateValue {
  /**
   * Runs `action` when the user is signed in and returns true. For guests it
   * opens the "create account" marketing modal, does NOT run the action, and
   * returns false. This is the single chokepoint that funnels every guest
   * action (open details, save, contact, comment, create...) into sign-up.
   */
  requireAuth: (action?: () => void) => boolean;
}

const AuthGateContext = createContext<AuthGateValue>({
  // Safe default: if the provider is somehow not mounted, degrade to running the
  // action rather than crashing the screen.
  requireAuth: (action) => {
    action?.();
    return true;
  },
});

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (isSignedIn) {
        action?.();
        return true;
      }
      setOpen(true);
      return false;
    },
    [isSignedIn]
  );

  const value = useMemo(() => ({ requireAuth }), [requireAuth]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <AuthGateModal open={open} onClose={() => setOpen(false)} />
    </AuthGateContext.Provider>
  );
}

function AuthGateModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const { t } = useI18n();

  const goToAuth = () => {
    onClose();
    router.push("/(tabs)/profile");
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.card, borderRadius: colors.radius },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: colors.primary + "1A" }]}
          >
            <Feather name="user" size={28} color={colors.primary} />
          </View>
          <AppText style={[styles.title, { color: colors.foreground }]}>
            {t("authGate.title")}
          </AppText>
          <AppText style={[styles.message, { color: colors.mutedForeground }]}>
            {t("authGate.message")}
          </AppText>
          <Pressable
            onPress={goToAuth}
            style={[
              styles.cta,
              { backgroundColor: colors.primary, borderRadius: colors.radius },
            ]}
            testID="authgate-cta"
          >
            <AppText style={[styles.ctaText, { color: colors.primaryForeground }]}>
              {t("authGate.cta")}
            </AppText>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={styles.dismiss}
            testID="authgate-dismiss"
          >
            <AppText
              style={[styles.dismissText, { color: colors.mutedForeground }]}
            >
              {t("authGate.dismiss")}
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function useAuthGate() {
  return useContext(AuthGateContext);
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 380,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginBottom: 22,
  },
  cta: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 6,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  dismiss: {
    paddingVertical: 10,
  },
  dismissText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
});
