import { useEffect, useState } from "react";
import {
  useGetPaymentConfig,
  useUpdatePaymentConfig,
  useTestPaymentConfig,
  getGetPaymentConfigQueryKey,
  useGetEmailConfig,
  useUpdateEmailConfig,
  useTestEmailConfig,
  getGetEmailConfigQueryKey,
} from "@workspace/api-client-react";
import type {
  PaymentConfigView,
  PaymentConfigUpdate,
  EmailConfigView,
  EmailConfigUpdate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  KeyRound,
  Mail,
  Send,
  Settings as SettingsIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLang } from "@/context/LanguageContext";

export default function SettingsPage() {
  const { t } = useLang();
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-12">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("settingsPage.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("settingsPage.subtitle")}</p>
        </div>
      </div>

      <PaymentSection />
      <EmailSection />
    </div>
  );
}

/* ── Shared ────────────────────────────────────────────── */

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

function TestResultBanner({
  result,
}: {
  result: { ok: boolean; message: string } | null;
}) {
  if (!result) return null;
  return (
    <div
      className={
        "flex items-start gap-2 rounded-md border p-3 text-sm " +
        (result.ok
          ? "border-green-600/40 bg-green-600/10 text-green-500"
          : "border-destructive/40 bg-destructive/10 text-destructive")
      }
    >
      {result.ok ? (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{result.message}</span>
    </div>
  );
}

function sourceLabel(source: "db" | "env" | "none"): string {
  return source === "db"
    ? "Database (admin-managed)"
    : source === "env"
      ? "Environment secrets"
      : "Not configured";
}

/* ── Payment provider ──────────────────────────────────── */

type Mode = "test" | "live";

interface PaymentFormState {
  enabled: boolean;
  mode: Mode;
  publicKey: string;
  integrationIds: string;
  apiBase: string;
  secretKey: string;
  hmacSecret: string;
}

function seedPaymentForm(view: PaymentConfigView): PaymentFormState {
  return {
    enabled: view.enabled,
    mode: view.mode,
    publicKey: view.public_key ?? "",
    integrationIds: view.integration_ids ?? "",
    apiBase: view.api_base ?? "",
    secretKey: "",
    hmacSecret: "",
  };
}

function PaymentSection() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: resp, isLoading } = useGetPaymentConfig();
  const view = resp?.data;

  const update = useUpdatePaymentConfig();
  const test = useTestPaymentConfig();

  const [form, setForm] = useState<PaymentFormState | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const seedKey = view
    ? `${view.updated_at ?? ""}|${view.source}|${view.enabled}`
    : "";
  useEffect(() => {
    if (view) setForm(seedPaymentForm(view));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  if (isLoading || !view || !form) {
    return (
      <SectionShell
        icon={<CreditCard className="w-6 h-6 text-primary" />}
        title="Payment Provider"
        description="Loading…"
      >
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </SectionShell>
    );
  }

  const set = <K extends keyof PaymentFormState>(
    key: K,
    value: PaymentFormState[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = () => {
    const payload: PaymentConfigUpdate = {
      enabled: form.enabled,
      mode: form.mode,
      public_key: form.publicKey.trim() || null,
      integration_ids: form.integrationIds.trim() || null,
      api_base: form.apiBase.trim() || null,
    };
    if (form.secretKey.trim()) payload.secret_key = form.secretKey.trim();
    if (form.hmacSecret.trim()) payload.hmac_secret = form.hmacSecret.trim();

    update.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetPaymentConfigQueryKey(),
          });
          setTestResult(null);
          toast({
            title: t("settingsPage.toastPaymentSaved"),
            description: "Credentials are encrypted at rest.",
          });
        },
        onError: () => toast({ title: t("settingsPage.toastSaveFailed"), variant: "destructive" }),
      },
    );
  };

  const handleTest = () => {
    setTestResult(null);
    test.mutate(undefined, {
      onSuccess: (r) => {
        const data = r?.data;
        if (data) {
          setTestResult({ ok: data.ok, message: data.message });
          toast({
            title: data.ok ? "Connection OK" : "Connection failed",
            description: data.message,
            variant: data.ok ? undefined : "destructive",
          });
        }
      },
      onError: () =>
        toast({ title: t("settingsPage.toastTestFailed"), variant: "destructive" }),
    });
  };

  return (
    <SectionShell
      icon={<CreditCard className="w-6 h-6 text-primary" />}
      title="Payment Provider"
      description="Configure the Paymob gateway credentials used for checkout and wallet top-ups."
    >
      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <StatusItem label="Status">
            {view.configured ? (
              <Badge className="bg-green-600 hover:bg-green-600">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Configured
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Not configured
              </Badge>
            )}
          </StatusItem>
          <StatusItem label="Active source">
            <span className="text-sm font-medium">{sourceLabel(view.source)}</span>
          </StatusItem>
          <StatusItem label="Live toggle">
            <Badge variant={view.enabled ? "default" : "secondary"}>
              {view.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </StatusItem>
          <StatusItem label="Mode">
            <Badge variant={view.mode === "live" ? "destructive" : "secondary"}>
              {view.mode === "live" ? "LIVE" : "Sandbox"}
            </Badge>
          </StatusItem>
          {view.updated_at ? (
            <StatusItem label="Last updated">
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
            <ShieldCheck className="w-5 h-5 text-primary" /> {t("settingsPage.credentials")}
          </CardTitle>
          <CardDescription>{t("settingsPage.credentialsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">{t("settingsPage.useDbConfig")}</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("settingsPage.paymentDbHint")}
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Environment mode</Label>
            <Select
              value={form.mode}
              onValueChange={(v) => set("mode", v as Mode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Sandbox (test)</SelectItem>
                <SelectItem value="live">Live (production)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="publicKey">Public key</Label>
            <Input
              id="publicKey"
              value={form.publicKey}
              onChange={(e) => set("publicKey", e.target.value)}
              placeholder="egy_pk_..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="integrationIds">Integration / payment method IDs</Label>
            <Input
              id="integrationIds"
              value={form.integrationIds}
              onChange={(e) => set("integrationIds", e.target.value)}
              placeholder="e.g. 123456, 123457"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated Paymob integration IDs offered at checkout.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiBase">API base (optional)</Label>
            <Input
              id="apiBase"
              value={form.apiBase}
              onChange={(e) => set("apiBase", e.target.value)}
              placeholder="https://accept.paymob.com"
            />
          </div>

          <div className="border-t pt-6 space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <KeyRound className="w-4 h-4" /> Secrets (write-only)
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secretKey">Secret key</Label>
              <Input
                id="secretKey"
                type="password"
                autoComplete="new-password"
                value={form.secretKey}
                onChange={(e) => set("secretKey", e.target.value)}
                placeholder={
                  view.has_secret_key
                    ? "•••••••• stored — leave blank to keep"
                    : "Enter the PSP secret key"
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="hmacSecret">Webhook HMAC secret</Label>
              <Input
                id="hmacSecret"
                type="password"
                autoComplete="new-password"
                value={form.hmacSecret}
                onChange={(e) => set("hmacSecret", e.target.value)}
                placeholder={
                  view.has_hmac_secret
                    ? "•••••••• stored — leave blank to keep"
                    : "Enter the webhook HMAC secret"
                }
              />
            </div>
          </div>

          <TestResultBanner result={testResult} />

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save configuration
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={test.isPending}
            >
              {test.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Test connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: save first, then test — the test uses the stored credentials
            even while the configuration is disabled.
          </p>
        </CardContent>
      </Card>
    </SectionShell>
  );
}

/* ── Email delivery (Resend) ───────────────────────────── */

interface EmailFormState {
  enabled: boolean;
  fromName: string;
  fromEmail: string;
  sendingDomain: string;
  replyTo: string;
  publicAppUrl: string;
  apiKey: string;
}

function seedEmailForm(view: EmailConfigView): EmailFormState {
  return {
    enabled: view.enabled,
    fromName: view.from_name ?? "",
    fromEmail: view.from_email ?? "",
    sendingDomain: view.sending_domain ?? "",
    replyTo: view.reply_to ?? "",
    publicAppUrl: view.public_app_url ?? "",
    apiKey: "",
  };
}

function EmailSection() {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: resp, isLoading } = useGetEmailConfig();
  const view = resp?.data;

  const update = useUpdateEmailConfig();
  const test = useTestEmailConfig();

  const [form, setForm] = useState<EmailFormState | null>(null);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const seedKey = view
    ? `${view.updated_at ?? ""}|${view.source}|${view.enabled}`
    : "";
  useEffect(() => {
    if (view) setForm(seedEmailForm(view));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  if (isLoading || !view || !form) {
    return (
      <SectionShell
        icon={<Mail className="w-6 h-6 text-primary" />}
        title="Email Delivery"
        description="Loading…"
      >
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      </SectionShell>
    );
  }

  const set = <K extends keyof EmailFormState>(
    key: K,
    value: EmailFormState[K],
  ) => setForm((f) => (f ? { ...f, [key]: value } : f));

  const handleSave = () => {
    const payload: EmailConfigUpdate = {
      enabled: form.enabled,
      from_name: form.fromName.trim() || null,
      from_email: form.fromEmail.trim() || null,
      sending_domain: form.sendingDomain.trim() || null,
      reply_to: form.replyTo.trim() || null,
      public_app_url: form.publicAppUrl.trim() || null,
    };
    if (form.apiKey.trim()) payload.api_key = form.apiKey.trim();

    update.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetEmailConfigQueryKey(),
          });
          setTestResult(null);
          toast({
            title: t("settingsPage.toastEmailSaved"),
            description: "The API key is encrypted at rest.",
          });
        },
        onError: () => toast({ title: t("settingsPage.toastSaveFailed"), variant: "destructive" }),
      },
    );
  };

  const handleTest = () => {
    setTestResult(null);
    test.mutate(undefined, {
      onSuccess: (r) => {
        const data = r?.data;
        if (data) {
          setTestResult({ ok: data.ok, message: data.message });
          toast({
            title: data.ok ? "Email check OK" : "Email check failed",
            description: data.message,
            variant: data.ok ? undefined : "destructive",
          });
        }
      },
      onError: () =>
        toast({ title: t("settingsPage.toastTestFailed"), variant: "destructive" }),
    });
  };

  return (
    <SectionShell
      icon={<Mail className="w-6 h-6 text-primary" />}
      title="Email Delivery"
      description="Configure Resend for transactional emails (new-lead alerts, weekly summaries). Until a key is saved, emails are rendered and logged but not delivered."
    >
      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
          <StatusItem label="Status">
            {view.configured ? (
              <Badge className="bg-green-600 hover:bg-green-600">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Delivering
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Mail className="w-3.5 h-3.5 mr-1" /> Log-only
              </Badge>
            )}
          </StatusItem>
          <StatusItem label="Active transport">
            <span className="text-sm font-medium">
              {view.active_transport === "resend"
                ? "Resend (real delivery)"
                : "Log only (not delivered)"}
            </span>
          </StatusItem>
          <StatusItem label="Active source">
            <span className="text-sm font-medium">{sourceLabel(view.source)}</span>
          </StatusItem>
          <StatusItem label="DB config">
            <Badge variant={view.enabled ? "default" : "secondary"}>
              {view.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </StatusItem>
          {view.updated_at ? (
            <StatusItem label="Last updated">
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
            <Send className="w-5 h-5 text-primary" /> {t("settingsPage.senderProvider")}
          </CardTitle>
          <CardDescription>{t("settingsPage.senderProviderDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">{t("settingsPage.useDbConfig")}</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("settingsPage.emailDbHint")}
              </p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="fromName">From name</Label>
              <Input
                id="fromName"
                value={form.fromName}
                onChange={(e) => set("fromName", e.target.value)}
                placeholder="BANCO"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fromEmail">From email</Label>
              <Input
                id="fromEmail"
                value={form.fromEmail}
                onChange={(e) => set("fromEmail", e.target.value)}
                placeholder="noreply@banco.today"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sendingDomain">Sending domain (verified)</Label>
              <Input
                id="sendingDomain"
                value={form.sendingDomain}
                onChange={(e) => set("sendingDomain", e.target.value)}
                placeholder="banco.today"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="replyTo">Reply-to (optional)</Label>
              <Input
                id="replyTo"
                value={form.replyTo}
                onChange={(e) => set("replyTo", e.target.value)}
                placeholder="support@banco.today"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="publicAppUrl">Public app URL</Label>
            <Input
              id="publicAppUrl"
              value={form.publicAppUrl}
              onChange={(e) => set("publicAppUrl", e.target.value)}
              placeholder="https://banco.today"
            />
            <p className="text-xs text-muted-foreground">
              Base URL used to build the buttons/links inside emails.
            </p>
          </div>

          <div className="border-t pt-6 space-y-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <KeyRound className="w-4 h-4" /> Secret (write-only)
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apiKey">Resend API key</Label>
              <Input
                id="apiKey"
                type="password"
                autoComplete="new-password"
                value={form.apiKey}
                onChange={(e) => set("apiKey", e.target.value)}
                placeholder={
                  view.has_api_key
                    ? "•••••••• stored — leave blank to keep"
                    : "re_..."
                }
              />
              <p className="text-xs text-muted-foreground">
                Get this from resend.com → API Keys. Stored encrypted; never
                shown again.
              </p>
            </div>
          </div>

          <TestResultBanner result={testResult} />

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={update.isPending}>
              {update.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save configuration
            </Button>
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={test.isPending}
            >
              {test.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Test connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: save first, then test — the check validates the stored key even
            while the configuration is disabled.
          </p>
        </CardContent>
      </Card>
    </SectionShell>
  );
}

function SectionShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground mt-0.5 text-sm">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
