import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useGetMySubscription, getGetMySubscriptionQueryKey,
  useListPlans, getListPlansQueryKey,
} from "@workspace/api-client-react";
import type { Plan } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Crown, Check, Infinity as InfinityIcon } from "lucide-react";

function fmtMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function UsageMeter({ label, used, cap }: { label: string; used: number; cap: number | null }) {
  const unlimited = cap === null || cap === undefined;
  const pct = unlimited || cap === 0 ? 0 : Math.min(100, Math.round((used / cap) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground flex items-center gap-1">
          {used}
          {unlimited ? (
            <><span className="text-muted-foreground">/</span><InfinityIcon className="w-4 h-4 text-muted-foreground" /></>
          ) : (
            <span className="text-muted-foreground">/ {cap}</span>
          )}
        </span>
      </div>
      {!unlimited && <Progress value={pct} className="h-2" />}
    </div>
  );
}

export default function SubscriptionPage() {
  const { user } = useClerk();

  const { data: subData, isLoading: subLoading } = useGetMySubscription({
    query: { enabled: !!user, queryKey: getGetMySubscriptionQueryKey() },
  });
  const { data: plansData, isLoading: plansLoading } = useListPlans({
    query: { enabled: !!user, queryKey: getListPlansQueryKey() },
  });

  const me = subData?.data;
  const plan = me?.plan;
  const subscription = me?.subscription;
  const usage = me?.usage;

  const plans = (plansData?.data ?? []).filter((p) => p.audience !== "individual");

  const statusLabel = subscription
    ? subscription.status
    : "Baseline (no paid subscription)";

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscription</h1>
          <p className="text-muted-foreground mt-2">Your plan, usage limits and per-lead pricing.</p>
        </div>

        {subLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : plan ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Current plan */}
            <Card className="bg-card border-card-border lg:col-span-1" data-testid="current-plan">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Plan</CardTitle>
                <Crown className="w-4 h-4 text-primary" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-foreground">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {fmtMoney(plan.monthly_price)} EGP / month
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={subscription?.status === "active"
                    ? "border-green-500 text-green-500"
                    : "border-muted-foreground text-muted-foreground"}
                >
                  {statusLabel}
                </Badge>
                {subscription && (
                  <div className="space-y-1 text-sm text-muted-foreground pt-2 border-t border-border">
                    <div className="flex justify-between">
                      <span>Renews</span>
                      <span className="text-foreground">{subscription.auto_renew ? "Auto" : "Manual"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expires</span>
                      <span className="text-foreground">{new Date(subscription.expires_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Usage */}
            <Card className="bg-card border-card-border lg:col-span-1" data-testid="usage-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Usage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <UsageMeter
                  label="Listings this month"
                  used={usage?.listings_this_month ?? 0}
                  cap={usage?.listing_quota ?? null}
                />
                <UsageMeter
                  label="Active listings"
                  used={usage?.active_listings ?? 0}
                  cap={usage?.active_listing_cap ?? null}
                />
              </CardContent>
            </Card>

            {/* Per-lead pricing */}
            <Card className="bg-card border-card-border lg:col-span-1" data-testid="cpl-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cost per Lead (EGP)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">WhatsApp</span><span className="text-foreground font-medium">{fmtMoney(plan.cpl_whatsapp)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Call</span><span className="text-foreground font-medium">{fmtMoney(plan.cpl_call)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Chat</span><span className="text-foreground font-medium">{fmtMoney(plan.cpl_chat)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Finance request</span><span className="text-foreground font-medium">{fmtMoney(plan.cpl_finance_request)}</span></div>
                <div className="flex justify-between pt-2 border-t border-border"><span className="text-muted-foreground">Boost / day</span><span className="text-foreground font-medium">{fmtMoney(plan.boost_price)}</span></div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              No subscription information available.
            </CardContent>
          </Card>
        )}

        {/* Plans comparison */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Available Plans</h2>
          {plansLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((p: Plan) => {
                const isCurrent = plan?.slug === p.slug;
                return (
                  <Card
                    key={p.id}
                    className={`bg-card ${isCurrent ? "border-primary" : "border-card-border"}`}
                    data-testid={`plan-${p.slug}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{p.name}</CardTitle>
                        {isCurrent && <Badge className="bg-primary text-white">Current</Badge>}
                      </div>
                      <div className="text-2xl font-bold text-foreground pt-1">
                        {fmtMoney(p.monthly_price)} <span className="text-sm font-normal text-muted-foreground">EGP/mo</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm pt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Listing quota</span>
                        <span className="text-foreground">{p.listing_quota ?? "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active cap</span>
                        <span className="text-foreground">{p.active_listing_cap ?? "Unlimited"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Boost / day</span>
                        <span className="text-foreground">{fmtMoney(p.boost_price)} EGP</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPL (call)</span>
                        <span className="text-foreground">{fmtMoney(p.cpl_call)} EGP</span>
                      </div>
                      {p.features && Object.keys(p.features).length > 0 && (
                        <div className="pt-2 border-t border-border space-y-1">
                          {Object.entries(p.features)
                            .filter(([, v]) => v)
                            .map(([k]) => (
                              <div key={k} className="flex items-center gap-2 text-muted-foreground">
                                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                <span className="capitalize">{k.replace(/_/g, " ")}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
