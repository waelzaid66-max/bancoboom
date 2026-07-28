import { useEffect, useRef, useState } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  getGetMeQueryKey,
  useUpdateMe,
  UpdateMeBodyBusinessActivityType,
} from "@workspace/api-client-react";
import { Toaster } from "@/components/ui/toaster";
import { Loader2, Building2 } from "lucide-react";

import DashboardPage from "./pages/dashboard";
import ListingsPage from "./pages/listings";
import LeadsPage from "./pages/leads";
import AnalyticsPage from "./pages/analytics";
import AdsPage from "./pages/ads";
import ImportPage from "./pages/import";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import WalletPage from "./pages/wallet";
import SubscriptionPage from "./pages/subscription";
import RfqsPage from "./pages/rfqs";
import InvestmentsPage from "./pages/investments";
import CompanyProfilePage from "./pages/company-profile";
import GlobalSupplyPage from "./pages/global-supply";

const queryClient = new QueryClient();

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

// NOTE: Clerk key computation + the missing-key throw deliberately live INSIDE
// ClerkProviderWithRoutes (not at module scope) so the public legal pages stay
// fully decoupled from auth — a missing/misconfigured Clerk env cannot take the
// Google Play Privacy/Terms URLs down.

const clerkAppearance = {
  theme: shadcn, // imported object, NOT a string
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/banco-logo.png`,
  },
  variables: {
    // Fill with BANCO brand colors
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

const ALLOWED_ROLES = ["dealer", "company", "enterprise"];

// Role guard — only dealer / company / enterprise may access the app.
// The DATABASE is the source of truth for role: we fetch /api/v1/me and gate
// on the authoritative DB role (Clerk publicMetadata is only a mirror). A
// spinner is shown while Clerk hydrates or the first /me is in flight. Access is
// granted only once /me returns an allowed role; an initial load failure (no
// data) or a disallowed role yields a fail-closed Access Restricted screen.
function RoleGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const { data: me, isLoading, refetch } = useGetMe({
    query: { enabled: isLoaded && !!isSignedIn, queryKey: getGetMeQueryKey() },
  });

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Loader2 className="w-8 h-8 animate-spin text-[#E8002D]" />
      </div>
    );
  }

  // Access is granted ONLY when /me has returned data with an allowed role.
  // We deliberately do NOT gate on `isError`: react-query keeps the last good
  // `me` across a failed background refetch, so a transient 429/network blip
  // never locks out a legitimate dealer.
  const role = (me?.data?.role as string | undefined) ?? "";
  const hasValidRole = !!me?.data && ALLOWED_ROLES.includes(role);

  if (hasValidRole) {
    return <>{children}</>;
  }

  // Signed in but not a seller yet: instead of a dead-end "Access Restricted"
  // screen, offer a self-serve upgrade. Submitting business details promotes the
  // account to a dealer/company role server-side, after which /me is refetched
  // and access unlocks automatically.
  if (me?.data) {
    return <DealerOnboarding currentRole={role} />;
  }

  // /me failed to load entirely (initial network/auth failure): show a soft retry
  // rather than permanently locking the user out.
  return <AccountLoadError onRetry={() => refetch()} />;
}

const ACTIVITY_OPTIONS: { value: UpdateMeBodyBusinessActivityType; label: string }[] = [
  { value: UpdateMeBodyBusinessActivityType.car_dealer, label: "Car dealership" },
  { value: UpdateMeBodyBusinessActivityType.real_estate_developer, label: "Real estate developer" },
  { value: UpdateMeBodyBusinessActivityType.factory, label: "Factory" },
  { value: UpdateMeBodyBusinessActivityType.supplier, label: "Supplier" },
];

const onboardingInputClass =
  "w-full rounded-lg bg-[#141414] border border-gray-700 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-[#E8002D] transition-colors";

// Self-serve seller onboarding shown when a signed-in individual hits the role
// guard. Calls PATCH /me with account_type + business, then invalidates /me so
// the guard re-evaluates with the new (allowed) role and unlocks the app.
function DealerOnboarding({ currentRole }: { currentRole: string }) {
  const queryClient = useQueryClient();
  const [accountType, setAccountType] = useState<"dealer" | "company">("dealer");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [activityType, setActivityType] = useState<UpdateMeBodyBusinessActivityType>(
    UpdateMeBodyBusinessActivityType.car_dealer,
  );
  const { mutateAsync } = useUpdateMe();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = businessName.trim().length > 0 && city.trim().length > 0 && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await mutateAsync({
        data: {
          account_type: accountType,
          business: {
            activity_type: activityType,
            business_name: businessName.trim(),
            city: city.trim(),
          },
        },
      });
      // Wait for /me to refetch. If the new role is allowed, RoleGuard re-renders
      // and unmounts this component (the lines below become no-ops). If we're
      // still mounted afterwards, the role didn't unlock — surface a retry path
      // rather than spinning forever.
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      setBusy(false);
      setErrorMsg("Your account was updated but access hasn't unlocked yet. Please try again.");
    } catch {
      setBusy(false);
      setErrorMsg("Couldn't activate your account. Please check your details and try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-[#E8002D]/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-[#E8002D]" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Set up your seller account</h2>
          <p className="text-gray-400 text-sm">
            BANCO Market is for sellers. Your account is currently{" "}
            <span className="font-mono text-gray-300">{currentRole || "individual"}</span>. Add your
            business details to unlock the seller tools.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["dealer", "company"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAccountType(opt)}
              className={`rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors ${
                accountType === opt
                  ? "border-[#E8002D] bg-[#E8002D]/10 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Business name</label>
            <input
              className={onboardingInputClass}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Cairo Auto Group"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">City</label>
            <input
              className={onboardingInputClass}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Cairo"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Activity</label>
            <select
              className={onboardingInputClass}
              value={activityType}
              onChange={(e) =>
                setActivityType(e.target.value as UpdateMeBodyBusinessActivityType)
              }
            >
              {ACTIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#141414]">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg && <p className="text-[#E8002D] text-sm mt-3">{errorMsg}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-5 w-full rounded-lg bg-[#E8002D] px-4 py-3 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Activate seller account"}
        </button>
      </form>
    </div>
  );
}

function AccountLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A] text-white px-4">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-[#E8002D]/10 flex items-center justify-center mx-auto mb-4">
          <span className="text-[#E8002D] text-xl font-bold">!</span>
        </div>
        <h2 className="text-xl font-semibold mb-2">Couldn't load your account</h2>
        <p className="text-gray-400 text-sm mb-4">
          We couldn't reach your account details. Check your connection and try again.
        </p>
        <button
          onClick={onRetry}
          className="rounded-lg bg-[#E8002D] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Retry
        </button>
      </div>
    </div>
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
      <Show when="signed-in"><Redirect to="/dashboard" /></Show>
      <Show when="signed-out"><Redirect to="/sign-in" /></Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  // REQUIRED — copy verbatim
  const clerkPubKey = publishableKeyFromHost(
    window.location.hostname,
    import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  );
  // REQUIRED — copy verbatim
  const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
  if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "BANCO Market", subtitle: "Sign in to your seller account" } },
        signUp: { start: { title: "Join BANCO", subtitle: "Create your seller account" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          {/* Public legal pages — NO sign-in / RoleGuard. Required for the
              Google Play "Privacy policy" URL and mirror the in-app legal copy. */}
          <Route path="/privacy" component={PrivacyPage} />
          <Route path="/terms" component={TermsPage} />
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard" component={() => <><Show when="signed-in"><RoleGuard><DashboardPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/listings" component={() => <><Show when="signed-in"><RoleGuard><ListingsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/leads" component={() => <><Show when="signed-in"><RoleGuard><LeadsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/analytics" component={() => <><Show when="signed-in"><RoleGuard><AnalyticsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/ads" component={() => <><Show when="signed-in"><RoleGuard><AdsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/import" component={() => <><Show when="signed-in"><RoleGuard><ImportPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/rfqs" component={() => <><Show when="signed-in"><RoleGuard><RfqsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/global-supply" component={() => <><Show when="signed-in"><RoleGuard><GlobalSupplyPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/investments" component={() => <><Show when="signed-in"><RoleGuard><InvestmentsPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/company" component={() => <><Show when="signed-in"><RoleGuard><CompanyProfilePage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/wallet" component={() => <><Show when="signed-in"><RoleGuard><WalletPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
          <Route path="/subscription" component={() => <><Show when="signed-in"><RoleGuard><SubscriptionPage /></RoleGuard></Show><Show when="signed-out"><Redirect to="/sign-in" /></Show></>} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

// Paths that must render fully standalone, decoupled from all auth/session logic.
const PUBLIC_LEGAL_PATHS = ["/privacy", "/terms"];

export default function App() {
  // HARD BYPASS: public legal pages (/privacy, /terms) are short-circuited here
  // BEFORE ClerkProvider, the QueryClient, or any RoleGuard mount. This fully
  // decouples them from auth/session logic so the Google Play Privacy/Terms URLs
  // stay reachable and can never break from future auth changes. They are also
  // registered inside the app Switch (without RoleGuard) so in-app client-side
  // navigation still resolves them.
  const legalPath = stripBase(window.location.pathname).replace(/\/+$/, "") || "/";
  if (PUBLIC_LEGAL_PATHS.includes(legalPath)) {
    return (
      <WouterRouter base={basePath}>
        <Switch>
          <Route path="/terms" component={TermsPage} />
          <Route path="/privacy" component={PrivacyPage} />
          {/* Fallback so a trailing-slash variant still renders, never blank. */}
          <Route component={legalPath === "/terms" ? TermsPage : PrivacyPage} />
        </Switch>
      </WouterRouter>
    );
  }

  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}