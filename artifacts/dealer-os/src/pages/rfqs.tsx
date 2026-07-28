import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import {
  useListMyRfqs, getListMyRfqsQueryKey,
  useGetRfq, getGetRfqQueryKey,
  useSubmitRfqOffer,
} from "@workspace/api-client-react";
import type { Rfq } from "@workspace/api-client-react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Loader2, Car, Home, Factory, Package, MapPin, Calendar, Users, CheckCircle2, ShieldCheck,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  car: Car,
  real_estate: Home,
  industrial: Factory,
};

const STATUS_STYLES: Record<string, string> = {
  open: "border-green-500 text-green-500",
  awarded: "border-blue-500 text-blue-500",
  closed: "border-muted-foreground text-muted-foreground",
  cancelled: "border-red-500 text-red-500",
};

function RfqDetailSheet({ rfqId, onClose }: { rfqId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetRfq(rfqId, {
    query: { queryKey: getGetRfqQueryKey(rfqId) },
  });
  const submitOffer = useSubmitRfqOffer();

  const rfq = data?.data;
  const myOffer = rfq?.offers?.find((o) => o.is_mine);

  const [priceQuote, setPriceQuote] = useState("");
  const [currency, setCurrency] = useState("EGP");
  const [leadTime, setLeadTime] = useState("");
  const [moq, setMoq] = useState("");
  const [message, setMessage] = useState("");

  // Prefill from an existing offer (submit endpoint also updates).
  useEffect(() => {
    if (myOffer) {
      setPriceQuote(myOffer.price_quote ?? "");
      setCurrency(myOffer.currency ?? "EGP");
      setLeadTime(myOffer.lead_time_days != null ? String(myOffer.lead_time_days) : "");
      setMoq(myOffer.moq ?? "");
      setMessage(myOffer.message ?? "");
    }
  }, [myOffer]);

  const canOffer = rfq?.status === "open";

  const handleSubmit = () => {
    const price = parseFloat(priceQuote);
    if (!isFinite(price) || price <= 0) {
      toast({ title: "Enter a valid quote price", variant: "destructive" });
      return;
    }
    submitOffer.mutate(
      {
        id: rfqId,
        data: {
          price_quote: price,
          currency: currency || "EGP",
          ...(leadTime ? { lead_time_days: parseInt(leadTime) } : {}),
          ...(moq ? { moq: parseFloat(moq) } : {}),
          ...(message ? { message } : {}),
        },
      },
      {
        onSuccess: () => {
          toast({ title: myOffer ? "Offer updated" : "Offer submitted" });
          queryClient.invalidateQueries({ queryKey: getGetRfqQueryKey(rfqId) });
          queryClient.invalidateQueries({ queryKey: getListMyRfqsQueryKey({ limit: 50 }) });
        },
        onError: () => {
          toast({ title: "Failed to submit offer", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !rfq ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={STATUS_STYLES[rfq.status] ?? "border-muted-foreground text-muted-foreground"}>
                  {rfq.status}
                </Badge>
                <Badge variant="outline" className="border-white/10 capitalize">{rfq.category.replace("_", " ")}</Badge>
              </div>
              <SheetTitle className="text-foreground text-left">{rfq.title}</SheetTitle>
              <SheetDescription className="text-left">
                Requested by {rfq.buyer_name || "Buyer"} · {new Date(rfq.created_at).toLocaleDateString()}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 py-4">
              {rfq.description && (
                <p className="text-sm text-muted-foreground">{rfq.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {(rfq.quantity || rfq.unit) && (
                  <Detail icon={Package} label="Quantity" value={`${rfq.quantity ?? ""} ${rfq.unit ?? ""}`.trim()} />
                )}
                {rfq.target_price_max && (
                  <Detail icon={Package} label="Target max price" value={rfq.target_price_max} />
                )}
                {rfq.destination_country && (
                  <Detail icon={MapPin} label="Destination" value={rfq.destination_country} />
                )}
                {rfq.industry && <Detail icon={Factory} label="Industry" value={rfq.industry} />}
                {rfq.industrial_type && <Detail icon={Factory} label="Type" value={rfq.industrial_type} />}
                {rfq.deadline && (
                  <Detail icon={Calendar} label="Deadline" value={new Date(rfq.deadline).toLocaleDateString()} />
                )}
                <Detail icon={Users} label="Offers" value={String(rfq.offer_count)} />
              </div>

              {/* Offer form */}
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {myOffer ? "Your Offer" : "Submit an Offer"}
                  </h3>
                  {myOffer && (
                    <Badge variant="outline" className="border-white/10 capitalize flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {myOffer.status}
                    </Badge>
                  )}
                </div>

                {!canOffer ? (
                  <p className="text-sm text-muted-foreground">
                    This RFQ is {rfq.status}; new offers can no longer be submitted.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quote price *</Label>
                        <Input
                          type="number" inputMode="decimal" value={priceQuote}
                          onChange={(e) => setPriceQuote(e.target.value)}
                          className="bg-input border-border" data-testid="offer-price"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Currency</Label>
                        <Input
                          value={currency} onChange={(e) => setCurrency(e.target.value)}
                          className="bg-input border-border" data-testid="offer-currency"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Lead time (days)</Label>
                        <Input
                          type="number" value={leadTime}
                          onChange={(e) => setLeadTime(e.target.value)}
                          className="bg-input border-border" data-testid="offer-leadtime"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">MOQ</Label>
                        <Input
                          type="number" value={moq}
                          onChange={(e) => setMoq(e.target.value)}
                          className="bg-input border-border" data-testid="offer-moq"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Message</Label>
                      <Textarea
                        value={message} onChange={(e) => setMessage(e.target.value)}
                        className="bg-input border-border" rows={3} data-testid="offer-message"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {canOffer && (
              <SheetFooter>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white w-full"
                  onClick={handleSubmit}
                  disabled={submitOffer.isPending}
                  data-testid="btn-submit-offer"
                >
                  {submitOffer.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {myOffer ? "Update Offer" : "Submit Offer"}
                </Button>
              </SheetFooter>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-foreground">{value}</span>
      </div>
    </div>
  );
}

export default function RfqsPage() {
  const { user } = useClerk();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useListMyRfqs(
    { limit: 50 },
    { query: { enabled: !!user, queryKey: getListMyRfqsQueryKey({ limit: 50 }) } },
  );

  const rfqs = data?.data ?? [];

  return (
    <SidebarLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">RFQ Inbox</h1>
          <p className="text-muted-foreground mt-2">Buyer requests for quote — respond with a structured offer.</p>
        </div>

        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rfqs.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rfqs.map((rfq: Rfq) => {
              const Icon = CATEGORY_ICONS[rfq.category] || Package;
              return (
                <Card
                  key={rfq.id}
                  className="bg-card border-card-border hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedId(rfq.id)}
                  data-testid={`rfq-${rfq.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">{rfq.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {rfq.buyer_name || "Buyer"}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={STATUS_STYLES[rfq.status] ?? "border-muted-foreground text-muted-foreground"}>
                        {rfq.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(rfq.quantity || rfq.unit) && (
                        <span className="flex items-center gap-1">
                          <Package className="w-3 h-3" />{`${rfq.quantity ?? ""} ${rfq.unit ?? ""}`.trim()}
                        </span>
                      )}
                      {rfq.destination_country && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{rfq.destination_country}</span>
                      )}
                      {rfq.deadline && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(rfq.deadline).toLocaleDateString()}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="w-3 h-3" />{rfq.offer_count} offer{rfq.offer_count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-primary flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />View &amp; respond
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-card border-card-border">
            <CardContent className="py-10 text-center text-muted-foreground">
              No RFQs in your inbox yet.
            </CardContent>
          </Card>
        )}
      </div>

      {selectedId && <RfqDetailSheet rfqId={selectedId} onClose={() => setSelectedId(null)} />}
    </SidebarLayout>
  );
}
