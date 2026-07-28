import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { LayoutDashboard, List, Users, BarChart, Upload, LogOut, Megaphone, Inbox, Wallet, CreditCard, TrendingUp, Building2, Globe, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/i18n/LanguageContext";

const navItems = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/listings", labelKey: "nav.listings", icon: List },
  { href: "/leads", labelKey: "nav.leads", icon: Users },
  { href: "/rfqs", labelKey: "nav.rfqs", icon: Inbox },
  { href: "/global-supply", labelKey: "nav.globalSupply", icon: Globe },
  { href: "/investments", labelKey: "nav.investments", icon: TrendingUp },
  { href: "/company", labelKey: "nav.company", icon: Building2 },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart },
  { href: "/ads", labelKey: "nav.ads", icon: Megaphone },
  { href: "/import", labelKey: "nav.import", icon: Upload },
  { href: "/wallet", labelKey: "nav.wallet", icon: Wallet },
  { href: "/subscription", labelKey: "nav.subscription", icon: CreditCard },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { t, lang, toggle } = useI18n();

  const handleSignOut = () => {
    signOut({ redirectUrl: "/" });
  };

  const activeItem = navItems.find((n) => n.href === location);

  return (
    // Logical direction utilities (start/ms/border-e) auto-flip with the document
    // dir set by LanguageProvider, so the same markup lays out correctly in RTL.
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-e border-sidebar-border bg-sidebar flex flex-col fixed inset-y-0 start-0">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}banco-logo.png`}
              alt="BANCO"
              className="h-6 w-auto"
            />
            <span className="text-sm font-semibold text-muted-foreground tracking-wide">{t("common.marketSuffix")}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  data-testid={`nav-${item.href.replace("/", "")}`}
                >
                  <Icon className="w-4 h-4" />
                  {t(item.labelKey)}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.firstName?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate" data-testid="user-name">{user?.fullName || t("common.seller")}</span>
              <span className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} title={t("common.signOut")} data-testid="btn-signout" className="flex-shrink-0 ms-2">
            <LogOut className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ms-64 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10 flex items-center justify-between px-8">
          <div className="text-sm text-muted-foreground font-medium">
            {activeItem ? t(activeItem.labelKey) : t("brand")}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              className="gap-2 text-muted-foreground hover:text-foreground"
              data-testid="btn-language-toggle"
              title={lang === "en" ? t("common.switchToArabic") : t("common.switchToEnglish")}
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-medium">
                {lang === "en" ? t("common.switchToArabic") : t("common.switchToEnglish")}
              </span>
            </Button>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-tight" data-testid="topbar-user-name">
                {user?.fullName || user?.firstName || t("common.seller")}
              </span>
              <span className="text-xs text-muted-foreground leading-tight">
                {(user?.publicMetadata?.role as string | undefined) || t("common.dealer")}
              </span>
            </div>
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="text-xs">{user?.firstName?.charAt(0) || "D"}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
