import React from "react";
import { Link, useLocation } from "wouter";
import { UserButton } from "@clerk/react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { 
  LayoutDashboard, 
  Users, 
  List, 
  ShieldAlert, 
  Flag,
  Ticket,
  Activity,
  Megaphone,
  CreditCard,
  LineChart,
  Shield,
  Radio,
  Bell,
  Settings,
  Gift,
  Wallet,
  Landmark,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasPermission, type Permission, type StaffRole } from "@/lib/permissions";
import { useLang } from "@/context/LanguageContext";

// Labels are i18n keys (see lib/i18n.ts) so the sidebar follows the selected
// language; hrefs/permissions are language-independent.
const NAV_ITEMS: { href: string; labelKey: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { href: "/overview", labelKey: "nav.overview", icon: LayoutDashboard, permission: "view_admin" },
  { href: "/users", labelKey: "nav.users", icon: Users, permission: "view_admin" },
  { href: "/listings", labelKey: "nav.listings", icon: List, permission: "view_admin" },
  { href: "/moderation", labelKey: "nav.moderation", icon: ShieldAlert, permission: "moderate_listings" },
  { href: "/reports", labelKey: "nav.reports", icon: Flag, permission: "manage_reports" },
  { href: "/support", labelKey: "nav.support", icon: Ticket, permission: "manage_support" },
  { href: "/leads", labelKey: "nav.leads", icon: Activity, permission: "view_admin" },
  { href: "/financing", labelKey: "nav.financing", icon: Landmark, permission: "manage_financing" },
  { href: "/ads", labelKey: "nav.ads", icon: Megaphone, permission: "view_finance" },
  { href: "/revenue", labelKey: "nav.revenue", icon: CreditCard, permission: "view_finance" },
  { href: "/analytics", labelKey: "nav.analytics", icon: LineChart, permission: "view_finance" },
  { href: "/fraud", labelKey: "nav.fraud", icon: Shield, permission: "manage_reports" },
  { href: "/monitoring", labelKey: "nav.monitoring", icon: Radio, permission: "view_admin" },
  { href: "/alerts", labelKey: "nav.alerts", icon: Bell, permission: "view_admin" },
  { href: "/plans", labelKey: "nav.plans", icon: Wallet, permission: "manage_payments" },
  { href: "/promo", labelKey: "nav.promo", icon: Gift, permission: "manage_payments" },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, permission: "manage_payments" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t, toggle } = useLang();
  const { data: meResp } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const staffRole = (meResp?.data?.staff_role ?? "user") as StaffRole;
  const navItems = NAV_ITEMS.filter((item) => hasPermission(staffRole, item.permission));
  const roleLabel = t(`roles.${staffRole}`);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-e border-border bg-card flex flex-col h-screen sticky top-0">
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center font-bold text-white">
              B
            </div>
            <span className="font-semibold tracking-tight text-lg">{t("layout.controlCenter")}</span>
          </div>
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="lang-toggle"
          >
            <Globe className="w-3.5 h-3.5" />
            {t("layout.language")}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    active 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-border flex items-center gap-3">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8" } }} />
          <div className="flex flex-col text-sm">
            <span className="font-medium text-foreground">{roleLabel}</span>
            <span className="text-xs text-muted-foreground">{t("layout.bancoStaff")}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
