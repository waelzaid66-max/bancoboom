import { useEffect, useState } from "react";
import {
  useGetPromoCampaign,
  useUpdatePromoCampaign,
  useRenewPromoCampaign,
  getGetPromoCampaignQueryKey,
} from "@workspace/api-client-react";
import type {
  PromoCampaignView,
  PromoCampaignUpdate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Gift,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CalendarClock,
  BadgeCheck,
  ShieldOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LanguageContext";

interface FormState {
  enabled: boolean;
  verifiedAmount: string;
  unverifiedAmount: string;
  durationMonths: string;
}

function seedForm(view: PromoCampaignView): FormState {
  return {
    enabled: view.enabled,
    verifiedAmount: view.verified_monthly_amount,
    unverifiedAmount: view.unverified_monthly_amount,
    durationMonths: String(view.duration_months),
  };
}

// Labels resolve through i18n at render time (labelKey → t()).
const STATUS_META: Record<
  PromoCampaignView["status"],
  { labelKey: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { labelKey: "promoPage.statusActive", variant: "default" },
  upcoming: { labelKey: "promoPage.statusUpcoming", variant: "secondary" },
  ended: { labelKey: "promoPage.statusEnded", variant: "secondary" },
  disabled: { labelKey: "promoPage.statusDisabled", variant: "destructive" },
};

export default function PromoPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLang();
  const { data: resp, isLoading } = useGetPromoCampaign();
  const view = resp?.data;

  const update = useUpdatePromoCampaign();
  const renew = useRenewPromoCampaign();

  const [form, setForm] = useState<FormState | null>(null);

  // Re-seed the editable form whenever the server view materially changes
  // (after a save/renew refetch bumps the version or timestamps).
  const seedKey = view
    ? `${view.campaign_version}|${view.updated_at ?? ""}|${view.enabled}`
    : "";
  useEffect(() => {
    if (view) setForm(seedForm(view));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  if (isLoading || !view || !form) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetPromoCampaignQueryKey() });

  const buildPayload = (): PromoCampaignUpdate => {
    const months = parseInt(form.durationMonths, 10);
    return {
      enabled: form.enabled,
      verified_monthly_amount: form.verifiedAmount.trim() || "0",
      unverified_monthly_amount: form.unverifiedAmount.trim() || "0",
      duration_months: Number.isFinite(months) ? months : view.duration_months,
    };
  };

  const handleSave = () => {
    update.mutate(
      { data: buildPayload() },
      {
        onSuccess: () => {
          invalidate();
          toast({
            title: t("promoPage.toastSaved"),
            description: t("promoPage.toastSavedDesc"),
          });
        },
        onError: () => toast({ title: t("promoPage.toastSaveFailed"), variant: "destructive" }),
      }
    );
  };

  const handleRenew = () => {
    // Renew starts a fresh cycle (new version) from today, applying any edited
    // amounts/duration so admins can relaunch in one action.
    renew.mutate(
      { data: buildPayload() },
      {
        onSuccess: () => {
          invalidate();
          toast({
            title: t("promoPage.toastRenewed"),
            description: t("promoPage.toastRenewedDesc"),
          });
        },
        onError: () => toast({ title: t("promoPage.toastRenewFailed"), variant: "destructive" }),
      }
    );
  };

  const statusMeta = STATUS_META[view.status];
  const fmtAmount = (v: string) => {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString() : v;
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Gift className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("promoPage.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("promoPage.subtitle")}</p>
        </div>
      </div>

      {/* Status summary */}
      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <StatusItem label={t("promoPage.statStatus")}>
            <Badge
              variant={statusMeta.variant}
              className={
                view.status === "active"
                  ? "bg-green-600 hover:bg-green-600"
                  : undefined
              }
            >
              {view.status === "active" ? (
                <CheckCircle2 className="w-3.5 h-3.5 me-1" />
              ) : view.status === "disabled" ? (
                <XCircle className="w-3.5 h-3.5 me-1" />
              ) : (
                <CalendarClock className="w-3.5 h-3.5 me-1" />
              )}
              {t(statusMeta.labelKey)}
            </Badge>
          </StatusItem>
          <StatusItem label={t("promoPage.statVersion")}>
            <span className="text-sm font-medium">#{view.campaign_version}</span>
          </StatusItem>
          <StatusItem label={t("promoPage.statMonth")}>
            <span className="text-sm font-medium">
              {view.current_month_index < 0
                ? t("promoPage.notStarted")
                : `${view.current_month_index + 1} ${t("promoPage.of")} ${view.duration_months}`}
            </span>
          </StatusItem>
          <StatusItem label={t("promoPage.statMonthsRemaining")}>
            <span className="text-sm font-medium">{view.months_remaining}</span>
          </StatusItem>
          <StatusItem label={t("promoPage.statStarted")}>
            <span className="text-sm text-muted-foreground">
              {new Date(view.starts_at).toLocaleDateString()}
            </span>
          </StatusItem>
          {view.updated_at ? (
            <StatusItem label={t("promoPage.statUpdated")}>
              <span className="text-sm text-muted-foreground">
                {new Date(view.updated_at).toLocaleString()}
              </span>
            </StatusItem>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> {t("promoPage.configTitle")}
          </CardTitle>
          <CardDescription>{t("promoPage.configDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">{t("promoPage.enableTitle")}</Label>
              <p className="text-sm text-muted-foreground mt-0.5">{t("promoPage.enableDesc")}</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          {/* Tiered amounts */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="verifiedAmount" className="flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-primary" /> {t("promoPage.verifiedLabel")}
              </Label>
              <Input
                id="verifiedAmount"
                inputMode="decimal"
                value={form.verifiedAmount}
                onChange={(e) => set("verifiedAmount", e.target.value)}
                placeholder="10000"
              />
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="unverifiedAmount"
                className="flex items-center gap-1.5"
              >
                <ShieldOff className="w-4 h-4 text-muted-foreground" /> {t("promoPage.unverifiedLabel")}
              </Label>
              <Input
                id="unverifiedAmount"
                inputMode="decimal"
                value={form.unverifiedAmount}
                onChange={(e) => set("unverifiedAmount", e.target.value)}
                placeholder="5000"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="durationMonths">{t("promoPage.durationLabel")}</Label>
            <Input
              id="durationMonths"
              type="number"
              min={1}
              max={24}
              value={form.durationMonths}
              onChange={(e) => set("durationMonths", e.target.value)}
              placeholder="4"
            />
            <p className="text-xs text-muted-foreground">
              {t("promoPage.durationHint")} {t("promoPage.currentTiers")}{" "}
              {fmtAmount(view.verified_monthly_amount)} EGP ·{" "}
              {fmtAmount(view.unverified_monthly_amount)} EGP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {t("promoPage.saveBtn")}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={renew.isPending}>
                  {renew.isPending ? (
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 me-2" />
                  )}
                  {t("promoPage.renewBtn")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("promoPage.dialogTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("promoPage.dialogDesc")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRenew}>
                    {t("promoPage.renewBtn")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <p className="text-xs text-muted-foreground">{t("promoPage.footnote")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  );
}
