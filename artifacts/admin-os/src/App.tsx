import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

import AdminLayout from "./components/layout/admin-layout";
import OverviewPage from "./pages/overview";
import UsersPage from "./pages/users";
import ListingsPage from "./pages/listings";
import ModerationPage from "./pages/moderation";
import ReportsPage from "./pages/reports";
import SupportPage from "./pages/support";
import LeadsPage from "./pages/leads";
import FinancingPage from "./pages/financing";
import AdsPage from "./pages/ads";
import RevenuePage from "./pages/revenue";
import AnalyticsPage from "./pages/analytics";
import FraudPage from "./pages/fraud";
import MonitoringPage from "./pages/monitoring";
import AlertsPage from "./pages/alerts";
import PromoPage from "./pages/promo";
import SettingsPage from "./pages/settings";
import PlansPage from "./pages/plans";
import { LanguageProvider } from "./context/LanguageContext";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/banco-logo.png`,
  },
  variables: {
    colorPrimary: "#E8002D",
    colorBackground: "#0A0A0A",
    colorForeground: "#FFFFFF",
    colorMutedForeground: "#888888",
    colorInput: "#111111",
    colorInputForeground: "#FFFFFF",
    colorNeutral: "#333333",
    colorDanger: "#E8002D",
    fontFamily: "Inter, sans-serif",
    borderRadius: "8px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0A0A0A] border border-white/10 rounded-xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButtonText: "text-white",
    formFieldLabel: "text-gray-300",
    footerActionLink: "text-[#E8002D]",
    footerActionText: "text-gray-400",
    dividerText: "text-gray-500",
    identityPreviewEditButton: "text-[#E8002D]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white",
    logoBox: "",
    logoImage: "",
    socialButtonsBlockButton: "bg-[#111111] hover:bg-[#1A1A1A] border-white/10",
    formButtonPrimary: "bg-[#E8002D] hover:bg-[#CC0028] text-white",
    formFieldInput: "bg-[#111111] border-white/10 text-white placeholder:text-gray-600",
    footerAction: "",
    dividerLine: "bg-white/10",
    alert: "bg-[#111111] border-white/10",
    otpCodeFieldInput: "bg-[#111111] border-white/10 text-white",
    formFieldRow: "",
    main: "",
  },
};

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data: me, isLoading } = useGetMe({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMeQueryKey() },
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8002D]" />
      </div>
    );
  }

  const isAdmin = me?.data?.is_admin === true;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-[#E8002D]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[#E8002D] text-xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
          <p className="text-gray-400 text-sm">
            The BANCO Control Center is available to admin accounts only.
            Your account does not have admin access.
          </p>
        </div>
      </div>
    );
  }

  return <AdminLayout>{children}</AdminLayout>;
}

function Guarded({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <AdminGuard>{children}</AdminGuard>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0A] px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[#0A0A0A] px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/overview" /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "BANCO Control Center", subtitle: "Sign in to your admin account" } },
        signUp: { start: { title: "BANCO Admin", subtitle: "Register for admin access" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/overview" component={() => <Guarded><OverviewPage /></Guarded>} />
          <Route path="/users" component={() => <Guarded><UsersPage /></Guarded>} />
          <Route path="/listings" component={() => <Guarded><ListingsPage /></Guarded>} />
          <Route path="/moderation" component={() => <Guarded><ModerationPage /></Guarded>} />
          <Route path="/reports" component={() => <Guarded><ReportsPage /></Guarded>} />
          <Route path="/support" component={() => <Guarded><SupportPage /></Guarded>} />
          <Route path="/leads" component={() => <Guarded><LeadsPage /></Guarded>} />
          <Route path="/financing" component={() => <Guarded><FinancingPage /></Guarded>} />
          <Route path="/ads" component={() => <Guarded><AdsPage /></Guarded>} />
          <Route path="/revenue" component={() => <Guarded><RevenuePage /></Guarded>} />
          <Route path="/analytics" component={() => <Guarded><AnalyticsPage /></Guarded>} />
          <Route path="/fraud" component={() => <Guarded><FraudPage /></Guarded>} />
          <Route path="/monitoring" component={() => <Guarded><MonitoringPage /></Guarded>} />
          <Route path="/alerts" component={() => <Guarded><AlertsPage /></Guarded>} />
          <Route path="/plans" component={() => <Guarded><PlansPage /></Guarded>} />
          <Route path="/promo" component={() => <Guarded><PromoPage /></Guarded>} />
          <Route path="/settings" component={() => <Guarded><SettingsPage /></Guarded>} />
          
          <Route component={() => <Guarded><NotFound /></Guarded>} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  
  return (
    <LanguageProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
    </LanguageProvider>
  );
}
