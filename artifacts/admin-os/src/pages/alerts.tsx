import { useGetAdminAlerts } from "@workspace/api-client-react";
import { Loader2, Bell, AlertTriangle, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

const SEVERITY = {
  critical: { variant: "destructive" as const, icon: AlertTriangle, ring: "border-destructive/40" },
  warning: { variant: "default" as const, icon: Bell, ring: "border-yellow-500/40" },
  info: { variant: "secondary" as const, icon: Info, ring: "border-border" },
};

export default function AlertsPage() {
  const { t } = useLang();
  const { data: resp, isLoading } = useGetAdminAlerts();
  const alerts = resp?.data ?? [];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("alertsPage.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("alertsPage.subtitle")}</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !alerts.length ? (
        <div className="border rounded-md bg-card py-16 text-center text-muted-foreground">
          {t("alertsPage.empty")}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a: (typeof alerts)[number]) => {
            const cfg = SEVERITY[a.severity ?? "info"];
            const Icon = cfg.icon;
            return (
              <Card key={a.id} className={cn("border", cfg.ring)}>
                <CardContent className="flex items-start gap-4 p-4">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{a.title}</span>
                      <Badge variant={cfg.variant} className="capitalize">{a.severity}</Badge>
                      <Badge variant="outline" className="capitalize">{a.type?.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                    {a.value ? <p className="text-xs text-muted-foreground mt-1">{t("alertsPage.valueLabel")}: {a.value}</p> : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
