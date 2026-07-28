import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
} from "@expo-google-fonts/cairo";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { CinematicIntro } from "@/components/CinematicIntro";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { logClientCrash, installGlobalCrashHandler } from "@/lib/crashLog";
import { BiometricProvider } from "@/context/BiometricContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { SessionProvider } from "@/context/SessionContext";
import { AuthGateProvider } from "@/hooks/useAuthGate";
import { ThemeProvider } from "@/context/ThemeContext";
import { SoundProvider } from "@/context/SoundContext";
import { PushNotificationsBridge } from "@/hooks/usePushNotifications";

{
  const explicitBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.replace(/^https?:\/\//, "").replace(
    /\/+$/,
    "",
  );
  if (explicitBase) {
    setBaseUrl(explicitBase);
  } else if (domain) {
    setBaseUrl(`https://${domain}`);
  } else if (typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(
      "[BANCO] API base unset (EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_DOMAIN). " +
        "Relative /api calls only work behind a same-origin proxy.",
    );
  } else {
    console.error(
      "[BANCO] FATAL: production build missing EXPO_PUBLIC_API_BASE_URL or EXPO_PUBLIC_DOMAIN — " +
        "network calls will fail silently as relative /api paths.",
    );
  }
}

// Capture uncaught global JS errors (in addition to React render crashes caught
// by the ErrorBoundary below) so no crash goes unseen. Preserves the default
// red-box/crash behavior — adds logging only.
installGlobalCrashHandler();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

// Renders the app once Clerk initializes — or after a short timeout if it
// can't (unauthorized origin, blocked CDN, network failure). Without this,
// <ClerkLoaded> kept the ENTIRE app on an infinite white screen whenever
// clerk-js failed to init. Timed-out sessions behave as signed-out guests;
// auth state hydrates automatically if Clerk finishes loading later.
const CLERK_LOAD_TIMEOUT_MS = 2500;
function ClerkLoadGate({
  children,
  waitExpired,
}: {
  children: React.ReactNode;
  waitExpired: boolean;
}) {
  const { isLoaded } = useAuth();
  useEffect(() => {
    if (waitExpired && !isLoaded) {
      console.error(
        "[BANCO] Clerk did not initialize in time (origin not authorized for this Clerk instance, or clerk-js blocked). Rendering app as signed-out.",
      );
    }
  }, [waitExpired, isLoaded]);
  if (!isLoaded && !waitExpired) return null;
  return <>{children}</>;
}

function AuthTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    // getToken can reject while clerk-js is still initializing (or failed to
    // init). API calls must degrade to anonymous, never crash the request.
    setAuthTokenGetter(() => getToken().catch(() => null));
  }, [getToken]);
  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="listing/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="search-results"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      {/* Section mini-apps — Discover cards router.push here. Must stay
          registered or section routes 404 and the Search tab melts again. */}
      <Stack.Screen
        name="section/car"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="section/real-estate"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="section/factories"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="section/materials"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="section/booking"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="legal/privacy"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="legal/terms"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="listings/mine"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="listings/create"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="listings/edit/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="rentals/hub"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/onboarding"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="business/requests"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/supply-hub"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/investments/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/investments/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/investments/create"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="business/suppliers/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/company/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/global-supply/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/global-supply/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="business/global-supply/create"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="business/market/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="billing"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="wallet"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="invoices"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="invoices/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="plans"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="messages/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="bookings"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="import-tracking"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="rfq/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="rfq/[id]"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
      <Stack.Screen
        name="rfq/create"
        options={{ headerShown: false, animation: "slide_from_bottom" }}
      />
      <Stack.Screen
        name="industry/index"
        options={{ headerShown: false, animation: "slide_from_right" }}
      />
    </Stack>
  );
}

function shouldSkipIntro(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("noIntro") === "1") return true;
    return window.sessionStorage.getItem("banco_intro_seen") === "1";
  } catch {
    return false;
  }
}

// Fonts must enhance, not block: if font loading neither resolves nor errors
// (seen hanging forever on web), render with system fonts after this window.
const FONT_WAIT_MS = 2000;

export default function RootLayout() {
  const [introDone, setIntroDone] = useState(shouldSkipIntro());
  const [fontWaitExpired, setFontWaitExpired] = useState(false);
  // Runs from first mount (in parallel with the font wait, not after it) so a
  // Clerk that can't load never adds its timeout on top of the font timeout.
  const [clerkWaitExpired, setClerkWaitExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setClerkWaitExpired(true), CLERK_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    // NOTE: no icon fonts here. Icons are SVG (lucide-react-native, see
    // components/icons.tsx) precisely so there is no font to register and thus
    // no Android app-wide ".notdef"/tofu icon bug. Only the text fonts load.
  });

  useEffect(() => {
    const t = setTimeout(() => setFontWaitExpired(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (fontError) {
      // Surface text-font (Inter/Cairo) load failures loudly. Icons are SVG
      // (see components/icons.tsx) so they are unaffected by font loading.
      console.error("[BANCO] Text fonts failed to load:", fontError);
    }
    if (fontWaitExpired && !fontsLoaded && !fontError) {
      console.error(
        "[BANCO] Fonts still pending after " +
          FONT_WAIT_MS +
          "ms — rendering with system fonts (Inter/Cairo will apply if they finish loading).",
      );
    }
    if (fontsLoaded || fontError || fontWaitExpired) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, fontWaitExpired]);

  if (!fontsLoaded && !fontError && !fontWaitExpired) return null;

  // ErrorBoundary wraps Clerk so a missing/invalid publishable key or provider
  // boot crash still surfaces the recovery UI instead of a white screen.
  return (
    <SafeAreaProvider>
      <ErrorBoundary
        onError={(error, componentStack) =>
          logClientCrash(error, { kind: "reactRender", componentStack })
        }
      >
        <ClerkProvider
          publishableKey={publishableKey}
          tokenCache={tokenCache}
          proxyUrl={proxyUrl}
        >
          <ClerkLoadGate waitExpired={clerkWaitExpired}>
            <QueryClientProvider client={queryClient}>
              <AuthTokenBridge />
              <ThemeProvider>
                <LanguageProvider>
                  <AuthGateProvider>
                    <SessionProvider>
                      <BiometricProvider>
                        <SoundProvider>
                          <PushNotificationsBridge />
                          <GestureHandlerRootView style={{ flex: 1 }}>
                            <KeyboardProvider>
                              <RootLayoutNav />
                            </KeyboardProvider>
                            {!introDone && (
                              <CinematicIntro
                                onDone={() => {
                                  setIntroDone(true);
                                  if (
                                    Platform.OS === "web" &&
                                    typeof window !== "undefined"
                                  ) {
                                    try {
                                      window.sessionStorage.setItem(
                                        "banco_intro_seen",
                                        "1",
                                      );
                                    } catch {}
                                  }
                                }}
                              />
                            )}
                          </GestureHandlerRootView>
                        </SoundProvider>
                      </BiometricProvider>
                    </SessionProvider>
                  </AuthGateProvider>
                </LanguageProvider>
              </ThemeProvider>
            </QueryClientProvider>
          </ClerkLoadGate>
        </ClerkProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
